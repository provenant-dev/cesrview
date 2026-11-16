import assert from 'node:assert/strict';
import { createPrivateKey, createPublicKey, verify } from 'node:crypto';
import test from 'node:test';
import { blake3 } from '@noble/hashes/blake3';
import { parseBytes, SerderKERI } from 'cesr-ts';
import { exampleEvents } from '../build/example-events.mjs';
import events from '../lib/cesr-example-events.json' with { type: 'json' };
import { CESR_EXAMPLE, CESR_EXAMPLES, exampleInput } from '../lib/cesr-example.js';
import { inspectCesr } from '../lib/cesr.js';

const bytes = text => new TextEncoder().encode(text);
const qualified = (code, raw) => code + Buffer.concat([Buffer.alloc(1), Buffer.from(raw)]).toString('base64url').slice(1);
const digest = text => qualified('E', blake3(bytes(text)));
const expected = {
  'keripy-inception': [1, null], 'signed-inception': [1, null], 'key-event-stream': [3, null],
  'ed25519-key': [1, 'D'], 'blake3-said': [1, 'E'], 'indexed-signature': [1, 'A'],
  'signature-group-v1': [1, '-A'], 'signature-group-v2': [1, '-K'], 'signature-group-qb2': [1, '-K'],
};

test('example ids are unique and generated events remain reproducible', () => {
  assert.equal(new Set(CESR_EXAMPLES.map(example => example.id)).size, CESR_EXAMPLES.length);
  assert.deepEqual(events, exampleEvents());
});

for (const example of CESR_EXAMPLES) {
  test(`example decodes completely with its declared settings: ${example.id}`, () => {
    const input = exampleInput(example);
    const result = inspectCesr(input, example);
    const [count, code] = expected[example.id];
    assert.equal(result.nodes.length, count);
    assert.equal(result.byteLength, typeof input === 'string' ? bytes(input).length : input.length);
    if (code) assert.equal(result.nodes[0].meta.Code, code);
    if (example.mode === 'attachments') {
      const group = result.nodes[0];
      assert.equal(group.meta.Count, example.major === 1 ? 1 : 22);
      assert.equal(group.meta.Version, `${example.major}.0`);
      assert.equal(group.children.length, 1);
      const signature = group.children[0].children[0];
      assert.equal(signature.value, events[0].signature);
      assert.equal(signature.meta.Index, 0);
      assert.equal(signature.source.end, result.byteLength);
    }
  });
}

test('event bodies have exact byte sizes and independently recomputed BLAKE3 SAIDs', () => {
  for (const body of [CESR_EXAMPLE, ...events.map(event => event.body)]) {
    const sad = JSON.parse(body);
    assert.equal(Number.parseInt(sad.v.slice(10, 16), 16), bytes(body).length);
    assert.equal(sad.d, digest(JSON.stringify({ ...sad, d: '#'.repeat(44) })));
    assert.equal(new SerderKERI({ raw: bytes(body), verify: true }).verify(), true);
  }
});

test('Ed25519 signatures verify with Node crypto over the exact example body bytes', () => {
  let activeKey;
  for (const { body, signature } of events) {
    const sad = JSON.parse(body);
    if (sad.k) activeKey = sad.k[0];
    const key = createPublicKey({
      key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(activeKey, 'base64url').subarray(1)]),
      format: 'der', type: 'spki',
    });
    assert.equal(signature.slice(0, 2), 'AA'); // Ed25519, key index/ondex 0
    const rawSignature = Buffer.from(signature, 'base64url').subarray(2);
    assert.equal(rawSignature.length, 64);
    assert.equal(verify(null, bytes(body), key, rawSignature), true);
    assert.equal(verify(null, bytes(body + ' '), key, rawSignature), false);
  }
});

test('the event stream preserves the identifier, prior links and rotation commitments', () => {
  const example = CESR_EXAMPLES.find(example => example.id === 'key-event-stream');
  const frames = parseBytes(bytes(example.text));
  assert.deepEqual(frames.map(frame => frame.body.ked.t), ['icp', 'rot', 'ixn']);
  const [icp, rot, ixn] = frames.map(frame => frame.body.ked);
  assert.equal(icp.i, icp.k[0]);
  assert.equal(rot.i, icp.i);
  assert.equal(ixn.i, icp.i);
  assert.deepEqual([icp.s, rot.s, ixn.s], ['0', '1', '2']);
  assert.equal(rot.p, icp.d);
  assert.equal(ixn.p, rot.d);
  assert.equal(icp.n[0], digest(rot.k[0]));
  const futureKey = createPublicKey(createPrivateKey({
    key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.alloc(32, 3)]),
    format: 'der', type: 'pkcs8',
  })).export({ format: 'der', type: 'spki' }).subarray(-32);
  assert.equal(rot.n[0], digest(qualified('D', futureKey)));
  assert.deepEqual([icp.kt, icp.nt, rot.kt, rot.nt], ['1', '1', '1', '1']);
  for (const frame of frames) {
    assert.equal(frame.attachments.length, 1);
    assert.equal(frame.attachments[0].items.length, 1);
  }
});

test('text and binary v2 attachment examples encode identical material', () => {
  const text = CESR_EXAMPLES.find(example => example.id === 'signature-group-v2');
  const binary = exampleInput(CESR_EXAMPLES.find(example => example.id === 'signature-group-qb2'));
  assert.equal(binary.length, 69);
  assert.equal(Buffer.from(binary).toString('base64url'), text.text);
});
