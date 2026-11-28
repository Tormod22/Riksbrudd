// ØKONOMITESTEN – del «eksport» (fase Ø6, 28. nov; docs/natt/ut4-eksport.md): eksportordrene (spill/eksport.js) i modellen.
// Lastes av test_okonomitest.js (alle okosim-*.js i alfabetisk rekkefølge – denne krever selv okosim-vare.js, som den bygger på).
// Ny strategi «kontrakter + sag + eksport»: som «kontrakter + sag + varer», og fra trinn 2 tar leiren eksportordre på planker sjøveien.
// Modellens egne valg (Claudes forslag, ME): leiren har en stor havn i en havneby med avtale 25 km unna (så ordrene kommer og
// piratsjansen er den lave); høyst én eksportordre om gangen, og bare planker; ordren tas når lageret + det saga ga siste døgn rekker
// innen fristen (70 % av det saga ga, to døgns margin), og plankene den trenger går foran varekontraktene; tømmerbilen (delt med varekontraktene) kjører 20 m³ om gangen til kaia; eurokreditten veksles
// straks den kommer (til dagens kurs med inflasjonen). Det eksporten trenger, holdes igjen når sagbruket selger om morgenen.
'use strict';
const path = require('path');
const O = require('./okosim.js');
require('./okosim-vare.js');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const E = require(SP + '/eksport.js'), Selskap = require(SP + '/selskap.js'), Leir = require(SP + '/leir.js'), PR = require(SP + '/produksjon.js');

// Claudes forslag for modellen
const ME = { havn: 25000, margin: 2, andel: .7, lasteTimer: .5, mål: { minInntekt: 2e6, gevinst: 1.2, slakk: 5e6 } };
const ID = 'blå';
const trinn2 = sim => Selskap.side(sim.SK, ID).sum.levert >= 1 && sim.L.bygg.filter(b => Leir.ferdig(b)).length >= 3;
const havn = { slag: 'havn', id: 'modellhavn', navn: 'Havna', x: ME.havn, y: 0, størrelse: 'stor', avtale: true };
const underveis = k => k.turer.reduce((s, t) => s + t.mengde, 0);

function time(sim) {
  const X = sim.eks, S = X.S, L = sim.L, R = sim.vare;
  // lasten er framme på kaia
  for (const k of S.aktive) for (const t of k.turer.slice()) if (sim.t >= t.fram) { k.turer = k.turer.filter(q => q !== t); E.iHavn(k, t.mengde); }
  // tømmerbilen kjører 20 m³ om gangen når den er ledig (varekontraktene og eksporten deler den: R.bilFri)
  const reserve = sim.vareReserve || (sim.vareReserve = {}), fraVare = { ...reserve };
  for (const k of S.aktive) { if (k.vei !== 'sjø' || k.skip) continue; const igjen = Math.max(0, k.mengde - k.iHavn - underveis(k)); if (igjen <= .01) continue;
    reserve[k.vare] = (reserve[k.vare] || 0) + igjen;
    const har = Math.max(0, (L.lager[k.vare] || 0) - (fraVare[k.vare] || 0)), kap = 20, tur = O.bilTimer(ME.havn) + ME.lasteTimer;
    if (sim.tømmerbil && sim.t >= (R.bilFri || 0) && har >= Math.min(kap, igjen) - .01) { const m = Math.min(kap, igjen, har); L.lager[k.vare] -= m; k.turer.push({ mengde: m, fram: sim.t + tur * 60 }); R.bilFri = sim.t + 2 * tur * 60; X.turer++; } }
  // skipet, betalingen og fristen; eurokreditten veksles straks
  for (const h of E.steg(S, sim.t, { rand: Selskap.lagRand(sim.frø * 4093 + sim.t + 1) })) {
    if (h.type === 'levert') { const r = E.veksle(S, S.ek, sim.M.infl); sim.gi(r.kr * (sim.faktor.eksport || 1), 'eksport'); X.levert++; X.m3 += h.k.mengde; sim.logg(`eksport levert «${h.k.tittel}»: ${O.mill(r.kr)}`); }
    else if (h.type === 'tapt') { X.tapt++; sim.logg(`pirater tok «${h.k.tittel}»`); }
    else if (h.type === 'utløpt') { Leir.leggInn(L, h.k.vare, h.tilbake); X.utløpt++; sim.logg(`eksportordren gikk ut: «${h.k.tittel}»`); }
  }
}
function morgen(sim) {
  const X = sim.eks, S = X.S; if (!trinn2(sim)) { E.morgen(S, sim.t, { åpen: false }); return; }
  // det saga faktisk ga det siste døgnet (laget − brukt av planker)
  const P = sim.prod && sim.prod.P, nå = P ? (P.laget.tre || 0) - (P.brukt.tre || 0) : 0, perDøgn = Math.max(0, nå - (X.forrige || 0)); X.forrige = nå;
  E.morgen(S, sim.t, { åpen: true, vei: 'sjø', størst: E.skipTar('stor'), rand: Selskap.lagRand(sim.frø * 337 + sim.t + 5) });
  if (S.aktive.length) return;
  for (const k of S.tilbud.slice()) { if (k.vare !== 'tre') continue;
    if ((sim.L.lager.tre || 0) + perDøgn * ME.andel * Math.max(0, k.døgn - ME.margin) < k.mengde || !sim.tømmerbil) continue;
    const r = E.ta(S, k.id, havn, sim.t); if (r.ok) { X.tatt++; sim.logg(`tar eksportordren «${k.tittel}»`); break; } }
}

