/* Riksbrudd – ET SAMLET UTSEENDE (17. nov, brukeren: «spillet har ennå ikke bra nok UI»). Gjennomgangen på telefon viste: loggen dekket
 * en tredel av kartet, statuslinja gikk ut av skjermen, knappene ga ingen respons, og panelene så ulike ut. Denne fila lastes sist og gir:
 *  - felles finpuss for alle paneler og knapper (myke hjørner, skygge, tydelig trykk, like overskrifter, smal rullestolpe);
 *  - på små skjermer: statuslinja uten ordene (ikonene sier hva tallene er), og loggen som ÉN linje med siste melding som tones bort
 *    etter noen sekunder – trykk på den for å se de siste meldingene;
 *  - samme skrift på knappene i 3D (Skyt, Hopp, Huk, våpenbytte) som ellers.
 */
(function () {
  'use strict';
  const PANELER = '#leirmeny, #folkmeny, #sekk, #hjelp, #lagmeny, #panel, #byggvalg, #hendelse, #byggesett, #oppstart .kort, #kontrollrom';
  const css = document.createElement('style');
  css.textContent = `${PANELER}{ border-radius:5px; box-shadow:0 12px 34px rgba(0,0,0,.6), 0 0 0 1px rgba(0,0,0,.4); }
button{ border-radius:3px; transition:filter .08s, transform .08s, background-color .12s, border-color .12s; -webkit-tap-highlight-color:transparent; }
button:not(:disabled):active{ filter:brightness(1.45); transform:translateY(1px); }
button:focus-visible{ outline:2px solid #c9b26a; outline-offset:1px; } button:disabled{ cursor:default; }
.knapper button{ box-shadow:0 2px 6px rgba(0,0,0,.45); } .knapper button.på{ border-color:#c9b26a; }
#leirmeny h3, #folkmeny h3, #sekk h3{ margin:14px 0 4px; padding-top:8px; border-top:1px solid rgba(201,178,106,.22); font-size:13px; letter-spacing:.07em; text-transform:uppercase; color:#c9b26a; font-weight:600; }
#leirmeny, #folkmeny, #sekk, #hjelp, #lagmeny{ scrollbar-width:thin; scrollbar-color:#5a4f38 transparent; }
#skytknapp, #gangeknapper button, #byttvapen, #kjorknapp, #letknapp, #sikreknapp{ font-family:inherit; font-weight:600; letter-spacing:.02em; }
#gangeknapper button, #skytknapp{ font-size:16px; box-shadow:0 2px 8px rgba(0,0,0,.5); backdrop-filter:blur(2px); }
#folkmeny .status.brikker{ display:flex; flex-wrap:wrap; gap:5px; margin:6px 0; } #folkmeny .status.brikker span{ background:#241e14; border:1px solid #3a3223; border-radius:3px; padding:2px 8px; font-size:13px; }
body.kort .stats > div > span:not([id]){ display:none; } body.kort .stats{ gap:2px 12px; }
body.kort #logg{ pointer-events:auto; cursor:pointer; transition:opacity .5s; }
body.kort #logg div{ background:rgba(18,15,10,.86); border-left:3px solid #c9b26a; border-radius:0 3px 3px 0; padding:4px 9px; margin-bottom:3px; -webkit-line-clamp:2; text-shadow:none; color:var(--ink,#e7dcc3); }
body.kort #logg:not(.åpen) div:nth-child(n+2){ display:none; } body.kort #logg.åpen div{ display:block; -webkit-line-clamp:unset; } body.kort #logg.åpen div:nth-child(n+2){ border-left-color:#5a4f38; color:var(--ink-dim,#a99); }
body.kort #logg.stille:not(.åpen){ opacity:0; pointer-events:none; }
body.kort #logg div{ padding-bottom:0; border-bottom:4px solid transparent; } body.kort #logg div[data-slag="varsel"]{ border-left-color:#c8553a; }
/* 18. nov – OVERGANGER (respekterer «redusert bevegelse»): panelene glir inn når de åpnes, kortene i menyene svarer på pekeren */
@keyframes panelinn{ from{ opacity:0; translate:-14px 0; } } @keyframes panelopp{ from{ opacity:0; translate:0 14px; } } @keyframes panelned{ from{ opacity:0; translate:0 -8px; } }
#leirmeny.på, #folkmeny.på, #tropppanel.på, #stridpanel.på, #sekk.på{ animation:panelinn .18s ease-out; } #lagmeny.på, #degmeny.på{ animation:panelned .14s ease-out; } #hendelse.på, #alarm.på{ animation:panelopp .22s ease-out; }
#varsler > *{ animation:panelned .2s ease-out; } #leirmeny .flis, #leirmeny .faner button{ transition:border-color .12s, background-color .12s, transform .1s; } #leirmeny .flis:hover{ border-color:#c9b26a; }
#kommando button, #mkom button{ transition:transform .08s, border-color .12s, background .12s; } #mkom button:active{ transform:scale(.94); }
@media (prefers-reduced-motion:reduce){ #leirmeny.på, #folkmeny.på, #tropppanel.på, #stridpanel.på, #sekk.på, #lagmeny.på, #degmeny.på, #hendelse.på, #alarm.på, #varsler > *{ animation:none; } button{ transition:none; } button:not(:disabled):active{ transform:none; } }`;
  document.head.appendChild(css);
  // loggen på små skjermer: siste melding i noen sekunder; trykk viser de siste, og den lukker seg selv igjen
  const L = document.getElementById('logg'); let ro = 0, lukk = 0;
  if (L) { const ny = () => { L.classList.remove('stille'); clearTimeout(ro); ro = setTimeout(() => L.classList.add('stille'), 7000); };
    new MutationObserver(ny).observe(L, { childList: true });
    L.addEventListener('click', () => { if (!document.body.classList.contains('kort')) return; const å = L.classList.toggle('åpen'); clearTimeout(lukk); if (å) { L.classList.remove('stille'); lukk = setTimeout(() => { L.classList.remove('åpen'); ny(); }, 10000); } else ny(); });
    ny(); }
  window.Tema = { logg: () => L && { stille: L.classList.contains('stille'), åpen: L.classList.contains('åpen') } };
})();
