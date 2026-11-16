'use strict';
// Interiør i 3D (brukeren 15. nov: «Alle bygg skal ha interiør, og en skal kunne gå inn i dem» og «det må se mye bedre ut»).
// Reglene står i spill/interior.js. Mens du går (Gå), får byggene innen 30 m et interiør. Det lages ett bygg om gangen (høyst
// hvert kvarte sekund) og tas bort igjen når du er over 50 m unna, så det koster lite – også på telefon.
// hus3d i index.html legger døra og klassen på omrisset, og her får omrisset planen sin («inne»), som hindring3d bruker for
// vegger, døråpning og møbler. Gulvet og trappa foran døra hentes av gange.js herfra.
// UTSEENDET: gulv per rom (parkett, fliser, betong, teppe), malte vegger eller panel i rommets farge med mørkere hjørner og
// gulvlist, dørkarmer med overstykke og åpent dørblad, vinduer du ser ut av, med karm, vinduspost og gardiner, taklamper med lys på
// gulvet, dagslys innenfor vinduene, myke skygger under møblene og langs veggene, tepper og bilder på veggene.
// Alle mønstrene tegnes i koden (ingen bildefiler). Ett nett per bygg med åtte stoffer, pluss fire små nett for lys og skygge.
// Bare første etasje. Vinduene er ekte hull: du ser landskapet utenfor (ytterveggene tegnes bare utenfra mens du er inne).
(function () {
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  const NÆR = 30, BORT = 50, MAKS = 10;
  const aktive = new Map();
  let forU = null, sist = 0, M = null;
  // stoffene i hovednettet og hvor mange meter mønsteret dekker
  const STOFFER = ['glatt', 'parkett', 'flis', 'betong', 'malt', 'panel', 'tre', 'tøy'], NR = Object.fromEntries(STOFFER.map((n, i) => [n, i]));
  const TRE = [.56, .4, .25], LYST_TRE = [.8, .66, .46], HVIT = [.93, .93, .91], GRÅ = [.55, .56, .57], MØRK = [.16, .16, .18], STÅL = [.66, .68, .7], MESSING = [.8, .68, .3];
  const TØY = [[.36, .42, .54], [.56, .32, .3], [.42, .48, .36], [.62, .56, .46], [.3, .33, .38], [.68, .5, .32], [.5, .4, .52], [.75, .7, .62]];
  const PARKETT = [[.82, .64, .44], [.64, .46, .3], [.88, .76, .58], [.52, .37, .25]];
  const MALING = [[.94, .91, .85], [.86, .9, .86], [.92, .87, .8], [.85, .88, .92], [.93, .89, .8], [.9, .85, .83], [.88, .9, .84]];
  const UTEN_VINDU = { låve: 1, uthus: 1, lager: 1, hangar: 1 };
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

  // ---------- mønstrene ----------
  function lerret(n, tegn) { const c = document.createElement('canvas'); c.width = c.height = n; let s = 12345; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; tegn(c.getContext('2d'), n, rnd); return c; }
  const grå = v => { const q = Math.round(Math.max(0, Math.min(255, v))); return `rgb(${q},${q},${q})`; };
  const MØNSTER = {
    parkett: (g, n, r) => { const rad = n / 8; for (let j = 0; j < 8; j++) { let x = -r() * n * .5; while (x < n) { const w = n * (.35 + r() * .3), v = 225 + (r() - .5) * 34;
      g.fillStyle = `rgb(${v | 0},${v * .97 | 0},${v * .93 | 0})`; g.fillRect(x, j * rad, w, rad); g.fillStyle = 'rgba(60,40,20,.5)'; g.fillRect(x + w - 1, j * rad, 1.4, rad); x += w; }
      g.fillStyle = 'rgba(60,40,20,.42)'; g.fillRect(0, j * rad, n, 1.2); }
      g.globalAlpha = .06; g.fillStyle = '#3a2512'; for (let k = 0; k < 220; k++) g.fillRect(r() * n, r() * n, 20 + r() * 60, 1); g.globalAlpha = 1; },
    flis: (g, n, r) => { g.fillStyle = grå(168); g.fillRect(0, 0, n, n); const t = n / 4; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = grå(236 + (r() - .5) * 14); g.fillRect(i * t + 1.5, j * t + 1.5, t - 3, t - 3); }
      g.globalAlpha = .05; g.fillStyle = '#000'; for (let k = 0; k < 300; k++) g.fillRect(r() * n, r() * n, 2, 2); g.globalAlpha = 1; },
    betong: (g, n, r) => { g.fillStyle = grå(226); g.fillRect(0, 0, n, n); for (let k = 0; k < 3000; k++) { g.fillStyle = `rgba(${r() > .5 ? 255 : 0},${r() > .5 ? 255 : 0},${r() > .5 ? 255 : 0},.05)`; g.fillRect(r() * n, r() * n, 1 + r() * 2, 1 + r() * 2); }
      g.globalAlpha = .05; g.fillStyle = '#000'; for (let k = 0; k < 9; k++) { g.beginPath(); g.ellipse(r() * n, r() * n, 20 + r() * 40, 10 + r() * 30, r() * 3, 0, 6.3); g.fill(); } g.globalAlpha = 1; },
    malt: (g, n, r) => { g.fillStyle = grå(246); g.fillRect(0, 0, n, n); for (let k = 0; k < 2500; k++) { g.fillStyle = r() > .5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.014)'; g.fillRect(r() * n, r() * n, 1 + r() * 2, 1 + r() * 2); } },
    panel: (g, n, r) => { const rad = n / 8; for (let j = 0; j < 8; j++) { const v = 228 + (r() - .5) * 26; g.fillStyle = `rgb(${v | 0},${v * .97 | 0},${v * .92 | 0})`; g.fillRect(0, j * rad, n, rad);
      g.fillStyle = 'rgba(50,30,12,.55)'; g.fillRect(0, j * rad, n, 2); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, j * rad + 2, n, 1.5);
      if (r() > .5) { g.fillStyle = 'rgba(70,40,15,.35)'; g.beginPath(); g.ellipse(r() * n, j * rad + rad * .55, 5, 3, 0, 0, 6.3); g.fill(); } }
      g.globalAlpha = .07; g.fillStyle = '#3a2512'; for (let k = 0; k < 200; k++) g.fillRect(r() * n, r() * n, 30 + r() * 70, 1); g.globalAlpha = 1; },
    tre: (g, n, r) => { g.fillStyle = grå(236); g.fillRect(0, 0, n, n); g.fillStyle = '#3a2512'; for (let k = 0; k < 420; k++) { g.globalAlpha = .012 + r() * .03; g.fillRect(r() * n, r() * n, 40 + r() * 120, 1 + r()); } g.globalAlpha = 1; },
    tøy: (g, n) => { g.fillStyle = grå(232); g.fillRect(0, 0, n, n); for (let j = 0; j < n; j += 4) for (let i = 0; i < n; i += 4) { g.fillStyle = (i + j) % 8 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.1)'; g.fillRect(i, j, 2, 4); g.fillRect(i + 2, j + 2, 2, 2); } },
    // utsikten i vinduene: himmel, åser og mark
    utsikt: (g, n) => { let q = g.createLinearGradient(0, 0, 0, n * .62); q.addColorStop(0, '#a9cbea'); q.addColorStop(1, '#e9f1f6'); g.fillStyle = q; g.fillRect(0, 0, n, n);
      g.fillStyle = '#8fa89a'; g.beginPath(); g.moveTo(0, n); for (let x = 0; x <= n; x += 4) g.lineTo(x, n * (.58 - .06 * Math.sin(x * .05) - .04 * Math.sin(x * .13 + 1))); g.lineTo(n, n); g.fill();
      g.fillStyle = '#6f8f6c'; g.beginPath(); g.moveTo(0, n); for (let x = 0; x <= n; x += 4) g.lineTo(x, n * (.68 - .03 * Math.sin(x * .08 + 2))); g.lineTo(n, n); g.fill();
      q = g.createLinearGradient(0, n * .72, 0, n); q.addColorStop(0, '#7f9f62'); q.addColorStop(1, '#5f8249'); g.fillStyle = q; g.fillRect(0, n * .74, n, n); },
    glød: (g, n) => { const q = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); q.addColorStop(0, '#fff'); q.addColorStop(.35, '#999'); q.addColorStop(1, '#000'); g.fillStyle = q; g.fillRect(0, 0, n, n); },
    // skygge: venstre halvdel er en kant som tones ut mot høyre, høyre halvdel en myk firkant
    skygge: (g, n) => { g.clearRect(0, 0, n, n); let q = g.createLinearGradient(0, 0, n / 2, 0); q.addColorStop(0, 'rgba(0,0,0,.5)'); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(0, 0, n / 2, n);
      g.save(); g.beginPath(); g.rect(n / 2, 0, n / 2, n); g.clip(); g.shadowColor = 'rgba(0,0,0,.75)'; g.shadowBlur = n * .13; g.shadowOffsetX = n; g.fillStyle = '#000'; g.fillRect(n * .5 + n * .13 - n, n * .26, n * .24, n * .48); g.restore(); },
  };
  const METER = { glatt: 1, parkett: 1, flis: 1.2, betong: 2.4, malt: 2, panel: 1.12, tre: 1, tøy: .4 };
  function stoffene() {
    if (M) return M;
    const tex = (navn, n, gjenta) => { const t = new THREE.CanvasTexture(lerret(n, MØNSTER[navn])); if (gjenta) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
    M = { hoved: STOFFER.map(n => new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x201e1b, map: n === 'glatt' ? null : tex(n, 256, true) })),
      vindu: new THREE.MeshBasicMaterial({ color: 0xdfeaf2, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide, fog: false }),
      skygge: new THREE.MeshBasicMaterial({ map: tex('skygge', 64), transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      lampe: new THREE.MeshBasicMaterial({ map: tex('glød', 64), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, color: 0x6a5a3a }),
      åpning: new THREE.MeshBasicMaterial({ color: 0x15120e, side: THREE.DoubleSide }),
      dag: new THREE.MeshBasicMaterial({ map: M_GLØD(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, color: 0x404040 }) };
    return M;
  }
  let glødTex = null; function M_GLØD() { if (!glødTex) glødTex = new THREE.CanvasTexture(lerret(64, MØNSTER.glød)); return glødTex; }

  // ---------- møblene: kasser [x0, x1, y0, y1, z0, z1, farge, stoff, rund] i meter i møbelets akser (y fra ryggen −d/2 til fronten +d/2) ----------
  function deler(m) {
    const b = m.b / 2, d = m.d / 2, h = m.h, f = TØY[Math.floor(m.f * TØY.length) % TØY.length], f2 = TØY[Math.floor(m.f * 31) % TØY.length], K = [];
    const k = (x0, x1, y0, y1, z0, z1, c, s = 'glatt', rund = false) => K.push([x0, x1, y0, y1, z0, z1, c, s, rund]);
    const t = (x0, x1, y0, y1, z0, z1, c = TRE) => k(x0, x1, y0, y1, z0, z1, c, 'tre'), s = (x0, x1, y0, y1, z0, z1, c = f) => k(x0, x1, y0, y1, z0, z1, c, 'tøy');
    const bein = (z, c = MØRK, q = .05, st = 'glatt') => { for (const sx of [-1, 1]) for (const sy of [-1, 1]) k(sx * (b - q) - q / 2, sx * (b - q) + q / 2, sy * (d - q) - q / 2, sy * (d - q) + q / 2, 0, z, c, st); };
    const lys = v => f.map(x => Math.min(1, x * v));
    switch (m.type) {
      case 'sofa': case 'lenestol': { const arm = m.type === 'sofa' ? .2 : .15, n = m.type === 'sofa' ? Math.max(2, Math.round(m.b / .75)) : 1, w = (m.b - 2 * arm) / n;
        s(-b, b, -d, d, .1, .3); s(-b, b, -d, -d + .2, .3, h); s(-b, -b + arm, -d, d, .3, .6); s(b - arm, b, -d, d, .3, .6); bein(.1, MØRK, .06);
        for (let i = 0; i < n; i++) { const x = -b + arm + i * w; s(x + .02, x + w - .02, -d + .2, d - .02, .3, .46, lys(1.1)); s(x + .03, x + w - .03, -d + .2, -d + .36, .46, h - .04, lys(1.07)); }
        s(-b + arm + .05, -b + arm + .45, -d + .34, -d + .5, .47, .8, f2); if (m.type === 'sofa') s(b - arm - .45, b - arm - .05, -d + .34, -d + .5, .47, .8, TØY[Math.floor(m.f * 53) % TØY.length]); break; }
      case 'salongbord': t(-b, b, -d, d, h - .05, h, LYST_TRE); bein(h - .05, MØRK, .05); t(-b + .08, b - .08, -d + .08, d - .08, .12, .15, LYST_TRE);
        k(-.14, .14, -.1, .1, h, h + .03, f2); k(.2, .32, -.06, .06, h, h + .11, HVIT, 'glatt', true); break;
      case 'tvbenk': t(-b, b, -d, d, .08, h, LYST_TRE); bein(.08, MØRK, .05); k(-b * .78, b * .78, -.05, .0, h + .06, h + .78, [.05, .05, .07]); k(-b * .78 + .03, b * .78 - .03, .0, .012, h + .09, h + .75, [.1, .13, .18]);
        k(-.16, .16, -.1, .1, h, h + .06, MØRK); k(-b + .05, -b + .25, -d + .06, d - .06, h, h + .22, MØRK); break;
      case 'bokhylle': case 'hylle': { const c = m.type === 'hylle' ? LYST_TRE : TRE; t(-b, b, -d, -d + .03, 0, h, c); t(-b, -b + .03, -d, d, 0, h, c); t(b - .03, b, -d, d, 0, h, c); t(-b, b, -d, d, h - .03, h, c);
        for (let z = .05, n = 0; z < h - .1; z += .38, n++) { t(-b, b, -d, d, z, z + .03, c);
          for (let x = -b + .05, j = 0; x < b - .1; j++) { const w = .03 + hash(n * 31 + j, m.f * 1e6) * .05, hb = .2 + hash(j * 7 + n, m.f * 1e6 + 3) * .1; if (hash(j + n * 13, m.f * 1e6 + 9) > .18) k(x, x + w, -d + .06, d - .05, z + .03, z + .03 + hb, TØY[(j * 5 + n * 3) % TØY.length]); x += w + .004; } } break; }
      case 'spisebord': t(-b, b, -d, d, h - .05, h, LYST_TRE); bein(h - .05, LYST_TRE, .07, 'tre'); t(-b + .1, b - .1, -d + .1, d - .1, h - .13, h - .05, LYST_TRE);
        k(-.13, .13, -.13, .13, h, h + .14, [.7, .78, .8], 'glatt', true); k(-.1, .1, -.1, .1, h + .14, h + .36, [.3, .52, .28], 'glatt', true); break;
      case 'pult': t(-b, b, -d, d, h - .04, h, LYST_TRE); k(-b + .03, -b + .08, -d + .05, d - .05, 0, h - .04, STÅL); t(b - .5, b - .04, -d + .04, d - .04, .08, h - .04, LYST_TRE);
        for (const z of [.3, .52]) k(b - .34, b - .2, d - .04, d - .02, z, z + .02, STÅL);
        k(-.3, .22, -.14, -.1, h + .12, h + .46, [.06, .06, .08]); k(-.28, .2, -.1, -.092, h + .14, h + .44, [.16, .22, .3]); k(-.08, 0, -.16, -.08, h, h + .12, MØRK); k(-.22, .12, .05, .2, h, h + .015, MØRK); break;
      case 'kateter': t(-b, b, -d, d, h - .04, h, LYST_TRE); t(-b, -b + .04, -d, d, 0, h - .04, LYST_TRE); t(b - .04, b, -d, d, 0, h - .04, LYST_TRE); t(-b, b, -d, -d + .03, .15, h - .04, LYST_TRE); k(-.2, .2, -.1, .15, h, h + .05, f2); break;
      case 'arbeidsbenk': t(-b, b, -d, d, h - .06, h, [.5, .4, .28]); bein(h - .06, STÅL, .06); t(-b, b, -d, d, .16, .2, [.5, .4, .28]); k(-b + .1, -b + .5, -.15, .15, h, h + .24, [.72, .2, .15]);
        k(b - .5, b - .15, -.1, .1, h, h + .1, STÅL); k(-b, b, -d, -d + .03, h, h + .6, [.42, .34, .25], 'tre'); for (let i = 0; i < 4; i++) k(-b + .2 + i * .3, -b + .24 + i * .3, -d + .03, -d + .05, h + .15, h + .5, STÅL); break;
      case 'stol': t(-b, b, -d, d, .42, .46, LYST_TRE); bein(.42, LYST_TRE, .04, 'tre'); t(-b, -b + .04, -d, -d + .04, .46, h, LYST_TRE); t(b - .04, b, -d, -d + .04, .46, h, LYST_TRE); t(-b, b, -d, -d + .03, h - .18, h, LYST_TRE); t(-b, b, -d, -d + .03, .58, .64, LYST_TRE); break;
      case 'kontorstol': s(-b, b, -d + .04, d, .44, .52, [.2, .22, .26]); s(-b + .03, b - .03, -d, -d + .07, .56, h, [.2, .22, .26]); k(-.03, .03, -.03, .03, .1, .44, STÅL, 'glatt', true);
        k(-b, b, -.03, .03, .05, .1, MØRK); k(-.03, .03, -d, d, .05, .1, MØRK); break;
      case 'plante': k(-.17, .17, -.17, .17, 0, .3, [.72, .44, .32], 'glatt', true); k(-.15, .15, -.15, .15, .3, .32, [.25, .18, .12], 'glatt', true);
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + m.f * 6, r = .1 + (i % 3) * .05, x = Math.cos(a) * r, y = Math.sin(a) * r, z = .34 + (i % 4) * .17; k(x - .13, x + .13, y - .13, y + .13, z, z + .26, [.18 + (i % 3) * .04, .44 + (i % 2) * .08, .2], 'glatt', true); }
        k(-.02, .02, -.02, .02, .3, h - .2, [.3, .24, .14]); break;
      case 'kjøkkenbenk': { const n = Math.max(2, Math.round(m.b / .6)), w = m.b / n; k(-b, b, -d + .02, d - .02, .1, h - .04, HVIT); k(-b, b, -d + .06, d - .08, 0, .1, MØRK); t(-b, b, -d, d + .02, h - .04, h, [.36, .3, .25]);
        for (let i = 0; i < n; i++) { const x = -b + i * w; k(x + .015, x + w - .015, d - .02, d - .005, .13, h - .07, [.97, .97, .95]); k(x + w / 2 - .07, x + w / 2 + .07, d - .005, d + .012, h - .14, h - .12, STÅL); }
        // vask og kran, fliser bak benken, overskap
        k(-.28, .22, -.18, .2, h - .005, h + .004, STÅL); k(-.24, .18, -.14, .16, h - .1, h - .004, [.5, .52, .55]); k(-.04, 0, -d + .06, -d + .1, h, h + .26, STÅL); k(-.04, 0, -d + .06, -d + .22, h + .23, h + .26, STÅL);
        k(-b, b, -d, -d + .012, h, 1.42, [.88, .92, .93], 'flis');
        for (let i = 0; i < n; i++) { const x = -b + i * w; k(x + .01, x + w - .01, -d, -d + .34, 1.42, 2.12, [.97, .97, .95]); k(x + w - .08, x + w - .06, -d + .34, -d + .352, 1.47, 1.6, STÅL); } break; }
      case 'kjøleskap': k(-b, b, -d, d - .03, 0, h, [.9, .91, .92]); k(-b + .01, b - .01, d - .03, d, .02, h * .62, [.95, .95, .96]); k(-b + .01, b - .01, d - .03, d, h * .63, h - .01, [.95, .95, .96]);
        k(b - .08, b - .05, d, d + .025, h * .3, h * .56, STÅL); k(b - .08, b - .05, d, d + .025, h * .68, h * .88, STÅL); break;
      case 'komfyr': k(-b, b, -d, d - .02, 0, h, HVIT); k(-b + .04, b - .04, d - .02, d, .15, .62, [.12, .12, .14]); k(-b + .06, b - .06, d, d + .02, .66, .69, STÅL); k(-b, b, -d, d, h, h + .01, [.1, .1, .11]);
        for (const [x, y] of [[-.14, -.13], [.14, -.13], [-.14, .13], [.14, .13]]) k(x - .09, x + .09, y - .09, y + .09, h + .01, h + .014, [.24, .24, .26], 'glatt', true);
        k(-b, b, -d, -d + .3, 1.55, 1.68, STÅL); k(-.12, .12, -d, -d + .2, 1.68, 2.2, STÅL); break;
      case 'seng': case 'dobbeltseng': case 'sykeseng': { const syk = m.type === 'sykeseng', dobb = m.type === 'dobbeltseng', z0 = syk ? .34 : .14, zm = h;
        if (syk) { bein(z0, STÅL, .05); k(-b, b, -d, d, z0, z0 + .06, STÅL); k(-b, b, -d, -d + .04, z0, zm + .5, STÅL); k(-b, b, d - .04, d, z0, zm + .25, STÅL); }
        else { t(-b, b, -d, d, z0, z0 + .14); bein(z0, TRE, .07, 'tre'); t(-b, b, -d, -d + .06, 0, zm + .55); t(-b + .1, b - .1, -d - .001, -d + .07, zm + .15, zm + .45, LYST_TRE); }
        k(-b + .03, b - .03, -d + .06, d - .03, z0 + (syk ? .06 : .14), zm, [.95, .95, .93]);
        s(-b + .01, b - .01, -d + .7, d - .02, zm, zm + .09, syk ? [.82, .88, .9] : f); s(-b + .01, b - .01, -d + .62, -d + .78, zm, zm + .11, syk ? [.95, .96, .96] : lys(1.25));
        for (const x of dobb ? [-b / 2, b / 2] : [0]) s(x - .3, x + .3, -d + .12, -d + .52, zm, zm + .12, [.97, .97, .96]);
        if (!syk) s(-b + .05, b - .05, d - .5, d - .08, zm + .09, zm + .13, f2); break; }
      case 'nattbord': t(-b, b, -d, d, .1, h, LYST_TRE); bein(.1, LYST_TRE, .04, 'tre'); k(-b + .03, b - .03, d, d + .01, h - .2, h - .04, [.86, .74, .54]); k(-.02, .02, d + .01, d + .03, h - .13, h - .11, STÅL);
        k(-.06, .06, -.06, .06, h, h + .03, MØRK, 'glatt', true); k(-.012, .012, -.012, .012, h + .03, h + .22, MESSING); k(-.1, .1, -.1, .1, h + .2, h + .36, [.96, .9, .72], 'glatt', true); break;
      case 'skap': k(-b, b, -d, d - .02, 0, h, HVIT); k(-b + .01, -.005, d - .02, d, .06, h - .02, [.97, .97, .95]); k(.005, b - .01, d - .02, d, .06, h - .02, [.97, .97, .95]);
        k(-.06, -.04, d, d + .02, h * .42, h * .56, STÅL); k(.04, .06, d, d + .02, h * .42, h * .56, STÅL); k(-b, b, -d + .03, d - .03, 0, .06, MØRK); break;
      case 'arkivskap': k(-b, b, -d, d - .02, 0, h, [.6, .62, .64]); for (let i = 0; i < 3; i++) { const z = .05 + i * (h - .08) / 3; k(-b + .02, b - .02, d - .02, d, z, z + (h - .08) / 3 - .02, [.68, .7, .72]); k(-.1, .1, d, d + .015, z + .2, z + .22, STÅL); } break;
      case 'toalett': k(-b * .8, b * .8, -d, -d + .19, .3, .82, HVIT); k(-b * .7, b * .7, -d + .17, d, 0, h - .06, HVIT, 'glatt', true); k(-b * .82, b * .82, -d + .15, d + .02, h - .06, h, [.97, .97, .96], 'glatt', true);
        k(-.05, .05, -d + .05, -d + .12, .82, .84, STÅL); break;
      case 'vask': k(-b, b, -d, d, .5, h - .03, [.8, .7, .56], 'tre'); k(-b - .01, b + .01, -d, d + .01, h - .03, h, HVIT); k(-b * .7, b * .7, -d + .08, d - .06, h - .02, h + .004, [.86, .88, .9]);
        k(-.02, .02, -d + .03, -d + .07, h, h + .16, STÅL); k(-.02, .02, -d + .03, -d + .17, h + .14, h + .16, STÅL);
        k(-b * .85, b * .85, -d, -d + .02, 1.15, 1.85, [.72, .82, .88]); k(-b * .85 - .02, b * .85 + .02, -d - .001, -d + .012, 1.13, 1.87, HVIT); break;
      case 'dusj': k(-b, b, -d, d, 0, .05, HVIT); k(-b, -b + .015, -d, d, .05, h, [.74, .86, .9]); k(-b, b, d - .015, d, .05, h, [.74, .86, .9]); k(b - .08, b - .05, -d + .02, -d + .05, .9, h, STÅL); k(b - .22, b - .05, -d + .02, -d + .2, h - .03, h, STÅL); break;
      case 'skohylle': t(-b, b, -d, d, .16, .19, LYST_TRE); t(-b, b, -d, d, h - .03, h, LYST_TRE); t(-b, -b + .03, -d, d, 0, h, LYST_TRE); t(b - .03, b, -d, d, 0, h, LYST_TRE);
        k(-b + .1, -b + .22, -d + .04, d - .02, .19, .29, MØRK); k(-b + .25, -b + .37, -d + .04, d - .02, .19, .29, MØRK); k(.08, .2, -d + .04, d - .02, .19, .31, [.45, .28, .16]); k(.23, .35, -d + .04, d - .02, .19, .31, [.45, .28, .16]); break;
      case 'knagger': t(-b, b, -d, -d + .03, 1.6, 1.7, LYST_TRE); for (let i = 0; i < 5; i++) k(-b + .1 + i * .2, -b + .13 + i * .2, -d + .03, -d + .1, 1.62, 1.65, STÅL);
        s(-b + .12, -b + .5, -d + .03, d + .1, .85, 1.63, f); s(.05, .42, -d + .03, d + .08, 1, 1.63, f2); t(-b, b, -d, -d + .3, 1.82, 1.85, LYST_TRE); k(-.1, .25, -d + .04, -d + .26, 1.85, 1.95, f2); break;
      case 'skranke': t(-b, b, -d, d - .1, 0, h - .04, LYST_TRE); k(-b - .03, b + .03, -d - .03, d + .03, h - .04, h, HVIT); k(-b, b, d - .1, d - .08, .1, h - .1, [.3, .36, .44]);
        k(-.25, .2, -d + .05, -d + .09, h, h + .32, [.06, .06, .08]); break;
      case 'benk': t(-b, b, -d + .08, d, .4, .45, LYST_TRE); t(-b, b, -d, -d + .05, .55, h + .35, LYST_TRE); for (const x of [-b + .08, b - .14]) k(x, x + .06, -d, d, 0, .4, MØRK); break;
      case 'kirkebenk': t(-b, b, -d + .12, d, .42, .47); t(-b, b, -d, -d + .06, .1, h); t(-b, -b + .06, -d, d, 0, h + .08); t(b - .06, b, -d, d, 0, h + .08); t(-b, b, -d - .1, -d, h - .14, h - .1); break;
      case 'seterad': { const n = Math.max(2, Math.round(m.b / .6)), w = m.b / n; k(-b, b, -.04, .04, .32, .38, STÅL); for (const x of [-b + .1, b - .14]) k(x, x + .04, -d, d, 0, .34, STÅL);
        for (let i = 0; i < n; i++) { const x = -b + i * w; s(x + .04, x + w - .04, -d + .1, d, .38, .45, [.24, .32, .46]); s(x + .04, x + w - .04, -d, -d + .08, .45, h, [.24, .32, .46]); } break; }
      case 'skolepult': t(-b, b, -d + .25, d, h - .04, h, LYST_TRE); k(-b + .05, -b + .09, -d + .3, d - .05, 0, h - .04, STÅL); k(b - .09, b - .05, -d + .3, d - .05, 0, h - .04, STÅL);
        k(-.2, .2, -d - .2, -d + .2, .42, .46, [.3, .42, .58]); k(-.2, .2, -d - .2, -d - .16, .46, .82, [.3, .42, .58]); for (const x of [-.17, .17]) k(x - .02, x + .02, -d - .18, -d + .18, 0, .42, STÅL);
        k(-.12, .1, -.02, .16, h, h + .012, HVIT); break;
      case 'tavle': k(-b, b, -d, d, .9, .9 + h, [.13, .27, .2]); t(-b - .04, b + .04, -d, d + .01, .86, .9, LYST_TRE); t(-b - .04, b + .04, -d, d + .01, .9 + h, .94 + h, LYST_TRE); t(-b - .04, -b, -d, d + .01, .9, .9 + h, LYST_TRE); t(b, b + .04, -d, d + .01, .9, .9 + h, LYST_TRE);
        k(-b, b, d, d + .07, .84, .86, LYST_TRE, 'tre'); k(-b * .6, -b * .1, d, d + .004, 1.5, 1.52, [.8, .85, .8]); k(-b * .5, b * .3, d, d + .004, 1.3, 1.32, [.8, .85, .8]); break;
      case 'reol': case 'pallereol': { const reol = m.type === 'reol', c = reol ? [.92, .92, .9] : [.88, .46, .1], st = reol ? GRÅ : [.14, .3, .62];
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) k(sx * b - (sx > 0 ? .06 : 0), sx * b + (sx > 0 ? 0 : .06), sy * d - (sy > 0 ? .06 : 0), sy * d + (sy > 0 ? 0 : .06), 0, h, st);
        const dz = reol ? .42 : 1.3; for (let z = reol ? .12 : .1, n = 0; z < h - .2; z += dz, n++) { k(-b, b, -d, d, z, z + .05, c);
          const hv = Math.min(dz - .12, reol ? .28 : .95), w = reol ? .2 : 1.1, steg = reol ? .22 : 1.3;
          for (let x = -b + .08, j = 0; x < b - w; x += steg, j++) if ((j * 7 + n * 3 + Math.floor(m.f * 9)) % 6) { const hh = hv * (.6 + ((j + n) % 3) * .2);
            if (reol) for (const y of [-d + .05, .03]) k(x, x + w - .02, y, y + d - .08, z + .05, z + .05 + hh, TØY[(j * 3 + n * 5 + (y > 0 ? 2 : 0)) % TØY.length]);
            else { t(x, x + w, -d + .06, d - .06, z + .05, z + .17, LYST_TRE); k(x + .05, x + w - .05, -d + .1, d - .1, z + .17, z + .17 + hh, [.72, .58, .4], 'tøy'); } } } break; }
      case 'kasse': k(-b, b, -d, d, 0, h - .1, [.34, .36, .4]); k(-b, b * .45, -d + .08, d - .08, h - .1, h - .08, MØRK); k(-b, b, -d - .01, d + .01, h - .1, h - .06, STÅL); k(b * .55, b * .95, -.16, .16, h - .06, h + .28, [.1, .1, .12]);
        k(b * .57, b * .93, -.14, -.135, h - .02, h + .25, [.2, .3, .4]); k(b * .2, b * .45, .1, .3, h - .06, h + .06, [.2, .2, .22]); break;
      case 'kjøledisk': k(-b, b, -d, d, 0, .7, HVIT); k(-b, b, -d, -d + .08, .7, h, HVIT); k(-b, b, -d, d, h - .05, h, HVIT); k(-b + .04, b - .04, -d + .08, d - .04, .7, .78, [.8, .9, .94]);
        for (let i = 0; i < 6; i++) k(-b + .1 + i * (m.b - .2) / 6, -b + .1 + (i + .8) * (m.b - .2) / 6, -d + .12, d - .1, .78, .92 + (i % 2) * .08, TØY[(i * 3 + 1) % TØY.length]);
        k(-b + .02, b - .02, d - .03, d - .015, .78, h - .05, [.78, .88, .92]); break;
      case 'pall': for (const x of [-b, -.05, b - .1]) t(x, x + .1, -d, d, 0, .1, LYST_TRE); t(-b, b, -d, d, .1, .14, LYST_TRE); { const hh = h * (.6 + m.f * .4);
        k(-b + .03, b - .03, -d + .03, d - .03, .14, hh, [.74, .6, .42], 'tøy'); k(-b + .02, b - .02, -d + .02, d - .02, hh * .45, hh * .5, [.86, .88, .9]); } break;
      case 'maskin': k(-b, b, -d, d, 0, h * .5, [.2, .4, .34]); k(-b * .65, b * .2, -d * .7, d * .5, h * .5, h, [.26, .48, .4]); k(b * .35, b * .92, -d * .35, d * .35, h * .5, h * .82, [.86, .7, .1]);
        k(-b * .5, b * .05, d * .5, d * .52, h * .6, h * .9, [.12, .14, .16]); k(b * .5, b * .6, d * .35, d * .42, h * .6, h * .7, [.8, .1, .1], 'glatt', true); k(-b, b, -d - .02, d + .02, 0, .06, [.86, .7, .1]); break;
      case 'tønne': k(-b, b, -d, d, 0, h, m.f > .5 ? [.18, .3, .52] : [.55, .2, .14], 'glatt', true); for (const z of [.2, h - .25]) k(-b - .012, b + .012, -d - .012, d + .012, z, z + .04, MØRK, 'glatt', true); break;
      case 'høyball': k(-b, b, -d, d, 0, h, [.82, .7, .36], 'tøy'); for (const x of [-b * .45, b * .45]) k(x - .02, x + .02, -d - .005, d + .005, 0, h + .005, [.4, .3, .15]); break;
      case 'bås': t(-b, -b + .08, -d, d, 0, h); t(b - .08, b, -d, d, 0, h); t(-b, b, -d, -d + .08, 0, h); for (const z of [.4, .8]) t(-b, b, d - .06, d, z, z + .1); k(-b + .2, b - .2, -d + .2, -d + .7, .45, .75, GRÅ);
        k(-b + .1, b - .1, -d + .1, d - .1, 0, .06, [.8, .68, .34], 'tøy'); break;
      case 'traktor': k(-b * .55, b * .55, -d * .1, d * .9, .75, 1.45, [.78, .14, .1]); k(-b * .7, b * .7, -d * .9, -d * .1, .8, 1.5, [.78, .14, .1]); k(-b * .62, b * .62, -d * .85, -d * .15, 1.5, 2.25, [.6, .74, .8]); k(-b * .66, b * .66, -d * .88, -d * .12, 2.25, h, [.78, .14, .1]);
        k(-.06, .06, d * .55, d * .65, 1.45, 2.1, MØRK, 'glatt', true); k(-b * .5, b * .5, d * .88, d * .92, .85, 1.35, [.1, .1, .1]);
        for (const sx of [-1, 1]) { k(sx * b - (sx > 0 ? .45 : 0), sx * b + (sx > 0 ? 0 : .45), -d * .95, -d * .12, 0, 1.55, MØRK); k(sx * b * .9 - (sx > 0 ? .26 : 0), sx * b * .9 + (sx > 0 ? 0 : .26), d * .4, d * .92, 0, .9, MØRK);
          k(sx * b - (sx > 0 ? .47 : -.02), sx * b + (sx > 0 ? -.02 : .47), -d * .7, -d * .37, .5, 1.05, [.86, .7, .1]); } break;
      case 'bil': { const c = TØY[Math.floor(m.f * TØY.length) % TØY.length]; k(-b, b, -d, d, .32, .82, c); k(-b * .88, b * .88, -d * .5, d * .32, .82, h, [.5, .62, .7]); k(-b * .9, b * .9, -d * .46, d * .26, h - .05, h, c);
        k(-b * .92, b * .92, d - .02, d + .01, .5, .68, [.9, .88, .7]); k(-b * .92, b * .92, -d - .01, -d + .02, .55, .7, [.7, .1, .1]); k(-b * .6, b * .6, d - .01, d + .03, .36, .46, MØRK);
        for (const sx of [-1, 1]) for (const sy of [-.62, .62]) k(sx * b - (sx > 0 ? .22 : -.02), sx * b + (sx > 0 ? -.02 : .22), sy * d - .33, sy * d + .33, 0, .66, [.08, .08, .09]); break; }
      case 'vedstabel': for (let z = 0, n = 0; z < h; z += .15, n++) for (let x = -b + (n % 2) * .07; x < b - .1; x += .15) k(x, x + .13, -d, d, z, z + .13, hash(n * 17 + x * 100, 3) > .5 ? [.66, .5, .32] : [.56, .4, .25], 'tre', true); break;
      case 'alter': k(-b, b, -d, d, 0, h, HVIT); k(-b - .06, b + .06, -d - .06, d + .06, h, h + .03, [.62, .12, .15], 'tøy'); k(-b - .06, b + .06, d + .04, d + .06, h - .3, h, [.62, .12, .15], 'tøy');
        k(-.035, .035, -.035, .035, h + .03, h + .85, MESSING); k(-.24, .24, -.035, .035, h + .55, h + .62, MESSING); for (const x of [-b * .6, b * .6]) { k(x - .04, x + .04, -.04, .04, h + .03, h + .2, MESSING, 'glatt', true); k(x - .015, x + .015, -.015, .015, h + .2, h + .45, [.97, .95, .88]); } break;
      case 'prekestol': t(-b, b, -d, d, 0, .5); t(-b, b, -d, -d + .06, .5, h); t(-b, -b + .06, -d, d, .5, h); t(b - .06, b, -d, d, .5, h); t(-b * .5, b * .5, d - .3, d, h, h + .05, LYST_TRE); break;
      case 'fly': k(-.6, .6, -d, d * .8, .9, 2, HVIT); k(-.58, .58, d * .3, d * .7, 1.5, 2.02, [.4, .55, .7]); k(-b, b, -.7, .5, 1.8, 1.95, HVIT); k(-b, -b + 1.2, -.7, .5, 1.8, 1.96, [.75, .15, .1]); k(b - 1.2, b, -.7, .5, 1.8, 1.96, [.75, .15, .1]);
        k(-1.6, 1.6, -d, -d + .9, 1.6, 1.7, HVIT); k(-.06, .06, -d, -d + 1, 1.7, h + .3, [.75, .15, .1]);
        k(-.1, .1, d * .8, d * .8 + .05, .5, 2.4, MØRK); for (const sx of [-1.2, 1.2]) k(sx - .1, sx + .1, -.3, .1, 0, .9, MØRK); k(-.1, .1, d * .5, d * .6, 0, .9, MØRK); break;
      case 'verktøyvogn': k(-b, b, -d, d, .12, h, [.72, .14, .12]); for (let i = 0; i < 4; i++) k(-b + .03, b - .03, d, d + .01, .18 + i * .18, .32 + i * .18, [.8, .2, .16]); k(-b - .02, b + .02, -d - .02, d + .02, h, h + .03, MØRK); bein(.12, MØRK, .05); break;
      default: k(-b, b, -d, d, 0, h, GRÅ);
    }
    return K;
  }

  // ---------- rommenes utseende ----------
  function romStil(pl, r, nr) {
    const kl = pl.kl, tone = PARKETT[Math.floor(hash(pl.i, 7) * PARKETT.length)], maling = MALING[Math.floor(hash(pl.i, 11 + nr * 3) * MALING.length)];
    const S = { gulv: ['parkett', tone], vegg: ['malt', maling], lampe: 1 };
    switch (r.rolle) {
      case 'bad': S.gulv = ['flis', [.7, .75, .78]]; S.vegg = ['flis', [.95, .97, .97]]; break;
      case 'kjøkken': if (hash(pl.i, 5) > .5) S.gulv = ['flis', [.84, .8, .72]]; break;
      case 'kontor': case 'resepsjon': if (kl !== 'lager' && kl !== 'terminal') S.gulv = ['tøy', [.42, .46, .52]]; else S.gulv = ['betong', [.66, .66, .64]]; S.vegg = ['malt', [.93, .93, .91]]; break;
      case 'klasserom': S.gulv = ['betong', [.66, .72, .62]]; S.vegg = ['malt', [.95, .92, .8]]; break;
      case 'sykerom': S.gulv = ['betong', [.74, .8, .78]]; S.vegg = ['malt', [.92, .96, .94]]; break;
      case 'butikk': case 'terminal': S.gulv = ['flis', [.86, .85, .82]]; S.vegg = ['malt', [.95, .95, .93]]; S.lampe = 2; break;
      case 'lager': case 'verksted': case 'lagerhall': case 'hangar': S.gulv = ['betong', [.64, .64, .62]]; S.vegg = ['betong', [.76, .76, .74]]; S.lampe = 2; break;
      case 'garasje': S.gulv = ['betong', [.6, .6, .58]]; S.vegg = ['panel', [.72, .6, .44]]; break;
      case 'låve': case 'bod': S.gulv = ['parkett', [.5, .4, .28]]; S.vegg = ['panel', [.6, .46, .32]]; S.lampe = r.rolle === 'låve' ? 2 : 1; break;
      case 'kirke': S.gulv = ['parkett', [.46, .32, .22]]; S.vegg = ['malt', [.95, .93, .87]]; S.lampe = 2; break;
      case 'gang': if (kl === 'skole') { S.gulv = ['betong', [.66, .72, .62]]; S.vegg = ['malt', [.95, .92, .8]]; } break;
    }
    if (kl === 'sykehus' && r.rolle !== 'sykerom') { S.gulv = ['betong', [.74, .8, .78]]; S.vegg = ['malt', [.92, .96, .94]]; }
    if (kl === 'hytte' && r.rolle !== 'bad') S.vegg = ['panel', [.86, .7, .48]];
    return S;
  }

  function bygg(R, u, P) {
    const terr = (x, y) => (hoyde3d(u.cx + x, u.cy + y, u) - u.h0) * R.EX, D = P.dør;
    // døra må ligge på omrisset (saltakshus tegnes som et rettet rektangel): flytt den til nærmeste kant
    let best = null; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1.4) continue;
      const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L, w = Math.min(D.w, L * .7), t = Math.max(w / 2 + .1, Math.min(L - w / 2 - .1, (D.x - a[0]) * ex + (D.y - a[1]) * ey)), x = a[0] + ex * t, y = a[1] + ey * t, av = Math.hypot(x - D.x, y - D.y);
      if (!best || av < best.av) best = { av, x, y, ux: ex, uy: ey, w }; }
    if (!best) return null;
    const pl = Interior.plan(P, { i: P.bygg.i, kl: P.bygg.kl, h: P.bygg.h, dør: best }), I = pl.inngang, A = pl.akse;
    let maks = -Infinity, mx = 0, my = 0; for (const [x, y] of P) { maks = Math.max(maks, terr(x, y)); mx += x; my += y; } maks = Math.max(maks, terr(mx / P.length, my / P.length));
    // gulvet ligger over det høyeste terrenget under bygget (ellers stikker bakken opp gjennom gulvet); trappa foran døra er lang nok
    // til at du kan gå opp (høyst 0,6 m stigning per meter), og høyst 3,5 m høy
    const ute0 = terr(I.x + I.nx * 1.5, I.y + I.ny * 1.5); pl.gulv = Math.min(Math.max(maks + .08, D.z0 + .05), ute0 + 3.5);
    pl.trapp = Math.max(1.5, Math.min(6, (pl.gulv - ute0) / .6)); const ute = terr(I.x + I.nx * pl.trapp, I.y + I.ny * pl.trapp);
    // himlingen holder seg under der ytterveggen slutter (ellers stikker rommet ut gjennom taket når gulvet er løftet i en skråning)
    { const topp = P.veggTopp !== undefined ? P.veggTopp : P.topp; if (topp !== undefined && topp === topp) pl.tak = Math.max(1.95, Math.min(pl.tak, topp - pl.gulv - .06)); }
    const g0 = pl.gulv, tak = pl.tak, kl = pl.kl;
    // nettene: hovednettet i åtte stoffer, og de små for vinduer, skygge, lampelys og dagslys
    const G = STOFFER.map(() => ({ pos: [], kol: [], uv: [] })), V = { pos: [], uv: [] }, SK = { pos: [], uv: [] }, LA = { pos: [], uv: [] }, DA = { pos: [], uv: [] }, YT = { pos: [], uv: [] };
    const tri = (g, a, b, c, fa, fb, fc, ta, tb, tc) => { g.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); if (g.kol) g.kol.push(fa[0], fa[1], fa[2], fb[0], fb[1], fb[2], fc[0], fc[1], fc[2]); g.uv.push(ta[0], ta[1], tb[0], tb[1], tc[0], tc[1]); };
    // firkant: f er én farge eller fire (en per hjørne), t er fire uv-par
    const fk = (g, a, b, c, d, f, t) => { const F = f && f.length === 4 && f[0].length ? f : [f, f, f, f]; tri(g, a, b, c, F[0], F[1], F[2], t[0], t[1], t[2]); tri(g, a, c, d, F[0], F[2], F[3], t[0], t[2], t[3]); };
    const UV0 = [[0, 0], [1, 0], [1, 1], [0, 1]], mørk = (f, v) => [f[0] * v, f[1] * v, f[2] * v];
    // en kasse i møbelets akser: midt (x, y), retning a, sidene litt mørkere enn toppen
    const kasse = (x, y, a, [x0, x1, y0, y1, z0, z1, f, st = 'glatt', rund = false]) => {
      // hvitmalt tre har ingen synlige årer
      if (st === 'tre' && f[0] > .84 && f[2] > .84) st = 'malt';
      const c = Math.cos(a), s = Math.sin(a), p = (lx, ly, z) => [x + lx * c - ly * s, y + lx * s + ly * c, g0 + z], g = G[NR[st]], m = METER[st];
      if (rund) { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2, n = 8, T = p(cx, cy, z1);
        for (let i = 0; i < n; i++) { const v0 = i / n * 6.2832, v1 = (i + 1) / n * 6.2832, a0 = [cx + Math.cos(v0) * rx, cy + Math.sin(v0) * ry], a1 = [cx + Math.cos(v1) * rx, cy + Math.sin(v1) * ry], sk = .78 + .2 * Math.abs(Math.cos(v0 + .6));
          fk(g, p(a0[0], a0[1], z0), p(a1[0], a1[1], z0), p(a1[0], a1[1], z1), p(a0[0], a0[1], z1), mørk(f, sk), UV0); tri(g, T, p(a0[0], a0[1], z1), p(a1[0], a1[1], z1), f, f, f, [.5, .5], [0, 0], [1, 0]); } return; }
      const flate = (P4, uv, sk) => fk(g, P4[0], P4[1], P4[2], P4[3], mørk(f, sk), uv.map(q => [q[0] / m, q[1] / m]));
      flate([p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1)], [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 1);
      flate([p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1)], [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], .8);
      flate([p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), p(x1, y0, z1)], [[y0, z0], [y1, z0], [y1, z1], [y0, z1]], .9);
      flate([p(x1, y1, z0), p(x0, y1, z0), p(x0, y1, z1), p(x1, y1, z1)], [[x1, z0], [x0, z0], [x0, z1], [x1, z1]], .86);
      flate([p(x0, y1, z0), p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1)], [[y1, z0], [y0, z0], [y0, z1], [y1, z1]], .93);
      if (z0 > .3) flate([p(x0, y0, z0), p(x1, y0, z0), p(x1, y1, z0), p(x0, y1, z0)], [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], .6);
    };
    // en skygge på gulvet: myk firkant rundt et fotavtrykk (midt, retning, halve mål)
    const blob = (x, y, a, hb, hd, z = .012) => { const c = Math.cos(a), s = Math.sin(a), p = (lx, ly) => [x + lx * c - ly * s, y + lx * s + ly * c, g0 + z];
      fk(SK, p(-hb, -hd), p(hb, -hd), p(hb, hd), p(-hb, hd), null, [[.52, .02], [.98, .02], [.98, .98], [.52, .98]]); };
    // en lysflekk på gulvet (lampe eller dagslys)
    const flekk = (g, x, y, a, hb, hd, z) => { const c = Math.cos(a), s = Math.sin(a), p = (lx, ly) => [x + lx * c - ly * s, y + lx * s + ly * c, g0 + z]; fk(g, p(-hb, -hd), p(hb, -hd), p(hb, hd), p(-hb, hd), null, UV0); };
    // rommet på et sted, og rommenes stil
    const romVed = (x, y) => { const pu = x * A.ux + y * A.uy, pv = x * A.vx + y * A.vy; return pl.rom.find(r => pu >= r.u0 && pu <= r.u1 && pv >= r.v0 && pv <= r.v1) || pl.rom[0]; };
    const stiler = new Map(pl.rom.map((r, n) => [r, romStil(pl, r, n)])), stilVed = (x, y) => stiler.get(romVed(x, y));
    // en veggflate fra A til B (sett fra rommet): mønster i meter, mørkere nede og i hjørnene, gulvlist
    const veggflate = (ax, ay, bx, by, z0, z1, [st, f], hjA, hjB, list) => {
      const L = Math.hypot(bx - ax, by - ay); if (L < .02 || z1 - z0 < .02) return; const m = METER[st], g = G[NR[st]], ex = (bx - ax) / L, ey = (by - ay) / L, T = [0];
      if (hjA && L > .9) T.push(.4); if (hjB && L > .9) T.push(L - .4); T.push(L);
      for (let i = 0; i < T.length - 1; i++) { const t0 = T[i], t1 = T[i + 1], k0 = hjA && t0 === 0 ? .7 : 1, k1 = hjB && t1 === L ? .7 : 1, ned = z0 < .1 ? .8 : .95, opp = z1 > tak - .1 ? .92 : 1;
        fk(g, [ax + ex * t0, ay + ey * t0, g0 + z0], [ax + ex * t1, ay + ey * t1, g0 + z0], [ax + ex * t1, ay + ey * t1, g0 + z1], [ax + ex * t0, ay + ey * t0, g0 + z1],
          [mørk(f, ned * k0), mørk(f, ned * k1), mørk(f, opp * k1), mørk(f, opp * k0)], [[t0 / m, z0 / m], [t1 / m, z0 / m], [t1 / m, z1 / m], [t0 / m, z1 / m]]); }
      if (list && z0 < .01) { const nx = -ey * .012, ny = ex * .012, w = st === 'panel' || st === 'betong' ? null : HVIT;
        if (w) fk(G[0], [ax + nx, ay + ny, g0], [bx + nx, by + ny, g0], [bx + nx, by + ny, g0 + .08], [ax + nx, ay + ny, g0 + .08], w, UV0); }
    };
    // skygge langs en vegg: stripe 0,4 m ut på gulvet (n = retningen inn i rommet)
    const veggskygge = (ax, ay, bx, by, nx, ny) => fk(SK, [ax, ay, g0 + .01], [bx, by, g0 + .01], [bx + nx * .4, by + ny * .4, g0 + .01], [ax + nx * .4, ay + ny * .4, g0 + .01], null, [[.02, .1], [.02, .9], [.48, .9], [.48, .1]]);

    // gulvet per rom: omrisset klippet mot rommets firkant (i byggets akser)
    const Puv = P.map(([x, y]) => [x * A.ux + y * A.uy, x * A.vx + y * A.vy]);
    const klipp = (S, akse, grense, større) => { const ut = [], inne = p => større ? p[akse] >= grense : p[akse] <= grense;
      for (let i = 0; i < S.length; i++) { const a = S[i], b = S[(i + 1) % S.length], ia = inne(a), ib = inne(b);
        if (ia) ut.push(a); if (ia !== ib) { const t = (grense - a[akse]) / (b[akse] - a[akse]); ut.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } return ut; };
    for (const r of pl.rom) { let S = klipp(klipp(klipp(klipp(Puv, 0, r.u0, true), 0, r.u1, false), 1, r.v0, true), 1, r.v1, false); if (S.length < 3) continue;
      const [st, f] = stiler.get(r).gulv, g = G[NR[st]], m = METER[st] * (st === 'flis' && (r.rolle === 'butikk' || r.rolle === 'terminal') ? 1.6 : 1); let T;
      try { T = THREE.ShapeUtils.triangulateShape(S.map(p => new THREE.Vector2(p[0], p[1])), []); } catch (e) { continue; }
      const xy = p => [p[0] * A.ux + p[1] * A.vx, p[0] * A.uy + p[1] * A.vy, g0];
      for (const [a, b, c] of T) tri(g, xy(S[a]), xy(S[b]), xy(S[c]), f, f, f, [S[a][0] / m, S[a][1] / m], [S[b][0] / m, S[b][1] / m], [S[c][0] / m, S[c][1] / m]); }
    // himlingen
    { const T = THREE.ShapeUtils.triangulateShape(P.map(p => new THREE.Vector2(p[0], p[1])), []), g = G[NR.malt], f = kl === 'låve' || kl === 'uthus' ? [.5, .4, .3] : [.96, .96, .94];
      for (const [a, b, c] of T) tri(g, [P[a][0], P[a][1], g0 + tak], [P[c][0], P[c][1], g0 + tak], [P[b][0], P[b][1], g0 + tak], f, f, f, [P[a][0] / 2, P[a][1] / 2], [P[c][0] / 2, P[c][1] / 2], [P[b][0] / 2, P[b][1] / 2]); }

    // ytterveggenes innside (3 cm innenfor veggen), delt der skilleveggene møter dem, med åpning ved inngangen og vinduer
    const dørH = Math.min(tak - .1, Math.max(2, D.hh || 2.1)), ender = pl.vegger.flatMap(v => [[v.ax, v.ay], [v.bx, v.by]]), dagslys = kl !== 'låve';
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < .05) continue;
      const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L, nx = -ey, ny = ex, pt = (t, inn) => [a[0] + ex * t + nx * inn, a[1] + ey * t + ny * inn];
      const td = (I.x - a[0]) * ex + (I.y - a[1]) * ey, avD = Math.abs((I.x - a[0]) * ey - (I.y - a[1]) * ex), harDør = avD < .05 && td > 0 && td < L && Math.abs(ex * I.ux + ey * I.uy) > .99;
      const p0 = harDør ? Math.max(0, td - I.w / 2) : -1, q0 = harDør ? Math.min(L, td + I.w / 2) : -1;
      const T = [0, L]; for (const h of ender) { const t = (h[0] - a[0]) * ex + (h[1] - a[1]) * ey, av = Math.abs((h[0] - a[0]) * ey - (h[1] - a[1]) * ex); if (av < .25 && t > .3 && t < L - .3) T.push(t); }
      if (harDør) T.push(p0, q0);
      // vinduene på denne veggen (EKTE HULL: ytterveggen tegnes ikke innenfra mens du er inne, så du ser ut – se oppdater())
      const kirke = kl === 'kirke', butikk = kl === 'butikk' || kl === 'terminal', vz0 = kirke ? 1.2 : butikk ? .5 : .9, vz1 = Math.min(tak - .25, kirke ? 4.5 : butikk ? 2.6 : 2.1), bw = butikk ? 2 : 1.1, vinduer = [];
      if (!UTEN_VINDU[kl] && L >= 2.6) { const n = Math.max(1, Math.floor(L / 3.2));
        for (let j = 0; j < n; j++) { const t = L * (j + .5) / n; if (harDør && Math.abs(t - td) < I.w / 2 + bw / 2 + .35) continue;
          const X = a[0] + ex * t, Y = a[1] + ey * t; if (ender.some(h => Math.hypot(h[0] - X, h[1] - Y) < bw / 2 + .3)) continue; vinduer.push(t); T.push(t - bw / 2, t + bw / 2); } }
      T.sort((x, y) => x - y);
      for (let k = 0; k < T.length - 1; k++) { const t0 = T[k], t1 = T[k + 1]; if (t1 - t0 < .03) continue; const A0 = pt(t0, .03), B0 = pt(t1, .03), mid = pt((t0 + t1) / 2, .4), S = stilVed(mid[0], mid[1]), iDør = harDør && t0 >= p0 - .01 && t1 <= q0 + .01;
        const iVindu = vinduer.some(t => t0 >= t - bw / 2 - .01 && t1 <= t + bw / 2 + .01), vkant = t => vinduer.some(v => Math.abs(t - (v - bw / 2)) < .01 || Math.abs(t - (v + bw / 2)) < .01);
        const hj0 = !(harDør && Math.abs(t0 - q0) < .01) && !vkant(t0), hj1 = !(harDør && Math.abs(t1 - p0) < .01) && !vkant(t1);
        if (iDør) veggflate(A0[0], A0[1], B0[0], B0[1], dørH, tak, S.vegg, false, false, false);
        else if (iVindu) { veggflate(A0[0], A0[1], B0[0], B0[1], 0, vz0, S.vegg, false, false, true); veggflate(A0[0], A0[1], B0[0], B0[1], vz1, tak, S.vegg, false, false, false); veggskygge(A0[0], A0[1], B0[0], B0[1], nx, ny); }
        else { veggflate(A0[0], A0[1], B0[0], B0[1], 0, tak, S.vegg, hj0, hj1, true); veggskygge(A0[0], A0[1], B0[0], B0[1], nx, ny); } }
      if (harDør) {
        // døråpningen: dagen utenfor (innenfra), en mørk åpning og et åpent dørblad (utenfra), karm rundt
        // (den mørke åpningen ligger i et eget lite nett som bare vises når du står utenfor – innenfra ser du ut gjennom døra)
        const y0 = pt(p0, -.07), y1 = pt(q0, -.07); fk(YT, [y0[0], y0[1], g0], [y1[0], y1[1], g0], [y1[0], y1[1], g0 + dørH], [y0[0], y0[1], g0 + dørH], null, UV0);
        const va = Math.atan2(ey, ex);
        for (const t of [p0, q0]) { const c = pt(t, .0); kasse(c[0], c[1], va, [-.05, .05, -.1, .1, 0, dørH, HVIT, 'tre']); } { const c = pt(td, 0); kasse(c[0], c[1], va, [-I.w / 2, I.w / 2, -.1, .1, dørH, dørH + .08, HVIT, 'tre']); }
        if (I.w < 2.4) { const h = pt(p0 + .05, .06), bw = Math.min(1, I.w) - .1; kasse(h[0], h[1], va + 1.75, [0, bw, -.022, .022, .01, dørH - .03, [.86, .84, .78], 'tre']); kasse(h[0], h[1], va + 1.75, [bw - .13, bw - .03, -.06, .06, 1, 1.03, STÅL]);
          const hu = pt(q0 - .05, -.09); kasse(hu[0], hu[1], va + Math.PI - 1.9, [0, bw, -.022, .022, D.z0 - g0, D.z0 - g0 + dørH - .03, [.5, .36, .24], 'tre']); }
        // dørmatte
        const dm = pt(td, .55); kasse(dm[0], dm[1], va, [-.4, .4, -.25, .25, .003, .02, [.3, .26, .2], 'tøy']);
      }
      const z0 = vz0, z1 = vz1;
      for (const t of vinduer) {
        // glasset: en svak, lys hinne (ingen bilde – du ser det som faktisk er utenfor)
        const w0 = pt(t - bw / 2, .02), w1 = pt(t + bw / 2, .02);
        fk(V, [w0[0], w0[1], g0 + z0], [w1[0], w1[1], g0 + z0], [w1[0], w1[1], g0 + z1], [w0[0], w0[1], g0 + z1], null, UV0);
        // karm, sprosser og vinduspost
        const va = Math.atan2(ey, ex), c = pt(t, .06), kb = bw / 2;
        for (const [x0, x1, q0z, q1z] of [[-kb - .06, kb + .06, z0 - .06, z0], [-kb - .06, kb + .06, z1, z1 + .06], [-kb - .06, -kb, z0, z1], [kb, kb + .06, z0, z1], [-.02, .02, z0, z1]]) kasse(c[0], c[1], va, [x0, x1, -.015, .02, q0z, q1z, HVIT, 'tre']);
        if (!butikk && !kirke) kasse(c[0], c[1], va, [-kb, kb, -.015, .02, (z0 + z1) / 2 - .015, (z0 + z1) / 2 + .015, HVIT, 'tre']);
        kasse(c[0], c[1], va, [-kb - .1, kb + .1, -.02, .14, z0 - .09, z0 - .06, HVIT, 'tre']);
        // gardiner i boliger og kontorer, i rommets farge
        const S = stilVed(pt(t, .5)[0], pt(t, .5)[1]), rolle = romVed(pt(t, .5)[0], pt(t, .5)[1]).rolle;
        if (!butikk && !kirke && rolle !== 'bad' && S.vegg[0] === 'malt' && kl !== 'skole' && kl !== 'sykehus') { const gf = TØY[Math.floor(hash(pl.i, 91 + pl.rom.indexOf(romVed(pt(t, .5)[0], pt(t, .5)[1]))) * TØY.length)].map(v => Math.min(1, v * 1.25 + .1)), gc = pt(t, .1);
          for (const sx of [-1, 1]) for (let q = 0; q < 3; q++) kasse(gc[0], gc[1], va, [sx * (kb + .16) - (sx > 0 ? .1 * (q + 1) : -.1 * q), sx * (kb + .16) - (sx > 0 ? .1 * q : -.1 * (q + 1)), q % 2 ? .0 : .025, q % 2 ? .03 : .055, z0 - .25, z1 + .14, mørk(gf, q % 2 ? .9 : 1), 'tøy']);
          kasse(gc[0], gc[1], va, [-kb - .3, kb + .3, .02, .045, z1 + .14, z1 + .165, MØRK]); }
        if (dagslys) { const dc = pt(t, 1.05); flekk(DA, dc[0], dc[1], va, bw / 2 + .5, 1.15, .022); }
      }
    }
    // skilleveggene: 10 cm tykke, hver side i sitt roms farge, og bilder på noen av dem
    for (const [vn, v] of pl.vegger.entries()) { const L = Math.hypot(v.bx - v.ax, v.by - v.ay); if (L < .05) continue; const ex = (v.bx - v.ax) / L, ey = (v.by - v.ay) / L, nx = -ey, ny = ex, va = Math.atan2(ey, ex);
      for (const s of [1, -1]) { const ox = nx * .05 * s, oy = ny * .05 * s, mid = [(v.ax + v.bx) / 2 + nx * .4 * s, (v.ay + v.by) / 2 + ny * .4 * s], S = stilVed(mid[0], mid[1]);
        const fri = e => !pl.dører.some(d => Math.hypot(d[0] - e[0], d[1] - e[1]) < d[4] / 2 + .2);
        veggflate(v.ax + ox, v.ay + oy, v.bx + ox, v.by + oy, 0, tak, S.vegg, fri([v.ax, v.ay]), fri([v.bx, v.by]), true); veggskygge(v.ax + ox, v.ay + oy, v.bx + ox, v.by + oy, nx * s, ny * s);
        // bilde: ramme og motiv, midt på veggen
        if (L > 1.7 && S.vegg[0] === 'malt' && hash(pl.i, vn * 7 + (s > 0 ? 1 : 2)) < .6) { const bw = .5 + hash(pl.i, vn * 13 + s) * .45, bh = .4 + hash(pl.i, vn * 17 + s) * .35, c = [(v.ax + v.bx) / 2 + nx * .052 * s, (v.ay + v.by) / 2 + ny * .052 * s], a2 = s > 0 ? va : va + Math.PI, m1 = TØY[Math.floor(hash(pl.i, vn * 23 + s) * TØY.length)], m2 = TØY[Math.floor(hash(pl.i, vn * 29 + s) * TØY.length)];
          kasse(c[0], c[1], a2, [-bw / 2 - .03, bw / 2 + .03, 0, .02, 1.5 - bh / 2 - .03, 1.5 + bh / 2 + .03, hash(pl.i, vn) > .5 ? MØRK : LYST_TRE, 'tre']); kasse(c[0], c[1], a2, [-bw / 2, bw / 2, .02, .026, 1.5 - bh / 2, 1.5 + bh / 2, [.94, .93, .9]]);
          kasse(c[0], c[1], a2, [-bw / 2 + .05, bw / 2 - .05, .026, .03, 1.5 - bh / 2 + .05, 1.5 + bh * .05, m1]); kasse(c[0], c[1], a2, [-bw / 2 + .05, bw / 2 - .05, .026, .03, 1.5 + bh * .05, 1.5 + bh / 2 - .05, mørk(m2, 1.2)]);
          kasse(c[0], c[1], a2, [bw * .05, bw * .3, .03, .033, 1.5 + bh * .12, 1.5 + bh * .32, [.95, .85, .5]]); } }
      // endene
      for (const [x, y, s] of [[v.ax, v.ay, -1], [v.bx, v.by, 1]]) { const f = stilVed(x + ex * .3 * s, y + ey * .3 * s).vegg[1];
        fk(G[NR.malt], [x - nx * .05, y - ny * .05, g0], [x + nx * .05, y + ny * .05, g0], [x + nx * .05, y + ny * .05, g0 + tak], [x - nx * .05, y - ny * .05, g0 + tak], mørk(f, .85), UV0); }
    }
    // døråpningene mellom rommene: overstykke opp til taket, karm, og et dørblad som står åpent
    for (const [dn, d] of pl.dører.entries()) { const [x, y, ex, ey, w] = d, va = Math.atan2(ey, ex), nx = -ey, ny = ex, H = Math.min(2.05, tak - .15);
      for (const s of [1, -1]) { const S = stilVed(x + nx * .4 * s, y + ny * .4 * s); veggflate(x - ex * w / 2 + nx * .05 * s, y - ey * w / 2 + ny * .05 * s, x + ex * w / 2 + nx * .05 * s, y + ey * w / 2 + ny * .05 * s, H, tak, S.vegg, false, false, false); }
      fk(G[0], [x - ex * w / 2 - nx * .05, y - ey * w / 2 - ny * .05, g0 + H], [x + ex * w / 2 - nx * .05, y + ey * w / 2 - ny * .05, g0 + H], [x + ex * w / 2 + nx * .05, y + ey * w / 2 + ny * .05, g0 + H], [x - ex * w / 2 + nx * .05, y - ey * w / 2 + ny * .05, g0 + H], [.7, .7, .68], UV0);
      if (w > 1.4 || kl === 'låve' || kl === 'uthus') continue;
      for (const s of [-1, 1]) kasse(x + ex * s * (w / 2 - .02), y + ey * s * (w / 2 - .02), va, [-.03, .03, -.07, .07, 0, H, HVIT, 'tre']); kasse(x, y, va, [-w / 2, w / 2, -.07, .07, H - .05, H, HVIT, 'tre']);
      // terskel og dørblad (hengslet i den ene karmen, står åpent ca. 100° inn i det ene rommet)
      kasse(x, y, va, [-w / 2, w / 2, -.06, .06, 0, .015, LYST_TRE, 'tre']);
      const s = hash(pl.i, dn * 5 + 1) > .5 ? 1 : -1, t = hash(pl.i, dn * 5 + 2) > .5 ? 1 : -1, hx = x + ex * s * (w / 2 - .06) + nx * .06 * t, hy = y + ey * s * (w / 2 - .06) + ny * .06 * t, åpen = va + (s > 0 ? Math.PI : 0) + t * s * -1.8, bw = w - .14, df = hash(pl.i, 3) > .5 ? [.95, .95, .93] : [.8, .66, .46];
      kasse(hx, hy, åpen, [0, bw, -.02, .02, .012, H - .06, df, 'tre']); kasse(hx, hy, åpen, [.08, bw - .08, -.024, .024, .2, H * .45, mørk(df, .95), 'tre']); kasse(hx, hy, åpen, [.08, bw - .08, -.024, .024, H * .5, H - .25, mørk(df, .95), 'tre']);
      kasse(hx, hy, åpen, [bw - .14, bw - .04, -.06, .06, 1, 1.025, STÅL]);
    }
    // trapp foran døra når gulvet ligger over bakken: trinn på ca. 18 cm, så langt ut som trappa går
    if (pl.gulv - ute > .12) { const n = Math.max(1, Math.round((pl.gulv - ute) / .18)), a = Math.atan2(I.uy, I.ux), dl = pl.trapp / n;
      for (let j = 0; j < n; j++) kasse(I.x + I.nx * dl * (j + .5), I.y + I.ny * dl * (j + .5), a, [-I.w / 2 - .15, I.w / 2 + .15, -dl / 2, dl / 2, ute - g0 - .4, (ute - g0) + (pl.gulv - ute) * (1 - (j + .5) / n), [.62, .62, .6], 'betong']); }
    // møblene, med skygge under og teppe under salongbordet
    for (const m of pl.møbler) { for (const K of deler(m)) kasse(m.x, m.y, m.a, K);
      if (m.h > .15 && m.type !== 'tavle' && m.type !== 'knagger') blob(m.x, m.y, m.a, m.b / 2 + .22, m.d / 2 + .22);
      if (m.type === 'salongbord') { const tf = TØY[Math.floor(hash(pl.i, 41) * TØY.length)], tw = Math.min(1.1, m.b / 2 + .5), td2 = .8;
        kasse(m.x, m.y, m.a, [-tw, tw, -td2, td2, .004, .014, tf, 'tøy']); kasse(m.x, m.y, m.a, [-tw + .12, tw - .12, -td2 + .12, td2 - .12, .014, .017, mørk(tf, 1.25), 'tøy']); } }
    // taklamper: én midt i hvert rom (haller: lysrør i rekker), med varmt lys på gulvet under
    for (const r of pl.rom) { if (r.andel < .5) continue; const S = stiler.get(r), lu = r.u1 - r.u0, lv = r.v1 - r.v0, sted = [];
      if (S.lampe === 2) { for (let pu = r.u0 + 3; pu < r.u1 - 1.5; pu += 6) for (let pv = r.v0 + 3; pv < r.v1 - 1.5; pv += 6) sted.push([pu, pv]); if (!sted.length) sted.push([(r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2]); }
      else sted.push([(r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2]);
      for (const [pu, pv] of sted) { const x = pu * A.ux + pv * A.vx, y = pu * A.uy + pv * A.vy; if (!Interior.inni(P, x, y) || Interior.avstKant(P, x, y) < .5) continue; const va = Math.atan2(A.uy, A.ux);
        if (S.lampe === 2) { kasse(x, y, va, [-.75, .75, -.09, .09, tak - .12, tak - .05, [1, 1, .96]]); kasse(x, y, va, [-.8, .8, -.12, .12, tak - .05, tak, STÅL]); flekk(LA, x, y, va, 3.4, 3.4, .024); }
        else if (tak > 2.9) { kasse(x, y, va, [-.012, .012, -.012, .012, tak - .6, tak, MØRK]); kasse(x, y, va, [-.2, .2, -.2, .2, tak - .85, tak - .6, [1, .95, .8], 'glatt', true]); flekk(LA, x, y, va, Math.min(2.4, lu * .55), Math.min(2.4, lv * .55), .024); }
        else { kasse(x, y, va, [-.19, .19, -.19, .19, tak - .09, tak - .01, [1, .97, .86], 'glatt', true]); kasse(x, y, va, [-.21, .21, -.21, .21, tak - .02, tak, STÅL, 'glatt', true]); flekk(LA, x, y, va, Math.min(2.2, lu * .55), Math.min(2.2, lv * .55), .024); } } }

    // sett sammen: hovednettet med en gruppe per stoff
    const pos = [], kol = [], uv = [], grupper = []; for (const [n, g] of G.entries()) { if (!g.pos.length) continue; grupper.push([pos.length / 3, g.pos.length / 3, n]); for (const v of g.pos) pos.push(v); for (const v of g.kol) kol.push(v); for (const v of g.uv) uv.push(v); }
    const ST = stoffene(), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(kol, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    for (const [fra, antall, n] of grupper) geo.addGroup(fra, antall, n); geo.computeVertexNormals();
    const nett = [new THREE.Mesh(geo, ST.hoved)]; nett[0].userData.interior = true;
    const lite = (d, mat, orden) => { if (!d.pos.length) return; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2)); const m = new THREE.Mesh(g, mat); m.renderOrder = orden; nett.push(m); return m; };
    lite(V, ST.vindu, 0); lite(SK, ST.skygge, 2); lite(LA, ST.lampe, 3); lite(DA, ST.dag, 3); const ytre = lite(YT, ST.åpning, 0) || null;
    for (const m of nett) R.scene.add(m);
    return { plan: pl, nett, ytre, trekanter: (pos.length + V.pos.length + SK.pos.length + LA.pos.length + DA.pos.length) / 9 };
  }
  function husSide(R, side) { for (const m of R.husMesh || []) for (const mat of [].concat(m.material)) if (mat && mat.side !== side) { mat.side = side; mat.needsUpdate = true; } }
  function fjern(R, P) { const o = aktive.get(P); if (!o) return; for (const m of o.nett) { R.scene.remove(m); m.geometry.dispose(); } delete P.inne; aktive.delete(P); }
  function tøm(R) { for (const P of [...aktive.keys()]) fjern(R, P); forU = null; if (typeof THREE !== 'undefined') husSide(R, THREE.DoubleSide); }
  const avstand = (P, x, y) => { let d = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; d = Math.min(d, Interior.avstSeg(x, y, a[0], a[1], b[0], b[1])); } return Interior.inni(P, x, y) ? 0 : d; };

  function oppdater(R, tving) {
    const u = R.ut;
    if (!R.fot || !u || !u.hus || !R.hindre) { if (aktive.size) tøm(R); return; }
    if (forU !== u) { tøm(R); forU = u; }
    const nå = performance.now(); if (!tving && nå - sist < 250) return; sist = nå;
    const x = R.bane.x, y = R.bane.y;
    for (const [P] of [...aktive]) if (avstand(P, x, y) > BORT) fjern(R, P);
    // lyset følger dagen: utsikten og dagslyset på gulvet etter himmelen, lampene sterkere når det er mørkt
    if (M) { const mørke = window.NATT && typeof NATT.mørke === 'number' ? Math.max(0, Math.min(1, NATT.mørke)) : 0, dag = 1 - mørke;
      M.vindu.opacity = .06 + .1 * mørke; M.dag.color.setScalar(.26 * dag); M.lampe.color.setRGB(.2 + .34 * mørke, .17 + .27 * mørke, .1 + .14 * mørke); }
    // EKTE VINDUER: mens du står inne i et bygg, tegnes husenes yttervegger bare fra utsiden. Da er veggen rundt deg borte sett
    // innenfra, og gjennom hullene i innerveggen ser du landskapet og nabohusene som de er. Ute tegnes veggene fra begge sider som før.
    { const her = inne(x, y); husSide(R, her ? THREE.FrontSide : THREE.DoubleSide); for (const [P, o] of aktive) if (o.ytre) o.ytre.visible = P !== her; }
    // nærmeste bygg uten interiør innen NÆR (rutenettet på 20 m fra hindringer())
    let best = null, bd = NÆR; const sett = new Set();
    for (let a = Math.floor((x - NÆR) / 20); a <= Math.floor((x + NÆR) / 20); a++) for (let c = Math.floor((y - NÆR) / 20); c <= Math.floor((y + NÆR) / 20); c++)
      for (const o of R.hindre.get(a + ',' + c) || []) { const P = o.P; if (!P || sett.has(P) || aktive.has(P) || !P.dør || !P.bygg || P.utenInne) continue; sett.add(P); const d = avstand(P, x, y); if (d < bd) { bd = d; best = P; } }
    if (!best) return;
    if (aktive.size >= MAKS) { let lengst = null, ld = bd; for (const [P] of aktive) { const d = avstand(P, x, y); if (d > ld) { ld = d; lengst = P; } } if (!lengst) return; fjern(R, lengst); }
    let o = null; try { o = bygg(R, u, best); } catch (e) { console.warn('interiør:', e); }
    if (!o) { best.utenInne = true; return; }
    aktive.set(best, o); best.inne = o.plan;
  }
  KROKER.ramme3d.push(R => oppdater(R));
  // Høyden du står på inne og på trappa foran døra (ellers null)
  function høyde(x, y, terreng) { for (const [, o] of aktive) { const h = Interior.høyde(o.plan, x, y, terreng); if (h !== null) return h; } return null; }
  const påTrapp = (x, y) => { for (const [, o] of aktive) if (Interior.påTrapp(o.plan, x, y)) return true; return false; };
  function inne(x, y) { for (const [P] of aktive) if (Interior.inni(P, x, y)) return P; return null; }
  window.Interior3d = { høyde, inne, påTrapp, oppdater: tving => r3() && oppdater(R3, tving), aktive: () => [...aktive.values()], antall: () => aktive.size, deler, STOFFER,
    // til vakten: alle interiørene nå – rom, møbler, trekanter, stoffer i bruk, og om inngangen er fri
    sjekk: () => [...aktive.values()].map(o => ({ kl: o.plan.kl, rom: o.plan.rom.length, møbler: o.plan.møbler.length, trekanter: o.trekanter, nett: o.nett.length, stoffer: o.nett[0].geometry.groups.length, gulv: o.plan.gulv, inngang: o.plan.inngang,
      fri: !Interior.blokkert(o.plan, o.plan.inngang.inn[0], o.plan.inngang.inn[1]) })) };
})();
