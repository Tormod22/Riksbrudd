// ØKONOMITESTEN – del «fabrikkbygg» (ut10-fabrikkbygg, 28. nov; docs/natt/ut10-fabrikkbygg.md).
// Lastes av test_okonomitest.js (alle okosim-*.js i alfabetisk rekkefølge – etter okosim-eksport.js, før okosim-sagbruk.js, men den
// hentes med require her). Strategien «kontrakter + overtatt sagbruk»: som «kontrakter + sagbruk», men i stedet for å bygge sagbruket
// (6 mill. + materialer) tar spilleren et sagbruk i kartet i bruk som fabrikk (Fabrikkbygg.istand: 2,4 mill., ca. 5 t arbeid for
// byggelaget) og bygger bare fyrkjelen. Folkene og salget som i sagbruksstrategien (okosim-sagbruk.js: sagFolk, selgProd).
// Modellen antar (Claudes forslag) at det finnes et sagbruk innen 1,5 km fra leiren – på Dovre og i skogbygder er det vanlig.
'use strict';
const path = require('path');
const O = require('./okosim.js'), SG = require('./okosim-sagbruk.js');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const Leir = require(SP + '/leir.js'), FolkR = require(SP + '/folk.js'); globalThis.Leir = globalThis.Leir || Leir;
const FB = require(SP + '/fabrikkbygg.js'); FB.registrer(Leir);

O.leggTilStrategi({ id: 'fabrikkbygg', navn: 'kontrakter + overtatt sagbruk', fornuftig: true,
  tekst: 'som «kontrakter + sagbruk», men et sagbruk i kartet tas i bruk som fabrikk (istandsetting) i stedet for å bygge et nytt; fyrkjelen bygges',
  start(sim) { O.STRATEGIER.kontrakter.start(sim); sim.følgVarsel = true; },
  time(sim) {
    if (!sim.fabTatt && !Leir.jobber(sim.L).length) { const I = FB.istand(['sagbruk']);
      if (SG.råd(sim, I.kr + Leir.kostnad('fyrkjele').pris) && sim.betal(I.kr, 'fabrikkbygg')) {
        const id0 = Math.max(0, ...sim.L.bygg.map(b => b.id)) + 1; sim.L.bygg.push(...FB.lagBygg({ ind: 1, areal: 400, møbler: [], c: [300, 200], hus: 1, id0 }));
        sim.fabTatt = true; sim.selgProd = true; sim.sagMangler = ['fyrkjele']; sim.sagRekrutter = 4; sim.logg(`sagbruket i kartet tatt i bruk (${O.mill(I.kr)})`); } }
    while (sim.sagRekrutter > 0 && SG.råd(sim, FolkR.R.rekruttPris)) { const r = FolkR.rekrutter(sim.F, sim.L, kr => sim.betal(kr, 'rekruttering'), { årstid: sim.årstid }); if (!r || r.feil) break; sim.sagRekrutter--; }
    if (sim.fabTatt && !sim.sagRekrutter) SG.sagFolk(sim, { maskin: 4, hogst: 2 });
    O.STRATEGIER.kontrakter.time(sim);
  } });

// kravet: å ta over et sagbruk er billigere enn å bygge et nytt, og strategien gir ikke mer enn «kontrakter + sagbruk» med god margin
// (fabrikken skal være et godt kjøp, ikke en ny pengemaskin). Claudes grense: medianen dag 30 høyst 25 mill. over sagbruksstrategien.
O.leggTilKrav({ navn: 'fabrikkbygg', sjekk(RES) {
  const ut = [], med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : 0; };
  const kost = FB.istand(['sagbruk']).kr; ut.push({ ok: kost < Leir.BYGG.sagbruk.pris, tekst: `istandsetting av et sagbruk ${O.mill(kost)} mot nytt ${O.mill(Leir.BYGG.sagbruk.pris)}` });
  const F = RES.fabrikkbygg, S = RES.kontraktSag; if (!F || !S) return ut;
  const kF = med(F.map(r => r.slutt)), kS = med(S.map(r => r.slutt)), tatt = F.filter(r => r.sum && r.sum.ut && r.sum.ut.fabrikkbygg).length;
  ut.push({ ok: tatt > F.length * .8, tekst: `«kontrakter + overtatt sagbruk»: tok sagbruket i bruk i ${tatt} av ${F.length} kjøringer` });
  ut.push({ ok: kF <= kS + 25e6, tekst: `«kontrakter + overtatt sagbruk» ender med ${O.mill(kF)} (medianen dag 30) mot ${O.mill(kS)} for «kontrakter + sagbruk» – høyst 25 mill. mer` });
  return ut;
} });
module.exports = {};
