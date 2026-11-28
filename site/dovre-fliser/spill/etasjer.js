/* ETASJENE I BRUK (fase B2 i docs/plan-selskap-okonomi.md, kapittel 5.3, 5.8 og 5.9; 28. nov).
 * Byggemodellen (spill/bygning.js) har etasjer, trapper, loft og kjeller. Her er reglene for å BRUKE dem – uten DOM
 * (Node: require('./etasjer'); nettleser: window.Etasjer). Visningen: spill/etasjer-visning.js (2D) og spill/etasjer3d.js (3D).
 *  - funn(kl, areal, i, et): hva du finner i en etasje. 1. etasje = Leting.funn som før (samme hus gir samme funn som før B2).
 *    Andre etasjer har sitt eget funn (fast per hus og etasje); loftet har skrot og materialer, kjelleren mat og diesel,
 *    tilfluktsrommet nødlager. Tallene er Claudes forslag (REGLER.funn).
 *  - nøkkel(i, n): det letingen husker per etasje («81234» for 1. etasje som før, «81234:2» for 2. etasje).
 *  - tilflukt(m): kjeller eller tilfluktsrom som kan brukes som tilflukt (store bygg, kapittel 5.3) – { n, navn, rom, areal }.
 *  - vei(m, fra, til): veien gjennom trappene fra en etasje til en annen (punkter i modellens meter med etasje), eller null.
 *  - påTrapp(t, x, y) / trappHøyde(m, t, x, y): hvor på trappa du står (0 nede … 1 oppe) og høyden over 1. etasjes gulv.
 *  - stå(m, n, x, y, z0): høyden (over 1. etasjes gulv) der du står i etasje n, med trappene, og hvilken etasje det blir.
 *  - hull(Puv, R): et omriss (i byggets akser u, v) med rette hull (trapphull) tatt ut – gir biter uten hull (gulv og himling i 3D).
 *  - sperret(m, n): etasjen er stengt i et høyhus («Trapperommet er sperret»).
 */
