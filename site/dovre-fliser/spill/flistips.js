'use strict';
/* Riksbrudd – FORKLARING PÅ FLISENE (18. nov, nattarbeid «ui»). Tallene øverst var uten ord: hva er «0/60», og hvorfor er den rød?
 * Pek på en flis (PC) eller trykk på den (telefon): en liten rute sier hva tallet er, hva fargene betyr og hvordan det står nå.
 * Alt som har data-tips="Tittel|Tekst" får den samme ruta (kommandolinja, «mer»-flisa, byggemenyen).
 * Også her: en liten lapp som flyter opp fra kassa når pengene endrer seg («+ 50 000 kr»).
 * Runde 4: linja «Påvirkes av» (hva som gjør tallet større eller mindre), og langt trykk på telefon (viser ruta uten å trykke flisa).
 * window.FlisTips (vis, skjul, tekst).
 */
(function () {
  const $ = id => document.getElementById(id);
  // [tittel, hva tallet er, hva fargene betyr]
  const FORKLAR = {
    sDag: ['Dag og klokke', 'Dagen i spillet og klokka. På 1× går tiden som i virkeligheten; 10×, 60× og 600× spoler.', ''],
    sVaer: ['Været', 'Været nå, temperaturen, vinden og årstiden. Regn, tåke og mørke gjør at lagene ser kortere. Om vinteren trenger folk mer mat og varme.', ''],
    sPenger: ['Kassa', 'Pengene dere har. Bygg, materialer, diesel, mat og nye folk betales herfra.', 'Blir kassa tom, stopper innkjøpene – ikke det som alt er betalt.'],
    sDiesel: ['Diesel til leiren', 'Liter diesel dere har, og hvor mye tankene rommer. Aggregatene bruker diesel for å lage strøm.', 'Rød: tomt, og aggregatene står. Gul: under seks timer igjen – eller fulle tanker.'],
    sTre: ['Tre', 'Kubikkmeter tre på lager, og hvor mye lageret rommer. Brukes til å bygge og til ved om vinteren.', 'Gul: lageret er fullt. Bygg lagertelt eller container for mer plass.'],
    sBetong: ['Betong', 'Betong på lager, og hvor mye lageret rommer. Brukes i større bygg.', 'Gul: lageret er fullt.'],
    sStaal: ['Stål', 'Stål på lager, og hvor mye lageret rommer. Brukes i master, verksted og forsvarsverk.', 'Gul: lageret er fullt.'],
    sStrom: ['Strøm', 'Hvor mange kilowatt byggene bruker, og hvor mye aggregat, solceller og batteri kan gi.', 'Rød: byggene får ikke nok strøm – noen av dem står. Bygg mer strøm eller slå av bygg.'],
    sOlje: ['Olje til kjøretøyene', 'Tonn olje på basen. Kolonner og stridsvogner fyller her. Dette er ikke leirens diesel.', ''],
    sFolk: ['Folk', 'Hvor mange som bor i leiren. De bygger, hogger, står vakt og lager mat.', 'Varseltrekant: noe mangler – mat, senger, varme eller moral. Åpne Folk for å se hva.'],
    sMaal: ['Mål', 'Hvor mange av målene dere har nådd. Målene viser neste fornuftige steg.', ''],
    sKrig: ['Kontroll over området', 'Hvor stor del av folket i området som bor i tettsteder dere holder. Dere vinner på 60 %.', 'Varseltrekant: en motstander nærmer seg seier.'],
    sHvor: ['Hvor du er', 'Karakteren din er ute, i kontrollrommet eller ute med nettbrett. Ute ser du bare det du selv ser; i kontrollrommet ser du alt lagene melder.', ''],
    sH: ['Høyde', 'Meter over havet der pekeren står.', ''], sKB: ['Lastet kart', 'Hvor mye kartdata som er hentet.', ''], sFps: ['Bilder per sekund', 'Hvor jevnt spillet går.', ''],
  };
  // RUNDE 4: HVA SOM PÅVIRKER TALLET (fjerde linje i ruta). Teksten følger reglene slik de er i leir.js, folk.js, strategi.js m.fl.
  const PÅVIRKES = {
    sDag: 'Farten (pause, 1×, 10×, 60×, 600×) og ⏭, som spoler til noe skjer.',
    sVaer: 'Årstiden og været skifter av seg selv; ☰ → Vær og årstid kan låse dem.',
    sPenger: 'Opp: salg av materialer, oppdrag, røverbytte og funn i hus. Ned: bygg, materialer, diesel, mat, våpen, rekrutter og reparasjoner.',
    sDiesel: 'Opp: kjøp (fanen Lager) og funn i hus. Ned: aggregatene når strømmen ikke rekker. Plass: dieseltanker.',
    sTre: 'Opp: kjøp, hogst og riving (folk på hogst/riving/frakt). Ned: bygging og ved om vinteren. Plass: lagertelt og containere.',
    sBetong: 'Opp: kjøp og riving av forlatte hus. Ned: bygging. Plass: lagertelt og containere.',
    sStaal: 'Opp: kjøp, riving og verkstedet (med folk). Ned: bygging. Plass: lagertelt og containere.',
    sStrom: 'Kilder: aggregat (trenger diesel), solceller, strømnettet og batteri. Forbruk: alle bygg som står på – slå av bygg i fanen Bygg.',
    sOlje: 'Opp: oljeterminaler og transport til basen. Ned: kolonner og kjøretøy som kjører.',
    sFolk: 'Opp: rekruttering, flyktninger og overlevende i hus. Ned: sult, kulde, sykdom, kamp og lav moral (de går). Senger, mat og varme holder dem.',
    sMaal: 'Målene nås av det du gjør: bygg, lag, tropper, leting og krigen. Trykk for å se målene.',
    sKrig: 'Tettsteder dere tar og holder med lag (garnison). Motstandernes tettsteder trekker ned.',
    sHvor: 'Gå inn i kontrollrommet, ta nettbrettet eller gå ut i 3D.',
    sH: '', sKB: '', sFps: 'Grafikknivået i ☰ og hvor mye som er i bildet.',
  };
  const css = document.createElement('style');
  css.textContent = `#tips{ position:fixed; z-index:30; max-width:310px; padding:8px 11px 9px; pointer-events:none; opacity:0; transform:translateY(-4px); transition:opacity .12s, transform .12s; background:linear-gradient(180deg,#2a2114,#17120a); border:1px solid #8a7440; box-shadow:0 0 0 1px #0d0a06, 0 10px 26px rgba(0,0,0,.65); border-radius:4px; color:var(--ink,#e7dcc3); font-size:13.5px; line-height:1.35; }
#tips.på{ opacity:1; transform:none; } #tips b{ display:block; font-family:"IM Fell English",serif; font-weight:400; font-size:16px; letter-spacing:.03em; color:#f0dc9a; margin-bottom:2px; }
#tips i.pv{ color:#b8c79a; } body.kort .stats > div{ -webkit-touch-callout:none; -webkit-user-select:none; user-select:none; }
#tips i{ display:block; font-style:normal; color:#c9b88a; margin-top:5px; padding-top:5px; border-top:1px solid #4a3d24; } #tips i.naa{ color:#e7dcc3; } #tips i.rod{ color:#f08a6a; } #tips i.gul{ color:#e8c75a; }
.pengelapp{ position:fixed; z-index:29; pointer-events:none; font-family:"IM Fell English",serif; font-size:16px; padding:1px 8px; border-radius:3px; background:rgba(18,14,8,.85); border:1px solid #5a4a2a; animation:pengeopp 1.5s ease-out forwards; }
.pengelapp.pluss{ color:#a8d47a; } .pengelapp.minus{ color:#f08a6a; } @keyframes pengeopp{ from{ opacity:0; transform:translateY(0); } 15%{ opacity:1; } to{ opacity:0; transform:translateY(26px); } }
.stats > div b.blink{ animation:tallblink .5s ease-out; } @keyframes tallblink{ from{ filter:brightness(1.9); transform:scale(1.12); } to{ filter:none; transform:none; } }
@media (prefers-reduced-motion:reduce){ #tips{ transition:none; } .pengelapp, .stats > div b.blink{ animation:none; } .pengelapp{ display:none; } }`;
  document.head.appendChild(css);
  const boks = document.createElement('div'); boks.id = 'tips'; boks.setAttribute('role', 'tooltip'); document.body.appendChild(boks);
  let viser = null, lukk = 0;
  // den vanlige tittelen (title) flyttes til data-tittel, så nettleserens egen grå rute ikke kommer oppå vår
  const taTittel = d => { if (d.title) { d.dataset.tittel = d.title; d.removeAttribute('title'); } return d.dataset.tittel || ''; };
  function tekst(d) {
    if (d.dataset.tips) { const [t, ...r] = d.dataset.tips.split('|'); return { tittel: t, hva: r.join('|'), farge: '', nå: '', kl: '' }; }
    const id = d.dataset.s || ((d.querySelector('b[id]') || {}).id), F = FORKLAR[id]; if (!F) return null;
    let nå = taTittel(d).replace(/\s*Trykk for .*$/, '').trim(), kl = '';
    const b = d.querySelector('b'), c = b ? getComputedStyle(b).color.match(/\d+/g) : null;
    if (/\btomt\b/.test(d.className) || (c && +c[0] > 180 && +c[1] < 150 && +c[2] < 150)) kl = 'rod'; else if (/\b(lite|fullt)\b/.test(d.className) || /⚠/.test(d.textContent)) kl = 'gul';
    if (id === 'sVaer') { const v = $('sVind'), a = $('sAar'); nå = [b && b.textContent, v && v.textContent && 'vind ' + v.textContent, a && a.textContent].filter(Boolean).join(' · '); }
    if (nå === F[0] || /^Mål: trykk/.test(nå) || !/\s/.test(nå)) nå = '';
    return { tittel: F[0], hva: F[1], farge: F[2], nå, kl, påvirkes: PÅVIRKES[id] || '' };
  }
  function vis(d) { const T = tekst(d); if (!T) return false; boks.textContent = '';
    const el = (n, t, k) => { const e = document.createElement(n); e.textContent = t; if (k) e.className = k; boks.appendChild(e); };
    el('b', T.tittel); boks.appendChild(document.createTextNode(T.hva)); if (T.nå) el('i', 'Nå: ' + T.nå, 'naa ' + T.kl); if (T.farge) el('i', T.farge); if (T.påvirkes) el('i', 'Påvirkes av: ' + T.påvirkes, 'pv');
    const r = d.getBoundingClientRect(), w = Math.min(310, window.innerWidth - 12); boks.style.maxWidth = w + 'px'; boks.style.left = '0px'; boks.style.top = '0px'; const h = boks.offsetHeight, bw = boks.offsetWidth;
    boks.style.left = Math.max(6, Math.min(window.innerWidth - bw - 6, r.left + r.width / 2 - bw / 2)) + 'px';
    let y = r.bottom + h + 12 < window.innerHeight ? r.bottom + 7 : Math.max(6, r.top - h - 7);
    // (runde 6, kritikeren: tipsene fra bunnmenyen la seg oppå opplæringsboksen og skjulte teksten og «Hopp over») – står ruta i veien,
    // legges tipset over den (eller ved siden av når det ikke er plass over)
    const op = document.getElementById('opplaering'), o = op && op.classList.contains('på') && op.getClientRects().length ? op.getBoundingClientRect() : null, x = parseFloat(boks.style.left);
    if (o && x < o.right && x + bw > o.left && y < o.bottom && y + h > o.top) { if (o.top - h - 8 > 4) y = o.top - h - 8; else { const v = o.left - bw - 8, hø = o.right + 8; boks.style.left = (hø + bw < window.innerWidth - 4 ? hø : Math.max(4, v)) + 'px'; } }
    boks.style.top = y + 'px';
    boks.classList.add('på'); viser = d; return true; }
  function skjul() { boks.classList.remove('på'); viser = null; clearTimeout(lukk); }
  const mål = e => e.target && e.target.closest ? e.target.closest('[data-tips], .stats > div') : null;
  document.addEventListener('pointerover', e => { if (e.pointerType === 'touch') return; const d = mål(e); if (d && d !== viser) vis(d); else if (!d && viser) skjul(); });
  // telefon: ruta kommer ved et TRYKK (ikke når du sveiper raden bortover), og står i noen sekunder
  // RUNDE 4: LANGT TRYKK (0,45 s uten å flytte fingeren) viser ruta uten at flisa gjør det den ellers gjør (åpne Folk, fanen Lager …);
  // et kort trykk gjør begge deler som før. Ruta står så lenge fingeren er nede, og 6 s etter.
  const LANGT = { ms: 450, rom: 10, står: 6000 };
  let finger = false, holdT = 0, holdD = null, holdXY = null, sperrKlikk = 0;
  document.addEventListener('pointerdown', e => { finger = e.pointerType === 'touch'; const d = mål(e); if (!finger || !d) skjul();
    clearTimeout(holdT); holdD = null; if (finger && d) { holdD = d; holdXY = [e.clientX, e.clientY]; holdT = setTimeout(() => { if (holdD === d && vis(d)) { sperrKlikk = performance.now(); clearTimeout(lukk); d.classList.add('holdt'); } }, LANGT.ms); } }, true);
  document.addEventListener('pointermove', e => { if (holdD && holdXY && Math.hypot(e.clientX - holdXY[0], e.clientY - holdXY[1]) > LANGT.rom) { clearTimeout(holdT); holdD = null; } }, true);
  const slipp = () => { clearTimeout(holdT); if (holdD) holdD.classList.remove('holdt'); holdD = null; if (sperrKlikk && viser) { clearTimeout(lukk); lukk = setTimeout(skjul, LANGT.står); } };
  document.addEventListener('pointerup', slipp, true); document.addEventListener('pointercancel', slipp, true);
  // nettleserens egen meny ved langt trykk skal ikke komme over flisa
  document.addEventListener('contextmenu', e => { if (mål(e) && (finger || performance.now() - sperrKlikk < 1500)) e.preventDefault(); }, true);
  document.addEventListener('click', e => { if (sperrKlikk && performance.now() - sperrKlikk < 1500 && mål(e)) { sperrKlikk = 0; e.preventDefault(); e.stopPropagation(); return; } sperrKlikk = 0;
    if (!finger) return; const d = mål(e); if (d && vis(d)) { clearTimeout(lukk); lukk = setTimeout(skjul, 4500); } }, true);
  window.addEventListener('blur', skjul);
  // titlene ryddes jevnlig (andre deler setter dem på nytt hvert sekund), og ruta følger med mens den står oppe
  setInterval(() => { for (const d of document.querySelectorAll('.stats > div[title]')) if (FORKLAR[d.dataset.s || ((d.querySelector('b[id]') || {}).id)]) taTittel(d); if (viser && !viser.isConnected) skjul(); }, 700);

  // ---------- kassa: lapp når pengene endrer seg, og et lite blink i tallet ----------
  let forrige = null, sistLapp = 0;
  const kr = n => { const a = Math.abs(n); return (a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace('.', ',') + ' mill.' : Math.round(a).toLocaleString('nb-NO')) + ' kr'; };
  setInterval(() => { const S = window.OppstartSpill && OppstartSpill.tilstand && OppstartSpill.tilstand(); if (!S || typeof S.penger !== 'number') { forrige = null; return; }
    const p = S.penger, b = $('sPenger'); if (forrige !== null && p !== forrige && b && b.getClientRects().length && Math.abs(p - forrige) >= 100) { const d = p - forrige, nå = performance.now();
      b.classList.remove('blink'); void b.offsetWidth; b.classList.add('blink');
      if (nå - sistLapp > 500) { sistLapp = nå; const r = b.getBoundingClientRect(), l = document.createElement('div'); l.className = 'pengelapp ' + (d > 0 ? 'pluss' : 'minus'); l.textContent = (d > 0 ? '+ ' : '− ') + kr(d); l.style.left = Math.max(4, r.left - 6) + 'px'; l.style.top = r.bottom + 6 + 'px'; document.body.appendChild(l); setTimeout(() => l.remove(), 1600); } }
    forrige = p; }, 500);
  window.FlisTips = { vis, skjul, tekst, FORKLAR, PÅVIRKES, LANGT, viser: () => viser };
})();
