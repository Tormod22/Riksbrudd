'use strict';
// FERJER I RUTE OG KJØLVANN (12. nov, brukeren: «fortsett å forbedre» – mer liv på sjøen i 3D).
// Ferjene går fram og tilbake langs ferjelinja (INFRA.ferje) mellom to ferjekaier i utsnittet: ligger ved kai 1–2 minutter (sanntid),
// akselererer, seiler ca. 6,5 m/s, bremser inn mot kaien og går tilbake (dobbeltendet, snur ikke). Reglene er i spill/ferje.js.
// Ferjemodellen er den samme som ved kaiene (Infra3d.ferjeGeo i spill/infra3d.js); kaier med ferje i rute får ikke en ekstra ferje (k.iRute).
// Kjølvannet (window.Kjølvann) er felles for ferjene og småbåtene i spill/kyst3d.js: et hvitt skumspor bak akterenden som brer seg ut og
// tones bort (additivt, så det bare lysner sjøen). Bare når utsnittet er lite (S ≤ 2200), tak 4 ferjer på PC og 2 på mobil.
// Kroker: KROKER.bygg3d (rutene), KROKER.sett3d (nettene), KROKER.ramme3d (ferjene flyttes, kjølvannet tegnes).
(function () {
  // T.ekstra: sekunder lagt til sanntida (skjermbilder og tester kan hoppe i ruteplanen)
  const T = { ekstra: 0 };
  const mobil = () => (typeof VW !== 'undefined' && VW < 900);

  // ---------- kjølvannet ----------
  // Et spor er punktene akterenden har vært (eldst først). Et nytt stykke (brudd) begynner når båten har ligget stille eller hoppet
  // (ferja bytter akterende ved kai). Geometrien lages på nytt hver gang den tegnes (få hundre firkanter).
  const KV = { gen: 0, spor: [], mesh: null, N: 1600, tegnet: 0 };
  function nyttSpor(B, maks) { const s = { P: [], B, maks, gen: KV.gen, hode: null, d: 0 }; KV.spor.push(s); return s; }
  function flytt(s, x, y, z, v, nå) {
    // tida gikk bakover (hopp i ruteplanen): begynn på nytt
    if (s.P.length && s.P[s.P.length - 1].t > nå) { s.P.length = 0; s.hode = null; }
    const P = s.P, l = P[P.length - 1];
    if (v < .35) { if (l) l.slutt = true; s.hode = null; }
    else {
      const d = l ? Math.hypot(l.x - x, l.y - y) : Infinity;
      // d = strekningen båten har gått (skumteksturen ligger fast på sjøen, den glir ikke med båten)
      if (!l || l.slutt || d > 40) P.push({ x, y, z, t: nå, v, d: s.d, brudd: true });
      else if (d >= 3) { s.d += d; P.push({ x, y, z, t: nå, v, d: s.d }); }
      const l2 = P[P.length - 1]; s.hode = { x, y, z, t: nå, v, d: l2.d + Math.hypot(l2.x - x, l2.y - y) };
    }
    while (P.length && nå - P[0].t > s.maks) P.shift();
  }
  // Teksturen har to felt på tvers (flipY: øverst i lerretet = v 0,5–1): øverste halvdel er Kelvin-armene (to tynne skumstriper langs kantene av V-en),
  // nederste (v 0–0,5) er den hvite uroa rett bak propellene (tett skum som tynnes ut mot sidene). Langs (u) gjentas skumflekkene.
  function tekstur() {
    const W = 64, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), im = g.createImageData(W, H);
    let f = 12345; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647;
    const st = new Float32Array(W * H); for (let i = 0; i < st.length; i++) st[i] = rnd();
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const n = (st[j * W + i] + st[j * W + (i + 1) % W] + st[((j + 1) % H) * W + i] + st[j * W + (i + 2) % W]) / 4;
      let a;
      if (j < H / 2) { const v = j / (H / 2 - 1); a = (Math.exp(-(((v - .06) / .045) ** 2)) + Math.exp(-(((v - .94) / .045) ** 2))) * (.35 + 1.1 * n); }
      else { const v = (j - H / 2) / (H / 2 - 1), m = Math.exp(-(((v - .5) / .26) ** 2)); a = m * (.25 + 1.3 * n * n) * (v > .03 && v < .97 ? 1 : 0); }
      const q = (j * W + i) * 4; im.data[q] = im.data[q + 1] = im.data[q + 2] = Math.min(1, a) * 255; im.data[q + 3] = 255;
    }
    g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }
  function lagMesh(R) {
    const N = KV.N, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(N * 4 * 2), 2).setUsage(THREE.DynamicDrawUsage));
    const idx = new Uint16Array(N * 6); for (let i = 0; i < N; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 2], i * 6);
    g.setIndex(new THREE.BufferAttribute(idx, 1)); g.setDrawRange(0, 0);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tekstur(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide }));
    m.frustumCulled = false; m.name = 'kjølvann'; m.renderOrder = 2; R.scene.add(m); KV.mesh = m;
  }
  function tegnKjølvann(R, nå) {
    if (!KV.mesh || !KV.mesh.parent) lagMesh(R);
    const g = KV.mesh.geometry, pos = g.attributes.position.array, kol = g.attributes.color.array, uv = g.attributes.uv.array;
    const lys = 1 - .75 * ((window.NATT && NATT.mørke) || 0); let n = 0;
    for (const s of KV.spor) {
      const P = s.hode ? s.P.concat([s.hode]) : s.P; if (P.length < 2) continue;
      // to firkanter per stykke mellom to punkter: V-armene (bredden vokser med alderen: Kelvin-vinkelen ≈ 19°, ca. 0,33 × farten; svake)
      // og uroa rett bak (smal, sterkere, borte på halve tida). Lysheten minker med alderen; uten fart blir det ikke noe nytt skum.
      for (const [del, v0, v1] of [[0, .5, 1], [1, 0, .5]]) {
        const maks = del ? s.maks * .55 : s.maks;
        const kant = (p, q, r) => { const dx = r.x - q.x, dy = r.y - q.y, l = Math.hypot(dx, dy) || 1, a = Math.max(0, nå - p.t);
          const w = del ? s.B * .32 + a * Math.min(.5, .08 * p.v) : s.B * .45 + a * Math.min(2.2, .33 * p.v);
          const k = Math.max(0, 1 - a / maks) ** (del ? 1.6 : 2.2) * Math.min(1, p.v / 2.5) * lys * (del ? .75 : .3); return { nx: -dy / l * w, ny: dx / l * w, k }; };
        for (let i = P.length - 1; i > 0 && n < KV.N; i--) {
          const a = P[i - 1], b = P[i]; if (b.brudd) continue;
          const ka = kant(a, a, b), kb = kant(b, a, b); if (ka.k <= .003 && kb.k <= .003) continue;
          const o = n * 12, c = n * 8;
          pos.set([b.x + kb.nx, b.y + kb.ny, b.z, b.x - kb.nx, b.y - kb.ny, b.z, a.x + ka.nx, a.y + ka.ny, a.z, a.x - ka.nx, a.y - ka.ny, a.z], o);
          kol.set([kb.k, kb.k, kb.k, kb.k, kb.k, kb.k, ka.k, ka.k, ka.k, ka.k, ka.k, ka.k], o);
          uv.set([b.d / 30, v0, b.d / 30, v1, a.d / 30, v0, a.d / 30, v1], c); n++;
        }
      }
    }
    g.setDrawRange(0, n * 6); g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.uv.needsUpdate = true; KV.tegnet = n;
  }
  window.Kjølvann = { nyttSpor, flytt, nå: () => performance.now() / 1000 + T.ekstra, get gen() { return KV.gen; }, antall: () => KV.tegnet };

  // ---------- rutene ----------
  KROKER.bygg3d.push(async u => {
    u.ferjer3d = [];
    if (u.S > 2200 || !window.Ferje || !window.Infra3d || !Infra3d.ferjeGeo || typeof INFRA === 'undefined' || !INFRA || !VIS.infra || !u.infra || !u.vann) return;
    const kaier = u.kaier3d || [], kant = u.S - 80, inne = p => Math.abs(p[0]) < kant && Math.abs(p[1]) < kant;
    const finn = p => { let best = null, bd = 400; for (const k of kaier) { const d = Math.hypot(k.Q[0] - p[0], k.Q[1] - p[1]); if (d < bd) { bd = d; best = k; } } return best; };
    const kandidater = [];
    for (const o of u.infra) if (o.lag === 'ferje') for (const d of o.deler) {
      const P = []; for (let i = 0; i < d.length; i += 2) P.push([d[i] - u.cx, d[i + 1] - u.cy]);
      if (P.length < 2 || !inne(P[0]) || !inne(P[P.length - 1])) continue;
      // begge endene må ha en ferjekai med plass til ferja (to forskjellige)
      const kA = finn(P[0]), kB = finn(P[P.length - 1]); if (!kA || !kB || kA === kB) continue;
      const Lf = Math.min(Infra3d.ferjeLengde(kA.iv), Infra3d.ferjeLengde(kB.iv)); if (Lf < 40) continue;
      const dok = k => ({ x: k.Q[0] + k.f[0] * (22.6 + Lf / 2), y: k.Q[1] + k.f[1] * (22.6 + Lf / 2), fx: k.f[0], fy: k.f[1] });
      const R = Ferje.lagRute(P, dok(kA), dok(kB), { id: o.e.id, ut: Lf / 2 + 40 });
      // ruta må gå på vann (litt land tåles: linja i NVDB er grov)
      let land = 0, n = 0; for (let s = 0; s <= R.L; s += 20, n++) { const p = Ferje.punkt(R, s); if (!Infra3d.iVann(u, p.x, p.y)) land++; }
      if (land > n * .15) continue;
      kandidater.push({ R, kA, kB, Lf, id: o.e.id, navn: o.e.navn, d: Math.hypot((kA.Q[0] + kB.Q[0]) / 2, (kA.Q[1] + kB.Q[1]) / 2) });
    }
    kandidater.sort((a, b) => a.d - b.d);
    const tak = Ferje.TAK[mobil() ? 'mobil' : 'pc'];
    for (const r of kandidater) {
      if (u.ferjer3d.length >= tak) break;
      r.kA.iRute = r.kB.iRute = true;
      // lange samband (over 2,5 km) får to ferjer, en halv runde forskjøvet
      const n = r.R.L > 2500 && u.ferjer3d.length + 2 <= tak ? 2 : 1;
      for (let i = 0; i < n; i++) u.ferjer3d.push({ rute: r, forskyv: i / n, Lf: r.Lf, id: r.id + i, zA: r.kA.zw, zB: r.kB.zw });
    }
  });

  // ---------- nettene ----------
  let mesh = [];
  KROKER.sett3d.push((u, R) => {
    for (const m of mesh) { R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } mesh = []; R.ferje3d = mesh;
    KV.gen++; KV.spor = [];
    const fs = u.ferjer3d || []; if (!fs.length) return;
    const geo = {};
    for (const f of fs) {
      const nøkkel = f.Lf + ':' + (f.id % 991);
      if (!geo[nøkkel]) { const G = Infra3d.ferjeGeo(f.Lf, f.id), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(G.pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(G.kol, 3)); g.computeVertexNormals(); geo[nøkkel] = g; }
      const m = new THREE.Mesh(geo[nøkkel], new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.name = 'ferje3d'; m.matrixAutoUpdate = true;
      R.scene.add(m); mesh.push(m); f.mesh = m; f.spor = nyttSpor(15, 45);
    }
    flyttFerjer(u, performance.now() / 1000 + T.ekstra, 0);
  });

  // ---------- ferjene flyttes ----------
  function flyttFerjer(u, nå, dt) {
    const fart = (window.Vind3d && Vind3d.VIND && Vind3d.VIND.fart) || 0, gy = Ferje.gynging ? Ferje.gynging(fart, true) : { amp: .3, takt: 1 };
    for (const f of u.ferjer3d || []) {
      if (!f.mesh) continue; const R = f.rute.R, st = Ferje.stilling(R, nå, f.forskyv), q = st.s / (R.L || 1), z = f.zA * (1 - q) + f.zB * q;
      const fase = nå * gy.takt * .8 + f.id % 7, a = gy.amp * .25;
      f.mesh.position.set(st.x, st.y, z + Math.sin(fase) * .05 * a);
      f.mesh.rotation.set(Math.sin(fase * .9) * .012 * a, Math.sin(fase * .7 + 1) * .006 * a, Math.atan2(st.hy, st.hx), 'ZYX');
      f.st = st;
      // kjølvannet bak akterenden (akterenden er den enden som peker bort fra fartsretningen)
      const r = st.retning || 1, ax = st.x - st.hx * r * (f.Lf / 2 - 2), ay = st.y - st.hy * r * (f.Lf / 2 - 2);
      flytt(f.spor, ax, ay, z + .12, st.v, nå);
    }
  }
  let sist = 0;
  KROKER.ramme3d.push(R => {
    const u = R.ut; if (!u) return; const nå = performance.now() / 1000 + T.ekstra; if (nå - sist < (mobil() ? .08 : .033)) return; const dt = Math.min(.5, nå - sist); sist = nå;
    if (u.ferjer3d && u.ferjer3d.length) flyttFerjer(u, nå, dt);
    if (KV.spor.length || (KV.mesh && KV.tegnet)) tegnKjølvann(R, nå);
  });
  window.Ferje3d = {
    sjekk: () => { const u = typeof R3 !== 'undefined' && R3 && R3.ut; const fs = (u && u.ferjer3d) || [];
      return { ruter: new Set(fs.map(f => f.rute)).size, ferjer: fs.length, iScenen: fs.filter(f => f.mesh && f.mesh.parent).length, kjølvann: KV.tegnet,
        ferjeliste: fs.map(f => ({ navn: f.rute.navn, L: Math.round(f.rute.R.L), s: f.st ? Math.round(f.st.s) : null, v: f.st ? +f.st.v.toFixed(2) : null, ved: f.st ? f.st.ved : null, x: f.st && Math.round(f.st.x + u.cx), y: f.st && Math.round(f.st.y + u.cy) })) }; },
    // for skjermbilder/tester: hopp i ruteplanen (sekunder lagt til sanntida)
    T, KV,
    // spol fram sek sekunder fram til nå (kjølvannet bygges opp; skjermbilder i swiftshader har for få rammer)
    forspol: sek => { const u = R3.ut, nå = performance.now() / 1000 + T.ekstra; for (let t = nå - sek; t <= nå; t += .25) { if (u.ferjer3d) flyttFerjer(u, t, .25); if (window.Kyst3d && Kyst3d.steg) Kyst3d.steg(t); } tegnKjølvann(R3, nå); }
  };
})();
