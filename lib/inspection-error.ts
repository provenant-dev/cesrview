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

/** End of the brace-balanced JSON object starting at `start`, or null. */
function jsonObjectEnd(bytes: Uint8Array, start: number): number | null {
  let depth = 0, quoted = false;
  for (let i = start; i < bytes.length; i++) {
    const byte = bytes[i];
    if (quoted) {
      if (byte === 92) i++; // Skip the escaped byte.
      else if (byte === 34) quoted = false;
    } else if (byte === 34) quoted = true;
    else if (byte === 123) depth++;
    else if (byte === 125 && --depth === 0) return i + 1;
  }
  return null;
}

/** A body whose JSON is valid but not the declared size was most likely reformatted. */
function sizeMismatchHint(bytes: Uint8Array, start: number, declared: number): string | null {
  const end = jsonObjectEnd(bytes, start);
  if (end === null || end - start === declared) return null;
  try { JSON.parse(decoder.decode(bytes.subarray(start, end))); } catch { return null; }
  return `The version string says ${declared} bytes but the JSON body is ${end - start} bytes. `
    + 'CESR bodies must stay byte-exact; was it reformatted?';
}

function jsonFailure(bytes: Uint8Array, cause: unknown): { offset: number; hint: string | null } | null {
  const message = errorMessage(cause);
  if (!message.includes('Failed to decode JSON Serder')) return null;
  const failures: { offset: number; hint: string | null }[] = [];
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
          if (char !== null) {
            failures.push({ offset: start + utf8Offsets(text)[char]!, hint: sizeMismatchHint(bytes, start, smellage.size) });
          }
        }
      }
    } catch { /* Not a versioned JSON body at this position. */ }
  }
  return failures.length === 1 ? failures[0]! : null;
}

/** Error locations are zero-based byte offsets, never JS character indexes. */
export function describeInspectionError(cause: unknown, input: string | Uint8Array): InspectionFailure {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input;
  const details = cause && typeof cause === 'object' ? cause : {};
  let offset: unknown = ('sourceOffset' in details ? details.sourceOffset : undefined)
    ?? ('offset' in details ? details.offset : undefined);
  let kind: SourceTarget['kind'] = 'error';
  let hint: string | null = null;
  if (!Number.isSafeInteger(offset)) {
    const failure = jsonFailure(bytes, cause);
    offset = failure?.offset;
    hint = failure?.hint ?? null;
  }
  if (!Number.isSafeInteger(offset) && cause instanceof ShortageError) {
    offset = bytes.length;
    kind = 'end';
  }
  const location = typeof offset === 'number' && Number.isSafeInteger(offset) && offset >= 0 && offset <= bytes.length
    ? { start: offset, end: Math.min(offset + 1, bytes.length), kind } : null;
  return {
    message: `Could not parse input: ${hint ?? errorMessage(cause)}`,
    location,
    locationLabel: location ? (kind === 'end' ? `Input ended at byte ${offset}` : `Error at byte ${offset}`) : '',
  };
}
