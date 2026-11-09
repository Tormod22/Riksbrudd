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
  // Leser RBVEG001 (40 byte per lenke) eller RBVEG002 (kolonner med varint) til de samme typede tabellene.
  function rå(data) {
    const d = new DataView(data.buffer, data.byteOffset, data.byteLength), u = p => d.getUint32(p, true), magic = String.fromCharCode(...data.subarray(0, 8));
    if (magic === 'RBVEG001') {
      const N = u(8), M = u(12), G = u(16), I = u(20), eb = 32 + N * 8, ib = eb + M * 40, gb = ib + I * 12;
      if (gb + G !== data.byteLength || u(28) !== 0) throw new Error('Skadet vegnettfil');
      const r = { N, M, I, dato: u(24), x: new Int32Array(N), y: new Int32Array(N), fra: new Uint32Array(M), til: new Uint32Array(M),
        l: new Float64Array(M), sekvens: new Uint32Array(M), start: new Uint32Array(M), slutt: new Uint32Array(M), vegnr: new Uint32Array(M),
        flagg: new Uint8Array(M), fart: new Uint8Array(M), kat: new Uint8Array(M), ie: new Uint32Array(I), it: new Uint32Array(I), id: new Uint32Array(I) };
      for (let n = 0; n < N; n++) { r.x[n] = d.getInt32(32 + n * 8, true); r.y[n] = d.getInt32(36 + n * 8, true); }
      const go = new Uint32Array(M), gl = new Uint32Array(M);
      for (let e = 0; e < M; e++) { const p = eb + e * 40;
        r.fra[e] = u(p); r.til[e] = u(p + 4); r.l[e] = d.getFloat32(p + 8, true); r.sekvens[e] = u(p + 12); r.start[e] = u(p + 16); r.slutt[e] = u(p + 20);
        r.vegnr[e] = u(p + 24); r.flagg[e] = d.getUint8(p + 28); r.fart[e] = d.getUint8(p + 29); r.kat[e] = d.getUint8(p + 30); go[e] = u(p + 32); gl[e] = u(p + 36);
        if (go[e] + gl[e] > G || gl[e] < 4) throw new Error('Ugyldig veglenke ' + e); }
      for (let i = 0; i < I; i++) { const p = ib + i * 12; r.ie[i] = u(p); r.it[i] = u(p + 4); r.id[i] = u(p + 8); }
      r.linje = e => { const ut = []; let pos = gb + go[e], X = 0, Y = 0; const slutt = pos + gl[e], v = varint(data, () => pos, q => { pos = q; }, slutt);
        while (pos < slutt) { X += zz(v()); Y += zz(v()); ut.push([X, Y]); } return ut; };
      return r;
    }
    if (magic !== 'RBVEG002') throw new Error('Ukjent vegnettformat');
    const N = u(8), M = u(12), I = u(16), K = u(24); if (K !== 17) throw new Error('Skadet vegnettfil');
    const lengder = [], start = []; let p = 28 + K * 4;
    for (let k = 0; k < K; k++) { lengder.push(u(28 + k * 4)); start.push(p); p += lengder[k]; }
    if (p !== data.byteLength) throw new Error('Skadet vegnettfil');
    const kol = k => { let pos = start[k]; const slutt = pos + lengder[k]; return { v: varint(data, () => pos, q => { pos = q; }, slutt), ferdig: () => pos === slutt }; };
    const byte = (k, n) => { if (lengder[k] !== n) throw new Error('Skadet vegnettfil'); return data.subarray(start[k], start[k] + n); };
    const r = { N, M, I, dato: u(20), x: new Int32Array(N), y: new Int32Array(N), fra: new Uint32Array(M), til: new Uint32Array(M),
      l: new Float64Array(M), sekvens: new Uint32Array(M), start: new Uint32Array(M), slutt: new Uint32Array(M), vegnr: new Uint32Array(M),
      flagg: byte(9, M), fart: byte(10, M), kat: byte(11, M), ie: new Uint32Array(I), it: new Uint32Array(I), id: new Uint32Array(I) };
    const [cx, cy, cf, ct, cl, cs, cst, csl, cv, , , , ci, cg, , cie, cid] = Array.from({ length: K }, (_, k) => kol(k));
    let X = 0, Y = 0; for (let n = 0; n < N; n++) { X += zz(cx.v()); Y += zz(cy.v()); r.x[n] = X; r.y[n] = Y; }
    let til = 0, sek = -1, sl = 0, vn = 0; const goff = new Uint32Array(M + 1), indre = new Uint32Array(M);
    for (let e = 0; e < M; e++) {
      const a = til + zz(cf.v()), b = a + zz(ct.v()), s = sek < 0 ? cs.v() : sek + cs.v(), st = (s === sek ? sl : 0) + zz(cst.v()), slu = st + csl.v();
      vn += zz(cv.v()); r.fra[e] = a; r.til[e] = b; r.l[e] = cl.v() / 10; r.sekvens[e] = s; r.start[e] = st; r.slutt[e] = slu; r.vegnr[e] = vn;
      indre[e] = ci.v(); til = b; sek = s; sl = slu;
    }
    { let pos = start[13]; const slutt = pos + lengder[13], v = varint(data, () => pos, q => { pos = q; }, slutt);   // byteadresse for hver lenkes geometri
      for (let e = 0; e < M; e++) { goff[e] = pos; for (let i = 0; i < 2 * indre[e]; i++) v(); } goff[M] = pos; if (pos !== slutt) throw new Error('Skadet veggeometri'); }
    const typer = byte(14, I); let le = 0;
    for (let i = 0; i < I; i++) { if (typer[i] > 2) throw new Error('Ugyldig infrastrukturkobling'); r.it[i] = [60, 67, 770][typer[i]]; le += cie.v(); r.ie[i] = le; r.id[i] = cid.v(); }
    if (![cx, cy, cf, ct, cl, cs, cst, csl, cv, ci, cie, cid].every(c => c.ferdig())) throw new Error('Skadet vegnettfil');
    r.linje = e => { let pos = goff[e]; const v = varint(data, () => pos, q => { pos = q; }, goff[e + 1]); let X = r.x[r.fra[e]], Y = r.y[r.fra[e]]; const ut = [[X, Y]];
      for (let i = 0; i < indre[e]; i++) { X += zz(v()); Y += zz(v()); ut.push([X, Y]); } ut.push([r.x[r.til[e]], r.y[r.til[e]]]); return ut; };
    return r;
  }
  const zz = v => v % 2 ? -(v + 1) / 2 : v / 2;
  // Varint-leser over data fra posisjonen hent() til grense; settes() flytter posisjonen.
  function varint(data, hent, sett, grense) {
    return () => { let pos = hent(), v = 0, faktor = 1, b;
      do { if (pos >= grense || faktor > 2 ** 49) throw new Error('Skadet vegnettfil'); b = data[pos++]; v += (b & 127) * faktor; faktor *= 128; } while (b & 128);
      sett(pos); return v; };
  }
  function les(data) {
    if (ArrayBuffer.isView(data)) data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    else if (data instanceof ArrayBuffer) data = new Uint8Array(data);
    else throw new TypeError('Forventet ArrayBuffer eller typet tabell');
    if (data.byteLength < 28) throw new Error('Ukjent vegnettformat');
    const R = rå(data), { N, M, I, x, y, fra, til, flagg } = R;
    const lengde = new Float64Array(M), tid = new Float64Array(M);
    const antall = new Uint32Array(N + 1), land = new Uint8Array(N), sperret = new Uint8Array(M);
    const infra = new Map(), infraPå = new Map(); let maksMS = 0;
    for (let e = 0; e < M; e++) {
      const a = fra[e], b = til[e], l = R.l[e], f = flagg[e], kat = R.kat[e], fart = R.fart[e];
      if (a >= N || b >= N || !Number.isFinite(l) || l <= 0 || kat >= KATEGORIER.length || !(f & 3) || f > 7 ||
          R.start[e] >= R.slutt[e] || R.slutt[e] > 1e8) throw new Error('Ugyldig veglenke ' + e);
      lengde[e] = Math.max(l, Math.hypot(x[a] - x[b], y[a] - y[b]));
      const ms = (f & 4 ? 25 : (fart || FART[kat])) / 3.6;
      tid[e] = lengde[e] / ms; maksMS = Math.max(maksMS, ms);
      if (f & 1) antall[a + 1]++;
      if (f & 2) antall[b + 1]++;
      if (!(f & 4)) land[a] = land[b] = 1;
    }
    for (let i = 0; i < I; i++) {
      const e = R.ie[i], type = R.it[i], id = R.id[i], key = type + ':' + id;
      if (e >= M || ![60, 67, 770].includes(type)) throw new Error('Ugyldig infrastrukturkobling');
      if (!infra.has(key)) infra.set(key, []);
      infra.get(key).push(e);
      if (!infraPå.has(e)) infraPå.set(e, []);
      infraPå.get(e).push([type, id]);
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
      const punkter = R.linje(e);
      if (punkter.length < 2) throw new Error('Skadet veggeometri');
      return punkter;
    }
    function lenke(e) {
      sjekkLenke(e);
      return { id: e, fra: fra[e], til: til[e], lengde: lengde[e], sekvens: R.sekvens[e],
        startposisjon: R.start[e] / 1e8, sluttposisjon: R.slutt[e] / 1e8,
        vegkategori: KATEGORIER[R.kat[e]], vegnummer: R.vegnr[e],
        fartsgrense: R.fart[e] || null, ferje: !!(flagg[e] & 4), sperret: !!sperret[e] };
    }
    function rute(start, slutt, valg = {}) {
      const maks = valg.maksAvstand === undefined ? 2000 : valg.maksAvstand;
      const a = Array.isArray(start) ? naermeste(start, maks) : start;
      const b = Array.isArray(slutt) ? naermeste(slutt, maks) : slutt;
      if (a === -1 || b === -1) return null;
      if (!heltall(a, N) || !heltall(b, N)) throw new RangeError('Ukjent start- eller sluttnode');
      const vent = valg.ferjeVentetid === undefined ? 900 : valg.ferjeVentetid;
      if (!Number.isFinite(vent) || vent < 0) throw new RangeError('Ugyldig ferjeventetid');
      // Kategorifaktor (≥ 1 per kategori i ERFKPS): gjør mindre veger «dyrere», f.eks. for lastebiler som holder seg på hovedvegen.
      const kf = valg.kategoriFaktor;
      if (kf !== undefined && !(Array.isArray(kf) && kf.length === KATEGORIER.length && kf.every(v => Number.isFinite(v) && v >= 1))) throw new RangeError('Ugyldig kategorifaktor');
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
          let sekunder = dist[b];
          if (kf) { sekunder = 0; for (let i = 0; i < lenker.length; i++) { const e = lenker[i]; sekunder += tid[e] + ((flagg[e] & 4) && land[noder[i]] ? vent : 0); } }
          return { noder, lenker, meter, sekunder, besokt };
        }
        for (let k = antall[n]; k < antall[n + 1]; k++) {
          const e = kant[k], v = nabo[k];
          if (sperret[e]) continue;
          if (valg.tillat && !valg.tillat(lenke(e))) continue;
          // Vent én gang ved avgang fra land, ikke på hvert NVDB-segment ute på fjorden.
          const g = q.g + tid[e] * (kf ? kf[R.kat[e]] : 1) + ((flagg[e] & 4) && land[n] ? vent : 0);
          if (g >= dist[v]) continue;
          dist[v] = g; forrige[v] = n; via[v] = e; heap.legg(v, g, g + h(v));
        }
      }
      return null;
    }
    return { antallNoder: N, antallLenker: M, dato: String(R.dato), punkt, naermeste, linje, lenke, rute,
      infraLenker(type, id) { return (infra.get(type + ':' + id) || []).slice(); },
      infraPåLenke(e) { sjekkLenke(e); return (infraPå.get(e) || []).map(t => t.slice()); },   // [[type, kilde-id], ...]
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
