import {
  Counter, Indexer, Matter, OpaqueSpan,
  INDEXER_CODE_NAMES, INDEXER_SIZES, MATTER_SIZES,
  isCounterGroupLike, parseAttachmentGroup, parseBytes,
  parseIndexer, parseMatter, renderAnnotatedFrames, resolveCounterSizeTable,
} from 'cesr-ts';

const encoder = new TextEncoder();

function primitiveNode(value) {
  const counter = value instanceof Counter;
  const indexed = value instanceof Indexer;
  const sizes = counter ? resolveCounterSizeTable(value.version) : indexed ? INDEXER_SIZES : MATTER_SIZES;
  const size = sizes.get(value.code);
  const meta = {
    Family: counter ? 'Counter' : indexed ? 'Indexed signature' : 'Matter',
    Code: value.code,
    Name: indexed ? INDEXER_CODE_NAMES[value.code] : value.name,
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

function entryNode(entry) {
  if (Array.isArray(entry)) return { kind: 'group', label: 'Tuple', children: entry.map(entryNode) };
  if (entry instanceof OpaqueSpan) {
    return { kind: 'value', value: `Opaque ${entry.domain} payload (${entry.raw.length} bytes)` };
  }
  const node = primitiveNode(entry);
  if (isCounterGroupLike(entry)) node.children = entry.items.map(entryNode);
  return node;
}

function dataNode(value, label) {
  if (value !== null && typeof value === 'object') {
    if (value instanceof Uint8Array) {
      return { kind: 'value', label, value: `0x${Array.from(value, b => b.toString(16).padStart(2, '0')).join('')}` };
    }
    return {
      kind: 'group', label, value: Array.isArray(value) ? 'Array' : 'Object',
      children: Object.entries(value).map(([key, child]) => dataNode(child, key)),
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

function frameNode(frame, index) {
  return {
    kind: 'group', label: `Message ${index + 1}`,
    value: `${frame.body.proto} ${frame.body.kind} · ${frame.body.size} bytes`,
    children: [
      dataNode(frame.body.ked, 'Body'),
      { kind: 'group', label: 'Attachments', children: frame.attachments.map(entryNode) },
      ...(frame.essrs?.length ? [{ kind: 'group', label: 'ESSR payloads', children: frame.essrs.map(entryNode) }] : []),
      ...(frame.nests?.length ? [{ kind: 'group', label: 'Nested messages', children: frame.nests.map(frameNode) }] : []),
    ],
  };
}

/** Parsing and code tables belong to cesr-ts. This module only adapts its output. */
export function inspectCesr(input, { mode = 'stream', domain = 'txt', major = 1 } = {}) {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input;
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Expected text or bytes.');
  if (!bytes.length) throw new Error('Enter CESR data or choose a file.');
  if (mode === 'stream') {
    const frames = parseBytes(bytes);
    if (!frames.length) throw new Error('No complete messages found.');
    const annotations = renderAnnotatedFrames(frames, {
      commentMode: 'inline', indent: 2, pretty: true,
    }, bytes).map(frame => frame.lines.join('\n')).join('\n');
    return { byteLength: bytes.length, nodes: frames.map(frameNode), annotations };
  }
  if (!['matter', 'indexer', 'attachments'].includes(mode)) throw new Error('Unknown inspection mode.');
  if (!['txt', 'bny'].includes(domain)) throw new Error('Unknown encoding domain.');
  if (![1, 2].includes(major)) throw new Error('Unsupported CESR table version.');
  const nodes = [];
  let offset = 0;
  while (offset < bytes.length) {
    const tail = bytes.subarray(offset);
    let consumed, node;
    if (mode === 'attachments') {
      const parsed = parseAttachmentGroup(tail, { major, minor: 0 }, domain);
      consumed = parsed.consumed;
      node = entryNode(parsed.group);
    } else {
      const value = mode === 'indexer' ? parseIndexer(tail, domain) : parseMatter(tail, domain);
      consumed = domain === 'txt' ? value.fullSize : value.fullSizeB2;
      node = primitiveNode(value);
    }
    if (consumed <= 0 || consumed > tail.length) throw new Error('Parser returned an invalid consumed size.');
    nodes.push(node);
    offset += consumed;
  }
  return { byteLength: bytes.length, nodes, annotations: '' };
}
