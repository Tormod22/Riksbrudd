// ØKONOMITESTEN – del «sagbruk» (fase Ø1, 28. nov; se docs/natt/ut2-sagbruk.md og docs/natt/ut1-okotest.md).
// Lastes av test_okonomitest.js (alle pipeline/fliser/okosim-*.js, etter okosim-hogst.js som gir hogsten).
// Tallene fra spillet: Produksjon.REGLER (maskinene: inn/ut per time, folk, strøm), Leir.BYGG (pris), Leir.MATERIALER (grunnpris),
// Marked (pris, SALG = 80 %, KJØPER = det markedet tar imot per døgn), FolkRegler (lønn, tempo), Ressurser (hogst, tømmerbil).
// Modellen selv antar (Claudes forslag): folkene settes på maskinene når byggene er ferdige; flis til ett døgn i kjelen beholdes,
// resten av flisen, ved og planker selges hver morgen så langt markedet tar imot.
'use strict';
const path = require('path');
const O = require('./okosim.js'), HG = require('./okosim-hogst.js');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const Leir = require(SP + '/leir.js'), FolkR = require(SP + '/folk.js'), PR = require(SP + '/produksjon.js'), { Marked } = require(SP + '/spillet.js');

// Claudes forslag for modellen
const SB = { flisReserve: 12, mål: { lønnFor: 10, min: .7, maks: 1.4 }, kjøreMinst: .75 };

// krokene i reglene (som produksjon-visning.js gjør i spillet): strømmen fra kjelen, maskiner som står, varmen
const SIM = new WeakMap();
Leir.maskinKW = L => { const s = SIM.get(L); return s && s.prod ? s.prod.kw : 0; };
Leir.hviler = (L, b) => { const s = SIM.get(L); return s ? PR.hviler(L, b, kraft(s)) : false; };
FolkR.varmeAndel = (L, B) => { const s = SIM.get(L); return s && s.prod ? PR.varmeAndel(s.prod.varme, B.fyring) : 0; };
const kraft = sim => FolkR.arbeidere(sim.F, 'maskin') * (FolkR.tempo(sim.F, 'maskin') || 0);

O.leggTilDel({ id: 'sagbruk',
  time(sim) {
    if (!PR.maskinene(sim.L).length) return;
    if (!sim.prod) { sim.prod = { P: PR.ny(), kw: 0, varme: 0 }; SIM.set(sim.L, sim); }
    const kl = (6 + sim.t / 60) % 24, s = Leir.steg(sim.L, 0, kl >= 6 && kl < 20 ? 1 : 0);
    const A = sim.F.personer.filter(p => p.oppgave === 'maskin' && FolkR.arbeidsfør(p)), ferdighet = A.length ? A.reduce((q, p) => q + (p.ferd.maskin || 0), 0) / A.length : 0;
    const r = PR.steg(sim.prod.P, sim.L, O.REGLER.stegMin, { kraft: kraft(sim), mangler: s.mangler, ferdighet }); sim.prod.kw = r.kw; sim.prod.varme = r.varme;
    // saga alene: timer i drift og timer den sto, per grunn
    for (const q of Object.values(r.status)) if (q.type === 'sagbruk') { sim.prod.sagGikk = (sim.prod.sagGikk || 0) + q.drift; const g = q.grunn; if (g && q.drift < 1) { const S = sim.prod.sagSto = sim.prod.sagSto || {}; S[g] = (S[g] || 0) + 1 - q.drift; } }
  },
  slutt(sim, res) { if (sim.sagVarsel) res.sagVarsel = sim.sagVarsel; if (sim.prod) res.sag = { gikk: sim.prod.sagGikk || 0, timer: Math.max(1, (sim.t - (sim.sagFra || 0)) / 60), sto: sim.prod.sagSto || {}, laget: sim.prod.P.laget, brukt: sim.prod.P.brukt }; },
  // (ut3-varekontrakt) det varekontraktene trenger (sim.vareReserve, okosim-vare.js), selges ikke
  døgn(sim) {
    if (!sim.prod || !sim.selgProd) return; const L = sim.L;
    for (const v of ['tre', 'ved', 'flis']) { const har = Math.floor(Math.max(0, (L.lager[v] || 0) - (v === 'flis' ? SB.flisReserve : 0) - ((sim.vareReserve && sim.vareReserve[v]) || 0)) * 10) / 10, m = Marked.kanSelge(sim.M, v, har); if (!(m > 0)) continue;
      const kr = Math.round(m * Marked.pris(sim.M, v, Leir.MATERIALER[v].pris) * Marked.SALG); L.lager[v] -= m; Marked.selg(sim.M, v, m); sim.gi(kr, v === 'tre' ? 'planker' : v); }
  },
});

