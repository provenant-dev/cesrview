import events from './cesr-example-events.json' with { type: 'json' };

// Public KERIpy inception fixture, Apache-2.0:
// https://github.com/kentbull/keri-ts/blob/c353249a3b86e3cd77df0a84f27077700528a69d/packages/cesr/test/fixtures/external-vectors.ts
// Keep the compact serialization intact: the version field includes its byte size.
export const CESR_EXAMPLE = '{"v":"KERI10JSON00012b_","t":"icp","d":"EIcca2-uqsicYK7-q5gxlZXuzOkqrNSL3JIaLflSOOgF","i":"DNG2arBDtHK_JyHRAq-emRdC6UM-yIpCAeJIWDiXp4Hx","s":"0","kt":"1","k":["DNG2arBDtHK_JyHRAq-emRdC6UM-yIpCAeJIWDiXp4Hx"],"nt":"1","n":["EFXIx7URwmw7AVQTBcMxPXfOOJ2YYA1SJAam69DXV8D2"],"bt":"0","b":[],"c":[],"a":[]}';

// Generated once by build/example-events.mjs, never signed in the browser.
const inception = JSON.parse(events[0].body);
const signature = events[0].signature;
const signed = event => event.body + '-AAB' + event.signature;

export const CESR_EXAMPLES = [
  {
    id: 'keripy-inception', label: 'KERI inception body', group: 'Message streams',
    description: 'KERIpy reference event in compact JSON, without signature attachments.',
    mode: 'stream', domain: 'txt', major: 1, text: CESR_EXAMPLE,
  },
  {
    id: 'signed-inception', label: 'Signed inception', group: 'Message streams',
    description: 'A KERI inception with one Ed25519 controller signature. Uses public demo keys.',
    mode: 'stream', domain: 'txt', major: 1, text: signed(events[0]),
  },
  {
    id: 'key-event-stream', label: 'Inception → rotation → interaction', group: 'Message streams',
    description: 'Three signed events for one identifier, with linked SAIDs and a committed key rotation. Uses public demo keys.',
    mode: 'stream', domain: 'txt', major: 1, text: events.map(signed).join(''),
  },
  {
    id: 'ed25519-key', label: 'Ed25519 public key', group: 'Matter primitives',
    description: 'The transferable public signing key from the signed inception. Code D; 32 key bytes.',
    mode: 'matter', domain: 'txt', major: 1, text: inception.k[0],
  },
  {
    id: 'blake3-said', label: 'BLAKE3 event SAID', group: 'Matter primitives',
    description: 'The signed inception’s self-addressing identifier. Code E; a 256-bit BLAKE3 digest.',
    mode: 'matter', domain: 'txt', major: 1, text: inception.d,
  },
  {
    id: 'indexed-signature', label: 'Ed25519 indexed signature', group: 'Indexed signatures',
    description: 'The signature over the signed inception body, at key index 0. A fragment without its message body.',
    mode: 'indexer', domain: 'txt', major: 1, text: signature,
  },
  {
    id: 'signature-group-v1', label: 'Controller signature · v1 text', group: 'Attachment groups',
    description: 'The signed inception’s attachment group. The -A counter counts signatures: 1.',
    mode: 'attachments', domain: 'txt', major: 1, text: '-AAB' + signature,
  },
  {
    id: 'signature-group-v2', label: 'Controller signature · v2 text', group: 'Attachment groups',
    description: 'The same signature in a v2 group. The -K counter counts payload quadlets: 22.',
    mode: 'attachments', domain: 'txt', major: 2, text: '-KAW' + signature,
  },
  {
    id: 'signature-group-qb2', label: 'Controller signature · v2 binary', group: 'Attachment groups',
    description: 'The v2 group in binary (qb2): 69 bytes, including its counter. Opens in the hex view.',
    mode: 'attachments', domain: 'bny', major: 2, text: '-KAW' + signature,
  },
];

export function exampleInput(example) {
  if (example.domain === 'txt') return example.text;
  return Uint8Array.from(atob(example.text.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
}
