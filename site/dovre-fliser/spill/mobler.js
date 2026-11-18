/* Riksbrudd – FLYTTBARE MØBLER (18. nov kveld, brukeren: «Flyttbare møbler og alt» – som i Project Zomboid: inspirasjonen, ikke en kopi).
 * Regler uten DOM (Node: require('./mobler'); nettleser: globalThis.Mobler). Visningen er spill/mobler-visning.js. Test: pipeline/fliser/test_mobler.js.
 *  HVERT MØBEL har en fast nøkkel «bygg:type:nr» (nr = nummeret blant like møbler i planen fra spill/interior.js, i planens rekkefølge –
 *   samme nøkkel som beholderne i spill/lut.js, så innholdet følger møbelet).
 *  FLYTTET: { nøkkel: { i, X, Y, a, type, b, d, h, f, sperrer } } – i = bygget det står i nå (byggets nummer), null = ute, 'bæres' = i
 *   hendene dine. X/Y er kartets meter (utsnittet byttes), a er retningen. bruk(plan, i, F, cx, cy) tar de flyttede møblene ut av planen
 *   de kom fra og setter inn dem som står i bygget nå – da følger veggene, kollisjonen (Interior.blokkert) og 3D-bildet med.
 *  VEKT: VEKT per type (kg); typer som ikke står der (nye møbler), får vekt fra målene. Tyngre enn maksKg kan du ikke bære alene;
 *   over stor (eller lengste side over storSide) bærer du det i armene: tregere, ingen løping og ingen skyting.
 *  PLASS: kanSettes(plan, m) – inne i omrisset, ikke gjennom en vegg, ikke oppå et annet møbel, ikke i en døråpning eller foran inngangen.
 * Alle tallene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  // Claudes forslag, alle sammen
  const REGLER = {
    nær: 1.3,          // m fra møbelkanten du kan plukke det opp
    maksKg: 85,        // tyngre enn dette bærer du ikke alene
    stor: 18,          // kg: over dette bæres møbelet i armene (tregere, ingen løping eller skyting)
    storSide: 1.3,     // m: et møbel med lengste side over dette er også stort
    innhold: 20,       // kg innhold som følger med en beholder; mer må tas ut først
    fart: .72,         // farten når du bærer et stort møbel
    foran: .9,         // spøkelset står så langt foran deg (pluss halve møbelet)
    foranSmal: 1.6,    // på smale skjermer (telefon på høykant) lenger ut, så det ikke fyller bildet
    luft: .02,         // m mellom møbler
    dør: .45,          // m fri plass rundt en døråpning
    inngang: .7,       // m fri plass innenfor inngangen
    vegg: .14,         // m fra en vegg (halv veggtykkelse og litt til)
    tetthet: 22,       // kg per m³ av målene for møbler uten egen vekt
    bratt: .45,        // m høydeforskjell under møbelet ute
  };
  // kg per type (Claudes anslag av vanlige møbler)
  const VEKT = {
    sofa: 45, salongbord: 12, tvbenk: 18, bokhylle: 25, lenestol: 20, spisebord: 25, stol: 4, plante: 6, teppe: 5,
    kjøkkenbenk: 70, kjøleskap: 65, komfyr: 50, seng: 35, dobbeltseng: 55, nattbord: 8, skap: 50, toalett: 25, vask: 15, dusj: 40,
    skohylle: 5, knagger: 3, pult: 25, kontorstol: 9, arkivskap: 30, skranke: 60, benk: 15, skolepult: 10, kateter: 25, tavle: 20,
    sykeseng: 60, reol: 40, kasse: 50, kjøledisk: 110, plantebed: 60, pall: 25, pallereol: 140, arbeidsbenk: 45, maskin: 300, tønne: 15,
    høyball: 250, bås: 200, traktor: 3000, bil: 1200, vedstabel: 200, hylle: 20, kirkebenk: 40, alter: 80, prekestol: 70, fly: 5000,
    verktøyvogn: 30, seterad: 35, køyeseng: 45, ovn: 60, kartbord: 50, radio: 30, langbord: 40,
  };
  // flate ting (tepper) kan ligge under andre møbler
  const FLAT = { teppe: 1 };
  // navn i bestemt form (knappene: «Plukk opp sofaen»), ellers typen
  const NAVN = { sofa: 'sofaen', salongbord: 'salongbordet', tvbenk: 'TV-benken', bokhylle: 'bokhylla', lenestol: 'lenestolen', spisebord: 'spisebordet',
    stol: 'stolen', plante: 'planten', teppe: 'teppet', kjøkkenbenk: 'kjøkkenbenken', kjøleskap: 'kjøleskapet', komfyr: 'komfyren', seng: 'senga',
    dobbeltseng: 'dobbeltsenga', nattbord: 'nattbordet', skap: 'garderoben', toalett: 'toalettet', vask: 'vasken', dusj: 'dusjen', skohylle: 'skohylla',
    knagger: 'knaggrekka', pult: 'skrivebordet', kontorstol: 'kontorstolen', arkivskap: 'arkivskapet', skranke: 'skranken', benk: 'benken',
    skolepult: 'pulten', kateter: 'kateteret', tavle: 'tavla', sykeseng: 'sykesenga', reol: 'reolen', kasse: 'kassa', kjøledisk: 'kjøledisken',
    plantebed: 'plantebedet', pall: 'pallen', pallereol: 'pallereolen', arbeidsbenk: 'arbeidsbenken', maskin: 'maskinen', tønne: 'tønna',
    høyball: 'høyballen', bås: 'båsen', traktor: 'traktoren', bil: 'bilen', vedstabel: 'vedstabelen', hylle: 'hylla', kirkebenk: 'kirkebenken',
    alter: 'alteret', prekestol: 'prekestolen', fly: 'flyet', verktøyvogn: 'verktøyvogna', seterad: 'seteraden', køyeseng: 'køyesenga', ovn: 'ovnen',
    kartbord: 'kartbordet', radio: 'radioen', langbord: 'langbordet' };
  const navn = type => NAVN[type] || type;

  const nøkkel = (i, type, k) => `${i}:${type}:${k}`;
  const vekt = m => { const v = VEKT[m.type]; if (v !== undefined) return v; return Math.max(2, Math.round((m.b || .5) * (m.d || .5) * (m.h || .8) * REGLER.tetthet * 10) / 10); };
  const stor = m => vekt(m) > REGLER.stor || Math.max(m.b || 0, m.d || 0) > REGLER.storSide;
  // kan du bære det? innKg = innholdet i møbelet (når det er en beholder)
  function kanBære(m, innKg = 0) {
    const v = vekt(m);
    if (v > REGLER.maksKg) return { ok: false, grunn: `${cap(navn(m.type))} veier ca. ${v} kg – for tungt å bære alene.` };
    if (innKg > REGLER.innhold) return { ok: false, grunn: `Ta ut det meste først: det ligger ${Math.round(innKg * 10) / 10} kg i ${navn(m.type)} (høyst ${REGLER.innhold} kg kan følge med).` };
    return { ok: true, kg: v + innKg, stor: stor(m) };
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // nøkkelen på hvert møbel i planen fra spill/interior.js (før noe er tatt ut, så numrene er de samme som i lut.js)
  function merk(pl, i) { const tel = {}; for (const m of pl.møbler) { if (m.nk) continue; const k = tel[m.type] = (tel[m.type] || 0) + 1; m.nk = nøkkel(i, m.type, k - 1); } return pl; }
  // de flyttede møblene: ut av bygget de kom fra, inn i bygget de står i nå (cx, cy = utsnittets midte – planen er i utsnittets meter)
  function bruk(pl, i, F, cx = 0, cy = 0) {
    merk(pl, i); if (!F) return 0; let n = 0;
    pl.møbler = pl.møbler.filter(m => !(F[m.nk] && !m.flyttet));
    for (const [nk, e] of Object.entries(F)) { if (!e || e.i !== i) continue;
      pl.møbler.push({ type: e.type, x: e.X - cx, y: e.Y - cy, a: e.a || 0, b: e.b, d: e.d, h: e.h, f: e.f || 0, sperrer: !!e.sperrer, nk, flyttet: true }); n++; }
    return n;
  }
  // de fire hjørnene (i planens meter)
  function hjørner(m, ekstra = 0) { const c = Math.cos(m.a || 0), s = Math.sin(m.a || 0), b = (m.b || .5) / 2 + ekstra, d = (m.d || .5) / 2 + ekstra;
    return [[-b, -d], [b, -d], [b, d], [-b, d]].map(([u, v]) => [m.x + u * c - v * s, m.y + u * s + v * c]); }
  // to rektangler med retning overlapper (skilleakser)
  function overlapp(A, B, luft = 0) {
    const a = hjørner(A, luft / 2), b = hjørner(B, luft / 2);
    for (const P of [a, b]) for (let i = 0; i < 2; i++) { const p = P[i], q = P[i + 1], ax = q[1] - p[1], ay = p[0] - q[0];
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity; for (const [x, y] of a) { const t = x * ax + y * ay; a0 = Math.min(a0, t); a1 = Math.max(a1, t); }
      for (const [x, y] of b) { const t = x * ax + y * ay; b0 = Math.min(b0, t); b1 = Math.max(b1, t); } if (a1 <= b0 || b1 <= a0) return false; }
    return true;
  }
  // korteste avstand fra et punkt til rektangelet (0 inni)
  function avstand(m, x, y) { const c = Math.cos(m.a || 0), s = Math.sin(m.a || 0), dx = x - m.x, dy = y - m.y, u = dx * c + dy * s, v = -dx * s + dy * c;
    return Math.hypot(Math.max(0, Math.abs(u) - (m.b || .5) / 2), Math.max(0, Math.abs(v) - (m.d || .5) / 2)); }
  // et linjestykke (en vegg) kommer nærmere rektangelet enn r
  function veggNær(m, ax, ay, bx, by, r) {
    const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / .1));
    for (let q = 0; q <= n; q++) { const t = q / n; if (avstand(m, ax + (bx - ax) * t, ay + (by - ay) * t) < r) return true; }
    return false;
  }
  // punkter langs kanten og inni (til sjekk av omrisset og bakken)
  function prøvepunkter(m, steg = .25) { const c = Math.cos(m.a || 0), s = Math.sin(m.a || 0), b = (m.b || .5) / 2, d = (m.d || .5) / 2, ut = [];
    const nu = Math.max(1, Math.ceil(2 * b / steg)), nv = Math.max(1, Math.ceil(2 * d / steg));
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { if (i && j && i < nu && j < nv && (i + j) % 2) continue; const u = -b + 2 * b * i / nu, v = -d + 2 * d * j / nv; ut.push([m.x + u * c - v * s, m.y + u * s + v * c]); }
    return ut; }

  // Kan møbelet m ({ type, x, y, a, b, d }) settes her i planen pl (fra spill/interior.js)? I = Interior (reglene for omrisset).
  // unntak = nøkkelen til møbelet du flytter (det står ikke i veien for seg selv). Gir { ok, grunn }.
  function kanSettes(pl, m, I, unntak) {
    if (!pl || !I) return { ok: false, grunn: 'Ikke noe rom her.' };
    for (const [x, y] of prøvepunkter(m)) { if (!I.inni(pl.P, x, y)) return { ok: false, grunn: 'Det går gjennom ytterveggen.' }; if (I.avstKant(pl.P, x, y) < REGLER.vegg - .04) return { ok: false, grunn: 'For tett inntil veggen.' }; }
    for (const v of pl.vegger || []) if (veggNær(m, v.ax, v.ay, v.bx, v.by, REGLER.vegg - .02)) return { ok: false, grunn: 'Det går gjennom en vegg.' };
    for (const d of pl.dører || []) if (avstand(m, d[0], d[1]) < (d[4] || .9) / 2 + REGLER.dør) return { ok: false, grunn: 'Det sperrer en døråpning.' };
    const inn = pl.inngang; if (inn && inn.inn && avstand(m, inn.inn[0], inn.inn[1]) < REGLER.inngang) return { ok: false, grunn: 'Det sperrer inngangen.' };
    if (!FLAT[m.type]) for (const o of pl.møbler) { if (o.nk && o.nk === unntak) continue; if (FLAT[o.type]) continue; if (overlapp(m, o, REGLER.luft)) return { ok: false, grunn: `Det står ${o.type === 'stol' ? 'en stol' : 'noe'} i veien.` }; }
    return { ok: true };
  }
  // Ute: fri(x, y) sier om et punkt er ledig (ikke vann, hus, tre eller et annet møbel), høyde(x, y) gir bakken
  function kanSettesUte(m, fri, høyde) {
    const P = prøvepunkter(m, .35); let lav = Infinity, høy = -Infinity;
    for (const [x, y] of P) { if (!fri(x, y)) return { ok: false, grunn: 'Ikke plass her.' }; if (høyde) { const z = høyde(x, y); lav = Math.min(lav, z); høy = Math.max(høy, z); } }
    if (høyde && høy - lav > REGLER.bratt) return { ok: false, grunn: 'For bratt.' };
    return { ok: true, z: høyde ? høy : 0 };
  }
  // spøkelset: midten foran deg (x, y, kurs a: du ser mot (−sin a, cos a)), retning = byggets akse (aks) + k · 90°
  function foran(x, y, a, m, k, aks = 0, avst = REGLER.foran) { const ret = aks + k * Math.PI / 2, dyb = Math.abs(Math.cos(ret - a)) * (m.d || .5) + Math.abs(Math.sin(ret - a)) * (m.b || .5), d = avst + dyb / 2;
    return { x: x - Math.sin(a) * d, y: y + Math.cos(a) * d, a: ret }; }

  const api = { REGLER, VEKT, FLAT, NAVN, navn, nøkkel, vekt, stor, kanBære, merk, bruk, hjørner, overlapp, avstand, veggNær, prøvepunkter, kanSettes, kanSettesUte, foran };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Mobler = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
