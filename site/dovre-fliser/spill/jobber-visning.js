'use strict';
// JOBBTAVLA OG DØGNET i Folk-panelet (28. nov, fase F0; reglene: spill/jobber.js). Lastes rett etter folk-visning.js.
//  - FolkSpill-panelet kaller JobberSpill.del(...) for delen «Jobbtavla», JobberSpill.nå(p) for hva hver person gjør nå og
//    JobberSpill.personDel(p, …) for lås/utelukking ved personen. Når tavla fordeler, erstatter den − / + per oppgave.
//  - FolkRegler.døgnF (folk.js) får døgnfaktoren herfra: produksjonsjobbene arbeider bare i arbeidstida (i testene, med
//    navigator.webdriver, er døgnplanen av – som før – til JobberSpill.test = true).
//  - Når tavla fordeler, fordeles folkene hvert 30. spillminutt (og straks etter en endring) og p.oppgave settes.
//  - Alle endringer går gjennom KOMMANDO (jobbPrio, jobbAuto, jobbDøgn, jobbSkift, jobbLås, jobbUte – registrert her med reglene fra jobber.js).
//  - Lagres per leir i «riksbrudd-jobber» ({ leir: 'x,y', J }).
(function () {
  const JR = window.Jobber, FR = window.FolkRegler; if (!JR || !FR) return;
  const NØKKEL = 'riksbrudd-jobber';
  let J = JR.ny(), leirNøkkel = '', sistFordelt = -1e9, skitten = true, visTavle = false, sistBytt = '';
  const Fo = () => (window.FolkSpill ? FolkSpill.tilstand() : null);
  const Lr = () => (window.LeirSpill ? LeirSpill.tilstand() : null);
  const nåTid = () => (typeof tid !== 'undefined' ? tid : 0);
  const aktiv = () => J.døgn !== false && (!navigator.webdriver || window.JobberSpill.test === true);
  const nøkkel = () => { const S = window.OppstartSpill && OppstartSpill.tilstand(); return S && S.leir ? Math.round(S.leir.x) + ',' + Math.round(S.leir.y) : ''; };
  try { visTavle = localStorage.getItem('riksbrudd-jobbtavle') === '1'; } catch (e) { /* uten lager */ }

  // ---------- lagring ----------
  function lagre() { if (!leirNøkkel) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirNøkkel, J })); } catch (e) { /* fullt eller sperret */ } }
  function les() {
    leirNøkkel = nøkkel(); J = JR.ny();
    try { const o = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); if (o && o.leir === leirNøkkel) J = JR.fraJSON(o.J); } catch (e) { J = JR.ny(); }
    skitten = true; sistFordelt = -1e9;
  }
  window.addEventListener('riksbrudd-spill', les);

  // ---------- døgnfaktoren til folk.js ----------
  FR.døgnF = (F, o) => (F && F === Fo() && aktiv() ? JR.faktor(J, F, o, nåTid()) : 1);
  // moral fra nattskift (FolkSpill.grunn legger den til)
  const moralTillegg = () => (aktiv() && Fo() ? JR.moralTillegg(J, Fo()) : 0);

  // ---------- jobbene og fordelingen ----------
  function ctx() {
    let g = {}; try { g = window.FolkSpill && FolkSpill.valg ? FolkSpill.valg() : {}; } catch (e) { g = {}; }
    const R = window.RessursSpill && RessursSpill.tilstand ? RessursSpill.tilstand() : null;
    const nær = window.Ressurser && Ressurser.REGLER ? Ressurser.REGLER.nær : 150;
    return { R, nær, mangler: g.mangler || (window.LeirSpill ? LeirSpill.siste().mangler : new Set()), avh: g.avhengige || 0, ekstraVerksted: g.ekstraVerksted || 0 };
  }
  // spesialisten (spill/samfunn.js) hører til én oppgave – tavla holder hen der
  const spes = p => (p.spes && window.Samfunn && Samfunn.SPES && Samfunn.SPES[p.spes] ? Samfunn.SPES[p.spes].oppgave : null);
  function jobber() { const F = Fo(), L = Lr(); return F && L ? JR.lag(F, L, ctx()) : []; }
  // fordel nå (bare når tavla fordeler). Gir lista over dem som byttet.
  function fordel(melde = true) {
    const F = Fo(), L = Lr(); if (!F || !L || !J.auto) return [];
    const f = JR.fordel(F, J, JR.lag(F, L, ctx()), { spes }), bytt = JR.bruk(F, f); sistFordelt = nåTid(); skitten = false;
    if (bytt.length) {
      const navn = o => (FR.OPPGAVE[o] ? FR.OPPGAVE[o].navn.toLowerCase() : o);
      sistBytt = bytt.length <= 3 ? bytt.map(b => `${b.p.navn.split(' ')[0]} ${navn(b.fra)} → ${navn(b.til)}`).join(', ') : `${bytt.length} personer fikk ny jobb`;
      if (melde && typeof logg === 'function') logg('Jobbtavla: ' + sistBytt + '.');
      if (window.LeirSpill) LeirSpill.lagre();
    }
    return bytt;
  }
  // fordel på nytt hvert 30. spillminutt, straks etter en endring, og når jobbene endrer seg (sjekkes høyst én gang i sekundet:
  // en ny bestilling, et hogstfelt som blir ferdig, noen som blir syke)
  let sistSjekk = 0, sistSig = '';
  if (typeof KROKER !== 'undefined') KROKER.sim.push(() => {
    if (!J.auto || !Fo()) return;
    const nu = performance.now();
    if (nu - sistSjekk > 1000) { sistSjekk = nu; const sig = jobber().map(j => j.plasser + (j.blokk ? 'b' : '')).join() + '|' + Fo().personer.map(p => p.id + (FR.arbeidsfør(p) ? '' : 's')).join();
      if (sig !== sistSig) { sistSig = sig; skitten = true; } }
    if (skitten || nåTid() - sistFordelt >= JR.REGLER.hvert || nåTid() < sistFordelt) fordel(true);
  });

  // ---------- kommandoene ----------
  function endret(side, hva) { lagre(); skitten = true; if (J.auto && (hva === 'prio' || hva === 'auto' || hva === 'lås' || hva === 'ute')) fordel(true); if (window.FolkSpill) FolkSpill.vis(); }
  function registrer() {
    if (!window.Kommando || registrer.ferdig) return; registrer.ferdig = true;
    JR.registrerKommandoer(Kommando, { jobber: side => (side === (typeof MIN_SIDE !== 'undefined' ? MIN_SIDE : 'blå') && Fo() ? J : null), folk: () => Fo(), endret });
  }
  document.addEventListener('DOMContentLoaded', registrer); setTimeout(registrer, 0);
  const kom = k => { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' }; if (!r.ok && r.feil && typeof logg === 'function') logg(r.feil); return r; };

  // ---------- visningen ----------
  const css = document.createElement('style');
  css.textContent = `#folkmeny .jt{ margin:6px 0 2px; }
#folkmeny .jt .jtrad{ display:grid; grid-template-columns:1fr auto; gap:2px 8px; align-items:center; padding:4px 0; border-bottom:1px solid #3a3226; }
#folkmeny .jt .jtrad b{ font-weight:600; font-size:14.5px; } #folkmeny .jt .jtrad small{ display:block; color:var(--ink-dim); font-size:12px; line-height:1.3; }
#folkmeny .jt .jtrad.fast b::after{ content:' ⚠'; color:#e8a46a; }
#folkmeny .jt .prio{ display:flex; align-items:center; gap:3px; }
#folkmeny .jt .prio button{ min-height:34px; min-width:34px; padding:0; font-size:17px; }
#folkmeny .jt .prio span{ min-width:52px; text-align:center; font-size:12.5px; line-height:1.1; color:var(--ink-dim); } #folkmeny .jt .prio span i{ display:block; font-style:normal; letter-spacing:1px; font-size:11px; color:#d6b25a; }
#folkmeny .jt button.skift{ min-height:28px; padding:1px 7px; font-size:12px; margin-top:2px; }
#folkmeny .jt .fastlinje{ font-size:13px; color:#e8a46a; margin:2px 0; line-height:1.35; }
#folkmeny .jt .ingen{ font-size:12px; color:var(--ink-dim); margin:4px 0; line-height:1.35; }
#folkmeny .jt .nu{ font-size:13px; color:var(--ink-dim); margin:3px 0; }
#folkmeny .person .gjor{ color:#c9b98f; } #folkmeny .person .gjor.sover{ color:#8d9bb0; } #folkmeny .person .gjor.spiser{ color:#c9a86a; }
#folkmeny .person .jtp{ display:inline-flex; flex-wrap:wrap; gap:3px; margin-left:4px; vertical-align:middle; }
#folkmeny .person .jtp button{ min-height:26px; padding:0 6px; font-size:12px; }
body.kort #folkmeny .jt .prio button{ min-height:32px; min-width:32px; }`;
  document.head.appendChild(css);
  const NAVN = t => (FR.OPPGAVE[t] ? FR.OPPGAVE[t].navn : t);
  const PRIOORD = ['', 'først', 'høy', 'middels', 'lav', 'sist'];
  const klokkeTekst = h => String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor((h % 1) * 60)).padStart(2, '0');

  // Hva personen gjør nå («arbeider – bygg», «spiser», «sover», «fri»)
  function nå(p) { const F = Fo(); if (!F) return null; const Jx = aktiv() ? J : { ...J, døgn: false }; return JR.nå(Jx, F, p, nåTid()); }

  // Delen «Jobbtavla» i Folk-panelet. Gir { noder, erstatter } – erstatter = true når tavla fordeler (− / + per oppgave skjules)
  function del({ el, knapp }) {
    const F = Fo(), L = Lr(); if (!F || !L) return null;
    const ut = [], jb = JR.lag(F, L, ctx()), fast = J.auto ? JR.fordel(F, J, jb, { spes }).fast : JR.fastManuelt(F, jb);
    const fastAv = new Map(fast.map(q => [q.type, q]));
    const boks = el('div', { klasse: 'jt', id: 'jobbtavla' });
    ut.push(el('h3', {}, 'Jobbtavla'));
    // hvem fordeler, og døgnplanen
    const bryter = knapp(J.auto ? 'Fordel selv' : 'La tavla fordele', () => kom({ type: 'jobbAuto', på: !J.auto }), { id: 'jobbauto', title: J.auto ? 'Bruk − / + per oppgave igjen' : 'Folkene fordeles etter prioritetene under' });
    const døgnK = knapp(`Døgnplan: ${J.døgn !== false ? 'på' : 'av'}`, () => kom({ type: 'jobbDøgn', på: J.døgn === false }), { id: 'jobbdogn', title: 'På: folk arbeider, spiser, sover og har fri til faste tider. Av: alle arbeider jevnt hele døgnet (som før).' });
    boks.append(el('div', { klasse: 'status' }, J.auto ? 'Tavla fordeler folkene etter prioritet (1 = først) og ferdighet.' : 'Du fordeler folkene selv (− / + over). Endrer du en prioritet, tar tavla over.'));
    const rad = el('div', { klasse: 'rad' }, bryter, døgnK); if (!J.auto) rad.append(knapp(visTavle ? 'Skjul prioritetene' : 'Vis prioritetene', () => { visTavle = !visTavle; try { localStorage.setItem('riksbrudd-jobbtavle', visTavle ? '1' : '0'); } catch (e) { /* uten lager */ } FolkSpill.vis(); }, { id: 'jobbvis' }));
    boks.append(rad);
    // akkurat nå
    const tell = { arbeid: 0, mat: 0, søvn: 0, fri: 0, syk: 0, borte: 0 }; for (const p of F.personer) { const n = nå(p); if (n) tell[n.hva] = (tell[n.hva] || 0) + 1; }
    const h = JR.klokke(nåTid()), deler = [[tell.arbeid, 'arbeider'], [tell.mat, 'spiser'], [tell.søvn, 'sover'], [tell.fri, 'har fri'], [tell.syk, 'syke'], [tell.borte, 'borte']].filter(q => q[0]).map(q => `${q[0]} ${q[1]}`);
    boks.append(el('div', { klasse: 'nu' }, `Kl. ${klokkeTekst(h)}: ${deler.join(', ') || 'ingen i leiren'}` + (aktiv() ? '' : J.døgn === false ? ' (døgnplanen er av)' : '')));
    if (J.auto && sistBytt) boks.append(el('div', { klasse: 'nu' }, 'Sist: ' + sistBytt + '.'));
    // jobbene som står fast, alltid synlig
    for (const q of fast) boks.append(el('div', { klasse: 'fastlinje' }, `${NAVN(q.type)} står fast: ${q.grunn}` + (q.mangler > 0 ? ` (mangler ${q.mangler})` : '') + '.'));
    // jobblista med prioritet og skift (i «fordel selv» bare når den er åpnet)
    if (J.auto || visTavle) {
      const ingen = [];
      for (const j of jb) {
        const på = F.personer.filter(p => p.oppgave === j.type), pr = JR.prio(J, j.type), q = fastAv.get(j.type);
        if (j.plasser <= 0 && !på.length) { ingen.push(`${NAVN(j.type).toLowerCase()} – ${j.ingen || 'ingen jobb nå'}`); continue; }
        const navn = på.length ? på.map(p => p.navn.split(' ')[0]).join(', ') : 'ingen';
        const linje1 = j.hva.length ? j.hva.slice(0, 2).join(' · ') + (j.hva.length > 2 ? ` · +${j.hva.length - 2}` : '') : (j.ingen || '');
        const sk = JR.skift(J, j.type);
        const info = el('div', {}, el('b', {}, NAVN(j.type)), el('small', {}, linje1), el('small', {}, `${på.length} av ${j.plasser}: ${navn}`));
        if (JR.PRODUKSJON.includes(j.type)) {
          const neste = { dag: 'to', to: 'døgn', døgn: 'dag' }[sk];
          info.append(knapp(`Skift: ${JR.SKIFTNAVN[sk]}`, () => kom({ type: 'jobbSkift', jobb: j.type, skift: neste }), { klasse: 'skift', 'data-skift': j.type, title: 'Dag 07–17 · to skift 06–23 · døgnet rundt (nattskift gir litt lavere moral)' }));
        } else info.append(el('small', {}, sk === 'turnus' ? 'Turnus: alltid noen på post' : 'Lager alle måltidene'));
        // prikkene viser hvor viktig jobben er (5 = prioritet 1, først); + gjør den viktigere, − mindre viktig
        const minus = knapp('−', () => kom({ type: 'jobbPrio', jobb: j.type, prio: Math.min(5, pr + 1) }), { 'aria-label': `Mindre viktig: ${NAVN(j.type).toLowerCase()}`, 'data-prio': j.type, klasse: 'pmindre' });
        const pluss = knapp('+', () => kom({ type: 'jobbPrio', jobb: j.type, prio: Math.max(1, pr - 1) }), { 'aria-label': `Viktigere: ${NAVN(j.type).toLowerCase()}`, 'data-prio': j.type, klasse: 'pviktig' });
        minus.disabled = pr >= 5; pluss.disabled = pr <= 1;
        const prikker = '●'.repeat(6 - pr) + '○'.repeat(pr - 1);
        const pr2 = el('div', { klasse: 'prio', title: 'Prioritet: 1 = først, 5 = sist' }, minus, el('span', { 'data-p': String(pr) }, el('i', {}, prikker), `${pr} · ${PRIOORD[pr]}`), pluss);
        boks.append(el('div', { klasse: 'jtrad' + (q ? ' fast' : ''), 'data-jobb': j.type }, info, pr2));
      }
      if (ingen.length) boks.append(el('div', { klasse: 'ingen' }, 'Ingen jobb nå: ' + ingen.join('; ') + '.'));
    }
    ut.push(boks);
    return { noder: ut, erstatter: !!J.auto };
  }
  // Ved hver person: hva hen gjør nå, og (når tavla fordeler) låst / utelukket
  function personDel(p, { el, knapp }) {
    const ut = [], n = nå(p);
    if (n) ut.push(el('span', { klasse: 'gjor ' + (n.hva === 'søvn' ? 'sover' : n.hva === 'mat' ? 'spiser' : ''), title: n.plan ? 'Døgnplan: ' + n.plan : '' }, ' · ' + n.tekst));
    if (J.auto) {
      const b = el('span', { klasse: 'jtp' }), lås = J.lås[p.id];
      if (lås) b.append(knapp(`🔒 ${NAVN(lås)} ×`, () => kom({ type: 'jobbLås', person: p.id, jobb: null }), { title: 'Låst til jobben – trykk for å la tavla velge', 'data-las': String(p.id) }));
      for (const t of J.ute[p.id] || []) b.append(knapp(`aldri ${NAVN(t).toLowerCase()} ×`, () => kom({ type: 'jobbUte', person: p.id, jobb: t, ute: false }), { title: 'Utelukket fra jobben – trykk for å ta bort', 'data-ute': String(p.id) }));
      if (!(J.ute[p.id] || []).includes(p.oppgave) && JR.TYPER.includes(p.oppgave) && !lås) b.append(knapp(`aldri ${NAVN(p.oppgave).toLowerCase()}`, () => kom({ type: 'jobbUte', person: p.id, jobb: p.oppgave, ute: true }), { title: 'Personen skal aldri ha denne jobben', 'data-aldri': String(p.id) }));
      ut.push(b);
    }
    return ut;
  }
  // Nedtrekkslista ved personen: når tavla fordeler, låser et valg personen til jobben («Fri» løser låsen, og tavla velger igjen). Gir true når den er brukt.
  function velg(p, o) {
    if (!J.auto) return false;
    kom({ type: 'jobbLås', person: p.id, jobb: JR.TYPER.includes(o) ? o : null });
    return true;
  }
  window.JobberSpill = { test: false, tilstand: () => J, sett: o => { J = JR.fraJSON(o); lagre(); skitten = true; }, jobber, fordel, del, personDel, nå, velg, moralTillegg, aktiv, les, lagre };
})();
