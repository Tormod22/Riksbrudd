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
  // BYGGING I BITER (20. nov natt, hakk når du går: ett bygg tok 160–370 ms i ett strekk). Byggingen er en generator (byggG) som
  // gjøres noen millisekunder per bilde i en egen requestAnimationFrame (etter spilløkka, før bildet tegnes). Interiører som du har
  // gått fra (over BORT), hviler en stund uten å bli kastet, så de kommer tilbake straks når du snur. Huset blir likt bit for bit
  // med det som bygges i ett strekk (bygg = byggG kjørt ferdig, som bygOm, vaktene og oppdater(true) bruker).
  // Tallene er Claudes forslag: ms = arbeid per bilde, hvile = hvor mange interiører som hviler (PC/telefon), foran = hvor langt
  // foran deg (i blikkets retning) et hus regnes som nært, så husene du går mot bygges først.
  const BIT = { ms: 6, hvile: 6, hvileMobil: 3, foran: 8 };
  const aktive = new Map(), hvile = new Map();
  let forU = null, sist = 0, M = null, jobb = null, rafNr = 0, versjon = 0, FUNN_GEO = null;
  const STAT = { bygget: 0, biter: 0, lengst: 0, gjenbrukt: 0, kastet: 0, steg: {}, sist: null };
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
  // stoffene lages første gang et interiør bygges – ett mønster per bit (de tegnes i koden og tar litt tid)
  function* stoffeneG() {
    if (M) return M;
    const tex = (navn, n, gjenta) => { const t = new THREE.CanvasTexture(lerret(n, MØNSTER[navn])); if (gjenta) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
    const hoved = [];
    for (const n of STOFFER) { hoved.push(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x201e1b, map: n === 'glatt' ? null : tex(n, 256, true) })); yield 'mønster'; }
    // (et bygg som ble bygget i ett strekk imens, har alt laget dem)
    if (M) { for (const m of hoved) { if (m.map) m.map.dispose(); m.dispose(); } return M; }
    M = { hoved,
      vindu: new THREE.MeshBasicMaterial({ color: 0xdfeaf2, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide, fog: false }),
      skygge: new THREE.MeshBasicMaterial({ map: tex('skygge', 64), transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      lampe: new THREE.MeshBasicMaterial({ map: tex('glød', 64), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, color: 0x6a5a3a }),
      åpning: new THREE.MeshBasicMaterial({ color: 0x15120e, side: THREE.DoubleSide }),
      dag: new THREE.MeshBasicMaterial({ map: M_GLØD(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, color: 0x404040 }) };
    return M;
  }
  // en generator kjørt ferdig i ett strekk
  const iEtt = it => { let r; while (!(r = it.next()).done); return r.value; };
  function stoffene() { return M || iEtt(stoffeneG()); }
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
      // plantebed: karm av planker, jord, og planter i ulik høyde (fast per bed)
      case 'plantebed': k(-b, b, -d, d, 0, h * .8, LYST_TRE); k(-b + .05, b - .05, -d + .05, d - .05, h * .8, h * .86, [.24, .17, .11]);
        for (let i = 0; i < 9; i++) { const px = -b + .2 + (i % 5) * (2 * b - .4) / 4, py = (i < 5 ? -1 : 1) * d * .42, ph = .12 + ((m.f * 7 + i * .37) % 1) * .45;
          k(px - .11, px + .11, py - .11, py + .11, h * .86, h * .86 + ph, i % 4 === 3 ? [.42, .6, .2] : [.2, .5, .18], 'tøy'); } break;
      case 'pall': for (const x of [-b, -.05, b - .1]) t(x, x + .1, -d, d, 0, .1, LYST_TRE); t(-b, b, -d, d, .1, .14, LYST_TRE); { const hh = h * (.6 + m.f * .4);
        k(-b + .03, b - .03, -d + .03, d - .03, .14, hh, [.74, .6, .42], 'tøy'); k(-b + .02, b - .02, -d + .02, d - .02, hh * .45, hh * .5, [.86, .88, .9]); } break;
      // (17. nov: «gjør alt mer detaljert») tre ulike maskiner i stedet for én kloss: dreiebenk, søyleboremaskin og kompressor
      case 'maskin': { const GR = [.2, .4, .34], GR2 = [.26, .48, .4], GUL = [.86, .7, .1], SV = [.12, .14, .16], v = Math.floor(m.f * 3) % 3;
        k(-b, b, -d - .02, d + .02, 0, .04, GUL);
        if (v === 0) { k(-b, -b + .5, -d * .8, d * .8, .04, .8, GR); k(b - .4, b, -d * .8, d * .8, .04, .8, GR); k(-b, b, -d * .7, d * .7, .7, .86, GR2); k(-b + .5, b - .4, -d * .5, d * .5, .1, .16, SV);
          k(-b, -b + .55, -d * .75, d * .6, .86, 1.36, GR2); k(-b + .55, -b + .72, -.16, .16, .96, 1.28, STÅL, 'glatt', true); k(-b + .72, -b + .8, -.06, .06, 1.06, 1.18, SV);
          k(-b + .55, b - .1, -.12, -.06, .86, .92, STÅL); k(-b + .55, b - .1, .06, .12, .86, .92, STÅL); k(-.1, .25, -d * .6, d * .7, .92, 1.0, SV); k(0, .14, -.1, .1, 1.0, 1.14, GR); k(.03, .11, d * .5, d * .8, 1.0, 1.05, STÅL);
          k(b - .45, b - .12, -.16, .16, .92, 1.22, GR2); k(b - .6, b - .45, -.03, .03, 1.09, 1.15, STÅL); k(b - .12, b - .02, -.1, .1, 1.04, 1.24, SV, 'glatt', true);
          k(-b + .08, -b + .46, d * .6, d * .62, .98, 1.3, SV); for (let q = 0; q < 3; q++) k(-b + .14 + q * .11, -b + .2 + q * .11, d * .62, d * .64, 1.2, 1.26, q === 0 ? [.8, .1, .1] : q === 1 ? [.2, .7, .25] : GUL, 'glatt', true);
          k(-b + .1, -b + .3, -d * .75, -d * .5, 1.36, 1.7, SV); k(-b + .18, -b + .22, -d * .62, -d * .6, 1.7, 1.9, STÅL); k(-b + .1, -b + .3, -d * .7, -d * .35, 1.88, 1.96, GUL); }
        else if (v === 1) { k(-.35, .35, -d * .7, d * .7, .04, .12, GR); k(-.07, .07, -d * .5, -d * .5 + .14, .12, h + .1, STÅL, 'glatt', true); k(-.28, .28, -d * .45, d * .35, .82, .88, SV); k(-.2, .2, -d * .3, d * .2, .88, .9, STÅL);
          k(-.2, .2, -d * .65, d * .35, h - .28, h + .12, GR2); k(-.16, .16, -d * .95, -d * .6, h - .2, h + .1, GR, 'glatt', true); k(-.04, .04, d * .0, d * .08, 1.12, h - .28, STÅL, 'glatt', true); k(-.012, .012, d * .03, d * .05, .98, 1.12, SV);
          k(.2, .46, d * .0, d * .04, h - .12, h - .08, SV); k(.44, .5, d * .0, d * .04, h - .16, h - .04, [.8, .1, .1], 'glatt', true); k(-.18, .18, d * .35, d * .37, h - .2, h + .05, SV); k(-.1, -.02, d * .37, d * .39, h - .06, h, [.2, .7, .25], 'glatt', true); k(.02, .1, d * .37, d * .39, h - .06, h, [.8, .1, .1], 'glatt', true);
          k(-.12, .12, -d * .2, d * .1, .9, 1.0, [.42, .3, .2], 'tre'); k(-b * .9, -b * .9 + .5, -d * .6, d * .2, .04, .7, [.72, .14, .12]); for (let q = 0; q < 3; q++) k(-b * .9 + .02, -b * .9 + .48, d * .2, d * .22, .12 + q * .2, .26 + q * .2, [.8, .2, .16]); }
        else { k(-.36, .36, -.36, .36, .16, 1.2, [.7, .16, .12], 'glatt', true); k(-.38, .38, -.38, .38, .3, .34, SV, 'glatt', true); k(-.38, .38, -.38, .38, 1.0, 1.04, SV, 'glatt', true); for (const sx of [-1, 1]) k(sx * .28 - .04, sx * .28 + .04, -.3, .3, .04, .16, SV);
          k(-.26, .1, -.2, .2, 1.2, 1.5, SV); k(.1, .34, -.14, .14, 1.22, 1.46, STÅL, 'glatt', true); k(-.24, .08, -.22, -.2, 1.24, 1.46, GUL); k(-.05, .05, .2, .24, 1.26, 1.36, HVIT, 'glatt', true); k(-.3, -.26, -.03, .03, 1.5, 1.62, STÅL);
          k(.42, b * .95, -d * .7, d * .7, .04, .9, GR); k(.42, b * .95, -d * .7, d * .7, .9, .94, [.5, .4, .28], 'tre'); k(.5, .7, -d * .3, -d * .1, .94, 1.06, [.72, .2, .15]); k(.5, .9, d * .1, d * .5, .94, .98, STÅL); k(.42, .44, d * .7, d * .72, .2, .8, SV);
          k(-b * .95, -.44, -d * .5, d * .5, .04, .5, [.74, .6, .42], 'tøy'); k(-b * .9, -.5, -d * .4, d * .4, .5, .56, [.2, .2, .22], 'glatt', true); }
        break; }
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
      case 'køyeseng': for (const sx of [-1, 1]) for (const sy of [-1, 1]) k(sx * b - (sx > 0 ? .06 : 0), sx * b + (sx > 0 ? 0 : .06), sy * d - (sy > 0 ? .06 : 0), sy * d + (sy > 0 ? 0 : .06), 0, h, [.3, .34, .3]);
        for (const z of [.35, 1.15]) { k(-b, b, -d, d, z, z + .06, [.3, .34, .3]); k(-b + .04, b - .04, -d + .06, d - .04, z + .06, z + .2, [.93, .93, .9]); s(-b + .03, b - .03, -d + .7, d - .03, z + .2, z + .27, z > 1 ? f2 : f); s(-.28, .28, -d + .12, -d + .5, z + .2, z + .3, [.95, .95, .93]); }
        k(b - .05, b, -d + .2, -d + .26, .4, h, [.3, .34, .3]); break;
      case 'ovn': k(-b * .8, b * .8, -d * .8, d * .8, .12, h, [.12, .12, .13]); bein(.12, MØRK, .05); k(-b * .5, b * .5, d * .8, d * .82, .35, .7, [.9, .45, .12]); k(-.07, .07, -d * .5, -d * .2, h, 2.5, [.2, .2, .21], 'glatt', true); break;
      case 'kartbord': t(-b, b, -d, d, h - .06, h, [.42, .32, .22]); bein(h - .06, [.3, .22, .15], .09, 'tre'); k(-b + .15, b - .15, -d + .12, d - .12, h, h + .006, [.78, .8, .7]); k(-b * .5, -b * .1, -d * .4, d * .1, h + .006, h + .01, [.55, .66, .5]);
        k(b * .1, b * .55, -d * .2, d * .45, h + .006, h + .01, [.6, .68, .76]); for (const [x, y, c] of [[-.5, .2, [.2, .35, .7]], [.3, -.2, [.75, .2, .15]], [.7, .3, [.2, .55, .25]]]) k(x - .04, x + .04, y - .04, y + .04, h + .01, h + .07, c, 'glatt', true);
        k(b - .5, b - .2, d - .4, d - .15, h, h + .12, MØRK); break;
      case 'radio': k(-b, b, -d, d, 0, .8, [.26, .3, .26]); k(-b, b, -d, d, .8, h, [.2, .24, .2]); for (let i = 0; i < 4; i++) k(-b + .1 + i * .26, -b + .16 + i * .26, d, d + .02, .95, 1.01, i % 2 ? [.8, .2, .15] : [.3, .8, .35], 'glatt', true);
        k(-b + .1, b * .1, d, d + .012, 1.08, 1.22, [.12, .2, .16]); k(b - .08, b - .05, -.03, 0, h, h + 1.1, STÅL); k(b * .3, b * .8, d, d + .03, .3, .6, MØRK); break;
      case 'langbord': t(-b, b, -d, d, h - .05, h, LYST_TRE); bein(h - .05, LYST_TRE, .07, 'tre'); for (const sy of [-1, 1]) { t(-b + .1, b - .1, sy * (d + .38) - .15, sy * (d + .38) + .15, .42, .46, LYST_TRE); for (const x of [-b + .25, b - .31]) t(x, x + .06, sy * (d + .38) - .13, sy * (d + .38) + .13, 0, .42, LYST_TRE); }
        for (const x of [-b * .5, 0, b * .5]) k(x - .1, x + .1, -.1, .1, h, h + .015, HVIT, 'glatt', true); break;
      default: k(-b, b, -d, d, 0, h, GRÅ);
    }
    // SMÅTING (17. nov, brukeren: «forbedre innsiden av bygg enda mer»): ting som står på bord og benker – tallerkener, kopper, bøker,
    // ark, kjeler, lamper. Fast per møbel (m.f), så samme hus ser likt ut hver gang. De sperrer ikke og er bare klosser i samme nett.
    { const r = n => { const v = Math.sin((m.f + 1.3) * (n + 1) * 91.7) * 43758.5; return v - Math.floor(v); }, hv = [.95, .95, .93];
      const tallerken = (x, y) => k(x - .11, x + .11, y - .11, y + .11, h, h + .015, hv, 'glatt', true), kopp = (x, y, c = [.82, .3, .25]) => k(x - .04, x + .04, y - .04, y + .04, h, h + .09, c, 'glatt', true);
      const bok = (x, y, n = 1) => { for (let q = 0; q < n; q++) k(x - .1 + q * .01, x + .1 + q * .01, y - .07, y + .07, h + q * .03, h + q * .03 + .028, TØY[Math.floor(r(20 + q) * TØY.length)]); }, ark = (x, y) => k(x - .105, x + .105, y - .15, y + .15, h, h + .004, hv);
      const lampe = (x, y, c = [.95, .86, .55]) => { k(x - .05, x + .05, y - .05, y + .05, h, h + .03, MØRK, 'glatt', true); k(x - .012, x + .012, y - .012, y + .012, h + .03, h + .26, MØRK); k(x - .1, x + .1, y - .1, y + .1, h + .24, h + .4, c, 'tøy', true); };
      switch (m.type) {
        case 'spisebord': case 'langbord': { const n = Math.max(2, Math.min(8, Math.round(m.b / .7))); for (let q = 0; q < n; q++) { const x = -b + (q + .5) * m.b / n; for (const sy of [-1, 1]) if (r(q * 2 + sy + 9) < .6) { tallerken(x, sy * (d - .2)); if (r(q + sy + 30) < .5) kopp(x + .16, sy * (d - .22)); } }
          if (r(50) < .6) { k(-.08, .08, -.08, .08, h, h + .13, [.3, .5, .62], 'glatt', true); k(-.02, .02, -.02, .02, h + .13, h + .3, [.3, .55, .25]); } break; }
        case 'salongbord': if (r(1) < .8) bok(-b * .4, 0, 1 + Math.floor(r(2) * 3)); if (r(3) < .6) kopp(b * .4, d * .3); if (r(4) < .5) k(b * .1, b * .1 + .15, -d * .5, -d * .5 + .045, h, h + .02, MØRK); break;
        case 'pult': case 'kateter': ark(-b * .3, 0); if (r(1) < .7) ark(-b * .3 + .2, .05); if (r(2) < .7) kopp(b * .5, -d * .45, [.2, .35, .6]); if (r(3) < .6) bok(b * .15, d * .35, 2); if (r(4) < .55) lampe(-b * .75, -d * .5); break;
        case 'skolepult': if (r(1) < .6) ark(0, d * .3); if (r(2) < .4) bok(b * .4, d * .4, 1); break;
        case 'kjøkkenbenk': { let x = -b + .2; for (let q = 0; q < 6 && x < b - .15; q++) { const v = r(q + 3);
            if (v < .25) { k(x - .09, x + .09, -d + .12, -d + .3, h, h + .16, [.75, .76, .78], 'glatt', true); k(x - .11, x + .11, -d + .19, -d + .23, h + .1, h + .13, MØRK); }          // kjele
            else if (v < .45) k(x - .16, x + .16, -d + .1, -d + .34, h, h + .02, [.7, .52, .32], 'tre');                                                                  // skjærefjøl
            else if (v < .65) for (let j = 0; j < 3; j++) k(x - .12 + j * .09, x - .05 + j * .09, -d + .08, -d + .15, h, h + .11 + j * .03, [.8, .7 - j * .15, .3 + j * .1], 'glatt', true);   // krukker
            else if (v < .78) { k(x - .1, x + .1, -d + .08, -d + .26, h, h + .2, hv); k(x - .07, x + .07, -d + .26, -d + .27, h + .04, h + .16, MØRK); }                   // brødrister/mikro
            x += .35 + r(q + 12) * .5; } break; }
        case 'komfyr': if (r(1) < .6) { k(-b * .4 - .1, -b * .4 + .1, -.02, .18, h, h + .12, [.2, .2, .22], 'glatt', true); k(-b * .4 + .1, -b * .4 + .26, .06, .1, h + .08, h + .1, MØRK); } break;
        case 'nattbord': if (r(1) < .75) lampe(0, -d * .2, [.9, .8, .6]); if (r(2) < .5) bok(b * .3, d * .4, 1); break;
        case 'tvbenk': if (r(1) < .7) k(b * .5, b * .5 + .22, -.12, .1, h, h + .06, MØRK); if (r(2) < .5) bok(-b * .75, 0, 2); break;
        case 'arbeidsbenk': k(-b * .7, -b * .7 + .34, -d * .3, -d * .3 + .18, h, h + .16, [.72, .14, .12]); for (let q = 0; q < 4; q++) if (r(q + 5) < .7) k(-b * .2 + q * .28, -b * .2 + q * .28 + .22, d * .2 - q * .05, d * .2 - q * .05 + .035, h, h + .025, q % 2 ? STÅL : MØRK); if (r(11) < .6) kopp(b * .8, -d * .4, [.9, .8, .2]); break;
        case 'skranke': k(-b * .3, -b * .3 + .32, -d * .3, d * .2, h, h + .2, MØRK); k(-b * .3 + .04, -b * .3 + .28, d * .2, d * .2 + .02, h + .2, h + .42, [.15, .2, .25]); if (r(1) < .7) ark(b * .4, 0); break;
        case 'vask': k(-b * .8, b * .8, -d - .005, -d + .015, 1.25, 1.85, [.72, .84, .9]); k(-b * .85, b * .85, -d - .006, -d + .01, 1.22, 1.88, hv); k(b * .5, b * .5 + .06, -d * .5, -d * .5 + .06, h, h + .12, [.3, .6, .5], 'glatt', true); break;
        case 'toalett': k(-b - .16, -b - .04, -d + .02, -d + .12, .6, .72, hv, 'glatt', true); break;
        case 'skohylle': for (let q = 0; q < 3; q++) if (r(q) < .8) for (const dy of [-.07, .07]) k(-b + .1 + q * .28, -b + .19 + q * .28, dy - .05 + d * .1, dy + .05 + d * .1, .19, .28, q % 2 ? [.3, .2, .14] : MØRK); break;
      } }
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
      case 'brakke': S.gulv = ['parkett', [.62, .52, .38]]; S.vegg = ['panel', [.78, .76, .62]]; break;
      case 'kontrollrom': S.gulv = ['betong', [.5, .54, .56]]; S.vegg = ['malt', [.86, .88, .86]]; S.lampe = 2; break;
      case 'drivhus': S.gulv = ['betong', [.5, .46, .4]]; S.vegg = ['malt', [.86, .92, .9]]; break;
      case 'storkjøkken': S.gulv = ['flis', [.8, .78, .72]]; S.vegg = ['malt', [.95, .93, .86]]; break;
      case 'gang': if (kl === 'skole') { S.gulv = ['betong', [.66, .72, .62]]; S.vegg = ['malt', [.95, .92, .8]]; } break;
    }
    if (kl === 'sykehus' && r.rolle !== 'sykerom') { S.gulv = ['betong', [.74, .8, .78]]; S.vegg = ['malt', [.92, .96, .94]]; }
    if (kl === 'hytte' && r.rolle !== 'bad') S.vegg = ['panel', [.86, .7, .48]];
    return S;
  }

  // Bygger interiøret i P og gir { plan, nett, ytre, funn, trekanter } – nettene er IKKE lagt i scenen (legg() gjør det).
  // yield mellom stegene (navnet på steget, så målingen ser hvilket steg som er lengst); ingenting fra three.js lages før siste steg
  // utenom stoffene, så en jobb som avbrytes, etterlater ingenting.
  function bygg(R, u, P) { return iEtt(byggG(R, u, P)); }
  function* byggG(R, u, P) {
    const terr = (x, y) => (hoyde3d(u.cx + x, u.cy + y, u) - u.h0) * R.EX, D = P.dør;
    // døra må ligge på omrisset (saltakshus tegnes som et rettet rektangel): flytt den til nærmeste kant
    let best = null; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1.4) continue;
      const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L, w = Math.min(D.w, L * .7), t = Math.max(w / 2 + .1, Math.min(L - w / 2 - .1, (D.x - a[0]) * ex + (D.y - a[1]) * ey)), x = a[0] + ex * t, y = a[1] + ey * t, av = Math.hypot(x - D.x, y - D.y);
      if (!best || av < best.av) best = { av, x, y, ux: ex, uy: ey, w }; }
    if (!best) return null;
    if (!M) yield* stoffeneG();
    yield 'start';
    // planen i biter (Interior.planG), ellers i ett strekk
    const info = { i: P.bygg.i, kl: P.bygg.kl, h: P.bygg.h, dør: best, senger: P.bygg.senger }, pl = Interior.planG ? yield* Interior.planG(P, info) : Interior.plan(P, info);
    yield 'plan';
    // (18. nov kveld) krokene får planen før den bygges: møbler som er flyttet (spill/mobler-visning.js) tas ut eller settes inn her
    for (const f of window.INTERIOR_PLAN || []) { try { f(pl, P, u); } catch (e) { console.warn('interiør-krok:', e); } }
    yield 'kroker';
    const I = pl.inngang, A = pl.akse;
    let maks = -Infinity, mx = 0, my = 0; for (const [x, y] of P) { maks = Math.max(maks, terr(x, y)); mx += x; my += y; } maks = Math.max(maks, terr(mx / P.length, my / P.length));
    // gulvet ligger over det høyeste terrenget under bygget (ellers stikker bakken opp gjennom gulvet); trappa foran døra er lang nok
    // til at du kan gå opp (høyst 0,6 m stigning per meter), og høyst 3,5 m høy
    const ute0 = terr(I.x + I.nx * 1.5, I.y + I.ny * 1.5); pl.gulv = P.gulvFast !== undefined ? Math.max(P.gulvFast, Math.min(maks + .06, (P.veggTopp || P.gulvFast + 2.6) - 2)) : Math.min(Math.max(maks + .08, D.z0 + .05), ute0 + 3.5);
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
    // firkant med én farge (f ganget med sk) som to trekanter – det fk(g, a, b, c, d, mørk(f, sk), uv) gjorde, uten tabeller
    const firkant = (g, x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, f, sk, u1, v1, u2, v2, u3, v3, u4, v4) => { const r = f[0] * sk, gr = f[1] * sk, b = f[2] * sk;
      g.pos.push(x1, y1, z1, x2, y2, z2, x3, y3, z3, x1, y1, z1, x3, y3, z3, x4, y4, z4); g.kol.push(r, gr, b, r, gr, b, r, gr, b, r, gr, b, r, gr, b, r, gr, b); g.uv.push(u1, v1, u2, v2, u3, v3, u1, v1, u3, v3, u4, v4); };
    // en kasse i møbelets akser: midt (x, y), retning a, sidene litt mørkere enn toppen
    const kasse = (x, y, a, [x0, x1, y0, y1, z0, z1, f, st = 'glatt', rund = false]) => {
      // hvitmalt tre har ingen synlige årer
      if (st === 'tre' && f[0] > .84 && f[2] > .84) st = 'malt';
      const c = Math.cos(a), s = Math.sin(a), g = G[NR[st]], m = METER[st];
      if (rund) { const p = (lx, ly, z) => [x + lx * c - ly * s, y + lx * s + ly * c, g0 + z], cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2, n = 8, T = p(cx, cy, z1);
        for (let i = 0; i < n; i++) { const v0 = i / n * 6.2832, v1 = (i + 1) / n * 6.2832, a0 = [cx + Math.cos(v0) * rx, cy + Math.sin(v0) * ry], a1 = [cx + Math.cos(v1) * rx, cy + Math.sin(v1) * ry], sk = .78 + .2 * Math.abs(Math.cos(v0 + .6));
          fk(g, p(a0[0], a0[1], z0), p(a1[0], a1[1], z0), p(a1[0], a1[1], z1), p(a0[0], a0[1], z1), mørk(f, sk), UV0); tri(g, T, p(a0[0], a0[1], z1), p(a1[0], a1[1], z1), f, f, f, [.5, .5], [0, 0], [1, 0]); } return; }
      // (20. nov natt, søppeltømming) kassen uten mellomtabeller: de samme tallene i samme rekkefølge som p/flate/fk/tri ga før
      // (hjørnene A = (x0, y0), B = (x1, y0), C = (x1, y1), D = (x0, y1); zA nede, zB oppe; fargen = mørk(f, sk), uv = mål / m)
      const ax = x + x0 * c - y0 * s, ay = y + x0 * s + y0 * c, bx = x + x1 * c - y0 * s, by = y + x1 * s + y0 * c, cx = x + x1 * c - y1 * s, cy = y + x1 * s + y1 * c,
        dx = x + x0 * c - y1 * s, dy = y + x0 * s + y1 * c, zA = g0 + z0, zB = g0 + z1, X0 = x0 / m, X1 = x1 / m, Y0 = y0 / m, Y1 = y1 / m, Z0 = z0 / m, Z1 = z1 / m;
      firkant(g, ax, ay, zB, bx, by, zB, cx, cy, zB, dx, dy, zB, f, 1, X0, Y0, X1, Y0, X1, Y1, X0, Y1);
      firkant(g, ax, ay, zA, bx, by, zA, bx, by, zB, ax, ay, zB, f, .8, X0, Z0, X1, Z0, X1, Z1, X0, Z1);
      firkant(g, bx, by, zA, cx, cy, zA, cx, cy, zB, bx, by, zB, f, .9, Y0, Z0, Y1, Z0, Y1, Z1, Y0, Z1);
      firkant(g, cx, cy, zA, dx, dy, zA, dx, dy, zB, cx, cy, zB, f, .86, X1, Z0, X0, Z0, X0, Z1, X1, Z1);
      firkant(g, dx, dy, zA, ax, ay, zA, ax, ay, zB, dx, dy, zB, f, .93, Y1, Z0, Y0, Z0, Y0, Z1, Y1, Z1);
      if (z0 > .3) firkant(g, ax, ay, zA, bx, by, zA, cx, cy, zA, dx, dy, zA, f, .6, X0, Y0, X1, Y0, X1, Y1, X0, Y1);
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
    for (const r of pl.rom) { yield 'gulv'; let S = klipp(klipp(klipp(klipp(Puv, 0, r.u0, true), 0, r.u1, false), 1, r.v0, true), 1, r.v1, false); if (S.length < 3) continue;
      const [st, f] = stiler.get(r).gulv, g = G[NR[st]], m = METER[st] * (st === 'flis' && (r.rolle === 'butikk' || r.rolle === 'terminal') ? 1.6 : 1); let T;
      try { T = THREE.ShapeUtils.triangulateShape(S.map(p => new THREE.Vector2(p[0], p[1])), []); } catch (e) { continue; }
      const xy = p => [p[0] * A.ux + p[1] * A.vx, p[0] * A.uy + p[1] * A.vy, g0];
      for (const [a, b, c] of T) tri(g, xy(S[a]), xy(S[b]), xy(S[c]), f, f, f, [S[a][0] / m, S[a][1] / m], [S[b][0] / m, S[b][1] / m], [S[c][0] / m, S[c][1] / m]); }
    // himlingen
    { const T = THREE.ShapeUtils.triangulateShape(P.map(p => new THREE.Vector2(p[0], p[1])), []), g = G[NR.malt], f = kl === 'låve' || kl === 'uthus' ? [.5, .4, .3] : [.96, .96, .94];
      for (const [a, b, c] of T) tri(g, [P[a][0], P[a][1], g0 + tak], [P[c][0], P[c][1], g0 + tak], [P[b][0], P[b][1], g0 + tak], f, f, f, [P[a][0] / 2, P[a][1] / 2], [P[c][0] / 2, P[c][1] / 2], [P[b][0] / 2, P[b][1] / 2]); }

    // ytterveggenes innside (3 cm innenfor veggen), delt der skilleveggene møter dem, med åpning ved inngangen og vinduer
    const dørH = Math.min(tak - .1, Math.max(2, D.hh || 2.1)), ender = pl.vegger.flatMap(v => [[v.ax, v.ay], [v.bx, v.by]]), dagslys = kl !== 'låve';
    yield 'himling';
    for (let i = 0; i < P.length; i++) { yield 'yttervegg'; const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < .05) continue;
      const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L, nx = -ey, ny = ex, pt = (t, inn) => [a[0] + ex * t + nx * inn, a[1] + ey * t + ny * inn];
      // taklist langs ytterveggene i boliger, kontorer og hytter (gir rommene en avslutning mot taket)
      if (/^(hus|leil|kontor|hytte|skole|sykehus)$/.test(kl) && L > .6) { const tm = pt(L / 2, .055); kasse(tm[0], tm[1], Math.atan2(ey, ex), [-L / 2 + .03, L / 2 - .03, -.025, .025, tak - .07, tak - .002, [.96, .96, .94]]); }
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
        if (!P.leir && /^(hus|leil|hytte)$/.test(kl)) { const sk = pt(td + I.w / 2 + .25, .28); for (const dx of [-.07, .07]) kasse(sk[0], sk[1], va + hash(pl.i, 61) * .5, [dx - .05, dx + .05, -.13, .13, 0, .09, hash(pl.i, 62) > .5 ? [.25, .17, .12] : MØRK]);
          if (hash(pl.i, 63) < .6) { const vk = pt(td - I.w / 2 - .3, .3); kasse(vk[0], vk[1], va, [-.2, .2, -.1, .1, 0, .3, TØY[Math.floor(hash(pl.i, 64) * TØY.length)], 'tøy']); kasse(vk[0], vk[1], va, [-.12, .12, -.02, .02, .3, .42, MØRK]); } }
      }
      const z0 = vz0, z1 = vz1;
      for (const t of vinduer) { yield 'vindu';
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
        // radiator under vinduet i boliger, kontorer, skoler og sykehus (ikke på badet)
        if (z0 >= .8 && !butikk && !kirke && rolle !== 'bad' && /^(hus|leil|kontor|skole|sykehus|hytte)$/.test(kl)) { const rc = pt(t, .1), rb = Math.min(kb * .85, .5);
          kasse(rc[0], rc[1], va, [-rb, rb, -.03, .04, .14, z0 - .2, [.93, .93, .91]]); for (let q = -rb + .06; q < rb; q += .09) kasse(rc[0], rc[1], va, [q, q + .02, .04, .05, .16, z0 - .22, [.78, .78, .77]]); }
        if (dagslys) { const dc = pt(t, 1.05); flekk(DA, dc[0], dc[1], va, bw / 2 + .5, 1.15, .022); }
      }
    }
    // skilleveggene: 10 cm tykke, hver side i sitt roms farge, og bilder på noen av dem
    for (const [vn, v] of pl.vegger.entries()) { yield 'skillevegg'; const L = Math.hypot(v.bx - v.ax, v.by - v.ay); if (L < .05) continue; const ex = (v.bx - v.ax) / L, ey = (v.by - v.ay) / L, nx = -ey, ny = ex, va = Math.atan2(ey, ex);
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
    for (const [dn, d] of pl.dører.entries()) { yield 'dør'; const [x, y, ex, ey, w] = d, va = Math.atan2(ey, ex), nx = -ey, ny = ex, H = Math.min(2.05, tak - .15);
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
    for (const m of pl.møbler) { yield 'møbel'; let nK = 0; for (const K of deler(m)) { kasse(m.x, m.y, m.a, K); if (++nK % 48 === 0) yield 'møbeldel'; }
      if (m.h > .15 && m.type !== 'tavle' && m.type !== 'knagger') blob(m.x, m.y, m.a, m.b / 2 + .22, m.d / 2 + .22);
      if (m.type === 'salongbord') { const tf = TØY[Math.floor(hash(pl.i, 41) * TØY.length)], tw = Math.min(1.1, m.b / 2 + .5), td2 = .8;
        kasse(m.x, m.y, m.a, [-tw, tw, -td2, td2, .004, .014, tf, 'tøy']); kasse(m.x, m.y, m.a, [-tw + .12, tw - .12, -td2 + .12, td2 - .12, .014, .017, mørk(tf, 1.25), 'tøy']); } }
    // FORLATT (17. nov): spor etter at folk dro – ark og esker på gulvet og en mørk flekk her og der. Fast per bygg og rom; ikke i leiren din.
    if (!P.leir) for (const [n, r] of pl.rom.entries()) { yield 'forlatt'; if (r.andel < .6 || r.areal < 5) continue; const rh = q => hash(pl.i, 700 + n * 17 + q);
      const punkt = q => { for (let f = 0; f < 6; f++) { const pu = r.u0 + .5 + rh(q * 7 + f) * Math.max(.1, r.u1 - r.u0 - 1), pv = r.v0 + .5 + rh(q * 7 + f + 3) * Math.max(.1, r.v1 - r.v0 - 1), x = pu * A.ux + pv * A.vx, y = pu * A.uy + pv * A.vy; if (Interior.inni(P, x, y) && Interior.avstKant(P, x, y) > .4 && !Interior.blokkert(pl, x, y)) return [x, y]; } return null; };
      const papir = /kontor|klasserom|stue|gang|resepsjon|butikk/.test(r.rolle) ? 2 + Math.floor(rh(1) * 4) : rh(1) < .4 ? 1 : 0;
      for (let q = 0; q < papir; q++) { const p = punkt(q); if (p) kasse(p[0], p[1], rh(40 + q) * 6.28, [-.105, .105, -.15, .15, .003, .006, [.93, .92, .88]]); }
      if (rh(2) < .5) { const p = punkt(11); if (p) blob(p[0], p[1], rh(3) * 6.28, .5 + rh(4) * .6, .35 + rh(5) * .5, .008); }
      const esker = /stue|soverom|bod|lager|kontor|garasje|verksted/.test(r.rolle) ? Math.floor(rh(6) * 3) : 0;
      for (let q = 0; q < esker; q++) { const p = punkt(20 + q); if (!p) continue; const e = .2 + rh(60 + q) * .15, v = rh(50 + q) * 6.28; kasse(p[0], p[1], v, [-e, e, -e * .8, e * .8, 0, e * 1.3, [.66, .52, .36], 'tøy']); kasse(p[0], p[1], v, [-e, e, -.025, .025, e * 1.3, e * 1.3 + .004, [.82, .72, .52]]); blob(p[0], p[1], v, e + .12, e * .8 + .12); } }
    // takbjelker i hytter, låver og uthus (rom som er hele firkanter)
    if (/^(hytte|låve|uthus)$/.test(kl)) for (const r of pl.rom) { if (r.andel < .97) continue; const lv = r.v1 - r.v0, vb = Math.atan2(A.vy, A.vx);
      for (let pu = r.u0 + .8; pu < r.u1 - .4; pu += 1.5) { const pv = (r.v0 + r.v1) / 2; kasse(pu * A.ux + pv * A.vx, pu * A.uy + pv * A.vy, vb, [-lv / 2 + .04, lv / 2 - .04, -.06, .06, tak - .17, tak - .005, [.36, .26, .17], 'tre']); } }
    // taklamper: én midt i hvert rom (haller: lysrør i rekker), med varmt lys på gulvet under
    yield 'bjelker';
    for (const r of pl.rom) { yield 'lampe'; if (r.andel < .5) continue; const S = stiler.get(r), lu = r.u1 - r.u0, lv = r.v1 - r.v0, sted = [];
      if (S.lampe === 2) { for (let pu = r.u0 + 3; pu < r.u1 - 1.5; pu += 6) for (let pv = r.v0 + 3; pv < r.v1 - 1.5; pv += 6) sted.push([pu, pv]); if (!sted.length) sted.push([(r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2]); }
      else sted.push([(r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2]);
      for (const [pu, pv] of sted) { const x = pu * A.ux + pv * A.vx, y = pu * A.uy + pv * A.vy; if (!Interior.inni(P, x, y) || Interior.avstKant(P, x, y) < .5) continue; const va = Math.atan2(A.uy, A.ux);
        if (S.lampe === 2) { kasse(x, y, va, [-.75, .75, -.09, .09, tak - .12, tak - .05, [1, 1, .96]]); kasse(x, y, va, [-.8, .8, -.12, .12, tak - .05, tak, STÅL]); flekk(LA, x, y, va, 3.4, 3.4, .024); }
        else if (tak > 2.9) { kasse(x, y, va, [-.012, .012, -.012, .012, tak - .6, tak, MØRK]); kasse(x, y, va, [-.2, .2, -.2, .2, tak - .85, tak - .6, [1, .95, .8], 'glatt', true]); flekk(LA, x, y, va, Math.min(2.4, lu * .55), Math.min(2.4, lv * .55), .024); }
        else { kasse(x, y, va, [-.19, .19, -.19, .19, tak - .09, tak - .01, [1, .97, .86], 'glatt', true]); kasse(x, y, va, [-.21, .21, -.21, .21, tak - .02, tak, STÅL, 'glatt', true]); flekk(LA, x, y, va, Math.min(2.2, lu * .55), Math.min(2.2, lv * .55), .024); } } }

    yield 'sett sammen';
    // sett sammen: hovednettet med en gruppe per stoff (rett i tallrekker – samme tall som før)
    let nPos = 0, nUv = 0; for (const g of G) { nPos += g.pos.length; nUv += g.uv.length; }
    const pos = new Float32Array(nPos), kol = new Float32Array(nPos), uv = new Float32Array(nUv), grupper = [];
    { let o3 = 0, o2 = 0; for (const [n, g] of G.entries()) { if (!g.pos.length) continue; grupper.push([o3 / 3, g.pos.length / 3, n]); pos.set(g.pos, o3); kol.set(g.kol, o3); uv.set(g.uv, o2); o3 += g.pos.length; o2 += g.uv.length; yield 'tallrekker'; } }
    const ST = stoffene(), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(kol, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    for (const [fra, antall, n] of grupper) geo.addGroup(fra, antall, n);
    yield 'normaler';
    // normalene i biter (normalerG i index.html = three.js sin computeVertexNormals, bit for bit – vakta lys sjekker det)
    if (typeof normalerG === 'function') { for (const v of normalerG(geo)) yield v || 'normaler'; } else geo.computeVertexNormals();
    const nett = [new THREE.Mesh(geo, ST.hoved)]; nett[0].userData.interior = true;
    const lite = (d, mat, orden) => { if (!d.pos.length) return; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2)); const m = new THREE.Mesh(g, mat); m.renderOrder = orden; nett.push(m); return m; };
    lite(V, ST.vindu, 0); lite(SK, ST.skygge, 2); lite(LA, ST.lampe, 3); lite(DA, ST.dag, 3); const ytre = lite(YT, ST.åpning, 0) || null;
    // FORSYNINGSKASSA: i hus som kan gjennomsøkes, står en kasse innenfor døra til huset er gjennomsøkt (o.funn skjules da i oppdater()).
    // Kassa er lik i alle hus: én geometri (FUNN_GEO) som deles, flyttet og dreid med nettets plass.
    let funn = null;
    if (!P.leir && window.MODELLER) { const d = FUNN_GEO ? null : [], b3 = (x, y, z, sx, sy, sz, c) => { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); g.translate(x, y, z + sz / 2); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let q = 0; q < n; q++) f.set(c, q * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); }, gr = [.3, .36, .24];
      if (d) { b3(0, 0, 0, .62, .4, .3, gr); b3(0, 0, .3, .66, .44, .05, [.24, .29, .19]); for (const sx of [-.24, .24]) b3(sx, 0, .02, .05, .42, .3, [.18, .2, .15]); b3(0, .205, .12, .22, .01, .1, [.85, .8, .6]); for (const sx of [-.33, .33]) b3(sx, 0, .16, .03, .16, .03, [.12, .12, .12]);
      b3(.5, .1, 0, .2, .2, .22, [.66, .52, .36]); b3(-.48, -.05, 0, .12, .12, .16, [.75, .76, .78]); FUNN_GEO = MODELLER.samle(d); for (const g of d) g.dispose(); }
      const side = hash(pl.i, 77) > .5 ? 1 : -1, fx = I.inn[0] - I.nx * 1.1 + I.ny * side * .9, fy = I.inn[1] - I.ny * 1.1 - I.nx * side * .9, ok = Interior.inni(P, fx, fy) && Interior.avstKant(P, fx, fy) > .35, x = ok ? fx : I.inn[0] - I.nx * .9, y = ok ? fy : I.inn[1] - I.ny * .9;
      if (!STfunn) STfunn = new THREE.MeshLambertMaterial({ vertexColors: true }); funn = new THREE.Mesh(FUNN_GEO, STfunn); funn.userData.delt = true; funn.position.set(x, y, g0); funn.rotation.z = hash(pl.i, 78) * 6.28; nett.push(funn); }
    for (const m of nett) m.userData.kilde = 'interior3d';
    return { plan: pl, nett, ytre, funn, trekanter: (pos.length + V.pos.length + SK.pos.length + LA.pos.length + DA.pos.length) / 9 };
  }
  let skjultId = -1;
  function modellSynlig(R, id) { if (id === skjultId && id < 0) return; for (const m of R.scene.children) if (m.userData && !m.userData.plan && (m.userData.id === skjultId || m.userData.id === id)) m.visible = m.userData.id !== id; skjultId = id; }
  function husSide(R, side) { for (const m of R.husMesh || []) for (const mat of [].concat(m.material)) if (mat && mat.side !== side) { mat.side = side; mat.needsUpdate = true; } }
  let STfunn = null;
  // frigjør nettene i et interiør (kassa deler geometri med de andre – den frigjøres i tøm)
  function kast(o) { for (const m of o.nett) if (!m.userData.delt) m.geometry.dispose(); STAT.kastet++; }
  // legg et ferdig interiør i scenen
  function legg(R, P, o) { for (const m of o.nett) R.scene.add(m); aktive.set(P, o); P.inne = o.plan; }
  // ta interiøret ut av scenen; hvil = la det hvile (ikke frigjort), så det kan settes inn igjen straks når du kommer tilbake
  function fjern(R, P, hvil) { const o = aktive.get(P); if (!o) return; for (const m of o.nett) R.scene.remove(m); delete P.inne; aktive.delete(P);
    if (!hvil) { kast(o); return; }
    hvile.delete(P); hvile.set(P, { o, versjon });
    const maks = typeof VW !== 'undefined' && VW < 900 ? BIT.hvileMobil : BIT.hvile;
    while (hvile.size > maks) { const [eldst, h] = hvile.entries().next().value; hvile.delete(eldst); kast(h.o); } }
  function glemHvile() { for (const [, h] of hvile) kast(h.o); hvile.clear(); }
  function tøm(R) { for (const P of [...aktive.keys()]) fjern(R, P); glemHvile(); jobb = null; if (FUNN_GEO) { FUNN_GEO.dispose(); FUNN_GEO = null; }
    forU = null; if (typeof THREE !== 'undefined') husSide(R, THREE.DoubleSide); if (R.scene) modellSynlig(R, -1); }
  const avstand = (P, x, y) => { let d = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; d = Math.min(d, Interior.avstSeg(x, y, a[0], a[1], b[0], b[1])); } return Interior.inni(P, x, y) ? 0 : d; };

  // LEIRENS EGNE BYGG (16. nov: «alle bygg skal ha interiør» gjelder også leiren): brakka, kontrollrommet, sykestua, kjøkkenet,
  // verkstedet og lagerteltet.
  // Modellene (spill/modeller.js) tegnes bare utenfra, så veggene er borte sett innenfra. Her får hvert ferdige bygg et omriss
  // (kroppen av modellen, uten trapp og utstikk), en dør der modellen har sin, og et fast gulv oppå grunnmuren. Omrisset legges i
  // R.hindre, så byggene også stopper deg når du går mot veggen.
  // per type: kroppen i modellens akser [x0, x1, y0, y1], døra (midt, på +x-veggen), bredden, grunnmurens høyde og vegghøyden
  const LEIRBYGG = { brakke: { kl: 'brakke', r: [-3, 3, -6, 6], dør: [3, 0], w: 1, s: .45, H: 2.6 }, kontrollrom: { kl: 'kontrollrom', r: [-4.5, 4.5, -6, 6], dør: [4.5, 0], w: 1.2, s: .4, H: 2.7 },
    sykestue: { kl: 'sykehus', r: [-3.5, 3.5, -5.5, 5.5], dør: [3.5, .4], w: 1.4, s: .45, H: 2.8 }, kjøkken: { kl: 'storkjøkken', r: [-3.2, 2.4, -4.2, 4.2], dør: [2.4, -1.3], w: 1, s: .25, H: 2.6 },
    // verkstedet har sidedøra på +y-veggen (portene er stengt), lagerteltet åpningen i +x-enden (teltduken skrår, så rommet er litt smalere)
    verksted: { kl: 'industri', r: [-6, 6, -7, 7], dør: [4, 7], side: 'y+', w: 1, s: .15, H: 5.3 }, lagertelt: { kl: 'lager', r: [-4, 4, -2.25, 2.25], dør: [4, 0], w: 1.7, s: 0, H: 1.9 },
    // containeren har dørene i +x-enden, drivhuset får inngang i +y-gavlen
    container: { kl: 'lager', r: [-3.03, 3.03, -1.22, 1.22], dør: [3.03, 0], w: 1.4, s: .16, H: 2.4, skjul: true }, drivhus: { kl: 'drivhus', r: [-2.9, 2.9, -4.9, 4.9], dør: [0, 4.9], side: 'y+', w: 1.1, s: .3, H: 2.4, skjul: true } };
  let egne = [], egneNøkkel = '', egneHindre = null;
  function leirbygg(R, u) {
    const L = window.LeirSpill && LeirSpill.tilstand(), liste = L && window.Leir ? L.bygg.filter(b => LEIRBYGG[b.type] && Leir.ferdig(b)) : [];
    const nøkkel = liste.map(b => [b.id, Math.round(b.x), Math.round(b.y), (b.ret || 0).toFixed(2), b.nivå || 1].join(':')).join('|');
    if (nøkkel === egneNøkkel && egneHindre === R.hindre) return;
    for (const e of egne) { fjern(R, e.P); if (egneHindre) for (const k of e.nøkler) { const A = egneHindre.get(k), i = A ? A.indexOf(e.o) : -1; if (i >= 0) A.splice(i, 1); } }
    egne = []; egneNøkkel = nøkkel; egneHindre = R.hindre;
    for (const b of liste) { const T = LEIRBYGG[b.type], k = 1 + ((b.nivå || 1) - 1) * .08, c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0), X = b.x - u.cx, Y = b.y - u.cy; if (Math.abs(X) > u.S - 20 || Math.abs(Y) > u.S - 20) continue;
      const pk = (lx, ly) => [X + (lx * c - ly * s) * k, Y + (lx * s + ly * c) * k], [x0, x1, y0, y1] = T.r, P = [pk(x0, y0), pk(x1, y0), pk(x1, y1), pk(x0, y1)], z = (window.LeirSpill && LeirSpill.grunn3d ? LeirSpill.grunn3d(b, u, R).topp : (hoyde3d(b.x, b.y, u) - u.h0) * R.EX) - .05, d = pk(T.dør[0], T.dør[1]);
      P.gulvFast = z + T.s * k + .03; P.veggTopp = P.topp = z + (T.s + T.H) * k; P.leir = b.type; P.bygg = { i: 9000000 + b.id, t: -1, h: T.H, kl: T.kl, senger: b.type === 'brakke' && window.Leir && Leir.BYGG.brakke.nivå ? Leir.BYGG.brakke.nivå.plasser[(b.nivå || 1) - 1] : 0 };
      P.dør = T.side === 'y+' ? { x: d[0], y: d[1], ux: -c, uy: -s, w: T.w, hh: 2.05, z0: P.gulvFast } : { x: d[0], y: d[1], ux: -s, uy: c, w: T.w, hh: 2.05, z0: P.gulvFast };
      const o = { P }, nøkler = []; let ax = Infinity, ay = Infinity, bx = -Infinity, by = -Infinity; for (const p of P) { ax = Math.min(ax, p[0]); bx = Math.max(bx, p[0]); ay = Math.min(ay, p[1]); by = Math.max(by, p[1]); }
      for (let a = Math.floor(ax / 20); a <= Math.floor(bx / 20); a++) for (let q = Math.floor(ay / 20); q <= Math.floor(by / 20); q++) { const kk = a + ',' + q; if (!R.hindre.has(kk)) R.hindre.set(kk, []); R.hindre.get(kk).push(o); nøkler.push(kk); }
      egne.push({ P, o, nøkler }); }
  }
  function oppdater(R, tving) {
    const u = R.ut;
    // (leirens bygg registreres også når du ikke går: gress og blomster skal ikke stå inne i dem)
    if (u && R.hindre) leirbygg(R, u);
    if (!R.fot || !u || !R.hindre) { if (aktive.size) tøm(R); return; }
    if (forU !== u) { tøm(R); forU = u; }
    // oppdater(true) (vaktene, møbelflytting): en jobb som er i gang, gjøres ferdig nå, og det neste bygget bygges i ett strekk
    if (tving && jobb) steg(R, Infinity);
    const nå = performance.now(); if (!tving && nå - sist < 250) return; sist = nå;
    const x = R.bane.x, y = R.bane.y;
    for (const [P] of [...aktive]) if (avstand(P, x, y) > BORT) fjern(R, P, true);
    for (const [P, h] of [...hvile]) if (h.versjon !== versjon || avstand(P, x, y) > BORT * 2) { hvile.delete(P); kast(h.o); }
    // lyset følger dagen: utsikten og dagslyset på gulvet etter himmelen, lampene sterkere når det er mørkt
    if (M) { const mørke = window.NATT && typeof NATT.mørke === 'number' ? Math.max(0, Math.min(1, NATT.mørke)) : 0, dag = 1 - mørke;
      M.vindu.opacity = .06 + .1 * mørke; M.dag.color.setScalar(.26 * dag); M.lampe.color.setRGB(.2 + .34 * mørke, .17 + .27 * mørke, .1 + .14 * mørke); }
    // EKTE VINDUER: mens du står inne i et bygg, tegnes husenes yttervegger bare fra utsiden. Da er veggen rundt deg borte sett
    // innenfra, og gjennom hullene i innerveggen ser du landskapet og nabohusene som de er. Ute tegnes veggene fra begge sider som før.
    { const her = inne(x, y); husSide(R, her ? THREE.FrontSide : THREE.DoubleSide); for (const [P, o] of aktive) { if (o.ytre) o.ytre.visible = P !== her; if (o.funn) o.funn.visible = !(window.LeteSpill && P.bygg && LeteSpill.lett().has(P.bygg.i)); }
      // modeller med skiver tvers gjennom (containerens ribber, drivhusets spanter) skjules mens du står inne i dem
      modellSynlig(R, her && her.leir && LEIRBYGG[her.leir].skjul ? her.bygg.i - 9000000 : -1); }
    // ett bygg om gangen: mens en jobb går, letes det ikke etter flere
    if (jobb) return;
    // nærmeste bygg uten interiør innen NÆR (rutenettet på 20 m fra hindringer()). Et hus BIT.foran meter foran deg (der du ser)
    // regnes som like nært, så det du går mot, er klart før du kommer dit.
    const f = R.fot, fx = f ? -Math.sin(f.a) * BIT.foran : 0, fy = f ? Math.cos(f.a) * BIT.foran : 0;
    let best = null, bd = NÆR, bv = NÆR; const sett = new Set();
    for (let a = Math.floor((x - NÆR) / 20); a <= Math.floor((x + NÆR) / 20); a++) for (let c = Math.floor((y - NÆR) / 20); c <= Math.floor((y + NÆR) / 20); c++)
      for (const o of R.hindre.get(a + ',' + c) || []) { const P = o.P; if (!P || sett.has(P) || aktive.has(P) || !P.dør || !P.bygg || P.utenInne) continue; sett.add(P);
        const d = avstand(P, x, y); if (d >= NÆR) continue; const v = Math.min(d, avstand(P, x + fx, y + fy)); if (v < bv) { bv = v; bd = d; best = P; } }
    if (!best) return;
    if (aktive.size >= MAKS) { let lengst = null, ld = bd; for (const [P] of aktive) { const d = avstand(P, x, y); if (d > ld) { ld = d; lengst = P; } } if (!lengst) return; fjern(R, lengst, true); }
    // hvilte det, settes det inn igjen straks (samme geometri)
    const h = hvile.get(best); if (h) { hvile.delete(best); legg(R, best, h.o); STAT.gjenbrukt++; return; }
    jobb = { P: best, u, it: byggG(R, u, best), biter: 0, ms: 0, lengst: 0, steg: {}, t0: nå };
    if (tving) steg(R, Infinity); else { steg(R, nå + BIT.ms); planlegg(); }
  }
  // Én bit av jobben (til fristen): byggG går videre til den er ferdig eller tiden er brukt. Ferdig: nettene legges i scenen.
  function steg(R, frist) {
    const j = jobb; if (!j) return;
    if (!R.fot || R.ut !== j.u || forU !== j.u || aktive.has(j.P)) { jobb = null; return; }
    const t0 = performance.now(); let t = t0, ferdig = false, o = null;
    try { for (;;) { const r = j.it.next(), n = performance.now(), navn = r.done ? 'slutt' : r.value; j.steg[navn] = Math.max(j.steg[navn] || 0, n - t); t = n;
      if (r.done) { ferdig = true; o = r.value; break; } if (n >= frist) break; } }
    catch (e) { console.warn('interiør:', e); ferdig = true; o = null; }
    j.biter++; j.ms += t - t0; j.lengst = Math.max(j.lengst, t - t0);
    if (!ferdig) return;
    jobb = null;
    if (!o) { j.P.utenInne = true; return; }
    if (aktive.size >= MAKS) { kast(o); return; }
    legg(R, j.P, o);
    STAT.bygget++; STAT.biter += j.biter; STAT.lengst = Math.max(STAT.lengst, j.lengst);
    for (const [k, v] of Object.entries(j.steg)) STAT.steg[k] = Math.max(STAT.steg[k] || 0, v);
    STAT.sist = { kl: o.plan.kl, biter: j.biter, ms: Math.round(j.ms), lengst: Math.round(j.lengst * 10) / 10, varte: Math.round(performance.now() - j.t0), trekanter: o.trekanter };
  }
  // neste bit i neste bilde (etter spilløkka, før bildet tegnes)
  function planlegg() { if (rafNr || !jobb) return; rafNr = requestAnimationFrame(() => { rafNr = 0; const R = r3(); if (!R || !jobb) return; steg(R, performance.now() + BIT.ms); planlegg(); }); }
  KROKER.ramme3d.push(R => oppdater(R));
  // INNGANGENE: når du går ute, får dørene på de nærmeste byggene (innen 28 m) et lite merke «Inngang» (med hake når huset er gjennomsøkt), så du ser hvor du går inn
  KROKER.tegn3d.push((g, proj3) => { const R = r3(); if (!R || !R.fot || !R.ut || !aktive.size) return; const x = R.bane.x, y = R.bane.y; if (inne(x, y)) return;
    const sett = window.LeteSpill ? LeteSpill.lett() : null;
    const L = []; for (const [P, o] of aktive) { const I = o.plan.inngang, d = Math.hypot(I.x - x, I.y - y); if (d < 28 && d > 1.5) L.push([d, I, !!(sett && P.bygg && sett.has(P.bygg.i))]); }
    L.sort((a, b) => a[0] - b[0]); g.save(); g.font = '600 12px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [d, I, lett] of L.slice(0, 3)) { const p = proj3(R.ut.cx + I.x + I.nx * .7, R.ut.cy + I.y + I.ny * .7); if (!p) continue;
      const py = p[1] - Math.min(120, 900 / Math.max(3, d)), t = lett ? 'Inngang ✓' : 'Inngang', w = g.measureText(t).width + 14; g.globalAlpha = d < 6 ? .95 : .78;
      g.fillStyle = 'rgba(28,23,15,.85)'; g.strokeStyle = '#c9b26a'; g.lineWidth = 1; g.beginPath(); g.rect(p[0] - w / 2, py - 9, w, 18); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(p[0] - 5, py + 9); g.lineTo(p[0], py + 15); g.lineTo(p[0] + 5, py + 9); g.closePath(); g.fillStyle = '#c9b26a'; g.fill();
      g.fillStyle = '#f0e2b0'; g.fillText(t, p[0], py + .5); }
    g.restore(); });
  // Høyden du står på inne og på trappa foran døra (ellers null)
  function høyde(x, y, terreng) { for (const [, o] of aktive) { const h = Interior.høyde(o.plan, x, y, terreng); if (h !== null) return h; } return null; }
  const påTrapp = (x, y) => { for (const [, o] of aktive) if (Interior.påTrapp(o.plan, x, y)) return true; return false; };
  function inne(x, y) { for (const [P] of aktive) if (Interior.inni(P, x, y)) return P; return null; }
  // (18. nov kveld) bygg interiøret i bygget med nummer i på nytt nå (et møbel er flyttet): gir sant når bygget hadde interiør
  function bygOm(i) { const R = r3(); if (!R || !R.ut) return false;
    // (20. nov) planen kan ha endret seg: hvilende interiører glemmes, og en jobb for dette bygget begynner på nytt senere
    versjon++; glemHvile(); if (jobb && jobb.P.bygg && jobb.P.bygg.i === i) jobb = null;
    for (const [P] of [...aktive]) { if (!P.bygg || P.bygg.i !== i) continue; fjern(R, P); let o = null; try { o = bygg(R, R.ut, P); } catch (e) { console.warn('interiør:', e); } if (o) legg(R, P, o); return true; }
    return false; }
  // et møbel som eget nett (spøkelset når du bærer det, møbler ute): midten i origo, gulvet i z = 0, hjørnefarger
  function møbelGeo(m) { const d = [];
    for (const [x0, x1, y0, y1, z0, z1, c, , rund] of deler(m)) { let g;
      if (rund) { g = new THREE.CylinderGeometry(1, 1, 1, 8).toNonIndexed(); g.rotateX(Math.PI / 2); g.scale(Math.max(.005, (x1 - x0) / 2), Math.max(.005, (y1 - y0) / 2), Math.max(.005, z1 - z0)); }
      else g = new THREE.BoxGeometry(Math.max(.005, x1 - x0), Math.max(.005, y1 - y0), Math.max(.005, z1 - z0)).toNonIndexed();
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let q = 0; q < n; q++) f.set(c, q * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); }
    const ut = MODELLER.samle(d); for (const g of d) g.dispose(); return ut; }
  window.Interior3d = { funn: P => { const o = aktive.get(P); return o && o.funn ? o.funn.visible : null; }, LEIRBYGG, egne: () => egne,
    // sant når (x, y) ligger inne i (eller en halv meter fra) et av leirens bygg – gress og blomster settes ikke der
    iLeirbygg: (x, y) => { for (const e of egne) { const P = e.P; if (Interior.inni(P, x, y) || Interior.avstKant(P, x, y) < .5) return true; } return false; }, høyde, inne, påTrapp, oppdater: tving => r3() && oppdater(R3, tving), bygOm, møbelGeo,
    // (20. nov) byggingen i biter: tall for målingen og vakta (bygget, biter, lengste bit i ms, lengste steg per navn, siste bygg)
    stat: () => JSON.parse(JSON.stringify(Object.assign({ jobb: !!jobb, hvile: hvile.size }, STAT))), nullstillStat: () => { Object.assign(STAT, { bygget: 0, biter: 0, lengst: 0, gjenbrukt: 0, kastet: 0, steg: {}, sist: null }); },
    jobb: () => (jobb ? { i: jobb.P.bygg && jobb.P.bygg.i, biter: jobb.biter } : null), BIT, glem: P => { const R = r3(); if (R && aktive.has(P)) fjern(R, P); const h = hvile.get(P); if (h) { hvile.delete(P); kast(h.o); } if (jobb && jobb.P === P) jobb = null; }, drivBit: ms => { const R = r3(); if (R && jobb) steg(R, performance.now() + (ms || BIT.ms)); return !!jobb; },
    // til vakta: bygg interiøret i P i ett strekk eller i biter (uten scenen) og gi nettene; kast(o) frigjør dem
    prøvBygg: (P, biter) => { const R = r3(), it = byggG(R, R.ut, P); if (!biter) return { o: iEtt(it), biter: 1 }; let r, n = 0; while (!(r = it.next()).done) n++; return { o: r.value, biter: n }; }, kast, aktivP: () => [...aktive.keys()], aktive: () => [...aktive.values()], antall: () => aktive.size, deler, STOFFER,
    // til vakten: alle interiørene nå – rom, møbler, trekanter, stoffer i bruk, og om inngangen er fri
    sjekk: () => [...aktive.values()].map(o => ({ kl: o.plan.kl, rom: o.plan.rom.length, møbler: o.plan.møbler.length, trekanter: o.trekanter, nett: o.nett.length, stoffer: o.nett[0].geometry.groups.length, gulv: o.plan.gulv, inngang: o.plan.inngang,
      fri: !Interior.blokkert(o.plan, o.plan.inngang.inn[0], o.plan.inngang.inn[1]) })) };
})();
