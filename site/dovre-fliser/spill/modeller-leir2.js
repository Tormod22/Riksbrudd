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

  // ---------- hjelpere for master og haller ----------
  // Trekantet gittermast med side a fra z0 og H opp. farge(z) gir fargen (rød/hvit maling). Enkel: bare beina.
  function gitter(d, H, a, farge, e, z0) {
    z0 = z0 || 0; const r = a / Math.sqrt(3), P = [0, 1, 2].map(i => { const v = Math.PI / 2 + i * 2 * Math.PI / 3; return [Math.cos(v) * r, Math.sin(v) * r]; });
    const seg = 6; for (const [x, y] of P) for (let z = 0; z < H; z += seg) d.push(stav([x, y, z0 + z], [x, y, z0 + Math.min(H, z + seg)], .04, farge(z), 4));
    if (e) { for (let z = 6; z < H; z += 6) for (let i = 0; i < 3; i++) d.push(bjelke([P[i][0], P[i][1], z0 + z], [P[(i + 1) % 3][0], P[(i + 1) % 3][1], z0 + z], .03, farge(z))); return P; }
    const hs = 1.4, n = Math.floor(H / hs);
    for (let k = 0; k < n; k++) { const za = z0 + k * hs, zb = za + hs, f = farge(k * hs);
      for (let i = 0; i < 3; i++) { const A = P[i], B = P[(i + 1) % 3]; d.push(bjelke([A[0], A[1], zb], [B[0], B[1], zb], .025, f));
        d.push(k % 2 ? bjelke([A[0], A[1], za], [B[0], B[1], zb], .02, f) : bjelke([B[0], B[1], za], [A[0], A[1], zb], .02, f)); } }
    return P;
  }
  // Barduner fra masta (høydene hz) ut til tre ankerfester i avstand R
  function barduner(d, hz, R, e) {
    for (let i = 0; i < 3; i++) { const v = Math.PI / 2 + i * 2 * Math.PI / 3 + Math.PI / 3, ax = Math.cos(v) * R, ay = Math.sin(v) * R;
      d.push(boks(ax, ay, 0, .5, .5, .3, K.betong)); if (e) continue;
      for (const z of hz) d.push(stav([Math.cos(v) * .3, Math.sin(v) * .3, z], [ax, ay, .3], .012, '#9a9e9f', 3)); }
  }
  // Parabol (skål) med radius r som peker mot retningen (rz rundt z, tilt opp), midt i (x, y, z)
  function parabol(x, y, z, r, rz, tilt, f) {
    const g = new THREE.SphereGeometry(r * 1.6, 14, 4, 0, Math.PI * 2, 0, .68); g.translate(0, -r * 1.6, 0); g.rotateZ(-Math.PI / 2);
    g.rotateY(-tilt); g.rotateZ(rz || 0); g.translate(x, y, z); return farg(g, f || '#e7e6e1');
  }
  // Buehall: profilen er en halv ellipse B bred og H høy (n biter), trukket ut L langs x
  function bueProfil(B, H, n) { const P = [[-B / 2, 0]]; for (let i = 1; i < n; i++) { const t = Math.PI * i / n; P.push([-Math.cos(t) * B / 2, Math.sin(t) * H]); } P.push([B / 2, 0]); return P; }
  // Firkantet gittertårn (beina fra ±b0 ved bakken til ±b1 i høyden H), kryss i hver seksjon
  function tårnGitter(d, H, b0, b1, f, e, seksjon) {
    const k = z => b0 + (b1 - b0) * z / H, sek = seksjon || 2.5, Q = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [sx, sy] of Q) d.push(bjelke([sx * b0, sy * b0, 0], [sx * b1, sy * b1, H], .12, f), boks(sx * b0, sy * b0, 0, .4, .4, .2, K.betong));
    for (let z = 0; z < H - .1; z += sek) { const z1 = Math.min(H, z + sek);
      for (let i = 0; i < 4; i++) { const [ax, ay] = Q[i], [bx, by] = Q[(i + 1) % 4];
        d.push(bjelke([ax * k(z1), ay * k(z1), z1], [bx * k(z1), by * k(z1), z1], .07, f));
        if (!e) d.push(bjelke([ax * k(z), ay * k(z), z], [bx * k(z1), by * k(z1), z1], .05, f), bjelke([bx * k(z), by * k(z), z], [ax * k(z1), ay * k(z1), z1], .05, f)); } }
  }

  // =====================================================================================================================
  // A12–A14 ★ Radiomast etter nivå: 1 = enkel antenne (12 m) med barduner, 2 = gittermast (24 m) med panelantenner, liten parabol
  // og utstyrsskap, 3 = høy rød/hvit gittermast (36 m) med plattform, stor parabol og flyvarsellys.
  LEIR2.radiomast = lod((b, e) => {
    const n = nivå(b), d = [], H = n === 1 ? 12 : n === 2 ? 24 : 36;
    d.push(boks(0, 0, 0, 1.6, 1.6, .35, K.betong));
    if (n === 1) {
      d.push(syl(0, 0, .35, .08, H - .35, K.galv, 8, .05), stav([0, 0, H], [0, 0, H + 2.5], .012, K.mørk, 4));
      d.push(bjelke([-.7, 0, H - 1.2], [.7, 0, H - 1.2], .03, K.galv), stav([-.7, 0, H - 1.2], [-.7, 0, H + .3], .01, K.mørk, 4), stav([.7, 0, H - 1.2], [.7, 0, H + .3], .01, K.mørk, 4));
      d.push(boks(.25, 0, 1, .2, .4, .5, K.olivenM)); if (!e) kabel(d, [[.15, 0, 1.4], [.08, 0, H - 1.3]], .012);
      barduner(d, [H * .5, H * .92], 7, e);
      return d;
    }
    const rh = n === 3 ? (z => (Math.floor(z / 6) % 2 ? '#e8e6df' : '#c0392b')) : () => K.galv;
    const P = gitter(d, H, n === 2 ? .9 : 1.2, rh, e, .35);
    barduner(d, n === 2 ? [H * .45, H * .9] : [H * .33, H * .66, H * .95], n === 2 ? 10 : 14, e);
    d.push(stav([0, 0, H + .35], [0, 0, H + 3], .02, K.mørk, 4));
    // panelantenner på hver side nær toppen
    for (const [x, y] of P) { const v = Math.atan2(y, x); d.push(flytt(boks(.12, 0, 0, .14, .32, 1.3, '#e8e8e3'), x, y, H - 2, v)); if (n === 3) d.push(flytt(boks(.12, 0, 0, .14, .32, 1.3, '#e8e8e3'), x, y, H * .7, v)); }
    // utstyrsskap ved foten med kabelstige opp
    d.push(boks(1.6, 0, 0, 1, 1.2, 1.7, '#9ea29f'), boks(2.11, 0, .2, .02, .8, 1.3, '#8b908d'), boks(1.6, 0, 1.7, 1.15, 1.35, .08, K.mørk));
    if (!e) d.push(bjelke([1.1, 0, 1.4], [P[0][0] + .05, P[0][1] - .1, 2.5], .1, K.galv, .02), boks(P[0][0] + .06, P[0][1] - .12, 2.5, .1, .02, H - 3, K.galv));
    if (n === 2) d.push(parabol(.35, 0, H * .72, .35, 0, .1), boks(-.2, 0, H * .72 - .15, .4, .08, .08, K.galv));
    if (n === 3) {
      // plattform med rekkverk, stor parabol, flyvarsellys i toppen og på midten
      const zp = H * .58; d.push(syl(0, 0, zp, 1.4, .08, K.galv, 10)); if (!e) d.push(farg(new THREE.CylinderGeometry(1.4, 1.4, .9, 10, 1, true).rotateX(Math.PI / 2).translate(0, 0, zp + .5), K.galv));
      d.push(parabol(1.1, 0, zp + 1.4, .9, 0, .15), boks(.4, 0, zp + 1.1, .7, .1, .1, K.galv));
      for (const z of [H + .35, H * .5]) for (const [x, y] of P) d.push(kule(x * 1.1, y * 1.1, z, .1, '#d62a1e', 6));
    }
    return d;
  });

  // =====================================================================================================================
  // A15 ★ Sykestue: hvit modulbrakke med røde kors på veggene og taket, dobbeltdør med glass og baldakin, rampe med
  // rekkverk, båre ved døra, oksygenflasker i stativ, oppmerket plass for ambulanse foran, aircondition bak. 7 × 11 m.
  LEIR2.sykestue = lod((b, e) => {
    const L = 11, B = 7, H = 2.8, s = .45, h = 1.1, V = '#dcdcd4', VM = '#c3c3bb', d = [];
    d.push(boks(0, 0, 0, B + .2, L + .2, s, K.betong), boks(0, 0, s, B, L, H, V), boks(0, 0, s, B + .04, L + .04, .3, VM), boks(0, 0, s + H - .14, B + .06, L + .06, .14, VM));
    if (!e) sømmer(d, B, L, s + .3, H - .44, 1.83, VM, .4);
    d.push(flytt(gavl(L, B, h, V), 0, 0, s + H, Math.PI / 2), flytt(saltak(L, B, h, F.blikkM, .4), 0, 0, s + H, Math.PI / 2));
    for (const y of [-4.2, -2.4, 2.6, 4.2]) d.push(vind(B / 2, y, s + 1, 1.1, 1, 'x+', e, VM));
    for (const y of [-3.5, 0, 3.5]) d.push(vind(-B / 2, y, s + 1, 1.1, 1, 'x-', e, VM));
    // dobbeltdør med glass i midten
    d.push(påVegg([boks(.02, 0, 0, .04, 1.56, 2.18, VM), boks(.04, -.36, 0, .05, .68, 2.1, '#e8e8e2'), boks(.04, .36, 0, .05, .68, 2.1, '#e8e8e2'),
      boks(.07, -.36, 1.1, .02, .4, .7, K.glassL), boks(.07, .36, 1.1, .02, .4, .7, K.glassL), boks(.08, -.08, .95, .04, .03, .2, K.stålG), boks(.08, .08, .95, .04, .03, .2, K.stålG)], B / 2, .4, s, 'x+'));
    d.push(rødtKors(B / 2, -1.1, s + 1.2, .7, 'x+'), rødtKors(0, L / 2, s + H + .1, .9, 'y+', true), rødtKors(0, -L / 2, s + H + .1, .9, 'y-', true));
    const a = Math.atan2(h, B / 2), kt = rødtKors(0, 0, -1, 2.2, 'x+', true); kt.forEach(g => g.rotateY(-(Math.PI / 2 - a))); d.push(...flytt(kt, B / 4 + .05, 0, s + H + h / 2 + .1));
    // repos, rampe og baldakin på to stolper
    d.push(boks(B / 2 + .8, .4, 0, 1.6, 2, s, K.betong), flytt(prisme([[0, 0], [3.2, 0], [0, s]], 1.3, K.betong), B / 2 + .8, 1.4, 0, -Math.PI / 2));
    d.push(boks(B / 2 + .8, .4, s + 2.4, 1.9, 2.4, .1, VM)); for (const sy of [-1, 1]) d.push(stav([B / 2 + 1.65, .4 + sy * 1.05, s], [B / 2 + 1.65, .4 + sy * 1.05, s + 2.4], .04, K.stålG, 6));
    if (!e) { d.push(stav([B / 2 + .2, 2.05, s + .9], [B / 2 + .2, 4.6, .9], .025, K.stålG, 4), stav([B / 2 + 1.4, 2.05, s + .9], [B / 2 + 1.4, 4.6, .9], .025, K.stålG, 4));
      for (const x of [B / 2 + .2, B / 2 + 1.4]) for (const y of [2.05, 4.6]) d.push(stav([x, y, 0], [x, y, y > 3 ? .9 : s + .9], .025, K.stålG, 4)); }
    // båre ved døra (ramme, bein og grønn duk) og oksygenflasker i stativ
    const bx = B / 2 + 2.3, by = -1.7;
    d.push(boks(bx, by, .55, .6, 2, .06, '#3f5a3c'), boks(bx, by, .5, .66, 2.1, .05, K.aluminium));
    if (!e) { for (const sx of [-1, 1]) for (const sy of [-1, 1]) d.push(stav([bx + sx * .27, by + sy * .9, 0], [bx + sx * .27, by + sy * .9, .5], .02, K.aluminium, 4)); d.push(boks(bx, by + .75, .61, .45, .35, .1, '#e8e6df')); }
    for (let i = 0; i < 3; i++) d.push(syl(B / 2 + .3, -2.9 + i * .3, 0, .11, 1.3, '#3d6b3d', 8), syl(B / 2 + .3, -2.9 + i * .3, 1.3, .08, .15, '#e8e6df', 8));
    d.push(boks(B / 2 + .3, -2.6, .9, .1, 1, .05, K.stålG));
    // ambulanseplass: gul ramme og kors på bakken foran
    for (const [x, y, sx, sy] of [[5.8, -2.6, 3, .12], [5.8, 2.9, 3, .12], [7.25, .15, .12, 5.6]]) d.push(boks(x, y, 0, sx, sy, .012, K.gul));
    if (!e) for (const y of [-3, 0, 3]) d.push(ac(-B / 2, y, s + .2, 'x-'));
    return d;
  });

  // =====================================================================================================================
  // A16 ★ Verksted: hall i ribbet stålplate med to porter mot +x (den ene halvt oppe), lyskastere over portene, lysbånd i taket,
  // takvifter, sidedør på +y (interiøret går inn der), forplass i betong med arbeidsbenk, dekkstabel, motorkran, fat og kompressor.
  LEIR2.verksted = lod((b, e) => {
    const D = 12, W = 14, H = 5.4, h = 1.3, V = '#5e6a5b', VM = '#4c5649', d = [], pb = 4.4, ph = 4.5, py = [-3.5, 3.5], fx = D / 2 - .1;
    d.push(boks(0, 0, 0, D, W, .15, F.betongM), boks(D / 2 + 3, 0, 0, 6, W, .1, K.betong));
    d.push(boks(-D / 2 + .1, 0, .15, .2, W, H, V), boks(0, -W / 2 + .1, .15, D, .2, H, V), boks(0, W / 2 - .1, .15, D, .2, H, V));
    d.push(boks(fx, -(W / 2 + py[1] + pb / 2) / 2, .15, .2, W / 2 - py[1] - pb / 2, ph, V), boks(fx, 0, .15, .2, py[1] * 2 - pb, ph, V));
    d.push(boks(fx, (W / 2 + py[1] + pb / 2) / 2, .15, .2, W / 2 - py[1] - pb / 2, ph, V), boks(fx, 0, .15 + ph, .2, W, H - ph, V));
    if (!e) { for (let y = -W / 2 + .6; y < W / 2; y += 1.2) d.push(boks(-D / 2 - .01, y, .15, .04, .08, H, VM));
      for (let x = -D / 2 + .6; x < D / 2; x += 1.2) for (const sy of [-1, 1]) if (!(sy > 0 && Math.abs(x - 4) < .8)) d.push(boks(x, sy * (W / 2 + .01), .15, .08, .04, H, VM)); }
    d.push(flytt(gavl(D, W, h, V), 0, 0, H + .15), flytt(saltak(D, W, h, F.blikk, .3), 0, 0, H + .15));
    // lysbånd langs mønet og takvifter
    for (const sd of [-1, 1]) { const g = boks(0, 0, 0, D - 1, 1.2, .03, '#c9d3cf'); g.rotateX(sd * Math.atan2(h, W / 2)); d.push(flytt(g, 0, sd * 2.2, H + .15 + h * (1 - 2.2 / (W / 2)) + .1)); }
    for (const x of [-3, 3]) d.push(syl(x, -4.5, H + .5, .35, .5, VM, 8), syl(x, -4.5, H + 1, .45, .06, K.mørk, 8));
    py.forEach((y, i) => {
      d.push(boks(D / 2 + .02, y, .15 + ph, .1, pb + .3, .15, F.blikkM));
      for (const s of [-1, 1]) d.push(boks(D / 2 + .02, y + s * (pb / 2 + .08), .15, .1, .15, ph, F.blikkM));
      d.push(boks(D / 2 + .25, y, .15 + ph + .3, .35, .5, .2, K.mørk), boks(D / 2 + .25, y, .15 + ph + .28, .3, .44, .03, K.lys), bjelke([D / 2, y, .15 + ph + .55], [D / 2 + .3, y, .15 + ph + .45], .04, K.mørk));
      const opp = i === 0 ? 2.2 : 0, porth = ph - opp;
      d.push(boks(fx + .02, y, .15 + opp, .14, pb, porth, '#77807a'));
      if (!e) for (let k = 1; k * .5 < porth; k++) d.push(boks(fx + .1, y, .15 + opp + k * .5, .04, pb, .04, F.blikkM));
      if (opp) d.push(boks(fx + .03, y, .15, .1, pb, opp, '#1d1f1e'));
      d.push(boks(D / 2 + .4, y, .1, .3, pb, .012, K.gul));
    });
    d.push(dør(4, W / 2, .15, 1, 2.1, 'y+', F.blikkM, F.blikkM));
    for (const x of [-3.5, 0]) d.push(vind(x, W / 2, 3, 2.2, .8, 'y+', e, F.blikkM), vind(x, -W / 2, 3, 2.2, .8, 'y-', e, F.blikkM));
    if (!e) {
      // forplassen: arbeidsbenk med skrustikke, dekkstabel, motorkran, fat og kompressor
      d.push(boks(9, -6.4, .1, 2, .7, .85, F.treM), boks(9, -6.4, .95, 2.05, .75, .05, F.treL), boks(8.4, -6.3, 1, .2, .15, .15, K.mørk));
      for (let i = 0; i < 4; i++) d.push(farg(new THREE.TorusGeometry(.35, .14, 6, 12).translate(10.8, 6.1, .24 + i * .28), K.gummi));
      for (const [ax, ay] of [[0, -.5], [0, .5]]) d.push(bjelke([8.2 + ax, 4.2 + ay, .1], [8.6, 4.2, 2.6], .08, K.gul));
      d.push(bjelke([8.6, 4.2, 2.6], [9.8, 4.2, 2.4], .1, K.gul), stav([9.8, 4.2, 2.4], [9.8, 4.2, 1.2], .01, K.mørk, 3), boks(9.8, 4.2, .9, .2, .1, .3, K.mørk), boks(8.4, 4.2, .1, .2, 1.4, .1, K.gul));
      for (let i = 0; i < 3; i++) d.push(syl(11.3, -5.8 + i * .62, .1, .29, .88, i ? '#2f4a64' : F.rød, 10));
      d.push(syl(7.3, 6.4, .1, .3, 1, '#c0392b', 10), boks(7.3, 6.4, 1.1, .5, .3, .35, K.mørk));
      kabel(d, [[7.3, 6.2, .3], [6.5, 6.9, .1], [5.9, 7.05, .4]], .02);
    }
    return d;
  });

  // =====================================================================================================================
  // B29 ★ Kommandosenter: stor modulbygning i to etasjer med flatt tak og brystning, glassfasade i midten mot +x der skjermveggene
  // lyser innenfor, inngang med baldakin og selskapsskilt, aircondition-rad og parabolantenner på taket. 14 × 18 m.
  LEIR2.kommandosenter = lod((b, e) => {
    const B = 14, L = 18, H = 6.6, s = .4, V = '#5a5f5f', d = [], S = selskap();
    d.push(boks(0, 0, 0, B + .4, L + .4, s, K.betong), boks(0, 0, s, B, L, H, V), boks(0, 0, s + 3.2, B + .06, L + .06, .2, K.sandM));
    d.push(boks(0, 0, s + H, B + .1, L + .1, .5, K.mørkM), boks(0, 0, s + H + .5, B + .2, L + .2, .06, '#46494a'));
    for (const [x, y, sx, sy] of [[B / 2 + .05, 0, .2, L + .3], [-B / 2 - .05, 0, .2, L + .3], [0, L / 2 + .05, B + .3, .2], [0, -L / 2 - .05, B + .3, .2]]) d.push(boks(x, y, s + H + .5, sx, sy, .25, K.sand));
    if (!e) sømmer(d, B, L, s, H, 1.5, K.mørkM, 0);
    // glassfasaden mot +x (y −5 til 5, begge etasjer) med skjermvegger som lyser bak glasset
    d.push(boks(B / 2 + .03, 0, s + .3, .06, 10, H - .6, K.glass));
    if (!e) { for (let y = -5; y <= 5.01; y += 1.25) d.push(boks(B / 2 + .08, y, s + .3, .06, .08, H - .6, K.mørkM)); d.push(boks(B / 2 + .08, 0, s + 3.2, .08, 10, .2, K.mørkM));
      for (const [y, z, w, hh] of [[-3.1, 4.3, 2.2, 1.3], [-.6, 4.3, 2.2, 1.3], [1.9, 4.3, 2.2, 1.3], [-3.1, 1.3, 1.6, .9], [3.4, 1.3, 1.6, .9]]) d.push(boks(B / 2 + .065, y, s + z, .01, w, hh, '#4f86ad'), boks(B / 2 + .07, y - w * .2, s + z + hh * .2, .01, w * .35, hh * .35, '#8fc0d8')); }
    for (const sy of [-1, 1]) for (const y of [6.6, 8]) d.push(vind(B / 2, sy * y, s + 1, .9, 1.3, 'x+', e), vind(B / 2, sy * y, s + 4, .9, 1.3, 'x+', e));
    for (let y = -7.5; y <= 7.6; y += 2.5) d.push(vind(-B / 2, y, s + 1, .9, 1.3, 'x-', e), vind(-B / 2, y, s + 4, .9, 1.3, 'x-', e));
    for (const sy of [-1, 1]) for (let x = -5; x <= 5.1; x += 2.5) d.push(vind(x, sy * L / 2, s + 4, .9, 1.3, sy > 0 ? 'y+' : 'y-', e));
    // inngang: dobbeltdør i glassfasaden, baldakin, skilt, trapp
    d.push(påVegg([boks(.05, 0, 0, .06, 1.9, 2.3, K.mørkM), boks(.08, -.45, 0, .04, .85, 2.2, K.glassL), boks(.08, .45, 0, .04, .85, 2.2, K.glassL)], B / 2, 0, s, 'x+'));
    d.push(boks(B / 2 + 1, 0, s + 2.7, 2.2, 4.4, .2, K.mørkM), boks(B / 2 + 2.05, 0, s + 2.7, .1, 4.4, .35, S.farge));
    d.push(selskapsskilt(B / 2 + 2.1, 0, s + 2.75, 2.8, .3, 'x+'));
    trapp(d, B / 2, 0, s, 3.2, 1, K.betong, e);
    // taket: aircondition-rad, to paraboler, antennemast, trappehus
    for (let y = -6; y <= -1; y += 1.7) d.push(boks(-3, y, s + H + .5, 1.4, 1.2, .9, '#d4d4cf'), skive(-3, y, s + H + 1.42, .4, .04, '#3d4143', 'z', 10));
    d.push(boks(3, 5, s + H + .5, 2.6, 3, 2.6, V), boks(3, 5, s + H + 3.1, 2.8, 3.2, .12, K.mørkM));
    d.push(parabol(2.5, -4, s + H + 1.8, .8, 0, .35), syl(2.5, -4, s + H + .5, .12, 1.2, K.galv, 8));
    d.push(parabol(-.5, 3, s + H + 1.2, .5, 2.4, .5), syl(-.5, 3, s + H + .5, .08, .7, K.galv, 6));
    d.push(stav([-5, 6, s + H + .5], [-5, 6, s + H + 9], .06, K.galv, 6));
    if (!e) { for (const k of [4, 6.5]) d.push(bjelke([-5.6, 6, s + H + k], [-4.4, 6, s + H + k], .04, K.galv)); d.push(kule(-5, 6, s + H + 9.05, .08, K.rød, 6));
      for (const y of [-7.5, 7.5]) d.push(ac(B / 2, y, s + .1, 'x+')); }
    return d;
  });

  // =====================================================================================================================
  // B30 ★ Dronehangar: lett buehall (stålbuer med duk), stor port mot +x, persondør, lys over porten, oppmerket plass foran.
  LEIR2.dronehangar = lod((b, e) => {
    const L = 14, B = 12, H = 6.2, d = [], V = '#6a7062', VM = '#4b5046';
    d.push(boks(0, 0, 0, L + 3, B + .6, .12, K.betong));
    d.push(flytt(prisme(bueProfil(B, H, e ? 8 : 14), L, V), 0, 0, .12));
    // buer (ribber) hver 2,3 m
    if (!e) for (let x = -L / 2; x <= L / 2 + .01; x += L / 6) { const ytre = bueProfil(B + .24, H + .16, 14), indre = bueProfil(B - .05, H - .05, 14).reverse(); d.push(flytt(prisme([...ytre, ...indre], .18, VM), x, 0, .1)); }
    // porten: stor skyveport i to deler med ramme og vindusbånd, persondør
    d.push(boks(L / 2 + .02, 0, .12, .1, 9, 5, '#7c827a'), boks(L / 2 + .02, 0, 5.12, .12, 9.4, .25, VM));
    if (!e) { d.push(boks(L / 2 + .08, 0, .12, .04, .06, 5, VM)); for (const z of [1.2, 2.4, 3.6]) d.push(boks(L / 2 + .08, 0, .12 + z, .04, 9, .05, VM)); d.push(boks(L / 2 + .09, -2.2, 3.9, .02, 3.6, .5, K.glassL), boks(L / 2 + .09, 2.2, 3.9, .02, 3.6, .5, K.glassL)); }
    d.push(dør(L / 2 - .02, 5.2, .12, .9, 2, 'x+', VM, K.mørkM));
    d.push(boks(L / 2 + .3, 0, 5.5, .4, 1.2, .25, K.mørk), boks(L / 2 + .3, 0, 5.48, .35, 1.1, .03, K.lys));
    // plassen foran: sirkel og kors i gult
    const ring = new THREE.RingGeometry(1.9, 2.1, 20); ring.translate(L / 2 + 4.5, 0, .125); d.push(farg(ring, K.gul));
    d.push(boks(L / 2 + 4.5, 0, .12, 2.4, .2, .01, K.gul), boks(L / 2 + 4.5, 0, .12, .2, 2.4, .01, K.gul));
    if (!e) d.push(ac(-L / 2, -3, 1.2, 'x-'), stav([-L / 2 - .2, 3, 0], [-L / 2 - .2, 3, 7.5], .04, K.galv, 4), kule(-L / 2 - .2, 3, 7.55, .07, K.rød, 6));
    return d;
  });

  // =====================================================================================================================
  // B31 ★ Oppskytingsrampe for droner: skrå skinne på A-stativ over en tilhenger, vogn med en fastvinget drone, trykkluftsylinder
  // under skinna, kontrollboks med kabel. Skyter mot +x.
  LEIR2.dronerampe = lod((b, e) => {
    const d = [], a0 = [-4.6, 0, .9], a1 = [4.6, 0, 2.6];
    // tilhenger: ramme, to hjul, drag
    d.push(boks(-1.2, 0, .55, 5, 1.6, .14, K.olivenM), stav([-3.7, 0, .62], [-5.2, 0, .45], .05, K.olivenM, 4));
    for (const sy of [-1, 1]) d.push(skive(-1.2, sy * .95, .4, .4, .25, K.gummi, 'y', 12), skive(-1.2, sy * 1.08, .4, .2, .02, K.grå, 'y', 8));
    for (const sy of [-1, 1]) d.push(bjelke([-4.8, sy * .7, 0], [-4.8, sy * .7, .55], .08, K.mørk));
    // skinna og stativet
    d.push(bjelke(a0, a1, .22, K.galv, .25));
    for (const t of [.35, .75, 1]) { const x = a0[0] + (a1[0] - a0[0]) * t, z = a0[2] + (a1[2] - a0[2]) * t; for (const sy of [-1, 1]) d.push(bjelke([x - .2, sy * .8, t < .5 ? .62 : 0], [x, 0, z - .1], .08, K.olivenM)); }
    if (!e) d.push(stav([-3.5, 0, .95], [1.5, 0, 1.85], .1, K.mørk, 8), stav([1.5, 0, 1.85], [3.8, 0, 2.3], .05, K.stålG, 6));
    // vogna og drona (kropp, vinger, V-hale, propell bak)
    const t = .25, vx = a0[0] + (a1[0] - a0[0]) * t, vz = a0[2] + (a1[2] - a0[2]) * t + .2, h = Math.atan2(a1[2] - a0[2], a1[0] - a0[0]);
    const dr = [boks(0, 0, -.12, .6, .5, .12, K.mørk), syl(0, 0, 0, .14, 2, '#9ea3a5', 10, .1).rotateY(Math.PI / 2).translate(-1.6, 0, .14)];
    dr.push(kule(.4, 0, .14, .14, '#9ea3a5', 8), boks(-.1, 0, .2, .45, 3.2, .04, '#a9aeb0'), skive(.45, 0, .14, .06, .04, K.glass, 'x', 6));
    for (const sy of [-1, 1]) { const ht = boks(0, 0, 0, .35, .6, .03, '#a9aeb0'); ht.rotateX(sy * .6); dr.push(flytt(ht, -1.45, sy * .22, .32)); }
    dr.push(skive(-1.65, 0, .14, .04, .08, K.mørk, 'x', 6), boks(-1.68, 0, .14, .02, .05, .7, K.mørk));
    d.push(...dr.map(g => { g.rotateY(-h); g.translate(vx, 0, vz); return g; }));
    // kontrollboks på stativ med kabel
    d.push(boks(-3.2, -1.5, 0, .1, .1, .9, K.mørk), boks(-3.2, -1.5, .9, .45, .3, .35, K.olivenM), boks(-3.05, -1.5, 1.05, .02, .2, .12, K.glassL));
    if (!e) kabel(d, [[-3.2, -1.4, .95], [-3.3, -.9, .05], [-2.4, -.6, .05], [-2, -.2, .6]], .02);
    return d;
  });

  // =====================================================================================================================
  // B32 ★ Satellittterminal: parabol (2,4 m) på fot, flat terminal på stativ, utstyrsskap og kabelkanal på en betongplate.
  LEIR2.satellitt = lod((b, e) => {
    const d = [];
    d.push(boks(0, 0, 0, 6, 6, .2, K.betong));
    // parabol på fot med matearm og mottaker
    d.push(syl(-1, -.6, .2, .25, 1.4, K.grå, 10, .18), boks(-1, -.6, 1.55, .5, .5, .35, K.grå));
    d.push(parabol(-.75, -.6, 2.35, 1.2, 0, .5));
    const fx = -.75 + Math.cos(.5) * 1.1, fz = 2.35 + Math.sin(.5) * 1.1;
    for (const sy of [-1, 1]) d.push(stav([-.6, -.6 + sy * .8, 1.75], [fx, -.6, fz], .025, K.stålG, 4));
    d.push(stav([-.6, -.6, 1.5], [fx, -.6, fz], .03, K.stålG, 4), boks(fx, -.6, fz - .1, .25, .15, .2, K.mørk));
    // flat terminal på tre bein (vender mot +x og opp)
    const pl = boks(0, 0, 0, .9, .6, .06, '#e6e6e1'); pl.rotateY(-.7); d.push(flytt(pl, 1.6, 1.4, 1.2));
    for (const [x, y] of [[1.3, 1.1], [1.3, 1.7], [1.9, 1.4]]) d.push(stav([x, y, .2], [1.6, 1.4, 1.1], .02, K.mørk, 4));
    // utstyrsskap og kabelkanal
    d.push(boks(1.6, -1.8, .2, .7, 1, 1.6, '#9ea29f'), boks(1.96, -1.8, .4, .02, .7, 1.1, '#8b908d'), boks(1.6, -1.8, 1.8, .8, 1.1, .06, K.mørk));
    if (!e) { d.push(skive(1.98, -1.55, 1.6, .03, .02, K.grønnLys, 'x', 6), boks(.3, -1.2, .2, 2.4, .2, .08, K.grå)); kabel(d, [[fx, -.6, fz - .1], [-.4, -.6, 1.4], [-.6, -.3, .3]], .015); d.push(varsel(1.96, -1.5, 1.1, .16, 'x+')); }
    return d;
  });

  // =====================================================================================================================
  // B33 ★ Radartårn: firkantet gittertårn (14 m) med plattform og rekkverk, hvit radarkuppel (radome) på toppen, stige med
  // ryggbøyler, utstyrshus ved foten og flyvarsellys.
  LEIR2.radartårn = lod((b, e) => {
    const d = [], H = 14, f = '#8b9091';
    tårnGitter(d, H, 1.8, 1.1, f, e);
    d.push(boks(0, 0, H, 3, 3, .15, K.galv));
    if (!e) for (const [x, y, sx, sy] of [[1.45, 0, .05, 3], [-1.45, 0, .05, 3], [0, 1.45, 3, .05], [0, -1.45, 3, .05]]) d.push(boks(x, y, H + 1, sx, sy, .05, K.gul), boks(x, y, H + .5, sx, sy, .04, K.gul));
    if (!e) for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) d.push(stav([sx * 1.45, sy * 1.45, H], [sx * 1.45, sy * 1.45, H + 1], .025, K.gul, 4));
    d.push(syl(0, 0, H + .15, .9, .5, '#d9d9d4', 12), kule(0, 0, H + 1.9, 1.7, '#efefea', e ? 10 : 16), kule(0, 0, H + 3.65, .09, K.rød, 6));
    // stige på −y-siden
    for (const dx of [-.22, .22]) d.push(bjelke([.4 + dx, -1.95, 0], [.4 + dx, -1.25, H], .05, K.galv));
    if (!e) { for (let i = 1; i < 40; i++) { const k = i / 40; d.push(boks(.4, -1.95 + .7 * k, H * k, .44, .04, .04, K.galv)); }
      for (let z = 2.4; z < H; z += .8) { const yy = -1.95 + .7 * z / H; d.push(bjelke([.05, yy, z], [.05, yy - .55, z], .03, K.galv), bjelke([.75, yy, z], [.75, yy - .55, z], .03, K.galv), bjelke([.05, yy - .55, z], [.75, yy - .55, z], .03, K.galv)); } }
    // utstyrshus ved foten og kabel opp
    d.push(boks(2.6, 1.6, 0, 1.6, 2.2, 2.3, K.panel), boks(2.6, 1.6, 2.3, 1.8, 2.4, .1, K.mørk), dør(3.4, 1.6, 0, .8, 2, 'x+', K.mørk, K.mørkM));
    if (!e) { d.push(ac(1.8, 1.6, 1.2, 'x-')); kabel(d, [[1.8, 1.2, 2], [1.4, .9, 3], [1.1, .7, H - .2]], .03); }
    return d;
  });

  // Fast variant per bygg (samme bygg ser alltid likt ut): 0 … n−1 etter byggets id
  const variant = (b, n) => (b && Number.isFinite(b.id) && b.id >= 0 ? (b.id * 7 + 3) % n : 0);

  // =====================================================================================================================
  // B34 ★ Ammunisjonsbunker: betongkammer under en jordvoll (gress oppå), frontmur med vinger mot +x, tung dobbel ståldør med
  // varselstriper og håndhjul, lufterør gjennom vollen, lynavledere og fareskilt.
  LEIR2.ammobunker = lod((b, e) => {
    const d = [], L = 10, B = 7;
    // jordvollen: avrundet profil langs x, gress og jord
    d.push(flytt(prisme(bueProfil(B + 5, 3.6, e ? 6 : 10), L, '#5a6b3e'), -.5, 0, 0));
    d.push(flytt(prisme([[-(B + 5) / 2, 0], [(B + 5) / 2, 0], [(B + 5) / 2 - .4, .25], [-(B + 5) / 2 + .4, .25]], L + .4, '#6b5a43'), -.5, 0, 0));
    // frontmur med vinger som skrår ut
    d.push(boks(L / 2 - .2, 0, 0, .5, 5, 3.6, K.betong), boks(L / 2 - .2, 0, 3.6, .6, 5.2, .2, F.betongM));
    for (const sy of [-1, 1]) { const v = boks(0, sy * 1.6, 0, .4, 3.2, 3, K.betong); v.rotateZ(sy * .5); d.push(flytt(v, L / 2 + .4, sy * 2.6, 0)); }
    // døra: to stålfløyer, varselstriper rundt, håndhjul og bolter
    d.push(påVegg([boks(.03, 0, 0, .06, 2.6, 2.6, '#4a4f4b'), boks(.07, 0, 0, .02, .04, 2.6, K.mørk), boks(.07, 0, 2.6, .03, 2.8, .12, K.gul)], L / 2 + .05, 0, .05, 'x+'));
    if (!e) { for (let i = 0; i < 8; i++) d.push(påVegg([boks(.075, 0, 0, .02, .16, .33, i % 2 ? K.svartgul : K.gul)], L / 2 + .05, -1.36, .05 + i * .33, 'x+'), påVegg([boks(.075, 0, 0, .02, .16, .33, i % 2 ? K.gul : K.svartgul)], L / 2 + .05, 1.36, .05 + i * .33, 'x+'));
      d.push(farg(new THREE.TorusGeometry(.25, .03, 4, 10).rotateY(Math.PI / 2).translate(L / 2 + .2, .5, 1.3), K.rød), farg(new THREE.TorusGeometry(.25, .03, 4, 10).rotateY(Math.PI / 2).translate(L / 2 + .2, -.5, 1.3), K.rød));
      for (const y of [-1, -.4, .4, 1]) for (const z of [.4, 2.2]) d.push(skive(L / 2 + .11, y, .05 + z, .04, .03, K.stålG, 'x', 6)); }
    d.push(påVegg([boks(.02, 0, 0, .03, .8, .55, '#f2efe6'), boks(.04, 0, .1, .01, .6, .12, K.rød), boks(.04, 0, .32, .01, .5, .08, K.mørk)], L / 2 + .05, 1.9, 2.5, 'x+'));
    d.push(varsel(L / 2 + .05, -1.9, 2.4, .5, 'x+'));
    // lufterør og lynavledere på vollen, lampe over døra
    for (const x of [-2, 1.5]) d.push(syl(x, 0, 3.3, .14, 1.1, K.galv, 8), farg(new THREE.CylinderGeometry(.24, .14, .2, 8).rotateX(Math.PI / 2).translate(x, 0, 4.5), K.galv));
    if (!e) for (const x of [-4, 3.5]) d.push(stav([x, 2.5, 1.5], [x, 2.5, 6], .02, '#b86f3a', 4));
    d.push(boks(L / 2 + .2, 0, 3.05, .3, .5, .18, K.mørk), boks(L / 2 + .2, 0, 3.03, .25, .4, .02, K.lys));
    return d;
  });

  // =====================================================================================================================
  // B35 ★ Våpenlager: mørk container med stålgitter foran dørene, to hengelåser, alarmboks med blinklys, kamera og kodelås.
  LEIR2.våpenlager = lod((b, e) => {
    const d = [], L = 6.06, B = 2.44, H = 2.59, V = '#3f4834', VM = '#2f3627';
    d.push(boks(0, 0, .1, L, B, H - .1, V)); for (const sy of [-1, 1]) for (const sx of [-1, 1]) d.push(boks(sx * (L / 2 - .08), sy * (B / 2 - .08), 0, .18, .18, H, VM));
    if (!e) for (let i = 1; i < 10; i++) d.push(boks(-L / 2 + i * L / 10, 0, .25, .1, B + .05, H - .4, VM));
    d.push(boks(0, 0, H - .14, L + .02, B + .04, .16, VM), boks(0, 0, 0, L + .02, B + .04, .16, VM));
    // dørene, låsestengene og stålgitteret foran
    d.push(boks(L / 2 + .01, 0, .16, .02, .02, H - .3, '#202224')); for (const y of [-.85, -.35, .35, .85]) d.push(stav([L / 2 + .06, y, .2], [L / 2 + .06, y, H - .2], .025, F.stålM, 4));
    d.push(boks(L / 2 + .25, 0, .12, .06, B + .1, .08, K.mørk), boks(L / 2 + .25, 0, H - .1, .06, B + .1, .08, K.mørk));
    for (let y = -1.15; y <= 1.16; y += e ? .46 : .23) d.push(boks(L / 2 + .25, y, .12, .03, .03, H - .2, K.mørk));
    if (!e) for (let z = .5; z < H - .2; z += .45) d.push(boks(L / 2 + .25, 0, z, .03, B + .1, .03, K.mørk));
    d.push(boks(L / 2 + .3, -.15, 1.1, .08, .1, .14, K.gul), boks(L / 2 + .3, .15, 1.1, .08, .1, .14, K.gul));
    // alarm, blinklys, kamera, kodelås og skilt
    d.push(boks(L / 2 - .5, B / 2 + .06, 2, .35, .1, .4, '#e3e3de'), kuppel(L / 2 - .5, B / 2 + .12, 2.42, .08, K.rød, 8), boks(L / 2 + .05, B / 2 + .05, 1.1, .03, .12, .18, K.mørk));
    d.push(stav([L / 2 - .1, -B / 2 + .1, H], [L / 2 + .2, -B / 2 - .1, H + .25], .025, K.galv, 4), boks(L / 2 + .3, -B / 2 - .15, H + .2, .3, .12, .12, '#e6e6e1'));
    d.push(varsel(0, B / 2 + .03, 1.2, .45, 'y+'), varsel(0, -B / 2 - .03, 1.2, .45, 'y-'));
    return d;
  });

  // =====================================================================================================================
  // B36 ★ Spisebrakke (messe): lang modulbrakke med vindusrekke, inngang med baldakin, kjøkkenhette og pipe, overbygd
  // uteservering med benkebord, søppeldunker. 8 × 14 m, døra mot +x.
  LEIR2.messe = lod((b, e) => {
    const d = [], B = 8, L = 14, H = 2.9, s = .4, V = '#7a7f6a', VM = '#5d6250';
    d.push(boks(0, 0, 0, B + .2, L + .2, s, K.betong), boks(0, 0, s, B, L, H, V));
    for (const z of [s, s + H - .16]) d.push(boks(0, 0, z, B + .08, L + .08, .16, VM));
    for (const y of [-7, -2.33, 2.33, 7]) for (const sx of [-1, 1]) d.push(boks(sx * (B / 2 + .02), Math.max(-6.93, Math.min(6.93, y)), s, .16, .16, H, VM));
    d.push(flytt(gavl(L, B, .9, V), 0, 0, s + H, Math.PI / 2), flytt(saltak(L, B, .9, F.blikk, .4), 0, 0, s + H, Math.PI / 2));
    for (const y of [-5.6, -4, -.9, .9, 4, 5.6]) d.push(vind(B / 2, y, s + 1, 1.1, 1.1, 'x+', e));
    for (const y of [-5.6, -4, -2.4, -.8, .8, 2.4, 4, 5.6]) d.push(vind(-B / 2, y, s + 1, 1.1, 1.1, 'x-', e));
    d.push(påVegg([boks(.02, 0, 0, .04, 1.9, 2.2, K.mørkM), boks(.045, -.45, 0, .04, .85, 2.1, VM), boks(.045, .45, 0, .04, .85, 2.1, VM), boks(.07, -.45, 1.1, .02, .5, .8, K.glassL), boks(.07, .45, 1.1, .02, .5, .8, K.glassL)], B / 2, 2.4, s, 'x+'));
    trapp(d, B / 2, 2.4, s, 2.2, .8, K.betong, e);
    // overbygg over inngangen og uteserveringen (y −3,5 til 3,5 foran)
    d.push(boks(B / 2 + 1.6, -.6, s + 2.3, 3.2, 7.6, .1, F.blikkM));
    for (const y of [-4.2, -1.6, 1, 3.1]) d.push(stav([B / 2 + 3.1, y, 0], [B / 2 + 3.1, y, s + 2.3], .05, K.stålG, 6));
    for (const y of [-3.2, -.6]) { d.push(boks(B / 2 + 1.7, y, .7, .8, 1.9, .06, F.treL)); if (!e) for (const sx of [-1, 1]) d.push(boks(B / 2 + 1.7 + sx * .65, y, .42, .3, 1.9, .05, F.treL), boks(B / 2 + 1.7 + sx * .3, y, 0, .06, 1.6, .7, F.treM)); }
    // kjøkkenhette, pipe og ventil på −x-siden, søppeldunker
    d.push(boks(-B / 2 - .3, -5, s + 1.6, .6, 1.2, .6, K.stålG), stav([-B / 2 - .3, -5, s + 2.2], [-B / 2 - .3, -5, s + H + 1.6], .15, K.stålG, 8), syl(-1.8, 4.5, s + H + .3, .14, 1.4, F.svart, 8));
    for (let i = 0; i < 3; i++) d.push(boks(-B / 2 - .5, 3 + i * .8, 0, .65, .6, 1.05, ['#3d5a3a', '#2f3e52', '#4a4a4a'][i]), boks(-B / 2 - .5, 3 + i * .8, 1.05, .7, .65, .06, K.mørk));
    if (!e) d.push(ac(-B / 2, 0, s + 1.2, 'x-'), ac(-B / 2, -2.4, s + 1.2, 'x-'));
    return d;
  });

  // =====================================================================================================================
  // A17 Lagertelt: buetelt i presenning med opprullet inngang i +x-enden, stenger og barduner, paller med last under presenning
  // utenfor. Samme mål som før (8 × 5 m, inngangen x = 4).
  LEIR2.lagertelt = lod((b, e) => {
    const L = 8, B = 5, d = [], P = '#59604a', PM = '#454b39';
    d.push(prisme(bueProfil(B, 3.3, e ? 7 : 12), L, P));
    if (!e) for (let x = -L / 2; x <= L / 2 + .01; x += L / 4) { const ytre = bueProfil(B + .12, 3.38, 12), indre = bueProfil(B - .02, 3.28, 12).reverse(); d.push(flytt(prisme([...ytre, ...indre], .12, PM), x, 0, 0)); }
    // inngangen: mørk åpning og opprullet duk
    d.push(boks(L / 2 + .01, 0, 0, .02, 2, 2.3, '#1d1f1a'), skive(L / 2 + .15, 0, 2.4, .16, 2.3, PM, 'y', 8));
    for (const x of [-3, 0, 3]) for (const sy of [-1, 1]) { d.push(boks(x, sy * (B / 2 + 1.2), 0, .06, .06, .18, F.treM)); if (!e) d.push(bjelke([x, sy * B * .42, 2.2], [x, sy * (B / 2 + 1.2), .1], .02, '#2f3127')); }
    // paller med last under presenning ved siden av inngangen
    for (const y of [-3.4, 3.4]) { d.push(boks(L / 2 - 1, y, 0, 1.2, 1, .14, F.treL), boks(L / 2 - 1, y, .14, 1.1, .9, .9, '#4b5a3f')); if (!e) d.push(boks(L / 2 - 1, y, .14, 1.16, .96, .05, PM), boks(L / 2 - 1, y, .9, 1.14, .94, .1, PM)); }
    return d;
  });

  // =====================================================================================================================
  // A18 Container: 20 fot med dører, låsestenger, hjørnebeslag, nummer og typeskilt. Fargen varierer fast per container.
  LEIR2.container = lod((b, e) => {
    const L = 6.06, B = 2.44, H = 2.59, d = [], f = ['#2f5a74', '#5a6447', '#7a3c24', '#9c8a62'][variant(b, 4)], m = tone(f, .78);
    d.push(boks(0, 0, .1, L, B, H - .1, f));
    for (const sy of [-1, 1]) for (const sx of [-1, 1]) { d.push(boks(sx * (L / 2 - .08), sy * (B / 2 - .08), 0, .18, .18, H, m)); if (!e) for (const z of [0, H - .12]) d.push(boks(sx * (L / 2 - .05), sy * (B / 2 - .05), z, .14, .14, .12, '#3a3a38')); }
    for (let i = 1; i < 12; i++) { const x = -L / 2 + i * L / 12; d.push(boks(x, 0, .25, .12, B + .05, H - .4, m)); }
    d.push(boks(0, 0, H - .14, L + .02, B + .04, .16, m), boks(0, 0, 0, L + .02, B + .04, .16, m));
    d.push(boks(L / 2 + .01, 0, .16, .02, .02, H - .3, '#202224'));
    for (const y of [-.85, -.35, .35, .85]) { d.push(stav([L / 2 + .06, y, .2], [L / 2 + .06, y, H - .2], .025, F.stålM, 4)); if (!e) d.push(boks(L / 2 + .09, y + .08, 1.2, .04, .14, .05, F.stålM)); }
    if (!e) { d.push(boks(L / 2 + .025, .55, 2.05, .01, .5, .14, '#ece9df'), boks(L / 2 + .025, -.55, 1.8, .01, .35, .2, K.aluminium));
      for (const sy of [-1, 1]) d.push(boks(2.1, sy * (B / 2 + .04), 2.1, .9, .01, .16, '#ece9df')); }
    return d;
  });

  // =====================================================================================================================
  // Del C ★: ting i leiren. Små modeller (høyst 300 trekanter). Fast variant per ting.
  // C75 Paller: tomme, stablet (1, 3 eller 6 i høyden)
  // (enkel: bare klossene og dekket – brukes for pallene under den øverste i en stabel)
  function pall(d, x, y, z, rz, f, enkel) {
    const p = enkel ? [boks(0, 0, 0, 1.16, .96, .1, tone(f, .8)), boks(0, 0, .1, 1.2, 1, .04, f)] : [boks(0, 0, 0, 1.2, .1, .1, f), boks(0, -.45, 0, 1.2, .1, .1, f), boks(0, .45, 0, 1.2, .1, .1, f)];
    if (!enkel) for (const xx of [-.5, -.17, .17, .5]) p.push(boks(xx, 0, .1, .14, 1, .03, f));
    d.push(...flytt(p, x, y, z, rz));
  }
  LEIR2.paller = lod((b) => {
    const d = [], n = [1, 3, 6][variant(b, 3)], r = frø(11 + (b && b.id || 0));
    for (let i = 0; i < n; i++) pall(d, (r() - .5) * .06, (r() - .5) * .06, i * .14, (r() - .5) * .05, i % 3 === 2 ? '#9a8060' : F.treL, i < n - 1);
    if (n === 1) pall(d, 1.35, .1, 0, .3, F.treL);
    return d;
  });
  // C76 Ammunisjonskasser: olivengrønne kasser med håndtak og gul merking på pall
  // (kassen er to deler: kroppen og den gule merkingen på langsiden – håndtak bare på det øverste laget)
  function ammokasse(d, x, y, z, rz, sd, hank) {
    const k = [boks(0, 0, 0, .56, .3, .24, F.oliven), boks(0, sd * .155, .08, .28, .01, .05, K.gul)];
    if (hank) k.push(boks(0, 0, .24, .2, .05, .02, K.mørk));
    d.push(...flytt(k, x, y, z, rz));
  }
  LEIR2.ammokasser = lod((b) => {
    const d = [boks(0, 0, 0, 1.2, 1, .14, F.treL)], v = variant(b, 3);
    for (let z = 0; z < 2; z++) for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
      if (z === 1 && ((v === 1 && j === 2 && i) || (v === 2 && (i + j) % 2))) continue;
      ammokasse(d, (i - .5) * .58, (j - 1) * .32, .14 + z * .24, 0, j ? 1 : -1, z === 1 && i === 0 && j === 1); }
    return d;
  });
  // C77 Medisinkasser: hvite/grønne kasser med rødt kors (stablet), og en åpen kasse med bind
  LEIR2.medisinkasser = lod((b) => {
    const d = [boks(0, 0, 0, 1.2, 1, .14, F.treL)], v = variant(b, 2);
    const kasse = (x, y, z, f) => { d.push(boks(x, y, z, .55, .42, .32, f), boks(x, y, z + .3, .56, .43, .03, tone(f, .85)));
      d.push(boks(x, y - .215, z + .1, .02, .01, .14, K.rød), boks(x, y - .215, z + .16, .14, .01, .02, K.rød)); };
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) kasse((i - .5) * .58, (j - .5) * .45, .14, v ? '#e8e6df' : '#4e6b45');
    kasse(-.29, -.22, .47, '#e8e6df'); if (!v) kasse(.29, -.22, .47, '#4e6b45');
    d.push(boks(.3, .25, .47, .5, .38, .2, '#e8e6df'), boks(.2, .22, .64, .14, .14, .06, '#f3f1ea'), boks(.38, .28, .64, .12, .12, .05, '#c9d6db'));
    return d;
  });
  // C78 Matkasser: pappkasser med feltrasjoner og vannkanner på pall
  LEIR2.matkasser = lod((b) => {
    const d = [boks(0, 0, 0, 1.2, 1, .14, F.treL)], r = frø(5 + (b && b.id || 0)), v = variant(b, 2);
    for (let z = 0; z < 3; z++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { if (z === 2 && (i || j)) continue; const f = (i + j + z) % 2 ? '#a9875a' : '#9a7a50';
      d.push(boks((i - .5) * .58 + (r() - .5) * .03, (j - .5) * .48, .14 + z * .34, .54, .44, .32, f), boks((i - .5) * .58, (j - .5) * .48 - .225, .2 + z * .34, .2, .01, .08, '#3f3a30')); }
    if (v) for (let i = 0; i < 3; i++) d.push(boks(.3, -.22 + i * .22, .82, .18, .18, .3, '#3d6b8a'), boks(.3, -.22 + i * .22, 1.12, .06, .06, .04, K.mørk));
    return d;
  });
  // C79 Oljefat: stående (fire på pall), liggende (tre på bukker) eller stablet (pyramide)
  // (fatet: åttekantet kropp og én forsterkningsring; lokket med tappen bare på stående fat)
  function fat(d, x, y, z, f, ligg) {
    const g = [syl(0, 0, 0, .29, .88, f, 8), farg(new THREE.CylinderGeometry(.3, .3, .04, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, .44), tone(f, .75))];
    if (!ligg) g.push(syl(.12, .1, .88, .04, .02, F.stål, 4));
    if (ligg) g.forEach(q => { q.translate(0, 0, -.44); q.rotateY(Math.PI / 2); q.translate(0, 0, .29); });
    d.push(...flytt(g, x, y, z, 0));
  }
  LEIR2.oljefat = lod((b) => {
    const d = [], v = variant(b, 3), FA = [F.blå, F.rust, F.oliven, '#2f2f30'];
    if (v === 0) { d.push(boks(0, 0, 0, 1.25, 1.25, .14, F.treL)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], i) => fat(d, sx * .3, sy * .3, .14, FA[i])); }
    else if (v === 1) { for (const x of [-.5, .5]) d.push(boks(x, 0, 0, .12, 1.9, .25, F.treM)); for (let i = 0; i < 3; i++) fat(d, 0, (i - 1) * .62, .25, FA[i], true); }
    else { for (let i = 0; i < 2; i++) fat(d, 0, (i - .5) * .6, 0, FA[i], true); fat(d, 0, 0, .5, FA[2], true); for (const sy of [-1, 1]) d.push(boks(0, sy * .62, 0, .9, .12, .12, F.treM)); }
    return d;
  });
  // Leirens løse ting fra start (byggeplass3d.js: kasser og fat rundt flaggstanga) får de nye modellene
  const gamleKasser = M.kasser, gamleFat = M.fatpall;
  M.kasser = () => LEIR2.ammokasser({ id: 1 }) || gamleKasser();
  M.fatpall = () => LEIR2.oljefat({ id: 0 }) || gamleFat();

  // =====================================================================================================================
  // A19 Drivhus: plasttunnel over stålbuer (langs y), endevegg med dør mot +y, oppbrettbare sider, plantebed og regnvannstønne.
  // Samme mål som før (6 × 10 m, døra i +y-gavlen).
  LEIR2.drivhus = lod((b, e) => {
    const d = [], B = 5.8, L = 9.8, H = 3, P = '#c7d6cf', PM = '#aebeb6';
    d.push(boks(0, 0, 0, 6, 10, .3, F.treM));
    const tunnel = prisme(bueProfil(B, H, e ? 8 : 14), L, P); tunnel.rotateZ(Math.PI / 2); tunnel.translate(0, 0, .3); d.push(tunnel);
    if (!e) for (let y = -L / 2; y <= L / 2 + .01; y += L / 5) { const r = prisme([...bueProfil(B + .1, H + .06, 14), ...bueProfil(B - .02, H - .02, 14).reverse()], .08, K.galv); r.rotateZ(Math.PI / 2); r.translate(0, y, .3); d.push(r); }
    // sidene rullet litt opp (lufting): mørk stripe og rull
    if (!e) for (const sx of [-1, 1]) d.push(boks(sx * (B / 2 - .02), 0, .45, .02, L - .4, .35, '#2e3a32'), stav([sx * (B / 2 + .02), -L / 2 + .2, .85], [sx * (B / 2 + .02), L / 2 - .2, .85], .07, PM, 6));
    // døra i +y-gavlen: karm, dør med vindu
    d.push(påVegg([boks(.02, 0, 0, .05, 1.3, 2.15, '#8a8f8c'), boks(.05, 0, 0, .04, 1.1, 2.05, '#dfe5e1'), boks(.08, 0, 1.2, .02, .7, .6, '#9fb7ad')], 0, L / 2, .3, 'y+'));
    // plantebed ved døra og regnvannstønne
    for (const sx of [-1, 1]) { d.push(boks(sx * 1.6, L / 2 + .45, 0, 1.4, .7, .35, F.treM), boks(sx * 1.6, L / 2 + .45, .35, 1.3, .6, .04, '#4a3b2b'));
      if (!e) for (let i = 0; i < 4; i++) d.push(kule(sx * 1.6 - .45 + i * .3, L / 2 + .45, .45, .1, i % 2 ? '#5f8a3e' : '#4d7a35', 5)); }
    d.push(syl(2.6, 4.55, 0, .3, .9, '#2f4a64', 10)); if (!e) d.push(stav([2.6, 4.55, .9], [2.6, 4.2, 2.6], .025, K.galv, 4));
    return d;
  });

  // =====================================================================================================================
  // A20 Helikopterplass: betongplate med avfaset kant, hvit H i gul sirkel, lys i kanten (grønne og hvite), forankringspunkter,
  // lyskastere, brannvogn med slukkeapparat og vindpølse med lys på masta.
  LEIR2.helikopterplass = lod((b, e) => {
    const d = [syl(0, 0, 0, 10.5, .15, K.betong, 24), syl(0, 0, 0, 10.5, .1, F.betongM, 24, 10.9)];
    const ring = new THREE.RingGeometry(6.6, 7.2, 28); ring.translate(0, 0, .156); d.push(farg(ring, K.gul));
    const ytter = new THREE.RingGeometry(9.9, 10.15, 28); ytter.translate(0, 0, .156); d.push(farg(ytter, '#e8e6df'));
    d.push(boks(0, -2, .15, 4.4, .8, .01, '#e8e6df'), boks(0, 2, .15, 4.4, .8, .01, '#e8e6df'), boks(0, 0, .15, .8, 3.2, .01, '#e8e6df'));
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + Math.PI / 12; d.push(syl(Math.cos(a) * 10.25, Math.sin(a) * 10.25, .1, .12, .14, i % 2 ? K.lys : '#7fd17a', 6)); }
    if (!e) for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; d.push(farg(new THREE.TorusGeometry(.12, .025, 4, 8).translate(Math.cos(a) * 5, Math.sin(a) * 5, .16), K.stålG)); }
    // lyskastere på to stolper, brannvogn
    for (const [x, y] of [[-11.8, -6], [-11.8, 6]]) { d.push(stav([x, y, 0], [x, y, 3.5], .05, K.galv, 6), boks(x + .25, y, 3.4, .5, .3, .2, K.mørk)); }
    d.push(boks(11.5, -6, 0, .8, .6, .9, K.rød), syl(11.5, -6, .9, .2, .4, K.rød, 8), skive(11.5, -6.35, .25, .25, .1, K.gummi, 'y', 8));
    // vindpølsa: mast med lys, bøyle og pølse i oransje og hvit
    const vx = 12.5, vy = 8, z = 5;
    d.push(boks(vx, vy, 0, .5, .5, .2, K.betong), stav([vx, vy, .2], [vx, vy, z + .2], .05, K.galv, 6), kule(vx, vy, z + .3, .07, K.rød, 6), stav([vx, vy, z], [vx + .35, vy, z], .02, K.stålG, 4));
    let x = vx + .35, zz = z;
    for (const [f, r1, r2] of [['#cf5f1f', .35, .3], ['#e8e6df', .3, .26], ['#cf5f1f', .26, .22], ['#e8e6df', .22, .18], ['#cf5f1f', .18, .15]]) {
      const g = new THREE.CylinderGeometry(r2, r1, .6, 8, 1, true); g.rotateZ(-Math.PI / 2); g.rotateY(.12); d.push(flytt(farg(g, f), x + .3, vy, zz - .04)); x += .59; zz -= .07; }
    return d;
  });

  // =====================================================================================================================
  // A21 Sandsekkvoll: ujevne sekker i fire lag (forskjøvet som murstein, litt innover oppover), to skyteskår i øverste lag.
  // Lengde langs y (8 m som i leiren), fronten mot +x.
  LEIR2.sandsekkvoll = lod((b, e) => {
    const L = 8, d = [], r = frø(7 + ((b && b.id) || 0));
    if (e) { d.push(flytt(prisme([[-.45, 0], [.45, 0], [.3, .8], [-.3, .8]], L, K.sand), 0, 0, 0, Math.PI / 2)); return d; }
    for (let j = 0; j < 4; j++) {
      const sb = .58, n = Math.ceil(L / sb) + 1, forskj = j % 2 ? sb / 2 : 0;
      for (let i = 0; i < n; i++) {
        let y0 = -L / 2 + i * sb - forskj, y1 = y0 + sb; y0 = Math.max(y0, -L / 2); y1 = Math.min(y1, L / 2); if (y1 - y0 < .2) continue;
        const ym = (y0 + y1) / 2; if (j === 3 && (Math.abs(ym - 1.6) < .5 || Math.abs(ym + 1.6) < .5)) continue;
        const g = sekk(-j * .05 + (r() - .5) * .04, ym, j * .19, y1 - y0 - .03, (r() - .5) * .06, SEKKFARGE[(r() * 5) | 0]); d.push(g);
      }
    }
    return d;
  });

  // =====================================================================================================================
  // A22 Gjerde: stolper med betongfot og hette, topprør og strekktråd nede, netting (loddrette og skrå tråder), skrå arm med tre
  // piggtråder. Lengde L langs +y fra y = 0, utsiden mot +x – samme avtale som MODELLER.gjerde (leir-visning.js gjerde3d).
  const gamleGjerde = M.gjerde;
  M.gjerde = function (L) {
    L = L || 10; const d = [], n = Math.max(1, Math.round(L / 3)), H = 2.1, ST = '#6f7476', TR = '#9ba1a4';
    // (ca. 420 trekanter per 10 m: gjerdet går rundt hele leiren, så det må være lett)
    for (let i = 0; i <= n; i++) { const y = i * L / n;
      d.push(boks(0, y, 0, .16, .16, .12, K.betong), boks(0, y, .1, .06, .06, H - .05, ST), bjelke([0, y, H - .05], [.4, y, H + .32], .035, ST)); }
    d.push(boks(0, L / 2, H - .1, .05, L, .05, ST), boks(0, L / 2, .1, .01, L, .01, TR), boks(0, L / 2, 1.05, .01, L, .01, TR));
    for (let y = 1.2; y < L - .1; y += 1.2) d.push(boks(.005, y, .1, .008, .008, H - .2, TR));
    for (let y = 0; y + 2.4 <= L + .01; y += 2.4) d.push(bjelke([.005, y, .12], [.005, y + 2.4, H - .12], .008, TR), bjelke([.005, y + 2.4, .12], [.005, y, H - .12], .008, TR));
    for (const k of [.33, .66, 1]) d.push(boks(.4 * k, L / 2, H - .05 + .37 * k, .012, L, .012, '#5e6366'));
    return ferdig(d);
  };
  M.gjerde.gammel = gamleGjerde;

  // =====================================================================================================================
  // A23 Kjøkken: feltkjøkken av to containermoduler med flatt tak, utleveringsluke med oppslått skjerm mot +x, pipe og
  // avtrekkshette, gassflasker i bur, vanntank, benk og bord under en markise. Samme mål og dør som før (døra x 2,4, y −1,3).
  LEIR2.kjøkken = lod((b, e) => {
    const d = [], V = '#56603f', VM = '#3f4730', z0 = .25, H = 2.6;
    d.push(boks(0, 0, 0, 7.2, 9.2, z0, K.betong));
    for (const [x, w] of [[-1.8, 2.8], [1, 2.8]]) { d.push(boks(x, 0, z0, w - .04, 8.4, H, V)); for (const sx of [-1, 1]) for (const sy of [-1, 1]) d.push(boks(x + sx * (w / 2 - .1), sy * 4.1, z0, .18, .18, H, VM)); }
    d.push(boks(-.4, 0, z0 + H, 5.7, 8.5, .14, VM), boks(-.4, 0, z0, 5.64, 8.44, .14, VM));
    if (!e) for (let y = -3.6; y <= 3.6; y += .6) for (const x of [-3.22, 2.42]) d.push(boks(x, y, z0 + .2, .04, .08, H - .4, VM));
    // utleveringsluka med oppslått skjerm og disk
    d.push(boks(2.43, 1.6, z0 + 1, .06, 2.4, 1, '#2b2e30'), boks(2.62, 1.6, z0 + 1, .4, 2.5, .06, K.stålG));
    const skjerm = boks(0, 0, 0, 1.2, 2.5, .05, V); skjerm.rotateY(-1.15); d.push(flytt(skjerm, 2.7, 1.6, z0 + 2.05));
    d.push(dør(2.4, -1.3, z0, 1, 2, 'x+', VM, K.mørkM));
    // pipe, avtrekkshette, aircondition, markise over benkene
    d.push(stav([-2.6, 2.6, z0 + H], [-2.6, 2.6, z0 + H + 1.6], .16, K.stålG, 8), farg(new THREE.ConeGeometry(.32, .3, 8).rotateX(Math.PI / 2).translate(-2.6, 2.6, z0 + H + 1.75), K.stålG));
    d.push(boks(.4, -2.4, z0 + H + .14, 1.2, 1.2, .5, K.stålG), boks(.4, -2.4, z0 + H + .64, 1.4, 1.4, .06, K.mørk));
    d.push(boks(3.5, 1.6, z0 + 2.4, 2.1, 3.4, .06, '#4b5a3f')); for (const y of [0, 3.2]) d.push(stav([4.5, y, 0], [4.5, y, z0 + 2.4], .04, K.stålG, 4));
    if (!e) { d.push(boks(3.6, 1.6, .7, .8, 2.4, .06, F.treL), boks(4.2, 1.6, .42, .3, 2.4, .05, F.treL)); for (const y of [.6, 2.6]) d.push(boks(3.6, y, 0, .7, .06, .7, F.treM));
      // gassflasker i bur og vanntank på −x-siden
      for (let i = 0; i < 3; i++) d.push(syl(-3.7, -3 + i * .4, z0, .15, 1.1, '#9aa1a6', 8), kuppel(-3.7, -3 + i * .4, z0 + 1.1, .15, '#9aa1a6', 6));
      // buret: hjørnestolper, topp og tre stenger foran
      for (const [x, y] of [[-3.45, -3.25], [-3.45, -1.95], [-3.95, -3.25], [-3.95, -1.95]]) d.push(boks(x, y, z0, .04, .04, 1.35, K.galv));
      d.push(boks(-3.7, -2.6, z0 + 1.35, .54, 1.34, .03, K.galv)); for (const z of [.3, .7, 1.05]) d.push(boks(-3.95, -2.6, z0 + z, .02, 1.3, .02, K.galv));
      d.push(boks(-3.7, 2, z0, .9, .9, 1.1, '#e3e3de'), boks(-3.7, 2, z0, 1, 1, .1, K.galv)); }
    return d;
  });

  // =====================================================================================================================
  // A24 Brønn: brønnring i betong med lokk, takoverbygg på to stolper, vinde med sveiv og bøtte, liten håndpumpe ved siden av.
  LEIR2.brønn = lod((b, e) => {
    const d = [boks(0, 0, 0, 2.8, 2.8, .2, F.betongM), syl(0, 0, .2, .85, .75, K.betong, 14), syl(0, 0, .2, .72, .76, '#1b2a33', 14)];
    if (!e) d.push(farg(new THREE.CylinderGeometry(.86, .86, .06, 14, 1, true).rotateX(Math.PI / 2).translate(0, 0, .95), F.betongM));
    for (const y of [-.95, .95]) d.push(boks(0, y, .2, .14, .14, 1.9, F.treM));
    d.push(stav([0, -1.05, 1.5], [0, 1.05, 1.5], .07, F.tre, 8), bjelke([0, .95, 1.5], [.35, 1.2, 1.5], .04, K.mørk), bjelke([.35, 1.2, 1.5], [.35, 1.2, 1.25], .03, K.mørk));
    d.push(stav([0, -.1, 1.45], [0, -.1, .9], .01, '#8c7b5a', 3), syl(0, -.1, .7, .14, .22, K.galv, 8, .17));
    d.push(flytt(saltak(.3, 2.4, .5, F.treM, .3), 0, 0, 2.1, Math.PI / 2), flytt(gavl(.3, 2.4, .5, F.tre), 0, 0, 2.05, Math.PI / 2));
    d.push(syl(1.05, -1, .2, .06, 1, '#2f4a64', 6), bjelke([1.05, -1, 1.15], [1.4, -1, 1.25], .04, '#2f4a64'), bjelke([1.05, -1.05, .85], [1.25, -1.05, .7], .03, '#2f4a64'));
    return d;
  });

  // =====================================================================================================================
  // A25 Flaggstang: stanga med duken lages i oppstart-visning.js (den blafrer). Her: sokkel med selskapsskilt, grusring og to
  // bakkelys rundt foten – lagt inn ved leiren i 3D (KROKER.sett3d nederst). MODELLER.flaggstang (testsiden) får samme sokkel.
  LEIR2.flaggsokkel = lod(() => {
    const S = selskap(), d = [syl(0, 0, 0, 2.3, .03, '#6f6a5e', 16), boks(0, 0, 0, 1.3, 1.3, .45, K.betong), boks(0, 0, .45, 1.4, 1.4, .06, F.betongM)];
    for (const rz of [0, Math.PI]) d.push(flytt([boks(.66, 0, .1, .02, .9, .28, S.farge), boks(.675, -.25, .17, .01, .14, .14, S.detalj), boks(.675, .12, .2, .01, .45, .06, '#ece9df')], 0, 0, 0, rz));
    for (const a of [.6, 3.7]) d.push(syl(Math.cos(a) * 1.7, Math.sin(a) * 1.7, 0, .12, .2, K.mørk, 6), skive(Math.cos(a) * 1.7, Math.sin(a) * 1.7, .2, .1, .01, K.lys, 'z', 6));
    return d;
  });
  const gamleFlagg = M.flaggstang;
  M.flaggstang = valg => samle([gamleFlagg(valg), LEIR2.flaggsokkel()]);

  // =====================================================================================================================
  // A26 Vegsperring: tre betongsperrer i sikksakk, bom med motvekt, skiltbukk med røde lamper, stoppskilt og fat med refleks.
  LEIR2.vegsperring = lod((b, e) => {
    const d = [], sperre = (x, y) => flytt(prisme([[-.3, 0], [.3, 0], [.3, .08], [.12, .3], [.08, .82], [-.08, .82], [-.12, .3], [-.3, .08]], 3, K.betong), x, y, 0, Math.PI / 2);
    d.push(sperre(0, -2.2), sperre(3.5, 2.2), sperre(7, -2.2));
    if (!e) for (const [x, y] of [[0, -2.2], [3.5, 2.2], [7, -2.2]]) d.push(boks(x, y - 1.2, .4, .02, .3, .12, K.gul), boks(x, y + 1.2, .4, .02, .3, .12, K.gul));
    // bom på søyle med motvekt
    d.push(boks(-1.6, -3.4, 0, .4, .4, 1.1, K.gul), boks(-1.6, -3.4, 1.1, .45, .45, .1, K.mørk));
    for (let i = 0; i < 6; i++) d.push(boks(-1.6, -3.1 + (i + .5) * 1, 1.05, .1, 1, .1, i % 2 ? '#e8e6df' : F.rødL));
    d.push(boks(-1.6, -3.9, .95, .3, .5, .3, K.betong), boks(-1.6, 2.8, 0, .1, .1, 1, K.gul));
    // stoppskilt og fat med refleksbånd og lampe
    d.push(stav([-2.4, 3.6, 0], [-2.4, 3.6, 2], .04, K.galv, 4));
    const sk = syl(0, 0, 0, .36, .04, F.rødL, 8); sk.rotateY(-Math.PI / 2); sk.rotateX(Math.PI / 8); d.push(flytt(sk, -2.44, 3.6, 2), boks(-2.47, 3.6, 1.93, .01, .4, .12, '#f2efe6'));
    for (const [x, y] of [[1.8, 3.5], [5.2, -3.5], [8.8, 3.5]]) d.push(syl(x, y, 0, .29, .88, F.oransje, 10), syl(x, y, .5, .3, .12, '#e8e6df', 10), syl(x, y, .88, .08, .12, K.gul, 6));
    return d;
  });

  // =====================================================================================================================
  // A27 Skytebane: standplass med tak, skyteunderlag og nummertavler, skiver på stativer (25 m), kulefang i sand med
  // sandsekker, rødt flagg (banen er i bruk), avstandsmerker og skyteretning mot +x.
  LEIR2.skytebane = lod((b, e) => {
    const L = 25, d = [], n = 5;
    d.push(boks(0, 0, 0, 3.2, 11.4, .12, K.betong), boks(L / 2 + 1, 0, 0, L - 2, 10.6, .03, F.grus));
    for (const x of [-1.4, 1.4]) for (const y of [-5.4, -2.7, 0, 2.7, 5.4]) d.push(stav([x, y, .12], [x, y, x < 0 ? 2.7 : 2.4], .05, K.galv, 6));
    const tak = boks(0, 0, 0, 3.6, 11.8, .1, '#4a4f4a'); tak.rotateY(.1); d.push(flytt(tak, 0, 0, 2.5));
    d.push(boks(-1.6, 0, .12, .08, 11.2, 1.1, F.treM));
    for (let i = 0; i < n; i++) { const y = (i - (n - 1) / 2) * 2.2;
      d.push(boks(.7, y, .12, 1.9, .85, .04, F.olivenM), boks(1.55, y + .5, .12, .05, .05, .9, F.treM));
      if (!e) d.push(boks(1.55, y + .5, 1, .03, .3, .3, '#f2efe6'), boks(1.57, y + .5, 1.05, .01, .1, .2, K.mørk));
      // skive på stativ: ramme, papp og sirkler
      d.push(boks(L, y - .45, 0, .08, .08, 2, F.treM), boks(L, y + .45, 0, .08, .08, 2, F.treM), boks(L - .05, y, .85, .03, 1, 1.05, '#c9b38a'));
      d.push(skive(L - .08, y, 1.35, .3, .02, '#f2efe6', 'x', 10), skive(L - .09, y, 1.35, .2, .02, K.mørk, 'x', 10), skive(L - .1, y, 1.35, .08, .02, '#f2efe6', 'x', 8)); }
    // kulefang: sandvoll med sandsekker i foten, avstandsmerker, rødt flagg
    d.push(flytt(prisme([[0, 0], [5, 0], [3.5, 3.2], [1.5, 3.2]], 13, K.sand), L + 6.3, 0, 0, Math.PI / 2));
    if (!e) for (let i = 0; i < 12; i++) d.push(sekk(L + 1.4, -5.5 + i * 1, 0, .9, 0, SEKKFARGE[i % 5]));
    for (const x of [10, 15, 20]) d.push(boks(x, -5.6, 0, .1, .1, .7, '#f2efe6'), boks(x, -5.55, .5, .02, .3, .2, K.mørk));
    d.push(stav([-1.8, 5.9, 0], [-1.8, 5.9, 5], .04, K.galv, 6), boks(-1.3, 5.9, 4.2, .9, .02, .6, K.rød));
    return d;
  });

  // =====================================================================================================================
  // A28 Hinderløype (langs +x, ca. 32 m): krypehinder med netting, klatrevegg med tau, balansebom, hengestige (apebarre),
  // klatrenett og dekk å løpe gjennom, på grus med kantstokker.
  LEIR2.hinderløype = lod((b, e) => {
    const d = [boks(16, 0, 0, 34, 3.6, .04, F.grus)];
    if (!e) for (const sy of [-1, 1]) d.push(boks(16, sy * 1.85, 0, 34, .12, .12, F.treM));
    for (const x of [1, 3.5, 6]) for (const y of [-1.3, 1.3]) d.push(boks(x, y, 0, .1, .1, .6, F.treM));
    for (const y of [-1.3, -.65, 0, .65, 1.3]) d.push(boks(3.5, y, .58, 5.1, .02, .02, K.mørk)); if (!e) for (const x of [1, 2.25, 3.5, 4.75, 6]) d.push(boks(x, 0, .58, .02, 2.6, .02, K.mørk));
    d.push(boks(10, 0, 0, .2, 3, 2.3, F.tre), boks(10, 0, 2.3, .26, 3.1, .1, F.treM));
    if (!e) { for (let z = .3; z < 2.3; z += .4) d.push(boks(9.88, 0, z, .04, 2.9, .03, F.treM)); for (const y of [-1.2, 1.2]) d.push(bjelke([10, y, 2], [11.6, y, 0], .12, F.treM)); d.push(stav([9.85, .6, 2.3], [9.85, .6, .4], .02, '#8c7b5a', 4)); }
    d.push(stav([13.5, 0, .8], [18.5, 0, .8], .1, F.treL, 6)); for (const x of [13.8, 16, 18.2]) d.push(boks(x, 0, 0, .1, .1, .75, F.treM), boks(x, 0, 0, .1, .9, .1, F.treM));
    // hengestige
    for (const y of [-.5, .5]) { d.push(stav([20, y, 0], [20, y, 2.4], .06, K.galv, 6), stav([24, y, 0], [24, y, 2.4], .06, K.galv, 6), stav([20, y, 2.4], [24, y, 2.4], .04, K.galv, 4)); }
    if (!e) for (let x = 20.4; x < 24; x += .4) d.push(stav([x, -.5, 2.4], [x, .5, 2.4], .02, K.galv, 4));
    // klatrenett
    for (const y of [-1.4, 1.4]) d.push(stav([26.5, y, 0], [26.5, y, 3.6], .1, F.tre, 6)); d.push(stav([26.5, -1.5, 3.5], [26.5, 1.5, 3.5], .09, F.tre, 6));
    if (!e) { for (const y of [-.9, -.3, .3, .9]) d.push(bjelke([26.5, y, 3.5], [27.9, y, 0], .02, '#8c7b5a')); for (const k of [.25, .5, .75]) d.push(bjelke([26.5 + 1.4 * k, -1.2, 3.5 * (1 - k)], [26.5 + 1.4 * k, 1.2, 3.5 * (1 - k)], .02, '#8c7b5a')); }
    for (let i = 0; i < 6; i++) d.push(farg(new THREE.TorusGeometry(.36, .13, 5, 10).translate(29 + i * .55, i % 2 ? .45 : -.45, .13), K.gummi));
    return d;
  });

  // ---------- nye leirbygg (del B): registreres i Leir.BYGG med ikon, 2D-stil og gruppe i byggelista ----------
  // Pris, tid (spilltimer), strøm (kW, minus = bruker) og materialer er Claudes forslag. De fleste har ingen egen virkning i
  // spillet ennå (bare strømforbruket); der det passer, gir de senger (plasser) eller lagerplass (lager) som andre bygg.
  const NYE = {
    kommandosenter: { gruppe: 'Oversikt og samband', ikon: 'skjerm', stil: { form: 'flat', tak: '#2b2e30', h: 7.5 },
      bygg: { navn: 'Kommandosenter', pris: 14e6, tid: 6, kw: -6, fot: [-7.4, 9.4, -9.4, 9.4], mat: { betong: 50, stål: 14, tre: 6 }, tekst: 'Stor modulbygning med møterom og skjermvegger (virkningen kommer senere)' } },
    dronehangar: { gruppe: 'Droner og sensorer', ikon: 'heli', stil: { form: 'telt', tak: '#6a7062', h: 6.2 },
      bygg: { navn: 'Dronehangar', pris: 9e6, tid: 4, kw: -2, fot: [-8.5, 13.7, -6.6, 6.6], mat: { stål: 18, betong: 20 }, tekst: 'Lett hall med stor port for droner (virkningen kommer senere)' } },
    dronerampe: { gruppe: 'Droner og sensorer', ikon: 'heli', stil: { form: 'panel', tak: '#5e6366', h: 2.6 },
      bygg: { navn: 'Oppskytingsrampe', pris: 2.5e6, tid: 1, kw: -.5, fot: [-5.4, 5, -1.8, 1.4], mat: { stål: 4 }, tekst: 'Skinne som skyter ut fastvingede droner (virkningen kommer senere)' } },
    satellitt: { gruppe: 'Oversikt og samband', ikon: 'mast', stil: { form: 'panel', tak: '#d9d8d2', h: 3.2 },
      bygg: { navn: 'Satellittterminal', pris: 3.5e6, tid: 1, kw: -1, fot: [-3, 3, -3, 3], mat: { stål: 3, betong: 4 }, tekst: 'Parabol og flat terminal for samband via satellitt (virkningen kommer senere)' } },
    radartårn: { gruppe: 'Droner og sensorer', ikon: 'mast', stil: { form: 'mast', tak: '#efefea', h: 17.5 },
      bygg: { navn: 'Radartårn', pris: 6e6, tid: 2, kw: -3, fot: [-2, 3.5, -2.2, 2.8], mat: { stål: 10, betong: 4 }, tekst: 'Gittertårn med radarkuppel (virkningen kommer senere)' } },
    ammobunker: { gruppe: 'Lager og arbeid', ikon: 'skjold', stil: { form: 'voll', tak: '#5a6b3e', h: 3.6 },
      bygg: { navn: 'Ammunisjonsbunker', pris: 7e6, tid: 4, kw: 0, fot: [-5.6, 6.4, -6.1, 6.1], mat: { betong: 40, stål: 6 }, tekst: 'Betongkammer under jordvoll med tung ståldør (virkningen kommer senere)' } },
    våpenlager: { gruppe: 'Lager og arbeid', ikon: 'container', stil: { form: 'kasse', tak: '#3f4834', h: 2.6 },
      bygg: { navn: 'Våpenlager', pris: 1.5e6, tid: .5, kw: -.3, fot: [-3.1, 3.5, -1.4, 1.4], mat: { stål: 3 }, tekst: 'Container med stålgitter, lås og alarm (virkningen kommer senere)' } },
    messe: { gruppe: 'Bo og leve', ikon: 'mat', stil: { form: 'sal', tak: '#7b8083', h: 4.2 },
      bygg: { navn: 'Spisebrakke (messe)', pris: 4.5e6, tid: 2, kw: -2, fot: [-4.9, 7.3, -7.1, 7.1], mat: { tre: 25, betong: 6, stål: 2 }, tekst: 'Messe med uteservering (virkningen kommer senere)' } },
    paller: { gruppe: 'Ting i leiren', ikon: 'kasse', stil: { form: 'kasse', tak: '#8a7457', h: .4 },
      bygg: { navn: 'Paller', pris: 20000, tid: .1, kw: 0, fot: [-.65, 2, -.6, .65], mat: {}, tekst: 'Tomme paller, enkeltvis eller stablet' } },
    ammokasser: { gruppe: 'Ting i leiren', ikon: 'kasse', stil: { form: 'kasse', tak: '#4d5540', h: .8 },
      bygg: { navn: 'Ammunisjonskasser', pris: 60000, tid: .1, kw: 0, fot: [-.62, .62, -.52, .52], mat: {}, tekst: 'Kasser på pall (bare utseende)' } },
    medisinkasser: { gruppe: 'Ting i leiren', ikon: 'kors', stil: { form: 'kasse', tak: '#e8e6df', h: .8 },
      bygg: { navn: 'Medisinkasser', pris: 50000, tid: .1, kw: 0, fot: [-.62, .62, -.52, .52], mat: {}, tekst: 'Kasser med rødt kors på pall (bare utseende)' } },
    matkasser: { gruppe: 'Ting i leiren', ikon: 'mat', stil: { form: 'kasse', tak: '#a9875a', h: 1 },
      bygg: { navn: 'Matkasser', pris: 40000, tid: .1, kw: 0, fot: [-.62, .62, -.52, .52], mat: {}, tekst: 'Feltrasjoner og vann på pall (bare utseende)' } },
    oljefat: { gruppe: 'Ting i leiren', ikon: 'olje', stil: { form: 'kasse', tak: '#3d5868', h: 1 },
      bygg: { navn: 'Oljefat', pris: 30000, tid: .1, kw: 0, fot: [-.7, .7, -1, 1], mat: {}, tekst: 'Fat som står, ligger eller er stablet (bare utseende)' } },
    vegsperring: { gruppe: 'Forsvar', ikon: 'port', stil: { form: 'voll', tak: '#8f8d87', h: .9 },
      bygg: { navn: 'Vegsperring', pris: 600000, tid: .5, kw: 0, fot: [-2.6, 9.2, -4, 4], mat: { betong: 6, stål: 1 }, tekst: 'Betongsperrer i sikksakk og bom (virkningen kommer senere)' } },
    skytebane: { gruppe: 'Trening', ikon: 'sikte', stil: { form: 'pad', tak: '#7f786b', h: .1 },
      bygg: { navn: 'Skytebane', pris: 2e6, tid: 2, kw: 0, fot: [-2, 33.8, -6.6, 6.6], mat: { tre: 10, betong: 6 }, tekst: 'Standplass med tak, skiver på 25 m og kulefang (virkningen kommer senere)' } },
    hinderløype: { gruppe: 'Trening', ikon: 'gjerde', stil: { form: 'pad', tak: '#7f786b', h: .1 },
      bygg: { navn: 'Hinderløype', pris: 1.2e6, tid: 1.5, kw: 0, fot: [-.5, 33, -2, 2], mat: { tre: 12, stål: 2 }, tekst: 'Krypehinder, vegg, bom, hengestige, nett og dekk (virkningen kommer senere)' } },
  };
  M.LEIR2_NYE = NYE;
  function registrer() {
    const LB = window.Leir; if (!LB || !LB.BYGG) return;
    const grupper = new Map();
    for (const [id, o] of Object.entries(NYE)) {
      if (!LEIR2[id]) continue;
      if (!LB.BYGG[id]) LB.BYGG[id] = Object.assign({ modell: id }, o.bygg);
      if (window.Ikoner && Ikoner.BYGG && !Ikoner.BYGG[id]) Ikoner.BYGG[id] = o.ikon;
      if (window.Leir2d && Leir2d.STIL && !Leir2d.STIL[id] && o.stil) Leir2d.STIL[id] = o.stil;
      if (!grupper.has(o.gruppe)) grupper.set(o.gruppe, []); grupper.get(o.gruppe).push(id);
    }
    window.LEIR2_GRUPPER = [...grupper];
  }

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
  for (const n of [1, 2, 3]) ny('A' + (11 + n), 'l2-radiomast-' + n, `Radiomast nivå ${n} (ny)`, () => LEIR2.radiomast({ nivå: n }));
  ny('A15', 'l2-sykestue', 'Sykestue (ny)', () => LEIR2.sykestue({}));
  ny('A16', 'l2-verksted', 'Verksted (ny)', () => LEIR2.verksted({}));
  ny('B29', 'l2-kommandosenter', 'Kommandosenter', () => LEIR2.kommandosenter({}));
  ny('B30', 'l2-dronehangar', 'Dronehangar', () => LEIR2.dronehangar({}));
  ny('B31', 'l2-dronerampe', 'Oppskytingsrampe for droner', () => LEIR2.dronerampe({}));
  ny('B32', 'l2-satellitt', 'Satellittterminal og parabol', () => LEIR2.satellitt({}));
  ny('B33', 'l2-radartårn', 'Radartårn', () => LEIR2.radartårn({}));
  ny('B34', 'l2-ammobunker', 'Ammunisjonsbunker', () => LEIR2.ammobunker({}));
  ny('B35', 'l2-våpenlager', 'Våpenlager', () => LEIR2.våpenlager({}));
  ny('B36', 'l2-messe', 'Spisebrakke (messe)', () => LEIR2.messe({}));
  ny('A17', 'l2-lagertelt', 'Lagertelt (ny)', () => LEIR2.lagertelt({}));
  for (const i of [0, 1, 2, 3]) ny('A18', 'l2-container-' + i, 'Container (ny)', () => LEIR2.container({ id: [3, 2, 1, 0][i] }));
  for (const i of [0, 1, 2]) { const b = { id: [0, 2, 1][i] }; ny('C75', 'l2-paller-' + i, 'Paller', () => LEIR2.paller(b)); ny('C79', 'l2-oljefat-' + i, 'Oljefat', () => LEIR2.oljefat(b)); }
  ny('C76', 'l2-ammokasser', 'Ammunisjonskasser', () => LEIR2.ammokasser({ id: 1 }));
  ny('C77', 'l2-medisinkasser', 'Medisinkasser', () => LEIR2.medisinkasser({ id: 0 }));
  ny('C78', 'l2-matkasser', 'Matkasser', () => LEIR2.matkasser({ id: 1 }));
  ny('A19', 'l2-drivhus', 'Drivhus (ny)', () => LEIR2.drivhus({}));
  ny('A20', 'l2-helikopterplass', 'Helikopterplass (ny)', () => LEIR2.helikopterplass({}));
  ny('A21', 'l2-sandsekkvoll', 'Sandsekkvoll (ny)', () => LEIR2.sandsekkvoll({}));
  ny('A22', 'l2-gjerde', 'Gjerde (ny, 10 m)', () => M.gjerde(10));
  ny('A23', 'l2-kjøkken', 'Kjøkken (ny)', () => LEIR2.kjøkken({}));
  ny('A24', 'l2-brønn', 'Brønn (ny)', () => LEIR2.brønn({}));
  ny('A25', 'l2-flaggsokkel', 'Flaggstang: sokkel (ny)', () => LEIR2.flaggsokkel({}));
  ny('A26', 'l2-vegsperring', 'Vegsperring (ny)', () => LEIR2.vegsperring({}));
  ny('A27', 'l2-skytebane', 'Skytebane (ny)', () => LEIR2.skytebane({}));
  ny('A28', 'l2-hinderløype', 'Hinderløype (ny)', () => LEIR2.hinderløype({}));
  registrer();

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
  // ---------- A25: sokkelen rundt flaggstanga ved leiren (stanga og duken lager oppstart-visning.js) ----------
  if (typeof KROKER !== 'undefined' && KROKER.sett3d) {
    let sokkel = null;
    KROKER.sett3d.push((u, R) => {
      if (sokkel) { if (sokkel.parent) sokkel.parent.remove(sokkel); sokkel.geometry.dispose(); sokkel = null; }
      const S = window.OppstartSpill && OppstartSpill.tilstand(); if (!S || !S.leir || typeof hoyde3d !== 'function') return;
      const x = S.leir.x - u.cx, y = S.leir.y - u.cy; if (Math.abs(x) > u.S || Math.abs(y) > u.S) return;
      sokkel = new THREE.Mesh(LEIR2.flaggsokkel({}), M.materiale()); sokkel.position.set(x, y, (hoyde3d(S.leir.x, S.leir.y, u) - u.h0) * R.EX - .02); sokkel.userData.flaggsokkel = true; R.scene.add(sokkel);
    });
  }
})();
