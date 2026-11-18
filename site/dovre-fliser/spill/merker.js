'use strict';
/* Riksbrudd – ETT MERKESETT I KARTET (18. nov, nattarbeid «ui»). Formen sier hvem, tegnet inni sier hva:
 *   EGET    = liggende rektangel (som i militære kart),
 *   FIENDE  = rute som står på spissen,
 *   NØYTRAL = kvadrat med avrundede hjørner.
 * Inni: lag (kryss), kjøretøy (oval med hjul), bygg (hus), kai (anker), tettsted (ring med prikk), ukjent (spørsmålstegn).
 * Fargen kommer fra den som tegner (sidens farge), så rød og grønn motstander skilles på fargen – begge har fiendens form.
 * Merker.tegn(g, x, y, { forhold, slag, farge, valgt, r, stiplet }) tegner ett merke og svarer radien; Merker.form(forhold) og
 * Merker.treff(forhold, dx, dy, r) er uten lerret (test_merker.js). Lagene i index.html (tegnLag) bruker settet; kjøretøy, kaier og
 * tettsteder tegnes av andre filer og kan bruke det samme.
 */
(function (rot) {
  const FORHOLD = ['eget', 'fiende', 'nøytral'], SLAG = ['lag', 'kjøretøy', 'bygg', 'kai', 'tettsted', 'ukjent'];
  const form = f => (f === 'fiende' ? 'rute' : f === 'nøytral' ? 'kvadrat' : 'rektangel');
  const forhold = side => (side === 'blå' ? 'eget' : side === 'rød' || side === 'grønn' ? 'fiende' : 'nøytral');
  // halve bredden og høyden på formen for radien r (alle tre dekker omtrent samme flate)
  const mål = (f, r) => (f === 'fiende' ? [r * 1.18, r * 1.18] : f === 'nøytral' ? [r * .85, r * .85] : [r, r * .7]);
  function treff(f, dx, dy, r) { const [w, h] = mål(f, r); return f === 'fiende' ? Math.abs(dx) / w + Math.abs(dy) / h <= 1 : Math.abs(dx) <= w && Math.abs(dy) <= h; }
  function omriss(g, f, x, y, r) { const [w, h] = mål(f, r); g.beginPath();
    if (f === 'fiende') { g.moveTo(x, y - h); g.lineTo(x + w, y); g.lineTo(x, y + h); g.lineTo(x - w, y); g.closePath(); }
    else if (f === 'nøytral') { const q = r * .22; g.moveTo(x - w + q, y - h); g.lineTo(x + w - q, y - h); g.quadraticCurveTo(x + w, y - h, x + w, y - h + q); g.lineTo(x + w, y + h - q); g.quadraticCurveTo(x + w, y + h, x + w - q, y + h); g.lineTo(x - w + q, y + h); g.quadraticCurveTo(x - w, y + h, x - w, y + h - q); g.lineTo(x - w, y - h + q); g.quadraticCurveTo(x - w, y - h, x - w + q, y - h); g.closePath(); }
    else g.rect(x - w, y - h, w * 2, h * 2); }
  function tegn(g, x, y, v = {}) { const f = v.forhold || 'eget', r = v.r || 11, [w, h] = mål(f, r), lys = v.strek || '#e7dcc3';
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    if (v.stiplet) { g.setLineDash([3, 3]); g.strokeStyle = v.farge || 'rgba(220,120,90,.8)'; g.lineWidth = 1.3; omriss(g, f, x, y, r); g.stroke(); g.restore(); return r; }
    g.fillStyle = 'rgba(0,0,0,.4)'; omriss(g, f, x + 1.5, y + 2, r); g.fill();
    g.fillStyle = v.farge || '#3f5f8f'; g.strokeStyle = v.valgt ? '#f0d79a' : lys; g.lineWidth = v.valgt ? 2.5 : 1.3; omriss(g, f, x, y, r); g.fill(); g.stroke();
    // tegnet inni holder seg innenfor formen (klippes for ruta)
    g.save(); omriss(g, f, x, y, r); g.clip(); g.strokeStyle = lys; g.fillStyle = lys; g.lineWidth = 1.2; g.beginPath();
    const s = v.slag || 'lag';
    if (s === 'lag') { g.moveTo(x - w, y - h); g.lineTo(x + w, y + h); g.moveTo(x + w, y - h); g.lineTo(x - w, y + h); g.stroke(); }
    else if (s === 'kjøretøy') { const a = Math.min(w, h * 1.6) * .62, b = h * .42; g.ellipse(x, y - b * .15, a, b, 0, 0, 6.283); g.stroke(); g.beginPath(); g.arc(x - a * .55, y + b * .95, 1.3, 0, 6.283); g.arc(x + a * .55, y + b * .95, 1.3, 0, 6.283); g.fill(); }
    else if (s === 'bygg') { const a = Math.min(w, h) * .62; g.moveTo(x - a, y + a * .75); g.lineTo(x - a, y - a * .1); g.lineTo(x, y - a * .85); g.lineTo(x + a, y - a * .1); g.lineTo(x + a, y + a * .75); g.closePath(); g.stroke(); }
    else if (s === 'kai') { const a = Math.min(w, h) * .7; g.moveTo(x, y - a * .55); g.lineTo(x, y + a * .8); g.moveTo(x - a * .45, y - a * .2); g.lineTo(x + a * .45, y - a * .2); g.moveTo(x - a * .75, y + a * .25); g.quadraticCurveTo(x - a * .6, y + a * .85, x, y + a * .8); g.quadraticCurveTo(x + a * .6, y + a * .85, x + a * .75, y + a * .25); g.stroke(); g.beginPath(); g.arc(x, y - a * .75, a * .2, 0, 6.283); g.stroke(); }
    else if (s === 'tettsted') { const a = Math.min(w, h) * .55; g.arc(x, y, a, 0, 6.283); g.stroke(); g.beginPath(); g.arc(x, y, 1.6, 0, 6.283); g.fill(); }
    else { g.font = `600 ${Math.round(r * 1.1)}px "Cormorant Garamond",serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', x, y + 1); }
    g.restore(); g.restore(); return r; }
  const Merker = { FORHOLD, SLAG, form, forhold, mål, treff, tegn };
  if (typeof module !== 'undefined' && module.exports) module.exports = Merker; else rot.Merker = Merker;
})(typeof globalThis !== 'undefined' ? globalThis : this);
