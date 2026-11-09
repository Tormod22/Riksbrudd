'use strict';
// FPS-teller (brukeren 11. nov): bilder per sekund øverst, regnet over det siste sekundet, og den tregeste rammen (ms) i samme sekund.
// Grønn fra 50 fps, gul fra 30, rød under. Kan slås av og på i ☰ («FPS-teller»); valget huskes i nettleseren.
(function () {
  const st = document.createElement('div'), b = document.createElement('b'), sp = document.createElement('span');
  b.id = 'sFps'; b.textContent = '–'; sp.textContent = 'fps'; st.append(b, ' ', sp); document.querySelector('.stats').appendChild(st);
  let på = true; try { på = localStorage.getItem('riksbrudd-fps') !== 'av'; } catch (e) { /* privat vindu */ }
  st.hidden = !på;
  const knapp = document.createElement('button'), sett = () => { knapp.textContent = 'FPS-teller'; knapp.classList.toggle('av', !på); knapp.setAttribute('aria-pressed', String(på)); st.hidden = !på; };
  knapp.onclick = () => { på = !på; try { localStorage.setItem('riksbrudd-fps', på ? 'på' : 'av'); } catch (e) { /* privat vindu */ } sett(); };
  sett(); document.getElementById('lagmeny').appendChild(knapp);
  let n = 0, start = performance.now(), forrige = start, verst = 0;
  (function tell(t) {
    n++; verst = Math.max(verst, t - forrige); forrige = t;
    if (t - start >= 1000) { const fps = n * 1000 / (t - start);
      if (på) { b.textContent = Math.round(fps); b.style.color = fps >= 50 ? '#9fd88f' : fps >= 30 ? '#e0c060' : '#e0604a'; b.title = `tregeste ramme ${Math.round(verst)} ms`; }
      window.FPS = { fps, verst }; n = 0; start = t; verst = 0; }
    requestAnimationFrame(tell);
  })(performance.now());
})();
