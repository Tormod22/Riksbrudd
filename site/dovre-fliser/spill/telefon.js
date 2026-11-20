/* TELEFON (natt 18. nov, pakke «test2»: hele spillet spilt gjennom på en iPhone-stor skjerm, stående 390 × 844 og liggende 844 × 390).
 * Her ligger bare rettinger for små berøringsskjermer – ingen nye funksjoner. Alt gjelder bare når body har klassen «kort»
 * (spill/kompakt.js: under 700 px bred eller under 560 px høy). Tallene (40 px, 38 px, sju fliser …) er Claudes forslag.
 *
 * Det som var galt, og som rettes her:
 *  1. Knappene øverst (3D, ☰, pause, fart, ⏭, ?) var 30 × 31 px – for små for en tommel. Nå 40 px høye stående, 36 px liggende.
 *  2. Raden nederst (#mkom) fikk ni fliser i natt (Region, Verden, Sjø og Velg lag kom til): 33 px brede, og «Tropper» gikk ut over
 *     flisa. Med mer enn seks fliser på en smal skjerm går raden nå over hele bredden, og zoomknappene står over den.
 *  3. Raden nederst lå oppå (eller skinte gjennom) de nye panelene Region, Verden og Sjø, og vistes mens du valgte leirplass.
 *  4. Nye paneler som står helt nederst, tok ikke hensyn til hjemstreken på iPhone (env(safe-area-inset-bottom)) eller hakket
 *     på siden når telefonen ligger. De får en gjennomsiktig kant nederst og luft på sidene.
 *  5. Mange knapper i panelene var 28–36 px høye. Nå minst 40 px, og lukkekryssene minst 40 × 40.
 *  6. Startskjermen, hjelpen og kortene midt på skjermen lå under klokka/hakket øverst.
 *  7. Når du går, sto zoomknappene (som ikke gjør noe da) tett i Hopp-knappen.
 *  8. Opplæringslinja nederst dekket det siste i Leir-menyen.
 * 10. Krigskartet var gjennomsiktig (panelet bak skinte gjennom), Tiltak-panelet gikk ut over venstre kant, og linja under
 *     hvert navn i Folk brakk midt i.
 * 11. Liggende telefon mens du går: helse- og våpenruta lå oppå Skyt, Huk og Hopp, og våpenbyttet oppå minikartet.
 *     Rutene står nå nederst i midten, og våpenbyttet til venstre for Skyt.
 * 12. Kortene (flyktninger, hendelser, personkort) lå oppå knappene øverst og kunne bli høyere enn en liggende skjerm uten
 *     å kunne rulles.
 *  9. Fliser i raden nederst som ikke finnes ennå (hidden), vistes likevel (display:flex slo ut hidden).
 *
 * Runde 2 (samme natt, pakke «telefon2»):
 * 13. LIGGENDE TELEFON (body.tlfligg: kort, og bredere enn 1,2 × høyden): bunnarkene (krigskartet, Region, Sjø, Verden, Tropper, Deg,
 *     Stridsregler, «Lag noe», Samfunn, Tiltak) tok halve høyden, så kartet over ble ca. 150 px høyt. Nå er de sidepaneler med full
 *     høyde – til venstre der de står til venstre på PC (krigskartet, Region, Samfunn), ellers til høyre. Bredden min(400 px, 50 %)
 *     er Claudes forslag. Krigskartet passer inn området i den frie delen ved siden av (strategi-visning.js åpne()).
 * 14. Stoppkortet etter spoling («Stoppet: …») lå oppå loggmeldingen som sier det samme: loggen viker (skjules) mens kortet står
 *     oppå den (body.flytvik – gjelder også PC når de overlapper).
 * 15. ☰-menyen hadde 32 px høye rader: nå minst 40 px (menyen kan rulles).
 * 18. Liten liggende telefon (iPhone SE 667 × 375 er både «smal» og «tlfligg»): når du gikk, lå helse- og våpenruta oppå Huk/Hopp og
 *     våpenbyttet og Skyt oppå minikartet. Rutene og våpenbyttet flyttes nå som på større liggende telefoner, og minikartet er 80 px.
 * 16. Fanen Bygg i Leir-menyen var ca. 3200 px høy på telefon (22 store byggekort i to kolonner). Nå tre kolonner med liten tegning,
 *     navn og pris på én linje; hele kortet er Bygg-knappen (knappen ligger usynlig over kortet), og forklaringen kommer i banneret
 *     når du har trykket. Kort du ikke har råd til, er dempet. Tallene (34 px tegning, tre kolonner) er Claudes forslag.
 * 17. Lagpanelet nede dekket laget du nettopp valgte: når panelet åpnes for et lag som havner under det, flyttes kartet så laget står
 *     midt i den frie delen (over panelet stående, til høyre for det liggende). Bare én gang per valg, og ikke i testene.
 *
 * Runde 5 (18.–19. nov kveld, pakke «test2», spilt som ny spiller fra startskjermen):
 * 19. Stoppkortet («⏭ Stoppet: …») øverst la seg oppå alarmen («Angrep: …» med «Forsvar leiren») og oppå spørsmålskortet fra folket
 *     («Silje foreslår en fest …»), så du ikke så hva som var galt eller hva du ble spurt om. Varselet «Angrepet er slått tilbake!» lå
 *     oppå skadebanneret («Ett bygg er skadet … Reparer alle»), så «Lukk» der så ut til å høre til varselet (også på PC). Nå flyttes
 *     varselet og så stoppkortet ned under kort som står øverst (lavere enn 60 % av skjermen), så lenge det er plass til det.
 * 20. Lagpanelet (valgt lag) ble stående åpent når du trykket 3D og Gå, under Skyt, Huk, Hopp og våpenbyttet (på PC under helsestreken).
 *     Det er skjult mens du går (body.gaar, regelen står i spillhud.js) og kommer tilbake når du slutter å gå.
 */
