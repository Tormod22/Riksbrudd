// ØKONOMITESTEN – del «byavtaler» og strategien «byer med avtaler» (fase Ø3, docs/natt/ut2-byer.md). Lastes av test_okonomitest.js.
// Tallene fra spillet: Byavtale (tillit, trinn, priser, løfter, holdt/brutt, oppsigelse, medlem), Region (skatt og varer for et medlem som
// for et tettsted du holder), Garnison/Strategi ikke brukt (ingen kamp – byene velger dere).
// Modellen (Claudes forslag, B under): strategien tar kontrakter som «bare kontrakter», men bare fra tettstedene (byKontrakter), og sender
// små vaktlag (2 mann, løftet «lite») til de beste nøytrale tettstedene – å vokte en by bygger tillit (Byavtale.REGLER.vakt), så
// beskyttelse (tillit 40) -> handel (55) -> medlem (70). Prisen er det byrådet godtar (Byavtale.verdi). Et medlem blir eid (som i spillet:
// RegionSpill.nyttMedlem) og betaler skatt (delen «byer» i okosim.js regner den), og vaktlaget økes til 4 (motstanderne kan prøve å ta det).
// IKKE i modellen: bønner om hjelp (røvere ved byene), rivalene som frir (bare REGLER.rivalTar i okosim.js tar nøytrale steder), frykt.
'use strict';
const path = require('path');
const O = require('./okosim.js');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const Byavtale = require(SP + '/byavtale.js'), Region = require(SP + '/region.js'), FolkR = require(SP + '/folk.js'), Tropper = require(SP + '/tropper.js');
const ID = 'blå';
// Claudes forslag for modellen: høyst «maks» byer om gangen, bare steder med minst «minFolk» innbyggere innen «maksKm», løftet «lite»
// (2 mann) til byen er medlem, så «medlemVakt» mann (løftet «vanlig»); varighet 30 døgn; reserven i kassa før nye vaktlag (døgn med faste utgifter)
const B = { maks: 4, minFolk: 600, maksKm: 25, løfte: 'vanlig', medlemVakt: 4, varighet: 30, reserve: 4 };
const friske = menn => menn.filter(m => m.hp >= 1).length;
const km = by => Math.hypot(by.x, by.y) / 1000;

O.leggTilDel({ id: 'byavtaler',
  start(sim) { sim.BA = Byavtale.ny(); sim.avtaleSett = new Set(); sim.avtaler = { inngått: 0, medlem: 0, brutt: 0, oppsagt: 0 }; },
  time(sim) {
    if (!sim.BA) return;
    // kontrakter levert for et tettsted: tilliten stiger og byen er kunde (som lytteren på «riksbrudd-kontrakt» i byavtale-visning.js)
    for (const k of (sim.SK.sider[ID] || { ferdige: [] }).ferdige) { if (k.status !== 'levert' || sim.avtaleSett.has(k.id)) continue; sim.avtaleSett.add(k.id);
      const id = k.giver && k.giver.slag !== 'firma' ? k.giver.by : null; if (id == null || !sim.region.byer.some(b => b.id === id)) continue;
      const b = Byavtale.by(sim.BA, id); b.kontrakter++; b.tillit = Math.min(100, b.tillit + Byavtale.REGLER.tillit.kontrakt); }
    for (const by of sim.region.byer) { const b = sim.BA.byer[by.id]; if (!b) continue; const v = by.vaktlag && !by.vaktlag.jobb ? friske(by.vaktlag.menn) : 0;
      if (b.avtale) { Byavtale.time(b, v);
        if (b.avtale.trinn === 'handel') { const g = Region.grunn(by.folk, by.type); for (const k of ['mat', 'tre', 'betong', 'stål', 'diesel']) if (g[k]) sim.pott[k] = (sim.pott[k] || 0) + g[k] / 24; } }
      else if (v >= Byavtale.REGLER.vakt.mann) b.vakt = (b.vakt || 0) + 1;
      // et medlem: tilliten er lojaliteten (Region), som i spillet
      if (b.avtale && b.avtale.trinn === 'medlem' && sim.RG.byer[by.id]) b.tillit = sim.RG.byer[by.id].loj; }
    // vaktlagene på vei
    for (const by of sim.region.byer) { const t = by.vaktlag; if (t && t.jobb) { t.jobb.timer -= 1; if (t.jobb.timer <= 0) t.jobb = null; } }
  },
  døgn(sim) {
    if (!sim.BA) return; const nå = sim.t;
    for (const by of sim.region.byer) { const b = sim.BA.byer[by.id]; if (!b) continue; const H = Byavtale.leder(by.id, by.folk).holdning;
      const d = Byavtale.døgn(b, { holdning: H, vokter: (b.vakt || 0) >= Byavtale.REGLER.vakt.timer }); b.vakt = 0;
      if (b.avtale && b.avtale.trinn === 'medlem' && sim.RG.byer[by.id]) sim.RG.byer[by.id].loj = b.tillit;
      const p = Byavtale.betaling(b); if (p > 0) sim.gi(p, 'byavtaler');
      if (d.holdt === false) sim.avtaler.brutt++;
      if (d.sierOpp && Byavtale.siOpp(b, nå, d.grunn)) { sim.avtaler.oppsagt++; sim.logg(`${by.navn} sier opp (${d.grunn})`); }
      const sl = Byavtale.slutt(b, nå);
      if (sl === 'ute' && b.avtale.trinn !== 'medlem') { const A = b.avtale; Byavtale.avslutt(b, sl); Byavtale.inngå(b, { trinn: A.trinn, pris: A.pris, løfte: A.løfte, varighet: A.varighet }, nå); }
      else if (sl === 'ute') b.avtale.slutt = nå + B.varighet * 1440;
      else if (sl) { if (b.avtale.trinn === 'medlem') { by.eier = null; by.garnison = null; } Byavtale.avslutt(b, sl, nå); }
      // et medlem som er tatt av motstanderen (okosim.js «byer»): avtalen er over
      if (b.avtale && b.avtale.trinn === 'medlem' && by.eier !== ID) { Byavtale.avslutt(b, 'tapt'); if (by.vaktlag) by.vaktlag = null; }
    }
  },
});

