'use strict';
/* Riksbrudd – REKRUTTERING OG OPPLÆRING, visningen (28. nov, pakke «rekruttering»; reglene i spill/rekruttering.js).
 *  - Hver morgen (kl. 00 i spillet, ny dag) kommer søkere: Folk-panelet viser dem som kort (navn, alder, yrke, ferdigheter, egenskaper,
 *    lønnskrav, «Ansett» / «By over»). Morgenmøtet nevner dem i én linje (window.MORGEN_LINJER), og loggen sier det.
 *  - Tilbud fra rivalene til misfornøyde folk står øverst i søkerdelen med «Gi lønnstillegg» / «La gå».
 *  - Opplæring: øvingsfeltet (nytt bygg) – velg person og ferdighet. Mester og lærling går av seg selv.
 *  - Alt som endrer noe, går gjennom KOMMANDO (ansett, lokkSvar, opplæring).
 *  - I testene (navigator.webdriver) skjer ingenting av seg selv (ingen søkere om morgenen, ingen lokking, ingen mester/lærling) før
 *    RekrutteringSpill.test = true. Opplæringen spilleren starter, virker alltid.
 *  - Lagres per leir i «riksbrudd-rekruttering» ({ leir: 'x,y', S }). Personenes lønn, egenskaper og opplæring ligger på personen i folket.
 */
