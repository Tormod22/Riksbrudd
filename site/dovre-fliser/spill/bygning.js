/* Bygning: ÉN modell for alle bygg (fase B0 i docs/plan-selskap-okonomi.md, kapittel 5). Regler uten DOM.
 * Node: require('./bygning') (henter interior.js selv); nettleser: globalThis.Bygning (lastes rett etter interior.js).
 * Brukeren 28. nov: «hvert eneste bygg skal bestå av vegger, tak og møbler og ting inne i huset … vegger som en senere kan rive, eller
 * bygge vinduer på … flere etasjer … loft». Denne fasen lager bare modellen – ingenting endres på skjermen ennå.
 *
 * Modellen er ren JSON (ingen funksjoner, Map eller NaN):
 *  { v, kilde ('kart' | 'byggesett'), hus (husets nummer), kl, t, h, stil, P (omrisset mot klokka, m), akse { ux, uy, vx, vy, u0, u1, v0, v1 },
 *    høyde { vegg, møne }, tak { form 'saltak' | 'valm' | 'flatt', stoff, møne, felt [{ id, u0, u1, tilstand }], vinduer [...] },
 *    etasjer: [{ n (-1 kjeller, 1, 2 …, loftet sist), navn, z (gulvet over 1. etasjes gulv), høyde (gulv til gulv), takhøyde (fri høyde),
 *               kjeller?, loft?, stengt? (høyhus: etasjen er sperret), dekke { stoff, tykk, felt [{ id, rom, P, tilstand }], hull [P] },
 *               vegger [{ id, a, b, type 'ytter' | 'skille' | 'gavl', stoff, tykk, bærende, tilstand }],
 *               åpninger [{ id, vegg, t (midten, m fra a), b, h, ned, type 'dør' | 'port' | 'vindu', inngang?, bjelke?, sperre, tilstand }],
 *               rom [{ id, rolle, P, areal, andel }], møbler [{ id, type, x, y, a, b, d, h, sperrer, stoff, tilstand }], søyler [], bjelker [] }],
 *    trapper [{ id, fra, til, x, y, a (retningen opp), b, l, nede, oppe, form 'rett' | 'stige', stoff, tilstand }], endringer [] }
 * Tilstand: 'hel' | 'skadet' | 'ødelagt' | 'revet' | 'rast'. Delene beholder nummeret sitt (id) også når de er revet.
 *
 * fraKart(P, info): husene i kartet REGNES ut (kapittel 5.3) fra omriss, høyde, type og nummer – samme hus gir alltid samme modell.
 *   1. etasje er planen fra spill/interior.js (rom, døråpninger, møbler); etasjene over lages også av interior.js (soverom oppe i boliger),
 *   og trappene legges der de passer i begge etasjene (alle rom nås). Kjeller i noen hus (fast per hus), loft når mønet er minst 2,2 m.
 * endre(modell, endring) / medEndringer(modell, logg): bare endringene lagres («hus 81234, etasje 1, vegg 7: revet»).
 * fraByggesett(deler): leirens byggesett (spill/byggesett.js) som samme modell.
 * Alle tall her er Claudes forslag (REGLER).
 */
