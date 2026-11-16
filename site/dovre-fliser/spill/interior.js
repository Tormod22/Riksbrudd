/* Interiør: regler uten DOM (Node: require('./interior'); nettleser: globalThis.Interior).
 * Brukeren 15. nov: «Alle bygg skal ha interiør, og en skal kunne gå inn i dem.»
 * plan(P, info) lager romplanen for ett bygg: P = omrisset (mot klokka, meter), info = { i (byggets nummer = frø), kl (klassen fra
 * hus3d: hus, hytte, leil, kontor, skole, sykehus, butikk, industri, lager, låve, uthus, kirke, hangar, terminal), h (høyde),
 * dør: { x, y, ux, uy, w } (midt i døra på ytterveggen, veggens retning, bredde) }. Samme bygg gir alltid samme plan.
 * Rommene deles langs byggets lengste side (to-deling til rommene er små nok), hver skillevegg får én døråpning (så alle rom henger
 * sammen), veggene klippes mot omrisset, og møblene settes etter hva slags rom det er – aldri i en døråpning eller gjennom en vegg.
 * blokkert(plan, x, y) er kollisjonen når du går: yttervegger (unntatt inngangen), skillevegger og store møbler.
 * Bare første etasje. Rommene, målene og møbleringen er Claudes forslag.
 */
