'use strict';
// Regler for ferjer i rute og båter som kjører på sjøen (uten DOM og uten THREE, så de kan testes i Node: pipeline/fliser/test_ferje.js).
// Visningen er spill/ferje3d.js (ferjene og kjølvannet) og spill/kyst3d.js (småbåtene).
// Ferja: ligger ved kai et par minutter (sanntid), akselererer, seiler ca. 6,5 m/s, bremser inn mot kaien og går tilbake (dobbeltendet,
// snur ikke). Den holder seg litt til styrbord (høyre) midt i sambandet, så to ferjer på samme linje går forbi hverandre.
(function (rot) {
  const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; };
  const glatt = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  // fart i m/s, akselerasjon og bremsing i m/s², venting ved kai i sekunder, sideavvik (styrbord) i meter
  const STD = { vmaks: 6.5, aks: .12, brems: .1, vent: [60, 120], side: 22, sideL: 220 };
  const TAK = { pc: 4, mobil: 2 };

  // ---------- linja ----------
  // Chaikin-utjevning (åpen linje, endene beholdes)
  function jevn(P, n) {
    for (let k = 0; k < (n == null ? 2 : n); k++) { if (P.length < 3) return P; const Q = [P[0]];
      for (let i = 0; i < P.length - 1; i++) { const [a, b] = [P[i], P[i + 1]];
        if (i > 0) Q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25]); if (i < P.length - 2) Q.push([a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); }
      Q.push(P[P.length - 1]); P = Q; }
    return P;
  }
  // Ruta mellom to kaier. A, B = { x, y, fx, fy } (liggeplassen midt på ferja og retningen ut fra kaien) eller null (bare linjas ende);
  // P = ferjelinja (punkter [x, y] fra A-enden til B-enden). Ferja går rett ut fra kaien før den følger linja.
  function lagRute(P, A, B, opt) {
    const o = Object.assign({}, STD, opt || {}), ut = (K, d) => [K.x + K.fx * d, K.y + K.fy * d];
    const a0 = A ? [A.x, A.y] : P[0], b0 = B ? [B.x, B.y] : P[P.length - 1];
    const a1 = A ? ut(A, o.ut || 90) : null, b1 = B ? ut(B, o.ut || 90) : null;
    // de indre punktene på linja (ikke for nær endene, så ferja ikke går tilbake)
    const r0 = a1 ? Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) + 60 : 0, r1 = b1 ? Math.hypot(b1[0] - b0[0], b1[1] - b0[1]) + 60 : 0;
    const midt = P.filter(p => Math.hypot(p[0] - a0[0], p[1] - a0[1]) > r0 && Math.hypot(p[0] - b0[0], p[1] - b0[1]) > r1);
    let Q = [a0]; if (a1) Q.push(a1); Q.push(...midt); if (b1) Q.push(b1); Q.push(b0);
    Q = Q.filter((p, i) => !i || Math.hypot(p[0] - Q[i - 1][0], p[1] - Q[i - 1][1]) > .5);
    Q = jevn(Q, 3);
    const s = [0]; for (let i = 1; i < Q.length; i++) s.push(s[i - 1] + Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]));
    const L = s[s.length - 1], h = hash((o.id | 0) + 17);
    const vent = o.vent[0] + (o.vent[1] - o.vent[0]) * h;
    return { P: Q, s, L, vent, reise: reise(L, o), o, fase: hash((o.id | 0) + 911) };
  }
  // punktet s meter langs ruta (uten sideavvik) og retningen der
  function punkt(R, s) {
    s = Math.max(0, Math.min(R.L, s)); let i = 1; while (i < R.s.length - 1 && R.s[i] < s) i++;
    const a = R.P[i - 1], b = R.P[i], l = R.s[i] - R.s[i - 1] || 1, f = (s - R.s[i - 1]) / l;
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, dx: (b[0] - a[0]) / l, dy: (b[1] - a[1]) / l };
  }

  // ---------- fartsprofilen ----------
  // Tid for én overfart på L meter: akselerasjon, marsjfart og bremsing (blir det for kort, en trekant uten marsjfart).
  function reise(L, o) {
    o = Object.assign({}, STD, o || {});
    let v = o.vmaks, da = v * v / (2 * o.aks), db = v * v / (2 * o.brems);
    if (da + db > L) { v = Math.sqrt(2 * L * o.aks * o.brems / (o.aks + o.brems)); da = v * v / (2 * o.aks); db = v * v / (2 * o.brems); }
    const ta = v / o.aks, tb = v / o.brems, tm = (L - da - db) / v;
    return { L, v, ta, tm, tb, T: ta + tm + tb, da, db, aks: o.aks, brems: o.brems };
  }
  // hvor langt ferja har kommet (s) og farten (v) t sekunder inn i overfarten
  function langs(r, t) {
    if (t <= 0) return { s: 0, v: 0 };
    if (t < r.ta) return { s: r.aks * t * t / 2, v: r.aks * t };
    if (t < r.ta + r.tm) return { s: r.da + r.v * (t - r.ta), v: r.v };
    if (t < r.T) { const q = r.T - t; return { s: r.L - r.brems * q * q / 2, v: r.brems * q }; }
    return { s: r.L, v: 0 };
  }
  // Ruteplanen: vent ved A, A→B, vent ved B, B→A. t = sekunder (sanntid), forskyv = andel av runden (to ferjer på samme rute: 0 og 0,5).
  // Gir s (meter fra A), v (fart), retning (+1 mot B, −1 mot A, 0 ved kai), ved ('A', 'B' eller null), igjen (s til avgang når den ligger ved kai).
  function tilstand(R, t, forskyv) {
    const r = R.reise, runde = 2 * (R.vent + r.T);
    let f = ((t / runde + R.fase + (forskyv || 0)) % 1 + 1) % 1 * runde;
    if (f < R.vent) return { s: 0, v: 0, retning: 0, ved: 'A', igjen: R.vent - f, runde };
    f -= R.vent; if (f < r.T) { const l = langs(r, f); return { s: l.s, v: l.v, retning: 1, ved: null, runde }; }
    f -= r.T; if (f < R.vent) return { s: R.L, v: 0, retning: 0, ved: 'B', igjen: R.vent - f, runde };
    f -= R.vent; const l = langs(r, f); return { s: R.L - l.s, v: l.v, retning: -1, ved: null, runde };
  }
  // Sideavviket: styrbord (høyre i fartsretningen) midt i sambandet, null ved kaiene. sist = retningen den sist hadde (ved kai: 0 avvik uansett).
  function avvik(R, s, retning) {
    const o = R.o, k = glatt(s / o.sideL) * glatt((R.L - s) / o.sideL) * Math.min(1, R.L / (4 * o.sideL));
    return (retning || 0) * o.side * k;
  }
  // Hele stillingen: x, y, retningen skroget peker (hx, hy: alltid fra A mot B – ferja snur ikke), fart og planen.
  function stilling(R, t, forskyv) {
    const T = tilstand(R, t, forskyv), p = q => { const a = punkt(R, q), d = avvik(R, q, T.retning); return [a.x + a.dy * d, a.y - a.dx * d]; };
    const [x, y] = p(T.s), e = 15, [x0, y0] = p(Math.max(0, T.s - e)), [x1, y1] = p(Math.min(R.L, T.s + e)), l = Math.hypot(x1 - x0, y1 - y0) || 1;
    return { x, y, hx: (x1 - x0) / l, hy: (y1 - y0) / l, ...T };
  }

  // ---------- båter som kjører rundt ute på sjøen ----------
  // b = { x, y, a (retning), v, vmål, mål: [x, y] }, fri(x, y) = sjø og minst 30 m fra land, rnd() = tilfeldig 0–1 (fast frø).
  // Styrer mot målet med begrenset svingfart; er det land rett foran, velges nytt mål og båten svinger hardere. stopp = storm (bremser).
  function nyttMål(b, fri, rnd) {
    for (let i = 0; i < 16; i++) {
      const a = rnd() * 6.283, r = 120 + rnd() * 260, x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r; if (!fri(x, y)) continue;
      let ok = true; for (let t = 15; t < r && ok; t += 15) ok = fri(b.x + Math.cos(a) * t, b.y + Math.sin(a) * t);
      if (ok) return [x, y];
    }
    return null;
  }
  function kjør(b, dt, fri, rnd, stopp) {
    if (!b.mål || Math.hypot(b.mål[0] - b.x, b.mål[1] - b.y) < 25) b.mål = nyttMål(b, fri, rnd);
    const fram = (d, da) => fri(b.x + Math.cos(b.a + (da || 0)) * d, b.y + Math.sin(b.a + (da || 0)) * d);
    let sving = .22;
    if (!fram(30)) { b.mål = nyttMål(b, fri, rnd); sving = .6; if (!b.mål) b.mål = [b.x + Math.cos(b.a + (fram(30, 1) ? 1 : -1)) * 60, b.y + Math.sin(b.a + (fram(30, 1) ? 1 : -1)) * 60]; }
    if (b.mål) { let d = Math.atan2(b.mål[1] - b.y, b.mål[0] - b.x) - b.a; d = Math.atan2(Math.sin(d), Math.cos(d)); b.a += Math.max(-sving * dt, Math.min(sving * dt, d)); }
    const vm = stopp ? 0 : (b.vmål || 4) * (fram(18) ? 1 : .3);
    b.v += Math.max(-.8 * dt, Math.min(.5 * dt, vm - (b.v || 0)));
    const nx = b.x + Math.cos(b.a) * b.v * dt, ny = b.y + Math.sin(b.a) * b.v * dt;
    // aldri inn på land: står heller stille og svinger
    if (fri(nx, ny)) { b.x = nx; b.y = ny; } else b.v = 0;
    return b;
  }

  // ---------- gynging etter vinden ----------
  // Stille: nesten ingenting; storm: kraftig. Ute på sjøen mer enn ved kai (le). Gir amp (ganges med grunnbevegelsen) og takt (fart på svingningen).
  function gynging(fart, fri) {
    const f = Math.max(0, fart || 0), amp = Math.min(3, .08 + Math.pow(f / 9, 1.4)) * (fri ? 1 : .4);
    return { amp, takt: .6 + Math.min(1.2, f * .045) };
  }
  // hvor mange som kjører rundt: 2–6 (mobil høyst 3), ingen i storm
  function antallKjører(fart, fri, mobil, frø) {
    if ((fart || 0) >= 14 || !fri) return 0;
    return Math.min(fri, mobil ? 3 : 6, 2 + Math.floor(hash((frø | 0) + 5) * 5));
  }

  const API = { STD, TAK, jevn, lagRute, punkt, reise, langs, tilstand, avvik, stilling, nyttMål, kjør, gynging, antallKjører, hash };
  if (typeof module !== 'undefined') module.exports = API; else rot.Ferje = API;
})(typeof window !== 'undefined' ? window : globalThis);
