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
  // (runde 13) leirens navn plasseres før egne lag og samlelappen «Leiren: 3 lag ›» (som står under det)
  E.regel(t => { const S = leir(), n = S && S.fraksjon && S.fraksjon.navn; return n && (t === n || t.startsWith(n + ' · ')) ? Math.max(P.leir, P.egne + .1) : undefined; });

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
  // (runde 13, kritikk G: «Speidertropp 1», «Gunn Kritiker (deg)» og «1. lastebilkolonne» skrev navnene oppå hverandre ved leiren, og
  // i 3D sto «Gunn Kritiker (deg) +2») egne lag og kjøretøy ved leiren får én lapp under leirens navn: «Leiren: 3 lag, 1 kjøretøy ›».
  // Trykk på lappen zoomer inn på leiren, der hvert lag har sitt navn. Det valgte laget har alltid sitt eget navn.
  // Claudes forslag: samles fra 1,6 m per punkt (der hvert lag blir ett merke) til NAVN_UTE (14; lenger ute står tallet bak leirens navn
  // som før); trykket zoomer til 1,2 m per punkt
  // (runde 14, kritikk I – fasiten sa «ca. 300 m») Claudes forslag: «ved leiren» = innen 450 m (r) fra flagget, målt i kartet. Ikke 300 m:
  // startlagene (Vaktlaget) settes 380 m fra flagget (oppstart-visning.js), og de står i leiren – med 300 m ble Vaktlaget «1 lag ute»
  const SAMLE = { fra: 1.6, inn: 1.2, luft: 8, r: 450 };
  const kjøretøyListe = () => (typeof KJORETOY !== 'undefined' ? KJORETOY : window.KJORETOY) || [];
  const lever = e => typeof levende !== 'function' || levende(e);
  const vedLeiren = (x, y) => { const S = leir(); return !!(S && isFinite(x) && isFinite(y) && Math.hypot(x - S.leir.x, y - S.leir.y) <= SAMLE.r); };
  // (runde 14) navnet t hører til karakteren ('deg'), et lag eller et kjøretøy som står ved leiren – ellers null (navnet står for seg)
  const hvem = t => { const v = typeof valgt !== 'undefined' ? valgt : null;
    const e = ENHETER.find(e => e.navn === t && e.side === 'blå' && e !== v && lever(e));
    if (e) return vedLeiren(e.x, e.y) ? (e.karakter ? 'deg' : 'lag') : null;
    const k = kjøretøyListe().find(k => k && k.navn === t && k.side === 'blå' && k !== v);
    if (k) return vedLeiren(k.x != null ? k.x : k.X, k.y != null ? k.y : k.Y) ? 'kjøretøy' : null; return null; };
  // (runde 14, kritikk I) tallene i lappen regnes av spillet, ikke av navnene som ble skjult: alle egne lag innen SAMLE.r (også det valgte),
  // uten karakteren; «deg» når karakteren er der; kjøretøyene innen SAMLE.r; og egne lag lenger unna = «ute»
  function telling() { const n = { lag: 0, deg: 0, kjøretøy: 0, ute: 0 }; if (!leir()) return n;
    for (const e of ENHETER) { if (!e || e.side !== 'blå' || !lever(e)) continue; const ved = vedLeiren(e.x, e.y);
      if (e.karakter) { if (ved) n.deg = 1; } else if (ved) n.lag++; else n.ute++; }
    for (const k of kjøretøyListe()) if (k && k.side === 'blå' && vedLeiren(k.x != null ? k.x : k.X, k.y != null ? k.y : k.Y)) n.kjøretøy++;
    return n; }
  const ute = typeof NAVN_UTE !== 'undefined' ? NAVN_UTE : 14;
  KROKER.tegn.push((g, vx0, vy1) => { const m = kam.m, S = leir(); if (!S || !E.samleSted || m < SAMLE.fra || m > ute) return;
    E.samleSted({ x: (S.leir.x - vx0) / m, y: (vy1 - S.leir.y) / m, hvem, r: Infinity, tekst: () => E.samleTekst(telling()) }); });
  if (KROKER.tegn3d) KROKER.tegn3d.push((g, proj, mPer) => { const S = leir(); if (!S || !E.samleSted) return; const p = proj(S.leir.x, S.leir.y); if (!p) return;
    const m = mPer(S.leir.x, S.leir.y); if (!(m >= SAMLE.fra)) return;
    E.samleSted({ x: p[0], y: p[1], hvem, r: Infinity, tekst: () => E.samleTekst(telling()).replace(' ›', '') }); });
  // trykk på «Leiren: 3 lag ›» (før de andre trykkene: lappen ligger over merkene)
  // legges først i lista når alle skriptene er lastet (andre moduler legger seg også først); plasseringen av et bygg går likevel foran
  const samleTrykk = (X, Y, cx, cy) => { const s = E.samling && E.samling(); if (!s || typeof på3d !== 'undefined' && på3d) return false;
    if (window.LeirSpill && LeirSpill.plassering && LeirSpill.plassering()) return false;
    if (typeof cx !== 'number') { cx = VW / 2 + (X - kam.x) / kam.m; cy = VH / 2 - (Y - kam.y) / kam.m; }
    const r = s.ramme, l = SAMLE.luft; if (cx < r[0] - l || cx > r[0] + r[2] + l || cy < r[1] - l || cy > r[1] + r[3] + l) return false;
    const S = leir(); if (!S) return false; kam.x = S.leir.x; kam.y = S.leir.y; kam.m = Math.min(kam.m, SAMLE.inn); skitten = true; return true; };
  const førstSamle = () => KROKER.trykk.unshift(samleTrykk);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(førstSamle, 0)); else setTimeout(førstSamle, 0);
  window.KartLapper = { leir, baseILeiren, hvem, telling, SAMLE };
})();
