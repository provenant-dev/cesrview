import { assertInputSize, INSPECTION_TIMEOUT_MS } from './inspection-limits.ts';
import type { InspectionFailure, InspectionOptions, InspectionResult } from './types.ts';

export interface InspectionRequest {
  input: string | Uint8Array;
  options: InspectionOptions;
}
export type InspectionResponse = { result: InspectionResult } | { failure: InspectionFailure };
export type InspectionWorkerMessage = { ready: true } | InspectionResponse;

function failure(message: string): InspectionResponse {
  return { failure: { message, location: null, locationLabel: '' } };
}

/** One disposable worker per request; cancellation also discards queued replies. */
export function createInspector(
  createWorker: () => Worker = () => new Worker(new URL('./inspection.worker.ts', import.meta.url), { type: 'module' }),
  timeoutMs = INSPECTION_TIMEOUT_MS,
) {
  let cancel = () => {};
  return {
    cancel: () => cancel(),
    inspect(input: string | Uint8Array, options: InspectionOptions): Promise<InspectionResponse | null> {
      cancel();
      return new Promise(resolve => {
        let worker: Worker | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let finished = false;
        let started = false;
        function finish(response: InspectionResponse | null) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          worker?.terminate();
          cancel = () => {};
          resolve(response);
        }
        cancel = () => finish(null);
        try {
          assertInputSize(input);
          worker = createWorker();
          worker.onmessage = (event: MessageEvent<InspectionWorkerMessage>) => {
            if (finished) return;
            if ('ready' in event.data) {
              if (started) return;
              started = true;
              // Async module initialization can drop early messages in dev.
              // Keep the original buffer attached for the source viewer.
              try { worker!.postMessage({ input, options } satisfies InspectionRequest); }
              catch { finish(failure('Could not send input to the decoder. Reload the page and try again.')); }
            } else if (started) finish(event.data);
          };
          worker.onerror = event => {
            event.preventDefault();
            finish(failure('The decoder could not finish. Try a smaller input or reload the page.'));
          };
          worker.onmessageerror = () => finish(failure('The decoder could not return its result. Try a smaller input.'));
          timer = setTimeout(() => finish(failure(`Decoding exceeded the ${INSPECTION_TIMEOUT_MS / 1000}-second limit. Inspect a smaller stream.`)), timeoutMs);
        } catch (cause) {
          finish(failure(cause instanceof Error ? cause.message : 'Could not start the decoder. Reload the page and try again.'));
        }
      });
    },
  };
}
