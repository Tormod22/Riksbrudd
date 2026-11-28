'use strict';
/* Riksbrudd – STORE KJØP MÅ BEKREFTES (ut8-kr-krig, 28. nov).
 * Ingrid (kritikken 28. nov): «Tilby våpenhvile (2,7 mill. kr)» ble trukket på første trykk, slik «Gjør avtale (8 mill. kr)» ble forrige
 * gang – mens en brakke til 5 mill. kr krever «Ja, bestill». Felles regel nå: et kjøp over REGLER.grense (1 mill. kr) må bekreftes.
 * Det gjelder alle knapper som kjøper noe med prisen i teksten («Tilby våpenhvile (2,7 mill. kr)», «Foreslå allianse (bidrag …)»,
 * «Gjør avtale (…)», «Kjøp (…)», «Ta i bruk (…)», valgene i morgenmøtet «Kjøp leiesoldater (4 mann, 2,5 mill. kr)» …): trykket fanges
 * før knappens egen handling, og en boks spør «Tilby våpenhvile for 2,7 mill. kr?» med «Ja, betal» / «Nei, tilbake». «Ja» trykker
 * knappen på nytt (eller den samme knappen når panelet er tegnet på nytt i mellomtiden). Byggene har sin egen bekreftelse
 * (spill/leir-visning.js, «Ja, bestill» – nå også fra 1 mill. kr), og avtalen med bygdevernet i Krig har sin (StrategiSpill.avtale);
 * de knappene hoppes over her, så ingenting spør to ganger. Salg, riving og avbestilling er ikke kjøp.
 * Reglene (pris i en tekst, er det et kjøp) er uten DOM og testes i pipeline/fliser/test_storkjop.js. I testene (navigator.webdriver)
 * spør ingenting før StortKjøp.test = true (vakta ut8-kr-krig). window.StortKjøp.
 */
