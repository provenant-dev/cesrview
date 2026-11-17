import {
  Counter, Indexer, Matter, OpaqueSpan,
  INDEXER_CODE_NAMES, INDEXER_SIZES, MATTER_SIZES,
  isCounterGroupLike, isGroupTuple, parseAttachmentGroup, parseBytes,
  parseIndexer, parseMatter, renderAnnotatedFrames, resolveCounterSizeTable,
} from 'cesr-ts';

import type { CesrFrame, GroupEntry, Primitive } from 'cesr-ts';
import type { InspectionNode, InspectionOptions, InspectionResult, PrimitiveMetadata } from './types.ts';

import { entrySourceLinker, linkStreamSources, primitiveRanges } from './source-locations.ts';
import { labelFields } from './field-labels.ts';
import { assertInputSize, InspectionBudget } from './inspection-limits.ts';

const encoder = new TextEncoder();
const indexerNames: Readonly<Record<string, string>> = INDEXER_CODE_NAMES;

function primitiveNode(value: Primitive): InspectionNode {
  const counter = value instanceof Counter;
  const indexed = value instanceof Indexer;
  const sizes = counter ? resolveCounterSizeTable(value.version) : indexed ? INDEXER_SIZES : MATTER_SIZES;
  const size = sizes.get(value.code);
  const meta: PrimitiveMetadata = {
    Family: counter ? 'Counter' : indexed ? 'Indexed signature' : 'Matter',
    Code: value.code,
    Name: indexed ? indexerNames[value.code] : value.name,
    'Code length': size ? size.hs + size.ss : value.code.length,
    'Text length': value.fullSize,
    'Binary length': value.fullSizeB2,
  };
  if (counter) {
    meta.Count = value.count;
    meta.Version = `${value.version.major}.${value.version.minor}`;
  }
  if (indexed) {
    meta.Index = value.index;
    if (value.ondex !== undefined) meta['Other index'] = value.ondex;
  }
  return { kind: 'primitive', value: value.qb64, meta };
}

function entryNode(entry: GroupEntry, budget: InspectionBudget, depth: number): InspectionNode {
  budget.take(depth);
  if (isGroupTuple(entry)) return { kind: 'group', label: 'Tuple', children: entry.map(child => entryNode(child, budget, depth + 1)) };
  if (entry instanceof OpaqueSpan) {
    return { kind: 'value', value: `Opaque ${entry.domain} payload (${entry.raw.length} bytes)` };
  }
  const node = primitiveNode(entry);
  if (isCounterGroupLike(entry)) node.children = entry.items.map(child => entryNode(child, budget, depth + 1));
  return node;
}

function dataNode(value: unknown, label: string, budget: InspectionBudget, depth: number): InspectionNode {
  budget.take(depth);
  if (value !== null && typeof value === 'object') {
    if (value instanceof Uint8Array) {
      return { kind: 'value', label, value: `0x${Array.from(value, b => b.toString(16).padStart(2, '0')).join('')}` };
    }
    if (Array.isArray(value)) budget.reserve(value.length);
    const keys = Object.keys(value);
    budget.reserve(keys.length);
    return {
      kind: 'group', label, value: Array.isArray(value) ? 'Array' : 'Object',
      children: keys.map(key => dataNode((value as Record<string, unknown>)[key], key, budget, depth + 1)),
    };
  }
  // An embedded string is annotated only when ONE complete upstream Matter
  // consumes it. Ordinary text and scalar JSON values are kept intact.
  if (typeof value === 'string' && value.length && value.length % 4 === 0 && /^[A-Za-z0-9_-]+$/.test(value)) {
    try {
      const matter = new Matter({ qb64: value });
      if (matter.fullSize === value.length) return { ...primitiveNode(matter), label };
    } catch { /* A non-CESR application string is valid JSON. */ }
  }
  return { kind: 'value', label, value: typeof value === 'bigint' ? value.toString() : JSON.stringify(value) };
}

