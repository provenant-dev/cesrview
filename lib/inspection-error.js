import { ShortageError, smell } from 'cesr-ts';
import jsonMap from 'json-source-map';
import { utf8Offsets } from './source-locations.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

function jsonFailureLocation(bytes, cause) {
  if (!cause.message?.includes('Failed to decode JSON Serder')) return null;
  const locations = [];
  for (let start = bytes.indexOf(123); start >= 0; start = bytes.indexOf(123, start + 1)) {
    try {
      const { smellage } = smell(bytes.subarray(start));
      if (smellage.kind !== 'JSON' || start + smellage.size > bytes.length) continue;
      const text = decoder.decode(bytes.subarray(start, start + smellage.size));
      try { JSON.parse(text); } catch (syntax) {
        if (!cause.message.includes(syntax.message)) continue;
        // json-source-map provides engine-independent character positions.
        try { jsonMap.parse(text); } catch (error) {
          const position = /position (\d+)/.exec(error.message);
          const char = position ? Number(position[1]) : /Unexpected end/.test(error.message) ? text.length : null;
          if (char !== null) locations.push(start + utf8Offsets(text)[char]);
        }
      }
    } catch { /* Not a versioned JSON body at this position. */ }
  }
  return locations.length === 1 ? locations[0] : null;
}

/** Error locations are zero-based byte offsets, never JS character indexes. */
export function describeInspectionError(cause, input) {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input;
  let offset = cause.sourceOffset ?? cause.offset;
  let kind = 'error';
  if (!Number.isSafeInteger(offset)) offset = jsonFailureLocation(bytes, cause);
  if (!Number.isSafeInteger(offset) && cause instanceof ShortageError) {
    offset = bytes.length;
    kind = 'end';
  }
  const location = Number.isSafeInteger(offset) && offset >= 0 && offset <= bytes.length
    ? { start: offset, end: Math.min(offset + 1, bytes.length), kind } : null;
  return {
    message: `Could not parse input: ${cause.message ?? String(cause)}`,
    location,
    locationLabel: location ? (kind === 'end' ? `Input ended at byte ${offset}` : `Error at byte ${offset}`) : '',
  };
}
