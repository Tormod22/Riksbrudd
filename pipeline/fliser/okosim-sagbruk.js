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
  slutt(sim, res) { if (sim.prod) res.sag = { gikk: sim.prod.sagGikk || 0, timer: Math.max(1, (sim.t - (sim.sagFra || 0)) / 60), sto: sim.prod.sagSto || {}, laget: sim.prod.P.laget, brukt: sim.prod.P.brukt }; },
  døgn(sim) {
    if (!sim.prod || !sim.selgProd) return; const L = sim.L;
    for (const v of ['tre', 'ved', 'flis']) { const har = Math.floor(Math.max(0, (L.lager[v] || 0) - (v === 'flis' ? SB.flisReserve : 0)) * 10) / 10, m = Marked.kanSelge(sim.M, v, har); if (!(m > 0)) continue;
      const kr = Math.round(m * Marked.pris(sim.M, v, Leir.MATERIALER[v].pris) * Marked.SALG); L.lager[v] -= m; Marked.selg(sim.M, v, m); sim.gi(kr, v === 'tre' ? 'planker' : v); }
  },
});

// bygg sagbruket og fyrkjelen og kjøp en tømmerbil; når de er ferdige: 4 på maskinene (3 + 1), 2 på hogst
// (markedet kan være tomt for betong og stål etter startleiren: da prøves det igjen hver time)
function sagStart(sim) { sim.sagMangler = ['sagbruk', 'fyrkjele']; sagBygg(sim); sim.selgProd = true; }
function sagBygg(sim) {
  if (sim.sagMangler && !sim.sagMangler.length && !sim.tømmerbil && sim.betal(PR.REGLER.tømmerbil.pris, 'tømmerbil')) sim.tømmerbil = true;
  if (!sim.sagMangler || !sim.sagMangler.length) return;
  sim.sagMangler = sim.sagMangler.filter(t => { const r = O.API.bygg(sim, t, 'sagbruk'); if (r.feil && !sim['sagMeldt' + t]) { sim['sagMeldt' + t] = 1; sim.logg('venter med ' + t + ': ' + r.feil); } return !!r.feil; });
  if (!sim.sagMangler.length && !sim.tømmerbil && sim.betal(PR.REGLER.tømmerbil.pris, 'tømmerbil')) sim.tømmerbil = true;
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

O.leggTilStrategi({ id: 'sagbruk', navn: 'bare sagbruk', fornuftig: true, tekst: 'sagbruk og fyrkjele, tømmerbil, to på hogst og fire på maskinene; selger planker, flis og ved',
  start: sagStart, time(sim) { sagFolk(sim, { maskin: 4, hogst: 2 }); } });

O.leggTilStrategi({ id: 'kontraktSag', navn: 'kontrakter + sagbruk', fornuftig: true, tekst: 'som «bare kontrakter», og i tillegg sagbruket med fire nye folk (rekruttert) på maskinene og to på hogst',
  start(sim) { O.STRATEGIER.kontrakter.start(sim); sagStart(sim); sim.sagRekrutter = 4; },
  time(sim) {
    // fire rekrutter til leiren (brakka har åtte senger) før folkene fordeles
    while (sim.sagRekrutter > 0) { const r = FolkR.rekrutter(sim.F, sim.L, kr => sim.betal(kr, 'rekruttering'), { årstid: sim.årstid }); if (!r || r.feil) break; sim.sagRekrutter--; }
    if (!sim.sagRekrutter) sagFolk(sim, { maskin: 4, hogst: 2 });
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
  return ut;
} });

module.exports = { SB, fullDrift };
