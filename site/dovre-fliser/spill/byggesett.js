/* Fritt byggesett (12. nov, brukeren: «et enda bedre byggesystem» – fritt byggesett): regler uten DOM.
 * Node: require('./byggesett') (henter leir.js selv); nettleser: globalThis.Byggesett (lastes etter leir.js og før leir-visning.js).
 * Delene står på et rutenett med ruter på G = 2,4 m fra leirens midte, og etasjene er H = 3 m (høyst to etasjer):
 *  - gulv (betongfundament, tregulv) og tak (flatt tak, saltak) ligger i en rute; «dekket» n er høyden: 0 = bakken,
 *    1 = mellom 1. og 2. etasje (gulvet i 2. etasje eller taket over 1. etasje), 2 = taket over 2. etasje;
 *  - vegger (tre, betong, murstein; hel, med dør, vindu eller port) og forsvar (palisade, mur, jordvoll, piggtråd) står på en kant
 *    mellom to ruter: a = 'x' (kanten langs x, nede i ruta) eller 'y' (kanten langs y, til venstre i ruta), n = etasjen (0 eller 1).
 * Delene er vanlige bygg i Leir.BYGG (type 'bs_…', del: true): de koster kroner og materialer og bygges som jobber av byggelagene.
 * Plassen i rutenettet ligger på bygget som b.bs = { i, j, a, n, r } (r: saltakets møne, 0 = langs x, 1 = langs y, ellers automatisk).
 * Støtte (ingen svevende deler): vegger i 2. etasje står på en vegg under eller et gulv inntil; et dekke over bakken trenger en vegg under
 * på en av kantene, eller et nabodekke i samme høyde som har det. rom() finner lukkede rom (gulv + vegger rundt + tak over).
 */
