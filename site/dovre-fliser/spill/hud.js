'use strict';
// Små ting i skjermbildet (10. nov). Loggen øverst til høyre dekket mye av 3D-bildet (særlig på mobil): i 3D tones den ut 10 s etter
// siste melding og kommer tilbake når det kommer en ny. I 2D står den i 30 s (12. nov).
// 18. nov (nattarbeid «ui»): lange meldinger fylte høyre side. Hver melding er nå et IKON og høyst to linjer; trykk på loggen for å
// lese alt (klassen «hel», lukker seg selv etter ti sekunder). Ikonet velges av ordene i meldingen (SLAG), og varsler får rød kant.
(function () {
  const L = document.getElementById('logg'); if (!L) return;
  const SLAG = [['varsel', /angrep|angrip|røver|fiende|tom for|sulter|mangler|fikk ikke|kan ikke|ikke råd|tapt|falt|skadet|under ild|⚠/i], ['maal', /mål nådd|^mål|neste:/i], ['hammer', /bygg|ferdig|reparer|revet|hogd/i],
    ['folk', /folk|rekrutt|moral|overlevende|gjengen/i], ['penger', /\bkr\b|kassa|solgt|kjøpt|pris/i], ['radio', /meld|radio|kontakt|ordre/i]];
  const slag = t => { for (const [n, re] of SLAG) if (re.test(t)) return n; return 'snakk'; };
  const css = document.createElement('style');
  css.textContent = `body:not(.kort) #logg{ width:270px; } body:not(.kort) #logg div{ position:relative; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; padding:3px 8px 3px 30px; margin-bottom:3px; background:rgba(20,16,10,.78); border-left:2px solid #6a5a34; border-radius:0 3px 3px 0; pointer-events:auto; cursor:pointer; text-shadow:none; animation:logginn .25s ease-out; }
body:not(.kort) #logg div[data-ikon]::before{ position:absolute; left:7px; top:5px; width:16px; height:16px; margin:0; color:#c9b26a; opacity:1; }
body:not(.kort) #logg div[data-slag="varsel"]{ border-left-color:#c8553a; color:#f0d9c8; } body:not(.kort) #logg div[data-slag="varsel"]::before{ color:#f08a6a; } body:not(.kort) #logg div[data-slag="maal"]{ border-left-color:#c9b26a; }
body:not(.kort) #logg.hel{ width:340px; } body:not(.kort) #logg.hel div{ display:block; -webkit-line-clamp:unset; opacity:1 !important; background:rgba(20,16,10,.94); }
#logg.borte div{ pointer-events:none !important; } @keyframes logginn{ from{ transform:translateX(14px); } } #logg div:nth-child(n+2){ animation:none !important; }
@media (prefers-reduced-motion:reduce){ #logg div{ animation:none !important; } }`;
  document.head.appendChild(css);
  let sist = performance.now(), lukk = 0;
  L.style.transition = 'opacity 1.2s';
  const merk = () => { for (const d of L.children) { const s = slag(d.textContent); if (d.dataset.slag !== s) { d.dataset.slag = s; d.dataset.ikon = s; } } };
  new MutationObserver(() => { sist = performance.now(); L.style.opacity = ''; L.classList.remove('borte'); merk(); }).observe(L, { childList: true, subtree: true, characterData: true });
  L.addEventListener('click', () => { if (document.body.classList.contains('kort')) return; const å = L.classList.toggle('hel'); clearTimeout(lukk); sist = performance.now(); if (å) lukk = setTimeout(() => L.classList.remove('hel'), 10000); });
  // 12. nov: i 2D ble åpningsteksten og gamle meldinger stående oppå kartet for alltid – der tones loggen ut etter 30 s
  setInterval(() => { if (L.classList.contains('hel')) return; const tre = typeof på3d !== 'undefined' && på3d, borte = performance.now() - sist > (tre ? 10000 : 30000); L.style.opacity = borte ? '0' : ''; L.classList.toggle('borte', borte); }, 500);
  merk();
  window.Hud = { slag, hel: () => L.classList.contains('hel') };
})();
