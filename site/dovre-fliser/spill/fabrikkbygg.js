/* FABRIKKBYGG – ta et industribygg i kartet i bruk som fabrikk (28. nov, ut10-fabrikkbygg). Regler uten DOM
 * (Node: require('./fabrikkbygg'); nettleser: globalThis.Fabrikkbygg – lastes rett etter fabrikk-visning.js). Visningen:
 * spill/fabrikkbygg-visning.js.
 * Brukeren: «Lag det som ikke er bygget» – industribyggene skal kunne tas over som fabrikk, så maskinene der virkelig går.
 *
 *  - BRANSJENE med produksjonsregel (Industri.IND[t]): tømmer -> sagbruk (+ flishogger i store bygg), stein -> steinknuser, fisk ->
 *    fiskemottak (+ filetmaskin), mat -> mølle, olje -> raffineri, metall -> smie, gjenvinning -> ballepresse. De andre (trevare, gass,
 *    verft, kraft, lager, bryggeri, kjemi) kan ikke bli fabrikk – de tas over som lager eller verksted som andre hus (overtak.js).
 *  - MASKINENE blir vanlige maskiner i leiren: bygg i L.bygg med type «fb_<maskintype>» (Leir.BYGG, del: true – leir-visning tegner
 *    dem ikke, interiøret i huset har maskinene) og samme regler i produksjon.js (folk på «Maskiner», strøm fra leirens nett, råvare inn
 *    og ferdigvare ut gjennom lageret – bærerne går dit, spill/baering.js). b.fabrikk = husets nummer.
 *  - Istandsettingen koster (fast + per maskin) og tar tid (b.igjen: byggelaget setter maskinene i stand som andre jobber).
 *  - Bygget må ligge innen REGLER.maksAvstand fra leiren: bærerne og operatørene går dit, og strømmen trekkes dit i kabel.
 * Lagring i visningen: localStorage «riksbrudd-fabrikkbygg» = { v: 1, leir: 'x,y', hus: { [husnr]: { ind, maskiner: [byggId], navn, c, tid } } }.
 * ALLE TALL ER CLAUDES FORSLAG (REGLER).
 */
