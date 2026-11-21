/* Riksbrudd – LÅVEN INNE (runde 5, 18.–19. nov, pakke «natur»; koordinatoren: «Låven er tom inni: gi låver/landbruksbygg innhold
 * (høyballer, bås, redskap, en gammel traktor) med få trekanter»).
 * Interiøret (spill/interior.js + interior3d.js) gir låven høyballer, båser, en tønne og i store låver en traktor – men rommet så likevel
 * tomt ut: et høyt, tomt rom med parkett. Her kommer det som gjør det til en låve, lagt OPPÅ interiøret (ingen endring i interiørfilene):
 *  - høy strødd på gulvet (flate flak i høyfarge),
 *  - et høyloft i enden lengst fra døra (dekke på stolper, høyhauger og -baller oppå, høy som henger over kanten, en stige opp),
 *  - redskap lent mot veggen (høygaffel, rive, spade, ljå), en trillebår ved døra og melkespann,
 *  - en gammel grå traktor («gråtass») i låver som ikke har traktor fra før (den stopper deg når du går, som møblene).
 * Uthus (garasje/bod) større enn REGLER.uthusMin får redskap og trillebår. Alt i ett samlet nett per bygg med hjørnefarger (ett
 * tegnekall, ingen tekstur, ingen nye lys), laget når interiøret lages og fjernet sammen med det. Ca. 1500–3500 trekanter per låve.
 * Plassene er faste per bygg (hash av byggets nummer). Reglene øverst er uten DOM (Node: require('./lave3d'), test_lave3d.js).
 */
