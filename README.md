# CESR Viewer
The Composable Event Streaming Representation (CESR) is a dual text-binary encoding format that has the unique property of text-binary concatenation composability. This composability property enables the round trip conversion en-masse of concatenated primitives between the text domain and binary domain while maintaining the separability of individual primitives. This enables convenient usability in the text domain and compact transmission in the binary domain. CESR primitives are self-framing. CESR supports self-framing group codes that enable stream processing and pipelining in both the text and binary domains. CESR supports composable text-binary encodings for general data types as well as suites of cryptographic material. Popular cryptographic material suites have compact encodings for efficiency while less compact encodings provide sufficient extensibility to support all foreseeable types. CESR streams also support interleaved JSON, CBOR, and MGPK serializations. CESR is a universal encoding that uniquely provides dual text and binary domain representations via composable conversion. The CESR protocol is used by other protocols such as [KERI](https://arxiv.org/abs/1907.02143).

## Setup

Use Node.js 24 (also used in CI), then install the pinned dependencies:

```bash
# npm
npm ci
```

## Development Server

Start the development server on http://localhost:3000

```bash
npm run dev
```

## Production

Build the application for production:
```bash
npx nuxi generate
```

Locally preview production build:
```bash
npm run preview
```

## Parser and compatibility

Parsing is delegated to **`cesr-ts@2.0.0`**, pinned in `package.json` and
`package-lock.json`. This viewer maintains presentation adapters, not CESR code
tables or wire-decoding rules. Input stays in the browser; there is no parsing API.

- **Message stream** detects JSON, CBOR, MessagePack, and native CESR bodies and
  their text/binary attachments. Open a file to inspect binary input without a
  lossy UTF-8 conversion.
- **Matter primitives**, **Indexed signatures**, and **Attachment groups** inspect
  fragments without inventing a message body. Choose the encoding explicitly;
  attachment fragments also need their CESR table version. `A` means different
  things in matter and indexed-signature contexts.
- Select a primitive to inspect its upstream name, sizes, count or indices.
  Wire annotations retain enclosure information that the semantic tree flattens.
- Unknown codes, incomplete input, and incorrect framing produce errors. The
  viewer no longer skips bytes until something looks like a known prefix.
- Input is parsed unchanged and rendered through Vue text interpolation. JSON
  strings, keys, numbers, booleans, nulls, and arrays are preserved as decoded
  values; HTML escaping happens at display time.

This is a **KERIpy-compatible inspection profile, not a claim of complete CESR
specification conformance**. It decodes structure; it does not verify signatures,
SAIDs, KEL state, or SAD-path authorization. Displayed decoded values and pretty
annotations are not a byte-preserving serialization API.

### Specification review (2026-11-11)

The original parser cited the [March 2023 Internet-Draft](https://weboftrust.github.io/ietf-cesr/draft-ssmith-cesr.html),
which expired in September 2023. The [current ToIP specification](https://trustoverip.github.io/kswg-cesr-specification/)
is labelled document v1.1 and includes KERI/ACDC **wire table version 2.0**.
These version labels describe different things.

The review covered domain conversion and padding, fixed/variable matter,
contextual indexed signatures, counters and nested scopes, genus/version
selection, cold starts and interleaved serializations, both version-string
formats, the code-table annex, SAIDs, and SAD paths. Simply extending the old
lookup table would not implement these requirements.

The published spec and the current community reference have concrete differences:

| Case | Published ToIP table | cesr-ts 2.0.0 / its KERIpy reference |
| --- | --- | --- |
| V2 `-N` / `--N` | Transferable receipt quadruples | Nonce seal singles |
| Datagram headers | `0P`, `0Q`, `0R`, `0S` | These codes are absent; `b` is the current GramHead code |
| `_` opcodes | Reserved; semantics not yet defined | Not executable stream instructions |

The first two discrepancies are actual compatibility gaps, not features this
adapter silently emulates. Exact published-table support requires a resolved
upstream specification/reference baseline (or a separately maintained parser
profile). Arbitrary protocol genera, every native message schema, annotated
input with comments, datagram reassembly, and cryptographic validation are not
claimed by this integration. Plain JSON without the required `v` field is not a
CESR message stream.

### Reuse investigation

Sources and published artifacts were checked on 2026-11-11:

| Candidate | Browser reuse | Assessment |
| --- | --- | --- |
| [cesr-ts](https://github.com/kentbull/keri-ts/tree/master/packages/cesr) | Published JavaScript/TypeScript package; `2.0.0` published November 7, 2026 | Currently selected independent community implementation, not the WebOfTrust reference. Stream parser, primitives, annotations, and maintained reference fixtures; Apache-2.0. A small packaging adapter is needed. |
| [Cesrox](https://github.com/THCLab/cesrox) | Rust crate `2.0.0-rc.2`; no WASM bindings or browser build found in the repository | Maintained THCLab implementation under EUPL-1.2, targeting V2 text/binary streams and JSON/CBOR/MessagePack. Promising Rust candidate, but V1 attachments and the viewer's nested version-switch fixture failed local probes. See the review below. |
| [cesride](https://github.com/WebOfTrust/cesride/tree/main/wasm) + [parside](https://github.com/WebOfTrust/parside) | Cesride documents `wasm-pack --target=web`; Parside supplies stream parsing | Latest GitHub releases checked: Cesride `0.6.4` (March 2024), Parside `0.2.0` (May 2023), both without downloadable release assets. The community [implementation list](https://github.com/WebOfTrust/keri#existing-implementations) labels Cesride inactive. Not a maintained, complete browser stream-parser binary. |
| [cesr-rs / cesr-stream](https://github.com/devrandom-labs/cesr) | Rust crates support `wasm32-unknown-unknown`; JavaScript bindings would still be needed | Active, but its [capability matrix](https://github.com/devrandom-labs/cesr/blob/main/docs/capability-matrix.md) explicitly limits the working wire profile and excludes V2, binary message transport, and CBOR/MGPK end-to-end support from that profile. |
| [cesr](https://www.npmjs.com/package/cesr) (`lenkan/keri-js`) | Direct JavaScript, published `0.1.2` March 29, 2026; CLI included | Package README marks it work in progress and lists CBOR/MessagePack as unfinished. |
| [KERIpy](https://github.com/WebOfTrust/keripy) | Python reference implementation | Useful as a conformance oracle. A backend changes local-only processing; a browser Python runtime and native dependencies are additional integration work. |

A native Linux/macOS executable cannot run directly in the browser. A Rust
implementation needs a WASM build and JavaScript bindings, or an existing
browser package. The selected TypeScript library avoids that build pipeline.
It still needs pinned upgrades, regression checks, and upstream bug reporting.

### Cesrox follow-up review (2026-11-12)

Inspected upstream revision
[`562fdeb`](https://github.com/THCLab/cesrox/tree/562fdeb78bd04a2019bed8524899b06088ce6d36),
committed October 21, 2026. The crates.io index lists `cesrox@2.0.0-rc.2`;
the repository publishes Rust crates, with no GitHub release assets or supplied
WASM/JavaScript package found. This is a THCLab/Human Colossus implementation;
the WebOfTrust implementation directory identifies KERIpy as the reference.

The upstream suite passed locally with `cargo test -p cesrox --no-default-features`
(69 tests, including the vector harness and documentation test). That green
suite permits [27 documented vector exceptions](https://github.com/THCLab/cesrox/blob/562fdeb78bd04a2019bed8524899b06088ce6d36/cesr/tests/vectors_expected_failures.txt),
including the disputed `-N` counter and indexed P-256 compatibility differences;
it does not establish full specification conformance.

Additional probes parsed seven of this viewer's eight nested fixture families
in both text and binary form. The `child-genus-selector` fixture failed in both
domains, and a V1 `-AAB` signature group failed even when explicitly selected
inside a V2 group. Cesrox's `legacy-v2beta` feature reads older Cesrox encodings;
it is not CESR V1 table support. Acceptance of the other fixtures only confirms
structural parsing, not equivalence of decoded message semantics.

Browser reuse appears feasible from the byte-oriented Rust API and dependencies,
but a WASM build was not tested. Integration would need a WASM export layer,
conversion of Rust values into the viewer's node model, and a reproducible WASM
build. No parser replacement was made during this review: resolving the V1 and
nested version-selection gaps is necessary to preserve current functionality.

### Browser packaging

`build/cesr-browser.mjs` resolves the pinned package's library entry, bypassing
its npm-root Node `import.meta` polyfills. It restores error class names that the
npm transpilation routed through those polyfills, and removes the conditional
Node randomness fallback from the sodium runtime; browsers retain Web Crypto.
No wire-decoding logic or code table is changed. Reassess this workaround
when upgrading the dependency; a supported upstream browser export is preferable.

## Validation

```bash
npm test
npm run generate
```

The regression suite covers the original variable-length truncation,
indexed-signature splitting, braces inside JSON strings, and lost scalar values.
It also covers malformed/truncated framing, both counter versions, mixed
serializations, binary attachments, and pinned KERIpy nested-message fixtures.
Fixtures include source and reference revisions in `tests/fixtures/nested.json`;
their Apache-2.0 license is included alongside them.

The browser test bundles the real adapter with the same Vite packaging rules and
executes it without Node globals or external imports. It also renders the actual
recursive Vue template with hostile text to verify escaping. This is a runtime
and rendering check, not an end-to-end browser interaction test. The test runner
uses VM modules and disables test-process isolation so its registered tests are
reported individually.
