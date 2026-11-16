import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import vue from '@vitejs/plugin-vue';
import { JSDOM, VirtualConsole } from 'jsdom';
import { cesrBrowserEntry, cesrBrowserPlugin } from '../build/cesr-browser.mjs';
import { CESR_EXAMPLE, CESR_EXAMPLES, exampleInput } from '../lib/cesr-example.js';

// Mount the real components and CodeMirror in a DOM. Layout is deliberately not
// simulated: this checks editing, events and state, not browser visual rendering.
test('viewer connects editing, source selection, errors, labels, resizing and file bytes', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const components = ['CesrNode', 'PreviewField', 'SourceEditor', 'ByteView', 'SplitPane'];
  const files = ['cesr-node', 'preview-field', 'source-editor', 'byte-view', 'split-pane'];
  const entry = `
    import { createApp, nextTick } from 'vue';
    import { EditorView } from '@codemirror/view';
    import Page from ${JSON.stringify(root + 'pages/index.vue')};
    ${components.map((name, i) => `import ${name} from ${JSON.stringify(root + 'components/' + files[i] + '.vue')};`).join('\n')}
    const app = createApp(Page);
    ${components.map(name => `app.component('${name}', ${name});`).join('\n')}
    app.component('LazySourceEditor', SourceEditor);
    app.mount('#app');
    window.viewerTest = { app, nextTick, EditorView };
  `;
  const output = await build({
    configFile: false, logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"production"' },
    resolve: { alias: [{ find: '~', replacement: root }, { find: /^cesr-ts$/, replacement: cesrBrowserEntry }] },
    plugins: [vue(), cesrBrowserPlugin(), {
      name: 'viewer-test-entry', resolveId: id => id.endsWith('virtual:viewer-test') ? '\0viewer-test' : null,
      load: id => id === '\0viewer-test' ? entry : null,
    }],
    build: { write: false, minify: false, lib: { entry: 'virtual:viewer-test', formats: ['es'] } },
  });
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  virtualConsole.on('error', error => errors.push(error));
  const dom = new JSDOM('<div id="app"></div>', {
    url: 'https://viewer.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole,
    beforeParse(window) {
      window.TextEncoder = TextEncoder;
      window.TextDecoder = TextDecoder;
      window.Uint8Array = Uint8Array;
      window.ArrayBuffer = ArrayBuffer;
      window.DataView = DataView;
      window.RangeError = RangeError;
      window.Range.prototype.getClientRects = () => [];
      window.Range.prototype.getBoundingClientRect = () => new window.DOMRect();
    },
  });
  const { window } = dom;
  try {
    const module = new vm.SourceTextModule([output].flat().flatMap(build => build.output).find(item => item.type === 'chunk').code, { context: dom.getInternalVMContext() });
    await module.link(specifier => { throw new Error(`Unexpected import: ${specifier}`); });
    await module.evaluate();
    const tick = () => window.viewerTest.nextTick();
    const document = window.document;
    const button = label => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === label);
    const editor = () => window.viewerTest.EditorView.findFromDOM(document.querySelector('.cm-content'));
    const setText = text => editor().dispatch({ changes: { from: 0, to: editor().state.doc.length, insert: text } });
    const loadExample = async id => {
      const picker = document.querySelector('#input-example');
      picker.value = id;
      picker.dispatchEvent(new window.Event('change', { bubbles: true }));
      await tick(); await tick();
      assert.equal(picker.value, ''); // The same example can be loaded again.
    };
    await tick();
    assert.equal(editor().state.doc.toString(), CESR_EXAMPLE);
    assert.ok(document.querySelector('.structure-content'), document.body.textContent + JSON.stringify(errors.map(String)));
    assert.match(document.querySelector('.structure-content').textContent, /Signing keys/);
    assert.ok(document.querySelector('.syntax-key'));
    assert.ok(document.querySelector('.source-cesr'));

    const token = [...document.querySelectorAll('.cesr-token')].find(el => el.textContent.startsWith('EIcca'));
    token.click();
    await tick();
    assert.ok(document.querySelector('.source-selected'));
    assert.match(document.querySelector('.source-location').textContent, /Bytes 39–84/);
    document.querySelector('[aria-label="Dismiss value details"]').click();
    await tick();
    assert.equal(document.querySelector('.source-selected'), null);

    const labels = document.querySelector('.field-label-toggle input');
    labels.click();
    await tick();
    assert.equal(document.querySelector('.field-name'), null);
    labels.click();
    await tick();
    assert.ok(document.querySelector('.field-name'));

    const separator = document.querySelector('[role="separator"]');
    separator.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await tick();
    assert.equal(separator.getAttribute('aria-valuenow'), '40');
    assert.equal(window.localStorage.getItem('cesr-viewer-input-width'), '40');
    separator.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
    await tick();
    assert.equal(separator.getAttribute('aria-valuenow'), '38');

    const malformed = CESR_EXAMPLE.replace('"s":"0"', '"s":x00');
    setText(malformed);
    await tick();
    assert.equal(document.querySelector('.structure-content'), null);
    button('Inspect').click();
    await tick();
    assert.match(document.querySelector('[role="alert"]').textContent, /Error at byte/);
    assert.equal(document.querySelector('.source-error').textContent, 'x');

    await loadExample('keripy-inception');
    assert.equal(editor().state.doc.toString(), CESR_EXAMPLE);
    assert.ok(document.querySelector('.structure-content'));
    assert.equal(document.querySelector('.source-error'), null);
    for (const example of [...CESR_EXAMPLES, CESR_EXAMPLES[0]]) {
      await loadExample(example.id);
      assert.equal(document.querySelector('#parse-mode').value, example.mode);
      if (example.mode !== 'stream') assert.equal(document.querySelector('#input-domain').value, example.domain);
      if (example.mode === 'attachments') assert.equal(document.querySelector('#table-version').value, String(example.major));
      assert.ok(document.querySelector('.structure-content'), example.id);
      assert.equal(document.querySelector('[role="alert"]'), null, example.id);
      assert.match(document.querySelector('.input-caption').textContent, /Example:/);
      assert.equal(document.querySelector('.example-description').textContent, example.description);
      if (example.domain === 'txt') assert.equal(editor().state.doc.toString(), exampleInput(example));
      else assert.ok(document.querySelector('.byte-view'));
    }
    setText('first\r\nsecond 😀');
    await tick();
    assert.equal(document.querySelector('.example-description'), null);
    assert.equal(editor().state.doc.toString(), 'first\r\nsecond 😀');
    button('Clear').click();
    await tick();
    assert.equal(editor().state.doc.toString(), '');
    assert.equal(button('Inspect').disabled, true);

    const mode = document.querySelector('#parse-mode');
    mode.value = 'matter'; mode.dispatchEvent(new window.Event('change', { bubbles: true }));
    await tick();
    const domain = document.querySelector('#input-domain');
    domain.value = 'bny'; domain.dispatchEvent(new window.Event('change', { bubbles: true }));
    await tick();
    const raw = Buffer.from('4AABtest', 'base64url');
    const fileBytes = new window.Uint8Array(raw);
    const file = { name: 'primitive.qb2', arrayBuffer: async () => fileBytes.buffer };
    Object.defineProperty(document.querySelector('#input-file'), 'files', { value: [file], configurable: true });
    document.querySelector('#input-file').dispatchEvent(new window.Event('change', { bubbles: true }));
    await tick(); await tick();
    assert.ok(document.querySelector('.byte-view'));
    button('Inspect').click();
    await tick();
    document.querySelector('.cesr-token').click();
    await tick();
    assert.equal(document.querySelectorAll('.hex-values .source-selected').length, raw.length);
    assert.match(document.querySelector('.source-location').textContent, /Bytes 0–5/);
    // Switching from an uploaded file clears its bytes and restores text input.
    await loadExample('signed-inception');
    assert.equal(document.querySelector('.byte-view'), null);
    assert.equal(editor().state.doc.toString(), CESR_EXAMPLES.find(example => example.id === 'signed-inception').text);
    button('Clear').click();
    await tick();
    mode.value = 'attachments'; mode.dispatchEvent(new window.Event('change', { bubbles: true }));
    await tick();
    const textDomain = document.querySelector('#input-domain');
    textDomain.value = 'txt'; textDomain.dispatchEvent(new window.Event('change', { bubbles: true }));
    await tick();
    setText('-AAA');
    await tick();
    button('Inspect').click();
    await tick();
    assert.equal(document.querySelector('.cesr-token').textContent, '-AAA');
    document.querySelector('.cesr-token').click();
    await tick();
    assert.ok(button('Copy value'));
    assert.deepEqual(errors.map(error => String(error)), []);
  } finally {
    window.viewerTest?.app.unmount();
    window.close();
  }
});