// eksporten går foran: varekontraktene (okosim-vare.js) ser ikke plankene en aktiv eksportordre trenger (de skjules mens den delen regner)
function foran(sim, fn) { const S = sim.eks.S, L = sim.L; let h = 0;
  for (const k of S.aktive) if (k.vei === 'sjø' && !k.skip) h += Math.max(0, k.mengde - k.iHavn - underveis(k));
  h = Math.min(h, L.lager.tre || 0); L.lager.tre = (L.lager.tre || 0) - h; try { fn(); } finally { L.lager.tre += h; } }
O.leggTilStrategi({ id: 'kontraktEksport', navn: 'kontrakter + sag + eksport', fornuftig: true,
  tekst: 'som «kontrakter + sag + varer», og fra trinn 2 eksportordre på planker sjøveien fra en havneby med avtale (eurokreditten veksles straks)',
  start(sim) { O.STRATEGIER.kontraktVare.start(sim); sim.eks = { S: E.ny(), tatt: 0, levert: 0, tapt: 0, utløpt: 0, turer: 0, m3: 0, forrige: 0 }; },
  time(sim) { foran(sim, () => O.STRATEGIER.kontraktVare.time(sim)); time(sim); },
  døgn(sim) { foran(sim, () => O.STRATEGIER.kontraktVare.døgn(sim)); morgen(sim); } });
O.leggTilDel({ id: 'eksport', slutt(sim, res) { if (sim.eks) res.eks = { tatt: sim.eks.tatt, levert: sim.eks.levert, tapt: sim.eks.tapt, utløpt: sim.eks.utløpt, turer: sim.eks.turer, m3: sim.eks.m3, laget: sim.prod ? sim.prod.P.laget.tre || 0 : 0, infl: sim.M.infl }; } });