(function (rot) {
  'use strict';
  const hent = n => { try { return require(n); } catch (e) { return null; } };
  const NODE = typeof module !== 'undefined' && module.exports;
  const LB = () => rot.Leir || (NODE ? hent('./leir.js') : null);
  const PR = () => rot.Produksjon || (NODE ? hent('./produksjon.js') : null);

  const REGLER = {
    // meter fra leirens midte (bærerne går fram og tilbake: 1,5 km er ca. 18 minutter hver vei)
    maksAvstand: 1500,
    // istandsetting: maskinene er gamle og må overhales, strømmen trekkes dit. Billigere enn å bygge maskinen ny (sagbruket: 6 mill.),
    // men ikke gratis: fast + per maskin (kr), tid i spilltimer (byggelaget gjør jobben)
    istand: { fast: 800000, perMaskin: 1.6e6, timerFast: 2, timerPerMaskin: 3 },
    // et stort bygg (grunnflate i m²) får maskin nummer to i bransjen
    stort: 500,
    // maskinens fotavtrykk (meter rundt midten; bærerne og operatørene står foran det)
    fot: [-1.8, 1.8, -1.4, 1.4],
  };
  // bransje (Industri.IND) -> maskintypene (Produksjon.REGLER.maskiner), den første alltid, den andre i store bygg
  const MASKINER = { 1: ['sagbruk', 'flishogger'], 3: ['raffineri'], 5: ['steinknuser'], 6: ['fiskemottak', 'filetmaskin'], 7: ['mølle'], 8: ['smie'], 12: ['ballepresse'] };
  // bransjene uten produksjonsregel – og hva de kan brukes til i stedet
  const UTEN = { 2: 'trevare', 4: 'gass', 9: 'verft', 10: 'kraft og energi', 11: 'lager og logistikk', 13: 'bryggeri', 14: 'kjemi og plast' };
  // møblene i innredningen der maskinen står (første som finnes i huset); ellers midt i bygget
  const MØBEL = { sagbruk: ['sagbenk', 'rammesag', 'stokkbåndsag'], flishogger: ['flishogger', 'kantverk', 'barkemaskin'], steinknuser: ['knuser', 'kjegleknuser'],
    fiskemottak: ['sløyelinje', 'filetmaskin', 'sløyebenk'], filetmaskin: ['filetmaskin', 'platefryser', 'pakkebord'], mølle: ['pakkemaskin', 'pasteur', 'deigelter', 'kokekar'],
    raffineri: ['destillasjonskolonne', 'varmeveksler', 'tank'], smie: ['esse', 'kantpresse', 'dreiebenk'], ballepresse: ['ballepresse', 'sorteringsbånd'] };
  const NAVN = { sagbruk: 'Sagbruk', flishogger: 'Flishogger', steinknuser: 'Steinknuser', fiskemottak: 'Fiskemottak', filetmaskin: 'Filetmaskin', mølle: 'Mølle', raffineri: 'Raffineri', smie: 'Smie', ballepresse: 'Ballepresse' };
  const typeFor = mt => 'fb_' + mt;
  const erFabrikk = type => typeof type === 'string' && type.indexOf('fb_') === 0;

  // maskintypene et bygg av bransje ind med grunnflate areal får ([] = kan ikke bli fabrikk)
  function maskinerFor(ind, areal) { const M = MASKINER[ind]; if (!M) return []; return areal >= REGLER.stort ? M.slice(0, 2) : M.slice(0, 1); }
  const kan = ind => !!MASKINER[ind];
  // kan bygget tas i bruk som fabrikk? o = { ind, avstand, revet, alt, areal }
  function kanTa(o) {
    if (!o) return { ok: false, feil: 'Ukjent bygg.' };
    if (o.revet) return { ok: false, feil: 'Bygget er revet.' };
    if (o.alt) return { ok: false, feil: 'Bygget er alt en fabrikk.' };
    if (!kan(o.ind)) return { ok: false, feil: UTEN[o.ind] ? `Et bygg for ${UTEN[o.ind]} har ingen maskiner som kan settes i drift – ta det over som lager eller verksted.` : 'Bygget er ikke et industribygg med maskiner.' };
    if (!(o.avstand <= REGLER.maksAvstand)) return { ok: false, feil: `Bygget er for langt fra leiren (${(o.avstand / 1000).toFixed(1).replace('.', ',')} km – høyst ${(REGLER.maksAvstand / 1000).toFixed(1).replace('.', ',')} km, så folkene kan gå dit og bære).` };
    return { ok: true };
  }
  // pris og tid for istandsettingen av maskinene
  function istand(maskiner) { const I = REGLER.istand, n = maskiner.length; return { kr: Math.round((I.fast + n * I.perMaskin) / 10000) * 10000, timer: Math.round((I.timerFast + n * I.timerPerMaskin) * 2) / 2 }; }
  // hvor maskin mt står: møblene (kartets meter: { type, x, y, a }) i huset, ellers midten c. Gir { x, y, ret }
  function plass(mt, møbler, c, brukt) {
    for (const t of MØBEL[mt] || []) { const q = (møbler || []).find(m => m.type === t && !(brukt && brukt.has(m))); if (q) { if (brukt) brukt.add(q); return { x: q.x, y: q.y, ret: q.a || 0 }; } }
    return { x: c[0], y: c[1], ret: 0 };
  }
  // byggene i leiren for et overtatt hus: [{ id, type, x, y, ret, igjen, totalt, hp, nivå, pris, fabrikk }]. igjen = istandsettingen i
  // arbeidstimer (byggelaget gjør den); test: true -> ferdig straks
  function lagBygg(o) {
    const mt = maskinerFor(o.ind, o.areal), I = istand(mt), brukt = new Set(), per = mt.length ? I.timer / mt.length : 0; let id = o.id0;
    return mt.map(m => { const p = plass(m, o.møbler, o.c, brukt); return { id: id++, type: typeFor(m), x: p.x, y: p.y, ret: p.ret, igjen: o.straks ? 0 : per, totalt: per, hp: 1, nivå: 1, pris: 0, fabrikk: o.hus }; });
  }
  // Leir.BYGG får typene (en gang): navn, strøm som maskinen, ingen pris (istandsettingen betales for seg), del: true
  function registrer(L) {
    L = L || LB(); const P = PR(); if (!L || !L.BYGG || !P) return false;
    for (const ms of Object.values(MASKINER)) for (const mt of ms) { const R = P.REGLER.maskiner[mt]; if (!R) continue; const t = typeFor(mt);
      if (!L.BYGG[t]) L.BYGG[t] = { navn: (NAVN[mt] || mt) + ' (fabrikkbygg)', pris: 0, tid: istand([mt]).timer, kw: -(R.kw || 0), del: true, fabrikkbygg: true, maskin: true, maskinType: mt,
        fot: REGLER.fot.slice(), mat: {}, tekst: `${NAVN[mt] || mt} i et industribygg dere har tatt i bruk (${R.folk} folk, ${R.kw} kW)` }; }
    if (Array.isArray(L.PRIORITET)) for (const ms of Object.values(MASKINER)) for (const mt of ms) { const t = typeFor(mt); if (L.BYGG[t] && !L.PRIORITET.includes(t)) L.PRIORITET.push(t); }
    return true;
  }
  // lagring per leir
  const nyLogg = leir => ({ v: 1, leir: leir || '', hus: {} });
  function lesLogg(tekst, leir) { try { const d = JSON.parse(tekst || 'null'); if (d && d.v === 1 && d.leir === (leir || '') && d.hus && typeof d.hus === 'object') return d; } catch (e) { /* ødelagt */ } return nyLogg(leir); }

  const api = { REGLER, MASKINER, UTEN, MØBEL, NAVN, typeFor, erFabrikk, maskinerFor, kan, kanTa, istand, plass, lagBygg, registrer, nyLogg, lesLogg };
  if (NODE) module.exports = api; else rot.Fabrikkbygg = api;
  registrer();
})(typeof globalThis !== 'undefined' ? globalThis : this);
