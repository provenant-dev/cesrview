import { fileURLToPath } from 'node:url';

// cesr-ts 2.0.0's npm root adds Node import.meta polyfills. Its library
// entry is portable; keep this packaging workaround separate from parsing.
export const cesrBrowserEntry = fileURLToPath(
  new URL('./src/index.js', import.meta.resolve('cesr-ts')),
);

export function cesrBrowserPlugin() {
  return {
    name: 'cesr-ts-browser-packaging',
    enforce: 'pre',
    transform(code, id) {
      const path = id.replaceAll('\\', '/').split('?')[0];
      if (path.endsWith('/cesr-ts/esm/src/core/errors.js')) {
        // dnt rewrote the error class's name through its Node import.meta shim.
        // Restore the class name without installing that shim in the browser.
        return code.replace('globalThis[Symbol.for("import-meta-ponyfill-esmodule")](import.meta).name', 'this.constructor.name');
      }
      if (path.endsWith('/sodium-0.8.4/runtime.mjs')) {
        // Browsers use Web Crypto. Remove only the Node fallback so bundlers
        // need no node:crypto shim, even when inspecting unused crypto exports.
        return code.replace('globalThis.process?.versions?.node', 'false');
      }
    },
  };
}