(function () {
  const RK = window.Rekruttering, FR = window.FolkRegler; if (!RK || !FR) return;
  const NØKKEL = 'riksbrudd-rekruttering', R = RK.REGLER;
  let S = null, leirNøkkel = '', akk = 0, valgP = '', valgO = 'maskin';
  const auto = () => !navigator.webdriver || window.RekrutteringSpill.test === true;
  const Fo = () => (window.FolkSpill ? FolkSpill.tilstand() : null);
  const Lr = () => (window.LeirSpill ? LeirSpill.tilstand() : null);
  const kr = n => (window.Leir ? Leir.kroner(n) : Math.round(n) + ' kr');
  const tNå = () => (typeof tid !== 'undefined' ? tid : 0);
  const klokke = () => (((tNå() % 1440) + 1440) % 1440) / 60;
  const dagNå = () => Math.floor(tNå() / 1440) + 1;
  const des = v => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
  const mangler = () => (window.LeirSpill && LeirSpill.siste ? LeirSpill.siste().mangler : null);
  const oNavn = o => (FR.OPPGAVE[o] ? FR.OPPGAVE[o].navn : o);
  // egenskapene virker på tempoet (flittig, nattmenneske om kvelden og natta, modig på vakt)
  FR.personF = (p, o) => RK.personF(p, o, klokke());

  // ---------- lagring per leir ----------
  function lagre() { if (!S || !leirNøkkel) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirNøkkel, S })); } catch (e) { /* fullt eller sperret */ } }
  function start() {
    const O = window.OppstartSpill && OppstartSpill.tilstand(); if (!O || !O.leir) { S = null; leirNøkkel = ''; return; }
    leirNøkkel = Math.round(O.leir.x) + ',' + Math.round(O.leir.y); let d = null;
    try { const o = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); if (o && o.leir === leirNøkkel) d = RK.fraJSON(o.S); } catch (e) { d = null; }
    S = d || RK.ny((Math.round(O.leir.x) * 17 + Math.round(O.leir.y) * 3) >>> 0);
    // et nytt spill: første søkere kommer med en gang (ikke i testene)
    if (S.dag == null && auto() && Fo()) morgenNå(); lagre();
  }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));

  // ---------- morgenen ----------
  // ryktet (selskap.js: pålitelig), byer du holder (TETTSTEDER) og aktive avtaler (kontraktene)
  function ctx() {
    let rykte = 50, byer = 0, avtaler = 0;
    try { const T = window.SelskapSpill && SelskapSpill.tilstand(), sd = T && T.sider && T.sider['blå']; if (sd) { if (sd.rykte && Number.isFinite(sd.rykte.pålitelig)) rykte = sd.rykte.pålitelig; avtaler = (sd.aktive || []).length; } } catch (e) { /* uten selskap */ }
    try { if (typeof TETTSTEDER !== 'undefined' && TETTSTEDER && TETTSTEDER.forEach) TETTSTEDER.forEach(v => { if (v && v.eier === 'blå') byer++; }); } catch (e) { /* uten tettsteder */ }
    return { rykte, byer, avtaler };
  }
  const liste = a => (a.length > 1 ? a.slice(0, -1).join(', ') + ' og ' + a[a.length - 1] : a.join(''));
  function morgenNå() {
    const F = Fo(); if (!S || !F) return null;
    const u = RK.morgen(S, F, tNå(), ctx(), RK.rng(S));
    S.sist = { dag: S.dag, nye: u.nye.length, tekst: u.nye.length ? `${u.nye.length === 1 ? 'Én ny søker' : u.nye.length + ' nye søkere'} i Folk-panelet: ${liste(u.nye.map(s => `${s.navn} (${s.yrke}, krever ${kr(s.lønn)}/døgn)`))}.` : null };
    if (S.sist.tekst && typeof logg === 'function') logg(S.sist.tekst);
    for (const h of u.hendelser) if (typeof logg === 'function') logg(h);
    lagre(); if (window.LeirSpill) LeirSpill.lagre(); if (window.FolkSpill) FolkSpill.vis(); return u;
  }
  // morgenmøtet (spill/morgen-visning.js) tar med én linje om nye søkere
  (window.MORGEN_LINJER = window.MORGEN_LINJER || []).push(d => { if (!S) return null; if (auto() && S.dag !== d) morgenNå(); return S.sist && S.sist.dag === d && S.sist.tekst ? S.sist.tekst : null; });

  // ---------- tiden ----------
  // steg(dt): søkere som går, svarfristen for tilbudene, opplæringen og (ikke i testene) mester og lærling – én gang per spillminutt
  function steg(dt) {
    const F = Fo(), L = Lr(); if (!S || !F || !L) return;
    if (auto() && S.dag !== dagNå()) morgenNå();
    akk += dt; if (akk < 1) return; const d = akk; akk = 0;
    const H = [...RK.steg(S, F, tNå()), ...RK.skoleSteg(F, L, d, mangler())];
    if (auto()) RK.mesterSteg(F, d);
    for (const h of H) if (typeof logg === 'function') logg(h);
    if (H.length) { lagre(); if (window.LeirSpill) LeirSpill.lagre(); }
  }
  if (typeof KROKER !== 'undefined') KROKER.sim.push(steg);

  // ---------- kommandoene ----------
  function endret() { lagre(); if (window.LeirSpill) LeirSpill.lagre(); if (window.FolkSpill) FolkSpill.vis(); if (typeof skitten !== 'undefined') skitten = true; }
  function registrer() {
    if (!window.Kommando || registrer.ferdig) return; registrer.ferdig = true;
    const min = s => s === (typeof MIN_SIDE !== 'undefined' ? MIN_SIDE : 'blå');
    RK.registrerKommandoer(Kommando, { tilstand: s => (min(s) ? S : null), folk: s => (min(s) ? Fo() : null), leir: s => (min(s) ? Lr() : null),
      penger: () => (window.OppstartSpill && OppstartSpill.tilstand() ? OppstartSpill.tilstand().penger : 0), betal: () => kr2 => OppstartSpill.betal(kr2),
      valg: () => (window.FolkSpill ? FolkSpill.valg() : {}), mangler: () => mangler(), endret });
  }
  document.addEventListener('DOMContentLoaded', registrer); setTimeout(registrer, 0);
  const kom = k => { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' }; if (!r.ok && r.feil && typeof logg === 'function') logg(r.feil); return r; };
  function ansett(id, byOver) {
    const r = kom({ type: 'ansett', søker: id, byOver: !!byOver }); if (!r.ok) return r; const v = r.svar || {};
    if (v.feil) { logg(v.feil); return r; }
    logg(`${v.person.navn} (${v.person.yrke}) er ansatt for ${kr(v.lønn)} i døgnet` + (v.byOver ? ' – dere bød over rivalen.' : '.') + ` Utstyret kostet ${kr(v.pris)}.`); return r;
  }
  function svar(valg) { const r = kom({ type: 'lokkSvar', valg }); if (r.ok && r.svar && r.svar.tekst) logg(r.svar.tekst); return r; }
  function opplæring(id, o) { const r = kom({ type: 'opplæring', person: id, ferdighet: o || null }); if (r.ok && r.svar) logg(r.svar.feil || r.svar.tekst); return r; }

  // ---------- byggene: ikon og tegning (lastes etter denne fila) ----------
  function merkBygg() {
    if (window.Ikoner && Ikoner.BYGG && !Ikoner.BYGG.øvingsfelt) Ikoner.BYGG.øvingsfelt = Ikoner.har && Ikoner.har('bok') ? 'bok' : Ikoner.har && Ikoner.har('maal') ? 'maal' : 'telt';
    if (window.Tegninger && Tegninger.leggTil) Tegninger.leggTil('øvingsfelt', () => "<path d='M8 39.5v-13l24-9 24 9v13z' fill='#6f6a52' stroke='#2a2318' stroke-width='1'/><path d='M14 39.5v-8h12v8M38 39.5v-8h12v8' fill='#3a3426' stroke='#2a2318' stroke-width='.8'/><circle cx='52' cy='15' r='5' fill='none' stroke='#c9b26a' stroke-width='1.4'/><circle cx='52' cy='15' r='2' fill='#c9b26a'/><path d='M52 20v19' stroke='#2a2318' stroke-width='1.2'/>");
  }
  document.addEventListener('DOMContentLoaded', merkBygg); setTimeout(merkBygg, 0);

  // ---------- Folk-panelet ----------
  const css = document.createElement('style');
  css.textContent = `#folkmeny .søkere{ margin-top:4px; }
#folkmeny .søker{ border:1px solid #3a3226; background:#1d1810; padding:7px 9px; margin:6px 0; font-size:13.5px; line-height:1.35; }
#folkmeny .søker b{ font-size:14.5px; font-weight:600; } #folkmeny .søker .ferd{ color:var(--ink-dim); font-size:12.5px; }
#folkmeny .søker .krav{ margin-top:3px; } #folkmeny .søker .bud{ color:#e8a46a; font-size:12.5px; } #folkmeny .søker .venter{ color:var(--ink-dim); font-size:12px; }
#folkmeny .egen{ display:inline-block; border:1px solid #6d5f3a; color:#e2cf98; padding:0 5px; font-size:11.5px; margin:2px 4px 0 0; border-radius:3px; }
#folkmeny .søker .rad{ margin-top:5px; } #folkmeny .lokk{ border:1px solid #c0603a; background:#3a1d12; color:#f2c9a8; padding:7px 9px; margin:6px 0; font-size:13.5px; line-height:1.35; }
#folkmeny .opplæring{ flex-wrap:nowrap; } #folkmeny .opplæring select{ background:#2a2318; color:var(--ink); border:1px solid var(--rule); font:inherit; font-size:13px; min-height:36px; flex:1 1 0; min-width:0; } #folkmeny .opplæring button{ flex:none; }
#folkmeny .elev{ font-size:13px; padding:3px 0; border-bottom:1px solid #2e281e; display:flex; gap:6px; align-items:center; justify-content:space-between; }
#folkmeny .elev button{ min-height:32px; font-size:12.5px; }`;
  document.head.appendChild(css);
  const toppFerd = s => Object.entries(s.ferd || {}).filter(([o]) => o !== 'fri').sort((a, b) => b[1] - a[1]).slice(0, 3).map(([o, v]) => `${oNavn(o)} ${des(v)}`).join(' · ');
  // hvorfor ingen kan ansettes nå (null = det går)
  function hvorfor() {
    const F = Fo(), L = Lr(); if (!F || !L) return 'Start et spill først.';
    const f = FR.kanRekruttere(F, L, window.FolkSpill ? FolkSpill.valg() : {}); if (f) return f;
    const p = window.OppstartSpill && OppstartSpill.tilstand() ? OppstartSpill.tilstand().penger : 0; return p < R.utstyr ? `Ikke nok penger i kassa (${kr(R.utstyr)} for utstyret).` : null;
  }
  // del(h): nodene i Folk-panelet – tilbud fra rivalene, søkerne og opplæringen
  function del({ el, knapp }) {
    const F = Fo(), L = Lr(); if (!S || !F || !L) return [];
    const ut = [], dag = 1440;
    if (S.lokk) { const l = S.lokk, p = F.personer.find(q => q.id === l.id);
      if (p) ut.push(el('div', { klasse: 'lokk', id: 'lokkvarsel', role: 'alert' }, el('div', {}, `${l.navn} vil ha ${p.navn} (${p.yrke}) for ${kr(l.lønn)} i døgnet – nå ${kr(RK.lønn(p))}. Svar innen ${Math.max(1, Math.round((l.frist - tNå()) / 60))} t.`),
        el('div', { klasse: 'rad' }, knapp(`Gi lønnstillegg (${kr(l.lønn)})`, () => svar('tillegg'), { id: 'lokktillegg' }), knapp('La gå', () => svar('gå'), { id: 'lokkgå' })))); }
    ut.push(el('h3', { id: 'sokere' }, `Søkere (${S.søkere.length})`));
    const grunn = hvorfor();
    if (!S.søkere.length) ut.push(el('div', { klasse: 'status' }, 'Ingen søkere nå. Nye kommer om morgenen – flere når ryktet er godt og dere holder byer eller har avtaler.'));
    for (const s of S.søkere) {
      const egen = (s.egen || []).map(e => el('span', { klasse: 'egen', title: RK.EGENSKAPER[e] ? RK.EGENSKAPER[e].tekst : '' }, RK.EGENSKAPER[e] ? RK.EGENSKAPER[e].navn : e));
      const igjen = Math.max(0, s.går - tNå()), venter = igjen >= dag ? `Venter ca. ${Math.round(igjen / dag)} døgn til` : `Venter ${Math.max(1, Math.round(igjen / 60))} t til`;
      const b = s.bud ? knapp(`By over (${kr(RK.ansettLønn(s, true))}/døgn)`, () => ansett(s.id, true), { 'data-søker': String(s.id), klasse: 'byover' })
        : knapp(`Ansett (${kr(R.utstyr)})`, () => ansett(s.id, false), { 'data-søker': String(s.id), klasse: 'ansett' });
      if (grunn) { b.disabled = true; b.title = grunn; }
      ut.push(el('div', { klasse: 'søker', 'data-søker': String(s.id) }, el('div', {}, el('b', {}, s.navn), `, ${s.alder} · ${s.yrke}`),
        el('div', { klasse: 'ferd' }, toppFerd(s)), ...(egen.length ? [el('div', {}, ...egen)] : []),
        el('div', { klasse: 'krav' }, `Krever ${kr(s.lønn)} i døgnet`), ...(s.bud ? [el('div', { klasse: 'bud' }, `Også bud fra ${s.bud.navn}: ${kr(s.bud.lønn)} i døgnet`)] : []),
        el('div', { klasse: 'venter' }, venter), el('div', { klasse: 'rad' }, b)));
    }
    if (S.søkere.length) ut.push(el('div', { klasse: 'status' }, `En ansettelse koster ${kr(R.utstyr)} for utstyret, og så lønnskravet hver dag.`));
    // opplæringen
    const n = RK.plasser(L, mangler()), E = RK.elever(F), har = L.bygg.some(b => b.type === 'øvingsfelt');
    ut.push(el('h3', {}, n ? `Opplæring (${E.length} av ${n} plasser)` : 'Opplæring'));
    if (!n) ut.push(el('div', { klasse: 'status' }, har ? 'Øvingsfeltet er ikke ferdig ennå.' : 'Bygg et øvingsfelt i Leir-menyen: folk på opplæring arbeider ikke, men blir varig bedre. To på samme oppgave, der den ene er dyktig (1,30+), lærer også av hverandre.'));
    for (const p of E) { const v = p.ferd[p.skole] || .9, f = p.egen && p.egen.includes('lærenem') ? R.skole.lærenem : 1, dgn = Math.ceil((R.skole.maks - v) / (R.skole.fart * f));
      ut.push(el('div', { klasse: 'elev' }, el('span', {}, `${p.navn}: ${oNavn(p.skole).toLowerCase()} ${des(v)} → ${des(R.skole.maks)} (ca. ${dgn} døgn)`), knapp('Avslutt', () => opplæring(p.id, null), { 'data-elev': String(p.id) }))); }
    if (n && E.length < n) {
      const kandidater = F.personer.filter(p => FR.arbeidsfør(p) && !p.trener);
      if (!kandidater.some(p => String(p.id) === valgP)) valgP = kandidater[0] ? String(kandidater[0].id) : '';
      const vp = el('select', { 'aria-label': 'Hvem', id: 'oppperson' }); for (const p of kandidater) { const o = el('option', { value: String(p.id) }, p.navn); if (String(p.id) === valgP) o.setAttribute('selected', ''); vp.appendChild(o); }
      const vo = el('select', { 'aria-label': 'Ferdighet', id: 'oppferd' }); for (const o of FR.OPPGAVER.filter(q => q !== 'fri')) { const x = el('option', { value: o }, oNavn(o)); if (o === valgO) x.setAttribute('selected', ''); vo.appendChild(x); }
      vp.onchange = () => { valgP = vp.value; }; vo.onchange = () => { valgO = vo.value; };
      ut.push(el('div', { klasse: 'rad opplæring' }, vp, vo, knapp('Start', () => { if (valgP) opplæring(+valgP, valgO); }, { id: 'opplaringstart' })));
    }
    return ut;
  }
  // ved hver person i lista: lønna, egenskapene og opplæringen
  function personDel(p) {
    const egen = (p.egen || []).map(e => (RK.EGENSKAPER[e] ? RK.EGENSKAPER[e].navn : e));
    return ` · ${kr(RK.lønn(p))}/døgn` + (egen.length ? ' · ' + egen.join(', ') : '') + (p.skole ? ` · på øvingsfeltet (${oNavn(p.skole).toLowerCase()})` : '');
  }
  window.RekrutteringSpill = { test: false, tilstand: () => S, sett: o => { S = RK.fraJSON(o) || RK.ny(); lagre(); }, start, morgen: morgenNå, steg, ctx, del, personDel, hvorfor, ansett, svar, opplæring, lagre, NØKKEL };
})();
