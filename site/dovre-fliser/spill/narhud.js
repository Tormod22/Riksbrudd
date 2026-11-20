/* Riksbrudd – BEDRE SKJERMBILDE (16. nov, brukeren: «bedre UI … både i førsteperson og de andre kameravinklene»).
 * Etter råd om skjermbilder i slike spill: lite på skjermen, det viktigste i faste hjørner, og det som ikke trengs akkurat nå, tones ned.
 *  - Når du går selv: helse og utholdenhet nede til venstre, våpen og ammunisjon nede til høyre, våpenfeltene 1–4 nede i midten,
 *    og våpenet du har framme synlig i hånda (rekyl når du skyter, senkes når du lader). Alt tones ned når du er frisk og i ro.
 *  - I kjøretøy: farten stort nede til høyre, kjøretøyets tilstand, og høyden over bakken for helikopteret.
 *  - I kartet og ovenfra: varselbrikker øverst til venstre (angrep, oppdrag, bygg uten strøm, strøm/vann som svikter, lite mat, lav moral)
 *    som kan trykkes – brikken tar deg dit det gjelder.
 * Tegner ikke noe i lerretet: alt er vanlige elementer, så de følger skriften og fargene ellers. window.NarHud.
 */
(function () {
  'use strict';
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null), $ = id => document.getElementById(id);
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const css = document.createElement('style');
  css.textContent = `#nhud{ position:fixed; inset:0; z-index:4; pointer-events:none; display:none; font-family:inherit; color:#f0e2b0; transition:opacity .6s; } #nhud.på{ display:block; } #nhud.rolig{ opacity:.5; }
#nhud .boks{ position:absolute; background:rgba(18,15,10,.62); border:1px solid rgba(201,178,106,.45); padding:6px 10px; }
#nhud .helse{ left:14px; bottom:calc(44px + env(safe-area-inset-bottom,0px)); width:190px; } #nhud .helse .rad{ display:flex; align-items:center; gap:7px; font-size:14px; } #nhud .helse .rad b{ min-width:30px; text-align:right; font-size:17px; }
#nhud .strek{ flex:1; height:8px; background:rgba(0,0,0,.5); } #nhud .strek i{ display:block; height:100%; background:#9fc46a; transition:width .2s; } #nhud .strek.lav i{ background:#e0604a; } #nhud .puste{ height:3px; margin-top:5px; } #nhud .puste i{ background:#d8cfae; }
#nhud .vapen{ right:282px; bottom:calc(44px + env(safe-area-inset-bottom,0px)); min-width:150px; text-align:right; } #nhud .vapen small{ display:block; font-size:12.5px; color:#cfc6a8; letter-spacing:.04em; } #nhud .vapen b{ font-size:30px; line-height:1; } #nhud .vapen span{ font-size:16px; color:#cfc6a8; } #nhud .vapen em{ display:block; font-style:normal; font-size:12px; color:#e8a46a; min-height:14px; }
#nhud .felt{ left:50%; transform:translateX(-50%); bottom:calc(40px + env(safe-area-inset-bottom,0px)); display:flex; gap:5px; padding:4px; } #nhud .felt div{ min-width:66px; padding:3px 7px; border:1px solid rgba(231,220,195,.25); font-size:12px; color:#bdb497; text-align:center; } #nhud .felt div b{ display:block; font-size:10px; color:#8f8870; } #nhud .felt div.aktiv{ border-color:#c9b26a; color:#f0e2b0; background:rgba(201,178,106,.16); }
#nhud .tilstand{ height:5px; margin-top:4px; }
body.kort #nhud .helse{ left:auto; right:12px; bottom:auto; top:calc(var(--topp,44px) + 176px); width:118px; padding:4px 7px; } body.kort #nhud .helse .rad{ font-size:12px; } body.kort #nhud .helse .rad b{ font-size:14px; min-width:24px; }
body.kort #nhud .vapen{ right:12px; bottom:auto; top:calc(var(--topp,44px) + 222px); min-width:118px; padding:4px 7px; } body.kort #nhud .vapen b{ font-size:21px; } body.kort #nhud .vapen span{ font-size:13px; } body.kort #nhud .felt{ display:none; }
#nhud .vapen .vbilde{ display:block; width:86px; height:40px; margin:-4px 0 -2px auto; object-fit:contain; opacity:.92; } body.kort #nhud .vapen .vbilde{ width:60px; height:26px; }
body.foto #nhud, body.foto #varsler{ display:none !important; }
#varsler{ position:fixed; left:10px; top:calc(var(--topp,58px) + 8px); z-index:6; display:flex; flex-direction:column; gap:5px; align-items:flex-start; max-width:min(320px,70vw); }
#varsler button{ pointer-events:auto; display:flex; align-items:center; gap:7px; background:rgba(22,18,12,.9); border:1px solid #6a5f42; border-left:4px solid #c9b26a; color:var(--ink,#e7dcc3); font:inherit; font-size:13.5px; padding:4px 10px 4px 8px; min-height:30px; cursor:pointer; text-align:left; }
#varsler .rad{ display:flex; flex-wrap:wrap; gap:5px; align-items:stretch; } #varsler .rad > button:first-child span{ white-space:nowrap; } #varsler button.handling{ border-left-color:#9fc46a; font-weight:600; white-space:nowrap; }
#varsler button.fare{ border-left-color:#e0604a; } #varsler button.god{ border-left-color:#9fc46a; } #varsler button small{ color:var(--ink-dim,#a99); }
body.kort #varsler{ top:auto; bottom:calc(74px + env(safe-area-inset-bottom,0px)); max-width:62vw; } body.kort #varsler button{ font-size:12px; min-height:28px; padding:3px 8px 3px 6px; } body.kort.gaar #varsler, body.bygger2d #varsler{ display:none; }`;
  document.head.appendChild(css);
  // RUNDE 6 (19. nov, kritikerne om gåmodus): (1) PC: venstreraden («Flaske …», «Legg deg ned», «Lag noe») sto midt i bildet oppå navnelappene
  // i 3D – den står nå nede til venstre over helsa; (2) PC: våpenruta litt lenger fra minikartet; (3) telefon: «Sett deg inn i feltbilen»
  // lå under våpenbyttet («Automatgevær») – den står høyere; (4) telefon: knapperaden øverst var bredere enn skjermen (3D-knappen kuttet i
  // venstre kant) – Krig er borte mens du går (den viser uansett 2D-kartet) og knappene er litt smalere; (5) telefon: loggen la seg over
  // «Flaske …» – raden står lenger ned. Tallene er Claudes forslag.
  const css6 = document.createElement('style');
  css6.textContent = `body.gaar:not(.kort) #evrad{ top:auto; bottom:calc(98px + env(safe-area-inset-bottom,0px)); }
body.gaar:not(.kort) #nhud .vapen{ right:296px; }
body.kort.gaar:not(.tlfligg):not(.kjorer) #kjorknapp:not(.x){ bottom:calc(272px + env(safe-area-inset-bottom,0px)); }
body.kort.smal.gaar .knapper #krigknapp{ display:none; } body.kort.smal.gaar .knapper button{ min-width:33px; padding:0 5px; } body.kort.smal.gaar .knapper{ gap:3px; }
body.kort.gaar #evrad{ top:calc(var(--topp,40px) + 158px); }`;
  document.head.appendChild(css6);
  // (runde 6) navnelappene i 3D tegnes ikke under rutene på skjermen (de lå under «Flaske …», helsa og våpenruta): hullene i klippingen
  // i tegn3d (index.html). Rutene som overlapper hverandre, slås ikke sammen – de står hver for seg (målt: ingen overlapp).
  const HULL = ['#evrad > *', '#nhud .helse', '#nhud .vapen', '#nhud .felt', '#kjorknapp', '#byttvapen', '#minikart', '#logg > div', '#letknapp', '#innelapp'];
  setInterval(() => { const i3 = typeof på3d !== 'undefined' && på3d, topp = window.UI_TOPP3D || 0, ut = [];
    if (i3) for (const s of HULL) for (const e of document.querySelectorAll(s)) { if (!e.getClientRects().length) continue; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity < .05) continue;
      const r = e.getBoundingClientRect(), y0 = Math.max(topp, r.top - 4), y1 = r.bottom + 4; if (r.width > 2 && y1 > y0) ut.push([Math.round(r.left - 4), Math.round(y0), Math.round(r.width + 8), Math.round(y1 - y0)]); }
    window.UI_HULL3D = ut; }, 400);
  // RUNDE 10 (20. nov, brukerens iPhone liggende i gåmodus): (1) knapperaden øverst hadde ti knapper – på telefon står nå bare Gå, Deg,
  // ☰, pause og farten, resten (3D, Leir, Krig, ⏭, ? og det andre legger til) ligger bak «⋯»; (2) «Flaske …»/«Lag noe» lå over styrespaken –
  // raden står øverst til venstre (ved siden av kompasset) og loggen rett under den; (3) «Sett deg inn i feltbilen» sto midt i bildet – den
  // står nede til høyre over Huk/Hopp; (4) helse- og våpenruta lå oppå armen og våpenet – de står små til høyre for styrespaken.
  // Bare når du går (ikke når du kjører – de knappene hører til kjøringen). Tallene er Claudes forslag.
  const BEHOLD = ['gaaknapp', 'karakterknapp', 'meny', 'sp0', 'sp1', 'sp2', 'sp3', 'sp4', 'gaamer'];
  const L = 'env(safe-area-inset-left,0px)', Rt = 'env(safe-area-inset-right,0px)', Bn = 'env(safe-area-inset-bottom,0px)';
  const css10 = document.createElement('style');
  css10.textContent = `#gaamer{ display:none; } body.gaarydd #gaamer{ display:inline-block; font-size:17px; letter-spacing:1px; } body.gaarydd.gaamer #gaamer{ border-color:#e8d48a; color:#fff3c8; }
body.gaarydd:not(.gaamer) .knapper > ${BEHOLD.map(id => `:not(#${id})`).join('')}{ display:none; }
body.kort.tlfligg.gaar:not(.kjorer) #evrad{ top:calc(var(--topp,40px) + 6px); left:calc(8px + ${L}); flex-direction:row; flex-wrap:wrap; align-items:center; max-width:min(186px, 24vw); }
body.kort.tlfligg.gaar:not(.kjorer) #evrad .lapp{ font-size:11.5px; padding:2px 6px; } body.kort.tlfligg.gaar:not(.kjorer) #evrad button{ min-height:30px; font-size:11.5px; padding:1px 7px; }
body.kort.tlfligg.gaar:not(.kjorer) #kilde:not(.åpen){ max-width:136px; } body.kort.tlfligg.gaar #logg{ width:min(186px, 24vw); font-size:11.5px; } body.kort.tlfligg.gaar #logg div:nth-child(n+3){ display:none; } body.kort.tlfligg.gaar #logg div{ -webkit-line-clamp:2; }
html body.kort.tlfligg.gaar:not(.kjorer) #kjorknapp{ left:auto; right:calc(10px + ${Rt}); top:auto; bottom:calc(66px + ${Bn}); transform:none; min-width:0; max-width:250px; min-height:40px; padding:4px 12px; font-size:14px; white-space:nowrap; }
html body.kort.tlfligg.gaar:not(.kjorer) #nhud .helse{ left:calc(152px + ${L}); right:auto; transform:none; margin:0; top:auto; bottom:calc(8px + ${Bn}); width:150px; box-sizing:border-box; padding:3px 7px; }
html body.kort.tlfligg.gaar:not(.kjorer) #nhud .vapen{ left:calc(152px + ${L}); right:auto; transform:none; margin:0; top:auto; bottom:calc(46px + ${Bn}); width:150px; min-width:0; box-sizing:border-box; padding:3px 7px; text-align:left; }
body.kort.tlfligg.gaar:not(.kjorer) #nhud .vapen .vbilde{ float:right; width:46px; height:24px; margin:1px 0 0 4px; } body.kort.tlfligg.gaar:not(.kjorer) #nhud .vapen small{ font-size:11px; }
body.kort.gaar #kilde{ display:none; }
/* RUNDE 12 (21. nov, kritiker E: «grensesnittet i gåmodus dekker det meste»): kildeteksten står i ☰ når du går på telefon, helse- og
   våpenruta er mindre (120 px), våpenbyttet en liten knapp, og «Gå ut»/«Gå inn» står nede til høyre over Huk/Hopp – ikke oppå minikartet. */
html body.kort.tlfligg.gaar:not(.kjorer) #nhud .helse, html body.kort.tlfligg.gaar:not(.kjorer) #nhud .vapen{ width:122px; padding:2px 6px; }
html body.kort.tlfligg.gaar:not(.kjorer) #nhud .vapen{ bottom:calc(38px + ${Bn}); } body.kort.tlfligg.gaar:not(.kjorer) #nhud .vapen .vbilde{ width:36px; height:18px; }
body.kort.tlfligg.gaar:not(.kjorer) #nhud .vapen small{ display:none; } body.kort.tlfligg.gaar:not(.kjorer) #byttvapen{ min-height:30px; padding:2px 8px; font-size:11px; opacity:.85; }
html body.kort.tlfligg.gaar:not(.kjorer) #dorknapp{ left:auto; right:calc(10px + ${Rt}); top:auto; bottom:calc(66px + ${Bn}); transform:none; min-height:40px; padding:4px 14px; font-size:14px; }
html body.kort.tlfligg.gaar:not(.kjorer):has(#kjorknapp.på) #dorknapp{ bottom:calc(116px + ${Bn}); }
body.kort.tlfligg.gaar:not(.kjorer) #nhud .vapen b{ font-size:16px; } body.kort.tlfligg.gaar:not(.kjorer) #nhud .vapen span{ font-size:12px; } body.kort.tlfligg.gaar:not(.kjorer) #nhud .vapen em{ font-size:11px; min-height:0; }`;
  document.head.appendChild(css10);
  { const rad = document.querySelector('.knapper'), m = document.createElement('button'); m.id = 'gaamer'; m.type = 'button'; m.textContent = '⋯'; m.title = 'Flere knapper'; m.setAttribute('aria-label', 'Flere knapper'); m.setAttribute('aria-expanded', 'false');
    const sett = på => { document.body.classList.toggle('gaamer', på); m.setAttribute('aria-expanded', String(på)); };
    m.onclick = e => { e.stopPropagation(); sett(!document.body.classList.contains('gaamer')); };
    if (rad) { rad.appendChild(m); rad.addEventListener('click', e => { if (e.target !== m && document.body.classList.contains('gaamer')) setTimeout(() => sett(false), 0); }); }
    document.addEventListener('pointerdown', e => { if (document.body.classList.contains('gaamer') && rad && !rad.contains(e.target)) sett(false); });
    // loggen rett under raden øverst til venstre; slutter du å gå, settes alt tilbake
    setInterval(() => { const b = document.body, lg = $('logg'), ev = $('evrad'), på = b.classList.contains('kort') && b.classList.contains('tlfligg') && b.classList.contains('gaar') && !b.classList.contains('kjorer');
      if (!b.classList.contains('gaar') && b.classList.contains('gaamer')) sett(false);
      // i testene (navigator.webdriver) står alle knappene som før, til NarHud.test = true
      const rydd = b.classList.contains('kort') && b.classList.contains('gaar') && (!navigator.webdriver || (window.NarHud && NarHud.test === true)); if (b.classList.contains('gaarydd') !== rydd) b.classList.toggle('gaarydd', rydd);
      if (!lg) return; if (!på) { if (lg.dataset.r10) { lg.style.removeProperty('top'); delete lg.dataset.r10; } return; }
      const y = ev && ev.getClientRects().length ? Math.round(ev.getBoundingClientRect().bottom + 6) : null; if (y === null) { if (lg.dataset.r10) { lg.style.removeProperty('top'); delete lg.dataset.r10; } return; }
      if (lg.style.getPropertyValue('top') !== y + 'px') lg.style.setProperty('top', y + 'px', 'important'); lg.dataset.r10 = '1'; }, 300); }
  // ---------- skjermbildet når du går eller kjører ----------
  const hud = el('div', { id: 'nhud' }), hp = el('i'), hpTall = el('b', {}, '100'), hpStrek = el('div', { klasse: 'strek' }, hp), pust = el('i'), kjHp = el('i');
  const helse = el('div', { klasse: 'boks helse' }, el('div', { klasse: 'rad' }, el('span', { 'data-ikon': 'hjerte' }), hpStrek, hpTall), el('div', { klasse: 'strek puste' }, pust));
  const vNavn = el('small'), vTall = el('b'), vRes = el('span'), vHint = el('em'), vTil = el('div', { klasse: 'strek tilstand' }, kjHp), vBilde = el('img', { klasse: 'vbilde', alt: '' }), vapen = el('div', { klasse: 'boks vapen' }, vBilde, vNavn, vTall, vRes, vHint, vTil), felt = el('div', { klasse: 'boks felt' });
  hud.append(helse, vapen, felt); document.body.appendChild(hud);
  const sett = (e, t) => { if (e.textContent !== t) e.textContent = t; };
  let sistEndret = 0, forrigeHp = 100, feltNøkkel = '';
  function tegnHud() { const Q = r3(), går = !!(Q && Q.fot && typeof på3d !== 'undefined' && på3d), SS = window.SpilletSpill, K = SS && SS.klar && SS.klar() ? SS.K() : null; hud.classList.toggle('på', går && !!K); document.body.classList.toggle('gaar', går); if (!går || !K) return;
    const nå = performance.now(), h = Math.max(0, Math.round(K.hp)), kr = window.Gange && Gange.kropp && Gange.kropp(), fører = window.KjorSpill && KjorSpill.fører(), U = window.UtstyrSpill && UtstyrSpill.klar() ? UtstyrSpill : null;
    if (h !== forrigeHp) { forrigeHp = h; sistEndret = nå; } hp.style.width = h + '%'; hpStrek.classList.toggle('lav', h <= 40); sett(hpTall, String(h)); pust.style.width = Math.round((kr ? kr.utholdenhet : 1) * 100) + '%';
    if (fører) { vBilde.style.display = 'none'; const fart = fører.type === 'bil' ? Math.abs(fører.v) : Math.hypot(fører.vx, fører.vy); sett(vNavn, fører.kj ? fører.kj.navn : fører.type === 'bil' ? 'Feltbil' : 'Helikopter'); sett(vTall, String(Math.round(fart * 3.6))); sett(vRes, ' km/t');
      sett(vHint, fører.type === 'heli' ? (fører.rotor < .9 ? `rotoren spoler opp ${Math.round(fører.rotor / .9 * 100)} %` : `${Math.round(Math.max(0, fører.over || 0))} m over bakken`) : fører.v < -.3 ? 'rygger' : ''); vTil.style.display = fører.kj ? 'none' : ''; kjHp.style.width = Math.round((fører.hp === undefined ? 1 : fører.hp) * 100) + '%'; vTil.classList.toggle('lav', fører.hp < .4); felt.style.display = 'none'; sistEndret = nå; }
    else { const A = U ? U.aktivt() : null; vTil.style.display = 'none';
      // en liten tegning av våpenet du har framme (spill/tegninger.js)
      { const vid = A && A.v ? A.v.id : 'gevær'; if (window.Tegninger && vBilde.dataset.v !== vid) { vBilde.dataset.v = vid; vBilde.src = Tegninger.bilde(Tegninger.våpen(vid)); } vBilde.style.display = window.Tegninger ? '' : 'none'; } sett(vNavn, A ? A.def.navn : 'Gevær'); sett(vTall, String(K.mag)); sett(vRes, ' / ' + K.res); sett(vHint, nå < K.lader ? 'lader …' : K.mag === 0 ? (K.res ? 'tomt – R lader' : 'tom for ammunisjon') : '');
      if (nå - K.sist < 3000 || nå < K.lader || nå - K.skadd < 4000) sistEndret = nå;
      // våpenfeltene 1–4
      const I = U ? U.tilstand() : null, nøkkel = I ? I.våpen.map(w => w.id + w.mag).join() + '|' + I.aktiv : ''; felt.style.display = I && I.våpen.length > 1 ? '' : 'none';
      if (I && nøkkel !== feltNøkkel) { feltNøkkel = nøkkel; felt.innerHTML = ''; I.våpen.forEach((w, n) => felt.append(el('div', { klasse: n === I.aktiv ? 'aktiv' : '' }, el('b', {}, String(n + 1)), Utstyr.VÅPEN[w.id].navn))); } }
    // tones ned når du er frisk, uthvilt og ikke har gjort noe på noen sekunder
    hud.classList.toggle('rolig', h >= 100 && (!kr || kr.utholdenhet > .98) && nå - sistEndret > 5000); }
  setInterval(tegnHud, 100);

  // ---------- våpenet i hånda (førsteperson) ----------
  // Kameraets rom: x mot høyre, y opp, −z framover. Hvert våpen er noen få klosser; hånda holder rundt grepet.
  let vm = null;
  // RUNDE 7 (20. nov, kritikerne: «geværet er en kantete kloss»): våpenet er bygget av avrundede former med myke normaler (kapsler og
  // dreide profiler fra spill/figur3d.js): kasse og forskjefte med runde kanter, rundt løp med munningsbrems, kolbe som vider seg ut mot
  // en gummiplate, skrått pistolgrep, avtrekker i bøyle, buet magasin, korn med vinger og hullsikte (rifla har kikkert på ringer, hagla
  // pumpe og rørmagasin, pistolen sleide). Hansken har avrundet håndflate, fingre rundt grepet og tommel; ermet er rundt med mansjett.
  // Kameraets rom: x mot høyre, y opp, −z framover.
  function vmGeo(id) { if (!window.Figur3d || !window.MODELLER) return null;
    const d = [], Fo = Figur3d.form, st = [.13, .13, .14], st2 = [.2, .2, .21], blank = [.34, .35, .36], tre = [.36, .25, .15], tre2 = [.28, .19, .11], svart = [.07, .07, .075], hans = [.3, .27, .24], hans2 = [.25, .22, .19], erme = [.3, .36, .26], erme2 = [.24, .29, .2];
    const farg = (g, c) => { if (g.attributes.uv) g.deleteAttribute('uv'); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let q = 0; q < n; q++) f.set(c, q * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); return g; };
    // kapsel langs z (fra z0 til z1), ovalt tverrsnitt (sx, sy), vippet rx om x-aksen; kapsel langs y (loddrett) med tverrsnitt sx, sz
    const kz = (x, y, z0, z1, r0, r1, c, sx = 1, sy = 1, rx = 0, seg = 10, ender = 2) => { const g = Fo.kapsel(seg, r0, r1, z0, z1, sx, sy, ender); if (rx) { g.translate(0, 0, -(z0 + z1) / 2); g.rotateX(rx); g.translate(0, 0, (z0 + z1) / 2); } g.translate(x, y, 0); return farg(g, c); };
    const ky = (x, y0, y1, z, r0, r1, c, sx = 1, sz = 1, rx = 0, seg = 8) => { const g = Fo.kapsel(seg, r0, r1, y0, y1, sx, sz, 2); g.rotateX(-Math.PI / 2); if (rx) { g.translate(0, -(y0 + y1) / 2, 0); g.rotateX(rx); g.translate(0, (y0 + y1) / 2, 0); } g.translate(x, 0, z); return farg(g, c); };
    // dreid profil [[radius, z], ...] langs z
    const pz = (x, y, prof, c, sx = 1, sy = 1, rx = 0, seg = 12) => { const g = Fo.dreid(seg, prof, sx, sy); if (rx) g.rotateX(rx); g.translate(x, y, 0); return farg(g, c); };
    // kapsel fra punkt A til punkt B (ermene går ned og ut av bildet mot albuen)
    const kab = (A, B, r0, r1, c, seg = 12) => { const v = new THREE.Vector3(B[0] - A[0], B[1] - A[1], B[2] - A[2]), l = v.length(), g = Fo.kapsel(seg, r0, r1, 0, l, 1, 1, 1); g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), v.normalize()))); g.translate(A[0], A[1], A[2]); return farg(g, c); };
    const kule = (x, y, z, r, c, sx = 1, sy = 1, sz = 1, seg = 10) => { const g = new THREE.SphereGeometry(r, seg, Math.max(4, seg - 3)); g.scale(sx, sy, sz); g.translate(x, y, z); return farg(g, c); };
    const V = { pistol: { løp: .1, kolbe: 0, mag: .09, tykk: .03 }, mp: { løp: .16, kolbe: .12, mag: .16, tykk: .04 }, gevær: { løp: .3, kolbe: .24, mag: .13, tykk: .045 }, hagle: { løp: .36, kolbe: .26, mag: 0, tykk: .05, tre: true }, rifle: { løp: .46, kolbe: .28, mag: .06, tykk: .045, tre: true, kikkert: true } }[id] || { løp: .3, kolbe: .24, mag: .13, tykk: .045 };
    const T = V.tykk, L = V.løp, sk = V.tre ? tre : st, sk2 = V.tre ? tre2 : st2, ende = -.18 - L;
    if (id === 'pistol') {
      // sleiden med avrundede kanter og riller bak, rammen under, løpsmunning, sikter, skrått grep med plater, bøyle og avtrekker
      kz(0, .014, -.205, -.005, .016, .016, st, T / .034, 1.15, 0, 10, 1); kz(0, -.008, -.19, -.02, .013, .013, st2, T / .03, 1, 0, 8, 1);
      for (let q = 0; q < 4; q++) kz(0, .016, -.03 + q * .007, -.028 + q * .007, .0175, .0175, st2, T / .034, 1.12, 0, 8, 1);
      kz(0, .012, -.215, -.205, .0075, .0075, blank, 1, 1, 0, 8, 1); kz(0, .034, -.195, -.185, .003, .003, st2, 1, 1.4, 0, 6, 1); kz(0, .034, -.012, -.004, .004, .004, st2, 2.5, 1.2, 0, 6, 1);
      ky(0, -.115, -.02, -.016, .02, .021, st2, T / .042, 1.15, -.2); for (const sx of [-1, 1]) ky(sx * T * .42, -.105, -.03, -.016, .012, .013, [.1, .09, .085], .35, 1.25, -.2);
      kz(0, -.03, -.08, -.04, .004, .004, st, 1, 1, 0, 6, 1); ky(0, -.035, -.022, -.075, .004, .004, st, 1, 1, 0, 6); ky(0, -.036, -.022, -.058, .003, .003, blank, 1, 1, .3, 6); }
    else {
      // kassa: avrundet, litt høyere enn den er bred, med skinne på toppen, utkasterluke og ladegrep
      kz(0, 0, -.17, .01, .027, .027, st, T / .054, 1.25, 0, 10, 2); kz(0, .036, -.17, .0, .006, .006, st2, T / .02, .9, 0, 6, 1);
      kz(T / 2 + .001, .008, -.115, -.065, .007, .007, blank, .3, 1.3, 0, 6, 1); kz(T / 2 + .007, .014, -.05, -.038, .006, .006, st2, 1, 1, 0, 6, 1);
      // løpet med munningsbrems (to riller), forskjeftet (eller pumpa og rørmagasinet på hagla)
      pz(0, .012, [[.0095, -.18], [.0095, ende + .03], [.012, ende + .028], [.014, ende + .01], [.014, ende - .012], [.009, ende - .014]], st2, 1, 1, 0, 12);
      for (let q = 0; q < 2; q++) kz(0, .012, ende - .008 + q * .012, ende - .004 + q * .012, .0145, .0145, svart, 1, 1, 0, 10, 1);
      if (id === 'hagle') { kz(0, -.014, -.2, -.2 - L * .82, .0095, .0095, st2, 1, 1, 0, 10, 1); pz(0, -.012, [[.022, -.2 - L * .2], [.03, -.21 - L * .2], [.031, -.2 - L * .5], [.022, -.21 - L * .5]], tre, T / .06, 1.3, 0, 12);
        for (let q = 0; q < 6; q++) kz(0, -.012, -.22 - L * .23 - q * L * .045, -.215 - L * .23 - q * L * .045, .0315, .0315, tre2, T / .06, 1.32, 0, 10, 1); kule(0, .028, ende + .012, .005, [.8, .7, .3], 1, 1, 1, 6); }
      else { pz(0, -.006, [[.02, -.17], [.029, -.18], [.03, -.2 - L * .3], [.028, -.2 - L * .6], [.02, -.21 - L * .62]], sk, T / .062, 1.18, 0, 12);
        for (let q = 0; q < 5; q++) kz(0, -.004, -.2 - L * .08 - q * L * .11, -.2 - L * .05 - q * L * .11, .031, .031, V.tre ? tre2 : svart, T / .064, .5, 0, 8, 1); }
      // sikter: korn med vinger foran og hullsikte bak – rifla har kikkert på ringer
      if (V.kikkert) { pz(0, .066, [[.019, .025], [.02, .015], [.016, -.0], [.016, -.19], [.021, -.205], [.023, -.235], [.02, -.24]], st, 1, 1, 0, 14);
        kz(0, .066, -.241, -.239, .019, .019, [.25, .4, .55], 1, 1, 0, 12, 1); kz(0, .066, .023, .026, .016, .016, [.2, .3, .4], 1, 1, 0, 12, 1);
        for (const z of [-.15, -.05]) { ky(0, .03, .05, z, .01, .01, st2, 1.4, .8); kz(0, .066, z - .007, z + .007, .019, .019, st2, 1, 1, 0, 12, 1); } ky(0, .08, .095, -.1, .008, .008, st2); kz(.024, .066, -.106, -.094, .008, .008, st2, 1, 1, 0, 8, 1);
        kz(T / 2 + .015, .006, -.035, -.025, .007, .007, blank, 2.2, .6, 0, 6, 1); kule(T / 2 + .032, .006, -.03, .009, blank, 1, 1, 1, 8); }
      else { ky(0, .02, .05, ende + .03, .003, .003, st, 1, 1, 0, 6); for (const sx of [-1, 1]) ky(sx * .011, .018, .046, ende + .03, .003, .004, st, .8, 2.2, 0, 6);
        kz(0, .046, -.016, -.004, .012, .012, st, 1, .9, 0, 10, 1); kz(0, .046, -.018, -.002, .004, .004, svart, 1, 1, 0, 8, 1); }
      // kolbe som vider seg ut bakover med gummiplate og kinnstøtte, pistolgrep, bøyle og avtrekker
      if (V.kolbe) { const K = V.kolbe; pz(0, -.02, [[.022, .0], [.024, .03], [.03, K * .55], [.036, K * .9], [.038, K - .008], [.034, K]], sk, T * .82 / .07, 1.25, -.06, 12);
        kz(0, -.03, .02 + K - .01, .02 + K + .012, .036, .036, svart, T * .86 / .07, 1.3, -.06, 10, 1); kz(0, .012, .04 + K * .25, .02 + K * .8, .009, .01, sk2, T * .6 / .02, 1, 0, 8, 1); }
      ky(0, -.115, -.02, -.016, .019, .02, sk, T * .8 / .04, 1.15, -.25);
      kz(0, -.032, -.09, -.04, .004, .004, st, 1, 1, 0, 6, 1); ky(0, -.034, -.024, -.093, .0035, .0035, st, 1, 1, 0, 6); ky(0, -.036, -.022, -.062, .003, .003, blank, 1, 1, .3, 6);
      if (V.mag) { const m = V.mag; ky(0, -.03 - m * .6, -.025, -.106, .02, .02, st2, T * .7 / .04, 1.15, .08, 8); ky(0, -.03 - m * 1.02, -.03 - m * .52, -.114 - m * .07, .02, .02, st2, T * .7 / .04, 1.15, .3, 8);
        ky(0, -.04 - m * 1.06, -.03 - m * 1.0, -.12 - m * .13, .021, .021, st, T * .74 / .04, 1.2, .3, 8); } }
    // hansken: avrundet håndflate rundt grepet, fire fingre og tommel, knokevern; ermet rundt med mansjett
    kule(.006, -.085, -.02, .04, hans, .85, 1.15, 1.05); for (let q = 0; q < 4; q++) kz(.008, -.062 - q * .019, -.07, -.04, .0105, .0095, hans2, 3.2, .95, 0, 8, 1);
    ky(-.03, -.07, -.035, -.025, .012, .011, hans2, 1, 1.2, .5, 8); kz(.006, -.058, .012, .028, .03, .03, [.16, .16, .17], 1.15, .8, 0, 10, 1);
    kab([.02, -.1, .0], [.1, -.32, .22], .036, .043, erme); kab([.016, -.094, -.012], [.024, -.114, .012], .041, .041, erme2);
    if (id !== 'pistol') { const z = -.24 - L * .3;
      // venstre hånd under forskjeftet
      kule(-.018, -.046, z, .038, hans, 1.05, .9, 1.15); for (let q = 0; q < 4; q++) kz(.02, -.02, z - .032 + q * .02, z - .015 + q * .02, .0105, .0095, hans2, 1.1, 1.6, 0, 8, 1); ky(-.035, -.03, -.005, z + .025, .011, .01, hans2, 1, 1.3, 0, 8);
      kab([-.035, -.07, z + .045], [-.3, -.4, z + .26], .034, .041, erme); kab([-.03, -.063, z + .033], [-.042, -.08, z + .06], .039, .039, erme2); }
    return MODELLER.samle(d); }
  KROKER.ramme3d.push(R => { if (typeof THREE === 'undefined' || !R.cam) return; const U = window.UtstyrSpill && UtstyrSpill.klar() ? UtstyrSpill : null, SS = window.SpilletSpill, K = SS && SS.K ? SS.K() : null, går = !!R.fot && !(window.KjorSpill && KjorSpill.fører());
    if (!vm) { if (!U || !går) return; if (!R.cam.parent) R.scene.add(R.cam); vm = { g: new THREE.Group(), id: '', mesh: null, mat: new THREE.MeshLambertMaterial({ vertexColors: true }) }; R.cam.add(vm.g); }
    if (vm.g.parent !== R.cam) { if (!R.cam.parent) R.scene.add(R.cam); R.cam.add(vm.g); }
    vm.g.visible = går && !!U && !document.body.classList.contains('foto') && !window.TREDJE && !(window.MoblerSpill && MoblerSpill.hender()); if (!vm.g.visible) return;
    const id = U.aktivt().v.id; if (id !== vm.id) { if (vm.mesh) { vm.g.remove(vm.mesh); vm.mesh.geometry.dispose(); } let geo = null; try { geo = vmGeo(id); } catch (e) { geo = null; } vm.id = id; vm.mesh = geo ? new THREE.Mesh(geo, vm.mat) : null; if (vm.mesh) { vm.mesh.frustumCulled = false; vm.mesh.renderOrder = 5; vm.g.add(vm.mesh); } vm.bytte = performance.now(); }
    const nå = performance.now(), kr = window.Gange && Gange.kropp && Gange.kropp(), fart = kr ? Math.min(6, kr.fart || 0) : 0, rek = K ? Math.max(0, 1 - (nå - K.sist) / 130) : 0, lader = K && nå < K.lader ? 1 : 0, opp = Math.min(1, (nå - (vm.bytte || 0)) / 250), smal = VW < 700 ? .8 : 1;
    vm.ned = (vm.ned || 0) + ((lader ? 1 : 0) - (vm.ned || 0)) * .15;
    // lite og nede til høyre, så det ikke dekker det du ser på eller tallene i hjørnet
    vm.g.scale.setScalar(.62); vm.g.position.set(.2 * smal + Math.sin(nå / 190) * .003 * fart, -.2 - vm.ned * .14 - (1 - opp) * .2 + Math.abs(Math.sin(nå / 190)) * .004 * fart, -.5 + rek * .03); vm.g.rotation.set(rek * .07 - vm.ned * .5, .09, 0); });

  // ---------- varselbrikkene i kartet og ovenfra ----------
  const varsler = el('div', { id: 'varsler' }); document.body.appendChild(varsler); let brikkeNøkkel = '';
  const meter = d => (d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d / 10) * 10 + ' m');
  function gåTil(x, y, m) { if (typeof på3d !== 'undefined' && på3d) return false; kam.x = x; kam.y = y; kam.m = Math.min(kam.m, m || 3); skitten = true; return true; }
  // Har leiren alt et ferdig aggregat eller solceller, er rådet «bygg aggregat eller solceller» feil – da vises ikke varselet
  const egenStrøm = () => { try { return LeirSpill.tilstand().bygg.some(b => (b.type === 'aggregat' || b.type === 'solcelle') && Leir.ferdig(b)); } catch (e) { return false; } };
  function brikker() { const ut = [], S = window.OppstartSpill && OppstartSpill.tilstand(), leir = S && S.leir; if (!leir) return ut; const SS = window.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill : null;
    // (runde 8) et angrep fra en motstander mot et tettsted du holder (eller leiren, mens de samles): egen brikke – trykk viser stedet
    { const ES = window.EskaleringSpill && EskaleringSpill.S ? EskaleringSpill.S() : null;
      if (ES && ES.gruppe) for (const side of Object.keys(ES.gruppe)) { const G = ES.gruppe[side]; if (!G || !G.mål || !(G.mål.eier === 'blå' || (G.mål.leir && G.fase !== 'angriper'))) continue;
        const nf = window.Fraksjoner && Fraksjoner.FRAKSJONER[side] ? Fraksjoner.FRAKSJONER[side].navn : 'Fienden', om = Math.max(0, (G.angripFra || 0) - tid), mål = G.mål.leir ? 'leiren' : G.mål.navn;
        ut.push({ i: 'varsel', k: 'fare', t: `${G.fase === 'angriper' ? 'Angrep på' : 'Varslet angrep på'} ${mål}`, s: G.fase === 'angriper' ? `${nf}, ${G.lag.length} lag` : `${nf} samler ${G.lag.length} lag${om > 30 ? ' · tidligst om ca. ' + Math.round(om / 60) + ' t' : ''}`, f: () => gåTil(G.mål.x, G.mål.y, 6) || logg(`${nf} ${G.fase === 'angriper' ? 'angriper' : 'samler lag mot'} ${mål}.`) }); } }
    // (runde 8, krig: «angrepsinformasjonen motsier seg selv») brikka bruker den samme statusen som banneret (ForsvarSpill.status: sett nå,
    // sist sett, eller et anslag som spenn) – og gjelder også et angrep på leiren fra en motstander, ikke bare røverne
    const FS = window.ForsvarSpill && ForsvarSpill.status ? ForsvarSpill.status() : null;
    if (FS) { const mål = FS.sett ? FS.kjente.reduce((a, e) => (Math.hypot(e.x - leir.x, e.y - leir.y) < Math.hypot(a.x - leir.x, a.y - leir.y) ? e : a)) : FS.sist;
      ut.push({ i: 'varsel', k: 'fare', t: FS.røvere ? `Angrep: ${FS.antall} røverlag` : `Angrep: ${FS.hvem}`, s: FS.kort, f: () => (mål ? gåTil(mål.x, mål.y, 4) : false) || logg(`${FS.overskrift}: ${FS.tekst}.`) }); }
    else if (SS && SS.T() && SS.T().aktiv) { const lag = ENHETER.filter(e => e.raid === SS.T().aktiv && levende(e)); if (lag.length) { const d = Math.min(...lag.map(e => Math.hypot(e.x - leir.x, e.y - leir.y))), nær = lag.reduce((a, e) => (Math.hypot(e.x - leir.x, e.y - leir.y) < Math.hypot(a.x - leir.x, a.y - leir.y) ? e : a));
        // (runde 8, telefonkritikeren: brikken sa «10,0 km fra leiren» mens banneret sa «ikke sett ennå» og røverne var 720 m unna) – avstanden
        // står bare når noen ser røverne (som banneret), og da til den nærmeste som er sett
        const sett = lag.filter(e => typeof synlig !== 'function' || synlig(e)), ds = sett.length ? Math.min(...sett.map(e => Math.hypot(e.x - leir.x, e.y - leir.y))) : null;
        ut.push({ i: 'varsel', k: 'fare', t: `Angrep: ${lag.length} røverlag`, s: ds !== null ? `${meter(ds)} fra leiren` : 'ikke sett ennå', f: () => gåTil(nær.x, nær.y, 4) || logg(ds !== null ? `Røverne er ${meter(ds)} fra leiren.` : 'Ingen ser røverne ennå – bygg vakttårn eller send et lag ut.') }); } }
    if (SS && SS.O()) for (const o of SS.O().liste) if (o.tatt) ut.push({ i: 'oppdrag', k: '', t: Spillet.Oppdrag.TYPER[o.type].navn, s: `${meter(o.meter)} mot ${o.retning}`, f: () => gåTil(o.x, o.y, 4) || logg(`Oppdraget ligger ${meter(o.meter)} mot ${o.retning} for leiren.`) });
    const L = window.LeirSpill && LeirSpill.tilstand(), s = window.LeirSpill && LeirSpill.siste(), uten = s && s.mangler ? s.mangler.size - (s.avslått || 0) : 0, åpneLeir = fane => { if (window.LeirSpill) { const m = $('leirmeny'); if (m && !m.classList.contains('på')) $('leirknapp').click(); LeirSpill.fane(fane); } };
    if (L && uten > 0) ut.push({ i: 'strom', k: 'fare', t: `${uten} bygg uten strøm`, s: 'se strømmen', f: () => åpneLeir('bygg') });
    // karakteren din: tørst, sulten eller trøtt (spill/karakter.js)
    if (window.KarakterSpill && KarakterSpill.klar()) for (const v of KarakterSpill.varsler()) ut.push({ i: v.id === 'søvn' ? 'seng' : v.id === 'sult' ? 'mat' : 'vann', k: 'fare', t: 'Du er ' + v.tekst, s: v.råd.toLowerCase().replace(/\.$/, ''), f: () => KarakterSpill.åpne() });
    // tom eller snart tom for diesel (bare når du har aggregat som trenger den)
    // (runde 6) samme prognose som dagsrapporten og Lager (LeirSpill.diesel), og en egen knapp som kjøper diesel (LeirSpill.kjøpDiesel)
    if (L && s && s.aggInst > 0 && window.Leir) { const d = L.drivstoff || 0, P = window.LeirSpill && LeirSpill.diesel ? LeirSpill.diesel() : null, rekker = d > 0 ? (P ? P.timer : s.agg > 0 ? Leir.dieselTimer(L, s.agg) : Infinity) : Infinity;
      if (d <= 0) ut.push({ i: 'tank', k: 'fare', t: 'Tom for diesel', s: 'aggregatene står', f: () => åpneLeir('lager'), knapp: window.LeirSpill && LeirSpill.kjøpDiesel && Leir.kapasitet(L) > 0 ? { t: `Kjøp 500 l (${Leir.kroner(500 * Leir.DRIVSTOFF.prisPerLiter)})`, f: () => LeirSpill.kjøpDiesel(500) } : null }); else if (rekker < 6) ut.push({ i: 'tank', k: '', t: 'Lite diesel', s: `rekker ${rekker >= 1 ? Math.round(rekker) + ' t' : Math.max(1, Math.round(rekker * 60)) + ' min'}`, f: () => åpneLeir('lager') }); }
    const OS = window.OverlevSpill && OverlevSpill.klar && OverlevSpill.klar() ? OverlevSpill : null, D = OS && OS.D();
    if (D && !navigator.webdriver) { if (D.strøm.varslet && !D.strøm.nede && !egenStrøm()) ut.push({ i: 'strom', k: '', t: 'Strømnettet svikter snart', s: 'bygg aggregat eller solceller', f: () => åpneLeir('bygg') }); if (D.vann.varslet && !D.vann.nede && !OS.brønner()) ut.push({ i: 'vann', k: '', t: 'Vannet svikter snart', s: 'bygg en brønn', f: () => åpneLeir('bygg') }); if (D.vann.nede && !OS.brønner()) ut.push({ i: 'vann', k: 'fare', t: 'Leiren mangler vann', s: 'bygg en brønn', f: () => åpneLeir('bygg') }); }
    const F = window.FolkSpill && FolkSpill.tilstand(); if (F && F.personer.length && L && window.FolkRegler) { let B = null; try { B = FolkRegler.behov(F, L, FolkSpill.valg()); } catch (e) { B = null; }
      if (B && B.dager < 2) ut.push({ i: 'mat', k: 'fare', t: B.dager < .2 ? 'Tom for mat' : 'Lite mat', s: B.dager < .2 ? 'kjøp eller hent mat' : `rekker ${Math.max(1, Math.round(B.dager * 24))} t`, f: () => window.FolkSpill && FolkSpill.åpne(true) }); if (F.moral < 30) ut.push({ i: 'folk', k: 'fare', t: 'Lav moral', s: `${Math.round(F.moral)} av 100`, f: () => window.FolkSpill && FolkSpill.åpne(true) }); }
    // brikker fra andre moduler: window.VARSEL_TILLEGG = [() => [{ i: ikon, k: 'fare' | '' | 'god', t: tekst, s: undertekst, f: ved trykk }]]
    for (const fn of window.VARSEL_TILLEGG || []) { try { for (const b of fn() || []) ut.push(b); } catch (e) { /* et tillegg som feiler, skal ikke stoppe de andre varslene */ } }
    return ut.slice(0, 5); }
  // RUNDE 12 (21. nov, kritiker E – liggende telefon): (a) et trykk på et varsel mens et kort venter på svar (morgenmøtet, en hendelse …)
  // åpnet et panel over kortet – nå blinker kortet i stedet; (b) under angrep lå fire varsler oppå banneret, stoppkortet og opplæringen, og
  // «uttørket/utsultet/utslitt» lå fast et døgn og dekket kartet: på telefon slås karakterens varsler sammen til én brikke, og står det flere
  // enn én brikke, vises bare den viktigste + en brikke «+3 varsler» som folder ut lista (folder seg sammen igjen etter VARSEL_ÅPEN ms).
  // Bare for spilleren (ikke i testene før NarHud.test = true). Tallet er Claudes forslag.
  const VARSEL_ÅPEN = 9000, VENTEKORT = ['morgenkort', 'hendelse', 'samfunnkort', 'formkort', 'krigkort'];
  let varslerÅpne = 0;
  const forSpiller = () => !navigator.webdriver || (window.NarHud && NarHud.test === true);
  function venteKort() { for (const id of VENTEKORT) { const e = $(id); if (e && e.classList.contains('på') && e.getClientRects().length) return e; } return null; }
  function blink(e) { e.classList.remove('kortblink'); void e.offsetWidth; e.classList.add('kortblink'); }
  { const st = document.createElement('style'); st.textContent = `.kortblink{ animation:kortblink2 .8s ease-out 2; } @keyframes kortblink2{ 40%{ box-shadow:0 0 0 3px #f0dc9a, 0 0 22px rgba(240,220,154,.8); } }
#varsler button.flere{ border-left-color:#c9b26a; font-weight:600; } #varsler button.flere::after{ content:' ▾'; } #varsler.åpne button.flere::after{ content:' ▴'; }
body.kort #varsler button{ max-width:62vw; } body.kort #varsler button small{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }`; document.head.appendChild(st); }
  function samle(B) { if (!forSpiller() || !document.body.classList.contains('kort')) return B;
    const meg = B.filter(b => /^Du er /.test(b.t)), andre = B.filter(b => !/^Du er /.test(b.t));
    if (meg.length > 1) andre.push({ i: meg[0].i, k: 'fare', t: 'Du er ' + meg.map(b => b.t.slice(6)).join(', '), s: 'drikk, spis og hvil – trykk for Deg', f: meg[0].f });
    else andre.push(...meg);
    return andre; }
  function tegnVarsler() { { const åpen = ['leirmeny', 'folkmeny', 'hjelp', 'lagmeny'].some(id => $(id) && $(id).classList.contains('på')) && VW < 1500; varsler.style.display = åpen ? 'none' : ''; }
    if ($('oppstart') && $('oppstart').classList.contains('på')) { if (brikkeNøkkel) { varsler.innerHTML = ''; brikkeNøkkel = ''; } return; }
    const alle = samle(brikker()), samlet = forSpiller() && document.body.classList.contains('kort') && alle.length > 1, åpne = samlet && performance.now() < varslerÅpne;
    const B = samlet && !åpne ? alle.slice(0, 1) : alle, nøkkel = B.map(b => b.k + b.t + b.s).join('|') + (samlet ? '|+' + alle.length + (åpne ? 'å' : '') : ''); if (nøkkel === brikkeNøkkel) return; if (window.pekerNede && pekerNede(varsler)) return; brikkeNøkkel = nøkkel; varsler.innerHTML = ''; varsler.classList.toggle('åpne', åpne);
    for (const b of B) { const k = el('button', { type: 'button', klasse: b.k, 'data-ikon': b.i || 'varsel' }, el('span', {}, b.t), el('small', {}, b.s)); k.onclick = () => { const kort = forSpiller() ? venteKort() : null; if (kort) { blink(kort); return; } varslerÅpne = 0; b.f(); };
      // en brikke kan ha en egen knapp ved siden av seg (b.knapp = { t, f }), f.eks. «Kjøp 500 l» ved «Tom for diesel» (runde 6)
      if (b.knapp) { const kk = el('button', { type: 'button', klasse: 'handling' }, b.knapp.t); kk.onclick = b.knapp.f; varsler.appendChild(el('div', { klasse: 'rad' }, k, kk)); } else varsler.appendChild(k); }
    if (samlet) { const f = el('button', { type: 'button', klasse: 'flere', 'data-ikon': 'varsel', 'aria-expanded': String(åpne) }, el('span', {}, åpne ? 'Færre varsler' : `+${alle.length - 1} ${alle.length > 2 ? 'varsler' : 'varsel'}`));
      f.onclick = () => { varslerÅpne = åpne ? 0 : performance.now() + VARSEL_ÅPEN; brikkeNøkkel = ''; tegnVarsler(); løftVarsler(); }; varsler.appendChild(f); } }
  // (runde 8, telefonkritikeren: «varselboksen nede til venstre ligger over kompasset og målestokken») – på telefon står brikkene over
  // nordpila, målestokken og kildeteksten (de som står nede til venstre), ikke oppå dem
  // (runde 10) også over opplæringsruta når den står nede til venstre (de lå oppå hverandre på liggende telefon)
  function løftVarsler() { if (!document.body.classList.contains('kort')) { if (varsler.style.bottom) varsler.style.bottom = ''; return; }
    let topp = Infinity; for (const id of ['nordpil', 'skala', 'kilde', 'opplaering']) { const e = $(id); if (id === 'opplaering' && e && !e.classList.contains('på')) continue; if (!e || !e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') continue; const r = e.getBoundingClientRect(); if (r.left < 220 && r.height > 0 && r.top > innerHeight / 2) topp = Math.min(topp, r.top); }
    const b = topp < Infinity ? Math.round(innerHeight - topp + 6) + 'px' : ''; if (varsler.style.bottom !== b) varsler.style.bottom = b; }
  setInterval(() => { tegnVarsler(); løftVarsler(); }, 1000);
  // ---------- (runde 8) samme skrift på navnelappene i 3D ----------
  // PC-kritikeren: «navnelappene i 3D bruker en annen skrift (hvit, uten seriffer) enn resten av spillet («Vestlandsvakta»)». Modulene
  // tegner navn i overlegget (#c3o) med «bold 13px sans-serif»; her byttes en slik skrift i overleggets tegneflate til spillets egen
  // (Cormorant Garamond, litt større fordi den er smalere, og aldri tynnere enn 600). Andre skrifter (tall, ikoner) står som før.
  const SKRIFT = { skala: 1.12, navn: '"Cormorant Garamond", serif' };
  function byttSkrift(v) { const m = typeof v === 'string' && /^\s*(?:(italic)\s+)?(?:(bold|[1-9]00)\s+)?(\d+(?:\.\d+)?)px\s+sans-serif\s*$/.exec(v); if (!m) return v;
    const vekt = m[2] === 'bold' ? 700 : Math.max(600, +(m[2] || 600)); return `${m[1] ? 'italic ' : ''}${vekt} ${Math.round(+m[3] * SKRIFT.skala * 10) / 10}px ${SKRIFT.navn}`; }
  { const ov = document.getElementById('c3o'), g = ov && ov.getContext('2d'), d = window.CanvasRenderingContext2D && Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
    if (g && d && d.set && !Object.prototype.hasOwnProperty.call(g, 'font')) Object.defineProperty(g, 'font', { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, byttSkrift(v)); } }); }
  window.NarHud = { tegnHud, tegnVarsler, brikker, hud, varsler, vm: () => vm, byttSkrift, test: false, BEHOLD };
})();
