// ØKONOMITESTEN – del «firma» (fase Ø5, 28. nov; docs/natt/ut4-firmaer.md): firmaene og samarbeidet (spill/firma.js) i modellen.
// Lastes av test_okonomitest.js (alfabetisk – før okosim-vare.js, som den bruker). Ny strategi «kontrakter + sag + varer + fast kunde»: som
// «kontrakter + sag + varer», og i tillegg holder leiren regnskap med firmaenes holdning (de ferdige kontraktene fra hvert firma, Firma.registrerKontrakt).
// Når Storlia Tømmer vil (holdning 55 og to leveranser), blir leiren fast kunde: hver morgen kommer ett ekstra leveringstilbud fra Storlia med
// betaling × 1,15, som modellen tar på samme vilkår som de andre leveringene (lageret og saga må rekke det). Når Storlia låser opp høvleriet
// (holdning 65 og fire leveranser), kjøpes det (1,5 mill.) og sagbruket gir 1,4 × planker. Modellens egne valg (Claudes forslag): ingen
// felles anlegg, vern eller pakter med rivalene (de krever lag og kart – ikke i modellen).
'use strict';
const path = require('path');
const O = require('./okosim.js');
// samme rekkefølge som test_okonomitest.js ville lastet dem (hogst, sagbruk, vare) – delene kjøres i den rekkefølgen
require('./okosim-hogst.js'); require('./okosim-sagbruk.js'); require('./okosim-vare.js');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const Selskap = require(SP + '/selskap.js'), V = require(SP + '/vare.js'), Leir = require(SP + '/leir.js'), Fi = require(SP + '/firma.js'), FolkR = require(SP + '/folk.js');
const { Marked } = require(SP + '/spillet.js');

const ID = 'blå', FIRMA = 'Storlia Tømmer';
const steder = sim => sim.region.byer.map(b => ({ navn: b.navn, x: b.x, y: b.y, slag: 'tettsted', id: b.id, folk: b.folk, eier: b.eier }));
const verdi = sim => ({ tre: Marked.pris(sim.M, 'tre', Leir.MATERIALER.tre.pris), tømmer: Marked.pris(sim.M, 'tømmer', Leir.MATERIALER.tømmer.pris), ved: Marked.pris(sim.M, 'ved', Leir.MATERIALER.ved.pris),
  flis: Marked.pris(sim.M, 'flis', Leir.MATERIALER.flis.pris), diesel: Marked.pris(sim.M, 'diesel', Leir.DRIVSTOFF.prisPerLiter), mat: Marked.pris(sim.M, 'mat', FolkR.R.matPris) });

// hver morgen, før varedelen velger: holdningen fra de ferdige kontraktene, fast kunde, morgenens tilbud fra Storlia og høvleriet
function morgen(sim) {
  const FR = sim.firma, sd = Selskap.side(sim.SK, ID), f = Fi.finn(FR, FIRMA), R = sim.vare;
  for (const k of sd.ferdige) Fi.registrerKontrakt(FR, k);
  // svarene på gårsdagens faste tilbud: tatt (aktiv eller ferdig) eller gått ut (borte fra varedelens liste uten å være tatt)
  for (const o of FR.åpne.slice()) { const tatt = sd.aktive.some(k => k.id === o) || sd.ferdige.some(k => k.id === o); if (!tatt && R.tilbud.some(k => k.id === o)) continue;
    FR.åpne.splice(FR.åpne.indexOf(o), 1); if (f.fast) { Fi.fastSvar(f, tatt ? 'tatt' : 'utløpt'); if (tatt) FR.fastTatt++; } }
  if (!f.fast && Fi.kanSamarbeid(FR, f, 'fast').ok) { Fi.inngå(FR, f, 'fast', sim.t); if (!FR.fastFra) FR.fastFra = Math.floor(sim.t / 1440) + 1; sim.logg('Storlia Tømmer: fast kunde'); }
  if (f.fast && !FR.åpne.length) {
    const vare = ['tre', 'flis'][FR.nr++ % 2], k = V.lagEtt(sim.SK, ID, 'lever', sim.t, { steder: steder(sim), verdi: verdi(sim), leir: { x: 0, y: 0 }, rand: Selskap.lagRand(sim.frø * 613 + sim.t + 29) }, vare, FIRMA);
    if (k) { k.enhetPris = Math.round(k.enhetPris * Fi.REGLER.samarbeid.fast.faktor / 100) * 100; k.betaling = Math.round(k.mengde * k.enhetPris / 10000) * 10000; k.bot = Math.round(k.betaling * V.REGLER.lever.bot / 10000) * 10000;
      k.fast = true; k.fastKunde = FIRMA; k.utløper = sim.t + Fi.REGLER.samarbeid.fast.varer; R.tilbud.push(k); FR.åpne.push(k.id); Fi.fastTilbud(f, k.id); FR.fastTilbudt++; }
  }
  const harSag = sim.L.bygg.some(b => b.type === 'sagbruk');
  Fi.låsOpp(FR, sim.t, { harSag });
  if (FR.tekno.høvleri && !FR.tekno.høvleri.iBruk && harSag) { const r = Fi.brukTekno(FR, 'høvleri', { harSag }); if (r.ok && sim.betal(r.pris, 'teknologi')) { FR.høvleriDag = Math.floor(sim.t / 1440) + 1; sim.logg('høvleriet tas i bruk'); } else if (r.ok) FR.tekno.høvleri.iBruk = false; }
  if (FR.tekno.høvleri && FR.tekno.høvleri.iBruk) for (const b of sim.L.bygg) if (b.type === 'sagbruk') b.høvleri = true;
}

