'use strict';
/* Riksbrudd – OVERSIKTEN I 2D (18. nov, nattarbeid «ui»). Zoomet langt inn i kartet (bygging, nærstrid) mister du oversikten:
 * da kommer en liten rund oversikt nede til høyre (der minikartet står i 3D) med leiren, egne lag og kjøretøy, fiender du ser,
 * og en ramme for det skjermen viser. Trykk i den flytter kartet dit. Bare på PC-skjermen (body.spill), følger «Minikart» i ☰.
 * Reglene øverst er uten DOM (Minikart2d.radius/punkt – test i test_merker.js er ikke nødvendig: ren geometri, prøvd i vakta).
 * I testene (navigator.webdriver) vises den bare når Minikart2d.test = true. Tallene er Claudes forslag.
 */
(function () {
  const REGLER = { vises: 2.5, minRadius: 800, ganger: .9, px: 176 };
  // hvor langt oversikten rekker (meter fra midten): minst 800 m, ellers 0,9 ganger skjermens bredde i kartet
  const radius = (bredde, m) => Math.max(REGLER.minRadius, bredde * m * REGLER.ganger);
  // kartpunkt -> punkt i oversikten (nord opp), og tilbake
  const punkt = (x, y, cx, cy, R, px) => [px / 2 + (x - cx) / R * px / 2, px / 2 - (y - cy) / R * px / 2];
  const kart = (a, b, cx, cy, R, px) => [cx + (a - px / 2) / (px / 2) * R, cy - (b - px / 2) / (px / 2) * R];
  const API = { REGLER, radius, punkt, kart, test: false };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
  const css = document.createElement('style');
  css.textContent = `#mini2d{ position:fixed; right:64px; bottom:calc(34px + env(safe-area-inset-bottom,0px)); z-index:3; display:none; width:${REGLER.px}px; height:${REGLER.px}px; border-radius:50%; cursor:pointer; box-shadow:0 0 0 1px #0d0a06, 0 6px 18px rgba(0,0,0,.55); }
#mini2d.på{ display:block; animation:mini2dinn .25s ease-out; } @keyframes mini2dinn{ from{ opacity:0; scale:.9; } } body.foto #mini2d, body:not(.spill) #mini2d{ display:none !important; }
body.spill.mini2d #kilde{ right:${64 + REGLER.px + 12}px; } @media (prefers-reduced-motion:reduce){ #mini2d.på{ animation:none; } }`;
  document.head.appendChild(css);
  const c = document.createElement('canvas'); c.id = 'mini2d'; c.title = 'Oversikt: trykk for å flytte kartet dit'; document.body.appendChild(c);
  let tilstand = null;
  function tegn() {
    const tre = typeof på3d !== 'undefined' && på3d, S = window.OppstartSpill && OppstartSpill.tilstand && OppstartSpill.tilstand(); let av = false; try { av = localStorage.getItem('riksbrudd-minikart') === 'av'; } catch (e) { av = false; }
    const st = document.getElementById('oppstart'), vis = !tre && !av && S && S.leir && typeof kam !== 'undefined' && kam.m <= REGLER.vises && (!navigator.webdriver || API.test === true) && !(st && st.classList.contains('på')) && !(window.StrategiSpill && StrategiSpill.erÅpen && StrategiSpill.erÅpen());
    if (c.classList.contains('på') !== !!vis) { c.classList.toggle('på', !!vis); document.body.classList.toggle('mini2d', !!vis); } if (!vis) { tilstand = null; return; }
    const P = REGLER.px, d = Math.min(2, window.devicePixelRatio || 1); if (c.width !== P * d) { c.width = c.height = P * d; }
    const g = c.getContext('2d'), R = radius(VW, kam.m), cx = kam.x, cy = kam.y, p = (x, y) => punkt(x, y, cx, cy, R, P); tilstand = { cx, cy, R };
    g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, P, P); g.save(); g.beginPath(); g.arc(P / 2, P / 2, P / 2 - 1, 0, 6.283); g.clip();
    const bak = g.createRadialGradient(P / 2, P / 2, 10, P / 2, P / 2, P / 2); bak.addColorStop(0, 'rgba(46,52,36,.95)'); bak.addColorStop(1, 'rgba(22,24,16,.96)'); g.fillStyle = bak; g.fillRect(0, 0, P, P);
    // avstandsringer hver kilometer (hver 5. km når oversikten rekker langt)
    const steg = R > 6000 ? 5000 : 1000; g.strokeStyle = 'rgba(201,178,106,.16)'; g.lineWidth = 1; for (let r = steg; r < R; r += steg) { g.beginPath(); g.arc(P / 2, P / 2, r / R * P / 2, 0, 6.283); g.stroke(); }
    // tettstedene som svake flekker med navn
    if (typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) { g.font = 'italic 10.5px "Cormorant Garamond",serif'; g.textAlign = 'center';
      for (const o of INFRA.tettsted) { const x = (o.bb[0] + o.bb[2]) / 2, y = (o.bb[1] + o.bb[3]) / 2; if (Math.hypot(x - cx, y - cy) > R * 1.1) continue; const [a, b] = p(x, y), r = Math.max(4, (o.bb[2] - o.bb[0]) / 2 / R * P / 2); g.fillStyle = 'rgba(231,220,195,.13)'; g.beginPath(); g.arc(a, b, r, 0, 6.283); g.fill(); if (o.e && o.e.navn) { g.fillStyle = 'rgba(231,220,195,.6)'; g.fillText(o.e.navn, a, b - r - 2); } } }
    // det skjermen viser
    { const [a, b] = p(cx - VW * kam.m / 2, cy + VH * kam.m / 2), w = VW * kam.m / R * P / 2, h = VH * kam.m / R * P / 2; g.fillStyle = 'rgba(240,220,154,.08)'; g.fillRect(a, b, w, h); g.strokeStyle = 'rgba(240,220,154,.75)'; g.lineWidth = 1.2; g.strokeRect(a, b, w, h); }
    // leiren
    { const [a, b] = p(S.leir.x, S.leir.y); g.fillStyle = '#f0dc9a'; g.strokeStyle = '#1a140a'; g.lineWidth = 1; g.beginPath(); g.moveTo(a - 5, b + 4); g.lineTo(a - 5, b - 1); g.lineTo(a, b - 6); g.lineTo(a + 5, b - 1); g.lineTo(a + 5, b + 4); g.closePath(); g.fill(); g.stroke(); }
    // kjøretøy og lag: formen fra det felles merkesettet (spill/merker.js), lite
    const merke = (x, y, side, slag, valgtDen) => { const [a, b] = p(x, y); if (a < -6 || b < -6 || a > P + 6 || b > P + 6) return; if (window.Merker) Merker.tegn(g, a, b, { forhold: Merker.forhold(side), slag: 'tom', farge: typeof sidefarge === 'function' ? sidefarge(side, 'farge') : '#3f5f8f', r: slag === 'lag' ? 5 : 3.6, valgt: valgtDen }); else { g.fillStyle = side === 'blå' ? '#5f86c8' : '#c8553a'; g.fillRect(a - 3, b - 2, 6, 4); } };
    if (typeof KJORETOY !== 'undefined') for (const k of KJORETOY) { const side = k.side || 'blå'; if (side !== 'blå' && !(typeof synlig === 'function' && synlig(k))) continue; if (typeof k.x === 'number') merke(k.x, k.y, side, 'kjøretøy', typeof valgt !== 'undefined' && valgt === k); }
    if (typeof ENHETER !== 'undefined') for (const s of ENHETER) { if (!s.menn || !s.menn.some(q => q.hp > 0)) continue; if (s.side !== 'blå' && !(typeof synlig === 'function' && synlig(s))) continue; merke(s.x, s.y, s.side, 'lag', typeof valgt !== 'undefined' && valgt === s); }
    g.restore();
    // ramme og nord
    g.strokeStyle = '#8a7440'; g.lineWidth = 2; g.beginPath(); g.arc(P / 2, P / 2, P / 2 - 1.5, 0, 6.283); g.stroke();
    g.font = '600 12px "IM Fell English",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f0dc9a'; g.strokeStyle = 'rgba(13,10,6,.9)'; g.lineWidth = 3; g.strokeText('N', P / 2, 10); g.fillText('N', P / 2, 10);
    const km = R >= 1000 ? (R / 1000).toFixed(R < 10000 ? 1 : 0).replace('.', ',') + ' km' : Math.round(R) + ' m'; g.font = '10.5px "Cormorant Garamond",serif'; g.fillStyle = 'rgba(231,220,195,.75)'; g.strokeText('r ' + km, P / 2, P - 10); g.fillText('r ' + km, P / 2, P - 10);
  }
  c.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); if (!tilstand) return; const r = c.getBoundingClientRect(), [x, y] = kart((e.clientX - r.left) / r.width * REGLER.px, (e.clientY - r.top) / r.height * REGLER.px, tilstand.cx, tilstand.cy, tilstand.R, REGLER.px); kam.x = x; kam.y = y; skitten = true; setTimeout(tegn, 30); });
  setInterval(tegn, 500); window.addEventListener('resize', tegn);
  API.tegn = tegn; API.vises = () => c.classList.contains('på'); API.tilstand = () => tilstand; window.Minikart2d = API;
})();
