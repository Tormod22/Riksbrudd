/* PLANTEGNINGEN I 2D (fase B1 i docs/plan-selskap-okonomi.md, kapittel 5.2, 5.3 og 5.8; 28. nov).
 * Husene i kartet vises fra byggemodellen (spill/bygning.js) når du zoomer helt inn eller trykker «Se inn» i huspanelet:
 * vegger (bærende tykkere), dører med bue, vinduer, trapper, møbler og romnavn – én etasje om gangen.
 *
 * Reglene her er uten DOM (Node: require('./plantegning'); nettleser: window.Plantegning). Visningen: spill/plantegning-visning.js.
 *  - husTak(P, e, tett, H): taket, veggens høyde og døra slik hus3d i index.html lager dem (samme regler, samme rekkefølge), så
 *    modellen og 3D-huset har samme tak, veggtopp og dør. H = hjelperne fra kartflis.js (form, rund, harFall, takDeler) og Byhus.
 *  - info(...): det Bygning.fraKart trenger (i, t, kl, h, tett, k, moh, dør, tak, vegg).
 *  - ramme(P): husets egen nullpunkt (avrundet midte), så modellen er lik uansett hvor kartet eller 3D-utsnittet står.
 *  - figur(m, n): det som skal tegnes for etasje n (vegger delt rundt åpningene, åpninger, trapper, møbler, rom), i modellens meter.
 *  - logg: endringene på husene i kartet, per leir (localStorage «riksbrudd-bygninger» i visningen).
 * Alle tallene her er Claudes forslag (REGLER).
 */