(function (rot) {
  'use strict';
  // (leting.js lastes etter denne fila i siden – hentes når den trengs)
  let Lt = null; const Leting_ = () => Lt || (Lt = rot.Leting || (typeof require === 'function' ? (() => { try { return require('./leting.js'); } catch (e) { return null; } })() : null));
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  // Alle tallene her er Claudes forslag.
  const REGLER = {
    // funn per etasje for et bygg på 100 m²: [slag, sjanse, minst, mest]; tomt = sjansen for at etasjen er tømt
    funn: {
      // loftet: mye skrot – materialer, gamle ting, litt mat (hermetikk i kasser)
      loft: { tomt: .15, ting: [['tre', .8, .6, 2.5], ['stål', .45, .1, .6], ['mat', .35, 1, 5], ['penger', .2, 2000, 20000], ['diesel', .1, 5, 20]] },
      // kjelleren: sylteglass, poteter, ved, en dunk diesel
      kjeller: { tomt: .2, ting: [['mat', .75, 3, 12], ['tre', .5, .4, 1.8], ['diesel', .35, 10, 40], ['stål', .15, .05, .3]] },
      // tilfluktsrommet: nødlageret ingen fikk brukt
      tilfluktsrom: { tomt: .1, ting: [['mat', .9, 10, 30], ['diesel', .4, 20, 60], ['tre', .3, .5, 1.5]] },
      // de andre etasjene: som huset ellers (Leting.KLASSER), men med eget frø og litt mindre (folk tok med seg fra oppe først)
      over: .8,
    },
    // loftet og kjelleren gir mer jo mer skrot det står der (flyttekasser, kister, skrot): + så mye per ting, høyst så mye
    skrot: { perTing: .12, maks: 1.8 },
    // tilflukt: kjeller i bygg med minst så stor grunnflate (m²), og tilfluktsrom alltid
    tilflukt: { minAreal: 80, dekning: .12 },
    // gange i 2D: meter per sekund inne i huset, og høyst så mange sekunder (resten hoppes over)
    gange: { fart: 1.3, maks: 12 },
    // trappa: du er på trappa fra så langt utenfor endene (m), og høyst så mye til siden
    trapp: { ende: .45, side: .06, bytt: .5, luft: .12, gelender: .12 },
    // kollisjon: så nær en vegg (m fra midtlinja, pluss halve tykkelsen); loftet: lavere skråtak enn dette sperrer (m);
    // stengt etasje: du kan bare stå så langt fra trappa (m)
    vegg: .18, loftMin: 1.1, stengtRepos: 1.6,
    // rutenettet for veien inne i en etasje (m)
    rute: .25,
  };
  const ROLLER_SKROT = /flyttekasse|kiste|skrot|hylle|tønne/;
  const etasje = (m, n) => (m && m.etasjer.find(e => e.n === n)) || null;
  const står = d => !!d && d.tilstand !== 'revet' && d.tilstand !== 'ødelagt' && d.tilstand !== 'rast';
  const areal = P => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
  const nøkkel = (i, n) => (n === 1 || n === undefined ? i : i + ':' + n);
  const navn = e => (!e ? '' : e.kjeller ? 'kjelleren' : e.loft ? 'loftet' : e.n + '. etasje');
  // hva slags etasje det er (til funn): loft, kjeller, tilfluktsrom eller over
  function slag(e) { if (!e) return 'over'; if (e.loft) return 'loft'; if (e.kjeller) return e.rom.some(r => r.rolle === 'tilfluktsrom') ? 'tilfluktsrom' : 'kjeller'; return 'over'; }
  const rund = (s, v) => (s === 'mat' || s === 'diesel' ? Math.round(v) : s === 'penger' ? Math.round(v / 1000) * 1000 : Math.round(v * 10) / 10);
  // funn i etasje et (et = etasjen fra modellen, eller n); 1. etasje = som før
  function funn(kl, A, i, et) {
    const n = typeof et === 'number' ? et : et ? et.n : 1, Leting = Leting_();
    if (n === 1 || !Leting) return Leting ? Leting.funn(kl, A, i) : { mat: 0, tre: 0, betong: 0, stål: 0, diesel: 0, penger: 0, tomt: true, person: false };
    const s = typeof et === 'object' ? slag(et) : n < 0 ? 'kjeller' : 'over', frø = Math.imul(i | 0, 31) + (n + 7) * 101;
    if (s === 'over') { const f = Leting.funn(kl, A, frø); f.person = false; if (!f.tomt) for (const k of ['mat', 'tre', 'betong', 'stål', 'diesel', 'penger']) f[k] = rund(k, f[k] * REGLER.funn.over); return f; }
    const K = REGLER.funn[s], f = { mat: 0, tre: 0, betong: 0, stål: 0, diesel: 0, penger: 0, tomt: false, person: false };
    if (hash(frø, 1) < K.tomt) { f.tomt = true; return f; }
    // mer skrot (flyttekasser, kister …) gir mer å finne
    const ting = typeof et === 'object' ? et.møbler.filter(q => q.tilstand !== 'revet' && ROLLER_SKROT.test(q.type)).length : 0;
    const skala = Math.max(.4, Math.min(5, Math.sqrt(Math.max(10, A) / 100))) * Math.min(REGLER.skrot.maks, 1 + ting * REGLER.skrot.perTing);
    K.ting.forEach(([k, sj, a, b], j) => { if (hash(frø, 10 + j) < sj) f[k] = rund(k, (a + (b - a) * hash(frø, 40 + j)) * skala); });
    if (!(f.mat || f.tre || f.betong || f.stål || f.diesel || f.penger)) f.tomt = true;
    return f;
  }
  // tilflukt: tilfluktsrom alltid, ellers kjeller i bygg som er store nok
  function tilflukt(m) {
    const k = (m && m.etasjer || []).find(e => e.kjeller && e.tilstand !== 'revet'); if (!k) return null;
    const tf = k.rom.find(r => r.rolle === 'tilfluktsrom'), A = areal(m.P);
    if (!tf && A < REGLER.tilflukt.minAreal) return null;
    return { n: k.n, navn: tf ? 'tilfluktsrommet' : 'kjelleren', rom: tf ? tf.id : null, areal: Math.round(tf ? tf.areal : areal(m.P)), tilfluktsrom: !!tf };
  }
  const sperret = (m, n) => { const e = etasje(m, n); return !!(e && e.stengt); };

  // ---------- trappene ----------
  // retningen opp og hvor langt langs/til siden (x, y) er fra midten
  const lokal = (t, x, y) => { const c = Math.cos(t.a), s = Math.sin(t.a), dx = x - t.x, dy = y - t.y; return { u: dx * c + dy * s, v: -dx * s + dy * c }; };
  // hvor på trappa: 0 ved foten (nede) … 1 på toppen (oppe), eller null når (x, y) ikke er på trappa
  function påTrapp(t, x, y, ende = REGLER.trapp.ende) {
    if (!står(t)) return null; const q = lokal(t, x, y);
    if (Math.abs(q.v) > t.b / 2 + REGLER.trapp.side || q.u < -t.l / 2 - ende || q.u > t.l / 2 + ende) return null;
    return Math.max(0, Math.min(1, (q.u + t.l / 2) / t.l));
  }
  // høyden på trappa (over 1. etasjes gulv)
  function trappHøyde(m, t, x, y) { const a = etasje(m, t.fra), b = etasje(m, t.til), k = påTrapp(t, x, y); if (!a || !b || k === null) return null; return a.z + (b.z - a.z) * k; }
  // trappene som går fra eller til etasje n
  const trapperVed = (m, n) => (m ? m.trapper.filter(t => står(t) && (t.fra === n || t.til === n)) : []);
  // høyden der du står i etasje n (z0 = høyden du hadde, så du ikke hopper til en annen trapp): { z, n, trapp }
  // Du kommer bare inn på trappa fra den enden som hører til etasjen du står i: fra foten når du er i etasjen under (k høyst
  // REGLER.trapp.bytt + luft), fra toppen når du er i etasjen over. Midt i trappa (k = bytt) skifter etasjen (visningen gjør det).
  function stå(m, n, x, y) {
    const e = etasje(m, n); if (!e) return null; const R = REGLER.trapp;
    for (const t of trapperVed(m, n)) { const k = påTrapp(t, x, y); if (k === null) continue;
      if (t.fra === n ? k > R.bytt + R.luft : k < R.bytt - R.luft) continue;
      const a = etasje(m, t.fra), b = etasje(m, t.til); if (!a || !b) continue;
      return { z: a.z + (b.z - a.z) * k, n: k > R.bytt ? t.til : t.fra, trapp: t.id, k }; }
    return { z: e.z, n, trapp: null, k: null };
  }
  // sperrer trappa i etasje n? Gelender langs sidene, og den delen av trappa (eller trapphullet) du ikke kommer til fra denne etasjen
  function trappSperrer(m, n, x, y) { const R = REGLER.trapp;
    for (const t of trapperVed(m, n)) { const q = lokal(t, x, y), hl = t.l / 2, hb = t.b / 2;
      if (q.u < -hl - .05 || q.u > hl + .05 || Math.abs(q.v) > hb + R.gelender) continue;
      if (Math.abs(q.v) > hb - .02) return true;
      const k = (q.u + hl) / t.l; if (t.fra === n ? k > R.bytt + R.luft + .05 : k < R.bytt - R.luft - .05) return true; }
    return false; }
  // KOLLISJON i etasje n (ikke 1. etasje – den har interiøret fra interior.js): yttervegger uten dører, skillevegger utenom
  // døråpningene, møbler som sperrer, trappene, lavt skråtak på loftet og stengte etasjer (bare reposet ved trappa)
  const avstSeg = (x, y, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0; return Math.hypot(x - ax - dx * t, y - ay - dy * t); };
  function blokkert(m, n, x, y) {
    const e = etasje(m, n); if (!e) return false; const V = REGLER.vegg;
    for (const w of e.vegger) { if (!står(w)) continue; const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); if (L < .01) continue;
      const d = avstSeg(x, y, w.a[0], w.a[1], w.b[0], w.b[1]); if (d >= V + (w.tykk || .1) / 2) continue;
      const t = ((x - w.a[0]) * (w.b[0] - w.a[0]) + (y - w.a[1]) * (w.b[1] - w.a[1])) / L;
      if (e.åpninger.some(o => o.vegg === w.id && o.type !== 'vindu' && !o.sperre && o.tilstand !== 'ødelagt' && Math.abs(t - o.t) < o.b / 2 - .12)) continue;
      if (e.åpninger.some(o => o.vegg === w.id && o.tilstand === 'revet' && Math.abs(t - o.t) < o.b / 2 - .12)) continue;
      return true; }
    if (trappSperrer(m, n, x, y)) return true;
    if (e.stengt && !trapperVed(m, n).some(t => Math.hypot(x - t.x, y - t.y) < t.l / 2 + REGLER.stengtRepos)) return true;
    if (e.loft && loftHøyde(m, x, y) < REGLER.loftMin) return true;
    for (const q of e.møbler) { if (!q.sperrer || q.tilstand === 'revet') continue; const dx = x - q.x, dy = y - q.y, c = Math.cos(q.a), s = Math.sin(q.a);
      if (Math.abs(dx * c + dy * s) < q.b / 2 && Math.abs(-dx * s + dy * c) < q.d / 2) return true; }
    return false;
  }
  // VEIEN mellom to etasjer: gjennom trappene, én etasje om gangen (bredde først over trappene). Gir
  // [{ x, y, n }] fra der du går inn (fra: { x, y, n }) til toppen/foten av den siste trappa, eller null.
  function vei(m, fra, til) {
    if (!m || !etasje(m, fra.n) || !etasje(m, til)) return null; if (fra.n === til) return [{ x: fra.x, y: fra.y, n: til }];
    const kø = [[fra.n, []]], sett = new Set([fra.n]);
    while (kø.length) { const [n, sti] = kø.shift();
      for (const t of trapperVed(m, n)) { const opp = t.fra === n, neste = opp ? t.til : t.fra; if (sett.has(neste)) continue; sett.add(neste);
        const ny = sti.concat([{ t, opp }]); if (neste === til) { const pk = [{ x: fra.x, y: fra.y, n: fra.n }];
          for (const { t: q, opp: o } of ny) { const a = o ? q.nede : q.oppe, b = o ? q.oppe : q.nede, sist = pk[pk.length - 1];
            // inne i etasjen: rundt vegger, møbler og trapphull (rutenett), ellers rett linje
            for (const p of rute(m, sist.n, sist, { x: a[0], y: a[1] }) || []) pk.push({ x: p[0], y: p[1], n: sist.n });
            pk.push({ x: a[0], y: a[1], n: o ? q.fra : q.til }, { x: b[0], y: b[1], n: o ? q.til : q.fra, trapp: q.id }); }
          return pk; }
        kø.push([neste, ny]); } }
    return null;
  }
  // veien inne i én etasje fra a til b: bredde først i et rutenett på REGLER.rute m (E.blokkert); gir punktene mellom a og b
  // (uten a og b), eller null når det ikke finnes noen vei (da går visningen rett)
  function rute(m, n, a, b) {
    const s = REGLER.rute; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of m.P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    x0 -= 1; y0 -= 1; x1 += 1; y1 += 1; const W = Math.ceil((x1 - x0) / s), H = Math.ceil((y1 - y0) / s);
    const celle = (x, y) => Math.max(0, Math.min(W - 1, Math.floor((x - x0) / s))) + Math.max(0, Math.min(H - 1, Math.floor((y - y0) / s))) * W;
    const midt = c => [x0 + (c % W + .5) * s, y0 + (Math.floor(c / W) + .5) * s];
    const fri = new Int8Array(W * H).fill(-1), åpen = c => { if (fri[c] < 0) { const [x, y] = midt(c); fri[c] = blokkert(m, n, x, y) || T.some(t => påTrapp(t, x, y, .1) !== null) ? 0 : 1; } return fri[c] === 1; };
    // (trappene selv er ikke en del av veien i etasjen – du går på dem bare fra enden)
    const T = trapperVed(m, n), ca = celle(a.x, a.y), cb = celle(b.x, b.y); if (ca === cb) return [];
    const før = new Int32Array(W * H).fill(-1), kø = [ca]; før[ca] = ca;
    for (let k = 0; k < kø.length; k++) { const c = kø[k]; if (c === cb) break; const i = c % W, j = (c - i) / W;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
        const q = ii + jj * W; if (før[q] >= 0) continue; if (q !== cb && !åpen(q)) continue; før[q] = c; kø.push(q); } }
    if (før[cb] < 0) return null;
    const cel = []; for (let c = før[cb]; c !== ca; c = før[c]) cel.push(c); cel.reverse();
    // bare knekkpunktene (der retningen skifter)
    const ut = []; for (let k = 0; k < cel.length; k++) { const p = cel[k - 1] !== undefined ? cel[k - 1] : ca, q = cel[k + 1] !== undefined ? cel[k + 1] : cb; if (cel[k] - p !== q - cel[k]) ut.push(midt(cel[k])); }
    return ut;
  }
  const lengde = pk => { let L = 0; for (let k = 1; k < (pk || []).length; k++) L += Math.hypot(pk[k].x - pk[k - 1].x, pk[k].y - pk[k - 1].y); return L; };

  // ---------- hull i gulv og himling ----------
  // Puv: omrisset i byggets akser [[u, v]]; R: rette hull [{ u0, u1, v0, v1 }] i de samme aksene. Gir biter (omriss) uten hullene:
  // hver bit deles i fire rundt hullet (venstre, høyre, foran, bak), så trianguleringen aldri trenger hull.
  function klipp(S, akse, grense, større) { const ut = [], inne = p => (større ? p[akse] >= grense : p[akse] <= grense);
    for (let i = 0; i < S.length; i++) { const a = S[i], b = S[(i + 1) % S.length], ia = inne(a), ib = inne(b);
      if (ia) ut.push(a); if (ia !== ib) { const t = (grense - a[akse]) / (b[akse] - a[akse]); ut.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } return ut; }
  const flate = S => { let a = 0; for (let i = 0; i < S.length; i++) { const p = S[i], q = S[(i + 1) % S.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
  function hull(Puv, R) {
    let biter = [Puv];
    for (const r of R || []) { const ny = [];
      for (const S of biter) { let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity; for (const p of S) { u0 = Math.min(u0, p[0]); u1 = Math.max(u1, p[0]); v0 = Math.min(v0, p[1]); v1 = Math.max(v1, p[1]); }
        if (r.u0 >= u1 || r.u1 <= u0 || r.v0 >= v1 || r.v1 <= v0) { ny.push(S); continue; }
        const midt = klipp(klipp(S, 0, r.u0, true), 0, r.u1, false);
        for (const b of [klipp(S, 0, r.u0, false), klipp(S, 0, r.u1, true), klipp(midt, 1, r.v0, false), klipp(midt, 1, r.v1, true)]) if (b.length >= 3 && flate(b) > 1e-4) ny.push(b); }
      biter = ny; }
    return biter;
  }
  // trappas rektangel i byggets akser (u, v) – trappene står alltid langs aksene
  function trappUV(t, A, luft = 0) { const c = Math.cos(t.a), s = Math.sin(t.a), hl = t.l / 2 + luft, hb = t.b / 2 + luft, U = [], V = [];
    for (const [p, q] of [[-hl, -hb], [hl, -hb], [hl, hb], [-hl, hb]]) { const x = t.x + p * c - q * s, y = t.y + p * s + q * c; U.push(x * A.ux + y * A.uy); V.push(x * A.vx + y * A.vy); }
    return { u0: Math.min(...U), u1: Math.max(...U), v0: Math.min(...V), v1: Math.max(...V) }; }
  // takhøyden på loftet (over loftsgulvet) i (x, y): fra 0 ved raftet til mønet midt i (saltak; valm regnes likt)
  function loftHøyde(m, x, y) { const A = m.akse, v = x * A.vx + y * A.vy, vm = (A.v0 + A.v1) / 2, hv = (A.v1 - A.v0) / 2;
    return Math.max(0, (m.tak && m.tak.møne || 0) * (1 - Math.abs(v - vm) / Math.max(.5, hv))); }

  const api = { REGLER, etasje, navn, slag, nøkkel, funn, tilflukt, sperret, påTrapp, trappHøyde, trapperVed, stå, trappSperrer, blokkert, rute, vei, lengde, hull, trappUV, loftHøyde, lokal, areal, står };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Etasjer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
