'use strict';
// Parkeringsplasser (brukeren 21. nov: «smarte systemer for parkeringsplasser – hvordan ser de ut i virkeligheten kontra spillene»).
// Regler uten DOM (test: node pipeline/fliser/test_parkering.js). Brukes av spill/parkering3d.js (3D) og kartflis.js (2D, også i
// bakgrunnstråden).
//
// Inn: omrisset P av en parkeringsplass (OpenStreetMap amenity=parking, anlegg a 6) som [[x, y], …] i meter (et hvilket som helst
// rettvinklet koordinatsystem – 2D-kartet har y nedover, 3D oppover), og valg { veger, butikk, fyll, frø }.
// Ut: plan(P, valg) = { plasser, linjer, lykter, trær, øyer, kur, inn, biler, form }. Alle punkter i samme koordinater som P.
//
// Slik ser norske parkeringsplasser ved butikker og kjøpesentre ut (flyfoto og bilder, se docs/natt/by.md): asfalt, hvite striper
// mellom plassene (ca. 2,5 × 5 m), plassene i rader på begge sider av et kjørefelt på 6–7 m («dobbeltrad», 5 + 6 + 5 = 16 m), radene
// ligger rygg mot rygg, store plasser har smale øyer med kantstein og trær mellom radene, lyktestolper på øyene eller mellom radene,
// kantstein rundt hele plassen, én eller to innkjøringer fra nærmeste veg og et handlevognskur ved inngangen til butikken.
(function (rot) {
  // Alle tallene her er Claudes forslag (ingen fasit fra brukeren), samlet ett sted.
  const REGLER = {
    // én plass: 2,5 m bred og 5 m dyp (vanlig norsk mål, Statens vegvesen/kommunale normer bruker 2,5 × 5,0 m)
    BREDDE: 2.5, DYBDE: 5,
    // kjørefeltet mellom to rader
    FELT: 6,
    // kantsteinen rundt plassen: ingen plass nærmere kanten enn dette
    KANT: .4,
    // øy med trær mellom to dobbeltrader når plassen er stor nok (bredden på øya, minste lengde på plassen)
    ØY: 2.4, ØY_MIN_LENGDE: 40,
    // kjørefelt på tvers i begge ender av radene når radene er lange (så bilene kan kjøre rundt)
    ENDEFELT: 6, ENDEFELT_MIN: 50,
    // lyktestolper: avstand langs radene
    LYKT: 26,
    // trær på øyene: avstand
    TRE: 9,
    // innkjøringen: leter etter veg innen så mange meter fra kanten, bredden på innkjøringen
    INN_SØK: 70, INN_BREDDE: 6,
    // handlevognskur: når en butikk ligger innen så mange meter fra plassen
    KUR_AVSTAND: 90,
    // fyllingsgrad (andel av plassene med en bil): ved butikk og ellers, per tid på døgnet
    FYLL_BUTIKK: { dag: .72, kant: .38, natt: .06 }, FYLL_ANNEN: { dag: .45, kant: .3, natt: .18 },
    // dag = 9–20, kant = 7–9 og 20–22, natt ellers
    DAG: [9, 20], KANTTID: [7, 22],
    // for små plasser (under én rad) får ingen oppmerking
    MIN_AREAL: 60
  };

  function hash(a, b, s = 0) {
    let h = (Math.imul(Math.round(a * 4) | 0, 73856093) ^ Math.imul(Math.round(b * 4) | 0, 19349663) ^ Math.imul(s + 1, 83492791)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  // hovedretningen: retningen til den lengste siden (u) og tvers på den (v), og utstrekningen langs dem
  function form(P) {
    let best = 0, ux = 1, uy = 0, areal = 0;
    for (let i = 0; i < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length], l = Math.hypot(bx - ax, by - ay);
      areal += ax * by - bx * ay; if (l > best) { best = l; ux = (bx - ax) / l; uy = (by - ay) / l; } }
    const vx = -uy, vy = ux; let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [x, y] of P) { const u = x * ux + y * uy, v = x * vx + y * vy; if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v; }
    return { ux, uy, vx, vy, u0, u1, v0, v1, lu: u1 - u0, lv: v1 - v0, areal: Math.abs(areal) / 2 };
  }
  function inni(P, x, y) { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++)
    if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inn = !inn; return inn; }
  function kantAvstand(P, x, y) { let d = Infinity; for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const ax = P[j][0], ay = P[j][1], dx = P[i][0] - ax, dy = P[i][1] - ay, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    d = Math.min(d, Math.hypot(ax + dx * t - x, ay + dy * t - y)); } return d; }
  // et punkt er brukbart når det ligger inne i omrisset og minst m meter fra kanten
  const fri = (P, x, y, m) => inni(P, x, y) && kantAvstand(P, x, y) >= m;

  // fyllingsgraden etter tid på døgnet (time 0–24) og om det er en butikk ved plassen
  function fyll(time, butikk) {
    const F = butikk ? REGLER.FYLL_BUTIKK : REGLER.FYLL_ANNEN, t = ((time % 24) + 24) % 24;
    return t >= REGLER.DAG[0] && t < REGLER.DAG[1] ? F.dag : t >= REGLER.KANTTID[0] && t < REGLER.KANTTID[1] ? F.kant : F.natt;
  }

  // Radene på tvers (langs v): dobbeltrader på 16 m (rad, felt, rad); rester på minst 11 m blir én rad med felt.
  // Mellom dobbeltradene ligger radene rygg mot rygg – eller en øy med trær når plassen er lang.
  function rader(f) {
    const R = REGLER, D = R.DYBDE, Fe = R.FELT, tilgj = f.lv - 2 * R.KANT, øy = f.lu >= R.ØY_MIN_LENGDE;
    const mod = 2 * D + Fe; let n = 0, bredde = 0;
    while (true) { const neste = bredde + (n ? (øy ? R.ØY : 0) : 0) + mod; if (neste > tilgj) break; bredde = neste; n++; }
    let enkel = false; if (tilgj - bredde - (n ? (øy ? R.ØY : 0) : 0) >= D + Fe) { enkel = true; bredde += (n ? (øy ? R.ØY : 0) : 0) + D + Fe; }
    let v = f.v0 + R.KANT + (tilgj - bredde) / 2; const ut = { rader: [], felt: [], øyer: [], rygg: [] };
    for (let i = 0; i < n; i++) {
      if (i) { if (øy) { ut.øyer.push([v, v + R.ØY]); v += R.ØY; } else ut.rygg.push(v); }
      ut.rader.push({ v0: v, v1: v + D, mot: 1 }); ut.felt.push([v + D, v + D + Fe]); ut.rader.push({ v0: v + D + Fe, v1: v + 2 * D + Fe, mot: -1 }); v += mod;
    }
    if (enkel) { if (n) { if (øy) { ut.øyer.push([v, v + R.ØY]); v += R.ØY; } else ut.rygg.push(v); } ut.rader.push({ v0: v, v1: v + D, mot: 1 }); ut.felt.push([v + D, v + D + Fe]); }
    return ut;
  }

  function plan(P, valg = {}) {
    const R = REGLER, f = form(P), tom = { plasser: [], linjer: [], lykter: [], trær: [], øyer: [], kur: [], inn: null, biler: [], form: f };
    if (P.length < 3 || f.areal < R.MIN_AREAL || f.lv < R.DYBDE + R.FELT * .5 || f.lu < 3 * R.BREDDE) return tom;
    const pt = (u, v) => [u * f.ux + v * f.vx, u * f.uy + v * f.vy];
    const L = rader(f); if (!L.rader.length) return tom;
    // endefelt: de ytterste metrene langs u holdes frie så bilene kan kjøre rundt
    const ende = f.lu >= R.ENDEFELT_MIN ? R.ENDEFELT : 0, ua = f.u0 + R.KANT + ende, ub = f.u1 - R.KANT - ende;
    const n = Math.floor((ub - ua) / R.BREDDE), us = ua + ((ub - ua) - n * R.BREDDE) / 2, ut = tom;
    ut.felt = L.felt; ut.øyer = [];
    for (const r of L.rader) {
      let forrige = false;
      for (let i = 0; i < n; i++) {
        const u0 = us + i * R.BREDDE, u1 = u0 + R.BREDDE, hj = [[u0, r.v0], [u1, r.v0], [u1, r.v1], [u0, r.v1], [(u0 + u1) / 2, (r.v0 + r.v1) / 2]];
        const ok = hj.every(([a, b]) => { const [x, y] = pt(a, b); return fri(P, x, y, R.KANT * .5); });
        if (!ok) { forrige = false; continue; }
        const [cx, cy] = pt((u0 + u1) / 2, (r.v0 + r.v1) / 2);
        // retningen bilen står i: langs v; nesen mot ryggen (bort fra kjørefeltet) – bilen rygger ut i feltet
        const ret = Math.atan2(f.vy * -r.mot, f.vx * -r.mot);
        ut.plasser.push({ x: cx, y: cy, ret, rad: L.rader.indexOf(r), i });
        // stripene: én på hver side av plassen (den felles stripa mellom to plasser bare én gang), langs v fra ryggen 4,6 m ut
        const vr = r.mot > 0 ? r.v0 : r.v1, vf = r.mot > 0 ? r.v1 - .4 : r.v0 + .4;
        if (!forrige) ut.linjer.push([...pt(u0, vr), ...pt(u0, vf)]);
        ut.linjer.push([...pt(u1, vr), ...pt(u1, vf)]); forrige = true;
      }
    }
    // øyene: kantstein rundt og trær, bare der øya ligger inne i omrisset
    for (const [v0, v1] of L.øyer) { const vm = (v0 + v1) / 2; let a = null;
      for (let u = ua; u <= ub; u += 1) { const [x, y] = pt(u, vm), ok = fri(P, x, y, 1); if (ok && a === null) a = u; if ((!ok || u + 1 > ub) && a !== null) { const b = ok ? u : u - 1;
        if (b - a > 6) { ut.øyer.push({ a: pt(a, v0), b: pt(b, v0), c: pt(b, v1), d: pt(a, v1), u0: a, u1: b, v0, v1 });
          for (let t = a + R.TRE / 2; t < b - 1; t += R.TRE) { const [tx, ty] = pt(t, vm); ut.trær.push({ x: tx, y: ty, s: .8 + hash(tx, ty, 7) * .4 }); } }
        a = null; } } }
    // lyktestolpene: på øyene, ellers på linja der radene ligger rygg mot rygg, ellers langs den ytre kanten av første rad
    const linjerL = L.øyer.length ? L.øyer.map(([a, b]) => (a + b) / 2) : L.rygg.length ? L.rygg : [L.rader[0].v0 - R.KANT * .5];
    for (const vl of linjerL) for (let u = ua + R.LYKT / 2; u < ub; u += R.LYKT) { const [x, y] = pt(u, vl); if (inni(P, x, y)) ut.lykter.push({ x, y, ret: Math.atan2(f.vy, f.vx) }); }
    // innkjøringen: punktet på kanten nærmest en veg (valg.veger: [{ P: [[x, y], …], w }]); vegen må ligge utenfor plassen
    let best = null;
    for (const v of valg.veger || []) for (let i = 1; i < v.P.length; i++) { const a = v.P[i - 1], b = v.P[i];
      for (let k = 0; k < P.length; k++) { const p = P[k], q = P[(k + 1) % P.length], ln = Math.hypot(q[0] - p[0], q[1] - p[1]), st = Math.max(1, Math.ceil(ln / 3));
        for (let s = 0; s <= st; s++) { const x = p[0] + (q[0] - p[0]) * s / st, y = p[1] + (q[1] - p[1]) * s / st;
          const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)), vx = a[0] + dx * t, vy = a[1] + dy * t;
          const d = Math.hypot(vx - x, vy - y) - (v.w || 3); if (d > R.INN_SØK || inni(P, vx, vy)) continue;
          if (!best || d < best.d) best = { d, x, y, vx, vy }; } } }
    if (best) { const l = Math.hypot(best.vx - best.x, best.vy - best.y) || 1; ut.inn = { x: best.x, y: best.y, tx: best.vx, ty: best.vy, ret: Math.atan2(best.vy - best.y, best.vx - best.x), lengde: l, bredde: R.INN_BREDDE }; }
    // handlevognskur ved plassen nærmest butikkinngangen (valg.butikk = { x, y }): tar to plasser i raden nærmest butikken
    if (valg.butikk && ut.plasser.length) { const bk = valg.butikk; let bi = -1, bd = Infinity;
      ut.plasser.forEach((p, i) => { const d = Math.hypot(p.x - bk.x, p.y - bk.y); if (d < bd) { bd = d; bi = i; } });
      if (bd < R.KUR_AVSTAND) { const p = ut.plasser[bi], nabo = ut.plasser.findIndex(q => q.rad === p.rad && Math.abs(q.i - p.i) === 1);
        const ny = nabo >= 0 ? ut.plasser[nabo] : p; ut.kur.push({ x: (p.x + ny.x) / 2, y: (p.y + ny.y) / 2, ret: p.ret + Math.PI / 2 });
        ut.plasser = ut.plasser.filter((q, i) => i !== bi && i !== nabo); } }
    // bilene: fast per plass (hash av stedet); fyllingsgraden fra valg.fyll (0–1)
    const fy = valg.fyll === undefined ? .5 : valg.fyll, frø = valg.frø || 0;
    for (const p of ut.plasser) { const h = hash(p.x, p.y, frø); if (h < fy) { p.bil = true; ut.biler.push({ x: p.x, y: p.y, ret: p.ret + (hash(p.x, p.y, 3) < .15 ? Math.PI : 0) + (hash(p.x, p.y, 4) - .5) * .06, farge: Math.floor(hash(p.x, p.y, 5) * 9) }); } }
    return ut;
  }
  // ledig plass nærmest (x, y) i en plan: { x, y, ret } eller null – kjøretøyene i spillet kan stå der
  function ledig(pl, x, y) { let b = null, bd = Infinity; for (const p of pl.plasser) { if (p.bil || p.opptatt) continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; b = p; } } return b; }

  const Parkering = { REGLER, plan, rader, form, fyll, ledig, inni, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = Parkering; else rot.Parkering = Parkering;
})(typeof globalThis !== 'undefined' ? globalThis : this);