(function (rot) {
  'use strict';
  const VEGG = .12;      // halv veggtykkelse for kollisjon (m)
  const DØRÅPNING = .95; // bredden på åpningene i skilleveggene
  // per klasse: største rom (m²) før det deles, minste romside (m), takhøyde (0 = opp til taket, høyst 7 m), hall = ingen romdeling
  // (bakrom = andel av lengden som skilles ut i enden lengst fra inngangen)
  const KLASSE = {
    hus: { maks: 16, min: 2.4, tak: 2.5 }, hytte: { maks: 14, min: 2.2, tak: 2.4 }, leil: { maks: 20, min: 2.6, tak: 2.6 },
    kontor: { maks: 22, min: 2.8, tak: 2.8 }, skole: { maks: 55, min: 4.5, tak: 3 }, sykehus: { maks: 24, min: 3, tak: 2.9 },
    butikk: { hall: true, bakrom: .2, tak: 3.4 }, industri: { hall: true, bakrom: .18, tak: 0 }, lager: { hall: true, bakrom: .12, tak: 0 },
    låve: { hall: true, tak: 0 }, uthus: { hall: true, tak: 2.3 }, kirke: { hall: true, tak: 0 }, hangar: { hall: true, tak: 0 },
    terminal: { hall: true, bakrom: .15, tak: 0 },
    // byggene i spillerens egen leir (spill/interior3d.js LEIRBYGG) – ikke bygg fra kartet
    brakke: { hall: true, tak: 2.5, leir: true }, kontrollrom: { hall: true, tak: 2.6, leir: true }, storkjøkken: { hall: true, tak: 2.5, leir: true },
  };
  // møbler: [bredde langs veggen, dybde, høyde, sperrer (du kan ikke gå gjennom)]
  const MØBLER = {
    sofa: [2, .9, .8, 1], salongbord: [1.1, .6, .42, 0], tvbenk: [1.5, .42, .5, 1], bokhylle: [1, .32, 1.9, 1], lenestol: [.85, .85, .8, 1],
    spisebord: [1.5, .9, .75, 1], stol: [.45, .45, .85, 0], plante: [.4, .4, 1.1, 0], teppe: [2.2, 1.5, .02, 0],
    kjøkkenbenk: [2.4, .62, .9, 1], kjøleskap: [.62, .62, 1.85, 1], komfyr: [.6, .62, .9, 1],
    seng: [1, 2, .5, 1], dobbeltseng: [1.7, 2.05, .5, 1], nattbord: [.45, .4, .5, 0], skap: [1.2, .58, 2, 1],
    toalett: [.4, .65, .45, 1], vask: [.6, .45, .85, 1], dusj: [.9, .9, 2, 0],
    skohylle: [.9, .3, .45, 0], knagger: [1, .1, 1.7, 0],
    pult: [1.4, .7, .74, 1], kontorstol: [.5, .5, .95, 0], arkivskap: [.9, .45, 1.3, 1], skranke: [2.4, .7, 1.1, 1], benk: [1.6, .45, .45, 1],
    skolepult: [.65, .5, .72, 1], kateter: [1.5, .7, .76, 1], tavle: [2.6, .06, 1.2, 0],
    sykeseng: [.95, 2.05, .6, 1],
    reol: [2.4, .8, 1.8, 1], kasse: [1.6, .8, .95, 1], kjøledisk: [2.4, .9, 1.3, 1],
    pall: [1.2, .8, 1.1, 1], pallereol: [2.8, 1.1, 4, 1], arbeidsbenk: [2, .7, .9, 1], maskin: [1.8, 1.2, 1.6, 1], tønne: [.6, .6, .9, 1],
    høyball: [1.3, 1.3, 1.2, 1], bås: [2.2, 2.6, 1.2, 1], traktor: [2, 3.6, 2.4, 1],
    bil: [1.8, 4.3, 1.45, 1], vedstabel: [1.8, .45, 1.1, 1], hylle: [1.2, .4, 1.8, 1],
    kirkebenk: [3, .5, .9, 1], alter: [2, .8, 1, 1], prekestol: [.9, .9, 1.4, 1],
    fly: [9, 7, 2.6, 1], verktøyvogn: [.9, .5, .9, 1], seterad: [2.4, .6, .85, 1],
    køyeseng: [.95, 2.05, 1.75, 1], ovn: [.6, .6, 1, 1], kartbord: [2.4, 1.4, .9, 1], radio: [1.2, .5, 1.3, 1], langbord: [2.6, .9, .75, 1],
  };
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  function inni(P, X, Y) { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if ((yi > Y) !== (yj > Y) && X < (xj - xi) * (Y - yi) / (yj - yi) + xi) inn = !inn; } return inn; }
  function avstSeg(x, y, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0; return Math.hypot(x - ax - dx * t, y - ay - dy * t); }
  const avstKant = (P, x, y) => { let d = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; d = Math.min(d, avstSeg(x, y, a[0], a[1], b[0], b[1])); } return d; };

  function plan(P, info) {
    const kl = KLASSE[info.kl] ? info.kl : 'hus', K = KLASSE[kl], frø = info.i | 0; let teller = 0; const tilf = () => hash(frø, ++teller);
    // aksene: u langs byggets lengste side, v på tvers
    let best = 0, ux = 1, uy = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > best) { best = l; ux = (b[0] - a[0]) / l; uy = (b[1] - a[1]) / l; } }
    const vx = -uy, vy = ux, tilUV = (x, y) => [x * ux + y * uy, x * vx + y * vy], tilXY = (u, v) => [u * ux + v * vx, u * uy + v * vy];
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, areal = 0;
    for (let i = 0; i < P.length; i++) { const [x, y] = P[i], [bx, by] = P[(i + 1) % P.length], [u, v] = tilUV(x, y); areal += x * by - bx * y;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    areal = Math.abs(areal) / 2;
    const iUV = (u, v) => { const [x, y] = tilXY(u, v); return inni(P, x, y); };
    // inngangen: punktet rett innenfor døra, og åpningen i ytterveggen
    const d = info.dør, nx = d.uy, ny = -d.ux, w = Math.max(1.1, d.w), inn = [d.x - nx * .7, d.y - ny * .7];
    const åpninger = [tilUV(inn[0], inn[1])], vegger = [], dører = [];
    // en skillevegg langs en linje i uv: klippes mot omrisset, får én døråpning i det lengste stykket
    const skille = (langsU, fast, a, b) => {
      const pkt = (t, side = 0) => langsU ? [t, fast + side] : [fast + side, t], biter = [], løp = []; let start = null, ds = null;
      // veggen står der linja er inne i omrisset; døra må ha rom på begge sider (0,6 m ut til hver side er også inne)
      for (let t = a; t <= b + 1e-6; t += .2) { const tt = Math.min(b, t), inne = iUV(...pkt(tt)), begge = inne && iUV(...pkt(tt, .6)) && iUV(...pkt(tt, -.6));
        if (inne && start === null) start = tt; if (!inne && start !== null) { biter.push([start, t - .2]); start = null; }
        if (begge && ds === null) ds = tt; if (!begge && ds !== null) { løp.push([ds, t - .2]); ds = null; } }
      if (start !== null) biter.push([start, b]); if (ds !== null) løp.push([ds, b]);
      let L = null; for (const l of løp) if (!L || l[1] - l[0] > L[1] - L[0]) L = l;
      let d0 = null, d1 = null;
      if (L) { const len = L[1] - L[0];
        if (len < DØRÅPNING + .6) { d0 = L[0]; d1 = L[1]; } else { const m = L[0] + .3 + DØRÅPNING / 2 + tilf() * (len - .6 - DØRÅPNING); d0 = m - DØRÅPNING / 2; d1 = m + DØRÅPNING / 2; }
        // døråpningen: midten, veggens retning og bredden
        const m = (d0 + d1) / 2, ret = langsU ? tilXY(1, 0) : tilXY(0, 1); åpninger.push(pkt(m)); dører.push([...tilXY(...pkt(m)), ret[0], ret[1], d1 - d0]); }
      const legg = (p, q) => { if (q - p < .15) return; const A = tilXY(...pkt(p)), B = tilXY(...pkt(q)); vegger.push({ ax: A[0], ay: A[1], bx: B[0], by: B[1] }); };
      for (const s of biter) { if (d0 === null || d1 <= s[0] || d0 >= s[1]) legg(s[0], s[1]); else { legg(s[0], d0); legg(d1, s[1]); } }
    };
    // et skille i fast = uS (langs v) er lov når ingen åpning ligger der skilleveggen møter romveggene
    const lov = (langsU, fast, a, b) => !åpninger.some(([ou, ov]) => { const o = langsU ? [ov, ou] : [ou, ov]; return Math.abs(o[0] - fast) < 1 && (Math.abs(o[1] - a) < .5 || Math.abs(o[1] - b) < .5 || (o[1] > a && o[1] < b && Math.abs(o[0] - fast) < .45)); });
    const rom = [];
    const del = (r, dybde) => {
      const lu = r.u1 - r.u0, lv = r.v1 - r.v0;
      if (K.hall || lu * lv <= K.maks || dybde > 7 || Math.max(lu, lv) < 2 * K.min) { rom.push(r); return; }
      const iU = lu >= lv, len = iU ? lu : lv, lo = iU ? r.u0 : r.v0;
      for (let k = 0; k < 8; k++) {
        const s = lo + Math.max(K.min, Math.min(len - K.min, len * (.36 + .28 * tilf())));
        if (!lov(!iU, s, iU ? r.v0 : r.u0, iU ? r.v1 : r.u1)) continue;
        skille(!iU, s, iU ? r.v0 : r.u0, iU ? r.v1 : r.u1);
        if (iU) { del({ u0: r.u0, u1: s, v0: r.v0, v1: r.v1 }, dybde + 1); del({ u0: s, u1: r.u1, v0: r.v0, v1: r.v1 }, dybde + 1); }
        else { del({ u0: r.u0, u1: r.u1, v0: r.v0, v1: s }, dybde + 1); del({ u0: r.u0, u1: r.u1, v0: s, v1: r.v1 }, dybde + 1); }
        return;
      }
      rom.push(r);
    };
    const hele = { u0, u1, v0, v1 };
    if (K.hall && K.bakrom && u1 - u0 > 9 && areal > 60) {
      // hall med bakrom i enden lengst fra inngangen
      const iu = åpninger[0][0], bak = (u1 - u0) * K.bakrom, s = iu - u0 < u1 - iu ? u1 - Math.max(2.6, bak) : u0 + Math.max(2.6, bak);
      skille(false, s, v0, v1);
      const a = { u0, u1: s, v0, v1 }, b = { u0: s, u1, v0, v1 }, innA = iu < s;
      (innA ? b : a).bak = true; rom.push(a, b);
    } else del(hele, 0);
    // rommenes mål og hvor mye av dem som ligger inne i omrisset (rom utenfor et skjevt omriss brukes ikke)
    for (const r of rom) { let inne = 0, n = 0; for (let a = .5; a < 4; a++) for (let b = .5; b < 4; b++) { n++; if (iUV(r.u0 + (r.u1 - r.u0) * a / 4, r.v0 + (r.v1 - r.v0) * b / 4)) inne++; }
      r.andel = inne / n; r.areal = (r.u1 - r.u0) * (r.v1 - r.v0) * r.andel; }
    const [iu, iv] = åpninger[0], innRom = rom.find(r => iu >= r.u0 && iu <= r.u1 && iv >= r.v0 && iv <= r.v1) || rom[0];
    roller(kl, rom, innRom, info, w);
    // ytterveggene (stykker), med åpning ved inngangen
    const ytre = [];
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
      const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L, t = (d.x - a[0]) * ex + (d.y - a[1]) * ey, av = Math.abs((d.x - a[0]) * ey - (d.y - a[1]) * ex);
      if (av < .3 && t > -.01 && t < L + .01) { const p = Math.max(0, t - w / 2), q = Math.min(L, t + w / 2);
        if (p > .05) ytre.push({ ax: a[0], ay: a[1], bx: a[0] + ex * p, by: a[1] + ey * p }); if (L - q > .05) ytre.push({ ax: a[0] + ex * q, ay: a[1] + ey * q, bx: b[0], by: b[1] }); }
      else ytre.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1] }); }
    const pl = { P, kl, i: frø, areal, bb: [x0, y0, x1, y1], akse: { ux, uy, vx, vy }, rom, vegger, ytre, dører, møbler: [],
      inngang: { x: d.x, y: d.y, nx, ny, ux: d.ux, uy: d.uy, w, inn }, tak: K.tak || Math.max(2.4, Math.min(7, (info.h || 6) - .6)), gulv: 0 };
    møbler(pl, tilXY, åpninger, tilf);
    for (const r of rom) delete r.veier;
    return pl;
  }

  // Hva rommene brukes til
  function roller(kl, rom, innRom, info, w) {
    const andre = rom.filter(r => r !== innRom && r.andel > .3).sort((a, b) => b.areal - a.areal);
    for (const r of rom) r.rolle = r.andel > .3 ? 'tomt' : 'utenfor';
    if (kl === 'hus' || kl === 'hytte' || kl === 'leil') {
      if (!andre.length) innRom.rolle = 'allrom';
      else if (andre.length === 1) { innRom.rolle = 'allrom'; andre[0].rolle = 'soverom'; }
      else { innRom.rolle = innRom.areal > 15 ? 'stue' : 'gang'; const L = andre.slice(); if (innRom.rolle !== 'stue') L.shift().rolle = 'stue';
        if (L.length) L.shift().rolle = 'kjøkken'; if (L.length >= 2) L.pop().rolle = 'bad'; for (const r of L) r.rolle = 'soverom'; }
    } else if (kl === 'kontor') { innRom.rolle = 'resepsjon'; for (const r of andre) r.rolle = 'kontor'; }
    else if (kl === 'skole') { innRom.rolle = 'gang'; for (const r of andre) r.rolle = r.areal > 22 ? 'klasserom' : 'kontor'; }
    else if (kl === 'sykehus') { innRom.rolle = 'resepsjon'; for (const r of andre) r.rolle = 'sykerom'; }
    else if (kl === 'butikk') { innRom.rolle = 'butikk'; for (const r of andre) r.rolle = 'lager'; }
    else if (kl === 'industri') { innRom.rolle = 'verksted'; for (const r of andre) r.rolle = 'lager'; }
    else if (kl === 'lager') { innRom.rolle = 'lagerhall'; for (const r of andre) r.rolle = 'kontor'; }
    else if (kl === 'låve') innRom.rolle = 'låve';
    else if (kl === 'uthus') innRom.rolle = w >= 2.2 && innRom.areal > 14 ? 'garasje' : 'bod';
    else if (kl === 'kirke') innRom.rolle = 'kirke';
    else if (kl === 'hangar') innRom.rolle = 'hangar';
    else if (kl === 'terminal') { innRom.rolle = 'terminal'; for (const r of andre) r.rolle = 'kontor'; }
    else if (kl === 'brakke' || kl === 'kontrollrom' || kl === 'storkjøkken') innRom.rolle = kl;
  }

  // Møblene. Et møbel står med ryggen mot en romvegg (side 0: v0, 1: u1, 2: v1, 3: u0) eller fritt i rommet; a = retningen
  // møbelets bredde går i, og fronten vender inn i rommet.
  function møbler(pl, tilXY, åpninger, tilf) {
    const { ux, uy, vx, vy } = pl.akse, P = pl.P, satt = [];
    // rektangel i uv: midt (cu, cv), halv bredde langs (du, dv-retning), gyldig = inne i rommet og omrisset, ikke i en åpning, ikke oppå noe
    const prøv = (r, type, cu, cv, langsU, snu, o) => { o = o || {};
      const [b0, d0, h, sperrer] = MØBLER[type], b = o.b || b0, dd = o.d || d0, hu = (langsU ? b : dd) / 2, hv = (langsU ? dd : b) / 2, m = o.margin === undefined ? .06 : o.margin;
      if (cu - hu < r.u0 + m || cu + hu > r.u1 - m || cv - hv < r.v0 + m || cv + hv > r.v1 - m) return null;
      for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const [x, y] = tilXY(cu + su * hu, cv + sv * hv); if (!inni(P, x, y) || avstKant(P, x, y) < .1) return null; }
      const fri = o.fri === undefined ? .75 : o.fri;
      for (const [ou, ov] of åpninger) if (Math.abs(ou - cu) < hu + fri && Math.abs(ov - cv) < hv + fri) return null;
      // store møbler står aldri i gangveien fra en døråpning til rommets midte (ellers kan to møbler stenge et rom)
      if (sperrer && !o.iVeien) for (const [a0, b0, a1, b1] of r.veier || []) if (cu + hu > a0 && cu - hu < a1 && cv + hv > b0 && cv - hv < b1) return null;
      const luft = o.luft === undefined ? .08 : o.luft;
      for (const s of satt) if (!(o.på && s === o.på) && Math.abs(s.cu - cu) < s.hu + hu + luft && Math.abs(s.cv - cv) < s.hv + hv + luft) return null;
      const [x, y] = tilXY(cu, cv), a = Math.atan2(langsU ? uy : vy, langsU ? ux : vx) + (snu ? Math.PI : 0);
      // (i rom som er skåret av omrisset, stemmer ikke gangveiene: der sperrer ikke møblene)
      const it = { type, x, y, a, b, d: dd, h: o.h || h, sperrer: !!sperrer && r.andel > .97, cu, cv, hu, hv, f: tilf() }; satt.push(it); pl.møbler.push(it); return it;
    };
    // inntil en vegg: side 0–3, t = plass langs veggen (0–1)
    const vegg = (r, type, side, t, o) => { const [b0, d0] = MØBLER[type], b = (o && o.b) || b0, d = (o && o.d) || d0, lu = r.u1 - r.u0, lv = r.v1 - r.v0, k = .16 + d / 2;
      if (side === 0) return prøv(r, type, r.u0 + b / 2 + .1 + t * Math.max(0, lu - b - .2), r.v0 + k, true, false, o);
      if (side === 2) return prøv(r, type, r.u0 + b / 2 + .1 + t * Math.max(0, lu - b - .2), r.v1 - k, true, true, o);
      if (side === 1) return prøv(r, type, r.u1 - k, r.v0 + b / 2 + .1 + t * Math.max(0, lv - b - .2), false, false, o);
      return prøv(r, type, r.u0 + k, r.v0 + b / 2 + .1 + t * Math.max(0, lv - b - .2), false, true, o); };
    // prøv veggene i en fast, tilfeldig rekkefølge og noen plasser langs hver
    const etSted = (r, type, o, sider) => { const s0 = Math.floor(tilf() * 4), L = sider || [0, 1, 2, 3];
      for (let k = 0; k < L.length; k++) for (const t of [.5, .15, .85, 0, 1, .3, .7]) { const it = vegg(r, type, L[(k + s0) % L.length], t, o); if (it) { it.side = L[(k + s0) % L.length]; return it; } } return null; };
    // foran et møbel (inn i rommet), avstand fra fronten
    const foran = (r, it, type, avst, o) => { const [, d0] = MØBLER[type], dd = (o && o.d) || d0, s = it.side, q = it[s === 0 || s === 2 ? 'hv' : 'hu'] + avst + dd / 2;
      const cu = it.cu + (s === 3 ? q : s === 1 ? -q : 0), cv = it.cv + (s === 0 ? q : s === 2 ? -q : 0); const ny = prøv(r, type, cu, cv, s === 0 || s === 2, s === 0 || s === 3, o); if (ny) ny.side = s; return ny; };
    // rader i et rutenett: u-retningen er radene; du/dv = avstand mellom midtene
    const rutenett = (r, type, o) => { const [b0, d0] = MØBLER[type], mU = o.mU || 1.2, mV = o.mV || 1.2, ut = [];
      for (let cv = r.v0 + mV + (o.langsU ? d0 : b0) / 2; cv < r.v1 - mV; cv += o.dv) for (let cu = r.u0 + mU + (o.langsU ? b0 : d0) / 2; cu < r.u1 - mU; cu += o.du) {
        if (o.hopp && o.hopp(cu, cv)) continue; if (ut.length >= (o.maks || 60)) return ut; const it = prøv(r, type, cu, cv, !!o.langsU, !!o.snu, o); if (it) ut.push(it); }
      return ut; };
    const bord = (r, n) => { const it = prøv(r, 'spisebord', (r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, r.u1 - r.u0 >= r.v1 - r.v0, false) || prøv(r, 'spisebord', r.u0 + (r.u1 - r.u0) * .35, r.v0 + (r.v1 - r.v0) * .6, true, false);
      if (!it) return; const lu = it.hu > it.hv;
      for (let k = 0; k < n; k++) { const s = k % 2 ? 1 : -1, t = n > 2 ? (k < 2 ? -.4 : .4) : 0; prøv(r, 'stol', it.cu + (lu ? t : s * (it.hu + .32)), it.cv + (lu ? s * (it.hv + .32) : t), lu, lu ? s > 0 : s < 0, { luft: -.2, fri: .3 }); } };
    // gangveiene: fra hver åpning i rommet rett inn fra veggen og så bort til rommets midte, 0,8 m brede
    for (const r of pl.rom) { const cu = (r.u0 + r.u1) / 2, cv = (r.v0 + r.v1) / 2, q = .4; r.veier = [];
      for (const [ou, ov] of åpninger) { if (ou < r.u0 - .3 || ou > r.u1 + .3 || ov < r.v0 - .3 || ov > r.v1 + .3) continue;
        const vFørst = Math.abs(ov - r.v0) < .8 || Math.abs(ov - r.v1) < .8, bo = (a0, b0, a1, b1) => r.veier.push([Math.min(a0, a1) - q, Math.min(b0, b1) - q, Math.max(a0, a1) + q, Math.max(b0, b1) + q]);
        if (vFørst) { bo(ou, ov, ou, cv); bo(ou, cv, cu, cv); } else { bo(ou, ov, cu, ov); bo(cu, ov, cu, cv); } } }
    for (const r of pl.rom) {
      const A = r.areal, lu = r.u1 - r.u0, lv = r.v1 - r.v0, lang = lu >= lv ? [0, 2] : [1, 3], kort = lu >= lv ? [1, 3] : [0, 2];
      switch (r.rolle) {
        case 'stue': case 'allrom': {
          const s = etSted(r, 'sofa', null, lang) || etSted(r, 'sofa'); if (s) { foran(r, s, 'salongbord', .45, { fri: .3 }); }
          etSted(r, 'tvbenk', null, s ? [(s.side + 2) % 4] : null) || etSted(r, 'tvbenk'); etSted(r, 'bokhylle'); if (A > 14) etSted(r, 'lenestol'); etSted(r, 'plante', { fri: .5 });
          if (r.rolle === 'allrom') { const k = etSted(r, 'kjøkkenbenk', { b: Math.min(2.4, Math.max(1.2, Math.min(lu, lv) - 1)) }); if (k) etSted(r, 'kjøleskap'); if (A > 16) bord(r, 2); if (pl.rom.length === 1) etSted(r, 'seng'); }
          else if (A > 20) bord(r, 4);
          break; }
        case 'kjøkken': { etSted(r, 'kjøkkenbenk', { b: Math.min(3, Math.max(1.4, Math.max(lu, lv) - 1.2)) }, lang) || etSted(r, 'kjøkkenbenk', { b: 1.4 }); etSted(r, 'komfyr'); etSted(r, 'kjøleskap'); if (A > 8) bord(r, A > 12 ? 4 : 2); break; }
        case 'soverom': { const s = etSted(r, A > 9 ? 'dobbeltseng' : 'seng') || etSted(r, 'seng'); if (s) { const lU = s.side === 0 || s.side === 2;
          prøv(r, 'nattbord', s.cu + (lU ? s.hu + .3 : 0), s.cv + (lU ? 0 : s.hv + .3), lU, s.side === 2 || s.side === 3, { fri: .3 }); }
          etSted(r, 'skap'); if (A > 11) etSted(r, 'pult'); break; }
        case 'bad': etSted(r, 'toalett', { fri: .5 }); etSted(r, 'vask', { fri: .5 }); etSted(r, 'dusj', { fri: .5 }); break;
        case 'gang': etSted(r, 'skohylle', { fri: .6 }); etSted(r, 'knagger', { fri: .5 }); if (A > 9) etSted(r, 'skap'); if (pl.kl === 'skole') { etSted(r, 'benk'); etSted(r, 'benk'); } break;
        case 'kontor': { const n = Math.max(1, Math.min(6, Math.floor(A / 7))); for (let k = 0; k < n; k++) { const p = etSted(r, 'pult'); if (p) foran(r, p, 'kontorstol', .1, { fri: .3, luft: -.1 }); } etSted(r, 'arkivskap'); etSted(r, 'bokhylle'); etSted(r, 'plante', { fri: .5 }); break; }
        case 'resepsjon': { const s = etSted(r, 'skranke', null, kort) || etSted(r, 'skranke'); if (s) foran(r, s, 'kontorstol', -1.3, { fri: .2, luft: -1 }); etSted(r, 'benk'); etSted(r, 'benk'); etSted(r, 'plante', { fri: .5 }); etSted(r, 'plante', { fri: .5 }); break; }
        case 'klasserom': { const t = etSted(r, 'tavle', { fri: .3 }, kort); etSted(r, 'kateter', null, t ? [t.side] : kort);
          rutenett(r, 'skolepult', { du: 1.5, dv: 1.3, mU: lu >= lv ? 2.4 : 1, mV: lu >= lv ? 1 : 2.4, langsU: lu < lv, maks: 24 }); etSted(r, 'bokhylle'); break; }
        case 'sykerom': { const s = etSted(r, 'sykeseng'); if (s) { const lU = s.side === 0 || s.side === 2; prøv(r, 'nattbord', s.cu + (lU ? s.hu + .3 : 0), s.cv + (lU ? 0 : s.hv + .3), lU, false, { fri: .3 }); }
          if (A > 14) etSted(r, 'sykeseng'); etSted(r, 'stol', { fri: .4 }); etSted(r, 'vask', { fri: .5 }); break; }
        case 'butikk': { const k = etSted(r, 'kasse', { fri: 1.2 }); rutenett(r, 'reol', { du: lu >= lv ? 3 : 2.6, dv: lu >= lv ? 2.6 : 3, mU: 1.6, mV: 1.6, langsU: lu >= lv, fri: 1.6, maks: 40 });
          etSted(r, 'kjøledisk', null, lang); etSted(r, 'kjøledisk', null, lang); if (!k) etSted(r, 'kasse'); break; }
        case 'lager': { for (let k = 0; k < Math.min(10, Math.floor(A / 5)); k++) etSted(r, k % 3 ? 'pall' : 'hylle'); break; }
        case 'verksted': { for (let k = 0; k < Math.min(6, 1 + Math.floor(A / 60)); k++) etSted(r, 'arbeidsbenk');
          rutenett(r, 'maskin', { du: 7, dv: 6, mU: 3, mV: 3, langsU: lu >= lv, fri: 2, maks: 12 }); for (let k = 0; k < Math.min(8, Math.floor(A / 40)); k++) etSted(r, k % 2 ? 'pall' : 'tønne'); break; }
        case 'lagerhall': { const høy = pl.tak > 4.6; const satt = rutenett(r, høy ? 'pallereol' : 'pall', { du: lu >= lv ? 3 : 4.2, dv: lu >= lv ? 4.2 : 3, mU: 2.5, mV: 2.5, langsU: lu >= lv, fri: 2.5, maks: 60, h: høy ? Math.min(4, pl.tak - .6) : undefined });
          // små lager (telt, boder): paller og hyller langs veggene i stedet
          if (!satt.length) for (let k = 0; k < Math.min(8, Math.floor(A / 4)); k++) etSted(r, k % 3 ? 'pall' : 'hylle'); break; }
        case 'låve': { rutenett(r, 'høyball', { du: 1.45, dv: 1.45, mU: 1, mV: 1, maks: 14, fri: 2, hopp: (cu, cv) => cu > r.u0 + lu * .45 }); for (let k = 0; k < Math.min(4, Math.floor(A / 40)); k++) etSted(r, 'bås', { fri: 1.5 });
          if (A > 90) prøv(r, 'traktor', r.u0 + lu * .7, (r.v0 + r.v1) / 2, lu < lv, false, { fri: 1.5 }); etSted(r, 'tønne'); break; }
        case 'garasje': { const i = pl.inngang, cu = i.inn[0] * ux + i.inn[1] * uy, cv = i.inn[0] * vx + i.inn[1] * vy, tvers = Math.abs(i.nx * ux + i.ny * uy) > .7;
          // bilen står rett innenfor porten, med nesa innover
          prøv(r, 'bil', tvers ? cu - Math.sign(i.nx * ux + i.ny * uy) * 2.6 : cu, tvers ? cv : cv - Math.sign(i.nx * vx + i.ny * vy) * 2.6, !tvers, false, { fri: 0, margin: .2 });
          etSted(r, 'hylle'); etSted(r, 'arbeidsbenk', { b: 1.4 }); break; }
        case 'bod': etSted(r, 'hylle'); etSted(r, 'vedstabel'); if (A > 6) etSted(r, 'tønne'); break;
        case 'kirke': { const iU = lu >= lv, i = pl.inngang, cu = i.inn[0] * ux + i.inn[1] * uy, cv = i.inn[0] * vx + i.inn[1] * vy;
          // alteret i enden lengst fra inngangen, benkerader på hver side av midtgangen
          const fjern = iU ? (cu - r.u0 < r.u1 - cu ? 1 : 3) : (cv - r.v0 < r.v1 - cv ? 2 : 0); vegg(r, 'alter', fjern, .5, { fri: .5 });
          const midt = iU ? (r.v0 + r.v1) / 2 : (r.u0 + r.u1) / 2, bb = Math.max(1.4, Math.min(3.4, (iU ? lv : lu) / 2 - 1.5));
          rutenett(r, 'kirkebenk', { b: bb, du: iU ? 1.25 : bb + 1.4, dv: iU ? bb + 1.4 : 1.25, mU: iU ? 3.5 : 1, mV: iU ? 1 : 3.5, langsU: !iU, snu: fjern === 1 || fjern === 2, maks: 44, fri: .9,
            hopp: (a, b) => Math.abs((iU ? b : a) - midt) < .75 }); etSted(r, 'prekestol', { fri: .6 }, [fjern]); break; }
        case 'hangar': { if (lu > 14 && lv > 12) prøv(r, 'fly', (r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, lu >= lv, false, { fri: 2 }); for (let k = 0; k < 4; k++) etSted(r, k % 2 ? 'verktøyvogn' : 'arbeidsbenk'); break; }
        // leirens bygg: brakka har køyesenger langs langveggene, kontrollrommet kartbord og radio, kjøkkenet benker og langbord
        case 'brakke': { for (let k = 0; k < Math.min(12, Math.floor(A / 6)); k++) etSted(r, 'køyeseng', { fri: .9 }, lang) || etSted(r, 'køyeseng', { fri: .9 }); etSted(r, 'ovn', { fri: .8 }, kort); etSted(r, 'skap'); etSted(r, 'skap'); etSted(r, 'knagger', { fri: .5 }); break; }
        case 'kontrollrom': { prøv(r, 'kartbord', (r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, lu >= lv, false, { iVeien: true, fri: 1.4 });
          for (let k = 0; k < 6; k++) { const p = etSted(r, 'pult'); if (p) foran(r, p, 'kontorstol', .1, { fri: .3, luft: -.1 }); } etSted(r, 'radio'); etSted(r, 'radio'); etSted(r, 'tavle', { fri: .3 }); etSted(r, 'arkivskap'); break; }
        case 'storkjøkken': { etSted(r, 'kjøkkenbenk', { b: Math.min(3, Math.max(lu, lv) - 2) }, lang); etSted(r, 'komfyr'); etSted(r, 'komfyr'); etSted(r, 'kjøleskap'); etSted(r, 'kjøleskap'); etSted(r, 'hylle');
          rutenett(r, 'langbord', { du: lu >= lv ? 3.4 : 2.4, dv: lu >= lv ? 2.4 : 3.4, mU: 1.6, mV: 1.6, langsU: lu >= lv, maks: 3, fri: 1.2 }); break; }
        case 'terminal': { rutenett(r, 'seterad', { du: lu >= lv ? 3.4 : 2.2, dv: lu >= lv ? 2.2 : 3.4, mU: 3, mV: 3, langsU: lu >= lv, maks: 30, fri: 2 }); etSted(r, 'skranke'); etSted(r, 'skranke'); break; }
      }
    }
  }

  // Kollisjon: sant når (x, y) er i en vegg eller et stort møbel. Utenfor omrisset sperrer bare selve ytterveggen.
  function blokkert(pl, x, y) {
    const b = pl.bb; if (x < b[0] - .5 || x > b[2] + .5 || y < b[1] - .5 || y > b[3] + .5) return false;
    for (const s of pl.ytre) if (avstSeg(x, y, s.ax, s.ay, s.bx, s.by) < VEGG) return true;
    if (!inni(pl.P, x, y)) return false;
    for (const s of pl.vegger) if (avstSeg(x, y, s.ax, s.ay, s.bx, s.by) < VEGG) return true;
    for (const m of pl.møbler) { if (!m.sperrer) continue; const dx = x - m.x, dy = y - m.y, c = Math.cos(m.a), si = Math.sin(m.a); if (Math.abs(dx * c + dy * si) < m.b / 2 && Math.abs(-dx * si + dy * c) < m.d / 2) return true; }
    return false;
  }
  // Høyden du står på: gulvet inne, og en trapp/rampe de siste pl.trapp (1,5 m når den ikke er satt) meterne foran døra (terreng(x, y) = bakken). null = vanlig terreng.
  function høyde(pl, x, y, terreng) {
    const b = pl.bb; if (x < b[0] - 2 || x > b[2] + 2 || y < b[1] - 2 || y > b[3] + 2) return null;
    if (inni(pl.P, x, y)) return pl.gulv;
    const i = pl.inngang, dx = x - i.x, dy = y - i.y, ut = dx * i.nx + dy * i.ny, langs = Math.abs(dx * i.ux + dy * i.uy);
    const L = pl.trapp || 1.5;
    if (ut >= -.3 && ut < L && langs < i.w / 2 + .15) { const t = Math.max(0, ut) / L; return pl.gulv * (1 - t) + terreng(x, y) * t; }
    return null;
  }
  // På trappa foran døra eller i selve døråpningen
  function påTrapp(pl, x, y) { const i = pl.inngang, dx = x - i.x, dy = y - i.y, ut = dx * i.nx + dy * i.ny; return ut >= -.8 && ut < (pl.trapp || 1.5) + .3 && Math.abs(dx * i.ux + dy * i.uy) < i.w / 2 + .15; }
  const api = { KLASSE, MØBLER, VEGG, plan, blokkert, høyde, påTrapp, inni, avstSeg, avstKant };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Interior = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
