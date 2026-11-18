'use strict';
/* Riksbrudd – REGIONEN i spillet (natt til 18. nov). Regler: spill/region.js. window.RegionSpill.
 * Tettstedene du holder gir varer og skatt som må fram til leiren langs handelsruter; du velger skatt per tettsted, lojaliteten
 * følger, og et tettsted uten lojalitet gjør opprør. Svartebørs, gjenoppbygging og veksling olje ↔ diesel.
 * Panelet «Region» åpnes fra kommandolinja (PC) eller fra Leir-menyen (fanen Lager). Lagres per leir i «riksbrudd-region».
 * I TESTENE (navigator.webdriver) skjer ingenting av seg selv: RegionSpill.test = true slår det på.
 */
(function () {
  const RG = window.Region, G = window.Garnison, LB = window.Leir, FR = window.FolkRegler; if (!RG || !G || typeof KROKER === 'undefined') return;
  const R = RG.REGLER, api = { test: false }, auto = () => !navigator.webdriver || api.test;
  const Sp = () => window.OppstartSpill && OppstartSpill.tilstand(), L = () => window.LeirSpill && LeirSpill.tilstand(), F = () => window.FolkSpill && FolkSpill.tilstand();
  const kr = v => (LB ? LB.kroner(v) : Math.round(v) + ' kr'), tall = v => String(Math.round(v * 10) / 10).replace('.', ',');
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn.filter(b => b !== null && b !== undefined && b !== false)); return e; };
  const kn = (tekst, fn, eg = {}) => { const b = el('button', eg, tekst); b.onclick = e => { e.stopPropagation(); fn(); }; return b; };
  let åpnet = 0, S = RG.ny(), leirId = '', klar = false, åpen = false, sist = '', spillAkk = 0, statusTid = -1e9, STATUS = new Map(), meldtRute = new Map(), meldtStrøm = new Map();
  const les = () => { try { const d = JSON.parse(localStorage.getItem('riksbrudd-region') || 'null'); return d && d.leir === leirId ? d.d : null; } catch (e) { return null; } };
  const lagre = () => { try { localStorage.setItem('riksbrudd-region', JSON.stringify({ leir: leirId, d: S })); } catch (e) { /* fullt eller sperret */ } };

  // ---------- tettstedene ----------
  const byer = () => (typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) || [];
  const midt = by => by.midtR || (by.midtR = { x: (by.bb[0] + by.bb[2]) / 2, y: (by.bb[1] + by.bb[3]) / 2 });
  const eier = by => G.tilstand(TETTSTEDER, by.e.id).eier;
  const mine = () => byer().filter(by => eier(by) === 'blå');
  const leir = () => { const s = Sp(); return s && s.leir ? s.leir : null; };
  const pkt = o => ({ x: o.deler[0][0], y: o.deler[0][1] });
  // meter til nærmeste oljeanlegg på land, kai og kraftverk – regnes én gang per tettsted
  function omgivelser(by) {
    const m = midt(by);
    if (!by.omR) { const nærmest = (liste, filter) => { let d = Infinity; for (const o of liste || []) { if (filter && !filter(o)) continue; const p = pkt(o); d = Math.min(d, Math.hypot(p.x - m.x, p.y - m.y)); } return d; };
      by.omR = { olje: nærmest(INFRA.olje, o => o.e.type === 3), kai: nærmest(INFRA.ferjekai), kraft: nærmest(INFRA.kraft), kaier: false }; }
    // kaiene fra OpenStreetMap (spill/kaier.js) tas med når de er lastet: havner og ferjeterminaler teller, småbrygger og småbåthavner gjør ikke
    if (!by.omR.kaier) try { const K = window.KaierSpill && KaierSpill.data(); if (K) { by.omR.kaier = true; const f = window.Kaier.nær(K, m.x, m.y, R.nær.kai, i => K.t[i] >= 3); if (f) by.omR.kai = Math.min(by.omR.kai, f.d); } } catch (e) { by.omR.kaier = true; }
    return by.omR;
  }
  const typeAv = by => RG.type(by.e.folk || 0, omgivelser(by));
  const garnison = by => G.lagI(by, ENHETER.filter(s => s.side === 'blå')).length > 0;
  const strøm = by => (window.GarnisonSpill ? GarnisonSpill.strømFor(by) : true);
  const fiender = () => ENHETER.filter(e => e.side !== 'blå' && levende(e));
  const egne = () => ENHETER.filter(e => e.side === 'blå' && levende(e) && !e.karakter);
  // Stillingen for alle tettstedene dine: strøm, garnison, rute. Regnes høyst hvert tredje sekund.
  function status(tving) {
    if (!tving && performance.now() - statusTid < 3000) return STATUS; statusTid = performance.now();
    const M = mine(), l = leir(), ut = new Map(); if (!l) { STATUS = ut; return ut; }
    const P = M.map(by => ({ id: by.e.id, navn: by.e.navn, x: midt(by).x, y: midt(by).y })), fi = fiender(), eg = egne();
    M.forEach((by, i) => { const b = RG.by(S, by.e.id), rute = RG.rute(P[i], P, l, fi, eg);
      ut.set(by.e.id, { by, b, type: typeAv(by), strøm: strøm(by), garnison: garnison(by), rute }); });
    STATUS = ut; return ut;
  }
  const stFor = q => ({ loj: q.b.loj, skatt: q.b.skatt, strøm: q.strøm, rute: q.rute.status, uro: q.b.uro, garnison: q.garnison, utenStrøm: G.REGLER.strøm.uten });
  const girNå = q => RG.gir(q.by.e.folk || 0, q.type, stFor(q));
  function sum() { const ut = {}; for (const q of status().values()) { const g = girNå(q); for (const k of RG.VARER) if (g[k]) ut[k] = (ut[k] || 0) + g[k]; } return ut; }

  // ---------- takten ----------
  const melding = (t, god) => { if (window.SpilletSpill && SpilletSpill.varsel) SpilletSpill.varsel(t, god); else logg(t); };
  function steg(d) {
    const ST = status();
    for (const q of ST.values()) { const b = q.b, navn = q.by.e.navn, st = stFor(q);
      b.loj = RG.lojSteg(b.loj, st, d);
      const o = RG.opprør(b.loj, q.garnison);
      if (o === 'tapt') { TETTSTEDER.set(q.by.e.id, { eier: null, inntar: null }); b.loj = R.lojEtterOpprør; b.uro = false; b.skatt = 'vanlig'; statusTid = -1e9; skitten = true;
        logg(`OPPRØR i ${navn}! Folket har jaget skatteoppkreverne dine, og tettstedet er nøytralt igjen. Hard skatt uten garnison går ikke i lengden.`); continue; }
      if (o === 'uro' && !b.uro) { b.uro = true; logg(`Uro i ${navn}: folk nekter å levere. Garnisonen holder tettstedet, men det gir bare halvparten til skatten lettes.`); }
      if (!o && b.uro && b.loj > R.opprørVed + 10) { b.uro = false; logg(`${navn} har roet seg.`); }
      // meldinger når ruta eller strømmen skifter
      const fr = meldtRute.get(q.by.e.id), rs = q.rute.status;
      if (fr !== undefined && fr !== rs) logg(rs === 'åpen' ? `Handelsruta fra ${navn} er åpen igjen.` : rs === 'truet' ? `Handelsruta fra ${navn} er truet: fiender i nærheten. Bare halvparten kommer fram – sett et lag til å vokte ruta.` : `Handelsruta fra ${navn} er STENGT av fiender. Ingenting kommer fram før de er borte eller et lag vokter ruta.`);
      meldtRute.set(q.by.e.id, rs);
      const fs = meldtStrøm.get(q.by.e.id); if (fs !== undefined && fs !== q.strøm) logg(q.strøm ? `${navn} har fått strømmen tilbake.` : `${navn} har mistet strømmen: tettstedet gir mindre og blir misfornøyd til et kraftverk i nærheten virker igjen.`);
      meldtStrøm.set(q.by.e.id, q.strøm);
      const g = RG.gir(q.by.e.folk || 0, q.type, st); for (const k of RG.VARER) if (g[k]) S.pott[k] = (S.pott[k] || 0) + g[k] * d;
    }
    const t0 = Math.floor(S.time), d0 = Math.floor(S.døgn); S.time += d * 24; S.døgn += d;
    if (Math.floor(S.time) !== t0) lever();
    if (Math.floor(S.døgn) !== d0) nyttDøgn();
  }
  // Det som har kommet fram, legges i leiren (hele rasjoner og liter, materialer i tideler). Fullt lager = resten venter (høyst et døgn).
  function lever() {
    const l = L(), f = F(), P = S.pott, fikk = (k, v) => { if (v) S.sist[k] = (S.sist[k] || 0) + v; };
    if (f && P.mat >= 1) { const n = Math.floor(P.mat); f.mat += n; P.mat -= n; fikk('mat', n); }
    if (l) { for (const k of ['tre', 'betong', 'stål']) { if (!(P[k] >= .1)) continue; const m = LB.leggInn(l, k, Math.floor(P[k] * 10) / 10); P[k] -= m; fikk(k, m); P[k] = Math.min(P[k], 30); }
      if (P.diesel >= 1) { const n = Math.max(0, Math.min(Math.floor(P.diesel), Math.floor(LB.kapasitet(l) - l.drivstoff))); l.drivstoff += n; P.diesel -= n; fikk('diesel', n); P.diesel = Math.min(P.diesel, 600); } }
    if (f && l && P.folk >= 1) { const o = window.FolkSpill && FolkSpill.valg ? FolkSpill.valg() : {};
      if (!FR.kanRekruttere(f, l, o)) { const r = FR.rekrutter(f, l, () => true, o); if (r && !r.feil) { P.folk -= 1; fikk('folk', 1); logg(`${r.person.navn} (${r.person.yrke}) kom med handelsruta fra byen og er med i gjengen.`); } }
      P.folk = Math.min(P.folk, 2); }
    if (P.penger >= 1000) { const v = Math.round(P.penger); OppstartSpill.gi(v); P.penger = 0; fikk('penger', v); }
    else if (P.penger <= -1000) { const v = Math.round(-P.penger); P.penger = 0;
      if (OppstartSpill.betal(v)) fikk('penger', -v); else { for (const b of Object.values(S.byer)) if (b.skatt === 'støtte') b.skatt = 'vanlig'; logg('Kassa er tom: støtten til tettstedene er stoppet, og de betaler vanlig skatt igjen.'); } }
    lagre(); if (window.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); vis();
  }
  function nyttDøgn() {
    if (mine().length) { const t = RG.girTekst(S.sist, kr); logg(t === 'ingenting' ? 'Regionen: ingenting kom fram til leiren det siste døgnet.' : `Regionen ga det siste døgnet: ${t}.`); }
    S.sist = {};
    // svartebørsen: gårsdagens selger drar, kanskje kommer en ny
    S.børs = { tilbud: RG.Bors.tilbud(Math.random, S.har), dag: Math.floor(S.døgn) };
    if (S.børs.tilbud.length) melding(`Svartebørsen: en selger er i leiren i dag med ${S.børs.tilbud.map(id => RG.Bors.VARER[id].navn.toLowerCase()).join(' og ')}. Se «Region».`, true);
    lagre();
  }
  KROKER.sim.push(dt => { spillAkk += dt / 1440; });
  setInterval(() => { if (!klar || !leir()) return; if (typeof tempo !== 'undefined' && tempo > 0 && !document.hidden) { const d = Math.max(spillAkk, 1 / R.døgnEkteSek); spillAkk = 0; if (auto()) steg(d); } else spillAkk = 0;
    if (åpen) { const lm = document.getElementById('leirmeny'); if ((window.StrategiSpill && StrategiSpill.erÅpen && StrategiSpill.erÅpen()) || (lm && lm.classList.contains('på') && performance.now() - åpnet > 1500)) lukk(); else vis(); } }, 1000);

  // ---------- svartebørsen ----------
  const klokketime = () => (6 + tid / TIME) % 24;
  KROKER.sikt.push(s => (s.side === 'blå' && S.har.nattsikt && RG.Bors.natt(klokketime()) ? RG.Bors.VARER.nattsikt.sikt : 1));
  KROKER.ild.push(a => (a.side === 'blå' && S.har.våpen ? RG.Bors.treff(S.har) : 1));
  function brukMedisin() {
    if (!(S.medisin > 0)) return { feil: 'Dere har ingen medisiner.' }; let n = 0, syke = 0; const V = RG.Bors.VARER.medisin;
    for (const s of ENHETER) { if (s.side !== 'blå') continue; for (const m of s.menn) if (m.hp > 0 && m.hp < 1 && n < V.sårede) { m.hp = 1; n++; } }
    const f = F(); if (f) for (const p of f.personer) if (p.helse < 1) { p.helse = 1; syke++; }
    if (!n && !syke) return { feil: 'Ingen er såret eller syke nå. Medisinene ligger på lager.' };
    S.medisin--; lagre(); skitten = true; const t = `Medisinene er brukt: ${n} sårede soldater er kampklare` + (syke ? ` og ${syke} i leiren er friske` : '') + '.'; logg(t); return { ok: true, sårede: n, syke }; }
  function kjøp(id) {
    if (window.SPILLREGLER && SPILLREGLER.har('ingenKjøp')) return { feil: 'Utfordringen «Ingen kjøp»: dere handler ikke på svartebørsen.' };
    const V = RG.Bors.VARER[id]; if (!V || !S.børs.tilbud.includes(id)) return { feil: 'Selgeren har ikke dette i dag.' };
    if (!RG.Bors.kan(id, S.har)) return { feil: 'Dere har alt dette.' };
    const l = L(); let liter = 0; if (id === 'smugler') { liter = l ? Math.min(V.liter, Math.floor(LB.kapasitet(l) - l.drivstoff)) : 0; if (liter < 1) return { feil: 'Ingen plass til mer diesel: bygg en dieseltank.' }; }
    if (!OppstartSpill.betal(V.pris)) return { feil: `Ikke nok penger (${kr(V.pris)}).` };
    S.børs.tilbud = S.børs.tilbud.filter(q => q !== id); S.har[id] = (S.har[id] || 0) + 1;
    if (id === 'medisin') { S.medisin++; const r = brukMedisin(); if (r.feil) logg('Medisinene er kjøpt og ligger på lager til noen trenger dem (knappen «Bruk medisiner» i Region).'); }
    else if (id === 'smugler') { l.drivstoff += liter; logg(`Smuglerdiesel: ${liter} liter er fylt på tankene.`); if (LeirSpill.lagre) LeirSpill.lagre(); }
    else if (id === 'nattsikt') { logg('Nattsikt kjøpt: lagene dine ser lenger om natta.'); for (const e of ENHETER) if (e.side === 'blå') e.siktSkitten = true; }
    else logg(`${V.navn} kjøpt: lagene dine treffer bedre.`);
    lagre(); skitten = true; vis(true); return { ok: true }; }

  // ---------- motstandernes tettsteder ----------
  // RegionSpill.fordel(side) = { treff, forsterk, antall, typer } – det en motstander får av tettstedene den holder (Region.fordel).
  // Brukes her (KROKER.ild) og i garnison-visning.js (forsterkning). Andre moduler (AI-en) kan lese den samme. Ikke i testene.
  const INGEN = { treff: 1, forsterk: 1, antall: 0, typer: [] }; let fordelTid = -1e9, FORDELER = {};
  function fordel(side) { if (!klar || !auto() || !side || side === 'blå') return INGEN;
    if (performance.now() - fordelTid > 3000) { fordelTid = performance.now(); const T = {}; for (const [id, t] of TETTSTEDER) { if (!t.eier || t.eier === 'blå') continue; const by = byMedId(id); if (by) (T[t.eier] = T[t.eier] || []).push(typeAv(by)); }
      FORDELER = {}; for (const [sd, typer] of Object.entries(T)) FORDELER[sd] = { ...RG.fordel(typer), typer }; }
    return FORDELER[side] || INGEN; }
  let BYID = null; const byMedId = id => { if (!BYID || BYID.n !== byer().length) { BYID = { n: byer().length, m: new Map(byer().map(by => [by.e.id, by])) }; } return BYID.m.get(id); };
  KROKER.ild.push(a => (a.side !== 'blå' ? fordel(a.side).treff : 1));

  // ---------- veksling olje ↔ diesel ----------
  const base = () => (window.OLJE && OLJE.BASER[0]) || null;
  function veksle(til, tonn = R.veksle.parti) { const b = base(), l = L(); if (!b || !l) return { feil: 'Basen eller leiren er ikke klar.' };
    if (til === 'diesel') { const r = RG.Veksle.tilDiesel(tonn, b.beholdning, LB.kapasitet(l) - l.drivstoff); if (r.feil) return r; b.beholdning -= r.tonn; l.drivstoff += r.liter; logg(`Feltraffineriet: ${r.tonn} t olje ble til ${r.liter} liter diesel.`); if (LeirSpill.lagre) LeirSpill.lagre(); vis(true); return r; }
    const r = RG.Veksle.tilOlje(tonn, l.drivstoff); if (r.feil) return r; l.drivstoff -= r.liter; b.beholdning += r.tonn; logg(`${r.liter} liter diesel er blandet til ${r.tonn} t olje på basen.`); if (LeirSpill.lagre) LeirSpill.lagre(); vis(true); return r; }

  // ---------- gjenoppbygging ----------
  (KROKER.ødelagt = KROKER.ødelagt || []).push((o, hva) => {
    if (hva !== 'reparer' || !auto() || !klar || (o.lag !== 'bru' && o.lag !== 'kraft')) return;
    const a = o.deler[0], x = o.lag === 'bru' ? (a[0] + a[a.length - 2]) / 2 : a[0], y = o.lag === 'bru' ? (a[1] + a[a.length - 1]) / 2 : a[1];
    // bare når det er dine folk som har reparert (et eget lag står ved stedet)
    if (!ENHETER.some(s => s.side === 'blå' && levende(s) && Math.hypot(s.x - x, s.y - y) < 1200)) return;
    const r = gjenoppbygg(x, y), hva2 = o.lag === 'bru' ? 'brua' : 'kraftverket';
    if (r.lojale.length) logg(`Folk i ${r.lojale.join(', ')} setter pris på at dere reparerte ${hva2}: lojaliteten stiger.`);
    if (r.vunnet) melding(`${r.vunnet} slutter seg til dere etter at dere reparerte ${hva2}!`, true);
  });
  function gjenoppbygg(x, y) {
    const fi = fiender(), B = byer().map(by => ({ id: by.e.id, x: midt(by).x, y: midt(by).y, eier: eier(by) || null, fiendeI: fi.some(e => G.inni(by, e.x, e.y)), by }));
    const r = RG.gjenoppbygg(x, y, B), navn = id => B.find(b => b.id === id).by.e.navn, ut = { lojale: [], vunnet: null };
    for (const id of r.lojale) { const b = RG.by(S, id); b.loj = Math.min(100, b.loj + r.pluss); ut.lojale.push(navn(id)); }
    if (r.vunnet !== null) { TETTSTEDER.set(r.vunnet, { eier: 'blå', inntar: null }); RG.by(S, r.vunnet).loj = 60; ut.vunnet = navn(r.vunnet); }
    statusTid = -1e9; skitten = true; lagre(); vis(true); return ut; }

  // ---------- skatt ----------
  function settSkatt(id, skatt) { if (!RG.settSkatt(S, id, skatt)) return false; statusTid = -1e9; lagre(); vis(true); skitten = true; return true; }
  function settAlle(skatt) { for (const by of mine()) RG.settSkatt(S, by.e.id, skatt); statusTid = -1e9; lagre(); vis(true); skitten = true; }

  // ---------- panelet ----------
  const css = document.createElement('style');
  css.textContent = `#region{ position:fixed; left:10px; top:calc(var(--topp,58px) + 56px); z-index:11; display:none; width:min(390px,94vw); max-height:calc(100vh - var(--topp,58px) - 130px); overflow:auto; padding:10px 12px 12px; background:#1c170f; border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; }
#region.på{ display:block; } #region h2{ margin:0 26px 2px 0; font-size:19px; } #region h3{ margin:12px 0 3px; font-size:12.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-dim,#a99); }
#region .lukk{ position:absolute; right:6px; top:4px; background:none; border:0; color:inherit; font-size:22px; min-width:34px; min-height:34px; cursor:pointer; }
#region small{ color:var(--ink-dim,#a99); font-size:12.5px; line-height:1.3; } #region .ingress{ display:block; margin-bottom:4px; }
#region .by{ border:1px solid #4a4030; padding:7px 9px; margin:6px 0; background:#221c12; } #region .by.fare{ border-color:#c96a4a; } #region .by .n{ display:flex; justify-content:space-between; gap:8px; align-items:baseline; } #region .by .n small{ white-space:nowrap; }
#region .by .gir{ margin:3px 0; } #region .by .gir b{ color:#f0d79a; font-weight:600; }
#region .loj{ position:relative; height:9px; background:#2e281e; margin:4px 0 2px; } #region .loj i{ display:block; height:100%; background:#8fb86a; } #region .loj.lav i{ background:#c8553d; } #region .loj.mid i{ background:#e8c547; }
#region .brikker{ display:flex; flex-wrap:wrap; gap:4px; margin:4px 0; } #region .brikke{ padding:1px 7px; border:1px solid #4a4030; font-size:12.5px; } #region .brikke.god{ border-color:#6f8f50; color:#cfe6b4; } #region .brikke.obs{ border-color:#b89a3a; color:#f0dc9a; } #region .brikke.ille{ border-color:#c96a4a; color:#f6c9b6; }
#region .skatt{ display:flex; gap:4px; margin-top:5px; } #region .skatt button{ flex:1; padding:2px 4px; }
#region button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); min-height:34px; padding:2px 10px; font:inherit; font-size:13px; cursor:pointer; } #region button.på{ border-color:#c9b26a; background:#3a3020; color:#f0d79a; } #region button:disabled{ opacity:.45; }
#region .rad{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:5px 0; border-bottom:1px solid #2e281e; } #region .rad small{ display:block; } #region .kn{ display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
#region .sum{ border:1px solid #c9b26a; padding:6px 9px; margin:6px 0; background:#221c12; } #region .sum b{ color:#f0d79a; }
body.smal #region, body.kort #region{ left:0; right:0; top:auto; bottom:0; width:auto; max-height:46vh; border-width:1px 0 0; }`;
  document.head.appendChild(css);
  const panel = el('div', { id: 'region', role: 'dialog', 'aria-label': 'Regionen' }); document.body.appendChild(panel);
  const RUTEORD = { åpen: ['åpen', 'god'], truet: ['truet', 'obs'], stengt: ['stengt', 'ille'] };
  const km = m => (m >= 1000 ? tall(m / 1000) + ' km' : Math.round(m / 10) * 10 + ' m');
  function kort(q) {
    const by = q.by, b = q.b, T = RG.TYPER[q.type], g = girNå(q), ro = RUTEORD[q.rute.status], fare = q.rute.status !== 'åpen' || b.loj < 30 || !q.strøm;
    const k = el('div', { klasse: 'by' + (fare ? ' fare' : ''), 'data-by': by.e.id });
    k.append(el('div', { klasse: 'n' }, el('b', {}, by.e.navn), el('small', {}, `${T.navn} · ${(by.e.folk || 0).toLocaleString('nb-NO')} innb.`)));
    k.append(el('div', { klasse: 'gir' }, 'Gir nå per døgn: ', el('b', {}, RG.girTekst(g, kr))));
    k.append(el('div', { klasse: 'loj ' + (b.loj < 30 ? 'lav' : b.loj < 50 ? 'mid' : '') }, el('i', { style: `width:${Math.round(b.loj)}%` })));
    k.append(el('small', {}, `Lojalitet ${Math.round(b.loj)} av 100 – ${RG.lojOrd(b.loj)}` + (b.uro ? ' (uro: gir halvparten)' : '') + `. Går mot ${RG.lojMål(stFor(q))}.`));
    const br = el('div', { klasse: 'brikker' });
    br.append(el('span', { klasse: 'brikke ' + ro[1] }, 'Rute: ' + ro[0] + (q.rute.via.length ? ' via ' + q.rute.via.join(', ') : '')));
    br.append(el('span', { klasse: 'brikke ' + (q.strøm ? 'god' : 'ille') }, q.strøm ? 'Har strøm' : `Uten strøm: ${Math.round(G.REGLER.strøm.uten * 100)} %`));
    br.append(el('span', { klasse: 'brikke ' + (q.garnison ? 'god' : 'obs') }, q.garnison ? 'Garnison' : 'Ingen garnison'));
    k.append(br);
    const verst = q.rute.ledd.reduce((a, l) => (l.meter < a.meter ? l : a), { meter: Infinity });
    if (q.rute.status !== 'åpen') k.append(el('small', {}, `Fiender ${km(verst.meter)} fra ruta. ` + (q.rute.status === 'stengt' ? 'Ingenting kommer fram.' : 'Halvparten kommer fram.') + ' Jag dem bort, eller sett et lag ved ruta som vakt.'));
    else if (verst.vakt && verst.meter < R.rute.truet) k.append(el('small', {}, 'Et av lagene dine vokter ruta.'));
    const sk = el('div', { klasse: 'skatt', role: 'group', 'aria-label': 'Skatt' });
    for (const id of RG.SKATTER) { const X = RG.SKATT[id]; sk.append(kn(X.navn, () => settSkatt(by.e.id, id), { klasse: b.skatt === id ? 'på' : '', title: X.tekst, 'data-skatt': id })); }
    k.append(sk); k.append(el('small', {}, RG.SKATT[b.skatt].tekst));
    k.append(el('div', { klasse: 'kn' }, kn('Vis i kartet', () => visIKart(q))));
    return k;
  }
  function bygg() {
    const ut = el('div'), ST = status(true), l = leir(), s = sum();
    ut.append(kn('×', lukk, { klasse: 'lukk', 'aria-label': 'Lukk' }), el('h2', {}, 'Regionen'));
    ut.append(el('small', { klasse: 'ingress' }, 'Tettstedene du holder, sender varer og skatt til leiren. Et døgn her er et spilldøgn eller ti minutter spilling.'));
    if (!ST.size) ut.append(el('div', { klasse: 'sum' }, 'Du holder ingen tettsteder ennå. Et lag som står 30 minutter i et tettsted uten fiender, tar det – se under hva de nærmeste er verdt.'));
    else { ut.append(el('div', { klasse: 'sum', id: 'regionsum' }, `${ST.size} tettsted${ST.size === 1 ? '' : 'er'} gir nå per døgn: `, el('b', {}, RG.girTekst(s, kr)), '.'));
      if (!auto()) ut.append(el('small', {}, 'Test: leveransene står stille.'));
      if (ST.size > 1) { const alle = el('div', { klasse: 'skatt' }); for (const id of RG.SKATTER) alle.append(kn('Alle: ' + RG.SKATT[id].navn.toLowerCase(), () => settAlle(id))); ut.append(alle); }
      ut.append(el('h3', {}, 'Tettstedene dine'));
      for (const q of [...ST.values()].sort((a, b) => (b.by.e.folk || 0) - (a.by.e.folk || 0))) ut.append(kort(q)); }
    // de nærmeste du ikke holder
    if (l) { const andre = byer().filter(by => eier(by) !== 'blå').map(by => ({ by, d: Math.hypot(midt(by).x - l.x, midt(by).y - l.y) })).sort((a, b) => a.d - b.d).slice(0, 4);
      if (andre.length) { ut.append(el('h3', {}, 'Verdt å ta'));
        for (const { by, d } of andre) { const t = typeAv(by), e = eier(by), hvem = e ? (window.Fraksjoner && Fraksjoner.FRAKSJONER[e] ? Fraksjoner.FRAKSJONER[e].navn : 'fienden') : 'nøytralt';
          ut.append(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, by.e.navn), el('small', {}, `${RG.TYPER[t].navn} (${RG.TYPER[t].tekst}) · ${km(d)} · ${hvem}`), el('small', {}, 'Ville gitt: ' + RG.girTekst(RG.grunn(by.e.folk || 0, t), kr))),
            kn('Vis', () => { if (typeof på3d !== 'undefined' && på3d) slå3d(false); kam.x = midt(by).x; kam.y = midt(by).y; kam.m = Math.min(Math.max(kam.m, 6), 20); skitten = true; }))); } } }
    // motstanderne har også nytte av tettstedene sine
    { fordelTid = -1e9; const rader = []; for (const sd of ['rød', 'grønn']) { const f = fordel(sd); if (!f.antall) continue; const navn = window.Fraksjoner && Fraksjoner.FRAKSJONER[sd] ? Fraksjoner.FRAKSJONER[sd].navn : sd;
        rader.push(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, navn), el('small', {}, `holder ${f.antall} tettsted${f.antall === 1 ? '' : 'er'}: treff +${Math.round((f.treff - 1) * 100)} %, garnisonene forsterkes ${Math.round((f.forsterk - 1) * 100)} % raskere`)))); }
      if (rader.length) { ut.append(el('h3', {}, 'Motstanderne')); ut.append(...rader); ut.append(el('small', {}, 'Industristeder, byer og oljebyer gir dem bedre våpen; bygder og havner gir folk. Ta tettstedene fra dem, så mister de fordelen.')); } }
    // svartebørsen
    ut.append(el('h3', {}, 'Svartebørsen'));
    if (!S.børs.tilbud.length) ut.append(el('small', {}, 'Ingen selger i leiren i dag. Han dukker opp av og til med ting markedet ikke har – dyrt.'));
    for (const id of S.børs.tilbud) { const V = RG.Bors.VARER[id]; ut.append(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, V.navn), el('small', {}, V.tekst)), kn(`Kjøp (${kr(V.pris)})`, () => { const r = kjøp(id); if (r.feil) logg(r.feil); }, { 'data-bors': id }))); }
    const eid = []; if (S.har.nattsikt) eid.push('nattsikt'); if (S.har.våpen) eid.push(`tunge våpen ×${S.har.våpen} (treff +${Math.round((RG.Bors.treff(S.har) - 1) * 100)} %)`);
    if (eid.length) ut.append(el('small', {}, 'Dere har: ' + eid.join(', ') + '.'));
    if (S.medisin > 0) ut.append(el('div', { klasse: 'kn' }, kn(`Bruk medisiner (${S.medisin} på lager)`, () => { const r = brukMedisin(); if (r.feil) logg(r.feil); vis(true); })));
    // drivstoff
    const b = base(), le = L();
    if (b && le) { ut.append(el('h3', {}, 'Olje og diesel'));
      ut.append(el('small', { id: 'vekseltekst' }, RG.Veksle.tekst()));
      ut.append(el('div', { klasse: 'rad' }, el('div', {}, `Basen: ${Math.floor(b.beholdning).toLocaleString('nb-NO')} t olje`, el('small', {}, `Leiren: ${Math.floor(le.drivstoff).toLocaleString('nb-NO')} av ${Math.floor(LB.kapasitet(le)).toLocaleString('nb-NO')} l diesel`))));
      ut.append(el('div', { klasse: 'kn' }, kn(`${R.veksle.parti} t olje → ${R.veksle.parti * R.veksle.literPerTonn} l diesel`, () => { const r = veksle('diesel'); if (r.feil) logg(r.feil); }, { id: 'tildiesel' }),
        kn(`${R.veksle.parti * R.veksle.literForTonn} l diesel → ${R.veksle.parti} t olje`, () => { const r = veksle('olje'); if (r.feil) logg(r.feil); }, { id: 'tilolje' }))); }
    // markedets hyller
    const H = window.SpilletSpill && SpilletSpill.knapt && SpilletSpill.knapt() ? SpilletSpill.hyller() : null;
    if (H) { const E = window.Spillet.Marked.ENHET; ut.append(el('h3', {}, 'Markedets hyller'));
      ut.append(el('small', {}, ['tre', 'betong', 'stål', 'diesel', 'mat'].map(v => `${v} ${H[v] >= 1 ? Math.floor(H[v]) + ' ' + E[v] : 'TOMT'}`).join(' · ') + '. Hyllene fylles sakte hvert døgn.')); }
    return ut;
  }
  function vis(tving) { if (!åpen) return; if (!tving && window.pekerNede && pekerNede(panel)) return;
    const ny = el('div'); ny.append(bygg()); if (!tving && ny.innerHTML === sist) return; sist = ny.innerHTML; const topp = panel.scrollTop; panel.replaceChildren(...ny.firstChild.childNodes); panel.scrollTop = topp; }
  function åpne() { if (!klar) return; if (window.StrategiSpill && StrategiSpill.erÅpen && StrategiSpill.erÅpen()) StrategiSpill.lukk(); if (window.lukkPanel) lukkPanel();
    const lm = document.getElementById('leirmeny'); if (lm && lm.classList.contains('på')) { const k = document.getElementById('leirknapp'); if (k) k.click(); }
    åpen = true; åpnet = performance.now(); panel.classList.add('på'); document.body.classList.add('region'); sist = ''; vis(true); skitten = true; }
  function lukk() { if (!åpen) return; åpen = false; panel.classList.remove('på'); document.body.classList.remove('region'); skitten = true; }
  // Kartet: 2D, og zoom så hele ruta synes ved siden av panelet
  function visIKart(q) { if (typeof på3d !== 'undefined' && på3d && typeof slå3d === 'function') slå3d(false);
    const P = q.rute.punkter, xs = P.map(p => p.x), ys = P.map(p => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const smal = document.body.classList.contains('smal') || document.body.classList.contains('kort'), pb = smal ? 0 : 410;
    kam.m = Math.max(2, Math.max((x1 - x0) * 1.8 / Math.max(200, VW - pb), (y1 - y0) * 1.8 / Math.max(200, VH * (smal ? .45 : 1) - 160)));
    kam.x = (x0 + x1) / 2 - pb / 2 * kam.m; kam.y = (y0 + y1) / 2 - (smal ? VH * .22 * kam.m : -30 * kam.m); skitten = true; }
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && åpen) lukk(); });

  // ---------- kartet: rutene og hva tettstedene gir ----------
  const FARGE = { åpen: '#9fc46a', truet: '#e8c547', stengt: '#d9654a' };
  const krigÅpen = () => !!(window.StrategiSpill && StrategiSpill.erÅpen && StrategiSpill.erÅpen());
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!klar || typeof INFRA === 'undefined' || !INFRA) return; const m = kam.m, tydelig = åpen || krigÅpen(); if (!tydelig && m < 18) return;
    const sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m, ST = status(), l = leir(); if (!l) return;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    const tegnet = new Set();
    for (const q of ST.values()) { const P = q.rute.punkter;
      for (let i = 0; i + 1 < P.length; i++) { const nk = P[i].id + '>' + P[i + 1].id; if (tegnet.has(nk)) continue; tegnet.add(nk); const st = q.rute.ledd[i].status;
        const ax = sx(P[i].x), ay = sy(P[i].y), bx = sx(P[i + 1].x), by = sy(P[i + 1].y);
        g.strokeStyle = 'rgba(15,11,7,.7)'; g.lineWidth = 5; g.setLineDash([]); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
        g.strokeStyle = FARGE[st]; g.lineWidth = 2.5; g.setLineDash(st === 'åpen' ? [10, 6] : [4, 6]); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]);
        if (st !== 'åpen' && tydelig) { const tx = (ax + bx) / 2, ty = (ay + by) / 2, t = st === 'stengt' ? 'RUTA ER STENGT' : 'ruta er truet'; g.font = '600 12px "Cormorant Garamond",serif'; g.textAlign = 'center';
          g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(t, tx, ty - 6); g.fillStyle = FARGE[st]; g.fillText(t, tx, ty - 6); } } }
    // hva tettstedene er og gir (bare når Region eller krigskartet er åpent)
    if (tydelig) { g.font = '13px "Cormorant Garamond",serif'; g.textAlign = 'center';
      for (const by of byer()) { const c = midt(by); if (Math.hypot(c.x - l.x, c.y - l.y) > 80000) continue; const x = sx(c.x), y = sy(c.y); if (x < -40 || x > VW + 40 || y < -20 || y > VH + 40) continue;
        const q = ST.get(by.e.id); if (!q && (m > 45 && (by.e.folk || 0) < 1000 || m > 90)) continue; const t = typeAv(by), varer = Object.keys(RG.TYPER[t].gir).map(k => ({ mat: 'mat', tre: 'tre', stål: 'stål', betong: 'betong', diesel: 'diesel', folk: 'folk' })[k]).join(' + ');
        const tekst = `${RG.TYPER[t].navn}: ${varer}` + (q ? ` · lojalitet ${Math.round(q.b.loj)}` : '');
        g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(tekst, x, y + 30); g.fillStyle = q ? '#f0d79a' : '#d8cdb4'; g.fillText(tekst, x, y + 30); } }
    g.restore();
  });

  // ---------- krigskartets panel: type og ytelse på det valgte tettstedet og i «Neste trekk» ----------
  // strategi-visning.js eies av en annen pakke og er ikke endret: linjene legges til i panelet etter at det er tegnet. Observatøren ser bare
  // på panelets egne barn (ikke under dem), så linjene vi legger til, utløser den ikke på nytt.
  function pyntKrig() { const P = document.getElementById('krig'); if (!P || !klar) return; const l = leir();
    const linje = by => { const t = typeAv(by), q = STATUS.get(by.e.id); return el('small', { klasse: 'regionlinje', style: 'display:block;color:#d9c48a' }, `${RG.TYPER[t].navn}: ` + (q ? `gir nå ${RG.girTekst(girNå(q), kr)} per døgn` : `ville gitt deg ${RG.girTekst(RG.grunn(by.e.folk || 0, t), kr)} per døgn`)); };
    for (const r of P.querySelectorAll('.rad[data-trekk]')) { if (r.querySelector('.regionlinje')) continue; const by = byMedId(+r.dataset.trekk) || byMedId(r.dataset.trekk); if (by && r.firstChild) r.firstChild.append(linje(by)); }
    const boks = P.querySelector('.by'); if (boks && !boks.querySelector('.regionlinje')) { const navn = boks.querySelector('b') ? boks.querySelector('b').textContent : '', kn = boks.querySelector('[data-send]');
      let by = kn ? byMedId(+kn.dataset.send) || byMedId(kn.dataset.send) : null;
      if (!by && l) by = byer().filter(b => b.e.navn === navn).sort((a, b) => Math.hypot(midt(a).x - l.x, midt(a).y - l.y) - Math.hypot(midt(b).x - l.x, midt(b).y - l.y))[0];
      if (by) boks.insertBefore(linje(by), boks.querySelector('.kn')); } }
  { const P = document.getElementById('krig'); if (P && window.MutationObserver) new MutationObserver(() => { try { status(); pyntKrig(); } catch (e) { /* panelet virker uten linjene */ } }).observe(P, { childList: true }); }

  // ---------- tettstedspanelet (trykk på et tettsted i kartet) ----------
  KROKER.info.push(o => { const h = document.getElementById('hint'); if (!h || !klar) return;
    // kraftverket: sabotasje slår tilbake på deg når dine egne tettsteder får strømmen herfra
    if (o.lag === 'kraft') { const x = o.deler[0][0], y = o.deler[0][1], n = mine().filter(by => Math.hypot(midt(by).x - x, midt(by).y - y) <= G.REGLER.strøm.radius);
      if (n.length) h.textContent = `Gir strøm til ${n.length === 1 ? n[0].e.navn : n.length + ' av tettstedene dine'}: uten strøm gir de ${Math.round(G.REGLER.strøm.uten * 100)} % og blir misfornøyde. ` + h.textContent; return; }
    if (o.lag !== 'tettsted') return;
    const t = typeAv(o), T = RG.TYPER[t], q = status(true).get(o.e.id);
    h.textContent += ` ${T.navn} (${T.tekst}): ` + (q ? `gir nå ${RG.girTekst(girNå(q), kr)} per døgn. Lojalitet ${Math.round(q.b.loj)} (${RG.lojOrd(q.b.loj)}), skatt: ${RG.SKATT[q.b.skatt].navn.toLowerCase()}, handelsruta er ${q.rute.status}. Skatten velger du i «Region».`
      : `som ditt gir det ${RG.girTekst(RG.grunn(o.e.folk || 0, t), kr)} per døgn til leiren.`); });

  // ---------- Leir-menyen (fanen Lager) og kommandolinja ----------
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el: e, knapp }) => { if (!klar) return;
    hode.append(e('h3', { 'data-fane': 'lager' }, 'Regionen'));
    const n = mine().length, s = n ? sum() : null;
    hode.append(e('small', {}, n ? `${n} tettsted${n === 1 ? '' : 'er'} gir nå ${RG.girTekst(s, kr)} per døgn.` : 'Du holder ingen tettsteder. De gir mat, materialer, diesel, folk og skatt.'));
    hode.append(knapp('Åpne Region: tettsteder, ruter, skatt, svartebørs', () => åpne(), { id: 'regionknapp' })); });
  (window.KOMMANDO_TILLEGG = window.KOMMANDO_TILLEGG || []).push({ k: 'region', navn: 'Region', tast: '', ikon: "<path d='M3 20h18'/><path d='M5 20v-7l4-3v10'/><path d='M9 20V6l6-2v16'/><path d='M15 20v-9l4 2v7'/><path d='M12 8v1M12 12v1M12 16v1'/>",
    fins: () => klar, på: () => åpen, trykk: () => (åpen ? lukk() : åpne()), tittel: 'Regionen: hva tettstedene gir, handelsruter, skatt og lojalitet, svartebørs',
    merke: () => { let n = 0; for (const q of STATUS.values()) if (q.rute.status !== 'åpen' || q.b.loj < 30) n++; return n || ''; } });

  // ---------- start ----------
  function start() { const s = Sp(); if (!s || !s.leir) return; leirId = Math.round(s.leir.x) + ',' + Math.round(s.leir.y); S = RG.fraJSON(les()); STATUS = new Map(); statusTid = -1e9; meldtRute = new Map(); meldtStrøm = new Map(); klar = true; }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  Object.assign(api, { start, åpne, lukk, erÅpen: () => åpen, vis, tilstand: () => S, status: () => status(true), sum, steg, lever, nyttDøgn, settSkatt, settAlle, kjøp, brukMedisin, veksle, gjenoppbygg, typeAv, omgivelser, lagre, fordel, pyntKrig,
    børsNå: ider => { S.børs = { tilbud: ider.filter(id => RG.Bors.VARER[id]), dag: Math.floor(S.døgn) }; vis(true); }, sett: n => { S = RG.fraJSON(n); statusTid = -1e9; vis(true); }, klar: () => klar });
  window.RegionSpill = api;
})();
