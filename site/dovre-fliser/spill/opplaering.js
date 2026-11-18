'use strict';
/* Riksbrudd – OPPLÆRING I SPILLET (18. nov, nattarbeid «ui»). Den første timen: fem små oppgaver, én om gangen, i en liten rute
 * nederst – og en ring som peker på knappen eller stedet oppgaven gjelder. Ruta kan hoppes over (ett steg) og slås av (alt).
 * Reglene øverst er uten DOM (Opplaering.neste/ferdig/fra/til – test_opplaering.js); visningen nederst (window.OpplaeringSpill).
 * Stegene leser et øyeblikksbilde av spillet, som målene i maal.js: de er ferdige når tingen faktisk er gjort, ikke når du trykker.
 * Lagres per leir («riksbrudd-opplaering»); «slått av» gjelder alle spill («riksbrudd-opplaering-av»).
 * I testene (navigator.webdriver) vises ingenting før OpplaeringSpill.test = true.
 */
(function (rot) {
  // Stegene og rekkefølgen er Claudes forslag (oppdraget ga eksemplene).
  const STEG = [
    { id: 'leir', tittel: 'Åpne Leir', tekst: 'Alt i leiren styres herfra: bygg, lager, plan og mål. Trykk på Leir.', mål: 'leir', ferdig: b => b.leirÅpnet },
    { id: 'brakke', tittel: 'Bygg en brakke', tekst: 'Folkene trenger senger. I fanen Bygg: velg Brakke, trykk på et flatt sted ved leiren, og bekreft.', mål: 'brakke', ferdig: b => b.brakker > 0 },
    { id: 'bygg2', tittel: 'Sett to på bygg', tekst: 'Åpne Folk og bruk + ved Bygg til det står to der. To personer er ett byggelag – uten dem blir ingenting bygget.', mål: 'folk', ferdig: b => b.folkÅpnet && b.påBygg >= 2 },
    { id: 'tropp', tittel: 'Lag en tropp', tekst: 'Åpne Tropper, velg noen av folkene og gi troppen et navn. Tropper kan du sende ut i kartet.', mål: 'tropper', ferdig: b => b.tropper > 0 },
    { id: 'gaa', tittel: 'Gå i 3D', tekst: 'Trykk 3D for å se landet ovenfra, og så Gå for å gå rundt i leiren selv.', mål: '3d', ferdig: b => b.går },
  ];
  const tom = () => ({ gjort: [], hoppet: [], slutt: false });
  const fra = t => { let o = null; try { o = typeof t === 'string' ? JSON.parse(t) : t; } catch (e) { o = null; } const T = tom(); if (!o || typeof o !== 'object') return T;
    const ok = a => (Array.isArray(a) ? a.filter(x => STEG.some(s => s.id === x)) : []); T.gjort = ok(o.gjort); T.hoppet = ok(o.hoppet); T.slutt = !!o.slutt; T.leir = typeof o.leir === 'string' ? o.leir : undefined; return T; };
  const til = T => JSON.stringify({ leir: T.leir, gjort: T.gjort, hoppet: T.hoppet, slutt: T.slutt });
  const tatt = (T, id) => T.gjort.includes(id) || T.hoppet.includes(id);
  // første steg som verken er gjort eller hoppet over
  const neste = T => STEG.find(s => !tatt(T, s.id)) || null;
  // går gjennom bildet: steget som står for tur (og de etter, så lenge de også er gjort) merkes som gjort. Svarer id-ene som ble ferdige.
  function oppdater(T, bilde) { const nye = []; for (;;) { const s = neste(T); if (!s) break; let f = false; try { f = !!s.ferdig(bilde); } catch (e) { f = false; } if (!f) break; T.gjort.push(s.id); nye.push(s.id); } return nye; }
  const hopp = T => { const s = neste(T); if (s) T.hoppet.push(s.id); return s ? s.id : null; };
  const ferdig = T => !neste(T);
  const nr = T => { const s = neste(T); return s ? STEG.indexOf(s) + 1 : STEG.length; };
  const Opplaering = { STEG, tom, fra, til, neste, oppdater, hopp, ferdig, nr };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Opplaering; return; }
  rot.Opplaering = Opplaering;

  // ---------------- visningen ----------------
  const $ = id => document.getElementById(id), NØKKEL = 'riksbrudd-opplaering', AV = 'riksbrudd-opplaering-av';
  const les = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, skriv = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* sperret */ } };
  let T = tom(), av = les(AV) === '1', sett = { leir: false, folk: false }, sistSteg = null;
  const css = document.createElement('style');
  css.textContent = `#opplaering{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(98px + env(safe-area-inset-bottom,0px)); z-index:7; display:none; box-sizing:border-box; width:min(490px, calc(100vw - 16px)); padding:9px 12px 10px 46px; background:linear-gradient(180deg,rgba(42,33,20,.97),rgba(23,18,10,.97)); border:1px solid #c9b26a; box-shadow:0 0 0 1px #0d0a06, 0 10px 28px rgba(0,0,0,.6); border-radius:5px; color:var(--ink,#e7dcc3); font-size:14px; line-height:1.35; }
#opplaering.på{ display:block; animation:oppinn .3s ease-out; } @keyframes oppinn{ from{ opacity:0; transform:translate(-50%, 12px); } }
#opplaering .nr{ position:absolute; left:10px; top:10px; width:27px; height:27px; line-height:26px; border-radius:50%; border:1px solid #c9b26a; text-align:center; font-family:"IM Fell English",serif; font-size:15px; color:#f0dc9a; }
#opplaering small{ display:block; font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:#a89970; } #opplaering b{ display:block; font-family:"IM Fell English",serif; font-weight:400; font-size:18px; color:#f0dc9a; margin:0 0 2px; }
#opplaering .rad{ display:flex; gap:6px; justify-content:flex-end; margin-top:7px; } #opplaering .rad button{ height:28px; padding:0 10px; background:#241c10; border:1px solid #5a4a2a; color:var(--ink-dim,#a69b82); font:inherit; font-size:12.5px; cursor:pointer; }
#opplaering .rad button:hover{ color:var(--ink,#e7dcc3); border-color:#c9b26a; } #opplaering .prikker{ position:absolute; left:12px; bottom:12px; display:flex; gap:4px; } #opplaering .prikker i{ width:6px; height:6px; border-radius:50%; background:#4a3d24; } #opplaering .prikker i.g{ background:#c9b26a; } #opplaering .prikker i.n{ background:#fff3c8; box-shadow:0 0 5px #f0dc9a; }
#opplaering.ok b::after{ content:' ✓'; color:#a8d47a; }
#oppring{ position:fixed; z-index:28; display:none; pointer-events:none; border:2px solid #f0dc9a; border-radius:8px; box-shadow:0 0 0 3px rgba(240,220,154,.25), 0 0 16px rgba(240,220,154,.7); animation:oppring 1.3s ease-in-out infinite; }
#oppring.på{ display:block; } @keyframes oppring{ 50%{ box-shadow:0 0 0 8px rgba(240,220,154,.08), 0 0 22px rgba(240,220,154,.9); transform:scale(1.06); } }
body.kort #opplaering{ left:calc(8px + env(safe-area-inset-left,0px)); right:calc(52px + env(safe-area-inset-right,0px)); width:auto; max-width:440px; transform:none; animation:none; bottom:calc(64px + env(safe-area-inset-bottom,0px)); font-size:13px; padding:7px 10px 8px 42px; } body.kort #opplaering b{ font-size:16px; } body.kort #opplaering .nr{ left:8px; top:8px; }
#opplaering.liten{ right:calc(8px + env(safe-area-inset-right,0px)) !important; bottom:calc(5px + env(safe-area-inset-bottom,0px)) !important; top:auto !important; padding:5px 10px 5px 38px; pointer-events:none; opacity:.96; } #opplaering.liten .t, #opplaering.liten .rad, #opplaering.liten small, #opplaering.liten .prikker{ display:none; }
#opplaering.liten .nr{ left:7px; top:4px; width:22px; height:22px; line-height:21px; font-size:13px; } #opplaering.liten b{ font-size:15px; margin:0; }
body.kort.gaar #opplaering{ bottom:auto; top:calc(var(--topp,44px) + 64px); } body.foto #opplaering, body.foto #oppring, body.bygger2d.kort #opplaering{ display:none !important; }
/* PC: mens et bygg plasseres ligger byggebanneret nederst – opplæringen flyttes opp så de ikke dekker hverandre */
body.bygger2d:not(.kort) #opplaering{ bottom:auto; top:calc(var(--topp,44px) + 22px); }
@media (prefers-reduced-motion:reduce){ #opplaering.på, #oppring{ animation:none; } }`;
  document.head.appendChild(css);
  const boks = document.createElement('div'); boks.id = 'opplaering'; boks.setAttribute('role', 'status'); const ring = document.createElement('div'); ring.id = 'oppring'; document.body.append(boks, ring);
  const leirNøkkel = () => { const S = rot.OppstartSpill && OppstartSpill.tilstand && OppstartSpill.tilstand(); return S && S.leir ? Math.round(S.leir.x) + ',' + Math.round(S.leir.y) : null; };
  function last() { const k = leirNøkkel(), o = fra(les(NØKKEL)); T = k && o.leir === k ? o : tom(); T.leir = k || undefined; sett = { leir: false, folk: false }; }
  const lagre = () => { if (T.leir) skriv(NØKKEL, til(T)); };
  const synlig = e => !!e && e.getClientRects().length > 0;
  const kn = k => { const a = document.querySelector('#kommando [data-k="' + k + '"]'), b = document.querySelector('#mkom [data-k="' + k + '"]'); return synlig(a) ? a : synlig(b) ? b : null; };
  function bilde() { const L = rot.LeirSpill && LeirSpill.tilstand && LeirSpill.tilstand(), F = rot.FolkSpill && FolkSpill.tilstand && FolkSpill.tilstand();
    if ($('leirmeny') && $('leirmeny').classList.contains('på')) sett.leir = true; if ($('folkmeny') && $('folkmeny').classList.contains('på')) sett.folk = true;
    return { leirÅpnet: sett.leir, brakker: L ? L.bygg.filter(b => b.type === 'brakke').length : 0, folkÅpnet: sett.folk, påBygg: F && F.personer ? F.personer.filter(p => p.oppgave === 'bygg').length : 0,
      tropper: typeof ENHETER !== 'undefined' ? ENHETER.filter(s => s.fraFolk).length : 0, går: typeof R3 !== 'undefined' && !!(R3 && R3.fot) && typeof på3d !== 'undefined' && på3d }; }
  // hva ringen skal stå rundt for steget: knappen i kommandolinja, eller neste ting inne i menyen når den alt er åpen
  function pekPå(s) { if (!s) return null; const lm = $('leirmeny'), åpen = lm && lm.classList.contains('på');
    if (s.mål === 'leir') return kn('leir') || $('leirknapp');
    if (s.mål === 'brakke') { if ($('byggvalg') && synlig($('byggvalg'))) return null; if (åpen) { const fane = [...lm.querySelectorAll('.faner button, [data-fane-knapp]')].find(b => /^Bygg/.test(b.textContent.trim())); const rad = lm.querySelector('.bygg[data-type="brakke"]'); return synlig(rad) ? rad : synlig(fane) ? fane : null; } return kn('leir') || $('leirknapp'); }
    if (s.mål === 'folk') { const fm = $('folkmeny'); if (fm && fm.classList.contains('på')) return null; return kn('folk') || $('folkknapp'); }
    if (s.mål === 'tropper') { const tp = $('tropppanel'); if (tp && tp.classList.contains('på')) return null; return kn('tropper') || $('nytropp'); }
    if (s.mål === '3d') return typeof på3d !== 'undefined' && på3d ? $('gaaknapp') : $('v3d');
    return null; }
  function tegn(s, okTekst) { const n = Opplaering.nr(T), sig = (s ? s.id : 'slutt') + '|' + (okTekst || ''); if (sig === sistSteg) return; sistSteg = sig; boks.textContent = '';
    const el = (t, k, x) => { const e = document.createElement(t); if (k) e.className = k; if (x !== undefined) e.textContent = x; return e; };
    boks.classList.toggle('ok', !!okTekst); boks.append(el('div', 'nr', okTekst ? '✓' : String(n)), el('small', '', `Opplæring · ${okTekst ? 'ferdig' : n + ' av ' + STEG.length}`), el('b', '', okTekst ? okTekst : s.tittel));
    boks.appendChild(el('span', 't', okTekst ? 'Bra. Videre går det etter målene: åpne Leir og velg fanen Mål.' : s.tekst));
    const rad = el('div', 'rad'); if (!okTekst) { const h = el('button', '', 'Hopp over'); h.id = 'opphopp'; h.onclick = () => { Opplaering.hopp(T); lagre(); kjør(); }; rad.appendChild(h); }
    const a = el('button', '', okTekst ? 'Lukk' : 'Slå av opplæringen'); a.id = 'oppav'; a.onclick = () => (okTekst ? (T.slutt = true, lagre(), kjør()) : slå(false)); rad.appendChild(a); boks.appendChild(rad);
    const p = el('div', 'prikker'); STEG.forEach(x => p.appendChild(el('i', tatt(T, x.id) ? 'g' : s && x.id === s.id ? 'n' : ''))); boks.appendChild(p); }
  function slå(på) { av = !på; skriv(AV, av ? '1' : null); if (på && Opplaering.ferdig(T)) { T = tom(); T.leir = leirNøkkel() || undefined; lagre(); } if (!på && typeof logg === 'function') logg('Opplæringen er slått av. Du finner den igjen i Leir-menyen under Mål.'); sistSteg = null; kjør(); }
  function kjør() {
    const klar = !!leirNøkkel() && (!navigator.webdriver || API.test === true) && !av, st = $('oppstart'), start = st && st.classList.contains('på'), kort = $('hendelse') && synlig($('hendelse'));
    if (!klar || start || kort) { boks.classList.remove('på'); ring.classList.remove('på'); return; }
    if (T.leir !== leirNøkkel()) last();
    const nye = Opplaering.oppdater(T, bilde()); if (nye.length) lagre();
    const s = Opplaering.neste(T);
    if (!s) { if (T.slutt) { boks.classList.remove('på'); ring.classList.remove('på'); return; } tegn(null, 'Opplæringen er ferdig'); boks.classList.add('på'); ring.classList.remove('på'); return; }
    // mens du går (eller sitter i et kjøretøy) er menyene borte: da venter opplæringen til du er tilbake
    if (document.body.classList.contains('gaar') || document.body.classList.contains('ikontrollrom') || document.body.classList.contains('ikamera')) { boks.classList.remove('på'); ring.classList.remove('på'); return; }
    tegn(s); boks.classList.add('på');
    // på telefon dekker menyene skjermen: da står bare overskriften igjen helt nederst
    const tlf = document.body.classList.contains('kort'), meny = ['leirmeny', 'folkmeny', 'tropppanel', 'krig', 'karakterark', 'sekk'].some(id => synlig($(id)));
    boks.classList.toggle('liten', tlf && meny); if (tlf && !meny && ['panel', 'stridpanel', 'byggvalg'].some(id => synlig($(id)))) { boks.classList.remove('på'); ring.classList.remove('på'); return; }
    const m = pekPå(s); if (m && synlig(m)) { const r = m.getBoundingClientRect(); ring.style.left = r.left - 4 + 'px'; ring.style.top = r.top - 4 + 'px'; ring.style.width = r.width + 8 + 'px'; ring.style.height = r.height + 8 + 'px'; ring.classList.add('på'); } else ring.classList.remove('på'); }
  setInterval(kjør, 400); window.addEventListener('riksbrudd-spill', () => { last(); setTimeout(kjør, 600); }); window.addEventListener('resize', kjør);
  // Leir-menyen, fanen Mål: slå opplæringen av og på, eller ta den en gang til
  (rot.LEIR_MENY = rot.LEIR_MENY || []).push((hode, { el, knapp }) => { hode.appendChild(el('h3', { 'data-fane': 'mål' }, 'Opplæring'));
    const ferdig = Opplaering.ferdig(T), tekst = av ? 'Opplæringen er slått av.' : ferdig ? 'Opplæringen er ferdig.' : `Steg ${Opplaering.nr(T)} av ${STEG.length}: ${Opplaering.neste(T).tittel}.`;
    hode.appendChild(el('div', { klasse: 'rad' }, el('span', {}, tekst), knapp(av ? 'Slå på' : ferdig ? 'Ta den en gang til' : 'Slå av', () => { if (av) slå(true); else if (ferdig) { T = tom(); T.leir = leirNøkkel() || undefined; lagre(); sistSteg = null; kjør(); } else slå(false); }))); });
  const API = { test: false, tilstand: () => T, av: () => av, slå, kjør, last, bilde, vises: () => boks.classList.contains('på'), ring: () => ring.classList.contains('på'), hopp: () => { const id = Opplaering.hopp(T); lagre(); kjør(); return id; },
    nullstill: () => { T = tom(); T.leir = leirNøkkel() || undefined; skriv(NØKKEL, null); sistSteg = null; kjør(); } };
  rot.OpplaeringSpill = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
