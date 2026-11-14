'use strict';
// GRAFIKKVALITET (12. nov, brukeren: «spillet går alt for hakkete»). Tre nivåer for 3D, valgt i ☰ «Grafikk: …» (Auto/Høy/Middels/Lav,
// localStorage «riksbrudd-grafikk»). Auto starter på Høy og går ned et nivå når bildene i snitt tar for lang tid (etter at oppløsningen
// allerede er senket, se størrelse3d i index.html), og opp igjen når det går lett lenge. Nivået styrer:
//   pr      høyeste pikseltetthet [PC, mobil]       tre   detaljavstanden for trærne (faktor)
//   gress   andel gresstuster rundt kameraet          blomster  blomster/bregner/siv rundt kameraet
//   tekstur stor bakketekstur (4096) nær bakken       skumtopper og krusning i vannet (vann)
//   nett    terrengnettets tetthet (1 = 289 × 289 punkter på PC; Middels 273, Lav 241 – ikke grovere: trær og hus står etter den ekte høyden) – gjelder fra neste utsnitt
//   bakke   'enkel' på Lav: terrenget med lys per hjørne og uten effektene i skyggeleggingen (bakkeMateriale i index.html) – det
//           klart tyngste i bildet på svake maskiner (målt 14. nov: 700 ms -> 20 ms per bilde med programvare-grafikk)
// Reglene øverst uten DOM (Kvalitet.neste) – test: node pipeline/fliser/test_kvalitet.js.
(function (rot) {
  const NIVÅ = {
    høy: { navn: 'Høy', pr: [1.5, 1.25], tre: 1, gress: 1, blomster: true, tekstur: true, vann: 1 },
    middels: { navn: 'Middels', pr: [1, 1], tre: .6, gress: .5, blomster: true, tekstur: false, vann: 1, nett: .92 },
    lav: { navn: 'Lav', pr: [.75, .75], tre: .35, gress: 0, blomster: false, tekstur: false, vann: 0, bakke: 'enkel', nett: .83 },
  };
  const REKKE = ['høy', 'middels', 'lav'];
  // Auto: ms = snittid per bilde, skala = oppløsningsfaktoren (1 = full, 0,6 = laveste), nå/sist i sekunder.
  // Ned: over 24 ms når oppløsningen alt er senket (eller over 40 ms uansett), høyst hvert 4. s. Opp: under 18 ms (60 bilder/s) i 20 s med full oppløsning,
  // men ikke tilbake til et nivå som var for tungt det siste minuttet.
  function neste(s, ms, skala, nå) {
    const i = REKKE.indexOf(s.nivå);
    if (nå - (s.endret || -99) < 4) return s.nivå;
    if ((ms > 24 && skala <= .65) || ms > 40) { if (i < REKKE.length - 1) { s.endret = nå; s.forTungt = { nivå: s.nivå, ved: nå }; s.lett = null; return REKKE[i + 1]; } return s.nivå; }
    if (ms < 18 && skala >= 1) {
      if (s.lett == null) s.lett = nå;
      const opp = REKKE[i - 1];
      if (i > 0 && nå - s.lett > 20 && !(s.forTungt && s.forTungt.nivå === opp && nå - s.forTungt.ved < 60)) { s.endret = nå; s.lett = null; return opp; }
    } else s.lett = null;
    return s.nivå;
  }
  const Kvalitet = { NIVÅ, REKKE, neste };
  if (typeof module !== 'undefined') { module.exports = Kvalitet; return; }
  rot.Kvalitet = Kvalitet;

  // ---------- i nettleseren ----------
  let valg = 'auto'; try { const v = localStorage.getItem('riksbrudd-grafikk'); if (v && (v === 'auto' || NIVÅ[v])) valg = v; } catch (e) { /* privat vindu */ }
  const S = { nivå: valg === 'auto' ? 'høy' : valg };
  // KVAL: det andre deler av spillet leser (index.html: størrelse3d, lodTrær, gress3d, bygg3d; vegetasjon3d.js; vind3d.js)
  const KVAL = window.KVAL = { get nivå() { return S.nivå; }, get valg() { return valg; }, v: 0, get p() { return NIVÅ[S.nivå]; } };
  const knapp = document.createElement('button'); knapp.id = 'vis-grafikk';
  const settKnapp = () => { knapp.textContent = 'Grafikk: ' + (valg === 'auto' ? 'auto (' + NIVÅ[S.nivå].navn.toLowerCase() + ')' : NIVÅ[valg].navn); knapp.title = 'Lavere grafikk gir jevnere bilde på svake maskiner'; };
  function bytt(nivå) {
    if (nivå === S.nivå) return; S.nivå = nivå; KVAL.v++; settKnapp();
    // trærne, gresset og blomstene fordeles på nytt i neste ramme; bakketeksturen følger med i neste utsnitt
    if (typeof R3 !== 'undefined' && R3) { R3.lodVed = null; R3.gressSenter = null; }
    if (typeof byttBakke === 'function') byttBakke();
    if (typeof logg === 'function') logg('Grafikk: ' + NIVÅ[nivå].navn.toLowerCase() + (valg === 'auto' ? ' (automatisk – velg selv i ☰)' : '') + '.');
  }
  knapp.onclick = () => { const r = ['auto', ...REKKE]; valg = r[(r.indexOf(valg) + 1) % r.length]; try { localStorage.setItem('riksbrudd-grafikk', valg); } catch (e) { /* privat vindu */ }
    if (valg === 'auto') { S.endret = performance.now() / 1000; S.lett = null; S.forTungt = null; settKnapp(); } else bytt(valg); settKnapp(); };
  settKnapp(); const lm = document.getElementById('lagmeny'); if (lm) lm.appendChild(knapp);
  KROKER.ramme3d.push(R => {
    if (valg !== 'auto' || R.rammeSnitt == null) return;
    const nå = performance.now() / 1000; if (!S.start) S.start = nå;
    // de første sekundene etter at 3D er åpnet bygges alt: ikke mål da
    if (nå - S.start < 6 || R.bygger) return;
    const ny = neste(S, R.rammeSnitt, R.skala || 1, nå); if (ny !== S.nivå) bytt(ny);
  });
  KVAL.bytt = n => { valg = n; bytt(n === 'auto' ? 'høy' : n); settKnapp(); };
})(typeof globalThis !== 'undefined' ? globalThis : this);
