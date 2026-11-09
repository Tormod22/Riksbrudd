/* S8 – fraksjoner og motstandere: regler og en enkel AI uten DOM (Node: require('./fraksjoner'); nettleser: globalThis.Fraksjoner).
 * Fraksjonene er oppdiktede politiske bevegelser (designdokumentet/HANDOFF.md): spilleren er Riksrådet (blå), AI-en styrer
 * Kystalliansen (rød) og Folkefronten (grønn). AI-en tenker for hvert lag for seg: trekk tilbake når laget er slått ut, hent
 * forsyninger/stell i et eget tettsted, angrip fiender laget ser når det er sterkt nok, ellers ta det nærmeste tettstedet som ikke
 * er ditt og hold det med ett lag (garnison). Tallene er forslag.
 */
(function (rot) {
  'use strict';
  const FRAKSJONER = {   // akse: [sentralisme, marked, tradisjon] (0–1)
    blå: { navn: 'Riksrådet', eieform: 'Riksrådets', farge: '#3b5878', lys: '#5b7ea8', sti: 'rgba(130,170,220,.9)', akse: [.9, .35, .2] },
    rød: { navn: 'Kystalliansen', eieform: 'Kystalliansens', farge: '#8f3c2f', lys: '#b5503d', sti: 'rgba(225,125,95,.9)', akse: [.3, .9, .35] },
    grønn: { navn: 'Folkefronten', eieform: 'Folkefrontens', farge: '#3f6b3a', lys: '#6f9a5f', sti: 'rgba(140,190,120,.9)', akse: [.15, .25, .8] },
  };
  const REGLER = {
    tenk: 600,             // spillsekunder mellom hver gang et AI-lag vurderer situasjonen
    angrep: 1500,          // meter: fiender laget ser innenfor dette vurderes
    overtak: .8,           // angrip når egen styrke ≥ 0,8 × fiendens
    såret: 3,              // så mange ute (sårede/falne) før laget søker stell i et eget tettsted
    ammoLav: .3,           // ammunisjon under dette: hent forsyninger
    rekkevidde: 30000,     // meter: tettsteder lenger unna enn dette tas ikke
    forsterkning: { hver: 6 * 3600, maks: 3 },   // nytt lag hver 6. spilltime ved startstedet, så lenge fraksjonen har færre enn 3
    påfyll: .25,           // ammunisjon per spilltime for lag i eget tettsted (alle sider)
  };
  const ute = s => s.menn.filter(m => m.hp < 1).length;
  const slåttUt = s => ute(s) >= 6;
  // Kampkraft: friske teller 1, sårede ½; tom for ammunisjon teller lite.
  const styrke = (s, ammo = 1) => s.menn.reduce((v, m) => v + (m.hp >= 1 ? 1 : m.hp > 0 ? .5 : 0), 0) * (ammo <= 0 ? .2 : ammo < .25 ? .6 : 1);
  const avstand = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // Ett valg for ett lag. v: { side, byer: [{ id, navn, x, y, folk, eier, inni(x, y) }], fiender: [{ x, y, navn, styrke }] (de laget ser),
  // venner: [lag på samme side], hjem: [x, y], ammo }. Gir { hva, x, y, tekst } – hva: trekk | forsyn | angrip | ta | hold.
  function velg(s, v) {
    const R = REGLER, her = { x: s.x, y: s.y }, egne = v.byer.filter(b => b.eier === v.side), nærmest = l => l.slice().sort((a, b) => avstand(a, her) - avstand(b, her))[0];
    if (slåttUt(s)) { const b = nærmest(egne); return b ? { hva: 'trekk', x: b.x, y: b.y, tekst: `trekker seg tilbake til ${b.navn}` } : { hva: 'trekk', x: v.hjem[0], y: v.hjem[1], tekst: 'trekker seg tilbake' }; }
    const fi = v.fiender.filter(f => avstand(f, her) <= R.angrep).sort((a, b) => avstand(a, her) - avstand(b, her))[0];
    const behov = ute(s) >= R.såret || (v.ammo !== undefined && v.ammo < R.ammoLav);
    if (behov && egne.length && !(fi && avstand(fi, her) < 600)) { const b = nærmest(egne);
      return b.inni(s.x, s.y) ? { hva: 'hold', x: s.x, y: s.y, tekst: `får stell og forsyninger i ${b.navn}` } : { hva: 'forsyn', x: b.x, y: b.y, tekst: `henter forsyninger i ${b.navn}` }; }
    if (fi) {
      if (styrke(s, v.ammo) >= R.overtak * fi.styrke) return { hva: 'angrip', x: fi.x, y: fi.y, tekst: `angriper ${fi.navn}` };
      const a = Math.atan2(s.y - fi.y, s.x - fi.x); return { hva: 'trekk', x: s.x + Math.cos(a) * 2000, y: s.y + Math.sin(a) * 2000, tekst: `trekker seg unna ${fi.navn}` };
    }
    // garnison: står laget i et eget tettsted og er det eneste av sine der, blir det
    const iBy = v.byer.find(b => b.inni(s.x, s.y));
    if (iBy && iBy.eier === v.side && !v.venner.some(f => f !== s && iBy.inni(f.x, f.y) && !slåttUt(f) && f.navn < s.navn)) return { hva: 'hold', x: s.x, y: s.y, tekst: `garnison i ${iBy.navn}` };
    if (iBy && iBy.eier !== v.side) return { hva: 'hold', x: s.x, y: s.y, tekst: `tar ${iBy.navn}` };
    // ta det nærmeste tettstedet som ikke er vårt (større tettsteder teller som nærmere)
    const mål = v.byer.filter(b => b.eier !== v.side && avstand(b, her) <= R.rekkevidde)
      .sort((a, b) => avstand(a, her) / Math.sqrt(1 + a.folk / 1000) - avstand(b, her) / Math.sqrt(1 + b.folk / 1000))[0];
    if (mål) return { hva: 'ta', x: mål.x, y: mål.y, tekst: `marsjerer mot ${mål.navn}` };
    return { hva: 'hold', x: s.x, y: s.y, tekst: 'holder stillingen' };
  }
  // Sympati 0–1 mellom en fraksjon og en folkemening på de samme tre aksene (1 = helt enig).
  const sympati = (side, akse) => 1 - Math.hypot(...FRAKSJONER[side].akse.map((a, i) => a - akse[i])) / Math.sqrt(3);
  const api = { FRAKSJONER, REGLER, velg, styrke, slåttUt, sympati };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Fraksjoner = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
