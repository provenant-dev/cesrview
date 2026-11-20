import fixtures from './fixtures/nested.json' with { type: 'json' };
import type { InspectionFailure, InspectionResult } from '../lib/types.ts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import { build } from 'vite';
import { parse } from '@vue/compiler-sfc';
import { compile } from '@vue/compiler-dom';
import * as Vue from 'vue';
import { renderToString } from 'vue/server-renderer';

test('browser bundle executes without Node globals or external imports', async () => {
  const output = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      lib: { entry: fileURLToPath(new URL('../lib/cesr.ts', import.meta.url)), formats: ['es'] },
    },
  });
  const chunks = [output].flat().flatMap(build => {
    assert.ok('output' in build);
    return build.output;
  }).filter(item => item.type === 'chunk');
  assert.equal(chunks.length, 1);
  assert.deepEqual(chunks[0]!.imports, []);
  assert.deepEqual(chunks[0]!.dynamicImports, []);
  const context = vm.createContext({ TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView, RangeError, atob, btoa },
    { codeGeneration: { strings: false, wasm: true } });
  const module = new vm.SourceTextModule(chunks[0]!.code, { context });
  await module.link(specifier => { throw new Error(`Unexpected runtime import: ${specifier}`); });
  await module.evaluate({ timeout: 5000 });
  context.CesrViewerParser = module.namespace;
  const result: InspectionResult = vm.runInContext("CesrViewerParser.inspectCesr('4AABtest', {mode:'matter'})", context);
  assert.equal(result.nodes[0]!.value, '4AABtest');
  assert.equal(vm.runInContext('typeof process', context), 'undefined');
  assert.equal(vm.runInContext('typeof Buffer', context), 'undefined');
  const stream = '{"v":"KERI10JSON000023_","t":"rpy"}-AAB' + 'A'.repeat(88);
  context.stream = stream;
  assert.equal(vm.runInContext('CesrViewerParser.inspectCesr(stream).nodes.length', context), 1);

  for (const row of fixtures.rows) {
    context.stream = new Uint8Array(Buffer.from(row.qb2, 'hex'));
    assert.equal(vm.runInContext('CesrViewerParser.inspectCesr(stream).nodes.length', context), 1, row.name);
  }
  // Exercise error names and locations through the package's browser export.
  const { CESR_EXAMPLE, CESR_EXAMPLES, exampleInput } = await import('../lib/cesr-example.ts');
  for (const example of CESR_EXAMPLES) {
    context.exampleInput = exampleInput(example);
    context.exampleOptions = example;
    assert.ok(vm.runInContext('CesrViewerParser.inspectCesr(exampleInput, exampleOptions).nodes.length > 0', context), example.id);
  }
  context.valid = CESR_EXAMPLE;
  const failure = (input: string): InspectionFailure => {
    context.bad = input;
    return vm.runInContext(`(() => {
      try { CesrViewerParser.inspectCesr(bad); } catch (cause) {
        return CesrViewerParser.describeInspectionError(cause, bad);
      }
    })()`, context);
  };
  const malformed = CESR_EXAMPLE.replace('"s":"0"', '"s":x00');
  assert.equal(failure(malformed).location!.start, malformed.indexOf('x00'));
  assert.equal(failure(CESR_EXAMPLE + malformed).location!.start, CESR_EXAMPLE.length + malformed.indexOf('x00'));
  let unicode = '{"v":"KERI10JSON000000_","t":"rpy","a":"München 😀","bad":x}';
  unicode = unicode.replace('000000', new TextEncoder().encode(unicode).length.toString(16).padStart(6, '0'));
  assert.equal(failure(unicode).location!.start, new TextEncoder().encode(unicode.slice(0, unicode.indexOf(':x') + 1)).length);

  assert.equal(failure(CESR_EXAMPLE.slice(0, -1)).location!.kind, 'end');
  assert.equal(failure(CESR_EXAMPLE.slice(0, -1)).location!.start, CESR_EXAMPLE.length - 1);
  assert.throws(
    () => vm.runInContext("CesrViewerParser.inspectCesr('4AABtes', {mode:'matter'})", context),
    error => typeof error === 'object' && error !== null
      && 'message' in error && typeof error.message === 'string'
      && /Need .* bytes/.test(error.message) && 'name' in error && error.name === 'ShortageError',
  );
});

test('the actual recursive Vue template renders untrusted keys and values as text', async () => {
  const source = readFileSync(new URL('../components/cesr-node.vue', import.meta.url), 'utf8');
  const { descriptor } = parse(source);
  const render: Vue.RenderFunction = new Function('Vue', compile(descriptor.template!.content, { prefixIdentifiers: true }).code)(Vue);
  const component = { name: 'CesrNode', props: ['node', 'selected', 'showLabels', 'depth'], emits: ['select'],
    setup: () => ({ expanded: true, visible: 50, toggle: () => {}, preview: (value: string) => value }), render };
  const hostile = '<img src=x onerror=alert(1)>';
  const app = Vue.createSSRApp(component, {
    node: { label: hostile, value: hostile, children: [{ value: hostile, meta: { Code: 'A' } }] },
  });
  app.component('CesrNode', component);
  const html = await renderToString(app);
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('<button'));
});