// (ut4-balanse2 28. nov) VARSELET i byggelista (Produksjon.driftVarsel) med de tallene spillet bruker: prisen på saga og kjelen med
// materialene som mangler (kjøpt i markedet med påslaget, som O.API.bygg), leirens faste utgifter i døgnet (Produksjon.leirDøgn: lønn,
// vedlikehold og diesel – det samme som byggelista regner med) og inntekten siste døgn.
const kostNå = (sim, t) => { const k = Leir.kostnad(t); return k.pris + Object.entries(k.mat).reduce((s, [v, m]) => s + Math.max(0, m - (sim.L.lager[v] || 0)) * Marked.kjøpspris(sim.M, v, Leir.MATERIALER[v].pris, true), 0); };
function fasteNå(sim) {
  const d = sim.dager[sim.dager.length - 1], tr = sim.tropper.reduce((a, t) => a + (t.betalt ? t.menn.filter(m => m.hp > 0).length : 0), 0);
  return { perDøgn: PR.leirDøgn(sim.L, { personer: sim.F.personer.length + tr, infl: sim.M.infl, dieselpris: Marked.pris(sim.M, 'diesel', Leir.DRIVSTOFF.prisPerLiter) }),
    inntekt: d ? Object.values(d.inn).reduce((a, v) => a + v, 0) : Object.values(sim.bok.inn).reduce((a, v) => a + v, 0) };
}
function sagVarsel(sim) {
  const f = fasteNå(sim), harKjele = sim.L.bygg.some(b => b.type === 'fyrkjele');
  return PR.driftVarsel('sagbruk', { kasse: sim.kasse, kost: kostNå(sim, 'sagbruk'), kjeleKost: harKjele ? 0 : kostNå(sim, 'fyrkjele'), perDøgn: f.perDøgn, inntekt: f.inntekt, infl: sim.M.infl });
}
// har spilleren råd til kr og fortsatt «varsel.døgn» døgn med de faste utgiftene (samme regel som varselet)?
const råd = (sim, kr) => sim.kasse - kr >= PR.REGLER.varsel.døgn * fasteNå(sim).perDøgn;

// bygg sagbruket og fyrkjelen og kjøp en tømmerbil; når de er ferdige: 4 på maskinene (3 + 1), 2 på hogst
// (markedet kan være tomt for betong og stål etter startleiren: da prøves det igjen hver time)
function sagStart(sim) { const v = sagVarsel(sim); sim.sagVarsel = { varsel: v.varsel, dag: Math.floor(sim.t / 1440) + 1, tekst: v.tekst }; if (v.varsel) sim.logg('varsel: ' + v.tekst);
  sim.sagMangler = ['sagbruk', 'fyrkjele']; sagBygg(sim); sim.selgProd = true; }
// tømmerbilen: «følgVarsel» (den fornuftige spilleren) kjøper den først når kassa tåler det
const kjøpBil = sim => { if (!sim.tømmerbil && (!sim.følgVarsel || råd(sim, PR.REGLER.tømmerbil.pris)) && sim.betal(PR.REGLER.tømmerbil.pris, 'tømmerbil')) sim.tømmerbil = true; };
function sagBygg(sim) {
  if (sim.sagMangler && !sim.sagMangler.length) kjøpBil(sim);
  if (!sim.sagMangler || !sim.sagMangler.length) return;
  sim.sagMangler = sim.sagMangler.filter(t => { const r = O.API.bygg(sim, t, 'sagbruk'); if (r.feil && !sim['sagMeldt' + t]) { sim['sagMeldt' + t] = 1; sim.logg('venter med ' + t + ': ' + r.feil); } return !!r.feil; });
  if (!sim.sagMangler.length) kjøpBil(sim);
}
function sagFolk(sim, på) {
  sagBygg(sim);
  // aggregatet (20 kW) rekker ikke både leiren og saga (15 kW): kjelen startes med kjøpt flis når den er tom (som spilleren må gjøre)
  if (sim.prod && (sim.L.lager.flis || 0) < 1 && !(sim.prod.kw > 0)) O.API.kjøpMat(sim, { flis: 6 }, 'flis');
  if (sim.sagFolk) { vedlikehold(sim); return; }
  if ((sim.sagMangler && sim.sagMangler.length) || Leir.jobber(sim.L).length) return; sim.sagFolk = true; sim.sagFra = sim.t;
  const P = sim.F.personer.filter(p => p.oppgave !== 'kjøkken' && p.oppgave !== 'vakt').sort((a, b) => (b.ferd.maskin || 0) - (a.ferd.maskin || 0));
  P.forEach((p, i) => FolkR.sett(sim.F, p.id, i < på.maskin ? 'maskin' : i < på.maskin + på.hogst ? 'hogst' : 'fri'));
  sim.logg(`sagbruket går: ${på.maskin} på maskinene, ${på.hogst} på hogst`);
}

