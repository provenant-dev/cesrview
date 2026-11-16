import fixtures from './fixtures/nested.json' with { type: 'json' };
import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectCesr } from '../lib/cesr.ts';

import type { InspectionNode, InspectionResult } from '../lib/types.ts';

const bytes = (text: string) => new TextEncoder().encode(text);
const signature = 'A'.repeat(88);
function message(fields: Record<string, unknown> = {}) {
  const text = JSON.stringify({ v: 'KERI10JSON000000_', t: 'rpy', ...fields });
  return text.replace('000000', bytes(text).length.toString(16).padStart(6, '0'));
}
function allNodes(nodes: InspectionNode[]): InspectionNode[] {
  return nodes.flatMap(node => [node, ...allNodes(node.children ?? [])]);
}
function named(result: InspectionResult, label: string) {
  const node = allNodes(result.nodes).find(node => node.label === label);
  assert.ok(node, `Missing node: ${label}`);
  return node;
}

test('variable-length matter and SAD paths stay whole, in both domains', () => {
  for (const text of ['4AABtest', '6AABAAA-', '4AAB-5-3', '7AAAAAABtest']) {
    for (const domain of ['txt', 'bny'] as const) {
      const input = domain === 'txt' ? text : new Uint8Array(Buffer.from(text, 'base64url'));
      const result = inspectCesr(input, { mode: 'matter', domain });
      assert.equal(result.nodes.length, 1);
      assert.equal(result.nodes[0]!.value, text);
    }
  }
});

test('indexed signatures use their contextual table and retain zero indices', () => {
  const result = inspectCesr(message() + '-AAB' + signature);
  const tokens = allNodes(result.nodes).filter(node => node.meta?.Family === 'Indexed signature');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0]!.value!.length, 88);
  assert.equal(tokens[0]!.meta!.Name, 'Ed25519_Sig');
  assert.equal(tokens[0]!.meta!.Index, 0);
});

test('preserves JSON braces, escaped quotes, Unicode, arrays, null and numeric values', () => {
  const text = message({ note: '} \\" { München & <tag>', n: 3, b: true, z: null, list: [false, 0, ''] });
  const result = inspectCesr(text + message({ n: 4 }));
  assert.equal(result.nodes.length, 2);
  assert.equal(named(result, 'note').value, JSON.stringify('} \\" { München & <tag>'));
  assert.equal(named(result, 'n').value, '3');
  assert.equal(named(result, 'b').value, 'true');
  assert.equal(named(result, 'z').value, 'null');
  assert.deepEqual(named(result, 'list').children!.map(node => node.value), ['false', '0', '""']);
  assert.ok(result.annotations.includes('München & <tag>'));
});

test('never sanitizes or executes application text before parsing', () => {
  const value = '<img src=x onerror=alert(1)> & &#60;';
  const result = inspectCesr(message({ [value]: value }));
  assert.equal(named(result, value).value, JSON.stringify(value));
});

test('preserves mixed JSON, CBOR, MessagePack and binary attachment boundaries', () => {
  // Independent hand-encoded one-field maps with 21-byte versioned bodies.
  const cbor = Uint8Array.from([0xa1, 0x61, 0x76, 0x71, ...bytes('KERI10CBOR000015_')]);
  const mgpk = Uint8Array.from([0x81, 0xa1, 0x76, 0xb1, ...bytes('KERI10MGPK000015_')]);
  const attachments = Buffer.from('-AAB' + signature, 'base64url');
  const stream = Uint8Array.from([...bytes(message()), ...attachments, ...cbor, ...mgpk]);
  const result = inspectCesr(stream);
  assert.equal(result.nodes.length, 3);
  assert.match(result.nodes[0]!.value!, /JSON/);
  assert.match(result.nodes[1]!.value!, /CBOR/);
  assert.match(result.nodes[2]!.value!, /MGPK/);
  assert.equal(allNodes(result.nodes).filter(node => node.meta?.Family === 'Indexed signature').length, 1);
});

test('distinguishes V1 item counts from V2 quadlet counts, including big counters', () => {
  for (const [major, header, count] of [[1, '-AAB', 1], [2, '-KAW', 22], [2, '--KAAAAW', 22]] as const) {
    for (const domain of ['txt', 'bny'] as const) {
      const text = header + signature;
      const input = domain === 'txt' ? text : new Uint8Array(Buffer.from(text, 'base64url'));
      const result = inspectCesr(input, { mode: 'attachments', major, domain });
      assert.equal(result.nodes[0]!.meta!.Count, count);
      assert.equal(allNodes(result.nodes).filter(node => node.meta?.Family === 'Indexed signature').length, 1);
    }
  }
});

test('rejects malformed, truncated and trailing input instead of returning partial success', () => {
  for (const text of [message().slice(0, -1), message() + '-AABAAA', message() + 'garbage',
    message().replace('000023', '000024'), '-_AAADAA' + message(), '{"a":"}"}']) {
    assert.throws(() => inspectCesr(text), text);
  }
  for (const text of ['4AABtes', 'D'.repeat(43), 'MAA!', 'MAAA!']) {
    assert.throws(() => inspectCesr(text, { mode: 'matter' }), text);
  }
  assert.throws(() => inspectCesr('-KAV' + signature, { mode: 'attachments', major: 2 }));
  assert.throws(() => inspectCesr('-KAX' + signature, { mode: 'attachments', major: 2 }));
  assert.throws(() => inspectCesr(''));
});

test('standalone indexed signatures are explicitly distinct from matter', () => {
  assert.equal(inspectCesr(signature, { mode: 'indexer' }).nodes.length, 1);
  assert.equal(inspectCesr(signature, { mode: 'matter' }).nodes.length, 2);
});


for (const row of fixtures.rows) {
  test(`KERIpy reference: ${row.name} preserves nested message ownership in text and binary`, () => {
    for (const input of [row.qb64, new Uint8Array(Buffer.from(row.qb2, 'hex'))]) {
      const result = inspectCesr(input);
      assert.equal(result.nodes.length, 1);
      assert.equal(named(result, 'Nested messages').children!.length, row.childCount);
      assert.equal(named(result, 'd').value, row.said);
      assert.ok(result.annotations.length > 0);
    }
  });
}
