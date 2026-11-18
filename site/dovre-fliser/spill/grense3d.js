/* Riksbrudd – GRENSA I 3D (18.–19. nov kveld, pakke «lys», gjennomgang nr. 49: «i 2D er alt utenfor Rogaland mørklagt, i 3D ikke»).
 * På et mindre spillkart (/rogaland, spill/omraade.js) mørklegges alt utenfor fylket også i 3D – terrenget, husene, trærne og tingene –
 * på samme måte som i 2D (mot nesten svart, 60 %), med en myk overgang ved grensa, og grensa er en stiplet gul strek på bakken.
 * Slik: én maske over hele fylket (1 inne, 0 ute, glattet), laget én gang i biter med pust. lys3d.js har lagt et oppslag i masken inn i
 * three.js sin tåke (fog_fragment): alt som har tåke, mørklegges etter hvor det står i verden. Ingen nye nett for det, ingen ekstra
 * tegning, og ingenting å gjøre når et nytt utsnitt lages (bare to tall per bilde). Bare der siden har et område – /norge og
 * /dovre-fliser er som før (Lys3d.init kobler det ikke på der).
 * Reglene øverst uten DOM (Node: require('./grense3d'), test: node pipeline/fliser/test_grense3d.js). window.Grense3d i nettleseren.
 */
