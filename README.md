# CESR Viewer

Inspect CESR streams, KERI and ACDC messages, cryptographic primitives, and
attachment groups. Processing happens in your browser; no data is uploaded.

[Open the viewer](https://cesrview.provenant.net/) · [CESR specification](https://trustoverip.github.io/kswg-cesr-specification/)

## Usage

1. Paste text, open a text or binary file, or choose **Examples…**.
2. Choose an inspection mode and select **Inspect** (`Ctrl` / `Cmd` + `Enter`).
3. Select a decoded value to see its details and highlight its source bytes.

**Message stream** detects JSON, CBOR, MessagePack, and native CESR messages.
For standalone matter, indexed signatures, or attachment groups, choose the
matching mode and text (`qb64`) or binary (`qb2`) encoding. Attachment groups
also require the CESR table version. Examples select these settings for you.

The viewer includes syntax highlighting, resizable panes, readable field names,
wire annotations, a binary hex view, and error locations where available.
Specifications and learning links are under **Resources**.

## Development

Requires Node.js 24.

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Test and build

```bash
npm run typecheck
npm test
npm run generate
npm run preview
```

The static site is generated in `.output/public`. Pushes to `main` run type checks
and tests, then deploy to GitHub Pages.

## Parser limitations

Parsing uses `cesr-ts@2.2.1` with KERIpy-compatible CESR 1.0 / 2.0 tables.
Some codes differ from the published ToIP specification. The viewer decodes
structure; it does not verify signatures, SAIDs, or key event state.
Some encodings provide source locations for a whole body rather than each field.

## Maintenance

- Regenerate the demo events with `node build/example-events.ts`. Tests check
  their byte lengths, SAIDs, signatures, and event links.
- TypeScript is pinned to 6.0.3 because the current Vue type checker
  [does not support TypeScript 7](https://github.com/vuejs/language-tools/issues/6124).
- The `archiver` override uses `readdir-glob` 4 to pull in patched `minimatch`.
  Remove it when `archiver` updates its dependency.

## License

[Apache-2.0](LICENSE). Bundled fonts have their own [license](public/fonts/OFL.txt).
