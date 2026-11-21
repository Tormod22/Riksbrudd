'use strict';
// Anleggene holdes fri for natur (runde 15, brukeren: «Trær bør ikke være på fotballbaner, og steiner bør heller ikke være på
// fotballbaner, det er særdeles uvanlig.»). Fotballbaner, tennisbaner, andre ballbaner, løpebaner, lekeplasser og flyplassens
// rullebaner, taksebaner og oppstillingsplasser (lag «anlegg» i husflisene z13, se kartflis.js anlegg() og spill/anlegg3d.js) får
// ingen trær, busker, steiner, einer eller fjellmark-stein, og gresset der er klippet (lavt, ingen høye tuster eller blomster).
// Reglene øverst virker uten DOM (Node: test_anleggfri.js); visningen nederst henter omrissene når et 3D-utsnitt bygges og setter
// u.påAnlegg(x, y) – utsnittets meter (relativt til midten) – som vegetasjon3d.js, fjellmark3d.js, gress3d, trær3d og smått3d spør.
(function (rot) {
  // Claudes forslag: hvilke anleggstyper som holdes fri (a i dataene; 6 = parkering eies av by-pakka), kant rundt omrisset i meter
  // (trekronene og steinene skal ikke stikke inn over banen) og rutenettets størrelse for oppslaget.
  const REGLER = { typer: [1, 2, 3, 4, 5, 7, 8, 9], kant: 2, rute: 50 };

  const inniP = (P, X, Y) => { let inn = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
      if ((yi > Y) !== (yj > Y) && X < (xj - xi) * (Y - yi) / (yj - yi) + xi) inn = !inn; }
    return inn; };

  // polygoner: [[[x, y], ...], ...] i utsnittets meter. Gir et oppslag { rute: Map, n } (hvert omriss i alle rutene boksen rører).
  function lag(polygoner, kant = REGLER.kant) {
    const rute = new Map(), R = REGLER.rute; let n = 0;
    for (const P of polygoner) { if (!P || P.length < 3) continue; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const [x, y] of P) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const o = { P, bb: [x0 - kant, y0 - kant, x1 + kant, y1 + kant] }; n++;
      for (let j = Math.floor(o.bb[1] / R); j <= Math.floor(o.bb[3] / R); j++) for (let i = Math.floor(o.bb[0] / R); i <= Math.floor(o.bb[2] / R); i++) {
        const k = i + ',' + j; let l = rute.get(k); if (!l) rute.set(k, l = []); l.push(o); } }
    return { rute, n, kant };
  }
  // ligger (x, y) på et anlegg, eller nærmere kanten enn «kant» meter?
  function inni(A, x, y, kant) {
    if (!A || !A.n) return false; const k = kant === undefined ? A.kant : kant, l = A.rute.get(Math.floor(x / REGLER.rute) + ',' + Math.floor(y / REGLER.rute));
    if (!l) return false;
    for (const o of l) { const b = o.bb; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
      if (inniP(o.P, x, y)) return true;
      if (k > 0) for (const [dx, dy] of [[k, 0], [-k, 0], [0, k], [0, -k]]) if (inniP(o.P, x + dx, y + dy)) return true; }
    return false;
  }
  // tar bort alle ting (steg tall per ting, x og y først) som står på et anlegg; gir samme type tilbake (liste eller Float32Array)
  function rens(A, data, steg) {
    if (!data || !data.length || !A || !A.n) return data; const ut = [];
    for (let k = 0; k < data.length; k += steg) if (!inni(A, data[k], data[k + 1])) for (let i = 0; i < steg; i++) ut.push(data[k + i]);
    return ut.length === data.length ? data : Array.isArray(data) ? ut : new Float32Array(ut);
  }
  const api = { REGLER, lag, inni, rens };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.AnleggFri = api;

  // ---------- visning (nettleseren) ----------
  // henter omrissene fra husflisene z13 (de samme som spill/anlegg3d.js bruker – hentFlis husker dem) og setter u.påAnlegg.
  api.hent = async u => {
    u.anleggFri = null; u.påAnlegg = null;
    if (u.S > 4200 || typeof LAGFILER === 'undefined' || !LAGFILER || !LAGFILER.hus || typeof hentFlis !== 'function') return;
    const z = 13, sp = span(z), [x0, y0, x1, y1] = flisområde([u.cx - u.S, u.cy - u.S, u.cx + u.S, u.cy + u.S], z), fl = [], P = [], typer = new Set(REGLER.typer);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fl.push(hentFlis('hus', z, x, y).then(t => [x, y, t]).catch(() => [x, y, null]));
    for (const [x, y, t] of await Promise.all(fl)) { if (!t || !t.anlegg) continue; const minx = G.x0 + x * sp, maxy = G.y0 - y * sp, k = sp / 4096;
      for (const o of t.anlegg.obj) { if (!typer.has(o.e.a)) continue;
        for (const d of o.deler) if (d.length > 3) P.push(d.map(([p, q]) => [minx + p * k - u.cx, maxy - q * k - u.cy])); } }
    if (!P.length) return;
    const A = lag(P); u.anleggFri = A; u.påAnlegg = (x, y, kant) => inni(A, x, y, kant);
  };
  // etter at trærne (trær3d) og steinene/buskene (smått3d) er satt: ta bort dem som står på et anlegg
  api.rydd = async u => {
    const A = u.anleggFri; if (!A) return; let før = 0, etter = 0;
    const tell = d => (d && d.length) || 0;
    if (u.trær) for (const art of Object.keys(u.trær)) { før += tell(u.trær[art]); u.trær[art] = rens(A, u.trær[art], 5); etter += tell(u.trær[art]); if (typeof pust === 'function') await pust(); }
    if (u.smått) for (const n of ['stein', 'busk']) { før += tell(u.smått[n]); u.smått[n] = rens(A, u.smått[n], 5); etter += tell(u.smått[n]); }
    u.anleggRyddet = (før - etter) / 5;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
