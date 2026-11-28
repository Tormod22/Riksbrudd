// Test for spill/laan.js (ut6-kjeder): lån i banken (by med avtale) og hos lånehaien, renter per døgn, frist og nedbetaling.
'use strict';
const L = require('../../site/dovre-fliser/spill/laan.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const byer = [{ id: 7, navn: 'Dombås' }];
{ const S = L.ny(); const t = L.tilbud(S, [], 1e7); ok(t.length === 1 && t[0].kilde === 'hai' && t[0].maks === 25e6, 'uten avtale: bare lånehaien (25 mill.)');
  ok(L.ta(S, { kilde: 'bank', by: 7, beløp: 2e6, dag: 1 }, [], 1e7).feil, 'banken krever en by med avtale'); }
{ const S = L.ny(), r = L.ta(S, { kilde: 'bank', by: 7, beløp: 5e6, dag: 2 }, byer, 1e7);
  ok(r.lån && r.lån.gjeld === 5e6 && r.lån.frist === 32, 'banklån: 5 mill., frist om 30 døgn');
  const d = L.døgn(S, 3); ok(d.renter === 20000 && S.lån[0].gjeld === 5020000, 'ett døgn i banken: 0,4 % rente (20 000 kr)');
  L.døgn(S, 3); ok(S.lån[0].gjeld === 5020000, 'samme døgn to ganger gir ikke rente to ganger');
  const b = L.betal(S, r.lån.id, 1e6); ok(b.betalt === 1e6 && S.lån[0].gjeld === 4020000 && S.betaltRente === 20000, 'betaling går først til renten');
  ok(L.tilbud(S, byer, 1e7)[0].maks === 3e6, `banken låner høyst 8 mill. per by (igjen: ${L.tilbud(S, byer, 1e7)[0].maks})`);
  const f = L.døgn(S, 33); ok(f.forfalt.length === 1 && S.lån[0].purret, 'etter fristen: lånet er forfalt');
  ok(L.tilbud(S, byer, 1e7)[0].maks === 0 && /fristen/.test(L.tilbud(S, byer, 1e7)[0].grunn), 'med forfalt banklån sier banken nei');
  ok(L.perDøgn(S.lån[0], 33) === Math.round(S.lån[0].gjeld * .008), 'etter fristen dobles renten');
  const alt = L.betal(S, r.lån.id, 1e9); ok(alt.ferdig && S.lån.length === 0, 'hele gjelden betalt: lånet er borte'); }
{ const S = L.ny(), r = L.ta(S, { kilde: 'hai', beløp: 10e6, dag: 0 }, [], 0); ok(r.lån && r.lån.frist === 14, 'lånehaien sier ja selv med tom kasse');
  L.døgn(S, 1); ok(S.lån[0].gjeld === 10300000, 'lånehaien: 3 % i døgnet'); L.døgn(S, 14); ok(S.lån[0].gjeld > 15e6, `etter 14 døgn hos lånehaien: ${Math.round(S.lån[0].gjeld / 1e5) / 10} mill.`);
  ok(L.ta(S, { kilde: 'hai', beløp: 20e6, dag: 14 }, [], 0).feil, 'lånehaien har et tak');
  const J = L.fraJSON(JSON.parse(JSON.stringify(S))); ok(J.lån.length === 1 && J.lån[0].gjeld === S.lån[0].gjeld && J.neste === S.neste, 'lagring: fraJSON gir det samme tilbake'); }
{ const S = L.ny(); ok(L.ta(S, { kilde: 'bank', by: 7, beløp: 5e5, dag: 0 }, byer, 1e7).feil && L.ta(S, { kilde: 'bank', by: 7, beløp: 9e6, dag: 0 }, byer, 1e7).feil, 'for lite og for mye avvises');
  ok(L.tilbud(S, byer, 0)[0].maks === 2e6, 'banken låner bare 2 mill. når kassa er tom'); }
// SELVTEST (årsak H): uten rente skal testen for renter feile
{ const r0 = L.REGLER.bank.rente; L.REGLER.bank.rente = 0; const S = L.ny(); L.ta(S, { kilde: 'bank', by: 7, beløp: 5e6, dag: 2 }, byer, 1e7); L.døgn(S, 3); L.REGLER.bank.rente = r0; ok(S.lån[0].gjeld === 5e6, 'selvtest: uten rente vokser ikke gjelden (så testen over fanger det)'); }
console.log(feil ? `${feil} FEIL i test_laan` : 'Alle testene for laan.js er ok'); process.exit(feil ? 1 : 0);
