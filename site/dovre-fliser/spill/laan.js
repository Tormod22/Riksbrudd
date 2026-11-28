/* LÅN OG GJELD (ut6-kjeder 28. nov, fase Ø9 – planen kapittel 12): regler uten DOM (Node: require('./laan'); nettleser: globalThis.Laan).
 * To slags långivere:
 *   BANKEN  i en by dere har avtale med (handel eller medlem, spill/byavtale.js): lav rente, men den sier nei når dere skylder mye eller
 *           kassa er tom, og lånet må betales innen fristen – etter fristen dobles renten.
 *   LÅNEHAIEN  sier alltid ja (opp til et tak), men renten er høy. Etter fristen kommer «innkreverne»: ryktet synker (visningen) og
 *           renten øker til den doble.
 * Renten legges til gjelden én gang per døgn (rentes rente). Betaling går først til renten, så til lånet.
 * Alle tallene er Claudes forslag (REGLER).
 */
(function (rot) {
  'use strict';
  const REGLER = {
    bank: { rente: .004, frist: 30, maksPerBy: 8e6, maksSum: 20e6, gjeldMot: 1.5 },   // 0,4 % i døgnet (ca. 12 % i måneden), 30 døgn
    hai: { rente: .03, frist: 14, maks: 25e6 },                                       // 3 % i døgnet (ca. 50 % på 14 døgn)
    etterFrist: 2,          // renten ganges med dette når fristen er gått ut
    minst: 1e6, steg: 1e6,  // lånebeløp i hele millioner
  };
  const tall = v => (Number.isFinite(+v) ? +v : 0);
  const ny = () => ({ versjon: 1, lån: [], neste: 1, betaltRente: 0 });
  function fraJSON(o) {
    const S = ny(); if (!o || o.versjon !== 1 || !Array.isArray(o.lån)) return S;
    for (const l of o.lån) if (l && (l.kilde === 'bank' || l.kilde === 'hai') && tall(l.gjeld) > 0) S.lån.push({ id: tall(l.id), kilde: l.kilde, by: l.by || null, byNavn: l.byNavn || '', hoved: tall(l.hoved), gjeld: tall(l.gjeld), start: tall(l.start), frist: tall(l.frist), sistDag: tall(l.sistDag), purret: !!l.purret });
    S.neste = Math.max(tall(o.neste), ...S.lån.map(l => l.id + 1), 1); S.betaltRente = tall(o.betaltRente); return S;
  }
  const gjeld = (S, kilde) => S.lån.filter(l => !kilde || l.kilde === kilde).reduce((s, l) => s + l.gjeld, 0);
  const rente = l => (l.kilde === 'bank' ? REGLER.bank.rente : REGLER.hai.rente);
  const forfalt = (l, dag) => dag > l.frist;

  // Hva kan dere låne? byer = [{ id, navn }] med avtale (handel/medlem), kasse = kassa nå. Gir [{ kilde, by, byNavn, maks, rente, frist, grunn }]
  function tilbud(S, byer, kasse) {
    const B = REGLER.bank, H = REGLER.hai, ut = [], sumBank = gjeld(S, 'bank');
    for (const by of byer || []) {
      const iBy = S.lån.filter(l => l.kilde === 'bank' && String(l.by) === String(by.id)).reduce((s, l) => s + l.gjeld, 0);
      const forfalte = S.lån.some(l => l.kilde === 'bank' && l.purret);
      let maks = Math.min(B.maksPerBy - iBy, B.maksSum - sumBank), grunn = '';
      // banken vil ikke låne ut mer enn halvannen gang kassa (pluss 2 mill.) – «vis oss at dere har noe»
      maks = Math.min(maks, B.gjeldMot * Math.max(0, tall(kasse)) + 2e6 - sumBank);
      if (forfalte) { maks = 0; grunn = 'Dere har et banklån som har gått over fristen.'; }
      maks = Math.floor(Math.max(0, maks) / REGLER.steg) * REGLER.steg;
      if (!grunn && maks < REGLER.minst) grunn = 'Banken mener dere skylder nok.';
      ut.push({ kilde: 'bank', by: by.id, byNavn: by.navn, maks, rente: B.rente, frist: B.frist, grunn });
    }
    const hmaks = Math.floor(Math.max(0, H.maks - gjeld(S, 'hai')) / REGLER.steg) * REGLER.steg;
    ut.push({ kilde: 'hai', by: null, byNavn: '', maks: hmaks, rente: H.rente, frist: H.frist, grunn: hmaks < REGLER.minst ? 'Selv lånehaien vil ha pengene sine først.' : '' });
    return ut;
  }
  // Ta opp et lån: o = { kilde, by, byNavn, beløp, dag }. Gir { lån } eller { feil }.
  function ta(S, o, byer, kasse) {
    const t = tilbud(S, byer, kasse).find(q => q.kilde === o.kilde && (o.kilde === 'hai' || String(q.by) === String(o.by)));
    if (!t) return { feil: o.kilde === 'bank' ? 'Dere har ingen avtale med en by med bank.' : 'Ukjent långiver.' };
    const b = Math.round(tall(o.beløp) / REGLER.steg) * REGLER.steg;
    if (!(tall(o.beløp) >= REGLER.minst)) return { feil: 'Lån minst 1 mill. kr.' };
    if (t.grunn) return { feil: t.grunn };
    if (b > t.maks) return { feil: `De vil låne dere høyst ${Math.round(t.maks / 1e6)} mill. kr.` };
    const dag = Math.floor(tall(o.dag)), l = { id: S.neste++, kilde: t.kilde, by: t.by, byNavn: t.byNavn || o.byNavn || '', hoved: b, gjeld: b, start: dag, frist: dag + t.frist, sistDag: dag, purret: false };
    S.lån.push(l); return { lån: l };
  }
  // Ett døgn (eller flere) er gått: renten legges til. Gir { renter (kr lagt til), forfalt: [lån som nettopp gikk over fristen] }.
  function døgn(S, dag) {
    let renter = 0; const nye = [];
    for (const l of S.lån) {
      const d = Math.floor(tall(dag)); let n = d - l.sistDag; if (n <= 0) continue;
      for (; n > 0; n--) { l.sistDag++; const r = rente(l) * (forfalt(l, l.sistDag) ? REGLER.etterFrist : 1), kr = Math.round(l.gjeld * r); l.gjeld += kr; renter += kr; }
      if (!l.purret && forfalt(l, d)) { l.purret = true; nye.push(l); }
    }
    return { renter, forfalt: nye };
  }
  // Betal ned: kr inn på lån id. Gir { betalt, igjen, ferdig } – mer enn gjelden tas ikke.
  function betal(S, id, kr) {
    const l = S.lån.find(q => q.id === id); if (!l) return { feil: 'Fant ikke lånet.' };
    const b = Math.min(l.gjeld, Math.max(0, Math.round(tall(kr)))); if (!(b > 0)) return { feil: 'Ingenting å betale.' };
    const renteDel = Math.min(b, Math.max(0, l.gjeld - l.hoved)); S.betaltRente += renteDel; l.gjeld -= b; l.hoved = Math.min(l.hoved, l.gjeld);
    const ferdig = l.gjeld < 1; if (ferdig) S.lån = S.lån.filter(q => q !== l);
    return { betalt: b, igjen: ferdig ? 0 : l.gjeld, ferdig };
  }
  // Det lånet koster i døgnet nå (kr) – til teksten og varselet.
  const perDøgn = (l, dag) => Math.round(l.gjeld * rente(l) * (forfalt(l, dag) ? REGLER.etterFrist : 1));

  const api = { REGLER, ny, fraJSON, tilbud, ta, døgn, betal, gjeld, rente, forfalt, perDøgn };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Laan = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
