'use strict';
// Hurtigtaster på PC (brukeren 16. nov: «legg til flere funksjoner»). Tastene trykker bare på knappene som alt finnes, så de gjør
// akkurat det samme som et klikk. De virker ikke mens du skriver i et felt, mens startskjermen er åpen, eller sammen med Ctrl/Alt.
// Mens du går selv (W/A/S/D, C, E, mellomrom og Shift er opptatt), gjelder bare 3, G, L, M og H. Tasten står i knappens hjelpetekst.
(function () {
  // tast -> [knappens id, hva den gjør, virker også mens du går]
  const TASTER = { '3': ['v3d', '3D av og på', true], g: ['gaaknapp', 'Gå selv', true], l: ['leirknapp', 'Leiren', true], m: ['meny', 'Innstillinger', true], h: ['hjelpknapp', 'Slik spiller du', true],
    k: ['kontrollknapp', 'Kontrollrommet', false], p: ['sp0', 'Pause', false], ',': ['sp1', 'Vanlig fart (1×)', false], '.': ['sp2', 'Raskere (10×)', false] };
  const el = id => document.getElementById(id), synlig = b => !!b && !b.hidden && !b.disabled && b.offsetParent !== null;
  const går = () => typeof R3 !== 'undefined' && R3 && R3.fot;
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    // UTVIKLING (17. nov, brukeren: «om jeg trykker på y, får jeg 100 millioner kr – bare nå under utviklingen for testing»). TA UT FØR SPILLET ER FERDIG.
    if ((e.key === 'y' || e.key === 'Y') && window.OppstartSpill && OppstartSpill.tilstand() && OppstartSpill.gi) { const tt = e.target, tg = tt && tt.tagName; if (tg !== 'INPUT' && tg !== 'TEXTAREA' && tg !== 'SELECT') { const so = document.getElementById('oppstart'); if (!(so && so.classList.contains('på'))) { OppstartSpill.gi(100e6); logg('Testing: +100 millioner kr (tasten Y).'); return; } } }
    const t = e.target, tag = t && t.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    const st = el('oppstart'); if (st && st.classList.contains('på')) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key, T = TASTER[k]; if (!T) return;
    if (går() && !T[2]) return;
    let b = el(T[0]);   // (pauseknappen går selv videre i farten du hadde når den trykkes i pause)
    // (fartsknappene er slått sammen til én på smale skjermer, men virker like fullt)
    if (!b || (!/^sp\d$/.test(b.id) && !synlig(b))) return; e.preventDefault(); b.click();
  });
  // tasten i hjelpeteksten på knappene (når knappene finnes; noen kommer til senere)
  function merk() { for (const [k, [id]] of Object.entries(TASTER)) { const b = el(id); if (!b || b.dataset.tast) continue; b.dataset.tast = k; const navn = k.toUpperCase(); b.title = (b.title || b.textContent.trim()) + ` (tast ${navn})`; } }
  merk(); window.addEventListener('load', () => setTimeout(merk, 500)); window.addEventListener('riksbrudd-spill', () => setTimeout(merk, 500));
  window.Taster = { TASTER, merk };
})();
