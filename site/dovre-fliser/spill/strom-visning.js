/* Riksbrudd – STRØMOVERSIKTEN (16. nov, brukeren: «bedre system for strøm»). Reglene står i leir.js (batteri, brytere, nett, dieselTimer).
 * Her: en del i Leir-menyen (fanen Bygg) med hvor strømmen kommer fra, batteriet, hvor lenge dieselen rekker, og en bryter per bygg som
 * bruker strøm – i den rekkefølgen de får strøm (Leir.PRIORITET), så du selv velger hva som skal gå når det er for lite.
 */
(function () {
  'use strict';
  const LB = window.Leir; if (!LB) return;
  const tall = v => String(Math.round(v * 10) / 10).replace('.', ','), timer = t => (t === Infinity ? '' : t >= 48 ? `${Math.round(t / 24)} døgn` : t >= 1 ? `${Math.round(t)} t` : `${Math.max(1, Math.round(t * 60))} min`);
  const css = document.createElement('style');
  css.textContent = `#leirmeny .strom .linje{ display:flex; height:12px; background:#2e281e; margin:4px 0 2px; } #leirmeny .strom .linje i{ display:block; height:100%; } #leirmeny .strom .sol{ background:#d9b84a; } #leirmeny .strom .nett{ background:#8fa8c8; } #leirmeny .strom .bat{ background:#8fc46a; } #leirmeny .strom .agg{ background:#b86a4a; }
#leirmeny .strom .tegn{ display:flex; flex-wrap:wrap; gap:2px 12px; font-size:12.5px; color:var(--ink-dim,#a99); } #leirmeny .strom .tegn b{ display:inline-block; width:9px; height:9px; margin-right:4px; }
#leirmeny .strom .bruker{ display:flex; justify-content:space-between; align-items:center; gap:8px; padding:3px 0; border-bottom:1px solid #2e281e; font-size:14px; } #leirmeny .strom .bruker small{ display:block; color:var(--ink-dim,#a99); } #leirmeny .strom .bruker.uten b{ color:#e8a46a; } #leirmeny .strom .bruker.av b{ color:var(--ink-dim,#a99); }
#leirmeny .strom button{ min-width:52px; }`;
  document.head.appendChild(css);
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el, knapp }) => { const L = window.LeirSpill && LeirSpill.tilstand(), s = window.LeirSpill && LeirSpill.siste(); if (!L || !s || s.behov === undefined) return;
    const boks = el('div', { klasse: 'strom' }), sol = s.sol || 0, nett = s.nett || 0, bat = Math.max(0, s.batKW || 0), agg = s.agg || 0, sum = Math.max(s.behov, sol + nett + bat + agg, .001), m = s.mangler ? s.mangler.size - (s.avslått || 0) : 0;
    hode.append(el('h3', { 'data-fane': 'bygg' }, 'Strøm'));
    boks.append(el('div', {}, `Forbruk ${tall(s.behov)} kW` + (m > 0 ? ` – ${m} bygg mangler strøm` : s.behov > 0 ? ' – alt har strøm' : '')));
    const linje = el('div', { klasse: 'linje' }); for (const [k, v] of [['sol', sol], ['nett', nett], ['bat', bat], ['agg', agg]]) if (v > 0) linje.append(el('i', { klasse: k, style: `width:${Math.min(100, v / sum * 100)}%` })); boks.append(linje);
    boks.append(el('div', { klasse: 'tegn' }, el('span', {}, el('b', { klasse: 'sol' }), `sol ${tall(sol)}`), el('span', {}, el('b', { klasse: 'nett' }), `strømnettet ${tall(nett)}`), el('span', {}, el('b', { klasse: 'bat' }), `batteri ${tall(bat)}`), el('span', {}, el('b', { klasse: 'agg' }), `aggregat ${tall(agg)} av ${tall(s.aggMaks || 0)}`)));
    if (s.batKap > 0) boks.append(el('div', {}, `Batteri: ${tall(s.batteri)} av ${tall(s.batKap)} kWt` + (s.batKW < -.05 ? ` (lader ${tall(-s.batKW)} kW)` : s.batKW > .05 ? ` (tappes ${tall(s.batKW)} kW – rekker ${timer(s.batteri / s.batKW)})` : '')), el('div', { klasse: 'linje' }, el('i', { klasse: 'bat', style: `width:${Math.min(100, s.batteri / s.batKap * 100)}%` })));
    else boks.append(el('small', {}, 'Ingen batteribank: overskudd fra sol og nett går tapt. En batteribank lagrer det til natta.'));
    if (agg > 0) boks.append(el('div', {}, `Aggregatene bruker diesel: ${Math.floor(L.drivstoff).toLocaleString('nb-NO')} l rekker ${timer(LB.dieselTimer(L, agg))}.`));
    // brukerne i den rekkefølgen de får strøm, med bryter
    const brukere = L.bygg.filter(b => LB.BYGG[b.type].kw < 0 && LB.virker(b)).sort((a, b) => LB.PRIORITET.indexOf(a.type) - LB.PRIORITET.indexOf(b.type));
    if (brukere.length) boks.append(el('small', {}, 'Byggene får strøm i denne rekkefølgen. Slå av det du kan unnvære når det er for lite:'));
    for (const b of brukere) { const uten = !b.av && s.mangler && s.mangler.has(b.id), rad = el('div', { klasse: 'bruker' + (b.av ? ' av' : uten ? ' uten' : '') }, el('div', {}, el('b', {}, LB.BYGG[b.type].navn), el('small', {}, `${tall(-LB.BYGG[b.type].kw)} kW · ${b.av ? 'slått av' : uten ? 'uten strøm' : 'i drift'}`)),
        knapp(b.av ? 'Slå på' : 'Slå av', () => { LB.bryter(L, b.id); LeirSpill.lagre(); if (LeirSpill.visMeny) LeirSpill.visMeny(); skitten = true; }, { 'data-bryter': String(b.id) })); boks.append(rad); }
    hode.append(boks); });
})();