// maskinene slites: under 60 % hp repareres de (Leir.reparer – byggelaget gjør det; to fra «fri» låner seg dit så lenge det står jobber)
function vedlikehold(sim) {
  for (const b of PR.maskinene(sim.L)) if (b.hp < .6 && !b.arbeid) Leir.reparer(sim.L, b.id, kr => sim.betal(kr, 'reparasjon'));
  const jobber = Leir.jobber(sim.L).length, bygg = sim.F.personer.filter(p => p.oppgave === 'bygg');
  if (jobber && bygg.length < 2) for (const p of sim.F.personer.filter(q => q.oppgave === 'fri').slice(0, 2 - bygg.length)) { FolkR.sett(sim.F, p.id, 'bygg'); p.sagLånt = true; }
  if (!jobber) for (const p of sim.F.personer.filter(q => q.sagLånt)) { FolkR.sett(sim.F, p.id, 'fri'); delete p.sagLånt; }
}

// (ut4-balanse2) «bare sagbruk» kjøper saga første dag selv om spillet varsler (Produksjon.driftVarsel) – det er fella varselet skal
// stoppe, ikke en fornuftig strategi. Kravet nederst sjekker at varselet kom.
O.leggTilStrategi({ id: 'sagbruk', navn: 'bare sagbruk', fornuftig: false, tekst: 'sagbruk og fyrkjele første dag (tross varselet), tømmerbil, to på hogst og fire på maskinene; selger planker, flis og ved',
  start: sagStart, time(sim) { sagFolk(sim, { maskin: 4, hogst: 2 }); } });

// (ut4-balanse2 28. nov) MODELLEN VAR FEIL: strategien kjøpte saga, kjelen, tømmerbilen og fire rekrutter (med en brakke til) første
// døgnet og sto med 1–3 mill. i kassa på dag 2–3 – det gjør ikke en fornuftig spiller, og spillet sier nå fra (driftVarsel). Nå venter
// den til varselet er borte (kassa tåler saga og ti døgn drift), og tømmerbilen og rekruttene kommer når kassa tåler dem.
O.leggTilStrategi({ id: 'kontraktSag', navn: 'kontrakter + sagbruk', fornuftig: true, tekst: 'som «bare kontrakter», og sagbruket med fire nye folk (rekruttert) på maskinene og to på hogst når spillet ikke lenger varsler',
  start(sim) { O.STRATEGIER.kontrakter.start(sim); sim.følgVarsel = true; },
  time(sim) {
    if (!sim.sagMangler && !Leir.jobber(sim.L).length && !sagVarsel(sim).varsel) { sagStart(sim); sim.sagRekrutter = 4; }
    // fire rekrutter til leiren (brakka har åtte senger) før folkene fordeles – når kassa tåler dem
    while (sim.sagRekrutter > 0 && råd(sim, FolkR.R.rekruttPris)) { const r = FolkR.rekrutter(sim.F, sim.L, kr => sim.betal(kr, 'rekruttering'), { årstid: sim.årstid }); if (!r || r.feil) break; sim.sagRekrutter--; }
    if (sim.sagMangler && !sim.sagRekrutter) sagFolk(sim, { maskin: 4, hogst: 2 });
    O.STRATEGIER.kontrakter.time(sim);
  } });