// ---------- kravene ----------
// 1) eksporten gir noe: minst minInntekt på 30 døgn (median);
// 2) en ekte gevinst per m³: eksporten betaler minst «gevinst» × det en levering hjemme betaler (Vare.REGLER.lever.faktor × grunnprisen,
//    med inflasjonen på slutten) – plankene er flaskehalsen, så gevinsten må komme av prisen;
// 3) eksporten koster ikke: kassa dag 30 (median) er ikke lavere enn «kontrakter + sag + varer» med mer enn «slakk» (kontraktene trekkes
//    likevel ulikt når varekontraktene endres, så medianene svinger noen millioner);
// 4) varer kommer ikke fra løse luften: aldri mer eksportert enn saga laget, og aldri betalt mer enn de leverte m³ til høyeste eksportpris.
//    SELVTEST (årsak H): med tre ganger så høy betaling skal krav 4 si fra.
const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : 0; };
const tak = r => r.eks.m3 * E.REGLER.VARER.tre.ek * (1 + E.REGLER.svingning / 2) * 1.1 * E.nettoKurs(r.eks.infl) + 1;
const hjemme = infl => require(SP + '/vare.js').REGLER.lever.faktor * Leir.MATERIALER.tre.pris * infl;
O.leggTilKrav({ navn: 'eksporten', sjekk(RES, REGLER, selvtest) {
  const ut = [], L = RES.kontraktEksport || []; if (!L.length) return ut;
  const inn = med(L.map(r => r.sum.inn.eksport || 0)), snitt = f => (L.reduce((s, r) => s + (r.eks ? f(r.eks) : 0), 0) / L.length).toFixed(1).replace('.', ',');
  if (!selvtest) {
    const dag30 = A => med(A.map(r => (r.dager[29] || r.dager[r.dager.length - 1]).kasse)), V = RES.kontraktVare || [];
    ut.push({ ok: inn >= ME.mål.minInntekt, tekst: `«kontrakter + sag + eksport»: eksporten ga ${O.mill(inn)} på ${O.REGLER.døgn} døgn (median; minst ${O.mill(ME.mål.minInntekt)}) – i snitt ${snitt(e => e.tatt)} tatt, ${snitt(e => e.levert)} levert (${snitt(e => e.m3)} m³), ${snitt(e => e.tapt)} tatt av pirater, ${snitt(e => e.utløpt)} gikk ut` });
    const M = L.filter(r => r.eks && r.eks.m3 > 0), perM3 = med(M.map(r => (r.sum.inn.eksport || 0) / r.eks.m3)), hj = med(M.map(r => hjemme(r.eks.infl)));
    ut.push({ ok: M.length > 0 && perM3 >= ME.mål.gevinst * hj, tekst: `eksporten gir ${Math.round(perM3).toLocaleString('nb-NO')} kr per m³ planker mot ${Math.round(hj).toLocaleString('nb-NO')} kr for en levering hjemme (minst × ${String(ME.mål.gevinst).replace('.', ',')})` });
    if (V.length) ut.push({ ok: dag30(L) >= dag30(V) - ME.mål.slakk, tekst: `eksporten koster ikke: kassa dag 30 ${O.mill(dag30(L))} mot ${O.mill(dag30(V))} uten eksport (median, slakk ${O.mill(ME.mål.slakk)})` });
  }
  const R = L.filter(r => r.eks), verst = R.map(r => ({ inn: r.sum.inn.eksport || 0, tak: tak(r), m3: r.eks.m3, laget: r.eks.laget })).sort((a, b) => b.inn / b.tak - a.inn / a.tak)[0];
  if (verst) ut.push({ ok: verst.inn <= verst.tak && R.every(r => r.eks.m3 <= r.eks.laget + 1e-6), tekst: `eksporten betaler bare for leverte planker saga har laget (verste kjøring ${O.mill(verst.inn)} for ${Math.round(verst.m3)} m³, høyst ${O.mill(verst.tak)})` });
  if (!selvtest) { const F = Array.from({ length: Math.min(10, L.length) }, (_, i) => O.kjør('kontraktEksport', i + 1, { faktor: { eksport: 3 } }));
    const q = this.sjekk({ kontraktEksport: F }, REGLER, true).filter(x => !x.ok);
    ut.push({ ok: q.length > 0, tekst: `selvtest: med tre ganger så høy betaling for eksporten sier kravet fra (${q.length ? q[0].tekst : 'ingen brudd'})` }); }
  return ut;
} });

module.exports = { ME };
