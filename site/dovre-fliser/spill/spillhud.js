'use strict';
/* Riksbrudd – SPILLSKJERMEN (17. nov, brukeren med fire skjermbilder fra PC: «få til en bedre UI, dette ser ikke ut som et spill – se på
 * nettet hvordan krigs-, strategi-, city builder- og survival-spill med god UI gjør ting, legg planer og utfør»).
 * Det jeg fant (HUD-råd og gjennomganger av strategi- og byggespill): ressursene øverst som ikonfliser med tall – ikke en setning –,
 * ett hovedtall alt annet ordnes rundt (kassa), farge som varsel, lite fast på skjermen (ca. sju ting) og resten ved pekeren/trykk,
 * kommandoene samlet i en rad nederst, tid og fart sammen, og en gjennomført ramme/skrift på panelene så det ligner ett spill.
 * PLANEN, utført her for PC (body.spill = bredt vindu som ikke er «kort»; telefonen har sitt eget oppsett i kompakt.js):
 *  1. RESSURSLINJA øverst til venstre: klokke og vær først, så kassa (størst) og ressursene som fliser med ikon og tall; ordene er borte
 *     (de står i verktøytipset). Tekniske tall (moh., MB lastet, bilder per sekund) vises ikke – «Tekniske tall» i ☰ henter dem fram.
 *  2. KOMMANDOLINJA nederst i midten: Leir, Folk, Tropper, Krig og Deg som store ikonknapper med hurtigtast. De trykker på de vanlige
 *     knappene (som fortsatt finnes, men er skjult i spillskjermen), så alt annet virker som før.
 *  3. FARTEN som én samlet gruppe, og 3D / ☰ / ? som små firkanter øverst til høyre.
 *  4. PANELENE (leir, folk, lag, krig, karakter, strid, tropper, sekk, hjelp) får samme ramme: mørk flate, gullkant, tittelplate.
 *  5. KILDENE nederst er en liten «Kilder»-lapp som åpner seg når du peker på den.
 * window.SpillHud.
 */
