'use strict';
// Regler for vegene i 3D (uten DOM og uten THREE, så de kan testes i Node: pipeline/fliser/test_veg.js). Visningen er spill/liv3d.js.
// Feiljakten 12. nov: «parallelle veger oppå hverandre», «svarte, kantete asfaltflak i kryssene», «veger i tunnel tegnes oppå fjellet».
// Årsakene: (1) NVDB gir gang- og sykkelveger samme kategori som vegen de ligger langs, og de ble tegnet som brede bilveger – nå har
// vegene i flisene vegtype (pipeline/fliser/vegtype.py: g = 1 gang- og sykkelveg, t = 1 kanalisert veg, 2 rampe, 3 rundkjøring, 4 ferje,
// 5 gangfelt); eldre fliser uten vegtype får en gjetning (gjett). (2) Hver lenke og hver flis ga sin egen vegbit – nå klippes vegene
// til flisen (klipp) og skjøtes til hele veger (skjøt). (3) Kryssflaten var det konvekse skallet rundt alle armene – nå en stump per
// arm og et avskåret hjørne mellom naboarmene (kryssFlate). (4) Vegbiter som følger et tunnelløp tas bort (utenTunnel).
(function (rot) {
  // Kjørebanens bredde (m) per vegkategori
  const BREDDE = { E: 8, R: 7.5, F: 6.5, K: 5.5, P: 4, S: 3.5 };
  // Halv bredde for en linje: gang- og sykkelveg 3 m, svingefelt 4,5 m, rampe 5,5 m, rundkjøring 6,5 m, ellers etter kategorien
  const halv = v => { const b = BREDDE[v.k] / 2; return v.g ? 1.5 : v.t === 1 ? Math.min(2.25, b) : v.t === 2 ? Math.min(2.75, b) : v.t === 3 ? Math.min(3.25, b) : b; };
  // «Vanlig» veg: oppmerking, skulder eller fortau, rekkverk, gatelys og trafikk
  const vanlig = v => !v.g && !v.t;
  const lengde = P => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };

  // Delene av linjen P som ligger i rektangelet (flisen). Flisene har en kant på 16 m til naboene; uten klipping lå vegen dobbelt der.
  function klipp(P, x0, y0, x1, y1) {
    const ut = []; let bit = [];
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1]; let t0 = 0, t1 = 1, ok = true;
      for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
        if (p === 0) { if (q < 0) { ok = false; break; } continue; }
        const r = q / p;
        if (p < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; }
      }
      if (!ok) { if (bit.length > 1) ut.push(bit); bit = []; continue; }
      if (t0 > 0) { if (bit.length > 1) ut.push(bit); bit = [[a[0] + dx * t0, a[1] + dy * t0]]; } else if (!bit.length) bit.push(a);
      bit.push(t1 < 1 ? [a[0] + dx * t1, a[1] + dy * t1] : b);
      if (t1 < 1) { if (bit.length > 1) ut.push(bit); bit = []; }
    }
    if (bit.length > 1) ut.push(bit);
    return ut.filter(B => lengde(B) > .05);
  }

  // Skjøter linjer som møtes ende mot ende (innen tol meter) til hele veger: der nøyaktig to bilvegender (eller to gangvegender) av
  // samme slag møtes, er det ikke et kryss, bare en skjøt (flisgrense, ny lenke i NVDB). linjer = [{ k, g, t, P: [[x, y]] }].
  function skjøt(linjer, tol = .8) {
    const C = 2, rut = new Map(), noder = [];
    const node = p => { const cx = Math.floor(p[0] / C), cy = Math.floor(p[1] / C);
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) for (const n of rut.get((cx + i) * 65536 + cy + j) || []) if (Math.hypot(n.x - p[0], n.y - p[1]) <= tol) return n;
      const n = { x: p[0], y: p[1], ender: [] }; noder.push(n); const k = cx * 65536 + cy; if (!rut.has(k)) rut.set(k, []); rut.get(k).push(n); return n; };
    const klasse = v => (v.g ? 'g' : 'b' + v.k) + (v.t || 0);
    linjer.forEach((v, i) => { node(v.P[0]).ender.push([i, 0]); node(v.P[v.P.length - 1]).ender.push([i, 1]); });
    const partner = linjer.map(() => [null, null]);
    for (const n of noder) {
      const bil = n.ender.filter(([i]) => !linjer[i].g), gs = n.ender.filter(([i]) => linjer[i].g);
      for (const l of [bil, gs]) { if (l.length !== 2 || l[0][0] === l[1][0] || klasse(linjer[l[0][0]]) !== klasse(linjer[l[1][0]])) continue;
        partner[l[0][0]][l[0][1]] = l[1]; partner[l[1][0]][l[1][1]] = l[0]; }
    }
    const brukt = new Uint8Array(linjer.length), ut = [];
    for (let s = 0; s < linjer.length; s++) { if (brukt[s]) continue;
      // bakover til kjedens start (eller rundt en ring tilbake til s)
      let i = s, e = 0, n = 0;
      while (partner[i][e] && n++ < linjer.length) { const [j, f] = partner[i][e]; if (j === s) break; i = j; e = 1 - f; }
      // framover fra (i, e): linje j gås fra enden f
      const P = []; let j = i, f = e;
      for (;;) { brukt[j] = 1; const Q = linjer[j].P; if (f === 0) for (let q = P.length ? 1 : 0; q < Q.length; q++) P.push(Q[q]); else for (let q = Q.length - (P.length ? 2 : 1); q >= 0; q--) P.push(Q[q]);
        const p = partner[j][1 - f]; if (!p || brukt[p[0]]) break; j = p[0]; f = p[1]; }
      ut.push({ ...linjer[i], P });
    }
    return ut;
  }

  // Jevne kurver (Chaikin to ganger: hjørnene rundes av, endene står) og punkt ca. hver «steg» meter
  function jevn(Q, steg = 2.5) {
    for (let k = 0; k < 2 && Q.length > 2; k++) { const ny = [Q[0]];
      for (let i = 0; i < Q.length - 1; i++) { const [ax, ay] = Q[i], [bx, by] = Q[i + 1]; ny.push([ax * .75 + bx * .25, ay * .75 + by * .25], [ax * .25 + bx * .75, ay * .25 + by * .75]); }
      ny.push(Q[Q.length - 1]); Q = ny; }
    const P = [Q[0]];
    for (let i = 1; i < Q.length; i++) { const [ax, ay] = P[P.length - 1], [X, Y] = Q[i], l = Math.hypot(X - ax, Y - ay); if (l < 1.2 && i < Q.length - 1) continue;
      const n = Math.floor(l / steg); for (let s = 1; s < n; s++) P.push([ax + (X - ax) * s / n, ay + (Y - ay) * s / n]); P.push([X, Y]); }
    return P;
  }

  // Færre punkter i vegnettene (14. nov: vegene var 142 000 av 640 000 trekanter ved Dombås – punkt hver 2,5 m også på rette strekk).
  // Et punkt tas bort når det ligger på den rette linjen mellom naboene som blir stående: høyst tolXY meter til siden og tolZ meter i
  // høyden, og aldri lengre biter enn «maks» meter. Punkter på en bru (p[3]) og skiftet til/fra bru beholdes. P = [[x, y, z, bru?]].
  function tynn(P, tolXY = .06, tolZ = .05, maks = 12) {
    const n = P.length; if (n < 3) return P; const ut = [P[0]]; let a = 0;
    while (a < n - 1) { let j = a + 1;
      // prøv å hoppe så langt som mulig fra a
      for (let k = a + 2; k < n; k++) { const A = P[a], B = P[k], dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy); if (l > maks || l < 1e-6) break; let ok = !A[3] && !B[3];
        for (let q = a + 1; q < k && ok; q++) { const p = P[q], t = ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / (l * l);
          if (p[3] || Math.abs((p[0] - A[0]) * dy - (p[1] - A[1]) * dx) / l > tolXY || Math.abs(A[2] + (B[2] - A[2]) * t - p[2]) > tolZ) ok = false; }
        if (!ok) break; j = k; }
      ut.push(P[j]); a = j; }
    return ut;
  }

  // Rutenett over alle vegbitene: hvor langt er det fra et punkt til de andre vegene?
  // nærmest(x, y, r, filter(li)) -> { d, li, i, f } (bit i av linje li, f = 0–1 langs biten); klaring(x, y, egen, r) = minste
  // (avstand til midtlinjen − halv bredde) for alle andre linjer enn «egen»: under 0 = punktet ligger på en annen vegbane.
  function rute(linjer, C = 12) {
    const R = new Map();
    linjer.forEach((v, li) => { for (let i = 1; i < v.P.length; i++) { const a = v.P[i - 1], b = v.P[i];
      for (let x = Math.floor(Math.min(a[0], b[0]) / C); x <= Math.floor(Math.max(a[0], b[0]) / C); x++)
        for (let y = Math.floor(Math.min(a[1], b[1]) / C); y <= Math.floor(Math.max(a[1], b[1]) / C); y++) { const k = x * 65536 + y; let l = R.get(k); if (!l) R.set(k, l = []); l.push(li, i); } } });
    const gå = (x, y, r, f) => { const n = Math.ceil(r / C), cx = Math.floor(x / C), cy = Math.floor(y / C);
      for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) { const l = R.get((cx + i) * 65536 + cy + j); if (!l) continue;
        for (let q = 0; q < l.length; q += 2) { const li = l[q], pi = l[q + 1], a = linjer[li].P[pi - 1], b = linjer[li].P[pi], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
          const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); f(Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y), li, pi, t); } } };
    return {
      nærmest(x, y, r, filter) { let best = null; gå(x, y, r, (d, li, i, f) => { if (d <= r && (!best || d < best.d) && (!filter || filter(li))) best = { d, li, i, f }; }); return best; },
      klaring(x, y, egen, r = 16) { let m = Infinity; gå(x, y, r, (d, li) => { if (li !== egen && d - linjer[li].w < m) m = d - linjer[li].w; }); return m; },
    };
  }

  // Delene av vegen P (punkt hver ~2,5 m) som ikke følger et tunnelløp. tunneler = [{ P: [[x, y]], L, bb }] (se tunnel()).
  // Et punkt er i tunnel når det ligger innen tol meter fra løpet (ikke helt i endene: portalene) og vegen går samme veg som løpet.
  // Korte treff (under 10 m: en veg som krysser over tunnelen) telles ikke, og korte hull i et treff fylles.
  // Gir [{ P, kutt: [start, slutt] }]: kutt sier om enden står i en tunnelportal.
  const tunnel = P => { const bb = [Infinity, Infinity, -Infinity, -Infinity]; for (const [x, y] of P) { if (x < bb[0]) bb[0] = x; if (x > bb[2]) bb[2] = x; if (y < bb[1]) bb[1] = y; if (y > bb[3]) bb[3] = y; } return { P, L: lengde(P), bb }; };
  function iTunnel(tunneler, x, y, dx, dy, tol) {
    for (const t of tunneler) { if (x < t.bb[0] - tol || x > t.bb[2] + tol || y < t.bb[1] - tol || y > t.bb[3] + tol) continue;
      let L = 0;
      for (let i = 1; i < t.P.length; i++) { const a = t.P[i - 1], b = t.P[i], ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey); if (!l) continue;
        const f = Math.max(0, Math.min(1, ((x - a[0]) * ex + (y - a[1]) * ey) / (l * l))), s = L + f * l;
        if (s > 1.5 && s < t.L - 1.5 && Math.hypot(a[0] + ex * f - x, a[1] + ey * f - y) <= tol && Math.abs(dx * ex + dy * ey) > .7 * l) return true;
        L += l; } }
    return false;
  }
  function utenTunnel(P, tunneler, tol = 9) {
    const n = P.length, inne = new Uint8Array(n);
    if (tunneler.length) for (let i = 0; i < n; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      if (iTunnel(tunneler, P[i][0], P[i][1], (b[0] - a[0]) / l, (b[1] - a[1]) / l, tol)) inne[i] = 1; }
    // løp(v): [fra, til) for sammenhengende punkter med verdien v
    const løp = v => { const ut = []; for (let i = 0; i < n;) { if (inne[i] !== v) { i++; continue; } let j = i; while (j < n && inne[j] === v) j++; ut.push([i, j]); i = j; } return ut; };
    const len = (i, j) => { let L = 0; for (let k = i + 1; k < j; k++) L += Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); return L; };
    for (const [i, j] of løp(0)) if (i > 0 && j < n && len(i, j) < 12) inne.fill(1, i, j);
    for (const [i, j] of løp(1)) if (len(i, j) < 10) inne.fill(0, i, j);
    return løp(0).filter(([i, j]) => j - i > 1).map(([i, j]) => ({ P: P.slice(i, j), kutt: [i > 0, j < n] }));
  }

  // Eldre fliser uten vegtype: gjett hvilke linjer som er gang- og sykkelveger (g = 2) og svingefelt i kryss (t = 1).
  // (a) Strøk: lenker som fortsetter rett fram gjennom nodene (samme kategori, knekk under 25°) hører sammen. Der to linjer ligger
  //     parallelt så tett at vegbanene overlapper, er den som hører til det korteste strøket en gang- og sykkelveg (riksvegen går
  //     gjennom hele utsnittet, gangvegen begynner og slutter). (b) Korte lenker (under 25 m) mellom to kryss er svingefelt.
  // linjer: skjøtet og jevnet (punkt hver ~2,5 m). Endrer linjene på stedet og gir antallet som ble gjettet.
  function gjett(linjer) {
    const bil = linjer.map((v, i) => i).filter(i => vanlig(linjer[i]) && 'ERFK'.includes(linjer[i].k)), L = linjer.map(v => lengde(v.P));
    const C = 2, rut = new Map(), noder = [];
    const node = p => { const cx = Math.floor(p[0] / C), cy = Math.floor(p[1] / C);
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) for (const n of rut.get((cx + i) * 65536 + cy + j) || []) if (Math.hypot(n.x - p[0], n.y - p[1]) <= 1) return n;
      const n = { ender: [], x: p[0], y: p[1] }; noder.push(n); const k = cx * 65536 + cy; if (!rut.has(k)) rut.set(k, []); rut.get(k).push(n); return n; };
    const ret = (P, e) => { const a = e ? P[P.length - 1] : P[0], b = e ? P[Math.max(0, P.length - 4)] : P[Math.min(P.length - 1, 3)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
    const nodeAv = linjer.map(() => [null, null]);
    for (const i of bil) for (const e of [0, 1]) { const P = linjer[i].P, n = node(e ? P[P.length - 1] : P[0]); n.ender.push({ i, r: ret(P, e) }); nodeAv[i][e] = n; }
    // strøk med union–find
    const far = linjer.map((v, i) => i), finn = i => { while (far[i] !== i) i = far[i] = far[far[i]]; return i; };
    for (const n of noder) { const par = [];
      for (let a = 0; a < n.ender.length; a++) for (let b = a + 1; b < n.ender.length; b++) { const A = n.ender[a], B = n.ender[b]; if (linjer[A.i].k !== linjer[B.i].k) continue;
        const c = -(A.r[0] * B.r[0] + A.r[1] * B.r[1]); if (c > .906) par.push([c, a, b]); }
      par.sort((p, q) => q[0] - p[0]); const tatt = new Set();
      for (const [, a, b] of par) { if (tatt.has(a) || tatt.has(b)) continue; tatt.add(a); tatt.add(b); far[finn(n.ender[a].i)] = finn(n.ender[b].i); } }
    const SL = new Map(); for (const i of bil) { const s = finn(i); SL.set(s, (SL.get(s) || 0) + L[i]); }
    const ru = rute(bil.map(i => linjer[i])), bilNr = new Map(bil.map((i, q) => [q, i]));
    let gjettet = 0;
    for (const i of bil) { const v = linjer[i], P = v.P, w = halv(v), s = finn(i); if (L[i] < 8) continue; let n = 0, tot = 0;
      for (let q = 1; q < P.length - 1; q++) { tot++; const dx = P[q + 1][0] - P[q - 1][0], dy = P[q + 1][1] - P[q - 1][1], dl = Math.hypot(dx, dy) || 1;
        const b = ru.nærmest(P[q][0], P[q][1], w + 5, li => { const j = bilNr.get(li); return j !== i && finn(j) !== s && SL.get(finn(j)) > SL.get(s); });
        if (!b) continue; const o = linjer[bilNr.get(b.li)], a = o.P[b.i - 1], c = o.P[b.i], ol = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
        if (b.d < w + halv(o) + 1 && Math.abs(dx * (c[0] - a[0]) + dy * (c[1] - a[1])) > .85 * dl * ol) n++; }
      if (tot && n / tot > .5) { v.g = 2; gjettet++; } }
    // svingefelt: korte lenker mellom to kryss (minst tre bilvegender i hver ende, gangvegene ikke medregnet)
    const armer = n => n ? n.ender.filter(e => !linjer[e.i].g).length : 0;
    for (const i of bil) { const v = linjer[i]; if (v.g || L[i] >= 25) continue; if (armer(nodeAv[i][0]) >= 3 && armer(nodeAv[i][1]) >= 3) { v.t = 1; gjettet++; } }
    // rundkjøringer kjennes igjen på formen (se rundkjøringer())
    for (const rk of rundkjøringer(linjer)) for (const i of rk.linjer) if (linjer[i].t !== 3) { linjer[i].t = 3; linjer[i].g = 0; gjettet++; }
    return gjettet;
  }

  // ---------- rundkjøringer og kanaliserte veger ----------
  // Sirkelen som passer best til punktene (minste kvadrater, Kåsa): { x, y, r, avvik } – avvik = største avstand fra et punkt til sirkelen.
  function sirkel(P) {
    const n = P.length; if (n < 3) return null; let mx = 0, my = 0; for (const p of P) { mx += p[0]; my += p[1]; } mx /= n; my /= n;
    let suu = 0, suv = 0, svv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
    for (const p of P) { const u = p[0] - mx, v = p[1] - my; suu += u * u; suv += u * v; svv += v * v; suuu += u * u * u; svvv += v * v * v; suvv += u * v * v; svuu += v * u * u; }
    const det = suu * svv - suv * suv; if (Math.abs(det) < 1e-9) return null;
    const a = (suuu + suvv) / 2, b = (svvv + svuu) / 2, uc = (a * svv - b * suv) / det, vc = (b * suu - a * suv) / det, r = Math.sqrt(uc * uc + vc * vc + (suu + svv) / n);
    let avvik = 0; for (const p of P) avvik = Math.max(avvik, Math.abs(Math.hypot(p[0] - mx - uc, p[1] - my - vc) - r));
    return { x: mx + uc, y: my + vc, r, avvik };
  }
  // Rundkjøringene blant bilvegene (linjer: skjøtet og jevnet). Er noen linjer merket som rundkjøring i dataene (t = 3), brukes bare
  // de; ellers kjennes rundkjøringene igjen på formen: buer med radius 5–45 m rundt samme midtpunkt som til sammen dekker minst
  // 300° av sirkelen (14. nov: i hele Norge, der dataene ikke har vegtype, fikk rundkjøringene fortau og lykter inne i ringen og
  // gangfelt tvers over). Gir [{ x, y, r (midtlinjens radius), w (halv bredde), k, linjer: [nummer] }].
  function rundkjøringer(linjer) {
    const merket = linjer.some(v => v.t === 3), buer = [];
    linjer.forEach((v, i) => { if (v.g || (merket ? v.t !== 3 : v.t === 2)) return; const L = lengde(v.P); if (!merket && (L < 6 || L > 290)) return;
      const c = sirkel(v.P); if (!c || c.r < 5 || c.r > 45 || c.avvik > Math.max(1.2, c.r * .12)) return;
      // en bue må svinge tydelig (minst 25°): en slak kurve i en vanlig veg er ikke en del av en rundkjøring
      if (!merket && L / c.r < .45) return; buer.push({ i, c, L }); });
    const grupper = [];
    for (const b of buer) { let g = grupper.find(q => Math.hypot(q.x - b.c.x, q.y - b.c.y) < Math.max(3, q.r * .3) && Math.abs(q.r - b.c.r) < Math.max(2.5, q.r * .3));
      if (!g) grupper.push(g = { x: b.c.x, y: b.c.y, r: b.c.r, L: 0, buer: [] });
      // midtpunkt og radius: snitt vektet med lengden
      g.x = (g.x * g.L + b.c.x * b.L) / (g.L + b.L); g.y = (g.y * g.L + b.c.y * b.L) / (g.L + b.L); g.r = (g.r * g.L + b.c.r * b.L) / (g.L + b.L); g.L += b.L; g.buer.push(b); }
    const ut = [];
    for (const g of grupper) {
      // dekning: 24 sektorer rundt midtpunktet
      const sett = new Set(); for (const b of g.buer) for (const p of linjer[b.i].P) sett.add(Math.floor((Math.atan2(p[1] - g.y, p[0] - g.x) + Math.PI) / (2 * Math.PI) * 24) % 24);
      if (sett.size < 20 || g.L > 2 * Math.PI * g.r * 1.35) continue;
      const v0 = linjer[g.buer[0].i]; ut.push({ x: g.x, y: g.y, r: g.r, w: Math.min(3.25, BREDDE[v0.k] / 2), k: v0.k, linjer: g.buer.map(b => b.i) });
    }
    return ut;
  }
  // Kanalisert veg (t = 1) er i NVDB både korte svingefelt rundt trafikkøyer og lange, gjennomgående vegstykker i store kryss. De
  // lange uten en parallell tvilling (det andre kjørefeltet) er vanlig tofelts veg og skal ha full bredde og oppmerking (14. nov:
  // E6 gjennom krysset på Dovre var en smal, svart stripe uten linjer i 200 m). Endrer linjene på stedet, gir antallet som ble vanlige.
  function kanal(linjer) {
    const bil = linjer.map((v, i) => i).filter(i => !linjer[i].g), ru = rute(bil.map(i => linjer[i])); let n = 0;
    // andelen av linjen som har et parallelt kjørefelt av samme vegkategori ved siden av seg
    const tvilling = (v, q) => { let par = 0, tot = 0;
      for (let j = 1; j < v.P.length - 1; j++) { tot++; const dx = v.P[j + 1][0] - v.P[j - 1][0], dy = v.P[j + 1][1] - v.P[j - 1][1], dl = Math.hypot(dx, dy) || 1;
        const b = ru.nærmest(v.P[j][0], v.P[j][1], 16, li => li !== q && linjer[bil[li]].k === v.k); if (!b) continue;
        const o = linjer[bil[b.li]], a = o.P[b.i - 1], c = o.P[b.i], ol = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
        // tvillingen ligger ved siden av (ikke rett foran eller bak, som fortsettelsen av samme veg)
        const qx = a[0] + (c[0] - a[0]) * b.f - v.P[j][0], qy = a[1] + (c[1] - a[1]) * b.f - v.P[j][1];
        if (b.d > 1.5 && Math.abs(qx * dx + qy * dy) < .5 * b.d * dl && Math.abs(dx * (c[0] - a[0]) + dy * (c[1] - a[1])) > .85 * dl * ol) par++; }
      return tot ? par / tot : 0; };
    const alene = new Map(); bil.forEach((i, q) => { const v = linjer[i]; if (v.t === 1) alene.set(i, tvilling(v, q) < .4); });
    // 1) lange stykker uten tvilling
    for (const [i, a] of alene) if (a && lengde(linjer[i].P) >= 60) { linjer[i].t = 0; n++; }
    // 2) korte stykker uten tvilling som i begge ender fortsetter i en vanlig veg av samme kategori (et kort mellomstykke i krysset)
    for (let runde = 0; runde < 3; runde++) { let endret = 0;
      const ender = []; for (const i of bil) { const v = linjer[i]; if (!v.t) ender.push([v.P[0], v.k], [v.P[v.P.length - 1], v.k]); }
      const vanligVed = (p, k) => ender.some(([e, ek]) => ek === k && Math.hypot(e[0] - p[0], e[1] - p[1]) < 1.5);
      for (const [i, a] of alene) { const v = linjer[i]; if (!a || v.t !== 1 || lengde(v.P) < 8) continue;
        if (vanligVed(v.P[0], v.k) && vanligVed(v.P[v.P.length - 1], v.k)) { v.t = 0; n++; endret++; } }
      if (!endret) break; }
    return n;
  }

  // Vegbanens høyde langs linjen: flat på tvers og aldri under bakken – den høyeste av fem punkter på tvers (z(x, y) = terrenget slik
  // det tegnes), glattet langs vegen. Feiljakten: «vegen er halvt begravd i skråninger» (bakken på oversiden stakk opp gjennom asfalten).
  function høyder(P, w, z) {
    const n = P.length, rå = new Float64Array(n), mx = new Float64Array(n), ut = new Float64Array(n);
    for (let i = 0; i < n; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
      let h = -Infinity; for (const o of [-1, -.5, 0, .5, 1]) h = Math.max(h, z(P[i][0] + nx * w * o, P[i][1] + ny * w * o)); rå[i] = h; }
    for (let i = 0; i < n; i++) { let h = -Infinity; for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, i + 2); k++) h = Math.max(h, rå[k]); mx[i] = h; }
    for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, i + 2); k++) { s += mx[k]; c++; } ut[i] = s / c; }
    return ut;
  }

  // ---------- vegkryss ----------
  // Kryss = minst tre vegarmer møtes: ender som ligger innen 3 m av hverandre, eller en ende som treffer midt på en annen veg (T-kryss).
  // To ender alene er bare en skjøt og ikke et kryss. Hvert kryss får armene sine med retning ut fra krysset.
  // veger = [{ k, t, by, P: [[x, y, z]] }] (bare bilveger: gang- og sykkelvegene er ikke med).
  function finnKryss(veger) {
    const C = 8, rut = new Map(), nk = (x, y) => Math.floor(x / C) + ',' + Math.floor(y / C), noder = [];
    const nærNode = (x, y, r) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) for (const n of rut.get((Math.floor(x / C) + i) + ',' + (Math.floor(y / C) + j)) || []) if (Math.hypot(n.x - x, n.y - y) < r) return n; return null; };
    veger.forEach((v, li) => { if (v.P.length < 2) return;
      for (const s of [0, 1]) { const p = s ? v.P[v.P.length - 1] : v.P[0]; let n = nærNode(p[0], p[1], 3);
        if (!n) { n = { x: p[0], y: p[1], z: p[2], armer: [] }; noder.push(n); const k = nk(p[0], p[1]); if (!rut.has(k)) rut.set(k, []); rut.get(k).push(n); }
        n.armer.push({ li, j: s ? v.P.length - 1 : 0, r: s ? -1 : 1 }); } });
    // T-kryss: en vegende som ligger på en annen veg (ikke nær den vegens ender)
    const pr = new Map(); veger.forEach((v, li) => v.P.forEach((p, j) => { const k = nk(p[0], p[1]); if (!pr.has(k)) pr.set(k, []); pr.get(k).push([li, j]); }));
    for (const n of noder) {
      const har = new Set(n.armer.map(a => a.li)); let best = null;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) for (const [li, pj] of pr.get((Math.floor(n.x / C) + i) + ',' + (Math.floor(n.y / C) + j)) || []) {
        if (har.has(li)) continue; const v = veger[li], p = v.P[pj], d = Math.hypot(p[0] - n.x, p[1] - n.y);
        if (d < halv(v) + 1.5 && Math.abs(p[2] - n.z) < 2 && pj > 1 && pj < v.P.length - 2 && (!best || d < best.d)) best = { li, pj, d }; }
      if (best) n.armer.push({ li: best.li, j: best.pj, r: 1 }, { li: best.li, j: best.pj, r: -1 });
    }
    const ut = [];
    for (const n of noder) { if (n.armer.length < 3) continue;
      const maks = Math.max(...n.armer.map(a => halv(veger[a.li]))), d = maks + 1.4; let z = -1e9;
      const armer = n.armer.map(a => { const v = veger[a.li], P = v.P; let j = a.j, L = 0; z = Math.max(z, P[j][2]);
        while (j + a.r >= 0 && j + a.r < P.length && L < d) { L += Math.hypot(P[j + a.r][0] - P[j][0], P[j + a.r][1] - P[j][1]); j += a.r; }
        const p = P[j], dx = p[0] - n.x, dy = p[1] - n.y, l = Math.hypot(dx, dy) || 1;
        // li, j0 og j1: biten av linjen fra krysset og ut (kryssflaten følger vegen der)
        return { x: p[0], y: p[1], z: p[2], dx: dx / l, dy: dy / l, w: halv(v), k: v.k, by: v.by, t: v.t || 0, L: Math.max(L, .5), li: a.li, j0: a.j, j1: j }; });
      // parallelle veger (to kjørebaner) er ikke kryss: minst to armer må stå på skrå (25–155°)
      if (!armer.some(a => armer.some(b => Math.abs(a.dx * b.dy - a.dy * b.dx) > .42))) continue;
      ut.push({ x: n.x, y: n.y, z, d, armer, by: armer.some(a => a.by) });
    }
    const kr = new Map(); for (const n of ut) { const k = nk(n.x, n.y); if (!kr.has(k)) kr.set(k, []); kr.get(k).push(n); }
    // nær(x, y, ekstra, unntatt): ligger punktet innenfor et kryss (+ ekstra meter)? «unntatt» er et kryss som ikke teller.
    ut.nær = (x, y, ekstra, unntatt) => { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) for (const n of kr.get((Math.floor(x / C) + i) + ',' + (Math.floor(y / C) + j)) || []) if (n !== unntatt && Math.hypot(n.x - x, n.y - y) < n.d + ekstra) return true; return false; };
    return ut;
  }
  // Delene av linjen som ikke ligger i et kryss
  function utenomKryss(P, kryss, ekstra) { const biter = []; let b = [];
    for (const p of P) { if (kryss.nær(p[0], p[1], ekstra)) { if (b.length > 1) biter.push(b); b = []; } else b.push(p); }
    if (b.length > 1) biter.push(b); return biter; }

  // Kryssflaten (asfalt uten oppmerking): en stump langs hver arm – armens egen bredde, fra krysset og d meter ut, langs vegens egne
  // punkter og i vegens høyde – og et avskåret hjørne (trekant) mellom to naboarmer som står 40–140° på hverandre.
  // Før var flaten det konvekse skallet rundt alle armene: store svarte flak ut over gresset der veger møtes i spiss vinkel.
  // veger: som i finnKryss. Legger trekanter i ut = { pos, uv, idx }.
  function kryssFlate(n, veger, ut) {
    for (const a of n.armer) { if (a.t === 3) continue;   // ringen i en rundkjøring har sin egen vegbane med kantlinjer
      const P = veger[a.li].P, w = a.w + .12, r = a.j1 >= a.j0 ? 1 : -1, n0 = ut.pos.length / 3; let rader = 0;
      for (let j = a.j0; ; j += r) { const p = P[j], q = P[Math.min(P.length - 1, j + 1)], o = P[Math.max(0, j - 1)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
        ut.pos.push(p[0] + nx * w, p[1] + ny * w, p[2] + .03, p[0] - nx * w, p[1] - ny * w, p[2] + .03); ut.uv.push((p[0] + nx * w) / 12, (p[1] + ny * w) / 12, (p[0] - nx * w) / 12, (p[1] - ny * w) / 12); rader++;
        if (j === a.j1) break; }
      for (let i = 0; i < rader - 1; i++) { const a0 = n0 + i * 2; ut.idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3); } }
    // hjørnene: armene sortert rundt krysset; mellom to naboer skjæres hjørnet av 2,5 m ut langs hver kant
    const A = n.armer.map(a => ({ ...a, v: Math.atan2(a.dy, a.dx) })).sort((p, q) => p.v - q.v);
    for (let i = 0; i < A.length; i++) { const a = A[i], b = A[(i + 1) % A.length]; if (a === b) continue;
      let dv = b.v - a.v; if (dv <= 0) dv += 2 * Math.PI; if (dv < .7 || dv > 2.45) continue;
      // a sin venstre kant (mot b) og b sin høyre kant (mot a): skjæringspunktet er det indre hjørnet
      const ax = n.x - a.dy * a.w, ay = n.y + a.dx * a.w, bx = n.x + b.dy * b.w, by = n.y - b.dx * b.w, det = a.dx * b.dy - a.dy * b.dx; if (Math.abs(det) < .3) continue;
      const t = ((bx - ax) * b.dy - (by - ay) * b.dx) / det, s = ((bx - ax) * a.dy - (by - ay) * a.dx) / det; if (t < 0 || s < 0 || t > n.d + 3 || s > n.d + 3) continue;
      const qx = ax + a.dx * t, qy = ay + a.dy * t, ra = Math.min(2.5, Math.max(0, a.L - t)), rb = Math.min(2.5, Math.max(0, b.L - s)); if (ra < .5 || rb < .5) continue;
      const n0 = ut.pos.length / 3, z = n.z + .03;
      ut.pos.push(qx, qy, z, qx + a.dx * ra, qy + a.dy * ra, z, qx + b.dx * rb, qy + b.dy * rb, z);
      ut.uv.push(qx / 12, qy / 12, (qx + a.dx * ra) / 12, (qy + a.dy * ra) / 12, (qx + b.dx * rb) / 12, (qy + b.dy * rb) / 12); ut.idx.push(n0, n0 + 1, n0 + 2); }
  }

  // Fotgjengerfelt: hvite striper (0,5 m, hver meter) på tvers av gangretningen. Fra (x, y) i retningen (dx, dy) over vegen, «lang» meter
  // langt og «bred» meter bredt, i høyden z. Legger firkanter i ut = { pos, idx }.
  function striper(x, y, dx, dy, lang, bred, z, ut) {
    const nx = -dy, ny = dx, h = bred / 2;
    for (let s = .25; s + .5 <= lang + 1e-6; s += 1) { const n0 = ut.pos.length / 3;
      for (const [a, b] of [[s, -h], [s + .5, -h], [s + .5, h], [s, h]]) ut.pos.push(x + dx * a + nx * b, y + dy * a + ny * b, z);
      ut.idx.push(n0, n0 + 1, n0 + 2, n0, n0 + 2, n0 + 3); }
  }
  // Fotgjengerfelt i kryssene når dataene ikke har gangfeltene: på armene av vanlig R/F/K-veg i tettstedene, like utenfor krysset,
  // aldri inne i et annet kryss og aldri nærmere et annet felt enn 30 m (før: fem–seks felt side om side der mange lenker møttes).
  // Gir [{ x, y, z, dx, dy, w }] (midt i vegen, (dx, dy) langs vegen ut fra krysset).
  function gangfelt(kryss) {
    const ut = [];
    for (const n of kryss) { if (!n.by) continue; let antall = 0;
      for (const a of n.armer) { if (antall >= 2 || a.t || !'RFK'.includes(a.k) || a.L < n.d - .5) continue;
        const x = a.x + a.dx * 2.5, y = a.y + a.dy * 2.5;
        if (kryss.nær(x, y, 2, n) || ut.some(f => Math.hypot(f.x - x, f.y - y) < 30)) continue;
        ut.push({ x, y, z: a.z, dx: a.dx, dy: a.dy, w: a.w }); antall++; } }
    return ut;
  }

  // Gatelys langs de vanlige bilvegene (E, R, F, K) i tettstedene, hver 38. meter, helst på venstre side, med armen inn over vegen.
  // Aldri i en vegbane eller på en gang- og sykkelveg (klaring under 0,6 m), aldri i et kryss, aldri to nærmere hverandre enn 20 m.
  // o: { ru (rute over alle linjene), nr(v) = linjens nummer i ru, kryss, ok(x, y) }. Gir [x, y, retning, ...].
  function lykter(veger, o) {
    const ut = [], satt = new Set();
    for (const v of veger) { if (!v.by || !vanlig(v) || !'ERFK'.includes(v.k)) continue; const avst = v.k === 'K' ? 4.6 : 6.2, li = o.nr(v); let L = 0, neste = 19;
      for (let i = 1; i < v.P.length; i++) { const a = v.P[i - 1], b = v.P[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!l) continue;
        for (; neste < L + l; neste += 38) { const f = (neste - L) / l, X = a[0] + (b[0] - a[0]) * f, Y = a[1] + (b[1] - a[1]) * f, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
          for (const sd of [1, -1]) { const x = X + nx * avst * sd, y = Y + ny * avst * sd, k = Math.round(x / 20) + ',' + Math.round(y / 20);
            if (satt.has(k) || (o.kryss && o.kryss.nær(x, y, 1)) || o.ru.klaring(x, y, li) < .6 || (o.ok && !o.ok(x, y))) continue;
            satt.add(k); ut.push(x, y, Math.atan2(-ny * sd, -nx * sd)); break; } }
        L += l; } }
    return ut;
  }

  const API = { BREDDE, halv, vanlig, lengde, klipp, skjøt, jevn, tynn, rute, tunnel, utenTunnel, gjett, sirkel, rundkjøringer, kanal, høyder, finnKryss, utenomKryss, kryssFlate, striper, gangfelt, lykter };
  if (typeof module !== 'undefined') module.exports = API; else rot.Veg = API;
})(typeof window !== 'undefined' ? window : globalThis);
