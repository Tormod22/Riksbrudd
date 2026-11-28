// ØKONOMITESTEN – del «vare» (fase Ø2, 28. nov; docs/natt/ut3-varekontrakt.md): varekontraktene (spill/vare.js) i modellen.
// Lastes av test_okonomitest.js etter okosim-sagbruk.js (alfabetisk). Ny strategi «kontrakter + sagbruk + leveranser»: som «kontrakter + sagbruk»,
// og fra trinn 2 «Leverandør» (den første kontrakten levert og minst tre bygg – spill/trinn.js) tar leiren varekontraktene som passer:
// Storlias billige tømmer (kjøpsavtale), leveringer av planker og ved som lageret og maskinene rekker, og leveranseavtaler når maskinene
// lager nok i døgnet. Leveringene kjøres med tømmerbilen (én tur om gangen, ruta som i okosim.bilTimer), eller av Gråfjell Frakt når
// fristen er nær. Det leiren trenger til kontraktene, holdes igjen når sagbruket selger om morgenen (sim.vareReserve i okosim-sagbruk.js).
// Modellens egne valg (Claudes forslag): høyst VM.maksAktive varekontrakter samtidig, bakhold uten eskorte tar lasten med VM.tapVedAngrep.
'use strict';
const path = require('path');
const O = require('./okosim.js');
require('./okosim-sagbruk.js');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const Selskap = require(SP + '/selskap.js'), V = require(SP + '/vare.js'), Leir = require(SP + '/leir.js'), FolkR = require(SP + '/folk.js'), PR = require(SP + '/produksjon.js');
const { Marked } = require(SP + '/spillet.js');
V.registrer(Selskap);

// Claudes forslag for modellen
const VM = { maksAktive: 2, tapVedAngrep: .5, lasteTimer: .5, fraktMargin: 3, avtaleMargin: 1.1, mål: { minInntekt: 3e6 } };
const ID = 'blå', SIMS = new WeakMap();
const steder = sim => sim.region.byer.map(b => ({ navn: b.navn, x: b.x, y: b.y, slag: 'tettsted', id: b.id, folk: b.folk, eier: b.eier }));
const verdi = sim => ({ tre: Marked.pris(sim.M, 'tre', Leir.MATERIALER.tre.pris), tømmer: Marked.pris(sim.M, 'tømmer', Leir.MATERIALER.tømmer.pris), ved: Marked.pris(sim.M, 'ved', Leir.MATERIALER.ved.pris),
  flis: Marked.pris(sim.M, 'flis', Leir.MATERIALER.flis.pris), diesel: Marked.pris(sim.M, 'diesel', Leir.DRIVSTOFF.prisPerLiter), mat: Marked.pris(sim.M, 'mat', FolkR.R.matPris) });
// det maskinene faktisk ga det siste døgnet (laget minus brukt, fra Produksjon-tellingene i okosim-sagbruk.js) – ikke det de kunne gitt
function perDøgn(sim) { const P = sim.prod && sim.prod.P, R = sim.vare, ut = {}, nå = {}; if (!P) return ut;
  for (const v of ['tre', 'ved', 'flis']) { nå[v] = (P.laget[v] || 0) - (P.brukt[v] || 0); ut[v] = Math.max(0, nå[v] - (R.forrige[v] || 0)); }
  R.forrige = nå; return ut; }
const aktive = sim => Selskap.side(sim.SK, ID).aktive.filter(V.erVare);
const trinn2 = sim => Selskap.side(sim.SK, ID).sum.levert >= 1 && sim.L.bygg.filter(b => Leir.ferdig(b)).length >= 3;
const underveis = k => (k.frakt ? k.frakt.mengde : 0) + (k.turer || []).reduce((s, t) => s + t.mengde, 0);

