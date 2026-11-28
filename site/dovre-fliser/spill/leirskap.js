/* Riksbrudd – SKAPENE I LEIRENS EGNE BYGG (28. nov, ut10-skap; brukeren: «Lag det som ikke er bygget» – skapene i leirens bygg skal vise innholdet).
 * Regler uten DOM (Node: require('./leirskap'); nettleser: globalThis.Leirskap). Test: pipeline/fliser/test_leirskap.js.
 *
 * Hvert skap i et ferdig leirbygg (kjøkken, brakke, sykestue, kontrollrom, verksted, drivhus) er en EGEN PLASS i tinglageret (spill/tinglager.js),
 * i tillegg til byggets standardplass (som står som før – ingenting flyttes). Plassen heter «b<byggets id>.<møbel><nr>», f.eks. «b12.kjøleskap1»,
 * og nr er nummeret blant like møbler i interiørets plan (spill/interior.js) – samme rekkefølge som lutens nøkler («bygg:type:nr»).
 * Skapene finnes som plasser også når planen ikke fikk plass til møbelet (da når du dem fra Lageret-panelet).
 * SKAP: per byggtype i leiren (Leir.BYGG-typen) – møbeltypen i interiøret -> [lagringstype i Tinglager.LAGRING, antall]. Claudes forslag.
 */
(function (rot) {
  'use strict';
  const SKAP = {
    kjøkken: { kjøleskap: ['kjøleskap', 2], overskap: ['overskap', 1] },
    brakke: { garderobe: ['garderobe', 1], skap: ['klesskap', 1], kommode: ['kommode', 1], skoskap: ['skoskap', 1] },
    sykestue: { medisinskap: ['medisinskap', 2], arkivskap: ['arkivskap', 1] },
    kontrollrom: { arkivskap: ['arkivskap', 1] },
    verksted: { verktøyvogn: ['verktøyskap', 1] },
    drivhus: { tønne: ['tønne', 1] },
  };
  const id = (bid, møbel, k) => `b${bid}.${møbel}${k}`;
  // plassene til et bygg: [{ id, møbel, k, type }]
  function plasser(b) { const S = b && SKAP[b.type], ut = []; if (!S) return ut;
    for (const [møbel, [type, n]] of Object.entries(S)) for (let k = 0; k < n; k++) ut.push({ id: id(b.id, møbel, k), møbel, k, type, nr: n > 1 ? k + 1 : 0 });
    return ut; }
  // plassen til møbel nr. k av en type i et bygg (eller null når møbelet ikke er et skap der)
  function finn(b, møbel, k) { const S = b && SKAP[b.type]; if (!S || !S[møbel] || !(k >= 0) || k >= S[møbel][1]) return null; return id(b.id, møbel, k); }
  // les en plass-id: { bid, møbel, k } eller null
  function les(pid) { const m = /^b(\d+)\.([^\d.]+)(\d+)$/.exec(pid || ''); return m ? { bid: +m[1], møbel: m[2], k: +m[3] } : null; }
  const erSkap = (byggType, møbel) => !!(SKAP[byggType] && SKAP[byggType][møbel]);
  const api = { SKAP, id, plasser, finn, les, erSkap };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Leirskap = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
