import jsonMap from 'json-source-map';
import { byteString, decodeB64, isCounterGroupLike, isGroupTuple, OpaqueSpan, sniff, Texter, bytesEqual } from 'cesr-ts';

import type { CesrFrame, GroupEntry } from 'cesr-ts';
import type { InspectionNode, SourceRange } from './types.ts';

interface SourceMatch {
  patterns: Uint8Array[];
  apply: (range: SourceRange) => void;
  owner?: CesrFrame;
}
type Locator = ReturnType<typeof matcher>;
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/** Byte offsets at every UTF-16 boundary (the coordinate system used by editors). */
export function utf8Offsets(text: string) {
  const offsets = new Uint32Array(text.length + 1);
  let byte = 0;
  for (let index = 0; index < text.length;) {
    const cp = text.codePointAt(index)!;
    const width = cp > 0xffff ? 2 : 1;
    offsets[index] = byte;
    if (width === 2) offsets[index + 1] = byte;
    byte += cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
    index += width;
    offsets[index] = byte;
  }
  return offsets;
}

export function byteToCharacter(offsets: Uint32Array, byte: number) {
  let lo = 0, hi = offsets.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (offsets[mid]! <= byte) lo = mid;
    else hi = mid - 1;
  }
  // Do not place a cursor between the surrogate halves of one code point.
  while (lo > 0 && offsets[lo - 1] === offsets[lo]) lo--;
  return lo;
}

export function readableText(bytes: Uint8Array) {
  try {
    const text = decoder.decode(bytes);
    return /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text) ? null : text;
  } catch { return null; }
}

/** Locate exact, complete wire values. Ambiguous matches are deliberately omitted. */
function matcher(bytes: Uint8Array) {
  let wire: string | undefined;
  return (records: SourceMatch[], scope: SourceRange = { start: 0, end: bytes.length }, excluded: SourceRange[] = []) => {
    if (!records.length) return;
    wire ??= byteString(bytes);
    const blocked: SourceRange[] = [];
    for (const range of [...excluded].sort((a, b) => a.start - b.start)) {
      const last = blocked.at(-1);
      if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
      else blocked.push({ ...range });
    }
    function isBlocked(start: number, end: number) {
      let lo = 0, hi = blocked.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (blocked[mid]!.end <= start) lo = mid + 1;
        else hi = mid;
      }
      return lo < blocked.length && blocked[lo]!.start < end;
    }
    const groups = new Map<string, { patterns: string[]; records: SourceMatch[] }>();
    for (const record of records) {
      const patterns = [...new Set(record.patterns.filter(p => p?.length).map(byteString))];
      const key = patterns.join('\u0100'); // Cannot occur in a byte string.
      if (!groups.has(key)) groups.set(key, { patterns, records: [] });
      groups.get(key)!.records.push(record);
    }
    groups: for (const { patterns, records: matches } of groups.values()) {
      // Different message owners may have interleaved nested attachments.
      if (matches.some(record => record.owner !== matches[0]!.owner)) continue;
      const candidates: SourceRange[] = [];
      for (const pattern of patterns) {
        let cursor = scope.start;
        let count = 0;
        while (cursor <= scope.end - pattern.length) {
          const start = wire.indexOf(pattern, cursor);
          if (start < 0 || start + pattern.length > scope.end) break;
          const end = start + pattern.length;
          if (!isBlocked(start, end)) {
            // Matches of one pattern are disjoint. More occurrences than
            // records remain ambiguous even after removing enclosing ranges.
            if (++count > matches.length) continue groups;
            candidates.push({ start, end });
          }
          cursor = end;
        }
      }
      // Keep the innermost alternatives with a sort and one scan, rather than
      // rescanning every previous range for every occurrence (quadratic).
      candidates.sort((a, b) => a.end - b.end || b.start - a.start);
      const ranges: SourceRange[] = [];
      let latestStart = -1;
      for (const range of candidates) {
        if (range.start <= latestStart) continue;
        ranges.push(range);
        latestStart = range.start;
      }
      if (ranges.length !== matches.length || ranges.some((r, i) => i && r.start < ranges[i - 1]!.end)) continue;
      matches.forEach((record, index) => record.apply(ranges[index]!));
    }
  };
}

