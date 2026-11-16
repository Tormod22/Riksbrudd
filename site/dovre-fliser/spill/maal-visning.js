'use strict';
// Mål i spillet (reglene i spill/maal.js): fanen «Mål» i Leir-menyen med alle kapitlene, «Neste mål» øverst i menyen, og en
// melding i loggen når et mål er nådd. Øyeblikksbildet av spillet leses hvert annet sekund. Det som er nådd, huskes per leir
// (localStorage «riksbrudd-maal»). Lastes etter leir-visning.js, folk-visning.js og ressurser-visning.js.
(function () {
  const NØKKEL = 'riksbrudd-maal'; let ferdige = new Set(), leirId = '', klar = false;
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  const les = () => { try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); if (d && d.leir === leirId) ferdige = new Set(d.ferdige); else ferdige = new Set(); } catch (e) { ferdige = new Set(); } };
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, ferdige: [...ferdige] })); } catch (e) { /* fullt eller sperret */ } };
  function bilde() {
    const L = window.LeirSpill && LeirSpill.tilstand(); if (!L) return null;
    const bygg = {}; for (const b of L.bygg || []) if (Leir.ferdig(b)) bygg[b.type] = (bygg[b.type] || 0) + 1;
    const siste = LeirSpill.siste ? LeirSpill.siste() : null, R = window.RessursSpill && RessursSpill.tilstand(), R3_ = r3();
    let tettsteder = 0; if (window.TETTSTEDER) for (const t of TETTSTEDER.values()) if (t && t.eier === 'blå') tettsteder++;
    const går = !!(R3_ && R3_.fot && typeof på3d !== 'undefined' && på3d);
    return { bygg, diesel: L.drivstoff || 0, strøm: !!(siste && siste.prod > 0), folk: L.folk && L.folk.personer ? L.folk.personer.length : 0, tre: (L.lager && L.lager.tre) || 0,
      hogd: R && R.hogd ? R.hogd.filter(h => !(h.andel < 1)).length : 0, revet: R && R.revet ? R.revet.length : 0, tettsteder, går,
      inne: går && !!(window.Interior3d && Interior3d.inne(R3_.bane.x, R3_.bane.y)), lett: window.LeteSpill ? LeteSpill.antall() : 0 };
  }
  function sjekk(stille) {
    const T = bilde(); if (!T) return [];
    const nye = Maal.vurder(T, ferdige); if (!nye.length) return nye;
    lagre();
    // én melding, også når flere mål nås samtidig (ellers skyver de alt annet ut av loggen)
    if (!stille) { const s = Maal.stilling(ferdige), navn = nye.map(id => Maal.finn(id).tekst.toLowerCase());
      logg(`Mål nådd: ${navn.length > 1 ? navn.slice(0, -1).join(', ') + ' og ' + navn[navn.length - 1] : navn[0]}.` + (s.neste ? ` Neste: ${s.neste.tekst.toLowerCase()}.` : ' Alle målene er nådd.')); }
    return nye;
  }
  const kort = () => { const s = Maal.stilling(ferdige); return s.kapittel < 0 ? '✓' : `${s.totalt}/${s.alle}`; };
  // Leir-menyen: «Neste mål» øverst (står alltid), og fanen «Mål» med kapitlene
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el, knapp }) => {
    if (!klar) return; const s = Maal.stilling(ferdige);
    const neste = el('div', { klasse: 'nestemaal fast', title: s.neste ? s.neste.hjelp : '' }, el('small', {}, s.neste ? `Neste mål (${s.navn.toLowerCase()}, ${s.gjort} av ${s.av}): ` : 'Mål: '), el('b', {}, s.neste ? s.neste.tekst : 'alle målene er nådd'));
    neste.onclick = () => { if (window.LeirSpill && LeirSpill.fane) LeirSpill.fane('mål'); };
    hode.appendChild(neste);
    hode.appendChild(el('h3', {}, 'Mål'));
    Maal.KAPITLER.forEach((k, i) => { const gjort = k.mål.filter(m => ferdige.has(m.id)).length;
      const d = el('div', { klasse: 'maalkap' + (i === s.kapittel ? ' nå' : '') }, el('b', {}, `${i + 1}. ${k.navn}`), el('small', {}, ` ${gjort} av ${k.mål.length}`));
      for (const m of k.mål) d.appendChild(el('div', { klasse: 'maal' + (ferdige.has(m.id) ? ' ok' : '') }, el('span', { klasse: 'hake' }, ferdige.has(m.id) ? '✓' : '○'), el('span', {}, m.tekst, ferdige.has(m.id) ? '' : el('small', {}, m.hjelp))));
      hode.appendChild(d); });
  });
  const css = document.createElement('style');
  css.textContent = `#leirmeny .nestemaal{ margin-top:6px; padding:5px 8px; background:#2a2416; border:1px solid #6a5a2e; cursor:pointer; line-height:1.3; }
#leirmeny .nestemaal small{ display:block; font-size:11.5px; letter-spacing:.05em; text-transform:uppercase; color:var(--ink-dim); } #leirmeny .nestemaal b{ font-weight:600; color:#f0e2b0; }
#leirmeny .maalkap{ margin:8px 0 2px; padding:6px 8px; border:1px solid #3a3226; background:#1e1911; opacity:.78; } #leirmeny .maalkap.nå{ opacity:1; border-color:#6a5a2e; }
#leirmeny .maalkap > small{ color:var(--ink-dim); } #leirmeny .maal{ display:flex; gap:8px; padding:4px 0 2px; align-items:baseline; }
#leirmeny .maal .hake{ flex:none; width:16px; text-align:center; color:var(--ink-dim); } #leirmeny .maal.ok{ color:var(--ink-dim); } #leirmeny .maal.ok .hake{ color:#9fc46a; }
#leirmeny .maal small{ display:block; color:var(--ink-dim); font-size:12.5px; line-height:1.3; }`;
  document.head.appendChild(css);
  // i statuslinja øverst: «3/14 mål» – trykk åpner Leir-menyen på fanen Mål
  const st = document.createElement('div'); st.innerHTML = '<b id="sMaal">–</b> <span>mål</span>'; st.hidden = true; st.className = 'viktig'; st.style.cursor = 'pointer'; st.title = 'Mål: trykk for å se neste steg'; st.setAttribute('role', 'button');
  const stats = document.querySelector('.stats'); if (stats) stats.appendChild(st);
  st.addEventListener('click', () => { const m = document.getElementById('leirmeny'), lk = document.getElementById('leirknapp'); if (m && lk && !m.classList.contains('på')) lk.click(); if (window.LeirSpill && LeirSpill.fane) LeirSpill.fane('mål'); });
  const visTeller = () => { const b = document.getElementById('sMaal'); if (!b) return; const t = kort(); if (b.textContent !== t) b.textContent = t; st.hidden = !klar; const s = Maal.stilling(ferdige); st.title = s.neste ? 'Neste mål: ' + s.neste.tekst : 'Alle målene er nådd'; };
  function start() { const S = window.OppstartSpill && OppstartSpill.tilstand(); leirId = S && S.leir ? Math.round(S.leir.x) + ',' + Math.round(S.leir.y) : 'x'; les(); klar = true; sjekk(true); visTeller(); }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  setInterval(() => { if (klar && !document.hidden) { sjekk(false); visTeller(); } }, 2000);
  window.MaalSpill = { sjekk, bilde, kort, ferdige: () => ferdige, stilling: () => Maal.stilling(ferdige), start, nullstill: () => { ferdige = new Set(); lagre(); } };
})();
