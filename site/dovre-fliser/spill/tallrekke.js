'use strict';
// TALLREKKER SOM GJENBRUKES (runde 9, 20. nov natt – hakk når du flyr). Målt over Stavanger og Bergen: det tyngste søppelet når et nytt
// 3D-utsnitt bygges, var hjørnene til husene (hus3d i index.html) og vegene (spill/liv3d.js). De ble samlet i vanlige JavaScript-lister
// (pos.push(x, y, z)), som vokser ved å kopieres til en større liste – ca. 1,2 GB lister på 40 s flyging i Stavanger, mest store lister
// som må ryddes med full søppeltømming (pausene på 240–400 ms i runde 7). Rekke er en voksende Float32Array (eller Uint32Array for
// indekser) med samme bruk – push(...) og length –, og plassen legges i et lager (LAGER) og brukes om igjen av neste utsnitt.
// ferdig() gir en ny tabell med nøyaktig de tallene, i nøyaktig den lengden: samme verdier som new Float32Array(liste) ga før
// (tallet rundes til 32 bit én gang, på samme måte). ferdigIndeks() velger Uint16Array/Uint32Array slik three.js gjør i setIndex(liste).
// Rekke.på = false (vakta): vanlige lister som før, med samme svar ut – så vakta kan sammenligne de to.
// Reglene uten DOM – test: node pipeline/fliser/test_tallrekke.js.
(function (rot) {
  // Claudes forslag: første plass 4096 tall, dobles når den er full; lageret mellom utsnittene høyst 64 MB på PC og 24 MB på telefon
  // (de minste kastes først). Lerretspunktene (kartbildet, opptil 4096² · 4 = 64 MB) har eget lager med plass til ett (ta/giPunkter).
  const REGLER = { start: 4096, lager: 64 * 1048576, lagerMobil: 24 * 1048576, punkter: 1 };
  const STAT = { nye: 0, gjenbrukt: 0, nyeMB: 0, kastet: 0, punkterNye: 0, punkterGjenbrukt: 0 };
  const LAGER = { F: [], U: [] }, PUNKTER = [];
  let bytes = 0;
  const mobil = () => typeof VW !== 'undefined' && VW < 700;
  const grense = () => (mobil() ? REGLER.lagerMobil : REGLER.lager);
  // minst n tall: den minste ledige som er stor nok, ellers en ny
  function ta(T, n) {
    const L = LAGER[T]; let b = -1;
    for (let i = 0; i < L.length; i++) if (L[i].length >= n && (b < 0 || L[i].length < L[b].length)) b = i;
    if (b >= 0) { const a = L[b]; L.splice(b, 1); bytes -= a.byteLength; STAT.gjenbrukt++; return a; }
    STAT.nye++; STAT.nyeMB += n * 4 / 1048576;
    return T === 'U' ? new Uint32Array(n) : new Float32Array(n);
  }
  // tilbake i lageret (blir det for mye, kastes de minste – søppeltømmingen tar dem)
  function gi(T, a) {
    if (!a || !Rekke.på) return;
    LAGER[T].push(a); bytes += a.byteLength;
    while (bytes > grense()) {
      let tT = null, ti = -1;
      for (const t of ['F', 'U']) for (let i = 0; i < LAGER[t].length; i++) if (ti < 0 || LAGER[t][i].byteLength < LAGER[tT][ti].byteLength) { tT = t; ti = i; }
      if (ti < 0) break;
      bytes -= LAGER[tT][ti].byteLength; LAGER[tT].splice(ti, 1); STAT.kastet++;
    }
  }
  function Rekke(T) { this.T = T === 'U' ? 'U' : 'F'; this.a = null; this.n = 0; this.l = Rekke.på ? null : []; }
  Rekke.på = true;
  Object.defineProperty(Rekke.prototype, 'length', { get() { return this.l ? this.l.length : this.n; } });
  // plass til k tall til (vokser ved å doble)
  Rekke.prototype.plass = function (k) {
    const m = this.n + k; if (this.a !== null && m <= this.a.length) return this.a;
    let L = this.a ? this.a.length * 2 : REGLER.start; while (L < m) L *= 2;
    const b = ta(this.T, L); if (this.a) { b.set(this.a.subarray(0, this.n)); gi(this.T, this.a); }
    return (this.a = b);
  };
  Rekke.prototype.push = function () {
    const k = arguments.length;
    if (this.l) { for (let i = 0; i < k; i++) this.l.push(arguments[i]); return this.l.length; }
    const a = this.a !== null && this.n + k <= this.a.length ? this.a : this.plass(k); let n = this.n;
    for (let i = 0; i < k; i++) a[n++] = arguments[i];
    this.n = n; return n;
  };
  // de vanligste uten arguments (raskere)
  Rekke.prototype.p2 = function (x, y) {
    if (this.l) { this.l.push(x, y); return; }
    const a = this.a !== null && this.n + 2 <= this.a.length ? this.a : this.plass(2), n = this.n; a[n] = x; a[n + 1] = y; this.n = n + 2;
  };
  Rekke.prototype.p3 = function (x, y, z) {
    if (this.l) { this.l.push(x, y, z); return; }
    const a = this.a !== null && this.n + 3 <= this.a.length ? this.a : this.plass(3), n = this.n; a[n] = x; a[n + 1] = y; a[n + 2] = z; this.n = n + 3;
  };
  // alle tallene i en liste eller tabell v (som push(...v)) – hus3d legger hjørner og farger inn slik
  Rekke.prototype.pushL = function (v) {
    const k = v.length;
    if (this.l) { for (let i = 0; i < k; i++) this.l.push(v[i]); return; }
    const a = this.a !== null && this.n + k <= this.a.length ? this.a : this.plass(k); let n = this.n;
    for (let i = 0; i < k; i++) a[n++] = v[i];
    this.n = n;
  };
  // Ferdig: en ny Float32Array med tallene (Rekke 'F'), og plassen tilbake i lageret.
  Rekke.prototype.ferdig = function () {
    let r;
    if (this.l) r = new Float32Array(this.l);
    else r = this.a ? this.a.slice(0, this.n) : new Float32Array(0);
    this.slipp(); return r;
  };
  // Ferdig som indeks: som three.js setIndex(liste) – Uint32Array når største tall er over 65535, ellers Uint16Array.
  Rekke.prototype.ferdigIndeks = function () {
    const n = this.length, a = this.l || this.a; let maks = n ? a[0] : -Infinity;
    for (let i = 1; i < n; i++) if (a[i] > maks) maks = a[i];
    const T = maks > 65535 ? Uint32Array : Uint16Array;
    const r = this.l ? new T(this.l) : this.a ? (T === Uint32Array && this.T === 'U' ? this.a.slice(0, n) : new T(this.a.subarray(0, n))) : new T(0);
    this.slipp(); return r;
  };
  // Uten ferdig (jobben ble avbrutt eller er brukt opp): plassen tilbake i lageret.
  Rekke.prototype.slipp = function () { if (this.a) gi(this.T, this.a); this.a = null; this.n = 0; if (this.l) this.l = []; };
  // Lerretspunktene til kartbildet (Uint8ClampedArray, bygg3d: TW · TW · 4): samme størrelse om igjen fra lageret. Alle punktene
  // skrives over av bygg3d før de leses, så gamle tall blir ikke med.
  function taPunkter(n) {
    for (let i = 0; i < PUNKTER.length; i++) if (PUNKTER[i].length === n) { STAT.punkterGjenbrukt++; return PUNKTER.splice(i, 1)[0]; }
    STAT.punkterNye++; return new Uint8ClampedArray(n);
  }
  function giPunkter(a) {
    if (!a || !Rekke.på || PUNKTER.includes(a)) return;
    PUNKTER.push(a); while (PUNKTER.length > (mobil() ? 1 : REGLER.punkter)) PUNKTER.shift();
  }
  const tøm = () => { LAGER.F.length = 0; LAGER.U.length = 0; PUNKTER.length = 0; bytes = 0; };
  const lager = () => ({ F: LAGER.F.length, U: LAGER.U.length, MB: Math.round(bytes / 1048576 * 10) / 10, punkter: PUNKTER.length });
  const Tallrekke = { REGLER, STAT, Rekke, ta, gi, taPunkter, giPunkter, tøm, lager };
  if (typeof module !== 'undefined') module.exports = Tallrekke;
  rot.Tallrekke = Tallrekke;
})(typeof globalThis !== 'undefined' ? globalThis : this);
