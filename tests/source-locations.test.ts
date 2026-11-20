import fixtures from './fixtures/nested.json' with { type: 'json' };
import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectCesr } from '../lib/cesr.ts';
import { CESR_EXAMPLE } from '../lib/cesr-example.ts';
import { readableText, utf8Offsets, byteToCharacter, primitiveRanges } from '../lib/source-locations.ts';
import { characterRange, setHighlights, sourceHighlights } from '../lib/editor-highlights.ts';
import { EditorState } from '@codemirror/state';

import type { InspectionNode } from '../lib/types.ts';

const bytes = (value: string) => new TextEncoder().encode(value);
const all = (nodes: InspectionNode[]): InspectionNode[] => nodes.flatMap(node => [node, ...all(node.children ?? [])]);
function message(fields: Record<string, unknown> = {}) {
  const text = JSON.stringify({ v: 'KERI10JSON000000_', t: 'icp', ...fields });
  return sized(text);
}
function sized(text: string) {
  return text.replace('000000', bytes(text).length.toString(16).padStart(6, '0'));
}

test('source links distinguish repeated identifiers, repeated messages and escaped values', () => {
  const key = 'DNG2arBDtHK_JyHRAq-emRdC6UM-yIpCAeJIWDiXp4Hx';
  const text = message({ note: 'München 😀', i: key, k: [key], a: { 'a/b~c': 'quote"and\\slash', n: 0 } });
  const input = text + text;
  const result = inspectCesr(input);
  for (const [index, root] of result.nodes.entries()) {
    const nodes = all([root]);
    const primitives = nodes.filter(node => node.meta);
    assert.equal(primitives.length, 2);
    assert.notEqual(primitives[0]!.source!.start, primitives[1]!.source!.start);
    for (const node of nodes.filter(node => node.source && !node.children)) {
      assert.ok(node.source!.start >= index * bytes(text).length);
      const raw = new TextDecoder().decode(bytes(input).subarray(node.source!.start, node.source!.end));
      assert.equal(JSON.parse(raw), node.meta ? node.value : JSON.parse(node.value!));
    }
  }
});

test('JSON pointers retain integer key order and last duplicate-key semantics', () => {
  const text = message({ a: { '10': 'ten', '2': 'two' } }).replace('"2":"two","10":"ten"', '"10":"ten","2":"two"');
  const result = inspectCesr(text);
  const children = all(result.nodes).find(n => n.label === 'a')!.children!;
  assert.equal(text.slice(children[0]!.source!.start, children[0]!.source!.end), '"two"');
  assert.equal(text.slice(children[1]!.source!.start, children[1]!.source!.end), '"ten"');
  let duplicate = '{"v":"KERI10JSON000000_","t":"rpy","a":"first","a":"last"}';
  duplicate = duplicate.replace('000000', bytes(duplicate).length.toString(16).padStart(6, '0'));
  const last = all(inspectCesr(duplicate).nodes).find(node => node.label === 'a')!;
  assert.equal(duplicate.slice(last!.source!.start, last!.source!.end), '"last"');

});

test('primitive and repeated-signature links refer to original text and binary bytes', () => {
  for (const domain of ['txt', 'bny'] as const) {
    const text = '-AAC' + 'A'.repeat(176);
    const input = domain === 'txt' ? text : new Uint8Array(Buffer.from(text, 'base64url'));
    const nodes = all(inspectCesr(input, { mode: 'attachments', domain }).nodes).filter(n => n.meta);
    const size = domain === 'txt' ? 88 : 66;
    const header = domain === 'txt' ? 4 : 3;
    assert.deepEqual(nodes.map(n => n.source), [
      { start: 0, end: header },
      { start: header, end: header + size },
      { start: header + size, end: header + 2 * size },
    ]);
    const fragments = domain === 'txt' ? '4AABtest4AABtest' : new Uint8Array(Buffer.from('4AABtest4AABtest', 'base64url'));
    assert.deepEqual(inspectCesr(fragments, { mode: 'matter', domain }).nodes.map(n => n.source), domain === 'txt'
      ? [{ start: 0, end: 8 }, { start: 8, end: 16 }] : [{ start: 0, end: 6 }, { start: 6, end: 12 }]);
  }
});

