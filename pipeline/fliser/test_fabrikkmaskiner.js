// Test for de nye maskinene i egen fabrikk (ut9-maskiner2, 28. nov): flishogger, filetmaskin, ballepresse og steinknuser som deler i
// byggesettet. Reglene står i spill/produksjon.js, delene i spill/byggesett.js, modellene og de bevegelige delene i spill/maskiner.js.
// Kjør: node pipeline/fliser/test_fabrikkmaskiner.js
'use strict';
const path = require('path');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const Leir = require(SP + '/leir.js'); globalThis.Leir = Leir;
const BS = require(SP + '/byggesett.js'), PR = require(SP + '/produksjon.js'), M = require(SP + '/maskiner.js'), I = require(SP + '/industri.js');
let feil = 0; const ok = (v, t) => { console.log((v ? 'ok   ' : 'FEIL ') + t); if (!v) feil++; };
const nær = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const NYE = { bs_flishogger: ['flishogger', 'tømmer', 'flis', 1, .9], bs_filetmaskin: ['filetmaskin', 'fisk', 'frossenfisk', .4, .38], bs_ballepresse: ['ballepresse', 'skrap', 'stål', .5, .18], bs_knuser: ['steinknuser', 'stein', 'pukk', 2, 1.8] };

// 1) delene finnes i byggesettet og i Leir.BYGG som maskiner med riktig maskintype
for (const [del, [mt]] of Object.entries(NYE)) { const B = Leir.BYGG[del + '_1'];
  ok(B && B.del && B.maskin && B.maskinType === mt && B.pris > 0 && B.kw < 0 && B.fot && B.mat, `${del}_1 er en maskin i byggesettet (maskintype ${mt}, ${B && B.pris / 1e6} mill., ${B && B.kw} kW)`); }
// 2) reglene: én time i full drift med nok folk gjør om råvaren til varen
for (const [del, [mt, inn, ut, mInn, mUt]] of Object.entries(NYE)) {
  const L = Leir.ny(), P = PR.ny(), R = PR.REGLER.maskiner[mt]; L.bygg.push({ id: 7, type: del + '_1', x: 0, y: 0, igjen: 0, hp: 1, nivå: 1, bs: { i: 0, j: 0, n: 0, r: 0 } });
  L.lager[inn] = 10; L.lager[ut] = L.lager[ut] || 0; const før = L.lager[ut];
  const s = PR.steg(P, L, 60, { kraft: R.folk }).status[7];
  ok(s && s.går && nær(L.lager[inn], 10 - mInn) && nær(L.lager[ut] - før, mUt), `${del}: ${mInn} ${inn} -> ${mUt} ${ut} i timen (${s && s.tekst}; ${inn} ${L.lager[inn]}, ${ut} ${L.lager[ut]})`);
  // uten råvare står den med en forståelig grunn
  const L2 = Leir.ny(); L2.bygg.push({ id: 8, type: del + '_1', x: 0, y: 0, igjen: 0, hp: 1, nivå: 1, bs: { i: 0, j: 0, n: 0, r: 0 } }); L2.lager[inn] = 0;
  const s2 = PR.steg(PR.ny(), L2, 60, { kraft: 2 }).status[8]; ok(s2 && !s2.går && s2.grunn === 'tom' && /tom for/.test(s2.tekst), `${del} uten ${inn}: «${s2 && s2.tekst}»`);
  // uten strøm står den
  const L3 = Leir.ny(); L3.bygg.push({ id: 9, type: del + '_1', x: 0, y: 0, igjen: 0, hp: 1, nivå: 1, bs: { i: 0, j: 0, n: 0, r: 0 } }); L3.lager[inn] = 10;
  const s3 = PR.steg(PR.ny(), L3, 60, { kraft: 2, mangler: new Set([9]) }).status[9]; ok(s3 && !s3.går && s3.grunn === 'strøm', `${del} uten strøm: «${s3 && s3.tekst}»`);
}
// 3) flishoggeren holder fyrkjelen i gang uten sagbruk (tømmer -> flis -> 30 kW)
{ const L = Leir.ny(), P = PR.ny(); L.bygg.push({ id: 1, type: 'bs_flishogger_1', x: 0, y: 0, igjen: 0, hp: 1, nivå: 1, bs: { i: 0, j: 0, n: 0, r: 0 } }, { id: 2, type: 'fyrkjele', x: 20, y: 0, igjen: 0, hp: 1, nivå: 1 });
  L.lager.tømmer = 20; let kw = 0; for (let i = 0; i < 12; i++) kw = PR.steg(P, L, 60, { kraft: 2 }).kw; ok(kw >= 30 && L.lager.tømmer < 20, `flishogger + fyrkjele: ${kw} kW etter 12 timer, tømmer igjen ${L.lager.tømmer.toFixed(1)}`); }
// 4) tallene er rimelige mot maskinene som fantes: ballepressa slår ikke smia på stål OG deler, flishoggeren gir ikke mer flis per tømmer enn 1
{ const Rm = PR.REGLER.maskiner; ok(Rm.flishogger.ut.flis / Rm.flishogger.inn[0].tømmer < 1 && Rm.ballepresse.ut.stål / Rm.ballepresse.inn[0].skrap < .5 && !Rm.ballepresse.ut.deler && Rm.filetmaskin.ut.frossenfisk < Rm.filetmaskin.inn[0].fisk,
  'ingen maskin lager mer enn den tar inn (flis ≤ tømmer, stål < halve skrapet, frossen fisk < fisk)'); }
// 5) 3D: modellene og de bevegelige delene finnes
const MOD = { bs_flishogger: 'flishogger', bs_filetmaskin: 'filetmaskin', bs_ballepresse: 'ballepresse', bs_knuser: 'knuser' };
for (const [del, mod] of Object.entries(MOD)) { ok(!!(I.MODELLER[mod] && M.FABRIKK && M.FABRIKK[del] === mod), `${del} tegnes med modellen «${mod}»`); ok(!!(M.LIV[del] && M.LIV[del].length), `${del} har bevegelige deler når den går (${(M.LIV[del] || []).map(d => d.del).join(', ')})`); }
console.log(feil ? feil + ' FEIL' : 'alle testene for maskinene i egen fabrikk er ok'); process.exit(feil ? 1 : 0);
