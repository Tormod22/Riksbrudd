'use strict';
// Kraftledninger – reglene uten DOM (test: node pipeline/fliser/test_kraft.js). Data: data/kraft.json fra pipeline/fliser/kraft.py (NVE, NLOD).
// Masttype etter spenning, faseplassering, nedheng (parabel som tilnærmer kjedelinja), retning i masta og ryddebeltet i skogen.
// Visningen ligger i spill/kraft3d.js (2D-strekene og 3D-mastene).
(function (rot) {
  // h = masthøyde (m), faser = [tverrs (m), høyde (m)] der linene henger (under isolatorene), topp = toppliner (jordliner),
  // belte = halv bredde på ryddebeltet i skogen (m), C = kjedelinjeparameter (m): nedheng = L² / (8 C), lys = flyvarsellys på toppen
  const TYPER = {
    portal: { navn: 'Portalmast i stål (300/420 kV)', h: 31, faser: [[-11, 21.5], [0, 21.5], [11, 21.5]], topp: [[-7.5, 31], [7.5, 31]], belte: 20, C: 1400, lys: true, dobbel: true },
    stål: { navn: 'Stålmast (132 kV)', h: 25, faser: [[-6.5, 15.5], [6.5, 15.5], [4.2, 20.5]], topp: [[0, 25]], belte: 15, C: 1200, lys: true },
    h66: { navn: 'H-mast i tre (66 kV)', h: 15, faser: [[-4, 13.2], [0, 13.2], [4, 13.2]], topp: [], belte: 12, C: 1000, lys: false },
    h22: { navn: 'Trestolper i H-form (22 kV)', h: 10.4, faser: [[-1.7, 10.3], [0, 10.3], [1.7, 10.3]], topp: [], belte: 5, C: 520, lys: false },
  };
  function type(kv) { return kv >= 220 ? 'portal' : kv >= 110 ? 'stål' : kv >= 33 ? 'h66' : 'h22'; }

  // Nedheng midt i spennet for horisontal lengde L
  function nedheng(L, t) { return L * L / (8 * TYPER[t].C); }
  // Punktet på lina en andel s (0–1) av spennet fra A til B (A, B = [x, y, z]); parabel med nedheng d midt på
  function linPunkt(A, B, s, d) { return [A[0] + (B[0] - A[0]) * s, A[1] + (B[1] - A[1]) * s, A[2] + (B[2] - A[2]) * s - 4 * d * s * (1 - s)]; }

  // Retningen (radianer) masta står i: halvveis mellom spennet før og etter (P = flat liste x0, y0, x1, y1, …)
  function retning(P, i) {
    const n = P.length / 2, ret = (a, b) => { const dx = P[2 * b] - P[2 * a], dy = P[2 * b + 1] - P[2 * a + 1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    let x = 0, y = 0;
    if (i > 0) { const [a, b] = ret(i - 1, i); x += a; y += b; }
    if (i < n - 1) { const [a, b] = ret(i, i + 1); x += a; y += b; }
    return Math.atan2(y, x);
  }

  // Avstand fra punktet til strekningen A–B (i planet)
  function avstand(x, y, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    return Math.hypot(x - ax - t * dx, y - ay - t * dy);
  }

  // Ryddebeltet: et rutenett (celle 40 m) med spennene; iBelte(x, y) = står punktet i ryddegata under en linje?
  function belte(spenn) {
    const C = 40, rute = new Map();
    for (const s of spenn) { const r = s.b; const x0 = Math.floor((Math.min(s.ax, s.bx) - r) / C), x1 = Math.floor((Math.max(s.ax, s.bx) + r) / C), y0 = Math.floor((Math.min(s.ay, s.by) - r) / C), y1 = Math.floor((Math.max(s.ay, s.by) + r) / C);
      for (let a = x0; a <= x1; a++) for (let c = y0; c <= y1; c++) { const k = a + ',' + c; if (!rute.has(k)) rute.set(k, []); rute.get(k).push(s); } }
    return (x, y) => { for (const s of rute.get(Math.floor(x / C) + ',' + Math.floor(y / C)) || []) if (avstand(x, y, s.ax, s.ay, s.bx, s.by) < s.b) return true; return false; };
  }

  // Lager mastene og spennene for et utsnitt: linjer fra kraft.json, (cx, cy) midten, S halv side, z(X, Y) = høyden i 3D.
  // Gir { master: [{ x, y, z, a, t }], spenn: [{ i, j, t, L }] } – x, y relativt til midten. Mast utenfor utsnittet tas ikke med.
  // Bitene for hele Norge deler mastrekkene ved blokkanten og tar med første mast i neste blokk: like master (samme punkt og type)
  // blir én, og et spenn som finnes to ganger tegnes én gang.
  function utsnitt(linjer, cx, cy, S, z, maks = 4000) {
    const master = [], spenn = [], sett = new Map(), sp = new Set();
    for (const l of linjer) {
      // 22 kV-stolpene bare innen 3 km (lenger unna er de mindre enn et punkt på skjermen)
      const P = l.m, n = P.length / 2, t = type(l.kv), nr = new Array(n).fill(-1), kant = (t === 'h22' ? Math.min(S, 3000) : S) - 3;
      let inne = false; for (let i = 0; i < n; i++) if (Math.abs(P[2 * i] - cx) < kant && Math.abs(P[2 * i + 1] - cy) < kant) { inne = true; break; }
      if (!inne) continue;
      for (let i = 0; i < n; i++) { const x = P[2 * i] - cx, y = P[2 * i + 1] - cy; if (Math.abs(x) >= kant || Math.abs(y) >= kant || master.length >= maks) continue;
        const k = P[2 * i] + ',' + P[2 * i + 1] + ',' + t; if (sett.has(k)) { nr[i] = sett.get(k); continue; }
        nr[i] = master.length; sett.set(k, nr[i]); master.push({ x, y, z: z(P[2 * i], P[2 * i + 1]), a: retning(P, i), t, ekte: l.e ? l.e[i] === '1' : true }); }
      for (let i = 0; i < n - 1; i++) if (nr[i] >= 0 && nr[i + 1] >= 0 && nr[i] !== nr[i + 1]) { const a = Math.min(nr[i], nr[i + 1]) + ',' + Math.max(nr[i], nr[i + 1]); if (sp.has(a)) continue; sp.add(a);
        const A = master[nr[i]], B = master[nr[i + 1]]; spenn.push({ i: nr[i], j: nr[i + 1], t, L: Math.hypot(B.x - A.x, B.y - A.y) }); }
    }
    return { master, spenn };
  }

  // Festepunktet for fase/toppline [tverrs, høyde] på masta m (lina går langs m.a; positiv tverrs = til venstre for retningen)
  function feste(m, f) { const nx = -Math.sin(m.a), ny = Math.cos(m.a); return [m.x + nx * f[0], m.y + ny * f[0], m.z + f[1]]; }

  const Kraft = { TYPER, type, nedheng, linPunkt, retning, avstand, belte, utsnitt, feste };
  if (typeof module !== 'undefined') module.exports = Kraft; else rot.Kraft = Kraft;
})(typeof window !== 'undefined' ? window : globalThis);
