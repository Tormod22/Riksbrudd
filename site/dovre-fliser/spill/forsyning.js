/* S4 – forsyning: regler uten DOM (Node: require('./forsyning'); nettleser: globalThis.Forsyning).
 * Lag har ammunisjon (0–1), kjøretøy drivstoff (0–1). Begge fylles av olje (tonn) på basen eller fra en lastebil med forsyninger.
 * Tallene er spillverdier (forslag), ikke fasit: spør brukeren før de endres mye.
 */
(function (rot) {
  'use strict';
  const REGLER = {
    ammo: { perRunde: .02, svak: .25, vekt: .5 },   // 2 % per ildrunde (ca. 4 timer sammenhengende ildkamp); under 25 % treffer laget sjeldnere; full last = 0,5 t
    drivstoff: { lastebil: { tank: .35, km: 900 }, speiderbil: { tank: .12, km: 600 } },   // tonn per kjøretøy og rekkevidde på full tank
    baseRadius: 400, leverRadius: 500,   // meter: påfyll på basen og levering fra lastebil
    lastetid: 1800, leveringstid: 900, forsyningslast: 10,   // sekunder; tonn en lastebil tar med fra basen per tur (høyst)
  };
  const ammo = s => s.ammo === undefined ? 1 : s.ammo, drivstoff = k => k.drivstoff === undefined ? 1 : k.drivstoff;
  // Treffaktor for et lag som skyter (0–1) – og bruker ammunisjon for runden når det skyter.
  function skyt(s) {
    const a = ammo(s), f = a <= 0 ? 0 : a >= REGLER.ammo.svak ? 1 : a / REGLER.ammo.svak;
    if (f > 0) s.ammo = Math.max(0, a - REGLER.ammo.perRunde);
    return f;
  }
  // Kjøring: trekker drivstoff for meter kjørt. Gir true når tanken ble tom nå.
  function kjør(k, meter) {
    const d = REGLER.drivstoff[k.type]; if (!d || !(meter > 0)) return false;
    const før = drivstoff(k); k.drivstoff = Math.max(0, før - meter / 1000 / d.km); return før > 0 && k.drivstoff === 0;
  }
  const behovLag = s => (1 - ammo(s)) * REGLER.ammo.vekt;
  const behovKj = k => { const d = REGLER.drivstoff[k.type]; return d ? (1 - drivstoff(k)) * d.tank * k.antall : 0; };
  // Fyller opp så langt tonnene rekker. Gir tonn brukt.
  function fyll(enhet, tonn, erLag) {
    const behov = erLag ? behovLag(enhet) : behovKj(enhet); if (behov <= 1e-9 || tonn <= 0) return 0;
    const brukt = Math.min(behov, tonn), andel = brukt / behov;
    if (erLag) enhet.ammo = ammo(enhet) + (1 - ammo(enhet)) * andel; else enhet.drivstoff = drivstoff(enhet) + (1 - drivstoff(enhet)) * andel;
    return brukt;
  }
  // Leverer til alle egne enheter innen leverRadius fra (x, y). lag/kjøretøy: lister. Gir tonn brukt og hvem som fikk.
  function lever(x, y, tonn, lag, kjoretoy, side = 'blå') {
    let brukt = 0; const fikk = [];
    const nær = e => e.side === side && Math.hypot(e.x - x, e.y - y) <= REGLER.leverRadius;
    for (const s of lag) if (nær(s)) { const b = fyll(s, tonn - brukt, true); if (b > 0) { brukt += b; fikk.push(s); } }
    for (const k of kjoretoy) if (nær(k)) { const b = fyll(k, tonn - brukt, false); if (b > 0) { brukt += b; fikk.push(k); } }
    return { brukt, fikk };
  }
  // Oppdrag for en lastebilkolonne: (til basen og) last forsyninger, kjør til målet, lever. K = Kjoretoy, b = basen.
  function forsyn(kj, graf, b, mål, K) {
    if (!kj.antall || kj.type !== 'lastebil') return { feil: 'Bare lastebiler kan frakte forsyninger.' };
    const vedBase = Math.hypot(kj.x - b.x, kj.y - b.y) <= REGLER.baseRadius, harLast = (kj.forsyning || 0) >= 1;
    kj.oppdrag = { type: 'forsyning', base: b, mål: { x: mål.x, y: mål.y, navn: mål.navn }, fase: harLast ? 'til mål' : vedBase ? 'laster' : 'til base', igjen: vedBase && !harLast ? REGLER.lastetid : 0 };
    if (kj.oppdrag.fase === 'til base' || kj.oppdrag.fase === 'til mål') {
      const m = kj.oppdrag.fase === 'til base' ? [b.x, b.y] : [mål.x, mål.y], r = K.planlegg(kj, graf, m);
      if (r.feil) { kj.oppdrag = null; return r; } return r;
    }
    return { meter: 0, sekunder: REGLER.lastetid };
  }
  // Ett steg for et forsyningsoppdrag. Gir hendelser: { hva: 'lastet', tonn } | { hva: 'framme', x, y } | { hva: 'feil', melding }.
  function steg(kj, graf, sek, K) {
    const o = kj.oppdrag, hend = []; if (!o || o.type !== 'forsyning') return hend;
    while (sek > 0 && kj.oppdrag) {
      if (o.fase === 'til base' || o.fase === 'til mål') {
        if (!kj.sti) { neste(); continue; }
        const før = K.tidIgjen(kj), framme = K.steg(kj, sek); sek = framme ? Math.max(0, sek - før) : 0; if (framme) neste();
      } else { const d = Math.min(sek, o.igjen); o.igjen -= d; sek -= d; if (o.igjen <= 0) neste(); }
    }
    return hend;
    function neste() {
      if (o.fase === 'til base') { o.fase = 'laster'; o.igjen = REGLER.lastetid; }
      else if (o.fase === 'laster') {
        const t = Math.min(REGLER.forsyningslast, o.base.beholdning); o.base.beholdning -= t; kj.forsyning = (kj.forsyning || 0) + t; hend.push({ hva: 'lastet', tonn: t });
        const r = K.planlegg(kj, graf, [o.mål.x, o.mål.y]); if (r.feil) { hend.push({ hva: 'feil', melding: r.feil }); kj.oppdrag = null; return; }
        o.fase = 'til mål';
      } else if (o.fase === 'til mål') { o.fase = 'leverer'; o.igjen = REGLER.leveringstid; }
      else if (o.fase === 'leverer') { hend.push({ hva: 'framme', x: kj.x, y: kj.y }); kj.oppdrag = null; }
    }
  }
  function tekst(kj) {
    const o = kj.oppdrag; if (!o || o.type !== 'forsyning') return null;
    return { 'til base': 'henter forsyninger på ' + o.base.navn, laster: 'laster forsyninger', 'til mål': 'kjører forsyninger' + (o.mål.navn ? ' til ' + o.mål.navn : ''), leverer: 'leverer forsyninger' }[o.fase];
  }
  const api = { REGLER, ammo, drivstoff, skyt, kjør, behovLag, behovKj, fyll, lever, forsyn, steg, tekst };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Forsyning = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
