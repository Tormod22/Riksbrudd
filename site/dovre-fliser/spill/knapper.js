'use strict';
/* Riksbrudd – KNAPPERADEN ØVERST (17. nov, brukeren var enig i punkt 5: raden var full av ord – 3D, Gå, Leir, Krig, Sekk, Utenfra, Deg …).
 * Lastes sist. Gå, Leir, Krig og Deg får ikoner: på telefon bare ikonet (ordet står igjen i knappen for skjermlesere og tester, men
 * vises ikke), på PC ikon og ord. Sekken og «Utenfra» er samlet under Deg: trykker du Deg mens du går, kommer en liten meny med
 * Karakterark, Sekken og Se deg utenfra. Ellers åpner Deg karakterarket direkte. Tastene (O, I, V) virker som før.
 */
(function () {
  const svg = d => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'>${d}</svg>`)}")`;
  const IKON = { gaaknapp: "<circle cx='13' cy='4.5' r='2'/><path d='M13 8l-3 5 3 3v5M10 13l-3 1.5M13 9.5l4 2.5M10 16l-2 5'/>", leirknapp: "<path d='M3 20L12 5l9 15zM12 5v15M9.5 20l2.5-4.5 2.5 4.5'/>",
    krigknapp: "<path d='M5 4l12 12M19 4L7 16M4.5 17.5l2.5 2.5M19.5 17.5L17 20M6.5 13.5l-2.5 2.5M17.5 13.5l2.5 2.5'/>", karakterknapp: "<circle cx='12' cy='8' r='4'/><path d='M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7'/>" };
  const css = document.createElement('style');
  css.textContent = `.knapper button[data-kn]::before{ content:''; display:inline-block; width:1.15em; height:1.15em; margin-right:.35em; vertical-align:-.2em; background:currentColor; -webkit-mask:var(--kn) center/contain no-repeat; mask:var(--kn) center/contain no-repeat; }
${Object.entries(IKON).map(([id, d]) => `#${id}{ --kn:${svg(d)}; }`).join('\n')}
body.kort .knapper button[data-kn]{ font-size:0; padding:0 6px; } body.kort .knapper button[data-kn]::before{ width:19px; height:19px; margin:0; vertical-align:middle; }
.knapper #sekkknapp, .knapper #tredjeknapp{ display:none; }
#degmeny{ position:fixed; z-index:31; display:none; min-width:190px; padding:4px; background:#1c170f; border:1px solid #c9b26a; box-shadow:0 6px 18px rgba(0,0,0,.5); } #degmeny.på{ display:block; }
#degmeny button{ display:flex; justify-content:space-between; gap:14px; width:100%; min-height:42px; padding:4px 12px; background:none; border:0; border-bottom:1px solid #2e281e; color:var(--ink,#e7dcc3); font:inherit; font-size:15px; text-align:left; cursor:pointer; align-items:center; } #degmeny button:last-child{ border-bottom:0; } #degmeny button small{ color:var(--ink-dim,#a99); } #degmeny button.på b{ color:#e8d48a; }`;
  document.head.appendChild(css);
  const $ = id => document.getElementById(id), meny = document.createElement('div'); meny.id = 'degmeny'; meny.setAttribute('role', 'menu'); document.body.appendChild(meny);
  function merk() { for (const id of Object.keys(IKON)) { const b = $(id); if (b && !b.dataset.kn) { b.dataset.kn = '1'; if (!b.getAttribute('aria-label')) b.setAttribute('aria-label', b.textContent.trim() || b.title); } } }
  const fins = id => { const b = $(id); return b && !b.hidden ? b : null; };
  const lukk = () => { meny.classList.remove('på'); const k = $('karakterknapp'); if (k) k.setAttribute('aria-expanded', 'false'); };
  function åpne() { const k = $('karakterknapp'), r = k.getBoundingClientRect(), sekk = fins('sekkknapp'), tredje = fins('tredjeknapp'); meny.textContent = '';
    const rad = (navn, tast, fn, på) => { const b = document.createElement('button'); b.setAttribute('role', 'menuitem'); if (på) b.className = 'på'; const n = document.createElement('b'); n.textContent = navn; const t = document.createElement('small'); t.textContent = tast; b.append(n, t); b.onclick = () => { lukk(); fn(); }; meny.appendChild(b); };
    rad('Karakterark', 'O', () => window.KarakterSpill && KarakterSpill.åpne()); if (sekk) rad('Sekken', 'I', () => sekk.click(), sekk.classList.contains('på'));
    if (tredje) rad(tredje.classList.contains('på') ? 'Se gjennom øynene' : 'Se deg utenfra', 'V', () => tredje.click(), tredje.classList.contains('på'));
    meny.classList.add('på'); k.setAttribute('aria-expanded', 'true'); const w = meny.offsetWidth; meny.style.top = Math.round(r.bottom + 4) + 'px'; meny.style.left = Math.round(Math.max(6, Math.min(window.innerWidth - w - 6, r.left))) + 'px'; }
  // Deg-knappen: liten meny når det finnes mer enn karakterarket å velge (du går), ellers rett til arket
  document.addEventListener('click', e => { const k = $('karakterknapp'); if (!k) return; if (e.target === k || k.contains(e.target)) { if (meny.classList.contains('på')) { lukk(); e.stopImmediatePropagation(); e.preventDefault(); return; }
      if (fins('sekkknapp') || fins('tredjeknapp')) { e.stopImmediatePropagation(); e.preventDefault(); åpne(); } return; } if (!meny.contains(e.target)) lukk(); }, true);
  window.addEventListener('keydown', e => { if (e.key === 'Escape') lukk(); });
  merk(); setInterval(merk, 1500);
  window.Knapper = { merk, åpen: () => meny.classList.contains('på'), lukk, IKON: Object.keys(IKON) };
})();
