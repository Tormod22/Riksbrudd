/* S1 – rutegraf uten DOM. NVDB / Statens vegvesen (NLOD).
 * Node: const { les } = require('./vegnett'); const graf = les(buffer);
 * Nettleser: Vegnett.last(url). Koordinater i EPSG:25833, tid i virkelige sekunder.
 */
(function (rot) {
  'use strict';
  const KATEGORIER = 'ERFKPS', FART = [80, 70, 60, 40, 30, 30];
  class Haug {
    constructor() { this.a = []; }
    legg(n, g, f) {
      const a = this.a, v = { n, g, f }; let i = a.length; a.push(v);
      while (i && a[(i - 1) >> 1].f > f) { const p = (i - 1) >> 1; a[i] = a[p]; i = p; }
      a[i] = v;
    }
    ta() {
      const a = this.a, ut = a[0], v = a.pop();
      if (a.length) {
        let i = 0;
        while (2 * i + 1 < a.length) {
          let b = 2 * i + 1;
          if (b + 1 < a.length && a[b + 1].f < a[b].f) b++;
          if (a[b].f >= v.f) break;
          a[i] = a[b]; i = b;
        }
        a[i] = v;
      }
      return ut;
    }
  }
  const heltall = (v, maks) => Number.isInteger(v) && v >= 0 && v < maks;
  function les(data) {
    if (ArrayBuffer.isView(data)) data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    else if (data instanceof ArrayBuffer) data = new Uint8Array(data);
    else throw new TypeError('Forventet ArrayBuffer eller typet tabell');
    if (data.byteLength < 32 || String.fromCharCode(...data.subarray(0, 8)) !== 'RBVEG001') throw new Error('Ukjent vegnettformat');
    const d = new DataView(data.buffer, data.byteOffset, data.byteLength), u = p => d.getUint32(p, true);
    const N = u(8), M = u(12), G = u(16), I = u(20), eb = 32 + N * 8, ib = eb + M * 40, gb = ib + I * 12;
    if (gb + G !== data.byteLength || u(28) !== 0) throw new Error('Skadet vegnettfil');
    const x = new Int32Array(N), y = new Int32Array(N), fra = new Uint32Array(M), til = new Uint32Array(M);
    const lengde = new Float64Array(M), tid = new Float64Array(M), flagg = new Uint8Array(M);
    const antall = new Uint32Array(N + 1), land = new Uint8Array(N), sperret = new Uint8Array(M);
    const infra = new Map(); let maksMS = 0;
    for (let n = 0; n < N; n++) { x[n] = d.getInt32(32 + n * 8, true); y[n] = d.getInt32(36 + n * 8, true); }
    for (let e = 0; e < M; e++) {
      const p = eb + e * 40, a = u(p), b = u(p + 4), l = d.getFloat32(p + 8, true), f = d.getUint8(p + 28);
      const kat = d.getUint8(p + 30), fart = d.getUint8(p + 29), go = u(p + 32), gl = u(p + 36);
      if (a >= N || b >= N || !Number.isFinite(l) || l <= 0 || kat >= KATEGORIER.length || !(f & 3) || f > 7 ||
          u(p + 16) >= u(p + 20) || u(p + 20) > 1e8 || go + gl > G || gl < 4) throw new Error('Ugyldig veglenke ' + e);
      fra[e] = a; til[e] = b; flagg[e] = f;
      lengde[e] = Math.max(l, Math.hypot(x[a] - x[b], y[a] - y[b]));
      const ms = (f & 4 ? 25 : (fart || FART[kat])) / 3.6;
      tid[e] = lengde[e] / ms; maksMS = Math.max(maksMS, ms);
      if (f & 1) antall[a + 1]++;
      if (f & 2) antall[b + 1]++;
      if (!(f & 4)) land[a] = land[b] = 1;
    }
    for (let i = 0; i < I; i++) {
      const p = ib + i * 12, e = u(p), type = u(p + 4), id = u(p + 8), key = type + ':' + id;
      if (e >= M || ![60, 67, 770].includes(type)) throw new Error('Ugyldig infrastrukturkobling');
      if (!infra.has(key)) infra.set(key, []);
      infra.get(key).push(e);
    }
    for (let n = 1; n <= N; n++) antall[n] += antall[n - 1];
    const neste = antall.slice(), kant = new Uint32Array(antall[N]), nabo = new Uint32Array(antall[N]);
    for (let e = 0; e < M; e++) {
      if (flagg[e] & 1) { const p = neste[fra[e]]++; kant[p] = e; nabo[p] = til[e]; }
      if (flagg[e] & 2) { const p = neste[til[e]]++; kant[p] = e; nabo[p] = fra[e]; }
    }
    function sjekkLenke(e) { if (!heltall(e, M)) throw new RangeError('Ukjent veglenke'); }
    function punkt(n) { if (!heltall(n, N)) throw new RangeError('Ukjent node'); return [x[n], y[n]]; }
    function naermeste(p, maks = 2000) {
      if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite) || !Number.isFinite(maks) || maks < 0) throw new TypeError('Ugyldig punkt eller søkeavstand');
      let best = -1, avstand = maks * maks;
      for (let n = 0; n < N; n++) {
        const dd = (p[0] - x[n]) ** 2 + (p[1] - y[n]) ** 2;
        if (dd <= avstand) { best = n; avstand = dd; }
      }
      return best;
    }
    function linje(e) {
      sjekkLenke(e);
      const p = eb + e * 40, slutt = gb + u(p + 32) + u(p + 36), punkter = [];
      let pos = gb + u(p + 32), X = 0, Y = 0;
      function tall() {
        let v = 0, faktor = 1, b;
        do {
          if (pos >= slutt || faktor > 2 ** 28) throw new Error('Skadet veggeometri');
          b = data[pos++]; v += (b & 127) * faktor; faktor *= 128;
        } while (b & 128);
        return v % 2 ? -(v + 1) / 2 : v / 2;
      }
      while (pos < slutt) { X += tall(); Y += tall(); punkter.push([X, Y]); }
      if (punkter.length < 2) throw new Error('Skadet veggeometri');
      return punkter;
    }
    function lenke(e) {
      sjekkLenke(e); const p = eb + e * 40;
      return { id: e, fra: fra[e], til: til[e], lengde: lengde[e], sekvens: u(p + 12),
        startposisjon: u(p + 16) / 1e8, sluttposisjon: u(p + 20) / 1e8,
        vegkategori: KATEGORIER[d.getUint8(p + 30)], vegnummer: u(p + 24),
        fartsgrense: d.getUint8(p + 29) || null, ferje: !!(flagg[e] & 4), sperret: !!sperret[e] };
    }
    function rute(start, slutt, valg = {}) {
      const maks = valg.maksAvstand === undefined ? 2000 : valg.maksAvstand;
      const a = Array.isArray(start) ? naermeste(start, maks) : start;
      const b = Array.isArray(slutt) ? naermeste(slutt, maks) : slutt;
      if (a === -1 || b === -1) return null;
      if (!heltall(a, N) || !heltall(b, N)) throw new RangeError('Ukjent start- eller sluttnode');
      const vent = valg.ferjeVentetid === undefined ? 900 : valg.ferjeVentetid;
      if (!Number.isFinite(vent) || vent < 0) throw new RangeError('Ugyldig ferjeventetid');
      const dist = new Float64Array(N).fill(Infinity), forrige = new Int32Array(N).fill(-1), via = new Int32Array(N).fill(-1);
      const heap = new Haug(); let besokt = 0;
      const h = n => maksMS ? Math.hypot(x[n] - x[b], y[n] - y[b]) / maksMS : 0;
      dist[a] = 0; heap.legg(a, 0, h(a));
      while (heap.a.length) {
        const q = heap.ta(), n = q.n;
        if (q.g !== dist[n]) continue;
        besokt++;
        if (n === b) {
          const noder = [b], lenker = []; let v = b, meter = 0;
          while (v !== a) { const e = via[v]; lenker.push(e); meter += lengde[e]; v = forrige[v]; noder.push(v); }
          noder.reverse(); lenker.reverse();
          return { noder, lenker, meter, sekunder: dist[b], besokt };
        }
        for (let k = antall[n]; k < antall[n + 1]; k++) {
          const e = kant[k], v = nabo[k];
          if (sperret[e]) continue;
          if (valg.tillat && !valg.tillat(lenke(e))) continue;
          // Vent én gang ved avgang fra land, ikke på hvert NVDB-segment ute på fjorden.
          const g = q.g + tid[e] + ((flagg[e] & 4) && land[n] ? vent : 0);
          if (g >= dist[v]) continue;
          dist[v] = g; forrige[v] = n; via[v] = e; heap.legg(v, g, g + h(v));
        }
      }
      return null;
    }
    return { antallNoder: N, antallLenker: M, dato: String(u(24)), punkt, naermeste, linje, lenke, rute,
      infraLenker(type, id) { return (infra.get(type + ':' + id) || []).slice(); },
      sperr(e) { sjekkLenke(e); sperret[e] = 1; },
      åpne(e) { sjekkLenke(e); sperret[e] = 0; } };
  }
  async function last(url, hent = globalThis.fetch) {
    const svar = await hent(url);
    if (!svar.ok) throw new Error('Kunne ikke hente vegnett: HTTP ' + svar.status);
    return les(await svar.arrayBuffer());
  }
  const api = { les, last };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Vegnett = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
