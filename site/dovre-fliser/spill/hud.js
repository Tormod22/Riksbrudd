'use strict';
// Små ting i skjermbildet (10. nov). Loggen øverst til høyre dekket mye av 3D-bildet (særlig på mobil): i 3D tones den ut 10 s etter
// siste melding og kommer tilbake når det kommer en ny. I 2D står den i 30 s (12. nov).
(function () {
  const L = document.getElementById('logg'); if (!L) return;
  let sist = performance.now();
  L.style.transition = 'opacity 1.2s';
  new MutationObserver(() => { sist = performance.now(); L.style.opacity = ''; }).observe(L, { childList: true, subtree: true, characterData: true });
  // 12. nov: i 2D ble åpningsteksten og gamle meldinger stående oppå kartet for alltid – der tones loggen ut etter 30 s
  setInterval(() => { const tre = typeof på3d !== 'undefined' && på3d; L.style.opacity = performance.now() - sist > (tre ? 10000 : 30000) ? '0' : ''; }, 500);
})();
