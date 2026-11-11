'use strict';
// KOMPAKT SKJERM (12. nov, brukeren med skjermbilde fra iPhone på tvers: «Dette er ikke god nok UI»). På lave skjermer (under 560 px høyde,
// f.eks. telefon liggende) ble statuslinja to rader, knapperaden og minikartet tok halve bildet, minikartet lå oppå Huk/Hopp og
// kildeteksten dekket nederste tredjedel. body.kort gir da:
//  - én tynn rad øverst: status (kort, uten «lastet»), knapper i mindre størrelse, fartsknappene som én knapp som blar 1× → 10× → 60× → 1×;
//  - minikartet lite oppe til høyre under knappene, loggen oppe til venstre, zoomknappene små nede til høyre, Huk/Hopp ved siden av dem;
//  - kildeteksten som én kort linje «Kilder ⓘ» (trykk viser hele);
//  - avstand til kanten der telefonen har kamera/avrundede hjørner (env(safe-area-inset-*));
//  - ☰-menyen og panelene kan rulles når de er høyere enn skjermen.
// For alle skjermer: navn og merker i 3D tegnes ikke oppe under knappene og kompasset (UI_TOPP3D, brukt i tegn3d).
(function () {
  const css = document.createElement('style');
  const L = 'env(safe-area-inset-left,0px)', Rt = 'env(safe-area-inset-right,0px)', B = 'env(safe-area-inset-bottom,0px)', T = 'env(safe-area-inset-top,0px)';
  css.textContent = `
body.kort .top{ top:calc(5px + ${T}); left:calc(6px + ${L}); right:calc(6px + ${Rt}); flex-wrap:nowrap; gap:6px; align-items:flex-start; }
body.kort .stats{ flex:1 1 auto; min-width:0; flex-wrap:nowrap; overflow-x:auto; overflow-y:hidden; scrollbar-width:none; touch-action:pan-x; padding:3px 9px; gap:0 11px; mask-image:linear-gradient(90deg,#000 calc(100% - 18px),transparent); -webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 18px),transparent); }
body.kort .stats b{ font-size:14.5px; } body.kort .stats span{ font-size:11.5px; }
body.kort .stats .ikke-kort, body.kort #sAar{ display:none; } body.kort .stats::-webkit-scrollbar{ display:none; }
body.kort .knapper{ flex:none; flex-wrap:nowrap; gap:3px; }
body.kort .knapper button{ height:31px; min-width:31px; padding:0 7px; font-size:13.5px; }
body.kort .knapper #sp1:not(.på), body.kort .knapper #sp2:not(.på), body.kort .knapper #sp3:not(.på){ display:none; }
body.kort #kompass{ top:calc(var(--topp,44px) + 3px); }
body.kort #minikart{ right:calc(8px + ${Rt}); left:auto; top:calc(var(--topp,44px) + 8px); bottom:auto; width:104px; height:104px; }
body.kort #minikart button{ width:26px; height:26px; right:-5px; top:-5px; font-size:11px; }
body.kort #logg{ left:calc(10px + ${L}); right:auto; top:calc(var(--topp,44px) + 8px); width:min(300px,34vw); font-size:12px; line-height:1.3; }
body.kort.kompass3d #logg{ top:calc(var(--topp,44px) + 62px); }
body.kort #logg div:nth-child(n+4){ display:none; }
body.kort .ctl{ right:calc(8px + ${Rt}); bottom:calc(8px + ${B}); gap:4px; }
body.kort .ctl button{ width:36px; height:36px; font-size:17px; }
body.kort #gangeknapper{ right:calc(54px + ${Rt}); bottom:calc(10px + ${B}); gap:8px; }
body.kort #gangeknapper button{ width:54px; height:54px; font-size:13.5px; }
body.kort #kilde{ left:calc(10px + ${L}); right:auto; bottom:calc(4px + ${B}); max-width:46vw; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:auto; cursor:pointer; }
body.kort #kilde.åpen{ white-space:normal; max-width:none; right:calc(56px + ${Rt}); background:var(--panel); border:1px solid var(--rule); padding:6px 9px; z-index:8; }
body.kort #skala{ left:calc(12px + ${L}); bottom:calc(22px + ${B}); } body.kort #nordpil{ left:calc(12px + ${L}); bottom:calc(46px + ${B}); width:40px; height:40px; }
/* stående telefon: statuslinja på én rad over hele bredden, knappene på én rad under; minikartet og loggen under kompasset */
body.kort.smal .top{ flex-wrap:wrap; justify-content:flex-end; }
body.kort.smal .stats{ flex:1 1 100%; }
body.kort.smal .knapper button{ padding:0 6px; min-width:30px; }
body.kort.smal.kompass3d #minikart{ top:calc(var(--topp,44px) + 62px); }
body.kort.smal #logg{ width:calc(100% - 140px - ${L}); }
body.kort.smal #kilde{ max-width:44vw; }
body.kort #lagmeny{ right:calc(8px + ${Rt}); top:calc(var(--topp,44px) + 4px); max-height:calc(100% - var(--topp,44px) - 12px); overflow:auto; z-index:9; }
body.kort #lagmeny button{ height:32px; font-size:14px; }
body.kort #panel{ left:calc(8px + ${L}); bottom:calc(6px + ${B}); max-height:calc(100% - var(--topp,44px) - 16px); }
body.kort #leirmeny{ top:calc(var(--topp,44px) + 4px); bottom:calc(6px + ${B}); left:calc(8px + ${L}); }
`;
  document.head.appendChild(css);

  const sjekk = () => { const smal = window.innerWidth < 700; document.body.classList.toggle('kort', window.innerHeight < 560 || smal); document.body.classList.toggle('smal', smal); };
  sjekk(); window.addEventListener('resize', sjekk); window.addEventListener('orientationchange', () => setTimeout(sjekk, 300));

  // statusfelt som ikke trengs på en lav skjerm: hvor mye som er lastet
  const kb = document.getElementById('sKB'); if (kb && kb.parentElement) kb.parentElement.classList.add('ikke-kort');

  // fartsknappene: på en lav skjerm vises bare den valgte, og et trykk går videre til neste (1× → 10× → 60× → 1×)
  const fart = ['sp1', 'sp2', 'sp3'].map(id => document.getElementById(id)).filter(Boolean); let blar = false;
  fart.forEach((b, i) => b.addEventListener('click', e => {
    if (blar || !document.body.classList.contains('kort') || !b.classList.contains('på')) return;
    e.stopImmediatePropagation(); blar = true; fart[(i + 1) % fart.length].click(); blar = false;
  }, true));

  // kildeteksten: én kort linje, trykk viser alt
  const kilde = document.getElementById('kilde');
  if (kilde) { kilde.title = 'Kilder – trykk for å vise alle'; kilde.addEventListener('click', () => kilde.classList.toggle('åpen')); }

  // navn i 3D tegnes ikke under knappene og kompasset øverst
  setInterval(() => {
    const k = document.getElementById('kompass'), t = document.querySelector('.top');
    let y = t ? t.getBoundingClientRect().bottom : 0;
    if (k && k.classList.contains('på')) y = Math.max(y, k.getBoundingClientRect().bottom);
    window.UI_TOPP3D = Math.round(y + 2);
  }, 400);
  window.Kompakt = { sjekk: () => ({ kort: document.body.classList.contains('kort'), topp: window.UI_TOPP3D || 0 }) };
})();
