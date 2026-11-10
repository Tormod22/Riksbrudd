'use strict';
// Kraftledninger i kartet og i 3D (10. nov, brukeren: Norge i 3D mer realistisk). Data: data/kraft.json (NVE Nettanlegg, NLOD) fra
// pipeline/fliser/kraft.py; reglene (masttype, nedheng, ryddebelte) i spill/kraft.js.
// 2D (KROKER.tegn): tynne mørke streker med små mastemerker fra passende målestokk, trafostasjoner; «Kraftledninger» i ☰.
// 3D: KROKER.bygg3d finner mastene i utsnittet, rydder trærne i beltet under linjene og maler ryddegata og trafostasjonens grus i
// bakken (etter ryddHus, før sett3d – derfor her og ikke i index.html); KROKER.sett3d lager mastene (InstancedMesh per type: portalmast
// i stål for 300/420 kV, stålmast for 132 kV, H-mast i tre for 66 kV, trestolper i H-form for 22 kV), linene som hengende kurver
// (LineSegments), varselkuler over dype dalsprang og trafostasjonen; KROKER.ramme3d tenner røde flyvarsellys på høye master om natta.
(function () {
  const K = window.Kraft, r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  let obj = null, sist = { linjer: 0 };
  VIS.kraft = true;
  // hele Norge i biter (spill/nvebiter.js): nivå 0 = transmisjon/regional + trafostasjoner, 1 = distribusjon (22 kV).
  // Reserven er Dovre-fila data/kraft.json (hele meter); bitene i releasen er delta-kodet fra blokkens hjørne (d = 1).
  const les = d => {
    if (!d.d) return d;
    const linjer = d.linjer.map(l => { const m = l.m.slice(); m[0] += d.x0; m[1] += d.y0; for (let i = 2; i < m.length; i++) m[i] += m[i - 2]; return { ...l, m }; });
    return { linjer, trafo: (d.trafo || []).map(([x, y, kv]) => [x + d.x0, y + d.y0, kv]) };
  };
  const LAG = NveBiter.lag('kraft', (typeof DATA === 'string' ? DATA : '/dovre-fliser/data/') + 'kraft.json', les, () => { skitten = true; });
  const samle = biter => ({ linjer: biter.flatMap(b => b.linjer), trafo: biter.flatMap(b => b.trafo || []) });
  function kreditt() { const k = document.getElementById('kilde'); if (k && !k.textContent.includes('Kraftnett')) k.textContent += ' · Kraftnett: NVE (NLOD)'; }

  // ---------- av/på i ☰ ----------
  const knapp = document.createElement('button'); knapp.id = 'vis-kraft'; knapp.textContent = 'Kraftledninger'; knapp.setAttribute('aria-pressed', 'true');
  knapp.onclick = () => { VIS.kraft = !VIS.kraft; knapp.classList.toggle('av', !VIS.kraft); knapp.setAttribute('aria-pressed', String(VIS.kraft)); skitten = true; };
  document.getElementById('lagmeny').appendChild(knapp);

  // ---------- 2D ----------
  // m = meter per skjermpunkt: store linjer fra 1:~200 000, 66 kV nærmere, 22 kV først når kartet er ganske nært
  const SYNES = { portal: [60, 9], stål: [60, 9], h66: [30, 5], h22: [7, 2.2] }, BREDDE = { portal: 1.8, stål: 1.5, h66: 1.2, h22: .9 };
  KROKER.tegn.push((g, vx0, vy1) => {
    const m = kam.m; if (!VIS.kraft || m >= 60) return;
    const vx1 = vx0 + VW * m, vy0 = vy1 - VH * m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m;
    const KD = samle(LAG.har([vx0, vy0, vx1, vy1], m < 7 ? [0, 1] : [0])); if (!KD.linjer.length && !KD.trafo.length) return; kreditt();
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    for (const l of KD.linjer) {
      const t = K.type(l.kv), [lin, mast] = SYNES[t]; if (m >= lin) continue;
      const P = l.m; let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let i = 0; i < P.length; i += 2) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); }
      if (x1 < vx0 || x0 > vx1 || y1 < vy0 || y0 > vy1) continue;
      const a = Math.min(1, (lin - m) / (lin * .3));
      g.beginPath(); g.moveTo(sx(P[0]), sy(P[1])); for (let i = 2; i < P.length; i += 2) g.lineTo(sx(P[i]), sy(P[i + 1]));
      // lys kant under den mørke streken, så lina synes både i skog og på snaufjellet
      g.globalAlpha = .3 * a; g.strokeStyle = '#e8e2d0'; g.lineWidth = BREDDE[t] + 2; g.stroke();
      g.globalAlpha = .9 * a; g.strokeStyle = '#1d1e1f'; g.lineWidth = BREDDE[t] * (m < 2 ? 1.3 : 1); g.stroke();
      if (m < mast) {
        g.fillStyle = '#1d1e1f'; const r = (t === 'h22' ? 2 : 3) * (m < 1.5 ? 1.3 : 1), tv = t === 'portal' ? 6 : t === 'stål' ? 4.5 : 3.5;
        for (let i = 0; i < P.length / 2; i++) { const X = sx(P[2 * i]), Y = sy(P[2 * i + 1]); if (X < -10 || Y < -10 || X > VW + 10 || Y > VH + 10) continue;
          const v = K.retning(P, i), nx = -Math.sin(v), ny = -Math.cos(v);
          g.fillRect(X - r / 2, Y - r / 2, r, r);
          g.lineWidth = 1.2; g.beginPath(); g.moveTo(X - nx * tv, Y + ny * tv); g.lineTo(X + nx * tv, Y - ny * tv); g.stroke(); }
      }
    }
    if (m < 40) for (const [X, Y, kv] of KD.trafo) {
      const x = sx(X), y = sy(Y), s = Math.max(8, 40 / m); if (x < -s || y < -s || x > VW + s || y > VH + s) continue;
      g.globalAlpha = .9; g.fillStyle = 'rgba(120,116,104,.55)'; g.fillRect(x - s / 2, y - s * .35, s, s * .7); g.strokeStyle = '#1d1e1f'; g.lineWidth = 1.4; g.strokeRect(x - s / 2, y - s * .35, s, s * .7);
      g.beginPath(); g.moveTo(x + s * .08, y - s * .28); g.lineTo(x - s * .12, y + s * .03); g.lineTo(x + s * .1, y + s * .0); g.lineTo(x - s * .08, y + s * .28); g.stroke();
      if (m < 6) { const tx = `Trafostasjon ${kv} kV`; g.font = 'italic 12px Georgia, serif'; g.lineWidth = 3; g.strokeStyle = 'rgba(232,226,208,.8)'; g.strokeText(tx, x + s / 2 + 6, y + 4); g.fillStyle = '#1d1e1f'; g.fillText(tx, x + s / 2 + 6, y + 4); }
    }
    g.restore();
  });

  // ---------- 3D: mastene og ryddegata i utsnittet ----------
  // alle treslagene i u.trær (gran og løv, og flere når spill/vegetasjon3d.js deler dem opp): lister med 5 tall per tre
  const treslag = u => Object.keys(u.trær).filter(n => { const d = u.trær[n]; return d && (Array.isArray(d) || ArrayBuffer.isView(d)) && d.length % 5 === 0; });
  const TRAFO = { b: 46, d: 34 };
  KROKER.bygg3d.push(async (u, { px, TW, skog }) => {
    u.kraft = null;
    const S3 = Math.min(u.S, 3000), [b0, b1] = await Promise.all([LAG.hent([u.cx - u.S, u.cy - u.S, u.cx + u.S, u.cy + u.S], [0]), LAG.hent([u.cx - S3, u.cy - S3, u.cx + S3, u.cy + S3], [1])]);
    const KD = samle([...new Set(b0.concat(b1))]); sist = { linjer: KD.linjer.length }; if (!KD.linjer.length && !KD.trafo.length) return; kreditt();
    const z = (X, Y) => (hoyde3d(X, Y, u) - u.h0) * R3.EX, mob = VW < 900;
    const ut = K.utsnitt(KD.linjer, u.cx, u.cy, u.S, z, mob ? 1600 : 4000);
    ut.trafo = KD.trafo.filter(([X, Y]) => Math.abs(X - u.cx) < u.S - 40 && Math.abs(Y - u.cy) < u.S - 40).map(([X, Y, kv]) => ({ x: X - u.cx, y: Y - u.cy, kv }));
    // trafostasjonen: NVEs punkt ligger ofte i stasjonshallen (et bygg i dataene) – flytt gården (høyst ca. 45 m) dit den får plass utenfor bygg og veg
    for (const t of ut.trafo) {
      const fri = (x, y) => !(u.husRute && hindring3d(x, y, u.husRute)) && !(u.påVeg && u.påVeg(x, y));
      let best = null;
      for (const [dx, dy] of [[0, 0], [0, -30], [0, 30], [-35, 0], [35, 0], [-30, -25], [30, -25], [-30, 25], [30, 25]]) {
        let n = 0; for (let a = -TRAFO.b / 2; a <= TRAFO.b / 2; a += 4) for (let b = -TRAFO.d / 2; b <= TRAFO.d / 2; b += 4) if (fri(t.x + dx + a, t.y + dy + b)) n++;
        if (!best || n > best.n) best = { n, dx, dy };
      }
      t.x += best.dx; t.y += best.dy;
    }
    // ryddebeltet: trær innenfor beltet under hvert spenn fjernes (og rundt trafostasjonen)
    const belte = []; for (const s of ut.spenn) { const A = ut.master[s.i], B = ut.master[s.j]; belte.push({ ax: A.x, ay: A.y, bx: B.x, by: B.y, b: K.TYPER[s.t].belte }); }
    for (const t of ut.trafo) belte.push({ ax: t.x - TRAFO.b / 2 - 6, ay: t.y, bx: t.x + TRAFO.b / 2 + 6, by: t.y, b: TRAFO.d / 2 + 6 });
    ut.belte = belte;
    if (belte.length) {
      const iB = K.belte(belte);
      const rens = data => { if (!data || !data.length) return data; const ny = []; for (let k = 0; k < data.length; k += 5) if (!iB(data[k], data[k + 1])) for (let q = 0; q < 5; q++) ny.push(data[k + q]); return ny.length === data.length ? data : new Float32Array(ny); };
      if (u.trær) for (const n of treslag(u)) u.trær[n] = rens(u.trær[n]);
      if (u.smått) u.smått.busk = rens(u.smått.busk);
      // ryddegata i bakken: lys lyng og kratt der det er skog, grus på trafostasjonen
      const mpp = 2 * u.S / TW, W = skog.W, st = W / TW;
      for (const b of belte) {
        const trafo = b.b > 20 && b.ay === b.by && ut.trafo.some(t => Math.abs(t.y - b.ay) < 1);
        const i0 = Math.max(0, Math.floor((Math.min(b.ax, b.bx) - b.b + u.S) / mpp)), i1 = Math.min(TW - 1, Math.ceil((Math.max(b.ax, b.bx) + b.b + u.S) / mpp));
        const j0 = Math.max(0, Math.floor((u.S - Math.max(b.ay, b.by) - b.b) / mpp)), j1 = Math.min(TW - 1, Math.ceil((u.S - Math.min(b.ay, b.by) + b.b) / mpp));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const x = -u.S + (i + .5) * mpp, y = u.S - (j + .5) * mpp, q = (j * TW + i) * 4, R = px[q], G = px[q + 1], B = px[q + 2];
          if (B > R + 18 && B > G + 4) continue;
          if (trafo) { if (Math.abs(x - (b.ax + b.bx) / 2) < TRAFO.b / 2 && Math.abs(y - b.ay) < TRAFO.d / 2) { const v = ((i * 7 + j * 13) % 9) * 3; px[q] = 132 + v; px[q + 1] = 128 + v; px[q + 2] = 120 + v; } continue; }
          if (!skog.m[Math.min(W - 1, Math.floor(j * st)) * W + Math.min(W - 1, Math.floor(i * st))]) continue;
          const d = K.avstand(x, y, b.ax, b.ay, b.bx, b.by); if (d >= b.b) continue;
          const w = Math.min(1, (b.b - d) / 3) * .8, l = (R + G + B) / 3;
          px[q] = R * (1 - w) + (l * .85 + 34) * w; px[q + 1] = G * (1 - w) + (l * .95 + 44) * w; px[q + 2] = B * (1 - w) + (l * .6 + 18) * w;
        }
      }
    }
    u.kraft = ut;
  });

  // ---------- geometri ----------
  function bygger() { return { pos: [], kol: [] }; }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // firkantet stav fra p til q (halv bredde w), bare sidene
  function stav(G, p, q, w, c) {
    const d = q.clone().sub(p).normalize(), a = Math.abs(d.z) < .9 ? V(0, 0, 1) : V(1, 0, 0), e1 = new THREE.Vector3().crossVectors(d, a).normalize().multiplyScalar(w), e2 = new THREE.Vector3().crossVectors(d, e1).normalize().multiplyScalar(w);
    const h = [e1.clone().add(e2), e1.clone().sub(e2), e1.clone().negate().sub(e2), e2.clone().sub(e1)];
    for (let k = 0; k < 4; k++) { const s = h[k], t = h[(k + 1) % 4], A = p.clone().add(s), B = p.clone().add(t), C = q.clone().add(t), D = q.clone().add(s);
      for (const P of [A, B, C, A, C, D]) { G.pos.push(P.x, P.y, P.z); G.kol.push(c[0], c[1], c[2]); } }
  }
  // rund stolpe (n kanter) fra p til q, radius r0 nederst og r1 øverst
  function stolpe(G, p, q, r0, r1, c, n = 6) {
    for (let k = 0; k < n; k++) { const a = k / n * 6.2832, b = (k + 1) / n * 6.2832, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      const A = V(p.x + ca * r0, p.y + sa * r0, p.z), B = V(p.x + cb * r0, p.y + sb * r0, p.z), C = V(q.x + cb * r1, q.y + sb * r1, q.z), D = V(q.x + ca * r1, q.y + sa * r1, q.z);
      for (const P of [A, B, C, A, C, D]) { G.pos.push(P.x, P.y, P.z); G.kol.push(c[0], c[1], c[2]); } }
  }
  function boks(G, x0, y0, z0, x1, y1, z1, c) {
    const P = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    for (const f of [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7]]) for (const i of [0, 1, 2, 0, 2, 3]) { const p = P[f[i]]; G.pos.push(p[0], p[1], p[2]); G.kol.push(c[0], c[1], c[2]); }
  }
  // fagverk: et tårn/bein med hjørnene b (4 punkt nederst) og o (4 punkt øverst), n felt med diagonaler på alle sidene
  function fagverk(G, b, o, n, w, c, wd = w * .6) {
    const L = (k, t) => b[k].clone().lerp(o[k], t);
    for (let k = 0; k < 4; k++) stav(G, b[k], o[k], w, c);
    for (let f = 0; f < n; f++) for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4, t0 = f / n, t1 = (f + 1) / n;
      stav(G, f % 2 ? L(k, t0) : L(k2, t0), f % 2 ? L(k2, t1) : L(k, t1), wd, c); if (f) stav(G, L(k, t0), L(k2, t0), wd, c); }
  }
  const STÅL = [.47, .49, .5], STÅL_M = [.4, .42, .43], TRE = [.3, .23, .16], GLASS = [.3, .37, .36], PORS = [.82, .82, .78];
  // mastene i lokale koordinater: x = tverrs på linja, y = langs linja, z opp; foten er (0, 0, 0) og beina går 3 m ned i bakken (skråning)
  function mastGeo(t) {
    const G = bygger();
    if (t === 'portal') {
      for (const s of [-1, 1]) {
        const b = [V(s * 8.5 - 1.3, -1.8, 0), V(s * 8.5 + 1.3, -1.8, 0), V(s * 8.5 + 1.3, 1.8, 0), V(s * 8.5 - 1.3, 1.8, 0)], o = [V(s * 7.8 - .6, -.7, 26), V(s * 7.8 + .6, -.7, 26), V(s * 7.8 + .6, .7, 26), V(s * 7.8 - .6, .7, 26)];
        fagverk(G, b, o, 7, .09, STÅL);
        for (let k = 0; k < 4; k++) { const d = o[k].clone().sub(b[k]).multiplyScalar(-3 / 26); stav(G, b[k].clone().add(d), b[k], .12, STÅL_M); }
      }
      const by = [V(-13.5, -.8, 26), V(13.5, -.8, 26), V(13.5, .8, 26), V(-13.5, .8, 26)], ty = by.map(p => V(p.x, p.y, 27.8));
      for (let k = 0; k < 4; k++) stav(G, by[k], ty[k], .07, STÅL);
      stav(G, by[0], by[1], .1, STÅL); stav(G, by[3], by[2], .1, STÅL); stav(G, ty[0], ty[1], .1, STÅL); stav(G, ty[3], ty[2], .1, STÅL);
      for (let i = 0; i < 12; i++) { const x0 = -13.5 + i * 2.25, x1 = x0 + 2.25; for (const y of [-.8, .8]) stav(G, V(i % 2 ? x0 : x1, y, 26), V(i % 2 ? x1 : x0, y, 27.8), .05, STÅL); if (i % 2) for (const zz of [26, 27.8]) stav(G, V(x0, -.8, zz), V(x1, .8, zz), .05, STÅL); }
      for (const s of [-7.5, 7.5]) for (const [dx, dy] of [[-1, -.8], [1, -.8], [1, .8], [-1, .8]]) stav(G, V(s + dx, dy, 27.8), V(s, 0, 31), .06, STÅL);
      for (const [x] of K.TYPER.portal.faser) for (const s of [-1, 1]) stav(G, V(x + s * 1.3, 0, 26), V(x, 0, 21.5), .08, GLASS);
    } else if (t === 'stål') {
      const b = [V(-2.5, -2.5, 0), V(2.5, -2.5, 0), V(2.5, 2.5, 0), V(-2.5, 2.5, 0)], o = [V(-.7, -.7, 18.7), V(.7, -.7, 18.7), V(.7, .7, 18.7), V(-.7, .7, 18.7)];
      fagverk(G, b, o, 6, .08, STÅL);
      for (let k = 0; k < 4; k++) { const d = o[k].clone().sub(b[k]).multiplyScalar(-3 / 18.7); stav(G, b[k].clone().add(d), b[k], .1, STÅL_M); }
      const o2 = o.map(p => V(p.x * .7, p.y * .7, 23.6)); fagverk(G, o, o2, 2, .07, STÅL);
      for (let k = 0; k < 4; k++) stav(G, o2[k], V(0, 0, 25), .06, STÅL);
      const arm = (x, zz, fra) => { for (const y of [-.7, .7]) { stav(G, V(fra, y, zz), V(x, 0, zz), .07, STÅL); stav(G, V(fra, y, zz + 1.2), V(x, 0, zz), .06, STÅL); } };
      arm(-7, 18.2, -.75); arm(7, 18.2, .75); arm(4.6, 23, .55);
      for (const [x, zz] of K.TYPER.stål.faser) stav(G, V(x, 0, zz + 2.6), V(x, 0, zz), .08, GLASS);
    } else if (t === 'h66') {
      for (const s of [-2.4, 2.4]) stolpe(G, V(s, 0, -1.5), V(s, 0, 15), .19, .13, TRE);
      boks(G, -4.9, -.13, 14.2, 4.9, .13, 14.48, TRE);
      stav(G, V(-2.4, 0, 6.5), V(2.4, 0, 12.6), .07, TRE); stav(G, V(2.4, 0, 6.5), V(-2.4, 0, 12.6), .07, TRE);
      for (const [x, zz] of K.TYPER.h66.faser) stav(G, V(x, 0, 14.2), V(x, 0, zz), .1, GLASS);
    } else {
      for (const s of [-1.1, 1.1]) stolpe(G, V(s, 0, -1.2), V(s, 0, 10.4), .15, .11, TRE, 5);
      boks(G, -2.2, -.07, 9.86, 2.2, .07, 10.02, TRE);
      stav(G, V(-1.1, 0, 7.6), V(1.1, 0, 9.8), .045, TRE);
      for (const [x, zz] of K.TYPER.h22.faser) stolpe(G, V(x, 0, 10.02), V(x, 0, zz), .07, .05, PORS, 4);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(G.pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(G.kol, 3)); g.computeVertexNormals(); return g;
  }
  const mastGeoer = {};
  function trafoGeo(u, t) {
    // trafostasjon i utsnittets koordinater: gjerde, tre transformatorer, to portaler (gantry), apparatstativ og et kontrollbygg.
    // Hver del står på bakken der den står (skråning), og deler som havner i et bygg (stasjonshallen i dataene) eller på vegen hoppes over.
    const G = bygger(), b2 = TRAFO.b / 2, d2 = TRAFO.d / 2, MØRK = [.28, .3, .31], BEIGE = [.72, .66, .55];
    const bakke = (x, y) => (hoyde3d(x + u.cx, y + u.cy, u) - u.h0) * R3.EX;
    const fri = (x, y) => !hindring3d(x, y, u.husRute || (typeof R3 !== 'undefined' && R3.hindre)) && !(u.påVeg && u.påVeg(x, y));
    // del(x0, y0, x1, y1, lag): bunnen er laveste punkt under delen; lag(ox, oy, oz) tegner med forskyvning
    const del = (x0, y0, x1, y1, lag) => { const P = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [(x0 + x1) / 2, (y0 + y1) / 2]].map(([a, b]) => [a + t.x, b + t.y]);
      if (!P.every(([a, b]) => fri(a, b))) return; lag(t.x, t.y, Math.min(...P.map(([a, b]) => bakke(a, b)))); };
    for (let i = 0; i < 3; i++) { const x = -12 + i * 9; del(x - 2.5, -3.5, x + 2.5, .4, (ox, oy, oz) => { boks(G, ox + x - 2, oy - 3.5, oz - .5, ox + x + 2, oy - .5, oz + 3.2, MØRK);
      for (let k = 0; k < 6; k++) boks(G, ox + x - 2.4 + k * .9, oy - .5, oz + .4, ox + x - 2.2 + k * .9, oy + .4, oz + 2.8, MØRK);
      for (const dx of [-1, 0, 1]) stolpe(G, V(ox + x + dx * 1.1, oy - 2, oz + 3.2), V(ox + x + dx * 1.1, oy - 2, oz + 5.2), .16, .1, PORS, 6); }); }
    for (const y of [5, 12]) del(-18.3, y - .3, 18.3, y + .3, (ox, oy, oz) => { for (const x of [-18, 18]) stolpe(G, V(ox + x, oy + y, oz - .5), V(ox + x, oy + y, oz + 12), .3, .25, STÅL, 6); boks(G, ox - 18.3, oy + y - .3, oz + 11.4, ox + 18.3, oy + y + .3, oz + 12, STÅL); });
    for (let i = 0; i < 6; i++) { const x = -15 + i * 6; del(x - .3, 8.2, x + .3, 8.8, (ox, oy, oz) => { stolpe(G, V(ox + x, oy + 8.5, oz - .5), V(ox + x, oy + 8.5, oz + 4), .15, .15, STÅL, 6); stolpe(G, V(ox + x, oy + 8.5, oz + 4), V(ox + x, oy + 8.5, oz + 5.6), .2, .12, PORS, 6); }); }
    del(b2 - 12.3, -d2 + 1.7, b2 - 1.7, -d2 + 8.3, (ox, oy, oz) => { boks(G, ox + b2 - 12, oy - d2 + 2, oz - .5, ox + b2 - 2, oy - d2 + 8, oz + 4.2, BEIGE); boks(G, ox + b2 - 12.3, oy - d2 + 1.7, oz + 4.2, ox + b2 - 1.7, oy - d2 + 8.3, oz + 4.5, MØRK); });
    const gjerde = (x, y) => del(x - .05, y - .05, x + .05, y + .05, (ox, oy, oz) => stolpe(G, V(ox + x, oy + y, oz - .5), V(ox + x, oy + y, oz + 2.4), .05, .05, STÅL, 4));
    for (let x = -b2; x <= b2 + .01; x += 3) for (const y of [-d2, d2]) gjerde(x, y);
    for (let y = -d2 + 3; y < d2; y += 3) for (const x of [-b2, b2]) gjerde(x, y);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(G.pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(G.kol, 3)); g.computeVertexNormals(); return g;
  }

  // rund, myk lysprikk til flyvarsellysene
  let lysTex = null;
  function lysTekstur() {
    if (lysTex) return lysTex;
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return (lysTex = new THREE.CanvasTexture(c));
  }
  function fjern(R) { if (obj) { for (const m of obj.mesh) { R.scene.remove(m); if (!m.userData.felles) m.geometry.dispose(); m.material.dispose(); } } obj = null; }
  KROKER.sett3d.push((u, R) => {
    fjern(R); const k = u.kraft; if (!k || !k.master.length && !k.trafo.length) return;
    obj = { mesh: [], lys: null, u };
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true }), d = new THREE.Object3D();
    for (const t of Object.keys(K.TYPER)) {
      const liste = k.master.filter(m => m.t === t); if (!liste.length) continue;
      if (!mastGeoer[t]) mastGeoer[t] = mastGeo(t);
      const mesh = new THREE.InstancedMesh(mastGeoer[t], mat.clone(), liste.length); mesh.userData.felles = true;
      liste.forEach((m, i) => { d.position.set(m.x, m.y, m.z); d.rotation.set(0, 0, m.a + Math.PI / 2); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); });
      mesh.frustumCulled = false; R.scene.add(mesh); obj.mesh.push(mesh);
    }
    // linene: fasene (300/420 kV med to delliner, 0,45 m fra hverandre) og topplinene, hver som en parabel i n biter
    const P = [], kuler = [];
    for (const s of k.spenn) {
      const A = k.master[s.i], B = k.master[s.j], T = K.TYPER[s.t], n = s.t === 'h22' ? 6 : 12, dypt = s.t === 'portal' || s.t === 'stål';
      const liner = [];
      for (const f of T.faser) { if (T.dobbel) liner.push([f[0] - .22, f[1]], [f[0] + .22, f[1]]); else liner.push(f); }
      for (const f of T.topp) liner.push(f);
      for (const f of liner) {
        const a = K.feste(A, f), b = K.feste(B, f), dn = K.nedheng(s.L, s.t) * (T.topp.includes(f) ? .8 : 1);
        let p0 = a; for (let q = 1; q <= n; q++) { const p1 = K.linPunkt(a, b, q / n, dn); P.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2]); p0 = p1; }
      }
      // varselkuler (rød/hvit) på topplina der lina går høyt over en dal (over 60 m over bakken midt i spennet)
      if (dypt && T.topp.length) { const f = T.topp[0], a = K.feste(A, f), b = K.feste(B, f), dn = K.nedheng(s.L, s.t) * .8, mid = K.linPunkt(a, b, .5, dn);
        if (mid[2] - (hoyde3d(mid[0] + u.cx, mid[1] + u.cy, u) - u.h0) * R3.EX > 60) for (const q of [.3, .5, .7]) kuler.push(K.linPunkt(a, b, q, dn)); }
    }
    if (P.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x2e3032, transparent: true, opacity: .9 })); l.frustumCulled = false; R.scene.add(l); obj.mesh.push(l); obj.liner = l; }
    if (kuler.length) { const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.8, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), kuler.length), c = new THREE.Color();
      kuler.forEach((p, i) => { d.position.set(p[0], p[1], p[2] - .8); d.rotation.set(0, 0, 0); d.updateMatrix(); m.setMatrixAt(i, d.matrix); m.setColorAt(i, c.set(i % 2 ? 0xf2f2ee : 0xd8452e)); });
      m.frustumCulled = false; R.scene.add(m); obj.mesh.push(m); }
    // flyvarsellys på toppen av de høye mastene (Points, tennes i ramme3d)
    const L = []; for (const m of k.master) if (K.TYPER[m.t].lys) { const T = K.TYPER[m.t]; for (const f of T.topp) { const p = K.feste(m, f); L.push(p[0], p[1], p[2] + .3); } }
    if (L.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
      const pm = new THREE.PointsMaterial({ color: 0xff2a1a, size: VW < 900 ? 7 : 9, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false, map: lysTekstur() });
      obj.lys = new THREE.Points(g, pm); obj.lys.frustumCulled = false; obj.lys.visible = false; R.scene.add(obj.lys); obj.mesh.push(obj.lys); }
    for (const t of k.trafo) { const m = new THREE.Mesh(trafoGeo(u, t), mat.clone()); R.scene.add(m); obj.mesh.push(m); }
  });
  KROKER.ramme3d.push(R => {
    if (!obj) return;
    for (const m of obj.mesh) m.visible = VIS.kraft;
    const mørke = window.NATT ? NATT.mørke || 0 : 0;
    // linene er ikke belyst (LineBasicMaterial): mørkere om natta
    if (obj.liner) obj.liner.material.color.setRGB(.18 * (1 - .75 * mørke), .19 * (1 - .75 * mørke), .2 * (1 - .75 * mørke));
    if (obj.lys) { const blink = (performance.now() / 1000) % 1.5 < .9;
      obj.lys.visible = VIS.kraft && mørke > .15; obj.lys.material.opacity = Math.min(1, mørke * 1.4) * (blink ? 1 : .15); }
  });

  // ---------- vakt (sjekk.js): mastene står på bakken, ingen trær i ryddebeltet ----------
  function sjekk(u) {
    const ut = { lastet: sist.linjer > 0, linjer: sist.linjer, kilde: LAG.STAT.kilde, master: 0, spenn: 0, svever: 0, iBelte: 0, trær: 0, eksempel: [] };
    const k = u && u.kraft; if (!k) return ut;
    ut.master = k.master.length; ut.spenn = k.spenn.length;
    for (const m of k.master) { const d = m.z - (hoyde3d(u.cx + m.x, u.cy + m.y, u) - u.h0) * R3.EX; if (Math.abs(d) > .5) { ut.svever++; if (ut.eksempel.length < 6) ut.eksempel.push(['mast', Math.round(m.x + u.cx), Math.round(m.y + u.cy), +d.toFixed(2)]); } }
    if (u.trær) for (const n of treslag(u)) for (let i = 0, data = u.trær[n]; i < data.length; i += 5) { ut.trær++;
      for (const b of k.belte) if (K.avstand(data[i], data[i + 1], b.ax, b.ay, b.bx, b.by) < b.b - .01) { ut.iBelte++; if (ut.eksempel.length < 6) ut.eksempel.push(['tre i beltet', Math.round(data[i] + u.cx), Math.round(data[i + 1] + u.cy)]); break; } }
    return ut;
  }
  window.Kraft3d = { sjekk, lag: LAG };
})();
