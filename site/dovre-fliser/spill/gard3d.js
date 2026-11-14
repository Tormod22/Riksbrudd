'use strict';
// Kulturlandskapet i 3D (nær kameraet, utsnitt S ≤ 2200): rundballer i hvit og grønn plast på dyrket mark om sommeren og høsten,
// og gjerder langs kanten av jordene – skigard på noen gårder, ellers trestolper med netting, og steingjerder av og til.
// Dyrket mark = terrengklasse 5 i lagVindu (32 m-ruter, som dyr.js). Kanten er der naboruta ikke er dyrket (grovt, langs rutenettet).
// Plassene er faste (hash av kartkoordinatene), så det står likt når utsnittet bygges på nytt. Ikke i vann, på veg, i/inntil hus,
// i trær eller bekker: Dyr3d.lovlig (spill/dyr3d.js, som må lastes før denne fila).
// Kroker: KROKER.bygg3d (plassene, u.gard), KROKER.sett3d (InstancedMesh), KROKER.ramme3d (rundballene bare sommer/høst).
(function () {
  const R = 32;
  const tak = () => (VW < 900 ? { ball: 120, bit: 700 } : { ball: 360, bit: 1600 });
  // fast tall 0–1 fra to heltall (og et salt)
  const hash = (a, b, s = 0) => { let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(s + 1, 83492791)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // gjerdetypen per gård (rute på 400 m): 0 stolper og netting, 1 skigard, 2 steingjerde
  const type = (X, Y) => { const t = hash(Math.floor(X / 400), Math.floor(Y / 400), 7); return t < .3 ? 1 : t < .45 ? 2 : 0; };

  KROKER.bygg3d.push(async u => {
    if (u.S > 2200 || !u.dyrMaske || !window.Dyr3d) return;
    const kv = await lagVindu([u.cx - u.S, u.cy - u.S, u.cx + u.S, u.cy + u.S], false, 9);
    const K = (i, j) => (i < 0 || j < 0 || i >= kv.w || j >= kv.h ? 255 : kv.K[j * kv.w + i]);
    const lov = (x, y) => Dyr3d.lovlig(u, x, y);
    const z = (x, y) => (hoyde3d(x + u.cx, y + u.cy, u) - u.h0) * R3.EX;
    const T = tak(), baller = [], biter = [[], [], []];
    // rutene med dyrket mark, nærmest midten først (taket tar de fjerne)
    const ruter = [];
    for (let j = 0; j < kv.h; j++) for (let i = 0; i < kv.w; i++) if (K(i, j) === 5) {
      const X = kv.x0 + i * kv.r, Y = kv.y0 - (j + 1) * kv.r, x = X - u.cx, y = Y - u.cy;
      if (Math.abs(x) > u.S * .92 || Math.abs(y) > u.S * .92) continue;
      ruter.push([i, j, X, Y, Math.hypot(x + kv.r / 2, y + kv.r / 2)]);
    }
    ruter.sort((a, b) => a[4] - b[4]);
    const r = kv.r;
    for (const [i, j, X, Y] of ruter) {
      const gx = Math.round(X / r), gy = Math.round(Y / r);
      // rundballer: en klynge på 3–9 i ca. 7 % av rutene, på rad eller i en liten haug
      if (baller.length < T.ball * 5 && hash(gx, gy, 1) < .07) {
        const n = 3 + Math.floor(hash(gx, gy, 2) * 7), v = hash(gx, gy, 3) * Math.PI, grønn = hash(gx, gy, 4) < .35, svart = hash(gx, gy, 4) > .93;
        const mx = X + r * (.25 + .5 * hash(gx, gy, 5)) - u.cx, my = Y + r * (.25 + .5 * hash(gx, gy, 6)) - u.cy;
        for (let k = 0; k < n && baller.length < T.ball * 5; k++) {
          const rad = k % 3, kol = Math.floor(k / 3), a = (rad - 1) * 1.4, b = kol * 1.35;
          const x = mx + Math.cos(v) * a - Math.sin(v) * b, y = my + Math.sin(v) * a + Math.cos(v) * b;
          if (!lov(x, y)) continue;
          baller.push(x, y, z(x, y), v + (hash(gx + k, gy, 8) - .5) * .25, grønn ? 1 : svart ? 2 : 0);
        }
      }
      // gjerder: sidene der naboruta ikke er dyrket (eller utenfor kartet / vann)
      const t = type(X, Y);
      const sider = [[0, -1, X, Y + r, X + r, Y + r], [0, 1, X, Y, X + r, Y], [-1, 0, X, Y, X, Y + r], [1, 0, X + r, Y, X + r, Y + r]];
      for (const [di, dj, x0, y0, x1, y1] of sider) {
        const n = K(i + di, j + dj); if (n === 5 || n === 255 || n === 3) continue;
        if (biter[0].length + biter[1].length + biter[2].length >= T.bit * 6) break;
        // en del kanter står uten gjerde (åpne mot beitet), og en bit mangler her og der
        if (hash(Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2), 9) < .3) continue;
        const L = Math.hypot(x1 - x0, y1 - y0), m = t === 2 ? 11 : t === 1 ? 14 : 11;
        for (let k = 0; k < m; k++) {
          const ax = x0 + (x1 - x0) * k / m - u.cx, ay = y0 + (y1 - y0) * k / m - u.cy, bx = x0 + (x1 - x0) * (k + 1) / m - u.cx, by = y0 + (y1 - y0) * (k + 1) / m - u.cy;
          if (!lov(ax, ay) || !lov(bx, by)) continue;
          const za = z(ax, ay), zb = z(bx, by);
          biter[t].push(ax, ay, za, Math.atan2(by - ay, bx - ax), Math.hypot(L / m, zb - za), Math.atan2(zb - za, L / m));
        }
      }
    }
    u.gard = { baller: new Float32Array(baller), biter: biter.map(b => new Float32Array(b)), tak: T };
  });

  // ---------- modellene (x langs gjerdet / ballens akse, z opp, foten i 0, lengde 1 der den skaleres) ----------
  const flett = gs => { const ut = []; for (let g of gs) { g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals(); ut.push(g); }
    const n = ut.reduce((a, g) => a + g.attributes.position.count, 0), p = new Float32Array(n * 3), no = new Float32Array(n * 3); let o = 0;
    for (const g of ut) { p.set(g.attributes.position.array, o * 3); no.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(no, 3)); return geo; };
  // uten: sidene som ikke synes og kan utelates (BoxGeometry-gruppene: 0 +x, 1 −x, 2 +y, 3 −y, 4 +z, 5 −z) – endene på en list, bunnen
  // på en stolpe. Gjerdene var 75 000 trekanter ved Dombås (14. nov).
  const kasse = (x, y, zz, sx, sy, sz, rx = 0, uten = null) => { let g = new THREE.BoxGeometry(sx, sy, sz);
    if (uten) { const ix = g.index.array, ny = []; for (const gr of g.groups) if (!uten.includes(gr.materialIndex)) for (let q = gr.start; q < gr.start + gr.count; q++) ny.push(ix[q]); g.setIndex(ny); g.clearGroups(); }
    if (rx) g.rotateY(rx); g.translate(x, y, zz); return g; };
  function modeller() {
    const ball = new THREE.CylinderGeometry(.62, .62, 1.2, 8, 1); ball.rotateZ(Math.PI / 2); ball.translate(0, 0, .6);
    // stolpe ved starten av biten + to streng og netting (en tynn plate med rutemønster i fargen)
    const stolpe = flett([kasse(0, 0, .6, .04, .11, 1.2, 0, [5]), kasse(.5, 0, 1.08, 1, .025, .03, 0, [0, 1]), kasse(.5, 0, .25, 1, .025, .03, 0, [0, 1])]);
    // skigard: en staur (stående) og tre skrå skier mellom dem
    const ski = [kasse(0, 0, .7, .035, .12, 1.4, 0, [5])];
    for (let k = 0; k < 3; k++) ski.push(kasse(.17 + k * .33, 0, .7, .85, .045, .05, -1.15, [0, 1]));
    const skigard = flett(ski);
    // steingjerde: fire kantete steiner (8 trekanter hver, før 20) i en lav rad (biten er ca. 2,9 m, så steinene er smale i x før skaleringen)
    const st = []; for (let k = 0; k < 4; k++) { const g = new THREE.OctahedronGeometry(1, 0); g.rotateZ(k * 1.1); g.rotateX(.4 + k * .7); g.scale(.19, .4 + .06 * (k % 2), .32 + .05 * ((k * 2) % 3)); g.translate(.125 + k * .25, ((k * 7) % 3 - 1) * .06, .24); st.push(g); }
    const stein = flett(st);
    const netting = new THREE.PlaneGeometry(1, .85); netting.rotateX(Math.PI / 2); netting.translate(.5, 0, .58);
    return { ball, stolpe, skigard, stein, netting };
  }
  // nettingteksturen: ruter med gjennomsiktige hull (alphaTest, ingen sortering)
  function nettTekstur() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.strokeStyle = 'rgba(150,150,140,1)'; g.lineWidth = 3;
    for (let k = 0; k <= 64; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 64); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(64, k); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 4); return t;
  }

  let G = null;
  function fjern(Rr) { if (G) for (const m of G.mesh) { Rr.scene.remove(m); m.geometry.dispose(); if (m.material.map) m.material.map.dispose(); m.material.dispose(); } G = null; }
  function nett(geo, mat, n) { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, n) * 3).fill(1), 3); m.count = n; m.frustumCulled = false; return m; }

  KROKER.sett3d.push((u, Rr) => {
    fjern(Rr); if (u.S > 2200 || !u.gard) return;
    const M = modeller(), d = u.gard; G = { u, mesh: [], ball: null };
    // rundballene: hvit, grønn eller svart plast. Ballene og gjerdene ligger i ruter (ruteNett i index.html): bare rutene i synsfeltet
    // og nær nok tegnes (før ble alle tegnet hver ramme i hele utsnittet)
    const nb = d.baller.length / 5;
    if (nb) { const F = [[.9, .91, .88], [.28, .44, .27], [.1, .1, .1]];
      G.ball = ruteNett(Rr, nb, (k, o2, c2) => { const q = k * 5; o2.position.set(d.baller[q], d.baller[q + 1], d.baller[q + 2] - .08); o2.rotation.set(0, 0, d.baller[q + 3]);
        const f = F[d.baller[q + 4]], s = .94 + .06 * hash(k, nb, 3); c2.setRGB(f[0] * s, f[1] * s, f[2] * s); }, M.ball, new THREE.MeshLambertMaterial({ color: 0xffffff }), { celle: 200, maks: 900 });
      G.mesh.push(...G.ball.mesh); }
    // gjerdebitene: posisjon, retning i planet, lengde (skalert i x) og helning
    const legg = (data, geo, mat, farge) => { const n = data.length / 6; if (!n) return;
      const gr = ruteNett(Rr, n, (k, o2, c2) => { const q = k * 6; o2.position.set(data[q], data[q + 1], data[q + 2] - .05); o2.rotation.set(0, -data[q + 5], data[q + 3], 'ZYX'); o2.scale.set(data[q + 4], 1, 1);
        const f = farge(k), s = .85 + .3 * hash(k, n, 5); c2.setRGB(f[0] * s, f[1] * s, f[2] * s); }, geo, mat, { celle: 160, maks: 550 });
      G.mesh.push(...gr.mesh); };
    const tre = () => [.42, .33, .24], grå = () => [.5, .5, .48];
    legg(d.biter[0], M.stolpe, new THREE.MeshLambertMaterial({ color: 0xffffff }), tre);
    legg(d.biter[0], M.netting, new THREE.MeshLambertMaterial({ color: 0xffffff, map: nettTekstur(), alphaTest: .5, side: THREE.DoubleSide }), () => [.75, .75, .72]);
    legg(d.biter[1], M.skigard, new THREE.MeshLambertMaterial({ color: 0xffffff }), () => [.47, .4, .32]);
    legg(d.biter[2], M.stein, new THREE.MeshLambertMaterial({ color: 0xffffff }), grå);
    sesong();
  });
  // rundballene står ute bare sommer og høst
  function sesong() { if (!G || !G.ball) return; const å = (window.VAER && VAER.årstid) || 'sommer'; G.ball.av = !(å === 'sommer' || å === 'høst'); }
  KROKER.ramme3d.push(Rr => { if (G && G.u === Rr.ut) sesong(); });

  // for vakt og tester: punktene (x, y, z) per slag, og antall/trekanter i scenen
  function punkter(u) {
    const ut = {}; if (!u || !u.gard) return ut; const d = u.gard;
    const b = []; for (let q = 0; q < d.baller.length; q += 5) b.push(d.baller[q], d.baller[q + 1], d.baller[q + 2]);
    ut.rundball = new Float32Array(b);
    ['gjerde', 'skigard', 'steingjerde'].forEach((navn, t) => { const a = []; for (let q = 0; q < d.biter[t].length; q += 6) a.push(d.biter[t][q], d.biter[t][q + 1], d.biter[t][q + 2]); ut[navn] = new Float32Array(a); });
    return ut;
  }
  function antall() { const ut = { mesh: 0, trekanter: 0 }; if (G) for (const m of G.mesh) { ut.mesh++; const g = m.geometry; ut.trekanter += (g.index ? g.index.count : g.attributes.position.count) / 3 * m.count; } return ut; }
  window.Gard3d = { punkter, antall, type };
})();
