'use strict';
// Gatemøbler (brukeren 12. nov: «fortsett å forbedre»): hvor benker, søppelkasser, sykkelstativ, busskur, holdeplasskilt og
// postkassestativ står i tettstedene. Reglene her er uten DOM (test: node pipeline/fliser/test_gate.js); modellene lages i spill/gate3d.js.
//
// Inn: vegene fra liv3d.js (u.veger: { k, by, P: [[x, y, z]] } i meter fra utsnittets midte, z = vegbanen), kryssene (Liv3d.finnKryss),
// byggene ({ x, y, t, k, A } = midtpunkt, OSM-type, kjede, grunnflate) og ok(x, y) = ikke i/inntil hus, vann, bekk, tre eller lyktestolpe.
// Ut: per slag en liste [x, y, z, retning] (4 tall per ting; postkasser 6: + antall kasser og fargenummer). Retningen dreier modellen
// slik at modellens +y peker mot vegen (benken vender ryggen til husene, busskuret har den åpne siden mot vegen).
// Alt er fast: tilfeldigheten er en hash av kartkoordinatene (cx/cy + x/y), så samme sted gir samme ting.
(function (rot) {
  const BREDDE = { E: 8, R: 7.5, F: 6.5, K: 5.5, P: 4, S: 3.5 };
  // fortauet (liv3d.js) går fra vegkanten (w) til w + 2 m og ligger 15 cm over vegbanen
  const FORTAU = 2, KANT = .15;
  // hvor mye plass hver ting tar (radius, m) – ingen ting står oppå hverandre
  const RAD = { benk: 1.1, søppel: .5, sykkel: 1.5, skur: 2.1, skilt: .45, postkasse: .7 };
  const SLAG = ['benk', 'søppel', 'sykkel', 'skur', 'skilt', 'postkasse'];
  const TAK = { pc: 1200, mobil: 400 };
  const BUSS_AVSTAND = 420;

  function hash(a, b, s = 0) {
    let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(s + 1, 83492791)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  // retningen som dreier modellens +y mot punktet (tx, ty) (enhetsvektor mot vegen)
  const mot = (tx, ty) => Math.atan2(-tx, ty);

  // Rutenett med vegbitene: hvor langt er det til nærmeste kjørebane?
  function vegRute(veger) {
    const C = 12, rute = new Map();
    veger.forEach(v => { for (let i = 1; i < v.P.length; i++) { const a = v.P[i - 1], b = v.P[i];
      for (let x = Math.floor(Math.min(a[0], b[0]) / C); x <= Math.floor(Math.max(a[0], b[0]) / C); x++)
        for (let y = Math.floor(Math.min(a[1], b[1]) / C); y <= Math.floor(Math.max(a[1], b[1]) / C); y++) { const k = x + ',' + y; if (!rute.has(k)) rute.set(k, []); rute.get(k).push([a, b, v]); } } });
    // nær(x, y, ekstra): ligger punktet på en kjørebane (vegbredde/2 + ekstra)? fortau(x, y): høyden på fortauet der, ellers null
    const bit = (x, y, f) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) for (const [a, b, v] of rute.get((Math.floor(x / C) + i) + ',' + (Math.floor(y / C) + j)) || []) {
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
      const d = Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y); if (f(d, v, a[2] + (b[2] - a[2]) * t)) return true; } return false; };
    return {
      nær: (x, y, ekstra) => bit(x, y, (d, v) => d < BREDDE[v.k] / 2 + ekstra),
      fortau: (x, y) => { let z = null; bit(x, y, (d, v, zz) => { if (v.by && 'RFK'.includes(v.k) && d > BREDDE[v.k] / 2 - .1 && d < BREDDE[v.k] / 2 + FORTAU + .1) { z = zz + KANT; return true; } return false; }); return z; }
    };
  }
  // Punkt s meter langs linjen: [x, y, z, ux, uy] (ux, uy = retningen)
  function langs(v, D, s) {
    let i = 1; while (i < D.length - 1 && D[i] < s) i++;
    const a = v.P[i - 1], b = v.P[i], l = D[i] - D[i - 1] || 1, f = Math.max(0, Math.min(1, (s - D[i - 1]) / l));
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, (b[0] - a[0]) / l, (b[1] - a[1]) / l];
  }
  const lengder = v => { const D = [0]; for (let i = 1; i < v.P.length; i++) D.push(D[i - 1] + Math.hypot(v.P[i][0] - v.P[i - 1][0], v.P[i][1] - v.P[i - 1][1])); return D; };

  function plasser(veger, o) {
    const ut = {}; for (const s of SLAG) ut[s] = [];
    if (!veger || !veger.length) return ut;
    const cx = o.cx || 0, cy = o.cy || 0, S = o.S || 1e9, tak = o.tak || TAK.pc, kryss = o.kryss || [], ok = o.ok || (() => true), bakke = o.bakke || (() => 0);
    const H = (x, y, s) => hash(Math.round(x + cx), Math.round(y + cy), s);
    // samme, men avrundet til et rutenett i kartet (steg meter): punkter langs en veg som ligger nesten likt, får samme tall
    const Hq = (x, y, steg, s) => hash(Math.round((x + cx) / steg), Math.round((y + cy) / steg), s);
    const kryssNær = (x, y, e) => !!(kryss.nær && kryss.nær(x, y, e));
    const VR = vegRute(veger);
    // høyden der tingen står: på fortauet (vegbanen + 15 cm) eller på bakken; null når fortauet og bakken ikke stemmer (bru, skjæring)
    const høyde = (x, y) => { const g = bakke(x, y), f = VR.fortau(x, y); if (f === null) return g; return Math.abs(f - g) < .45 ? f : null; };
    // plasserte ting i et rutenett på 6 m: ingen ting oppå hverandre, og samme slag ikke for tett
    const satt = new Map(), C = 6;
    const ledig = (x, y, r, slag, min) => { const n = Math.ceil(Math.max(r + 2.2, min || 0) / C);
      for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) for (const p of satt.get((Math.floor(x / C) + i) + ',' + (Math.floor(y / C) + j)) || []) {
        const d = Math.hypot(p.x - x, p.y - y); if (d < r + RAD[p.slag] || (min && p.slag === slag && d < min)) return false; } return true; };
    const legg = (slag, x, y, z, ret, ...ekstra) => { const k = Math.floor(x / C) + ',' + Math.floor(y / C); if (!satt.has(k)) satt.set(k, []);
      satt.get(k).push({ x, y, slag }); ut[slag].push(x, y, z, ret, ...ekstra); };
    // kan en ting med radius r stå her? (innenfor utsnittet, ikke på en kjørebane, ikke i hus/vann/tre, ikke i et kryss, flatt nok)
    const inne = (x, y) => Math.abs(x) < S - 12 && Math.abs(y) < S - 12;
    const prøv = (slag, x, y, ret, min, ...ekstra) => {
      const r = RAD[slag]; if (!inne(x, y) || VR.nær(x, y, .25) || kryssNær(x, y, 1.5) || !ledig(x, y, r, slag, min)) return false;
      // fotavtrykket: midten og fire punkter rundt (i retningen langs og på tvers)
      const c = Math.cos(ret), s = Math.sin(ret), a = r * .9, b = Math.min(r, .7) * .9, P = [[0, 0], [a, 0], [-a, 0], [0, b], [0, -b]];
      let z = null;
      for (const [lx, ly] of P) { const px = x + lx * c - ly * s, py = y + lx * s + ly * c; if (!ok(px, py) || VR.nær(px, py, .1)) return false;
        const h = høyde(px, py); if (h === null || (z !== null && Math.abs(h - z) > .5)) return false; if (z === null) z = h; }
      legg(slag, x, y, z, ret, ...ekstra); return true;
    };
    // et sted på fortauet / vegkanten: o meter fra midtlinjen på side sd (+1 venstre, −1 høyre), modellen vender mot vegen
    const ved = (p, sd, off) => { const nx = -p[4] * sd, ny = p[3] * sd; return [p[0] + nx * off, p[1] + ny * off, mot(-nx, -ny)]; };
    const linjer = veger.map(v => ({ v, D: lengder(v) })).filter(l => l.D[l.D.length - 1] > 4);

    // 1) busskur langs E/R/F i tettstedene, minst 420 m mellom holdeplassene (kandidater hver 20. m, valgt etter hash så det er fast)
    const kand = [];
    for (const { v, D } of linjer) { if (!v.by || !'ERF'.includes(v.k)) continue; const L = D[D.length - 1];
      for (let s = 10; s < L - 6; s += 20) { const p = langs(v, D, s); kand.push({ v, D, s, p, h: Hq(p[0], p[1], 20, 3) }); } }
    kand.sort((a, b) => a.h - b.h);
    const stopp = [];
    for (const k of kand) {
      const { v, p } = k, w = BREDDE[v.k] / 2; if (!inne(p[0], p[1]) || kryssNær(p[0], p[1], 18) || stopp.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < BUSS_AVSTAND)) continue;
      // E-veg i tettsted har skulder og ikke fortau: skuret står bak skulderen på bakken
      const off = v.k === 'E' ? w + 2.1 : w + 1.35, s0 = k.h * 1e4 % 1 < .5 ? 1 : -1;
      for (const sd of [s0, -s0]) {
        const [x, y, ret] = ved(k.p, sd, off); if (!prøv('skur', x, y, ret)) continue;
        // holdeplasskiltet ved kantsteinen foran skuret, og et på andre siden av vegen (holdeplass i begge retninger)
        const p2 = langs(v, k.D, Math.min(k.D[k.D.length - 1], k.s + 3.2)), [ax, ay, ar] = ved(p2, sd, w + (v.k === 'E' ? 1 : .6)); prøv('skilt', ax, ay, ar + Math.PI / 2);
        const [bx, by, br] = ved(p2, -sd, w + (v.k === 'E' ? 1 : .6)); prøv('skilt', bx, by, br + Math.PI / 2);
        stopp.push(p); break;
      }
    }
    // 2) butikker og skoler: sykkelstativ inntil veggen mot vegen, med søppelkasse og benk ved siden av
    for (const g of o.bygg || []) {
      const butikk = g.t === 7 || (g.k && g.t !== 0 && g.t !== 10), skole = g.t === 9; if (!butikk && !skole) continue;
      // nærmeste vegpunkt innen 60 m
      let best = null; for (const { v, D } of linjer) { if (v.k === 'S') continue; for (const q of v.P) { const d = Math.hypot(q[0] - g.x, q[1] - g.y); if (d < 60 && (!best || d < best.d)) best = { d, q }; } }
      if (!best) continue;
      const tx = (best.q[0] - g.x) / (best.d || 1), ty = (best.q[1] - g.y) / (best.d || 1);
      // gå fra midten mot vegen til det er fritt (utenfor huset + 2 m), og et halvt steg til
      let t = 0; while (t < best.d && !ok(g.x + tx * t, g.y + ty * t)) t += .5;
      if (t >= best.d - 4) continue; t += .6;
      const x0 = g.x + tx * t, y0 = g.y + ty * t, ret = mot(tx, ty), ex = -ty, ey = tx, n = skole ? 2 : 1;
      for (let j = 0; j < n; j++) prøv('sykkel', x0 + ex * (j - (n - 1) / 2) * 3.2, y0 + ey * (j - (n - 1) / 2) * 3.2, ret);
      const sd = H(g.x, g.y, 5) < .5 ? 1 : -1;
      prøv('søppel', x0 + ex * sd * (n * 1.6 + 1.2), y0 + ey * sd * (n * 1.6 + 1.2), ret, 6);
      if (butikk && H(g.x, g.y, 6) < .7) prøv('benk', x0 - ex * sd * (n * 1.6 + 1.8), y0 - ey * sd * (n * 1.6 + 1.8), ret, 8);
    }
    // 3) ved fotgjengerfeltene i kryssene i tettstedene: søppelkasse på hjørnet, av og til en benk litt lenger ut
    for (const n of kryss) { if (!n.by) continue;
      for (const a of n.armer) { if (!'RFK'.includes(a.k) || a.L < n.d - .5) continue;
        const h = H(a.x, a.y, 7), sd = h * 1e3 % 1 < .5 ? 1 : -1, nx = -a.dy * sd, ny = a.dx * sd, ret = mot(-nx, -ny), off = a.w + 1.55;
        if (h < .45) prøv('søppel', a.x + a.dx * 6 + nx * off, a.y + a.dy * 6 + ny * off, ret, 20);
        else if (h < .7) prøv('benk', a.x + a.dx * 10 + nx * (a.w + 1.45), a.y + a.dy * 10 + ny * (a.w + 1.45), ret, 30);
      } }
    // 4) langs fortauene ellers: en benk eller søppelkasse her og der (ikke tettere enn 40 / 35 m for samme slag)
    for (const { v, D } of linjer) { if (!v.by || !'RFK'.includes(v.k)) continue; const L = D[D.length - 1], w = BREDDE[v.k] / 2;
      for (let s = 7; s < L - 4; s += 15) { const p = langs(v, D, s), h = Hq(p[0], p[1], 15, 11);
        if (h > .22) continue; const sd = h * 1e3 % 1 < .5 ? 1 : -1;
        if (h < .09) { const [x, y, r] = ved(p, sd, w + 1.45); prøv('benk', x, y, r, 40); }
        else { const [x, y, r] = ved(p, sd, w + 1.6); prøv('søppel', x, y, r, 35); } } }
    // 5) postkassestativ ved innkjørselen til en del eneboliger langs K/P-veger (1–3 kasser), ikke nærmere hverandre enn 12 m
    for (const g of o.bygg || []) {
      if (g.t !== 0 || g.A > 400 || H(g.x, g.y, 13) > .45) continue;
      let best = null; for (const { v, D } of linjer) { if (!'KP'.includes(v.k)) continue; for (let i = 0; i < v.P.length; i++) { const q = v.P[i], d = Math.hypot(q[0] - g.x, q[1] - g.y); if (d < 35 && (!best || d < best.d)) best = { d, v, D, i }; } }
      if (!best) continue;
      const { v, D, i } = best, p = langs(v, D, D[i]), w = BREDDE[v.k] / 2, sd = ((g.x - p[0]) * -p[4] + (g.y - p[1]) * p[3]) > 0 ? 1 : -1;
      const off = v.by && v.k === 'K' ? w + 1.7 : w + (v.k === 'K' ? 1.2 : .95), [x, y, r] = ved(p, sd, off), hn = H(g.x, g.y, 14);
      prøv('postkasse', x, y, r, 12, 1 + Math.floor(hn * 3), Math.floor(H(g.x, g.y, 15) * 6));
    }
    // taket: busskur og skilt beholdes, resten nærmest midten først
    let n = 0; for (const s of SLAG) n += ut[s].length / (s === 'postkasse' ? 6 : 4);
    if (n > tak) {
      const alle = [], fast = (ut.skur.length + ut.skilt.length) / 4;
      for (const s of SLAG) { if (s === 'skur' || s === 'skilt') continue; const st = s === 'postkasse' ? 6 : 4; for (let q = 0; q < ut[s].length; q += st) alle.push([Math.hypot(ut[s][q], ut[s][q + 1]), s, ut[s].slice(q, q + st)]); }
      alle.sort((a, b) => a[0] - b[0]);
      for (const s of SLAG) if (s !== 'skur' && s !== 'skilt') ut[s] = [];
      for (const [, s, d] of alle.slice(0, Math.max(0, tak - fast))) ut[s].push(...d);
    }
    return ut;
  }
  // (x, y, z) per slag – for vakten (spill/vakt3d.js) og testene
  function punkter(g) {
    const ut = {}; if (!g) return ut;
    for (const s of SLAG) { const st = s === 'postkasse' ? 6 : 4, a = g[s] || [], p = []; for (let q = 0; q < a.length; q += st) p.push(a[q], a[q + 1], a[q + 2]); ut[s] = p; }
    return ut;
  }
  const Gate = { plasser, punkter, hash, BREDDE, RAD, SLAG, TAK, FORTAU, KANT, BUSS_AVSTAND, vegRute };
  if (typeof module !== 'undefined' && module.exports) module.exports = Gate; else rot.Gate = Gate;
})(typeof window !== 'undefined' ? window : this);
