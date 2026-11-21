/* Leirvalget (runde 6, 19. nov – kritikken: leiren kunne legges på snaufjell i 1575 moh. med bare beskjeden «Ingen kai innen 10 km»).
 * Regler uten DOM (Node: require('./leirvalg'); nettleser: globalThis.Leirvalg): hva betyr stedet for leiren? Startskjermen
 * (oppstart-visning.js) måler terrenget rundt stedet i et vindu fra lagVindu(…, true) og viser advarslene og noen korte fakta.
 * Test: node pipeline/fliser/test_leirvalg.js
 */
(function (rot) {
  'use strict';
  // Alle tallene er Claudes forslag:
  // radius: hvor langt rundt leiren vi ser (hogst og riving når 3 km – spill/ressurser.js),
  // skogLite: andel skog under dette = «nesten ingen skog», skogMye: over dette = «mye skog»,
  // overTregrensen: meter over tregrensen før vi kaller det høyfjell, vegLangt: meter til veg før vi advarer,
  // byLangt: meter til nærmeste tettsted før vi advarer, sjøMoh: vann under så mange moh. regnes som sjø.
  const REGLER = { radius: 2500, skogLite: 0.04, skogMye: 0.3, overTregrensen: 0, vegLangt: 1500, byLangt: 20000, sjøMoh: 3 };
  // Arealklassene i vinduet (terreng.js): 0 snaufjell, 1 skog, 2 hei, 3 vann, 4 snø, 5 dyrket, 6 myr, 7 tettbebyggelse, 255 ingen data.
  // v = { x0, y0, r, w, h, H, K, V } -> { land, skog, åpent (snaufjell/snø), vegM (meter til nærmeste veg, Infinity = ingen), sjø }
  function måle(v, x, y, R = REGLER.radius) {
    const ut = { land: 0, skog: 0, åpent: 0, vegM: Infinity, sjø: false }; if (!v || !v.K) return ut;
    let nSkog = 0, nÅpent = 0;
    for (let j = 0; j < v.h; j++) for (let i = 0; i < v.w; i++) {
      const k = j * v.w + i, kl = v.K[k], cx = v.x0 + (i + .5) * v.r, cy = v.y0 - (j + .5) * v.r, d = Math.hypot(cx - x, cy - y);
      if (d > R || kl === 255) continue;
      if (v.V && v.V[k] > 0 && d < ut.vegM) ut.vegM = d;
      if (kl === 3) { if (v.H[k] === v.H[k] && v.H[k] < REGLER.sjøMoh) ut.sjø = true; continue; }
      ut.land++; if (kl === 1) nSkog++; if (kl === 0 || kl === 4) nÅpent++;
    }
    ut.skog = ut.land ? nSkog / ut.land : 0; ut.åpent = ut.land ? nÅpent / ut.land : 0; return ut;
  }
  const km = m => (m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',') + ' km');
  // m = måle(…); o = { h (moh.), tregrense (moh.), by: { navn, m } | null } -> { advarsler: [tekst], fakta: [tekst] }
  function vurder(m, o = {}) {
    const adv = [], fakta = [], h = o.h, tg = o.tregrense, R = REGLER;
    const høyt = h != null && tg != null && h > tg + R.overTregrensen;
    if (høyt) adv.push(`Høyfjell, over tregrensen (ca. ${Math.round(tg / 10) * 10} moh. her): kaldt og værhardt${m.skog < R.skogLite ? ', og ingen skog å hogge' : ''}.`);
    else if (m.land && m.skog < R.skogLite) adv.push(`Nesten ingen skog innen ${km(R.radius)} – ved og tømmer må hentes langt unna.`);
    if (m.vegM === Infinity) adv.push(`Ingen veg innen ${km(R.radius)}: lastebilene kommer ikke fram før dere bygger grusveg.`);
    else if (m.vegM > R.vegLangt) adv.push(`${km(m.vegM)} til nærmeste veg: lastebilene kommer ikke helt fram.`);
    if (o.by && o.by.m > R.byLangt) adv.push(`${km(o.by.m)} til nærmeste tettsted (${o.by.navn}): få hus å lete i og ingen å handle med.`);
    // (runde 13, kritikk G: «1207 moh., over tregrensen» og «skog: mye» om samme sted – skogen var nede i dalen innen 2,5 km) over
    // tregrensen sies det hvor skogen er, aldri «mye»; uten skog står det alt i advarselen
    if (m.land && høyt) { if (m.skog >= R.skogLite) fakta.push(`skog: bare nede i dalen (innen ${km(R.radius)})`); }
    else if (m.land) fakta.push('skog: ' + (m.skog >= R.skogMye ? 'mye' : m.skog >= R.skogLite ? 'noe' : 'nesten ingen'));
    if (m.vegM < Infinity && m.vegM <= R.vegLangt) fakta.push('veg ' + km(m.vegM) + ' unna');
    if (o.by && o.by.m <= R.byLangt) fakta.push(`${o.by.navn} ${km(o.by.m)}`);
    return { advarsler: adv, fakta };
  }
  // Teksten fra kaiene (spill/kaier.js, window.LEIRVALG_TILLEGG): «Ingen kai innen 10 km» betyr ingenting langt inne i landet –
  // den vises bare når det er sjø i nærheten. Er kaia for langt unna, sies det hva en kai er godt for.
  function kaiTekst(t, sjø) {
    if (!t) return '';
    if (/^Ingen kai innen/.test(t)) return sjø ? 'Ingen kai innen 10 km: leiren får ingen båter, og varer kan ikke komme sjøveien.' : '';
    if (/for langt til å være leirens kai/.test(t)) return t + ' En kai innen 3 km gir leiren båter, fiske og varer sjøveien.';
    return t;
  }
  const api = { REGLER, måle, vurder, kaiTekst, km };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Leirvalg = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
