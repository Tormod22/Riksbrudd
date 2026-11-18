'use strict';
/* Riksbrudd – TEGNFORKLARING I KARTET (18. nov, runde 4, pakke «ui»). Merkene i 2D-kartet fikk ett felles sett (spill/merker.js), men
 * ingen stedet sa hva formene, fargene og strekene betyr. En liten knapp nederst blant zoomknappene (ikon med tre rader) åpner en rute
 * med eksempler tegnet med de samme funksjonene som kartet bruker: hvem (eget, fiende, nøytralt), hva (lag, kjøretøyene, tettsted, kai,
 * bygg, ukjent), og strekene og feltene (marsjrute, kjøretøyrute, sist sett, front, tettsted dere holder, inntak, siktfelt, valgt).
 * Lister og eksemplene uten DOM øverst (Tegnforklaring.RADER/tegnEksempel – test i test_merker.js); visningen under. window.Tegnforklaring (vis, lukk, erÅpen).
 * Knappen vises ikke i 3D (der gjelder ikke kartmerkene) og ikke på startskjermen.
 */
(function (rot) {
  // [gruppe, nøkkel, tekst] – nøkkelen sier hvordan eksemplet tegnes (se tegnEksempel)
  const RADER = [
    ['Hvem', 'eget', 'Eget: liggende rektangel i blått'],
    ['Hvem', 'fiende', 'Fiende: rute på spissen – rød (Kystalliansen) eller grønn (Folkefronten)'],
    ['Hvem', 'nøytral', 'Nøytralt eller ingen eier: kvadrat med runde hjørner'],
    ['Hva', 'lag', 'Lag med soldater (kryss inni)'],
    ['Hva', 'k-lastebil', 'Lastebil (kolonne) – tallet er antall biler'],
    ['Hva', 'k-stridsvogn', 'Stridsvogn'],
    ['Hva', 'k-rakettartilleri', 'Rakettartilleri'],
    ['Hva', 'k-radar', 'Radarbil'],
    ['Hva', 'k-speiderbil', 'Speiderbil'],
    ['Hva', 'tettsted', 'Tettsted som noen holder (fargen er eieren)'],
    ['Hva', 'kai', 'Kai eller havn'],
    ['Hva', 'ukjent', 'Noe lagene har meldt, men ikke sett tydelig'],
    ['Streker og felt', 'marsj', 'Marsjrute for et lag – ringen er målet'],
    ['Streker og felt', 'kjørerute', 'Kjørerute for kjøretøy (langs vegene)'],
    ['Streker og felt', 'sistsett', 'Sist sett: der en fiende var sist noen av dine så den'],
    ['Streker og felt', 'front', 'Front mellom to sider (gull: din egen front)'],
    ['Streker og felt', 'holdt', 'Tettsted som en side holder: stiplet grense i eierens farge'],
    ['Streker og felt', 'inntak', 'Ringen fylles mens et lag tar et tettsted'],
    ['Streker og felt', 'sikt', 'Siktfelt: det lyse er det lagene dine ser – fiender utenfor vises ikke'],
    ['Streker og felt', 'valgt', 'Valgt: gull kant rundt merket'],
  ];
  const farge = (side, hva) => (typeof sidefarge === 'function' ? sidefarge(side, hva) : side === 'rød' ? '#8f3c2f' : side === 'grønn' ? '#3f6a3a' : '#3f5f8f');
  // ---------- eksemplene (tegnet med det samme som kartet) ----------
  function tegnEksempel(g, n, W, H) {
    const M = rot.Merker, x = W / 2, y = H / 2; g.lineJoin = 'round'; g.lineCap = 'round';
    const bakgrunn = () => { g.fillStyle = 'rgba(46,52,36,.9)'; g.fillRect(0, 0, W, H); };
    bakgrunn();
    if (!M) return;
    if (n === 'eget') M.tegn(g, x, y, { forhold: 'eget', slag: 'lag', farge: farge('blå', 'farge'), r: 10 });
    else if (n === 'fiende') { M.tegn(g, x - 11, y, { forhold: 'fiende', slag: 'lag', farge: farge('rød', 'farge'), r: 9 }); M.tegn(g, x + 11, y, { forhold: 'fiende', slag: 'lag', farge: farge('grønn', 'farge'), r: 9 }); }
    else if (n === 'nøytral') M.tegn(g, x, y, { forhold: 'nøytral', slag: 'tettsted', farge: 'rgba(40,34,26,.85)', r: 10 });
    else if (n === 'lag') M.tegn(g, x, y, { forhold: 'eget', slag: 'lag', farge: farge('blå', 'farge'), r: 10 });
    else if (n.startsWith('k-')) M.tegn(g, x - 3, y, { forhold: 'eget', slag: 'kjøretøy', type: n.slice(2), antall: n === 'k-lastebil' ? 4 : 1, farge: '#3b5878', r: 10 });
    else if (n === 'tettsted') { M.tegn(g, x - 11, y, { forhold: 'eget', slag: 'tettsted', farge: farge('blå', 'farge'), r: 8 }); M.tegn(g, x + 11, y, { forhold: 'fiende', slag: 'tettsted', farge: farge('rød', 'farge'), r: 8 }); }
    else if (n === 'kai') M.tegn(g, x, y, { forhold: 'nøytral', slag: 'kai', farge: '#2c4458', r: 10 });
    else if (n === 'bygg') M.tegn(g, x, y, { forhold: 'eget', slag: 'bygg', farge: farge('blå', 'farge'), r: 10 });
    else if (n === 'ukjent') M.tegn(g, x, y, { forhold: 'fiende', slag: 'ukjent', farge: farge('rød', 'farge'), r: 9 });
    else if (n === 'marsj') { g.strokeStyle = farge('blå', 'sti'); g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(6, H - 7); g.quadraticCurveTo(W / 2, 4, W - 10, y); g.stroke(); g.setLineDash([]); g.strokeStyle = '#f0d79a'; g.beginPath(); g.arc(W - 10, y, 4.5, 0, 6.283); g.stroke(); }
    else if (n === 'kjørerute') { g.strokeStyle = 'rgba(130,170,220,.9)'; g.lineWidth = 2; g.setLineDash([7, 5]); g.beginPath(); g.moveTo(5, y + 6); g.lineTo(W / 2, y - 5); g.lineTo(W - 10, y); g.stroke(); g.setLineDash([]); g.strokeStyle = '#f0d79a'; g.beginPath(); g.arc(W - 10, y, 4.5, 0, 6.283); g.stroke(); }
    else if (n === 'sistsett') { M.tegn(g, x, y + 3, { forhold: 'fiende', stiplet: true, r: 8 }); g.font = 'italic 9px "Cormorant Garamond",serif'; g.fillStyle = 'rgba(231,220,195,.8)'; g.textAlign = 'center'; g.fillText('sist sett', x, 8); }
    else if (n === 'front') { g.strokeStyle = 'rgba(240,200,120,.95)'; g.lineWidth = 2.5; g.setLineDash([7, 6]); g.beginPath(); g.moveTo(4, H - 5); g.lineTo(W - 4, 5); g.stroke(); g.setLineDash([]); g.beginPath(); g.moveTo(x - 5, y - 5); g.lineTo(x + 5, y + 5); g.moveTo(x + 5, y - 5); g.lineTo(x - 5, y + 5); g.stroke(); }
    else if (n === 'holdt') { g.beginPath(); g.rect(6, 5, W - 12, H - 10); g.globalAlpha = .18; g.fillStyle = farge('blå', 'lys'); g.fill(); g.globalAlpha = 1; g.strokeStyle = farge('blå', 'sti'); g.lineWidth = 2; g.setLineDash([8, 4]); g.stroke(); g.setLineDash([]); }
    else if (n === 'inntak') { M.tegn(g, x, y, { forhold: 'nøytral', slag: 'tettsted', farge: 'rgba(40,34,26,.85)', r: 7 }); g.strokeStyle = farge('blå', 'sti'); g.lineWidth = 3; g.beginPath(); g.arc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + 6.283 * .6); g.stroke(); }
    else if (n === 'sikt') { g.fillStyle = 'rgba(8,10,6,.62)'; g.fillRect(0, 0, W, H); for (const [rr, a] of [[15, .35], [11, .5], [7, .6]]) { g.fillStyle = `rgba(120,140,90,${a})`; g.beginPath(); g.arc(x, y, rr, 0, 6.283); g.fill(); } M.tegn(g, x, y, { forhold: 'eget', slag: 'lag', farge: farge('blå', 'farge'), r: 6 }); }
    else if (n === 'valgt') M.tegn(g, x, y, { forhold: 'eget', slag: 'lag', farge: farge('blå', 'farge'), valgt: true, r: 10 });
  }

  const API = { RADER, tegnEksempel, test: false };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
  rot.Tegnforklaring = API;
  const $ = id => document.getElementById(id);
  const IKON = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round'><rect x='3' y='4' width='5' height='4'/><path d='M11 6h10'/><path d='M5.5 11l2.5 2.5-2.5 2.5-2.5-2.5z'/><path d='M11 13.5h10'/><path d='M3 20h5' stroke-dasharray='2 2'/><path d='M11 20h10'/></svg>";
  const css = document.createElement('style');
  css.textContent = `#forklarknapp{ display:flex; align-items:center; justify-content:center; color:#d9c27a; } #forklarknapp svg{ width:24px; height:24px; } #forklarknapp.på{ border-color:#e8d48a; color:#fff3c8; }
body.på3d #forklarknapp, body.foto #forklarknapp{ display:none; }
#forklaring{ position:fixed; right:64px; bottom:calc(34px + env(safe-area-inset-bottom,0px)); z-index:12; display:none; width:min(350px, calc(100vw - 84px)); max-height:calc(100% - var(--topp,58px) - 50px); overflow-y:auto; box-sizing:border-box; padding:10px 12px 12px;
  background:linear-gradient(180deg,#241c10 0,#17120a 150px); border:1px solid #8a7440; box-shadow:0 0 0 1px #0d0a06, 0 12px 34px rgba(0,0,0,.65); border-radius:4px; color:var(--ink,#e7dcc3); scrollbar-width:thin; scrollbar-color:#5a4f38 transparent; }
#forklaring.på{ display:block; animation:forklarinn .16s ease-out; } @keyframes forklarinn{ from{ opacity:0; } }
#forklaring h2{ margin:0 36px 6px 0; font-family:"IM Fell English",serif; font-weight:400; font-size:21px; letter-spacing:.03em; padding-bottom:5px; border-bottom:1px solid #5a4a2a; }
#forklaring h3{ margin:9px 0 3px; font-size:12.5px; letter-spacing:.07em; text-transform:uppercase; color:#c9b26a; font-weight:600; }
#forklaring .rad{ display:flex; align-items:center; gap:9px; padding:2px 0; font-size:14px; line-height:1.25; } #forklaring canvas{ flex:0 0 auto; width:48px; height:30px; }
#forklaring .lukk{ position:absolute; right:8px; top:8px; width:30px; height:30px; padding:0; font-size:17px; background:linear-gradient(180deg,#2a2215,#17120a); border:1px solid #5a4a2a; border-radius:3px; color:var(--ink,#e7dcc3); cursor:pointer; }
#forklaring small{ display:block; margin-top:8px; color:#a89970; font-size:12.5px; }
body.kort #forklaring{ left:calc(8px + env(safe-area-inset-left,0px)); right:calc(8px + env(safe-area-inset-right,0px)); bottom:calc(6px + env(safe-area-inset-bottom,0px)); width:auto; max-height:calc(100% - var(--topp,44px) - 16px); }
body.kort #forklaring .lukk{ width:40px; height:40px; }
@media (prefers-reduced-motion:reduce){ #forklaring.på{ animation:none; } }`;
  document.head.appendChild(css);

  // ---------- ruta og knappen ----------
  const P = document.createElement('div'); P.id = 'forklaring'; P.setAttribute('role', 'dialog'); P.setAttribute('aria-label', 'Tegnforklaring'); document.body.appendChild(P);
  let bygd = false, åpen = false;
  function bygg() { P.textContent = ''; const h = document.createElement('h2'); h.textContent = 'Tegnforklaring'; const x = document.createElement('button'); x.className = 'lukk'; x.textContent = '×'; x.setAttribute('aria-label', 'Lukk tegnforklaringen'); x.onclick = () => vis(false); P.append(h, x);
    const d = Math.min(2, window.devicePixelRatio || 1); let gr = '';
    for (const [gruppe, n, t] of RADER) { if (gruppe !== gr) { gr = gruppe; const h3 = document.createElement('h3'); h3.textContent = gruppe; P.appendChild(h3); }
      const r = document.createElement('div'); r.className = 'rad'; r.dataset.n = n; const c = document.createElement('canvas'); c.width = 48 * d; c.height = 30 * d; const g = c.getContext('2d'); g.scale(d, d); try { tegnEksempel(g, n, 48, 30); } catch (e) { /* eksemplet mangler */ }
      const s = document.createElement('span'); s.textContent = t; r.append(c, s); P.appendChild(r); }
    const sm = document.createElement('small'); sm.textContent = 'Formen sier hvem, tegnet inni sier hva, og fargen sier hvilken side. Bruer, tunneler og kraftverk vises bare når de betyr noe (☰ → Kartmerker).'; P.appendChild(sm); bygd = true; }
  function vis(på) { åpen = på === undefined ? !åpen : !!på; if (åpen && !bygd) bygg(); P.classList.toggle('på', åpen); if (knapp) { knapp.classList.toggle('på', åpen); knapp.setAttribute('aria-pressed', String(åpen)); } return åpen; }
  let knapp = null;
  function leggInn() { const ctl = document.querySelector('.ctl'); if (!ctl || $('forklarknapp')) return; knapp = document.createElement('button'); knapp.id = 'forklarknapp'; knapp.innerHTML = IKON; knapp.setAttribute('aria-label', 'Tegnforklaring: hva merkene og strekene i kartet betyr'); knapp.setAttribute('aria-pressed', 'false');
    knapp.dataset.tips = 'Tegnforklaring|Hva merkene, fargene og strekene i kartet betyr: egne, fiender og nøytrale, lag, kjøretøy, tettsteder, kaier, fronter og siktfelt.';
    knapp.onclick = e => { e.stopPropagation(); vis(); }; ctl.appendChild(knapp); }
  leggInn();
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && åpen) vis(false); });
  // i 3D gjelder ikke kartmerkene: ruta lukkes (knappen skjules med CSS via body.på3d)
  setInterval(() => { const tre = typeof på3d !== 'undefined' && på3d; if (document.body.classList.contains('på3d') !== tre) document.body.classList.toggle('på3d', tre); if (tre && åpen) vis(false); if (åpen && !P.isConnected) åpen = false; }, 500);
  Object.assign(API, { vis, lukk: () => vis(false), erÅpen: () => åpen });
})(typeof globalThis !== 'undefined' ? globalThis : this);
