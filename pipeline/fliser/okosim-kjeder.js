// ØKONOMITESTEN – del «kjeder» (fase Ø9, 28. nov; se docs/natt/ut6-kjeder.md): steinbruddet og steinknuseren (spill/produksjon.js) i modellen.
// Lastes av test_okonomitest.js (alfabetisk – etter okosim-hogst.js; krever okosim-sagbruk.js, som kjører ALLE maskinene time for time med
// Produksjon.steg og krokene for strøm og varme). Ny strategi «kontrakter + stein og pukk»: som «bare kontrakter», og når spillet ikke lenger
// varsler (Produksjon.driftVarsel for steinknuseren), bygges fyrkjele, steinbrudd og steinknuser; fem rekrutter går på maskinene (kjelen 1,
// bruddet 2, knuseren 2). Kjelen fyres med kjøpt flis (ingen saga i denne strategien), og pukken selges hver morgen så langt markedet tar imot.
// Modellens egne valg (Claudes forslag): steinen som blir til overs over 20 m³ selges også; maskinene repareres under 60 % hp.
'use strict';
const path = require('path');
const O = require('./okosim.js'), SB = require('./okosim-sagbruk.js');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const Leir = require(SP + '/leir.js'), FolkR = require(SP + '/folk.js'), PR = require(SP + '/produksjon.js'), { Marked } = require(SP + '/spillet.js');

// Claudes forslag for modellen
// kasseMinst: kjeden bygges først når kassa er over 60 mill. (kontraktene bærer leiren) – før det trekker den for mye fra troppen
const KS = { kasseMinst: 60e6, maskiner: ['fyrkjele', 'steinbrudd', 'steinknuser'], folk: 5, steinIgjen: 20, flisMinst: 1.5, flisKjøp: 8, mål: { lønnFor: 10, min: .7, maks: 1.6 },
  // strategien skal ende mellom 0,6 og 1,2 × «bare kontrakter»: kjelen fyres med kjøpt flis og de fem tar senger troppen ellers ville fylt
  mot: [.6, 1.2] };

O.leggTilDel({ id: 'kjeder',
  døgn(sim) {
    if (!sim.selgPukk) return; const L = sim.L;
    for (const [v, igjen] of [['pukk', 0], ['stein', KS.steinIgjen]]) { const har = Math.floor(Math.max(0, (L.lager[v] || 0) - igjen) * 10) / 10, m = Marked.kanSelge(sim.M, v, har); if (!(m > 0)) continue;
      const kr = Math.round(m * Marked.pris(sim.M, v, Leir.MATERIALER[v].pris) * Marked.SALG); L.lager[v] -= m; Marked.selg(sim.M, v, m); sim.gi(kr, v); }
  },
  slutt(sim, res) { if (sim.prod && sim.selgPukk) res.pukk = { laget: sim.prod.P.laget.pukk || 0, stein: sim.prod.P.laget.stein || 0, timer: Math.max(1, (sim.t - (sim.steinFra || sim.t)) / 60) }; if (sim.steinVarsel) res.steinVarsel = sim.steinVarsel; },
});

function steinVarsel(sim) {
  const f = SB.fasteNå(sim), kost = t => { const k = Leir.kostnad(t); return k.pris + Object.entries(k.mat).reduce((s, [v, m]) => s + Math.max(0, m - (sim.L.lager[v] || 0)) * Marked.kjøpspris(sim.M, v, Leir.MATERIALER[v].pris, true), 0); };
  // hele kjeden regnes som «prisen» (kjele + brudd + knuser), driften er knuserens
  return PR.driftVarsel('steinknuser', { kasse: sim.kasse, kost: KS.maskiner.reduce((s, t) => s + kost(t), 0), perDøgn: f.perDøgn, inntekt: f.inntekt, infl: sim.M.infl });
}
function steinBygg(sim) {
  if (!sim.steinMangler || !sim.steinMangler.length) return;
  sim.steinMangler = sim.steinMangler.filter(t => { const r = O.API.bygg(sim, t, 'stein'); return !!r.feil; });
}
function vedlikehold(sim) { for (const b of PR.maskinene(sim.L)) if (b.hp < .6 && !b.arbeid) Leir.reparer(sim.L, b.id, kr => sim.betal(kr, 'reparasjon')); }
function steinTime(sim) {
  if (!sim.steinMangler && sim.kasse >= KS.kasseMinst && !Leir.jobber(sim.L).length && !steinVarsel(sim).varsel) { sim.steinMangler = KS.maskiner.slice(); sim.steinRekrutter = KS.folk; sim.steinVarsel = { dag: Math.floor(sim.t / 1440) + 1 }; sim.logg('bygger steinbrudd, steinknuser og fyrkjele'); }
  if (!sim.steinMangler) return;
  steinBygg(sim);
  while (sim.steinRekrutter > 0 && SB.råd(sim, FolkR.R.rekruttPris)) { const r = FolkR.rekrutter(sim.F, sim.L, kr => sim.betal(kr, 'rekruttering'), { årstid: sim.årstid }); if (!r || r.feil) break; sim.steinRekrutter--; }
  // kjelen trenger brensel: flis kjøpes når det er lite igjen
  if (sim.prod && (sim.L.lager.flis || 0) < KS.flisMinst) O.API.kjøpMat(sim, { flis: KS.flisKjøp }, 'flis');
  if (sim.steinFolk) { vedlikehold(sim); return; }
  if (sim.steinMangler.length || sim.steinRekrutter > 0 || Leir.jobber(sim.L).length) return;
  sim.steinFolk = true; sim.steinFra = sim.t; sim.selgPukk = true;
  const P = sim.F.personer.filter(p => p.oppgave !== 'kjøkken' && p.oppgave !== 'vakt' && p.oppgave !== 'maskin').sort((a, b) => (b.ferd.maskin || 0) - (a.ferd.maskin || 0));
  P.slice(0, KS.folk).forEach(p => FolkR.sett(sim.F, p.id, 'maskin')); sim.logg(`steinknuseren går: ${KS.folk} på maskinene`);
}

