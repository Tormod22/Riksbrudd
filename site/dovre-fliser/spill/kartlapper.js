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

  function meldt(g, sx, sy) {
    const T = window.KrigSpill && KrigSpill.T && KrigSpill.T(); if (!T || !T.etter || !T.etter.length) return;
    for (const q of T.etter) { const e = ENHETER.find(s => s.navn === q.navn); if (e && synlig(e)) continue; const x = sx(q.x), y = sy(q.y); if (x < -40 || y < -40 || x > VW + 40 || y > VH + 40) continue;
      const tekst = kam.m < 40 && window.Krig && Krig.alder ? `${q.navn} · ${Krig.alder(tid - q.t)}` : null;
      g.save(); g.font = '13px "Cormorant Garamond", serif'; const w = tekst ? g.measureText(tekst).width : 0; g.restore();
      E.hinder(x - 10, y - 10, 20, 20); if (tekst) E.hinder(x - w / 2 - 3, y + 11, w + 6, 16);
      // på nytt over alle navn: samme rute og «?» som krig-visning.js, og navnet med mørk kant så det kan leses
      E.øverst(() => { g.save(); g.strokeStyle = sidefarge(q.side, 'lys') || '#b5503d'; g.fillStyle = 'rgba(20,16,10,.7)'; g.lineWidth = 2; g.setLineDash([4, 3]);
        g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 9, y); g.lineTo(x, y + 9); g.lineTo(x - 9, y); g.closePath(); g.fill(); g.stroke(); g.setLineDash([]);
        g.font = '13px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#e7dcc3'; g.fillText('?', x, y + 4);
        if (tekst) { g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.85)'; g.strokeText(tekst, x, y + 23); g.fillText(tekst, x, y + 23); } g.restore(); }); }
  }
  // 2D: merkene som skal ligge over navnene (tegnes av andre filer; her bare meldt inn)
  KROKER.tegn.push((g, vx0, vy1) => { const m = kam.m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m, S = leir();
    if (S) { const x = sx(S.leir.x), y = sy(S.leir.y); E.hinder(x - 2, y - 40, 35, 43); }
    if (window.OLJE && OLJE.BASER) for (const b of OLJE.BASER) E.hinder(sx(b.x) - 13, sy(b.y) - 10, 26, 20);
    if (m <= 6 && window.KjorSpill && KjorSpill.liste) for (const k of KjorSpill.liste()) if (k && isFinite(k.X)) E.hinder(sx(k.X) - 8, sy(k.Y) - 8, 16, 16);
    meldt(g, sx, sy); });
  window.KartLapper = { leir, baseILeiren };
})();
