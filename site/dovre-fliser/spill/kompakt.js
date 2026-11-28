'use strict';
// KOMPAKT SKJERM (12. nov, brukeren med skjermbilde fra iPhone på tvers: «Dette er ikke god nok UI»). På lave skjermer (under 560 px høyde,
// f.eks. telefon liggende) ble statuslinja to rader, knapperaden og minikartet tok halve bildet, minikartet lå oppå Huk/Hopp og
// kildeteksten dekket nederste tredjedel. body.kort gir da:
//  - én tynn rad øverst: status (kort, uten «lastet»), knapper i mindre størrelse, fartsknappene som én knapp som blar 1× → 10× → 60× → 600× → 1×;
//  - minikartet lite oppe til høyre under knappene, loggen oppe til venstre, zoomknappene små nede til høyre, Huk/Hopp ved siden av dem;
//  - kildeteksten som én kort linje «Kilder ⓘ» (trykk viser hele);
//  - avstand til kanten der telefonen har kamera/avrundede hjørner (env(safe-area-inset-*));
//  - ☰-menyen og panelene kan rulles når de er høyere enn skjermen.
// For alle skjermer: navn og merker i 3D tegnes ikke oppe under knappene og kompasset (UI_TOPP3D, brukt i tegn3d).
(function () {
  const css = document.createElement('style');
  const L = 'env(safe-area-inset-left,0px)', Rt = 'env(safe-area-inset-right,0px)', B = 'env(safe-area-inset-bottom,0px)', T = 'env(safe-area-inset-top,0px)';
  css.textContent = `
body.kort .top{ top:calc(5px + ${T}); left:calc(6px + ${L}); right:calc(6px + ${Rt}); flex-wrap:nowrap; gap:6px; align-items:flex-start; }
body.kort .stats{ flex:1 1 auto; min-width:0; flex-wrap:nowrap; overflow-x:auto; overflow-y:hidden; scrollbar-width:none; touch-action:pan-x; padding:3px 9px; gap:0 11px; mask-image:linear-gradient(90deg,#000 calc(100% - 18px),transparent); -webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 18px),transparent); }
body.kort .stats b{ font-size:14.5px; } body.kort .stats span{ font-size:11.5px; }
body.kort .stats > div:first-child{ order:-2; } body.kort .stats > div.viktig{ order:-1; }
body.kort .stats .ikke-kort, body.kort #sAar{ display:none; } body.kort .stats::-webkit-scrollbar{ display:none; }
body.kort .knapper{ flex:none; flex-wrap:nowrap; gap:3px; }
body.kort .knapper button{ height:31px; min-width:31px; padding:0 7px; font-size:13.5px; }
body.kort .knapper #sp1:not(.på):not(.sist), body.kort .knapper #sp2:not(.på):not(.sist), body.kort .knapper #sp3:not(.på):not(.sist), body.kort .knapper #sp4:not(.på):not(.sist){ display:none; }
body.kort .knapper .sist{ opacity:.6; }
body.kort #kompass{ top:calc(var(--topp,44px) + 3px); }
body.kort #minikart{ right:calc(8px + ${Rt}); left:auto; top:calc(var(--topp,44px) + 8px); bottom:auto; width:104px; height:104px; }
body.kort #minikart button{ width:26px; height:26px; right:-5px; top:-5px; font-size:11px; }
body.kort #logg{ left:calc(10px + ${L}); right:auto; top:calc(var(--topp,44px) + 8px); width:min(300px,34vw); font-size:12px; line-height:1.3; }
body.kort.kompass3d #logg{ top:calc(var(--topp,44px) + 62px); }
body.kort #logg div:nth-child(n+4){ display:none; }
body.kort #logg div{ display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:3; overflow:hidden; }
body.kort .ctl{ right:calc(8px + ${Rt}); bottom:calc(8px + ${B}); gap:4px; }
body.kort .ctl button{ width:36px; height:36px; font-size:17px; }
body.kort #gangeknapper{ right:calc(54px + ${Rt}); bottom:calc(10px + ${B}); gap:8px; }
body.kort #gangeknapper button{ width:54px; height:54px; font-size:13.5px; }
body.kort #kilde{ left:calc(10px + ${L}); right:auto; bottom:calc(4px + ${B}); max-width:46vw; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:auto; cursor:pointer; }
body.kort #kilde.åpen{ white-space:normal; max-width:none; right:calc(56px + ${Rt}); background:var(--panel); border:1px solid var(--rule); padding:6px 9px; z-index:8; }
body.kort #skala{ left:calc(12px + ${L}); bottom:calc(22px + ${B}); } body.kort #nordpil{ left:calc(12px + ${L}); bottom:calc(46px + ${B}); width:40px; height:40px; }
/* stående telefon: statuslinja på én rad over hele bredden, knappene på én rad under; minikartet og loggen under kompasset */
body.kort.smal .top{ flex-wrap:wrap; justify-content:flex-end; }
body.kort.smal .stats{ flex:1 1 100%; }
body.kort.smal .knapper button{ padding:0 6px; min-width:30px; }
body.kort.smal.kompass3d #minikart{ top:calc(var(--topp,44px) + 62px); }
body.kort.smal #logg{ width:calc(100% - 140px - ${L}); }
body.kort.smal #kilde{ max-width:44vw; }
body.kort #lagmeny{ right:calc(8px + ${Rt}); top:calc(var(--topp,44px) + 4px); max-height:calc(100% - var(--topp,44px) - 12px); overflow:auto; z-index:9; }
body.kort #lagmeny button{ height:32px; font-size:14px; }
body.kort #panel{ left:calc(8px + ${L}); bottom:calc(6px + ${B}); }
body.kort #leirmeny{ top:calc(var(--topp,44px) + 4px); bottom:calc(6px + ${B}); left:calc(8px + ${L}); }
`;
  document.head.appendChild(css);

  const sjekk = () => { const smal = window.innerWidth < 700; document.body.classList.toggle('kort', window.innerHeight < 560 || smal); document.body.classList.toggle('smal', smal); };
  sjekk(); window.addEventListener('resize', sjekk); window.addEventListener('orientationchange', () => setTimeout(sjekk, 300));

  // statusfelt som ikke trengs på en lav skjerm: hvor mye som er lastet
  const kb = document.getElementById('sKB'); if (kb && kb.parentElement) kb.parentElement.classList.add('ikke-kort');

  // fartsknappene: på en lav skjerm vises bare den valgte, og et trykk går videre til neste (1× → 10× → 60× → 600× → 1×)
  const fart = ['sp1', 'sp2', 'sp3', 'sp4'].map(id => document.getElementById(id)).filter(Boolean); let blar = false;
  fart.forEach((b, i) => b.addEventListener('click', e => {
    // RUNDE 14 (kritiker I: farten gikk fra 1× til 10× av seg selv rett etter at en tropp ble laget): bare et ekte trykk blar videre –
    // når et skript trykker på farten som alt er valgt (f.eks. «sett 1×» etter en pause), blir farten stående
    if (!e.isTrusted) return;
    if (blar || !document.body.classList.contains('kort') || !b.classList.contains('på')) return;
    e.stopImmediatePropagation(); blar = true; fart[(i + 1) % fart.length].click(); blar = false;
  }, true));

  // kildeteksten: én kort linje, trykk viser alt
  const kilde = document.getElementById('kilde');
  if (kilde) { kilde.title = 'Kilder – trykk for å vise alle'; kilde.addEventListener('click', () => kilde.classList.toggle('åpen')); }

  // navn i 3D tegnes ikke under knappene og kompasset øverst
  setInterval(() => {
    const k = document.getElementById('kompass'), t = document.querySelector('.top');
    let y = t ? t.getBoundingClientRect().bottom : 0;
    if (k && k.classList.contains('på')) y = Math.max(y, k.getBoundingClientRect().bottom);
    window.UI_TOPP3D = Math.round(y + 2);
  }, 400);
  window.Kompakt = { sjekk: () => ({ kort: document.body.classList.contains('kort'), topp: window.UI_TOPP3D || 0 }) };

  // ================= TELEFON: PANELENE (kritikerløkka 26. nov, runde 1, Jonas Bakke på 390 × 844 med berøring) =================
  // 1. «Ta kontrakten» lå under bunnmenyen (Leir/Folk/Tropper …), og trykket åpnet Tropper oppå Selskapet. Selskapet og noen andre
  //    paneler var ikke med i lista over paneler som slutter over bunnmenyen (Skjermlag.LØFT) – nå er de det.
  // 2. På telefon er bare ett av de store panelene åpent om gangen: åpner du et nytt, lukkes det gamle (med sin egen lukkeknapp).
  // 3. Panelene er ugjennomsiktige (teksten bak skinte gjennom) og lavere, og mens du velger mål på kartet (Marsjer, Kjør dit,
  //    Kjør til …) er de borte, så du ser kartet. En stripe øverst sier hva du gjør, med «Avbryt». Neste-lappen viker for panelene.
  // Alt gjelder spilleren på telefon (body.kort); i testene (navigator.webdriver) bare når Kompakt.test = true. Tallene er Claudes forslag.
  const REGLER = { panelHøyde: '44vh', hver: 150, lappLuft: 6 };
  const aktiv = () => !navigator.webdriver || window.Kompakt.test === true;
  // spill/paneler.js holder alt annet til ett panel om gangen på telefon; Selskapet var ikke med der (det lå oppå Tropper og omvendt)
  const ENE = ['selskap'], ANDRE = () => (window.Paneler && Paneler.PLASS ? [...Paneler.PLASS.venstre, ...Paneler.PLASS.høyre].filter(id => !ENE.includes(id)) : ['leirmeny', 'folkmeny', 'tropppanel', 'karakterark', 'krig', 'region', 'panel']);
  const LØFT_TIL = ['selskap', 'funnpanel', 'lapppanel', 'logghel', 'lagremeny', 'ressursvalg', 'gaavalg'];
  const SKJUL_VED_MÅL = ['panel', 'selskap', 'tropppanel', 'leirmeny', 'folkmeny', 'karakterark', 'degmeny', 'krig', 'region', 'samfunnmeny', 'verdenpanel', 'sjopanel', 'krigpanel', 'flytgruppe', 'stridpanel', 'sekk', 'nestelapp', 'flismerliste', 'mkommer'];
  const css2 = document.createElement('style');
  css2.textContent = `
body.kort.tlfaktiv{ --panel:#16120c; }
body.kort.smal.tlfaktiv #panel{ max-height:${REGLER.panelHøyde}; background:#16120c; }
body.kort.tlfaktiv :is(#tropppanel, #selskap, #leirmeny, #folkmeny, #degmeny, #karakterark){ background-color:#16120c; }
body.kort.tlfaktiv.målvalg :is(${SKJUL_VED_MÅL.map(id => '#' + id).join(', ')}){ display:none; }
body.kort.tlfaktiv.tlfpanel #nestelapp{ display:none; }
#maalstripe{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 8px); z-index:12; display:none; box-sizing:border-box; width:max-content;
  max-width:calc(100vw - 16px); padding:6px 8px 6px 12px; gap:10px; align-items:center; background:#1c170f; border:1px solid #c9b26a; border-radius:3px;
  color:#f0e2b0; font-size:14.5px; line-height:1.25; box-shadow:0 4px 14px rgba(0,0,0,.55); }
#maalstripe.på{ display:flex; } #maalstripe button{ flex:none; min-height:40px; min-width:72px; padding:2px 12px; background:#2a2318; border:1px solid #5b5140; color:inherit; font:inherit; border-radius:3px; }`;
  document.head.appendChild(css2);
  const stripe = document.createElement('div'); stripe.id = 'maalstripe'; stripe.setAttribute('role', 'status');
  const sTekst = document.createElement('span'), avbryt = document.createElement('button'); avbryt.textContent = 'Avbryt'; stripe.append(sTekst, avbryt); document.body.appendChild(stripe);
  avbryt.onclick = e => { e.stopPropagation(); try { if (window.FlytSpill && FlytSpill.køModus) FlytSpill.køModus(false); modus = null; if (window.avbrytKjørModus) avbrytKjørModus(); visPanel(); skitten = true; } catch (x) { /* før spillet */ } };
  const $ = id => document.getElementById(id), vises = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  // lukk et panel slik spill/paneler.js gjør det (eierens egen knapp), ellers med lukkeknappen (×) i panelet
  function lukk(id) { const e = $(id); if (!e) return;
    if (id === 'leirmeny') { if ($('leirknapp')) $('leirknapp').click(); return; }
    if (id === 'krig') { if (window.StrategiSpill && StrategiSpill.erÅpen && StrategiSpill.erÅpen() && $('krigknapp')) $('krigknapp').click(); return; }
    if (id === 'flytgruppe') { if (window.FlytSpill && FlytSpill.velg) FlytSpill.velg([]); return; }
    if (id === 'panel') { if (window.lukkPanel) lukkPanel(); return; }
    if (id === 'stridpanel') { if (window.StridSpill && StridSpill.lukk) StridSpill.lukk(); else e.classList.remove('på'); return; }
    const b = e.querySelector('.lukk, button[aria-label^="Lukk"], button[title^="Lukk"]') || [...e.querySelectorAll('button')].find(q => /^[×✕✖]$/.test(q.textContent.trim()));
    if (b) b.click(); else e.classList.remove('på'); }
  function målTekst() { try {
      if (window.kjørModusPå && kjørModusPå()) return 'Trykk på kartet der kjøretøyet skal kjøre.';
      const g = window.FlytSpill && FlytSpill.gruppe ? FlytSpill.gruppe() : []; if (g.length > 1) return `Trykk på kartet der de ${g.length} lagene skal gå.`;
      if (valgt && valgt.ombord) return `Trykk på kartet der ${valgt.ombord.navn} skal kjøre.`;
      return valgt ? `Trykk på kartet der ${valgt.navn} skal gå.` : 'Trykk på kartet for å velge mål.'; } catch (x) { return 'Trykk på kartet for å velge mål.'; } }
  let forrige = new Set(), sistTekst = '';
  setInterval(() => { try {
    const B = document.body, på = aktiv() && B.classList.contains('kort');
    if (B.classList.contains('tlfaktiv') !== på) B.classList.toggle('tlfaktiv', på);
    if (window.Skjermlag) { for (const id of LØFT_TIL) if (Skjermlag.LØFT && !Skjermlag.LØFT.includes(id)) Skjermlag.LØFT.push(id); if (Skjermlag.SELV && !Skjermlag.SELV.includes('selskap')) Skjermlag.SELV.push('selskap'); }
    const mv = på && typeof velgerMål === 'function' && velgerMål();
    if (B.classList.contains('målvalg') !== mv) B.classList.toggle('målvalg', mv);
    const mvb = $('marsjvalg'), stripePå = mv && !(mvb && mvb.classList.contains('på'));
    if (stripePå) { const t = målTekst(); if (t !== sistTekst) { sTekst.textContent = t; sistTekst = t; } }
    if (stripe.classList.contains('på') !== stripePå) stripe.classList.toggle('på', stripePå);
    if (!på) { forrige = new Set(); if (B.classList.contains('tlfpanel')) B.classList.remove('tlfpanel'); return; }
    if (mv) return;   // panelene er skjult mens du velger mål: ingen skal lukkes av det
    const alle = [...ENE, ...ANDRE()], åpne = alle.filter(id => vises($(id))), nye = åpne.filter(id => !forrige.has(id));
    if (nye.length && åpne.length > 1) { const ny = nye[nye.length - 1];
      if (ENE.includes(ny)) { for (const id of åpne) if (id !== ny) lukk(id); } else for (const id of ENE) if (åpne.includes(id)) lukk(id); }
    forrige = new Set(alle.filter(id => vises($(id))));
    const tp = forrige.size > 0; if (B.classList.contains('tlfpanel') !== tp) B.classList.toggle('tlfpanel', tp);
  } catch (x) { /* neste runde */ } }, REGLER.hver);
  // NAVN I KANTEN (kritikerløkka 26. nov, Jonas: «Speidertropp 1» og «Kontrakt: Her…» ble kuttet i høyre kant på telefon): navnene som
  // plasseres av spill/etikett.js, skyves inn så hele navnet står på skjermen (luft: Claudes forslag). Gjelder alle skjermer.
  const KANT = 4;
  function klampNavn() { const E = window.Etikett; if (!E || !E.tekst || E.tekst.__klamp) return !!(E && E.tekst && E.tekst.__klamp);
    const orig = E.tekst;
    const ny = function (g, t, x, y, retning, prio) {
      if (g && g.canvas && isFinite(x) && typeof g.measureText === 'function') { const W = typeof VW !== 'undefined' ? VW : g.canvas.clientWidth || g.canvas.width, w = g.measureText(String(t)).width, a = g.textAlign;
        // (ut8-kr-telefon, Jonas: «Speiderbil 1» svevde midt på fjorden) – står selve merket utenfor skjermen, skyves ikke navnet inn: da
        // fanget ikke spill/etikett.js at merket var utenfor (navnet sto langt fra bilen), og det viktigste står der med en pil (Etikett, REGLER.pil)
        const utenfor = x < 0 || x > W;
        if (W > 2 * KANT + w && !utenfor) { if (a === 'left' || a === 'start') x = Math.min(Math.max(x, KANT), W - KANT - w); else if (a === 'right' || a === 'end') x = Math.min(Math.max(x, KANT + w), W - KANT); else x = Math.min(Math.max(x, KANT + w / 2), W - KANT - w / 2); } }
      return orig.call(this, g, t, x, y, retning, prio); };
    ny.__klamp = true; E.tekst = ny; return true; }
  if (!klampNavn()) { const t = setInterval(() => { if (klampNavn()) clearInterval(t); }, 500); }
  // (kritikerløkka r2, Jonas: «Nattskift · 2 lag, 1 kjøretøy» ble kuttet i venstre kant av krigskartet) – navnet ble flyttet til siden av
  // merket (Etikett.kandidater), ut over kanten. Kantene av skjermen meldes nå inn som hindringer hver ramme, så et navn bare flyttes dit
  // det står helt på skjermen (2D og 3D). KANT er luften (Claudes forslag).
  let toppV = 0, toppT = -1e9;
  function kanter() { const E = window.Etikett; if (!E || !E.hinder || !E.aktiv || !E.aktiv()) return; const W = typeof VW !== 'undefined' ? VW : innerWidth, H = typeof VH !== 'undefined' ? VH : innerHeight, U = 4000;
    // (ut8-kr-telefon) øverst er det statuslinja og knappene som er «kanten» (navnene sto halvt under knappene på telefon)
    const nå = performance.now(); if (nå - toppT > 1000) { toppT = nå; toppV = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topp')) || 0; } const topp = Math.max(KANT, toppV);
    E.hinder(-U, -U, U + KANT, H + 2 * U); E.hinder(W - KANT, -U, U, H + 2 * U); E.hinder(-U, -U, W + 2 * U, U + topp); E.hinder(-U, H - KANT, W + 2 * U, U); }
  if (typeof KROKER !== 'undefined') { if (KROKER.tegn) KROKER.tegn.push(kanter); if (KROKER.tegn3d) KROKER.tegn3d.push(kanter); }
  // NESTE-LAPPEN OG VARSLENE (kritikerløkka r2, Jonas: «Neste-lappen dekker fortsatt varsellappene nede til venstre» – «Røverne drar ut om …»,
  // «Svartebørsen …», i 2D og i 3D-oversikten på telefon). Varslene (spill/narhud.js) står over nordpila og målestokken, lappen
  // (spill/selskap-visning.js) over bunnmenyen; i 3D er nordpila borte, og da gled varslene ned bak lappen. Nå skyves varslene opp over
  // lappen når de ellers ville ligget oppå hverandre (translate, så narhud.js sin egen plassering får stå). Gjelder alle skjermer.
  let løftV = 0;
  function varslerOverLapp() { const v = $('varsler'), l = $('nestelapp');
    if (!v) return; const lr = l && vises(l) && l.classList.contains('på') ? l.getBoundingClientRect() : null;
    if (!lr || !v.getClientRects().length) { if (løftV) { løftV = 0; v.style.translate = ''; } return; }
    const barn = [...v.children].filter(c => c.getClientRects().length); if (!barn.length) { if (løftV) { løftV = 0; v.style.translate = ''; } return; }
    const r = barn.map(c => c.getBoundingClientRect()), venstre = Math.min(...r.map(q => q.left)), høyre = Math.max(...r.map(q => q.right)), bunn = Math.max(...r.map(q => q.bottom)) + løftV;
    const ny = høyre > lr.left && venstre < lr.right && bunn > lr.top - REGLER.lappLuft ? Math.round(bunn - (lr.top - REGLER.lappLuft)) : 0;
    if (ny !== løftV) { løftV = ny; v.style.translate = ny ? `0 ${-ny}px` : ''; } }
  setInterval(() => { try { varslerOverLapp(); } catch (x) { /* neste runde */ } }, REGLER.hver);
  Object.assign(window.Kompakt, { test: false, REGLER, ENE, stripe: () => stripe.classList.contains('på'), varslerLøft: () => løftV });
})();
