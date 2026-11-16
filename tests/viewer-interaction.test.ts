import type { App, nextTick } from 'vue';
import type { EditorView } from '@codemirror/view';
import type { DOMWindow } from 'jsdom';
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import vue from '@vitejs/plugin-vue';
import { JSDOM, VirtualConsole } from 'jsdom';
import { CESR_EXAMPLE, CESR_EXAMPLES, exampleInput } from '../lib/cesr-example.ts';

type ViewerWindow = DOMWindow & {
  viewerTest?: { app: App; nextTick: typeof nextTick; EditorView: typeof EditorView };
};

// Mount the real components and CodeMirror in a DOM. Layout is deliberately not
// simulated: this checks editing, events and state, not browser visual rendering.
test('viewer connects editing, source selection, errors, labels, resizing and file bytes', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const components = ['CesrNode', 'PreviewField', 'SourceEditor', 'ByteView', 'SplitPane', 'AppNavbar'];
  const files = ['cesr-node', 'preview-field', 'source-editor', 'byte-view', 'split-pane', 'app-navbar'];
  const entry = `
    import { createApp, h, nextTick } from 'vue';
    import { EditorView } from '@codemirror/view';
    import Page from ${JSON.stringify(root + 'pages/index.vue')};
    import Layout from ${JSON.stringify(root + 'layouts/default.vue')};
    ${components.map((name, i) => `import ${name} from ${JSON.stringify(root + 'components/' + files[i] + '.vue')};`).join('\n')}
    const app = createApp({ render: () => h(Layout, null, { default: () => h(Page) }) });
    ${components.map(name => `app.component('${name}', ${name});`).join('\n')}
    app.component('LazySourceEditor', SourceEditor);
    app.mount('#app');
    window.viewerTest = { app, nextTick, EditorView };
  `;
  const output = await build({
    configFile: false, logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"production"' },
    resolve: { alias: [{ find: '~', replacement: root }] },
    plugins: [vue(), {
      name: 'viewer-test-entry', resolveId: id => id.endsWith('virtual:viewer-test') ? '\0viewer-test' : null,
      load: id => id === '\0viewer-test' ? entry : null,
    }],
    build: { write: false, minify: false, lib: { entry: 'virtual:viewer-test', formats: ['es'] } },
  });
  const errors: unknown[] = [];
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
      window.Range.prototype.getClientRects = () => Object.assign([], { item: () => null });
      window.Range.prototype.getBoundingClientRect = () => new window.DOMRect();
    },
  });
  const window = dom.window as ViewerWindow;
  try {
    const chunks = [output].flat().flatMap(build => {
      assert.ok('output' in build);
      return build.output;
    }).filter(item => item.type === 'chunk');
    assert.equal(chunks.length, 1);
    const module = new vm.SourceTextModule(chunks[0]!.code, { context: dom.getInternalVMContext() });
    await module.link(specifier => { throw new Error(`Unexpected import: ${specifier}`); });
    await module.evaluate();
    const harness = window.viewerTest;
    assert.ok(harness);
    const tick = () => harness.nextTick();
    const document = window.document;
    function element<T extends HTMLElement = HTMLElement>(selector: string, parent: ParentNode = document): T {
      const found = parent.querySelector<T>(selector);
      assert.ok(found, `Missing element: ${selector}`);
      return found;
    }
    const button = (label: string) => {
      const found = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === label);
      assert.ok(found, `Missing button: ${label}`);
      return found;
    };
    const editor = () => {
      const view = harness.EditorView.findFromDOM(element('.cm-content'));
      assert.ok(view);
      return view;
    };
    const setText = (text: string) => editor().dispatch({ changes: { from: 0, to: editor().state.doc.length, insert: text } });
    const loadExample = async (id: string) => {
      const picker = element<HTMLSelectElement>('#input-example');
      picker.value = id;
      picker.dispatchEvent(new window.Event('change', { bubbles: true }));
      await tick(); await tick();
      assert.equal(picker.value, ''); // The same example can be loaded again.
    };
    await tick();
    assert.equal(editor().state.doc.toString(), CESR_EXAMPLE);
    assert.ok(document.querySelector('.structure-content'), document.body.textContent + JSON.stringify(errors.map(String)));
    assert.match(element('.structure-content').textContent, /Signing keys/);
    assert.ok(document.querySelector('.syntax-key'));
    assert.ok(document.querySelector('.source-cesr'));

    const resources = element<HTMLDetailsElement>('.resource-menu');
    const resourceToggle = element('summary', resources);
    assert.equal(resources.open, false);
    resourceToggle.click();
    assert.equal(resources.open, true);
    assert.equal(resources.querySelectorAll('.resource-links a').length, 5);
    const firstResource = element('a', resources);
    firstResource.focus();
    firstResource.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    assert.equal(resources.open, false);
    assert.equal(document.activeElement, resourceToggle);
    resourceToggle.click();
    document.body.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
    assert.equal(resources.open, false);
    resourceToggle.click();
    firstResource.focus();
    element('#parse-mode').focus();
    assert.equal(resources.open, false);
    resourceToggle.click();
    firstResource.addEventListener('click', event => event.preventDefault(), { once: true });
    firstResource.click();
    assert.equal(resources.open, false);

    const token = [...document.querySelectorAll<HTMLElement>('.cesr-token')].find(el => el.textContent.startsWith('EIcca'));
    assert.ok(token);
    token.click();
    await tick();
    assert.ok(document.querySelector('.source-selected'));
    assert.match(element('.source-location').textContent, /Bytes 39–84/);
    element('[aria-label="Dismiss value details"]').click();
    await tick();
    assert.equal(document.querySelector('.source-selected'), null);

    const labels = element<HTMLInputElement>('.field-label-toggle input');
    labels.click();
    await tick();
    assert.equal(document.querySelector('.field-name'), null);
    labels.click();
    await tick();
    assert.ok(document.querySelector('.field-name'));

    const separator = element('[role="separator"]');
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
    assert.match(element('[role="alert"]').textContent, /Error at byte/);
    assert.equal(element('.source-error').textContent, 'x');

    await loadExample('keripy-inception');
    assert.equal(editor().state.doc.toString(), CESR_EXAMPLE);
    assert.ok(document.querySelector('.structure-content'));
    assert.equal(document.querySelector('.source-error'), null);
    for (const example of [...CESR_EXAMPLES, CESR_EXAMPLES[0]!]) {
      await loadExample(example.id);
      assert.equal(element<HTMLSelectElement>('#parse-mode').value, example.mode);
      if (example.mode !== 'stream') assert.equal(element<HTMLSelectElement>('#input-domain').value, example.domain);
      if (example.mode === 'attachments') assert.equal(element<HTMLSelectElement>('#table-version').value, String(example.major));
      assert.ok(document.querySelector('.structure-content'), example.id);
      assert.equal(document.querySelector('[role="alert"]'), null, example.id);
      assert.match(element('.input-caption').textContent, /Example:/);
      assert.equal(element('.example-description').textContent, example.description);
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

    const mode = element<HTMLSelectElement>('#parse-mode');
    mode.value = 'matter'; mode.dispatchEvent(new window.Event('change', { bubbles: true }));
    await tick();
    const domain = element<HTMLSelectElement>('#input-domain');
    domain.value = 'bny'; domain.dispatchEvent(new window.Event('change', { bubbles: true }));
    await tick();
    const raw = Buffer.from('4AABtest', 'base64url');
    const fileBytes = new window.Uint8Array(raw);
    const file = { name: 'primitive.qb2', arrayBuffer: async () => fileBytes.buffer };
    Object.defineProperty(document.querySelector('#input-file'), 'files', { value: [file], configurable: true });
    element('#input-file').dispatchEvent(new window.Event('change', { bubbles: true }));
    await tick(); await tick();
    assert.ok(document.querySelector('.byte-view'));
    button('Inspect').click();
    await tick();
    element('.cesr-token').click();
    await tick();
    assert.equal(document.querySelectorAll('.hex-values .source-selected').length, raw.length);
    assert.match(element('.source-location').textContent, /Bytes 0–5/);
    // Switching from an uploaded file clears its bytes and restores text input.
    await loadExample('signed-inception');
    assert.equal(document.querySelector('.byte-view'), null);
    assert.equal(editor().state.doc.toString(), CESR_EXAMPLES.find(example => example.id === 'signed-inception')!.text);
    button('Clear').click();
    await tick();
    mode.value = 'attachments'; mode.dispatchEvent(new window.Event('change', { bubbles: true }));
    await tick();
    const textDomain = element<HTMLSelectElement>('#input-domain');
    textDomain.value = 'txt'; textDomain.dispatchEvent(new window.Event('change', { bubbles: true }));
    await tick();
    setText('-AAA');
    await tick();
    button('Inspect').click();
    await tick();
    assert.equal(element('.cesr-token').textContent, '-AAA');
    element('.cesr-token').click();
    await tick();
    assert.ok(button('Copy value'));
    assert.deepEqual(errors.map(error => String(error)), []);
  } finally {
    window.viewerTest?.app.unmount();
    window.close();
  }
});