function frameNode(frame: CesrFrame, index: number, budget: InspectionBudget, depth = 0): InspectionNode {
  budget.message();
  budget.take(depth);
  const body = dataNode(frame.body.ked, 'Body', budget, depth + 1);
  labelFields(body, frame.body.proto, frame.body.ked?.t);
  budget.take(depth + 1); // Attachments group.
  if (frame.essrs?.length) budget.take(depth + 1);
  if (frame.nests?.length) budget.take(depth + 1);
  return {
    kind: 'group', label: `Message ${index + 1}`,
    value: `${frame.body.proto} ${frame.body.kind} · ${frame.body.size} bytes`,
    children: [
      body,
      { kind: 'group', label: 'Attachments', children: frame.attachments.map(entry => entryNode(entry, budget, depth + 2)) },
      ...(frame.essrs?.length ? [{ kind: 'group' as const, label: 'ESSR payloads', children: frame.essrs.map(entry => entryNode(entry, budget, depth + 2)) }] : []),
      ...(frame.nests?.length ? [{ kind: 'group' as const, label: 'Nested messages', children: frame.nests.map((child, i) => frameNode(child, i, budget, depth + 2)) }] : []),
    ],
  };
}

/** Parsing and code tables belong to cesr-ts. This module only adapts its output. */
export function inspectCesr(input: string | Uint8Array, { mode = 'stream', domain = 'txt', major = 1 }: InspectionOptions = {}): InspectionResult {
  assertInputSize(input);
  const bytes = typeof input === 'string' ? encoder.encode(input) : input;
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Expected text or bytes.');
  if (!bytes.length) throw new Error('Enter CESR data or choose a file.');
  const budget = new InspectionBudget();
  if (mode === 'stream') {
    const frames = parseBytes(bytes);
    if (!frames.length) throw new Error('No complete messages found.');
    // Bound the tree before annotation/source mapping can amplify its size.
    const nodes = frames.map((frame, index) => frameNode(frame, index, budget));
    const annotations = renderAnnotatedFrames(frames, {
      commentMode: 'inline', indent: 2, pretty: true,
    }, bytes).map(frame => frame.lines.join('\n')).join('\n');
    linkStreamSources(frames, nodes, bytes);
    return { byteLength: bytes.length, nodes, annotations, highlights: primitiveRanges(nodes) };
  }
  if (!['matter', 'indexer', 'attachments'].includes(mode)) throw new Error('Unknown inspection mode.');
  if (!['txt', 'bny'].includes(domain)) throw new Error('Unknown encoding domain.');
  if (![1, 2].includes(major)) throw new Error('Unsupported CESR table version.');
  const nodes: InspectionNode[] = [];
  const linkEntry = mode === 'attachments' ? entrySourceLinker(bytes) : null;
  let offset = 0;
  while (offset < bytes.length) {
    const tail = bytes.subarray(offset);
    let consumed: number, node: InspectionNode;
    try {
      if (mode === 'attachments') {
        const parsed = parseAttachmentGroup(tail, { major, minor: 0 }, domain);
        consumed = parsed.consumed;
        node = entryNode(parsed.group, budget, 0);
        linkEntry!(parsed.group, node, { start: offset, end: offset + consumed });
      } else {
        const value = mode === 'indexer' ? parseIndexer(tail, domain) : parseMatter(tail, domain);
        consumed = domain === 'txt' ? value.fullSize : value.fullSizeB2;
        budget.take(0);
        node = primitiveNode(value);
        node.source = { start: offset, end: offset + consumed };
      }
    } catch (cause) {
      if (cause && typeof cause === 'object' && 'offset' in cause
        && typeof cause.offset === 'number' && Number.isSafeInteger(cause.offset)) {
        Object.assign(cause, { sourceOffset: offset + cause.offset });
      }
      throw cause;
    }
    if (consumed <= 0 || consumed > tail.length) throw new Error('Parser returned an invalid consumed size.');
    nodes.push(node);
    offset += consumed;
  }
  return { byteLength: bytes.length, nodes, annotations: '', highlights: primitiveRanges(nodes) };
}

export { describeInspectionError } from './inspection-error.ts';