(function (rot) {
  'use strict';
  const Interior = rot.Interior || (typeof require === 'function' ? require('./interior.js') : null);

  // ---------- REGLER (alle tallene er Claudes forslag) ----------
  const REGLER = {
    // etasjehøyden som bestemmer antall etasjer (kapittel 5.3): 2,7 m bolig/hytte, 3,2 m kontor/skole; første = 1. etasje i butikker
    etasje: { hus: 2.7, hytte: 2.7, leil: 2.7, uthus: 2.7, kontor: 3.2, skole: 3.2, sykehus: 3.2, butikk: 3.2 },
    førsteEtasje: { butikk: 4 },
    // klassen i etasjene over 1. etasje (butikk med leiligheter over)
    oppe: { butikk: 'leil' },
    // haller: én etasje i full høyde (4,5–8 m og mer)
    hall: { industri: 1, lager: 1, låve: 1, kirke: 1, hangar: 1, terminal: 1, uthus: 1 },
    hallMin: 4.5,
    // loft når mønet er minst så høyt over loftsgulvet (m)
    loftMin: 2.2,
    // andel med kjeller per klasse (fast per hus), og tilfluktsrom i kjelleren i store bygg (m²)
    kjeller: { hus: .35, hytte: .08, leil: .7, kontor: .5, skole: .5, sykehus: .5, butikk: .3, industri: .1 },
    kjellerHøyde: 2.4, tilfluktMin: 200,
    // høyhus (kapittel 5.9): bare de nederste og den øverste etasjen har innhold
    høyhus: { nederst: 6, øverst: 1 },
    // saltak/valm eller flatt (som harFall i kartflis.js, forenklet): sjansen for tak med fall per klasse
    fall: { hus: [[300, .97], [800, .85], [1e9, .55]], hytte: [[1e9, .97]], uthus: [[300, .97], [800, .85], [1e9, .55]], låve: [[1e9, 1]], kirke: [[3000, .9], [1e9, .5]],
      leil: [[400, .8], [1e9, .25]], kontor: [[1500, .45], [1e9, 0]], skole: [[300, .5], [1e9, .2]], butikk: [[300, .5], [1e9, .1]] },
    valm: .2,
    // mønehøyden (som mønFor i hus3d / Byhus.TAKVINKEL): [faktor × halve bredden, høyst m]
    takvinkel: { hus: [.84, 5.5], hytte: [.6, 3.5], låve: [.72, 8], kirke: [1.24, 16], uthus: [.7, 3.5] },
    // stoff per klasse: [yttervegg, skillevegg, bærende innervegg, dekke]
    stoff: { hus: ['tre', 'tre', 'tre', 'tre'], hytte: ['tre', 'tre', 'tre', 'tre'], uthus: ['tre', 'tre', 'tre', 'tre'], låve: ['tre', 'tre', 'tre', 'tre'],
      leil: ['mur', 'tre', 'mur', 'betong'], kontor: ['betong', 'tre', 'betong', 'betong'], skole: ['betong', 'tre', 'betong', 'betong'],
      sykehus: ['betong', 'tre', 'betong', 'betong'], butikk: ['betong', 'tre', 'betong', 'betong'], industri: ['blikk', 'betong', 'betong', 'betong'],
      lager: ['blikk', 'betong', 'betong', 'betong'], hangar: ['blikk', 'blikk', 'stål', 'betong'], terminal: ['glass', 'tre', 'betong', 'betong'],
      kirke: ['tre', 'tre', 'tre', 'tre'] },
    eldreLeil: 'tre',
    tykk: { tre: .2, mur: .3, betong: .25, blikk: .12, glass: .15, stål: .2, skille: .1, bærende: .2 },
    dekkeTykk: { tre: .25, betong: .3, stål: .25 },
    // et dekke spenner høyst så langt mellom to støtter (m; kapittel 5.4/5.5) – et punkt lenger enn halve spennet fra nærmeste støtte
    // under faller. Dekket tåler alltid minst det det ble bygget med (+ MARGIN).
    spenn: { tre: 6, betong: 9, stål: 12, mur: 9, tak: 6 },
    margin: .25,
    // et dekkefelt raser når så stor andel av punktene ikke har støtte
    rasAndel: .25,
    // vinduer: avstand mellom vinduene (m), høyden; hallene får høye vinduer
    vindu: { avstand: { bolig: 2.8, annet: 3.2, hall: 6 }, høyde: { bolig: 1.2, annet: 1.5, hall: 1 }, hallNed: 2.6, hjørne: .6, maks: 2.4 },
    dørHøyde: 2.1, portHøyde: 3,
    // trappene: bredde (m), lengde per meter etasjehøyde; stige når en trapp ikke får plass (loftsluke)
    trapp: { bolig: .85, annet: 1.1, loft: .75, lengde: { bolig: 1.02, annet: 1.25 }, stige: [.6, 1.1] },
    // bygårder (kapittel 5.3): trapperom i midten (bredde m) og en leilighet på hver side, når bygget er langt og nesten rektangulært
    kjerne: { bredde: 3.2, minLengde: 16, minDybde: 7, minSide: 6, rekt: .85 },
    // rutenettet for å finne veien (m)
    rute: .2,
    // materialer fra riving per m² (60 % av det byggesettet bruker); ras gir en del av det som skrot
    riving: { tre: { tre: .04 }, mur: { betong: .12 }, betong: { betong: .12, stål: .004 }, blikk: { stål: .01 }, glass: { glass: .02, stål: .003 }, stål: { stål: .03 } },
    rivingVindu: { glass: .02 }, rivingTak: { tre: .03, stål: .002 }, rasGir: .3,
    // tid for å rive (timer per m²): lett skillevegg minutter, bærende betong timer
    rivTid: { tre: .02, mur: .08, betong: .15, blikk: .03, glass: .02, stål: .1 },
  };
  // møbler som bare finnes i kjeller og loft: [bredde, dybde, høyde, sperrer]
  const EGNE_MØBLER = { fyrkjele: [.8, .8, 1.6, 1], flyttekasse: [.6, .4, .4, 0], kiste: [1, .5, .55, 1], skrot: [1.2, .8, .6, 1] };
  const STIGE = ['gang', 'vindfang', 'korridor', 'resepsjon', 'trapperom', 'allrom', 'stue', 'venterom', 'kjeller', 'bod', 'loft', 'stengt', 'dagligstue'];

  // samme hash som interior.js (samme frø gir samme tall)
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const r2 = v => Math.round(v * 100) / 100;
  const pkt = p => [r2(p[0]), r2(p[1])];
  const inni = (P, x, y) => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inn = !inn; } return inn; };
  const avstSeg = (x, y, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0; return Math.hypot(x - ax - dx * t, y - ay - dy * t); };
  const avstKant = (P, x, y) => { let d = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; d = Math.min(d, avstSeg(x, y, a[0], a[1], b[0], b[1])); } return d; };
  const areal = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const kopi = m => JSON.parse(JSON.stringify(m));
  const står = d => !!d && d.tilstand !== 'revet' && d.tilstand !== 'ødelagt' && d.tilstand !== 'rast';

  // klassen fra OSM-typen (som klasse() i hus3d i index.html)
  const klasse = (t, A, h) => t === 10 ? (A < 150 && h < 9 ? 'hus' : 'leil') : t === 0 ? (h >= 10 || A > 350 ? 'leil' : 'hus') : t === 1 ? 'uthus' : t === 6 ? 'industri'
    : t === 7 ? 'butikk' : t === 8 ? 'kirke' : t === 9 || t === 3 ? 'skole' : t === 4 ? 'låve' : t === 11 ? 'hytte' : t === 12 ? 'lager' : t === 13 || t === 15 || t === 16 ? 'sykehus'
    : t === 14 ? (h <= 16 && A > 1500 ? 'hangar' : 'terminal') : t === 2 ? (h <= 11 && A > 700 ? 'industri' : h <= 9 ? 'butikk' : 'kontor') : (A < 60 ? 'uthus' : 'hus');
  const erHall = kl => !!REGLER.hall[kl];
  const bolig = kl => kl === 'hus' || kl === 'hytte' || kl === 'leil';

  // ---------- etasjene fra høyden (kapittel 5.3) ----------
  // Gir { form, møne, vegg, etasjer: [høyder], loft, kjeller } for et bygg. info.tak ('saltak' | 'valm' | 'flatt') eller info.fall (sant/usant)
  // går foran regelen; info.vegg = høyden fra 1. etasjes gulv til der taket begynner (hus3d: P.veggTopp), ellers h − mønet.
  function høyder(kl, i, h, A, lv, lu, info) {
    let form = info.tak;
    if (form !== 'saltak' && form !== 'valm' && form !== 'flatt') {
      let fall = info.fall;
      if (fall === undefined) { const t = REGLER.fall[kl]; let c = 0; if (t) for (const [maks, s] of t) if (A < maks) { c = s; break; } fall = hash(i, 911) < c; }
      form = fall && lv > 3 ? (hash(i, 912) < REGLER.valm && lu - lv > 2 ? 'valm' : 'saltak') : 'flatt';
    }
    const v = REGLER.takvinkel[kl];
    let møne = form === 'flatt' ? 0 : v ? Math.min(lv / 2 * v[0], v[1], h * (kl === 'kirke' ? .7 : .55)) : Math.min(lv * .42, 5, h * .55);
    let vegg = r2(info.vegg > 0 ? info.vegg : Math.max(2.3, h - møne));
    if (form !== 'flatt' && info.vegg > 0) møne = Math.max(0, h - vegg);
    const et = REGLER.etasje[kl] || 2.7;
    let etasjer;
    if (erHall(kl)) etasjer = [Math.max(Math.min(vegg, 2.4), vegg)];
    else {
      const første = REGLER.førsteEtasje[kl] || et, n = vegg < første ? 1 : 1 + Math.floor((vegg - første) / (REGLER.etasje[REGLER.oppe[kl]] || et) + .02);
      const nom = [første]; for (let k = 1; k < n; k++) nom.push(REGLER.etasje[REGLER.oppe[kl]] || et);
      const s = vegg / nom.reduce((a, b) => a + b, 0); etasjer = nom.map(x => r2(x * s));
      // den øverste tar resten, så etasjene fyller veggen helt (avrundingen hoper seg ikke opp i høye bygg)
      etasjer[n - 1] = r2(vegg - etasjer.slice(0, n - 1).reduce((a, b) => a + b, 0));
    }
    const loft = form !== 'flatt' && (!erHall(kl) || kl === 'uthus') && møne >= REGLER.loftMin && (form === 'saltak' || lu - lv > 2);
    const kjeller = !erHall(kl) || kl === 'industri' ? hash(i, 913) < (REGLER.kjeller[kl] || 0) : false;
    return { form, møne: r2(møne), vegg: r2(vegg), etasjer, loft, kjeller };
  }

  // ---------- planen fra interior.js for én etasje ----------
  // Etasjene over 1. etasje i boliger: soverom og bad oppe (romsettet byttes et øyeblikk, interior.js er uendret etterpå)
  const OPPE = { inngang: 'gang', gang: 'gang', rom: [{ rolle: 'bad', velg: 'minst', min: 3 }, { rolle: 'allrom', velg: 'størst', min: 16, ellers: 'soverom' }, { rolle: 'soverom', velg: 'rest', min: 5.5, ellers: 'bod' }] };
  function interiørPlan(P, kl, frø, h, dør, info, oppe) {
    if (!Interior) return null;
    const T = Interior.TYPER, RS = Interior.ROMSETT, byttT = oppe && (kl === 'hus' || kl === 'leil'), gml = byttT ? T[kl] : null;
    try {
      if (byttT) { RS.bygning_oppe = OPPE; T[kl] = Object.assign({}, gml, { romsett: 'bygning_oppe' }); }
      return Interior.plan(P, Object.assign({}, info, { i: frø, kl: kl === 'hytte' && oppe ? 'hus' : kl, h, dør }));
    } catch (e) { return null; }
    finally { if (byttT) { T[kl] = gml; delete RS.bygning_oppe; } }
  }

  // skilleveggene fra interior.js er stykker med hull der dørene er: slå sammen stykker på samme linje og legg døra inn som en åpning
  function skillevegger(pl, et, stoff, tykk) {
    const lin = [];
    for (const s of pl.vegger) { const dx = s.bx - s.ax, dy = s.by - s.ay, L = Math.hypot(dx, dy); if (L < .1) continue;
      let ux = dx / L, uy = dy / L; if (ux < -1e-6 || (Math.abs(ux) < 1e-6 && uy < 0)) { ux = -ux; uy = -uy; }
      const off = -uy * s.ax + ux * s.ay, t0 = ux * s.ax + uy * s.ay, t1 = ux * s.bx + uy * s.by;
      let g = lin.find(q => Math.abs(q.ux * uy - q.uy * ux) < .01 && Math.abs(q.off - off) < .04); if (!g) { g = { ux, uy, off, st: [] }; lin.push(g); }
      g.st.push([Math.min(t0, t1), Math.max(t0, t1)]); }
    const dører = (pl.dører || []).map(d => ({ x: d[0], y: d[1], dx: d[2], dy: d[3], w: d[4], brukt: false }));
    for (const g of lin) {
      g.st.sort((a, b) => a[0] - b[0]);
      const pDør = dører.filter(d => !d.brukt && Math.abs(g.ux * d.dy - g.uy * d.dx) < .02 && Math.abs(-g.uy * d.x + g.ux * d.y - g.off) < .06).map(d => ({ d, t: g.ux * d.x + g.uy * d.y }));
      const vegger = []; let cur = null;
      for (const [a, b] of g.st) {
        if (cur) { const gap = a - cur.t1, dd = pDør.find(q => !q.d.brukt && q.t > cur.t1 - .05 && q.t < a + .05);
          if (gap < .03) { cur.t1 = Math.max(cur.t1, b); continue; }
          if (dd && gap < dd.d.w + .3) { dd.d.brukt = true; cur.åp.push({ t: dd.t, b: dd.d.w }); cur.t1 = Math.max(cur.t1, b); continue; } }
        cur = { t0: a, t1: b, åp: [] }; vegger.push(cur); }
      // dører i enden av en vegg (ingen vegg på den andre siden): veggen forlenges over døra
      for (const q of pDør) { if (q.d.brukt) continue; const v = vegger.find(w => Math.abs(q.t - q.d.w / 2 - w.t1) < .08 || Math.abs(q.t + q.d.w / 2 - w.t0) < .08);
        if (v) { q.d.brukt = true; if (q.t > v.t1 - .05) v.t1 = q.t + q.d.w / 2; else v.t0 = q.t - q.d.w / 2; v.åp.push({ t: q.t, b: q.d.w }); } }
      for (const w of vegger) {
        // endene inn i omrisset (interior.js klipper i steg på 0,2 m, så en ende kan stikke litt ut)
        const pt = t => [g.ux * t - g.uy * g.off, g.uy * t + g.ux * g.off];
        for (let n = 0; n < 15 && w.t1 - w.t0 > .2 && !inni(pl.P, ...pt(w.t0)); n++) w.t0 += .02;
        for (let n = 0; n < 15 && w.t1 - w.t0 > .2 && !inni(pl.P, ...pt(w.t1)); n++) w.t1 -= .02;
        for (const o of w.åp) { const p = Math.max(w.t0, o.t - o.b / 2), q = Math.min(w.t1, o.t + o.b / 2); o.b = Math.min(w.t1 - w.t0, Math.max(.6, q - p)); o.t = Math.max(w.t0 + o.b / 2, Math.min(w.t1 - o.b / 2, (p + q) / 2)); }
        // åpninger som havnet oppå hverandre, blir én
        w.åp.sort((p, q) => p.t - q.t); for (let k = w.åp.length - 1; k > 0; k--) { const p = w.åp[k - 1], q = w.åp[k];
          if (q.t - q.b / 2 < p.t + p.b / 2 + .05) { const a0 = Math.min(p.t - p.b / 2, q.t - q.b / 2), a1 = Math.max(p.t + p.b / 2, q.t + q.b / 2); p.t = (a0 + a1) / 2; p.b = a1 - a0; w.åp.splice(k, 1); } }
        const P0 = pt(w.t0), P1 = pt(w.t1);
        const id = et.vegger.length; et.vegger.push({ id, a: pkt(P0), b: pkt(P1), type: 'skille', stoff, tykk, bærende: false, tilstand: 'hel' });
        for (const o of w.åp) et.åpninger.push({ id: et.åpninger.length, vegg: id, t: r2(o.t - w.t0), b: r2(o.b), h: REGLER.dørHøyde, ned: 0, type: 'dør', sperre: null, tilstand: 'hel' }); }
    }
    // dører uten vegg rundt (en hel åpning): en kort vegg med åpningen i
    for (const d of dører) if (!d.brukt) { const id = et.vegger.length, a = [d.x - d.dx * d.w / 2, d.y - d.dy * d.w / 2], b = [d.x + d.dx * d.w / 2, d.y + d.dy * d.w / 2];
      et.vegger.push({ id, a: pkt(a), b: pkt(b), type: 'skille', stoff, tykk, bærende: false, tilstand: 'hel' });
      et.åpninger.push({ id: et.åpninger.length, vegg: id, t: r2(d.w / 2), b: r2(d.w), h: REGLER.dørHøyde, ned: 0, type: 'dør', sperre: null, tilstand: 'hel' }); }
  }

  // ---------- en etasje ----------
  const romP = (r, A) => [[r.u0, r.v0], [r.u1, r.v0], [r.u1, r.v1], [r.u0, r.v1]].map(([u, v]) => pkt([u * A.ux + v * A.vx, u * A.uy + v * A.vy]));
  function nyEtasje(n, navn, z, høyde, takhøyde, dekkeStoff) {
    return { n, navn, z: r2(z), høyde: r2(høyde), takhøyde: r2(takhøyde), dekke: { stoff: dekkeStoff, tykk: REGLER.dekkeTykk[dekkeStoff] || .25, felt: [], hull: [] },
      vegger: [], åpninger: [], rom: [], møbler: [], søyler: [], bjelker: [] };
  }
  // ytterveggene: én vegg per kant i omrisset, med åpningene for inngangene (1. etasje: dører/porter, ellers vinduer)
  function yttervegger(et, P, stoff, tykk, innganger, første) {
    for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < .05) continue;
      const id = et.vegger.length; et.vegger.push({ id, a: pkt(a), b: pkt(b), type: 'ytter', kant: k, stoff, tykk, bærende: true, tilstand: 'hel' });
      const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L;
      for (const q of innganger || []) { let t = (q.x - a[0]) * ex + (q.y - a[1]) * ey, av = Math.abs((q.x - a[0]) * ey - (q.y - a[1]) * ex); if (av > .3 || t < -.01 || t > L + .01) continue;
        const port = q.w >= 2.4, ta = Math.max(.05, t - q.w / 2), tb = Math.min(L - .05, t + q.w / 2); if (tb - ta < .6) continue; const b0 = tb - ta; t = (ta + tb) / 2;
        if (første) et.åpninger.push({ id: et.åpninger.length, vegg: id, t: r2(t), b: r2(b0), h: port ? REGLER.portHøyde : REGLER.dørHøyde, ned: 0, type: port ? 'port' : 'dør', inngang: q.type || 'hoved', sperre: null, tilstand: 'hel' });
        else et.åpninger.push({ id: et.åpninger.length, vegg: id, t: r2(t), b: r2(Math.min(b0, 1.4)), h: 1.3, ned: .8, type: 'vindu', sperre: null, tilstand: 'hel' }); } }
  }
  // vinduer langs ytterveggene: ikke ved hjørner, dører, skillevegger som møter veggen eller trapper
  function vinduer(et, kl, stil) {
    const gr = erHall(kl) ? 'hall' : bolig(kl) ? 'bolig' : 'annet', A = REGLER.vindu.avstand[gr], H = REGLER.vindu.høyde[gr];
    const bredde = Math.min(REGLER.vindu.maks, stil && stil.vindu ? stil.vindu : 1.2), ned = gr === 'hall' ? REGLER.vindu.hallNed : stil && stil.vinduNed !== undefined ? stil.vinduNed : .9;
    if (ned + H > et.takhøyde + .1) return;
    for (const w of et.vegger) { if (w.type !== 'ytter') continue; const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); if (L < bredde + 2 * REGLER.vindu.hjørne) continue;
      const ex = (w.b[0] - w.a[0]) / L, ey = (w.b[1] - w.a[1]) / L, opptatt = et.åpninger.filter(o => o.vegg === w.id).map(o => [o.t - o.b / 2 - .4, o.t + o.b / 2 + .4]);
      for (const s of et.vegger) { if (s.type === 'ytter') continue; for (const p of [s.a, s.b]) if (avstSeg(p[0], p[1], w.a[0], w.a[1], w.b[0], w.b[1]) < .2) { const t = (p[0] - w.a[0]) * ex + (p[1] - w.a[1]) * ey; opptatt.push([t - .25, t + .25]); } }
      const n = Math.max(1, Math.floor(L / A));
      for (let k = 0; k < n; k++) { const t = L * (k + .5) / n, t0 = t - bredde / 2, t1 = t + bredde / 2;
        if (t0 < REGLER.vindu.hjørne || t1 > L - REGLER.vindu.hjørne || opptatt.some(([p, q]) => t1 > p && t0 < q)) continue;
        et.åpninger.push({ id: et.åpninger.length, vegg: w.id, t: r2(t), b: r2(bredde), h: H, ned: r2(ned), type: 'vindu', sperre: null, tilstand: 'hel' }); opptatt.push([t0 - .3, t1 + .3]); } }
  }
  // etasjen fra en plan fra interior.js (rom, skillevegger, dører, møbler)
  function fraPlan(et, pl, st) {
    const A = pl.akse;
    for (const r of pl.rom) { if (!(r.andel > .15)) continue; et.rom.push({ id: et.rom.length, rolle: r.rolle || 'rom', P: romP(r, A), areal: r2(r.areal || 0), andel: r2(r.andel) }); }
    skillevegger(pl, et, st.skille, REGLER.tykk.skille);
    for (const m of pl.møbler) et.møbler.push({ id: et.møbler.length, type: m.type, x: r2(m.x), y: r2(m.y), a: r2(m.a || 0), b: r2(m.b), d: r2(m.d), h: r2(m.h || 1), sperrer: !!m.sperrer, stoff: 'tre', tilstand: 'hel' });
  }

  // ---------- rutenettet: hvor du kan gå (kapittel 6.5 bruker det senere) ----------
  // Gir { x0, y0, W, H, s, fri (Uint8Array: 1 = kan gå) } for én etasje. ekstra = flere sperrer [{ P }] (trapper/hull) eller sirkler.
  function rutenett(m, et, ekstra) {
    const s = REGLER.rute, P = m.P; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    x0 -= s; y0 -= s; const W = Math.ceil((x1 - x0) / s) + 2, H = Math.ceil((y1 - y0) / s) + 2, fri = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const x = x0 + (i + .5) * s, y = y0 + (j + .5) * s; if (inni(P, x, y)) fri[j * W + i] = 1; }
    const merk = (ax, ay, bx, by, r) => { const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - r - x0) / s)), i1 = Math.min(W - 1, Math.ceil((Math.max(ax, bx) + r - x0) / s)), j0 = Math.max(0, Math.floor((Math.min(ay, by) - r - y0) / s)), j1 = Math.min(H - 1, Math.ceil((Math.max(ay, by) + r - y0) / s));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (avstSeg(x0 + (i + .5) * s, y0 + (j + .5) * s, ax, ay, bx, by) < r) fri[j * W + i] = 0; };
    const merkP = Q => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of Q) { a = Math.min(a, p[0]); c = Math.max(c, p[0]); b = Math.min(b, p[1]); d = Math.max(d, p[1]); }
      for (let j = Math.max(0, Math.floor((b - y0) / s)); j <= Math.min(H - 1, Math.ceil((d - y0) / s)); j++) for (let i = Math.max(0, Math.floor((a - x0) / s)); i <= Math.min(W - 1, Math.ceil((c - x0) / s)); i++) if (inni(Q, x0 + (i + .5) * s, y0 + (j + .5) * s)) fri[j * W + i] = 0; };
    // en vegg sperrer ruter med midten nærmere enn R (2R ≥ ruta: ingen vei smetter gjennom på skrå), som Interior.blokkert (0,12 m)
    const R = Math.max(.12, s * .6);
    for (const w of et.vegger) { if (!står(w)) continue; const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); if (L < 1e-6) continue; const ex = (w.b[0] - w.a[0]) / L, ey = (w.b[1] - w.a[1]) / L;
      // stykkene mellom åpningene du kan gå gjennom (dør/port uten sperre, eller revet)
      const hull = et.åpninger.filter(o => o.vegg === w.id && (o.type === 'dør' || o.type === 'port' || o.tilstand === 'revet') && !o.sperre).map(o => [o.t - o.b / 2, o.t + o.b / 2]).sort((p, q) => p[0] - q[0]);
      let t0 = 0; for (const [p, q] of hull) { if (p > t0) merk(w.a[0] + ex * t0, w.a[1] + ey * t0, w.a[0] + ex * p, w.a[1] + ey * p, R); t0 = Math.max(t0, q); }
      if (L > t0) merk(w.a[0] + ex * t0, w.a[1] + ey * t0, w.b[0], w.b[1], R); }
    for (const q of et.møbler) if (q.sperrer && q.tilstand !== 'revet') { const c = Math.cos(q.a), sn = Math.sin(q.a), hb = q.b / 2, hd = q.d / 2;
      merkP([[-hb, -hd], [hb, -hd], [hb, hd], [-hb, hd]].map(([u, v]) => [q.x + u * c - v * sn, q.y + u * sn + v * c])); }
    for (const q of et.søyler) if (står(q)) merk(q.x, q.y, q.x, q.y, .2);
    for (const Q of ekstra || []) merkP(Q);
    return { x0, y0, W, H, s, fri };
  }
  const celle = (g, x, y) => { const i = Math.floor((x - g.x0) / g.s), j = Math.floor((y - g.y0) / g.s); return i < 0 || j < 0 || i >= g.W || j >= g.H ? -1 : j * g.W + i; };
  // fyll fra startpunktene (de nærmeste frie rutene innen 0,4 m)
  function fyll(g, kilder) {
    const nådd = new Uint8Array(g.W * g.H), kø = [];
    for (const [x, y] of kilder) { let k = celle(g, x, y); if (k < 0 || !g.fri[k]) { k = -1; for (let r = 1; r <= 2 && k < 0; r++) for (let a = -r; a <= r && k < 0; a++) for (let b = -r; b <= r; b++) { const q = celle(g, x + a * g.s, y + b * g.s); if (q >= 0 && g.fri[q]) { k = q; break; } } }
      if (k >= 0 && !nådd[k]) { nådd[k] = 1; kø.push(k); } }
    while (kø.length) { const k = kø.pop(), i = k % g.W, j = (k / g.W) | 0;
      if (i > 0 && g.fri[k - 1] && !nådd[k - 1]) { nådd[k - 1] = 1; kø.push(k - 1); } if (i < g.W - 1 && g.fri[k + 1] && !nådd[k + 1]) { nådd[k + 1] = 1; kø.push(k + 1); }
      if (j > 0 && g.fri[k - g.W] && !nådd[k - g.W]) { nådd[k - g.W] = 1; kø.push(k - g.W); } if (j < g.H - 1 && g.fri[k + g.W] && !nådd[k + g.W]) { nådd[k + g.W] = 1; kø.push(k + g.W); } }
    return nådd;
  }
  // er et rom nådd: en rute inne i rommet (og i omrisset) er nådd
  function romNådd(g, nådd, r, P) {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of r.P) { a = Math.min(a, p[0]); c = Math.max(c, p[0]); b = Math.min(b, p[1]); d = Math.max(d, p[1]); }
    for (let j = Math.max(0, Math.floor((b - g.y0) / g.s)); j <= Math.min(g.H - 1, Math.ceil((d - g.y0) / g.s)); j++) for (let i = Math.max(0, Math.floor((a - g.x0) / g.s)); i <= Math.min(g.W - 1, Math.ceil((c - g.x0) / g.s)); i++) {
      const k = j * g.W + i; if (nådd[k] && inni(r.P, g.x0 + (i + .5) * g.s, g.y0 + (j + .5) * g.s)) return true; }
    return false;
  }
  // startpunktene i en etasje: ytterdørene i 1. etasje (og dører i andre etasjer som går rett ut), endene av trappene
  function kilder(m, et, utenTrapp) {
    const ut = [];
    for (const o of et.åpninger) { if ((o.type !== 'dør' && o.type !== 'port') || o.sperre || o.tilstand === 'revet') continue; const w = et.vegger[o.vegg]; if (!w || w.type !== 'ytter' || !står(w)) continue;
      const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), ex = (w.b[0] - w.a[0]) / L, ey = (w.b[1] - w.a[1]) / L, x = w.a[0] + ex * o.t, y = w.a[1] + ey * o.t;
      // innover (omrisset går mot klokka, så innsiden er til venstre)
      ut.push([x - ey * .45, y + ex * .45]); }
    if (!utenTrapp) for (const t of m.trapper) { if (!står(t)) continue; if (t.fra === et.n) ut.push(t.nede); if (t.til === et.n) ut.push(t.oppe); }
    return ut;
  }
  const trappP = t => { const c = Math.cos(t.a), s = Math.sin(t.a), hl = t.l / 2, hb = t.b / 2; return [[-hl, -hb], [hl, -hb], [hl, hb], [-hl, hb]].map(([u, v]) => [t.x + u * c - v * s, t.y + u * s + v * c]); };
  const sperrerPå = (m, et) => m.trapper.filter(t => står(t) && (t.fra === et.n || t.til === et.n)).map(trappP);
  // Kan alle rom nås? Gir per etasje { n, rom, nådd, uten: [rom-id] }. Etasjer uten noen vei inn (ingen dør, ingen trapp) regnes som utenfor.
  function nåsEtasje(m, et) {
    const g = rutenett(m, et, sperrerPå(m, et)), K = kilder(m, et), nådd = fyll(g, K), uten = [];
    let rom = 0; for (const r of et.rom) { if (r.andel < .5) continue; rom++; if (!romNådd(g, nådd, r, m.P)) uten.push(r.id); }
    return { n: et.n, rom, nådd: rom - uten.length, uten, kilder: K.length };
  }
  function nås(m) { return m.etasjer.filter(et => et.tilstand !== 'revet').map(et => nåsEtasje(m, et)); }

  // ---------- trappene ----------
  // et linjestykke krysser et rektangel (trappa: midt, retning, halve mål + luft)?
  function krysserRekt(t, w, luft) {
    const c = Math.cos(t.a), s = Math.sin(t.a), tilL = p => { const dx = p[0] - t.x, dy = p[1] - t.y; return [dx * c + dy * s, -dx * s + dy * c]; };
    const A = tilL(w.a), B = tilL(w.b), hl = t.l / 2 + luft, hb = t.b / 2 + luft;
    // klipp stykket mot rektangelet (Liang–Barsky)
    let t0 = 0, t1 = 1; const dx = B[0] - A[0], dy = B[1] - A[1];
    for (const [p, q] of [[-dx, A[0] + hl], [dx, hl - A[0]], [-dy, A[1] + hb], [dy, hb - A[1]]]) { if (Math.abs(p) < 1e-12) { if (q < 0) return false; continue; } const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } }
    return t1 >= t0;
  }
  const iRom = (et, x, y) => et.rom.find(r => inni(r.P, x, y)) || null;
  const dørPkt = et => et.åpninger.filter(o => o.type === 'dør' || o.type === 'port').map(o => { const w = et.vegger[o.vegg], L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); return [w.a[0] + (w.b[0] - w.a[0]) * o.t / L, w.a[1] + (w.b[1] - w.a[1]) * o.t / L, o.b]; });
  // Legger en trapp mellom etasjene lo og hi (hi rett over lo) der den passer: inne i omrisset, ikke gjennom vegger, ikke foran dører, og slik
  // at alle rom fortsatt nås i begge etasjene. Møbler som står i veien, tas bort. Gir trappa eller null.
  // (generator: yield mellom bitene av søket, så et hus kan lages litt om gangen mellom bildene)
  function* leggTrappG(m, lo, hi, o) {
    const P = m.P, A = m.akse, retn = [Math.atan2(A.uy, A.ux), Math.atan2(A.uy, A.ux) + Math.PI, Math.atan2(A.vy, A.vx), Math.atan2(A.vy, A.vx) + Math.PI];
    const høyde = hi.z - lo.z, gr = bolig(m.kl) ? 'bolig' : 'annet', former = [];
    if (!o.trang) former.push({ form: 'rett', b: hi.loft ? REGLER.trapp.loft : REGLER.trapp[gr], l: Math.max(2, høyde * REGLER.trapp.lengde[gr] * (hi.loft ? .85 : 1)) });
    if (!o.kunRett) former.push({ form: 'stige', b: REGLER.trapp.stige[0], l: REGLER.trapp.stige[1] });
    const andre = m.trapper.filter(t => t.fra === lo.n || t.til === lo.n || t.fra === hi.n || t.til === hi.n);
    const dLo = dørPkt(lo), dHi = dørPkt(hi), Klo = kilder(m, lo), Khi = kilder(m, hi);
    const inn = Klo[0] || Khi[0] || [(A.u0 + A.u1) / 2 * A.ux + (A.v0 + A.v1) / 2 * A.vx, (A.u0 + A.u1) / 2 * A.uy + (A.v0 + A.v1) / 2 * A.vy];
    // loftet: trappa (og der du går av) må ha hodehøyde (avstanden fra mønet)
    const loftBånd = hi.loft && m.tak.møne > 0 ? (A.v1 - A.v0) / 2 * (1 - 1.9 / m.tak.møne) : Infinity, vm = (A.v0 + A.v1) / 2;
    const iBånd = (x, y) => Math.abs(x * A.vx + y * A.vy - vm) <= loftBånd;
    // veggene i begge etasjene med ramme (for å hoppe raskt over dem som er langt unna)
    // trang: siste forsøk med mindre luft rundt trappa (stige)
    const luft = o.trang ? .04 : .1, endeLuft = o.trang ? .15 : .22, dørLuft = o.trang ? .05 : .45;
    const steg = o.trang || (A.u1 - A.u0) * (A.v1 - A.v0) < 250 ? .25 : .5;
    const VB = [lo, hi].flatMap(et => et.vegger.filter(står)).map(w => [w, Math.min(w.a[0], w.b[0]), Math.min(w.a[1], w.b[1]), Math.max(w.a[0], w.b[0]), Math.max(w.a[1], w.b[1])]);
    const iVeien = (et, t) => et.møbler.filter(q => q.tilstand !== 'revet' && Math.abs(q.x - t.x) < t.l / 2 + 2.2 && Math.abs(q.y - t.y) < t.l / 2 + 2.2 && (krysserRekt({ x: t.x, y: t.y, a: t.a, b: t.b + .5, l: t.l + 1.6 }, { a: [q.x, q.y], b: [q.x, q.y] }, Math.max(q.b, q.d) / 2)));
    let førLo = null, førHi = null;
    for (const F of former) {
      const kand = [];
      for (let u = A.u0 + .3; u <= A.u1 - .3; u += steg) { yield 'trapp'; for (let v = A.v0 + .3; v <= A.v1 - .3; v += steg) for (const a of retn) {
        // (avrundet straks: trappa som lagres, er den som ble prøvd)
        const t = { x: r2(u * A.ux + v * A.vx), y: r2(u * A.uy + v * A.vy), a: r2(a), b: r2(F.b), l: r2(F.l) }, c = Math.cos(t.a), s = Math.sin(t.a), Q = trappP(t);
        if (!Q.every(p => inni(P, p[0], p[1]) && avstKant(P, p[0], p[1]) > .13) || !inni(P, t.x, t.y)) continue;
        const nede = [t.x - c * (t.l / 2 + .35), t.y - s * (t.l / 2 + .35)], oppe = [t.x + c * (t.l / 2 + .35), t.y + s * (t.l / 2 + .35)];
        if (!inni(P, nede[0], nede[1]) || !inni(P, oppe[0], oppe[1]) || avstKant(P, nede[0], nede[1]) < .22 || avstKant(P, oppe[0], oppe[1]) < .22) continue;
        if (hi.loft && (!Q.every(p => iBånd(p[0], p[1])) || !iBånd(oppe[0], oppe[1]))) continue;
        let gjennom = false; const R = t.l / 2 + .7;
        for (const q of VB) { if (q[1] > t.x + R || q[3] < t.x - R || q[2] > t.y + R || q[4] < t.y - R) continue; const w = q[0];
          if (krysserRekt(t, w, luft) || avstSeg(nede[0], nede[1], w.a[0], w.a[1], w.b[0], w.b[1]) < endeLuft || avstSeg(oppe[0], oppe[1], w.a[0], w.a[1], w.b[0], w.b[1]) < endeLuft) { gjennom = true; break; } }
        if (gjennom) continue;
        // (trang: ingen egen sjekk mot dørene – fyllingen under sier om trappa stenger veien)
        if (!o.trang && [...dLo, ...dHi].some(([x, y, b]) => krysserRekt(t, { a: [x, y], b: [x, y] }, dørLuft + b / 2))) continue;
        if (andre.some(q => { const T2 = { x: q.x, y: q.y, a: q.a, b: q.b + .6, l: q.l + 1.6 }; return Q.some(p => krysserRekt(T2, { a: p, b: p }, 0)) || krysserRekt(T2, { a: Q[0], b: Q[2] }, 0) || krysserRekt(T2, { a: Q[1], b: Q[3] }, 0) || krysserRekt(T2, { a: nede, b: nede }, .2) || krysserRekt(T2, { a: oppe, b: oppe }, .2); })) continue;
        // møbler i veien (trappa + der du går på og av)
        const fLo = iVeien(lo, t).length, fHi = iVeien(hi, t).length, rLo = iRom(lo, nede[0], nede[1]), rHi = iRom(hi, oppe[0], oppe[1]), rM = iRom(lo, t.x, t.y);
        // bygård: trappa i trapperommet (mellom leilighetene) går foran alt annet (ikke til loft og kjeller)
        const iKjerne = m.kjerne && !lo.kjeller && !hi.loft && Q.every(p => { const u = p[0] * A.ux + p[1] * A.uy; return u > m.kjerne.c0 && u < m.kjerne.c1; });
        const poeng = (iKjerne ? 20 : 0) + (rLo && STIGE.includes(rLo.rolle) ? 3 : 0) + (rHi && STIGE.includes(rHi.rolle) ? 3 : 0) + (rM && STIGE.includes(rM.rolle) ? 1 : 0)
          - .6 * (fLo + fHi) - Math.hypot(nede[0] - inn[0], nede[1] - inn[1]) / 25 + (avstKant(P, (Q[0][0] + Q[1][0]) / 2, (Q[0][1] + Q[1][1]) / 2) < .4 || avstKant(P, (Q[2][0] + Q[3][0]) / 2, (Q[2][1] + Q[3][1]) / 2) < .4 ? .8 : 0) + hash(m.hus, kand.length) * .05;
        kand.push({ t, nede, oppe, poeng });
      } }
      kand.sort((p, q) => q.poeng - p.poeng);
      // rommene som alt nås (fra dørene eller en trapp), skal fortsatt nås; i en ny etasje skal alle rom nås fra trappa
      if (!førLo) { const før = (et, K) => { const g = rutenett(m, et, sperrerPå(m, et)), n = fyll(g, K); return new Set(et.rom.filter(r => romNådd(g, n, r, P)).map(r => r.id)); };
        førLo = Klo.length ? før(lo, Klo) : new Set(lo.rom.map(r => r.id)); førHi = Khi.length ? før(hi, Khi) : new Set(hi.rom.map(r => r.id)); }
      // de beste forslagene, men ikke mange nesten like (de faller som regel av samme grunn)
      const prøvd = []; let forsøk = 0;
      for (const k of kand) { if (forsøk >= 40) break; if (prøvd.some(q => q.a === k.t.a && Math.hypot(q.x - k.t.x, q.y - k.t.y) < .8)) continue; prøvd.push(k.t); forsøk++; yield 'trapp';
        const t = Object.assign({}, k.t, { nede: pkt(k.nede), oppe: pkt(k.oppe) }), Q = trappP(t); k.nede = t.nede; k.oppe = t.oppe;
        const prøv = (et, uten) => { const sp = sperrerPå(m, et); sp.push(Q); const lagret = et.møbler; et.møbler = et.møbler.filter(q => !uten.includes(q)); const g = rutenett(m, et, sp); et.møbler = lagret; return g; };
        k.fLo = iVeien(lo, k.t); k.fHi = iVeien(hi, k.t); const gLo = prøv(lo, k.fLo), gHi = prøv(hi, k.fHi);
        const sLo = Klo.length ? Klo : [k.nede], sHi = Khi.length ? Khi : [k.oppe], nLo = fyll(gLo, sLo), nHi = fyll(gHi, sHi);
        const c1 = celle(gLo, k.nede[0], k.nede[1]), c2 = celle(gHi, k.oppe[0], k.oppe[1]);
        if (c1 < 0 || c2 < 0 || !nLo[c1] || !nHi[c2]) continue;
        if (!lo.rom.every(r => r.andel < .5 || !førLo.has(r.id) || romNådd(gLo, nLo, r, P)) || !hi.rom.every(r => r.andel < .5 || (Khi.length && !førHi.has(r.id)) || romNådd(gHi, nHi, r, P))) continue;
        lo.møbler = lo.møbler.filter(q => !k.fLo.includes(q)); hi.møbler = hi.møbler.filter(q => !k.fHi.includes(q));
        // et lite rom som trappa fyller, blir trapperom (i begge etasjene)
        for (const et of [lo, hi]) { const r = iRom(et, t.x, t.y); if (r && !STIGE.includes(r.rolle) && r.areal < t.b * t.l * 3) r.rolle = 'trapperom'; }
        return { x: r2(t.x), y: r2(t.y), a: r2(t.a), b: r2(t.b), l: r2(t.l), nede: t.nede, oppe: t.oppe, form: F.form };
      }
    }
    return null;
  }

  // ---------- bærende vegger og hvor godt dekkene holder (kapittel 5.4) ----------
  // støttene under et dekke: stående bærende vegger, søyler og bjelker (som hviler på noe) i etasjen under
  function støtter(et) {
    const S = [];
    for (const w of et.vegger) if (w.bærende && står(w)) S.push([w.a[0], w.a[1], w.b[0], w.b[1]]);
    for (const q of et.søyler) if (står(q)) S.push([q.x, q.y, q.x, q.y]);
    // bjelkene bærer når begge endene hviler på noe som bærer (også en annen bjelke): gjenta til ingen flere kommer til
    const igjen = et.bjelker.filter(står), ende = p => S.some(s => avstSeg(p[0], p[1], s[0], s[1], s[2], s[3]) < .5);
    for (let funnet = true; funnet && igjen.length;) { funnet = false; for (let k = igjen.length - 1; k >= 0; k--) { const b = igjen[k]; if (ende(b.a) && ende(b.b)) { S.push([b.a[0], b.a[1], b.b[0], b.b[1]]); igjen.splice(k, 1); funnet = true; } } }
    return S;
  }
  // punkter i dekket (rutenett på 1 m inne i omrisset)
  function prøvepunkter(m) {
    const A = m.akse, ut = [];
    for (let u = A.u0 + .5; u < A.u1; u += 1) for (let v = A.v0 + .5; v < A.v1; v += 1) { const x = u * A.ux + v * A.vx, y = u * A.uy + v * A.vy; if (inni(m.P, x, y)) ut.push([x, y, u]); }
    return ut;
  }
  const nærmest = (S, x, y) => { let d = Infinity; for (const s of S) { const q = avstSeg(x, y, s[0], s[1], s[2], s[3]); if (q < d) d = q; } return d; };
  // velg bærende skillevegger: én eller to langs mønet (nær midten), og flere til alle punkter har støtte innen halve spennet
  function velgBærende(m, et, over) {
    const halv = (REGLER.spenn[over] || 6) / 2, A = m.akse, pk = prøvepunkter(m), vm = (A.v0 + A.v1) / 2, lu = A.u1 - A.u0;
    const skille = et.vegger.filter(w => w.type === 'skille' && står(w));
    const linje = w => { const dx = w.b[0] - w.a[0], dy = w.b[1] - w.a[1], L = Math.hypot(dx, dy); return { L, langs: Math.abs((dx * A.ux + dy * A.uy) / (L || 1)) > .98, v: ((w.a[0] + w.b[0]) / 2) * A.vx + ((w.a[1] + w.b[1]) / 2) * A.vy }; };
    // grupper skilleveggene som står på samme linje langs mønet
    const grupper = [];
    for (const w of skille) { const l = linje(w); if (!l.langs) continue; let g = grupper.find(q => Math.abs(q.v - l.v) < .1); if (!g) { g = { v: l.v, L: 0, w: [] }; grupper.push(g); } g.L += l.L; g.w.push(w); }
    const midt = grupper.filter(g => g.L >= lu * .3 && Math.abs(g.v - vm) < (A.v1 - A.v0) * .25).sort((a, b) => Math.abs(a.v - vm) - Math.abs(b.v - vm))[0];
    let valgt = 0; if (midt && A.v1 - A.v0 > 5) { for (const w of midt.w) { w.bærende = true; w.tykk = REGLER.tykk.bærende; } valgt++; }
    for (let runde = 0; runde < 6; runde++) {
      const S = støtter(et), løse = pk.filter(([x, y]) => nærmest(S, x, y) > halv); if (!løse.length) break;
      // linjene (langs mønet først) eller enkeltvegger som gir mest støtte
      let best = null;
      for (const g of grupper) { if (g.w[0].bærende) continue; const sk = g.w.map(w => [w.a[0], w.a[1], w.b[0], w.b[1]]), n = løse.filter(([x, y]) => nærmest(sk, x, y) <= halv).length * 1.3; if (n > 0 && (!best || n > best.n)) best = { n, w: g.w }; }
      for (const w of skille) { if (w.bærende) continue; const n = løse.filter(([x, y]) => avstSeg(x, y, w.a[0], w.a[1], w.b[0], w.b[1]) <= halv).length; if (n > 0 && (!best || n > best.n)) best = { n, w: [w] }; }
      if (!best || (valgt >= 2 && best.n < 4)) break;
      for (const w of best.w) { w.bærende = true; w.tykk = REGLER.tykk.bærende; } valgt++;
    }
  }
  // hvor langt dekket over etasjen et bærer: minst halve spennet for stoffet, og minst det det ble bygget med
  function byggSpenn(m, et, stoff) { const S = støtter(et), pk = prøvepunkter(m); let maks = 0; for (const [x, y] of pk) maks = Math.max(maks, nærmest(S, x, y)); return r2(Math.max((REGLER.spenn[stoff] || 6) / 2, maks + REGLER.margin)); }

  // omrisset klippet mot en linje på tvers av aksen (Sutherland–Hodgman): beholder punktene der side · (u − grense) ≥ 0
  function klipp(P, ux, uy, grense, side) {
    const ut = [], f = p => side * (p[0] * ux + p[1] * uy - grense);
    for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length], fa = f(a), fb = f(b);
      if (fa >= 0) ut.push(a); if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); ut.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
    const Q = ut.filter((p, k) => Math.hypot(p[0] - ut[(k + 1) % ut.length][0], p[1] - ut[(k + 1) % ut.length][1]) > 1e-6);
    return areal(Q) < 0 ? Q.reverse() : Q;
  }

  // stoffet i åpninger og møbler (glass i vinduer, stål i porter og maskiner, ellers tre)
  const STÅL = /kjøleskap|komfyr|maskin|tank|rørgate|ventil|tavlepanel|arkivskap|pallereol|traverskran|sveisebås|stålplater|kjøledisk|fryseboks|melketank|bil|traktor|fly|verktøyvogn|ovn|fyrkjele|tønne|kopimaskin|radio|medisinskap/;
  const åpStoff = type => (type === 'vindu' || type === 'takvindu' ? 'glass' : type === 'port' ? 'stål' : 'tre');
  function merkStoff(m) { for (const e of m.etasjer) { for (const o of e.åpninger) if (!o.stoff) o.stoff = åpStoff(o.type); for (const q of e.møbler) q.stoff = STÅL.test(q.type) ? 'stål' : 'tre'; }
    for (const v of m.tak.vinduer) v.stoff = 'glass'; return m; }

  // ---------- fraKart ----------
  const VANLIG = { hus: [0, 1, 2.1], hytte: [0, 1, 2], leil: [3, 1.8, 2.3], kontor: [3, 2, 2.4], skole: [3, 2.2, 2.4], industri: [2, 4.5, 4.5], låve: [1, 3, 3.2], uthus: [1, 2.6, 2.2], butikk: [3, 2.2, 2.4], kirke: [0, 1.6, 2.6], lager: [2, 4, 4.2], sykehus: [3, 3, 2.6], hangar: [2, 20, 9], terminal: [3, 3, 2.8] };
  // døra: info.dør flyttes til nærmeste kant (som interior3d.js); uten dør midt på den lengste kanten (som hus3d)
  function finnDør(P, kl, d0) {
    let best = null, lengst = null;
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1.4) continue; if (!lengst || L > lengst.L) lengst = { i, L };
      if (!d0) continue; const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L, w = Math.min(d0.w || 1, L * .7), t = Math.max(w / 2 + .1, Math.min(L - w / 2 - .1, (d0.x - a[0]) * ex + (d0.y - a[1]) * ey)), x = a[0] + ex * t, y = a[1] + ey * t, av = Math.hypot(x - d0.x, y - d0.y);
      if (!best || av < best.av) best = { av, x, y, ux: ex, uy: ey, w }; }
    if (best) return best; if (!lengst) return null;
    const a = P[lengst.i], b = P[(lengst.i + 1) % P.length], L = lengst.L, w = Math.min((VANLIG[kl] || VANLIG.hus)[1], L * .6);
    return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, ux: (b[0] - a[0]) / L, uy: (b[1] - a[1]) / L, w };
  }
  function fraKart(P0, info) { const it = fraKartG(P0, info); let r; while (!(r = it.next()).done); return r.value; }
  // generator: yield mellom etasjene (så 3D kan lage huset litt om gangen, som interior3d.js gjør)
  function* fraKartG(P0, info0) {
    const info = info0 || {}, i = info.i | 0;
    let P = P0.map(p => [+p[0], +p[1]]).filter((p, k, L) => k === 0 || Math.hypot(p[0] - L[k - 1][0], p[1] - L[k - 1][1]) > 1e-6);
    if (P.length > 2 && Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) < 1e-6) P.pop();
    if (areal(P) < 0) P.reverse();
    const A0 = Math.abs(areal(P)), h = info.h > 0 ? info.h : 6, kl0 = info.kl || klasse(info.t, A0, h);
    const kl = kl0 === 'sykehjem' || kl0 === 'legevakt' ? 'sykehus' : REGLER.stoff[kl0] ? kl0 : 'hus';
    // aksene: u langs den lengste kanten (som interior.js)
    let best = 0, ux = 1, uy = 0; for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > best) { best = l; ux = (b[0] - a[0]) / l; uy = (b[1] - a[1]) / l; } }
    const vx = -uy, vy = ux; let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [x, y] of P) { const u = x * ux + y * uy, v = x * vx + y * vy; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const Hd = høyder(kl, i, h, A0, v1 - v0, u1 - u0, info), dør = finnDør(P, kl, info.dør);
    const st0 = REGLER.stoff[kl], eldre = kl === 'leil' && hash(i, 801) < .3;
    const st = { ytter: st0[0], skille: st0[1], bærende: st0[2], dekke: eldre ? REGLER.eldreLeil : st0[3] };
    const m = { v: 1, kilde: 'kart', hus: i, kl, t: info.t === undefined ? null : info.t, h: r2(h), stil: null, P: P.map(pkt),
      akse: { ux: r2(ux * 1e4) / 1e4, uy: r2(uy * 1e4) / 1e4, vx: r2(vx * 1e4) / 1e4, vy: r2(vy * 1e4) / 1e4, u0: r2(u0), u1: r2(u1), v0: r2(v0), v1: r2(v1) },
      høyde: { vegg: Hd.vegg, møne: Hd.møne },
      tak: { form: Hd.form, stoff: bolig(kl) || kl === 'hytte' ? 'tre' : 'stål', møne: Hd.møne, felt: [], vinduer: [], spenn: 0 },
      etasjer: [], trapper: [], endringer: [] };
    m.akse.ux = ux; m.akse.uy = uy; m.akse.vx = vx; m.akse.vy = vy;
    if (!dør) { const e = nyEtasje(1, '1. etasje', 0, Hd.etasjer[0], Hd.etasjer[0] - .35, 'betong'); yttervegger(e, P, st.ytter, REGLER.tykk[st.ytter] || .2, [], true); e.rom.push({ id: 0, rolle: 'rom', P: m.P, areal: r2(A0), andel: 1 }); m.etasjer.push(e); return merkStoff(m); }
    const N = Hd.etasjer.length, høy = REGLER.høyhus, iBruk = k => N <= høy.nederst + høy.øverst || k <= høy.nederst || k > N - høy.øverst;
    // bygård: trapperom i midten der hoveddøra er, leiligheter på begge sider (forsøkes; går det ikke, er etasjen som før)
    const KJ = REGLER.kjerne; let kjerne = null;
    if (kl === 'leil' && N >= 2 && u1 - u0 >= KJ.minLengde && v1 - v0 >= KJ.minDybde && A0 / ((u1 - u0) * (v1 - v0)) > KJ.rekt) {
      const du = dør.x * ux + dør.y * uy, c0 = Math.max(u0 + KJ.minSide, Math.min(u1 - KJ.minSide - KJ.bredde, du - KJ.bredde / 2));
      if (du >= c0 + .7 && du <= c0 + KJ.bredde - .7) kjerne = m.kjerne = { c0: r2(c0), c1: r2(c0 + KJ.bredde) }; }
    // en vanlig etasje fra interior.js; samme dørplass i alle etasjene: i 1. etasje en dør, over den et vindu, og gangen innenfor er der
    // i alle etasjene (samme frø gir oftest de samme veggene over hverandre, som i ekte hus). Kalles på nytt med et annet frø når trappa
    // ikke får plass.
    const fyll = (e, k, frø) => {
      const klK = k > 1 && REGLER.oppe[kl] ? REGLER.oppe[kl] : kl, stK = k > 1 && REGLER.oppe[kl] ? REGLER.stoff[klK] : st0, takh = e.takhøyde0 || e.takhøyde;
      e.takhøyde0 = takh; e.takhøyde = takh; e.vegger = []; e.åpninger = []; e.rom = []; e.møbler = []; e.frø = frø;
      if (kjerne && fyllKjerne(e, k, frø)) return;
      const pl = interiørPlan(P, klK, frø, h, dør, info, k > 1);
      if (k === 1 && pl) m.stil = pl.stil;
      yttervegger(e, P, k === 1 ? st.ytter : stK[0], REGLER.tykk[st.ytter] || .2, pl ? pl.innganger : [{ x: dør.x, y: dør.y, w: dør.w, type: 'hoved' }], k === 1);
      if (pl) { fraPlan(e, pl, { skille: k === 1 ? st.skille : stK[1] }); if (k === 1 || !erHall(kl)) e.takhøyde = r2(Math.min(e.takhøyde, Math.max(2.2, erHall(kl) ? takh : Math.max(pl.tak, Math.min(takh, pl.tak + .3))))); }
      else e.rom.push({ id: 0, rolle: 'rom', P: m.P, areal: r2(A0), andel: 1 });
      e.vindu = pl ? { b: pl.vindu, ned: pl.vinduNed } : null;
    };
    // etasjen i en bygård: trapperommet (fra ytterdøra til bakveggen) og to leiligheter fra interior.js med dør til trapperommet
    const fyllKjerne = (e, k, frø) => {
      const sider = [[klipp(P, ux, uy, kjerne.c0, -1), kjerne.c0], [klipp(P, ux, uy, kjerne.c1, 1), kjerne.c1]], dv = dør.x * vx + dør.y * vy, nær0 = dv - v0 < v1 - dv;
      const ytterInn = [{ x: dør.x, y: dør.y, w: dør.w, type: 'hoved' }], kjerneVegger = [], planer = [];
      for (let sd = 0; sd < 2; sd++) { const [Q, uL] = sider[sd]; if (Q.length < 3) return false;
        // kanten mot trapperommet og leilighetsdøra der (nær inngangssiden, så trappa får resten av rommet)
        let kant = null; for (let q = 0; q < Q.length; q++) { const a = Q[q], b = Q[(q + 1) % Q.length]; if (Math.abs(a[0] * ux + a[1] * uy - uL) < .05 && Math.abs(b[0] * ux + b[1] * uy - uL) < .05 && Math.hypot(b[0] - a[0], b[1] - a[1]) > 3) kant = [a, b]; }
        if (!kant) return false;
        const vd = nær0 ? v0 + 1.7 : v1 - 1.7, dd = finnDør(Q, 'leil', { x: uL * ux + vd * vx, y: uL * uy + vd * vy, w: 1.1 });
        const pl = interiørPlan(Q, 'leil', (Math.imul(frø, 7) + sd * 977) | 0, h, dd, info, false); if (!pl) return false;
        planer.push(pl); kjerneVegger.push({ kant, inn: pl.innganger.filter(q => avstSeg(q.x, q.y, kant[0][0], kant[0][1], kant[1][0], kant[1][1]) < .3) });
        for (const q of pl.innganger) if (avstSeg(q.x, q.y, kant[0][0], kant[0][1], kant[1][0], kant[1][1]) >= .3) ytterInn.push(q); }
      const takh = e.takhøyde0 || e.takhøyde; e.takhøyde0 = takh; e.takhøyde = takh; e.vegger = []; e.åpninger = []; e.rom = []; e.møbler = []; e.frø = frø;
      yttervegger(e, P, st.ytter, REGLER.tykk[st.ytter] || .2, ytterInn, k === 1);
      for (const pl of planer) { if (k === 1) m.stil = m.stil || pl.stil; fraPlan(e, pl, { skille: st.skille }); e.takhøyde = r2(Math.min(e.takhøyde, Math.max(2.2, Math.max(pl.tak, Math.min(takh, pl.tak + .3))))); }
      for (const { kant: [a, b], inn } of kjerneVegger) { const id = e.vegger.length, L = Math.hypot(b[0] - a[0], b[1] - a[1]), ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L;
        e.vegger.push({ id, a: pkt(a), b: pkt(b), type: 'skille', stoff: st.bærende, tykk: REGLER.tykk.bærende, bærende: true, tilstand: 'hel', trapperom: true });
        for (const q of inn) { const t = (q.x - a[0]) * ex + (q.y - a[1]) * ey, bb = Math.min(q.w, 1.2); e.åpninger.push({ id: e.åpninger.length, vegg: id, t: r2(Math.max(bb / 2, Math.min(L - bb / 2, t))), b: r2(bb), h: REGLER.dørHøyde, ned: 0, type: 'dør', leilighet: true, sperre: null, tilstand: 'hel' }); } }
      const K = klipp(klipp(P, ux, uy, kjerne.c0, 1), ux, uy, kjerne.c1, -1); e.rom.push({ id: e.rom.length, rolle: 'trapperom', P: K.map(pkt), areal: r2(Math.abs(areal(K))), andel: 1 });
      e.vindu = { b: planer[0].vindu, ned: planer[0].vinduNed };
      // 1. etasje: alle rom skal nås fra ytterdørene, ellers brukes vanlig plan i hele bygget
      if (k === 1 && nåsEtasje(m, e).uten.length) { kjerne = null; delete m.kjerne; return false; }
      return true;
    };
    let z = 0;
    for (let k = 1; k <= N; k++) {
      const hk = Hd.etasjer[k - 1], topp = k === N, klK = k > 1 && REGLER.oppe[kl] ? REGLER.oppe[kl] : kl, stK = k > 1 && REGLER.oppe[kl] ? REGLER.stoff[klK] : st0;
      const luft = topp ? (Hd.form === 'flatt' ? .35 : .06) : (REGLER.dekkeTykk[st.dekke] || .3);
      const takh = erHall(kl) ? Math.min(14, hk - .35) : Math.max(2.2, hk - luft);
      const e = nyEtasje(k, k + '. etasje', z, hk, takh, k === 1 ? 'betong' : st.dekke); z += hk;
      if (!iBruk(k)) {
        // høyhus: etasjen er stengt (trapperommet er sperret) – bare ytterveggene, vinduer og dekket
        e.stengt = true; yttervegger(e, P, st.ytter, REGLER.tykk[st.ytter] || .2, [], false); e.rom.push({ id: 0, rolle: 'stengt', P: m.P, areal: r2(A0), andel: 1 });
        vinduer(e, kl, null); m.etasjer.push(e); yield 'etasje'; continue;
      }
      fyll(e, k, k === 1 || klK === kl ? i : (Math.imul(i, 31) + k * 7919) | 0);
      m.etasjer.push(e); yield 'etasje';
    }
    // loftet under saltak/valm: ett rom, gavlvegger i endene (saltak), ting på loftet
    if (Hd.loft) {
      const e = nyEtasje(N + 1, 'Loft', z, Hd.møne, Hd.møne, 'tre'); e.loft = true;
      e.rom.push({ id: 0, rolle: 'loft', P: m.P, areal: r2(A0), andel: 1 });
      if (Hd.form === 'saltak') for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1) continue;
        // gavlene: kantene på tvers av mønet
        if (Math.abs(((b[0] - a[0]) * ux + (b[1] - a[1]) * uy) / L) < .2) { const id = e.vegger.length; e.vegger.push({ id, a: pkt(a), b: pkt(b), type: 'gavl', kant: k, stoff: st.ytter, tykk: REGLER.tykk[st.ytter] || .2, bærende: true, tilstand: 'hel', trekant: true });
          if (L > 2.4 && Hd.møne > 2.4) e.åpninger.push({ id: e.åpninger.length, vegg: id, t: r2(L / 2), b: .7, h: .8, ned: r2(Math.min(1.1, Hd.møne - 1.2)), type: 'vindu', sperre: null, tilstand: 'hel' }); } }
      // takvinduer i noen loft
      if (hash(i, 921) < .35) { const n = 1 + Math.floor(hash(i, 922) * 2); for (let k = 0; k < n; k++) { const uu = u0 + (u1 - u0) * (k + 1) / (n + 1), vv = (v0 + v1) / 2 + (hash(i, 923 + k) < .5 ? -1 : 1) * (v1 - v0) * .2;
        m.tak.vinduer.push({ id: k, u: r2(uu), v: r2(vv), b: .8, l: 1, tilstand: 'hel' }); } }
      m.etasjer.push(e); yield 'loft';
    }
    // kjelleren: betong, et stort rom (tilfluktsrom i store bygg) og fyrrom/bod
    if (Hd.kjeller) {
      const e = nyEtasje(-1, 'Kjeller', -REGLER.kjellerHøyde, REGLER.kjellerHøyde, REGLER.kjellerHøyde - .3, 'betong'); e.kjeller = true;
      yttervegger(e, P, 'betong', .3, [], false); e.åpninger = [];
      const stor = A0 >= REGLER.tilfluktMin && !bolig(kl) || A0 >= REGLER.tilfluktMin * 2;
      e.rom.push({ id: 0, rolle: stor ? 'tilfluktsrom' : 'kjeller', P: m.P, areal: r2(A0), andel: 1 });
      m.etasjer.unshift(e);
    }
    // trappene: 1 → 2 → … → loft, så kjeller → 1. Høyhus: gjennom de stengte etasjene også.
    const ets = m.etasjer, fin = n => ets.find(e => e.n === n);
    const par = []; for (let k = 1; k < N; k++) par.push([k, k + 1]); if (Hd.loft) par.push([N, N + 1]); if (Hd.kjeller) par.push([-1, 1]);
    for (const [a, b] of par) { const lo = fin(a), hi = fin(b); let t = null;
      // en rett trapp først; får den ikke plass, prøves etasjen over med et annet frø (høyst to ganger), ellers en stige (loftsluke)
      // stengte etasjer i høyhus: annenhver trapp på samme plass som to etasjer under (etasjene er åpne, trappene krysser ikke hverandre)
      const toUnder = lo.stengt && hi.stengt ? m.trapper.find(q => q.fra === a - 2 && q.til === a - 1 && q.form === 'rett') : null;
      if (toUnder && fin(a - 1).stengt) t = { x: toUnder.x, y: toUnder.y, a: toUnder.a, b: toUnder.b, l: toUnder.l, nede: toUnder.nede, oppe: toUnder.oppe, form: 'rett' };
      if (!t && hi.stengt) t = (yield* leggTrappG(m, lo, hi, {}));
      else if (!t && b > 1 && !hi.loft && hi.frø !== undefined) { const f0 = hi.frø;
        for (let f = 0; f < 3 && !t; f++) { if (f) fyll(hi, b, (Math.imul(i, 131) + b * 104729 + f * 7) | 0); t = (yield* leggTrappG(m, lo, hi, { kunRett: true })); }
        if (!t) { fyll(hi, b, f0); t = (yield* leggTrappG(m, lo, hi, {})) || (yield* leggTrappG(m, lo, hi, { trang: true })); }
        // siste utvei: etasjen over blir ett åpent rom (uten skillevegger), så trappa bare må passe i etasjen under
        if (!t) { hi.vegger = hi.vegger.filter(w => w.type === 'ytter'); hi.vegger.forEach((w, k) => { for (const o of hi.åpninger) if (o.vegg === w.id) o.vegg = k; w.id = k; });
          hi.åpninger = hi.åpninger.filter(o => o.vegg < hi.vegger.length); hi.åpninger.forEach((o, k) => { o.id = k; }); hi.møbler = [];
          hi.rom = [{ id: 0, rolle: bolig(kl) ? 'allrom' : 'lager', P: m.P, areal: r2(A0), andel: 1 }]; hi.åpen = true;
          t = (yield* leggTrappG(m, lo, hi, {})) || (yield* leggTrappG(m, lo, hi, { trang: true })); } }
      else if (!t) t = (yield* leggTrappG(m, lo, hi, {})) || (yield* leggTrappG(m, lo, hi, { trang: true }));
      if (t) { const s = st.dekke === 'betong' && !hi.loft ? 'betong' : 'tre'; m.trapper.push(Object.assign({ id: m.trapper.length, fra: a, til: b }, t, { stoff: s, tilstand: 'hel' })); hi.dekke.hull.push(trappP(t).map(pkt)); }
      else if (hi.loft) { ets.splice(ets.indexOf(hi), 1); m.tak.vinduer = []; }
      else if (lo.kjeller) { ets.splice(ets.indexOf(lo), 1); }
      else { m.trapper.push({ id: m.trapper.length, fra: a, til: b, x: r2(dør.x), y: r2(dør.y), a: 0, b: .8, l: 1, nede: pkt([dør.x, dør.y]), oppe: pkt([dør.x, dør.y]), form: 'stige', stoff: 'tre', tilstand: 'hel', usikker: true }); }
      yield 'trapp'; }
    // kjelleren: skillevegg mellom fyrrom/bod og hovedrommet når det går (alle rom nås fortsatt)
    const kj = fin(-1); if (kj) { kjellerRom(m, kj); yield 'kjeller'; }
    // ting på loftet og i kjelleren
    const lo = ets.find(e => e.loft); if (lo) { loftTing(m, lo); yield 'loft'; }
    if (kj) { kjellerTing(m, kj); yield 'kjeller'; }
    // vinduer (etter trappene og skilleveggene)
    for (const e of ets) if (!e.stengt && !e.loft && !e.kjeller) vinduer(e, kl, e.vindu ? { vindu: e.vindu.b, vinduNed: e.vindu.ned } : null);
    for (const e of ets) { delete e.vindu; delete e.frø; delete e.takhøyde0; }
    // dekkefeltene (ett per rom) og bærende vegger: hvert dekke har støtte under seg innen halve spennet
    for (const e of ets) { if (e.n === 1 && !kj) continue; e.dekke.felt = e.rom.map(r => ({ id: r.id, rom: r.id, tilstand: 'hel' })); }
    for (let k = 0; k < ets.length - 1; k++) { velgBærende(m, ets[k], ets[k + 1].dekke.stoff); yield 'bærende'; }
    for (let k = 0; k < ets.length; k++) { const e = ets[k]; if (!e.dekke.felt.length) continue; const under = ets[k - 1]; e.dekke.spenn = under ? byggSpenn(m, under, e.dekke.stoff) : 99; yield 'spenn'; }
    // taket: felt på 4 m langs mønet; hviler på ytterveggene (og de bærende veggene) i øverste etasje
    const øverst = ets.filter(e => !e.loft).slice(-1)[0];
    for (let k = 0, u = u0; u < u1 - .01; k++, u += 4) m.tak.felt.push({ id: k, u0: r2(u), u1: r2(Math.min(u1, u + 4)), tilstand: 'hel' });
    m.tak.spenn = byggSpenn(m, øverst, 'tak');
    merkStoff(m);
    yield 'ferdig';
    return m;
  }
  // kjelleren: et fyrrom (bod) i den ene enden med dør, hvis alle rom fortsatt nås
  function kjellerRom(m, e) {
    const A = m.akse, lu = A.u1 - A.u0; if (lu < 7) return;
    const t = m.trapper.find(q => q.fra === -1);
    for (const f of [.3, .7, .25, .75]) {
      const s = A.u0 + lu * f, vegg0 = e.vegger.length, åp0 = e.åpninger.length, rom0 = e.rom.map(r => Object.assign({}, r));
      // linja på tvers (langs v) klippes mot omrisset: stykket inne
      let a = null, b = null; for (let v = A.v0; v <= A.v1 + 1e-6; v += .1) { const x = s * A.ux + v * A.vx, y = s * A.uy + v * A.vy; if (inni(m.P, x, y)) { if (a === null) a = v; b = v; } }
      if (a === null || b - a < 2.5) continue;
      const P0 = [s * A.ux + a * A.vx, s * A.uy + a * A.vy], P1 = [s * A.ux + b * A.vx, s * A.uy + b * A.vy];
      if (t && krysserRekt(Object.assign({}, t, { l: t.l + 2, b: t.b + 1 }), { a: P0, b: P1 }, .3)) continue;
      const id = e.vegger.length; e.vegger.push({ id, a: pkt(P0), b: pkt(P1), type: 'skille', stoff: 'betong', tykk: .2, bærende: false, tilstand: 'hel' });
      e.åpninger.push({ id: e.åpninger.length, vegg: id, t: r2((b - a) * (.3 + .4 * hash(m.hus, 931))), b: .9, h: 2, ned: 0, type: 'dør', sperre: null, tilstand: 'hel' });
      const liten = f < .5 ? [A.u0, s] : [s, A.u1], stor = f < .5 ? [s, A.u1] : [A.u0, s], rP = ([p, q]) => [[p, A.v0], [q, A.v0], [q, A.v1], [p, A.v1]].map(([u, v]) => pkt([u * A.ux + v * A.vx, u * A.uy + v * A.vy]));
      const r0 = e.rom[0]; e.rom = [{ id: 0, rolle: r0.rolle, P: rP(stor), areal: r2((stor[1] - stor[0]) * (A.v1 - A.v0)), andel: 1 }, { id: 1, rolle: hash(m.hus, 932) < .5 ? 'fyrrom' : 'bod', P: rP(liten), areal: r2((liten[1] - liten[0]) * (A.v1 - A.v0)), andel: 1 }];
      const sjekk = nåsEtasje(m, e);
      if (sjekk && sjekk.uten.length === 0) return;
      e.vegger.length = vegg0; e.åpninger.length = åp0; e.rom = rom0;
    }
  }
  // ting langs veggene i et rom (enkelt): prøver plasser langs v0- og v1-siden, ikke foran trapper/dører, ikke i hverandre
  function langsVeggen(m, e, liste, fri) {
    const A = m.akse, t0 = m.trapper.filter(q => q.fra === e.n || q.til === e.n), d = dørPkt(e);
    let n = 0;
    for (const [type, antall, sider] of liste) { const M = EGNE_MØBLER[type] || (Interior && Interior.MØBLER[type]) || [1, .6, 1, 1];
      for (let k = 0, lagt = 0; k < 40 && lagt < antall; k++) {
        const side = sider ? sider[k % sider.length] : k % 2, u = A.u0 + .4 + M[0] / 2 + hash(m.hus, 940 + n * 13 + k) * Math.max(0, A.u1 - A.u0 - .8 - M[0]), v = side ? A.v1 - fri - M[1] / 2 : A.v0 + fri + M[1] / 2;
        const x = u * A.ux + v * A.vx, y = u * A.uy + v * A.vy, a = Math.atan2(A.uy, A.ux), c = Math.cos(a), s = Math.sin(a);
        const Q = [[-M[0] / 2, -M[1] / 2], [M[0] / 2, -M[1] / 2], [M[0] / 2, M[1] / 2], [-M[0] / 2, M[1] / 2]].map(([p, q]) => [x + p * c - q * s, y + p * s + q * c]);
        if (!Q.every(p => inni(m.P, p[0], p[1]) && avstKant(m.P, p[0], p[1]) > .12)) continue;
        if (t0.some(t => Q.some(p => krysserRekt(Object.assign({}, t, { l: t.l + 2, b: t.b + 1 }), { a: p, b: p }, 0)) || krysserRekt(Object.assign({}, t, { l: t.l + 2, b: t.b + 1 }), { a: [x, y], b: [x, y] }, 0))) continue;
        if (d.some(([px, py, b]) => Math.hypot(px - x, py - y) < 1.2 + b / 2 + Math.max(M[0], M[1]) / 2)) continue;
        if (e.vegger.some(w => w.type !== 'ytter' && w.type !== 'gavl' && Q.some((p, j) => avstSeg(p[0], p[1], w.a[0], w.a[1], w.b[0], w.b[1]) < .15) || w.type !== 'ytter' && w.type !== 'gavl' && avstSeg(x, y, w.a[0], w.a[1], w.b[0], w.b[1]) < Math.max(M[0], M[1]) / 2 + .1)) continue;
        if (e.møbler.some(q => Math.hypot(q.x - x, q.y - y) < (Math.max(q.b, q.d) + Math.max(M[0], M[1])) / 2 + .1)) continue;
        e.møbler.push({ id: e.møbler.length, type, x: r2(x), y: r2(y), a: r2(a), b: M[0], d: M[1], h: M[2], sperrer: !!M[3], stoff: type === 'fyrkjele' ? 'stål' : 'tre', tilstand: 'hel' }); lagt++; n++;
      } }
    // sperrer møblene veien? Ta dem ut igjen til alle rom nås
    for (let g = 0; g < 8; g++) { const s = nåsEtasje(m, e); if (!s || !s.uten.length) break; const k = e.møbler.map(q => q.sperrer).lastIndexOf(true); if (k < 0) break; e.møbler.splice(k, 1); e.møbler.forEach((q, j) => { q.id = j; }); }
  }
  function loftTing(m, e) {
    const A = m.akse, lv = A.v1 - A.v0, fri = Math.max(.2, lv / 2 * (1.25 / Math.max(m.tak.møne, 1.3)) - .1), f = hash(m.hus, 951);
    langsVeggen(m, e, [['flyttekasse', 2 + Math.floor(f * 5)], ['kiste', f < .5 ? 1 : 0], ['skrot', f > .3 ? 1 + Math.floor(f * 2) : 0], ['hylle', f > .6 ? 1 : 0]], fri);
  }
  function kjellerTing(m, e) {
    const f = hash(m.hus, 961), tilf = e.rom.some(r => r.rolle === 'tilfluktsrom');
    langsVeggen(m, e, [['fyrkjele', 1], ['hylle', 2 + Math.floor(f * 3)], ['tønne', f < .5 ? 2 : 0], ...(tilf ? [['køyeseng', 6], ['benk', 2]] : [['flyttekasse', 2]])], .15);
  }

  // ---------- endringer (kapittel 5.4) ----------
  // En endring: { e (etasjen), del ('vegg' | 'åpning' | 'dekke' | 'tak' | 'møbel' | 'søyle' | 'bjelke' | 'etasje'), id, gjør, … }
  //   vegg: gjør 'riv' (gir materialer; bærende uten bjelke: det over raser)
  //   åpning: gjør 'ny' { vegg, t, b, type 'dør' | 'vindu' | 'port', bjelke (sant = bjelke over, kreves i bærende vegger) } | 'tett' | 'barrikader' | 'åpne' | 'riv'
  //   bjelke: gjør 'ny' { vegg } (en bjelke langs veggen – den bærer selv om veggen rives) · søyle: gjør 'ny' { x, y } | 'riv'
  //   dekke: gjør 'riv' { id (feltet) } · tak: gjør 'riv' { id } · møbel: gjør 'fjern' | 'ødelegg' · etasje: gjør 'riv' (øverste først)
  // Svar: { ok, feil?, advarsel?, materialer { tre, betong, stål, glass }, timer, ras [{ e, del, id }], tekst }
  const NAVN = { vegg: 'vegg', åpning: 'åpning', dekke: 'dekke', tak: 'tak', møbel: 'møbel', søyle: 'søyle', bjelke: 'bjelke', etasje: 'etasjen' };
  const GJORT = { riv: 'revet', ny: 'ny', tett: 'tettet', barrikader: 'barrikadert', åpne: 'åpnet', fjern: 'tatt bort', ødelegg: 'ødelagt', skad: 'skadet' };
  const etNavn = n => n === -1 ? 'kjeller' : 'etasje ' + n;
  function tekst(endring, hus) { const d = endring || {}; return (hus !== undefined ? 'hus ' + hus + ', ' : '') + (d.del === 'tak' ? 'taket' : etNavn(d.e) + (d.del === 'etasje' ? '' : ', ' + (NAVN[d.del] || d.del) + (d.id !== undefined ? ' ' + d.id : ''))) + ': ' + (GJORT[d.gjør] || d.gjør); }
  const legg = (M, mat, k) => { for (const [n, v] of Object.entries(mat)) M[n] = Math.round(((M[n] || 0) + v * k) * 1000) / 1000; };
  const veggL = w => Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
  function veggAreal(et, w) { let A = veggL(w) * (w.type === 'gavl' ? et.høyde / 2 : et.høyde); for (const o of et.åpninger) if (o.vegg === w.id && o.tilstand !== 'revet') A -= o.b * o.h; return Math.max(0, A); }
  const finnEt = (m, n) => m.etasjer.find(e => e.n === n);
  // det over etasjen e: etasjen over (dekket), eller taket når e er øverst
  function over(m, et) { const k = m.etasjer.indexOf(et); return m.etasjer[k + 1] || null; }

  // Ras: finn alt som ikke lenger har støtte (dekkefelt, vegger og møbler på dem, taket), gjenta til ingenting mer faller
  function ras(m) {
    const ut = [], pk = prøvepunkter(m);
    for (let runde = 0; runde < 12; runde++) {
      let falt = 0;
      for (let k = 0; k < m.etasjer.length; k++) {
        const e = m.etasjer[k], under = m.etasjer[k - 1];
        // ytterveggene og gavlene står på ytterveggene under (samme kant)
        if (under) for (const w of e.vegger) { if (!står(w) || (w.type !== 'ytter' && w.type !== 'gavl') || w.kant === undefined) continue;
          const u = under.vegger.find(q => q.type === 'ytter' && q.kant === w.kant), bj = under.bjelker.some(b => står(b) && avstSeg((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2, b.a[0], b.a[1], b.b[0], b.b[1]) < .4);
          if (u && !står(u) && !bj) { w.tilstand = 'rast'; ut.push({ e: e.n, del: 'vegg', id: w.id }); falt++; } }
        if (!under || !e.dekke.felt.length) continue;
        const S = støtter(under);
        // (B4) byggesettets felt har eget omriss (f.P) og eget spenn (f.spenn); kartets hus har ett felt per rom
        for (const f of e.dekke.felt) { if (f.tilstand !== 'hel' && f.tilstand !== 'skadet') continue; const r = f.P ? f : e.rom[f.rom]; if (!r) continue; const halv = f.spenn || e.dekke.spenn || 3;
          let n = 0, løs = 0; for (const [x, y] of f.P ? feltPunkter(f.P) : pk) if (f.P || inni(r.P, x, y)) { n++; if (nærmest(S, x, y) > halv) løs++; }
          if (n && løs / n >= REGLER.rasAndel) { f.tilstand = 'rast'; ut.push({ e: e.n, del: 'dekke', id: f.id }); falt++;
            // det som stod på feltet, faller med
            for (const q of e.møbler) if (q.tilstand === 'hel' && inni(r.P, q.x, q.y)) { q.tilstand = 'ødelagt'; ut.push({ e: e.n, del: 'møbel', id: q.id }); }
            for (const w of e.vegger) if (står(w) && w.type === 'skille' && inni(r.P, (w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2)) { w.tilstand = 'rast'; ut.push({ e: e.n, del: 'vegg', id: w.id }); } } }
      }
      // taket
      const øv = m.etasjer.filter(e => !e.loft && e.tilstand !== 'revet').slice(-1)[0];
      if (øv) { const S = støtter(øv).concat(m.etasjer.filter(e => e.loft).flatMap(e => e.vegger.filter(w => står(w)).map(w => [w.a[0], w.a[1], w.b[0], w.b[1]]))), A = m.akse;
        for (const f of m.tak.felt) { if (f.tilstand !== 'hel' && f.tilstand !== 'skadet') continue; let n = 0, løs = 0;
          // (B4) byggesettets takfelt: ligger på etasjen f.n og har eget omriss og spenn
          if (f.P) { const et = m.etasjer.find(q => q.n === f.n && !q.loft), S2 = et ? støtter(et) : S; for (const [x, y] of feltPunkter(f.P)) { n++; if (nærmest(S2, x, y) > f.spenn) løs++; } }
          else for (const [x, y, u] of pk) if (u >= f.u0 && u < f.u1) { n++; if (nærmest(S, x, y) > m.tak.spenn) løs++; }
          if (n && løs / n >= REGLER.rasAndel) { f.tilstand = 'rast'; ut.push({ e: null, del: 'tak', id: f.id }); falt++; } } }
      if (!falt) break;
    }
    return ut;
  }
  // materialene et ras gir (skrot: en del av det som falt)
  function rasMat(m, R) { const M = {};
    for (const r of R) { if (r.del === 'tak') { const f = m.tak.felt[r.id], A = (f.u1 - f.u0) * (m.akse.v1 - m.akse.v0); legg(M, REGLER.rivingTak, A * REGLER.rasGir); continue; }
      const e = finnEt(m, r.e); if (!e) continue;
      if (r.del === 'vegg') { const w = e.vegger[r.id]; legg(M, REGLER.riving[w.stoff] || {}, veggAreal(e, w) * REGLER.rasGir); }
      if (r.del === 'dekke') { const ro = e.rom[r.id]; legg(M, REGLER.riving[e.dekke.stoff] || {}, (ro ? ro.areal : 0) * REGLER.rasGir); } }
    return M; }

  function endre(m, d) {
    const svar = { ok: false, materialer: {}, timer: 0, ras: [], tekst: tekst(d, m.hus) }, nei = t => Object.assign(svar, { feil: t });
    if (!d || !d.del || !d.gjør) return nei('Ukjent endring.');
    const et = d.del === 'tak' ? null : finnEt(m, d.e); if (d.del !== 'tak' && !et) return nei('Etasjen finnes ikke.');
    if (et && et.tilstand === 'revet') return nei('Etasjen er revet.');
    const T = REGLER.rivTid;
    if (d.del === 'vegg') {
      const w = et.vegger[d.id]; if (!w) return nei('Veggen finnes ikke.'); if (!står(w)) return nei('Veggen står ikke lenger.');
      // (B6, ut5-kampvegger) skudd og granater skader en vegg: hel -> skadet -> ødelagt (ødelagt bærer ikke, så det over kan rase)
      if (d.gjør === 'skad') { w.tilstand = w.tilstand === 'skadet' ? 'ødelagt' : 'skadet'; svar.timer = 0; }
      else if (d.gjør !== 'riv') return nei('Ukjent endring for en vegg.');
      else {
      const A = veggAreal(et, w); legg(svar.materialer, REGLER.riving[w.stoff] || {}, A);
      for (const o of et.åpninger) if (o.vegg === w.id && o.type === 'vindu' && o.tilstand === 'hel') legg(svar.materialer, REGLER.rivingVindu, o.b * o.h);
      svar.timer = r2(A * (T[w.stoff] || .05) * (w.bærende ? 2 : 1));
      if (w.bærende && !et.bjelker.some(b => står(b) && b.vegg === w.id)) svar.advarsel = 'Bærende vegg: uten bjelke kan det over rase.';
      w.tilstand = 'revet'; for (const o of et.åpninger) if (o.vegg === w.id) o.tilstand = 'revet';
      }
    } else if (d.del === 'åpning') {
      if (d.gjør === 'ny') {
        const w = et.vegger[d.vegg]; if (!w || !står(w)) return nei('Veggen finnes ikke.');
        const L = veggL(w), b = d.b || (d.type === 'port' ? 2.4 : d.type === 'vindu' ? 1.2 : .9), t = d.t === undefined ? L / 2 : d.t, type = d.type || 'dør';
        if (!/^(dør|vindu|port|hull)$/.test(type)) return nei('Ukjent åpning.');
        // (B6) et hull etter en granat eller sprengstoff: ingen bjelke, ingen materialer, og det står åpent (tilstand ødelagt)
        if (type === 'hull') { const hb = Math.min(b, L - .7), ht = Math.max(.3 + hb / 2, Math.min(L - .3 - hb / 2, t));
          if (et.åpninger.some(o => o.vegg === w.id && o.tilstand !== 'revet' && Math.abs(o.t - ht) < (o.b + hb) / 2)) return nei('Det er en åpning der allerede.');
          et.åpninger.push({ id: et.åpninger.length, vegg: w.id, t: r2(ht), b: r2(hb), h: r2(Math.min(d.h || 1.2, et.takhøyde - .1)), ned: r2(d.ned === undefined ? .3 : d.ned), type, stoff: w.stoff, sperre: null, tilstand: 'ødelagt', ny: true });
          svar.id = et.åpninger.length - 1;
        } else {
        if (t - b / 2 < .3 || t + b / 2 > L - .3) return nei('For nær hjørnet.');
        if (et.åpninger.some(o => o.vegg === w.id && o.tilstand !== 'revet' && Math.abs(o.t - t) < (o.b + b) / 2 + .2)) return nei('Det er en åpning der allerede.');
        if (w.bærende && !d.bjelke) return nei('Bærende vegg: åpningen krever en bjelke over (bjelke: sant).');
        const h = type === 'vindu' ? 1.2 : type === 'port' ? Math.min(REGLER.portHøyde, et.takhøyde - .2) : REGLER.dørHøyde, ned = type === 'vindu' ? .9 : 0;
        et.åpninger.push({ id: et.åpninger.length, vegg: w.id, t: r2(t), b: r2(b), h, ned, type, stoff: åpStoff(type), sperre: null, tilstand: 'hel', ny: true, ...(d.bjelke ? { bjelke: true } : {}) });
        legg(svar.materialer, REGLER.riving[w.stoff] || {}, b * h); svar.timer = r2(b * h * (T[w.stoff] || .05) * 2 + (d.bjelke ? 1 : 0)); svar.id = et.åpninger.length - 1;
        }
      } else {
        const o = et.åpninger[d.id]; if (!o || o.tilstand === 'revet') return nei('Åpningen finnes ikke.');
        if (d.gjør === 'tett' || d.gjør === 'barrikader') { o.sperre = d.gjør === 'tett' ? 'tettet' : 'planker'; svar.timer = .3; }
        else if (d.gjør === 'åpne') { if (!o.sperre) return nei('Åpningen er ikke sperret.'); o.sperre = null; svar.timer = .1; legg(svar.materialer, { tre: .02 }, 1); }
        else if (d.gjør === 'riv') { if (o.type === 'vindu' && o.tilstand === 'hel') legg(svar.materialer, REGLER.rivingVindu, o.b * o.h); o.tilstand = 'ødelagt'; svar.timer = .1; }
        else return nei('Ukjent endring for en åpning.');
      }
    } else if (d.del === 'bjelke') {
      if (d.gjør !== 'ny') return nei('Ukjent endring for en bjelke.');
      const w = et.vegger[d.vegg]; if (!w) return nei('Veggen finnes ikke.');
      // bjelken legges langs veggen og forlenges til den hviler på en bærende vegg i hver ende (høyst 8 m); finnes ingen, får enden en søyle
      // (bærende vegger på samme linje regnes ikke: bjelken går gjennom dem til noe som står på tvers, eller en søyle)
      const L = veggL(w), ex = (w.b[0] - w.a[0]) / L, ey = (w.b[1] - w.a[1]) / L, påLinja = q => { const dx = q[2] - q[0], dy = q[3] - q[1], l = Math.hypot(dx, dy);
        return l > 1e-6 && Math.abs(dx / l * ey - dy / l * ex) < .02 && Math.abs((q[0] - w.a[0]) * ey - (q[1] - w.a[1]) * ex) < .06; };
      const S = støtter(et).filter(q => !påLinja(q));
      const ende = (p, r) => { for (let k = 0; k <= 80; k++) { const q = [p[0] + r * ex * k * .1, p[1] + r * ey * k * .1]; if (!inni(m.P, q[0], q[1]) && k) break; if (nærmest(S, q[0], q[1]) < .3) return pkt(q); } return null; };
      let a = ende(w.a, -1), b = ende(w.b, 1); svar.søyler = 0;
      if (!a) { a = w.a.slice(); et.søyler.push({ id: et.søyler.length, x: a[0], y: a[1], stoff: 'stål', tilstand: 'hel' }); svar.søyler++; }
      if (!b) { b = w.b.slice(); et.søyler.push({ id: et.søyler.length, x: b[0], y: b[1], stoff: 'stål', tilstand: 'hel' }); svar.søyler++; }
      et.bjelker.push({ id: et.bjelker.length, vegg: w.id, a, b, stoff: 'stål', tilstand: 'hel' }); svar.timer = 2 + svar.søyler; svar.id = et.bjelker.length - 1;
    } else if (d.del === 'søyle') {
      if (d.gjør === 'ny') { if (!inni(m.P, d.x, d.y)) return nei('Søylen må stå inne i bygget.'); et.søyler.push({ id: et.søyler.length, x: r2(d.x), y: r2(d.y), stoff: 'stål', tilstand: 'hel' }); svar.timer = 1; svar.id = et.søyler.length - 1; }
      else if (d.gjør === 'riv') { const q = et.søyler[d.id]; if (!q || !står(q)) return nei('Søylen finnes ikke.'); q.tilstand = 'revet'; legg(svar.materialer, { stål: .05 }, 1); svar.timer = .5; }
      else return nei('Ukjent endring for en søyle.');
    } else if (d.del === 'dekke') {
      const f = et.dekke.felt[d.id]; if (!f || f.tilstand !== 'hel' && f.tilstand !== 'skadet') return nei('Dekket finnes ikke her.'); if (d.gjør !== 'riv') return nei('Ukjent endring for et dekke.');
      const r = et.rom[f.rom], A = r ? r.areal : 0; legg(svar.materialer, REGLER.riving[et.dekke.stoff] || {}, A); svar.timer = r2(A * (T[et.dekke.stoff] || .05));
      f.tilstand = 'revet'; if (r) for (const q of et.møbler) if (q.tilstand === 'hel' && inni(r.P, q.x, q.y)) { q.tilstand = 'ødelagt'; svar.ras.push({ e: et.n, del: 'møbel', id: q.id }); }
    } else if (d.del === 'tak') {
      const f = m.tak.felt[d.id]; if (!f || f.tilstand !== 'hel' && f.tilstand !== 'skadet') return nei('Taket finnes ikke her.'); if (d.gjør !== 'riv') return nei('Ukjent endring for taket.');
      const A = (f.u1 - f.u0) * (m.akse.v1 - m.akse.v0); legg(svar.materialer, REGLER.rivingTak, A); svar.timer = r2(A * .02); f.tilstand = 'revet';
    } else if (d.del === 'møbel') {
      const q = et.møbler[d.id]; if (!q || q.tilstand !== 'hel') return nei('Tingen finnes ikke.');
      if (d.gjør === 'fjern') q.tilstand = 'revet'; else if (d.gjør === 'ødelegg') q.tilstand = 'ødelagt'; else return nei('Ukjent endring for en ting.');
    } else if (d.del === 'etasje') {
      if (d.gjør !== 'riv') return nei('Ukjent endring for en etasje.');
      const k = m.etasjer.indexOf(et); if (m.etasjer.slice(k + 1).some(e => e.tilstand !== 'revet')) return nei('Riv etasjene over først.');
      for (const w of et.vegger) if (står(w)) { legg(svar.materialer, REGLER.riving[w.stoff] || {}, veggAreal(et, w)); w.tilstand = 'revet'; }
      for (const f of et.dekke.felt) if (f.tilstand === 'hel') { const r = et.rom[f.rom]; legg(svar.materialer, REGLER.riving[et.dekke.stoff] || {}, r ? r.areal : 0); f.tilstand = 'revet'; }
      for (const o of et.åpninger) o.tilstand = 'revet'; for (const q of et.møbler) if (q.tilstand === 'hel') q.tilstand = 'revet';
      if (!m.etasjer.slice(0, k).some(e => e.tilstand !== 'revet' && !e.kjeller) || m.etasjer.slice(k + 1).every(e => e.tilstand === 'revet')) for (const f of m.tak.felt) if (f.tilstand === 'hel') { legg(svar.materialer, REGLER.rivingTak, (f.u1 - f.u0) * (m.akse.v1 - m.akse.v0)); f.tilstand = 'revet'; }
      for (const t of m.trapper) if (t.til === et.n || t.fra === et.n) t.tilstand = 'revet';
      et.tilstand = 'revet'; svar.timer = r2(Object.values(svar.materialer).reduce((a, b) => a + b, 0) * 2);
    } else return nei('Ukjent del.');
    // ras etter endringen
    const R = ras(m); svar.ras.push(...R); if (R.length) legg(svar.materialer, rasMat(m, R), 1);
    svar.ok = true; m.endringer.push(Object.assign({}, d)); return svar;
  }
  // Hva ville skjedd? (byggelaget sier fra før det river): samme svar som endre, men modellen er uendret
  function vurder(m, d) { return endre(kopi(m), d); }
  // Det endrede bygget: modellen fra kartet (eller byggesettet) med endringsloggen lagt på. logg = [endring] eller { endringer }.
  function medEndringer(m, logg) {
    const ut = kopi(m), L = Array.isArray(logg) ? logg : logg && logg.endringer || []; ut.endringer = []; ut.svar = [];
    for (const d of L) { const s = endre(ut, d); ut.svar.push({ ok: s.ok, feil: s.feil, ras: s.ras.length }); }
    return ut;
  }

  // ---------- byggesettet (spill/byggesett.js) som samme modell ----------
  // deler = [{ id, type, i, j, a, n, r, s, ferdig }] (Byggesett: fraLeir, plassene i 1,2 m-ruter). o = { ox, oy } (rutenettets hjørne).
  // B4 (byggesett 3): delene har størrelse (s ruter), søyler, bjelker, trapper og stoff per del; hvert dekke- og takfelt er én rute med
  // eget omriss (P), spennet for stoffet (spenn = halve) og «bredde» (2 × lengste avstand til en støtte) – ras() bruker dem.
  function fraByggesett(deler, o = {}) {
    const BS = rot.ByggesettRegler || (typeof require === 'function' ? (() => { try { return require('./byggesett.js'); } catch (e) { return null; } })() : null);
    if (!BS) return null;
    const D = BS.DELER, G = BS.U || BS.G, H = BS.H, ox = o.ox || 0, oy = o.oy || 0, liste = (BS.norm ? BS.norm(deler) : deler || []).filter(d => D[d.type] && d.ferdig !== false).map(d => ({ ...d, s: d.s || BS.størrelse(d.type) }));
    const stoff = s => s === 'stein' ? 'mur' : s === 'blikk' ? 'stål' : s, kat = d => D[d.type].kat, halv = st => (BS.STOFF[st] ? BS.STOFF[st].spenn : 6) / 2;
    const celler = new Map(); for (const d of liste) if (kat(d) === 'gulv' || kat(d) === 'tak') for (const [i, j] of BS.ruter(d)) celler.set(`${i},${j},${d.n}`, d);
    const trappRute = new Set(); for (const d of liste) if (kat(d) === 'trapp') for (const [i, j] of BS.ruter(d)) trappRute.add(`${i},${j},${d.n}`);
    // omrisset: rammen rundt alle gulvrutene i 1. etasje (bygg av flere hus deles ikke opp)
    let i0 = Infinity, j0 = Infinity, i1 = -Infinity, j1 = -Infinity, n0 = 0;
    for (const d of liste) if (kat(d) === 'gulv' && d.n === 0) for (const [i, j] of BS.ruter(d)) { n0++; i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i + 1); j1 = Math.max(j1, j + 1); }
    // (o.utenGulv: byggesettets spennsjekk – tak på vegger uten gulv regnes også; rammen er da alle rutene)
    if (!n0 && o.utenGulv) for (const d of liste) if (kat(d) === 'gulv' || kat(d) === 'tak') for (const [i, j] of BS.ruter(d)) { n0++; i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i + 1); j1 = Math.max(j1, j + 1); }
    if (!n0) return null;
    const X = i => r2(ox + i * G), Y = j => r2(oy + j * G), P = [[X(i0), Y(j0)], [X(i1), Y(j0)], [X(i1), Y(j1)], [X(i0), Y(j1)]];
    const ruteP = (i, j) => [[X(i), Y(j)], [X(i + 1), Y(j)], [X(i + 1), Y(j + 1)], [X(i), Y(j + 1)]];
    const m = { v: 1, kilde: 'byggesett', hus: null, kl: 'leirbygg', t: null, h: 0, stil: null, P, akse: { ux: 1, uy: 0, vx: 0, vy: 1, u0: X(i0), u1: X(i1), v0: Y(j0), v1: Y(j1) },
      høyde: { vegg: 0, møne: 0 }, tak: { form: 'flatt', stoff: 'tre', møne: 0, felt: [], vinduer: [], spenn: 99 }, etasjer: [], trapper: [], endringer: [] };
    const nmaks = Math.max(0, ...liste.filter(d => kat(d) !== 'tak' && kat(d) !== 'forsvar').map(d => d.n));
    const R = BS.rom(liste);
    for (let n = 0; n <= nmaks; n++) {
      const gulv = liste.filter(d => kat(d) === 'gulv' && d.n === n), e = nyEtasje(n + 1, (n + 1) + '. etasje', n * H, H, H - .25, gulv[0] ? stoff(D[gulv[0].type].stoff) : 'tre');
      for (const d of gulv) for (const [i, j] of BS.ruter(d)) { const st = stoff(D[d.type].stoff); e.dekke.felt.push({ id: e.dekke.felt.length, rom: null, del: d.id, i, j, P: ruteP(i, j), stoff: D[d.type].stoff, spenn: halv(D[d.type].stoff), tilstand: 'hel', st }); }
      for (const d of liste) {
        if (d.n !== n) continue; const K = kat(d), DD = D[d.type];
        if (K === 'vegg') { const [a, b] = BS.kantEnder({ ox, oy }, d).map(p => [r2(p[0]), r2(p[1])]), L = d.s * G;
          const mk = BS.kanter(d)[Math.floor(d.s / 2)] || d, sider = mk.a === 'x' ? [[mk.i, mk.j - 1], [mk.i, mk.j]] : [[mk.i - 1, mk.j], [mk.i, mk.j]];
          const inne = sider.filter(([i, j]) => celler.has(`${i},${j},${n}`) && kat(celler.get(`${i},${j},${n}`)) === 'gulv').length;
          const id = e.vegger.length, s = stoff(DD.stoff); e.vegger.push({ id, a, b, type: inne >= 2 ? 'skille' : 'ytter', stoff: s, tykk: REGLER.tykk[s] || .2, bærende: true, tilstand: 'hel', del: d.id });
          if (DD.v && DD.v !== 'hel') e.åpninger.push({ id: e.åpninger.length, vegg: id, t: r2(L / 2), b: r2(DD.v === 'port' ? Math.max(1.2, L - .5) : DD.v === 'vindu' ? Math.min(1.2, L - .4) : Math.min(.9, L - .3)),
            h: DD.v === 'vindu' ? 1.2 : DD.v === 'port' ? 2.4 : REGLER.dørHøyde, ned: DD.v === 'vindu' ? .9 : 0, type: DD.v, sperre: null, tilstand: 'hel', del: d.id }); }
        else if (K === 'søyle') e.søyler.push({ id: e.søyler.length, x: X(d.i), y: Y(d.j), stoff: stoff(DD.stoff), tilstand: 'hel', del: d.id });
      }
      // bjelkene: stykkene på samme linje som henger sammen blir én bjelke (endene må hvile på noe – Bygning.støtter)
      const bj = liste.filter(d => kat(d) === 'bjelke' && d.n === n).flatMap(d => BS.kanter(d).map(k => ({ ...k, d })));
      for (const ak of ['x', 'y']) { const L = bj.filter(k => k.a === ak).sort((p, q) => (ak === 'x' ? p.j - q.j || p.i - q.i : p.i - q.i || p.j - q.j)); let cur = null;
        for (const k of L) { const lin = ak === 'x' ? k.j : k.i, pos = ak === 'x' ? k.i : k.j;
          if (cur && cur.lin === lin && cur.slutt === pos) { cur.slutt = pos + 1; continue; }
          if (cur) e.bjelker.push(cur.b(cur)); cur = { lin, start: pos, slutt: pos + 1, d: k.d, b: c => ({ id: e.bjelker.length, a: ak === 'x' ? [X(c.start), Y(c.lin)] : [X(c.lin), Y(c.start)], b: ak === 'x' ? [X(c.slutt), Y(c.lin)] : [X(c.lin), Y(c.slutt)], stoff: stoff(D[c.d.type].stoff), tilstand: 'hel', del: c.d.id }) }; }
        if (cur) e.bjelker.push(cur.b(cur)); }
      // rommene fra byggesett.js (lukkede rom)
      for (const r of R.filter(q => q.etasje === n)) { const c = r.celler; let a = Infinity, b = Infinity, c1 = -Infinity, d1 = -Infinity; for (const [i, j] of c) { a = Math.min(a, i); b = Math.min(b, j); c1 = Math.max(c1, i + 1); d1 = Math.max(d1, j + 1); }
        e.rom.push({ id: e.rom.length, rolle: (r.type && r.type.id) || r.bruk || 'rom', P: [[X(a), Y(b)], [X(c1), Y(b)], [X(c1), Y(d1)], [X(a), Y(d1)]], areal: r.areal, andel: r.ruter / ((c1 - a) * (d1 - b)), navn: r.navn, nøkkel: r.nøkkel }); }
      for (const f of e.dekke.felt) { const r = e.rom.find(q => inni(q.P, X(f.i + .5), Y(f.j + .5))); f.rom = r ? r.id : null; }
      m.etasjer.push(e);
    }
    // takene: én rute per felt, med sin egen høyde (n = dekket) og sitt stoff; saltak når noen er saltak
    const tak = liste.filter(d => kat(d) === 'tak'); m.tak.form = tak.some(d => D[d.type].grunn === 'bs_tak_sal') ? 'saltak' : 'flatt';
    for (const d of tak) for (const [i, j] of BS.ruter(d)) { const st = D[d.type].stoff; m.tak.felt.push({ id: m.tak.felt.length, del: d.id, i, j, n: d.n, u0: X(i), u1: X(i + 1), P: ruteP(i, j), stoff: st === 'tak' ? 'tre' : st, spenn: halv(st === 'tak' ? 'tre' : st), tilstand: 'hel' }); }
    m.høyde.vegg = m.etasjer.length * H; m.h = m.høyde.vegg; merkStoff(m);
    // trappene i byggesettet: fra etasjen trappa står i til den over; nede = ruta foran foten, oppe = ruta etter toppen
    for (const d of liste.filter(q => kat(q) === 'trapp')) { const Rr = BS.ruter(d), [di, dj] = [[1, 0], [0, 1], [-1, 0], [0, -1]][(d.r || 0) & 3];
      const c = [(Rr[0][0] + Rr[2][0]) / 2 + .5, (Rr[0][1] + Rr[2][1]) / 2 + .5], x = X(c[0]), y = Y(c[1]);
      m.trapper.push({ id: m.trapper.length, fra: d.n + 1, til: d.n + 2, x, y, a: r2(Math.atan2(dj, di)), b: r2(G * .9), l: r2(3 * G), nede: [X(Rr[0][0] - di + .5), Y(Rr[0][1] - dj + .5)], oppe: [X(Rr[2][0] + di + .5), Y(Rr[2][1] + dj + .5)],
        form: 'rett', stoff: stoff(D[d.type].stoff), tilstand: 'hel', del: d.id }); }
    // gamle bygg (versjon 2) uten trapp: trapp antas inne (som før) ved den første ruta med gammelt gulv i begge etasjene
    for (let k = 1; k < m.etasjer.length; k++) { const hi = m.etasjer[k]; if (m.trapper.some(t => t.til === hi.n)) continue;
      const f = liste.find(d => kat(d) === 'gulv' && D[d.type].gammel && d.n === hi.n - 1 && celler.has(`${d.i},${d.j},${hi.n - 2}`));
      if (f) { const x = X(f.i + 1), y = Y(f.j + 1); m.trapper.push({ id: m.trapper.length, fra: hi.n - 1, til: hi.n, x, y, a: 0, b: .8, l: 1.2, nede: [r2(x - 1), y], oppe: [r2(x + 1), y], form: 'stige', stoff: 'tre', tilstand: 'hel', antatt: true }); } }
    // loft under saltak: når mønet ligger minst 2,2 m over loftsgulvet (byggesettets takvinkel ca. 30°, tan 0,58)
    const sal = tak.filter(d => D[d.type].grunn === 'bs_tak_sal');
    if (sal.length) { const nT = Math.max(...sal.map(d => d.n)), C = sal.filter(d => d.n === nT).flatMap(d => BS.ruter(d)), a = Math.min(...C.map(c => c[0])), b = Math.min(...C.map(c => c[1])), c1 = Math.max(...C.map(c => c[0])) + 1, d1 = Math.max(...C.map(c => c[1])) + 1;
      const møne = r2(Math.min(c1 - a, d1 - b) * G / 2 * .58); m.høyde.møne = møne; m.tak.møne = møne;
      if (møne >= 2.2 && nT === m.etasjer.length) { const e = nyEtasje(nT + 1, 'Loft', nT * H, møne, møne, 'tre'); e.loft = true; e.rom.push({ id: 0, rolle: 'loft', P: [[X(a), Y(b)], [X(c1), Y(b)], [X(c1), Y(d1)], [X(a), Y(d1)]], areal: r2((c1 - a) * (d1 - b) * G * G * .5), andel: .5, navn: 'Loft' }); m.etasjer.push(e); } }
    // bredden (spennet) over hvert felt: 2 × lengste avstand fra feltets punkter til en støtte under (for teksten «spennet er 8,4 m»)
    for (let k = 1; k < m.etasjer.length; k++) { const e = m.etasjer[k]; if (!e.dekke.felt.length) continue; const S = støtter(m.etasjer[k - 1]);
      for (const f of e.dekke.felt) f.bredde = r2(2 * Math.max(...feltPunkter(f.P).map(([x, y]) => nærmest(S, x, y)))); }
    const SE = new Map(); for (const f of m.tak.felt) { const et = m.etasjer.find(q => q.n === f.n); if (!et) continue; if (!SE.has(f.n)) SE.set(f.n, støtter(et)); f.bredde = r2(2 * Math.max(...feltPunkter(f.P).map(([x, y]) => nærmest(SE.get(f.n), x, y)))); }
    return m;
  }
  // punktene ras() prøver i et felt med eget omriss: midten og fire punkter halvveis ut mot hjørnene
  function feltPunkter(P) { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } x /= P.length; y /= P.length; return [[x, y], ...P.map(p => [(x + p[0]) / 2, (y + p[1]) / 2])]; }

  // ---------- små hjelpere ----------
  const telle = m => { const t = { etasjer: 0, vegger: 0, bærende: 0, åpninger: 0, vinduer: 0, dører: 0, rom: 0, møbler: 0, trapper: m.trapper.length };
    for (const e of m.etasjer) { if (!e.loft && !e.kjeller) t.etasjer++; t.vegger += e.vegger.length; t.bærende += e.vegger.filter(w => w.bærende).length; t.åpninger += e.åpninger.length;
      t.vinduer += e.åpninger.filter(o => o.type === 'vindu').length; t.dører += e.åpninger.filter(o => o.type !== 'vindu').length; t.rom += e.rom.length; t.møbler += e.møbler.length; }
    t.loft = m.etasjer.some(e => e.loft); t.kjeller = m.etasjer.some(e => e.kjeller); return t; };

  const api = { REGLER, EGNE_MØBLER, hash, klasse, høyder, fraKart, fraKartG, finnDør, endre, vurder, medEndringer, tekst, ras, fraByggesett, nås, nåsEtasje, rutenett, støtter, telle, står, inni, avstSeg, trappP, kopi };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Bygning = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
