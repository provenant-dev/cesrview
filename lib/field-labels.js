// Top-level KERI event fields only; never apply these names to application data.
// https://trustoverip.github.io/kswg-keri-specification/
const common = { v: 'Version', t: 'Event type', d: 'Event digest', i: 'Identifier', s: 'Sequence number' };
const establishment = {
  kt: 'Signing threshold', k: 'Signing keys', nt: 'Next signing threshold',
  n: 'Next key digests', bt: 'Witness threshold', c: 'Configuration', a: 'Anchors',
};
const fields = {
  icp: { ...common, ...establishment, b: 'Witnesses' },
  dip: { ...common, ...establishment, b: 'Witnesses', di: 'Delegator identifier' },
  rot: { ...common, ...establishment, p: 'Previous event digest', br: 'Removed witnesses', ba: 'Added witnesses' },
  drt: { ...common, ...establishment, p: 'Previous event digest', br: 'Removed witnesses', ba: 'Added witnesses' },
  ixn: { ...common, p: 'Previous event digest', a: 'Anchors' },
  rct: { ...common },
};
export function labelFields(body, proto, type) {
  if (proto !== 'KERI') return;
  const names = fields[type];
  if (!names) return;
  for (const child of body.children ?? []) {
    if (Object.hasOwn(names, child.label)) child.fieldName = names[child.label];
  }
}