(function () {
  const $ = id => document.getElementById(id), svg = d => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'>${d}</svg>`)}")`;
  const IK = { sjo: "<circle cx='12' cy='5' r='2'/><path d='M12 7v14M8 11h8M4 14c0 4 3.5 7 8 7s8-3 8-7'/>", allelag: "<path d='M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4' /><rect x='8.5' y='9' width='7' height='6'/>", mer: "<circle cx='5' cy='12' r='1.7'/><circle cx='12' cy='12' r='1.7'/><circle cx='19' cy='12' r='1.7'/>", leir: "<path d='M3 20L12 5l9 15zM12 5v15M9.5 20l2.5-4.5 2.5 4.5'/>", folk: "<circle cx='9' cy='8' r='3.2'/><path d='M3 20c0-3.5 2.6-5.5 6-5.5s6 2 6 5.5'/><circle cx='17' cy='9' r='2.4'/><path d='M16 14.6c3 0 5 1.7 5 4.6'/>",
    tropper: "<path d='M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z'/><path d='M9 12l2 2 4-4'/>", krig: "<path d='M5 4l12 12M19 4L7 16M4.5 17.5l2.5 2.5M19.5 17.5L17 20M6.5 13.5l-2.5 2.5M17.5 13.5l2.5 2.5'/>", deg: "<circle cx='12' cy='8' r='4'/><path d='M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7'/>" };
  const REKKE = ['sDag', 'sVaer', 'sVind', 'sAar', 'sPenger', 'sDiesel', 'sTre', 'sBetong', 'sStaal', 'sStrom', 'sOlje', 'sFolk', 'sMaal', 'sKrig', 'sHvor'], TEKNISK = ['sH', 'sKB', 'sFps'];
  const css = document.createElement('style');
  css.textContent = `body.spill .top{ gap:8px; flex-wrap:nowrap; align-items:flex-start; }
body.spill .stats{ background:none; border:0; padding:0; gap:5px; flex-wrap:wrap; align-items:stretch; flex:1 1 auto; min-width:0; }
body.spill .stats > div{ display:flex; align-items:center; gap:2px; padding:3px 10px 3px 8px; min-height:34px; background:linear-gradient(180deg,#2a2215,#17120a); border:1px solid #5a4a2a; box-shadow:inset 0 1px 0 rgba(255,230,160,.07), 0 2px 6px rgba(0,0,0,.5); border-radius:3px; }
body.spill .stats > div > span:not([id]){ display:none; } body.spill .stats > div b{ font-size:17px; letter-spacing:.01em; }
body.spill .stats > div[data-s="sDag"]{ border-color:#c9b26a; padding-right:12px; } body.spill .stats > div[data-s="sDag"] b{ font-size:19px; }
body.spill .stats > div[data-s="sPenger"]{ border-color:#c9b26a; background:linear-gradient(180deg,#3a2f18,#1d160b); margin-left:8px; } body.spill .stats > div[data-s="sPenger"] b{ font-size:20px; color:#f0dc9a; }
body.spill .stats > div[data-teknisk], body.spill .stats > div[data-tom]{ display:none; } body.spill.teknisk .stats > div[data-teknisk]{ display:flex; opacity:.7; }
body.spill .stats > div[data-ikon]::before{ color:#c9b26a; width:1.05em; height:1.05em; opacity:1; }
body.spill .knapper{ flex:none; flex-wrap:nowrap; gap:4px; } body.spill .knapper button{ height:36px; min-width:36px; padding:0 9px; background:linear-gradient(180deg,#2a2215,#17120a); border-color:#5a4a2a; border-radius:3px; }
body.spill .knapper #leirknapp, body.spill .knapper #krigknapp, body.spill:not(.gaar) .knapper #karakterknapp{ display:none; }
body.spill .knapper #sp0{ margin-left:8px; border-radius:3px 0 0 3px; } body.spill .knapper #sp1, body.spill .knapper #sp2, body.spill .knapper #sp3{ margin-left:-5px; border-radius:0; } body.spill .knapper #sp4{ margin-left:-5px; border-radius:0 3px 3px 0; margin-right:8px; }
body.spill .knapper button.på{ background:linear-gradient(180deg,#6a5a34,#4a3d22); border-color:#e8d48a; color:#fff3c8; }
#kommando{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(14px + env(safe-area-inset-bottom,0px)); z-index:8; display:none; gap:6px; padding:6px; background:linear-gradient(180deg,rgba(34,27,16,.94),rgba(18,14,8,.96)); border:1px solid #8a7440; box-shadow:0 0 0 1px #0d0a06, 0 8px 26px rgba(0,0,0,.6); border-radius:5px; }
body.spill #kommando.på{ display:flex; }
#kommando button{ position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; width:78px; height:62px; background:linear-gradient(180deg,#2e2516,#191309); border:1px solid #5a4a2a; border-radius:4px; color:var(--ink,#e7dcc3); font:inherit; font-size:13px; letter-spacing:.03em; cursor:pointer; transition:transform .08s, border-color .12s; }
#kommando button::before{ content:''; width:26px; height:26px; background:#d9c27a; -webkit-mask:var(--kn) center/contain no-repeat; mask:var(--kn) center/contain no-repeat; }
#kommando button:hover{ border-color:#e8d48a; transform:translateY(-2px); } #kommando button:active{ transform:translateY(0); } #kommando button.på{ background:linear-gradient(180deg,#6a5a34,#3f331c); border-color:#e8d48a; color:#fff3c8; } #kommando button.på::before{ background:#fff3c8; }
#kommando button i{ position:absolute; right:4px; top:2px; font-style:normal; font-size:10.5px; color:#a89970; } #kommando button .merke{ position:absolute; left:4px; top:3px; min-width:15px; height:15px; line-height:15px; padding:0 3px; border-radius:8px; background:#b4452f; color:#fff; font-size:10.5px; text-align:center; }
${Object.entries(IK).map(([n, d]) => `:is(#kommando,#kommer,#mkom,#mkommer) button[data-k="${n}"]{ --kn:${svg(d)}; }`).join('\n')}
body.spill #leirmeny, body.spill #folkmeny, body.spill #panel, body.spill #krig, body.spill #karakterark, body.spill #stridpanel, body.spill #tropppanel, body.spill #sekk, body.spill #lagmeny{ background:linear-gradient(180deg,#241c10 0,#17120a 150px); border:1px solid #8a7440; box-shadow:0 0 0 1px #0d0a06, inset 0 1px 0 rgba(255,230,160,.06), 0 12px 34px rgba(0,0,0,.65); border-radius:4px; }
body.spill #leirmeny h2, body.spill #folkmeny h2, body.spill #krig h2, body.spill #stridpanel h2, body.spill #tropppanel h2, body.spill #sekk h2, body.spill #panel h2{ font-family:"IM Fell English",serif; font-weight:400; letter-spacing:.04em; padding-bottom:5px; margin-bottom:6px; border-bottom:1px solid #5a4a2a; background:linear-gradient(90deg,rgba(201,178,106,.14),rgba(201,178,106,0) 70%); margin-left:-12px; padding-left:12px; }
body.spill #kilde{ left:auto; right:64px; bottom:calc(6px + env(safe-area-inset-bottom,0px)); max-width:min(900px,70vw); font-size:0; pointer-events:auto; cursor:help; text-align:right; }
body.spill #kilde::before{ content:'ⓘ Kilder'; font-size:11.5px; font-style:normal; letter-spacing:.04em; padding:2px 7px; background:rgba(20,16,10,.7); border:1px solid #4a4030; border-radius:3px; }
body.spill #kilde:hover{ font-size:12px; background:rgba(20,16,10,.92); border:1px solid #5a4a2a; padding:6px 9px; text-shadow:none; } body.spill #kilde:hover::before{ display:none; }
body.spill #panel{ box-sizing:border-box; max-width:min(446px, calc(50vw - 226px)); } @media (max-width:1180px){ body.spill #panel{ max-width:420px; bottom:calc(92px + env(safe-area-inset-bottom,0px)); } }
body.spill .ctl button{ background:linear-gradient(180deg,#2a2215,#17120a); border-color:#5a4a2a; border-radius:3px; }
body.spill #varsler button, body.spill #varsler > *{ border-radius:3px; }
.stats > div[data-ord]::after{ content:attr(data-ord); order:1; font-size:11.5px; letter-spacing:.07em; text-transform:uppercase; color:#a89970; margin:0 5px 0 3px; }
.stats > div[data-ord]{ display:flex; align-items:center; } .stats > div[data-ord] b{ order:2; } body.kort .stats > div[data-ord]::after{ font-size:10px; margin:0 4px 0 1px; }
body:not(.spill):not(.kort) .stats > div[data-ord]::after{ display:none; }
body.spill .stats > div[hidden], body .stats > div[data-ord][hidden]{ display:none; } body.spill .stats{ flex-wrap:wrap; } body.spill .stats > div[data-mer]{ display:none; }
body.spill .stats[data-trang="1"] #sAar, body.spill .stats[data-trang="2"] #sAar, body.spill .stats[data-trang="2"] #sVind{ display:none; }
#flismer{ display:none; cursor:pointer; order:60; } body.spill #flismer.på{ display:flex; } #flismer b{ font-size:15px; color:#d9c27a; } #flismer.åpen{ border-color:#e8d48a; }
#flismerliste{ position:fixed; z-index:9; display:none; min-width:210px; padding:5px; background:linear-gradient(180deg,#241c10,#17120a); border:1px solid #8a7440; box-shadow:0 0 0 1px #0d0a06, 0 10px 28px rgba(0,0,0,.65); border-radius:4px; }
#flismerliste.på{ display:block; animation:flisned .14s ease-out; } @keyframes flisned{ from{ opacity:0; transform:translateY(-5px); } }
#flismerliste button{ display:flex; align-items:center; gap:8px; width:100%; padding:6px 9px; background:none; border:0; border-bottom:1px solid #3a3223; color:var(--ink,#e7dcc3); font:inherit; font-size:14.5px; text-align:left; cursor:pointer; } #flismerliste button:last-child{ border-bottom:0; }
#flismerliste button:hover{ background:rgba(201,178,106,.12); } #flismerliste button span{ flex:1; color:#a89970; font-size:12px; letter-spacing:.06em; text-transform:uppercase; } #flismerliste button b{ font-family:"IM Fell English",serif; font-weight:400; font-size:16px; }
body.kort .stats{ background:none; border:0; padding:0 14px 0 0; gap:0 4px; align-items:stretch; }
body.kort .stats > div{ display:flex; align-items:center; padding:3px 8px 3px 6px; background:linear-gradient(180deg,#2a2215,#17120a); border:1px solid #5a4a2a; border-radius:3px; box-shadow:0 2px 5px rgba(0,0,0,.45); }
body.kort .stats > div[hidden], body.kort .stats > div.ikke-kort, body.kort .stats > div[data-tom]{ display:none; } body.kort .stats > div[data-ikon]::before{ color:#c9b26a; opacity:1; }
body.kort .stats > div[data-s="sPenger"]{ border-color:#c9b26a; } body.kort .stats > div[data-s="sPenger"] b{ color:#f0dc9a; }
#mkom{ position:fixed; left:calc(8px + env(safe-area-inset-left,0px)); right:calc(52px + env(safe-area-inset-right,0px)); bottom:calc(6px + env(safe-area-inset-bottom,0px)); z-index:5; display:none; gap:4px; justify-content:center; pointer-events:none; }
#mkom.på{ display:flex; animation:mkomopp .2s ease-out; } @keyframes mkomopp{ from{ opacity:0; transform:translateY(10px); } }
#mkom button{ pointer-events:auto; position:relative; flex:1 1 0; min-width:0; max-width:76px; height:52px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; padding:0; background:linear-gradient(180deg,rgba(46,37,22,.96),rgba(25,19,9,.97)); border:1px solid #8a7440; border-radius:5px; box-shadow:0 3px 10px rgba(0,0,0,.55); color:var(--ink,#e7dcc3); font:inherit; font-size:11.5px; letter-spacing:.03em; }
#mkom button::before{ content:''; width:23px; height:23px; background:#d9c27a; -webkit-mask:var(--kn) center/contain no-repeat; mask:var(--kn) center/contain no-repeat; }
#mkom button.på{ background:linear-gradient(180deg,#6a5a34,#3f331c); border-color:#e8d48a; color:#fff3c8; } #mkom button .merke{ position:absolute; right:3px; top:2px; min-width:14px; height:14px; line-height:14px; padding:0 3px; border-radius:7px; background:#5a4a2a; color:#fff; font-size:10px; text-align:center; }
body.mkom #kilde{ bottom:calc(62px + env(safe-area-inset-bottom,0px)); } body.mkom #skala{ bottom:calc(80px + env(safe-area-inset-bottom,0px)); } body.mkom #nordpil{ bottom:calc(104px + env(safe-area-inset-bottom,0px)); }
body.mkom .ctl{ bottom:calc(6px + env(safe-area-inset-bottom,0px)); }
body.mtlf .knapper #leirknapp, body.mtlf .knapper #krigknapp, body.mtlf .knapper #karakterknapp{ display:none; }
@media (prefers-reduced-motion:reduce){ #mkom.på, #flismerliste.på{ animation:none; } }`;
  // «MER» (18. nov, runde 2): de fem faste står i linja, resten (Region, Sjø, Verden, Velg lag …) i en rad som åpnes av «Mer»
  css.textContent = css.textContent.replace(/#kommando button/g, ':is(#kommando,#kommer) button').replace(/#mkom button/g, ':is(#mkom,#mkommer) button') + `
:is(#kommando,#kommer,#mkom,#mkommer) button[hidden]{ display:none; }
#kommer{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(92px + env(safe-area-inset-bottom,0px)); z-index:8; display:none; gap:6px; padding:6px; max-width:calc(100vw - 20px); flex-wrap:wrap; justify-content:center; background:linear-gradient(180deg,rgba(34,27,16,.96),rgba(18,14,8,.97)); border:1px solid #8a7440; box-shadow:0 0 0 1px #0d0a06, 0 8px 26px rgba(0,0,0,.6); border-radius:5px; }
body.spill #kommer.på{ display:flex; animation:kommeropp .16s ease-out; } @keyframes kommeropp{ from{ opacity:0; translate:0 10px; } }
#mkommer{ position:fixed; left:calc(8px + env(safe-area-inset-left,0px)); right:calc(52px + env(safe-area-inset-right,0px)); bottom:calc(64px + env(safe-area-inset-bottom,0px)); z-index:6; display:none; gap:4px; padding:5px; flex-wrap:wrap; justify-content:center; background:rgba(22,17,10,.96); border:1px solid #8a7440; border-radius:5px; box-shadow:0 6px 18px rgba(0,0,0,.6); }
#mkommer.på{ display:flex; animation:kommeropp .16s ease-out; } #mkommer button{ flex:0 0 68px; }
@media (prefers-reduced-motion:reduce){ #kommer.på, #mkommer.på{ animation:none; } }`;
  document.head.appendChild(css);

  // ---------- kommandolinja ----------
  const bar = document.createElement('div'); bar.id = 'kommando'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Kommandoer'); document.body.appendChild(bar);
  const KN = [
    { k: 'leir', navn: 'Leir', tast: 'L', fins: () => $('leirknapp') && !$('leirknapp').hidden, på: () => $('leirknapp').classList.contains('på') || ($('leirmeny') && $('leirmeny').classList.contains('på')), trykk: () => $('leirknapp').click(), tittel: 'Leiren: bygg, lager, plan og mål (L)' },
    { k: 'folk', navn: 'Folk', tast: '', fins: () => !!(window.FolkSpill && FolkSpill.tilstand()), på: () => !!($('folkmeny') && $('folkmeny').classList.contains('på')), trykk: () => FolkSpill.åpne(!($('folkmeny') && $('folkmeny').classList.contains('på'))), tittel: 'Folkene i leiren: oppgaver, mat, moral', merke: () => { const F = window.FolkSpill && FolkSpill.tilstand(); return F ? F.personer.length : ''; } },
    { k: 'tropper', navn: 'Tropper', tast: '', fins: () => !!(window.TropperSpill && window.FolkSpill && FolkSpill.tilstand()), på: () => !!($('tropppanel') && $('tropppanel').classList.contains('på')), trykk: () => ($('tropppanel').classList.contains('på') ? TropperSpill.lukk() : TropperSpill.åpne()), tittel: 'Lag en ny tropp av folk fra leiren' },
    { k: 'krig', navn: 'Krig', tast: 'T', fins: () => $('krigknapp') && !$('krigknapp').hidden, på: () => !!(window.StrategiSpill && StrategiSpill.erÅpen()), trykk: () => $('krigknapp').click(), tittel: 'Krigskartet: hvem holder hva, fronter og neste trekk (T)' },
    { k: 'deg', navn: 'Deg', tast: 'O', fins: () => $('karakterknapp') && !$('karakterknapp').hidden, på: () => !!(window.KarakterSpill && KarakterSpill.erÅpen()), trykk: () => $('karakterknapp').click(), tittel: 'Karakterarket: helse, sult, tørst, søvn og utstyr (O)' },
  ];
  // andre moduler kan legge til knapper: window.KOMMANDO_TILLEGG.push({ k, navn, tast, ikon (svg-innmat), fins(), på(), trykk(), tittel }) – før denne fila lastes
  const FASTE = KN.length;
  for (const T of window.KOMMANDO_TILLEGG || []) { T.tillegg = true; KN.push(T); if (T.ikon) { const st = document.createElement('style'); st.textContent = `[data-k="${T.k}"]{ --kn:${svg(T.ikon)}; }`; document.head.appendChild(st); } }
  for (const K of KN) { const b = document.createElement('button'); b.dataset.k = K.k; b.dataset.tips = K.navn + '|' + K.tittel; b.setAttribute('aria-label', K.tittel); b.append(document.createTextNode(K.navn)); if (K.tast) { const t = document.createElement('i'); t.textContent = K.tast; b.appendChild(t); } b.onclick = e => { e.stopPropagation(); K.trykk(); åpneKomMer(false); oppdater(); }; K.el = b; bar.appendChild(b); }
  // TELEFONEN (18. nov): samme kommandoer som en egen rad nederst (#mkom), store nok til en tommel, til venstre for zoomknappene.
  // Egen rad (ikke #kommando), så PC-linja er urørt. Borte når du går (styrespak, Huk og Hopp står der), bygger eller har et panel åpent.
  const mbar = document.createElement('div'); mbar.id = 'mkom'; mbar.setAttribute('role', 'toolbar'); mbar.setAttribute('aria-label', 'Kommandoer'); document.body.appendChild(mbar);
  for (const K of KN) { const b = document.createElement('button'); b.dataset.k = K.k; b.setAttribute('aria-label', K.tittel); b.append(document.createTextNode(K.navn)); b.onclick = e => { e.stopPropagation(); K.trykk(); åpneKomMer(false); setTimeout(oppdater, 60); }; K.el2 = b; mbar.appendChild(b); }
  // «Mer»-knappen og raden den åpner (én for PC-linja, én for telefonraden)
  const kommer = document.createElement('div'); kommer.id = 'kommer'; const mkommer = document.createElement('div'); mkommer.id = 'mkommer'; document.body.append(kommer, mkommer); let komMerÅpen = false;
  const merKn = [bar, mbar].map(forelder => { const b = document.createElement('button'); b.dataset.k = 'mer'; b.className = 'kommer'; b.append(document.createTextNode('Mer')); b.setAttribute('aria-label', 'Flere kommandoer'); if (forelder === bar) b.dataset.tips = 'Mer|Flere kommandoer: region, sjø, verden og annet som ikke får plass i linja'; b.onclick = e => { e.stopPropagation(); åpneKomMer(!komMerÅpen); }; b.hidden = true; forelder.appendChild(b); return b; });
  function åpneKomMer(på) { komMerÅpen = !!på; for (const b of merKn) b.classList.toggle('åpen', komMerÅpen); settKomMer(); }
  function settKomMer() { const pc = bar.classList.contains('på'), tlf = mbar.classList.contains('på'); kommer.classList.toggle('på', komMerÅpen && pc && kommer.children.length > 0); mkommer.classList.toggle('på', komMerÅpen && tlf && mkommer.children.length > 0); }
  document.addEventListener('pointerdown', e => { if (komMerÅpen && !kommer.contains(e.target) && !mkommer.contains(e.target) && !merKn.includes(e.target)) åpneKomMer(false); });
  // tilleggene som finnes nå, flyttes inn i raden bak «Mer» når de er flere enn én (én alene står i linja)
  function fordel() { const T = KN.filter(K => K.tillegg && !K.el.hidden), samle = T.length > 1; for (const K of KN) if (K.tillegg) { const f1 = samle ? kommer : bar, f2 = samle ? mkommer : mbar; if (K.el.parentNode !== f1) f1.insertBefore(K.el, f1 === bar ? merKn[0] : null); if (K.el2.parentNode !== f2) f2.insertBefore(K.el2, f2 === mbar ? merKn[1] : null); }
    const noePå = samle && T.some(K => K.el.classList.contains('på')); for (const b of merKn) { b.hidden = !samle; b.classList.toggle('på', noePå || komMerÅpen); let m = b.querySelector('.merke'); if (samle) { if (!m) { m = document.createElement('span'); m.className = 'merke'; m.style.background = '#5a4a2a'; b.appendChild(m); } if (m.textContent !== String(T.length)) m.textContent = String(T.length); } else if (m) m.remove(); } }
  // paneler som ligger nederst eller dekker skjermen på telefon: mens ett av dem vises, viker raden
  const DEKKER = ['panel', 'leirmeny', 'folkmeny', 'krig', 'karakterark', 'tropppanel', 'stridpanel', 'sekk', 'hjelp', 'kontrollrom', 'hendelse', 'lagmeny', 'byggvalg', 'byggesett', 'alarm', 'degmeny', 'region', 'samfunnmeny', 'personkort', 'samfunnkort', 'krigpanel', 'verdenpanel', 'sjopanel', 'evpanel', 'flytkort', 'flytgruppe', 'marsjvalg', 'formkort', 'krigkort', 'etterspill'];
  const vises = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).opacity !== '0';
  // «MER»-FLISA (18. nov): ressursene skal stå på én rad. Får de ikke plass, går de minst viktige inn bak en flis «+3» som åpner resten.
  const UT = ['sHvor', 'sKrig', 'sOlje', 'sMaal', 'sStaal', 'sBetong', 'sTre', 'sFolk', 'sStrom', 'sDiesel'], ORD = { sKrig: 'Kontroll', sHvor: 'Du er' };
  const mer = document.createElement('div'); mer.id = 'flismer'; mer.dataset.ikon = 'mer'; mer.setAttribute('role', 'button'); mer.setAttribute('aria-label', 'Flere tall'); mer.dataset.tips = 'Flere tall|Tallene som ikke fikk plass på raden. Trykk for å se dem.'; const merTall = document.createElement('b'); mer.appendChild(merTall);
  const merListe = document.createElement('div'); merListe.id = 'flismerliste'; document.body.appendChild(merListe); let merSig = '', merÅpen = false;
  function fyllMer() { const S = document.querySelector('.stats'); if (!S) return; const rader = [...S.children].filter(d => d.dataset.mer && !d.hidden && !d.dataset.tom && !d.dataset.teknisk), sig = rader.map(d => d.textContent).join('|'); if (sig === merListe.dataset.sig) return; merListe.dataset.sig = sig; merListe.textContent = '';
    for (const d of rader) { const b = document.createElement('button'), o = d.querySelector('span:not([id])'), v = d.querySelector('b'); if (d.dataset.ikon) b.dataset.ikon = d.dataset.ikon; const n = document.createElement('span'); n.textContent = d.dataset.ord || (o ? o.textContent.trim() : ''); const t = document.createElement('b'); t.textContent = v ? v.textContent : ''; if (v && v.style.color) t.style.color = v.style.color; b.append(n, t); if (d.dataset.tips) b.dataset.tips = d.dataset.tips; b.onclick = () => { åpneMer(false); d.click(); }; merListe.appendChild(b); } }
  function åpneMer(på) { merÅpen = på; mer.classList.toggle('åpen', på); merListe.classList.toggle('på', på); if (på) { fyllMer(); const r = mer.getBoundingClientRect(); merListe.style.left = Math.max(6, Math.min(window.innerWidth - 230, r.left)) + 'px'; merListe.style.top = r.bottom + 5 + 'px'; } }
  mer.onclick = e => { e.stopPropagation(); åpneMer(!merÅpen); }; document.addEventListener('pointerdown', e => { if (merÅpen && !merListe.contains(e.target) && !mer.contains(e.target)) åpneMer(false); });
  function passInn() { const S = document.querySelector('.stats'); if (!S) return; if (mer.parentNode !== S) S.appendChild(mer); const barn = [...S.children].filter(d => d !== mer);
    const sig = window.innerWidth + '|' + document.body.className.length + '|' + barn.map(d => (d.hidden || d.dataset.tom || d.dataset.teknisk ? 0 : d.textContent.length)).join(','); if (sig === merSig) { if (merÅpen) fyllMer(); return; } merSig = sig;
    const enRad = () => { let t = null; for (const d of S.children) { if (!d.getClientRects().length) continue; if (t === null) t = d.offsetTop; else if (Math.abs(d.offsetTop - t) > 4) return false; } return true; };
    const sett = n => { S.dataset.trang = String(Math.min(n, 2)); let ant = 0; for (const d of barn) { const i = UT.indexOf(d.dataset.s), ut = i >= 0 && i < n - 2; if (ut) { d.dataset.mer = '1'; if (!d.hidden && !d.dataset.tom) ant++; } else delete d.dataset.mer; } mer.classList.toggle('på', ant > 0); merTall.textContent = '+' + ant; return ant; };
    let n = 0; sett(0); while (!enRad() && n < UT.length + 2) sett(++n);
    if (merÅpen) { if (!mer.classList.contains('på')) åpneMer(false); else fyllMer(); } }
  const går = () => typeof R3 !== 'undefined' && R3 && R3.fot && typeof på3d !== 'undefined' && på3d;
  function merkStats(bred) { const S = document.querySelector('.stats'); if (!S) return; for (const d of S.children) { const b = d.querySelector('b[id]') || d.querySelector('[id]'); if (!b) continue; if (d.dataset.s !== b.id) d.dataset.s = b.id;
      // «0 %» og «ute» sier ingenting alene: de får ordet sitt foran tallet (også på telefon)
      if (ORD[b.id] && d.dataset.ord !== ORD[b.id]) d.dataset.ord = ORD[b.id];
      // en flis uten tall (bare en strek) sier ingenting: den vises først når den har noe å si
      { const tom = /^[–-]?$/.test(b.textContent.trim()) ? '1' : ''; if ((d.dataset.tom || '') !== tom) { if (tom) d.dataset.tom = tom; else delete d.dataset.tom; } }
      if (!bred) { if (d.style.order) d.style.order = ''; continue; } const i = REKKE.indexOf(b.id); const o = i >= 0 ? String(i) : '50'; if (d.style.order !== o) d.style.order = o; if (TEKNISK.includes(b.id)) d.dataset.teknisk = '1';
      // ordet som er skjult i spillskjermen, står i verktøytipset
      if (!d.title && !window.FlisTips) { const o = d.querySelector('span:not([id])'); if (o && o.textContent.trim()) d.title = o.textContent.trim(); } } }
  function oppdater() { const bred = window.innerWidth >= 900 && !document.body.classList.contains('kort'); if (document.body.classList.contains('spill') !== bred) document.body.classList.toggle('spill', bred); merkStats(bred); let noen = false;
    for (const K of KN) { let f = false, p = false; try { f = !!K.fins(); p = f && !!K.på(); } catch (e) { f = false; } K.el.hidden = !f; K.el.classList.toggle('på', p); K.el2.hidden = !f; K.el2.classList.toggle('på', p); if (f) noen = true;
      if (K.merke) for (const kel of [K.el, K.el2]) { let m = ''; try { m = K.merke(); } catch (e) { m = ''; } let s = kel.querySelector('.merke'); if (m !== '' && m !== undefined) { if (!s) { s = document.createElement('span'); s.className = 'merke'; s.style.background = '#5a4a2a'; kel.appendChild(s); } if (s.textContent !== String(m)) s.textContent = String(m); } else if (s) s.remove(); } }
    // kommandolinja viker for bygging (banneret står der), for gange (egen skjerm) og for startskjermen
    // når du går, er kommandolinja borte: da står Deg (med Sekk og Utenfra under) oppe i raden som før
    const g = !!går(); if (document.body.classList.contains('gaar') !== g) document.body.classList.toggle('gaar', g);
    const bv = $('byggvalg'), bs = $('byggesett'), st = $('oppstart'), skjul = går() || (bv && getComputedStyle(bv).display !== 'none') || (bs && bs.classList.contains('på')) || (st && st.classList.contains('på')) || document.body.classList.contains('foto');
    fordel(); bar.classList.toggle('på', bred && noen && !skjul);
    // telefonen: raden nederst, og Leir/Krig/Deg tas da ut av den trange raden øverst (de står nede)
    const tlf = !bred && noen && !g && !(st && st.classList.contains('på')), mpå = tlf && !skjul && !DEKKER.some(id => vises($(id)));
    if (document.body.classList.contains('mtlf') !== tlf) document.body.classList.toggle('mtlf', tlf); if (mbar.classList.contains('på') !== mpå) { mbar.classList.toggle('på', mpå); document.body.classList.toggle('mkom', mpå); }
    if (komMerÅpen && !bar.classList.contains('på') && !mbar.classList.contains('på')) åpneKomMer(false); settKomMer(); if (bred) passInn(); else if (merÅpen) åpneMer(false); }
  setInterval(oppdater, 400); window.addEventListener('resize', oppdater); window.addEventListener('riksbrudd-spill', () => setTimeout(oppdater, 100)); oppdater();
  // «Tekniske tall» i ☰: moh., MB lastet og bilder per sekund
  { const m = $('lagmeny'); if (m) { const b = document.createElement('button'); b.id = 'tekniskknapp'; b.textContent = 'Tekniske tall'; let på = false; try { på = localStorage.getItem('riksbrudd-teknisk') === '1'; } catch (e) { på = false; } const sett = () => { document.body.classList.toggle('teknisk', på); b.textContent = 'Tekniske tall: ' + (på ? 'vises' : 'skjult'); }; b.onclick = () => { på = !på; try { localStorage.setItem('riksbrudd-teknisk', på ? '1' : '0'); } catch (e) { /* sperret */ } sett(); }; sett();
      // rett inn i gruppen «Måling» ved siden av FPS-telleren (lagt rett i menyen ordner meny.js seg i ring)
      const fps = [...m.querySelectorAll('button')].find(q => /^FPS/.test(q.textContent)); if (fps && fps.parentNode !== m) fps.parentNode.insertBefore(b, fps.nextSibling); } }
  // «Kartmerker» i ☰ (18. nov): færre merker for bruer, tunneler, kraftverk og ferjekaier som standard (INFRA_FOKUS i index.html) – her hentes alle fram
  { const m = $('lagmeny'); if (m && typeof INFRA_FOKUS !== 'undefined') { const b = document.createElement('button'); b.id = 'allemerker'; const sett = () => { b.textContent = 'Kartmerker: ' + (INFRA_FOKUS.alt ? 'alle' : 'de viktige'); b.title = 'Bruer, tunneler, kraftverk og ferjekaier: bare de som betyr noe for det du gjør, eller alle'; };
      b.onclick = () => { INFRA_FOKUS.alt = !INFRA_FOKUS.alt; try { localStorage.setItem('riksbrudd-allemerker', INFRA_FOKUS.alt ? '1' : '0'); } catch (e) { /* sperret */ } sett(); if (typeof skitten !== 'undefined') skitten = true; }; sett();
      const inf = [...m.querySelectorAll('button')].find(q => /^Infrastruktur/.test(q.textContent)); if (inf && inf.parentNode !== m) inf.parentNode.insertBefore(b, inf.nextSibling); } }
  window.SpillHud = { oppdater, aktiv: () => document.body.classList.contains('spill'), knapper: () => KN.filter(K => !K.el.hidden).map(K => K.k), bakMer: () => KN.filter(K => K.tillegg && !K.el.hidden && K.el.parentNode === kommer).map(K => K.k), åpneKomMer, FASTE, telefon: () => mbar.classList.contains('på'), mer: () => ({ antall: mer.classList.contains('på') ? +merTall.textContent : 0, åpen: merÅpen }), åpneMer, passInn: () => { merSig = ''; passInn(); } };
})();