(() => {
  if (typeof document === 'undefined') return;
  const T = 'env(safe-area-inset-top,0px)', B = 'env(safe-area-inset-bottom,0px)', L = 'env(safe-area-inset-left,0px)', Rt = 'env(safe-area-inset-right,0px)';
  // liggende telefon: disse panelene blir sidepaneler med full høyde (13)
  // (runde 6) samme regel som på PC (paneler.js): det fra bunnmenyen til venstre, det som hører til et panel til høyre
  const SIDE = { venstre: ['krig', 'region', 'samfunnmeny', 'sjopanel', 'verdenpanel', 'tropppanel', 'karakterark'], høyre: ['stridpanel', 'evpanel', 'krigpanel'] };
  const css = document.createElement('style'); css.id = 'telefoncss';
  css.textContent = `
body.kort.smal .knapper button{ height:40px; min-width:38px; }
body.kort:not(.smal) .knapper button{ height:36px; min-width:36px; }
body.kort.mkomfull #mkom{ right:calc(8px + ${Rt}); gap:3px; }
body.kort.mkomfull #mkom button{ font-size:10.5px; letter-spacing:0; }
body.kort.mkom.mkomfull .ctl{ bottom:calc(64px + ${B}); }
body.kort.tlfdekk:not(.mkomalltid) #mkom.på{ display:none; }
#mkom button[hidden]{ display:none; }
body.kort.gaar .ctl{ display:none; }
body.kort.gaar #gangeknapper{ right:calc(10px + ${Rt}); }
body.kort button:not(.knapper *):not(#lagmeny *):not(#minikart *):not(#mkom *):not(.ctl *):not(#opplaering *):not([class*="farge"]):not(.prikk){ min-height:40px; }
body.kort button.lukk, body.kort button[aria-label^="Lukk"]{ min-width:40px; }
body.kort #oppstart, body.kort #hjelp, body.kort #formkort, body.kort #krigkort, body.kort #ytelse{ padding-top:calc(12px + ${T}); padding-bottom:calc(12px + ${B}); padding-left:calc(10px + ${L}); padding-right:calc(10px + ${Rt}); box-sizing:border-box; }
body.kort #oppstart .ark{ max-height:100%; box-sizing:border-box; } body.kort #hjelp .ark{ max-height:100%; box-sizing:border-box; }
body.kort.tlfopp #leirmeny, body.kort.tlfopp #folkmeny{ padding-bottom:46px; }
body.kort #verdenpanel{ background:#181613; }
body.kort #krig{ background:#1a150d; }
body.kort #samfunnkort, body.kort #hendelse{ top:calc(var(--topp,44px) + 6px); box-sizing:border-box; max-height:calc(100% - var(--topp,44px) - 16px - ${B}); overflow-y:auto; }
body.kort #personkort{ box-sizing:border-box; max-height:calc(100% - var(--topp,44px) - 16px - ${B}); overflow-y:auto; }
body.kort:not(.smal) #personkort{ top:calc(var(--topp,44px) + 6px); transform:translateX(-50%); }
body.kort #etterspill{ bottom:calc(14px + ${B}); box-sizing:border-box; }
body.kort #evpanel{ background:#1a150d; }
body.kort:not(.smal) #nhud .helse, body.kort.tlfligg #nhud .helse{ right:auto; left:50%; transform:translateX(-100%); margin-left:-4px; top:auto; bottom:calc(22px + ${B}); }
body.kort:not(.smal) #nhud .vapen, body.kort.tlfligg #nhud .vapen{ right:auto; left:50%; margin-left:4px; top:auto; bottom:calc(22px + ${B}); }
body.kort:not(.smal) #byttvapen, body.kort.tlfligg #byttvapen{ right:calc(160px + ${Rt}); bottom:calc(144px + ${B}); }
body.kort #krigpanel{ left:calc(8px + ${L}); right:calc(8px + ${Rt}); width:auto; box-sizing:border-box; }
body.kort #folkmeny .person small{ display:block; margin-top:2px; }
body.kort #folkmeny select, body.kort #samfunnmeny select, body.kort #stridpanel select, body.kort #tropppanel select{ min-height:40px; }
body.kort #flytkort{ left:calc(12px + ${L}); right:calc(12px + ${Rt}); transform:none; width:fit-content; max-width:min(560px, calc(100vw - 24px)); margin:0 auto; box-sizing:border-box; flex-wrap:nowrap; } body.kort #flytkort > span{ flex:1 1 auto; min-width:0; }
body.kort #lagmeny.på button{ height:auto; min-height:40px; }
body.flytvik #logg{ visibility:hidden; }
body.kort:has(#alarm.på) #logg{ visibility:hidden; }
body.kort.smal #panel{ max-height:52vh; }
body.kort.tlfligg.smal #minikart{ width:80px; height:80px; }
body.kort.tlfligg.smal #skytknapp{ right:calc(96px + ${Rt}); } body.kort.tlfligg.smal #byttvapen{ right:calc(180px + ${Rt}); }
body.kort.tlfligg #panel{ top:calc(var(--topp,44px) + 4px); bottom:calc(6px + ${B}); right:auto; width:min(380px, 52vw); max-width:none; max-height:none; box-sizing:border-box; }
body.kort #leirmeny .liste{ grid-template-columns:repeat(3, minmax(0, 1fr)); gap:5px; }
body.kort #leirmeny .bygg.kort{ position:relative; padding:4px 5px 5px; gap:1px; }
body.kort #leirmeny .bygg.kort .tegn{ height:34px; }
body.kort #leirmeny .bygg.kort b{ font-size:12.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
body.kort #leirmeny .bygg.kort .pris{ display:block; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
body.kort #leirmeny .bygg.kort .kortlinje{ display:none; }
body.kort #leirmeny .bygg.kort > button{ position:absolute; inset:0; width:auto; height:auto; min-height:0; margin:0; padding:0; opacity:0; z-index:1; }
body.kort #leirmeny .bygg.kort:has(> button:disabled){ opacity:.5; }
body.kort #opplaering .rad{ flex-wrap:wrap; }
${SIDE.venstre.map(id => `body.kort.tlfligg #${id}`).join(', ')}{ left:calc(8px + ${L}); right:auto; }
${SIDE.høyre.map(id => `body.kort.tlfligg #${id}`).join(', ')}{ right:calc(8px + ${Rt}); left:auto; }
${[...SIDE.venstre, ...SIDE.høyre].map(id => `body.kort.tlfligg #${id}`).join(', ')}{ top:calc(var(--topp,44px) + 4px); bottom:calc(6px + ${B}); width:min(400px, 50vw); max-width:none; height:auto; max-height:none; transform:none; overflow-y:auto; box-sizing:border-box; border-width:1px; border-style:solid; }
/* RUNDE 10 (20. nov, brukerens iPhone liggende, «Lag ny tropp»): panelet fyller høyden fra knapperaden til bunnmenyen, er bredt nok til to
   kolonner (forslag, navn, bevæpning og kjøretøy til venstre; folkene, utstyret og prisen til høyre – hver kolonne rulles for seg), og
   «Opprett» står alltid nederst. Forslagene er små kort i rutenett. 760 px og tallene under er Claudes forslag. */
html body.kort.tlfligg #tropppanel:has(> .kolonner){ width:min(760px, calc(100vw - 16px - ${L} - ${Rt})); display:flex; flex-direction:column; overflow:hidden; padding:8px 12px 0; }
html body.kort.tlfligg #tropppanel:not(.på){ display:none; }
body.kort.tlfligg #tropppanel h2{ font-size:17px; margin:0 40px 0 0; padding-bottom:3px; margin-bottom:2px; } body.kort.tlfligg #tropppanel > small{ display:block; font-size:12px; line-height:1.25; }
body.kort.tlfligg #tropppanel .kolonner{ display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.1fr); gap:14px; flex:1 1 auto; min-height:0; margin-top:4px; }
body.kort.tlfligg #tropppanel .kol{ display:block; overflow-y:auto; min-height:0; padding-right:3px; overscroll-behavior:contain; }
body.kort.tlfligg #tropppanel .kol > h3:first-child{ margin-top:2px; } body.kort.tlfligg #tropppanel h3{ margin:8px 0 3px; }
body.kort.tlfligg #tropppanel label{ grid-template-columns:78px 1fr; margin:3px 0; }
body.kort.tlfligg #tropppanel .maler{ gap:4px; } body.kort.tlfligg #tropppanel .maler button{ padding:3px 7px; min-height:0; line-height:1.2; }
body.kort.tlfligg #tropppanel .maler button b{ font-size:13.5px; font-weight:600; } body.kort.tlfligg #tropppanel .maler button small{ font-size:11.5px; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:1; overflow:hidden; }
body.kort.tlfligg #tropppanel small.hold{ font-size:12px; }
body.kort.tlfligg #tropppanel .p, body.kort.tlfligg #tropppanel .u{ padding:3px 4px; } body.kort.tlfligg #tropppanel .p select{ min-height:32px; padding:0 4px; } body.kort.tlfligg #tropppanel .p small{ line-height:1.2; }
body.kort.tlfligg #tropppanel .opprett{ position:static; flex:none; margin:6px -12px 0; padding:6px 12px calc(6px + ${B}); }
/* RUNDE 10: bunnmenyen er ugjennomsiktig (tekst bak skinte gjennom), og hogstfelt-/rivelappen står over den, ikke bak */
body.kort #mkom button:not(.på){ background:linear-gradient(180deg,#2e2516,#191309); }
body.kort.mkom #ressursvalg{ bottom:calc(64px + ${B}); }
body.kort #ressursvalg{ box-sizing:border-box; max-width:min(560px, calc(100vw - 24px - ${L} - ${Rt})); max-height:calc(100% - var(--topp,44px) - 80px - ${B}); overflow-y:auto; }
body.kort #flytkort.ibanner{ margin:0; transform:none; padding:2px 6px 3px 8px; font-size:12.5px; line-height:1.25; background:#22100b; border-color:#e0714f; border-top:1px dashed #6a3426; box-shadow:0 4px 14px rgba(0,0,0,.5); }
body.kort #flytkort.ibanner button{ min-height:32px; padding:0 8px; font-size:12.5px; } body.kort #flytkort.ibanner > span{ overflow:hidden; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
/* RUNDE 12 (21. nov, kritiker E – liggende telefon): med et høyt panel åpent til venstre (Leir, Folk, Deg …) eller til høyre står bunnmenyen
   som en smal rad med ikoner ved siden av panelet (body.mkomved, --mkomx), og panelet går helt ned. Tallene (46 × 42 px) er Claudes forslag. */
body.kort.tlfligg.mkomved #mkom{ right:auto; left:var(--mkomx); justify-content:flex-start; gap:3px; }
body.kort.tlfligg.mkomved.mkomvedh #mkom{ left:auto; right:var(--mkomx); justify-content:flex-end; }
body.kort.tlfligg.mkomved #mkom button{ flex:0 0 46px; width:46px; max-width:46px; height:42px; font-size:0; letter-spacing:0; }
body.kort.tlfligg.mkomved #mkom button::before{ width:21px; height:21px; } body.kort.tlfligg.mkomved #mkom button .merke{ font-size:9.5px; }
/* RUNDE 12: klyping med to fingre på et panel zoomet hele nettsiden (iPhone bryr seg ikke om user-scalable=no). Siden kan bare rulles;
   kartet (touch-action:none) tar klypingen selv. */
html, body{ touch-action:pan-x pan-y; } body.kort :is(#leirmeny, #folkmeny, #tropppanel, #karakterark, #sekk, #krig, #panel, #opplaering, #varsler, #alarm, #morgenkort, #hendelse, #samfunnkort, #byggvalg){ touch-action:pan-y; }
`;
  document.head.appendChild(css);
  // RUNDE 12: iPhone (Safari) zoomer siden med to fingre uansett meta-taggen – gesturestart stoppes (kartet bruker pekerhendelser, ikke denne)
  document.addEventListener('gesturestart', e => { e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1 && !(e.target && e.target.closest && e.target.closest('canvas'))) e.preventDefault(); }, { passive: false });

  // paneler som aldri skal regnes som «dekker raden nederst»
  const IKKE = new Set(['mkom', 'kommando', 'opplaering', 'logg', 'nhud', 'kontrollrom', 'oppstart', 'feil', 'kilde', 'skala', 'nordpil', 'minikart', 'kompass']);
  const merket = new WeakSet();
  // 14: stoppkortet etter spoling står oppå loggen (som sier det samme) -> loggen viker så lenge kortet står
  function flyt() { const b = document.body, k = document.getElementById('flytkort'), l = document.getElementById('logg'); let vik = false;
    if (k && l && k.classList.contains('på')) { const a = k.getBoundingClientRect(), c = l.getBoundingClientRect();
      vik = a.width > 0 && c.width > 0 && a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom; }
    // når loggen alt er skjult, har den fortsatt mål (visibility) – den blir skjult til kortet er borte
    if (b.classList.contains('flytvik') && k && k.classList.contains('på')) vik = true;
    if (b.classList.contains('flytvik') !== vik) b.classList.toggle('flytvik', vik); }
  // 19: stoppkortet og varselet («Angrepet er slått tilbake!») under alarmen og spørsmålskortene som står øverst. Varselet står like høyt
  // som alarmen også på PC, så det gjelder alle skjermer; det som ikke overlapper noe, står der det står.
  function ned(id) { const k = document.getElementById(id), b = document.body; if (!k) return;
    if (!k.classList.contains('på')) { if (k.style.top) k.style.top = ''; return; }
    const før = k.style.top; k.style.top = ''; const a = k.getBoundingClientRect(), H = window.innerHeight; if (a.height < 1) { k.style.top = før; return; }
    const kort = [...b.children].filter(e => e !== k && e.tagName === 'DIV' && e.classList.contains('på') && !IKKE.has(e.id) && e.id !== 'flytkort').map(e => e.getBoundingClientRect())
      .filter(r => r.width > 100 && r.height > 20 && r.height < H * .6 && r.top < H / 2 && r.left < a.right && a.left < r.right).sort((x, y) => x.top - y.top);
    let y = a.top; for (const r of kort) if (r.top < y + a.height && y < r.bottom) y = r.bottom + 6;
    k.style.top = y !== a.top && y + a.height < H - 60 ? Math.round(y) + 'px' : ''; }
  // RUNDE 12 (kritiker E: sju bokser oppå hverandre under angrepet): på telefon henger stoppkortet («⏭ Stoppet: … Spol videre ×») seg rett
  // under angrepsbanneret som en smal linje i samme bredde, så de leses som én boks. Bare for spilleren (Telefon.test i testene).
  function iBanner() { const k = document.getElementById('flytkort'), a = document.getElementById('alarm'), b = document.body;
    const på = b.classList.contains('kort') && (!navigator.webdriver || Telefon.test === true) && k && a && k.classList.contains('på') && a.classList.contains('på') && a.getClientRects().length > 0 && k.getClientRects().length > 0;
    if (!på) { if (k && k.classList.contains('ibanner')) { k.classList.remove('ibanner'); for (const q of ['left', 'width', 'top', 'right', 'max-width']) k.style.removeProperty(q); } return false; }
    const r = a.getBoundingClientRect(); k.classList.add('ibanner'); k.style.setProperty('left', Math.round(r.left) + 'px'); k.style.setProperty('right', 'auto'); k.style.setProperty('width', Math.round(r.width) + 'px'); k.style.setProperty('max-width', 'none'); k.style.setProperty('top', Math.round(r.bottom - 1) + 'px'); return true; }
  function stoppkortNed() { ned('varsel'); if (!iBanner()) ned('flytkort'); }
  // RUNDE 10: liggende telefon – hogstfelt-/rivelappen og byggebanneret står midt nede; er en meny åpen til venstre (eller høyre), står de
  // i den frie delen ved siden av menyen, så de ikke ligger oppå den
  const VED = ['ressursvalg', 'byggvalg', 'alarm'], MENY = ['leirmeny', 'folkmeny', 'krig', 'karakterark', 'sekk', 'region', 'samfunnmeny', 'verdenpanel', 'sjopanel', 'panel'];
  function vedMeny() { const b = document.body, W = window.innerWidth, ligg = b.classList.contains('kort') && W > window.innerHeight * 1.2;
    for (const id of VED) { const e = document.getElementById(id); if (!e) continue; const vis = e.classList.contains('på') && e.getClientRects().length > 0;
      const m = ligg && vis ? MENY.map(q => document.getElementById(q)).find(q => q && q.classList.contains('på') && q.getClientRects().length > 0 && q.getBoundingClientRect().width < W * .6) : null;
      if (!m) { if (e.dataset.ved) { for (const k of ['left', 'right', 'transform', 'max-width']) e.style.removeProperty(k); delete e.dataset.ved; } continue; }
      const r = m.getBoundingClientRect(), høyre = r.left < W / 2; e.dataset.ved = '1'; e.style.transform = 'none';
      if (høyre) { e.style.left = Math.round(r.right + 8) + 'px'; e.style.right = 'auto'; e.style.maxWidth = Math.max(160, W - r.right - 64) + 'px'; }
      else { e.style.right = Math.round(W - r.left + 8) + 'px'; e.style.left = 'auto'; e.style.maxWidth = Math.max(160, r.left - 16) + 'px'; } } }
  // RUNDE 12: bunnmenyen ved siden av et høyt panel på liggende telefon (se CSS over). Panelene som kan stå slik:
  const HØYE = ['leirmeny', 'folkmeny', 'krig', 'karakterark', 'sekk', 'region', 'samfunnmeny', 'verdenpanel', 'sjopanel', 'panel', 'stridpanel', 'evpanel', 'krigpanel', 'degmeny', 'tropppanel'];
  function mkomVed() { const b = document.body, W = window.innerWidth, H = window.innerHeight, m = document.getElementById('mkom');
    let ved = null; if (b.classList.contains('tlfligg') && m && m.classList.contains('på')) for (const id of HØYE) { const e = document.getElementById(id); if (!e || !e.classList.contains('på') || !e.getClientRects().length) continue;
      const r = e.getBoundingClientRect(); if (r.height < H * .45 || r.width > W * .62) continue; const venstre = r.left < W - r.right;
      // så mye plass er det ved siden av panelet (zoomknappene til høyre tar 52 px)
      const plass = venstre ? W - r.right - 60 : r.left - 16; if (plass < 150) continue; ved = { x: Math.round(venstre ? r.right + 8 : W - r.left + 8), h: !venstre }; break; }
    if (b.classList.contains('mkomved') !== !!ved) b.classList.toggle('mkomved', !!ved);
    if (ved) { b.classList.toggle('mkomvedh', ved.h); const v = ved.x + 'px'; if (b.style.getPropertyValue('--mkomx') !== v) b.style.setProperty('--mkomx', v); } else b.classList.remove('mkomvedh'); }
  function pass() {
    flyt(); stoppkortNed(); try { vedMeny(); } catch (e) { /* neste runde */ } try { mkomVed(); } catch (e) { /* neste runde */ }
    const b = document.body; if (!b.classList.contains('kort')) { for (const k of ['mkomfull', 'tlfdekk', 'tlfopp', 'tlfligg']) if (b.classList.contains(k)) b.classList.remove(k); return; }
    const H = window.innerHeight, W = window.innerWidth, m = document.getElementById('mkom');
    // 13: liggende telefon
    const ligg = W > H * 1.2; if (b.classList.contains('tlfligg') !== ligg) b.classList.toggle('tlfligg', ligg);
    // 2: mange fliser på smal skjerm -> hele bredden
    const ant = m ? [...m.children].filter(k => !k.hidden).length : 0, full = b.classList.contains('smal') && ant > 6;
    if (b.classList.contains('mkomfull') !== full) b.classList.toggle('mkomfull', full);
    // 3 og 4: åpne paneler som når ned til raden nederst
    let dekk = false; const lv = document.getElementById('leirvalg'); if (lv && lv.classList.contains('på')) dekk = true;
    for (const e of b.children) { if (!e.classList.contains('på') || IKKE.has(e.id) || e.tagName !== 'DIV') continue; const r = e.getBoundingClientRect(); if (r.width < 150 || r.height < 60) continue;
      if (r.bottom > H - 58 && r.top > 0) dekk = true;
      // 5: lukkekrysset skal være lett å treffe
      for (const k of e.querySelectorAll('button')) if (k.textContent === '×' && !k.style.minWidth) k.style.minWidth = '40px';
      // 4: står panelet helt nederst, får det plass til hjemstreken; går det fra kant til kant, også til hakket på siden
      if (r.bottom >= H - 1 && r.top > 0 && !merket.has(e)) { merket.add(e); const cs = getComputedStyle(e);
        if (parseFloat(cs.borderBottomWidth) < 2) e.style.borderBottom = `${B} solid transparent`;
        if (r.left <= 1 && r.right >= W - 1) { e.style.paddingLeft = `max(${cs.paddingLeft}, calc(4px + ${L}))`; e.style.paddingRight = `max(${cs.paddingRight}, calc(4px + ${Rt}))`; } } }
    if (b.classList.contains('tlfdekk') !== dekk) b.classList.toggle('tlfdekk', dekk);
    // 8: opplæringslinja ligger nederst mens en meny er åpen
    const o = document.getElementById('opplaering'), opp = !!o && o.classList.contains('liten') && o.getClientRects().length > 0;
    if (b.classList.contains('tlfopp') !== opp) b.classList.toggle('tlfopp', opp);
  }
  // 17: lagpanelet skal ikke dekke laget du valgte (én gang per valg; ikke i testene – Telefon.test slår det på der)
  let sistValgt = null;
  function seLag() {
    const p = document.getElementById('panel'), åpen = !!p && p.classList.contains('på') && p.getClientRects().length > 0;
    const s = typeof valgt !== 'undefined' && valgt && Number.isFinite(valgt.x) ? valgt : null;
    if (!åpen || !s) { sistValgt = null; return; }
    const nøkkel = s.id !== undefined ? s.id : s.navn; if (nøkkel === sistValgt) return; sistValgt = nøkkel;
    if ((navigator.webdriver && Telefon.test !== true) || typeof kam === 'undefined' || (typeof på3d !== 'undefined' && på3d)) return;
    const W = window.innerWidth, H = window.innerHeight, r = p.getBoundingClientRect(), sx = W / 2 + (s.x - kam.x) / kam.m, sy = H / 2 - (s.y - kam.y) / kam.m;
    if (sx < r.left - 20 || sx > r.right + 20 || sy < r.top - 20 || sy > r.bottom + 20) return;
    const topp = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topp')) || 44;
    // stående: panelet går nesten over hele bredden -> laget over panelet; liggende: panelet står til venstre -> laget til høyre for det
    if (r.width > W * .6) kam.y = s.y - (H / 2 - (topp + r.top) / 2) * kam.m; else kam.x = s.x - ((r.right + W) / 2 - W / 2) * kam.m;
    if (typeof skitten !== 'undefined') skitten = true; }
  setInterval(() => { if (document.body.classList.contains('kort')) seLag(); }, 250);
  // RUNDE 12 (kritiker E: «tastaturhint på telefon», f.eks. «… (Tab)», «Gå ut (F)»): på berøringsskjerm tas en tastetekst i parentes på
  // slutten av knappeteksten bort (bare den siste tekstbiten i knappen endres). Bare for spilleren – kontrollskriptet trykker etter teksten.
  const TAST = /\s*\((?:Tab|Esc|Enter|Shift|Mellomrom|Ctrl\+\w|F\d{0,2}|[A-ZÆØÅ])\)\s*$/;
  function utenTaster() { if (navigator.webdriver && Telefon.test !== true) return; if (!(window.matchMedia && matchMedia('(pointer: coarse)').matches)) return;
    for (const b of document.querySelectorAll('button')) { const t = b.lastChild; if (!t || t.nodeType !== 3 || !TAST.test(t.nodeValue)) continue; t.nodeValue = t.nodeValue.replace(TAST, ''); } }
  setInterval(utenTaster, 1500);
  setInterval(pass, 350); window.addEventListener('resize', pass); pass();
  window.Telefon = { pass, seLag, test: false, SIDE, ligg: () => document.body.classList.contains('kort') && window.innerWidth > window.innerHeight * 1.2 };
})();
