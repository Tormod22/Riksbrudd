'use strict';
// Bekker og elver i kartet og i 3D (data: data/bekker.json fra NVE Elvenett, regler i spill/bekker.js).
// 2D (KROKER.tegn): tynne blå linjer oppå kartflisene, bredde etter orden; små bekker først når du er nær.
// 3D: KROKER.bygg3d maler bekkene inn i bakken (vann og våt kant), tar bort trær, busker og gress i bekken
//     og lager vannbåndet nær kameraet (S ≤ 2200); KROKER.sett3d lager nettet (vann med glans, rennende krusning og hvitt skum
//     der det er bratt); KROKER.ramme3d driver strømmen. Under vegene går bekken i kulvert (kuttet ut i bekker.py).
(function () {
  // DATA_V = sha256 av reservefila data/bekker.json (Dovre-piloten, brukes når releasen med hele Norge ikke svarer)
  const DATA_V = '075ec685';
  let kildeSjekk = 0;
  const STAT = window.BEKKER_STAT = { linjer: 0, tegnet2d: 0, bånd3d: 0, maling3d: 0, trærFjernet: 0, trekanter: 0, kulvert: 0, biter: 0 };
  // hele Norge i biter (spill/nvebiter.js): nivå 0 = brede elver og orden ≥ 5, 1 = orden 3–4, 2 = orden 1–2
  const LAG = window.BEKKER = NveBiter.lag('bekker', '/dovre-fliser/data/bekker.json?v=' + DATA_V, d => Bekker.les(d), () => { kreditér(); if (typeof skitten !== 'undefined') skitten = true; });
  const nivåer = mo => (mo <= 2 ? [0, 1, 2] : mo <= 4 ? [0, 1] : [0]);
  // linjene i bb fra alle bitene
  const iBiter = (biter, bb) => { const ut = []; for (const B of biter) for (const l of Bekker.i(B, bb)) ut.push(l); return ut; };
  function kreditér() { const k = document.getElementById('kilde'); if (k && !k.textContent.includes('Elvenett')) k.textContent += ' · Bekker og elver: NVE Elvenett (NLOD)'; }

  // ---------- 2D ----------
  // minste orden som vises ved målestokken (meter per skjermpunkt)
  const minOrden = m => m <= 6 ? 1 : m <= 12 ? 2 : m <= 24 ? 3 : m <= 48 ? 4 : m <= 90 ? 5 : 99;
  KROKER.tegn.push((g, vx0, vy1) => {
    const m = kam.m, mo = minOrden(m); STAT.tegnet2d = 0; if (mo > 7) return;
    const bb = [vx0, vy1 - VH * m, vx0 + VW * m, vy1], biter = LAG.har(bb, nivåer(mo)); if (!biter.length) return;
    if (++kildeSjekk % 30 === 0) kreditér();
    const linjer = iBiter(biter, bb), grupper = new Map();
    for (const l of linjer) { if (l.orden < mo && !(l.type === 1 && l.orden + 2 >= mo)) continue;
      const w = Math.max(l.type === 1 ? 1.4 : .8 + (l.orden - mo) * .3, l.b / m), k = Math.round(w * 4) / 4;
      if (!grupper.has(k)) grupper.set(k, []); grupper.get(k).push(l); }
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [w, ls] of grupper) {
      g.lineWidth = w; g.strokeStyle = w < 1.2 ? 'rgba(78,128,168,.9)' : 'rgb(64,108,146)'; g.beginPath();
      for (const l of ls) { let sx = -1e9, sy = -1e9;
        for (let k = 0; k < l.P.length; k++) { const x = (l.P[k][0] - vx0) / m, y = (vy1 - l.P[k][1]) / m;
          if (k === 0) g.moveTo(x, y); else if (k === l.P.length - 1 || Math.abs(x - sx) + Math.abs(y - sy) > 1.5) g.lineTo(x, y); else continue; sx = x; sy = y; } }
      g.stroke(); STAT.tegnet2d += ls.length;
    }
    g.restore();
  });

  // ---------- 3D: bakken, vegetasjonen og båndet ----------
  // Lages utenfor kroken: en funksjon laget inne i kroken holder på alt kroken bruker – også kartbildet px (67 MB ved 4096²), som da
  // ble liggende i minnet så lenge utsnittet levde (12. nov).
  const lagIBekk = (m, W, S, cel) => (x, y) => { const i = Math.floor((x + S) / cel), j = Math.floor((S - y) / cel); return i >= 0 && j >= 0 && i < W && j < W && m[j * W + i] === 1; };
  KROKER.bygg3d.push(async (u, { px, TW }) => {
    u.bekk = null; u.iBekk = null;
    const S = u.S, mpp = 2 * S / TW, mo = mpp <= 1.2 ? 1 : mpp <= 2.5 ? 2 : mpp <= 5 ? 3 : 4, bb = [u.cx - S, u.cy - S, u.cx + S, u.cy + S];
    const biter = await LAG.hent(bb, nivåer(mo)); STAT.biter = biter.length; if (!biter.length) return;
    STAT.linjer = biter.reduce((n, B) => n + B.linjer.length, 0); kreditér();
    // kulvert: små bekker (orden ≤ 3) går under vegene i utsnittet (u.påVeg fra liv3d.js, lokale meter) – delene i vegbanen tas bort
    const påVeg = u.påVeg; STAT.kulvert = 0;
    const kulvert = l => { if (!påVeg || l.type !== 0 || l.orden > 3) return null; const ut = []; let bit = [], kutt = false;
      for (const p of Bekker.punkter(l.P, 2)) { if (påVeg(p[0] - u.cx, p[1] - u.cy)) { kutt = true; if (bit.length > 1) ut.push(bit); bit = []; } else bit.push(p); }
      if (!kutt) return null; STAT.kulvert++; if (bit.length > 1) ut.push(bit); return ut; };
    const linjer = [];
    for (const l of iBiter(biter, bb)) { if (!(l.orden >= mo || l.type === 1)) continue;
      const k = kulvert(l); if (!k) linjer.push(l); else for (const P of k) linjer.push({ ...l, P }); }
    // maling i kartet under: våt, mørk kant og vannet i vannfargen (naturfarger() gjør det blankt og lysere etterpå)
    const stemple = (x, y, r, f, a) => {
      const ci = (x - (u.cx - S)) / mpp, cj = ((u.cy + S) - y) / mpp, rp = r / mpp, R2 = Math.max(.5, rp), n = Math.ceil(R2);
      for (let dj = -n; dj <= n; dj++) for (let di = -n; di <= n; di++) { const i = Math.floor(ci + di), j = Math.floor(cj + dj); if (i < 0 || j < 0 || i >= TW || j >= TW) continue;
        const d = Math.hypot(i + .5 - ci, j + .5 - cj); if (d > R2) continue; const q = (j * TW + i) * 4, w = a * Math.min(1, rp * 2) * (d > R2 - .7 ? .6 : 1);
        px[q] += (f[0] - px[q]) * w; px[q + 1] += (f[1] - px[q + 1]) * w; px[q + 2] += (f[2] - px[q + 2]) * w; } };
    const VÅT = [52, 56, 40], VANN = [44, 74, 102];
    // NB: ikke inn i vannmasken u.vann – den sier også hvor du ikke kan gå (bevegelse.js); bekkene vasser du over
    let arb = 0;
    for (const l of linjer) {
      // samme myke linje som vannbåndet, så malingen ligger rett under båndet
      const P = Bekker.punkter(Bekker.myk(l.P), Math.max(mpp * 1.5, 1));
      for (const [x, y] of P) { if ((++arb & 8191) === 0) await pusterom(); stemple(x, y, l.b / 2 + .9, VÅT, .35); }
      for (const [x, y] of P) stemple(x, y, l.b * .4, VANN, 1);
    }
    STAT.maling3d = linjer.length;
    // maske (2048²): ingen trær, busker eller gress i bekken og helt på kanten
    const W = 2048, cel = 2 * S / W, m = new Uint8Array(W * W);
    for (const l of linjer) { const r = l.b / 2 + .9 + cel * .5, rc = Math.ceil(r / cel);
      for (const [x, y] of Bekker.punkter(l.P, cel)) { const ci = Math.floor((x - u.cx + S) / cel), cj = Math.floor((u.cy + S - y) / cel);
        for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) { const a = ci + di, b = cj + dj; if (a < 0 || b < 0 || a >= W || b >= W || (di * di + dj * dj) * cel * cel > r * r) continue; m[b * W + a] = 1; } } }
    const iBekk = lagIBekk(m, W, S, cel);
    u.iBekk = iBekk;
    const sil = data => { const ut = []; for (let k = 0; k < data.length; k += 5) { if (iBekk(data[k], data[k + 1])) { STAT.trærFjernet++; continue; } for (let q = 0; q < 5; q++) ut.push(data[k + q]); } return new Float32Array(ut); };
    STAT.trærFjernet = 0;
    u.iBekk = iBekk;
    if (u.trær) for (const art of Object.keys(u.trær)) u.trær[art] = sil(u.trær[art]);
    if (u.smått) u.smått.busk = sil(u.smått.busk);
    if (u.bunn) { const Bn = u.bunn; for (let j = 0; j < Bn.W; j++) for (let i = 0; i < Bn.W; i++) { const x = -S + (i + .5) / Bn.W * 2 * S, y = S - (j + .5) / Bn.W * 2 * S; if (iBekk(x, y)) Bn.gress[j * Bn.W + i] = 0; } }
    if (S > 2200) return;
    // vannbåndet: myke svinger, punkt hver ~2 m, høyde fra terrenget; rennretning nedover (v øker med strømmen)
    // punkt hver 2 m i lite utsnitt, opp til 4 m i store (trekanter: ca. 22 000 ved S 800, under ca. 60 000 ved S 1700–2200)
    const bånd = [], stegB = Math.max(2, Math.min(4, 2 + (S - 800) / 600));
    for (const l of linjer) {
      let P = Bekker.punkter(Bekker.myk(l.P), stegB).map(([x, y]) => [x - u.cx, y - u.cy]);
      const biter = []; let bit = [];
      for (const p of P) { if (Math.abs(p[0]) < S - 4 && Math.abs(p[1]) < S - 4) bit.push(p); else { if (bit.length > 1) biter.push(bit); bit = []; } }
      if (bit.length > 1) biter.push(bit);
      for (let Q of biter) {
        let P3 = Q.map(([x, y]) => [x, y, (hoyde3d(x + u.cx, y + u.cy, u) - u.h0) * R3.EX]);
        if (P3[P3.length - 1][2] > P3[0][2]) P3 = P3.reverse();
        bånd.push({ P3, b: l.b, type: l.type, f: Bekker.fall(P3) });
      }
    }
    u.bekk = bånd;
  });

  let mesh = null, shader = null;
  function fjern(R) { if (mesh) { R.scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); mesh = null; shader = null; } }
  KROKER.sett3d.push((u, R) => {
    fjern(R); STAT.bånd3d = 0; STAT.trekanter = 0; if (!u.bekk || !u.bekk.length) return;
    const pos = [], kol = [], sk = [], st = [], idx = [];
    // fem punkt på tvers: steinkant, vannkant, midt, vannkant, steinkant. Bredden varierer litt langs bekken (ikke en kanal).
    // Hvert punkt ligger på bakken under seg + et lite løft (polygonOffset gjør resten); aStrom.x: 0–1 i vannet, under 0 / over 1 på kanten.
    const KANT = [.36, .34, .3];
    // høyden fra selve terrengnettet (R.mesh), så båndet verken svever eller blir borte i grove ruter langt fra midten
    const tg = R.mesh && R.mesh.geometry, Mn = tg && tg.parameters ? tg.parameters.widthSegments + 1 : 0, An = (Mn - 1) / (u.N - 1), zN = tg && tg.attributes.position.array;
    const bakke = (x, y) => Mn ? Bekker.nettHøyde(zN, Mn, An, u.S, x, y) : (hoyde3d(x + u.cx, y + u.cy, u) - u.h0) * R3.EX;
    for (const { P3, b, type, f } of u.bekk) {
      const n0 = pos.length / 3, frø = (P3[0][0] * 7.1 + P3[0][1] * 3.7) % 6.283; let L = 0; const farge = type === 1 ? [.34, .46, .55] : [.29, .4, .46];
      for (let k = 0; k < P3.length; k++) {
        const p = P3[k], q = P3[Math.min(P3.length - 1, k + 1)], o = P3[Math.max(0, k - 1)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
        if (k) L += Math.hypot(p[0] - P3[k - 1][0], p[1] - P3[k - 1][1]);
        const s = Bekker.skum(f[k]), h = b / 2 * (.85 + .15 * Math.sin(L * .37 + frø) + .1 * Math.sin(L * .91 + 2 * frø)), e = .3 + b * .08;
        for (const [d, a] of [[-h - e, -.4], [-h, 0], [0, .5], [h, 1], [h + e, 1.4]]) { const x = p[0] + nx * d, y = p[1] + ny * d, z = bakke(x, y);
          pos.push(x, y, z + (a < 0 || a > 1 ? .05 : d ? .08 : .12)); kol.push(...(a < 0 || a > 1 ? KANT : farge)); sk.push(s); st.push(a, L); }
      }
      for (let k = 0; k < P3.length - 1; k++) for (let c = 0; c < 4; c++) { const a = n0 + k * 5 + c, e2 = a + 5; idx.push(a, e2, a + 1, a + 1, e2, e2 + 1); }
      STAT.bånd3d++;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(kol, 3));
    g.setAttribute('aSkum', new THREE.Float32BufferAttribute(sk, 1)); g.setAttribute('aStrom', new THREE.Float32BufferAttribute(st, 2)); g.setIndex(idx); g.computeVertexNormals();
    const mat = new THREE.MeshPhongMaterial({ vertexColors: true, specular: 0x14181c, shininess: 40, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide });
    // GLSL: bare ASCII i navnene
    mat.onBeforeCompile = sh => { sh.uniforms.uTid = { value: 0 }; sh.uniforms.uHimmel = { value: new THREE.Color(.7, .78, .85) }; shader = sh;
      sh.vertexShader = 'attribute float aSkum;\nattribute vec2 aStrom;\nvarying float vSkum;\nvarying vec2 vStrom;\n' + sh.vertexShader.replace('void main() {', 'void main() {\n  vSkum = aSkum; vStrom = aStrom;');
      sh.fragmentShader = 'uniform float uTid;\nuniform vec3 uHimmel;\nvarying float vSkum;\nvarying vec2 vStrom;\n' +
        'float bkH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' +
        'float bkN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(bkH(i), bkH(i + vec2(1.0, 0.0)), f.x), mix(bkH(i + vec2(0.0, 1.0)), bkH(i + vec2(1.0, 1.0)), f.x), f.y); }\n' +
        sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
  float bkFart = 1.2 + 3.0 * vSkum;
  float bkV = bkN(vec2(vStrom.x * 3.0, vStrom.y * 0.7 - uTid * bkFart)) * 0.6 + bkN(vec2(vStrom.x * 8.0 + 3.0, vStrom.y * 2.1 - uTid * bkFart * 1.7)) * 0.4;
  float bkW = smoothstep(-0.1, 0.0, vStrom.x) * (1.0 - smoothstep(1.0, 1.1, vStrom.x));
  float bkE = clamp(abs(vStrom.x * 2.0 - 1.0), 0.0, 1.0);
  diffuseColor.rgb *= mix(0.9 + 0.2 * bkN(vStrom * vec2(9.0, 3.0)), (0.86 + 0.28 * bkV) * (1.0 - 0.3 * bkE * bkE), bkW);
  float bkS = vSkum * smoothstep(0.72 - 0.2 * vSkum, 0.86 - 0.14 * vSkum, bkV) * 0.85 * bkW;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.91, 0.93), clamp(bkS + vSkum * 0.08 * bkW, 0.0, 1.0));`)
        .replace('#include <specularmap_fragment>', `#include <specularmap_fragment>
  specularStrength *= bkW * (1.0 - bkS);`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  float bkF = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 4.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, uHimmel * 0.7, bkF * 0.35 * bkW * (1.0 - bkS));`); };
    mesh = new THREE.Mesh(g, mat); mesh.name = 'bekker'; mesh.renderOrder = 1; R.scene.add(mesh); STAT.trekanter = idx.length / 3; R.bekkMesh = mesh;
  });
  KROKER.ramme3d.push(R => { if (!shader) return; shader.uniforms.uTid.value = (performance.now() / 1000) % 1000; if (R.scene.fog) shader.uniforms.uHimmel.value.copy(R.scene.fog.color); });
})();
