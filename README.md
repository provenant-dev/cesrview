# CESR Viewer
The Composable Event Streaming Representation (CESR) is a dual text-binary encoding format that has the unique property of text-binary concatenation composability. This composability property enables the round trip conversion en-masse of concatenated primitives between the text domain and binary domain while maintaining the separability of individual primitives. This enables convenient usability in the text domain and compact transmission in the binary domain. CESR primitives are self-framing. CESR supports self-framing group codes that enable stream processing and pipelining in both the text and binary domains. CESR supports composable text-binary encodings for general data types as well as suites of cryptographic material. Popular cryptographic material suites have compact encodings for efficiency while less compact encodings provide sufficient extensibility to support all foreseeable types. CESR streams also support interleaved JSON, CBOR, and MGPK serializations. CESR is a universal encoding that uniquely provides dual text and binary domain representations via composable conversion. The CESR protocol is used by other protocols such as [KERI](https://arxiv.org/abs/1907.02143).

## Setup

Make sure to install the dependencies:

```bash
# npm
npm install
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
