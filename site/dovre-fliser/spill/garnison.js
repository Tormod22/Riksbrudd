/* S7 – garnisoner og tettsteder: regler uten DOM (Node: require('./garnison'); nettleser: globalThis.Garnison).
 * Et tettsted (INFRA.tettsted, SSB 1.1.2023) blir sidens når et av dens lag har stått i det i 30 minutter uten fiender der.
 * Lagene som står i et eget tettsted er garnisonen: de får sårede friske og falne erstattet. Tettstedet produserer olje til basen.
 * Begge deler etter folketallet; uten strøm (ingen hele kraftverk innen 40 km) går produksjonen ned. Tallene er forslag.
 */
(function (rot) {
  'use strict';
  const REGLER = {
    innta: 1800,                                      // sekunder alene i tettstedet før det er ditt
    forsterkning: { perTusen: 1, min: .5, maks: 6 },  // mann per spilltime per 1000 innbyggere (sårede først, så falne)
    produksjon: { perTusen: 1, maks: 40 },            // tonn olje per spilltime per 1000 innbyggere
    strøm: { radius: 40000, uten: .4 },               // kraftverk innen 40 km; uten strøm: 40 % produksjon og forsterkning
  };
  function ny() { return new Map(); }   // tettsted-id -> { eier, inntar: { side, sek } | null }
  const tilstand = (S, id) => S.get(id) || { eier: null, inntar: null };
  // Punkt i tettstedets omriss (alle deler, partall/oddetall).
  function inni(by, x, y) {
    if (x < by.bb[0] || x > by.bb[2] || y < by.bb[1] || y > by.bb[3]) return false;
    let inn = false;
    for (const a of by.deler) for (let i = 0, j = a.length - 2; i < a.length; j = i, i += 2) {
      const xi = a[i], yi = a[i + 1], xj = a[j], yj = a[j + 1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inn = !inn;
    }
    return inn;
  }
  const kanHolde = s => s.menn.some(m => m.hp > 0) && s.menn.filter(m => m.hp < 1).length < 6;
  // Lagene i tettstedet som kan holde det (levende og ikke slått ut).
  const lagI = (by, lag) => lag.filter(s => kanHolde(s) && inni(by, s.x, s.y));
  // sek spillsekunder: inntak. Gir hendelser [{ hva: 'inntatt'|'inntar'|'strid', by, side }].
  function steg(S, byer, lag, sek) {
    const ut = [];
    for (const by of byer) {
      const her = lagI(by, lag); if (!her.length && !S.has(by.e.id)) continue;
      const t = { ...tilstand(S, by.e.id) }, sider = [...new Set(her.map(s => s.side))];
      if (sider.length === 1 && sider[0] !== t.eier) {
        if (!t.inntar || t.inntar.side !== sider[0]) { t.inntar = { side: sider[0], sek: 0 }; ut.push({ hva: 'inntar', by, side: sider[0] }); }
        t.inntar.sek += sek;
        if (t.inntar.sek >= REGLER.innta) { const før = t.eier; t.eier = sider[0]; t.inntar = null; ut.push({ hva: 'inntatt', by, side: t.eier, fra: før }); }
      } else {
        if (sider.length > 1 && t.inntar) ut.push({ hva: 'strid', by });
        t.inntar = null;
      }
      S.set(by.e.id, t);
    }
    return ut;
  }
  const rate = (folk, R, strøm) => Math.min(R.maks, Math.max(R.min || 0, folk / 1000 * R.perTusen)) * (strøm ? 1 : REGLER.strøm.uten);
  // Garnisonen i et eget tettsted: forsterkes med rate mann per spilltime (brøkdeler spares på laget). nyMann() lager en ny soldat.
  function forsterk(s, folk, sek, strøm, nyMann) {
    s.forsterkning = (s.forsterkning || 0) + rate(folk, REGLER.forsterkning, strøm) * sek / 3600;
    const ut = [];
    while (s.forsterkning >= 1) {
      const såret = s.menn.find(m => m.hp > 0 && m.hp < 1), falt = s.menn.findIndex(m => m.hp <= 0);
      if (såret) { såret.hp = 1; ut.push(['frisk', såret]); }
      else if (falt >= 0) { const m = nyMann(s.menn[falt].rolle); s.menn[falt] = m; ut.push(['ny', m]); }
      else { s.forsterkning = 0; break; }
      s.forsterkning -= 1;
    }
    return ut;
  }
  const produksjon = (folk, sek, strøm) => rate(folk, REGLER.produksjon, strøm) * sek / 3600;
  // Strøm: et helt kraftverk innen radien. kraft: [{ x, y, hel }].
  const harStrøm = (by, kraft) => { const x = (by.bb[0] + by.bb[2]) / 2, y = (by.bb[1] + by.bb[3]) / 2;
    return kraft.some(k => k.hel && Math.hypot(k.x - x, k.y - y) <= REGLER.strøm.radius); };
  const api = { REGLER, ny, tilstand, inni, lagI, steg, forsterk, produksjon, harStrøm, rate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Garnison = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