(function (rot) {
  'use strict';
  // Claudes forslag (alle tallene):
  const REGLER = {
    // minste grunnflate (m²) for innhold i låver og uthus
    låveMin: 25, uthusMin: 18,
    // høyloftet: minste takhøyde (m), dekkets høyde (m, mellom), hvor stor del av lengden (høyst meter), stolper hver (m)
    loftTak: 3.3, loftHøyde: [2.35, 3.0], loftAndel: .32, loftMaks: 7, stolpe: 3.2,
    // strødd høy: ett flak per så mange m² (høyst), flakenes radius (m)
    høyPer: 5, høyMaks: 45, høyR: [.45, 1.3],
    // gråtassen: minste grunnflate, mål (bredde, lengde) og avstand fra døra (m)
    traktorMin: 45, traktor: [1.65, 2.95], traktorDør: 2.6,
  };
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const HØY = [.78, .66, .34], HØY_MØRK = [.6, .5, .25], TRE = [.46, .34, .22], TRE_MØRK = [.32, .24, .16], JERN = [.24, .24, .25], GRÅ = [.56, .57, .55];

  // Hvilke bygg som får innhold: låver over låveMin, uthus over uthusMin (bare redskap). Gir 'låve', 'uthus' eller null.
  function slag(plan) {
    if (!plan || !plan.akse || !plan.rom) return null;
    if (plan.kl === 'låve' && plan.areal >= REGLER.låveMin) return 'låve';
    if (plan.kl === 'uthus' && plan.areal >= REGLER.uthusMin) return 'uthus';
    return null;
  }

  // Plassene (uten tegning): { loft, høy, redskap, trillebår, spann, traktor } i planens meter. blokkert(x, y) = interiørets kollisjon,
  // inni(x, y) = inne i omrisset. Brukes av visningen og testen.
  function plasser(plan, blokkert, inni) {
    const s = slag(plan); if (!s) return null;
    const A = plan.akse, frø = plan.i | 0; let n = 0; const tilf = () => hash(frø, 900 + ++n);
    const tilXY = (u, v) => [u * A.ux + v * A.vx, u * A.uy + v * A.vy], tilUV = (x, y) => [x * A.ux + y * A.uy, x * A.vx + y * A.vy];
    // det største hele rommet (låven er én hall)
    const rom = plan.rom.filter(r => r.andel > .3).sort((a, b) => b.areal - a.areal)[0]; if (!rom) return null;
    const I = plan.inngang, [iu, iv] = tilUV(I.inn[0], I.inn[1]), lu = rom.u1 - rom.u0, lv = rom.v1 - rom.v0;
    const fri = (x, y, r = 0) => inni(x, y) && !blokkert(x, y) && (!r || [[r, 0], [-r, 0], [0, r], [0, -r]].every(([a, b]) => inni(x + a, y + b) && !blokkert(x + a, y + b)));
    const ut = { slag: s, loft: null, høy: [], redskap: [], trillebår: null, spann: [], traktor: null };
    const nærDør = (x, y) => Math.hypot(x - I.inn[0], y - I.inn[1]);
    if (s === 'låve') {
      // høyloftet i enden lengst fra døra, over hele bredden
      if (plan.tak >= REGLER.loftTak && lu >= 7 && lv >= 3.5) {
        const dyp = Math.min(REGLER.loftMaks, lu * REGLER.loftAndel), langt = iu - rom.u0 < rom.u1 - iu, u0 = langt ? rom.u1 - dyp : rom.u0, u1 = langt ? rom.u1 : rom.u0 + dyp;
        // dekket over det høyeste møbelet som står under loftet (traktoren er 2,4 m), og minst 1 m under taket
        let under = 0; for (const m of plan.møbler) { const [mu] = tilUV(m.x, m.y); if (mu > u0 - 1.5 && mu < u1 + 1.5) under = Math.max(under, m.h || 0); }
        const z = Math.max(REGLER.loftHøyde[0], Math.min(REGLER.loftHøyde[1], plan.tak * .5), under + .45), kant = langt ? u0 : u1;
        const stolper = []; const k = Math.max(2, Math.round(lv / REGLER.stolpe) + 1);
        for (let i = 0; i < k; i++) { const v = rom.v0 + .25 + (lv - .5) * i / (k - 1), [x, y] = tilXY(kant, v); if (inni(x, y) && !blokkert(x, y)) stolper.push([x, y]); }
        // stigen ved den ene langveggen, på gulvsiden av kanten
        const sv = rom.v0 + lv * (tilf() < .5 ? .2 : .8), [sx, sy] = tilXY(kant + (langt ? -.55 : .55), sv);
        if (z <= plan.tak - 1) ut.loft = { u0, u1, v0: rom.v0, v1: rom.v1, z, kant, mot: langt ? -1 : 1, stolper, stige: fri(sx, sy) ? [sx, sy] : null };
      }
      // uten høyloft (lavt tak – de fleste låvene der himlingen stopper ved veggtoppen): to–tre høyhauger i enden lengst fra døra
      ut.hauger = [];
      if (!ut.loft && lu >= 5) { const langt = iu - rom.u0 < rom.u1 - iu, n = Math.min(3, Math.max(1, Math.round(lv / 3.5)));
        // helst i enden lengst fra døra; er den full (høyballer, båser), den andre enden
        for (const ende of [langt, !langt]) for (let i = 0; i < n * 2 && ut.hauger.length < n; i++) {
          const u = ende ? rom.u1 - 1.3 : rom.u0 + 1.3, v = rom.v0 + lv * (i + .5) / (n * 2), [x, y] = tilXY(u, v), r = Math.min(1.5, lv / n / 2 + .2);
          if (fri(x, y, r * .75) && nærDør(x, y) > 2.5 && !ut.hauger.some(h => Math.hypot(h[0] - x, h[1] - y) < r * 1.6)) ut.hauger.push([x, y, r, Math.min(plan.tak - .5, .8 + tilf() * .6)]); } }
      // høy strødd på gulvet
      const nH = Math.min(REGLER.høyMaks, Math.round(plan.areal / REGLER.høyPer));
      for (let i = 0; i < nH * 2 && ut.høy.length < nH; i++) { const u = rom.u0 + .4 + (lu - .8) * tilf(), v = rom.v0 + .4 + (lv - .8) * tilf(), [x, y] = tilXY(u, v);
        if (!inni(x, y) || nærDør(x, y) < 1) continue; ut.høy.push([x, y, REGLER.høyR[0] + (REGLER.høyR[1] - REGLER.høyR[0]) * tilf(), tilf() * 6.283]); }
      // melkespann ved en vegg nær døra
      for (let i = 0; i < 12 && ut.spann.length < 3; i++) { const u = iu + (tilf() - .5) * Math.min(lu, 6), v = tilf() < .5 ? rom.v0 + .35 : rom.v1 - .35, [x, y] = tilXY(u, v);
        if (fri(x, y, .25) && nærDør(x, y) > 1.2) ut.spann.push([x, y]); }
      // gråtassen, der låven ikke har traktor fra før
      if (plan.areal >= REGLER.traktorMin && !plan.møbler.some(m => m.type === 'traktor')) {
        const [b, d] = REGLER.traktor, langs = lu >= lv;
        for (let i = 0; i < 40 && !ut.traktor; i++) { const u = rom.u0 + d / 2 + .5 + (lu - d - 1) * tilf(), v = rom.v0 + b / 2 + .5 + (lv - b - 1) * tilf(), [x, y] = tilXY(u, v);
          if (nærDør(x, y) < REGLER.traktorDør + d / 2) continue;
          if (ut.loft && u > ut.loft.u0 - .5 && u < ut.loft.u1 + .5) continue;
          const a = Math.atan2(A.uy, A.ux) + (langs ? 0 : Math.PI / 2), c = Math.cos(a), si = Math.sin(a);
          // alle hjørner og midten fri (traktoren er lang langs a)
          const ok = [[0, 0], [d / 2, b / 2], [d / 2, -b / 2], [-d / 2, b / 2], [-d / 2, -b / 2], [d / 2, 0], [-d / 2, 0]].every(([p, q]) => fri(x + p * c - q * si, y + p * si + q * c));
          if (ok) ut.traktor = { x, y, a, b, d }; }
      }
    }
    // redskap lent mot ytterveggen (stykkene som ligger i rommet), ikke nær døra eller i møbler
    const S = plan.ytre.filter(w => Math.hypot(w.bx - w.ax, w.by - w.ay) > 2.2), maksR = s === 'låve' ? 6 : 4, slagR = ['gaffel', 'rive', 'spade', 'ljå', 'gaffel', 'kost'];
    const mx = (plan.bb[0] + plan.bb[2]) / 2, my = (plan.bb[1] + plan.bb[3]) / 2;
    for (let i = 0; i < 30 && ut.redskap.length < maksR && S.length; i++) {
      const w = S[Math.floor(tilf() * S.length)], L = Math.hypot(w.bx - w.ax, w.by - w.ay), ex = (w.bx - w.ax) / L, ey = (w.by - w.ay) / L, t = .6 + (L - 1.2) * tilf();
      let nx = -ey, ny = ex; if ((mx - w.ax) * nx + (my - w.ay) * ny < 0) { nx = -nx; ny = -ny; }
      const fx = w.ax + ex * t + nx * .42, fy = w.ay + ey * t + ny * .42;
      if (!fri(fx, fy) || nærDør(fx, fy) < 1.6 || ut.redskap.some(r => Math.hypot(r.x - fx, r.y - fy) < .35)) continue;
      ut.redskap.push({ x: fx, y: fy, nx, ny, ex, ey, slag: slagR[ut.redskap.length % slagR.length] });
    }
    // trillebåra rett innenfor døra, litt til siden
    for (let i = 0; i < 16 && !ut.trillebår; i++) { const sd = (tilf() - .5) * 4, inn = 1.4 + tilf() * 2, x = I.inn[0] - I.nx * inn + I.ux * sd, y = I.inn[1] - I.ny * inn + I.uy * sd;
      if (fri(x, y, .55) && Math.abs(sd) > .9) ut.trillebår = { x, y, a: Math.atan2(I.uy, I.ux) + (tilf() - .5) }; }
    return ut;
  }

  // (runde 12) møblene fra interiøret som tegnes her (avrundet) i stedet for som klosser i spill/interior3d.js
  const TEGNER = { høyball: 1, traktor: 1 };
  const Lave = { REGLER, slag, plasser, tegner: TEGNER };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Lave; return; }
  rot.Lave3d = Lave;

  // ---------- i nettleseren ----------
  if (typeof KROKER === 'undefined') return;
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  const laget = new Map();   // plan -> nett
  let mat = null, sist = 0, forU = null, trekanter = 0;

  // Et samlet nett: kasser (midt c, tre halve akser), prismer (sylindre med få kanter) og flate flak, med farge per hjørne
  function bygger() {
    const pos = [], kol = [];
    const tri = (a, b, c, f, fb, fc) => { pos.push(...a, ...b, ...c); kol.push(...f, ...(fb || f), ...(fc || f)); };
    const fire = (a, b, c, d, f) => { tri(a, b, c, f); tri(a, c, d, f); };
    const lys = (f, k) => [f[0] * k, f[1] * k, f[2] * k];
    // kasse: c midt, A/B/H halve akser (vektorer)
    const kasse = (c, A, B, H, f) => { const p = (i, j, k) => [c[0] + A[0] * i + B[0] * j + H[0] * k, c[1] + A[1] * i + B[1] * j + H[1] * k, c[2] + A[2] * i + B[2] * j + H[2] * k];
      fire(p(-1, -1, 1), p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1), lys(f, 1.06)); fire(p(-1, 1, -1), p(1, 1, -1), p(1, -1, -1), p(-1, -1, -1), lys(f, .7));
      fire(p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1), lys(f, .92)); fire(p(1, 1, -1), p(-1, 1, -1), p(-1, 1, 1), p(1, 1, 1), lys(f, .86));
      fire(p(1, -1, -1), p(1, 1, -1), p(1, 1, 1), p(1, -1, 1), lys(f, .96)); fire(p(-1, 1, -1), p(-1, -1, -1), p(-1, -1, 1), p(-1, 1, 1), lys(f, .8)); };
    // rett kasse langs x/y-vinkel a (radianer), fra z0 til z1
    const boks = (x, y, a, b, d, z0, z1, f) => { const c = Math.cos(a), s = Math.sin(a); kasse([x, y, (z0 + z1) / 2], [c * d / 2, s * d / 2, 0], [-s * b / 2, c * b / 2, 0], [0, 0, (z1 - z0) / 2], f); };
    // stav fra p til q med tykkelse t (kvadratisk tverrsnitt)
    const stav = (p, q, t, f) => { const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], L = Math.hypot(...d) || 1, e = d.map(v => v / L);
      let a = Math.abs(e[2]) < .9 ? [-e[1], e[0], 0] : [1, 0, 0]; const la = Math.hypot(...a); a = a.map(v => v / la * t / 2);
      const b = [e[1] * a[2] - e[2] * a[1], e[2] * a[0] - e[0] * a[2], e[0] * a[1] - e[1] * a[0]];
      kasse([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2], a, b, d.map(v => v / 2), f); };
    // prisme (rundt) langs aksen e fra midten c: radius r, halv lengde h, k kanter
    const prisme = (c, e, r, h, k, f) => { let a = Math.abs(e[2]) < .9 ? [-e[1], e[0], 0] : [1, 0, 0]; const la = Math.hypot(...a); a = a.map(v => v / la);
      const b = [e[1] * a[2] - e[2] * a[1], e[2] * a[0] - e[0] * a[2], e[0] * a[1] - e[1] * a[0]];
      const P = (i, s) => { const v = i / k * 6.2832, cs = Math.cos(v) * r, sn = Math.sin(v) * r; return [0, 1, 2].map(q => c[q] + a[q] * cs + b[q] * sn + e[q] * h * s); };
      for (let i = 0; i < k; i++) { fire(P(i, -1), P(i + 1, -1), P(i + 1, 1), P(i, 1), lys(f, .78 + .26 * Math.abs(Math.cos((i + .5) / k * 6.2832)))); tri(P(i, 1), P(i + 1, 1), c.map((v, q) => v + e[q] * h), lys(f, 1.05)); tri(P(i + 1, -1), P(i, -1), c.map((v, q) => v - e[q] * h), lys(f, .7)); } };
    // flatt, ujevnt flak (vifte) i høyde z
    // (midten litt høyere og lysere, kanten mørkere – farge per hjørne, så flaket ikke blir kantete)
    const flak = (x, y, z, r, v0, f, frø) => { const k = 9, P = [], F = []; for (let i = 0; i < k; i++) { const v = v0 + i / k * 6.2832, rr = r * (.6 + .5 * hash(frø, i)); P.push([x + Math.cos(v) * rr, y + Math.sin(v) * rr, z]); F.push(lys(f, .78 + .12 * hash(frø, 20 + i))); }
      const m = [x, y, z + .05 + .05 * hash(frø, 40)], fm = lys(f, 1.05); for (let i = 0; i < k; i++) tri(m, P[i], P[(i + 1) % k], fm, F[i], F[(i + 1) % k]); };
    // haug: lav kuppel (ringer × kanter) med ujevn kant
    const haug = (x, y, z, r, h, f, frø) => { const k = 9, ringer = 3, P = [];
      for (let j = 0; j <= ringer; j++) { const t = j / ringer, rr = r * Math.cos(t * 1.5708), zz = z + h * Math.sin(t * 1.5708); const rad = [];
        for (let i = 0; i < k; i++) { const v = i / k * 6.2832, q = j < ringer ? .82 + .3 * hash(frø, j * 16 + i) : 0; rad.push([x + Math.cos(v) * rr * q, y + Math.sin(v) * rr * q, zz]); } P.push(rad); }
      const F = (j, i) => lys(f, .8 + .12 * hash(frø, 100 + j * 16 + i) + .08 * j);
      for (let j = 0; j < ringer; j++) for (let i = 0; i < k; i++) { const ii = (i + 1) % k; tri(P[j][i], P[j][ii], P[j + 1][ii], F(j, i), F(j, ii), F(j + 1, ii)); tri(P[j][i], P[j + 1][ii], P[j + 1][i], F(j, i), F(j + 1, ii), F(j + 1, i)); } };
    return { pos, kol, kasse, boks, stav, prisme, flak, haug };
  }

  // Tegner plassene fra plasser() for én plan i ett nett
  function lagNett(plan, p) {
    const g = bygger(), z0 = plan.gulv, A = plan.akse, frø = plan.i | 0, tilXY = (u, v) => [u * A.ux + v * A.vx, u * A.uy + v * A.vy], vinkel = Math.atan2(A.uy, A.ux);
    for (const [x, y, r, h] of p.hauger || []) g.haug(x, y, z0, r, h, HØY, Math.round(x * 31 + y * 17));
    // (runde 12, kritikken: «høyet er gule flekker malt rett på gulvet») – strødd høy er små, lave dotter i 3D (annenhver), ikke flate flak
    for (const [n, [x, y, r, v]] of p.høy.entries()) { if (n % 2) continue; const f = hash(frø, x * 7 + y) < .3 ? HØY_MØRK : HØY; g.haug(x, y, z0, r * .55, .06 + .1 * hash(frø, x + y * 3), f, Math.round(x * 13 + y * 7)); void v; }
    // takåser langs låven (under sperrene fra interiøret) – to rekker i største rommet
    { const rom = plan.rom.filter(r => r.andel > .3).sort((a, b) => b.areal - a.areal)[0];
      if (rom && plan.tak > 2.6) for (const t of [1 / 3, 2 / 3]) { const v = rom.v0 + (rom.v1 - rom.v0) * t, [ax, ay] = tilXY(rom.u0 + .1, v), [bx, by] = tilXY(rom.u1 - .1, v);
        g.stav([ax, ay, z0 + plan.tak - .27], [bx, by, z0 + plan.tak - .27], .18, TRE_MØRK); } }
    if (p.loft) { const L = p.loft, z = z0 + L.z, uM = (L.u0 + L.u1) / 2, vM = (L.v0 + L.v1) / 2, [mx, my] = tilXY(uM, vM), du = L.u1 - L.u0, dv = L.v1 - L.v0;
      // dekket (bord på bjelker) og kantbjelken
      g.boks(mx, my, vinkel, dv - .1, du - .05, z - .06, z + .06, [.5, .38, .25]);
      for (let i = 0; i < Math.floor(du / .9); i++) { const [bx, by] = tilXY(L.u0 + .45 + i * .9, vM); g.boks(bx, by, vinkel, dv - .12, .14, z - .26, z - .06, TRE_MØRK); }
      { const [kx, ky] = tilXY(L.kant, vM); g.boks(kx, ky, vinkel, dv - .1, .18, z - .3, z + .1, TRE_MØRK); }
      for (const [x, y] of L.stolper) g.boks(x, y, vinkel, .16, .16, z0, z - .26, TRE);
      // høy oppå: hauger og noen baller, og høy som henger over kanten
      const nH = Math.max(2, Math.round(dv / 3));
      for (let i = 0; i < nH; i++) { const v = L.v0 + dv * (i + .5) / nH, u = uM + (hash(frø, 300 + i) - .5) * du * .3, [hx, hy] = tilXY(u, v);
        g.haug(hx, hy, z + .06, Math.min(du * .5, 1.4 + hash(frø, 310 + i) * 1.1), .9 + hash(frø, 320 + i) * .9, HØY, frø + i * 31); }
      for (let i = 0; i < Math.round(dv / 1.6); i++) { const v = L.v0 + .9 + i * 1.6, u = L.kant - L.mot * (.8 + hash(frø, 330 + i) * .5), [bx, by] = tilXY(u, v); if (v > L.v1 - .8) break;
        g.boks(bx, by, vinkel + (hash(frø, 340 + i) - .5) * .3, .48, .9, z + .06, z + .44, [.74, .64, .34]); }
      for (let i = 0; i < Math.round(dv / .7); i++) { const v = L.v0 + .3 + i * .7 + hash(frø, 350 + i) * .3; if (v > L.v1 - .3) break; const [hx, hy] = tilXY(L.kant + L.mot * .02, v);
        g.stav([hx, hy, z + .08], [hx + A.ux * L.mot * .12, hy + A.uy * L.mot * .12, z - .25 - hash(frø, 360 + i) * .3], .22 + hash(frø, 370 + i) * .2, HØY_MØRK); }
      // stigen: to vanger og trinn hver 0,3 m, lent mot kantbjelken
      if (L.stige) { const [sx, sy] = L.stige, [tx, ty] = tilXY(L.kant, 0), ox = A.ux * L.mot, oy = A.uy * L.mot, topp = [sx - ox * .45, sy - oy * .45], fot = [sx + ox * .1, sy + oy * .1];
        void tx; void ty;
        for (const s of [-.22, .22]) g.stav([fot[0] + A.vx * s, fot[1] + A.vy * s, z0], [topp[0] + A.vx * s, topp[1] + A.vy * s, z + .7], .06, TRE);
        for (let h = .3; h < L.z + .5; h += .3) { const t = h / (L.z + .7), x = fot[0] + (topp[0] - fot[0]) * t, y = fot[1] + (topp[1] - fot[1]) * t;
          g.stav([x - A.vx * .22, y - A.vy * .22, z0 + h], [x + A.vx * .22, y + A.vy * .22, z0 + h], .04, TRE); } } }
    // redskap: skaft lent mot veggen med jern eller tinder øverst/nederst
    for (const r of p.redskap) { const fot = [r.x, r.y, z0], topp = [r.x - r.nx * .34, r.y - r.ny * .34, z0 + 1.45];
      if (r.slag === 'kost') { g.stav(fot, topp, .035, TRE); g.boks(r.x, r.y, Math.atan2(r.ey, r.ex), .12, .32, z0, z0 + .2, [.5, .42, .26]); continue; }
      if (r.slag === 'spade') { g.stav([r.x, r.y, z0 + .28], topp, .035, TRE); g.boks(r.x, r.y, Math.atan2(r.ey, r.ex), .05, .22, z0, z0 + .3, JERN); continue; }
      // gaffel, rive og ljå har redskapet oppe (de står på skaftenden)
      const tx = topp[0], ty = topp[1], tz = topp[2];
      g.stav(fot, topp, .035, r.slag === 'ljå' ? TRE_MØRK : TRE);
      if (r.slag === 'gaffel') for (const s of [-.08, 0, .08]) g.stav([tx + r.ex * s, ty + r.ey * s, tz], [tx + r.ex * s * 1.2 - r.nx * .05, ty + r.ey * s * 1.2 - r.ny * .05, tz + .32], .018, JERN);
      if (r.slag === 'rive') { g.stav([tx - r.ex * .3, ty - r.ey * .3, tz], [tx + r.ex * .3, ty + r.ey * .3, tz], .045, TRE); for (let s = -.27; s <= .28; s += .09) g.stav([tx + r.ex * s, ty + r.ey * s, tz], [tx + r.ex * s + r.nx * .1, ty + r.ey * s + r.ny * .1, tz - .03], .015, TRE); }
      if (r.slag === 'ljå') g.stav([tx, ty, tz], [tx + r.ex * .55 + r.nx * .05, ty + r.ey * .55 + r.ny * .05, tz - .12], .03, GRÅ); }
    // trillebår: kasse, hjul foran, to håndtak og to bein
    if (p.trillebår) { const t = p.trillebår, c = Math.cos(t.a), s = Math.sin(t.a), P = (a, b) => [t.x + a * c - b * s, t.y + a * s + b * c];
      const [kx, ky] = P(0, 0); g.boks(kx, ky, t.a, .6, .8, z0 + .32, z0 + .6, [.28, .4, .3]);
      const [hx, hy] = P(.62, 0); g.prisme([hx, hy, z0 + .2], [-s, c, 0], .2, .05, 8, JERN);
      for (const b of [-.24, .24]) { const [ax, ay] = P(.55, b), [bx, by] = P(-.85, b * 1.2); g.stav([ax, ay, z0 + .28], [bx, by, z0 + .62], .04, TRE); const [fx, fy] = P(-.3, b); g.stav([fx, fy, z0], [fx, fy, z0 + .34], .04, JERN); } }
    for (const [x, y] of p.spann) { g.prisme([x, y, z0 + .3], [0, 0, 1], .17, .3, 8, [.74, .75, .74]); g.prisme([x, y, z0 + .66], [0, 0, 1], .1, .06, 8, [.68, .69, .68]); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(g.kol, 3)); geo.computeVertexNormals();
    if (!mat) mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const m = new THREE.Mesh(geo, mat); m.userData.låve = true; m.frustumCulled = true;
    // (runde 12) de avrundede tingene: traktorer, høyballer og lysstråler som egne små nett under hovednettet
    try { avrundet(m, plan, p); } catch (e) { console.warn('låve (avrundet):', e); }
    return m;
  }

  // ---------- (runde 12, kritikken: «traktoren er fire klosser», «høyet er gule flekker på gulvet», «flate vegger», ingen lys) ----------
  // Traktorene bygges én gang (Kjoretoy3d.form: avrundede bokser, runde dekk, skjermer og lykter – fronten mot +x, origo midt på bakken)
  // og deles av alle låvene; høyballene er avrundede firkantballer med to snorer og løst høy oppå; gjennom sprekkene i veggene faller
  // lysstråler (to kryssede flater med myk tone, additive – ingen nye lys). Tallene er Claudes forslag.
  const TRAKTOR = { rød: [.72, .12, .08], rødMørk: [.5, .08, .06], grå: [.56, .58, .56] };
  const geoer = {};
  function traktorGeo(type) {
    if (geoer[type]) return geoer[type]; const F = window.Kjoretoy3d && Kjoretoy3d.form; if (!F || !window.MODELLER) return null;
    const d = [], FA = F.FARGE, SV = FA.SV, STÅL = FA.STÅL, GL = FA.GL, LYKT = FA.LYKT;
    if (type === 'rød') { const R = TRAKTOR.rød, RM = TRAKTOR.rødMørk;
      // bakhjul og forhjul, skjermer over bakhjulene
      for (const s of [-1, 1]) { F.rundHjul(d, -.85, s * .8, .78, .46, [.75, .62, .1], SV, 16); F.rundHjul(d, 1.2, s * .7, .44, .3, [.75, .62, .1], SV, 12); F.skjerm(d, -.85, s * .82, .82, .86, .5, R); }
      // ramme, motorpanser som smalner fram, grill, lykter, eksosrør
      F.rundBoks(d, .15, 0, .42, 2.6, .62, .42, .1, SV); F.rundBoks(d, .72, 0, .78, 1.75, .78, .72, .16, R, { fin: true, smal: .86 });
      F.rundBoks(d, 1.6, 0, .82, .1, .62, .58, .04, [.12, .12, .12]); for (const s of [-1, 1]) F.lykt(d, 1.63, s * .22, 1.32, .07, LYKT);
      F.rundBoks(d, 1.0, .25, 1.48, .08, .08, .06, .03, SV); { const g = new THREE.CylinderGeometry(.045, .05, .9, 8); g.rotateX(Math.PI / 2); g.translate(1.0, .25, 1.95); d.push(F.farg(g, SV)); }
      // hytta: gulv, fire stolper, glass på alle sider, tak med skjerm
      F.rundBoks(d, -.75, 0, .78, 1.3, 1.3, .62, .1, RM);
      for (const [x, y] of [[-1.35, -.6], [-1.35, .6], [-.15, -.6], [-.15, .6]]) F.rundBoks(d, x, y, 1.4, .07, .07, 1.0, .03, SV);
      F.rundBoks(d, -.15, 0, 1.45, .04, 1.14, .92, .02, GL); F.rundBoks(d, -1.35, 0, 1.45, .04, 1.14, .92, .02, GL);
      for (const s of [-1, 1]) F.rundBoks(d, -.75, s * .6, 1.45, 1.14, .04, .92, .02, GL);
      F.rundBoks(d, -.75, 0, 2.4, 1.46, 1.42, .14, .06, R); F.rundBoks(d, -.75, 0, 2.38, 1.52, 1.48, .04, .02, [.85, .85, .82]);
      // sete og ratt inne i hytta
      F.rundBoks(d, -1.0, 0, 1.4, .4, .44, .12, .05, SV); F.rundBoks(d, -1.18, 0, 1.52, .08, .42, .42, .04, SV);
      { const g = new THREE.TorusGeometry(.16, .022, 6, 14); g.rotateY(Math.PI / 2 - .5); g.translate(-.5, 0, 1.75); d.push(F.farg(g, SV)); }
      // trekkstang bak
      F.rundBoks(d, -1.65, 0, .55, .3, .5, .16, .05, STÅL); }
    else { const G = TRAKTOR.grå;
      // gråtassen: store bakhjul, små forhjul, smalt panser, sete på stang, ratt, eksosrør og skjermer over bakhjulene
      for (const s of [-1, 1]) { F.rundHjul(d, -.75, s * .72, .6, .3, [.62, .2, .14], SV, 14); F.rundHjul(d, .95, s * .62, .33, .18, [.62, .2, .14], SV, 12); F.skjerm(d, -.75, s * .74, .62, .66, .34, G); }
      F.rundBoks(d, .4, 0, .5, 1.4, .52, .56, .14, G, { fin: true, smal: .9 }); F.rundBoks(d, 1.12, 0, .5, .12, .56, .58, .05, [.4, .42, .4]);
      F.rundBoks(d, -.3, 0, .45, .8, .7, .45, .1, [.35, .36, .34]); F.rundBoks(d, .95, 0, .26, .14, 1.24, .14, .04, STÅL);
      { const g = new THREE.CylinderGeometry(.03, .035, .6, 8); g.rotateX(Math.PI / 2); g.translate(.85, .18, 1.35); d.push(F.farg(g, SV)); }
      F.rundBoks(d, -.78, 0, 1.12, .44, .4, .1, .05, [.2, .2, .2]); F.rundBoks(d, -.78, 0, .9, .07, .07, .22, .03, STÅL);
      { const g = new THREE.TorusGeometry(.18, .02, 6, 14); g.rotateY(Math.PI / 2 - .7); g.translate(-.2, 0, 1.42); d.push(F.farg(g, SV)); } }
    return (geoer[type] = MODELLER.samle(d));
  }
  // en firkantball: avrundet, to snorer rundt, litt løst høy oppå (fast per ball)
  function ballGeo() {
    if (geoer.ball) return geoer.ball; const F = window.Kjoretoy3d && Kjoretoy3d.form; if (!F || !window.MODELLER) return null; const d = [];
    F.rundBoks(d, 0, 0, 0, 1.0, 1.0, 1.0, .09, [1, 1, 1], { fin: true });
    for (const x of [-.24, .24]) F.rundBoks(d, x, 0, -.004, .025, 1.012, 1.01, .01, [.5, .42, .24]);
    return (geoer.ball = MODELLER.samle(d));
  }
  let strålMat = null;
  function stråleMat() {
    if (strålMat) return strålMat; const c = document.createElement('canvas'); c.width = 32; c.height = 128; const q = c.getContext('2d');
    // lysest midt på tvers og øverst, borte ved kantene og nederst
    const a = q.createLinearGradient(0, 0, 32, 0); a.addColorStop(0, 'rgba(0,0,0,1)'); a.addColorStop(.5, 'rgba(255,255,255,1)'); a.addColorStop(1, 'rgba(0,0,0,1)'); q.fillStyle = a; q.fillRect(0, 0, 32, 128);
    q.globalCompositeOperation = 'multiply'; const b = q.createLinearGradient(0, 0, 0, 128); b.addColorStop(0, '#fff'); b.addColorStop(.75, '#888'); b.addColorStop(1, '#000'); q.fillStyle = b; q.fillRect(0, 0, 32, 128);
    const t = new THREE.CanvasTexture(c);
    return (strålMat = new THREE.MeshBasicMaterial({ map: t, color: 0x7a6640, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  }
  const LYS = { stråler: [3, 6], bredde: [.18, .45] };
  function avrundet(m, plan, p) {
    const z0 = plan.gulv, frø = plan.i | 0;
    if (!m.userData.barn) m.userData.barn = [];
    const legg = (geo, mat2, x, y, z, a, sk) => { if (!geo) return null; const c = new THREE.Mesh(geo, mat2); c.position.set(x, y, z); c.rotation.z = a; if (sk) c.scale.set(...sk); c.userData.delt = true; m.add(c); m.userData.barn.push(c); return c; };
    // traktorene: den røde fra interiøret (møbelets fremside er +y i møbelets akser) og gråtassen
    const låve = slag(plan) === 'låve';
    for (const mb of plan.møbler) if (låve && mb.type === 'traktor') legg(traktorGeo('rød'), mat, mb.x, mb.y, z0, mb.a + Math.PI / 2, [.95, .95, .95]);
    if (p.traktor) legg(traktorGeo('grå'), mat, p.traktor.x, p.traktor.y, z0, p.traktor.a);
    // høyballene: farge per ball (eget materiale per tone – tre toner), litt skjeve
    const BALL = [[.84, .72, .4], [.78, .67, .36], [.72, .64, .38]];
    if (!m.userData.ballMat) m.userData.ballMat = BALL.map(f => new THREE.MeshLambertMaterial({ vertexColors: true, color: new THREE.Color(f[0], f[1], f[2]) }));
    for (const [n, mb] of plan.møbler.entries()) if (låve && mb.type === 'høyball') { const h = hash(frø, 500 + n);
      legg(ballGeo(), m.userData.ballMat[Math.floor(h * 3) % 3], mb.x, mb.y, z0, mb.a + (h - .5) * .12, [mb.b * .96, mb.d * .96, mb.h * .95]); }
    // lysstråler gjennom sprekkene: fra høyt på en yttervegg og ned på gulvet et par meter inn
    const S = plan.ytre.filter(w => Math.hypot(w.bx - w.ax, w.by - w.ay) > 3), n = LYS.stråler[0] + Math.floor(hash(frø, 600) * (LYS.stråler[1] - LYS.stråler[0] + 1));
    const mx = (plan.bb[0] + plan.bb[2]) / 2, my = (plan.bb[1] + plan.bb[3]) / 2, pos = [], uv = [];
    for (let i = 0; i < n && S.length; i++) { const w = S[Math.floor(hash(frø, 610 + i) * S.length)], L = Math.hypot(w.bx - w.ax, w.by - w.ay), ex = (w.bx - w.ax) / L, ey = (w.by - w.ay) / L, t = 1 + (L - 2) * hash(frø, 620 + i);
      let nx = -ey, ny = ex; if ((mx - w.ax) * nx + (my - w.ay) * ny < 0) { nx = -nx; ny = -ny; }
      const top = [w.ax + ex * t + nx * .05, w.ay + ey * t + ny * .05, z0 + plan.tak - .3], inn = 2 + hash(frø, 630 + i) * 2.5, skrå = (hash(frø, 640 + i) - .5) * 1.5;
      const bunn = [top[0] + nx * inn + ex * skrå, top[1] + ny * inn + ey * skrå, z0 + .02];
      if (!Interior.inni(plan.P, bunn[0], bunn[1])) continue; const b = LYS.bredde[0] + (LYS.bredde[1] - LYS.bredde[0]) * hash(frø, 650 + i);
      // to kryssede flater (langs veggen og på tvers), så strålen synes fra alle kanter
      for (const [ax, ay] of [[ex, ey], [nx * .4 + ex * .6, ny * .4 + ey * .6]]) { const q = [[top[0] - ax * b * .3, top[1] - ay * b * .3, top[2]], [top[0] + ax * b * .3, top[1] + ay * b * .3, top[2]], [bunn[0] + ax * b, bunn[1] + ay * b, bunn[2]], [bunn[0] - ax * b, bunn[1] - ay * b, bunn[2]]];
        for (const k of [0, 1, 2, 0, 2, 3]) pos.push(...q[k]); uv.push(0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0); } }
    if (pos.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const c = new THREE.Mesh(g, stråleMat()); c.renderOrder = 3; c.frustumCulled = false; m.add(c); m.userData.barn.push(c); }
  }
  // nettet og barna (de delte geometriene for traktor og ball frigjøres ikke)
  function kast(m) { m.geometry.dispose(); for (const c of m.userData.barn || []) if (!c.userData.delt) c.geometry.dispose(); for (const b of m.userData.ballMat || []) b.dispose(); }

  function oppdater(R) {
    const u = R.ut; if (!u || !window.Interior3d || !window.Interior) return;
    if (forU !== u) { tøm(R); forU = u; }
    const nå = performance.now(); if (nå - sist < 400) return; sist = nå;
    // (20. nov natt, hakk – pakka «lys»: før ble alle låvene laget i samme runde) høyst én låve per runde (hver 400 ms)
    const aktive = new Set(); let bygget = false;
    for (const o of Interior3d.aktive()) { const pl = o.plan; if (!slag(pl) || pl.gulv === undefined) continue; aktive.add(pl);
      if (laget.has(pl) || bygget) continue; bygget = true;
      const p = plasser(pl, (x, y) => Interior.blokkert(pl, x, y), (x, y) => Interior.inni(pl.P, x, y)); if (!p) continue;
      // gråtassen stopper deg som møblene (en ny type – lut.js kjenner den ikke, så den blir ingen beholder)
      if (p.traktor && !pl.møbler.some(m => m.type === 'gråtass')) { const T = p.traktor; pl.møbler.push({ type: 'gråtass', x: T.x, y: T.y, a: T.a, b: T.d, d: T.b, h: 1.6, sperrer: true }); }
      let m = null; try { m = lagNett(pl, p); } catch (e) { console.warn('låve:', e); }
      if (m) { R.scene.add(m); laget.set(pl, m); trekanter += m.geometry.attributes.position.count / 3; } }
    for (const [pl, m] of [...laget]) if (!aktive.has(pl)) { R.scene.remove(m); kast(m); trekanter -= m.geometry.attributes.position.count / 3; laget.delete(pl); }
  }
  function tøm(R) { for (const [, m] of laget) { R.scene.remove(m); kast(m); } laget.clear(); trekanter = 0; }
  KROKER.ramme3d.push(R => { if (R.fot || laget.size) oppdater(R); });
  Lave.antall = () => laget.size;
  Lave.trekanter = () => Math.round(trekanter);
  Lave.oppdater = () => { const R = r3(); if (R) { sist = 0; oppdater(R); } };
  // til vakten: lag nettet for en plan (uten scenen) og gi antall trekanter og om alle hjørnene er tall; nettet frigjøres straks
  Lave.prøvNett = plan => { const p = plasser(plan, (x, y) => Interior.blokkert(plan, x, y), (x, y) => Interior.inni(plan.P, x, y)); if (!p) return null;
    const m = lagNett(plan, p), a = m.geometry.attributes.position.array; let ok = true; for (let i = 0; i < a.length; i++) if (!(a[i] === a[i])) { ok = false; break; }
    const barn = (m.userData.barn || []).length, ut = { trekanter: a.length / 9, tall: ok, loft: !!p.loft, traktor: !!p.traktor, hauger: (p.hauger || []).length, barn }; kast(m); return ut; };
  // til vakten (pipeline/fliser/vakter/3d.js): hva låvene viser nå – traktorer, baller og stråler som egne nett
  Lave.barn = () => [...laget.values()].map(m => (m.userData.barn || []).map(c => c.material === strålMat ? 'stråle' : c.geometry === geoer.ball ? 'ball' : c.geometry === geoer.rød ? 'traktor' : c.geometry === geoer.grå ? 'gråtass' : 'annet'));
  Lave.sjekk = () => [...laget].map(([pl, m]) => ({ kl: pl.kl, areal: Math.round(pl.areal), trekanter: m.geometry.attributes.position.count / 3, gulv: pl.gulv }));
})(typeof globalThis !== 'undefined' ? globalThis : this);
