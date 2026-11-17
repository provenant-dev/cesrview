// Shared by the editor, file picker and parser. These are viewer resource limits,
// not restrictions imposed by the CESR protocol.
export const MAX_INPUT_BYTES = 100_000_000;
export const MAX_TEXT_PREVIEW_BYTES = 2 * 1024 * 1024;
export const MAX_MESSAGES = 100_000;
export const MAX_NODES = 1_000_000;
export const MAX_DEPTH = 64;
export const INSPECTION_TIMEOUT_MS = 60_000;

const encoder = new TextEncoder();
const byteCounter = new Uint8Array(64 * 1024);

/** Count UTF-8 bytes without allocating a second copy of a large pasted input. */
export function textByteLength(text: string, limit = Infinity) {
  let offset = 0, bytes = 0;
  while (offset < text.length && bytes <= limit) {
    const { read, written } = encoder.encodeInto(text.slice(offset), byteCounter);
    offset += read;
    bytes += written;
  }
  return bytes;
}

export function assertInputSize(input: string | Uint8Array | number) {
  const size = typeof input === 'number' ? input : typeof input === 'string'
    ? input.length > MAX_INPUT_BYTES ? input.length : textByteLength(input, MAX_INPUT_BYTES)
    : input.byteLength;
  if (size > MAX_INPUT_BYTES) throw new Error('Input exceeds the 100 MB limit. Open or paste a smaller stream.');
}

export class InspectionBudget {
  nodes = 0;
  messages = 0;

  take(depth: number) {
    if (depth > MAX_DEPTH) throw new Error(`Input exceeds the nesting limit of ${MAX_DEPTH} levels.`);
    this.reserve(1);
    this.nodes++;
  }

  reserve(count: number) {
    if (this.nodes + count > MAX_NODES) throw new Error(`Input exceeds the limit of ${MAX_NODES.toLocaleString('en-US')} decoded nodes. Inspect a smaller stream.`);
  }

  message() {
    if (++this.messages > MAX_MESSAGES) throw new Error(`Input exceeds the limit of ${MAX_MESSAGES.toLocaleString('en-US')} messages. Inspect a smaller stream.`);
  }
}
