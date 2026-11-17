import { createHash } from 'node:crypto';

/** Hash the final bootstrap scripts, after Nuxt has rendered each static page. */
export function addStaticCsp(html: string) {
  const hashes = new Set<string>();
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/(?:^|\s)src\s*=/i.test(match[1]!) && match[2]) {
      hashes.add(`'sha256-${createHash('sha256').update(match[2]).digest('base64')}'`);
    }
  }
  const policy = [
    "default-src 'none'",
    `script-src 'self' 'wasm-unsafe-eval' ${[...hashes].join(' ')}`.trim(),
    // CodeMirror injects styles and the pane resizer sets inline CSS properties.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'none'",
  ].join('; ');
  // Meta CSP works on GitHub Pages, which has no custom response-header config.
  // Put it before any resources; frame-ancestors/report-only require HTTP headers.
  return html.replace(/<head(?:\s[^>]*)?>/i, head => `${head}<meta http-equiv="Content-Security-Policy" content="${policy}">`);
}
