'use strict';
/* NESTE – ÉN LAPP OG ÉN PRIORITERT LISTE (kritikerløkka runde 1, 26. nov – kritiker I: «Jeg har et scenario, en krig, 15 Mål i fire kapitler,
 * Oppdrag, Selskapets kontrakter, Din historie, en opplæring i ni steg og en Neste-lapp. I tillegg kommer to lapper til nederst (Mer forsvar
 * før dag 4, Reparer byggene). … samlet mister jeg den røde tråden.» og «Ett mål øverst … la Neste-lappen være den eneste lappen»).
 *   - Systemene er de samme (kontraktene i selskap*.js, opplæringen i opplaering.js, scenariet, målene i maal*.js); her samles bare VISNINGEN.
 *   - Neste.sorter(kilder) gir lista i prioritert rekkefølge. Den øverste står i Neste-lappen nederst («Nå»), den neste som «Så: …» i samme
 *     lapp på PC. Opplæringsruta står ikke lenger som en egen lapp: steget står i Neste-lappen, og et trykk på lappen folder ut steget
 *     (tekst og knapper) – se spill/opplaering.js (iLapp).
 *   - Leir → Mål har øverst delen «Nå» med hele lista (Nå: … / Så: …), og «Neste mål» over fanene sier det samme som lappen.
 * Reglene øverst er uten DOM (test_neste.js); visningen nederst (window.NesteSpill). I testene (navigator.webdriver) er alt som før
 * til NesteSpill.test = true. Prioritetene er Claudes forslag.
 */
