/* Riksbrudd – KARAKTEREN DIN (17. nov, brukeren: «gjøre spillerens egen karakter mer detaljert» – både utseendet i 3D og et karakterark).
 * Reglene øverst uten DOM (Node: require('./karakter'); nettleser: globalThis.Karakter), visningen (KarakterSpill) nederst.
 *  UTSEENDE: Karakter.utseende(portrett) leser portrettet du laget ved start (hud, hårfarge, hårfasong, skjegg, hodeplagg, jakkefarge,
 *   briller) – figuren i 3D bygges av det, så den ligner deg og ikke soldatene.
 *  BEHOV: tørst (tom etter 1 døgn), sult (2 døgn) og søvn (1,5 døgn), 0–100. Under 25 skyter og løper du dårligere; på 0 tærer det
 *   på helsa. I leiren drikker, spiser (én rasjon av leirens mat) og hviler du av deg selv; ute spiser du feltrasjoner og drikker i vann.
 *  KARAKTERARK: portrett, bakgrunn, helse, behov, ferdigheter, det du bærer og litt statistikk.
 * Alle tallene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  const BEHOV = {
    tørst: { navn: 'Tørst', timer: 24, ord: ['uttørket', 'veldig tørst', 'tørst', 'utørst'], råd: 'Drikk i leiren eller ved et vann.' },
    sult: { navn: 'Sult', timer: 48, ord: ['utsultet', 'veldig sulten', 'sulten', 'mett'], råd: 'Spis i leiren eller en feltrasjon fra sekken.' },
    søvn: { navn: 'Søvn', timer: 36, ord: ['utslitt', 'veldig trøtt', 'trøtt', 'uthvilt'], råd: 'Hvil i leiren eller i et hus du har sikret.' },
  };
  const R = { lav: 25, greit: 60, løpTørst: 1.6, hvile: 12, skade: 4, minTreff: .7, minLøp: .6, rasjon: 50, nær: 150 };
  const ny = () => ({ tørst: 100, sult: 100, søvn: 100 });
  // t spilltimer går: behovene synker. o.løper: tørsten går fortere.
  function steg(B, t, o = {}) { if (!(t > 0)) return B; for (const [k, D] of Object.entries(BEHOV)) B[k] = Math.max(0, (B[k] === undefined ? 100 : B[k]) - 100 / D.timer * t * (k === 'tørst' && o.løper ? R.løpTørst : 1)); return B; }
  const fyll = (B, k, m) => { if (!BEHOV[k]) return 0; const før = B[k] || 0; B[k] = Math.max(0, Math.min(100, før + m)); return B[k] - før; };
  // Virkningen: faktor for treff og løping (1 = ingen), og helsetap per spilltime når noe står på 0.
  function virkning(B) { const lav = Math.min(B.tørst, B.sult, B.søvn), svak = Math.min(B.tørst, B.søvn), f = (v, min) => (v >= R.lav ? 1 : min + (1 - min) * v / R.lav);
    return { treff: f(lav, R.minTreff), løp: f(svak, R.minLøp), skade: Object.keys(BEHOV).filter(k => B[k] <= 0).length * R.skade, lavest: lav }; }
  const ord = (k, v) => BEHOV[k].ord[v <= 0 ? 0 : v < R.lav ? 1 : v < R.greit ? 2 : 3];
  const tilstand = v => (v <= 0 ? 'tomt' : v < R.lav ? 'lite' : v < R.greit ? 'greit' : '');
  // Utseendet fra portrettet (feltene i spill/portrett-motor.js). Fargene som [r, g, b] 0–1.
  const rgb = (hex, res) => { const m = /^#([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return res; const v = parseInt(m[1], 16); return [(v >> 16) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; };
  function utseende(p) { p = p || {}; const h = String(p.hair || 'short');
    const stil = /^(bald|buzz)$/.test(h) ? 'snau' : /^(long|braid|ponytail|shag|mullet|bob)$/.test(h) ? 'langt' : /^(afro|curly|curls-short|waves)$/.test(h) ? 'krøll' : 'kort';
    return { hud: rgb(p.skin, [.87, .69, .57]), hår: rgb(p.hairColor, [.16, .13, .12]), stil, hale: h === 'ponytail' || h === 'braid', skallet: h === 'bald',
      skjegg: !!p.facialHair && p.facialHair !== 'ingen', hodeplagg: !!p.headwear && p.headwear !== 'ingen', briller: !!p.glasses && p.glasses !== 'ingen', jakke: rgb(p.outfitColor, [.3, .34, .28]) }; }
  const api = { BEHOV, R, ny, steg, fyll, virkning, ord, tilstand, utseende };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Karakter = api;

  // ---------- visningen ----------
  const K = api, NØKKEL = 'riksbrudd-karakter', TREDJE = 'riksbrudd-tredje', r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const knapp = (tekst, fn, a = {}) => { const b = el('button', a, tekst); b.onclick = fn; return b; };
  let T = null, leirId = '', klar = false, åpen = false, sistTid = null, sistLagret = 0, sistHtml = '', sistDrakk = 0, tredje = false, figur = null, fase = 0, sistPos = null;
  try { tredje = localStorage.getItem(TREDJE) === '1'; } catch (e) { tredje = false; }
  const ut = { test: false }, auto = () => !navigator.webdriver || ut.test;
  const spill = () => rot.OppstartSpill && OppstartSpill.tilstand();
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, ...T })); } catch (e) { /* fullt eller sperret */ } };
  function start() { const S = spill(); if (!S || !S.leir) return; leirId = Math.round(S.leir.x) + ',' + Math.round(S.leir.y); let d = null; try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    T = d && d.leir === leirId && d.behov ? { behov: { ...K.ny(), ...d.behov }, gått: d.gått || 0, skudd: d.skudd || 0 } : { behov: K.ny(), gått: 0, skudd: 0 }; klar = true; sistTid = null; if (figur) { fjernFigur(); } }
  rot.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  const fører = () => rot.KjorSpill && KjorSpill.fører && KjorSpill.fører();
  const går = () => { const Q = r3(); return !!(Q && Q.fot && typeof på3d !== 'undefined' && på3d); };
  // hvor du er i kartet: der du går, ellers der karakterlaget står
  function sted() { const Q = r3(); if (går() && Q.ut && rot.Gange && Gange.kropp()) { const k = Gange.kropp(); return { x: Q.ut.cx + k.x, y: Q.ut.cy + k.y }; } const s = ENHETER.find(e => e.karakter); return s ? { x: s.x, y: s.y } : null; }
  const iLeiren = () => { const S = spill(), p = sted(); return !!(S && S.leir && p && Math.hypot(p.x - S.leir.x, p.y - S.leir.y) <= K.R.nær); };
  const harVann = () => { const O = rot.OverlevSpill, D = O && O.D && O.D(); return !D || !D.vann.nede || (O.brønner && O.brønner() > 0); };
  const ting = () => (rot.UtstyrSpill && UtstyrSpill.klar() ? UtstyrSpill.tilstand().ting : null);
  function spisRasjon() { const t = ting(); if (!t || !(t.feltrasjon > 0)) { logg('Du har ingen feltrasjon i sekken.'); return false; } if (T.behov.sult > 95) { logg('Du er ikke sulten.'); return false; }
    t.feltrasjon--; if (!t.feltrasjon) delete t.feltrasjon; K.fyll(T.behov, 'sult', K.R.rasjon); UtstyrSpill.lagre(); UtstyrSpill.vis(); lagre(); logg('Du spiser en feltrasjon.'); vis(true); return true; }

  // hvert sekund: behovene synker med spilltiden, og fylles der det går
  function takt() { if (!klar || !T) return; const nå = typeof tid !== 'undefined' ? tid : 0; if (sistTid === null) sistTid = nå; const t = Math.max(0, Math.min(6, (nå - sistTid) / TIME)); sistTid = nå;
    if (auto() && t > 0) { const kr = går() && rot.Gange && Gange.kropp(); K.steg(T.behov, t, { løper: !!(kr && kr.løper && kr.fart > 2.5) });
      if (iLeiren()) { const L = rot.LeirSpill && LeirSpill.tilstand(), F = rot.FolkSpill && FolkSpill.tilstand();
        if (T.behov.tørst < K.R.greit && harVann()) { T.behov.tørst = 100; logg('Du drikker deg utørst i leiren.'); }
        if (T.behov.sult < K.R.greit && F && F.mat >= 1) { F.mat -= 1; K.fyll(T.behov, 'sult', K.R.rasjon); logg('Du spiser i leiren (én rasjon av leirens mat).'); }
        if (L && rot.Leir && Leir.plasser(L) > 0) K.fyll(T.behov, 'søvn', K.R.hvile * t); }
      else if (rot.OverlevSpill && OverlevSpill.iTilflukt && går() && OverlevSpill.iTilflukt()) K.fyll(T.behov, 'søvn', K.R.hvile * t);
      // ute: drikk når du står ved vann
      const Q = r3(); if (går() && !fører() && T.behov.tørst < 80 && Q.ut && rot.Gange && Gange.vannVed && performance.now() - sistDrakk > 20000) { const k = Gange.kropp(), v = Gange.vannVed(Q.ut);
        if (k && [[2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5]].some(([dx, dy]) => v(k.x + dx, k.y + dy))) { sistDrakk = performance.now(); T.behov.tørst = 100; logg('Du drikker av vannet.'); } }
      const V = K.virkning(T.behov), SS = rot.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill.K() : null; if (V.skade > 0 && SS && SS.hp > 5) SS.hp = Math.max(5, SS.hp - V.skade * t);
      // løpingen (Bevegelse.REGLER.løpTid settes av overlev.js fra ferdigheten; her ganges behovene inn)
      if (rot.Bevegelse && Bevegelse.REGLER) { if (!takt.løp0 || Math.abs(Bevegelse.REGLER.løpTid - takt.satt) > 1e-9) takt.løp0 = Bevegelse.REGLER.løpTid; takt.satt = takt.løp0 * V.løp; Bevegelse.REGLER.løpTid = takt.satt; }
      for (const k of Object.keys(K.BEHOV)) { const til = K.tilstand(T.behov[k]); if ((til === 'lite' || til === 'tomt') && (takt.meldt = takt.meldt || {})[k] !== til) { takt.meldt[k] = til; logg(`Du er ${K.ord(k, T.behov[k])}. ${K.BEHOV[k].råd}`); } else if (!til && takt.meldt) delete takt.meldt[k]; } }
    if (performance.now() - sistLagret > 15000) { sistLagret = performance.now(); lagre(); } vis(false); }
  setInterval(takt, 1000);

  // ---------- figuren i 3D ----------
  const farg = (g, c) => { const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let q = 0; q < n; q++) f.set(c, q * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); return g; };
  const boks = (d, x, y, z, sx, sy, sz, c, ry) => { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); if (ry) g.rotateY(ry); g.translate(x, y, z + sz / 2); d.push(farg(g, c)); };
  function fjernFigur() { if (figur && figur.g.parent) figur.g.parent.remove(figur.g); if (figur) figur.g.traverse(m => { if (m.geometry) m.geometry.dispose(); }); figur = null; }
  // figuren ser mot +x, føttene i origo; armer og bein har origo i leddet og svinger
  function byggFigur(Rr) { const S = spill(), U = K.utseende(S && S.karakter && S.karakter.portrett), mat = new THREE.MeshLambertMaterial({ vertexColors: true }), g = new THREE.Group(), mørk = c => c.map(v => v * .72), lys = c => c.map(v => Math.min(1, v * 1.18));
    const bukse = [.2, .22, .18], støvel = [.1, .09, .08], sekk = [.25, .28, .2], stål = [.12, .12, .13], kropp = [], hud = U.hud, hår = U.hår, jakke = U.jakke;
    boks(kropp, 0, 0, .92, .25, .42, .12, bukse); boks(kropp, 0, 0, 1.0, .25, .4, .3, jakke); boks(kropp, .005, 0, 1.3, .27, .44, .24, jakke); boks(kropp, 0, 0, 1.5, .2, .34, .05, lys(jakke));          // hofte, mage, bryst, skuldre
    boks(kropp, .14, 0, 1.02, .012, .03, .5, mørk(jakke)); for (const sy of [-1, 1]) { boks(kropp, .138, sy * .12, 1.3, .012, .12, .1, mørk(jakke)); boks(kropp, .138, sy * .12, 1.39, .016, .13, .02, lys(jakke)); boks(kropp, 0, sy * .2, 1.535, .14, .1, .02, mørk(jakke)); }
    boks(kropp, 0, 0, .97, .27, .44, .05, støvel); boks(kropp, .14, 0, .975, .02, .07, .04, [.62, .56, .4]);                                                                                          // belte og spenne
    boks(kropp, 0, 0, 1.55, .1, .11, .07, hud); boks(kropp, .01, 0, 1.6, .2, .19, .24, hud); boks(kropp, .11, 0, 1.69, .03, .05, .06, mørk(hud));                                                     // hals, hode, nese
    for (const sy of [-1, 1]) { boks(kropp, .112, sy * .05, 1.73, .012, .035, .02, [.95, .95, .93]); boks(kropp, .119, sy * .05, 1.734, .008, .016, .014, [.15, .2, .25]); boks(kropp, .113, sy * .05, 1.758, .014, .05, .011, mørk(hår)); boks(kropp, .0, sy * .1, 1.69, .05, .02, .07, mørk(hud)); }
    boks(kropp, .112, 0, 1.655, .012, .07, .012, [.6, .36, .32]);
    if (U.briller) { for (const sy of [-1, 1]) boks(kropp, .122, sy * .05, 1.722, .008, .06, .04, [.1, .1, .11]); boks(kropp, .122, 0, 1.738, .008, .04, .008, [.1, .1, .11]); }
    if (U.skjegg) { boks(kropp, .1, 0, 1.6, .03, .16, .07, hår); boks(kropp, .06, 0, 1.59, .1, .2, .03, hår); }
    // håret etter fasongen i portrettet
    if (!U.skallet) { if (U.stil === 'snau') boks(kropp, 0, 0, 1.835, .2, .19, .015, mørk(hår));
      else { boks(kropp, -.01, 0, 1.83, .23, .21, U.stil === 'krøll' ? .1 : .06, hår); boks(kropp, -.1, 0, 1.68, .05, .2, .16, hår); for (const sy of [-1, 1]) boks(kropp, -.02, sy * .1, 1.74, .16, .02, .1, hår);
        if (U.stil === 'krøll') for (const sy of [-1, 1]) boks(kropp, -.01, sy * .12, 1.76, .2, .04, .14, hår);
        if (U.stil === 'langt') { boks(kropp, -.12, 0, 1.5, .05, .22, .2, hår); for (const sy of [-1, 1]) boks(kropp, -.05, sy * .105, 1.56, .1, .025, .18, hår); }
        if (U.hale) boks(kropp, -.16, 0, 1.42, .05, .06, .3, hår); } }
    if (U.hodeplagg) { boks(kropp, 0, 0, 1.83, .24, .22, .08, mørk(jakke)); boks(kropp, .14, 0, 1.83, .1, .18, .02, mørk(jakke)); }
    // sekk med lokk, lommer og sovepose, og våpenet på skrå over ryggen
    boks(kropp, -.24, 0, 1.02, .2, .34, .46, sekk); boks(kropp, -.24, 0, 1.48, .22, .36, .06, mørk(sekk)); boks(kropp, -.36, 0, 1.08, .06, .22, .2, mørk(sekk)); for (const sy of [-1, 1]) { boks(kropp, -.24, sy * .2, 1.08, .14, .06, .22, mørk(sekk)); boks(kropp, .02, sy * .15, 1.3, .29, .04, .25, mørk(sekk)); }
    { const s = new THREE.CylinderGeometry(.08, .08, .4, 8).toNonIndexed(); s.translate(-.24, 0, 1.6); kropp.push(farg(s, [.3, .2, .16])); }
    { const v = new THREE.BoxGeometry(.05, .05, .8).toNonIndexed(); v.rotateX(.5); v.translate(-.37, .02, 1.3); kropp.push(farg(v, stål)); const kb = new THREE.BoxGeometry(.05, .09, .22).toNonIndexed(); kb.rotateX(.5); kb.translate(-.37, .2, .98); kropp.push(farg(kb, [.3, .2, .12])); }
    g.add(new THREE.Mesh(MODELLER.samle(kropp), mat));
    const lem = (deler, x, y, z) => { const m = new THREE.Mesh(MODELLER.samle(deler), mat); m.position.set(x, y, z); g.add(m); return m; };
    const bein = () => { const d = []; boks(d, 0, 0, -.44, .16, .16, .44, bukse); boks(d, -.005, 0, -.8, .14, .14, .38, bukse); boks(d, .085, 0, -.5, .02, .14, .13, mørk(bukse)); boks(d, .03, 0, -.92, .28, .15, .14, støvel); boks(d, .03, 0, -.93, .3, .16, .03, [.05, .05, .05]); boks(d, .09, 0, -.3, .012, .1, .12, mørk(bukse)); return d; };
    const arm = () => { const d = []; boks(d, 0, 0, -.3, .12, .12, .3, jakke); boks(d, .01, 0, -.56, .105, .105, .27, jakke); boks(d, .01, 0, -.59, .115, .115, .04, mørk(jakke)); boks(d, .015, 0, -.68, .09, .1, .1, hud); boks(d, .06, 0, -.2, .012, .08, .08, lys(jakke)); return d; };
    const deler = { g, b1: lem(bein(), 0, .105, .92), b2: lem(bein(), 0, -.105, .92), a1: lem(arm(), 0, .28, 1.5), a2: lem(arm(), 0, -.28, 1.5) };
    g.traverse(m => { m.frustumCulled = false; }); g.userData.kilde = 'karakter.js'; Rr.scene.add(g); return deler; }
  KROKER.ramme3d.push(Rr => { if (!klar || typeof THREE === 'undefined' || !rot.MODELLER || !Rr.ut) return; if (figur && figur.g.parent !== Rr.scene) fjernFigur(); if (!figur) figur = byggFigur(Rr);
    const u = Rr.ut, gå = går() && !fører(), kr = gå && rot.Gange ? Gange.kropp() : null, nå = performance.now(), dt = Math.min(.1, (nå - (figur.t || nå)) / 1000); figur.t = nå; let x, y, z, a, fart = 0;
    if (kr) { x = kr.x; y = kr.y; z = kr.z; a = Rr.fot.a + Math.PI / 2; fart = kr.fart || 0; if (sistPos) { const d = Math.hypot(kr.x + u.cx - sistPos[0], kr.y + u.cy - sistPos[1]); if (d < 20) T.gått += d; } sistPos = [kr.x + u.cx, kr.y + u.cy]; }
    else { sistPos = null; const s = ENHETER.find(e => e.karakter); if (!s || fører() || Math.abs(s.x - u.cx) > u.S || Math.abs(s.y - u.cy) > u.S) { figur.g.visible = false; return; } x = s.x - u.cx; y = s.y - u.cy; z = (hoyde3d(s.x, s.y) - u.h0) * Rr.EX; a = s.retning || 0; fart = s.sti ? 1.4 : 0; }
    const inne = kr && rot.Interior3d && Interior3d.inne && Interior3d.inne(kr.x, kr.y), vis3 = kr ? tredje && !inne : true; rot.TREDJE = !!(kr && vis3); figur.g.visible = vis3; if (!vis3) return;
    figur.g.position.set(x, y, z); figur.g.rotation.z = a; fase += fart * dt * 2.4; const sv = Math.sin(fase) * Math.min(1, fart / 1.6) * .7; figur.b1.rotation.y = sv; figur.b2.rotation.y = -sv; figur.a1.rotation.y = -sv * .7; figur.a2.rotation.y = sv * .7;
    // TREDJEPERSON: kameraet trekkes bakover og litt opp fra øynene, men aldri ned i bakken eller inn i en vegg
    if (kr) { const c = Rr.cam, f = Rr.fot, dx = -Math.sin(f.a) * Math.cos(f.pitch), dy = Math.cos(f.a) * Math.cos(f.pitch), dz = Math.sin(f.pitch), ex = c.position.x, ey = c.position.y, ez = c.position.z; let d = 4.2;
      for (; d > .8; d -= .4) { const px = ex - dx * d, py = ey - dy * d; if (!(typeof hindring3d === 'function' && hindring3d(px, py))) break; }
      const px = ex - dx * d, py = ey - dy * d, bakke = (hoyde3d(u.cx + px, u.cy + py) - u.h0) * Rr.EX + .45; c.position.set(px, py, Math.max(bakke, ez - dz * d + .75)); c.lookAt(ex + dx * 12, ey + dy * 12, ez + dz * 12 + .2); } });

  // ---------- knappen for tredjeperson ----------
  const css = document.createElement('style');
  css.textContent = `#karakterark{ position:fixed; right:10px; top:calc(var(--topp,58px) + 56px); z-index:30; display:none; width:min(370px,94vw); max-height:calc(100vh - var(--topp,58px) - 120px); overflow:auto; padding:10px 12px 12px; background:#1c170f; border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; }
#karakterark.på{ display:block; } #karakterark .lukk{ position:absolute; right:6px; top:4px; background:none; border:0; color:inherit; font-size:22px; min-width:34px; min-height:34px; cursor:pointer; }
#karakterark .hode{ display:flex; gap:10px; align-items:center; margin-right:26px; } #karakterark .hode img{ width:76px; height:96px; object-fit:cover; object-position:top; border:1px solid var(--rule,#4a4030); flex:none; } #karakterark h2{ margin:0; font-size:20px; } #karakterark .hode small{ display:block; color:var(--ink-dim,#a99); }
#karakterark h3{ margin:12px 0 3px; font-size:12.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-dim,#a99); }
#karakterark .m{ display:grid; grid-template-columns:92px 1fr auto; gap:8px; align-items:center; padding:3px 0; } #karakterark .m .s{ height:10px; background:#2e281e; } #karakterark .m .s i{ display:block; height:100%; background:#8fc46a; } #karakterark .m small{ color:var(--ink-dim,#a99); white-space:nowrap; }
#karakterark .m.greit .s i{ background:#c9b26a; } #karakterark .m.lite .s i{ background:#e8a46a; } #karakterark .m.lite small, #karakterark .m.tomt small, #karakterark .m.tomt b{ color:#f08a6a; } #karakterark .m.tomt .s{ outline:1px solid #f08a6a; } #karakterark .m.ferd .s i{ background:#8fa8c8; }
#karakterark .rad{ display:flex; justify-content:space-between; gap:8px; padding:3px 0; border-bottom:1px solid #2e281e; } #karakterark .rad small{ color:var(--ink-dim,#a99); } #karakterark .tips{ margin-top:8px; font-size:12.5px; color:var(--ink-dim,#a99); }
#karakterark button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); min-height:34px; padding:2px 10px; font:inherit; font-size:13px; cursor:pointer; margin:4px 6px 0 0; }
body.smal #karakterark, body.kort #karakterark{ left:0; right:0; top:auto; bottom:0; width:auto; max-height:62vh; border-width:1px 0 0; }`;
  document.head.appendChild(css);
  const panel = el('div', { id: 'karakterark', role: 'dialog', 'aria-label': 'Karakterark' }); document.body.appendChild(panel);
  const rad = document.querySelector('.knapper'), kn = knapp('Deg', () => (åpen ? lukk() : åpne()), { id: 'karakterknapp', title: 'Karakterarket: helse, sult, tørst, søvn, ferdigheter og utstyr (O)' }); kn.hidden = true;
  const tk = knapp('Utenfra', () => settTredje(!tredje), { id: 'tredjeknapp', title: 'Se deg selv utenfra (tredjeperson) eller gjennom øynene (V)', 'aria-pressed': 'false' }); tk.hidden = true;
  if (rad) { rad.insertBefore(kn, document.getElementById('meny')); rad.insertBefore(tk, kn); }
  function settTredje(v) { tredje = !!v; try { localStorage.setItem(TREDJE, tredje ? '1' : '0'); } catch (e) { /* sperret */ } tk.classList.toggle('på', tredje); tk.setAttribute('aria-pressed', String(tredje)); if (!tredje) rot.TREDJE = false; }
  settTredje(tredje);
  rot.addEventListener('keydown', e => { if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return; const t = e.target, tag = t && t.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; const st = document.getElementById('oppstart'); if (st && st.classList.contains('på')) return;
    const k = e.key.toLowerCase(); if (k === 'v' && går() && !fører()) settTredje(!tredje); else if (k === 'o' && klar) (åpen ? lukk() : åpne()); else if (e.key === 'Escape' && åpen) lukk(); });

  // ---------- karakterarket ----------
  const måler = (navn, andel, tekst, klasse = '') => el('div', { klasse: 'm ' + klasse }, el('b', {}, navn), el('div', { klasse: 's' }, el('i', { style: `width:${Math.round(Math.max(0, Math.min(1, andel)) * 100)}%` })), el('small', {}, tekst));
  function bygg() { const S = spill(), k = S.karakter, B = rot.Oppstart.BAKGRUNNER[k.bakgrunn] || {}, f = document.createDocumentFragment(), SS = rot.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill.K() : null, V = K.virkning(T.behov);
    f.append(knapp('×', lukk, { klasse: 'lukk', 'aria-label': 'Lukk karakterarket' }));
    const img = el('img', { alt: '' }); try { img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Oppstart.P.renderSVG(Oppstart.portrett(k.portrett, k.navn))); } catch (e) { img.hidden = true; }
    f.append(el('div', { klasse: 'hode' }, img, el('div', {}, el('h2', {}, k.navn || 'Uten navn'), el('small', {}, `${B.navn || ''} · leder ${S.fraksjon.navn}`), el('small', {}, B.tekst || ''))));
    f.append(el('h3', {}, 'Tilstand')); if (SS) f.append(måler('Helse', SS.hp / 100, `${Math.round(SS.hp)} av 100`, SS.hp < 30 ? 'lite' : SS.hp < 60 ? 'greit' : ''));
    for (const [id, D] of Object.entries(K.BEHOV)) f.append(måler(D.navn, T.behov[id] / 100, K.ord(id, T.behov[id]), K.tilstand(T.behov[id])));
    if (V.treff < 1 || V.løp < 1 || V.skade > 0) f.append(el('div', { klasse: 'tips', style: 'color:#f0a88a' }, [V.treff < 1 ? `Du treffer ${Math.round((1 - V.treff) * 100)} % dårligere` : '', V.løp < 1 ? `løper ${Math.round((1 - V.løp) * 100)} % kortere` : '', V.skade > 0 ? 'og helsa tærer' : ''].filter(Boolean).join(', ') + '.'));
    const t = ting(), rasjoner = t && t.feltrasjon ? t.feltrasjon : 0, knapper = el('div', {}); knapper.append(knapp(`Spis feltrasjon (${rasjoner} i sekken)`, spisRasjon, Object.assign({ id: 'spisrasjon' }, rasjoner > 0 ? {} : { disabled: '' })));
    if (rot.UtstyrSpill && UtstyrSpill.klar()) knapper.append(knapp('Åpne sekken', () => { lukk(); UtstyrSpill.åpne(true); })); f.append(knapper);
    const O = rot.OverlevSpill && OverlevSpill.klar && OverlevSpill.klar() ? OverlevSpill : null, FR = rot.Overlev && Overlev.Ferdigheter;
    if (O && FR) { f.append(el('h3', {}, 'Ferdigheter')); for (const [id, D] of Object.entries(FR.LISTE)) { const n = FR.nivå(O.F()[id]); f.append(måler(D.navn, n.andel, `nivå ${n.n}`, 'ferd')); } }
    if (rot.UtstyrSpill && UtstyrSpill.klar() && rot.Utstyr) { const I = UtstyrSpill.tilstand(); f.append(el('h3', {}, 'Du bærer'));
      I.våpen.forEach((v, i) => f.append(el('div', { klasse: 'rad' }, el('span', {}, (Utstyr.VÅPEN[v.id] || {}).navn || v.id, i === I.aktiv ? ' (i hånda)' : ''), el('small', {}, `${v.mag} i magasinet`))));
      let kg = null; try { kg = [Utstyr.vekt(I), Utstyr.maks()]; } catch (e) { kg = null; } if (kg && isFinite(kg[0])) f.append(måler('Vekt', kg[0] / kg[1], `${String(Math.round(kg[0] * 10) / 10).replace('.', ',')} av ${kg[1]} kg`, kg[0] > kg[1] * .9 ? 'lite' : 'ferd')); }
    f.append(el('h3', {}, 'Så langt')); const dag = Math.floor((typeof tid !== 'undefined' ? tid : 0) / (24 * TIME)) + 1, lett = rot.LeteSpill && LeteSpill.antall ? LeteSpill.antall() : 0;
    for (const [a, b] of [['Dager', String(dag)], ['Gått til fots', T.gått >= 1000 ? `${String(Math.round(T.gått / 100) / 10).replace('.', ',')} km` : `${Math.round(T.gått)} m`], ['Hus gjennomsøkt', String(lett)]]) f.append(el('div', { klasse: 'rad' }, el('span', {}, a), el('small', {}, b)));
    f.append(el('div', { klasse: 'tips' }, 'I leiren drikker, spiser og hviler du av deg selv. Ute: spis feltrasjoner, drikk ved et vann, og hvil i et hus du har sikret. Når du går, viser knappen «Utenfra» (V) deg selv i tredjeperson.'));
    return f; }
  function vis(tving) { if (!åpen || !klar) return; if (!tving && rot.pekerNede && pekerNede(panel)) return; const ny = el('div'); ny.append(bygg()); if (!tving && ny.innerHTML === sistHtml) return; sistHtml = ny.innerHTML; const topp = panel.scrollTop; panel.replaceChildren(...ny.childNodes); panel.scrollTop = topp; }
  function åpne() { if (!klar) return; åpen = true; panel.classList.add('på'); kn.classList.add('på'); sistHtml = ''; vis(true); }
  function lukk() { åpen = false; panel.classList.remove('på'); kn.classList.remove('på'); }
  setInterval(() => { kn.hidden = !klar; tk.hidden = !(klar && går() && !fører()); }, 500);
  Object.assign(ut, { start, åpne, lukk, erÅpen: () => åpen, T: () => T, klar: () => klar, treff: () => (klar && T ? K.virkning(T.behov).treff : 1), tredje: () => tredje, settTredje, figur: () => figur, spisRasjon, takt, lagre, varsler: () => (klar && T ? Object.keys(K.BEHOV).filter(k => T.behov[k] < K.R.lav).map(k => ({ id: k, tekst: K.ord(k, T.behov[k]), råd: K.BEHOV[k].råd })) : []) });
  rot.KarakterSpill = ut;
})(typeof globalThis !== 'undefined' ? globalThis : this);