// ---------- Selskap.steg får målingene for varekontraktene, og hendelsene deres håndteres her (resten går videre til kontrakter-delen) ----------
const stegFør = Selskap.steg;
Selskap.steg = function (S, id, nå, dt, mål = {}) {
  const sim = SIMS.get(S); if (!sim) return stegFør(S, id, nå, dt, mål);
  for (const k of Selskap.side(S, id).aktive) if (V.erVare(k)) mål[k.id] = måling(sim, k);
  const ut = stegFør(S, id, nå, dt, mål), rest = [];
  for (const h of ut) { if (!h.k || !V.erVare(h.k)) { rest.push(h); continue; } hendelse(sim, h); }
  return rest;
};
function måling(sim, k) {
  const L = sim.L;
  if (k.type === 'avtale') return { har: L.lager[k.vare] || 0 };
  if (k.type === 'kjøp') return { penger: sim.kasse, plass: Math.max(0, Leir.lagerplass(L) - (L.lager[k.vare] || 0)) };
  let levert = 0; for (const t of (k.turer || []).slice()) if (sim.t >= t.fram) { levert += t.mengde; k.turer = k.turer.filter(q => q !== t); }
  return { levert, andel: k.turer && k.turer.length ? .5 : 0 };
}
function hendelse(sim, h) {
  const k = h.k, L = sim.L, R = sim.vare;
  // sim.faktor.vare: bare for selvtesten (en feil lagt inn med vilje: varekontraktene betaler for mye)
  const f = sim.faktor.vare || 1;
  if (h.type === 'vareDøgn') { L.lager[k.vare] = Math.max(0, (L.lager[k.vare] || 0) - h.mengde); sim.gi(h.kr * f, 'varer'); R.døgn++; }
  else if (h.type === 'vareKjøp') { sim.betal(h.kr, 'kjøpsavtale'); Leir.leggInn(L, k.vare, h.får); R.kjøpt += h.får; }
  else if (h.type === 'vareMist') { sim.betal(Math.min(h.kr, sim.kasse), 'bøter'); R.mist++; }
  else if (h.type === 'fraktTapt') { sim.gi(h.kr, 'varer'); R.tapt++; }
  else if (h.type === 'levert') { sim.gi(h.kr * f, 'varer'); R.levert++; sim.logg(`levert «${k.tittel}»: ${O.mill(h.kr)}`); }
  else if (h.type === 'brutt') { sim.betal(Math.min(h.kr || 0, sim.kasse), 'bøter'); R.brutt++; sim.logg(`brutt «${k.tittel}» (${h.grunn})`); }
  else if (h.type === 'angrep') { if (Selskap.lagRand(sim.frø * 2003 + sim.t)() < VM.tapVedAngrep && k.turer && k.turer.length) { k.turer = []; R.tapt++; sim.logg(`bakhold: lasten til «${k.tittel}» er tapt`); } }
}

// ---------- hver time: last på tømmerbilen, eller la Gråfjell ta resten når fristen er nær; reserven til sagbruket ----------
function time(sim) {
  const L = sim.L, R = sim.vare; let reserve = {};
  for (const k of aktive(sim)) {
    if (k.type === 'avtale') { reserve[k.vare] = (reserve[k.vare] || 0) + k.perDøgn; continue; }
    if (k.type !== 'lever' || k.frakt) continue;
    const igjen = Math.max(0, k.mengde - (k.levert || 0) - underveis(k)); if (igjen <= .01) continue;
    reserve[k.vare] = (reserve[k.vare] || 0) + igjen;
    const d = Math.hypot(k.sted.x, k.sted.y), tur = O.bilTimer(d) + VM.lasteTimer, har = L.lager[k.vare] || 0, kap = V.REGLER.last.tømmerbil;
    if (sim.tømmerbil && sim.t >= R.bilFri && har >= Math.min(kap, igjen) - .01) {
      const m = Math.min(kap, igjen, har); L.lager[k.vare] -= m; (k.turer = k.turer || []).push({ bil: 'tømmerbil', mengde: m, fram: sim.t + tur * 60 }); R.bilFri = sim.t + 2 * tur * 60; R.turer++;
    } else if (har >= igjen - .01 && (k.frist - sim.t) / 60 < tur + VM.fraktMargin + V.REGLER.frakt.fast) {
      const f = V.brukFrakt(k, sim.t, d / 1000, Selskap.lagRand(sim.frø * 1709 + sim.t + 3)); if (!f.feil) { L.lager[k.vare] -= f.mengde; R.frakt++; }
    }
  }
  sim.vareReserve = reserve;
}

// ---------- hver morgen: nye tilbud (fra trinn 2) og valget ----------
function morgen(sim) {
  if (!trinn2(sim)) return; const S = sim.SK, R = sim.vare, o = { steder: steder(sim), verdi: verdi(sim), leir: { x: 0, y: 0 }, perDøgn: perDøgn(sim), rand: Selskap.lagRand(sim.frø * 271 + sim.t + 11) };
  // tilbudene holdes utenfor S.tilbud (troppen i okosim.js velger fra S.tilbud) til de tas
  const nye = []; const ks = V.storliaTilbud(S, ID, sim.t, o); if (ks) nye.push(ks); nye.push(...V.lagTilbud(S, ID, sim.t, o));
  S.tilbud = S.tilbud.filter(k => !V.erVare(k)); R.tilbud = R.tilbud.filter(k => k.utløper > sim.t).concat(nye);
  const P = o.perDøgn, sd = Selskap.side(S, ID);
  for (const k of R.tilbud.slice()) {
    if (aktive(sim).length >= VM.maksAktive || sd.aktive.length >= Selskap.REGLER.maksAktive) break;
    // flis brennes i fyrkjelen (lageret svinger), så en levering av flis tas bare når hele mengden ligger på lageret
    const ja = k.storlia ? !!P.tre : k.type === 'lever' && k.vare === 'flis' ? (sim.L.lager.flis || 0) >= k.mengde + 12 && !!sim.tømmerbil : k.type === 'lever' ? V.rekker(k, sim.L.lager[k.vare] || 0, P[k.vare] || 0, O.bilTimer(Math.hypot(k.sted.x, k.sted.y))).ok && !!sim.tømmerbil
      : k.type === 'avtale' ? (P[k.vare] || 0) >= k.perDøgn * VM.avtaleMargin && (sim.L.lager[k.vare] || 0) >= k.perDøgn : false;
    if (!ja) continue;
    S.tilbud.push(k); const g = Selskap.godta(S, ID, k.id, sim.t, Selskap.lagRand(sim.frø * 1291 + sim.t + 5)); S.tilbud = S.tilbud.filter(q => q !== k);
    if (g.ok) { R.tilbud = R.tilbud.filter(q => q !== k); R.tatt[k.type] = (R.tatt[k.type] || 0) + 1; sim.logg(`tar «${k.tittel}»`); }
  }
}