test('nested binary and text message body links remain inside the original stream', () => {

  for (const row of fixtures.rows) {
    for (const input of [bytes(row.qb64), new Uint8Array(Buffer.from(row.qb2, 'hex'))]) {
      const nodes = all(inspectCesr(input).nodes);
      for (const node of nodes.filter(n => n.source)) {
        assert.ok(node.source!.start >= 0 && node.source!.end <= input.length && node.source!.end > node.source!.start, row.name);
      }
      assert.ok(nodes.find(n => n.label === 'Body')!.source, row.name);
    }
  }
});

test('field labels are scoped to known KERI event bodies, never nested application fields', () => {
  const nodes = all(inspectCesr(message({ k: ['plain'], a: { i: 'application-id', n: 'application-value' } })).nodes);
  assert.equal(nodes.find(n => n.label === 'k')!.fieldName, 'Signing keys');
  assert.equal(nodes.find(n => n.label === 'i')!.fieldName, undefined);
  assert.equal(all(inspectCesr(message({ t: 'rpy', k: ['plain'] })).nodes).find(n => n.label === 'k')!.fieldName, undefined);
});

test('TEL and ACDC field names are detected from the message, with no profile selector', () => {
  const name = (input: string, label: string) => all(inspectCesr(input).nodes).find(n => n.label === label)!.fieldName;
  assert.equal(name(message({ t: 'iss', ri: 'registry' }), 'ri'), 'Registry identifier');
  assert.equal(name(message({ t: 'vcp', ii: 'issuer' }), 'ii'), 'Issuer identifier');
  const acdc = sized(JSON.stringify({ v: 'ACDC10JSON000000_', d: 'said', s: 'schema', a: { s: 'nested' } }));
  const nodes = all(inspectCesr(acdc).nodes).filter(n => n.label === 's');
  assert.deepEqual(nodes.map(n => n.fieldName), ['Schema', undefined]);
});

test('editor offsets preserve CRLF, BOM, Unicode and EOF without splitting surrogate pairs', () => {
  const text = '\ufeffa\r\nMünchen 😀 <img>\u2028';
  const state = EditorState.create({ doc: text, extensions: [EditorState.lineSeparator.of('\n'), sourceHighlights] });
  assert.equal(state.doc.toString(), text);
  const offsets = utf8Offsets(text);
  assert.equal(offsets.at(-1), bytes(text).length);
  const emoji = text.indexOf('😀');
  assert.equal(byteToCharacter(offsets, offsets[emoji]! + 2), emoji);
  assert.deepEqual(characterRange(text, { start: offsets[emoji]! + 1, end: offsets[emoji]! + 2 }), { from: emoji, to: emoji + 2 });
  const highlighted = state.update({ effects: setHighlights.of({ target: { start: offsets[emoji]!, end: offsets[emoji]! + 4 } }) }).state;
  assert.equal(highlighted.doc.toString(), text);
  assert.equal(highlighted.field(sourceHighlights).size, 1);
  const edited = highlighted.update({ changes: { from: 0, insert: 'x' } }).state;
  assert.equal(edited.field(sourceHighlights).size, 0);
  assert.equal(readableText(bytes(text)), text);
  assert.equal(readableText(new Uint8Array([0xff, 0, 0x12])), null);
});

test('display metadata never changes sample bytes or parsed semantics', () => {
  const input = bytes(CESR_EXAMPLE);
  const snapshot = input.slice();
  const result = inspectCesr(input);
  assert.deepEqual(input, snapshot);
  assert.equal(result.byteLength, 299);
  assert.equal(result.highlights.length, 4);
});

test('highlight collection sorts nested primitive ranges and preserves equal-offset order', () => {
  const meta = inspectCesr('4AABtest', { mode: 'matter' }).nodes[0]!.meta!;
  const first = { start: 4, end: 12 }, nested = { start: 4, end: 8 }, last = { start: 20, end: 24 };
  const nodes: InspectionNode[] = [
    { kind: 'primitive', meta, source: last },
    { kind: 'group', source: { start: 0, end: 30 }, children: [
      { kind: 'primitive', meta, source: first, children: [
        { kind: 'primitive', meta, source: nested },
        { kind: 'primitive', meta },
      ] },
    ] },
  ];
  const ranges = primitiveRanges(nodes);
  assert.deepEqual(ranges, [first, nested, last]);
  assert.equal(ranges[0], first);
  assert.equal(nodes[0]!.source, last);
  assert.deepEqual(primitiveRanges([]), []);
});
