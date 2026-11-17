// Top-level KERI (KEL and TEL) event and ACDC fields only; never apply these
// names to application data. The profile is chosen from the message itself:
// the version string's protocol, then the event type.
// https://trustoverip.github.io/kswg-keri-specification/
// https://trustoverip.github.io/kswg-acdc-specification/
import type { InspectionNode } from './types.ts';

const common = { v: 'Version', t: 'Event type', d: 'Event digest', i: 'Identifier', s: 'Sequence number' };
const establishment = {
  kt: 'Signing threshold', k: 'Signing keys', nt: 'Next signing threshold',
  n: 'Next key digests', bt: 'Witness threshold', c: 'Configuration', a: 'Anchors',
};
const fields: Record<string, Record<string, string>> = {
  icp: { ...common, ...establishment, b: 'Witnesses' },
  dip: { ...common, ...establishment, b: 'Witnesses', di: 'Delegator identifier' },
  rot: { ...common, ...establishment, p: 'Previous event digest', br: 'Removed witnesses', ba: 'Added witnesses' },
  drt: { ...common, ...establishment, p: 'Previous event digest', br: 'Removed witnesses', ba: 'Added witnesses' },
  ixn: { ...common, p: 'Previous event digest', a: 'Anchors' },
  rct: { ...common },
  // TEL (credential registry) events, KERIpy field names.
  vcp: { ...common, i: 'Registry identifier', ii: 'Issuer identifier', c: 'Configuration', bt: 'Backer threshold', b: 'Backers', n: 'Nonce' },
  vrt: { ...common, i: 'Registry identifier', p: 'Previous event digest', bt: 'Backer threshold', br: 'Removed backers', ba: 'Added backers' },
  iss: { ...common, i: 'Credential SAID', ri: 'Registry identifier', dt: 'Issuance date' },
  rev: { ...common, i: 'Credential SAID', ri: 'Registry identifier', p: 'Previous event digest', dt: 'Revocation date' },
  bis: { ...common, i: 'Credential SAID', ii: 'Issuer identifier', ra: 'Registry anchor', dt: 'Issuance date' },
  brv: { ...common, i: 'Credential SAID', p: 'Previous event digest', ra: 'Registry anchor', dt: 'Revocation date' },
};
const acdc: Record<string, string> = {
  v: 'Version', t: 'Message type', d: 'Credential SAID', u: 'Salty nonce', i: 'Issuer identifier',
  ri: 'Registry identifier', rd: 'Registry SAID', s: 'Schema', a: 'Attributes',
  A: 'Attribute aggregate', e: 'Edges', r: 'Rules',
};
export function labelFields(body: InspectionNode, proto: string, type: unknown) {
  const names = proto === 'ACDC' ? acdc : proto === 'KERI' && typeof type === 'string' && Object.hasOwn(fields, type) ? fields[type] : null;
  if (!names) return;
  for (const child of body.children ?? []) {
    if (child.label !== undefined && Object.hasOwn(names, child.label)) child.fieldName = names[child.label];
  }
}
