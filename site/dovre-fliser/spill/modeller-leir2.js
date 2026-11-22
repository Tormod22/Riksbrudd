'use strict';
// Leirmodeller, runde 2 (22. nov 2026, docs/modeller-liste.md del A–C: leirbygg som finnes, nye leirbygg og ting i leiren).
// Bygger på hjelperne i spill/modeller.js (MODELLER.H): én BufferGeometry med hjørnefarger per modell, mål i meter, z opp,
// fronten/døra mot +x, origo midt på bunnen. Samme fotavtrykk, dører og høyder som modellene de erstatter, så interiøret
// (interior3d.js LEIRBYGG), hindringene og 2D-kartet (leir2d.js) stemmer.
//
// MODELLER.LEIR2[modellnavn](b) gir geometrien for bygget b (b.nivå 1–3 synes der lista sier det). leir-visning.js modell()
// spør her først. Modeller over 1000 trekanter får en enklere utgave (geometry.userData.fjern) som byttes inn lenger enn
// ca. 150 m unna (KROKER.ramme3d nederst). Stil: 2020-tallets private militærselskap – grått, oliven, sand, selskapets farge
// som detalj (fra flagget du valgte ved start). Ingen navn eller merker fra virkelige firma.
(function () {
  const M = window.MODELLER; if (!M || !M.H) return;
  const { F, rgb, tone, farg, samle, ferdig, boks, syl, stav, bjelke, prisme, saltak, gavl, flytt, påVegg, vindu, dør, rødtKors, frø } = M.H;
  // egne farger i tillegg til F (moderne og nøkternt)
  const K = {
    panel: '#8a8d86', panelM: '#6f736d', mørk: '#3a3f42', mørkM: '#2b2e30', stålG: '#a7acae', galv: '#b4b8b7', sand: '#a39578', sandM: '#857a62',
    oliven: '#55603f', olivenM: '#424b31', grå: '#7c807d', hvit: '#d9d8d2', gul: '#d1a92c', svartgul: '#1f2022', rød: '#a8241f', grønnLys: '#5fd16a',
    glass: '#22313a', glassL: '#3a5260', lys: '#f3e9bf', ir: '#5a1414', gummi: '#1c1c1d', aluminium: '#c3c7c8', betong: '#8f8d87',
  };
  const LEIR2 = M.LEIR2 = M.LEIR2 || {};
  const trek = g => g.attributes.position.count / 3;

  // ---------- felles hjelpere ----------
  // selskapets farger fra flagget (oppstart.js: fraksjon.flagg.farger og symbolfarge)
  function selskap() {
    try { const f = window.OppstartSpill.tilstand().fraksjon.flagg; return { farge: f.farger[0] || '#1d3557', detalj: f.symbolfarge || f.farger[1] || '#e0b53a', tredje: f.farger[2] || f.farger[1] || '#8f2a24' }; }
    catch (e) { return { farge: '#1d3557', detalj: '#e0b53a', tredje: '#8f2a24' }; }
  }
  // Skive (rund plate/sylinder) med aksen langs x, y eller z, midt i (x, y, z)
  function skive(x, y, z, r, t, f, akse, seg, r2) {
    const g = new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, t, seg || 10);
    if (akse === 'x') g.rotateZ(-Math.PI / 2); else if (akse !== 'y') g.rotateX(Math.PI / 2);
    g.translate(x, y, z); return farg(g, f);
  }
  // Kule (lav oppløsning)
  function kule(x, y, z, r, f, n) { const g = new THREE.SphereGeometry(r, n || 8, Math.max(4, (n || 8) - 2)); g.translate(x, y, z); return farg(g, f); }
  // Halvkule med flaten ned (kuppel)
  function kuppel(x, y, z, r, f, n) { const g = new THREE.SphereGeometry(r, n || 10, 5, 0, Math.PI * 2, 0, Math.PI / 2); g.rotateX(Math.PI / 2); g.translate(x, y, z); return farg(g, f); }
  // Vertikale sømmer i kledningen rundt en kasse B × L (x × y) fra z og H opp; hopper over døråpningen på +x
  function sømmer(d, B, L, z, H, steg, f, dørY) {
    for (let y = -L / 2 + steg; y < L / 2 - .2; y += steg) for (const sx of [-1, 1]) {
      if (sx > 0 && dørY !== undefined && Math.abs(y - dørY) < .9) continue;
      d.push(boks(sx * (B / 2 + .012), y, z, .03, .05, H, f));
    }
    for (let x = -B / 2 + steg; x < B / 2 - .2; x += steg) for (const sy of [-1, 1]) d.push(boks(x, sy * (L / 2 + .012), z, .05, .03, H, f));
  }
  // Moderne vindu: mørk karm, glass, aluminiumsbenk. Enkel (LOD): bare glasset.
  function vind(x, y, z, b, h, side, e, ramme) {
    if (e) return påVegg([boks(.03, 0, 0, .04, b, h, K.glass)], x, y, z, side);
    return påVegg([boks(.035, 0, 0, .05, b, h, K.glass), boks(.02, 0, -.06, .04, b + .12, h + .12, ramme || K.mørkM),
      boks(.06, 0, h * .5 - .02, .03, b, .04, ramme || K.mørkM), boks(.08, 0, -.11, .14, b + .16, .04, K.aluminium)], x, y, z, side);
  }
  // Utedel til aircondition på veggen (vender ut fra veggen, origo der den henger), med vifte og rør
  function ac(x, y, z, side, e) {
    const d = [boks(.18, 0, 0, .32, .82, .6, '#d4d4cf')];
    if (!e) { d.push(skive(.345, -.12, .3, .21, .02, '#3d4143', 'x', 12), skive(.355, -.12, .3, .05, .02, '#8d9193', 'x', 6), boks(.345, .27, .1, .02, .16, .4, '#b9bab4'));
      d.push(bjelke([.02, -.3, -.05], [.36, -.3, -.05], .04, K.stålG), bjelke([.02, .3, -.05], [.36, .3, -.05], .04, K.stålG), stav([.05, .35, .5], [.05, .35, 1.1], .025, K.hvit, 4)); }
    return påVegg(d, x, y, z, side);
  }
  // Trapp ut fra en vegg i x0 mot +x: repos (lan dypt) i høyden h, trinn ned, rekkverk på begge sider
  function trapp(d, x0, y, h, br, lan, f, e) {
    const n = Math.max(1, Math.round(h / .18) - 1);
    d.push(boks(x0 + lan / 2, y, 0, lan, br, h, f));
    for (let i = 1; i <= n; i++) d.push(boks(x0 + lan + (i - .5) * .28, y, 0, .28, br * .94, h * (n + 1 - i) / (n + 1), f));
    if (e) return;
    const x1 = x0 + lan + n * .28;
    for (const s of [-1, 1]) { const yy = y + s * (br / 2 - .04);
      d.push(stav([x0 + .05, yy, h], [x0 + .05, yy, h + .95], .025, K.stålG, 4), stav([x1, yy, 0], [x1, yy, .95], .025, K.stålG, 4));
      d.push(stav([x0 + .05, yy, h + .95], [x0 + lan, yy, h + .95], .02, K.stålG, 4), stav([x0 + lan, yy, h + .95], [x1, yy, .95], .02, K.stålG, 4)); }
  }
  // Skilt med selskapets merke: plate i selskapets farge med ramme, merke (to ringer) og «tekst» (lyse streker). Ligger på en vegg.
  function selskapsskilt(x, y, z, b, h, side) {
    const S = selskap(), d = [boks(.02, 0, -.04, .04, b + .08, h + .08, K.mørkM), boks(.045, 0, 0, .03, b, h, S.farge)];
    const r = h * .36, mx = -b / 2 + h * .5;
    d.push(skive(.07, mx, h / 2, r, .02, S.detalj, 'x', 14), skive(.08, mx, h / 2, r * .62, .02, S.farge, 'x', 14), skive(.09, mx, h / 2, r * .3, .02, S.detalj, 'x', 10));
    const t0 = mx + r + .12, tl = b / 2 - .1 - t0;
    if (tl > .2) { d.push(boks(.065, t0 + tl / 2, h * .56, .01, tl, h * .16, '#ece9df'), boks(.065, t0 + tl * .35, h * .3, .01, tl * .7, h * .09, S.detalj)); }
    return påVegg(d, x, y, z, side);
  }
  // Varseltrekant (gul med svart kant) på en vegg, s = sidelengde
  function varsel(x, y, z, s, side) {
    const tri = (r, f, o) => { const g = new THREE.CylinderGeometry(r, r, .02, 3); g.rotateZ(-Math.PI / 2); g.rotateX(Math.PI / 2); g.translate(o, 0, 0); return farg(g, f); };
    return påVegg([tri(s * .58, K.svartgul, .02), tri(s * .46, K.gul, .035), boks(.045, 0, -.04 * s, .01, .05 * s, .3 * s, K.svartgul)], x, y, z + s * .3, side);
  }
  // Sandsekk: flatklemt sekskantet pute langs y, lengde l, midt i (x, y), bunnen på z
  function sekk(x, y, z, l, rz, f) {
    const g = new THREE.CylinderGeometry(.22, .22, l, 6, 1); g.rotateY(Math.PI / 6); g.scale(1, 1, .5); g.translate(0, 0, .11); if (rz) g.rotateZ(rz); g.translate(x, y, z); return farg(g, f);
  }
  const SEKKFARGE = [K.sand, '#9d8a66', '#8f8466', '#a39370', '#8c8169'];
  // Kabel som henger mellom punkter (en stav per bit)
  function kabel(d, P, r, f) { for (let i = 1; i < P.length; i++) d.push(stav(P[i - 1], P[i], r || .02, f || K.gummi, 4)); }
  // Varselstriper (gul/svart) langs x, lengde l, midt i (x, y) på z
  function striper(d, x, y, z, l, sy, sz, n) { for (let i = 0; i < n; i++) d.push(boks(x - l / 2 + (i + .5) * l / n, y, z, l / n, sy, sz, i % 2 ? K.svartgul : K.gul)); }

  // Detaljnivå: lag(b, enkel) -> liste med deler. Over 1000 trekanter får geometrien en enkel utgave i userData.fjern.
  function lod(lag) {
    return b => {
      b = b || {}; const g = ferdig(lag(b, false));
      if (trek(g) > 1000) { const f = ferdig(lag(b, true)); let av = false; const begge = () => { if (av) return; av = true; g.dispose(); f.dispose(); };
        g.addEventListener('dispose', begge); f.addEventListener('dispose', begge); g.userData.fjern = f; }
      return g;
    };
  }
  const nivå = b => Math.max(1, Math.min(3, (b && b.nivå) || 1));

  // =====================================================================================================================
  // A1 ★ Kontrollrom (hovedhus): to etasjer i moderne plate, saltak i mørk stålplate, trapp med rekkverk, baldakin og
  // selskapsskilt over døra, antennemast med parabol og pisker på mønet, ventilasjon, aircondition bak. 9 × 12 m, døra mot +x.
  LEIR2.hovedhus = lod((b, e) => {
    const L = 12, B = 9, H = 5.6, s = .4, h = 1.3, d = [];
    d.push(boks(0, 0, 0, B + .3, L + .3, s, K.betong), boks(0, 0, s, B, L, H, K.panel), boks(0, 0, s, B + .04, L + .04, .45, K.mørk));
    d.push(boks(0, 0, s + 2.75, B + .06, L + .06, .18, K.mørk), boks(0, 0, s + H - .15, B + .06, L + .06, .15, K.mørkM));
    if (!e) sømmer(d, B, L, s + .45, H - .6, 1.5, K.panelM, 0);
    d.push(flytt(gavl(L, B, h, K.panel), 0, 0, s + H, Math.PI / 2), flytt(saltak(L, B, h, '#34383b', .45), 0, 0, s + H, Math.PI / 2));
    // vinduer
    for (const y of [-4.2, -2.6, 2.6, 4.2]) d.push(vind(B / 2, y, s + .9, 1.1, 1.3, 'x+', e));
    for (const y of [-4.2, -2.1, 2.1, 4.2]) d.push(vind(B / 2, y, s + 3.4, 1.1, 1.3, 'x+', e));
    for (const y of [-4, -1.3, 1.3, 4]) d.push(vind(-B / 2, y, s + .9, 1.1, 1.3, 'x-', e), vind(-B / 2, y, s + 3.4, 1.1, 1.3, 'x-', e));
    for (const sy of [-1, 1]) d.push(vind(0, sy * L / 2, s + 3.4, 2.4, 1.1, sy > 0 ? 'y+' : 'y-', e), vind(0, sy * L / 2, s + H + .25, .8, .8, sy > 0 ? 'y+' : 'y-', e));
    // døra, baldakin og selskapsskiltet over
    d.push(dør(B / 2, 0, s, 1.2, 2.2, 'x+', K.mørk, K.mørkM));
    d.push(boks(B / 2 + .7, 0, s + 2.45, 1.4, 2.6, .12, K.mørkM));
    d.push(selskapsskilt(B / 2, 0, s + 2.66, 2.6, .55, 'x+'));
    trapp(d, B / 2, 0, s, 2.2, .8, K.betong, e);
    if (!e) {
      d.push(bjelke([B / 2, -1.2, s + 2.2], [B / 2 + 1.3, -1.2, s + 2.47], .05, K.mørkM), bjelke([B / 2, 1.2, s + 2.2], [B / 2 + 1.3, 1.2, s + 2.47], .05, K.mørkM));
      d.push(boks(B / 2 + .06, -.9, s + 2.2, .1, .2, .14, K.lys), boks(B / 2 + .05, .95, s + 1.1, .06, .22, .3, '#9a9d98'));   // lampe, kortleser
      // nedløpsrør i hjørnene
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) d.push(stav([sx * (B / 2 + .06), sy * (L / 2 + .06), .1], [sx * (B / 2 + .06), sy * (L / 2 + .06), s + H], .045, K.mørk, 6));
      // aircondition bak (x−) på bakken og på veggen
      d.push(flytt(boks(0, 0, 0, .55, 1.1, .8, '#d4d4cf'), -B / 2 - .4, -3.2, 0), skive(-B / 2 - .68, -3.2, .42, .3, .02, '#3d4143', 'x', 12));
      d.push(flytt(boks(0, 0, 0, .55, 1.1, .8, '#d4d4cf'), -B / 2 - .4, 3.2, 0), skive(-B / 2 - .68, 3.2, .42, .3, .02, '#3d4143', 'x', 12));
      d.push(ac(-B / 2, 0, s + 3.2, 'x-'));
      kabel(d, [[-B / 2 - .3, -3.2, .8], [-B / 2 - .1, -3.2, 1.4], [-B / 2 - .05, -3.2, s + 2.4]], .03, K.hvit);
    }
    // på taket: ventilasjonshetter, antennemast med tverrstag, pisker og parabol, kabelbro ned gavlen
    const z0 = s + H + h;
    d.push(boks(-2.2, 2.6, s + H + .55, .7, .7, .9, K.panelM), boks(-2.2, 2.6, s + H + 1.42, .9, .9, .08, K.mørkM));
    d.push(syl(2.2, -1.5, s + H + .5, .14, .9, K.mørk, 8), syl(2.2, -1.5, s + H + 1.38, .2, .06, K.mørk, 8));
    d.push(stav([0, -4, z0 - .3], [0, -4, z0 + 6.5], .06, K.stålG, 6));
    if (!e) {
      for (const k of [2, 3.8, 5.6]) d.push(bjelke([0, -4.7, z0 + k], [0, -3.3, z0 + k], .045, K.stålG));
      d.push(stav([0, -4.7, z0 + 5.6], [0, -4.7, z0 + 7.2], .015, K.mørk, 4), stav([0, -3.3, z0 + 3.8], [0, -3.3, z0 + 5.6], .015, K.mørk, 4), stav([0, -4, z0 + 6.5], [0, -4, z0 + 7.4], .015, K.stålG, 4));
      d.push(kule(0, -4, z0 + 6.55, .06, K.rød, 6), boks(0, -4.7, z0 + 2.05, .12, .06, .9, K.hvit), boks(0, -3.3, z0 + 2.05, .12, .06, .9, K.hvit));
      const par = skive(0, 0, 0, .55, .1, '#e7e6e1', 'z', 14, .42); par.rotateY(Math.PI / 2 - .6); d.push(flytt(par, .55, -4, z0 + 1.1));
      d.push(stav([.1, -4, z0 + .9], [.5, -4, z0 + 1.1], .03, K.stålG, 4), kuppel(-.6, 3.6, z0 - .05, .12, '#e7e6e1', 8));
      // kabelbro ned langs gavlen (y−)
      d.push(boks(-.4, -L / 2 - .08, s + .5, .14, .08, H + h - .6, K.stålG));
    }
    return d;
  });

  // =====================================================================================================================
  // A2 ★ Brakke: modulbrakke av tre moduler (4 m) med stolper og rammer, vinduer, trapp, aircondition. Nivå synes:
  // 1 = enkel, 2 = aircondition under vinduene, overbygd inngang, lampe og selskapsstripe, 3 = solceller på taket,
  // parabol, platting med rekkverk og en AC til. 6 × 12 m, døra midt på +x.
  LEIR2.brakke = lod((b, e) => {
    const n = nivå(b), L = 12, B = 6, H = 2.6, s = .45, V = '#6b7059', VM = '#565b47', d = [];
    d.push(boks(0, 0, 0, B + .2, L + .2, s, K.betong), boks(0, 0, s, B, L, H, V));
    // modulrammer: stolper i skjøtene og hjørnene, rammer oppe og nede
    for (const y of [-6, -2, 2, 6]) for (const sx of [-1, 1]) d.push(boks(sx * (B / 2 + .02), y === 6 ? 5.93 : y === -6 ? -5.93 : y, s, .16, .16, H, VM));
    for (const z of [s, s + H - .16]) d.push(boks(0, 0, z, B + .08, L + .08, .16, VM));
    if (!e) for (const yy of [-4, 0, 4]) for (const sx of [-1, 1]) for (const k of [-1.3, -.65, .65, 1.3]) if (!(sx > 0 && yy === 0 && Math.abs(k) < 1)) d.push(boks(sx * (B / 2 + .01), yy + k, s + .16, .02, .04, H - .32, VM));
    d.push(flytt(gavl(L, B, .8, V), 0, 0, s + H, Math.PI / 2), flytt(saltak(L, B, .8, F.blikk, .35), 0, 0, s + H, Math.PI / 2));
    for (const y of [-4, -1.3, 1.3, 4]) d.push(vind(B / 2, y, s + 1.05, .9, .9, 'x+', e), vind(-B / 2, y, s + 1.05, .9, .9, 'x-', e));
    for (const sy of [-1, 1]) d.push(vind(0, sy * L / 2, s + 1.05, .9, .9, sy > 0 ? 'y+' : 'y-', e));
    d.push(dør(B / 2, 0, s, 1, 2.05, 'x+', VM, K.mørkM));
    d.push(syl(-1.4, 3, s + H + .3, .1, 1.3, F.svart, 6), syl(-1.4, 3, s + H + 1.6, .16, .08, F.svart, 6));
    if (n >= 3) {
      // platting med rekkverk foran døra
      d.push(boks(B / 2 + .6, 0, 0, 1.2, 3, s, F.treL));
      for (const i of [1, 2]) d.push(boks(B / 2 + 1.2 + .14, 0, 0, .28, 1.2, s * (3 - i) / 3, F.treL));
      if (!e) for (const sy of [-1, 1]) { d.push(stav([B / 2 + .05, sy * 1.45, s], [B / 2 + 1.15, sy * 1.45, s], .03, F.treM, 4)); for (const x of [B / 2 + .1, B / 2 + 1.15]) d.push(boks(x, sy * 1.45, s, .07, .07, .95, F.treM));
        d.push(boks(B / 2 + .62, sy * 1.45, s + .9, 1.1, .07, .06, F.treM)); }
    } else trapp(d, B / 2, 0, s, 1.4, .6, K.betong, e);
    if (n >= 2) {
      // overbygd inngang på to stolper, lampe, selskapsstripe under raftet
      d.push(boks(B / 2 + .65, 0, s + 2.3, 1.4, 2.4, .1, F.blikkM));
      for (const sy of [-1, 1]) d.push(stav([B / 2 + 1.25, sy * 1.05, 0], [B / 2 + 1.25, sy * 1.05, s + 2.3], .04, K.stålG, 6));
      d.push(boks(B / 2 + .06, .75, s + 2.05, .1, .18, .12, K.lys));
      const S = selskap(); for (const sx of [-1, 1]) d.push(boks(sx * (B / 2 + .025), 0, s + H - .45, .02, L - .4, .18, S.farge));
      if (!e) for (const y of [-4, 1.3]) d.push(ac(-B / 2, y, s + .1, 'x-'));
    } else if (!e) d.push(boks(B / 2 + .5, 0, s + 2.35, 1, 1.6, .08, F.blikkM));
    if (n >= 3 && !e) {
      // solcellepanel på takflaten mot −x og parabol på gavlen
      const a = Math.atan2(.8, B / 2);
      for (const y of [-4.2, -1.4, 1.4, 4.2]) { const p = boks(0, 0, 0, 2.1, 2.5, .05, '#1c2a40'); p.rotateY(a); d.push(flytt(p, -1.55, y, s + H + .5)); }
      const par = skive(0, 0, 0, .4, .08, '#e7e6e1', 'z', 12, .3); par.rotateY(Math.PI / 2 - .7); d.push(flytt(par, .6, -L / 2 - .3, s + H - .2), stav([0, -L / 2, s + H - .4], [.5, -L / 2 - .3, s + H - .2], .03, K.stålG, 4));
      d.push(ac(-B / 2, 4, s + 1.2, 'x-'));
    }
    return d;
  });

  // =====================================================================================================================
  // A3 ★ Vakttårn i stål med tremateriale: fire bein på betongføtter, kryss i to høyder, plattform i 5,5 m, brystning av
  // sandsekker, takoverbygg på stolper, lyskaster på dreiefot foran (+x), antenne, stige med ryggbøyler på −y-siden.
  LEIR2.vakttårn = lod((b, e) => {
    const d = [], Z = 5.5, f0 = 1.35, f1 = 1.05, ST = K.olivenM, r = frø(31);
    const fot = (sx, sy) => [sx * f0, sy * f0, 0], topp = (sx, sy, z) => [sx * f1, sy * f1, z];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { d.push(boks(sx * f0, sy * f0, 0, .45, .45, .25, K.betong), bjelke(fot(sx, sy), topp(sx, sy, Z), .14, ST)); }
    const H4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < 4; i++) { const [ax, ay] = H4[i], [bx, by] = H4[(i + 1) % 4], k = (z) => f0 + (f1 - f0) * z / Z;
      for (const [z0, z1] of [[.3, Z / 2], [Z / 2, Z - .1]]) { d.push(bjelke([ax * k(z0), ay * k(z0), z0], [bx * k(z1), by * k(z1), z1], .07, ST), bjelke([bx * k(z0), by * k(z0), z0], [ax * k(z1), ay * k(z1), z1], .07, ST)); }
      d.push(bjelke([ax * k(Z / 2), ay * k(Z / 2), Z / 2], [bx * k(Z / 2), by * k(Z / 2), Z / 2], .08, ST)); }
    // plattform (stålramme og tredekke) og stolpene til taket
    d.push(boks(0, 0, Z - .15, 2.9, 2.9, .15, ST), boks(0, 0, Z, 2.8, 2.8, .07, F.tre));
    for (const [sx, sy] of H4) d.push(boks(sx * 1.32, sy * 1.32, Z, .1, .1, 2.55, ST));
    // brystning: sandsekker i tre lag rundt kanten, åpning ved stigen (−y, x 0,4–1,3)
    const lagSekk = (x0, y0, x1, y1, hopp) => { const l = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(l / .55)), rz = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2;
      for (let j = 0; j < 3; j++) for (let i = 0; i < n; i++) { const t = (i + .5 + (j % 2 ? .5 : 0)) / n; if (t > 1) continue; const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; if (hopp && hopp(x, y)) continue;
        d.push(sekk(x, y, Z + .07 + j * .2, .5, rz, SEKKFARGE[(r() * 5) | 0])); } };
    if (e) { for (const [x, y, sx, sy] of [[1.25, 0, .3, 2.8], [-1.25, 0, .3, 2.8], [0, 1.25, 2.8, .3], [-.5, -1.25, 1.8, .3]]) d.push(boks(x, y, Z + .07, sx, sy, .6, K.sand)); }
    else { lagSekk(1.25, -1.25, 1.25, 1.25); lagSekk(1.25, 1.25, -1.25, 1.25); lagSekk(-1.25, 1.25, -1.25, -1.25); lagSekk(-1.25, -1.25, 1.25, -1.25, (x) => x > .35 && x < 1.3); }
    // tak: lett skrått platetak med overheng og kant
    const tak = boks(0, 0, 0, 3.5, 3.5, .1, '#4a4f4a'); tak.rotateY(-.08); d.push(flytt(tak, 0, 0, Z + 2.55), boks(0, 0, Z + 2.45, 3.1, 3.1, .12, ST));
    // lyskaster på dreiefot foran, antenne bak
    d.push(syl(1.25, .6, Z + .67, .06, .3, K.mørk, 6));
    const lk = skive(0, 0, 0, .22, .4, K.mørk, 'x', 10); d.push(flytt(lk, 1.3, .6, Z + 1.12), skive(1.51, .6, Z + 1.12, .19, .02, K.lys, 'x', 10));
    if (!e) { d.push(bjelke([1.25, .45, Z + .95], [1.25, .45, Z + 1.3], .03, K.mørk), bjelke([1.25, .75, Z + .95], [1.25, .75, Z + 1.3], .03, K.mørk));
      d.push(stav([-1.3, -1.3, Z + 2.6], [-1.3, -1.3, Z + 4.3], .015, K.mørk, 4), boks(-1.15, 1.2, Z + .8, .2, .3, .4, K.olivenM));
      kabel(d, [[1.25, .6, Z + .67], [1.3, 1.3, Z + .4], [1.32, 1.32, .2]], .015); }
    // stige med ryggbøyler på −y-siden (x 0,85)
    const sx0 = .85, y0 = -1.85, y1 = -1.45;
    for (const dx of [-.22, .22]) d.push(bjelke([sx0 + dx, y0, 0], [sx0 + dx, y1, Z], .05, K.galv));
    for (let i = 1; i <= 17; i++) { const k = i / 18; d.push(boks(sx0, y0 + (y1 - y0) * k, Z * k, .44, .04, .04, K.galv)); }
    if (!e) for (let z = 2.2; z < Z; z += .7) { const k = z / Z, yy = y0 + (y1 - y0) * k; d.push(bjelke([sx0 - .35, yy, z], [sx0 - .35, yy - .55, z], .03, K.galv), bjelke([sx0 + .35, yy, z], [sx0 + .35, yy - .55, z], .03, K.galv), bjelke([sx0 - .35, yy - .55, z], [sx0 + .35, yy - .55, z], .03, K.galv)); }
    return d;
  });

  // =====================================================================================================================
  // A4 ★ Port med vaktbu og sluse: ytre bom (x 0,45) og indre bom (x −1,9) i hver sin side, piggmatte og stopplinje foran,
  // fartsdump inne, lysmaster på portstolpene, skilt «Stopp – vis ID» (rødt med lyse tekstfelt), moderne vaktbu med
  // store vinduer, flatt tak, kamera, lampe og AC. Vegen går langs x (ute = +x), åpningen er 6 m (y −3 til 3).
  LEIR2.port = lod((b, e) => {
    const d = [];
    for (const y of [-3.6, 3.6]) d.push(boks(0, y, 0, .55, .55, 1.3, K.betong), boks(0, y, 1.3, .62, .62, .1, F.betongM));
    // bommene: rød og hvit, motorhus i gult
    const bom = (x, y, ret, Lb) => { const arm = [], n = 7;
      for (let i = 0; i < n; i++) arm.push(boks(0, (i + .5) * Lb / n, -.06, .12, Lb / n, .12, i % 2 ? '#e8e6df' : F.rødL));
      const a = samle(arm); if (ret < 0) a.rotateZ(Math.PI); d.push(flytt(a, x, y, 1.12), boks(x, y, 0, .45, .4, 1.1, K.gul), boks(x, y, 1.1, .5, .45, .08, K.mørk));
      d.push(boks(x, y + ret * (Lb - .2), 0, .1, .1, 1.05, K.gul), boks(x, y + ret * (Lb - .2), .95, .1, .3, .1, K.gul)); };
    bom(.45, -3.4, 1, 6.6); bom(-1.9, 3.4, -1, 6.6);
    // stopplinje og piggmatte foran, fartsdump inne
    d.push(boks(1.3, 0, 0, .3, 6, .012, '#e8e6df'));
    d.push(boks(1.85, 0, 0, .35, 5.6, .04, K.mørk)); if (!e) for (let y = -2.6; y <= 2.6; y += .4) d.push(boks(1.85, y, .04, .06, .06, .05, K.stålG));
    d.push(flytt(prisme([[-.45, 0], [.45, 0], [.25, .08], [-.25, .08]], 5.6, K.gul), -1.1, 0, 0, Math.PI / 2));
    // lysmaster på portstolpene
    for (const y of [-3.9, 3.9]) { d.push(stav([.2, y, 1.4], [.2, y, 4.2], .05, K.galv, 6), boks(.5, y, 4.1, .6, .25, .12, K.mørk), boks(.5, y, 4.08, .5, .2, .02, K.lys)); }
    // skiltet «Stopp – vis ID» (vender mot innkjørende, +x)
    d.push(stav([2.1, -3.9, 0], [2.1, -3.9, 2.3], .045, K.galv, 6));
    d.push(påVegg([boks(.02, 0, 0, .04, 1.1, .8, F.rødL), boks(.045, 0, .48, .01, .9, .2, '#f2efe6'), boks(.045, 0, .2, .01, .7, .12, '#f2efe6'), boks(.045, 0, .05, .01, .5, .08, '#f2efe6')], 2.14, -3.9, 1.4, 'x+'));
    d.push(påVegg([boks(.02, 0, 0, .04, .9, .35, '#f2efe6'), boks(.045, 0, .12, .01, .7, .1, K.mørk)], 2.14, -3.9, .95, 'x+'));
    // vaktbua: moderne, store vinduer, flatt tak med utstikk, kamera, lampe og AC bak
    const vx = -.8, vy = -5.6, v = [], VB = '#5f6658';
    v.push(boks(0, 0, 0, 2.5, 2.5, .2, F.betongM), boks(0, 0, .2, 2.2, 2.2, 2.45, VB), boks(0, 0, .2, 2.24, 2.24, .4, K.mørk));
    v.push(vind(1.1, -.3, 1, 1.2, 1.25, 'x+', e), vind(0, 1.1, 1, 1.6, 1.25, 'y+', e), vind(-1.1, 0, 1, 1.4, 1.1, 'x-', e));
    v.push(dør(0, -1.1, .2, .85, 2.0, 'y-', K.mørk, K.mørkM));
    v.push(boks(0, 0, 2.65, 3, 3, .14, K.mørkM), boks(0, 0, 2.79, 2.6, 2.6, .12, K.mørk));
    v.push(boks(.95, .95, 2.4, .25, .2, .14, K.lys));
    if (!e) { v.push(ac(-1.1, .75, 1.5, 'x-')); v.push(stav([1.1, -1.1, 2.79], [1.4, -1.4, 2.95], .025, K.galv, 4), boks(1.45, -1.45, 2.85, .3, .14, .14, '#e3e3de'), skive(1.61, -1.45, 2.92, .04, .02, K.glass, 'x', 6));
      v.push(boks(1.13, .7, 1.05, .06, .3, .4, '#9a9d98'), skive(1.17, .7, 1.25, .05, .02, K.rød, 'x', 6)); }
    d.push(...flytt(v, vx, vy, 0));
    return d;
  });

  // =====================================================================================================================
  // A5 ★ Aggregat: containergenerator på stålmeier, lameller på langsidene, servicedører, kontrollpanel med vindu i +x-enden,
  // eksosrør med regnhette på taket, tankluke med gult lokk, løfteøyne, varselstripe, kabel ut til en koblingsboks.
  LEIR2.aggregat = lod((b, e) => {
    const d = [], V = '#4f5a3c', VM = '#3e4730';
    for (const y of [-.8, .8]) d.push(boks(0, y, 0, 3.2, .16, .16, K.mørk));
    d.push(boks(0, 0, .16, 3.2, 2, .06, K.mørk), boks(0, 0, .22, 3, 1.8, 1.65, V), boks(0, 0, 1.87, 3.06, 1.86, .06, VM));
    // lameller og servicedører på langsidene
    for (const sy of [-1, 1]) {
      if (!e) for (let i = 0; i < 8; i++) d.push(boks(-1, sy * .905, .45 + i * .14, .7, .02, .05, VM));
      for (const x of [.1, .9]) d.push(boks(x, sy * .905, .32, .7, .015, 1.4, tone(V, 1.08)), boks(x + .28, sy * .915, .95, .04, .02, .18, K.stålG));
    }
    // kontrollpanel i +x-enden
    d.push(boks(1.505, 0, .5, .02, 1.3, 1.1, VM), boks(1.52, .2, 1.1, .02, .5, .35, K.glassL), boks(1.52, -.35, 1.15, .02, .2, .2, K.rød));
    if (!e) d.push(boks(1.52, -.35, .75, .02, .12, .12, K.grønnLys), boks(1.53, .2, .75, .03, .3, .12, K.mørk));
    // eksosrør med regnhette, tankluke, løfteøyne
    d.push(syl(-1, .5, 1.93, .1, .9, K.mørk, 8), syl(-1, .5, 2.83, .13, .06, K.mørk, 8));
    const hette = boks(0, 0, 0, .28, .28, .02, K.mørk); hette.rotateY(.5); d.push(flytt(hette, -.95, .5, 2.95));
    d.push(syl(.9, -.55, 1.93, .14, .08, K.gul, 8));
    if (!e) for (const sx of [-1, 1]) for (const sy of [-1, 1]) d.push(skive(sx * 1.4, sy * .8, 1.98, .07, .03, K.stålG, 'y', 6));
    striper(d, 0, -.92, .22, 3, .02, .1, 12); striper(d, 0, .92, .22, 3, .02, .1, 12);
    // kabel ut på bakken til en koblingsboks
    if (!e) { kabel(d, [[-1.45, -.6, .4], [-1.75, -.7, .05], [-1.9, -1.4, .05]], .035); d.push(boks(-1.9, -1.55, 0, .35, .25, .6, K.grå), varsel(-1.9, -1.68, .25, .18, 'y-')); }
    return d;
  });

  // =====================================================================================================================
  // A6 ★ Dieseltank: dobbeltvegget liggende tank (ytre kappe og synlige endebunner) på betongsadler i et oppsamlingskar,
  // gangbane med rekkverk og stige, mannlokk, lufterør, nivåmåler, pumpeskap med slangetrommel og pistol foran (+x),
  // farekiler (oransje skilt med rombe), lekkasjealarm og absorbentkasse. Tanken ligger langs y.
  LEIR2.drivstofftank = lod((b, e) => {
    const d = [], L = 6, r = 1.22, zc = 1.7, T = '#5b6447', TM = '#454c36';
    d.push(boks(0, 0, 0, 4.4, 8, .12, K.betong));
    for (const [x, y, sx, sy] of [[1.6, 0, .18, 7.4], [-1.6, 0, .18, 7.4], [0, 3.65, 3.38, .18], [0, -3.65, 3.38, .18]]) d.push(boks(x, y, .12, sx, sy, .55, F.betongM));
    // betongsadler med hul topp som tanken ligger i
    for (const y of [-2, 2]) d.push(flytt(prisme([[-.9, 0], [.9, 0], [.9, .62], [.55, .45], [0, .38], [-.55, .45], [-.9, .62]], .4, F.betongM), 0, y, .12, Math.PI / 2));
    const tank = syl(0, 0, 0, r, L, T, 16); tank.rotateX(Math.PI / 2); tank.translate(0, L / 2, zc); d.push(tank);
    for (const y of [-L / 2, L / 2]) { const k = skive(0, y, zc, r * .96, .14, TM, 'y', 16, r * .9); d.push(k); }
    for (const y of [-1.5, 1.5]) d.push(farg(new THREE.CylinderGeometry(r + .025, r + .025, .1, 16, 1, true).translate(0, y, zc), TM));
    // gangbane på toppen med rekkverk, mannlokk, lufterør med hette, nivåmåler
    d.push(boks(0, 0, zc + r - .02, .7, 4.2, .06, K.galv));
    if (!e) for (const sx of [-1, 1]) { for (const y of [-2, 0, 2]) d.push(stav([sx * .35, y, zc + r], [sx * .35, y, zc + r + 1], .022, K.gul, 4)); d.push(stav([sx * .35, -2, zc + r + 1], [sx * .35, 2, zc + r + 1], .022, K.gul, 4), stav([sx * .35, -2, zc + r + .5], [sx * .35, 2, zc + r + .5], .018, K.gul, 4)); }
    d.push(syl(0, 1.2, zc + r - .1, .32, .25, TM, 10), syl(0, -2.6, zc + r - .15, .05, 1.2, K.stålG, 6), syl(0, -2.6, zc + r + 1.05, .1, .1, K.stålG, 6));
    d.push(boks(.6, 2.6, zc + .2, .1, .14, .5, '#e6e6e0'), boks(.66, 2.6, zc + .35, .02, .08, .12, K.mørk));
    // stige opp på −x-siden
    for (const dy of [-.22, .22]) d.push(bjelke([-1.55, -1.2 + dy, 0], [-1.25, -1.2 + dy, zc + r + .05], .05, K.galv));
    for (let i = 1; i < 6; i++) d.push(boks(-1.55 + .05 * i, -1.2, i * .5, .05, .44, .04, K.galv));
    // farekiler på langsidene: oransje skilt og rød/hvit rombe
    for (const sx of [-1, 1]) { const x = sx * (r + .03); d.push(påVegg([boks(.01, 0, 0, .02, .5, .35, F.oransje)], x, 1.4, zc - .2, sx > 0 ? 'x+' : 'x-'));
      const rb = boks(0, 0, -.2, .02, .28, .28, '#c23b2c'); rb.rotateX(Math.PI / 4); d.push(flytt(rb, x + sx * .02, 2.2, zc + .2)); }
    // pumpeskap, slangetrommel, pistol, påkjørselsvern, rør inn
    const px = 2.95;
    d.push(boks(px, 0, .12, .6, 1, 1.75, '#9ea29f'), boks(px + .31, 0, 1.2, .02, .6, .35, K.glassL), boks(px, 0, 1.87, .7, 1.1, .1, K.mørk));
    d.push(boks(px + .31, .3, .7, .08, .1, .25, K.mørk), skive(px + .32, -.25, .9, .07, .02, K.grønnLys, 'x', 6));
    d.push(skive(px, .78, 1.0, .32, .3, K.rød, 'y', 12), skive(px, .95, 1.0, .18, .05, K.mørk, 'y', 10));
    if (!e) { kabel(d, [[px + .2, .9, .75], [px + .45, .9, .2], [px + .55, .5, .25], [px + .36, .32, .72]], .025); }
    for (const y of [-.9, .9]) d.push(syl(px + .7, y, .12, .08, .9, K.gul, 6), syl(px + .7, y, .62, .085, .1, K.svartgul, 6));
    d.push(stav([1.3, -.4, .4], [px - .3, -.2, .4], .05, F.stålM, 6));
    // lekkasjealarm og absorbentkasse
    if (!e) d.push(boks(1.35, -3.3, .12, .25, .2, .35, '#e6e6e0'), skive(1.36, -3.3, .45, .05, .03, K.rød, 'z', 6), boks(2.6, -2.6, .12, .9, .6, .55, K.gul), boks(2.6, -2.6, .67, .95, .65, .05, K.svartgul));
    return d;
  });

  // =====================================================================================================================
  // A7 ★ Solcellepaneler: ti paneler (2 × 5) med lyse rammer og celleskiller på et skrått aluminiumsstativ (laveste kant mot −y),
  // fundamentblokker, kabelkanal, koblingsboks (combiner) og vekselretter (inverter) på bakstolpene.
  LEIR2.solcelle = lod((b, e) => {
    const d = [], a = .48, W = 8, D = 3.5, z0 = .55, c = Math.cos(a), s = Math.sin(a);
    // stativet: bakstolper høyere enn frontstolper, skråbjelker langs panelflaten, langsgående skinner
    for (const x of [-3.6, -1.2, 1.2, 3.6]) {
      const yf = -D / 2 * c + .15, yb = D / 2 * c - .15, zb = z0 + (D - .3) * s;
      d.push(boks(x, yf, 0, .3, .3, .2, K.betong), boks(x, yb, 0, .3, .3, .2, K.betong));
      d.push(bjelke([x, yf, .2], [x, yf, z0 - .02], .06, K.aluminium), bjelke([x, yb, .2], [x, yb, zb - .02], .06, K.aluminium));
      d.push(bjelke([x, -D / 2 * c, z0 - .05], [x, D / 2 * c, z0 + D * s - .05], .07, K.aluminium));
      if (!e) d.push(bjelke([x, yf, .25], [x, yb, zb - .3], .04, K.aluminium));
    }
    for (const t of [.2, .8]) d.push(bjelke([-W / 2, -D / 2 * c + D * c * t, z0 + D * s * t - .02], [W / 2, -D / 2 * c + D * c * t, z0 + D * s * t - .02], .05, K.aluminium));
    // panelene: lys bakplate (rammene) og ti mørkeblå paneler oppå, med celleskiller
    const pl = (x, y, z, sx, sy, sz, f) => { const g = boks(0, 0, 0, sx, sy, sz, f); g.rotateX(a); g.translate(x, y, z); return g; };
    const midt = (t) => [-D / 2 * c + D * c * t, z0 + D * s * t];
    { const [y, z] = midt(.5); d.push(pl(0, y, z, W, D, .04, K.aluminium)); }
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) {
      const x = -W / 2 + (i + .5) * W / 5, [y, z] = midt((j + .5) / 2);
      d.push(pl(x, y - s * .03, z + c * .03, W / 5 - .06, D / 2 - .06, .02, '#1b2a44'));
      if (!e) for (const k of [-.25, .25]) { const [y2, z2] = midt((j + .5 + k) / 2); d.push(pl(x, y2 - s * .045, z2 + c * .045, W / 5 - .08, .015, .005, '#33456a')); }
    }
    // kabelkanal langs bakkanten, koblingsboks og vekselretter på bakstolpene, kabel ned i bakken
    const yb = D / 2 * c - .15;
    d.push(boks(0, yb + .05, .9, W - .6, .12, .1, K.grå));
    d.push(boks(-2.4, yb + .17, .7, .45, .2, .55, '#dcdcd6'), boks(2.4, yb + .2, .55, .6, .25, .75, '#e3e3de'), boks(2.4, yb + .335, .95, .3, .01, .12, K.glass));
    if (!e) { d.push(skive(2.4, yb + .34, .7, .04, .02, K.grønnLys, 'y', 6)); kabel(d, [[2.4, yb + .2, .55], [2.4, yb + .4, .2], [2.4, yb + 1, .02]], .03); d.push(varsel(-2.4, yb + .27, .9, .16, 'y+')); }
    return d;
  });

  // =====================================================================================================================
  // A8 ★ Batteribank: batteribrakke (lys container) på sviller, ribber, to dobbeltdører med varselskilt og statuslys på +y,
  // klimaanlegg i −x-enden, takvifter med rist, kabelgjennomføring og jordspyd.
  LEIR2.batteri = lod((b, e) => {
    const d = [], L = 3.9, B = 2.2, H = 2.25, V = '#c9ccc8', VM = '#a9adaa';
    for (const x of [-1.5, 0, 1.5]) d.push(boks(x, 0, 0, .25, 2.4, .15, F.treM));
    d.push(boks(0, 0, .15, L, B, H, V), boks(0, 0, .15 + H - .1, L + .04, B + .04, .1, VM), boks(0, 0, .15, L + .04, B + .04, .12, VM));
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) d.push(boks(sx * (L / 2 - .06), sy * (B / 2 - .06), .15, .14, .14, H, VM));
    if (!e) for (let i = 1; i < 9; i++) { const x = -L / 2 + i * L / 9; if (Math.abs(x + .9) < .6 || Math.abs(x - .9) < .6) continue; d.push(boks(x, -B / 2 - .012, .3, .06, .03, H - .3, VM)); }
    // dørene på +y, varseltrekant og statuslys
    for (const x of [-.9, .9]) { d.push(boks(x, B / 2 + .01, .3, 1.15, .02, 1.9, tone(V, 1.04)), boks(x, B / 2 + .025, .3, .02, .02, 1.9, VM), boks(x + .12, B / 2 + .04, 1.1, .04, .04, .25, K.mørk));
      d.push(varsel(x - .3, B / 2 + .01, 1.45, .3, 'y+')); }
    d.push(boks(0, B / 2 + .02, 2.05, .5, .04, .14, K.mørk), skive(-.1, B / 2 + .05, 2.12, .035, .02, K.grønnLys, 'y', 6), skive(.1, B / 2 + .05, 2.12, .035, .02, K.gul, 'y', 6));
    // klimaanlegg i −x-enden og takvifter
    d.push(boks(-L / 2 - .25, 0, .7, .5, 1.3, .9, '#e3e3de'), skive(-L / 2 - .51, 0, 1.15, .3, .02, '#3d4143', 'x', 12));
    for (const x of [-.8, .8]) d.push(syl(x, 0, .15 + H, .35, .25, VM, 10), skive(x, 0, .15 + H + .26, .33, .02, '#3d4143', 'z', 10));
    if (!e) { for (const x of [-.8, .8]) d.push(boks(x, 0, .15 + H + .28, .66, .03, .03, K.stålG), boks(x, 0, .15 + H + .28, .03, .66, .03, K.stålG));
      d.push(boks(L / 2 + .06, -.5, .4, .12, .3, .3, K.mørk)); kabel(d, [[L / 2 + .1, -.5, .5], [L / 2 + .4, -.5, .1], [L / 2 + .9, -.6, .02]], .04);
      d.push(stav([L / 2 + .3, .8, 0], [L / 2 + .3, .8, .5], .015, '#b86f3a', 4)); }
    return d;
  });

  // =====================================================================================================================
  // A9–A11 ★ Kameramast etter nivå: 1 = enkel stang med bevegelseskamera (PIR-sensor under), 2 = høyere mast med to kameraer
  // på tverrarm og koblingsboks, 3 = «smart» kuppelkamera (PTZ) med to IR-lyskastere, lynavleder og varsellys.
  LEIR2.kameramast = lod((b, e) => {
    const n = nivå(b), d = [], H = n === 1 ? 4.5 : n === 2 ? 7.5 : 8.5;
    d.push(boks(0, 0, 0, .7, .7, .3, K.betong), boks(0, 0, .3, .32, .32, .03, K.galv));
    if (!e) for (const sx of [-1, 1]) for (const sy of [-1, 1]) d.push(syl(sx * .11, sy * .11, .3, .02, .07, K.galv, 6));
    d.push(syl(0, 0, .33, n === 1 ? .055 : .09, H - .33, K.galv, 8, n === 1 ? .05 : .06));
    // koblingsboks på stanga
    d.push(boks(.1, 0, 1.3, .14, n === 1 ? .22 : .34, n === 1 ? .3 : .45, '#d8d8d2'));
    if (!e) { d.push(boks(.18, 0, 1.36, .01, .1, .03, K.mørk)); kabel(d, [[.05, 0, .35], [.05, 0, 1.3]], .015); }
    const kamera = (x, y, z, rz) => { const k = [boks(.18, 0, -.08, .42, .14, .14, '#e6e6e1'), boks(.2, 0, .06, .5, .19, .02, '#e6e6e1'), skive(.4, 0, -.01, .05, .02, K.glass, 'x', 8), bjelke([0, 0, -.18], [.08, 0, -.04], .03, K.galv)];
      return flytt(k, x, y, z, rz); };
    if (n === 1) {
      d.push(bjelke([0, 0, H - .1], [.25, 0, H - .1], .04, K.galv), ...kamera(.2, 0, H - .1, 0));
      d.push(boks(.32, 0, H - .42, .09, .09, .09, '#efefea'), kuppel(.32, 0, H - .42, .045, '#f5f5f0', 6));
      d.push(boks(0, -.25, H - .9, .03, .4, .3, '#1c2a40'));   // lite solcellepanel for kameraets batteri
    } else if (n === 2) {
      d.push(bjelke([0, -.5, H - .2], [0, .5, H - .2], .06, K.galv), ...kamera(0, -.5, H - .2, 0), ...kamera(0, .5, H - .2, Math.PI * .65));
      d.push(boks(.13, 0, 2.6, .18, .4, .55, '#d8d8d2'), varsel(.22, 0, 2.3, .16, 'x+'));
      if (!e) { for (let z = 1.8; z < H - .5; z += .4) d.push(boks(0, (z * 10 | 0) % 2 ? .1 : -.1, z, .03, .18, .03, K.galv));
        kabel(d, [[0, -.5, H - .3], [0, -.05, H - .6]], .012); kabel(d, [[0, .5, H - .3], [0, .05, H - .6]], .012); d.push(stav([0, 0, H], [0, 0, H + 1], .012, K.galv, 4)); }
    } else {
      // PTZ-kuppel under en arm, to IR-lys, lynavleder og varsellys
      d.push(bjelke([0, 0, H - .1], [.55, 0, H - .1], .07, K.galv), syl(.55, 0, H - .38, .14, .28, '#e6e6e1', 12));
      const dome = new THREE.SphereGeometry(.13, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); dome.translate(.55, 0, H - .38); d.push(farg(dome, '#20262c'));
      for (const sy of [-1, 1]) { d.push(bjelke([0, 0, H - .6], [0, sy * .35, H - .6], .04, K.galv), boks(.08, sy * .38, H - .72, .16, .22, .18, '#3a3d40'), boks(.165, sy * .38, H - .7, .02, .18, .14, K.ir)); }
      d.push(stav([0, 0, H], [0, 0, H + 1.4], .015, K.galv, 4), kule(0, 0, H + .05, .07, K.rød, 6));
      d.push(boks(.14, 0, 2.6, .2, .45, .6, '#d8d8d2'), boks(.25, 0, 2.95, .02, .2, .12, K.glass));
      if (!e) d.push(stav([0, -.1, 2.4], [0, -.1, 3.2], .012, K.mørk, 4), boks(0, -.25, H - 1.3, .04, .5, .4, '#1c2a40'));
    }
    return d.filter(Boolean);
  });

  // ---------- testsiden (spill/modeller-visning.html) viser de nye modellene etter de gamle ----------
  const ny = (nr, navn, tittel, lag) => M.LISTE && M.LISTE.push({ nr, navn, tittel, lag });
  ny('A1', 'l2-kontrollrom', 'Kontrollrom (ny)', () => LEIR2.hovedhus({}));
  for (const n of [1, 2, 3]) ny('A2', 'l2-brakke-' + n, `Brakke nivå ${n} (ny)`, () => LEIR2.brakke({ nivå: n }));
  ny('A3', 'l2-vakttårn', 'Vakttårn (ny)', () => LEIR2.vakttårn({}));
  ny('A4', 'l2-port', 'Port med vaktbu og sluse (ny)', () => LEIR2.port({}));
  ny('A5', 'l2-aggregat', 'Aggregat (ny)', () => LEIR2.aggregat({}));
  ny('A6', 'l2-dieseltank', 'Dieseltank (ny)', () => LEIR2.drivstofftank({}));
  ny('A7', 'l2-solcelle', 'Solcellepaneler (ny)', () => LEIR2.solcelle({}));
  ny('A8', 'l2-batteri', 'Batteribank (ny)', () => LEIR2.batteri({}));
  for (const n of [1, 2, 3]) ny('A' + (8 + n), 'l2-kameramast-' + n, `Kameramast nivå ${n} (ny)`, () => LEIR2.kameramast({ nivå: n }));

  // ---------- detaljnivå i spillet: bytt til den enkle utgaven lenger enn ca. 150 m unna ----------
  const LOD = { ut: 165, inn: 145, hvert: 300 };
  M.LOD = LOD;
  if (typeof KROKER !== 'undefined' && KROKER.ramme3d) {
    let sist = 0;
    KROKER.ramme3d.push(R => {
      const t = performance.now(); if (t - sist < LOD.hvert || !R || !R.scene || !R.cam) return; sist = t;
      const c = R.cam.position;
      for (const m of R.scene.children) {
        if (!m.isMesh) continue; const nær = m.userData.lodNær || m.geometry, fjern = nær && nær.userData && nær.userData.fjern; if (!fjern) continue;
        if (!m.userData.lodNær) m.userData.lodNær = nær;
        if (m.geometry !== nær && m.geometry !== fjern) { m.userData.lodNær = null; continue; }   // byttet ut av andre (byggeplass)
        const dd = Math.hypot(m.position.x - c.x, m.position.y - c.y, m.position.z - c.z), langt = m.geometry === fjern;
        if (!langt && dd > LOD.ut) m.geometry = fjern; else if (langt && dd < LOD.inn) m.geometry = nær;
      }
    });
  }
})();