(function (rot) {
  // grensen: «alle kjøp over 1 mill. kr skal bekreftes» (kritikken og oppdraget, ikke Claudes tall)
  const REGLER = { grense: 1e6 };
  const MRD = /^mrd/i, MILL = /^mill|^millioner/i;
  // den største prisen i en tekst, i kroner (0 når det ikke står noen). «2,7 mill. kr», «1 500 000 kr», «8 mill. kr», «1,2 mrd. kr».
  // Priser per døgn («21 000 kr/døgn») teller ikke – det er lønn eller leie, ikke et kjøp nå.
  function pris(tekst) { const t = String(tekst || '').replace(/[   ]/g, ' '); let maks = 0;
    const re = /(\d{1,3}(?:[ .]\d{3})+|\d+)(?:,(\d+))?\s*(mrd\.?|mill\.?|millioner)?\s*kr\b(\s*\/\s*døgn|\s*per døgn)?/gi; let m;
    while ((m = re.exec(t))) { if (m[4]) continue; let v = +(m[1].replace(/[ .]/g, '') + (m[2] ? '.' + m[2] : '')); if (!Number.isFinite(v)) continue;
      if (m[3] && MRD.test(m[3])) v *= 1e9; else if (m[3] && MILL.test(m[3])) v *= 1e6; if (v > maks) maks = v; }
    return maks; }
  // ikke kjøp: bekreftelsene selv, salg, riving, avbestilling, penger tilbake, lønnsbud, «Vis»/«Avbryt»
  // (og det som gir penger inn: oppdrag med lønn, aksjer som selges – emisjon og notering –, varer som legges av til en kjøper)
  const IKKE = /^\s*(ja\b|nei\b|ok\b|avbryt|lukk|tilbake|vis\b|selg|riv\b|avbestill|by over|bryt|si opp|avslå|ingen endring|ta et\b|ta oppdrag|legg av|emisjon|noter\b)/i;
  // er dette et kjøp som må bekreftes? { kr, tekst } eller null
  function måBekreftes(tekst, R = REGLER) { const t = String(tekst || '').replace(/\s+/g, ' ').trim(); if (!t || IKKE.test(t) || /tilbake\)|\(\+/.test(t)) return null;
    const kr = pris(t); return kr > R.grense ? { kr, tekst: t } : null; }
  // «Tilby våpenhvile (2,7 mill. kr)» -> «Tilby våpenhvile» (spørsmålet i boksen)
  const hva = t => String(t || '').replace(/\s+/g, ' ').replace(/\s*[(·]\s*[^()]*\bkr\b[^()]*\)?/g, '').replace(/\s*\(\s*\)/g, '').trim();
  const api = { REGLER, pris, måBekreftes, hva, test: false };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.StortKjøp = api;
  if (typeof document === 'undefined') return;

  const auto = () => !navigator.webdriver || api.test === true;
  const kroner = v => (rot.Oppstart && Oppstart.kroner ? Oppstart.kroner(v) : Math.round(v).toLocaleString('nb-NO') + ' kr');
  // knapper med egen bekreftelse (byggene, avtalen med bygdevernet i Krig) og knapper i boksene selv
  const EGEN = '#byggvalg, #byggbanner, #avtalekort, #stortkjop, [data-advarsel="avtale"], [data-advarsel="avtale-rute"], [data-stortkjop="nei"]';
  const css = document.createElement('style');
  css.textContent = `#stortkjop{ box-sizing:border-box; position:fixed; left:50%; top:calc(var(--topp,58px) + 70px); transform:translateX(-50%); z-index:60; width:min(420px,calc(100vw - 32px)); background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); padding:12px 14px; border-radius:6px; box-shadow:0 10px 34px rgba(0,0,0,.6); font-size:14.5px; line-height:1.4; }
#stortkjop b{ display:block; font-family:'Cormorant Garamond', serif; font-size:19px; margin-bottom:4px; } #stortkjop small{ display:block; color:var(--ink-dim,#a99); font-size:12.5px; margin-top:5px; }
#stortkjop .kn{ display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; } #stortkjop button{ min-height:40px; padding:0 14px; border-radius:5px; border:1px solid #454b52; background:#1d2125; color:#e9e4d6; cursor:pointer; font:inherit; }
#stortkjop button.hoved{ background:#3b3220; border-color:#d9a441; color:#f2d68a; } #stortkjop button[disabled]{ opacity:.5; cursor:not-allowed; }`;
  document.head.appendChild(css);
  let boks = null, slipp = null, sist = null;
  const lukk = () => { if (boks) { boks.remove(); boks = null; } sist = null; };
  // knappen å trykke etter «Ja»: den samme, eller (panelet er tegnet på nytt) en synlig knapp med samme tekst i samme panel
  function finnIgjen(q) { if (q.b.isConnected) return q.b; const rot0 = (q.panel && document.getElementById(q.panel)) || document;
    return [...rot0.querySelectorAll('button')].find(b => b.textContent.replace(/\s+/g, ' ').trim() === q.tekst && b.getClientRects().length > 0 && !b.disabled) || null; }
  function spør(b, m) {
    lukk(); const panel = b.closest('[id]'), q = { b, tekst: m.tekst, panel: panel ? panel.id : null }; sist = q;
    const penger = rot.OppstartSpill && OppstartSpill.tilstand() ? OppstartSpill.tilstand().penger : Infinity;
    boks = document.createElement('div'); boks.id = 'stortkjop'; boks.setAttribute('role', 'alertdialog'); boks.setAttribute('aria-label', 'Bekreft kjøpet');
    const t = document.createElement('b'); t.textContent = `${hva(m.tekst) || 'Kjøpe'} for ${kroner(m.kr)}?`;
    const s = document.createElement('small'); s.textContent = 'Store kjøp må bekreftes: pengene trekkes først når du trykker «Ja».' + (penger < m.kr ? ` Dere har bare ${kroner(penger)}.` : '');
    const kn = document.createElement('div'); kn.className = 'kn';
    const ja = document.createElement('button'); ja.id = 'stortkjop-ja'; ja.className = 'hoved'; ja.textContent = `Ja, betal ${kroner(m.kr)}`;
    ja.onclick = () => { const q2 = sist; lukk(); const b2 = q2 && finnIgjen(q2); if (!b2) { if (typeof logg === 'function') logg('Knappen for kjøpet finnes ikke lenger – prøv igjen.'); return; } slipp = b2; try { b2.click(); } finally { slipp = null; } };
    const nei = document.createElement('button'); nei.id = 'stortkjop-nei'; nei.textContent = 'Nei, tilbake'; nei.onclick = lukk;
    kn.append(ja, nei); boks.append(t, s, kn); document.body.appendChild(boks); }
  // fanges før knappens egen handling (fangstfasen på vinduet)
  rot.addEventListener('click', e => { if (!auto()) return; const b = e.target && e.target.closest ? e.target.closest('button') : null; if (!b || b.disabled) return;
    if (b === slipp) return; if (b.closest(EGEN)) return;
    const m = måBekreftes(b.textContent); if (!m) return;
    e.preventDefault(); e.stopImmediatePropagation(); spør(b, m); }, true);
  // Esc lukker boksen
  rot.addEventListener('keydown', e => { if (boks && e.key === 'Escape') { e.preventDefault(); lukk(); } }, true);
  Object.assign(api, { lukk, åpen: () => !!boks, spør: (b) => { const m = måBekreftes(b.textContent); if (m) spør(b, m); return !!m; } });
})(typeof globalThis !== 'undefined' ? globalThis : this);
