import { inspectCesr, describeInspectionError } from './cesr.ts';
import type { InspectionRequest, InspectionResponse, InspectionWorkerMessage } from './inspection-client.ts';

// Keep DOM and WebWorker lib declarations from conflicting in Nuxt's tsconfig.
const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<InspectionRequest>) => void;
  postMessage: (message: InspectionWorkerMessage) => void;
};

scope.onmessage = ({ data }) => {
  let response: InspectionResponse;
  try {
    response = { result: inspectCesr(data.input, data.options) };
  } catch (cause) {
    response = { failure: describeInspectionError(cause, data.input) };
  }
  scope.postMessage(response);
};

// Imports (including cesr-ts's asynchronous initialization) have completed and
// the request handler is installed. Only now may the page send the first input.
scope.postMessage({ ready: true });
