import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { addStaticCsp } from '../build/static-csp.ts';
import { inspectCesr } from '../lib/cesr.ts';
import { createInspector } from '../lib/inspection-client.ts';
import type { InspectionResponse, InspectionWorkerMessage } from '../lib/inspection-client.ts';
import { assertInputSize, textByteLength, MAX_INPUT_BYTES, MAX_MESSAGES, MAX_NODES, MAX_DEPTH } from '../lib/inspection-limits.ts';
import { linkStreamSources } from '../lib/source-locations.ts';
import { parseBytes } from 'cesr-ts';

function message(fields: Record<string, unknown> = {}) {
  const text = JSON.stringify({ v: 'KERI10JSON000000_', t: 'rpy', ...fields });
  return text.replace('000000', Buffer.byteLength(text).toString(16).padStart(6, '0'));
}

test('resource limits reject oversized text/bytes, wide trees, nested trees and message floods', () => {
  assert.doesNotThrow(() => assertInputSize(100_000_000));
  assert.throws(() => assertInputSize(100_000_001), /100 MB/);
  assert.doesNotThrow(() => assertInputSize('a'.repeat(MAX_INPUT_BYTES)));
  assert.throws(() => inspectCesr('a'.repeat(MAX_INPUT_BYTES + 1)), /100 MB/);
  assert.throws(() => inspectCesr('😀'.repeat(MAX_INPUT_BYTES / 4 + 1)), /100 MB/);
  assert.throws(() => inspectCesr(new Uint8Array(MAX_INPUT_BYTES + 1)), /100 MB/);
  assert.throws(() => inspectCesr(message().repeat(MAX_MESSAGES + 1)), /100,000 messages/);
  assert.throws(() => inspectCesr(message({ a: Array(MAX_NODES).fill(0) })), /decoded nodes/);
  let nested: unknown = 'leaf';
  for (let i = 0; i < MAX_DEPTH + 1; i++) nested = { child: nested };
  assert.throws(() => inspectCesr(message({ a: nested })), /nesting limit/);
  assert.equal(inspectCesr('4AABtest'.repeat(20_001), { mode: 'matter' }).nodes.length, 20_001);
});

test('UTF-8 sizing handles encoder-buffer boundaries and unpaired surrogates', () => {
  for (const text of ['a'.repeat(65_535) + '😀München', '\ud800x\udc00', '😀'.repeat(40_000)]) {
    assert.equal(textByteLength(text), Buffer.byteLength(text));
  }
});

test('streams exceeding the previous byte and message limits decode completely', () => {
  const body = message({ a: 'plain text '.repeat(100) });
  const input = body.repeat(2100);
  assert.ok(input.length > 2 * 1024 * 1024);
  const result = inspectCesr(input);
  assert.equal(result.nodes.length, 2100);
  assert.equal(result.byteLength, input.length);
  assert.deepEqual(result.nodes.at(-1)!.children![0]!.source, { start: input.length - body.length, end: input.length });
});

test('repeated-body source mapping keeps exact offsets at the former quadratic trigger', () => {
  const body = message();
  const count = 30_000;
  const bytes = new TextEncoder().encode(body.repeat(count));
  const frames = parseBytes(bytes);
  // Empty body children avoid measuring unrelated JSON field mapping.
  const nodes = Array.from({ length: count }, () => ({ kind: 'group' as const, children: [
    { kind: 'group' as const, label: 'Body', children: [] },
    { kind: 'group' as const, label: 'Attachments', children: [] },
  ] }));
  linkStreamSources(frames, nodes, bytes);
  for (const index of [0, 1, count - 1]) {
    assert.deepEqual((nodes[index]!.children[0] as { source?: unknown }).source,
      { start: index * body.length, end: (index + 1) * body.length });
  }
});

test('inherited event names cannot create non-cloneable field metadata', () => {
  for (const t of ['__proto__', 'constructor', 'toString']) {
    const result = inspectCesr(message({ t, constructor: 'value', prototype: 'value' }));
    assert.doesNotThrow(() => structuredClone(result));
    assert.ok(result.nodes[0]!.children![0]!.children!.every(child => child.fieldName === undefined));
  }
});

