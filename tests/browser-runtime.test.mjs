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
  assert.throws(
    () => vm.runInContext("CesrViewerParser.inspectCesr('4AABtes', {mode:'matter'})", context),
    error => /Need .* bytes/.test(error.message) && error.name === 'ShortageError',
  );
});

test('the actual recursive Vue template renders untrusted keys and values as text', async () => {
  const source = readFileSync(new URL('../components/cesr-node.vue', import.meta.url), 'utf8');
  const { descriptor } = parse(source);
  const render = new Function('Vue', compile(descriptor.template.content, { prefixIdentifiers: true }).code)(Vue);
  const component = { name: 'CesrNode', props: ['node'], emits: ['select'], render };
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
