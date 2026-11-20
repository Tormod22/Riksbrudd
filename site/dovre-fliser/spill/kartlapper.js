'use strict';
/* Riksbrudd – NAVNELAPPENE RUNDT LEIREN (runde 6, 19. nov – kritikken: «Leiren til Jærvernet» lå under sitt eget flagg, «o t olje»
 * under leiren, «Kari (deg)» oppå «Vaktlaget», og røvernes merke («Røvere 1,1 · 8 min siden») gjemt under egne navn under angrepet).
 * spill/etikett.js plasserer alle navn til slutt i rammen, viktigst først, og går utenom merkene som er meldt inn. Her meldes de
 * merkene inn som ikke tegnes med Merker.tegn (leirens flagg, basen, feltbilen og helikopteret, fiender som er meldt over radio),
 * og reglene for enkelte navn:
 *   - «0 t olje» under basen vises ikke (tallet betyr lite og ble lest som «o t olje»),
 *   - basens navn «Leiren til …» vises ikke når basen står i leiren (flagget og leirens navn sier det samme),
 *   - «Leiren her?» (forslaget på startskjermen) står alltid ved flagget (viktig – flyttes ikke langt bort av kartnavnene),
 *   - leirens navn er viktigere enn bygg og steder.
 * Fiender som er meldt (krig-visning.js, KrigSpill.T().etter) tegnes på nytt over alle navn, med navnet sitt.
 * Ingen regler uten DOM her utover det som står i Etikett (testet i test_etikett.js); vakten er pipeline/fliser/vakter/kart.js.
 */
(function () {
  const E = window.Etikett; if (!E || typeof KROKER === 'undefined') return;
  const P = E.REGLER.prio;
  const leir = () => { const S = window.OppstartSpill && OppstartSpill.tilstand && OppstartSpill.tilstand(); return S && S.leir ? S : null; };
  // basen står i leiren (oppstart-visning.js flytter OLJE.BASER[0] dit)
  const baseILeiren = b => { const S = leir(); return !!(S && b && Math.hypot(b.x - S.leir.x, b.y - S.leir.y) < 60); };
  E.regel(t => (t === '0 t olje' ? false : undefined));
  E.regel(t => { const b = window.OLJE && OLJE.BASER && OLJE.BASER[0]; return b && t === b.navn && baseILeiren(b) ? false : undefined; });
  E.regel(t => (t === 'Leiren her?' ? P.valgt : undefined));
  E.regel(t => { const S = leir(), n = S && S.fraksjon && S.fraksjon.navn; return n && (t === n || t.startsWith(n + ' · ')) ? P.leir : undefined; });

  // (runde 8, krig: «Kystalliansens 3. lag · nå» lå oppå «… 4. lag») merkene tegnes hver for seg, men lag som står nær hverandre på skjermen
  // får én lapp (Krig.klynger: «Kystalliansen: 2 lag · nå»), og en lapp som ville ligget oppå en annen meldt lapp, flyttes en linje ned
  function meldt(g, sx, sy) {
    const T = window.KrigSpill && KrigSpill.T && KrigSpill.T(); if (!T || !T.etter || !T.etter.length) return; const merker = [];
    for (const q of T.etter) { const e = ENHETER.find(s => s.navn === q.navn); if (!e || synlig(e)) continue; const x = sx(q.x), y = sy(q.y); if (x < -40 || y < -40 || x > VW + 40 || y > VH + 40) continue;
      merker.push({ x, y, side: q.side, navn: q.navn, t: q.t }); E.hinder(x - 10, y - 10, 20, 20);
      E.øverst(() => { g.save(); g.strokeStyle = sidefarge(q.side, 'lys') || '#b5503d'; g.fillStyle = 'rgba(20,16,10,.7)'; g.lineWidth = 2; g.setLineDash([4, 3]);
        g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 9, y); g.lineTo(x, y + 9); g.lineTo(x - 9, y); g.closePath(); g.fill(); g.stroke(); g.setLineDash([]);
        g.font = '13px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#e7dcc3'; g.fillText('?', x, y + 4); g.restore(); }); }
    if (!(kam.m < 40) || !window.Krig || !Krig.alder) return; const brukt = [];
    for (const k of (Krig.klynger ? Krig.klynger(merker) : merker.map(o => ({ ...o, n: 1 })))) {
      const tekst = Krig.klyngeTekst ? Krig.klyngeTekst(k, tid, window.Fraksjoner && Fraksjoner.FRAKSJONER[k.side] ? Fraksjoner.FRAKSJONER[k.side].navn : null) : `${k.navn} · ${Krig.alder(tid - k.t)}`;
      g.save(); g.font = '13px "Cormorant Garamond", serif'; const w = g.measureText(tekst).width; g.restore();
      let ty = k.y + 23; for (let i = 0; i < 6 && brukt.some(r => Math.abs(r.x - k.x) < (r.w + w) / 2 + 4 && Math.abs(r.y - ty) < 15); i++) ty += 15;
      brukt.push({ x: k.x, y: ty, w }); E.hinder(k.x - w / 2 - 3, ty - 12, w + 6, 16);
      E.øverst(() => { g.save(); g.font = '13px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.85)'; g.fillStyle = '#e7dcc3';
        E.skrivTekst(g, tekst, k.x, ty, false); E.skrivTekst(g, tekst, k.x, ty, true); g.restore(); }); }
  }
  // 2D: merkene som skal ligge over navnene (tegnes av andre filer; her bare meldt inn)
  KROKER.tegn.push((g, vx0, vy1) => { const m = kam.m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m, S = leir();
    if (S) { const x = sx(S.leir.x), y = sy(S.leir.y); E.hinder(x - 2, y - 40, 35, 43); }
    if (window.OLJE && OLJE.BASER) for (const b of OLJE.BASER) E.hinder(sx(b.x) - 13, sy(b.y) - 10, 26, 20);
    if (m <= 6 && window.KjorSpill && KjorSpill.liste) for (const k of KjorSpill.liste()) if (k && isFinite(k.X)) E.hinder(sx(k.X) - 8, sy(k.Y) - 8, 16, 16);
    meldt(g, sx, sy); });
  window.KartLapper = { leir, baseILeiren };
})();
