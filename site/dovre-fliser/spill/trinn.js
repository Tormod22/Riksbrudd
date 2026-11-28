'use strict';
/* Riksbrudd – DE FIRE TRINNENE (fase Ø0, 28. nov; docs/plan-selskap-okonomi.md kapittel 1 og 15 punkt 2).
 * Selskapet går fra en gjeng med en leir til et konsern i fire trinn: Overleve → Leverandør → Makt i regionen → Konsern.
 * Denne fila sier hvilket trinn spilleren er på, ut fra det som finnes i spillet i dag (kontraktene og nivået i spill/selskap.js,
 * byggene i leiren, tettstedene dere holder), hva som mangler til neste trinn, og ett neste steg (Neste-lappen, spill/neste.js).
 * Reglene er uten DOM (test: pipeline/fliser/test_trinn.js). Node: require('./trinn'); nettleser: globalThis.Trinn.
 * Visningen står i spill/selskapspanel.js (window.TrinnSpill og panelet «Selskapet»).
 *
 * ALT HER ER CLAUDES FORSLAG (brukeren har godkjent trinnene i planen, ikke kravene):
 *  - Trinn 2 «Leverandør»: den første kontrakten er levert, og leiren har minst tre ferdige bygg (dere har overlevd starten).
 *  - Trinn 3 «Makt i regionen»: selskapet er på nivå 3 «Etablert» (fem leverte kontrakter og godt rykte) og holder minst ett tettsted.
 *  - Trinn 4 «Konsern»: nivå 4 «Ettertraktet» og minst tre tettsteder. (Investorer og børsen kommer i fase Ø7 – da blir de krav her.)
 *  - Et trinn dere har nådd, mister dere ikke igjen (mister dere et tettsted, står dere fortsatt på trinnet), men kravene til neste
 *    trinn regnes alltid fra det som er nå.
 */
(function (rot) {
  // Claudes forslag – se over. krav: id -> minste verdi i øyeblikksbildet (bilde)
  const REGLER = {
    TRINN: [
      { nr: 1, id: 'overleve', navn: 'Overleve', du: 'en gjeng med en leir', hva: 'Første kontrakt, bygge leiren, mat og lønn.', krav: {} },
      { nr: 2, id: 'leverandør', navn: 'Leverandør', du: 'et selskap folk stoler på', hva: 'Kontrakter, hogst, sagbruk og leveranseavtaler.', krav: { levert: 1, bygg: 3 } },
      { nr: 3, id: 'makt', navn: 'Makt i regionen', du: 'den byene vil ha', hva: 'Byavtaler, beskytte handelsruter, slå tilbake Ravnsund og Mosevakt.', krav: { nivå: 3, tettsteder: 1 } },
      { nr: 4, id: 'konsern', navn: 'Konsern', du: 'et selskap med eiere', hva: 'Eksport, investere i andre, investorer og børsen.', krav: { nivå: 4, tettsteder: 3 } },
    ],
    // navnene på nivåene i spill/selskap.js (brukes bare i tekstene)
    NIVÅNAVN: { 1: 'Ukjent', 2: 'Kjent i bygda', 3: 'Etablert', 4: 'Ettertraktet' },
  };
  const tall = v => (Number.isFinite(+v) ? +v : 0);
  const flertall = (n, en, fl) => `${n} ${n === 1 ? en : fl}`;
  // hvert krav: tekst (det som skal være sant), stegtekst (hva du gjør nå) og hvor du gjør det (om: kontrakt | leir | by | selskap)
  const KRAV = {
    levert: { om: 'kontrakt', tekst: n => (n === 1 ? 'Den første kontrakten er levert' : `${n} kontrakter er levert`),
      steg: (n, B) => (tall(B.levert) === 0 ? 'Lever den første kontrakten' : `Lever ${flertall(n - tall(B.levert), 'kontrakt', 'kontrakter')} til`), hjelp: 'Kontraktene står i Selskapet, fanen Kontrakter.' },
    bygg: { om: 'leir', tekst: n => `Leiren har ${n} ferdige bygg`, steg: (n, B) => `Bygg ${flertall(n - tall(B.bygg), 'bygg', 'bygg')} til i leiren`,
      hjelp: 'Leir → Bygg. En brakke gir flere senger, et vakttårn ser røverne før de kommer.' },
    nivå: { om: 'kontrakt', tekst: n => `Selskapet er på nivå ${n} «${REGLER.NIVÅNAVN[n] || n}»`, steg: n => `Nå nivå ${n} «${REGLER.NIVÅNAVN[n] || n}»: lever flere kontrakter`,
      hjelp: 'Nivået stiger med leverte kontrakter og ryktet for å holde ord (Selskapet → Oversikt).' },
    tettsteder: { om: 'by', tekst: n => (n === 1 ? 'Dere holder et tettsted' : `Dere holder ${n} tettsteder`),
      steg: (n, B) => (tall(B.tettsteder) === 0 ? 'Få et tettsted på laget' : `Få ${flertall(n - tall(B.tettsteder), 'tettsted', 'tettsteder')} til på laget`),
      hjelp: 'Byene står i Selskapet, fanen Byer. I dag tar dere et tettsted ved å holde det med et lag (Krig).' },
  };
  // B (øyeblikksbildet): { levert, nivå, bygg, tettsteder }. høyest = trinnet dere har nådd før (husket), eller 0.
  // Gir { nr, trinn, neste, krav: [{ id, tekst, ok, om, hjelp }], mangler, steg: { tekst, hjelp, om } | null, regnet }
  function regn(B, høyest) {
    B = B || {}; const T = REGLER.TRINN;
    const oppfylt = t => Object.entries(t.krav).every(([id, n]) => tall(B[id]) >= n);
    let regnet = 1; for (const t of T) { if (t.nr > 1 && oppfylt(t)) regnet = t.nr; else if (t.nr > 1) break; }
    const nr = Math.max(regnet, Math.min(T.length, Math.max(1, Math.floor(tall(høyest)) || 1)));
    const trinn = T[nr - 1], neste = T[nr] || null;
    const krav = neste ? Object.entries(neste.krav).map(([id, n]) => ({ id, n, ok: tall(B[id]) >= n, tekst: KRAV[id].tekst(n), om: KRAV[id].om, hjelp: KRAV[id].hjelp })) : [];
    const mangler = krav.filter(k => !k.ok);
    const m = mangler[0], steg = m ? { tekst: `${KRAV[m.id].steg(m.n, B)} (mot trinn ${neste.nr}: ${neste.navn})`, kort: KRAV[m.id].steg(m.n, B), hjelp: KRAV[m.id].hjelp, om: m.om, id: m.id } : null;
    return { nr, trinn, neste, krav, mangler, steg, regnet };
  }
  // linjen om trinnet (Oversikt og kortet): «Trinn 2 av 4 · Leverandør – et selskap folk stoler på»
  const tekst = R => `Trinn ${R.nr} av ${REGLER.TRINN.length} · ${R.trinn.navn} – ${R.trinn.du}`;
  const Trinn = { REGLER, KRAV, regn, tekst };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Trinn; return; }
  rot.Trinn = Trinn;
})(typeof globalThis !== 'undefined' ? globalThis : this);
