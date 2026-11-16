import { ShortageError, smell } from 'cesr-ts';
import jsonMap from 'json-source-map';
import { utf8Offsets } from './source-locations.ts';
import type { InspectionFailure, SourceTarget } from './types.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

function errorMessage(cause: unknown): string {
  return cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string'
    ? cause.message : String(cause);
}

function jsonFailureLocation(bytes: Uint8Array, cause: unknown): number | null {
  const message = errorMessage(cause);
  if (!message.includes('Failed to decode JSON Serder')) return null;
  const locations: number[] = [];
  for (let start = bytes.indexOf(123); start >= 0; start = bytes.indexOf(123, start + 1)) {
    try {
      const { smellage } = smell(bytes.subarray(start));
      if (smellage.kind !== 'JSON' || start + smellage.size > bytes.length) continue;
      const text = decoder.decode(bytes.subarray(start, start + smellage.size));
      try { JSON.parse(text); } catch (syntax) {
        if (!message.includes(errorMessage(syntax))) continue;
        // json-source-map provides engine-independent character positions.
        try { jsonMap.parse(text); } catch (error) {
          const position = /position (\d+)/.exec(errorMessage(error));
          const char = position ? Number(position[1]) : /Unexpected end/.test(errorMessage(error)) ? text.length : null;
          if (char !== null) locations.push(start + utf8Offsets(text)[char]!);
        }
      }
    } catch { /* Not a versioned JSON body at this position. */ }
  }
  return locations.length === 1 ? locations[0]! : null;
}

/** Error locations are zero-based byte offsets, never JS character indexes. */
export function describeInspectionError(cause: unknown, input: string | Uint8Array): InspectionFailure {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input;
  const details = cause && typeof cause === 'object' ? cause : {};
  let offset: unknown = ('sourceOffset' in details ? details.sourceOffset : undefined)
    ?? ('offset' in details ? details.offset : undefined);
  let kind: SourceTarget['kind'] = 'error';
  if (!Number.isSafeInteger(offset)) offset = jsonFailureLocation(bytes, cause);
  if (!Number.isSafeInteger(offset) && cause instanceof ShortageError) {
    offset = bytes.length;
    kind = 'end';
  }
  const location = typeof offset === 'number' && Number.isSafeInteger(offset) && offset >= 0 && offset <= bytes.length
    ? { start: offset, end: Math.min(offset + 1, bytes.length), kind } : null;
  return {
    message: `Could not parse input: ${errorMessage(cause)}`,
    location,
    locationLabel: location ? (kind === 'end' ? `Input ended at byte ${offset}` : `Error at byte ${offset}`) : '',
  };
}
