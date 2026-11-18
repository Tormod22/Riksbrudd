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
  const IK = { leir: "<path d='M3 20L12 5l9 15zM12 5v15M9.5 20l2.5-4.5 2.5 4.5'/>", folk: "<circle cx='9' cy='8' r='3.2'/><path d='M3 20c0-3.5 2.6-5.5 6-5.5s6 2 6 5.5'/><circle cx='17' cy='9' r='2.4'/><path d='M16 14.6c3 0 5 1.7 5 4.6'/>",
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
${Object.entries(IK).map(([n, d]) => `#kommando button[data-k="${n}"]{ --kn:${svg(d)}; }`).join('\n')}
body.spill #leirmeny, body.spill #folkmeny, body.spill #panel, body.spill #krig, body.spill #karakterark, body.spill #stridpanel, body.spill #tropppanel, body.spill #sekk, body.spill #lagmeny{ background:linear-gradient(180deg,#241c10 0,#17120a 150px); border:1px solid #8a7440; box-shadow:0 0 0 1px #0d0a06, inset 0 1px 0 rgba(255,230,160,.06), 0 12px 34px rgba(0,0,0,.65); border-radius:4px; }
body.spill #leirmeny h2, body.spill #folkmeny h2, body.spill #krig h2, body.spill #stridpanel h2, body.spill #tropppanel h2, body.spill #sekk h2, body.spill #panel h2{ font-family:"IM Fell English",serif; font-weight:400; letter-spacing:.04em; padding-bottom:5px; margin-bottom:6px; border-bottom:1px solid #5a4a2a; background:linear-gradient(90deg,rgba(201,178,106,.14),rgba(201,178,106,0) 70%); margin-left:-12px; padding-left:12px; }
body.spill #kilde{ left:auto; right:64px; bottom:calc(6px + env(safe-area-inset-bottom,0px)); max-width:min(900px,70vw); font-size:0; pointer-events:auto; cursor:help; text-align:right; }
body.spill #kilde::before{ content:'ⓘ Kilder'; font-size:11.5px; font-style:normal; letter-spacing:.04em; padding:2px 7px; background:rgba(20,16,10,.7); border:1px solid #4a4030; border-radius:3px; }
body.spill #kilde:hover{ font-size:12px; background:rgba(20,16,10,.92); border:1px solid #5a4a2a; padding:6px 9px; text-shadow:none; } body.spill #kilde:hover::before{ display:none; }
body.spill .ctl button{ background:linear-gradient(180deg,#2a2215,#17120a); border-color:#5a4a2a; border-radius:3px; }
body.spill #varsler button, body.spill #varsler > *{ border-radius:3px; }`;
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
  for (const T of window.KOMMANDO_TILLEGG || []) { KN.push(T); if (T.ikon) { const st = document.createElement('style'); st.textContent = `#kommando button[data-k="${T.k}"]{ --kn:${svg(T.ikon)}; }`; document.head.appendChild(st); } }
  for (const K of KN) { const b = document.createElement('button'); b.dataset.k = K.k; b.title = K.tittel; b.append(document.createTextNode(K.navn)); if (K.tast) { const t = document.createElement('i'); t.textContent = K.tast; b.appendChild(t); } b.onclick = e => { e.stopPropagation(); K.trykk(); oppdater(); }; K.el = b; bar.appendChild(b); }
  const går = () => typeof R3 !== 'undefined' && R3 && R3.fot && typeof på3d !== 'undefined' && på3d;
  function merkStats() { const S = document.querySelector('.stats'); if (!S) return; for (const d of S.children) { const b = d.querySelector('b[id]') || d.querySelector('[id]'); if (!b) continue; if (d.dataset.s !== b.id) d.dataset.s = b.id; const i = REKKE.indexOf(b.id); const o = i >= 0 ? String(i) : '50'; if (d.style.order !== o) d.style.order = o; if (TEKNISK.includes(b.id)) d.dataset.teknisk = '1';
      // en flis uten tall (bare en strek) sier ingenting: den vises først når den har noe å si
      const tom = /^[–-]?$/.test(b.textContent.trim()) ? '1' : ''; if ((d.dataset.tom || '') !== tom) { if (tom) d.dataset.tom = tom; else delete d.dataset.tom; }
      // ordet som er skjult i spillskjermen, står i verktøytipset
      if (!d.title) { const o = d.querySelector('span:not([id])'); if (o && o.textContent.trim()) d.title = o.textContent.trim(); } } }
  function oppdater() { const bred = window.innerWidth >= 900 && !document.body.classList.contains('kort'); if (document.body.classList.contains('spill') !== bred) document.body.classList.toggle('spill', bred); if (!bred) return; merkStats(); let noen = false;
    for (const K of KN) { let f = false, p = false; try { f = !!K.fins(); p = f && !!K.på(); } catch (e) { f = false; } K.el.hidden = !f; K.el.classList.toggle('på', p); if (f) noen = true;
      if (K.merke) { let m = ''; try { m = K.merke(); } catch (e) { m = ''; } let s = K.el.querySelector('.merke'); if (m !== '' && m !== undefined) { if (!s) { s = document.createElement('span'); s.className = 'merke'; s.style.background = '#5a4a2a'; K.el.appendChild(s); } if (s.textContent !== String(m)) s.textContent = String(m); } else if (s) s.remove(); } }
    // kommandolinja viker for bygging (banneret står der), for gange (egen skjerm) og for startskjermen
    // når du går, er kommandolinja borte: da står Deg (med Sekk og Utenfra under) oppe i raden som før
    const g = !!går(); if (document.body.classList.contains('gaar') !== g) document.body.classList.toggle('gaar', g);
    const bv = $('byggvalg'), bs = $('byggesett'), st = $('oppstart'), skjul = går() || (bv && getComputedStyle(bv).display !== 'none') || (bs && bs.classList.contains('på')) || (st && st.classList.contains('på')) || document.body.classList.contains('foto');
    bar.classList.toggle('på', noen && !skjul); }
  setInterval(oppdater, 400); window.addEventListener('resize', oppdater); window.addEventListener('riksbrudd-spill', () => setTimeout(oppdater, 100)); oppdater();
  // «Tekniske tall» i ☰: moh., MB lastet og bilder per sekund
  { const m = $('lagmeny'); if (m) { const b = document.createElement('button'); b.id = 'tekniskknapp'; b.textContent = 'Tekniske tall'; let på = false; try { på = localStorage.getItem('riksbrudd-teknisk') === '1'; } catch (e) { på = false; } const sett = () => { document.body.classList.toggle('teknisk', på); b.textContent = 'Tekniske tall: ' + (på ? 'vises' : 'skjult'); }; b.onclick = () => { på = !på; try { localStorage.setItem('riksbrudd-teknisk', på ? '1' : '0'); } catch (e) { /* sperret */ } sett(); }; sett();
      // rett inn i gruppen «Måling» ved siden av FPS-telleren (lagt rett i menyen ordner meny.js seg i ring)
      const fps = [...m.querySelectorAll('button')].find(q => /^FPS/.test(q.textContent)); if (fps && fps.parentNode !== m) fps.parentNode.insertBefore(b, fps.nextSibling); } }
  window.SpillHud = { oppdater, aktiv: () => document.body.classList.contains('spill'), knapper: () => KN.filter(K => !K.el.hidden).map(K => K.k) };
})();