// velg byene: nøytrale, store nok og ikke for langt unna – mest folk per km først
function kandidater(sim) {
  return sim.region.byer.filter(by => !by.eier && by.folk >= B.minFolk && km(by) <= B.maksKm).sort((a, b) => km(a) / Math.sqrt(a.folk) - km(b) / Math.sqrt(b.folk));
}
// et vaktlag på n mann til byen (personer fra leiren, ellers rekrutter)
function vaktlag(sim, by, n) {
  while (sim.F.personer.filter(FolkR.arbeidsfør).length < n + 2 && sim.kasse > FolkR.R.rekruttPris + døgnReserve(sim)) {
    const r = FolkR.rekrutter(sim.F, sim.L, kr => sim.betal(kr, 'rekruttering'), { årstid: sim.årstid }); if (!r || r.feil) break; }
  if (sim.F.personer.filter(FolkR.arbeidsfør).length < n + 2) return null;
  const t = O.API.lagTropp(sim, Math.max(n, Tropper.R.min), 'Vakt ' + by.navn); if (!t) return null;
  t.rolle = 'bylag'; t.hjemme = false; t.betalt = true; t.jobb = { timer: O.marsjTimer(Math.hypot(by.x, by.y)) }; by.vaktlag = t; return t;
}
const døgnReserve = sim => B.reserve * (FolkR.lønnPerDøgn(sim.F.personer.length + sim.tropper.reduce((a, t) => a + t.menn.length, 0), sim.M.infl));
function avtaleTime(sim) {
  const nå = sim.t, aktive = sim.region.byer.filter(by => by.vaktlag);
  // nye vaktlag til de beste byene (høyst B.maks)
  if (aktive.length < B.maks && sim.kasse > døgnReserve(sim) + 2 * FolkR.R.rekruttPris) { const by = kandidater(sim).find(b => !b.vaktlag); if (by) vaktlag(sim, by, Byavtale.REGLER.løfter.find(l => l.id === B.løfte).mann); }
  for (const by of aktive) { const b = Byavtale.by(sim.BA, by.id), t = by.vaktlag; if (!t || t.jobb) continue;
    const H = Byavtale.leder(by.id, by.folk).holdning, bh = Byavtale.behov({ fiendeKm: 15, strøm: by.strøm, type: by.type, garnison: true }).verdi;
    const neste = b.avtale ? (b.avtale.trinn === 'beskyttelse' ? 'handel' : b.avtale.trinn === 'handel' ? 'medlem' : null) : 'beskyttelse'; if (!neste || Byavtale.kanTrinn(b, neste, ID, false, nå)) continue;
    const pris = neste === 'medlem' ? 0 : Byavtale.verdi(neste, by.folk, { behov: bh, holdning: H, løfte: B.løfte, varighet: B.varighet, tillit: b.tillit });
    const r = Byavtale.forhandle(b, { trinn: neste, pris, løfte: neste === 'medlem' ? 'vanlig' : B.løfte, varighet: B.varighet }, { folk: by.folk, behov: bh, holdning: H, nå });
    if (r.svar !== 'ja') continue;
    Byavtale.inngå(b, { trinn: neste, pris, løfte: neste === 'medlem' ? 'vanlig' : B.løfte, varighet: B.varighet }, nå); sim.avtaler.inngått++; sim.logg(`avtale med ${by.navn}: ${neste} (${O.mill(pris)} per døgn, tillit ${Math.round(b.tillit)})`);
    if (neste === 'medlem') { by.eier = ID; const rb = Region.by(sim.RG, by.id, b.tillit); rb.loj = b.tillit; rb.holdt = Region.REGLER.innkjøring.døgn; rb.medlem = true; sim.avtaler.medlem++;
      // vaktlaget blir garnison (løftet «vanlig»: 4 mann) – fylles opp med rekrutter
      while (t.menn.length < B.medlemVakt && sim.kasse > FolkR.R.rekruttPris + døgnReserve(sim) && O.API.rekrutterTil(sim, t)) { /* */ }
      t.garnisonI = by; by.garnison = t; }
  }
}