(function (rot) {
  'use strict';
  const Leir = rot.Leir || (typeof require === 'function' ? require('./leir.js') : null);
  const G = 2.4, H = 3, ETASJER = 2, SENG_M2 = 8;
  // kat: gulv/tak (rute), vegg/forsvar (kant). stoff: materialet i 3D. v: dør/vindu/port. Prisene og tidene er Claudes forslag.
  const DELER = {
    bs_fundament: { navn: 'Betongfundament', kort: 'Fundament', kat: 'gulv', stoff: 'betong', pris: 40000, tid: .4, mat: { betong: 1.4 }, tekst: 'Gulv på bakken' },
    bs_tregulv: { navn: 'Tregulv', kort: 'Tregulv', kat: 'gulv', stoff: 'tre', pris: 25000, tid: .3, mat: { tre: .5 }, tekst: 'Gulv, også i 2. etasje' },
    bs_vegg_tre: { navn: 'Trevegg', kort: 'Hel', kat: 'vegg', stoff: 'tre', v: 'hel', pris: 20000, tid: .3, mat: { tre: .5 } },
    bs_vegg_tre_dør: { navn: 'Trevegg med dør', kort: 'Dør', kat: 'vegg', stoff: 'tre', v: 'dør', pris: 24000, tid: .35, mat: { tre: .45, stål: .02 } },
    bs_vegg_tre_vindu: { navn: 'Trevegg med vindu', kort: 'Vindu', kat: 'vegg', stoff: 'tre', v: 'vindu', pris: 24000, tid: .35, mat: { tre: .45, stål: .01 } },
    bs_vegg_tre_port: { navn: 'Trevegg med port', kort: 'Port', kat: 'vegg', stoff: 'tre', v: 'port', pris: 28000, tid: .4, mat: { tre: .35, stål: .15 } },
    bs_vegg_betong: { navn: 'Betongvegg', kort: 'Hel', kat: 'vegg', stoff: 'betong', v: 'hel', pris: 35000, tid: .5, mat: { betong: 1.4, stål: .05 } },
    bs_vegg_betong_dør: { navn: 'Betongvegg med dør', kort: 'Dør', kat: 'vegg', stoff: 'betong', v: 'dør', pris: 40000, tid: .55, mat: { betong: 1.1, stål: .08 } },
    bs_vegg_betong_vindu: { navn: 'Betongvegg med vindu', kort: 'Vindu', kat: 'vegg', stoff: 'betong', v: 'vindu', pris: 40000, tid: .55, mat: { betong: 1.1, stål: .07 } },
    bs_vegg_betong_port: { navn: 'Betongvegg med port', kort: 'Port', kat: 'vegg', stoff: 'betong', v: 'port', pris: 45000, tid: .6, mat: { betong: .6, stål: .2 } },
    bs_vegg_stein: { navn: 'Mursteinsvegg', kort: 'Hel', kat: 'vegg', stoff: 'stein', v: 'hel', pris: 45000, tid: .8, mat: { betong: 1.6 } },
    bs_vegg_stein_dør: { navn: 'Mursteinsvegg med dør', kort: 'Dør', kat: 'vegg', stoff: 'stein', v: 'dør', pris: 50000, tid: .85, mat: { betong: 1.3, tre: .05, stål: .01 } },
    bs_vegg_stein_vindu: { navn: 'Mursteinsvegg med vindu', kort: 'Vindu', kat: 'vegg', stoff: 'stein', v: 'vindu', pris: 50000, tid: .85, mat: { betong: 1.3, tre: .05 } },
    bs_vegg_stein_port: { navn: 'Mursteinsvegg med port', kort: 'Port', kat: 'vegg', stoff: 'stein', v: 'port', pris: 55000, tid: .9, mat: { betong: .8, stål: .15 } },
    bs_tak_flatt: { navn: 'Flatt tak', kort: 'Flatt', kat: 'tak', stoff: 'tak', pris: 30000, tid: .4, mat: { tre: .4, stål: .1 }, tekst: 'Legges på veggene' },
    bs_tak_sal: { navn: 'Saltak', kort: 'Saltak', kat: 'tak', stoff: 'tak', pris: 35000, tid: .5, mat: { tre: .6, stål: .05 }, tekst: 'Legges på veggene; mønet langs lengste side (Roter bytter)' },
    bs_palisade: { navn: 'Palisade', kort: 'Palisade', kat: 'forsvar', stoff: 'tre', pris: 15000, tid: .3, mat: { tre: .8 }, tekst: 'Spisse tømmerstokker, 2,6 m' },
    bs_mur: { navn: 'Mur', kort: 'Mur', kat: 'forsvar', stoff: 'betong', pris: 40000, tid: .6, mat: { betong: 1.2, stål: .04 }, tekst: 'Betongmur, 2,2 m' },
    bs_voll: { navn: 'Jordvoll', kort: 'Voll', kat: 'forsvar', stoff: 'jord', pris: 10000, tid: .8, mat: {}, tekst: 'Gravd voll, 1,3 m (gratis materialer)' },
    bs_piggtråd: { navn: 'Piggtråd', kort: 'Piggtråd', kat: 'forsvar', stoff: 'stål', pris: 8000, tid: .15, mat: { stål: .05 }, tekst: 'Stolper med piggtråd, 1,3 m' },
  };
  const KANT = d => DELER[d.type].kat === 'vegg' || DELER[d.type].kat === 'forsvar';
  const erDel = type => !!DELER[type];
  // Delene som vanlige bygg i Leir.BYGG (fot: omrisset rundt midten, ret 0 = langs x)
  function registrer(LB) {
    if (!LB || !LB.BYGG) return;
    for (const [id, D] of Object.entries(DELER)) {
      const fot = D.kat === 'gulv' || D.kat === 'tak' ? [-G / 2, G / 2, -G / 2, G / 2] : [-G / 2, G / 2, D.kat === 'forsvar' && id === 'bs_voll' ? -.8 : -.15, D.kat === 'forsvar' && id === 'bs_voll' ? .8 : .15];
      LB.BYGG[id] = { navn: D.navn, pris: D.pris, tid: D.tid, kw: 0, del: true, fot, mat: D.mat, tekst: D.tekst || 'Del i byggesettet' };
    }
  }
  registrer(Leir);

  // ---------- rutenettet ----------
  const celle = (o, x, y) => [Math.floor((x - o.ox) / G), Math.floor((y - o.oy) / G)];
  // Midten (kartet) for en del i rutenettet, og retningen (ret) som Leir bruker for omrisset
  function midt(o, d) {
    if (!KANT(d)) return { x: o.ox + (d.i + .5) * G, y: o.oy + (d.j + .5) * G, ret: 0 };
    return d.a === 'x' ? { x: o.ox + (d.i + .5) * G, y: o.oy + d.j * G, ret: 0 } : { x: o.ox + d.i * G, y: o.oy + (d.j + .5) * G, ret: Math.PI / 2 };
  }
  // Endepunktene til en kant (kartet)
  function kantEnder(o, d) { const x = o.ox + d.i * G, y = o.oy + d.j * G; return d.a === 'x' ? [[x, y], [x + G, y]] : [[x, y], [x, y + G]]; }
  // Nærmeste kant til et punkt (akse: lås til 'x' eller 'y')
  function kantVed(o, x, y, akse) {
    const fx = (x - o.ox) / G, fy = (y - o.oy) / G, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const k = [[v, { a: 'x', i, j }], [1 - v, { a: 'x', i, j: j + 1 }], [u, { a: 'y', i, j }], [1 - u, { a: 'y', i: i + 1, j }]].filter(([, q]) => !akse || q.a === akse);
    k.sort((p, q) => p[0] - q[0]); return k[0][1];
  }
  const hjørneVed = (o, x, y) => [Math.round((x - o.ox) / G), Math.round((y - o.oy) / G)];
  // Plassene mellom to trykk: ruter i rektangelet (gulv, tak), eller kanter på en linje / rundt rektangelet (vegger, forsvar)
  const MAKS = 80;
  function rad(o, type, A, B, o2 = {}) {
    const D = DELER[type]; if (!D) return [];
    if (D.kat === 'gulv' || D.kat === 'tak') {
      const [i0, j0] = celle(o, A[0], A[1]), [i1, j1] = B ? celle(o, B[0], B[1]) : [i0, j0], ut = [];
      for (let i = Math.min(i0, i1); i <= Math.max(i0, i1); i++) for (let j = Math.min(j0, j1); j <= Math.max(j0, j1); j++) if (ut.length < MAKS) ut.push({ i, j, a: null });
      return ut;
    }
    if (!B) return [kantVed(o, A[0], A[1], o2.akse)];
    const [a0, b0] = hjørneVed(o, A[0], A[1]), [a1, b1] = hjørneVed(o, B[0], B[1]), ut = [];
    if (a0 === a1 && b0 === b1) return [kantVed(o, A[0], A[1], o2.akse)];
    const x0 = Math.min(a0, a1), x1 = Math.max(a0, a1), y0 = Math.min(b0, b1), y1 = Math.max(b0, b1);
    if (y0 === y1 || x0 === x1 || o2.linje) {
      // en rett linje langs den lengste retningen
      if (x1 - x0 >= y1 - y0) { const j = b0; for (let i = x0; i < x1; i++) ut.push({ a: 'x', i, j }); }
      else { const i = a0; for (let j = y0; j < y1; j++) ut.push({ a: 'y', i, j }); }
    } else {
      for (let i = x0; i < x1; i++) { ut.push({ a: 'x', i, j: y0 }); ut.push({ a: 'x', i, j: y1 }); }
      for (let j = y0; j < y1; j++) { ut.push({ a: 'y', i: x0, j }); ut.push({ a: 'y', i: x1, j }); }
    }
    return ut.slice(0, MAKS);
  }
  const nøkkel = d => (KANT(d) ? `k:${d.a}:${d.i}:${d.j}:${d.n}` : `c:${d.i}:${d.j}:${d.n}`);
  const indeks = deler => { const m = new Map(); for (const d of deler) m.set(nøkkel(d), d); return m; };
  const kanterRundt = (i, j) => [{ a: 'x', i, j }, { a: 'x', i, j: j + 1 }, { a: 'y', i, j }, { a: 'y', i: i + 1, j }];
  const ruterVed = d => (d.a === 'x' ? [[d.i, d.j - 1], [d.i, d.j]] : [[d.i - 1, d.j], [d.i, d.j]]);
  const vegg = (M, k, n) => { const d = M.get(`k:${k.a}:${k.i}:${k.j}:${n}`); return d && DELER[d.type].kat === 'vegg' ? d : null; };
  const dekke = (M, i, j, n) => M.get(`c:${i}:${j}:${n}`) || null;
  // Står delen trygt? (se øverst)
  function støttet(M, d) {
    const D = DELER[d.type];
    if (KANT(d)) { if (d.n === 0) return true; if (D.kat === 'forsvar') return false;
      return !!vegg(M, d, d.n - 1) || ruterVed(d).some(([i, j]) => dekke(M, i, j, d.n)); }
    if (d.n === 0) return D.kat === 'gulv';
    // dekket: en vegg under på en av kantene, eller et sammenhengende nabodekke i samme høyde som har det
    const sett = new Set(), kø = [[d.i, d.j]];
    while (kø.length && sett.size < 400) { const [i, j] = kø.pop(), s = i + ',' + j; if (sett.has(s)) continue; sett.add(s);
      if (kanterRundt(i, j).some(k => vegg(M, k, d.n - 1))) return true;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (dekke(M, i + di, j + dj, d.n)) kø.push([i + di, j + dj]); }
    return false;
  }
  // Hvor en ny del havner (etasjen velges selv når nivå er 'auto'): { d, bytt (id som byttes ut), feil }
  function plassering(deler, type, slot, o = {}) {
    const D = DELER[type]; if (!D) return { feil: 'Ukjent del.' };
    // ferdige hus: hver del på sin egen plass (ingen etasje over, ingen bytting)
    if (o.fast) { const d = { type, i: slot.i, j: slot.j, a: KANT({ type }) ? slot.a : null, n: D.kat === 'tak' ? 1 : 0, ...(o.r !== undefined ? { r: o.r } : {}) }, M0 = o.M || indeks(deler);
      if (M0.get(nøkkel(d))) return { feil: 'Plassen er opptatt.' }; return støttet(M0, d) ? { d, bytt: null } : { feil: 'Står ikke støtt.' }; }
    const M = o.M || indeks(deler), auto = o.nivå === undefined || o.nivå === 'auto', ny = n => ({ type, i: slot.i, j: slot.j, a: KANT({ type }) ? slot.a : null, n, ...(D.kat === 'tak' && o.r !== undefined && o.r !== null ? { r: o.r } : {}) });
    const ok = (d, bytt) => (støttet(M, d) ? { d, bytt: bytt || null } : { feil: D.kat === 'tak' ? 'Taket må ligge på vegger (eller inntil et annet tak).' : D.kat === 'gulv' ? 'Gulvet i 2. etasje må ligge på vegger.' : 'Veggen i 2. etasje må stå på en vegg eller et gulv.' });
    if (D.kat === 'forsvar') { const d = ny(0), a = M.get(nøkkel(d));
      if (!a) return ok(d); if (a.type === type) return { feil: 'Her står det allerede ' + D.navn.toLowerCase() + '.' };
      return DELER[a.type].kat === 'forsvar' ? ok(d, a.id) : { feil: 'Her står det en vegg.' }; }
    if (D.kat === 'gulv') {
      const nivåer = type === 'bs_fundament' ? [0] : auto ? [0, 1] : [o.nivå];
      for (const n of nivåer) { const d = ny(n), a = M.get(nøkkel(d)); if (!a) { const r = ok(d); if (!r.feil || !auto) return r; continue; }
        if (!auto && a.type !== type && DELER[a.type].kat === 'gulv') return ok(d, a.id); }
      return { feil: type === 'bs_fundament' ? 'Her er det allerede gulv.' : 'Her er det allerede gulv (også i 2. etasje).' };
    }
    if (D.kat === 'tak') {
      let n = null;
      if (!auto) n = o.nivå + 1;
      else { const v = kanterRundt(slot.i, slot.j).flatMap(k => [0, 1].filter(e => vegg(M, k, e))); if (v.length) n = Math.max(...v) + 1;
        else for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let e = ETASJER; e >= 1 && n === null; e--) { const q = dekke(M, slot.i + di, slot.j + dj, e); if (q && DELER[q.type].kat === 'tak') n = e; } }
      if (n === null) return { feil: 'Taket må ligge på vegger (eller inntil et annet tak).' };
      if (n > ETASJER) return { feil: 'Høyst to etasjer.' };
      const d = ny(n), a = M.get(nøkkel(d)); if (!a) return ok(d);
      if (a.type === type) return { feil: 'Her er det allerede tak.' };
      return ok(d, a.id);
    }
    // vegger: dør/port erstatter veggen i 1. etasje, vindu den øverste hele veggen; ellers neste ledige etasje
    const her = [0, 1].map(e => M.get(nøkkel(ny(e))) || null);
    if (her[0] && DELER[her[0].type].kat === 'forsvar') return { feil: 'Her står det ' + DELER[her[0].type].navn.toLowerCase() + '.' };
    if (!auto) { const d = ny(o.nivå), a = her[o.nivå]; if (!a) return ok(d); if (a.type === type) return { feil: 'Her står det allerede en slik vegg.' }; return ok(d, a.id); }
    if ((D.v === 'dør' || D.v === 'port') && her[0] && DELER[her[0].type].v !== D.v) return ok(ny(0), her[0].id);
    if (D.v === 'vindu') for (const e of [1, 0]) if (her[e] && DELER[her[e].type].v === 'hel') return ok(ny(e), her[e].id);
    for (let e = 0; e < ETASJER; e++) if (!her[e]) return ok(ny(e));
    return { feil: 'Høyst to etasjer.' };
  }
  // Mange plasser på én gang: hver ny del regnes med for de neste (en ring med vegger og så tak). Gir [{ slot, d, bytt, feil }]
  function forslag(deler, type, slots, o = {}) {
    const alle = deler.slice(), M = indeks(alle), ut = [];
    for (const s of slots) { const r = plassering(alle, type, s, { ...o, M });
      if (!r.feil) { const d = { ...r.d, id: 'ny' + ut.length }; if (r.bytt) { const gml = alle.find(q => q.id === r.bytt); if (gml) M.delete(nøkkel(gml)); } alle.push(d); M.set(nøkkel(d), d); }
      ut.push({ slot: s, ...r }); }
    return ut;
  }
  // Ferdige hus (maler): gulv, vegger med dør og vinduer og tak, w × h ruter med døra midt på forsiden (rot: kvart omdreininger)
  const HUS = {
    hytte: { navn: 'Hytte 2 × 2', w: 2, h: 2, gulv: 'bs_tregulv', stoff: 'tre', tak: 'bs_tak_sal' },
    brakke: { navn: 'Brakke 3 × 4', w: 4, h: 3, gulv: 'bs_fundament', stoff: 'tre', tak: 'bs_tak_sal' },
    bunker: { navn: 'Betongbu 3 × 3', w: 3, h: 3, gulv: 'bs_fundament', stoff: 'betong', tak: 'bs_tak_flatt' },
  };
  function husDeler(mal, i0, j0, rotK = 0) {
    const M = HUS[mal]; if (!M) return []; const sv = rotK % 2 === 1, w = sv ? M.h : M.w, h = sv ? M.w : M.h, ut = [], vt = v => `bs_vegg_${M.stoff}${v === 'hel' ? '' : '_' + v}`;
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) ut.push({ type: M.gulv, i: i0 + i, j: j0 + j, a: null });
    // døra på siden rot peker mot (0 = sør/nede, 1 = øst, 2 = nord, 3 = vest), vinduer midt på de andre sidene
    const sider = [[...Array(w)].map((_, i) => ({ a: 'x', i: i0 + i, j: j0 })), [...Array(h)].map((_, j) => ({ a: 'y', i: i0 + w, j: j0 + j })),
      [...Array(w)].map((_, i) => ({ a: 'x', i: i0 + i, j: j0 + h })), [...Array(h)].map((_, j) => ({ a: 'y', i: i0, j: j0 + j }))];
    sider.forEach((s, k) => s.forEach((q, m) => { const midtpå = m === Math.floor((s.length - 1) / 2), v = k === rotK % 4 ? (midtpå ? 'dør' : 'hel') : (midtpå || (s.length > 3 && m === s.length - 1)) ? 'vindu' : 'hel'; ut.push({ type: vt(v), ...q }); }));
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) ut.push({ type: M.tak, i: i0 + i, j: j0 + j, a: null, ...(M.tak === 'bs_tak_sal' ? { r: w >= h ? 0 : 1 } : {}) });
    return ut;
  }
  function husForslag(deler, mal, i0, j0, rotK = 0) {
    const alle = deler.slice(), M = indeks(alle), ut = [];
    for (const q of husDeler(mal, i0, j0, rotK)) { const r = plassering(alle, q.type, q, { M, r: q.r, fast: true });
      if (!r.feil) { const d = { ...r.d, id: 'ny' + ut.length }; alle.push(d); M.set(nøkkel(d), d); }
      ut.push({ slot: q, type: q.type, ...r }); }
    return ut;
  }

  // ---------- lukkede rom ----------
  // Et rom: sammenhengende gulv i en etasje, vegger på alle kantene ut, og tak (eller gulvet over) over hver rute. Vegger inne deler rommet.
  // Bare ferdige deler teller (d.ferdig !== false). brukbart: dør i 1. etasje (2. etasje: trapp antas inne). senger: 1 per 8 m².
  function rom(deler) {
    const D0 = deler.filter(d => d.ferdig !== false), M = indeks(D0), ut = [], sett = new Set();
    for (const g of D0) {
      if (DELER[g.type].kat !== 'gulv') continue; const e = g.n, s0 = `${g.i},${g.j},${e}`; if (sett.has(s0)) continue;
      const celler = [], kø = [[g.i, g.j]]; let lukket = true, dører = 0, vinduer = 0, porter = 0;
      while (kø.length) { const [i, j] = kø.pop(), s = `${i},${j},${e}`; if (sett.has(s)) continue; sett.add(s); celler.push([i, j]);
        const over = dekke(M, i, j, e + 1); if (!over) lukket = false;
        for (const [k, [di, dj]] of kanterRundt(i, j).map((k, q) => [k, [[0, -1], [0, 1], [-1, 0], [1, 0]][q]])) {
          const w = vegg(M, k, e), nabo = dekke(M, i + di, j + dj, e), naboGulv = nabo && DELER[nabo.type].kat === 'gulv';
          if (w) { const v = DELER[w.type].v; if (v === 'dør') dører++; else if (v === 'vindu') vinduer++; else if (v === 'port') porter++; continue; }
          if (naboGulv) kø.push([i + di, j + dj]); else lukket = false; } }
      if (!lukket || celler.length > 200) continue;
      const areal = celler.length * G * G, brukbart = dører + porter > 0 || e > 0;
      const cx = celler.reduce((s, c) => s + c[0] + .5, 0) / celler.length, cy = celler.reduce((s, c) => s + c[1] + .5, 0) / celler.length;
      ut.push({ etasje: e, celler, ruter: celler.length, areal: Math.round(areal * 10) / 10, ci: cx, cj: cy, dører, vinduer, porter, brukbart,
        senger: brukbart ? Math.floor(areal / SENG_M2) : 0, navn: brukbart ? (areal >= 2 * SENG_M2 ? 'Egenbygd brakke' : 'Bod') : 'Rom uten dør' });
    }
    return ut;
  }

  // ---------- høyder (ingen svevende deler) ----------
  // h(x, y) -> moh. Delene som henger sammen (ruter og kanter som berører hverandre, ikke forsvar) får samme grunnhøyde: høyeste
  // terreng under 1. etasje + 0,25 m. Delene på bakken får en sokkel ned til laveste terreng − 0,3 m. Gir Map id -> { z0, ned }.
  const SOKKEL = .25;
  function høyder(o, deler, h) {
    const hus = deler.filter(d => DELER[d.type].kat !== 'forsvar'), M = indeks(hus), forelder = new Map();
    const finn = k => { while (forelder.get(k) !== k) { forelder.set(k, forelder.get(forelder.get(k))); k = forelder.get(k); } return k; };
    const node = k => { if (!forelder.has(k)) forelder.set(k, k); return k; }, slå = (a, b) => { const x = finn(node(a)), y = finn(node(b)); if (x !== y) forelder.set(x, y); };
    const harRute = new Set(hus.filter(d => !KANT(d)).map(d => `${d.i},${d.j}`));
    for (const d of hus) {
      // ruter med gulv/tak i samme høyde som ligger inntil hverandre hører til samme hus
      if (!KANT(d)) { slå('d' + d.id, `R${d.i},${d.j}`); for (const [di, dj] of [[1, 0], [0, 1]]) if (M.has(`c:${d.i + di}:${d.j + dj}:${d.n}`)) slå(`R${d.i},${d.j}`, `R${d.i + di},${d.j + dj}`); continue; }
      const [[ax, ay], [bx, by]] = d.a === 'x' ? [[d.i, d.j], [d.i + 1, d.j]] : [[d.i, d.j], [d.i, d.j + 1]];
      slå('d' + d.id, `V${ax},${ay}`); slå('d' + d.id, `V${bx},${by}`);
      for (const [i, j] of ruterVed(d)) if (harRute.has(`${i},${j}`)) slå('d' + d.id, `R${i},${j}`);
    }
    const pkt = d => (KANT(d) ? kantEnder(o, d) : [[0, 0], [1, 0], [1, 1], [0, 1]].map(([a, b]) => [o.ox + (d.i + a) * G, o.oy + (d.j + b) * G]));
    // grunnhøyden etter delene på bakken (bare når komponenten har noen)
    const topp = new Map(), toppAlle = new Map(), ut = new Map(), maks = (m, k, z) => m.set(k, Math.max(m.has(k) ? m.get(k) : -1e9, z));
    for (const d of hus) { const k = finn('d' + d.id); for (const [x, y] of pkt(d)) { const z = h(x, y); if (z === null || z !== z) continue; maks(toppAlle, k, z); if (d.n === 0) maks(topp, k, z); } }
    for (const d of hus) { const k = finn('d' + d.id), z0 = (topp.has(k) ? topp.get(k) : toppAlle.has(k) ? toppAlle.get(k) : 0) + SOKKEL;
      ut.set(d.id, { z0, ned: d.n === 0 ? Math.min(...pkt(d).map(([x, y]) => h(x, y))) - .3 : null }); }
    for (const d of deler) if (DELER[d.type].kat === 'forsvar') { const z = kantEnder(o, d).map(([x, y]) => h(x, y)); ut.set(d.id, { z0: Math.min(...z), ned: Math.min(...z) - .3, ender: z }); }
    return ut;
  }
  // Delen i et Leir-bygg (med plassen i rutenettet), eller null
  const fraBygg = (b, LB) => (b && DELER[b.type] && b.bs ? { id: b.id, type: b.type, i: b.bs.i, j: b.bs.j, a: b.bs.a || null, n: b.bs.n || 0, r: b.bs.r, ferdig: LB ? LB.virker(b) : true, igjen: b.igjen } : null);
  const fraLeir = (L, LB) => (L ? L.bygg.map(b => fraBygg(b, LB)).filter(Boolean) : []);
  // Sengeplassene i leiren får med de egenbygde brakkene (Leir.plasser leser byggene; rommene legges til)
  if (Leir && !Leir.plasser.byggesett) { const før = Leir.plasser; Leir.plasser = L => før(L) + rom(fraLeir(L, Leir)).reduce((s, r) => s + r.senger, 0); Leir.plasser.byggesett = true; }

  const api = { G, H, ETASJER, SOKKEL, DELER, HUS, erDel, registrer, celle, midt, kantEnder, kantVed, hjørneVed, rad, nøkkel, indeks, støttet, plassering, forslag,
    husDeler, husForslag, rom, høyder, fraBygg, fraLeir, KANT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.ByggesettRegler = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
