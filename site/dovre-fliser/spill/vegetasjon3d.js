'use strict';
// Treslag, busker, blomster, bregner og siv i 3D (brukeren 10. nov: «legg til blomster og flere forskjellige tresorter»).
// Reglene (hvilket treslag og hvilke blomster hvor) ligger i spill/vegetasjon.js uten DOM (test: pipeline/fliser/test_vegetasjon.js).
// bygg3d-kroken fordeler trærne fra trær3d (gran/løv) på åtte treslag etter høyde, tregrense, helning, vann, myr og hei, og setter
// einer, vier og fjellbjørk på åpen mark. sett3d-kroken lager furu, osp, rogn, fjellbjørk, selje/vier og einer som instanser med
// detaljnivå (R3.treLOD, samme lodTrær som gran og bjørk), vind og årstid (høstfarger, nakne løvtrær om vinteren, snø).
// Hver ramme: blomster, bregner og siv rundt kameraet når du er nær bakken (som gresset), bare i sommerhalvåret.
(function () {
  const V = window.Vegetasjon; if (!V || typeof KROKER === 'undefined') return;
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null), mob = () => VW < 700;
  const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; };
  const NYE = ['furu', 'osp', 'rogn', 'fjellbjørk', 'selje', 'einer'];

  // ---------- vannet i utsnittet ----------
  // vannmasken (bygg3d, halv oppløsning) lest én gang; samme form som gange.js bruker (u.vannData)
  function vannData(u) {
    if (!u.vannData) { try { const W = u.vann.width; u.vannData = { W, d: u.vann.getContext('2d').getImageData(0, 0, W, W).data }; } catch (e) { u.vannData = { W: 0 }; } }
    return u.vannData;
  }
  const iVann = (u, x, y) => { const D = vannData(u); if (!D.W) return false; const i = Math.floor((x + u.S) / (2 * u.S) * D.W), j = Math.floor((u.S - y) / (2 * u.S) * D.W);
    return i >= 0 && j >= 0 && i < D.W && j < D.W && D.d[(j * D.W + i) * 4] > 127; };
  // avstand til nærmeste vann i meter, i et rutenett på 256 × 256 (to omganger med «chamfer»-avstand)
  function vannAvstand(u) {
    const D = vannData(u), G = 256, c = 2 * u.S / G, A = new Float32Array(G * G).fill(1e9);
    if (D.W) { const st = D.W / G;
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { let v = false;
        for (let b = 0; b < st && !v; b += Math.max(1, st >> 2)) for (let a = 0; a < st && !v; a += Math.max(1, st >> 2)) if (D.d[((Math.floor(j * st + b)) * D.W + Math.floor(i * st + a)) * 4] > 127) v = true;
        if (v) A[j * G + i] = 0; } }
    const d2 = c * Math.SQRT2;
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const k = j * G + i; let v = A[k];
      if (i) v = Math.min(v, A[k - 1] + c); if (j) { v = Math.min(v, A[k - G] + c); if (i) v = Math.min(v, A[k - G - 1] + d2); if (i < G - 1) v = Math.min(v, A[k - G + 1] + d2); } A[k] = v; }
    for (let j = G - 1; j >= 0; j--) for (let i = G - 1; i >= 0; i--) { const k = j * G + i; let v = A[k];
      if (i < G - 1) v = Math.min(v, A[k + 1] + c); if (j < G - 1) { v = Math.min(v, A[k + G] + c); if (i < G - 1) v = Math.min(v, A[k + G + 1] + d2); if (i) v = Math.min(v, A[k + G - 1] + d2); } A[k] = v; }
    return (x, y) => { const i = Math.max(0, Math.min(G - 1, Math.floor((x + u.S) / c))), j = Math.max(0, Math.min(G - 1, Math.floor((u.S - y) / c))); return A[j * G + i]; };
  }

  // ---------- bygg3d: treslag ----------
  KROKER.bygg3d.push(async (u, { px, TW }) => {
    // bryteren VEG_AV på window slår dette av: som før (bare gran og bjørk, ingen blomster) – for å måle og sammenligne
    if (!u.trær || !u.trær.gran || window.VEG_AV) return;
    const kv = await lagVindu([u.cx - u.S - 60, u.cy - u.S - 60, u.cx + u.S + 60, u.cy + u.S + 60], false, 9);
    const klasse = (X, Y) => { const a = Math.floor((X - kv.x0) / kv.r), c = Math.floor((kv.y0 - Y) / kv.r); return a >= 0 && c >= 0 && a < kv.w && c < kv.h ? kv.K[c * kv.w + a] : 255; };
    // andel myr og hei i de ni rutene rundt (ca. 100 × 100 m)
    const rundt = (X, Y) => { let myr = 0, hei = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const k = klasse(X + a * kv.r, Y + b * kv.r); if (k === 6) myr++; else if (k === 2 || k === 0) hei++; } return [myr / 9, hei / 9]; };
    const helning = (X, Y) => { const dx = hoyde3d(X + 6, Y, u) - hoyde3d(X - 6, Y, u), dy = hoyde3d(X, Y + 6, u) - hoyde3d(X, Y - 6, u); return Math.atan(Math.hypot(dx, dy) / 12) * 180 / Math.PI; };
    const vann = vannAvstand(u), tg = V.tregrense(u.cy), ut = {}; for (const k of V.REKKE) ut[k] = [];
    let arb = 0;
    for (const kilde of ['gran', 'løv']) { const d = u.trær[kilde];
      for (let k = 0; k < d.length; k += 5) {
        if ((++arb & 4095) === 0) await pusterom();
        const x = d[k], y = d[k + 1], X = x + u.cx, Y = y + u.cy; if (iVann(u, x, y)) continue;   // aldri i vannet (vannmasken)
        const [myr, hei] = rundt(X, Y);
        const art = V.treslag({ moh: d[k + 2] / R3.EX + u.h0, tg, helning: helning(X, Y), vann: vann(x, y), myr, hei }, hash((Math.round(X * 4) * 73856093) ^ (Math.round(Y * 4) * 19349663)));
        ut[art].push(x, y, d[k + 2], d[k + 3] * V.TRESLAG[art].høyde, d[k + 4]);
      } }
    // einer, vier og fjellbjørk på åpen mark (hei, myr, beite, vannkanten): bare nær (S ≤ 2200), med tak på antallet
    if (u.S <= 2200) {
      const MAKS = mob() ? 1500 : 4000, mpp = 2 * u.S / TW; let n = 0;
      for (let j = 0; j < kv.h && n < MAKS; j++) for (let i = 0; i < kv.w && n < MAKS; i++) {
        const K = kv.K[j * kv.w + i]; if (K === 1 || K === 3 || K === 255) continue;
        const X = kv.x0 + (i + .5) * kv.r, Y = kv.y0 - (j + .5) * kv.r; if (Math.abs(X - u.cx) > u.S - 20 || Math.abs(Y - u.cy) > u.S - 20) continue;
        const moh = hoyde3d(X, Y, u), rel = moh / tg;
        for (const [art, antall] of V.åpenMark(K, rel, vann(X - u.cx, Y - u.cy))) for (let q = 0; q < Math.ceil(antall); q++) {
          const frø = ((i * 7919 + j * 104729) * 8 + q) ^ art.length * 977, a = hash(frø), c = hash(frø + 1e6), e = hash(frø + 2e6); if (e > antall - q) continue;
          const x = X + (a - .5) * kv.r - u.cx, y = Y + (c - .5) * kv.r - u.cy, p = (Math.floor((u.S - y) / mpp) * TW + Math.floor((x + u.S) / mpp)) * 4;
          const R = px[p], G = px[p + 1], B = px[p + 2];
          if ((B > R + 18 && B > G + 4) || Math.abs(R - G) + Math.abs(G - B) < 14 || iVann(u, x, y) || (u.påVeg && u.påVeg(x, y))) continue;   // ikke vann, veg eller hus
          const h = (8 + hash(frø + 3e6) * 12) * (1 - Math.max(0, Math.min(1, (rel - .8) / .3)) * .5) * V.TRESLAG[art].høyde;
          ut[art].push(x, y, (hoyde3d(x + u.cx, y + u.cy, u) - u.h0) * R3.EX, h, hash(frø + 4e6)); n++;
        }
      }
    }
    for (const k of V.REKKE) u.trær[k] = new Float32Array(ut[k]);
    // til blomstene: sted (0 ingen, 1 eng, 2 hei, 3 skog, 4 veikant) og om det er nær vann (siv), 512 × 512
    const W = 512, sted = new Uint8Array(W * W), nærVann = new Uint8Array(W * W), B = u.bunn, c = 2 * u.S / W;
    for (let j = 0; j < W; j++) { if ((j & 63) === 0) await pusterom();
      for (let i = 0; i < W; i++) {
        const x = -u.S + (i + .5) * c, y = u.S - (j + .5) * c, k = j * W + i, g = B ? B.gress[Math.floor(j * B.W / W) * B.W + Math.floor(i * B.W / W)] : 0, K = klasse(x + u.cx, y + u.cy);
        const dv = vann(x, y); if (dv < 14 && !iVann(u, x, y)) nærVann[k] = 1;
        if (dv < 1 || (u.påVeg && u.påVeg(x, y))) continue;
        if (g === 2) sted[k] = 3; else if (K === 2 || (K === 0 && g)) sted[k] = 2; else if (g === 1) sted[k] = 1; else continue;
        if (sted[k] !== 3 && u.påVeg && (u.påVeg(x + 4, y) || u.påVeg(x - 4, y) || u.påVeg(x, y + 4) || u.påVeg(x, y - 4))) sted[k] = 4;
      } }
    u.vegKart = { W, sted, nærVann };
  });

  // ---------- modellene (høyde 1, z opp, foten i 0), farger i hjørnene ----------
  const GEO = {};
  function lagGeo(art) {
    if (GEO[art]) return GEO[art];
    const deler = [];
    const legg = (g, farge) => { if (g.index) g = g.toNonIndexed(); const p = g.attributes.position, k = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const f = farge(p.getX(i), p.getY(i), p.getZ(i)); k[i * 3] = f[0]; k[i * 3 + 1] = f[1]; k[i * 3 + 2] = f[2]; }
      g.setAttribute('color', new THREE.BufferAttribute(k, 3)); deler.push(g); };
    // stamme fra foten (x, y) med lengde h, hellende v radianer mot retningen r; farge(z) etter høyden
    const stamme = (r0, r1, h, farge, x = 0, y = 0, v = 0, r = 0, seg = 5) => { const g = new THREE.CylinderGeometry(r1, r0, h, seg, seg >= 6 ? 2 : 1, true); g.translate(0, h / 2, 0); g.rotateZ(v); g.rotateY(r); g.translate(x, 0, -y); g.rotateX(Math.PI / 2);
      legg(g, (a, b, z) => farge(z)); };
    // klump i kronen: polyeder med runde normaler (myk krone), strukket med (sx, sz)
    const klump = (x, y, z, r, farge, sx = 1, sz = 1, detalj = 0) => { const g = new THREE.IcosahedronGeometry(r, detalj), p = g.attributes.position, nr = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const l = Math.hypot(p.getX(i), p.getY(i), p.getZ(i)) || 1; nr[i * 3] = p.getX(i) / l; nr[i * 3 + 1] = p.getY(i) / l; nr[i * 3 + 2] = p.getZ(i) / l; }
      g.setAttribute('normal', new THREE.BufferAttribute(nr, 3)); g.scale(sx, sz, sx); g.translate(x, z, -y); g.rotateX(Math.PI / 2);
      legg(g, (a, b, zz) => farge(Math.max(0, Math.min(1, (zz - z + r * sz) / (2 * r * sz))), a, b, zz)); };
    const blad = (m, l) => (t, a, b, z) => { const n = .5 + .5 * Math.sin(a * 41 + b * 29 + z * 17); return [m[0] + (l[0] - m[0]) * t + .025 * n, m[1] + (l[1] - m[1]) * t + .03 * n, m[2] + (l[2] - m[2]) * t]; };
    const fin = !mob();
    if (art === 'furu') {
      // høy, rett stamme: gråbrun nede, rødoransje oppover; flat, mørk krone høyt oppe
      stamme(.024, .013, .8, z => z < .3 ? [.33, .27, .22] : [.56, .36, .24], 0, 0, 0, 0, 6);
      const f = blad([.08, .15, .1], [.18, .27, .15]);
      for (const [x, y, z, r] of fin ? [[0, 0, .86, .15], [.13, .05, .78, .12], [-.12, -.07, .8, .12], [.05, -.14, .7, .11], [-.05, .12, .93, .1], [.1, .12, .64, .09], [-.1, .02, .7, .09]] : [[0, 0, .84, .17], [.13, .05, .74, .13], [-.12, -.08, .77, .12]]) klump(x, y, z, r, f, 1.05, .78);
    } else if (art === 'furuEnkel') {
      stamme(.026, .016, .76, () => [.52, .34, .22]); klump(0, 0, .82, .2, blad([.08, .15, .1], [.16, .25, .14]), 1, .8);
    } else if (art === 'osp') {
      // lys, grågrønn stamme, rund og litt høy krone i friskt grønt
      stamme(.03, .018, .72, () => [.63, .63, .59]);
      const f = blad([.24, .38, .1], [.38, .52, .16]);
      for (const [x, y, z, r] of fin ? [[0, 0, .72, .2], [0, 0, .88, .15], [.11, .08, .62, .15], [-.11, -.06, .64, .15], [.06, -.11, .78, .14], [-.06, .1, .8, .13]] : [[0, 0, .72, .22], [0, 0, .88, .16], [.1, .05, .62, .16]]) klump(x, y, z, r, f, 1, 1.15);
    } else if (art === 'ospEnkel') {
      stamme(.03, .02, .6, () => [.63, .63, .59]); klump(0, 0, .72, .22, blad([.26, .4, .11], [.36, .5, .15]), 1, 1.35);
    } else if (art === 'rogn') {
      // kort, grå stamme, bred rund krone og klaser av røde bær ute i kronen
      stamme(.045, .025, .45, () => [.42, .4, .37]); stamme(.025, .015, .3, () => [.42, .4, .37], .02, 0, .5, 1);
      const f = blad([.16, .28, .09], [.28, .4, .14]);
      for (const [x, y, z, r] of fin ? [[0, 0, .64, .25], [.2, .1, .56, .2], [-.2, -.1, .57, .2], [.08, -.2, .6, .19], [-.08, .2, .68, .18]] : [[0, 0, .62, .28], [.18, .08, .55, .2], [-.18, -.1, .56, .2]]) klump(x, y, z, r, f, 1, .9);
      if (fin) for (let k = 0; k < 6; k++) { const a = k * 2.4, rr = .3 + .04 * (k % 2), g = new THREE.OctahedronGeometry(.034); g.translate(Math.cos(a) * rr, .5 + .05 * (k % 3), -Math.sin(a) * rr); g.rotateX(Math.PI / 2); legg(g, () => [.86, .14, .07]); }
    } else if (art === 'rognEnkel') {
      stamme(.04, .03, .45, () => [.42, .4, .37]); klump(0, 0, .6, .3, blad([.17, .29, .09], [.27, .39, .14]), 1, .85);
    } else if (art === 'fjellbjørk') {
      // krokete og lav: tre hvite stammer som heller ut, små klumper med blader
      for (const [v, r] of [[.38, .3], [-.32, 1.8], [.18, 3.9]]) stamme(.026, .014, .6, z => z < .15 ? [.36, .33, .3] : [.7, .68, .64], 0, 0, v, r);
      const f = blad([.17, .28, .09], [.3, .42, .14]);
      for (const [x, y, z, r] of fin ? [[.2, -.06, .6, .21], [-.17, .08, .56, .2], [.04, .1, .76, .19], [-.02, -.14, .5, .18]] : [[.15, 0, .58, .2], [-.14, .06, .55, .18], [0, 0, .76, .16]]) klump(x, y, z, r, f, 1, .8);
    } else if (art === 'fjellbjørkEnkel') {
      stamme(.035, .02, .5, () => [.8, .78, .74]); klump(0, 0, .6, .3, blad([.18, .29, .1], [.28, .4, .14]), 1, .7);
    } else if (art === 'selje') {
      // busk med flere stammer fra roten og en bred, grågrønn krone (selje, vier)
      for (let k = 0; k < 4; k++) stamme(.03, .015, .55, () => [.42, .38, .32], 0, 0, .42, k * 1.57 + .4);
      const f = blad([.24, .32, .18], [.38, .46, .27]);
      for (let k = 0; k < (fin ? 6 : 4); k++) { const a = k * 6.283 / (fin ? 6 : 4), rr = .22; klump(Math.cos(a) * rr, Math.sin(a) * rr, .45 + .12 * (k % 2), .2, f, 1, .85); }
      klump(0, 0, .66, .2, f, 1, .8);
    } else if (art === 'seljeEnkel') {
      klump(0, 0, .45, .4, blad([.25, .33, .19], [.36, .44, .26]), 1, .75);
    } else if (art === 'einer') {
      // smal, mørk søyle med ujevn kant
      const g = new THREE.CylinderGeometry(.08, .19, .82, fin ? 8 : 6, 3, false), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = .82 + .3 * Math.abs(Math.sin(i * 2.3 + p.getY(i) * 9)); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
      g.computeVertexNormals(); g.translate(0, .46, 0); g.rotateX(Math.PI / 2);
      legg(g, (a, b, z) => { const n = .5 + .5 * Math.sin(a * 53 + b * 31 + z * 23); return [.07 + .05 * z + .02 * n, .14 + .07 * z + .03 * n, .1 + .03 * z]; });
      const t = new THREE.ConeGeometry(.08, .16, fin ? 8 : 6, 1, true); t.translate(0, .95, 0); t.rotateX(Math.PI / 2); legg(t, () => [.13, .22, .14]);
    } else if (art === 'einerEnkel') {
      const g = new THREE.ConeGeometry(.17, 1, 5, 1, true); g.translate(0, .5, 0); g.rotateX(Math.PI / 2); legg(g, z => [.1, .18, .12]);
    }
    const n = deler.reduce((a, g) => a + g.attributes.position.count, 0), pos = new Float32Array(n * 3), kol = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
    for (const g of deler) { if (!g.attributes.normal) g.computeVertexNormals(); pos.set(g.attributes.position.array, o * 3); kol.set(g.attributes.color.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(kol, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.userData.treslag = art;
    return (GEO[art] = geo);
  }

  // ---------- vind og årstid i trærne (felles uniformer, oppdateres hver ramme) ----------
  const U = { uTid: { value: 0 }, uHostV: { value: 0 }, uNakenV: { value: 0 }, uSnoGrV: { value: 1900 }, uH0V: { value: 0 } };
  const glf = v => (Number.isInteger(v) ? v + '.0' : String(v));
  function treMateriale(art, enkel) {
    const T = V.TRESLAG[art], m = new THREE.MeshLambertMaterial({ vertexColors: true }), vind = enkel ? 0 : art === 'einer' ? .01 : art === 'furu' ? .02 : .035;
    const høst = T.høst ? `vec3(${T.høst.map(glf).join(', ')})` : '';
    m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
      sh.vertexShader = 'uniform float uTid;\nuniform float uH0V;\nvarying float vTOpp;\nvarying float vTMoh;\nvarying float vTFro;\n' + sh.vertexShader
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        vTOpp = objectNormal.z; vTMoh = instanceMatrix[3].z + uH0V; vTFro = fract(sin(instanceMatrix[3].x * 12.9898 + instanceMatrix[3].y * 78.233) * 43758.5453);`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
        float vh = max(0.0, transformed.z), fx = instanceMatrix[3].x, fy = instanceMatrix[3].y;
        transformed.x += sin(uTid * 1.3 + fx * 0.05 + fy * 0.07) * ${glf(vind)} * vh * vh; transformed.y += cos(uTid * 1.1 + fx * 0.06) * ${glf(vind * .6)} * vh * vh;`);
      sh.fragmentShader = 'uniform float uHostV;\nuniform float uNakenV;\nuniform float uSnoGrV;\nvarying float vTOpp;\nvarying float vTMoh;\nvarying float vTFro;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float blad = step(diffuseColor.r + 0.015, diffuseColor.g);
        float tSno = smoothstep(uSnoGrV - 60.0, uSnoGrV + 60.0, vTMoh) * smoothstep(-0.1, 0.6, vTOpp);
        ${T.løv ? `diffuseColor.rgb = mix(diffuseColor.rgb, ${høst} * (0.8 + 0.3 * vTFro), uHostV * (0.6 + 0.35 * vTFro) * blad);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.4, 0.36, 0.32), uNakenV * 0.88 * blad);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.93, 0.96), tSno * uNakenV * 0.5);` : `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.92, 0.95), tSno * 0.72);`}`);
    };
    m.customProgramCacheKey = () => 'vegetasjon|' + art + '|' + (enkel ? 1 : 0);
    return m;
  }

  // ---------- sett3d: instansene med detaljnivå ----------
  KROKER.sett3d.push((u, R) => {
    if (!u.trær) return;
    const d = new THREE.Object3D();
    for (const art of NYE) {
      const data = u.trær[art], n = data ? data.length / 5 : 0; if (!n) continue;
      const M = new Float32Array(n * 16), C = new Float32Array(n * 3), skjev = art === 'fjellbjørk' ? .35 : art === 'selje' ? .15 : .08;
      for (let k = 0; k < n; k++) { const x = data[k * 5], y = data[k * 5 + 1], z = data[k * 5 + 2], h = data[k * 5 + 3], v = data[k * 5 + 4], b = h * (.85 + .3 * ((v * 13.7) % 1));
        d.position.set(x, y, z - (art === 'einer' ? .1 : .25)); d.scale.set(b, b, h); d.rotation.set((v - .5) * skjev, ((v * 7.3) % 1 - .5) * skjev, v * 6.283); d.updateMatrix();
        d.matrix.toArray(M, k * 16); const f = .84 + v * .32; C[k * 3] = f * (.96 + v * .08); C[k * 3 + 1] = f; C[k * 3 + 2] = f * (1.04 - v * .08); }
      const lag = (geo, enkel) => { const m = new THREE.InstancedMesh(geo, treMateriale(art, enkel), n); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
        m.count = 0; m.frustumCulled = false; m.userData.treslag = art; R.scene.add(m); R.treMesh.push(m); return m; };
      // små treslag (einer, rogn, fjellbjørk, selje) med alle detaljene bare nær kameraet (lodTrær leser G2)
      const G2 = ['einer', 'rogn', 'fjellbjørk', 'selje'].includes(art) ? (mob() ? 80 : 130) ** 2 : undefined;
      R.treLOD.push({ n, M, C, data, G2, nær: lag(lagGeo(art), false), fjern: lag(lagGeo(art + 'Enkel'), true) });
    }
    R.lodVed = null; U.uH0V.value = u.h0; vekstSenter = null;
  });

  // ---------- blomster, bregner og siv nær kameraet ----------
  const TEX = {};
  function tekstur(type) {
    if (TEX[type]) return TEX[type];
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); let f = 31 + type.length * 7; const rnd = () => (f = (f * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    if (type === 'blomst') {
      // stilker i mørkt grønt (farges ikke) og hvite blomsterhoder (får blomstens farge i skyggeleggeren)
      for (let i = 0; i < 4; i++) { const x = 12 + i * 13 + rnd() * 6, top = 6 + rnd() * 22;
        g.strokeStyle = 'rgb(58,92,40)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 64); g.quadraticCurveTo(x + (rnd() - .5) * 8, 40, x + (rnd() - .5) * 6, top + 5); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x, top + 4, 4.5 + rnd() * 2.5, 0, 6.283); g.fill(); g.fillStyle = 'rgb(235,190,60)'; g.beginPath(); g.arc(x, top + 4, 1.4, 0, 6.283); g.fill(); }
    } else if (type === 'bregne') {
      // et bregneblad: midtribbe med småblad på hver side, bøyd ut mot toppen
      for (let s = 0; s < 3; s++) { const x0 = 18 + s * 14; g.strokeStyle = 'rgb(170,215,120)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0 + 4, 64); g.quadraticCurveTo(x0, 30, x0 + (s - 1) * 10, 4); g.stroke();
        for (let t = .12; t < .95; t += .07) { const y = 64 - t * 60, x = x0 + 4 - 4 * t + (s - 1) * 10 * t * t, l = 9 * (1 - t * .7);
          g.strokeStyle = `rgb(${150 + rnd() * 40 | 0},${205 + rnd() * 40 | 0},${100 + rnd() * 30 | 0})`; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - l, y - 3); g.moveTo(x, y); g.lineTo(x + l, y - 3); g.stroke(); } }
    } else {
      // siv: smale strå, noen med brun dunkolle
      c.width = c.height = 128; g.lineCap = 'round';
      for (let i = 0; i < 30; i++) { const x = 10 + rnd() * 108, h = 66 + rnd() * 58, b = (rnd() - .5) * 26; g.strokeStyle = `rgb(${175 + rnd() * 45 | 0},${200 + rnd() * 40 | 0},${135 + rnd() * 35 | 0})`; g.lineWidth = 1.3 + rnd() * 1.4;
        g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + b * .2, 128 - h * .6, x + b, 128 - h); g.stroke();
        if (i % 9 === 0) { g.fillStyle = 'rgb(96,66,42)'; g.fillRect(x + b - 1.8, 128 - h, 3.6, 11); } }
    }
    return (TEX[type] = new THREE.CanvasTexture(c));
  }
  // kryssede firkanter (2 eller 3 plan), foten i 0, høyde 1
  function kryss(plan) {
    const pos = [], uv = [], idx = [];
    for (let p = 0; p < plan; p++) { const a = p * Math.PI / plan, cx = Math.cos(a) * .5, cy = Math.sin(a) * .5, o = pos.length / 3;
      pos.push(-cx, -cy, 0, cx, cy, 0, cx, cy, 1, -cx, -cy, 1); uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(o, o + 1, o + 2, o, o + 2, o + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3)); g.setIndex(idx); return g;
  }
  let vekst = null, vekstSenter = null, vekstNøkkel = '';
  function lagVekst(R) {
    const lag = (type, plan, maks) => {
      const mat = new THREE.MeshLambertMaterial({ map: tekstur(type), alphaTest: .45, side: THREE.DoubleSide });
      // blomstene: bare de lyse blomsterhodene får blomstens farge, stilkene beholder sitt grønne
      if (type === 'blomst') { mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#ifdef USE_COLOR
        diffuseColor.rgb *= mix(vec3(1.0), vColor, step(0.55, min(diffuseColor.r, diffuseColor.b)));
        #endif`); }; mat.customProgramCacheKey = () => 'blomst'; }
      const m = new THREE.InstancedMesh(kryss(plan), mat, maks); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(maks * 3), 3);
      m.count = 0; m.frustumCulled = false; m.userData.vekst = type; R.scene.add(m); return m; };
    return { blomst: lag('blomst', 2, mob() ? 2200 : 6000), bregne: lag('bregne', 3, mob() ? 260 : 700), siv: lag('siv', 2, mob() ? 600 : 1600) };
  }
  function oppdaterVekst(R) {
    const u = R.ut, K = u && u.vegKart; if (!K) return;
    const nær = R.fot || R.bane.avst < 110, c = R.cam.position;
    if (!vekst || vekst.blomst.parent !== R.scene) vekst = lagVekst(R);
    const VR = window.VAER || { årstid: 'sommer', høst: 0, snøgrense: 1900 }, å = VR.årstid || 'sommer', bakke = hoyde3d(u.cx + c.x, u.cy + c.y);
    const synlig = nær && å !== 'vinter' && bakke < VR.snøgrense;
    for (const m of Object.values(vekst)) m.visible = synlig;
    if (!synlig) return;
    const nøkkel = å + '|' + (R.fot ? 1 : 0);
    if (vekstSenter && nøkkel === vekstNøkkel && Math.hypot(c.x - vekstSenter[0], c.y - vekstSenter[1]) < 12) return;
    vekstSenter = [c.x, c.y]; vekstNøkkel = nøkkel;
    const RAD = R.fot ? 45 : 70, d = new THREE.Object3D(), col = new THREE.Color(), W = K.W, bl = V.blomstring(å), høst = å === 'høst';
    let f = (Math.floor(c.x) * 73856093 ^ Math.floor(c.y) * 19349663) >>> 0; const rnd = () => (f = (f * 1664525 + 1013904223) >>> 0) / 4294967296;
    const n = { blomst: 0, bregne: 0, siv: 0 }, STED = [null, 'eng', 'hei', 'skog', 'veikant'];
    const sett = (type, x, y, s, h, farge) => { const m = vekst[type]; if (n[type] >= m.instanceMatrix.count || iVann(u, x, y) || (u.påVeg && u.påVeg(x, y))) return;
      d.position.set(x, y, (hoyde3d(x + u.cx, y + u.cy) - u.h0) * R.EX - .04); d.rotation.set(0, 0, rnd() * 3.14); d.scale.set(s, s, h); d.updateMatrix();
      m.setMatrixAt(n[type], d.matrix); col.setRGB(...farge); m.setColorAt(n[type], col); n[type]++; };
    const forsøk = vekst.blomst.instanceMatrix.count * 3;
    for (let t = 0; t < forsøk; t++) {
      const a = rnd() * 6.283, rr = RAD * Math.pow(rnd(), .7), x = c.x + Math.cos(a) * rr, y = c.y + Math.sin(a) * rr;
      const i = Math.floor((x + u.S) / (2 * u.S) * W), j = Math.floor((u.S - y) / (2 * u.S) * W); if (i < 0 || j < 0 || i >= W || j >= W) continue;
      const k = j * W + i, st = K.sted[k], r = rnd();
      if (K.nærVann[k] && r < .5) {
        // siv i vannkanten: på land, men med vann innen 3 m
        if (!iVann(u, x, y) && (iVann(u, x + 3, y) || iVann(u, x - 3, y) || iVann(u, x, y + 3) || iVann(u, x, y - 3))) { const l = .85 + rnd() * .3;
          sett('siv', x, y, .7 + rnd() * .5, .9 + rnd() * .7, høst ? [.78 * l, .66 * l, .4 * l] : [.55 * l, .66 * l, .38 * l]); continue; }
      }
      if (!st) continue;
      if (st === 3) { if (r < .14) { const l = .7 + rnd() * .3; sett('bregne', x, y, .5 + rnd() * .5, .35 + rnd() * .4, høst ? [.62 * l, .42 * l, .2 * l] : [.32 * l, .48 * l, .24 * l]); continue; } }
      if (rnd() > V.STEDTETTHET[STED[st]] * bl) continue;
      const art = V.blomst(STED[st], å, rnd()); if (!art) continue;
      const fa = V.BLOMSTER[art].farge, l = .88 + rnd() * .24, høy = art === 'geitrams' ? .7 + rnd() * .5 : art === 'røsslyng' ? .16 + rnd() * .1 : .2 + rnd() * .22;
      sett('blomst', x, y, art === 'røsslyng' ? .35 : .22 + rnd() * .12, høy, fa.map(v => Math.min(1, v * l)));
    }
    for (const [type, m] of Object.entries(vekst)) { m.count = n[type]; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
  }

  // ---------- hver ramme ----------
  KROKER.ramme3d.push(R => {
    if (!R.ut) return;
    const VR = window.VAER; U.uTid.value = performance.now() / 1000;
    U.uHostV.value = VR ? VR.høst : 0; U.uNakenV.value = VR && VR.årstid === 'vinter' ? 1 : 0; U.uSnoGrV.value = VR ? VR.snøgrense : 1900;
    oppdaterVekst(R);
  });

  // for testene (sjekk.js) og for å se etter: hvilke treslag som står i scenen og et utvalg av plantene
  window.Vegetasjon3d = {
    treslag: () => { const R = r3(); const s = new Set(); if (R && R.treMesh) for (const m of R.treMesh) { const g = m.geometry, a = m.userData.treslag || (g === TREGEO.gran || g === TREGEO.granEnkel ? 'gran' : g === TREGEO['løv'] || g === TREGEO['løvEnkel'] ? 'løv' : null); if (a && m.count > 0) s.add(a); } return [...s]; },
    antall: () => { const R = r3(), u = R && R.ut; if (!u || !u.trær) return {}; return Object.fromEntries(Object.entries(u.trær).map(([k, v]) => [k, v.length / 5])); },
    // utvalg: [x, y, art] for trær (alle slag) og planter (blomster, bregner, siv) slik de står i scenen nå
    utvalg: (maks = 3000) => { const R = r3(), u = R && R.ut, ut = []; if (!u) return ut;
      for (const [art, d] of Object.entries(u.trær || {})) for (let k = 0, steg = Math.max(1, Math.floor(d.length / 5 / (maks / 10))); k < d.length / 5; k += steg) ut.push([d[k * 5], d[k * 5 + 1], art]);
      if (vekst) { const M = new THREE.Matrix4(), p = new THREE.Vector3(); for (const [type, m] of Object.entries(vekst)) for (let k = 0; k < m.count; k += Math.max(1, Math.floor(m.count / 300))) { m.getMatrixAt(k, M); p.setFromMatrixPosition(M); ut.push([p.x, p.y, type]); } }
      return ut; },
    iVann: (x, y) => { const R = r3(); return !!(R && R.ut && iVann(R.ut, x, y)); },
  };
})();
