'use strict';
// Små regler for 2D-kartet og grensesnittet på /norge (uten DOM; test: node pipeline/fliser/test_kart2d.js). Fra feiljakten 12. nov:
// Kart2d.skalaMål(r)            lengden på målestokken i meter når ett skjermpunkt er r meter (helt opp til 1000 km – før stoppet den på 20 km)
// Kart2d.skalaTekst(meter)      «500 m», «20 km»
// Kart2d.navnepunkt(deler, bb)  hvor navnet på en flate (tettsted) skal stå: punktet inne i flaten som ligger lengst fra kanten
//                               (før: midt i rammen rundt flaten – «Oslo» sto ute i fjorden)
// Kart2d.erFyr({ tank, hav, iBy, D, nærFyr }) om et rundt bygg skal bli fyrtårn i 3D (ikke i tettsteder)
// Kart2d.åpning(område, VW, VH, hva) hva /norge passer inn: hele landet med Svalbard på brede skjermer; på høye, smale skjermer
//                               (telefon) Sør-Norge når siden åpner og fastlandet for «hele landet» – der ble Norge liten og lå langs venstre kant
(function (rot) {
  const MÅL = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000];
  // minste runde lengde som blir minst minPx skjermpunkter lang
  function skalaMål(r, minPx = 70) { return MÅL.find(m => m / r >= minPx) || MÅL[MÅL.length - 1]; }
  function skalaTekst(m) { return m >= 1000 ? m / 1000 + ' km' : m + ' m'; }

  // Flaten er gitt som ringer [x0, y0, x1, y1, ...] (flere deler og hull, fylt som «evenodd»). Den legges i et rutenett på ca. n ruter
  // langs den lengste siden; ruta som ligger lengst fra kanten (avstand til nærmeste rute utenfor) vinner, og av like gode den som
  // ligger nærmest midten av rammen. Finnes ingen rute inne i flaten (svært smal flate), brukes midten av rammen.
  function navnepunkt(deler, bb, n = 48) {
    const w = bb[2] - bb[0], h = bb[3] - bb[1], midt = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
    if (!(w > 0) || !(h > 0)) return midt;
    const c = Math.max(w, h) / n, nx = Math.max(1, Math.ceil(w / c)), ny = Math.max(1, Math.ceil(h / c)), inne = new Uint8Array(nx * ny);
    // linje for linje: kryssingene med ringene sorteres, og rutene mellom annenhver kryssing er inne
    for (let j = 0; j < ny; j++) {
      const y = bb[1] + (j + .5) * c, kr = [];
      for (const a of deler) for (let i = 0, k = a.length - 2; i < a.length; k = i, i += 2) {
        const yi = a[i + 1], yk = a[k + 1]; if ((yi > y) !== (yk > y)) kr.push(a[i] + (a[k] - a[i]) * (y - yi) / (yk - yi)); }
      kr.sort((p, q) => p - q);
      for (let q = 0; q + 1 < kr.length; q += 2) { const i0 = Math.max(0, Math.ceil((kr[q] - bb[0]) / c - .5)), i1 = Math.min(nx - 1, Math.floor((kr[q + 1] - bb[0]) / c - .5));
        for (let i = i0; i <= i1; i++) inne[j * nx + i] = 1; }
    }
    // avstand til nærmeste rute utenfor (to gjennomløp, 3–4-avstand); utenfor rammen regnes som utenfor flaten
    const D = new Uint16Array(nx * ny), STOR = 60000, d = (i, j) => (i < 0 || j < 0 || i >= nx || j >= ny ? 0 : D[j * nx + i]);
    for (let q = 0; q < nx * ny; q++) D[q] = inne[q] ? STOR : 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const q = j * nx + i; if (!D[q]) continue;
      D[q] = Math.min(D[q], d(i - 1, j) + 3, d(i, j - 1) + 3, d(i - 1, j - 1) + 4, d(i + 1, j - 1) + 4); }
    let best = -1, bd = 0, bm = Infinity;
    for (let j = ny - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) { const q = j * nx + i; if (!D[q]) continue;
      D[q] = Math.min(D[q], d(i + 1, j) + 3, d(i, j + 1) + 3, d(i + 1, j + 1) + 4, d(i - 1, j + 1) + 4);
      const m = Math.hypot(bb[0] + (i + .5) * c - midt[0], bb[1] + (j + .5) * c - midt[1]);
      if (D[q] > bd || D[q] === bd && m < bm) { best = q; bd = D[q]; bm = m; } }
    if (best < 0) return midt;
    return [bb[0] + (best % nx + .5) * c, bb[1] + (Math.floor(best / nx) + .5) * c];
  }

  // Fastlandet (uten Svalbard og Jan Mayen), EPSG:25833: fra Lindesnes til Knivskjellodden, fra Utvær til Vardø.
  // Sør-Norge: fra Lindesnes til nord for Trondheim (Namsos) – det en høy, smal skjerm rekker å vise i lesbar størrelse.
  const FASTLAND = [-80000, 6425000, 1120000, 7945000], SØR_NORGE = [-80000, 6425000, 400000, 7200000];
  // Hva som passes inn: { b: rammen, luft: hvor mye større enn rammen bildet skal være, smal }.
  // Bred skjerm: hele området (med Svalbard). Høy, smal skjerm (bredde under 0,8 × høyde, telefon): der ble Norge liten og lå langs
  // venstre kant med Sverige midt i bildet. Siden åpner derfor med Sør-Norge (hva = 'åpning'), og «hele landet»-knappen viser
  // fastlandet (hva = 'hele') med litt luft, så bynavnene langs kysten ikke kuttes i kanten.
  function åpning(område, VW, VH, hva = 'åpning') {
    const smal = VW < VH * .8; if (!smal) return { b: område, luft: 1.05, smal };
    const R = hva === 'hele' ? FASTLAND : SØR_NORGE;
    const b = [Math.max(område[0], R[0]), Math.max(område[1], R[1]), Math.min(område[2], R[2]), Math.min(område[3], R[3])];
    return b[2] > b[0] && b[3] > b[1] ? { b, luft: hva === 'hele' ? 1.12 : 1.06, smal } : { b: område, luft: 1.05, smal };
  }

  // Et helt rundt bygg blir fyrtårn bare når det ikke er en tank, ligger ved havet, er lite (tverrmål høyst 12 m), ikke står i et
  // tettsted og ikke har et annet fyr innen 1,5 km. (12. nov: en rund paviljong ved Lille Lungegårdsvann i Bergen ble fyr.)
  function erFyr(o) { return !o.tank && !!o.hav && !o.iBy && o.D <= 12 && !o.nærFyr; }

  const Kart2d = { erFyr, MÅL, skalaMål, skalaTekst, navnepunkt, FASTLAND, SØR_NORGE, åpning };
  if (typeof module !== 'undefined' && module.exports) module.exports = Kart2d; else rot.Kart2d = Kart2d;
})(typeof window !== 'undefined' ? window : globalThis);
