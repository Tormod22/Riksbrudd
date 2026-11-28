// Test av spill/leirskap.js og skapplassene i spill/tinglager.js (ut10-skap). Kjør: node pipeline/fliser/test_leirskap.js
const S = require('../../site/dovre-fliser/spill/leirskap.js'), TL = require('../../site/dovre-fliser/spill/tinglager.js');
let feil = 0; const ok = (b, t) => { if (!b) { feil++; console.log('FEIL:', t); } };
const Leir = { BYGG: { kjøkken: { navn: 'Kjøkken' }, brakke: { navn: 'Brakke' }, kontrollrom: { navn: 'Kontrollrom' }, lagertelt: { navn: 'Lagertelt' } }, ferdig: b => !(b.igjen > 0) };
// 1) plassene per bygg
ok(S.plasser({ id: 5, type: 'kjøkken' }).map(q => q.id).join(',') === 'b5.kjøleskap0,b5.kjøleskap1,b5.overskap0', 'kjøkkenets skap: ' + S.plasser({ id: 5, type: 'kjøkken' }).map(q => q.id));
ok(S.plasser({ id: 7, type: 'lagertelt' }).length === 0, 'lagerteltet har ingen skap');
ok(S.finn({ id: 5, type: 'kjøkken' }, 'kjøleskap', 1) === 'b5.kjøleskap1' && S.finn({ id: 5, type: 'kjøkken' }, 'kjøleskap', 2) === null && S.finn({ id: 5, type: 'kjøkken' }, 'sofa', 0) === null, 'finn');
{ const q = S.les('b12.medisinskap1'); ok(q && q.bid === 12 && q.møbel === 'medisinskap' && q.k === 1 && S.les('b12') === null && S.les('ute') === null, 'les'); }
// alle lagringstypene finnes i tinglageret
for (const [bt, T] of Object.entries(S.SKAP)) for (const [m, [t]] of Object.entries(T)) ok(TL.LAGRING[t], `${bt}/${m}: lagringstypen ${t} finnes ikke`);
// 2) i tinglageret: standardplassen først og som før, skapene etter; uten strøm kjøler ikke kjøleskapet; uferdig bygg har ingen plasser
const L = { bygg: [{ id: 5, type: 'kjøkken' }, { id: 6, type: 'brakke' }, { id: 8, type: 'kontrollrom' }, { id: 9, type: 'brakke', igjen: 3 }] };
const P = TL.plasser(Leir, L, { strøm: b => b.id !== 5 }), id = P.map(q => q.id);
ok(id[0] === 'b5' && id.includes('b5.kjøleskap0') && id.includes('b6.garderobe0') && id.includes('b8.arkivskap0') && !id.some(x => x.startsWith('b9')), 'plassene: ' + id.join(','));
ok(P.find(q => q.id === 'b5.kjøleskap0').klima === 'tørt' && TL.plasser(Leir, L, {}).find(q => q.id === 'b5.kjøleskap0').klima === 'kjøl', 'kjøleskapet kjøler bare med strøm');
ok(/Kjøleskap 2 \(kjøkken\)/.test(P.find(q => q.id === 'b5.kjøleskap1').navn), 'navnet: ' + P.find(q => q.id === 'b5.kjøleskap1').navn);
// 3) ingenting flyttes: ting som alt ligger på standardplassen, blir der når skapene kommer til (avstem flytter bare fra borte/overfylte plasser)
{ const T = TL.ny(), før = TL.plasser(Leir, { bygg: [{ id: 6, type: 'brakke' }] }, { ute: true }).filter(q => !q.skap);
  TL.legg(T, før, 'ullsokker', 4, 0, { plass: 'b6' }); const nå = TL.plasser(Leir, { bygg: [{ id: 6, type: 'brakke' }] }, {}); TL.avstem(T, nå);
  ok(T.s.length === 1 && T.s[0].p === 'b6', 'tingene på standardplassen ble flyttet: ' + JSON.stringify(T.s));
  // nye klær går i et skap i brakka (garderoben passer best)
  const r = TL.legg(T, nå, 'ullsokker', 2, 0); ok(r.length && /^b6/.test(r[0].p), 'nye klær havnet ikke i brakka: ' + JSON.stringify(r)); }
// 4) skapene tar det de skal: overskapet tar mat, ikke hammer; medisinskapet er låst
{ const T = TL.ny(), Q = TL.plasser(Leir, { bygg: [{ id: 5, type: 'kjøkken' }] }, { ute: false }).filter(q => q.id === 'b5.overskap0');
  ok(TL.legg(T, Q, 'hammer', 1, 0, { utenUte: true }).length === 0 && TL.legg(T, Q, 'peanøttsmør', 2, 0, { utenUte: true }).length === 1, 'overskapet tar mat, ikke verktøy'); }
// selvtest: en feil id-form skal fanges av les
ok(S.les('b5.kjøleskap') === null, 'selvtest');
if (feil) { console.log(feil + ' feil'); process.exit(1); } else console.log('alle skaptestene ok');
