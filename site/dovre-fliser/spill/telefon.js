/* TELEFON (natt 18. nov, pakke «test2»: hele spillet spilt gjennom på en iPhone-stor skjerm, stående 390 × 844 og liggende 844 × 390).
 * Her ligger bare rettinger for små berøringsskjermer – ingen nye funksjoner. Alt gjelder bare når body har klassen «kort»
 * (spill/kompakt.js: under 700 px bred eller under 560 px høy). Tallene (40 px, 38 px, sju fliser …) er Claudes forslag.
 *
 * Det som var galt, og som rettes her:
 *  1. Knappene øverst (3D, ☰, pause, fart, ⏭, ?) var 30 × 31 px – for små for en tommel. Nå 40 px høye stående, 36 px liggende.
 *  2. Raden nederst (#mkom) fikk ni fliser i natt (Region, Verden, Sjø og Velg lag kom til): 33 px brede, og «Tropper» gikk ut over
 *     flisa. Med mer enn seks fliser på en smal skjerm går raden nå over hele bredden, og zoomknappene står over den.
 *  3. Raden nederst lå oppå (eller skinte gjennom) de nye panelene Region, Verden og Sjø, og vistes mens du valgte leirplass.
 *  4. Nye paneler som står helt nederst, tok ikke hensyn til hjemstreken på iPhone (env(safe-area-inset-bottom)) eller hakket
 *     på siden når telefonen ligger. De får en gjennomsiktig kant nederst og luft på sidene.
 *  5. Mange knapper i panelene var 28–36 px høye. Nå minst 40 px, og lukkekryssene minst 40 × 40.
 *  6. Startskjermen, hjelpen og kortene midt på skjermen lå under klokka/hakket øverst.
 *  7. Når du går, sto zoomknappene (som ikke gjør noe da) tett i Hopp-knappen.
 *  8. Opplæringslinja nederst dekket det siste i Leir-menyen.
 * 10. Krigskartet var gjennomsiktig (panelet bak skinte gjennom), Tiltak-panelet gikk ut over venstre kant, og linja under
 *     hvert navn i Folk brakk midt i.
 * 11. Liggende telefon mens du går: helse- og våpenruta lå oppå Skyt, Huk og Hopp, og våpenbyttet oppå minikartet.
 *     Rutene står nå nederst i midten, og våpenbyttet til venstre for Skyt.
 *  9. Fliser i raden nederst som ikke finnes ennå (hidden), vistes likevel (display:flex slo ut hidden).
 */