(function (rot) {
  'use strict';
  const REGLER = {
    // plantegningen kommer av seg selv når kartet er så nært (meter per skjermpunkt), og huset er minst så stort på skjermen (punkter)
    zoom: .5, minPunkter: 36,
    // så nært kan kartet zoomes når en plantegning vises (meter per punkt; ellers 0,1 som før)
    minZoom: .03,
    // høyst så mange hus om gangen (nærmest midten av skjermen), og så mange modeller som huskes
    maksHus: 4, huskes: 24,
    // møbler og romnavn bare når huset er så stort på skjermen (punkter)
    detaljPunkter: 110,
    // «Se inn»: huset fyller omtrent så stor del av skjermen
    seInn: .6,
    // planker over en åpning: m³ tre per m² (bord og lekter), og minst
    planker: { perM2: .04, min: .05 },
    // trykk på en åpning: innen så mange skjermpunkter (eller minst så mange meter)
    treff: { punkter: 16, meter: .5, maks: 1.2 },
  };

  // ---------- som hus3d i index.html ----------
  // byggets klasse (samme regel som klasse() i hus3d)
  const klasse = (t, A, h) => t === 10 ? (A < 150 && h < 9 ? 'hus' : 'leil') : t === 0 ? (h >= 10 || A > 350 ? 'leil' : 'hus') : t === 1 ? 'uthus' : t === 6 ? 'industri'
    : t === 7 ? 'butikk' : t === 8 ? 'kirke' : t === 9 || t === 3 ? 'skole' : t === 4 ? 'låve' : t === 11 ? 'hytte'
    : t === 12 ? 'lager' : t === 13 ? 'sykehus' : t === 14 ? (h <= 16 && A > 1500 ? 'hangar' : 'terminal') : t === 15 ? 'sykehjem' : t === 16 ? 'legevakt'
    : t === 2 ? (h <= 11 && A > 700 ? 'industri' : h <= 9 ? 'butikk' : 'kontor') : (A < 60 ? 'uthus' : 'hus');
  // døra per klasse (DØR i hus3d): [type, bredde, høyde]
  const DØR = { hus: [0, 1, 2.1], hytte: [0, 1, 2], leil: [3, 1.8, 2.3], kontor: [3, 2, 2.4], skole: [3, 2.2, 2.4], industri: [2, 4.5, 4.5], låve: [1, 3, 3.2], uthus: [1, 2.6, 2.2], butikk: [3, 2.2, 2.4], kirke: [0, 1.6, 2.6], lager: [2, 4, 4.2], sykehus: [3, 3, 2.6], hangar: [2, 20, 9], terminal: [3, 3, 2.8], sykehjem: [3, 2.4, 2.4], legevakt: [3, 2.2, 2.4] };
  // mønehøyden (mønFor i hus3d: Byhus.TAKVINKEL, ellers 0,42 × bredden, høyst 5 m)
  const mønFor = BY => (kl, bredde, h) => { const v = BY && BY.TAKVINKEL && BY.TAKVINKEL[kl]; return v ? Math.min(bredde / 2 * v[0], v[1], h * (kl === 'kirke' ? .7 : .55)) : Math.min(bredde * .42, 5, h * .55); };
  const r2 = v => Math.round(v * 100) / 100;
  const arealS = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  // omrisset fra kartflisen (lukket ring, første punkt gjentatt) som åpent omriss mot klokka, som hus3d gjør
  function åpent(d) { const P = d.slice(0, -1).map(p => [p[0], p[1]]); if (arealS(P) < 0) P.reverse(); return P; }
  // senteret hus3d bruker for naboene (snittet av alle punktene i ringen, også det gjentatte)
  function senter(d) { let x = 0, y = 0; for (const p of d) { x += p[0]; y += p[1]; } return [x / d.length, y / d.length]; }
  // antall bygg innen R m (som naboer() i kartflis.js)
  function tetthet(c, sentre, R = 100) { let n = 0; for (const q of sentre) if (Math.hypot(q[0] - c[0], q[1] - c[1]) < R) n++; return Math.max(0, n - 1); }

  // Taket, veggens høyde over 1. etasjes gulv og døra – samme valg som hus3d (index.html, «hvert bygg én gang»):
  // e = kartets egenskaper { t, i, h, r, k }, tett = antall bygg innen 100 m. Gir { kl, tak, vegg, dør { x, y, w }, rund }.
  function husTak(P, e, tett, H) {
    const f = H.form(P), t = e.t, i = e.i, h = e.h || 6, BY = H.Byhus || null, møn = mønFor(BY);
    const rundt = H.rund(P, f), enkel = f.rekt > .82 && P.length <= 10;
    let fall0 = !rundt && f.lv > 3 && H.harFall(t, f.areal, h, i, tett || 0);
    if (e.r === 1) fall0 = false; else if (e.r >= 2 && e.r <= 8 && !rundt && f.lv > 3) fall0 = true;
    let dTak = fall0 && !enkel ? H.takDeler(P, f) : null, fall = fall0 && (enkel || !!dTak);
    let kl = klasse(t, f.areal, h);
    if (kl === 'hus' && t === 5 && (tett || 0) >= 15 && (h >= 9 || f.areal > 500)) kl = h > 14 || f.areal > 1200 ? 'kontor' : 'leil';
    const bs = BY && BY.stil && !rundt ? BY.stil(kl, t, i, h, f.areal, tett || 0, enkel) : null;
    if ((kl === 'kirke' || (kl === 'låve' && f.rekt > .45)) && fall0 && !enkel && !dTak) { dTak = { valm: true }; fall = true; }
    // høyden over gulvet i 1. etasje (hus3d: bunn + 1)
    let topp = h;
    if (kl === 'kirke' && fall && BY && BY.KIRKE) { const mk = møn('kirke', dTak && dTak.rekt ? Math.max(...dTak.rekt.map(q => q.lv)) : f.lv, h * 1.6), vg = Math.max(5, Math.min(h - mk, BY.KIRKE.maksVegg)); topp = vg + mk; }
    let lengst = 0, lj = 0; for (let j = 0; j < P.length; j++) { const a = P[j], b = P[(j + 1) % P.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > lengst) { lengst = l; lj = j; } }
    // døra som dør() i hus3d: på veggen a–b ved andelen fr, bredden etter klassen
    const dørPå = (a, b, fr) => { const [, w0] = DØR[kl] || DØR.hus, L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 2) return null; return { x: a[0] + (b[0] - a[0]) * fr, y: a[1] + (b[1] - a[1]) * fr, w: Math.min(w0, L * .6) }; };
    const lang = () => dørPå(P[lj], P[(lj + 1) % P.length], .5);
    if (bs && bs.tak && enkel) return { kl, tak: 'valm', vegg: r2(topp - (bs.tak === 'mansard' ? 1.2 : .8)), dør: lang(), rund: false, stil: bs.tak };
    if (fall && !enkel) { const bred = dTak.rekt ? Math.max(...dTak.rekt.map(q => q.lv)) : f.lv, mø = kl === 'kirke' ? møn('kirke', bred, h * 1.6) : møn(kl, bred, h);
      return { kl, tak: dTak.rekt ? 'saltak' : 'valm', vegg: r2(topp - mø), dør: lang(), rund: false }; }
    if (fall) { const mø = kl === 'kirke' ? møn('kirke', f.lv, h * 1.6) : møn(kl, f.lv, h), hu = f.lu / 2, hv = f.lv / 2, p = (du, dv) => [f.sx + f.ux * du + f.vx * dv, f.sy + f.uy * du + f.vy * dv];
      return { kl, tak: 'saltak', vegg: r2(topp - mø), dør: dørPå(p(-hu, -hv), p(hu, -hv), kl === 'låve' ? .5 : .38), rund: false }; }
    return { kl, tak: 'flatt', vegg: r2(topp), dør: lang(), rund: rundt };
  }

  // husets eget nullpunkt: den avrundede midten av omrisset (verdensmeter)
  function ramme(P) { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [Math.round(x / P.length), Math.round(y / P.length)]; }
  const lokal = (P, o) => P.map(p => [r2(p[0] - o[0]), r2(p[1] - o[1])]);

  // det Bygning.fraKart trenger. Pv = omrisset i verdensmeter (åpent, mot klokka), moh = høyden over havet ved første hjørne.
  function info(Pv, e, tett, moh, H) {
    const o = ramme(Pv), P = lokal(Pv, o), T = husTak(P, e, tett, H);
    const inf = { i: e.i, t: e.t, kl: T.kl, h: e.h || 6, tett: tett || 0, k: e.k, moh, tak: T.tak, vegg: T.vegg > 0 ? T.vegg : undefined };
    if (T.dør) inf.dør = { x: T.dør.x, y: T.dør.y, w: T.dør.w };
    return { o, P, info: inf, tak: T };
  }

  // ---------- tegningen av én etasje (rene tall, i modellens meter) ----------
  const ROM = { stue: 'Stue', kjøkken: 'Kjøkken', bad: 'Bad', vaskerom: 'Vaskerom', soverom: 'Soverom', bod: 'Bod', gang: 'Gang', vindfang: 'Vindfang', korridor: 'Korridor',
    trapperom: 'Trapperom', loft: 'Loft', kjeller: 'Kjeller', fyrrom: 'Fyrrom', tilfluktsrom: 'Tilfluktsrom', stengt: 'Stengt', allrom: 'Allrom', rom: 'Rom' };
  const romNavn = r => ROM[r] || (r ? r[0].toUpperCase() + r.slice(1) : 'Rom');
  const etasje = (m, n) => m && m.etasjer.find(e => e.n === n) || null;
  // knappene i etasjevelgeren: Kjeller, 1, 2 … , Loft (stengte etasjer er grå)
  function etasjeValg(m) { return (m ? m.etasjer : []).map(e => ({ n: e.n, kort: e.kjeller ? 'Kjeller' : e.loft ? 'Loft' : String(e.n), navn: e.navn, stengt: !!e.stengt || e.tilstand === 'revet' })); }
  const står = d => !!d && d.tilstand !== 'revet' && d.tilstand !== 'ødelagt' && d.tilstand !== 'rast';
  function figur(m, n) {
    const e = etasje(m, n), ut = { vegger: [], åpninger: [], trapper: [], møbler: [], rom: [], søyler: [], bjelker: [], P: m ? m.P : [] };
    if (!e) return ut;
    for (const r of e.rom) { let x = 0, y = 0; for (const p of r.P) { x += p[0]; y += p[1]; } ut.rom.push({ id: r.id, navn: r.navn || romNavn(r.rolle), x: x / r.P.length, y: y / r.P.length, areal: r.areal, P: r.P, rolle: r.rolle }); }
    for (const w of e.vegger) {
      const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); if (L < 1e-3) continue; const ex = (w.b[0] - w.a[0]) / L, ey = (w.b[1] - w.a[1]) / L;
      // veggen delt rundt åpningene (hullene der dører og vinduer står)
      const hull = e.åpninger.filter(o => o.vegg === w.id && o.tilstand !== 'revet').map(o => [Math.max(0, o.t - o.b / 2), Math.min(L, o.t + o.b / 2)]).sort((a, b) => a[0] - b[0]);
      const biter = []; let s = 0; for (const [a, b] of hull) { if (a > s + .01) biter.push([s, a]); s = Math.max(s, b); } if (L > s + .01) biter.push([s, L]);
      ut.vegger.push({ id: w.id, type: w.type, bærende: !!w.bærende, tykk: w.tykk || .15, stoff: w.stoff, tilstand: w.tilstand, revet: !står(w),
        biter: biter.map(([a, b]) => [[w.a[0] + ex * a, w.a[1] + ey * a], [w.a[0] + ex * b, w.a[1] + ey * b]]), a: w.a, b: w.b });
      for (const o of e.åpninger) { if (o.vegg !== w.id) continue;
        // innover (venstre for veggens retning: omrisset går mot klokka, så det er inne for ytterveggene)
        ut.åpninger.push({ id: o.id, vegg: w.id, type: o.type, b: o.b, h: o.h, x: w.a[0] + ex * o.t, y: w.a[1] + ey * o.t, ux: ex, uy: ey, nx: -ey, ny: ex, tykk: w.tykk || .15,
          sperre: o.sperre || null, tilstand: o.tilstand, ytter: w.type !== 'skille', inngang: o.inngang || null }); }
    }
    for (const t of m.trapper) { if (!står(t) || (t.fra !== n && t.til !== n)) continue; const c = Math.cos(t.a), s = Math.sin(t.a), hl = t.l / 2, hb = t.b / 2;
      const P = [[-hl, -hb], [hl, -hb], [hl, hb], [-hl, hb]].map(([u, v]) => [t.x + u * c - v * s, t.y + u * s + v * c]);
      ut.trapper.push({ id: t.id, P, x: t.x, y: t.y, ux: c, uy: s, l: t.l, b: t.b, form: t.form, opp: t.fra === n, trinn: Math.max(3, Math.round(t.l / .27)) }); }
    for (const q of e.møbler) { if (q.tilstand === 'revet') continue; const c = Math.cos(q.a), s = Math.sin(q.a), hb = q.b / 2, hd = q.d / 2;
      ut.møbler.push({ id: q.id, type: q.type, ødelagt: q.tilstand !== 'hel', P: [[-hb, -hd], [hb, -hd], [hb, hd], [-hb, hd]].map(([u, v]) => [q.x + u * c - v * s, q.y + u * s + v * c]) }); }
    for (const q of e.søyler || []) if (står(q)) ut.søyler.push({ x: q.x, y: q.y });
    for (const q of e.bjelker || []) if (står(q)) ut.bjelker.push({ a: q.a, b: q.b });
    return ut;
  }
  // nærmeste åpning til (x, y) i etasjen (modellens meter), innen maks
  function finnÅpning(F, x, y, maks) { let best = null, bd = maks; for (const o of F.åpninger) { if (o.tilstand === 'revet') continue; const d = Math.hypot(o.x - x, o.y - y) - o.b / 2 * .6; if (d < bd) { bd = d; best = o; } } return best; }
  // planker til en åpning (m³ tre)
  const planker = o => Math.round(Math.max(REGLER.planker.min, o.b * o.h * REGLER.planker.perM2) * 100) / 100;
  const åpNavn = o => (o.type === 'vindu' ? 'Vindu' : o.type === 'port' ? 'Port' : o.inngang ? 'Ytterdør' : 'Dør');

  // ---------- endringsloggen (per leir) ----------
  // { v: 1, leir: 'x,y', hus: { [husnr]: [endring …] } } – en endring er Bygning sin { e, del, id, gjør }
  const nyLogg = leir => ({ v: 1, leir: leir || '', hus: {} });
  function lesLogg(tekst, leir) {
    try { const d = JSON.parse(tekst || 'null'); if (d && d.v === 1 && d.leir === (leir || '') && d.hus && typeof d.hus === 'object') return d; } catch (e) { /* ødelagt: start på nytt */ }
    return nyLogg(leir);
  }
  const endringer = (L, i) => (L && L.hus[i]) || [];
  function leggTil(L, i, d) { const ren = { e: d.e, del: d.del, id: d.id, gjør: d.gjør }; for (const k of ['vegg', 't', 'b', 'type', 'bjelke', 'x', 'y']) if (d[k] !== undefined) ren[k] = d[k]; (L.hus[i] = L.hus[i] || []).push(ren); return ren; }
  const antall = L => Object.values((L && L.hus) || {}).reduce((s, l) => s + l.length, 0);

  const api = { REGLER, klasse, DØR, mønFor, husTak, ramme, lokal, info, åpent, senter, tetthet, figur, etasje, etasjeValg, finnÅpning, planker, åpNavn, romNavn,
    nyLogg, lesLogg, endringer, leggTil, antall, arealS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Plantegning = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