O.leggTilStrategi({ id: 'kontraktVare', navn: 'kontrakter + sag + varer', fornuftig: true,
  tekst: 'som «kontrakter + sagbruk», og fra trinn 2 varekontraktene som passer: Storlias tømmer, leveringer av planker og ved, leveranseavtaler',
  start(sim) { O.STRATEGIER.kontraktSag.start(sim); sim.vare = { tilbud: [], tatt: {}, forrige: {}, levert: 0, brutt: 0, døgn: 0, mist: 0, tapt: 0, kjøpt: 0, turer: 0, frakt: 0, bilFri: 0 }; SIMS.set(sim.SK, sim); },
  time(sim) { O.STRATEGIER.kontraktSag.time(sim); time(sim); },
  døgn(sim) { morgen(sim); } });
O.leggTilDel({ id: 'vare', slutt(sim, res) { if (sim.vare) res.vare = { ...sim.vare, tilbud: undefined }; } });

// ---------- kravene ----------
// varekontraktene skal gi en grei inntekt (minst minInntekt på 30 døgn i medianen), men aldri mer i døgnet enn det ett sagbruk i full drift
// lager (planker) solgt til leveringsprisen – varer kommer ikke fra løse luften (dobbel betaling, feil pris o.l. slår ut her). Resten av
// kravene (ikke blakk uten sjanse, over «gjør ingenting», under 200 mill.) gjelder strategien som alle de andre.
O.leggTilKrav({ navn: 'varekontraktene', sjekk(RES, REGLER, selvtest) {
  const ut = [], L = RES.kontraktVare || []; if (!L.length) return ut;
  const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : 0; };
  const inn = med(L.map(r => r.sum.inn.varer || 0)), dager = O.REGLER.døgn, lønn = 10 * FolkR.R.lønn;
  const snitt = f => L.reduce((s, r) => s + (r.vare ? f(r.vare) : 0), 0) / L.length;
  const tatt = t => snitt(v => v.tatt[t] || 0).toFixed(1).replace('.', ',');
  ut.push({ ok: inn >= VM.mål.minInntekt, tekst: `«kontrakter + sag + varer»: varekontraktene ga ${O.mill(inn)} på ${dager} døgn (median; minst ${O.mill(VM.mål.minInntekt)}) – tatt i snitt ${tatt('lever')} leveringer, ${tatt('avtale')} avtaler, ${tatt('kjøp')} kjøpsavtaler; ${snitt(v => v.levert).toFixed(1).replace('.', ',')} levert, ${snitt(v => v.brutt).toFixed(1).replace('.', ',')} brutt, ${snitt(v => v.mist).toFixed(1).replace('.', ',')} døgn med bot, ${snitt(v => v.tapt).toFixed(1).replace('.', ',')} laster tapt` });
  const perDøgnMaks = Math.max(...L.map(r => (r.sum.inn.varer || 0) / dager)), tak = sagTak();
  ut.push({ ok: perDøgnMaks <= tak, tekst: `varekontraktene gir høyst ${O.mill(perDøgnMaks)} i døgnet (høyst det et sagbruk lager til leveringspris: ${O.mill(tak)}; lønna til ti er ${O.mill(lønn)})` });
  // SELVTEST (årsak H): med varekontrakter som betaler tre ganger så mye, skal taket si fra
  if (!selvtest) { const F = Array.from({ length: Math.min(10, L.length) }, (_, i) => O.kjør('kontraktVare', i + 1, { faktor: { vare: 3 } }));
    const q = this.sjekk({ kontraktVare: F }, REGLER, true).filter(x => !x.ok);
    ut.push({ ok: q.length > 0, tekst: `selvtest: med tre ganger så høy betaling for varene sier kravet fra (${q.length ? q[0].tekst : 'ingen brudd'})` }); }
  return ut;
} });

// det ett sagbruk i full drift lager av planker i døgnet, til leveringsprisen (grunnprisen × lever.faktor × bakholdFaktor)
const sagTak = () => 24 * PR.REGLER.maskiner.sagbruk.ut.tre * Leir.MATERIALER.tre.pris * V.REGLER.lever.faktor * V.REGLER.bakholdFaktor;

module.exports = { VM, sagTak };