(() => {
  if (typeof document === 'undefined') return;
  const T = 'env(safe-area-inset-top,0px)', B = 'env(safe-area-inset-bottom,0px)', L = 'env(safe-area-inset-left,0px)', Rt = 'env(safe-area-inset-right,0px)';
  const css = document.createElement('style'); css.id = 'telefoncss';
  css.textContent = `
body.kort.smal .knapper button{ height:40px; min-width:38px; }
body.kort:not(.smal) .knapper button{ height:36px; min-width:36px; }
body.kort.mkomfull #mkom{ right:calc(8px + ${Rt}); gap:3px; }
body.kort.mkomfull #mkom button{ font-size:10.5px; letter-spacing:0; }
body.kort.mkom.mkomfull .ctl{ bottom:calc(64px + ${B}); }
body.kort.tlfdekk #mkom.på{ display:none; }
#mkom button[hidden]{ display:none; }
body.kort.gaar .ctl{ display:none; }
body.kort.gaar #gangeknapper{ right:calc(10px + ${Rt}); }
body.kort button:not(.knapper *):not(#lagmeny *):not(#minikart *):not(#mkom *):not(.ctl *):not([class*="farge"]):not(.prikk){ min-height:40px; }
body.kort button.lukk, body.kort button[aria-label^="Lukk"]{ min-width:40px; }
body.kort #oppstart, body.kort #hjelp, body.kort #formkort, body.kort #krigkort, body.kort #ytelse{ padding-top:calc(12px + ${T}); padding-bottom:calc(12px + ${B}); padding-left:calc(10px + ${L}); padding-right:calc(10px + ${Rt}); box-sizing:border-box; }
body.kort #oppstart .ark{ max-height:100%; box-sizing:border-box; } body.kort #hjelp .ark{ max-height:100%; box-sizing:border-box; }
body.kort.tlfopp #leirmeny, body.kort.tlfopp #folkmeny{ padding-bottom:46px; }
body.kort #verdenpanel{ background:#181613; }
body.kort #krig{ background:#1a150d; }
body.kort #evpanel{ background:#1a150d; }
body.kort:not(.smal) #nhud .helse{ right:auto; left:50%; transform:translateX(-100%); margin-left:-4px; top:auto; bottom:calc(22px + ${B}); }
body.kort:not(.smal) #nhud .vapen{ right:auto; left:50%; margin-left:4px; top:auto; bottom:calc(22px + ${B}); }
body.kort:not(.smal) #byttvapen{ right:calc(160px + ${Rt}); bottom:calc(144px + ${B}); }
body.kort #krigpanel{ left:calc(8px + ${L}); right:calc(8px + ${Rt}); width:auto; box-sizing:border-box; }
body.kort #folkmeny .person small{ display:block; margin-top:2px; }
body.kort #folkmeny select, body.kort #samfunnmeny select, body.kort #stridpanel select, body.kort #tropppanel select{ min-height:40px; }
body.kort #flytkort{ max-width:calc(100vw - 24px); }
`;
  document.head.appendChild(css);

  // paneler som aldri skal regnes som «dekker raden nederst»
  const IKKE = new Set(['mkom', 'kommando', 'opplaering', 'logg', 'nhud', 'kontrollrom', 'oppstart', 'feil', 'kilde', 'skala', 'nordpil', 'minikart', 'kompass']);
  const merket = new WeakSet();
  function pass() {
    const b = document.body; if (!b.classList.contains('kort')) { for (const k of ['mkomfull', 'tlfdekk', 'tlfopp']) if (b.classList.contains(k)) b.classList.remove(k); return; }
    const H = window.innerHeight, W = window.innerWidth, m = document.getElementById('mkom');
    // 2: mange fliser på smal skjerm -> hele bredden
    const ant = m ? [...m.children].filter(k => !k.hidden).length : 0, full = b.classList.contains('smal') && ant > 6;
    if (b.classList.contains('mkomfull') !== full) b.classList.toggle('mkomfull', full);
    // 3 og 4: åpne paneler som når ned til raden nederst
    let dekk = false; const lv = document.getElementById('leirvalg'); if (lv && lv.classList.contains('på')) dekk = true;
    for (const e of b.children) { if (!e.classList.contains('på') || IKKE.has(e.id) || e.tagName !== 'DIV') continue; const r = e.getBoundingClientRect(); if (r.width < 150 || r.height < 60) continue;
      if (r.bottom > H - 58 && r.top > 0) dekk = true;
      // 5: lukkekrysset skal være lett å treffe
      for (const k of e.querySelectorAll('button')) if (k.textContent === '×' && !k.style.minWidth) k.style.minWidth = '40px';
      // 4: står panelet helt nederst, får det plass til hjemstreken; går det fra kant til kant, også til hakket på siden
      if (r.bottom >= H - 1 && r.top > 0 && !merket.has(e)) { merket.add(e); const cs = getComputedStyle(e);
        if (parseFloat(cs.borderBottomWidth) < 2) e.style.borderBottom = `${B} solid transparent`;
        if (r.left <= 1 && r.right >= W - 1) { e.style.paddingLeft = `max(${cs.paddingLeft}, calc(4px + ${L}))`; e.style.paddingRight = `max(${cs.paddingRight}, calc(4px + ${Rt}))`; } } }
    if (b.classList.contains('tlfdekk') !== dekk) b.classList.toggle('tlfdekk', dekk);
    // 8: opplæringslinja ligger nederst mens en meny er åpen
    const o = document.getElementById('opplaering'), opp = !!o && o.classList.contains('liten') && o.getClientRects().length > 0;
    if (b.classList.contains('tlfopp') !== opp) b.classList.toggle('tlfopp', opp);
  }
  setInterval(pass, 350); window.addEventListener('resize', pass); pass();
  window.Telefon = { pass };
})();
