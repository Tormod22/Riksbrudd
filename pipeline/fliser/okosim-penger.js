// ØKONOMITESTEN – del «penger for en ny spiller» (ut8-kr-penger, 28. nov). Kritikken (Jonas Bakke, Ingrid Sæther): etter den første
// kontrakten var alle tilbudene «For svakt: 4 mann mot et forsvar på ca. 10 / 25 / 50», og kassa rant fra 40 til 16 mill. på tre døgn.
// «bare kontrakter» i modellen endte likevel på ca. 100 mill., fordi modellen (1) ikke regnet bygdevernet som forsvar (spillet gjør det:
// selskap-visning.js forsvarVed – nå Selskap.forsvarFor i begge) og (2) hadde en tropp på seks–ni som ble fylt opp med rekrutter.
// Denne strategien er det spillet ber en ny spiller om: én tropp på fire fra folket (holdes på fire – faller noen, rekrutteres nye),
// kontraktene den klarer, og litt bygging (de tre første i byggelista når kassa tåler det). Kravet: kassa blør ikke de første ti døgnene.
// SELVTEST (årsak H): uten det lette tilbudet (Selskap.sikreLett av: lett.maksNivå = 0) skal kravet si fra.
'use strict';
const path = require('path');
const O = require('./okosim.js');
const Selskap = require(path.join(__dirname, '../../site/dovre-fliser/spill/selskap.js'));
const ID = 'blå';

// Claudes forslag: høyst «blakk» av kjøringene under «gulv» kr på dag 10, og medianen dag 10 minst «vekst» × medianen dag 2
const MP = { tropp: 4, bygg: 3, reserveDøgn: 5, dag: 10, gulv: 5e6, blakk: .1, vekst: 1 };

// fornuftig: false – over 30 døgn er det ikke fornuftig å bli stående med fire mann (røverbølgene tar ca. 10 mill. når troppen er ute, og
// 10–15 % av kjøringene er blakke på slutten); kravet her gjelder de første ti døgnene (trinn 1–2)
O.leggTilStrategi({ id: 'nybegynner', navn: 'ny spiller: én tropp på fire', fornuftig: false,
  tekst: 'én tropp på fire fra folket (fylles opp til fire), tar kontraktene den klarer, og bygger tre ting når kassa tåler det',
  start(sim) { Selskap.førsteKontrakt(sim.SK, ID, 0, O.steder(sim), { x: 600, y: 700, navn: 'nødlageret' }); O.API.lagTropp(sim, MP.tropp).rolle = 'kontrakt'; },
  time(sim) {
    const tr = sim.tropper.find(t => t.rolle === 'kontrakt'); if (tr && tr.hjemme && !tr.jobb) O.fyllTropp(sim, tr, MP.tropp, O.døgnUt(sim) * 3); if (tr) O.kontraktTime(sim, tr);
    // litt bygging: de første i byggelista, når kassa har 1,6 × prisen + fem døgn med drift
    sim.byggNr = sim.byggNr || 0; const t = O.BYGGELISTE[sim.byggNr];
    if (t && sim.byggNr < MP.bygg && !require(path.join(__dirname, '../../site/dovre-fliser/spill/leir.js')).jobber(sim.L).length) {
      const Leir = require(path.join(__dirname, '../../site/dovre-fliser/spill/leir.js')), k = Leir.kostnad(t);
      const ut = sim.F.personer.length * 15000 + Leir.vedlikehold(sim.L).perDøgn;
      if (sim.kasse >= k.pris * 1.6 + ut * MP.reserveDøgn && !O.API.bygg(sim, t).feil) sim.byggNr++; }
  } });

const kvant = (L, q) => { const a = L.slice().sort((x, y) => x - y); if (!a.length) return NaN; const i = (a.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };
const kasse = (r, d) => (r.dager[d - 1] || r.dager[r.dager.length - 1]).kasse;
function sjekk(L, tekst = '') {
  const d = MP.dag, k = L.map(r => kasse(r, d)), m2 = kvant(L.map(r => kasse(r, 2)), .5), m = kvant(k, .5), under = k.filter(v => v < MP.gulv).length / L.length;
  const lev = kvant(L.map(r => (r.kontrakter ? r.kontrakter.levert : 0)), .5);
  return [{ ok: m >= m2 * MP.vekst && under <= MP.blakk, tekst: `«ny spiller: én tropp på fire» blør ikke: kassa dag 2 ${O.mill(m2)} -> dag ${d} ${O.mill(m)} (median), ${Math.round(under * 100)} % under ${O.mill(MP.gulv)} (høyst ${MP.blakk * 100} %), ${lev} kontrakter levert på 30 døgn (median)${tekst}` }];
}
O.leggTilKrav({ navn: 'ny spiller', sjekk(RES) {
  const L = RES.nybegynner || []; if (!L.length) return [];
  const ut = sjekk(L);
  // selvtest: uten det lette tilbudet skal kravet slå til (ikke de vanlige tilbudene alene)
  const R = Selskap.REGLER.lett, før = R.maksNivå; let q; R.maksNivå = 0;
  try { q = sjekk(Array.from({ length: Math.min(30, L.length) }, (_, i) => O.kjør('nybegynner', i + 1))); } finally { R.maksNivå = før; }
  ut.push({ ok: !q[0].ok, tekst: `selvtest: uten det lette tilbudet sier kravet fra (${q[0].tekst})` });
  return ut;
} });