O.leggTilStrategi({ id: 'avtaler', navn: 'byer med avtaler', fornuftig: true,
  tekst: 'kontrakter bare for tettstedene (ikke firmaene), og vaktlag i de beste byene: beskyttelse -> handel -> medlem (Byavtale)',
  start(sim) { O.STRATEGIER.kontrakter.start(sim); sim.selgVarer = 20; },
  time(sim) { byKontrakter(sim); avtaleTime(sim); } });
// Troppen tar bare kontrakter fra tettstedene (oppdragsgiver bygd eller by i regionen) og den første – den arbeider for byene, ikke for
// firmaene. Tilbudslista filtreres mens «bare kontrakter» velger, og settes sammen igjen etterpå (tatte ut, nye tilbud med).
function byKontrakter(sim) {
  const S = sim.SK, alle = S.tilbud, egnet = k => k.første || (k.giver && k.giver.slag !== 'firma' && sim.region.byer.some(b => b.id === k.giver.by));
  const før = alle.filter(egnet); S.tilbud = før.slice();
  try { O.STRATEGIER.kontrakter.time(sim); }
  finally { const nå = S.tilbud, iDag = new Set(nå.map(k => k.id)), fraFør = new Set(før.map(k => k.id)), tatt = new Set(før.filter(k => !iDag.has(k.id)).map(k => k.id));
    S.tilbud = [...alle.filter(k => !tatt.has(k.id)), ...nå.filter(k => !fraFør.has(k.id))]; }
}

// KRAVENE (Claudes forslag, oppdraget for Ø3): «byer med avtaler» slår «byer med makt» og er på nivå med «bare kontrakter» (minst 85 % av
// medianen dag 30), og avtalene virker (byer blir medlem i de fleste kjøringene, betalingene kommer inn)
O.leggTilKrav({ navn: 'byer med avtaler', sjekk(RES) {
  const A = RES.avtaler, M = RES.byer, K = RES.kontrakter; if (!A) return [];
  const med = L => { const v = L.map(r => r.slutt).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  const ut = [];
  if (M) ut.push({ ok: med(A) > med(M), tekst: `«byer med avtaler» slår «byer med makt»: median dag 30 ${O.mill(med(A))} mot ${O.mill(med(M))}` });
  if (K) ut.push({ ok: med(A) >= .85 * med(K), tekst: `«byer med avtaler» er på nivå med «bare kontrakter»: ${O.mill(med(A))} mot ${O.mill(med(K))} (minst 85 %)` });
  const inn = A.map(r => r.sum.inn.byavtaler || 0).sort((a, b) => a - b), medlem = A.filter(r => r.byer > 0).length;
  ut.push({ ok: inn[Math.floor(inn.length / 2)] > 0, tekst: `avtalene betaler: median ${O.mill(inn[Math.floor(inn.length / 2)])} på 30 døgn` });
  ut.push({ ok: medlem >= A.length * .5, tekst: `minst én by blir medlem i ${medlem} av ${A.length} kjøringer (minst halvparten)` });
  return ut;
} });
