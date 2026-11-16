import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { inspectCesr } from '../lib/cesr.js';
import { CESR_EXAMPLE } from '../lib/cesr-example.js';
import { readableText, utf8Offsets, byteToCharacter } from '../lib/source-locations.js';
import { characterRange, setHighlights, sourceHighlights } from '../lib/editor-highlights.js';
import { EditorState } from '@codemirror/state';

const bytes = value => new TextEncoder().encode(value);
const all = nodes => nodes.flatMap(node => [node, ...all(node.children ?? [])]);
function message(fields = {}) {
  const text = JSON.stringify({ v: 'KERI10JSON000000_', t: 'icp', ...fields });
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
    assert.notEqual(primitives[0].source.start, primitives[1].source.start);
    for (const node of nodes.filter(node => node.source && !node.children)) {
      assert.ok(node.source.start >= index * bytes(text).length);
      const raw = new TextDecoder().decode(bytes(input).subarray(node.source.start, node.source.end));
      assert.equal(JSON.parse(raw), node.meta ? node.value : JSON.parse(node.value));
    }
  }
});

test('JSON pointers retain integer key order and last duplicate-key semantics', () => {
  const text = message({ a: { '10': 'ten', '2': 'two' } }).replace('"2":"two","10":"ten"', '"10":"ten","2":"two"');
  const result = inspectCesr(text);
  const children = all(result.nodes).find(n => n.label === 'a').children;
  assert.equal(text.slice(children[0].source.start, children[0].source.end), '"two"');
  assert.equal(text.slice(children[1].source.start, children[1].source.end), '"ten"');
  let duplicate = '{"v":"KERI10JSON000000_","t":"rpy","a":"first","a":"last"}';
  duplicate = duplicate.replace('000000', bytes(duplicate).length.toString(16).padStart(6, '0'));
  const last = all(inspectCesr(duplicate).nodes).find(node => node.label === 'a');
  assert.equal(duplicate.slice(last.source.start, last.source.end), '"last"');

});

test('primitive and repeated-signature links refer to original text and binary bytes', () => {
  for (const domain of ['txt', 'bny']) {
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
  const fixtures = JSON.parse(readFileSync(new URL('./fixtures/nested.json', import.meta.url)));
  for (const row of fixtures.rows) {
    for (const input of [bytes(row.qb64), new Uint8Array(Buffer.from(row.qb2, 'hex'))]) {
      const nodes = all(inspectCesr(input).nodes);
      for (const node of nodes.filter(n => n.source)) {
        assert.ok(node.source.start >= 0 && node.source.end <= input.length && node.source.end > node.source.start, row.name);
      }
      assert.ok(nodes.find(n => n.label === 'Body').source, row.name);
    }
  }
});

test('field labels are scoped to known KERI event bodies, never nested application fields', () => {
  const nodes = all(inspectCesr(message({ k: ['plain'], a: { i: 'application-id', n: 'application-value' } })).nodes);
  assert.equal(nodes.find(n => n.label === 'k').fieldName, 'Signing keys');
  assert.equal(nodes.find(n => n.label === 'i').fieldName, undefined);
  assert.equal(all(inspectCesr(message({ t: 'rpy', k: ['plain'] })).nodes).find(n => n.label === 'k').fieldName, undefined);
});

test('editor offsets preserve CRLF, BOM, Unicode and EOF without splitting surrogate pairs', () => {
  const text = '\ufeffa\r\nMünchen 😀 <img>\u2028';
  const state = EditorState.create({ doc: text, extensions: [EditorState.lineSeparator.of('\n'), sourceHighlights] });
  assert.equal(state.doc.toString(), text);
  const offsets = utf8Offsets(text);
  assert.equal(offsets.at(-1), bytes(text).length);
  const emoji = text.indexOf('😀');
  assert.equal(byteToCharacter(offsets, offsets[emoji] + 2), emoji);
  assert.deepEqual(characterRange(text, { start: offsets[emoji] + 1, end: offsets[emoji] + 2 }), { from: emoji, to: emoji + 2 });
  const highlighted = state.update({ effects: setHighlights.of({ target: { start: offsets[emoji], end: offsets[emoji] + 4 } }) }).state;
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
