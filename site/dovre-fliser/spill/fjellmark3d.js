/* Riksbrudd – FJELLMARK NÆR DEG I 3D (runde 6, 19. nov, kritikken på telefon: «3D fra snaufjellet er nesten tomt: flat, brun mark»). Prøvd ved 1665 moh. på Dovre (bilde i scratchpad natt6/ga/fjellmark-hoyt-pc.png).
 * Over tregrensen var bakken nær kameraet bare kartfargen med noen få store steiner (smått3d: ca. én stein per 150 m²). Når du går
 * (eller er under 110 m over bakken), legges det nå småstein, lav og mose, lyngtuer og snøflekker rundt deg – som gresset (gress3d):
 * fordelt på nytt når du har gått 12 m, innen REGLER.rad meter, og bare der det er fjellmark: over tregrensen (Vegetasjon.tregrense)
 * eller på grått/brunt snaufjell i kartet. Snøflekkene ligger der det er høyt nok etter årstiden (VAER.snøgrense) og ikke om vinteren
 * (da ligger snøen overalt). Aldri i vann, bekk, veg, spor, hus eller leirens bygg.
 * Fire instansnett med hjørnefarger (ingen teksturer, ingen nye lys): stein (20 trekanter), lav/mose (åttekantet pute, 32), lyngtue
 * (samme pute, mørk og ujevn) og snøflekk (flat, ujevn skive, 7). Ca. 50 000 trekanter på PC når alt er fullt (bare rundt deg). Mengden følger
 * grafikknivået (KVAL.p.gress, men minst 40 % – også på Lav, der gresset er borte). Reglene øverst er uten DOM (Node: require('./fjellmark3d'), test_fjellmark3d.js).
 */
