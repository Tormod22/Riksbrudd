/* Riksbrudd – NAVN I KARTET UTEN NVDB-SJARGONG (runde 8, 20. nov, kritikken: «Fodnestunnelen hovedløp», «Lærdalstunnelen hovedløp»).
 * NVDB gir hvert tunnelløp og hver rampe sitt eget navn: «X hovedløp», «X løp mot Bergen», «X nordgående», «X rampe 41 mot Straume»,
 * «Vesttunnelen Kjørbo-arm mot E18 Oslo». I kartet skal det stå «Fodnestunnelen». KartNavn.vis(lag, navn) gir navnet slik det vises;
 * KartNavn.rens(lag, e) setter e.navn til det og husker NVDB-navnet i e.nvdbNavn (lesInfra i index.html kaller den for hvert objekt,
 * så 2D, 3D og panelet får samme navn). Navn uten slike tillegg er urørt. Reglene er uten DOM (Node: require('./kartnavn'),
 * test: node pipeline/fliser/test_kartnavn.js).
 */
(function (rot) {
  'use strict';
  // Ord som er et teknisk tillegg i NVDB-navnet (alt fra og med ordet kuttes). Bruer har «Flomløp» og «Rampebru» som ekte navn,
  // så der gjelder bare retningen og ordet «rampe».
  const TUNNEL = /^(hoved|sekundær-?|felles|nytt|nye)?løp(et)?$|^(på|av)?rampe[a-zæøå]*$|^\S+-arm$|^arm$|^(nord|sør|øst|vest)(gående|g)(-\S*)?$/i;
  const BRU = /^(nord|sør|øst|vest)(gående|g)(-\S*)?$|^(på|av)?rampe(r)?$/i;
  // et ord som er selve tunnelens navn: står det et slikt ord før tillegget, slutter navnet der («Karmøytunnelen, Håvik løp»)
  const NAVNEORD = /(tunnel(en)?|lokket|porten)$/i;
  const REGEL = { tunnel: TUNNEL, bru: BRU };
  function vis(lag, navn) {
    const re = REGEL[lag]; if (!re || typeof navn !== 'string' || !navn) return navn;
    const s = navn.replace(/_/g, ' ').replace(/(tunnelen)(løp)/i, '$1 $2').trim(), ord = s.split(/\s+/);
    const ren = w => w.replace(/^[,–-]+|[,–-]+$/g, '');
    let k = -1; for (let i = 1; i < ord.length; i++) if (re.test(ren(ord[i]))) { k = i; break; }
    if (k < 0) return navn;
    // «Tag vestgående bru» -> «Tag bru»: står ordet «bru» etter retningen, tas bare retningen bort
    if (lag === 'bru' && k + 1 < ord.length && /^bru(a|en)?$/i.test(ren(ord[k + 1]))) return ord.filter((_, q) => q !== k).join(' ');
    let kutt = k; for (let j = 0; j < k; j++) if (NAVNEORD.test(ren(ord[j]))) { kutt = j + 1; break; }
    // et nummer rett etter navnet hører til navnet («Breimsfjelltunnelen 2 hovedløp»)
    while (kutt < k && /^(\d+|[IVX]+)$/.test(ren(ord[kutt]))) kutt++;
    const ut = ord.slice(0, kutt).join(' ').replace(/[\s,–-]+$/, '');
    return ut.length >= 3 ? ut : navn;
  }
  function rens(lag, e) { if (!e || !e.navn) return e; const n = vis(lag, e.navn); if (n !== e.navn) { e.nvdbNavn = e.navn; e.navn = n; } return e; }
  const api = { vis, rens };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.KartNavn = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
