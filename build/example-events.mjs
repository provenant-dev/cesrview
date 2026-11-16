// Reproducible demonstration events. These public, fixed seeds are ONLY fixtures.
// KERI v1 JSON field order and event relationships follow KERIpy eventing.py:
// https://github.com/WebOfTrust/keripy/blob/7143832813cac6a394ab1faf9be83bb3372be87c/src/keri/core/eventing.py
import { Diger, SerderKERI, Signer } from 'cesr-ts';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function exampleEvents() {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const signers = [1, 2, 3].map(value => new Signer({ code: 'A', raw: new Uint8Array(32).fill(value) }));
  const keys = signers.map(signer => signer.verfer.qb64);
  const commitment = index => new Diger({ code: 'E', raw: Diger.digest(encoder.encode(keys[index]), 'E') }).qb64;
  const event = sad => new SerderKERI({ sad, makify: true, kind: 'JSON', pvrsn: { major: 1, minor: 0 }, gvrsn: null });
  const inception = event({
    v: 'KERI10JSON000000_', t: 'icp', d: '', i: keys[0], s: '0',
    kt: '1', k: [keys[0]], nt: '1', n: [commitment(1)], bt: '0', b: [], c: [], a: [],
  });
  const rotation = event({
    v: 'KERI10JSON000000_', t: 'rot', d: '', i: inception.ked.i, s: '1', p: inception.said,
    kt: '1', k: [keys[1]], nt: '1', n: [commitment(2)], bt: '0', br: [], ba: [], a: [],
  });
  const interaction = event({
    v: 'KERI10JSON000000_', t: 'ixn', d: '', i: inception.ked.i, s: '2', p: rotation.said, a: [],
  });
  return [inception, rotation, interaction].map((body, index) => ({
    body: decoder.decode(body.raw),
    signature: signers[Math.min(index, 1)].sign(body.raw, { index: 0 }).qb64,
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(new URL('../lib/cesr-example-events.json', import.meta.url), JSON.stringify(exampleEvents(), null, 2) + '\n');
}
