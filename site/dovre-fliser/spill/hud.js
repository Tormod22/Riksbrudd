'use strict';
// Små ting i skjermbildet (10. nov). Loggen øverst til høyre dekket mye av 3D-bildet (særlig på mobil): i 3D tones den ut 10 s etter
// siste melding og kommer tilbake når det kommer en ny. I 2D står den som før.
(function () {
  const L = document.getElementById('logg'); if (!L) return;
  let sist = performance.now();
  L.style.transition = 'opacity 1.2s';
  new MutationObserver(() => { sist = performance.now(); L.style.opacity = ''; }).observe(L, { childList: true, subtree: true, characterData: true });
  setInterval(() => { const tre = typeof på3d !== 'undefined' && på3d; L.style.opacity = tre && performance.now() - sist > 10000 ? '0' : ''; }, 500);
})();
