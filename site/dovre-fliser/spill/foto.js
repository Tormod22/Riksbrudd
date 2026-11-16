'use strict';
// Fotomodus (brukeren 16. nov: «legg til flere funksjoner»): «Fotomodus» i ☰ (eller tasten U) skjuler alt som ligger oppå
// kartet og 3D-bildet – statuslinja, knappene, loggen, kompasset, minikartet og navnene – så bildet står alene, f.eks. til et
// skjermbilde. En liten knapp nederst («Vis menyene»), Esc eller U henter alt tilbake. Styringen virker som før (på telefon er
// styrespaken usynlig, men den virker).
(function () {
  const css = document.createElement('style');
  css.textContent = `body.foto > *:not(canvas):not(.papir):not(#fotoav):not(script):not(style){ display:none !important; } body.foto #c3o{ display:none !important; }
#fotoav{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(10px + env(safe-area-inset-bottom,0px)); z-index:20; display:none; padding:5px 14px; min-height:34px;
  background:rgba(22,18,12,.5); border:1px solid rgba(231,220,195,.35); color:rgba(231,220,195,.8); font:inherit; font-size:14px; cursor:pointer; }
body.foto #fotoav{ display:block; opacity:.55; } body.foto #fotoav:hover{ opacity:1; }`;
  document.head.appendChild(css);
  const av = document.createElement('button'); av.id = 'fotoav'; av.type = 'button'; av.textContent = 'Vis menyene'; document.body.appendChild(av);
  const sett = på => { document.body.classList.toggle('foto', på); if (på) { const m = document.getElementById('lagmeny'), å = document.getElementById('meny'); if (m) m.classList.remove('på'); if (å) { å.classList.remove('på'); å.setAttribute('aria-expanded', 'false'); } }
    if (typeof skitten !== 'undefined') skitten = true; };
  av.onclick = () => sett(false);
  const knapp = document.createElement('button'); knapp.type = 'button'; knapp.id = 'fotoknapp'; knapp.textContent = 'Fotomodus'; knapp.title = 'Skjul menyene (tast U). Esc henter dem tilbake.'; knapp.onclick = () => sett(true);
  const lm = document.getElementById('lagmeny'); if (lm) lm.appendChild(knapp);
  window.addEventListener('keydown', e => { if (e.ctrlKey || e.metaKey || e.altKey) return; const t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    if (document.body.classList.contains('foto') && e.key === 'Escape') { sett(false); return; }
    if (e.key === 'u' || e.key === 'U') { const st = document.getElementById('oppstart'); if (st && st.classList.contains('på')) return; sett(!document.body.classList.contains('foto')); } });
  window.Foto = { sett, på: () => document.body.classList.contains('foto') };
})();
