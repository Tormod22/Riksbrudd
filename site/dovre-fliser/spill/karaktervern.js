/* Riksbrudd – KARAKTEREN BLIR IKKE BORTE (ut9-liv, 28. nov). Karakteren din er et lag i ENHETER (s.karakter, spill/kontrollrom-visning.js).
 * Ingen del av spillet skal ta den ut av lista, men en vanlig skrivemåte for å fjerne et lag – ENHETER.splice(ENHETER.indexOf(lag), 1) –
 * tar ut det SISTE laget når laget alt er borte (indexOf gir −1), og karakteren står ofte sist. Da forsvant karakteren (i den store
 * kontrollen: «ingen karakter» i spill2d og ut3-etasjer etter mange vakter). Her: er laget vi kjenner som karakteren, ikke lenger i lista
 * (og ingen annen karakter står der), settes det inn igjen – samme lag, samme plass. Sjekkes to ganger i sekundet, også i pause.
 * Reglene øverst uten DOM (test_karaktervern.js); visningen nederst.
 */
(function (rot) {
  'use strict';
  // gir laget som skal settes inn igjen, eller null: kjent = karakterlaget vi så sist, enheter = lista nå
  function savnet(enheter, kjent) {
    if (!kjent || !kjent.karakter || !Array.isArray(enheter)) return null;
    if (enheter.includes(kjent) || enheter.some(e => e && e.karakter)) return null;
    return kjent;
  }
  // det laget som er karakteren nå (det første), eller null
  const finn = enheter => (Array.isArray(enheter) ? enheter.find(e => e && e.karakter) || null : null);
  const api = { savnet, finn };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Karaktervern = api;
  if (typeof window === 'undefined') return;
  let kjent = null, ganger = 0;
  function sjekk() {
    if (typeof ENHETER === 'undefined') return; const nå = finn(ENHETER);
    if (nå) { kjent = nå; return; }
    const k = savnet(ENHETER, kjent || (window.KontrollromSpill && KontrollromSpill.deg ? KontrollromSpill.deg() : null)); if (!k) return;
    ENHETER.push(k); ganger++; if (typeof skitten !== 'undefined') skitten = true;
    console.warn('Karaktervern: karakteren var tatt ut av ENHETER og er satt inn igjen (' + ganger + ')');
  }
  setInterval(sjekk, 500);
  window.KaraktervernSpill = { sjekk, ganger: () => ganger };
})(typeof globalThis !== 'undefined' ? globalThis : this);