// ---------- kravene ----------
// Planen (kapittel 4.2): «et sagbruk i full drift dekker lønna til ca. ti personer – ikke mer». Verdiøkningen per døgn i full drift =
// det saga lager (planker + flis) minus tømmeret den bruker, til salgspris (80 % av markedsprisen), mot lønna til ti (FolkRegler).
function fullDrift() {
  const M = PR.REGLER.maskiner.sagbruk, p = v => Leir.MATERIALER[v].pris * Marked.SALG;
  const inn = Object.entries(M.inn[0]).reduce((s, [v, m]) => s + m * p(v), 0), ut = Object.entries(M.ut).reduce((s, [v, m]) => s + m * p(v), 0);
  return 24 * (ut - inn);
}
O.leggTilKrav({ navn: 'sagbruket', sjekk(RES) {
  const ut = [], lønn = SB.mål.lønnFor * FolkR.R.lønn, v = fullDrift(), f = v / lønn;
  ut.push({ ok: f >= SB.mål.min && f <= SB.mål.maks, tekst: `sagbruket i full drift gir ${O.mill(v)} mer verdi i døgnet enn tømmeret – ${f.toFixed(2).replace('.', ',')} × lønna til ${SB.mål.lønnFor} (${O.mill(lønn)})` });
  const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : 0; };
  for (const id of ['sagbruk', 'kontraktSag']) { const L = (RES[id] || []).filter(r => r.sag); if (!L.length) continue;
    // hvor stor del av tida saga gikk etter at den var klar (median), og grunnene når den sto (snitt i timer)
    const gikk = med(L.map(r => r.sag.gikk / r.sag.timer)), sto = {};
    for (const r of L) for (const [g, t] of Object.entries(r.sag.sto)) sto[g] = (sto[g] || 0) + t / L.length;
    const stoTekst = Object.entries(sto).sort((a, b) => b[1] - a[1]).map(([g, t]) => `${PR.grunnTekst(g, 'sagbruk')} ${Math.round(t)} t`).join(', ');
    const salg = med(L.map(r => ((r.sum.inn.planker || 0) + (r.sum.inn.flis || 0) + (r.sum.inn.ved || 0)) / Math.max(1, r.sag.timer / 24)));
    ut.push({ ok: gikk >= SB.kjøreMinst, kjent: 'sag:' + id, tekst: `«${O.STRATEGIER[id].navn}»: saga gikk ${Math.round(gikk * 100)} % av tida etter at den var klar (minst ${Math.round(SB.kjøreMinst * 100)} %; sto: ${stoTekst || 'aldri'}), salg ${O.mill(salg)} per døgn den var i drift` }); }
  // (ut4-balanse2) «bare sagbruk» er fella varselet skal stoppe: spillet skal ha varslet før kjøpet i ALLE kjøringene (SELVTEST, årsak H:
  // uten varselet – døgn = 0 – skal kravet slå til)
  const varslet = L => L.filter(r => r.sagVarsel && r.sagVarsel.varsel).length;
  if (RES.sagbruk) { const L = RES.sagbruk, n = varslet(L), eks = (L.find(r => r.sagVarsel) || {}).sagVarsel;
    ut.push({ ok: n === L.length, tekst: `«bare sagbruk»: spillet varslet før saga ble kjøpt i ${n} av ${L.length} kjøringer` + (eks ? ` (dag ${eks.dag}: «${eks.tekst.slice(0, 110)} …»)` : '') });
    const V = PR.REGLER.varsel, før = V.døgn; let m = 0; V.døgn = 0;
    try { m = varslet(Array.from({ length: 5 }, (_, i) => O.kjør('sagbruk', i + 1))); } finally { V.døgn = før; }
    ut.push({ ok: m < 5, tekst: `selvtest: uten varselet (døgn = 0) sier kravet fra (varslet i ${m} av 5)` }); }
  // den fornuftige («kontrakter + sagbruk») kjøper saga først når varselet er borte
  if (RES.kontraktSag) { const L = RES.kontraktSag.filter(r => r.sagVarsel), n = varslet(L);
    ut.push({ ok: n === 0, tekst: `«kontrakter + sagbruk» kjøper saga uten varsel (${L.length} av ${RES.kontraktSag.length} kjøpte den, ${n} med varsel; dag ${L.length ? med(L.map(r => r.sagVarsel.dag)) : '–'} i medianen)` }); }
  return ut;
} });

module.exports = { SB, fullDrift, sagVarsel, råd, fasteNå, sagFolk };