O.leggTilStrategi({ id: 'kontraktStein', navn: 'kontrakter + stein og pukk', fornuftig: true, tekst: 'som «bare kontrakter», og steinbrudd, steinknuser og fyrkjele med fem nye folk når spillet ikke lenger varsler; selger pukken',
  start(sim) { O.STRATEGIER.kontrakter.start(sim); sim.følgVarsel = true; },
  time(sim) { steinTime(sim); O.STRATEGIER.kontrakter.time(sim); } });

// ---------- kravene ----------
// Steinknuseren i full drift (pukk minus steinen til salgspris) mot lønna til ti – som saga (planen 4.2: «dekker lønna til ca. ti»).
function fullDrift(t = 'steinknuser') {
  const M = PR.REGLER.maskiner[t], p = v => Leir.MATERIALER[v].pris * Marked.SALG;
  return 24 * (Object.entries(M.ut).reduce((s, [v, m]) => s + m * p(v), 0) - Object.entries(M.inn[0]).reduce((s, [v, m]) => s + m * p(v), 0));
}
O.leggTilKrav({ navn: 'kjedene', sjekk(RES) {
  const ut = [], lønn = KS.mål.lønnFor * FolkR.R.lønn, med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : 0; };
  // stein: hele kjeden (bruddet mater knuseren: 1,5 av 2 m³ i timen, så knuseren går 75 %) med fire arbeidere
  { const B = PR.REGLER.maskiner.steinbrudd, Kn = PR.REGLER.maskiner.steinknuser, a = Math.min(1, B.ut.stein / Kn.inn[0].stein), v = 24 * a * Kn.ut.pukk * Leir.MATERIALER.pukk.pris * Marked.SALG, f = v / lønn / (B.folk + Kn.folk) * 3;
    ut.push({ ok: f >= KS.mål.min && f <= KS.mål.maks, tekst: `steinkjeden (brudd + knuser) i full drift gir ${O.mill(v)} pukk i døgnet – ${f.toFixed(2).replace('.', ',')} × lønna til ti per tre arbeidere (${String(KS.mål.min).replace('.', ',')}–${String(KS.mål.maks).replace('.', ',')}; saga: ${(SB.fullDrift() / lønn).toFixed(2).replace('.', ',')})` }); }
  for (const t of ['mølle', 'fiskemottak', 'smie']) { const v = fullDrift(t), f = v / lønn, folk = PR.REGLER.maskiner[t].folk;
    ut.push({ ok: f > 0 && f / folk * 3 <= KS.mål.maks, tekst: `${Leir.BYGG[t].navn.toLowerCase()} i full drift gir ${O.mill(v)} mer i døgnet enn råvaren – ${(f / folk * 3).toFixed(2).replace('.', ',')} × lønna til ti per tre arbeidere (høyst ${String(KS.mål.maks).replace('.', ',')})` }); }
  if (RES.kontraktStein) { const L = RES.kontraktStein.filter(r => r.pukk), n = RES.kontraktStein.length;
    ut.push({ ok: L.length >= n * .5, tekst: `«kontrakter + stein og pukk» fikk steinknuseren i gang i ${L.length} av ${n} kjøringer (dag ${L.length ? med(L.map(r => r.steinVarsel ? r.steinVarsel.dag : 0)) : '–'} i medianen)` });
    if (L.length) { const salg = med(L.map(r => (r.sum.inn.pukk || 0) / Math.max(1, r.pukk.timer / 24))), laget = med(L.map(r => r.pukk.laget / Math.max(1, r.pukk.timer / 24)));
      ut.push({ ok: laget > 10, tekst: `knuseren laget ${O.mill ? Math.round(laget) : laget} m³ pukk per døgn (median) og pukken ga ${O.mill(salg)} per døgn` }); }
    if (RES.kontrakter) { const a = med(RES.kontrakter.map(r => r.dager[r.dager.length - 1].kasse)), b = med(RES.kontraktStein.map(r => r.dager[r.dager.length - 1].kasse));
      ut.push({ ok: b >= a * KS.mot[0] && b <= a * KS.mot[1], tekst: `«kontrakter + stein og pukk» mot «bare kontrakter» (median dag 30): ${O.mill(b)} mot ${O.mill(a)} (${KS.mot.join('–').replace(/\./g, ',')} ×) – stein er et tillegg, ikke en snarvei` }); } }
  return ut;
} });

module.exports = { KS, fullDrift };