(function (rot) {
  'use strict';
  // Claudes forslag (alle tallene):
  const REGLER = {
    // som i 2D (omraade.js: rgba(8,8,10,.6) over alt utenfor)
    mørk: .6, farge: [8 / 255, 8 / 255, 10 / 255],
    // masken: så mange punkter på den lengste siden (ca. 100 m per punkt for Rogaland), luft rundt området (meter, er alltid «ute»)
    punkter: 2048, luft: 4000,
    // glatting: boksfilter med denne radiusen (punkter), så mange runder (tre runder ≈ en myk overgang på ca. 600 m)
    glatt: 2, runder: 3,
    // streken på bakken: et punkt hver strekSteg m, løftet strekLøft m + strekLøftPerKm per km fra midten av utsnittet
    // (terrengnettet er glissere mot kanten), stiplet som i 2D (strek, mellomrom i meter)
    strekSteg: 15, strekLøft: 2.5, strekLøftPerKm: 3, strek: 36, mellomrom: 26, strekFarge: 0xe8d48a, strekAlfa: .8,
  };

  // Rutenettet for masken: kvadratiske punkter, bredden et helt antall av 4 (radene i bildet)
  function rute(O, R = REGLER) {
    const b = O.bb, x0 = b[0] - R.luft, y0 = b[1] - R.luft, bx = b[2] - b[0] + 2 * R.luft, by = b[3] - b[1] + 2 * R.luft;
    const ts = Math.max(bx, by) / R.punkter, W = Math.ceil(bx / ts / 4) * 4, H = Math.ceil(by / ts);
    return { x0, y0, ts, W, H, x1: x0 + W * ts, y1: y0 + H * ts };
  }

  // Masken som generator (yield mellom bitene): d[j * W + i] = 255 inne, 0 ute, glattet. Rad j = y0 + (j + 0,5) · ts (nordover).
  // Inne/ute med samme regel som Omraade.inni (partall/oddetall av kryssinger), for midten av hvert punkt.
  function* maskeG(O, R = REGLER) {
    const M = rute(O, R), { W, H, ts, x0, y0 } = M, d = new Uint8Array(W * H), P = O.P, n = P.length, xs = [];
    for (let j = 0; j < H; j++) {
      const y = y0 + (j + .5) * ts; xs.length = 0;
      for (let i = 0, k = n - 1; i < n; k = i++) { const a = P[i], b = P[k]; if ((a[1] > y) !== (b[1] > y)) xs.push((b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]); }
      xs.sort((a, b) => a - b);
      // punkt i er inne når midten x0 + (i + 0,5)·ts ligger før et oddetall kryssinger: mellom xs[2m] og xs[2m+1]
      for (let m = 0; m + 1 < xs.length; m += 2) {
        const i0 = Math.max(0, Math.ceil((xs[m] - x0) / ts - .5)), i1 = Math.min(W, Math.ceil((xs[m + 1] - x0) / ts - .5));
        if (i1 > i0) d.fill(255, j * W + i0, j * W + i1);
      }
      if ((j & 63) === 63) yield;
    }
    // glatting: boksfilter langs radene og langs kolonnene, R.runder ganger (kantene gjentas)
    const r = R.glatt, L = 2 * r + 1, rad = new Uint8Array(Math.max(W, H));
    for (let runde = 0; runde < R.runder; runde++) {
      for (let j = 0; j < H; j++) {
        const o = j * W; rad.set(d.subarray(o, o + W));
        let s = 0; for (let k = -r; k <= r; k++) s += rad[Math.min(W - 1, Math.max(0, k))];
        for (let i = 0; i < W; i++) { d[o + i] = (s + r) / L | 0; s += rad[Math.min(W - 1, i + r + 1)] - rad[Math.max(0, i - r)]; }
        if ((j & 127) === 127) yield;
      }
      for (let i = 0; i < W; i++) {
        for (let j = 0; j < H; j++) rad[j] = d[j * W + i];
        let s = 0; for (let k = -r; k <= r; k++) s += rad[Math.min(H - 1, Math.max(0, k))];
        for (let j = 0; j < H; j++) { d[j * W + i] = (s + r) / L | 0; s += rad[Math.min(H - 1, j + r + 1)] - rad[Math.max(0, j - r)]; }
        if ((i & 127) === 127) yield;
      }
    }
    M.d = d; return M;
  }
  function maske(O, R) { const it = maskeG(O, R); let r; while (!(r = it.next()).done); return r.value; }
  // Maskens verdi 0–1 i et punkt (som grafikkortet: lineært mellom midtene, kanten gjentas utenfor)
  function verdi(M, x, y) {
    const u = (x - M.x0) / M.ts - .5, v = (y - M.y0) / M.ts - .5, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    const q = (a, b) => M.d[Math.min(M.H - 1, Math.max(0, b)) * M.W + Math.min(M.W - 1, Math.max(0, a))] / 255;
    return (q(i, j) * (1 - fu) + q(i + 1, j) * fu) * (1 - fv) + (q(i, j + 1) * (1 - fu) + q(i + 1, j + 1) * fu) * fv;
  }
  // Hvor mye et punkt mørklegges (0 inne – REGLER.mørk langt ute)
  const mørke = (M, x, y, R = REGLER) => R.mørk * (1 - verdi(M, x, y));

  // Grensas biter inne i en boks [x0, y0, x1, y1]: lister av punkter hver ca. R.strekSteg m (grensa er en lukket ring)
  function biter(O, bb, R = REGLER) {
    const P = O.P, n = P.length, ut = []; let cur = null;
    const inne = (x, y) => x >= bb[0] && x <= bb[2] && y >= bb[1] && y <= bb[3];
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(L / R.strekSteg));
      for (let s = 0; s < k; s++) {
        const t = s / k, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        if (inne(x, y)) { if (!cur) ut.push(cur = []); cur.push([x, y]); } else cur = null;
      }
    }
    // ringen: siste bit fortsetter i den første
    if (ut.length > 1 && inne(P[0][0], P[0][1]) && cur && cur === ut[ut.length - 1]) { const f = ut.shift(); cur.push(...f); }
    return ut.filter(b => b.length > 1);
  }

  const Grense3d = { REGLER, rute, maskeG, maske, verdi, mørke, biter };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Grense3d; return; }
  rot.Grense3d = Grense3d;
  if (typeof KROKER === 'undefined') return;

  // ---------- visningen (bare når siden har et område: /rogaland) ----------
  const S = { M: null, bygger: false, strek: null, mat: null, feil: null };
  Grense3d.tilstand = () => S;
  async function lagMaske(O) {
    S.bygger = true;
    try {
      const M = typeof kjørAsynk === 'function' ? await kjørAsynk(maskeG(O)) : maske(O);
      const RG = window.Lys3d && Lys3d.RG; if (!RG || !RG.tex) return;
      RG.tex.image = { data: M.d, width: M.W, height: M.H }; RG.tex.needsUpdate = true; S.M = M;
    } catch (e) { S.feil = String(e && e.message || e); } finally { S.bygger = false; }
  }
  // hvert bilde: hvor masken ligger i scenens mål (scenen har sitt nullpunkt midt i utsnittet), og hvor mørkt
  KROKER.ramme3d.push(R => {
    const O = rot.SPILLOMRÅDE, RG = window.Lys3d && Lys3d.RG; if (!O || !RG || !RG.tex || !R.ut) return;
    if (!S.M) { if (!S.bygger && !S.feil) lagMaske(O); return; }
    const M = S.M, u = R.ut, o = RG.O, f = RG.F;
    o[0] = M.x0 - u.cx; o[1] = M.y0 - u.cy; o[2] = 1 / (M.W * M.ts); o[3] = 1 / (M.H * M.ts);
    f[0] = REGLER.mørk; f[1] = REGLER.farge[0]; f[2] = REGLER.farge[1]; f[3] = REGLER.farge[2];
    if (S.strek && S.strek.userData.ut !== u) settStrek(u, R);
    else if (!S.strek) settStrek(u, R);
  });
  // Streken på bakken (stiplet, som i 2D): grensas biter inne i utsnittet, med høydene fra utsnittet
  function settStrek(u, R) {
    const O = rot.SPILLOMRÅDE; if (!O || typeof hoyde3d !== 'function') return;
    if (S.strek) { R.scene.remove(S.strek); S.strek.geometry.dispose(); S.strek = null; }
    const bb = [u.cx - u.S, u.cy - u.S, u.cx + u.S, u.cy + u.S], deler = biter(O, bb);
    const pos = [], avst = [];
    for (const b of deler) {
      let s = 0;
      for (let k = 0; k + 1 < b.length; k++) {
        const p = b[k], q = b[k + 1], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
        for (const [x, y, d] of [[p[0], p[1], s], [q[0], q[1], s + L]]) {
          const løft = REGLER.strekLøft + REGLER.strekLøftPerKm * Math.hypot(x - u.cx, y - u.cy) / 1000;
          pos.push(x - u.cx, y - u.cy, (hoyde3d(x, y, u) - u.h0) * R.EX + løft); avst.push(d);
        }
        s += L;
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('lineDistance', new THREE.Float32BufferAttribute(avst, 1));
    if (!S.mat) S.mat = new THREE.LineDashedMaterial({ color: REGLER.strekFarge, dashSize: REGLER.strek, gapSize: REGLER.mellomrom, transparent: true, opacity: REGLER.strekAlfa, depthWrite: false });
    const l = new THREE.LineSegments(g, S.mat); l.frustumCulled = false; l.renderOrder = 4; l.userData.ut = u; l.userData.grense = true;
    R.scene.add(l); S.strek = l;
  }
  // tall for vakta og prøvene
  Grense3d.sjekk = () => { const RG = window.Lys3d && Lys3d.RG;
    return { område: !!rot.SPILLOMRÅDE, koblet: !!(RG && RG.tex), maske: S.M ? [S.M.W, S.M.H, Math.round(S.M.ts)] : null, mørk: RG ? RG.F[0] : 0,
      strek: S.strek ? S.strek.geometry.attributes.position.count / 2 : 0, feil: S.feil }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);