(function (rot) {
  // Claudes forslag: høyere tall står først. Kontraktene er den røde tråden (brukerens ønske): den første kontrakten og en kontrakt med kort
  // frist går foran opplæringen; ledige tilbud står over målene. Et opplæringssteg du har utsatt («Senere», eller ugjort lenge) synker.
  // (fase Ø0, 28. nov) trinn = steget mot neste av de fire trinnene (spill/trinn.js): over målene, under alt som haster
  const REGLER = {
    // (ut8-kr-ro, kritikken: «Neste-lappen blir stående på Kjøpsavtale: tømmer kommer hvert døgn (1 av 5) i over et døgn») en avtale som
    // går av seg selv (kjøpsavtale, frakt med Gråfjell) er ikke et steg: «avtale» står under trinnet og målene
    prio: { angrep: 100, tråd: 90, kontraktSnart: 80, opplæring: 70, kontrakt: 60, scenario: 55, tilbud: 50, investor: 48, utsatt: 45, trinn: 42, mål: 40, avtale: 30 },
    snart: 360,      // spillminutter: en aktiv kontrakt med kortere frist enn dette er «snart»
    maks: 6,         // så mange linjer i lista
  };
  const NAVN = { angrep: 'Angrep', tråd: 'Første kontrakt', kontraktSnart: 'Kontrakt', kontrakt: 'Kontrakt', opplæring: 'Opplæring', utsatt: 'Opplæring', scenario: 'Scenario', tilbud: 'Selskapet', investor: 'Investor', trinn: 'Veien videre', mål: 'Mål', avtale: 'Avtale' };
  // (ut8-kr-ro) går kontrakten av seg selv? (kjøpsavtalen leveres hver morgen; en levering Gråfjell Frakt kjører) – da er den ikke et steg
  const avSegSelv = k => !!(k && (k.type === 'kjøp' || (k.type === 'lever' && k.frakt)));
  // kilde: { id, slag, tekst, hjelp, igjen (spillminutter til fristen), utsatt (opplæring), trykk }
  function slagFor(k) { if (k.slag === 'kontrakt' && k.l0 && avSegSelv(k.l0.k)) return 'avtale'; if (k.slag === 'kontrakt' && Number.isFinite(k.igjen) && k.igjen <= REGLER.snart) return 'kontraktSnart'; if (k.slag === 'opplæring' && k.utsatt) return 'utsatt'; return k.slag; }
  const prioritet = k => { const s = slagFor(k); return Number.isFinite(REGLER.prio[s]) ? REGLER.prio[s] : 10; };
  // like tekster (samme mål fra to systemer) står bare én gang – den viktigste
  function sorter(kilder) {
    const ut = [], sett = new Set();
    (kilder || []).filter(k => k && k.tekst).map((k, i) => ({ ...k, prio: prioritet(k), navn: NAVN[slagFor(k)] || '', i })).sort((a, b) => b.prio - a.prio || a.i - b.i)
      .forEach(k => { const n = String(k.tekst).toLowerCase().replace(/[^a-zæøå0-9]+/g, ' ').trim(); if (sett.has(n)) return; sett.add(n); ut.push(k); });
    return ut.slice(0, REGLER.maks);
  }
  const Neste = { REGLER, NAVN, prioritet, sorter, slagFor, avSegSelv };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Neste; return; }
  rot.Neste = Neste;

  // ---------------- visningen ----------------
  const $ = id => document.getElementById(id);
  const API = { test: false };
  const aktiv = () => !navigator.webdriver || API.test === true;
  const synlig = e => !!e && e.getClientRects().length > 0;
  const nå = () => (typeof tid === 'number' && isFinite(tid) ? tid : 0);
  function åpneMål() { const m = $('leirmeny'), lk = $('leirknapp'); if (m && lk && !m.classList.contains('på')) lk.click(); if (rot.LeirSpill && LeirSpill.fane) LeirSpill.fane('mål'); }
  // alle kildene akkurat nå. l0 = kontraktens lapp fra spill/selskap-visning.js (SelskapSpill.lapp()), eller null
  function kilder(l0) {
    const ut = [];
    // angrep: røverne angriper leiren nå (banneret øverst har knappen)
    try { const T0 = rot.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill.T() : null;
      if (T0 && T0.aktiv) { const kn = $('forsvarknapp'), satt = !synlig(kn); ut.push({ id: 'angrep', slag: 'angrep', tekst: satt ? 'Røverne angriper – lagene holder stillingen' : 'Røverne angriper – trykk for å sette lagene i forsvar',
        hjelp: 'Det røde banneret øverst viser angrepet.', trykk: () => { const b = $('forsvarknapp'); if (synlig(b)) b.click(); } }); } } catch (e) { /* uten angrep */ }
    // kontraktene: tråden (den første kontrakten), en aktiv kontrakt eller ledige tilbud – lappen selskap-visning.js lager
    if (l0 && l0.tekst) ut.push({ id: 'kontrakt', slag: l0.steg ? 'tråd' : l0.k ? 'kontrakt' : 'tilbud', tekst: l0.tekst, hjelp: l0.hjelp, igjen: l0.k && Number.isFinite(l0.k.frist) ? l0.k.frist - nå() : undefined, l0 });
    // opplæringen (spill/opplaering.js): steget som står for tur
    try { const o = rot.OpplaeringSpill && OpplaeringSpill.lappInfo ? OpplaeringSpill.lappInfo() : null;
      if (o && o.tekst) ut.push({ id: 'opplæring', slag: 'opplæring', tekst: o.tekst, hjelp: o.hjelp, utsatt: !!o.utsatt, trykk: () => OpplaeringSpill.utvid() }); } catch (e) { /* uten opplæring */ }
    // scenariet (spill/scenario-visning.js)
    try { const s = rot.ScenarioSpill && ScenarioSpill.scenario ? ScenarioSpill.scenario() : null;
      if (s && s.status === 'pågår' && s.tekst) ut.push({ id: 'scenario', slag: 'scenario', tekst: 'Scenario: ' + String(s.tekst).replace(/\.$/, '') + (Number.isFinite(s.igjen) && rot.Scenario && Scenario.fristTekst ? ' · ' + Scenario.fristTekst(Math.round(s.igjen / 10) * 10) : ''), hjelp: 'Leir → Mål viser scenariet.', trykk: åpneMål }); } catch (e) { /* uten scenario */ }
    // veien videre (fase Ø0, spill/selskapspanel.js): steget mot neste trinn. Et steg om kontraktene står ikke når kontraktene alt har en linje.
    try { const t = rot.TrinnSpill && TrinnSpill.lappInfo ? TrinnSpill.lappInfo() : null;
      // (ut8-kr-ro) en avtale som går av seg selv, tar ikke plassen til trinnet
      if (t && t.tekst && !(t.om === 'kontrakt' && l0 && l0.tekst && !avSegSelv(l0.k))) ut.push({ id: 'trinn', slag: 'trinn', tekst: t.tekst, hjelp: t.hjelp, trykk: t.trykk }); } catch (e) { /* uten trinn */ }
    // målene (spill/maal.js) – neste mål i kapittelet du er i (krigen om regionen er det siste kapittelet)
    try { const M = rot.MaalSpill, st = M && M.stilling ? M.stilling() : null;
      if (st && st.neste && rot.Maal) { let T = null; try { T = M.bilde(); } catch (e) { T = null; } ut.push({ id: 'mål', slag: 'mål', tekst: Maal.tekstNå(st.neste, T), hjelp: Maal.hjelpNå ? Maal.hjelpNå(st.neste, T) : st.neste.hjelp, trykk: åpneMål }); } } catch (e) { /* uten mål */ }
    // (Ø7, ut5-bors) andre moduler kan legge til en linje: window.NESTE_KILDER = [() => kilde | null] (investorenes ønsker)
    for (const f of rot.NESTE_KILDER || []) { try { const k = f(); if (k && k.tekst) ut.push(k); } catch (e) { /* neste gang */ } }
    return ut;
  }
  // lista regnes høyst hvert sekund (lappen spør hvert halve sekund; målenes øyeblikksbilde koster litt)
  let husk = null, huskT = 0, huskL0 = null;
  function liste(l0) { const t = performance.now(); if (husk && t - huskT < 1000 && huskL0 === (l0 ? l0.tekst : null)) { const k = husk.find(q => q.l0); if (k && l0) k.l0 = l0; return husk; }
    husk = Neste.sorter(kilder(l0)); huskT = t; huskL0 = l0 ? l0.tekst : null; return husk; }
  // det Neste-lappen skal vise: kontraktens lapp (urørt, så pilen og ringen i selskap-visning.js virker) eller en annen kilde, og «Så: …»
  function velg(l0) {
    if (!aktiv()) return l0; document.body.classList.add('nesteen');
    const L = liste(l0), topp = L[0], så = L[1]; if (!topp) return l0;
    const ekstra = så ? { så: 'Så: ' + så.tekst, såTrykk: så.l0 ? null : så.trykk || null } : { så: '' };
    if (topp.l0) return { ...topp.l0, ...ekstra };
    return { tekst: topp.tekst, hjelp: topp.hjelp || topp.tekst, trykk: topp.trykk, pek: null, k: null, slag: topp.slag, ...ekstra };
  }
  // ---------- Leir → Mål: «Nå» øverst med hele lista ----------
  const css = document.createElement('style');
  css.textContent = `#leirmeny .naaliste{ margin:4px 0 6px; padding:0; list-style:none; } #leirmeny .naaliste li{ display:flex; gap:8px; align-items:baseline; padding:5px 0; border-top:1px solid #3a3226; }
#leirmeny .naaliste li:first-child{ border-top:0; } #leirmeny .naaliste li > span{ flex:1; min-width:0; } #leirmeny .naaliste li b{ font-weight:600; color:#f0e2b0; }
#leirmeny .naaliste li em{ font-style:normal; flex:none; min-width:30px; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:#b48a3c; } #leirmeny .naaliste li small{ display:block; color:var(--ink-dim); font-size:12.5px; line-height:1.3; }
#leirmeny .naaliste li button{ flex:none; min-height:30px; padding:0 9px; font-size:12.5px; } #leirmeny .naaliste li.nå{ background:#2a2416; margin:0 -6px; padding:6px; border:1px solid #6a5a2e; }
#nestelapp i.saa{ flex:0 1 auto; min-width:0; font-style:normal; font-size:12px; color:#b9a978; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-left:8px; border-left:1px solid #5a4a2a; cursor:pointer; }
#nestelapp i.saa:hover{ color:#f0e2b0; } #nestelapp i.saa[hidden]{ display:none; } body.kort #nestelapp i.saa{ display:none; }`;
  document.head.appendChild(css);
  (rot.LEIR_MENY = rot.LEIR_MENY || []).push((hode, { el, knapp }) => {
    if (!aktiv()) return; const SS = rot.SelskapSpill, l0 = SS && SS.lapp ? SS.lapp() : null, L = liste(l0); if (!L.length) return;
    hode.appendChild(el('h3', { 'data-fane': 'mål' }, 'Nå'));
    const ul = el('ul', { klasse: 'naaliste' });
    // forklaringen bare på den øverste (lista skal være kort); mål og scenario står alt i denne fanen og får ingen knapp
    L.forEach((k, i) => { const trykk = k.l0 ? () => { if (SS && SS.følgLapp) SS.følgLapp(); } : k.slag === 'mål' || k.slag === 'scenario' ? null : k.trykk;
      ul.appendChild(el('li', { klasse: i === 0 ? 'nå' : '' }, el('em', {}, i === 0 ? 'Nå' : 'Så'), el('span', {}, el('b', {}, k.tekst), el('small', {}, k.navn + (i === 0 && k.hjelp && k.hjelp !== k.tekst ? ' · ' + k.hjelp : ''))), trykk ? knapp(k.slag === 'opplæring' ? 'Vis steget' : 'Gå til', trykk) : '')); });
    hode.appendChild(ul);
  });
  Object.assign(API, { aktiv, kilder, liste: l0 => liste(l0 === undefined && rot.SelskapSpill && SelskapSpill.lapp ? SelskapSpill.lapp() : l0), velg, glem: () => { husk = null; } });
  rot.NesteSpill = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
