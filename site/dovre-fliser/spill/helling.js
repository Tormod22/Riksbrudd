/* Riksbrudd – HELLING OG FLAT PLASS (runde 8, 20. nov natt). Kritikken (telefon, /norge): leiren ble lagt i en bratt li ved Aurland, og
 * det første bygget fikk «For bratt her (11 m høydeforskjell under bygget)» – eneste vei ut var nytt spill. Kartet på 20–50 m viste
 * ingen helling, så man kunne ikke se hvor det var flatt.
 * Regler uten DOM (Node: require('./helling'); nettleser: globalThis.Helling). Samme bratt-regel som Leir.kanBygge (Leir.bratt):
 *  - vurder(): hvor bratt det er under et bygg på et sted (flatt / skrått med grunnmur / for bratt);
 *  - kart(): et rutenett med vurderingen for bygget du holder (visningen farger det grønt, gult og rødt);
 *  - førsteBygg(): får de første byggene (brakke, dieseltank, vakttårn, aggregat) plass på flat, tørr grunn rundt et punkt?
 *  - finnPlass(): nærmeste sted der de får plass (leirvalget foreslår det med «Flytt hit»).
 * Visningen ligger i spill/helling-visning.js. Test: node pipeline/fliser/test_helling.js
 */
(function (rot) {
  'use strict';
  const LB = typeof module !== 'undefined' && module.exports ? require('./leir') : rot.Leir;
  // Alle tallene er Claudes forslag:
  // nær: meter rundt leirpunktet der de første byggene må få plass (flagget står i leiren, og alt er godt innenfor de 300 m uten
  // reisetid i Leir.REGLER.reise.fri);
  // søk: hvor langt unna vi leter etter et flatere eller tørt sted; celle: meter mellom prøvepunktene (høydedataene har 8 m);
  // første: byggene som må få plass (opplæringen ber om brakke, tank, aggregat og vakttårn først), med mellomrom meter mellom dem;
  // flatAndel: høydeforskjell under flatAndel × grensa = «flatt» (grønt), opp til grensa = «skrått» (gult, grunnmur), over = rødt;
  // kartCelle/kartRadius: rutene i hellingskartet (meter) og hvor langt ut fra midten det regnes; maksForsøk: hvor mange steder
  // finnPlass prøver hele leiren på før den gir opp (holder søket raskt).
  const REGLER = { nær: 80, søk: 2000, celle: 8, første: ['brakke', 'drivstofftank', 'vakttårn', 'aggregat'], mellomrom: 2,
    flatAndel: .5, kartCelle: 4, kartRadius: 320, maksForsøk: 600 };
  const FLATT = 0, SKRÅTT = 1, BRATT = 2, UKJENT = 3, VANN = 4;

  // Høyden fra et vindu (lagVindu: x0, y0 = øvre venstre hjørne, r = rutestørrelse, w, h, H), lest mellom rutene – som kartFor i
  // leir-visning.js. Gir null utenfor vinduet eller der høyden mangler.
  function høydeFra(v) {
    if (!v || !v.H) return () => null;
    return (x, y) => { const fx = (x - v.x0) / v.r - .5, fy = (v.y0 - y) / v.r - .5, i = Math.floor(fx), j = Math.floor(fy), a = fx - i, b = fy - j;
      if (i < 0 || j < 0 || i + 1 >= v.w || j + 1 >= v.h) return null; const H = v.H, w = v.w, k = j * w + i;
      const z = H[k] * (1 - a) * (1 - b) + H[k + 1] * a * (1 - b) + H[k + w] * (1 - a) * b + H[k + w + 1] * a * b; return z === z ? z : null; };
  }
  // Arealklassen fra et vindu (32 m: 3 = vann, 255 = utenfor kartet). tørt(x, y) = ikke vann og innenfor kartet.
  function klasseFra(v) {
    if (!v || !v.K) return () => 2;
    return (x, y) => { const i = Math.floor((x - v.x0) / v.r), j = Math.floor((v.y0 - y) / v.r); return i < 0 || j < 0 || i >= v.w || j >= v.h ? 255 : v.K[j * v.w + i]; };
  }
  const tørtFra = klasse => (x, y) => { const k = klasse(x, y); return k !== 3 && k !== 255 && k !== undefined; };

  // Hvor bratt er det under bygget? -> { d (m høydeforskjell), grense, nivå: FLATT/SKRÅTT/BRATT, eller UKJENT uten høyder, VANN }
  function vurder(b, høyde, tørt) {
    if (tørt && ![...LB.hjørner(b), [b.x, b.y]].every(([x, y]) => tørt(x, y))) return { d: 0, grense: LB.brattGrense(b), nivå: VANN };
    const r = LB.bratt(b, høyde); if (r.n < 2) return { d: 0, grense: r.grense, nivå: UKJENT };
    return { d: r.d, grense: r.grense, nivå: r.d > r.grense ? BRATT : r.d > REGLER.flatAndel * r.grense ? SKRÅTT : FLATT };
  }
  // Rask utgave av vurder for mange steder med samme bygg og retning (søket og hellingskartet): hjørnene og grensa regnes én gang.
  // Gir nivået (FLATT/SKRÅTT/BRATT/UKJENT/VANN) – samme svar som vurder (testen sjekker det).
  function vurderer(type, ret, høyde, tørt) {
    const H0 = LB.hjørner({ type, x: 0, y: 0, ret: ret || 0 }), grense = LB.brattGrense({ type, x: 0, y: 0, ret: ret || 0 }), flat = REGLER.flatAndel * grense;
    const ox = H0.map(p => p[0]), oy = H0.map(p => p[1]);
    return (x, y) => {
      if (tørt && !(tørt(x, y) && tørt(x + ox[0], y + oy[0]) && tørt(x + ox[1], y + oy[1]) && tørt(x + ox[2], y + oy[2]) && tørt(x + ox[3], y + oy[3]))) return VANN;
      let lo = Infinity, hi = -Infinity, n = 0;
      for (let k = 0; k < 4; k++) { const z = høyde(x + ox[k], y + oy[k]); if (z === null || z === undefined || z !== z) continue; n++; if (z < lo) lo = z; if (z > hi) hi = z; }
      if (n < 2) return UKJENT; const d = hi - lo; return d > grense ? BRATT : d > flat ? SKRÅTT : FLATT;
    };
  }
  // Hellingskartet: nivået per rute (Uint8Array, rad 0 øverst) for bygget `type` med retning ret, i et område med øvre venstre hjørne
  // (x0, y1), w × h ruter på `celle` meter. Bygget står midt i ruta.
  function kart(type, ret, høyde, tørt, x0, y1, w, h, celle = REGLER.kartCelle) {
    const ut = new Uint8Array(w * h), v = vurderer(type, ret, høyde, tørt);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) ut[j * w + i] = v(x0 + (i + .5) * celle, y1 - (j + .5) * celle);
    return ut;
  }
  // forskyvningene innen r meter i steg på `celle`, nærmest først (gjenbrukes)
  const RINGER = new Map();
  function ringer(r, celle) {
    const n = r + '/' + celle; if (RINGER.has(n)) return RINGER.get(n); const ut = [], N = Math.ceil(r / celle);
    for (let j = -N; j <= N; j++) for (let i = -N; i <= N; i++) { const d = Math.hypot(i, j) * celle; if (d <= r) ut.push([i * celle, j * celle, d]); }
    ut.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]); RINGER.set(n, ut); return ut;
  }
  // litt større omriss (mellomrom) for overlapp-sjekken mellom byggene i prøven
  function utvidet(b, m) { const B = LB.BYGG[b.type], [x0, x1, y0, y1] = B.fot, c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0);
    return [[x0 - m, y0 - m], [x1 + m, y0 - m], [x1 + m, y1 + m], [x0 - m, y1 + m]].map(([u, v]) => [b.x + u * c - v * s, b.y + u * s + v * c]); }
  // Får de første byggene plass rundt (x, y)? Grådig: det største først, hvert på den nærmeste ruta (fra midten) der det er tørt, ikke for
  // bratt og ikke oppå de andre. -> { ok, plasser: [{ type, x, y, ret }], mangler: navnet på bygget som ikke fikk plass, d (brakkas
  // høydeforskjell midt på punktet), grense }. o: { nær, celle, typer, ret, flatFørst (det første bygget helst på flat grunn – uten
  // grunnmur – når det finnes innen nær; ellers skrått som før) }
  function førsteBygg(høyde, tørt, x, y, o = {}) {
    const R = REGLER, nær = o.nær || R.nær, celle = o.celle || R.celle, typer = o.typer || R.første, ret = o.ret || 0, plasser = [], omriss = [];
    const midt = vurder({ type: typer[0], x, y, ret }, høyde, tørt);
    for (const type of typer) { let funnet = null; const vt = vurderer(type, ret, høyde, tørt);
      const godta = () => (o.flatFørst && type === typer[0] && !plasser.length ? [[FLATT], [FLATT, SKRÅTT]] : [[FLATT, SKRÅTT, UKJENT]]);
      for (const lov of godta()) { for (const [dx, dy] of ringer(nær, celle)) { const nv = vt(x + dx, y + dy); if (!lov.includes(nv)) continue;
        const b = { type, x: x + dx, y: y + dy, ret }, P = LB.hjørner(b); if (omriss.some(Q => LB.overlapper(P, Q))) continue; funnet = b; break; } if (funnet) break; }
      if (!funnet) return { ok: false, plasser, mangler: LB.BYGG[type].navn, d: midt.d, grense: midt.grense, nivå: midt.nivå };
      plasser.push(funnet); omriss.push(utvidet(funnet, R.mellomrom)); }
    return { ok: true, plasser, mangler: null, d: midt.d, grense: midt.grense, nivå: midt.nivå };
  }
  // Nærmeste sted (innen o.søk meter) der leiren får plass til de første byggene: punktet er der brakka kan stå, og lovlig(x, y) (ikke i et
  // tettsted, i Norge, i spillområdet) må si ja. -> { x, y, m (meter unna), retning ('nordøst' …), forsøk } eller null.
  // o.flatFørst: helst et sted der brakka står flatt (uten grunnmur) – da letes det først etter det, og skrått godtas bare når det
  // ikke finnes flatt innen søket.
  function finnPlass(høyde, tørt, x, y, o = {}) {
    const R = REGLER, søk = o.søk || R.søk, celle = o.celle || R.celle, typer = o.typer || R.første, lovlig = o.lovlig || (() => true), maks = o.maksForsøk || R.maksForsøk;
    let forsøk = 0; const v0 = vurderer(typer[0], 0, høyde, tørt);
    for (const lov of o.flatFørst ? [[FLATT], [FLATT, SKRÅTT]] : [[FLATT, SKRÅTT]]) {
      for (const [dx, dy, d] of ringer(søk, celle)) { const cx = x + dx, cy = y + dy, nv = v0(cx, cy);
        if (!lov.includes(nv)) continue; if (!lovlig(cx, cy)) continue;
        if (++forsøk > maks) break;
        if (førsteBygg(høyde, tørt, cx, cy, o).ok) return { x: cx, y: cy, m: d, retning: retning(dx, dy), forsøk, flat: nv === FLATT }; } }
    return null;
  }
  // kompassretningen fra et punkt til et annet (y er nord)
  const RETNING = ['øst', 'nordøst', 'nord', 'nordvest', 'vest', 'sørvest', 'sør', 'sørøst'];
  const retning = (dx, dy) => (dx || dy ? RETNING[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8] : 'her');
  const meter = m => (m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km');
  // Teksten i leirvalget når stedet ikke går: r = førsteBygg(…)
  function brattTekst(r) {
    if (!r || r.ok) return '';
    if (r.mangler === LB.BYGG[REGLER.første[0]].navn) return `Bratt – ingen flat plass for en ${r.mangler.toLowerCase()} her` + (r.d > 0 && r.nivå === BRATT ? ` (${Math.round(r.d)} m høydeforskjell under den)` : '') + '.';
    return `For lite flat plass: det er ikke plass til ${r.mangler.toLowerCase()} ved siden av brakka innen ${meter(REGLER.nær)}.`;
  }
  const FORKLARING = 'Grønt = flatt, gult = skrått (bygget får grunnmur), rødt = for bratt for dette bygget.';
  const api = { REGLER, FLATT, SKRÅTT, BRATT, UKJENT, VANN, høydeFra, klasseFra, tørtFra, vurder, vurderer, kart, ringer, førsteBygg, finnPlass, retning, meter, brattTekst, FORKLARING };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Helling = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
