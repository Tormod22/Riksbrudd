'use strict';
/* Riksbrudd – LAGEROVERSIKTEN (17. nov, brukeren: «gjør det lettere å ha oversikt over om man har diesel eller ikke, samt andre
 * materialer, samt hvor mye en kan ha»). Før sto dieselen og materialene bare inne i Leir-menyen. Nå:
 *  - STATUSLINJA har diesel, tre, betong og stål som «har / plass» med hvert sitt ikon. Rødt = tomt for noe du trenger (diesel når du
 *    har aggregat), gult = snart tomt (diesel under 6 timer) eller fullt lager. Trykk åpner fanen Lager.
 *  - FANEN LAGER begynner med en oversikt: en stolpe per ting (diesel, tre, betong, stål, mat) med mengde, plass og hva som er galt.
 *  - Flisa «Diesel til leiren» i Leir-menyen blir rød når tanken er tom.
 * Reglene (plass, forbruk) står i leir.js; her leses de bare. window.LagerSpill.
 */
(function () {
  const LB = window.Leir; if (!LB) return;
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const tall = v => (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toLocaleString('nb-NO'), timer = t => (t >= 48 ? `${Math.round(t / 24)} døgn` : t >= 1 ? `${Math.round(t)} t` : `${Math.max(1, Math.round(t * 60))} min`);
  const svg = d => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'>${d}</svg>`)}")`;
  const css = document.createElement('style');
  css.textContent = `[data-ikon="tommer"]{ --ik:${svg("<circle cx='7' cy='12' r='4'/><circle cx='7' cy='12' r='1.2'/><path d='M7 8h11a4 4 0 010 8H7'/>")}; } [data-ikon="betong"]{ --ik:${svg("<path d='M3 8l9-4 9 4v8l-9 4-9-4zM3 8l9 4 9-4M12 12v8'/>")}; } [data-ikon="staal"]{ --ik:${svg("<path d='M5 5h14M5 19h14M12 5v14M9 5v2.5M15 5v2.5M9 16.5V19M15 16.5V19'/>")}; }
.stats > div.lager{ cursor:pointer; } .stats > div.lager.tomt b{ color:#f08a6a; } .stats > div.lager.lite b, .stats > div.lager.fullt b{ color:#e8c46a; } .stats > div.lager.null b{ color:var(--ink-dim,#a99); }
#leirmeny .oversikt .ting{ display:grid; grid-template-columns:74px 1fr auto; align-items:center; gap:8px; padding:4px 0; font-size:14px; } #leirmeny .oversikt .ting .m{ height:10px; background:#2e281e; } #leirmeny .oversikt .ting .m i{ display:block; height:100%; background:#c9b26a; }
#leirmeny .oversikt .ting small{ color:var(--ink-dim,#a99); white-space:nowrap; } #leirmeny .oversikt .ting.tomt b, #leirmeny .oversikt .ting.tomt small{ color:#f08a6a; } #leirmeny .oversikt .ting.tomt .m{ outline:1px solid #f08a6a; } #leirmeny .oversikt .ting.lite .m i, #leirmeny .oversikt .ting.fullt .m i{ background:#e8c46a; }
#leirmeny .oversikt .merk{ grid-column:1 / -1; margin-top:-3px; font-size:12.5px; color:var(--ink-dim,#a99); } #leirmeny .oversikt .ting.tomt .merk{ color:#f08a6a; }
#leirmeny .flis.tom{ border-color:#f08a6a; } #leirmeny .flis.tom b, #leirmeny .flis.tom{ color:#f08a6a; }`;
  document.head.appendChild(css);

  // Stillingen: en linje per ting. { id, navn, enhet, har, plass, andel, tilstand: '' | 'tomt' | 'lite' | 'fullt' | 'null', merk }
  function stilling() { const L = window.LeirSpill && LeirSpill.tilstand(), s = window.LeirSpill && LeirSpill.siste && LeirSpill.siste(); if (!L) return null; const ut = [];
    // (runde 6) prognosen er den samme som i dagsrapporten og varselbrikkene: LeirSpill.diesel() (Leir.dieselRekker)
    const P = window.LeirSpill && LeirSpill.diesel ? LeirSpill.diesel() : null;
    const tank = LB.kapasitet(L), d = L.drivstoff || 0, bruker = (s && s.aggInst > 0) || L.bygg.some(b => b.type === 'aggregat'), kw = s ? s.agg || 0 : 0, rekker = d > 0 ? (P ? P.timer : kw > 0 ? LB.dieselTimer(L, kw) : Infinity) : Infinity;
    ut.push({ id: 'diesel', navn: 'Diesel', ikon: 'tank', enhet: 'l', har: d, plass: tank, tilstand: tank <= 0 ? 'null' : d <= 0 ? (bruker ? 'tomt' : 'null') : rekker < 6 ? 'lite' : d >= tank - .5 ? 'fullt' : '',
      merk: tank <= 0 ? 'Ingen tank: bygg en dieseltank eller et aggregat.' : d <= 0 ? (bruker ? 'Tomt – aggregatene står. Kjøp diesel.' : 'Tomt.') : rekker < Infinity ? `Rekker ca. ${timer(rekker)} med ${P && P.målt ? 'forbruket det siste døgnet' : 'forbruket nå'}.` : d >= tank - .5 ? 'Fulle tanker.' : '' });
    const plass = LB.lagerplass(L);
    // (G4, spill/varelager-visning.js) hvor mye som ligger ute – summen over er den samme som før
    const ute = window.VarelagerSpill && VarelagerSpill.ute ? VarelagerSpill.ute() || {} : {}, uteTekst = (k, M) => (ute[k] > .05 ? ` ${tall(ute[k])} ${M.enhet} ligger ute (regn, røvere).` : '');
    for (const [k, M] of Object.entries(LB.MATERIALER)) { if (M.kjede && LB.visMateriale && !LB.visMateriale(L, k)) continue; const har = (L.lager && L.lager[k]) || 0; ut.push({ id: k, navn: M.navn, ikon: { tre: 'tommer', betong: 'betong', stål: 'staal' }[k] || 'kasse', enhet: M.enhet, har, plass, tilstand: har >= plass - .05 ? 'fullt' : har <= 0 ? 'null' : '', merk: ((har >= plass - .05 ? 'Lageret er fullt – bygg lagertelt eller container for mer plass.' : '') + uteTekst(k, M)).trim() }); }
    const F = window.FolkSpill && FolkSpill.tilstand(); if (F && window.FolkRegler && F.personer && F.personer.length) { let B = null; try { B = FolkRegler.behov(F, L, FolkSpill.valg()); } catch (e) { B = null; }
      if (B) ut.push({ id: 'mat', navn: 'Mat', ikon: 'mat', enhet: 'rasjoner', har: F.mat || 0, plass: 0, døgn: B.dager, tilstand: B.dager < .2 ? 'tomt' : B.dager < 1.5 ? 'lite' : '', merk: B.dager === Infinity ? 'Drivhusene holder folk med mat.' : B.dager < .2 ? 'Tomt – folk sulter. Kjøp mat i Folk.' : `Rekker ca. ${timer(B.dager * 24)}.` }); }
    for (const t of ut) t.andel = t.plass > 0 ? Math.max(0, Math.min(1, t.har / t.plass)) : t.id === 'mat' ? Math.max(0, Math.min(1, (t.døgn === Infinity ? 7 : t.døgn) / 7)) : 0;
    return ut; }

  // ---------- statuslinja ----------
  const ID = { diesel: 'sDiesel', tre: 'sTre', betong: 'sBetong', stål: 'sStaal' }, bokser = {}, stats = document.querySelector('.stats');
  const åpneLager = () => { const m = document.getElementById('leirmeny'), k = document.getElementById('leirknapp'); if (m && k && !m.classList.contains('på')) k.click(); if (window.LeirSpill && LeirSpill.fane) LeirSpill.fane('lager'); };
  if (stats) for (const [k, id] of Object.entries(ID)) { const b = el('div', { klasse: 'lager' + (k === 'diesel' ? ' viktig' : ''), 'data-ikon': { diesel: 'tank', tre: 'tommer', betong: 'betong', stål: 'staal' }[k] }, el('b', { id }, '–'), ' ', el('span', {}, k === 'diesel' ? 'diesel' : k)); b.hidden = true; b.onclick = åpneLager; stats.appendChild(b); bokser[k] = b; }
  function oppdater() { const S = stilling(); for (const b of Object.values(bokser)) b.hidden = !S; if (!S) return;
    for (const t of S) { const b = bokser[t.id]; if (!b) continue; const tekst = t.plass > 0 ? `${tall(t.har)}/${tall(t.plass)}${t.id === 'diesel' ? ' l' : ''}` : t.id === 'diesel' ? 'ingen tank' : tall(t.har), kl = 'lager' + (t.id === 'diesel' ? ' viktig' : '') + (t.tilstand ? ' ' + t.tilstand : '');
      const e = b.firstChild; if (e.textContent !== tekst) e.textContent = tekst; if (b.className !== kl) b.className = kl; const tittel = `${t.navn}: ${tall(t.har)} ${t.enhet}` + (t.plass > 0 ? ` av ${tall(t.plass)} ${t.enhet} plass` : '') + (t.merk ? '. ' + t.merk : '') + ' Trykk for lageret.'; if (b.title !== tittel) b.title = tittel; }
    // flisa «Diesel til leiren» i Leir-menyen
    const m = document.getElementById('leirmeny'); if (m && m.classList.contains('på')) { const d = S[0]; for (const f of m.querySelectorAll('.flis')) if (/diesel/i.test(f.textContent)) f.classList.toggle('tom', d.tilstand === 'tomt'); } }
  setInterval(oppdater, 1000); window.addEventListener('riksbrudd-spill', () => setTimeout(oppdater, 400));

  // ---------- fanen Lager: oversikten ----------
  // (først blant tilleggene, så oversikten står rett under materiallista og ikke nederst i fanen)
  (window.LEIR_MENY = window.LEIR_MENY || []).unshift((hode, { el: lag }) => { const S = stilling(); if (!S) return; const boks = lag('div', { klasse: 'oversikt' });
    hode.append(lag('h3', { 'data-fane': 'lager' }, 'Oversikt: hva du har og hvor mye du har plass til'));
    for (const t of S) { const r = lag('div', { klasse: 'ting' + (t.tilstand ? ' ' + t.tilstand : ''), 'data-ting': t.id }, lag('b', { 'data-ikon': t.ikon }, t.navn), lag('div', { klasse: 'm' }, lag('i', { style: `width:${Math.round(t.andel * 100)}%` })),
        lag('small', {}, t.plass > 0 ? `${tall(t.har)} av ${tall(t.plass)} ${t.enhet}` : t.id === 'diesel' ? 'ingen tank' : `${tall(t.har)} ${t.enhet}`));
      if (t.merk) r.append(lag('div', { klasse: 'merk' }, t.merk)); boks.append(r); }
    hode.append(boks); });
  window.LagerSpill = { stilling, oppdater };
})();
