/* Riksbrudd – OMGJØRINGER AV GAMLE LAGREDE SPILL (G0, 28. nov, pakke «ut2-lagring», docs/plan-selskap-okonomi.md 13.3).
 * Lastes rett etter spill/lagringsside.js, før noen modul leser localStorage. Hvert lagret spill har versjonsmerket «riksbrudd-versjon»
 * ({ v }; 0 = lagret før merket fantes). Når en oppdatering endrer formen på det som lagres, legges en omgjøring inn her, og
 * LagringSide.VERSJON (spill/lagringsside.js) økes med én:
 *
 *   Lagring.omgjør(1, l => {                       // gjør et spill i versjon 1 om til versjon 2
 *     const k2 = l.json('riksbrudd-k2'); if (!k2) return;
 *     k2.nyttFelt = k2.nyttFelt || 0; l.skriv('riksbrudd-k2', k2);
 *     l.senere(s => { ... });                        // de store dataene (LagringStor, i databasen) når de er lest inn
 *   }, 'k2 får nyttFelt');
 *
 * l: les(navn) / json(navn) / skriv(navn, tekst eller objekt) / fjern(navn) / navn() – navnene uten ending (som modulene bruker), bare
 * denne sidens nøkler. Omgjøringene kjøres i rekkefølge på en kopi; feiler én, endres ingenting (spillet lastes som det er, og feilen står i
 * konsollen). Før omgjøringen legges en kopi av hele spillet i databasen («kopi:riksbrudd-før-versjon-N»). Et lagret spill fra en nyere
 * utgave røres ikke. Lagringsplasser og filer gjøres om når de lastes inn (siden lastes på nytt, og omgjøringene kjøres da).
 * Versjon 0 → 1 (28. nov): ingen endring i formen – bare merket kommer på.
 */
(function (rot) {
  'use strict';
  const LS = rot.LagringSide; if (!LS || !rot.Lagring || typeof LS.omgjørNå !== 'function') return;
  // (ingen omgjøringer ennå)
  LS.omgjørNå();
})(typeof globalThis !== 'undefined' ? globalThis : this);
