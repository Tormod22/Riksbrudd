'use strict';
// S4 i kartet: ammunisjon for lagene og drivstoff for kjøretøyene (spill/forsyning.js), påfyll på basen og «Forsyn …» med lastebil.
// Bruker basen fra okonomi-visning.js (OLJE.BASER[0]) og krokene KROKER.ild / KROKER.lagTekst / KJ_PANEL / KJ_TEKST.
(function () {
  const R = Forsyning.REGLER, meldt = new WeakSet(), forrige = new WeakMap();
  let forsynModus = null, sistBase = 0;
  const base = () => OLJE.BASER[0];
  const pst = v => Math.round(100 * v) + ' %';

  // Ildkamp: treffkraften følger ammunisjonen; tomt lag meldes én gang.
  KROKER.ild.push(a => {
    const f = Forsyning.skyt(a);
    if (Forsyning.ammo(a) <= 0 && a.side === 'blå' && !meldt.has(a)) { meldt.add(a); logg(a.navn + ' er tom for ammunisjon. Send forsyninger med lastebil, eller trekk laget tilbake til basen.'); }
    if (Forsyning.ammo(a) > 0) meldt.delete(a);
    return f;
  });
  KROKER.lagTekst.push(s => 'ammunisjon ' + pst(Forsyning.ammo(s)) + (Forsyning.ammo(s) < R.ammo.svak ? ' (lite)' : ''));
  KJ_TEKST.push(k => {
    const d = R.drivstoff[k.type] ? 'drivstoff ' + pst(Forsyning.drivstoff(k)) : null, f = k.forsyning >= .05 ? Math.round(k.forsyning * 10) / 10 + ' t forsyninger' : null;
    return [Forsyning.tekst(k), d, f].filter(Boolean).join(' · ') || null;
  });
  KJ_PANEL.push((k, H) => {
    if (k.type !== 'lastebil' || k.oppdrag) return;
    H.appendChild(knapp(forsynModus === k ? 'Velg hvem som skal forsynes …' : 'Forsyn …', forsynModus === k, () => {
      forsynModus = forsynModus === k ? null : k; if (forsynModus) { lastVegnett(); logg('Trykk på et lag eller kjøretøy som trenger ammunisjon eller drivstoff.'); } visKjoretoy(k); }));
  });

  // Trykk: velg mottaker når «Forsyn …» er på (før alt annet).
  KROKER.trykk.unshift((X, Y) => {
    if (!forsynModus) return false;
    const k = forsynModus; forsynModus = null; let best = null, bd = 40;
    for (const e of [...ENHETER, ...KJORETOY]) { if (e === k || e.side !== 'blå') continue; const d = Math.hypot(e.x - X, e.y - Y) / kam.m; if (d < bd) { bd = d; best = e; } }
    if (!best) { logg('Fant ingen egen enhet der. Trykk «Forsyn …» igjen og trykk på enheten.'); visKjoretoy(k); return true; }
    lastVegnett().then(g => { const r = Forsyning.forsyn(k, g, base(), best, Kjoretoy);
      logg(r.feil ? k.navn + ': ' + r.feil : `${k.navn} kjører forsyninger til ${best.navn}${k.oppdrag && k.oppdrag.fase !== 'til mål' ? ' (henter først på basen)' : ''}.`);
      visKjoretoy(k); skitten = true; }).catch(() => {});
    return true;
  });

  KROKER.sim.push(dt => {
    const sek = dt * 3600 / TIME;
    for (const k of KJORETOY) {
      // forsyningsoppdragene
      if (k.oppdrag && k.oppdrag.type === 'forsyning') for (const h of Forsyning.steg(k, window.VEGNETT, sek, Kjoretoy)) {
        if (h.hva === 'lastet') logg(`${k.navn} laster ${Math.round(h.tonn * 10) / 10} t forsyninger på ${base().navn}.`);
        if (h.hva === 'feil') logg(k.navn + ': ' + h.melding);
        if (h.hva === 'framme') { const r = Forsyning.lever(h.x, h.y, k.forsyning || 0, ENHETER, KJORETOY.filter(e => e !== k)); k.forsyning = (k.forsyning || 0) - r.brukt;
          logg(r.fikk.length ? `${k.navn} har forsynt ${r.fikk.map(e => e.navn).join(', ')} (${Math.round(r.brukt * 10) / 10} t).` : `${k.navn} er framme, men ingen i nærheten trengte forsyninger.`); }
      }
      // drivstoff: det kjøretøyet har flyttet seg siden forrige steg
      const p = forrige.get(k);
      if (p && (k.sti || (k.oppdrag && k.oppdrag.fase && k.oppdrag.fase.startsWith('til')))) {
        if (Forsyning.kjør(k, Math.hypot(k.x - p[0], k.y - p[1]))) { Kjoretoy.stopp(k); k.oppdrag = null; logg(k.navn + ' er tom for drivstoff og står. Send en lastebil med forsyninger.'); if (valgtKjoretoy() === k) visKjoretoy(k); }
      }
      if (Forsyning.drivstoff(k) <= 0 && k.sti) { Kjoretoy.stopp(k); k.oppdrag = null; }   // tom tank: kan ikke kjøre
      forrige.set(k, [k.x, k.y]);
    }
    // påfyll på basen: enheter som står i ro nær basen
    if (performance.now() - sistBase > 500) { sistBase = performance.now(); const b = base(); if (!b) return;
      for (const e of [...ENHETER, ...KJORETOY]) {
        if (e.side !== 'blå' || e.sti || (e.oppdrag && e.oppdrag.type) || Math.hypot(e.x - b.x, e.y - b.y) > R.baseRadius) continue;
        const erLag = !!e.menn, behov = erLag ? Forsyning.behovLag(e) : Forsyning.behovKj(e); if (behov < .01 || b.beholdning <= 0) continue;
        const brukt = Forsyning.fyll(e, b.beholdning, erLag); b.beholdning -= brukt;
        if (brukt > 0) logg(`${e.navn} fikk ${erLag ? 'ammunisjon' : 'drivstoff'} på ${b.navn} (${Math.round(brukt * 100) / 100} t olje).`);
      } }
  });
})();