(function (rot) {
  'use strict';
  // Claudes forslag (alle tallene):
  const REGLER = {
    // radius rundt kameraet (m) og hvor langt du går før alt fordeles på nytt (m)
    rad: 48, flytt: 12,
    // høyst så mange per slag [PC, mobil]
    maks: { stein: [520, 220], lav: [700, 280], lyng: [520, 200], snø: [26, 10] },
    // størrelser (m, radius): stein, lav/mose, lyngtue, snøflekk
    str: { stein: [.07, .42], lav: [.18, .6], lyng: [.2, .55], snø: [1.2, 4.2] },
    // fjellmark: så mange meter under tregrensen begynner den (glir inn), og snøflekker fra så mange meter under snøgrensen
    underTregrensen: 60, snøUnder: 420,
    // andelen forsøk som blir snøflekk der det er høyt nok (de ligger i søkk og på le-sider – her bare spredt)
    snøAndel: .035,
    // andelen på grafikknivå Lav (der gresset er av)
    lavAndel: .4,
  };
  // Er dette fjellmark? moh = høyden, tg = tregrensen (moh), rgb = kartfargen (0–255). Gir 0–1 (hvor tett).
  function fjell(moh, tg, rgb) {
    const over = (moh - (tg - REGLER.underTregrensen)) / REGLER.underTregrensen;
    const [r, g, b] = rgb, grå = Math.abs(r - g) + Math.abs(g - b) < 26 && r + g + b > 240, brun = r > b + 10 && g >= b && r + g + b < 560 && g < r + 12;
    // grått langt under tregrensen er oftere asfalt og grus enn berg: bare brun hei (Rogaland) får fjellmark der
    const kart = grå ? (over > -1 ? .85 : 0) : brun ? .55 : 0;
    // over tregrensen: tettere jo høyere (full 60 m over); under den bare der kartet er grått/brunt (glisnere langt nede)
    return Math.max(0, Math.min(1, Math.max(Math.min(1, over), kart * (over > -1 ? 1 : .35))));
  }
  // Hvilket slag et forsøk blir (tilfeldig tall r 0–1, tetthet t 0–1, snø = om snøflekker er mulig her)
  function slag(r, t, snø) {
    if (snø && r < REGLER.snøAndel) return 'snø';
    if (r > .35 + .5 * t) return null;
    const q = (r * 7.31) % 1;
    return q < .38 ? 'stein' : q < .72 ? 'lav' : 'lyng';
  }
  const api = { REGLER, fjell, slag };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Fjellmark = api;

  // ---------------------------------------------------------------- VISNINGEN (bare i nettleseren)
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  let M = null, senter = null, utsnitt = null, nøkkel = '';
  // hjørnefarger på en geometri: f(x, y, z) -> [r, g, b]
  function farg(g, f) { const p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) c.set(f(p.getX(i), p.getY(i), p.getZ(i)), i * 3); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; }
  function lag(R) {
    const T = THREE, mob = VW < 900, mat = () => new T.MeshLambertMaterial({ vertexColors: true });
    // stein: rund klump (ikosaeder), flatere oppå, mørkere nede, lyse lavflekker
    const gs = new T.IcosahedronGeometry(1, 0).toNonIndexed(); gs.scale(1, .8, .55); gs.translate(0, 0, .25); gs.computeVertexNormals();
    farg(gs, (x, y, z) => { const v = .42 + .1 * Math.sin(x * 9 + y * 5), lys = z > .55 && Math.sin(x * 13 + y * 7) > .3; return lys ? [.72, .74, .62] : [v, v * 1.01, v * 1.03].map(c => c * (z < 0 ? .7 : 1)); });
    // lav og mose: lav, åttekantet pute (kjegle med flat topp)
    const gl = new T.CylinderGeometry(.55, 1, .12, 8, 1).toNonIndexed(); gl.rotateX(Math.PI / 2); gl.translate(0, 0, .04); gl.computeVertexNormals();
    farg(gl, (x, y, z) => (z > .05 ? [.8, .82, .7] : [.62, .64, .52]));
    // lyngtue: en lav, mørk pute (som lav-puten, men brun/olivengrønn og ujevn – to kryssede flak så ut som små kasser på avstand)
    const gy = gl.clone(); farg(gy, (x, y, z) => (z > .05 ? [.36, .3, .2] : [.22, .18, .12]));
    // snøflekk: flat skive med ujevn kant, litt over bakken
    const gn = new T.CircleGeometry(1, 7).toNonIndexed(); { const p = gn.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), r = Math.hypot(x, y); if (r > .5) { const a = Math.atan2(y, x), k = .75 + .25 * Math.sin(a * 3 + 1) + .12 * Math.sin(a * 5); p.setXY(i, x * k, y * k); } } }
    gn.translate(0, 0, .04); gn.computeVertexNormals(); farg(gn, (x, y) => (Math.hypot(x, y) > .6 ? [.82, .84, .88] : [.93, .94, .97]));
    const mk = (g, m, n, navn) => { const im = new T.InstancedMesh(g, m, n); im.count = 0; im.frustumCulled = false; im.name = 'fjellmark-' + navn; im.instanceColor = new T.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); R.scene.add(im); return im; };
    const Q = REGLER.maks, k = mob ? 1 : 0, snøMat = mat(); snøMat.polygonOffset = true; snøMat.polygonOffsetFactor = -2; snøMat.polygonOffsetUnits = -2;
        M = { stein: mk(gs, mat(), Q.stein[k], 'stein'), lav: mk(gl, mat(), Q.lav[k], 'lav'), lyng: mk(gy, mat(), Q.lyng[k], 'lyng'), snø: mk(gn, snøMat, Q.snø[k], 'snø') };
  }
  function bort(R) { if (!M) return; for (const m of Object.values(M)) { R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } M = null; senter = null; }
  // er det lov å legge noe på (x, y) i utsnittets meter?
  function fri(u, x, y) {
    if (typeof iVann3d === 'function' && iVann3d(u, x, y)) return false;
    if ((u.vegNær && u.vegNær(x, y)) || (u.påVeg && u.påVeg(x, y)) || (u.påBane && u.påBane(x, y))) return false;
    if (typeof hindring3d === 'function' && hindring3d(x, y)) return false;
    if (u.hus && u.hus.omriss && typeof nærHus === 'function' && nærHus(u, x, y)) return false;
    if (window.Interior3d && Interior3d.iLeirbygg && Interior3d.iLeirbygg(x, y)) return false;
    return true;
  }
  function fordel(R) {
    const u = R.ut, c = R.cam.position, B = u.bunn, W = B.W, tg = window.Vegetasjon && Vegetasjon.tregrense ? Vegetasjon.tregrense(u.cy, u.cx) : 1100;
    const V = window.VAER, vinter = V && V.årstid === 'vinter', snøgr = V && V.snøgrense != null ? V.snøgrense : 1900;
    // (også på Lav – der er gresset borte, og uten fjellmarka var bakken helt tom: telefonen med programvare-grafikk starter på Lav)
    const andel = window.KVAL ? Math.max(REGLER.lavAndel, KVAL.p.gress) : 1, n = { stein: 0, lav: 0, lyng: 0, snø: 0 }, d = new THREE.Object3D(), col = new THREE.Color();
    const maks = {}; for (const s of Object.keys(M)) maks[s] = Math.round(M[s].instanceMatrix.count * andel);
    let f = (Math.floor(c.x) * 73856093 ^ Math.floor(c.y) * 19349663 ^ 0x5bd1e995) >>> 0; const rnd = () => (f = (f * 1664525 + 1013904223) >>> 0) / 4294967296;
    const tot = maks.stein + maks.lav + maks.lyng;
    for (let t = 0; t < tot * 3 && n.stein + n.lav + n.lyng < tot; t++) {
      const a = rnd() * 6.283, rr = REGLER.rad * Math.sqrt(rnd()), x = c.x + Math.cos(a) * rr, y = c.y + Math.sin(a) * rr;
      const i = Math.floor((x + u.S) / (2 * u.S) * W), j = Math.floor((u.S - y) / (2 * u.S) * W); if (i < 0 || j < 0 || i >= W || j >= W) continue;
      const q = (j * W + i) * 3, rgb = [B.rgb[q], B.rgb[q + 1], B.rgb[q + 2]], moh = hoyde3d(u.cx + x, u.cy + y, u);
      // skog (bunnkartet 2) er aldri fjellmark
      if (B.gress[j * W + i] === 2) continue;
      const tett = fjell(moh, tg, rgb); if (tett <= 0) continue;
      const snøHer = !vinter && moh > snøgr - REGLER.snøUnder && moh < snøgr, s = slag(rnd(), tett, snøHer); if (!s || n[s] >= maks[s]) continue;
      if (vinter && s !== 'stein') continue;
      if (moh > snøgr && s !== 'stein') continue;
      if (!fri(u, x, y)) continue;
      const z = typeof nettHoyde === 'function' ? nettHoyde(u, x, y) : (moh - u.h0) * R.EX, [s0, s1] = REGLER.str[s], k = rnd(), r = s0 + (s1 - s0) * k * k;
      d.position.set(x, y, z - (s === 'stein' ? r * .3 : 0)); d.rotation.set(0, 0, rnd() * 6.283);
      if (s === 'snø') { const e = .6; const hx = typeof nettHoyde === 'function' ? nettHoyde(u, x + e, y) - nettHoyde(u, x - e, y) : 0, hy = typeof nettHoyde === 'function' ? nettHoyde(u, x, y + e) - nettHoyde(u, x, y - e) : 0;
        d.rotation.set(Math.atan2(hy, 2 * e), -Math.atan2(hx, 2 * e), rnd() * 6.283, 'ZXY'); d.position.z = z + .02; }
      d.scale.set(r * (.75 + rnd() * .5), r * (.75 + rnd() * .5), r * (s === 'lyng' ? 1.6 : 1));
      d.updateMatrix(); M[s].setMatrixAt(n[s], d.matrix);
      // fargen per ting: steinene i grått/brunt, lav fra lys reinlav til mørk mose, lyng fra rødbrun til grønn
      if (s === 'stein') { const v = .8 + rnd() * .35, b = rnd() < .3 ? .9 : 1; col.setRGB(v, v * b, v * b * .97); }
      else if (s === 'lav') { const m = rnd(); m < .55 ? col.setRGB(1, 1, .92) : m < .8 ? col.setRGB(.62, .7, .5) : col.setRGB(.5, .54, .4); }
      else if (s === 'lyng') { const m = rnd(); col.setRGB(.85 + m * .35, .8 + (1 - m) * .3, .75); }
      else col.setRGB(1, 1, 1);
      M[s].setColorAt(n[s], col); n[s]++;
    }
    for (const s of Object.keys(M)) { M[s].count = n[s]; M[s].instanceMatrix.needsUpdate = true; if (M[s].instanceColor) M[s].instanceColor.needsUpdate = true; }
    Fjellmark.sist = n;
  }
  KROKER.ramme3d.push(R => {
    const u = R.ut; if (!u || !u.bunn) return;
    const nær = R.fot || R.bane.avst < 110;
    if (!nær) { if (M) for (const m of Object.values(M)) m.visible = false; return; }
    if (!M) lag(R); for (const m of Object.values(M)) { m.visible = true; if (m.parent !== R.scene) R.scene.add(m); }
    const c = R.cam.position, V = window.VAER, nk = (V ? V.årstid + '|' + Math.round((V.snøgrense || 0) / 50) : '') + '|' + (window.KVAL ? KVAL.v : 0);
    if (utsnitt !== u || nk !== nøkkel) { utsnitt = u; nøkkel = nk; senter = null; }
    if (senter && Math.hypot(c.x - senter[0], c.y - senter[1]) < REGLER.flytt) return;
    // (en feil her skal ikke stoppe de andre krokene i bildet)
    senter = [c.x, c.y]; try { fordel(R); } catch (e) { console.warn('fjellmark:', e); }
  });
  // 3D slått av: alt bort (lages på nytt neste gang)
  setInterval(() => { const R = r3(); if (M && R && typeof på3d !== 'undefined' && !på3d) bort(R); }, 500);
  rot.Fjellmark.antall = () => (M ? Object.fromEntries(Object.entries(M).map(([s, m]) => [s, m.visible ? m.count : 0])) : null);
})(typeof globalThis !== 'undefined' ? globalThis : this);
