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
#nhud .vapen{ right:250px; bottom:calc(44px + env(safe-area-inset-bottom,0px)); min-width:150px; text-align:right; } #nhud .vapen small{ display:block; font-size:12.5px; color:#cfc6a8; letter-spacing:.04em; } #nhud .vapen b{ font-size:30px; line-height:1; } #nhud .vapen span{ font-size:16px; color:#cfc6a8; } #nhud .vapen em{ display:block; font-style:normal; font-size:12px; color:#e8a46a; min-height:14px; }
#nhud .felt{ left:50%; transform:translateX(-50%); bottom:calc(40px + env(safe-area-inset-bottom,0px)); display:flex; gap:5px; padding:4px; } #nhud .felt div{ min-width:66px; padding:3px 7px; border:1px solid rgba(231,220,195,.25); font-size:12px; color:#bdb497; text-align:center; } #nhud .felt div b{ display:block; font-size:10px; color:#8f8870; } #nhud .felt div.aktiv{ border-color:#c9b26a; color:#f0e2b0; background:rgba(201,178,106,.16); }
#nhud .tilstand{ height:5px; margin-top:4px; }
body.kort #nhud .helse{ left:auto; right:12px; bottom:auto; top:calc(var(--topp,44px) + 176px); width:118px; padding:4px 7px; } body.kort #nhud .helse .rad{ font-size:12px; } body.kort #nhud .helse .rad b{ font-size:14px; min-width:24px; }
body.kort #nhud .vapen{ right:12px; bottom:auto; top:calc(var(--topp,44px) + 222px); min-width:118px; padding:4px 7px; } body.kort #nhud .vapen b{ font-size:21px; } body.kort #nhud .vapen span{ font-size:13px; } body.kort #nhud .felt{ display:none; }
body.foto #nhud, body.foto #varsler{ display:none !important; }
#varsler{ position:fixed; left:10px; top:calc(var(--topp,58px) + 8px); z-index:6; display:flex; flex-direction:column; gap:5px; align-items:flex-start; max-width:min(320px,70vw); }
#varsler button{ pointer-events:auto; display:flex; align-items:center; gap:7px; background:rgba(22,18,12,.9); border:1px solid #6a5f42; border-left:4px solid #c9b26a; color:var(--ink,#e7dcc3); font:inherit; font-size:13.5px; padding:4px 10px 4px 8px; min-height:30px; cursor:pointer; text-align:left; }
#varsler button.fare{ border-left-color:#e0604a; } #varsler button.god{ border-left-color:#9fc46a; } #varsler button small{ color:var(--ink-dim,#a99); }
body.kort #varsler{ top:auto; bottom:calc(74px + env(safe-area-inset-bottom,0px)); max-width:62vw; } body.kort #varsler button{ font-size:12px; min-height:28px; padding:3px 8px 3px 6px; } body.kort.gaar #varsler, body.bygger2d #varsler{ display:none; }`;
  document.head.appendChild(css);
  // ---------- skjermbildet når du går eller kjører ----------
  const hud = el('div', { id: 'nhud' }), hp = el('i'), hpTall = el('b', {}, '100'), hpStrek = el('div', { klasse: 'strek' }, hp), pust = el('i'), kjHp = el('i');
  const helse = el('div', { klasse: 'boks helse' }, el('div', { klasse: 'rad' }, el('span', { 'data-ikon': 'hjerte' }), hpStrek, hpTall), el('div', { klasse: 'strek puste' }, pust));
  const vNavn = el('small'), vTall = el('b'), vRes = el('span'), vHint = el('em'), vTil = el('div', { klasse: 'strek tilstand' }, kjHp), vapen = el('div', { klasse: 'boks vapen' }, vNavn, vTall, vRes, vHint, vTil), felt = el('div', { klasse: 'boks felt' });
  hud.append(helse, vapen, felt); document.body.appendChild(hud);
  const sett = (e, t) => { if (e.textContent !== t) e.textContent = t; };
  let sistEndret = 0, forrigeHp = 100, feltNøkkel = '';
  function tegnHud() { const Q = r3(), går = !!(Q && Q.fot && typeof på3d !== 'undefined' && på3d), SS = window.SpilletSpill, K = SS && SS.klar && SS.klar() ? SS.K() : null; hud.classList.toggle('på', går && !!K); document.body.classList.toggle('gaar', går); if (!går || !K) return;
    const nå = performance.now(), h = Math.max(0, Math.round(K.hp)), kr = window.Gange && Gange.kropp && Gange.kropp(), fører = window.KjorSpill && KjorSpill.fører(), U = window.UtstyrSpill && UtstyrSpill.klar() ? UtstyrSpill : null;
    if (h !== forrigeHp) { forrigeHp = h; sistEndret = nå; } hp.style.width = h + '%'; hpStrek.classList.toggle('lav', h <= 40); sett(hpTall, String(h)); pust.style.width = Math.round((kr ? kr.utholdenhet : 1) * 100) + '%';
    if (fører) { const fart = fører.type === 'bil' ? Math.abs(fører.v) : Math.hypot(fører.vx, fører.vy); sett(vNavn, fører.kj ? fører.kj.navn : fører.type === 'bil' ? 'Feltbil' : 'Helikopter'); sett(vTall, String(Math.round(fart * 3.6))); sett(vRes, ' km/t');
      sett(vHint, fører.type === 'heli' ? (fører.rotor < .9 ? `rotoren spoler opp ${Math.round(fører.rotor / .9 * 100)} %` : `${Math.round(Math.max(0, fører.over || 0))} m over bakken`) : fører.v < -.3 ? 'rygger' : ''); vTil.style.display = fører.kj ? 'none' : ''; kjHp.style.width = Math.round((fører.hp === undefined ? 1 : fører.hp) * 100) + '%'; vTil.classList.toggle('lav', fører.hp < .4); felt.style.display = 'none'; sistEndret = nå; }
    else { const A = U ? U.aktivt() : null; vTil.style.display = 'none'; sett(vNavn, A ? A.def.navn : 'Gevær'); sett(vTall, String(K.mag)); sett(vRes, ' / ' + K.res); sett(vHint, nå < K.lader ? 'lader …' : K.mag === 0 ? (K.res ? 'tomt – R lader' : 'tom for ammunisjon') : '');
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
  function vmGeo(id) { const d = [], st = [.13, .13, .14], tre = [.36, .25, .15], hud2 = [.3, .27, .24], b = (x, y, z, sx, sy, sz, c) => { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); g.translate(x, y, z); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let q = 0; q < n; q++) f.set(c, q * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); };
    const V = { pistol: { løp: .1, kolbe: 0, mag: .09, tykk: .03 }, mp: { løp: .16, kolbe: .12, mag: .16, tykk: .04 }, gevær: { løp: .3, kolbe: .24, mag: .13, tykk: .045 }, hagle: { løp: .36, kolbe: .26, mag: 0, tykk: .05, tre: true }, rifle: { løp: .46, kolbe: .28, mag: .06, tykk: .045, tre: true, kikkert: true } }[id] || { løp: .3, kolbe: .24, mag: .13, tykk: .045 };
    b(0, 0, -.08, V.tykk, .06, .2, st); b(0, .012, -.18 - V.løp / 2, .018, .018, V.løp, st); b(0, -.01, -.2 - V.løp * .35, V.tykk * .9, .04, V.løp * .6, V.tre ? tre : st);   // låskasse, løp, forskjefte
    if (V.kolbe) { b(0, -.015, .02 + V.kolbe / 2, V.tykk * .8, .06, V.kolbe, V.tre ? tre : st); b(0, -.03, .02 + V.kolbe, V.tykk, .1, .02, st); }
    b(0, -.07, -.02, V.tykk * .8, .09, .04, V.tre ? tre : st); if (V.mag) b(0, -.05 - V.mag / 2, -.1, V.tykk * .7, V.mag, .045, st);                       // grep og magasin
    b(0, .045, -.17 - V.løp, .008, .03, .008, st); if (V.kikkert) { b(0, .06, -.1, .032, .032, .2, st); b(0, .06, -.21, .04, .04, .02, [.2, .3, .4]); } else b(0, .042, -.02, .02, .02, .01, st);   // sikter
    b(.005, -.085, -.02, .07, .09, .08, hud2); b(.03, -.11, .06, .08, .08, .2, [.3, .36, .26]);                                                           // hanske og underarm
    if (id !== 'pistol') { b(-.02, -.05, -.24 - V.løp * .3, .07, .06, .08, hud2); b(-.07, -.1, -.14 - V.løp * .2, .08, .08, .22, [.3, .36, .26]); }          // støttehånd
    return window.MODELLER ? MODELLER.samle(d) : null; }
  KROKER.ramme3d.push(R => { if (typeof THREE === 'undefined' || !R.cam) return; const U = window.UtstyrSpill && UtstyrSpill.klar() ? UtstyrSpill : null, SS = window.SpilletSpill, K = SS && SS.K ? SS.K() : null, går = !!R.fot && !(window.KjorSpill && KjorSpill.fører());
    if (!vm) { if (!U || !går) return; if (!R.cam.parent) R.scene.add(R.cam); vm = { g: new THREE.Group(), id: '', mesh: null, mat: new THREE.MeshLambertMaterial({ vertexColors: true }) }; R.cam.add(vm.g); }
    if (vm.g.parent !== R.cam) { if (!R.cam.parent) R.scene.add(R.cam); R.cam.add(vm.g); }
    vm.g.visible = går && !!U && !document.body.classList.contains('foto'); if (!vm.g.visible) return;
    const id = U.aktivt().v.id; if (id !== vm.id) { if (vm.mesh) { vm.g.remove(vm.mesh); vm.mesh.geometry.dispose(); } const geo = vmGeo(id); vm.id = id; vm.mesh = geo ? new THREE.Mesh(geo, vm.mat) : null; if (vm.mesh) { vm.mesh.frustumCulled = false; vm.mesh.renderOrder = 5; vm.g.add(vm.mesh); } vm.bytte = performance.now(); }
    const nå = performance.now(), kr = window.Gange && Gange.kropp && Gange.kropp(), fart = kr ? Math.min(6, kr.fart || 0) : 0, rek = K ? Math.max(0, 1 - (nå - K.sist) / 130) : 0, lader = K && nå < K.lader ? 1 : 0, opp = Math.min(1, (nå - (vm.bytte || 0)) / 250), smal = VW < 700 ? .8 : 1;
    vm.ned = (vm.ned || 0) + ((lader ? 1 : 0) - (vm.ned || 0)) * .15;
    // lite og nede til høyre, så det ikke dekker det du ser på eller tallene i hjørnet
    vm.g.scale.setScalar(.62); vm.g.position.set(.2 * smal + Math.sin(nå / 190) * .003 * fart, -.2 - vm.ned * .14 - (1 - opp) * .2 + Math.abs(Math.sin(nå / 190)) * .004 * fart, -.5 + rek * .03); vm.g.rotation.set(rek * .07 - vm.ned * .5, .09, 0); });

  // ---------- varselbrikkene i kartet og ovenfra ----------
  const varsler = el('div', { id: 'varsler' }); document.body.appendChild(varsler); let brikkeNøkkel = '';
  const meter = d => (d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d / 10) * 10 + ' m');
  function gåTil(x, y, m) { if (typeof på3d !== 'undefined' && på3d) return false; kam.x = x; kam.y = y; kam.m = Math.min(kam.m, m || 3); skitten = true; return true; }
  function brikker() { const ut = [], S = window.OppstartSpill && OppstartSpill.tilstand(), leir = S && S.leir; if (!leir) return ut; const SS = window.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill : null;
    if (SS && SS.T() && SS.T().aktiv) { const lag = ENHETER.filter(e => e.raid === SS.T().aktiv && levende(e)); if (lag.length) { const d = Math.min(...lag.map(e => Math.hypot(e.x - leir.x, e.y - leir.y))), nær = lag.reduce((a, e) => (Math.hypot(e.x - leir.x, e.y - leir.y) < Math.hypot(a.x - leir.x, a.y - leir.y) ? e : a));
        ut.push({ i: 'varsel', k: 'fare', t: `Angrep: ${lag.length} røverlag`, s: `${meter(d)} fra leiren`, f: () => gåTil(nær.x, nær.y, 4) || logg(`Røverne er ${meter(d)} fra leiren.`) }); } }
    if (SS && SS.O()) for (const o of SS.O().liste) if (o.tatt) ut.push({ i: 'oppdrag', k: '', t: Spillet.Oppdrag.TYPER[o.type].navn, s: `${meter(o.meter)} mot ${o.retning}`, f: () => gåTil(o.x, o.y, 4) || logg(`Oppdraget ligger ${meter(o.meter)} mot ${o.retning} for leiren.`) });
    const L = window.LeirSpill && LeirSpill.tilstand(), s = window.LeirSpill && LeirSpill.siste(), uten = s && s.mangler ? s.mangler.size - (s.avslått || 0) : 0, åpneLeir = fane => { if (window.LeirSpill) { const m = $('leirmeny'); if (m && !m.classList.contains('på')) $('leirknapp').click(); LeirSpill.fane(fane); } };
    if (L && uten > 0) ut.push({ i: 'strom', k: 'fare', t: `${uten} bygg uten strøm`, s: 'se strømmen', f: () => åpneLeir('bygg') });
    const OS = window.OverlevSpill && OverlevSpill.klar && OverlevSpill.klar() ? OverlevSpill : null, D = OS && OS.D();
    if (D && !navigator.webdriver) { if (D.strøm.varslet && !D.strøm.nede) ut.push({ i: 'strom', k: '', t: 'Strømnettet svikter snart', s: 'bygg aggregat eller solceller', f: () => åpneLeir('bygg') }); if (D.vann.varslet && !D.vann.nede && !OS.brønner()) ut.push({ i: 'vann', k: '', t: 'Vannet svikter snart', s: 'bygg en brønn', f: () => åpneLeir('bygg') }); if (D.vann.nede && !OS.brønner()) ut.push({ i: 'vann', k: 'fare', t: 'Leiren mangler vann', s: 'bygg en brønn', f: () => åpneLeir('bygg') }); }
    const F = window.FolkSpill && FolkSpill.tilstand(); if (F && F.personer.length && L && window.FolkRegler) { let B = null; try { B = FolkRegler.behov(F, L, FolkSpill.valg()); } catch (e) { B = null; }
      if (B && B.dager < 1.5) ut.push({ i: 'mat', k: 'fare', t: B.dager < .2 ? 'Tom for mat' : 'Lite mat', s: B.dager < .2 ? 'kjøp eller hent mat' : `rekker ${Math.max(1, Math.round(B.dager * 24))} t`, f: () => window.FolkSpill && FolkSpill.åpne(true) }); if (F.moral < 30) ut.push({ i: 'folk', k: 'fare', t: 'Lav moral', s: `${Math.round(F.moral)} av 100`, f: () => window.FolkSpill && FolkSpill.åpne(true) }); }
    return ut.slice(0, 5); }
  function tegnVarsler() { { const åpen = ['leirmeny', 'folkmeny', 'hjelp', 'lagmeny'].some(id => $(id) && $(id).classList.contains('på')) && VW < 1500; varsler.style.display = åpen ? 'none' : ''; }
    if ($('oppstart') && $('oppstart').classList.contains('på')) { if (brikkeNøkkel) { varsler.innerHTML = ''; brikkeNøkkel = ''; } return; } const B = brikker(), nøkkel = B.map(b => b.k + b.t + b.s).join('|'); if (nøkkel === brikkeNøkkel) return; if (window.pekerNede && pekerNede(varsler)) return; brikkeNøkkel = nøkkel; varsler.innerHTML = '';
    for (const b of B) { const k = el('button', { type: 'button', klasse: b.k, 'data-ikon': b.i || 'varsel' }, el('span', {}, b.t), el('small', {}, b.s)); k.onclick = b.f; varsler.appendChild(k); } }
  setInterval(tegnVarsler, 1000);
  window.NarHud = { tegnHud, tegnVarsler, brikker, hud, varsler, vm: () => vm };
})();
