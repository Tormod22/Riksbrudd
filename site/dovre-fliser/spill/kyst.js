'use strict';
// Regler for kysten i 3D (uten DOM og uten THREE, så de kan testes i Node: pipeline/fliser/test_kyst.js). Visningen er spill/kyst3d.js.
// Plasserer småbåter, flytebrygger, naust og bøyer langs sjøen. Alt står fast: rutenett i kartets meter (ikke utsnittets) og hash per rute,
// så samme sted får de samme tingene hver gang. Sjø = vann i kartet OG terreng under 1 moh. (innsjøer får ingen båter her).
(function (rot) {
  const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; };
  const frø = (X, Y, k) => hash((Math.imul(Math.round(X), 73856093) ^ Math.imul(Math.round(Y), 19349663) ^ Math.imul(k + 1, 83492791)) | 0);
  const RETN = []; for (let i = 0; i < 16; i++) RETN.push([Math.cos(i * Math.PI / 8), Math.sin(i * Math.PI / 8)]);
  const TAK = { pc: { båter: 260, brygger: 40, naust: 60, bøyer: 40 }, mobil: { båter: 90, brygger: 15, naust: 25, bøyer: 15 } };
  const TYPER = ['snekke', 'sjark', 'motorbåt'], FARGER = [[.93, .93, .9], [.93, .93, .9], [.72, .14, .12], [.16, .26, .5], [.93, .93, .9], [.2, .42, .36]];

  // v = { S, cx, cy, sjø(x, y), moh(x, y), by(x, y), hinder(x, y), mobil } – x, y relativt til utsnittets midte
  function plasser(v) {
    const T = TAK[v.mobil ? 'mobil' : 'pc'], S = v.S, ut = { båter: [], brygger: [], naust: [], bøyer: [] };
    const land = (x, y) => !v.sjø(x, y), hind = (x, y) => v.hinder ? v.hinder(x, y) : false, by = (x, y) => v.by ? v.by(x, y) : false;
    const inne = (x, y, m) => Math.abs(x) < S - m && Math.abs(y) < S - m;
    const fri = (liste, x, y, d) => liste.every(o => (o.x - x) ** 2 + (o.y - y) ** 2 > d * d);
    // første sjøpunkt langs (nx, ny) fra (x, y), opptil maks meter
    const tilSjø = (x, y, nx, ny, maks) => { for (let t = 0; t <= maks; t += 1) if (v.sjø(x + nx * t, y + ny * t)) return t; return null; };
    // kystpunkter: landruter (12 m) med sjø innen 10 m; retningen ut mot sjøen = snittet av sjøretningene
    const st = 12, kyst = [];
    for (let Y = Math.ceil((v.cy - S) / st) * st; Y < v.cy + S; Y += st) for (let X = Math.ceil((v.cx - S) / st) * st; X < v.cx + S; X += st) {
      const x = X - v.cx, y = Y - v.cy; if (!inne(x, y, 40) || !land(x, y)) continue;
      let sx = 0, sy = 0, n = 0; for (const [dx, dy] of RETN) if (v.sjø(x + dx * 10, y + dy * 10)) { sx += dx; sy += dy; n++; }
      if (!n || n > 12) continue; const l = Math.hypot(sx, sy); if (l < .5) continue;
      kyst.push({ x, y, X, Y, nx: sx / l, ny: sy / l, d: x * x + y * y });
    }
    kyst.sort((a, b) => a.d - b.d);
    for (const k of kyst) {
      const h = frø(k.X, k.Y, 0), h2 = frø(k.X, k.Y, 1), h3 = frø(k.X, k.Y, 2), iBy = by(k.x, k.y), a = Math.atan2(k.ny, k.nx);
      const t0 = tilSjø(k.x, k.y, k.nx, k.ny, 14); if (t0 === null) continue;
      const sx = k.x + k.nx * t0, sy = k.y + k.ny * t0;
      if (iBy && h < .22 && ut.brygger.length < T.brygger && fri(ut.brygger, sx, sy, 40)) {
        // flytebrygge: 14–30 m rett ut, hele lengden og 5 m til hver side må være sjø
        const L = 14 + Math.floor(h2 * 17); let ok = true;
        for (let t = 2; t <= L + 4 && ok; t += 2) for (const o of [-5, 0, 5]) if (!v.sjø(sx + k.nx * t - k.ny * o, sy + k.ny * t + k.nx * o)) { ok = false; break; }
        if (!ok) continue;
        const b = { x: sx, y: sy, a, L, B: 2.4 }; ut.brygger.push(b);
        // båtene ligger fortøyd langs begge sider, med baugen ut
        for (let s = 5; s < L - 1; s += 6.5) for (const side of [-1, 1]) {
          if (ut.båter.length >= T.båter || frø(k.X + s, k.Y + side, 3) < .3) continue;
          const bt = båt(k.X * 7 + s * 13 + side, false), o = side * (b.B / 2 + .7 + bt.B / 2);
          bt.x = sx + k.nx * s - k.ny * o; bt.y = sy + k.ny * s + k.nx * o; bt.a = a; ut.båter.push(bt);
        }
        continue;
      }
      if (iBy && h < .38 && ut.båter.length < T.båter) {
        // båt fortøyd langs kaia (parallelt med land), 2–3 m ut
        const bt = båt(k.X * 31 + k.Y, false), d = t0 + 1 + bt.B / 2; const x = k.x + k.nx * d, y = k.y + k.ny * d;
        if (!v.sjø(x, y) || !v.sjø(x + k.nx * 4, y + k.ny * 4) || !fri(ut.båter, x, y, 8) || !fri(ut.brygger, x, y, 25)) continue;
        bt.x = x; bt.y = y; bt.a = a + Math.PI / 2 * (h3 < .5 ? 1 : -1); ut.båter.push(bt); continue;
      }
      if (!iBy && h < .06 && ut.naust.length < T.naust && fri(ut.naust, k.x, k.y, 70)) {
        // naust på land med gavlen (porten) mot sjøen; lavt, slakt og ikke i hus eller på veg
        const L = 7 + h2 * 4, B = 4.5 + h3 * 1.5, d = t0 - L / 2 - .4, x = k.x + k.nx * d, y = k.y + k.ny * d;
        const hj = [[-L / 2, -B / 2], [L / 2, -B / 2], [L / 2, B / 2], [-L / 2, B / 2], [0, 0]].map(([p, q]) => [x + k.nx * p - k.ny * q, y + k.ny * p + k.nx * q]);
        // baksiden og midten på land (fronten kan stå i vannkanten), ingenting i hus eller på veg
        if (![hj[0], hj[3], hj[4]].every(([p, q]) => land(p, q)) || hj.some(([p, q]) => hind(p, q))) continue;
        const hs = hj.map(([p, q]) => v.moh(p, q)); if (Math.max(...hs) > 7 || Math.max(...hs) - Math.min(...hs) > 2.5) continue;
        const n = { x, y, a, L, B, farge: h3 < .55 ? 0 : h3 < .85 ? 1 : 2 }; ut.naust.push(n);
        // av og til en snekke rett utenfor
        if (h2 < .5 && ut.båter.length < T.båter) { const bt = båt(k.X + k.Y * 3, false, 'snekke'); bt.x = sx + k.nx * 3; bt.y = sy + k.ny * 3; bt.a = a; if (v.sjø(bt.x, bt.y)) ut.båter.push(bt); }
      }
    }
    // båter ute på sjøen (ingen land innen 40 m) og bøyer (land innen 25–90 m, ikke nærmere enn 20 m)
    // Småbåtene holder seg nær kysten (feilretting 12. nov: 48 snekker og sjarker lå spredt 110 km til havs ved Troll A): det må være land
    // innen LAND_NÆR meter – land inne i utsnittet; utenfor utsnittet vet vi ikke hva som er land.
    const LAND_NÆR = 800, kystNær = (x, y) => { for (let r = 100; r <= LAND_NÆR; r += 100) for (const [dx, dy] of RETN) { const p = x + dx * r, q = y + dy * r; if (inne(p, q, 0) && land(p, q)) return true; } return false; };
    for (const [st2, k0] of [[150, 7], [90, 8]]) for (let Y = Math.ceil((v.cy - S) / st2) * st2; Y < v.cy + S; Y += st2) for (let X = Math.ceil((v.cx - S) / st2) * st2; X < v.cx + S; X += st2) {
      const x0 = X - v.cx, y0 = Y - v.cy, h = frø(X, Y, k0); if (h > (k0 === 7 ? .16 : .3)) continue;
      const x = x0 + (frø(X, Y, 11) - .5) * st2 * .6, y = y0 + (frø(X, Y, 12) - .5) * st2 * .6; if (!inne(x, y, 60) || !v.sjø(x, y)) continue;
      const nærLand = r => RETN.some(([dx, dy]) => land(x + dx * r, y + dy * r));
      if (k0 === 7) { if (ut.båter.length >= T.båter || nærLand(20) || nærLand(40) || !kystNær(x, y)) continue; const bt = båt(X + Y, true); bt.x = x; bt.y = y; bt.a = frø(X, Y, 13) * 6.283; ut.båter.push(bt); }
      else { if (ut.bøyer.length >= T.bøyer || nærLand(20) || !(nærLand(45) || nærLand(90))) continue; ut.bøyer.push({ x, y, type: Math.floor(frø(X, Y, 14) * 3) }); }
    }
    return ut;
  }
  // en båt: type, lengde, bredde, farge på skroget, styrehus; fri = ute på sjøen (gynger mer)
  function båt(n, fri, type) {
    const h = hash(n | 0), h2 = hash((n | 0) + 977), t = type || TYPER[h < .45 ? 0 : h < .75 ? 1 : 2];
    const L = t === 'snekke' ? 5 + h2 * 2 : t === 'sjark' ? 8 + h2 * 4 : 6 + h2 * 3;
    return { type: t, L, B: L * (t === 'motorbåt' ? .36 : .34), farge: FARGER[Math.floor(hash((n | 0) + 3331) * FARGER.length)], fri, fase: h2 * 6.283 };
  }
  const API = { plasser, båt, frø, TAK };
  if (typeof module !== 'undefined') module.exports = API; else rot.Kyst = API;
})(typeof window !== 'undefined' ? window : globalThis);