class ControlledWorker {
  onmessage: ((event: MessageEvent<InspectionWorkerMessage>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  terminated = false;
  requests: unknown[] = [];
  postMessage(data: unknown) { this.requests.push(data); }
  terminate() { this.terminated = true; }
}
const response: InspectionResponse = { result: { byteLength: 8, nodes: [], annotations: '', highlights: [] } };

test('inspection waits for worker readiness before sending the first example', async () => {
  const worker = new ControlledWorker();
  const inspector = createInspector(() => worker as unknown as Worker);
  try {
    const pending = inspector.inspect(message(), { mode: 'stream' });
    // Module workers can drop messages while asynchronous imports are still
    // initializing. In dev, cesr-ts installs the handler after the first send.
    assert.equal(worker.requests.length, 0, 'Do not send input before the worker is ready');
    const ready = { data: { ready: true } } as MessageEvent<InspectionWorkerMessage>;
    worker.onmessage!(ready);
    assert.deepEqual(worker.requests, [{ input: message(), options: { mode: 'stream' } }]);
    worker.onmessage!(ready);
    assert.equal(worker.requests.length, 1, 'A duplicate readiness event must not repeat the request');
    worker.onmessage!({ data: response } as MessageEvent<InspectionResponse>);
    assert.deepEqual(await pending, response);
  } finally { inspector.cancel(); }
});

test('inspection cancels stale work, terminates successful workers and preserves source buffers', async () => {
  const workers: ControlledWorker[] = [];
  const inspector = createInspector(() => {
    const worker = new ControlledWorker(); workers.push(worker);
    return worker as unknown as Worker;
  });
  const first = inspector.inspect('4AABtest', { mode: 'matter' });
  const staleReply = workers[0]!.onmessage!;
  const input = new Uint8Array(Buffer.from('4AABtest', 'base64url'));
  const second = inspector.inspect(input, { mode: 'matter', domain: 'bny' });
  assert.equal(await first, null);
  assert.equal(workers[0]!.terminated, true);
  staleReply({ data: { ready: true } } as MessageEvent<InspectionWorkerMessage>);
  assert.equal(workers[0]!.requests.length, 0, 'Cancelled startup must not send input');
  staleReply({ data: response } as MessageEvent<InspectionResponse>);
  assert.equal(workers[1]!.terminated, false);
  workers[1]!.onmessage!({ data: { ready: true } } as MessageEvent<InspectionWorkerMessage>);
  workers[1]!.onmessage!({ data: response } as MessageEvent<InspectionResponse>);
  assert.deepEqual(await second, response);
  assert.equal(workers[1]!.terminated, true);
  assert.equal(input.byteLength, 6);
  const third = inspector.inspect('4AABtest', {});
  inspector.cancel();
  assert.equal(await third, null);
  assert.equal(workers[2]!.terminated, true);
});

test('stalled/crashed workers fail closed and oversized inputs never start a worker', async () => {
  const workers: ControlledWorker[] = [];
  const inspector = createInspector(() => {
    const worker = new ControlledWorker(); workers.push(worker);
    return worker as unknown as Worker;
  }, 10);
  const oversized = await inspector.inspect('x'.repeat(MAX_INPUT_BYTES + 1), {});
  assert.ok(oversized && 'failure' in oversized);
  assert.equal(workers.length, 0);
  const timedOut = await inspector.inspect('4AABtest', {});
  assert.ok(timedOut && 'failure' in timedOut);
  assert.match(timedOut.failure.message, /60-second/);
  assert.equal(workers[0]!.terminated, true);
  const stalled = inspector.inspect('4AABtest', {});
  workers[1]!.onmessage!({ data: { ready: true } } as MessageEvent<InspectionWorkerMessage>);
  const stalledFailure = await stalled;
  assert.ok(stalledFailure && 'failure' in stalledFailure);
  assert.equal(workers[1]!.terminated, true, 'The deadline also covers decoding after readiness');
  const crashed = inspector.inspect('4AABtest', {});
  workers[2]!.onerror!({ preventDefault() {} } as ErrorEvent);
  const failure = await crashed;
  assert.ok(failure && 'failure' in failure);
  assert.equal(workers[2]!.terminated, true);
});

test('static CSP precedes resources and hashes exact inline scripts without enabling eval', () => {
  const scripts = ['window.config={"value":"München 😀"};\n', 'console.log("bootstrap");'];
  const html = '<!doctype html><html><head><script>' + scripts[0] + '</script><script src="/_nuxt/app.js"></script></head><body><script>' + scripts[1] + '</script></body></html>';
  const output = addStaticCsp(html);
  const dom = new JSDOM(output);
  const meta = dom.window.document.head.firstElementChild!;
  assert.equal(meta.getAttribute('http-equiv'), 'Content-Security-Policy');
  const policy = meta.getAttribute('content')!;
  const scriptPolicy = policy.split('; ').find(directive => directive.startsWith('script-src'))!;
  for (const script of scripts) assert.ok(scriptPolicy.includes(`'sha256-${createHash('sha256').update(script).digest('base64')}'`));
  assert.equal((scriptPolicy.match(/sha256-/g) ?? []).length, 2);
  assert.ok(!scriptPolicy.includes("'unsafe-inline'"));
  assert.ok(!scriptPolicy.includes("'unsafe-eval'"));
  assert.ok(policy.includes("worker-src 'self'"));
  assert.ok(policy.includes("base-uri 'none'"));
  assert.deepEqual([...dom.window.document.querySelectorAll('script:not([src])')].map(script => script.textContent), scripts);
  dom.window.close();
});