const pointerPart = (label: string | undefined) => String(label).replaceAll('~', '~0').replaceAll('/', '~1');
function mapJson(node: InspectionNode, raw: Uint8Array, base: number) {
  try {
    const text = decoder.decode(raw);
    const { pointers } = jsonMap.parse(text);
    const offsets = utf8Offsets(text);
    function visit(current: InspectionNode, path: string) {
      const location = pointers[path];
      if (location) current.source = { start: base + offsets[location.value.pos]!, end: base + offsets[location.valueEnd.pos]! };
      for (const child of current.children ?? []) visit(child, `${path}/${pointerPart(child.label)}`);
    }
    visit(node, '');
  } catch { /* Presentation metadata must never change parser acceptance. */ }
}

function entries(entry: GroupEntry, node: InspectionNode, locate: Locator): SourceMatch[] {
  if (isGroupTuple(entry)) return entry.flatMap((child, i) => entries(child, node.children![i]!, locate));
  const group = isCounterGroupLike(entry);
  const patterns = group || entry instanceof OpaqueSpan ? [entry.raw] : [entry.qb64b, entry.qb2];
  return [{ patterns, apply: range => {
    node.source = range;
    if (group) {
      const domain = sniff(entry.raw);
      node.source = { start: range.start, end: range.start + (domain === 'bny' ? entry.fullSizeB2 : entry.fullSize) };
      const children = entry.items.flatMap((child, i) => entries(child, node.children![i]!, locate));
      locate(children, range);
    }
  } }];
}

export function entrySourceLinker(bytes: Uint8Array) {
  const locate = matcher(bytes);
  return (entry: GroupEntry, node: InspectionNode, range: SourceRange) => entries(entry, node, locate)[0]!.apply(range);
}

export function linkStreamSources(frames: CesrFrame[], nodes: InspectionNode[], bytes: Uint8Array) {
  const locate = matcher(bytes);
  const bodies: SourceMatch[] = [], attachments: SourceMatch[] = [], bodyRanges: SourceRange[] = [];
  function visit(frame: CesrFrame, node: InspectionNode) {
    const body = node.children![0]!;
    const patterns = [frame.body.raw];
    if (frame.body.kind === 'CESR') {
      try { patterns.push(decodeB64(decoder.decode(frame.body.raw))); } catch { /* Opaque body. */ }
    }
    // The upstream serializer wraps non-native bodies in a qualified Texter.
    const wrapped = new Texter({ raw: frame.body.raw, code: '4B' });
    patterns.push(wrapped.qb64b, wrapped.qb2);
    bodies.push({ patterns, apply: range => {
      body.source = range;
      bodyRanges.push(range);
      if (frame.body.kind === 'JSON' && bytesEqual(bytes.subarray(range.start, range.end), frame.body.raw)) {
        mapJson(body, frame.body.raw, range.start);
      }
      else {
        const annotate = (current: InspectionNode) => {
          current.sourceContainer = range;
          current.children?.forEach(annotate);
        };
        annotate(body);
      }
      // Other serializers do not expose field offsets. Keep the exact body range;
      // do not guess which repeated bytes belong to a semantic field.
    } });
    const group = node.children!.find(child => child.label === 'Attachments');
    frame.attachments.forEach((entry, i) => attachments.push(...entries(entry, group!.children![i]!, locate).map(record => ({ ...record, owner: frame }))));
    const essr = node.children!.find(child => child.label === 'ESSR payloads');
    frame.essrs?.forEach((entry, i) => attachments.push(...entries(entry, essr!.children![i]!, locate).map(record => ({ ...record, owner: frame }))));
    const nests = node.children!.find(child => child.label === 'Nested messages');
    frame.nests?.forEach((child, i) => visit(child, nests!.children![i]!));
  }
  frames.forEach((frame, i) => visit(frame, nodes[i]!));
  locate(bodies);
  locate(attachments, undefined, bodyRanges);
}

export function primitiveRanges(nodes: InspectionNode[]): SourceRange[] {
  const ranges: SourceRange[] = [];
  function visit(nodes: InspectionNode[]) {
    for (const node of nodes) {
      if (node.meta && node.source) ranges.push(node.source);
      if (node.children) visit(node.children);
    }
  }
  visit(nodes);
  return ranges.sort((a, b) => a.start - b.start);
}
