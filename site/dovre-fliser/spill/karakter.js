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
  // (runde 5) spoling = farten 60× eller mer; vedLeir = så nær leiren du steller deg av leirens lager mens du spoler; brems = det leiren
  // ikke har (vann, mat), går så mye saktere da (du sparer på det og venter). Claudes forslag.
  const R = { lav: 25, greit: 60, løpTørst: 1.6, hvile: 12, skade: 4, minTreff: .7, minLøp: .6, rasjon: 50, nær: 150, spoling: 60, vedLeir: 600, brems: .3 };
  const ny = () => ({ tørst: 100, sult: 100, søvn: 100 });
  // t spilltimer går: behovene synker. o.løper: tørsten går fortere.
  function steg(B, t, o = {}) { if (!(t > 0)) return B; for (const [k, D] of Object.entries(BEHOV)) B[k] = Math.max(0, (B[k] === undefined ? 100 : B[k]) - 100 / D.timer * t * (k === 'tørst' && o.løper ? R.løpTørst : 1) * (o.faktor && o.faktor[k] !== undefined ? o.faktor[k] : 1)); return B; }
  // (runde 5, fra en gjennomspilling: «karakteren blir utslitt når du spoler») Spoler du og er i eller ved leiren, steller du deg av
  // leirens lager; det leiren mangler (vann, mat), synker saktere. o: { spoler, avst (m fra leiren), vann, mat }. Gir { ved, faktor }.
  function stell(o) { const ved = o.avst <= (o.spoler ? R.vedLeir : R.nær), b = !!(o.spoler && ved);
    return { ved, faktor: { tørst: b && !o.vann ? R.brems : 1, sult: b && !o.mat ? R.brems : 1, søvn: 1 } }; }
  const fyll = (B, k, m) => { if (!BEHOV[k]) return 0; const før = B[k] || 0; B[k] = Math.max(0, Math.min(100, før + m)); return B[k] - før; };
  // Virkningen: faktor for treff og løping (1 = ingen), og helsetap per spilltime når noe står på 0.
  function virkning(B) { const lav = Math.min(B.tørst, B.sult, B.søvn), svak = Math.min(B.tørst, B.søvn), f = (v, min) => (v >= R.lav ? 1 : min + (1 - min) * v / R.lav);
    return { treff: f(lav, R.minTreff), løp: f(svak, R.minLøp), skade: Object.keys(BEHOV).filter(k => B[k] <= 0).length * R.skade, lavest: lav }; }
  const ord = (k, v) => BEHOV[k].ord[v <= 0 ? 0 : v < R.lav ? 1 : v < R.greit ? 2 : 3];
  const tilstand = v => (v <= 0 ? 'tomt' : v < R.lav ? 'lite' : v < R.greit ? 'greit' : '');
  // Utseendet fra portrettet (feltene i spill/portrett-motor.js). Fargene som [r, g, b] 0–1.
  const rgb = (hex, res) => { const m = /^#([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return res; const v = parseInt(m[1], 16); return [(v >> 16) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; };
  const KLÆR = { dress: 'dress', 'dress-gra': 'dress', 'dress-brun': 'dress', uniform: 'uniform', feltuniform: 'uniform', marineuniform: 'uniform', offisersjakke: 'uniform', genser: 'genser', hoyhalset: 'genser', skjorte: 'skjorte', frakk: 'frakk', skinnjakke: 'jakke', arbeidsjakke: 'jakke', jakke: 'jakke' };
  const mett = (c, k) => { const g = (c[0] + c[1] + c[2]) / 3; return c.map(v => Math.max(0, Math.min(1, g + (v - g) * k))); };
  function utseende(p) { p = p || {}; const h = String(p.hair || 'short');
    const stil = /^(bald|buzz)$/.test(h) ? 'snau' : /^(long|braid|ponytail|shag|mullet|bob)$/.test(h) ? 'langt' : /^(afro|curly|curls-short|waves)$/.test(h) ? 'krøll' : 'kort';
    const skjegg = p.facialHair && p.facialHair !== 'ingen' ? String(p.facialHair) : '', lue = p.headwear && p.headwear !== 'ingen' ? String(p.headwear) : '', briller = p.glasses && p.glasses !== 'ingen' ? String(p.glasses) : '';
    return { hud: rgb(p.skin, [.87, .69, .57]), hår: rgb(p.hairColor, [.16, .13, .12]), øyne: rgb(p.eyeColor, [.25, .35, .45]), stil, frisyre: h, hale: h === 'ponytail' || h === 'braid', skallet: h === 'bald', lugg: /^(fringe|bob|pixie|shag)$/.test(h), topp: /^(quiff|pompadour)$/.test(h), afro: h === 'afro',
      skjegg: !!skjegg, skjeggtype: skjegg, hodeplagg: !!lue, lue, briller: !!briller, brilletype: briller, jakke: mett(rgb(p.outfitColor, [.3, .34, .28]), 1.35), klær: KLÆR[p.outfit] || 'jakke', plagg: String(p.outfit || 'jakke'), høyhals: p.outfit === 'hoyhalset',
      kvinne: p.gender === 'kvinne', alder: Number.isFinite(p.age) ? p.age : null, opphav: p.origin ? String(p.origin) : '', bredde: p.face === 'bred' || p.face === 'rund' ? 1.07 : p.face === 'smal' ? .93 : 1, kantet: p.face === 'kantete', arr: p.detail === 'arr', fregner: p.detail === 'fregner', grå: Number.isFinite(p.grayAmount) ? p.grayAmount / 100 : 0 }; }
  const api = { BEHOV, R, ny, steg, stell, fyll, virkning, ord, tilstand, utseende };
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
  // (18. nov: rasjonen heter «rasjon» i sekken – før sto det «feltrasjon» her, så knappen virket aldri)
  function spisRasjon() { const t = ting(); if (!t || !(t.rasjon > 0)) { logg('Du har ingen feltrasjon i sekken.'); return false; } if (T.behov.sult > 95) { logg('Du er ikke sulten.'); return false; }
    t.rasjon--; if (!t.rasjon) delete t.rasjon; K.fyll(T.behov, 'sult', K.R.rasjon); UtstyrSpill.lagre(); UtstyrSpill.vis(); lagre(); logg('Du spiser en feltrasjon.'); vis(true); return true; }

  // hvert sekund: behovene synker med spilltiden, og fylles der det går
  function takt() { if (!klar || !T) return; const nå = typeof tid !== 'undefined' ? tid : 0; if (sistTid === null) sistTid = nå; const t = Math.max(0, Math.min(6, (nå - sistTid) / TIME)); sistTid = nå;
    if (auto() && t > 0) { const kr = går() && rot.Gange && Gange.kropp(), S0 = spill(), p0 = sted(), F0 = rot.FolkSpill && FolkSpill.tilstand();
      // spoler du (60× eller mer) og er ved leiren (600 m), steller du deg av leirens lager – og det den mangler, synker saktere
      const st = K.stell({ spoler: typeof tempo !== 'undefined' && tempo >= K.R.spoling, avst: S0 && S0.leir && p0 ? Math.hypot(p0.x - S0.leir.x, p0.y - S0.leir.y) : Infinity, vann: harVann(), mat: !!(F0 && F0.mat >= 1) });
      K.steg(T.behov, t, { løper: !!(kr && kr.løper && kr.fart > 2.5), faktor: st.faktor });
      if (st.ved) { const L = rot.LeirSpill && LeirSpill.tilstand(), F = F0;
        if (T.behov.tørst < K.R.greit && harVann()) { T.behov.tørst = 100; logg('Du drikker deg utørst i leiren.'); }
        if (T.behov.sult < K.R.greit && F && F.mat >= 1) { F.mat -= 1; K.fyll(T.behov, 'sult', K.R.rasjon); logg('Du spiser i leiren (én rasjon av leirens mat).'); }
        // (balansen 18. nov, Claudes forslag) du sover av deg selv i leiren også før brakka står – på bakken, halvt så godt. Før ble du
        // «utslitt» når du spolte de første timene.
        if (L && rot.Leir) K.fyll(T.behov, 'søvn', K.R.hvile * t * (Leir.plasser(L) > 0 ? 1 : .5)); }
      else if (rot.OverlevSpill && OverlevSpill.iTilflukt && går() && OverlevSpill.iTilflukt()) K.fyll(T.behov, 'søvn', K.R.hvile * t);
      // ute: drikk når du står ved vann
      const Q = r3(); if (går() && !fører() && T.behov.tørst < 80 && Q.ut && rot.Gange && Gange.vannVed && performance.now() - sistDrakk > 20000) { const k = Gange.kropp(), v = Gange.vannVed(Q.ut);
        if (k && [[2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5]].some(([dx, dy]) => v(k.x + dx, k.y + dy))) { sistDrakk = performance.now(); T.behov.tørst = 100; logg('Du drikker av vannet.'); } }
      const V = K.virkning(T.behov), SS = rot.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill.K() : null; if (V.skade > 0 && SS && SS.hp > 5) SS.hp = Math.max(5, SS.hp - V.skade * t);
      // løpingen (Bevegelse.REGLER.løpTid settes av overlev.js fra ferdigheten; her ganges behovene inn, og tung last fra spill/lut-visning.js)
      if (rot.Bevegelse && Bevegelse.REGLER) { if (!takt.løp0 || Math.abs(Bevegelse.REGLER.løpTid - takt.satt) > 1e-9) takt.løp0 = Bevegelse.REGLER.løpTid; takt.satt = takt.løp0 * V.løp * (rot.LutSpill && LutSpill.løp ? LutSpill.løp() : 1); Bevegelse.REGLER.løpTid = takt.satt; }
      for (const k of Object.keys(K.BEHOV)) { const til = K.tilstand(T.behov[k]); if ((til === 'lite' || til === 'tomt') && (takt.meldt = takt.meldt || {})[k] !== til) { takt.meldt[k] = til; logg(`Du er ${K.ord(k, T.behov[k])}. ${K.BEHOV[k].råd}`); } else if (!til && takt.meldt) delete takt.meldt[k]; } }
    if (performance.now() - sistLagret > 15000) { sistLagret = performance.now(); lagre(); } vis(false); }
  setInterval(takt, 1000);

  // ---------- figuren i 3D ----------
  const farg = (g, c) => { const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let q = 0; q < n; q++) f.set(c, q * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); return g; };
  const boks = (d, x, y, z, sx, sy, sz, c, ry) => { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); if (ry) g.rotateY(ry); g.translate(x, y, z + sz / 2); d.push(farg(g, c)); };
  function fjernFigur() { if (figur && figur.g.parent) figur.g.parent.remove(figur.g); if (figur) figur.g.traverse(m => { if (m.geometry) m.geometry.dispose(); }); figur = null; }
  // (17. nov, brukeren: «enda mer detaljert») Figuren ser mot +x med føttene i origo. Ledd: hofte -> kne og skulder -> albue (hvert ledd
  // er en gruppe med origo i leddet), hodet dreier i nakken. Hode, hår, skjegg, hodeplagg, briller og klær følger portrettet;
  // våpenet du har framme ligger i hendene. Ett materiale med hjørnefarger (ingen egne lys), og en myk skygge under føttene.
  const kule = (d, x, y, z, r, c, sx = 1, sy = 1, sz = 1, seg = 10) => { const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2)).toNonIndexed(); g.rotateX(Math.PI / 2); g.scale(sx, sy, sz); g.translate(x, y, z); d.push(farg(g, c)); };
  const rør = (d, x, y, z, r, l, akse, c, seg = 8, r2) => { const g = new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, l, seg).toNonIndexed(); if (akse === 'x') g.rotateZ(-Math.PI / 2); else if (akse === 'z') g.rotateX(Math.PI / 2); g.translate(x, y, z); d.push(farg(g, c)); };
  // RUNDE 7 (20. nov, kritikerne: «kantete klosser»): kropp, lemmer, hender og støvler er avrundede (kapsler og dreide profiler fra
  // spill/figur3d.js, myke normaler); uten Figur3d blir de kasser som før. kap: kapsel langs z fra z0 (radius r0) til z1 (r1).
  const kap = (d, x, y, z0, z1, r0, r1, c, seg = 10, sx = 1, sy = 1) => { if (!rot.Figur3d) { boks(d, x, y, z0 - r0, 2 * Math.max(r0, r1) * sx, 2 * Math.max(r0, r1) * sy, z1 - z0 + r0 + r1, c); return; } const g = Figur3d.form.kapsel(seg, r0, r1, z0, z1, sx, sy, 2); g.translate(x, y, 0); d.push(farg(g, c)); };
  const drei = (d, prof, sx, sy, c, seg = 14) => { if (!rot.Figur3d) return false; const g = Figur3d.form.dreid(seg, prof, sx, sy); d.push(farg(g, c)); return true; };
  function våpenDeler(id) { const d = [], st = [.1, .1, .11], st2 = [.17, .17, .18], tre = [.34, .23, .13], lang = { mp: .32, gevær: .5, hagle: .56, rifle: .66 }[id];
    if (!lang) { boks(d, .05, 0, -.02, .17, .03, .045, st); boks(d, -.02, 0, -.1, .045, .028, .1, st2); return d; }
    const tr = id === 'hagle' || id === 'rifle'; boks(d, 0, 0, -.03, .26, .045, .075, st); rør(d, .13 + lang / 2, 0, .012, .011, lang, 'x', st2, 6); boks(d, .13 + lang * .3, 0, -.035, lang * .55, .042, .045, tr ? tre : st2);
    boks(d, -.25, 0, -.045, .26, .04, .07, tr ? tre : st); boks(d, -.39, 0, -.07, .025, .045, .11, st2); boks(d, -.04, 0, -.13, .045, .035, .1, tr ? tre : st2);
    if (id === 'gevær' || id === 'mp') { const m = new THREE.BoxGeometry(.05, .03, id === 'mp' ? .2 : .16).toNonIndexed(); m.rotateY(.25); m.translate(.07, 0, -.13); d.push(farg(m, st2)); }
    if (id === 'rifle') { rør(d, .0, 0, .075, .017, .22, 'x', st, 8); for (const x of [-.06, .06]) boks(d, x, 0, .035, .014, .02, .03, st2); } else boks(d, .13 + lang - .03, 0, .02, .008, .008, .035, st);
    if (id === 'hagle') rør(d, .13 + lang * .4, 0, -.018, .011, lang * .75, 'x', st2, 6); return d; }
  function byggFigur(Rr) { const S = spill(), U = K.utseende(S && S.karakter && S.karakter.portrett), mat = new THREE.MeshLambertMaterial({ vertexColors: true }), g = new THREE.Group(), mørk = (c, k = .72) => c.map(v => v * k), lys = (c, k = 1.18) => c.map(v => Math.min(1, v * k));
    const hud = U.hud, hår = U.grå > .05 ? U.hår.map(v => v + (.72 - v) * U.grå) : U.hår, jakke = U.jakke, K2 = U.klær, bukse = K2 === 'dress' || K2 === 'uniform' ? mørk(jakke, .85) : [.2, .22, .2], støvel = [.09, .08, .07], sekk = [.27, .3, .21], lær = [.3, .2, .12], stål = [.45, .46, .45], by = U.kvinne ? .92 : 1;
    const nett = (d, forelder, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(MODELLER.samle(d), mat); m.position.set(x, y, z); m.frustumCulled = false; forelder.add(m); return m; }, ledd = (forelder, x, y, z) => { const q = new THREE.Group(); q.position.set(x, y, z); forelder.add(q); return q; };
    const kropp = ledd(g, 0, 0, 0), k = [];
    // overkroppen: hofte, liv, bryst og skuldre (smalere liv), og plagget fra portrettet
    if (!drei(k, [[0, .86], [.1, .87], [.19, .92], [.195, .98], [.185, 1.04]], .64, by, bukse) || !drei(k, [[.18, 1.0], [.18, 1.06], [.2, 1.16], [.22, 1.28], [.225, 1.38], [.2, 1.47], [.14, 1.51], [.07, 1.53]], .6, by, jakke)) {
      boks(k, 0, 0, .9, .24, .4 * by, .14, bukse); boks(k, 0, 0, 1.02, .23, .36 * by, .2, jakke); boks(k, .005, 0, 1.22, .26, .42 * by, .2, jakke); boks(k, 0, 0, 1.42, .24, .46 * by, .1, jakke); } for (const sy of [-1, 1]) kule(k, 0, sy * .24 * by, 1.46, .075, jakke, 1, 1, .8, 8);
    if (U.kvinne) for (const sy of [-1, 1]) kule(k, .1, sy * .09, 1.3, .07, jakke, .8, 1, 1, 8);
    boks(k, 0, 0, .985, .26, .41 * by, .05, lær); boks(k, .135, 0, .99, .02, .07, .04, [.66, .58, .36]);
    if (K2 === 'uniform') { for (const sy of [-1, 1]) { boks(k, .135, sy * .11, 1.26, .012, .12, .11, mørk(jakke)); boks(k, .14, sy * .11, 1.36, .014, .13, .03, lys(jakke)); boks(k, .146, sy * .11, 1.375, .008, .02, .02, [.7, .62, .38]); boks(k, 0, sy * .2 * by, 1.525, .13, .1, .018, mørk(jakke)); boks(k, .03, sy * .2 * by, 1.542, .03, .08, .006, [.72, .64, .4]);
        boks(k, .135, sy * .1, 1.05, .012, .13, .12, mørk(jakke)); boks(k, .1, sy * .05, 1.5, .08, .07, .05, lys(jakke)); } boks(k, .137, 0, 1.04, .008, .016, .44, mørk(jakke, .6)); for (let q = 0; q < 4; q++) boks(k, .142, 0, 1.08 + q * .1, .008, .02, .02, [.7, .62, .38]); boks(k, .142, -.11, 1.42, .008, .07, .016, [.6, .16, .12]); }
    else if (K2 === 'dress') { boks(k, .136, 0, 1.2, .01, .1, .28, [.92, .92, .9]); boks(k, .142, 0, 1.2, .008, .035, .26, [.45, .12, .12]); for (const sy of [-1, 1]) { const l = new THREE.BoxGeometry(.012, .09, .32).toNonIndexed(); l.rotateX(sy * .22); l.translate(.139, sy * .075, 1.34); k.push(farg(l, lys(jakke))); boks(k, .135, sy * .13, 1.02, .012, .11, .02, mørk(jakke)); } boks(k, .14, 0, 1.06, .008, .02, .02, mørk(jakke, .5)); }
    else if (K2 === 'genser') { for (let q = 0; q < 6; q++) boks(k, .135, 0, 1.03 + q * .07, .008, .38 * by, .012, mørk(jakke, .86)); boks(k, 0, 0, .99, .245, .38 * by, .04, mørk(jakke)); if (U.høyhals) rør(k, 0, 0, 1.57, .075, .09, 'z', jakke, 10); else rør(k, 0, 0, 1.53, .085, .03, 'z', mørk(jakke), 10); }
    else if (K2 === 'skjorte') { boks(k, .137, 0, 1.03, .008, .03, .46, lys(jakke)); for (let q = 0; q < 5; q++) boks(k, .143, 0, 1.06 + q * .09, .006, .014, .014, [.9, .9, .88]); boks(k, .136, .11, 1.3, .01, .1, .1, mørk(jakke, .9)); for (const sy of [-1, 1]) { const l = new THREE.BoxGeometry(.03, .1, .06).toNonIndexed(); l.rotateX(sy * .5); l.translate(.1, sy * .06, 1.52); k.push(farg(l, lys(jakke))); } }
    else if (K2 === 'frakk') { boks(k, .137, 0, .6, .008, .02, .92, mørk(jakke, .6)); for (const sy of [-1, 1]) { boks(k, .0, sy * .19 * by, .5, .26, .05, .42, jakke); boks(k, .1, sy * .11, .5, .06, .17, .42, jakke); boks(k, -.12, sy * .1, .5, .03, .2, .42, mørk(jakke, .9)); boks(k, .14, sy * .08, 1.38, .014, .1, .16, lys(jakke)); boks(k, .14, sy * .14, .78, .012, .1, .03, mørk(jakke)); } for (let q = 0; q < 3; q++) for (const sy of [-1, 1]) boks(k, .145, sy * .05, 1.02 + q * .12, .006, .02, .02, mørk(jakke, .5)); boks(k, 0, 0, 1.54, .16, .3, .05, lys(jakke)); }
    else { boks(k, .137, 0, 1.03, .008, .014, .46, [.6, .6, .6]); for (const sy of [-1, 1]) { boks(k, .136, sy * .12, 1.08, .012, .12, .02, mørk(jakke)); boks(k, .134, sy * .12, 1.0, .01, .12, .08, mørk(jakke, .9)); boks(k, .06, sy * .1, 1.52, .1, .08, .07, mørk(jakke)); } boks(k, 0, 0, .99, .25, .39 * by, .035, mørk(jakke, .8)); if (U.plagg === 'skinnjakke') for (const sy of [-1, 1]) boks(k, .138, sy * .06, 1.3, .008, .012, .16, [.7, .7, .7]); }
    // beltet: lommer, feltflaske og kniv
    boks(k, .06, -.2 * by, .93, .09, .05, .11, mørk(sekk)); boks(k, -.04, -.2 * by, .93, .08, .05, .1, mørk(sekk)); rør(k, -.02, .215 * by, .93, .045, .15, 'z', [.3, .36, .26], 8); rør(k, -.02, .215 * by, 1.02, .018, .03, 'z', [.1, .1, .1], 6); boks(k, .09, .21 * by, .84, .03, .025, .2, lær); boks(k, .09, .21 * by, 1.02, .028, .03, .07, [.1, .1, .1]);
    // sekken: hovedrom, lokk, lommer, remmer, sovepose og tau
    boks(k, -.25, 0, 1.0, .2, .34, .48, sekk); boks(k, -.25, 0, 1.47, .22, .36, .07, mørk(sekk)); boks(k, -.365, 0, 1.06, .06, .24, .22, mørk(sekk)); boks(k, -.39, 0, 1.2, .012, .1, .02, stål); for (const sy of [-1, 1]) { boks(k, -.25, sy * .2, 1.06, .14, .06, .24, mørk(sekk)); boks(k, .03, sy * .15 * by, 1.28, .28, .04, .26, mørk(sekk, .8)); boks(k, .135, sy * .15 * by, 1.3, .012, .045, .03, stål); boks(k, -.25, sy * .12, 1.0, .205, .02, .5, mørk(sekk, .8)); }
    rør(k, -.25, 0, 1.6, .085, .42, 'y', [.34, .22, .17], 10); for (const sy of [-1, 1]) rør(k, -.25, sy * .12, 1.6, .088, .02, 'y', [.12, .1, .09], 10); rør(k, -.25, 0, .96, .06, .3, 'y', [.5, .46, .36], 8);
    nett(k, kropp);
    // hodet: rundt, med kjeve, ører, øyne i din farge, bryn, nese, munn – og hår, skjegg, briller og hodeplagg fra portrettet
    const hode = ledd(kropp, 0, 0, 1.52), h = [], hb = U.bredde; rør(h, 0, 0, .04, .05, .1, 'z', hud, 8); kule(h, .01, 0, .2, .11, hud, 1, .9 * hb, 1.12, 12); boks(h, .03, 0, .09, .13, (U.kantet ? .17 : .14) * hb, .07, hud); kule(h, .06, 0, .1, .05, hud, 1, 1.2 * hb, .8, 8);
    for (const sy of [-1, 1]) { kule(h, -.005, sy * .1 * hb, .19, .028, mørk(hud, .9), .5, .5, 1, 6); kule(h, .1, sy * .042, .215, .017, [.96, .96, .94], .5, 1, .7, 6); kule(h, .108, sy * .042, .215, .009, U.øyne, .5, 1, 1, 6); kule(h, .112, sy * .042, .215, .004, [.04, .04, .05], .5, 1, 1, 5); boks(h, .1, sy * .043, .238, .02, .045, .009, mørk(hår, .8)); kule(h, .075, sy * .065, .16, .03, lys(hud, 1.05), .5, 1, .8, 6); }
    boks(h, .115, 0, .17, .03, .03, .055, mørk(hud, .93)); kule(h, .125, 0, .165, .017, mørk(hud, .9), 1, 1.1, .8, 6); boks(h, .108, 0, .125, .012, .055, .011, [.62, .34, .32]); boks(h, .105, 0, .1, .02, .04, .02, lys(hud, 1.03));
    if (U.fregner) for (let q = 0; q < 6; q++) boks(h, .108, -.06 + q * .024, .185 + (q % 2) * .012, .004, .006, .006, mørk(hud, .75)); if (U.arr) { const a2 = new THREE.BoxGeometry(.004, .008, .06).toNonIndexed(); a2.rotateX(.4); a2.translate(.106, .065, .2); h.push(farg(a2, lys(hud, 1.15))); }
    if (U.briller) { const rund = U.brilletype === 'runde' || U.brilletype === 'pilot'; for (const sy of [-1, 1]) { if (rund) rør(h, .122, sy * .043, .215, .026, .006, 'x', [.08, .08, .09], 10); else boks(h, .122, sy * .043, .2, .006, .05, .03, [.08, .08, .09]); boks(h, .06, sy * .095 * hb, .215, .12, .006, .008, [.08, .08, .09]); } boks(h, .122, 0, .215, .006, .03, .006, [.08, .08, .09]); }
    if (U.skjegg) { const t = U.skjeggtype, sk = mørk(hår, .95); if (t === 'bart' || t === 'hestesko') { boks(h, .112, 0, .138, .016, .075, .014, sk); if (t === 'hestesko') for (const sy of [-1, 1]) boks(h, .108, sy * .04, .1, .014, .014, .05, sk); }
      else if (t === 'fippskjegg') { boks(h, .112, 0, .138, .014, .06, .012, sk); boks(h, .1, 0, .07, .03, .04, .04, sk); }
      else { const tykk = t === 'helskjegg' ? .03 : t === 'kort-skjegg' ? .016 : .006, far = t === 'skjeggstubb' ? mørk(hud, .72) : sk; boks(h, .112, 0, .138, .014, .07, .012, far); boks(h, .08 + tykk / 2, 0, .06, .06 + tykk, .15 * hb + tykk, .06 + tykk, far); for (const sy of [-1, 1]) boks(h, .03, sy * (.085 * hb + tykk / 2), .1, .09, .012 + tykk, .09, far); if (t === 'helskjegg') boks(h, .08, 0, .02, .07, .13, .05, far); } }
    if (!U.skallet && !(U.hodeplagg && U.stil === 'snau')) { if (U.stil === 'snau') kule(h, 0, 0, .225, .113, mørk(hår, .9), 1, .9 * hb, 1.08, 10);
      else { kule(h, -.012, 0, .235, .118, hår, 1.02, .93 * hb, 1.08, 12); boks(h, -.085, 0, .13, .06, .19 * hb, .14, hår); for (const sy of [-1, 1]) boks(h, -.01, sy * .098 * hb, .2, .13, .016, .09, hår);
        if (U.lugg) boks(h, .09, 0, .265, .035, .17 * hb, .045, hår); if (U.topp) kule(h, .06, 0, .33, .06, hår, 1.2, 1.3, .8, 8); if (U.frisyre === 'sidepart' || U.frisyre === 'slick') boks(h, .04, .03, .315, .13, .11, .02, lys(hår, 1.12));
        if (U.afro) kule(h, -.01, 0, .26, .17, hår, 1, 1, 1, 12); else if (U.stil === 'krøll') for (let q = 0; q < 9; q++) kule(h, -.02 + Math.cos(q * 2.4) * .08, Math.sin(q * 2.4) * .085, .3 + (q % 3) * .012, .04, q % 2 ? hår : lys(hår, 1.1), 1, 1, 1, 6);
        if (U.stil === 'langt') { boks(h, -.1, 0, -.06, .05, .2 * hb, .22, hår); for (const sy of [-1, 1]) boks(h, -.04, sy * .1 * hb, 0, .1, .022, .2, hår); } if (U.hale) { rør(h, -.15, 0, .2, .028, .08, 'x', hår, 6); boks(h, -.18, 0, -.08, .04, .05, .3, hår); boks(h, -.165, 0, .19, .02, .06, .03, [.5, .14, .12]); } } }
    if (U.hodeplagg) { const lf = U.lue === 'barett' ? [.3, .1, .1] : U.lue === 'strikkelue' ? mørk(jakke, .8) : mørk(jakke, .7);
      if (U.lue === 'barett') { const b2 = new THREE.CylinderGeometry(.135, .12, .04, 12).toNonIndexed(); b2.rotateX(Math.PI / 2); b2.rotateX(.25); b2.translate(-.005, .02, .315); h.push(farg(b2, lf)); rør(h, 0, 0, .29, .112, .03, 'z', mørk(lf, .7), 12); boks(h, .1, -.04, .3, .012, .03, .03, [.75, .66, .4]); }
      else if (U.lue === 'strikkelue') { kule(h, -.005, 0, .25, .123, lf, 1, .95 * hb, 1.05, 12); rør(h, -.005, 0, .245, .123, .05, 'z', lys(lf, 1.2), 12); kule(h, -.005, 0, .385, .03, lys(lf, 1.3), 1, 1, 1, 6); }
      else if (U.lue === 'offiserslue') { rør(h, 0, 0, .3, .125, .05, 'z', lf, 12); rør(h, 0, 0, .34, .15, .04, 'z', lf, 12, .13); rør(h, 0, 0, .285, .127, .025, 'z', [.1, .1, .1], 12); boks(h, .13, 0, .27, .09, .16, .012, [.08, .08, .08]); boks(h, .128, 0, .31, .01, .04, .04, [.78, .68, .4]); }
      else { kule(h, -.005, 0, .25, .121, lf, 1, .95 * hb, 1, 12); boks(h, .14, 0, .275, .1, .15, .012, lf); } }
    nett(h, hode);
    // beina: lår (hofteleddet) og legg med støvel (kneleddet); knelapp, lårlomme, snøring og såle
    const beinet = sy => { const lår = ledd(g, 0, sy * .1 * by, .92), d1 = [], d2 = []; kap(d1, 0, 0, -.4, -.03, .072, .088, bukse); boks(d1, .086, 0, -.34, .012, .12, .14, mørk(bukse)); boks(d1, .0, sy * .086, -.32, .1, .012, .13, mørk(bukse, .85)); boks(d1, .088, 0, -.45, .014, .13, .1, mørk(bukse, .7)); nett(d1, lår);
      const legg = ledd(lår, 0, 0, -.44); kap(d2, -.005, 0, -.3, -.03, .058, .07, bukse); kap(d2, -.005, 0, -.335, -.315, .072, .072, mørk(bukse)); kap(d2, 0, 0, -.42, -.33, .066, .068, støvel); { const f = new THREE.SphereGeometry(.06, 12, 8); f.scale(1.85, 1.2, .85); f.translate(.05, 0, -.43); d2.push(farg(f, støvel)); } boks(d2, .03, 0, -.495, .3, .165, .025, [.04, .04, .04]); for (let q = 0; q < 4; q++) boks(d2, .084, 0, -.42 + q * .03, .008, .08, .008, [.5, .44, .3]); boks(d2, .16, 0, -.46, .02, .14, .05, mørk(støvel, 1.6)); nett(d2, legg); return { lår, legg }; };
    // armene: overarm (skulderleddet) og underarm med hånd og fingre (albueleddet); merke, mansjett og klokke
    const armen = sy => { const over = ledd(g, 0, sy * .285 * by, 1.47), d1 = [], d2 = [], kort = K2 === 'skjorte'; kap(d1, 0, 0, -.27, -.03, .05, .062, jakke); boks(d1, 0, sy * .062, -.18, .09, .008, .09, K2 === 'uniform' ? [.2, .28, .5] : lys(jakke)); kap(d1, 0, 0, -.31, -.29, .053, .053, mørk(jakke), 10); nett(d1, over);
      const under = ledd(over, 0, 0, -.3); kap(d2, .005, 0, -.23, -.02, .042, .05, kort ? hud : jakke); if (kort) boks(d2, .005, 0, -.05, .115, .115, .05, lys(jakke)); else boks(d2, .005, 0, -.26, .112, .112, .04, mørk(jakke)); if (sy > 0) { boks(d2, .005, 0, -.275, .108, .108, .02, [.1, .1, .1]); boks(d2, .06, 0, -.275, .008, .04, .03, [.75, .78, .8]); }
      { const h = new THREE.SphereGeometry(.043, 10, 7); h.scale(.85, 1.05, 1.1); h.translate(.01, 0, -.31); d2.push(farg(h, hud)); } for (let q = 0; q < 4; q++) kap(d2, .02, -.034 + q * .023, -.39, -.33, .0095, .0105, mørk(hud, .96), 6); kap(d2, .05, sy * -.045, -.36, -.31, .011, .012, hud, 6); nett(d2, under); return { over, under }; };
    const D = { g, kropp, hode, b: [beinet(1), beinet(-1)], a: [armen(1), armen(-1)], vid: '', våpen: null, mat };
    const sk = new THREE.Mesh(new THREE.CircleGeometry(.5, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .28, depthWrite: false })); sk.position.z = .03; sk.frustumCulled = false; g.add(sk);
    g.userData.kilde = 'karakter.js'; Rr.scene.add(g); return D; }
  // våpenet du har framme: i hendene (langt våpen) eller i høyre hånd (pistol); bygges på nytt når du bytter
  function settVåpen(D) { const I = rot.UtstyrSpill && UtstyrSpill.klar() ? UtstyrSpill.aktivt() : null, id = I && I.v ? I.v.id : ''; if (id === D.vid) return; D.vid = id; if (D.våpen) { D.våpen.parent.remove(D.våpen); D.våpen.geometry.dispose(); D.våpen = null; } if (!id) return;
    const m = new THREE.Mesh(MODELLER.samle(våpenDeler(id)), D.mat); m.frustumCulled = false; D.lang = id !== 'pistol';
    if (D.lang) { m.position.set(.2, -.04, 1.14); m.rotation.order = 'ZYX'; m.rotation.set(.15, .32, .55); D.kropp.add(m); } else { m.position.set(.03, 0, -.4); m.rotation.y = 1.4; D.a[1].under.add(m); } D.våpen = m; }
  KROKER.ramme3d.push(Rr => { if (!klar || typeof THREE === 'undefined' || !rot.MODELLER || !Rr.ut) return; if (figur && figur.g.parent !== Rr.scene) fjernFigur(); if (!figur) figur = byggFigur(Rr);
    const u = Rr.ut, gå = går() && !fører(), kr = gå && rot.Gange ? Gange.kropp() : null, nå = performance.now(), dt = Math.min(.1, (nå - (figur.t || nå)) / 1000); figur.t = nå; let x, y, z, a, fart = 0;
    if (kr) { x = kr.x; y = kr.y; z = kr.z; a = Rr.fot.a + Math.PI / 2; fart = kr.fart || 0; if (sistPos) { const d = Math.hypot(kr.x + u.cx - sistPos[0], kr.y + u.cy - sistPos[1]); if (d < 20) T.gått += d; } sistPos = [kr.x + u.cx, kr.y + u.cy]; }
    else { sistPos = null; const s = ENHETER.find(e => e.karakter); if (!s || fører() || Math.abs(s.x - u.cx) > u.S || Math.abs(s.y - u.cy) > u.S) { figur.g.visible = false; return; } x = s.x - u.cx; y = s.y - u.cy; z = (hoyde3d(s.x, s.y) - u.h0) * Rr.EX; a = s.retning || 0; fart = s.sti ? 1.4 : 0; }
    const inne = kr && rot.Interior3d && Interior3d.inne && Interior3d.inne(kr.x, kr.y), vis3 = kr ? tredje && !inne : true; rot.TREDJE = !!(kr && vis3); figur.g.visible = vis3; if (!vis3) return;
    settVåpen(figur);
    // gangen: lårene svinger, kneet bøyer når beinet føres fram, kroppen duver og lener seg litt når du løper; på huk bøyes hofte og kne
    const D = figur, huk = !!(kr && kr.huk), amp = Math.min(1, fart / 1.6) * (fart > 3 ? .85 : .55), dv = huk ? .34 : 0; fase += fart * dt * (fart > 3 ? 1.75 : 2.5); D.huk = (D.huk || 0) + (dv - (D.huk || 0)) * Math.min(1, dt * 10);
    D.g.position.set(x, y, z - D.huk + Math.abs(Math.sin(fase)) * .035 * Math.min(1, fart / 1.6)); D.g.rotation.z = a; D.kropp.rotation.y = Math.min(.22, fart * .03) + D.huk * .5 + Math.sin(nå / 900) * .008;
    D.b.forEach((q, i) => { const f2 = fase + i * Math.PI, sv = Math.sin(f2); q.lår.rotation.y = -sv * amp - D.huk * 2.9; q.legg.rotation.y = Math.max(0, Math.cos(f2 + .5)) * amp * 1.5 + D.huk * 4.6; });
    const hold = !!D.våpen && D.lang; D.a.forEach((q, i) => { const sv = Math.sin(fase + (i ? 0 : Math.PI)) * amp; if (hold) { q.over.rotation.set(0, i ? -.35 : -.5, 0); q.under.rotation.order = 'ZYX'; q.under.rotation.set(0, i ? -1.2 : -1.1, i ? .75 : -.75); } else { q.over.rotation.set(0, -sv * .8, 0); q.under.rotation.set(0, -.15 - Math.max(0, sv) * .5 - (fart > 3 ? .9 : 0), 0); } });
    D.hode.rotation.y = kr ? -Rr.fot.pitch * .6 : 0; D.hode.rotation.z = Math.sin(nå / 2300) * .06 * (fart < .2 ? 1 : 0);
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
#karakterark .m{ display:grid; grid-template-columns:86px 1fr auto; gap:8px; align-items:center; padding:3px 0; } #karakterark .m .s{ height:10px; background:#2e281e; } #karakterark .m .s i{ display:block; height:100%; background:#8fc46a; } #karakterark .m small{ color:var(--ink-dim,#a99); white-space:nowrap; }
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
  function bygg() { const S = spill(), k = S.karakter, B = rot.Oppstart.BAKGRUNNER[k.bakgrunn] || {}, f = document.createDocumentFragment(), UT = K.utseende(k.portrett), SS = rot.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill.K() : null, V = K.virkning(T.behov);
    f.append(knapp('×', lukk, { klasse: 'lukk', 'aria-label': 'Lukk karakterarket' }));
    const img = el('img', { alt: '' }); try { img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Oppstart.P.renderSVG(Oppstart.portrett(k.portrett, k.navn))); } catch (e) { img.hidden = true; }
    f.append(el('div', { klasse: 'hode' }, img, el('div', {}, el('h2', {}, k.navn || 'Uten navn'), el('small', {}, [UT.alder ? UT.alder + ' år' : '', UT.opphav ? 'fra ' + UT.opphav : ''].filter(Boolean).join(' · ')), el('small', {}, `${B.navn || ''} · leder ${S.fraksjon.navn}`), el('small', {}, B.tekst || ''))));
    f.append(el('h3', {}, 'Tilstand')); if (SS) f.append(måler('Helse', SS.hp / 100, `${Math.round(SS.hp)} av 100`, SS.hp < 30 ? 'lite' : SS.hp < 60 ? 'greit' : ''));
    for (const [id, D] of Object.entries(K.BEHOV)) { const igjen = T.behov[id] / 100 * D.timer; f.append(måler(D.navn, T.behov[id] / 100, K.ord(id, T.behov[id]) + (T.behov[id] > 0 ? ` · tom om ${igjen >= 1 ? Math.round(igjen) + ' t' : Math.max(1, Math.round(igjen * 60)) + ' min'}` : ''), K.tilstand(T.behov[id]))); }
    if (V.treff < 1 || V.løp < 1 || V.skade > 0) f.append(el('div', { klasse: 'tips', style: 'color:#f0a88a' }, [V.treff < 1 ? `Du treffer ${Math.round((1 - V.treff) * 100)} % dårligere` : '', V.løp < 1 ? `løper ${Math.round((1 - V.løp) * 100)} % kortere` : '', V.skade > 0 ? 'og helsa tærer' : ''].filter(Boolean).join(', ') + '.'));
    const t = ting(), rasjoner = t && t.rasjon ? t.rasjon : 0, knapper = el('div', {}); knapper.append(knapp(`Spis feltrasjon (${rasjoner} i sekken)`, spisRasjon, Object.assign({ id: 'spisrasjon' }, rasjoner > 0 ? {} : { disabled: '' })));
    if (rot.UtstyrSpill && UtstyrSpill.klar()) knapper.append(knapp('Åpne sekken', () => { lukk(); UtstyrSpill.åpne(true); })); f.append(knapper);
    const O = rot.OverlevSpill && OverlevSpill.klar && OverlevSpill.klar() ? OverlevSpill : null, FR = rot.Overlev && Overlev.Ferdigheter;
    if (O && FR) { f.append(el('h3', {}, 'Ferdigheter')); for (const [id, D] of Object.entries(FR.LISTE)) { const n = FR.nivå(O.F()[id]); f.append(måler(D.navn, n.andel, `nivå ${n.n}`, 'ferd')); } }
    if (rot.UtstyrSpill && UtstyrSpill.klar() && rot.Utstyr) { const I = UtstyrSpill.tilstand(); f.append(el('h3', {}, 'Du bærer'));
      I.våpen.forEach((v, i) => f.append(el('div', { klasse: 'rad' }, el('span', {}, (Utstyr.VÅPEN[v.id] || {}).navn || v.id, i === I.aktiv ? ' (i hånda)' : ''), el('small', {}, `${v.mag} i magasinet`))));
      let kg = null; try { kg = [Utstyr.vekt(I), Utstyr.maks()]; } catch (e) { kg = null; } if (kg && isFinite(kg[0])) f.append(måler('Vekt', kg[0] / kg[1], `${String(Math.round(kg[0] * 10) / 10).replace('.', ',')} av ${kg[1]} kg`, kg[0] > kg[1] * .9 ? 'lite' : 'ferd')); }
    // tillegg fra andre moduler (spill/eventyr-visning.js: historie, skader, hund, håndverk, kart): window.KARAKTERARK.push((f, { el, knapp, måler }) => …)
    for (const fn of rot.KARAKTERARK || []) { try { fn(f, { el, knapp, måler }); } catch (e) { console.error(e); } }
    f.append(el('h3', {}, 'Så langt')); const dag = Math.floor((typeof tid !== 'undefined' ? tid : 0) / (24 * TIME)) + 1, lett = rot.LeteSpill && LeteSpill.antall ? LeteSpill.antall() : 0;
    for (const [a, b] of [['Dager', String(dag)], ['Gått til fots', T.gått >= 1000 ? `${String(Math.round(T.gått / 100) / 10).replace('.', ',')} km` : `${Math.round(T.gått)} m`], ['Hus gjennomsøkt', String(lett)]]) f.append(el('div', { klasse: 'rad' }, el('span', {}, a), el('small', {}, b)));
    f.append(el('div', { klasse: 'tips' }, 'I leiren drikker, spiser og hviler du av deg selv. Ute blir du tørst og sulten av å gå: ta med vann i feltflaska og rasjoner, drikk ved et vann, og sov i et hus du har sikret. Når du går, viser knappen «Utenfra» (V) deg selv i tredjeperson.'));
    return f; }
  function vis(tving) { if (!åpen || !klar) return; if (!tving && rot.pekerNede && pekerNede(panel)) return; const ny = el('div'); ny.append(bygg()); if (!tving && ny.innerHTML === sistHtml) return; sistHtml = ny.innerHTML; const topp = panel.scrollTop; panel.replaceChildren(...ny.childNodes); panel.scrollTop = topp; }
  function åpne() { if (!klar) return; åpen = true; panel.classList.add('på'); kn.classList.add('på'); sistHtml = ''; vis(true); }
  function lukk() { åpen = false; panel.classList.remove('på'); kn.classList.remove('på'); }
  setInterval(() => { kn.hidden = !klar; tk.hidden = !(klar && går() && !fører()); }, 500);
  Object.assign(ut, { start, åpne, lukk, vis, iLeiren, sted, harVann, erÅpen: () => åpen, T: () => T, klar: () => klar, treff: () => (klar && T ? K.virkning(T.behov).treff : 1), tredje: () => tredje, settTredje, figur: () => figur, spisRasjon, takt, lagre, varsler: () => (klar && T ? Object.keys(K.BEHOV).filter(k => T.behov[k] < K.R.lav).map(k => ({ id: k, tekst: K.ord(k, T.behov[k]), råd: K.BEHOV[k].råd })) : []) });
  rot.KarakterSpill = ut;
})(typeof globalThis !== 'undefined' ? globalThis : this);
