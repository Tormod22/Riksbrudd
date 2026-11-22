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
    // INNTAK ETTER STØRRELSE (19. nov, kritikken: «Kystalliansen tok Stavanger/Sandnes – 235 000 innbyggere – kl. 14 dag 1 med ett lag»).
    // Claudes forslag: tettsteder opp til «små» innbyggere tas som før på 30 min av et lag. Større tar lengre tid ved full styrke
    // (innta × √(folk / små), høyst «maksTid» sekunder) og trenger flere mann: √folk / «perMann» (minst «minMann») friske for full fart.
    // Med færre går det saktere (andelen av mennene), og under «minst» av det som trengs, står inntaket stille.
    // Stavanger/Sandnes: 69 mann for full fart (ca. 3,8 t), minst 35 (ca. 7,7 t). Ålgård (11 900): 16 mann, 52 min. Dombås: 5 mann, 30 min.
    størrelse: { små: 4000, maksTid: 8 * 3600, perMann: 7, minMann: 4, minst: .5 },
  };
  // mann som trengs for full fart, og minst så mange for at inntaket går i det hele tatt
  const mannFor = folk => Math.max(REGLER.størrelse.minMann, Math.round(Math.sqrt(Math.max(0, folk || 0)) / REGLER.størrelse.perMann));
  const minstFor = folk => Math.ceil(mannFor(folk) * REGLER.størrelse.minst);
  // sekunder et tettsted tar ved full styrke
  const inntaTid = folk => Math.min(REGLER.størrelse.maksTid, REGLER.innta * Math.max(1, Math.sqrt(Math.max(0, folk || 0) / REGLER.størrelse.små)));
  // styrken til lagene: friske teller 1, sårede ½ (som Fraksjoner.styrke)
  const mann = lag => lag.reduce((a, s) => a + s.menn.reduce((v, m) => v + (m.hp >= 1 ? 1 : m.hp > 0 ? .5 : 0), 0), 0);
  // farten på inntaket (0–1) med «har» mann mot et tettsted med «folk» innbyggere
  const fart = (har, folk) => (har < minstFor(folk) ? 0 : Math.min(1, har / mannFor(folk)));
  // hvor lenge det tar (sekunder) med «har» mann; Infinity når de er for få
  const tidMed = (har, folk) => { const f = fart(har, folk); return f > 0 ? inntaTid(folk) / f : Infinity; };
  function ny() { return new Map(); }   // tettsted-id -> { eier, inntar: { side, sek } | null }
  const tilstand = (S, id) => S.get(id) || { eier: null, inntar: null };
  // Punkt i tettstedets omriss (alle deler, partall/oddetall).
  // (15. nov, ytelse: store tettsteder har tusenvis av kanter, og 3D spør for hvert tiende meter veg. Kantene legges derfor én gang i
  // vannrette bånd – bare kantene i punktets bånd kan krysse strålen, så svaret er det samme som før.)
  function bånd(by) {
    const y0 = by.bb[1], n = Math.max(1, Math.min(512, Math.ceil((by.bb[3] - y0) / 40))), h = (by.bb[3] - y0) / n || 1, L = Array.from({ length: n }, () => []);
    for (const a of by.deler) for (let i = 0, j = a.length - 2; i < a.length; j = i, i += 2) {
      const xi = a[i], yi = a[i + 1], xj = a[j], yj = a[j + 1]; if (yi === yj) continue;
      const b0 = Math.max(0, Math.min(n - 1, Math.floor((Math.min(yi, yj) - y0) / h))), b1 = Math.max(0, Math.min(n - 1, Math.floor((Math.max(yi, yj) - y0) / h)));
      for (let b = b0; b <= b1; b++) L[b].push(xi, yi, xj, yj);
    }
    return { y0, h, n, L };
  }
  function inni(by, x, y) {
    if (x < by.bb[0] || x > by.bb[2] || y < by.bb[1] || y > by.bb[3]) return false;
    const B = by.bånd || (by.bånd = bånd(by)), l = B.L[Math.max(0, Math.min(B.n - 1, Math.floor((y - B.y0) / B.h)))];
    let inn = false;
    for (let q = 0; q < l.length; q += 4) { const xi = l[q], yi = l[q + 1], xj = l[q + 2], yj = l[q + 3];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inn = !inn; }
    return inn;
  }
  // (22. nov, R17 funn 9) Meter fra punktet til tettstedets omriss: 0 inne i det, ellers korteste vei til en kant. Før målte leirvalget
  // avstanden til det omsluttende rektangelet (bb), så en leir rett utenfor (eller i en bukt av) tettstedet fikk «0 m».
  function avstand(by, x, y) {
    if (inni(by, x, y)) return 0;
    let best = Infinity;
    for (const a of by.deler) for (let i = 0, j = a.length - 2; i < a.length; j = i, i += 2) {
      const ax = a[j], ay = a[j + 1], bx = a[i], by_ = a[i + 1], dx = bx - ax, dy = by_ - ay, L = dx * dx + dy * dy;
      const t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0;
      const d = Math.hypot(x - ax - t * dx, y - ay - t * dy); if (d < best) best = d; }
    return best;
  }
  // nærmeste tettsted i lista og avstanden til omrisset: { by, navn, m } | null. Rektangelet (bb) brukes bare til å hoppe over dem som
  // uansett er lenger unna enn det beste så langt.
  function nærmeste(byer, x, y) {
    let r = null;
    for (const b of byer || []) { const dx = Math.max(b.bb[0] - x, 0, x - b.bb[2]), dy = Math.max(b.bb[1] - y, 0, y - b.bb[3]);
      if (r && Math.hypot(dx, dy) >= r.m) continue;
      const m = avstand(b, x, y); if (!r || m < r.m) r = { by: b, navn: b.e && b.e.navn, m }; }
    return r;
  }
  const kanHolde = s => s.menn.some(m => m.hp > 0) && s.menn.filter(m => m.hp < 1).length < 6;
  // Lagene i tettstedet som kan holde det (levende og ikke slått ut).
  const lagI = (by, lag) => lag.filter(s => kanHolde(s) && inni(by, s.x, s.y));
  // sek spillsekunder: inntak. Gir hendelser [{ hva: 'inntatt'|'inntar'|'strid'|'forFå', by, side }] (forFå: { har, trengs } mann).
  function steg(S, byer, lag, sek) {
    const ut = [];
    for (const by of byer) {
      const her = lagI(by, lag); if (!her.length && !S.has(by.e.id)) continue;
      const t = { ...tilstand(S, by.e.id) }, sider = [...new Set(her.map(s => s.side))];
      if (sider.length === 1 && sider[0] !== t.eier) {
        if (!t.inntar || t.inntar.side !== sider[0]) { t.inntar = { side: sider[0], sek: 0 }; ut.push({ hva: 'inntar', by, side: sider[0] }); }
        // (19. nov) inntaket går etter størrelsen og styrken: sek telles om til «30-minutters-sekunder», så sek / innta er andelen som før
        const folk = by.e.folk || 0, har = mann(her), f = fart(har, folk);
        if (!f) { if (!t.forFå) ut.push({ hva: 'forFå', by, side: sider[0], har, trengs: minstFor(folk) }); t.forFå = true; }
        else t.forFå = false;
        t.inntar.sek += sek * f * REGLER.innta / inntaTid(folk);
        if (t.inntar.sek >= REGLER.innta) { const før = t.eier; t.eier = sider[0]; t.inntar = null; t.forFå = false; ut.push({ hva: 'inntatt', by, side: t.eier, fra: før }); }
      } else {
        if (sider.length > 1 && t.inntar) ut.push({ hva: 'strid', by });
        t.inntar = null; t.forFå = false;
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
  const api = { REGLER, ny, tilstand, inni, avstand, nærmeste, lagI, steg, forsterk, produksjon, harStrøm, rate, mannFor, minstFor, inntaTid, mann, fart, tidMed };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Garnison = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
