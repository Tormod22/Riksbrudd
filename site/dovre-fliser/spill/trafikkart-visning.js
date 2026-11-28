'use strict';
// TRAFIKKARTET – visningen (28. nov, fase F5; reglene: spill/trafikkart.js). Lastes etter utpost-visning.js.
//  - FolkgangSpill.sporKrok: gangen gir et punkt for hver 2. meter en person går (spill/folkgang.js), lagt i rutenettet rundt leiren.
//  - Av/på fra Folk-panelet (TrafikkSpill.vis(true/false), knappen «Trafikkart» – bare visning, endrer ikke spillet). Valget huskes i
//    nettleseren («riksbrudd-trafikk»). Kartet tegnes i 2D oppå leiren (gult = noe, rødt = mye) med de mest brukte stedene merket.
//  - Ingenting av trafikken lagres: kartet starter tomt når spillet lastes (det viser siste døgn mens du spiller).
(function () {
  const TK = window.Trafikkart; if (!TK || typeof KROKER === 'undefined') return;
  let T = null, nøkkel = '', på = false, bilde = null, bildeV = -1;
  try { på = localStorage.getItem('riksbrudd-trafikk') === '1'; } catch (e) { /* uten lager */ }
  const midte = () => { const s = window.OppstartSpill && OppstartSpill.tilstand(); return s && s.leir ? s.leir : null; };
  const nå = () => (typeof tid !== 'undefined' ? tid : 0);
  function kart() { const m = midte(); if (!m) return null; const k = Math.round(m.x) + ',' + Math.round(m.y); if (k !== nøkkel || !T) { nøkkel = k; T = TK.ny(m); bilde = null; } return T; }
  if (window.FolkgangSpill) FolkgangSpill.sporKrok = (x, y, m) => { const K = kart(); if (K) TK.legg(K, x, y, m, nå()); };
  // bildet av rutenettet (ett punkt per rute), laget på nytt høyst hvert sekund
  let sist = 0;
  function lagBilde() {
    const K = kart(); if (!K) return null; const n = performance.now(); if (bilde && (bildeV === K.versjon || n - sist < 1000)) return bilde; sist = n;
    TK.rull(K, nå()); const s = TK.sum(K), o = TK.oversikt(K); bildeV = K.versjon;
    const c = bilde || document.createElement('canvas'); c.width = K.N; c.height = K.N; const g = c.getContext('2d'), im = g.createImageData(K.N, K.N);
    for (let j = 0; j < K.N; j++) for (let i = 0; i < K.N; i++) { const f = TK.farge(s[j * K.N + i], o.maks); if (!f) continue; const q = ((K.N - 1 - j) * K.N + i) * 4; im.data[q] = f[0]; im.data[q + 1] = f[1]; im.data[q + 2] = f[2]; im.data[q + 3] = f[3]; }
    g.putImageData(im, 0, 0); bilde = c; return c;
  }
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!på || typeof kam === 'undefined' || (typeof på3d !== 'undefined' && på3d) || kam.m > 8) return; const K = kart(); if (!K) return; const c = lagBilde(); if (!c) return;
    const m = kam.m, x = (K.x0 - vx0) / m, y = (vy1 - (K.y0 + K.N * K.r)) / m, w = K.N * K.r / m;
    g.save(); g.imageSmoothingEnabled = true; g.globalAlpha = .85; g.drawImage(c, x, y, w, w); g.globalAlpha = 1;
    // de mest brukte stedene: ring med meter gått siste døgn
    g.font = '600 12px "Cormorant Garamond", serif'; g.textAlign = 'center';
    TK.topp(K, 3).forEach((q, n) => { const X = (q.x - vx0) / m, Y = (vy1 - q.y) / m; g.strokeStyle = '#f6e3b0'; g.lineWidth = 1.5; g.beginPath(); g.arc(X, Y, 10, 0, 6.283); g.stroke();
      const t = `${n + 1}: ${Math.round(q.meter)} m`; g.fillStyle = 'rgba(0,0,0,.6)'; const tw = g.measureText(t).width; g.fillRect(X - tw / 2 - 3, Y - 27, tw + 6, 15); g.fillStyle = '#f6e3b0'; g.fillText(t, X, Y - 15); });
    g.restore(); });
  // ved hvilket bygg ligger stedet? (for teksten i Folk-panelet)
  function vedBygg(q) { const L = window.LeirSpill && LeirSpill.tilstand(); if (!L || !window.Leir) return null; let best = null, bd = 30;
    for (const b of L.bygg) { const B = Leir.BYGG[b.type]; if (!B || B.del || B.linje) continue; const d = Math.hypot(b.x - q.x, b.y - q.y); if (d < bd) { bd = d; best = B.navn.toLowerCase(); } } return best; }
  // teksten i Folk-panelet: «Gått i leiren siste døgn: 3,4 km. Mest ved kjøkken (820 m) …»
  function tekst() { const K = kart(); if (!K) return ''; TK.rull(K, nå()); const o = TK.oversikt(K); if (!(o.meter > 1)) return 'Ingen har gått i leiren ennå i dette døgnet.';
    const t = TK.topp(K, 3).map(q => { const b = vedBygg(q); return (b ? 'ved ' + b : 'ute på plassen') + ` (${Math.round(q.meter)} m)`; });
    return `Gått i leiren siste døgn: ${(Math.round(o.meter / 100) / 10).toString().replace('.', ',')} km. Mest ${t.join(', ')}. Kortere vei der (dør, lager nærmere) gir mer arbeid.`; }
  window.TrafikkSpill = { på: () => på, vis: v => { på = v === undefined ? !på : !!v; try { localStorage.setItem('riksbrudd-trafikk', på ? '1' : '0'); } catch (e) { /* */ } if (på && typeof kam !== 'undefined' && kam.m > 8) { const m = midte(); if (m) { kam.x = m.x; kam.y = m.y; kam.m = 1.2; } } skitten = true; return på; },
    kart, tekst, oversikt: () => (kart() ? TK.oversikt(kart()) : null), bilde: lagBilde, nullstill: () => { T = null; } };
})();
