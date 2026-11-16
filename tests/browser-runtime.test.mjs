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
import { cesrBrowserEntry, cesrBrowserPlugin } from '../build/cesr-browser.mjs';

test('browser bundle executes without Node globals or external imports', async () => {
  const output = await build({
    configFile: false,
    logLevel: 'silent',
    resolve: { alias: [{ find: /^cesr-ts$/, replacement: cesrBrowserEntry }] },
    plugins: [cesrBrowserPlugin()],
    build: {
      write: false,
      minify: false,
      lib: { entry: fileURLToPath(new URL('../lib/cesr.js', import.meta.url)), formats: ['es'] },
    },
  });
  const chunks = [output].flat().flatMap(build => build.output).filter(item => item.type === 'chunk');
  assert.equal(chunks.length, 1);
  assert.deepEqual(chunks[0].imports, []);
  assert.deepEqual(chunks[0].dynamicImports, []);
  const context = vm.createContext({ TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView, RangeError, atob, btoa });
  const module = new vm.SourceTextModule(chunks[0].code, { context });
  await module.link(specifier => { throw new Error(`Unexpected runtime import: ${specifier}`); });
  await module.evaluate({ timeout: 5000 });
  context.CesrViewerParser = module.namespace;
  const result = vm.runInContext("CesrViewerParser.inspectCesr('4AABtest', {mode:'matter'})", context);
  assert.equal(result.nodes[0].value, '4AABtest');
  assert.equal(vm.runInContext('typeof process', context), 'undefined');
  assert.equal(vm.runInContext('typeof Buffer', context), 'undefined');
  const stream = '{"v":"KERI10JSON000023_","t":"rpy"}-AAB' + 'A'.repeat(88);
  context.stream = stream;
  assert.equal(vm.runInContext('CesrViewerParser.inspectCesr(stream).nodes.length', context), 1);
  const fixtures = JSON.parse(readFileSync(new URL('./fixtures/nested.json', import.meta.url)));
  for (const row of fixtures.rows) {
    context.stream = new Uint8Array(Buffer.from(row.qb2, 'hex'));
    assert.equal(vm.runInContext('CesrViewerParser.inspectCesr(stream).nodes.length', context), 1, row.name);
  }
  // Exercise errors in the real browser bundle, where the package's error-name
  // packaging adapter is applied (its Node entry has a broken import.meta shim).
  const { CESR_EXAMPLE, CESR_EXAMPLES, exampleInput } = await import('../lib/cesr-example.js');
  for (const example of CESR_EXAMPLES) {
    context.exampleInput = exampleInput(example);
    context.exampleOptions = example;
    assert.ok(vm.runInContext('CesrViewerParser.inspectCesr(exampleInput, exampleOptions).nodes.length > 0', context), example.id);
  }
  context.valid = CESR_EXAMPLE;
  const failure = input => {
    context.bad = input;
    return vm.runInContext(`(() => {
      try { CesrViewerParser.inspectCesr(bad); } catch (cause) {
        return CesrViewerParser.describeInspectionError(cause, bad);
      }
    })()`, context);
  };
  const malformed = CESR_EXAMPLE.replace('"s":"0"', '"s":x00');
  assert.equal(failure(malformed).location.start, malformed.indexOf('x00'));
  assert.equal(failure(CESR_EXAMPLE + malformed).location.start, CESR_EXAMPLE.length + malformed.indexOf('x00'));
  let unicode = '{"v":"KERI10JSON000000_","t":"rpy","a":"München 😀","bad":x}';
  unicode = unicode.replace('000000', new TextEncoder().encode(unicode).length.toString(16).padStart(6, '0'));
  assert.equal(failure(unicode).location.start, new TextEncoder().encode(unicode.slice(0, unicode.indexOf(':x') + 1)).length);

  assert.equal(failure(CESR_EXAMPLE.slice(0, -1)).location.kind, 'end');
  assert.equal(failure(CESR_EXAMPLE.slice(0, -1)).location.start, CESR_EXAMPLE.length - 1);
  assert.throws(
    () => vm.runInContext("CesrViewerParser.inspectCesr('4AABtes', {mode:'matter'})", context),
    error => /Need .* bytes/.test(error.message) && error.name === 'ShortageError',
  );
});

test('the actual recursive Vue template renders untrusted keys and values as text', async () => {
  const source = readFileSync(new URL('../components/cesr-node.vue', import.meta.url), 'utf8');
  const { descriptor } = parse(source);
  const render = new Function('Vue', compile(descriptor.template.content, { prefixIdentifiers: true }).code)(Vue);
  const component = { name: 'CesrNode', props: ['node', 'selected', 'showLabels'], emits: ['select'], render };
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
