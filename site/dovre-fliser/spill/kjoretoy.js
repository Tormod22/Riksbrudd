/* S2 – kjøretøy på vegnettet: regler uten DOM (kan testes i Node og kjøres på en spillserver).
 * Node: const K = require('./kjoretoy'); nettleser: globalThis.Kjoretoy.
 * Et kjøretøy er en kolonne (antall like kjøretøy etter hverandre). Det kjører en rute fra vegnett.js (spill/VEGNETT.md):
 * fart = laveste av typens toppfart og vegens fartsgrense (ukjent: reservefart etter kategori), ferje 25 km/t og 15 min venting
 * når den går fra land. Tid er spillverdenens sekunder; visningen gir 60 spillsekunder per tid-enhet (1 spilltime = TIME = 60), og 1× er sanntid.
 */
(function (rot) {
  'use strict';
  const KATEGORIER = 'ERFKPS', RESERVE = [80, 70, 60, 40, 30, 30], FERJE_FART = 25, FERJE_VENT = 900;
  // Typer. faktor: hvor mye «dyrere» mindre veger er i rutevalget (E, R, F, K, P, S) – lastebiler holder seg på hovedvegen.
  const TYPER = {
    lastebil: { navn: 'Lastebil', flertall: 'lastebiler', maks: 80, lengde: 11, bredde: 2.55, avstand: 60, faktor: [1, 1, 1.15, 1.4, 1.8, 1.8] },
    speiderbil: { navn: 'Speiderbil', flertall: 'speiderbiler', maks: 100, lengde: 5.2, bredde: 2.2, avstand: 40, faktor: [1, 1, 1, 1.1, 1.3, 1.3] },
  };
  function ny({ navn, type = 'lastebil', antall = 1, x, y, side = 'blå', retning = 0 }) {
    if (!TYPER[type]) throw new RangeError('Ukjent kjøretøytype ' + type);
    if (!Number.isInteger(antall) || antall < 1 || antall > 40) throw new RangeError('Ugyldig antall');
    if (![x, y, retning].every(Number.isFinite)) throw new TypeError('Ugyldig posisjon');
    return { navn, type, antall, side, x, y, retning, sti: null, framme: false };
  }
  function fart(lenke, type) {   // m/s
    if (lenke.ferje) return FERJE_FART / 3.6;
    return Math.min(TYPER[type].maks, lenke.fartsgrense || RESERVE[KATEGORIER.indexOf(lenke.vegkategori)]) / 3.6;
  }
  // (kritikerløkka r2, 26. nov, Jonas: «Kjør dit» til et mål på vegen ga «finner ingen veg dit», og kjøretøyet fikk posisjon NaN)
  // ÅRSAK: målet og kjøretøyet hadde samme nærmeste node (et mål midt på en lang veglenke) – ruta ble tom (ingen lenker), stien fikk
  // ett punkt, og posisjon() regnet med et punkt som ikke fantes. NÅ: kjøretøyet kjører fra der det står, inn på nærmeste veg, langs
  // lenken til en node, ruta, og langs mållenken til punktet på vegen nærmest målet (graf.naermestePåVeg). Står det alt der, er det framme.
  // TERRENG_FART (km/t) er farten det første stykket fra der kjøretøyet står og inn på vegen – Claudes forslag.
  const TERRENG_FART = 15;
  // Rute fra der kjøretøyet står til punktet på vegen nærmest målet. Gir { meter, sekunder, ferjer } (framme: true når den alt står der)
  // eller { feil }. Kjøretøyets posisjon blir aldri NaN: en sti med ugyldige tall gir { feil } og kjøretøyet står.
  function planlegg(kj, graf, mål, valg = {}) {
    const maks = valg.maksAvstand === undefined ? 3000 : valg.maksAvstand;
    if (!Number.isFinite(kj.x) || !Number.isFinite(kj.y)) return { feil: 'Kjøretøyets plass er ukjent.' };
    if (!Array.isArray(mål) || !Number.isFinite(mål[0]) || !Number.isFinite(mål[1])) return { feil: 'Ugyldig mål.' };
    const påVeg = typeof graf.naermestePåVeg === 'function';
    const vS = påVeg ? graf.naermestePåVeg([kj.x, kj.y], maks) : null, vM = påVeg ? graf.naermestePåVeg(mål, maks) : null;
    const a0 = graf.naermeste([kj.x, kj.y], maks), b0 = graf.naermeste(mål, maks);
    if (a0 < 0 && !vS) return { feil: 'Kjøretøyet står for langt fra en veg.' };
    if (b0 < 0 && !vM) return { feil: 'Ingen veg i nærheten av målet.' };
    const P = [kj.x, kj.y], V = [], VENT = [], LENKE = [];
    const legg = (x, y, v, e, vent = 0) => { P.push(x, y); V.push(v); LENKE.push(e); VENT.push(vent); };
    // en bit av lenke e langs geometrien fra s0 til s1 meter (fra fra-noden); punktene fra (s0) er alt lagt inn
    const bit = (e, s0, s1) => { const L = graf.linje(e), v = fart(graf.lenke(e), kj.type), fram = s1 >= s0, mid = [];
      let s = 0; for (let i = 1; i < L.length; i++) { s += Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]); if (i < L.length - 1) mid.push([s, L[i]]); }
      const inn = mid.filter(([q]) => (fram ? q > s0 && q < s1 : q < s0 && q > s1)); if (!fram) inn.reverse();
      for (const [, p] of inn) legg(p[0], p[1], v, e); };
    const tilNode = (v, n) => { const l = graf.lenke(v.lenke); return n === l.fra ? 0 : v.total; };
    // stykket fra kjøretøyet og inn på vegen
    const inn = vS || { x: graf.punkt(a0)[0], y: graf.punkt(a0)[1], lenke: -1 };
    if (Math.hypot(inn.x - kj.x, inn.y - kj.y) > 1) legg(inn.x, inn.y, TERRENG_FART / 3.6, vS ? vS.lenke : -1);
    let r = null, meterRute = 0, ferjer = 0;
    if (vS && vM && vS.lenke === vM.lenke) {
      // samme lenke: rett langs vegen
      bit(vS.lenke, vS.langs, vM.langs); legg(vM.x, vM.y, fart(graf.lenke(vM.lenke), kj.type), vM.lenke);
    } else {
      // startnode og sluttnode: endene av lenkene (eller nærmeste node uten naermestePåVeg). Den nærmeste kombinasjonen prøves først.
      const ender = (v, n0) => { if (!v) return [n0]; const l = graf.lenke(v.lenke); return [l.fra, l.til]; };
      const S = ender(vS, a0), M = ender(vM, b0), par = [];
      for (const a of S) for (const b of M) { const pa = graf.punkt(a), pb = graf.punkt(b);
        par.push([a, b, (vS ? Math.abs(tilNode(vS, a) - vS.langs) : 0) + Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) + (vM ? Math.abs(tilNode(vM, b) - vM.langs) : 0)]); }
      par.sort((p, q) => p[2] - q[2]);
      let a = -1, b = -1;
      for (const [pa, pb] of par) { r = graf.rute(pa, pb, { ferjeVentetid: FERJE_VENT, kategoriFaktor: TYPER[kj.type].faktor, tillat: valg.tillat }); if (r) { a = pa; b = pb; break; } }
      if (!r) return { feil: 'Ingen veg dit (kanskje sperret).' };
      let lenker = r.lenker.slice(), noder = r.noder.slice();
      // snur ruta rett tilbake langs startlenken eller går forbi målpunktet på mållenken: kutt den lenken og kjør bare biten
      if (vS && lenker.length && lenker[0] === vS.lenke) { lenker.shift(); noder.shift(); a = noder[0]; }
      if (vM && lenker.length && lenker[lenker.length - 1] === vM.lenke) { lenker.pop(); noder.pop(); b = noder[noder.length - 1]; }
      if (vS) bit(vS.lenke, vS.langs, tilNode(vS, a));
      const [sx, sy] = graf.punkt(a); legg(sx, sy, vS ? fart(graf.lenke(vS.lenke), kj.type) : TERRENG_FART / 3.6, vS ? vS.lenke : -1);
      // Stien som punkter med fart per stykke. Hver lenke kjøres på lengde / fart (som rutesøket), fordelt på geometrien.
      let forrigeFerje = false;
      lenker.forEach((e, i) => {
        const l = graf.lenke(e); let linje = graf.linje(e);
        if (l.fra !== noder[i]) linje = linje.slice().reverse();
        let geo = 0; for (let k = 1; k < linje.length; k++) geo += Math.hypot(linje[k][0] - linje[k - 1][0], linje[k][1] - linje[k - 1][1]);
        const v = fart(l, kj.type) * (geo > 0 ? geo / l.lengde : 1);   // så lenken tar lengde / fart sekunder
        for (let k = 1; k < linje.length; k++) legg(linje[k][0], linje[k][1], v, e, k === 1 && l.ferje && !forrigeFerje ? FERJE_VENT : 0);   // vent én gang før ferja går fra land
        forrigeFerje = l.ferje; meterRute += l.lengde;
      });
      ferjer = VENT.filter(v => v > 0).length;
      if (vM) { bit(vM.lenke, tilNode(vM, b), vM.langs); legg(vM.x, vM.y, fart(graf.lenke(vM.lenke), kj.type), vM.lenke); }
    }
    if (!P.every(Number.isFinite) || !V.every(v => Number.isFinite(v) && v > 0)) return { feil: 'Ingen veg dit (ruta kunne ikke regnes ut).' };
    const n = V.length, D = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) D[i + 1] = D[i] + Math.hypot(P[2 * i + 2] - P[2 * i], P[2 * i + 3] - P[2 * i + 1]);
    // står alt ved målet (under 2 m å kjøre): framme med en gang, ingen sti
    if (!n || D[n] < 2) { kj.sti = null; kj.framme = true; return { meter: 0, sekunder: 0, ferjer: 0, framme: true }; }
    kj.sti = { P, V, VENT, LENKE, D, i: 0, s: 0, vent: 0, ventet: -1 }; kj.framme = false;
    oppdater(kj);
    return { meter: Math.max(D[n], meterRute), sekunder: tidIgjen(kj), ferjer };
  }
  // Kjør sek spillsekunder. Gir true når kolonnen kom fram i dette steget.
  function steg(kj, sek) {
    const t = kj.sti; if (!t || !(sek > 0)) return false;
    while (sek > 0) {
      if (t.i >= t.V.length) { kj.sti = null; kj.framme = true; oppdater(kj, t); return true; }
      if (t.vent > 0) { const d = Math.min(sek, t.vent); t.vent -= d; sek -= d; continue; }
      if (t.s === t.D[t.i] && t.VENT[t.i] && t.ventet !== t.i) { t.ventet = t.i; t.vent = t.VENT[t.i]; continue; }
      const rest = t.D[t.i + 1] - t.s, trenger = rest / t.V[t.i];
      if (sek >= trenger) { sek -= trenger; t.i++; t.s = t.i < t.V.length ? t.D[t.i] : t.D[t.V.length]; }
      else { t.s += sek * t.V[t.i]; sek = 0; }
    }
    if (t.i >= t.V.length) { kj.sti = null; kj.framme = true; oppdater(kj, t); return true; }
    oppdater(kj); return false;
  }
  function stopp(kj) { if (kj.sti) { oppdater(kj); kj.sti = null; } }
  // Punkt og retning på stien bak meter bak tetbilen (kolonnen). Uten sti: på rekke bakover fra der den står.
  function posisjon(kj, bak = 0, t = kj.sti) {
    if (!t) return { x: kj.x - Math.cos(kj.retning) * bak, y: kj.y - Math.sin(kj.retning) * bak, retning: kj.retning };
    const s = Math.max(0, t.s - bak), D = t.D;
    let lo = 0, hi = t.V.length - 1;   // stykket som inneholder s
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (D[m] <= s) lo = m; else hi = m - 1; }
    const i = lo, f = D[i + 1] > D[i] ? (Math.min(s, D[i + 1]) - D[i]) / (D[i + 1] - D[i]) : 0, P = t.P;
    const ax = P[2 * i], ay = P[2 * i + 1], bx = P[2 * i + 2], by = P[2 * i + 3];
    return { x: ax + (bx - ax) * f, y: ay + (by - ay) * f, retning: Math.atan2(by - ay, bx - ax) };
  }
  function oppdater(kj, t = kj.sti) { const p = posisjon(kj, 0, t); if (t && Number.isFinite(p.x) && Number.isFinite(p.y)) { kj.x = p.x; kj.y = p.y; if (Number.isFinite(p.retning)) kj.retning = p.retning; } }
  function tidIgjen(kj) {
    const t = kj.sti; if (!t) return 0;
    let sek = t.vent;
    for (let i = t.i; i < t.V.length; i++) {
      sek += ((t.D[i + 1] - (i === t.i ? t.s : t.D[i])) / t.V[i]);
      if (t.VENT[i] && t.ventet !== i) sek += t.VENT[i];
    }
    return sek;
  }
  function status(kj) {
    const t = kj.sti;
    if (!t) return { tilstand: kj.framme ? 'framme' : 'står', meter: 0, sekunder: 0 };
    return { tilstand: t.vent > 0 ? 'venter på ferja' : 'kjører', meter: t.D[t.V.length] - t.s, sekunder: tidIgjen(kj), ventIgjen: t.vent };
  }
  // Lenkene stien har igjen (fra vegnettet) – for å sjekke hva den kjører på, f.eks. en bru som sprenges (S5).
  function lenkerIgjen(kj) { const t = kj.sti; return t ? [...new Set(t.LENKE.slice(t.i))] : []; }
  const api = { TYPER, FERJE_FART, FERJE_VENT, ny, fart, planlegg, steg, stopp, posisjon, tidIgjen, status, lenkerIgjen };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Kjoretoy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
