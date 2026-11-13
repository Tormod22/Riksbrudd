/* Vegetasjon: regler uten DOM (Node: require('./vegetasjon'); nettleser: globalThis.Vegetasjon).
 * Kartflisene sier bare «skog» (terrengklasse 1, 32 m), ikke hva slags skog (AR5/SR16 finnes ikke i dataene). Treslaget velges derfor
 * etter reglene fra naturen: høyden over havet mot tregrensen, helningen, fuktigheten (nær vann eller myr) og lyngmark (hei),
 * med fast tilfeldighet per tre (frø). Gran i dalbunnen og lisidene, furu på tørre, bratte steder og på lyngmark, bjørk overalt,
 * fjellbjørk og einer opp mot tregrensen, selje og vier langs vann og myr, litt osp og rogn innimellom.
 * Blomster: hvilke som står på eng, hei, i skogen og langs vegen, og bare i sommerhalvåret. Tallene er forslag, ikke fasit.
 */
(function (rot) {
  'use strict';
  // navn, høyde (faktor på trehøyden 8–20 m fra trær3d), løv (feller bladene), høst (bladfarge om høsten, r g b 0–1)
  const TRESLAG = {
    gran: { navn: 'Gran', høyde: 1, løv: false, høst: null },
    furu: { navn: 'Furu', høyde: 1.05, løv: false, høst: null },
    løv: { navn: 'Bjørk', høyde: .85, løv: true, høst: [.95, .72, .18] },
    osp: { navn: 'Osp', høyde: .95, løv: true, høst: [.98, .8, .16] },
    rogn: { navn: 'Rogn', høyde: .42, løv: true, høst: [.86, .26, .08] },
    fjellbjørk: { navn: 'Fjellbjørk', høyde: .38, løv: true, høst: [.96, .66, .14] },
    selje: { navn: 'Selje og vier', høyde: .4, løv: true, høst: [.78, .72, .26] },
    einer: { navn: 'Einer', høyde: .17, løv: false, høst: null },
  };
  const REKKE = Object.keys(TRESLAG);
  const klemme = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

  // Tregrensen i moh.: ca. 1100 m på Dovre (62° N), lavere nordover (ca. 0,85 m per km), høyere i sør. y = nord i EPSG:25833.
  function tregrense(y) { return klemme(1100 - (y - 6.89e6) * 0.00085, 250, 1250); }

  // Vektene for hvert treslag på et punkt i skogen.
  // p: { moh, tg (tregrense), helning (grader), vann (meter til nærmeste vann), myr (0–1 andel myr rundt), hei (0–1 andel hei/lyng rundt) }
  function vekter(p) {
    const rel = p.moh / (p.tg || 1100), høy = klemme((rel - .62) / .3), bratt = klemme((p.helning - 8) / 18);
    const fukt = Math.max(klemme(1 - (p.vann == null ? 1e9 : p.vann) / 45), klemme(p.myr || 0)), tørr = Math.max(bratt, klemme((p.hei || 0) * 1.4)) * (1 - fukt);
    const over = klemme((rel - .9) / .1);   // helt oppe ved tregrensen: bare fjellbjørk og einer
    return {
      gran: 3 * Math.pow(1 - høy, 1.5) * (1 - .75 * tørr) * (1 - .5 * fukt) * (1 - over),
      furu: (.35 + 1.9 * tørr) * (1 - .85 * fukt) * (1 - .8 * høy) * (1 - over),
      løv: 1.3 * (1 - .4 * høy) * (1 - over),
      osp: .3 * (1 - høy) * (1 - fukt) * (1 - over),
      rogn: .26 * (1 - .5 * høy) * (1 - over),
      fjellbjørk: 3.6 * høy * høy + 4 * over,
      selje: 2.4 * fukt * (1 - .5 * høy),
      einer: .12 + .5 * tørr * høy + .6 * over,
    };
  }
  // Treslaget på et punkt i skogen (frø 0–1 fast per tre).
  function treslag(p, frø) {
    const w = vekter(p); let sum = 0; for (const k of REKKE) sum += w[k];
    let r = klemme(frø, 0, .999999) * sum; for (const k of REKKE) { r -= w[k]; if (r < 0) return k; }
    return 'løv';
  }
  // Busker og små trær på åpen mark (utenfor skogrutene), per 32 m-rute: [[treslag, antall], …].
  // klasse: terrengklassen (0 snaufjell, 2 hei, 5 dyrket, 6 myr, 7 tettbebyggelse), rel = moh / tregrense, vann = meter til vann.
  function åpenMark(klasse, rel, vann) {
    const ut = [];
    if (rel > 1.12) return ut;   // over tregrensen: bare lyng, stein og vierkratt (smått3d)
    if (klasse === 2) { ut.push(['einer', 1.1]); if (rel > .75) ut.push(['fjellbjørk', .5]); else ut.push(['furu', .08], ['løv', .12]); }
    if (klasse === 6) ut.push(['selje', .5], [rel > .8 ? 'fjellbjørk' : 'løv', .12]);
    if (klasse === 5) ut.push(['rogn', .03], ['løv', .04], ['einer', .05]);   // et og annet tre i åkerkanten og på beitet
    if (klasse === 0 && rel < 1.02) ut.push(['fjellbjørk', .15], ['einer', .2]);
    if (vann != null && vann < 14 && klasse !== 3 && klasse !== 7) ut.push(['selje', .7]);
    return ut;
  }

  // Blomster: farge per art, og hvor og når de står. sted: 'eng' (åpen grønn mark), 'hei', 'skog', 'veikant'.
  const BLOMSTER = {
    smørblomst: { farge: [1, .84, .08], steder: { eng: 3, veikant: 2 }, tid: { sommer: 1, vår: .5 } },
    løvetann: { farge: [1, .74, .05], steder: { eng: 2, veikant: 3 }, tid: { vår: 1.4, sommer: .4 } },
    hvitkløver: { farge: [.96, .96, .92], steder: { eng: 2.5, veikant: 1 }, tid: { sommer: 1 } },
    prestekrage: { farge: [.98, .98, .95], steder: { eng: 1.5, veikant: 1.5 }, tid: { sommer: 1 } },
    blåklokke: { farge: [.4, .45, .92], steder: { eng: 1, hei: 1.2, veikant: .8 }, tid: { sommer: 1, høst: .3 } },
    røsslyng: { farge: [.74, .38, .7], steder: { hei: 4, skog: .4 }, tid: { sommer: .8, høst: 1 } },
    geitrams: { farge: [.92, .34, .66], steder: { veikant: 2.5, skog: .08 }, tid: { sommer: 1 } },
    skogstjerne: { farge: [.97, .97, .97], steder: { skog: 1 }, tid: { sommer: 1, vår: .5 } },
  };
  const BLOMSTREKKE = Object.keys(BLOMSTER);
  // Hvor mange blomster (0–1) i årstiden: ingen om vinteren, flest om sommeren.
  const BLOMSTRING = { vinter: 0, vår: .45, sommer: 1, høst: .3 };
  function blomstring(årstid) { return BLOMSTRING[årstid] == null ? 1 : BLOMSTRING[årstid]; }
  // Blomsten på et sted (frø 0–1), eller null. Tettheten på stedet styres av den som kaller (blomstring × sted).
  function blomst(sted, årstid, frø) {
    let sum = 0; const w = BLOMSTREKKE.map(k => { const b = BLOMSTER[k], v = (b.steder[sted] || 0) * (b.tid[årstid] || 0); sum += v; return v; });
    if (!sum) return null; let r = klemme(frø, 0, .999999) * sum;
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return BLOMSTREKKE[i]; }
    return null;
  }
  // Hvor tett det er med blomster på stedet (andel av forsøkene som blir en blomst)
  const STEDTETTHET = { eng: .55, veikant: .7, hei: .4, skog: .1 };

  // Hvor godt gress og blomster trives etter høyden (rel = moh / tregrensen): fullt opp til tregrensen, glisnere og lavere oppover i
  // lavfjellet, og ingenting fra ca. 1,35 × tregrensen (ca. 1480 moh. på Dovre) – der er det stein, lav og snøleier
  // (12. nov: frodig eng med geitrams lå i ura 1670 moh. ved Snøhetta).
  function vekst(rel) { const t = klemme((rel - 1) / .35); return 1 - t * t * (3 - 2 * t); }
  // Stedet blomstene velges etter: over tregrensen er det fjellhei (blåklokke, røsslyng) uansett hva kartet under viser
  function stedIHøyden(sted, rel) { return rel > 1.05 ? 'hei' : sted; }
  // Nøyaktig avstand til vegene: veger = [{ k (E/R/F/K/P/S), P: [[x, y, …], …], by (i tettsted: fortau) }] slik liv3d.js lager u.veger.
  // Gir en funksjon (x, y, ekstra = 0) => true når punktet ligger i kjørebanen, på skulderen eller på fortauet (+ ekstra meter).
  // Vegmasken u.påVeg er et rutenett over hele utsnittet (3,3 m per rute i et utsnitt på 3,4 km) – for grovt for blomster og gress,
  // som sto på fortauet (12. nov). Vegbitene ligger i et rutenett på 8 m, så et oppslag bare ser på bitene like ved.
  const VEGBREDDE = { E: 8, R: 7.5, F: 6.5, K: 5.5, P: 4, S: 3.5 };
  function vegRute(veger) {
    const C = 8, rute = new Map();
    for (const v of veger || []) { const r = (VEGBREDDE[v.k] || 4) / 2 + (v.by ? 2.5 : .8);
      for (let i = 1; i < v.P.length; i++) { const a = v.P[i - 1], b = v.P[i];
        for (let cx = Math.floor((Math.min(a[0], b[0]) - r - 3) / C); cx <= Math.floor((Math.max(a[0], b[0]) + r + 3) / C); cx++)
          for (let cy = Math.floor((Math.min(a[1], b[1]) - r - 3) / C); cy <= Math.floor((Math.max(a[1], b[1]) + r + 3) / C); cy++) {
            const k = cx * 100003 + cy; let l = rute.get(k); if (!l) rute.set(k, (l = [])); l.push(a[0], a[1], b[0], b[1], r); } } }
    return (x, y, ekstra = 0) => { const l = rute.get(Math.floor(x / C) * 100003 + Math.floor(y / C)); if (!l) return false;
      for (let q = 0; q < l.length; q += 5) { const ax = l[q], ay = l[q + 1], vx = l[q + 2] - ax, vy = l[q + 3] - ay, t = klemme(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1));
        if (Math.hypot(ax + vx * t - x, ay + vy * t - y) < l[q + 4] + Math.min(ekstra, 3)) return true; }
      return false; };
  }

  const api = { TRESLAG, REKKE, tregrense, vekter, treslag, åpenMark, BLOMSTER, BLOMSTREKKE, blomstring, blomst, STEDTETTHET, vekst, stedIHøyden, vegRute, VEGBREDDE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Vegetasjon = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