O.leggTilStrategi({ id: 'kontraktFirma', navn: 'kontrakter + sag + varer + fast kunde', fornuftig: true,
  tekst: 'som «kontrakter + sag + varer», og Storlia Tømmer som fast kunde (ett ekstra leveringstilbud hver morgen, × 1,15) og høvleriet når Storlia låser det opp',
  start(sim) { O.STRATEGIER.kontraktVare.start(sim); sim.firma = Object.assign(Fi.ny({ x: 0, y: 0 }), { åpne: [], nr: 0, fastFra: null, høvleriDag: null, fastTilbudt: 0, fastTatt: 0 }); },
  time(sim) { O.STRATEGIER.kontraktVare.time(sim); },
  døgn(sim) { morgen(sim); O.STRATEGIER.kontraktVare.døgn(sim); } });
O.leggTilDel({ id: 'firma', slutt(sim, res) { if (sim.firma) { const f = Fi.finn(sim.firma, FIRMA); res.firma = { holdning: f.holdning, levert: f.levert, fastFra: sim.firma.fastFra, høvleriDag: sim.firma.høvleriDag, tilbudt: sim.firma.fastTilbudt, tatt: sim.firma.fastTatt }; } } });

// ---------- kravene ----------
// Samarbeidet skal bety noe, men ikke velte balansen: Storlia blir fast kunde i de fleste kjøringene, og strategien ender (median dag 30)
// på nivå med «kontrakter + sag + varer» – høyst «tak» bedre (samarbeid gir litt, ikke mye). Resten av kravene (ikke blakk uten sjanse,
// over «gjør ingenting», under 200 mill.) gjelder strategien som alle de andre.
const FM = { minFast: .5, tak: 1.15, gulv: .9 };
O.leggTilKrav({ navn: 'firmaene', sjekk(RES) {
  const ut = [], L = RES.kontraktFirma || [], B = RES.kontraktVare || []; if (!L.length || !B.length) return ut;
  const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : 0; };
  const fast = L.filter(r => r.firma && r.firma.fastFra).length / L.length, hø = L.filter(r => r.firma && r.firma.høvleriDag).length / L.length;
  const snittDag = k => { const d = L.map(r => r.firma && r.firma[k]).filter(Boolean); return d.length ? (d.reduce((a, b) => a + b, 0) / d.length).toFixed(1).replace('.', ',') : '–'; };
  const tilb = L.reduce((s, r) => s + (r.firma ? r.firma.tilbudt : 0), 0), tatt = L.reduce((s, r) => s + (r.firma ? r.firma.tatt : 0), 0);
  ut.push({ ok: fast >= FM.minFast, tekst: `«kontrakter + sag + varer + fast kunde»: Storlia ble fast kunde i ${Math.round(fast * 100)} % av kjøringene (snitt dag ${snittDag('fastFra')}; minst ${Math.round(FM.minFast * 100)} %), høvleriet i ${Math.round(hø * 100)} % (snitt dag ${snittDag('høvleriDag')}); ${tatt} av ${tilb} faste tilbud tatt` });
  const a = med(L.map(r => r.slutt)), b = med(B.map(r => r.slutt));
  ut.push({ ok: a >= b * FM.gulv && a <= b * FM.tak, tekst: `med fast kunde ${O.mill(a)} mot ${O.mill(b)} uten (median dag 30; mellom ${FM.gulv} og ${FM.tak} ganger)` });
  return ut;
} });

module.exports = { FM };
