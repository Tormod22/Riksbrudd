'use strict';
/* Riksbrudd – LAGERET MED HVERDAGSTING i spillet (28. nov, ut8-hverdag). Reglene: spill/ting.js (katalogen) og spill/tinglager.js (lagringen).
 *  - Tingene lagres per leir i «riksbrudd-ting» ({ leir: "x,y", t }), hvert 5. s når noe er endret og ved pagehide. Som gjest i flerspiller
 *    (LeirSpill.erSpeil) lagres og brukes ingenting.
 *  - PLASSENE: hyller og skap fra byggesettet (fanen Maskiner: hyllerekke, pallplass, pallreol, kjøleskap, kjølerom, frysboks, medisinskap,
 *    verktøytavle, garderobeskap, kiste, vanntønne) og leirens bygg med standardplass (lagertelt, container, brakke, sykestue, verksted,
 *    kjøkken). Det som ikke får plass, står ute i leiren og holder kortere. Kjøl og frys trenger strøm (LeirSpill.siste().mangler).
 *  - SIMULERINGEN (KROKER.sim, hvert spillminutt): alt eldes etter plassen, det som har råtnet kastes (melding i loggen hver spilltime),
 *    folkene rydder det som står ute inn på hyllene, og FOLKET BRUKER TINGENE:
 *     · mat fyller på leirens matlager (FolkSpill mat) når det er under ett døgn igjen – det som går ut først, spises først;
 *     · medisin gir raskere heling for de syke (FolkRegler.tingHeling), én dose per syk per døgn;
 *     · kaffe, sjokolade, tobakk … brukes opp og gir moral; kortstokker, bøker, gitarer og radioer (med batterier) gir moral så lenge de
 *       finnes (FolkRegler.tingMoral);
 *     · verktøy gir litt raskere arbeid for oppgaven sin (FolkRegler.tingTempo).
 *  - LETING: Leting.funn/Etasjer.funn gir f.ting; leting-visning.js kaller TinglagerSpill.leggInnFunn – tingene settes på hyllene.
 *  - VISNING: panelet «Lageret» (#tingpanel) fra Leir-menyen (fanen Lager), kommandolinja («Lager») og et trykk på en hylle/et skap i 2D
 *    (zoomet inn): kategoriene (sammenfoldet), antall per ting, hvor de står, hva som snart går ut på dato, og søk. Alt som endrer noe, går
 *    gjennom kommandolaget (tingFlytt, tingBruk, tingKast, tingSelg, tingSekk, tingFraSekk). Sekken (spill/utstyr.js) kan ta med ting.
 *  - 2D og 3D: hyllene og skapene i byggesettet får egne enkle former (FabrikkSpill.tegnDel / bygg3d pakkes inn).
 * window.TinglagerSpill. Alle tall er Claudes forslag (REGLER under, Ting.REGLER, Tinglager.REGLER).
 */
(function () {
  const TL = window.Tinglager, Ti = window.Ting, LB = window.Leir; if (!TL || !Ti || !LB) return;
  const NØKKEL = 'riksbrudd-ting', TI = Ti.TING;
  // Claudes forslag
  const REGLER = {
    // matlageret fylles fra tingene når det er under så mange døgn mat igjen
    matBuffer: 1,
    // så mange stabler folkene bærer inn per spilltime
    ryddPerTime: 12,
    // alderen (andel av holdbarheten) til ting som finnes i hus: ferskvarer har stått lenge, resten litt
    funnAlder: { kjøl: .6, frys: .6, annet: .15 },
    // 2D: hyllene viser fyllingen og tar trykk når kartet er zoomet inn under så mange meter per punkt
    visM: .5,
  };
  const ut = { test: false, REGLER };
  let T = null, Lnå = null, leirId = '', sistLagret = '', akk = 0, ryddAkk = 0, loggAkk = 0, klar = false;
  let råtnet = new Map(), heling = { f: 0, dekning: 0, id: null }, moralNå = { sum: 0 }, tempoNå = {}, spistAkk = 0;
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const leir = () => window.LeirSpill && LeirSpill.tilstand();
  const midt = () => { const S = spill(); return S && S.leir ? S.leir : null; };
  const speil = () => !!(window.LeirSpill && LeirSpill.erSpeil && LeirSpill.erSpeil());
  const kr = v => (LB.kroner ? LB.kroner(v) : Math.round(v) + ' kr');
  const tall = v => String(Math.round(v * 10) / 10).replace('.', ',');
  const stor = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

  // ---------- lasting og lagring (per leir, som spill/karakter.js) ----------
  function last() {
    const L = leir(), m = midt(); Lnå = L; T = null; if (!L || !m) return;
    leirId = Math.round(m.x) + ',' + Math.round(m.y);
    try { const d = speil() ? null : JSON.parse(localStorage.getItem(NØKKEL) || 'null'); if (d && d.leir === leirId) T = TL.fraJSON(d.t); } catch (e) { T = null; }
    if (!T) T = TL.ny(); sistLagret = ''; klar = true;
  }
  function lagre() { if (!T || !leirId || speil()) return; try { const t = JSON.stringify({ leir: leirId, t: TL.tilJSON(T) }); if (t !== sistLagret) { localStorage.setItem(NØKKEL, t); sistLagret = t; } } catch (e) { /* privat vindu */ } }
  const sikre = () => { const L = leir(); if (L !== Lnå) last(); return !!(T && L); };
  window.addEventListener('riksbrudd-spill', () => setTimeout(() => { last(); vis(); }, 0));
  window.addEventListener('pagehide', lagre); setInterval(lagre, 5000);

  // plassene nå (kjøl og frys virker bare med strøm)
  function plasser() { const L = leir(); if (!L) return []; const S = window.LeirSpill && LeirSpill.siste ? LeirSpill.siste() : null, M = S && S.mangler;
    return TL.plasser(LB, L, { strøm: b => !(M && M.has && M.has(b.id)) }); }
  const plassNavn = (P, pid) => { const q = P.find(x => x.id === pid); return q ? q.navn : 'Ute i leiren'; };
  const alderVedFunn = id => { const g = TI[id]; if (!g || !g.hold) return 0; const A = REGLER.funnAlder; return g.hold * (g.lag === 'kjøl' ? A.kjøl : g.lag === 'frys' ? A.frys : A.annet); };

  // ---------- simuleringen ----------
  // ett steg på dt spillminutter (kalles fra KROKER.sim når et spillminutt er samlet opp; vakta kaller det selv)
  function steg(dt) {
    if (!sikre() || speil() || !(dt > 0)) return null; const P = plasser(); TL.avstem(T, P);
    for (const b of TL.eld(T, P, dt)) { const k = b.t + '|' + (b.p === 'ute' ? 'ute' : 'inne'); råtnet.set(k, (råtnet.get(k) || 0) + b.n); }
    ryddAkk += dt * REGLER.ryddPerTime / 60; if (ryddAkk >= 1) { TL.rydd(T, P, Math.floor(ryddAkk)); ryddAkk -= Math.floor(ryddAkk); }
    const F = window.FolkSpill && FolkSpill.tilstand(); let spist = 0;
    if (F && F.personer && F.personer.length) {
      const per = (F.sist && F.sist.spiser > 0 ? F.sist.spiser : F.personer.length), mål = per * REGLER.matBuffer;
      if ((F.mat || 0) < mål && TL.matIAlt(T) > 0) { const r = TL.spis(T, P, mål - (F.mat || 0)); F.mat = (F.mat || 0) + r.spist; spist = r.spist; spistAkk += r.spist; }
      heling = TL.medisin(T, P, F.personer.filter(p => p.helse < 1).length, dt);
      moralNå = TL.moral(T, P, F.personer.length, dt);
      const FR = window.FolkRegler; tempoNå = {}; if (FR) for (const o of FR.OPPGAVER) if (o !== 'fri') { const t = TL.tempo(T, o, FR.arbeidere(F, o)); if (t.f > 0) tempoNå[o] = t.f; }
    } else { heling = { f: 0, dekning: 0, id: null }; moralNå = { sum: 0 }; tempoNå = {}; }
    loggAkk += dt; if (loggAkk >= 60) { loggAkk = 0; meldRåtnet(); }
    return { spist };
  }
  function meldRåtnet() { if (!råtnet.size || typeof logg !== 'function') { råtnet.clear(); return; }
    const d = [...råtnet].map(([k, n]) => { const [t, h] = k.split('|'); return Ti.antall(t, n) + (h === 'ute' ? ' (lå ute)' : TI[t] && TI[t].lag === 'kjøl' ? ' (uten kjøl)' : ''); });
    logg(`Kastet – for gammelt: ${d.slice(0, 4).join(', ')}${d.length > 4 ? ` og ${d.length - 4} andre ting` : ''}.`); råtnet.clear(); }
  if (typeof KROKER !== 'undefined') KROKER.sim.push(dt => { if (!klar || speil()) return; akk += dt; if (akk >= 1) { const d = akk; akk = 0; steg(d); } });
  // krokene i folk.js: medisin, moral og verktøy (uten tingene 1 / 0 som før)
  function kroker() { const FR = window.FolkRegler; if (!FR) return false;
    FR.tingHeling = () => (T && heling.f > 0 ? 1 + heling.f * heling.dekning : 1);
    FR.tingMoral = () => (T ? moralNå.sum || 0 : 0);
    FR.tingTempo = o => (T && tempoNå[o] ? 1 + tempoNå[o] : 1); return true; }
  if (!kroker()) document.addEventListener('DOMContentLoaded', kroker);

  // ---------- leting: funnet legges på hyllene ----------
  // liste = [{ id, n }] (Leting.funn / Etasjer.funn). Gir [{ id, n, p, plass }]
  function leggInnFunn(liste) { if (!sikre() || speil()) return []; const P = plasser(), ut2 = [];
    for (const q of liste || []) { if (!TI[q.id] || !(q.n > 0)) continue; for (const r of TL.legg(T, P, q.id, q.n, alderVedFunn(q.id))) ut2.push({ id: q.id, n: r.n, p: r.p, plass: plassNavn(P, r.p) }); }
    lagre(); vis(); return ut2; }
  // linjene i resultatpanelet etter letingen: [[«2 glass peanøttsmør», « → Hyllereol»]]
  function funnLinjer(liste, maks = 8) { const sum = new Map(); for (const q of liste) { const k = q.id; const o = sum.get(k) || { id: k, n: 0, plass: new Set() }; o.n += q.n; o.plass.add(q.plass || ''); sum.set(k, o); }
    const L = [...sum.values()].sort((a, b) => Ti.verdi(b.id, b.n) - Ti.verdi(a.id, a.n)), linjer = L.slice(0, maks).map(o => [Ti.antall(o.id, o.n), ` → ${[...o.plass].filter(Boolean).join(', ').toLowerCase() || 'lageret'}`]);
    if (L.length > maks) linjer.push([`${L.length - maks} andre slag`, ' → lageret']); return linjer; }

  // ---------- kommandoene ----------
  const sekk = () => (window.UtstyrSpill && UtstyrSpill.klar && UtstyrSpill.klar() ? UtstyrSpill.tilstand() : null);
  const DEF = {
    tingFlytt: { sjekk: k => (!T ? 'Ingen leir ennå.' : !T.s.some(s => s.id === k.stabel) ? 'Fant ikke tingene.' : null),
      utfør: k => { const P = plasser(), s = T.s.find(q => q.id === k.stabel), id = s.t, r = TL.flytt(T, P, k.stabel, k.n, k.til); if (r.feil) return r; lagre(); return { ok: true, tekst: `${stor(Ti.antall(id, r.n))} flyttet til ${plassNavn(P, k.til).toLowerCase()}.` }; },
      beskriv: () => 'flytter ting på lageret' },
    tingBruk: { sjekk: k => { if (!T) return 'Ingen leir ennå.'; const g = TI[k.id]; if (!g || !(TL.antall(T, k.id) > 0)) return 'Det finnes ikke på lageret.';
        if (!g.r && !g.h && !g.m) return g.M || g.t ? `${g.navn} brukes av seg selv så lenge den står på lageret.` : `${g.navn} kan ikke brukes alene.`; return null; },
      utfør: k => { const g = TI[k.id], F = window.FolkSpill && FolkSpill.tilstand(); TL.ta(T, k.id, 1); const d = [];
        if (g.r && F) { F.mat = (F.mat || 0) + g.r; d.push(`${tall(g.r)} rasjon${g.r === 1 ? '' : 'er'} til matlageret`); }
        if (g.h && F) { const p = F.personer.filter(q => q.helse < 1).sort((a, b) => a.helse - b.helse)[0]; if (p) { const før = p.helse; p.helse = Math.min(1, p.helse + .1 + .3 * g.h.f); d.push(`${p.navn} er bedre (${Math.round(før * 100)} → ${Math.round(p.helse * 100)} %)`); } else d.push('ingen er syke – lagt i førstehjelpen'); }
        if (g.m && F) { F.moral = Math.min(100, (F.moral || 0) + g.m.p); d.push(`moral +${tall(g.m.p)}`); }
        lagre(); return { ok: true, tekst: `${stor(Ti.antall(k.id, 1))} brukt: ${d.join(', ')}.` }; },
      beskriv: () => 'bruker en ting fra lageret' },
    tingKast: { sjekk: k => (!T ? 'Ingen leir ennå.' : !(TL.antall(T, k.id) > 0) ? 'Det finnes ikke på lageret.' : null),
      utfør: k => { const n = TL.ta(T, k.id, k.n || 1).reduce((s, q) => s + q.n, 0); lagre(); return { ok: true, tekst: `${stor(Ti.antall(k.id, n))} kastet.` }; }, beskriv: () => 'kaster ting fra lageret' },
    tingSelg: { sjekk: k => (!T ? 'Ingen leir ennå.' : !(TL.antall(T, k.id) > 0) ? 'Det finnes ikke på lageret.' : !window.OppstartSpill ? 'Ingen kasse.' : null),
      utfør: k => { const n = TL.ta(T, k.id, k.n || 1).reduce((s, q) => s + q.n, 0), v = Ti.salgsverdi(k.id, n); if (v > 0) OppstartSpill.gi(v); lagre();
        return { ok: true, tekst: `${stor(Ti.antall(k.id, n))} solgt for ${kr(v)}.`, kr: v }; }, beskriv: () => 'selger ting fra lageret' },
    tingSekk: { sjekk: k => { if (!T) return 'Ingen leir ennå.'; if (!(TL.antall(T, k.id) > 0)) return 'Det finnes ikke på lageret.'; if (!sekk()) return 'Sekken er ikke klar.';
        if (!window.Utstyr || !Utstyr.TING[k.id]) return 'Det kan ikke bæres i sekken.'; if (!(Utstyr.plassTil(sekk(), k.id) > 0)) return 'Sekken er for tung.'; return null; },
      utfør: k => { const I = sekk(), n0 = Math.min(k.n || 1, TL.antall(T, k.id), Utstyr.plassTil(I, k.id)), n = UtstyrSpill.leggTil(k.id, n0); if (n > 0) TL.ta(T, k.id, n); lagre();
        return { ok: true, tekst: `${stor(Ti.antall(k.id, n))} lagt i sekken.` }; }, beskriv: () => 'tar ting fra lageret i sekken' },
    tingFraSekk: { sjekk: k => { if (!T) return 'Ingen leir ennå.'; const I = sekk(); if (!I || !(I.ting[k.id] > 0)) return 'Det er ikke i sekken.'; if (!TI[k.id]) return 'Det hører ikke hjemme på lageret.'; return null; },
      utfør: k => { const I = sekk(), n = Utstyr.taUt(I, k.id, Math.min(k.n || I.ting[k.id], I.ting[k.id])); const r = TL.legg(T, plasser(), k.id, n, 0); if (UtstyrSpill.lagre) UtstyrSpill.lagre(); if (UtstyrSpill.vis) UtstyrSpill.vis(); lagre();
        const P = plasser(); return { ok: true, tekst: `${stor(Ti.antall(k.id, n))} lagt på lageret (${[...new Set(r.map(q => plassNavn(P, q.p).toLowerCase()))].join(', ')}).` }; }, beskriv: () => 'legger ting fra sekken på lageret' },
  };
  function registrer() { if (!window.Kommando || registrer.ferdig) return; registrer.ferdig = true;
    for (const [type, d] of Object.entries(DEF)) if (!Kommando.finnes || !Kommando.finnes(type)) Kommando.registrer(type, { leir: true, meld: true, sjekk: d.sjekk, utfør: d.utfør, beskriv: d.beskriv }); }
  document.addEventListener('DOMContentLoaded', registrer); setTimeout(registrer, 0);
  function kom(k) { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' };
    if (typeof logg === 'function') { if (r.ok && r.svar && r.svar.tekst) logg(r.svar.tekst); else if (!r.ok && r.feil) logg(r.feil); } vis(true); return r; }

  // ---------- sekken: tingene i katalogen kan bæres (spill/utstyr.js) ----------
  function iSekken() { if (!window.Utstyr) return false;
    for (const id of Ti.IDER) { if (Utstyr.TING[id] || (window.Lut && Lut.GJENSTANDER[id])) continue; const g = TI[id]; Utstyr.TING[id] = { navn: Ti.tittel(id), enhet: 'stk.', vekt: g.vekt, pris: 0, pakke: 1, del: true, lut: true, hverdag: true }; }
    return true; }
  document.addEventListener('DOMContentLoaded', iSekken);
  const nærLeiren = () => { const m = midt(); if (!m) return false; const R = typeof R3 !== 'undefined' ? R3 : null; if (!R || !R.fot || typeof på3d === 'undefined' || !på3d) return true;
    const u = R.ut; if (!u) return true; return Math.hypot(u.cx + R.bane.x - m.x, u.cy + R.bane.y - m.y) < 200; };
  (window.SEKK_TILLEGG = window.SEKK_TILLEGG || []).push((p, el, knapp) => { const I = sekk(); if (!I || !T) return; const ider = Object.keys(I.ting).filter(id => TI[id] && I.ting[id] > 0); if (!ider.length) return;
    p.append(el('h3', {}, 'Til leirens lager'));
    if (!nærLeiren()) { p.append(el('small', {}, 'Gå tilbake til leiren for å legge tingene på hyllene.')); return; }
    for (const id of ider) p.append(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, Ti.tittel(id)), el('small', {}, `${I.ting[id]} i sekken`)), knapp('Legg på lageret', () => kom({ type: 'tingFraSekk', id, n: I.ting[id] }), { 'data-tillager': id }))); });

  // ---------- panelet «Lageret» ----------
  const css = document.createElement('style');
  css.textContent = `#tingpanel{ position:fixed; right:10px; top:calc(var(--topp,58px) + 50px); z-index:12; display:none; width:min(430px,94vw); max-height:calc(100vh - var(--topp,58px) - 120px); overflow:auto;
  box-sizing:border-box; padding:10px 12px 12px; background:#1c170f; border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; }
#tingpanel.på{ display:block; } #tingpanel h2{ margin:0 34px 4px 0; font-size:19px; } #tingpanel h3{ margin:12px 0 3px; font-size:12.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-dim,#a99); font-weight:600; }
#tingpanel .x{ position:absolute; right:4px; top:3px; background:none; border:0; color:inherit; font-size:22px; min-width:40px; min-height:40px; cursor:pointer; }
#tingpanel .sum{ color:var(--ink-dim,#a99); font-size:13px; line-height:1.4; } #tingpanel input[type=search]{ width:100%; box-sizing:border-box; min-height:38px; margin:6px 0 2px; padding:4px 9px; background:#120f09; border:1px solid var(--rule,#4a4030); color:inherit; font:inherit; }
#tingpanel button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); min-height:34px; padding:2px 9px; font:inherit; font-size:13px; cursor:pointer; } #tingpanel button.hoved{ border-color:#c9b26a; color:#f0e2b0; }
#tingpanel details{ border-top:1px solid #2e281e; } #tingpanel summary{ cursor:pointer; padding:7px 0; font-weight:600; list-style:none; min-height:26px; } #tingpanel summary::-webkit-details-marker{ display:none; }
#tingpanel summary::before{ content:'▸'; display:inline-block; width:1.1em; color:#c9b26a; } #tingpanel details[open] summary::before{ content:'▾'; } #tingpanel summary small{ font-weight:400; color:var(--ink-dim,#a99); }
#tingpanel .rad{ padding:5px 2px 6px 1.1em; border-top:1px solid #241f16; cursor:pointer; } #tingpanel .rad b{ font-weight:600; } #tingpanel .rad .n{ float:right; color:#f0e2b0; font-variant-numeric:tabular-nums; }
#tingpanel .rad small{ display:block; color:var(--ink-dim,#a99); font-size:12.5px; line-height:1.35; } #tingpanel .rad.snart small.igjen{ color:#e8c46a; } #tingpanel .rad.valgt{ background:#251f15; }
#tingpanel .kn{ display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; cursor:default; } #tingpanel .snartliste div{ font-size:13px; padding:2px 0; color:#e8c46a; } #tingpanel .snartliste small{ color:var(--ink-dim,#a99); }
#tingpanel .plass{ padding:5px 0; border-top:1px solid #241f16; cursor:pointer; font-size:13.5px; } #tingpanel .plass small{ display:block; color:var(--ink-dim,#a99); font-size:12.5px; } #tingpanel .plass .mal{ height:5px; background:#2e281e; margin-top:3px; } #tingpanel .plass .mal i{ display:block; height:100%; background:#c9b26a; }
#tingpanel .plass.valgt{ background:#251f15; } #tingpanel .plass small.fare{ color:#e8c46a; } #tingpanel .vis{ font-size:13px; color:#f0e2b0; margin:4px 0; } #tingpanel .tom{ color:var(--ink-dim,#a99); font-size:13px; line-height:1.45; }
body.kort #tingpanel{ left:6px; right:6px; width:auto; top:auto; bottom:calc(6px + env(safe-area-inset-bottom,0px)); max-height:62vh; font-size:13.5px; }
#leirmeny .tinglager small{ display:block; color:var(--ink-dim,#a99); font-size:12.5px; line-height:1.4; } #leirmeny .tinglager .snart{ color:#e8c46a; } #leirmeny .tinglager button{ margin-top:5px; }`;
  document.head.appendChild(css);
  const panel = document.createElement('div'); panel.id = 'tingpanel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Lageret'); document.body.appendChild(panel);
  panel.innerHTML = `<button type="button" class="x" data-hand="lukk" aria-label="Lukk">×</button><h2>Lageret</h2><div class="sum"></div><input type="search" placeholder="Søk – peanøttsmør, tape, medisin …" aria-label="Søk i lageret"><div class="liste"></div>`;
  const sumEl = panel.querySelector('.sum'), søkEl = panel.querySelector('input'), listeEl = panel.querySelector('.liste');
  let åpen = false, valgtTing = null, valgtPlass = null; const åpneKat = new Set();
  panel.addEventListener('pointerdown', e => e.stopPropagation()); panel.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
  panel.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') åpne(false); });
  søkEl.addEventListener('input', () => vis(true));
  panel.addEventListener('toggle', e => { const d = e.target; if (d.tagName === 'DETAILS' && d.dataset.kat) { if (d.open) åpneKat.add(d.dataset.kat); else åpneKat.delete(d.dataset.kat); } }, true);
  panel.addEventListener('click', e => { const t = e.target.closest('[data-hand]'); if (!t || !panel.contains(t)) return; const h = t.dataset.hand, id = t.dataset.id;
    if (h === 'lukk') return åpne(false);
    if (h === 'velg') { valgtTing = valgtTing === id ? null : id; return vis(true); }
    if (h === 'plass') { valgtPlass = valgtPlass === t.dataset.plass ? null : t.dataset.plass; valgtTing = null; return vis(true); }
    if (h === 'alle') { valgtPlass = null; return vis(true); }
    if (h === 'bruk') return kom({ type: 'tingBruk', id });
    if (h === 'sekk') return kom({ type: 'tingSekk', id, n: +t.dataset.n || 1 });
    if (h === 'selg') return kom({ type: 'tingSelg', id, n: +t.dataset.n || 1 });
    if (h === 'kast') return kom({ type: 'tingKast', id, n: 1 });
    if (h === 'flytt') return kom({ type: 'tingFlytt', stabel: +t.dataset.stabel, til: t.dataset.til, n: +t.dataset.n || undefined });
  });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const KLIMA = { tørt: 'tørt', kjøl: 'kjøl', frys: 'frys', ute: 'ute' };
  function html() {
    const P = plasser(), søk = søkEl.value.trim(), O = TL.oversikt(T, P, søk), alle = T.s.reduce((s, q) => s + q.n, 0), d = [];
    const literInne = P.filter(q => q.id !== 'ute').reduce((s, q) => s + q.liter, 0), brukt = P.filter(q => q.id !== 'ute').reduce((s, q) => s + TL.brukt(T, q.id), 0), ute = TL.brukt(T, 'ute');
    sumEl.textContent = `${alle} ting · ${Math.round(brukt)} av ${Math.round(literInne)} l på hyller og i skap${ute > 0 ? ` · ${Math.round(ute)} l står ute` : ''} · mat i tingene: ${tall(TL.matIAlt(T))} rasjoner · verdi ${kr(TL.verdi(T))}`;
    if (valgtPlass) d.push(`<div class="vis">Viser: ${esc(plassNavn(P, valgtPlass))} <button type="button" data-hand="alle">Vis alt</button></div>`);
    const snart = TL.snartUt(T, P, 5).filter(q => !valgtPlass || q.p === valgtPlass);
    if (snart.length && !søk) d.push(`<h3>Går snart ut på dato</h3><div class="snartliste">${snart.map(q => `<div>${esc(stor(Ti.antall(q.id, q.n)))} <small>– ${TL.igjenTekst(q.igjen)} · ${esc(q.navn.toLowerCase())}</small></div>`).join('')}</div>`);
    let funnet = 0;
    for (const K of O) { const ting = K.ting.filter(o => !valgtPlass || o.plasser.some(q => q.p === valgtPlass)); if (!ting.length) continue; funnet += ting.length;
      const n = ting.reduce((s, o) => s + o.n, 0), op = søk || valgtPlass || åpneKat.has(K.kat) || ting.some(o => o.id === valgtTing);
      d.push(`<details data-kat="${K.kat}"${op ? ' open' : ''}><summary>${esc(K.navn)} <small>· ${n} stk.${ting.some(o => o.snart) ? ' · noe går snart ut' : ''}</small></summary>`);
      for (const o of ting) { const g = TI[o.id], hvor = o.plasser.map(q => `${q.n} ${q.p === 'ute' ? 'ute' : 'i ' + q.navn.toLowerCase()}`).join(' · ');
        d.push(`<div class="rad${o.snart ? ' snart' : ''}${valgtTing === o.id ? ' valgt' : ''}" data-hand="velg" data-id="${o.id}" data-ting="${o.id}"><span class="n">${o.n}</span><b>${esc(Ti.tittel(o.id))}</b><small>${esc(hvor)}</small>`
          + `<small class="igjen">${Number.isFinite(o.igjen) ? TL.igjenTekst(o.igjen) : esc(Ti.holdTekst(o.id))}${Ti.bruksTekst(o.id) ? ' · ' + esc(Ti.bruksTekst(o.id)) : ''}</small>`);
        if (valgtTing === o.id) { const kn = [];
          if (g.r || g.h || g.m) kn.push(`<button type="button" class="hoved" data-hand="bruk" data-id="${o.id}">Bruk 1</button>`);
          if (window.Utstyr && Utstyr.TING[o.id]) kn.push(`<button type="button" data-hand="sekk" data-id="${o.id}" data-n="1">Ta med i sekken</button>`);
          const s0 = o.plasser[0]; for (const P2 of TL.beste(P, o.id).filter(q => q.id !== s0.p && q.id !== 'ute' && TL.ledig(T, q) >= g.vol && (TL.LAGRING[q.type].klima === 'tørt' || g.lag === 'kjøl' || g.lag === 'frys')).slice(0, 3)) kn.push(`<button type="button" data-hand="flytt" data-stabel="${s0.stabel}" data-til="${P2.id}">Flytt til ${esc(P2.navn.toLowerCase())}</button>`);
          if (g.pris > 0) kn.push(`<button type="button" data-hand="selg" data-id="${o.id}" data-n="1">Selg 1 (${esc(kr(Ti.salgsverdi(o.id, 1)))})</button>`);
          kn.push(`<button type="button" data-hand="kast" data-id="${o.id}">Kast 1</button>`); d.push(`<div class="kn">${kn.join('')}</div>`); }
        d.push('</div>'); }
      d.push('</details>'); }
    if (!funnet) d.push(`<p class="tom">${søk ? 'Fant ingenting som heter det.' : valgtPlass ? 'Tomt her.' : 'Lageret er tomt. Let gjennom hus for å finne hverdagsting – mat, verktøy, medisin og klær havner her. Sett inn hyller og skap med byggesettet (fanen Maskiner).'}</p>`);
    // hyllene og skapene
    const Pl = P.filter(q => q.id !== 'ute');
    d.push(`<h3>Hyller og skap</h3>`);
    if (!Pl.length) d.push('<p class="tom">Ingen ennå: et lagertelt eller en container har plass til litt, og byggesettet (fanen Maskiner) har hyllereol, kjøleskap, frysboks, medisinskap, verktøytavle, garderobeskap, kiste, pallreol og vanntønne.</p>');
    for (const q of Pl) { const b = TL.brukt(T, q.id), a = Math.min(100, b / q.liter * 100), D = TL.LAGRING[q.type];
      d.push(`<div class="plass${valgtPlass === q.id ? ' valgt' : ''}" data-hand="plass" data-plass="${q.id}"><b>${esc(q.navn)}</b> <small${q.kjøler && !q.strøm ? ' class="fare"' : ''}>${Math.round(b)} av ${q.liter} l · ${esc(D.tekst)}${q.kjøler && !q.strøm ? ' · UTEN STRØM – kjøler ikke' : ''}</small><div class="mal"><i style="width:${a.toFixed(0)}%"></i></div></div>`); }
    if (ute > 0) d.push(`<div class="plass${valgtPlass === 'ute' ? ' valgt' : ''}" data-hand="plass" data-plass="ute"><b>Ute i leiren</b> <small class="fare">${Math.round(ute)} l uten lagring – holder kortere. Folkene bærer det inn når det blir plass.</small></div>`);
    const tapt = Object.entries(T.tapt || {}).sort((a, b) => b[1] - a[1]).slice(0, 4); if (tapt.length) d.push(`<p class="tom">Kastet så langt fordi det ble for gammelt: ${tapt.map(([t, n]) => esc(Ti.antall(t, n))).join(', ')}.</p>`);
    return d.join('');
  }
  let sistHtml = '';
  function vis(tving) { if (!åpen) return; if (!sikre()) { listeEl.innerHTML = '<p class="tom">Ingen leir ennå.</p>'; return; }
    if (!tving && window.pekerNede && pekerNede(panel)) return; const h = html(); if (h === sistHtml && !tving) return; if (h !== sistHtml) { sistHtml = h; listeEl.innerHTML = h; } }
  function åpne(v, plass) { åpen = !!v && sikre(); if (plass !== undefined) { valgtPlass = plass; valgtTing = null; } panel.classList.toggle('på', åpen); sistHtml = ''; if (åpen) { if (document.pointerLockElement) document.exitPointerLock(); vis(true); } }
  setInterval(() => { if (åpen) vis(); }, 1000);

  // ---------- Leir-menyen, fanen Lager ----------
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el, knapp }) => { if (!sikre()) return; const P = plasser(), n = T.s.reduce((s, q) => s + q.n, 0), snart = TL.snartUt(T, P, 3);
    const b = el('div', { klasse: 'tinglager', id: 'tinglagermeny' });
    b.append(el('small', {}, n ? `${n} hverdagsting: mat for ${tall(TL.matIAlt(T))} rasjoner, ${P.filter(q => q.id !== 'ute').length} hyller og skap.` + (TL.brukt(T, 'ute') > 0 ? ' Noe står ute og holder kortere.' : '') : 'Ingen hverdagsting ennå – let gjennom hus.'));
    for (const q of snart) b.append(el('small', { klasse: 'snart' }, `${stor(Ti.antall(q.id, q.n))}: ${TL.igjenTekst(q.igjen)}`));
    if (moralNå.sum > 0 || heling.f > 0 || Object.keys(tempoNå).length) b.append(el('small', {}, [moralNå.sum > 0 ? `moral +${tall(moralNå.sum)}` : '', heling.f > 0 ? `syke leges ${Math.round(heling.f * heling.dekning * 100)} % raskere` : '', ...Object.entries(tempoNå).map(([o, f]) => `${Ti.OPPGAVE_NAVN[o] || o} +${Math.round(f * 100)} %`)].filter(Boolean).join(' · ')));
    b.append(knapp('Åpne lageret', () => åpne(true), { id: 'apnetinglager' }));
    hode.append(el('h3', { 'data-fane': 'lager' }, 'Lageret: hverdagsting'), b); });
  // kommandolinja nederst på PC (spill/spillhud.js)
  (window.KOMMANDO_TILLEGG = window.KOMMANDO_TILLEGG || []).push({ k: 'tinglager', navn: 'Lager', tast: '', tittel: 'Lageret: hverdagsting på hyller og i skap',
    ikon: "<path d='M4 4v16M20 4v16M4 9h16M4 15h16'/><path d='M7 7h3v2H7zM13 12h4v3h-4zM7 18h5'/>", fins: () => klar && !!leir(), på: () => åpen, trykk: () => åpne(!åpen) });

  // ---------- 2D: hyllene og skapene ----------
  const BSR = () => window.ByggesettRegler;
  const FARGE = { hyllereol: '#7b6a4c', pallplass: '#8d7149', pallreol: '#6b6e70', kjøleskap: '#d9dcd6', kjølerom: '#c6cbc7', frysboks: '#e3e6e1', medisinskap: '#e6e2d6', verktøytavle: '#6e5a40',
    garderobe: '#7a5a3a', kiste: '#5d4429', tønne: '#3f6178' };
  const TEGN = { kjøleskap: 'K', kjølerom: 'K', frysboks: 'F', medisinskap: '+', verktøytavle: 'V', garderobe: 'G', kiste: 'Ki', tønne: 'V', pallreol: 'P' };
  function ruteAv(d, o, sx, sy) { const BS = BSR(), U = BS.U, R = BS.ruter(d); let i0 = Infinity, i1 = -Infinity, j0 = Infinity, j1 = -Infinity;
    for (const [i, j] of R) { i0 = Math.min(i0, i); i1 = Math.max(i1, i + 1); j0 = Math.min(j0, j); j1 = Math.max(j1, j + 1); }
    return { x: sx(o.ox + i0 * U), y: sy(o.oy + j1 * U), w: sx(o.ox + i1 * U) - sx(o.ox + i0 * U), h: sy(o.oy + j0 * U) - sy(o.oy + j1 * U) }; }
  function tegnDel(g, d, o, sx, sy, m, skisse) { const BS = BSR(), D = BS.DELER[d.type], typ = D.ting, b = ruteAv(d, o, sx, sy);
    g.fillStyle = skisse || FARGE[typ] || '#7b6a4c'; g.fillRect(b.x, b.y, b.w, b.h); if (skisse) return;
    g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1; g.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    const t = TEGN[typ], r = Math.min(b.w, b.h); if (t && r > 9) { g.fillStyle = typ === 'medisinskap' ? '#b8382f' : typ === 'tønne' || /kjøl|frys/.test(typ) ? '#2a3338' : 'rgba(240,226,176,.85)';
      g.font = `600 ${Math.min(16, Math.round(r * .55))}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, b.x + b.w / 2, b.y + b.h / 2 + .5); } }
  // fabrikk-visning.js tegner hyllene; de nye skapene tegnes her (pakkes inn når fabrikk-visning.js er lest)
  function pakkInn() { const FS = window.FabrikkSpill, BS = BSR(); if (!FS || !BS || FS.tingPakket) return !!(FS && FS.tingPakket); FS.tingPakket = true;
    const egen = d => { const D = BS.DELER[d.type]; return D && D.ting && D.grunn !== 'bs_hylle' && D.grunn !== 'bs_pall'; };
    const t0 = FS.tegnDel; if (t0) FS.tegnDel = function (g, d, o, sx, sy, m, skisse) { if (egen(d)) return tegnDel(g, d, o, sx, sy, m, skisse); return t0.apply(this, arguments); };
    const b0 = FS.bygg3d; if (b0) FS.bygg3d = function (Bg, d, T2, z0, f, o) { if (egen(d)) return bygg3d(Bg, d, T2, z0, f, o); return b0.apply(this, arguments); };
    return true; }
  document.addEventListener('DOMContentLoaded', pakkInn); window.addEventListener('riksbrudd-spill', pakkInn);
  // ---------- 3D: enkle kasser (en tredje hjelper lager flere møbler senere) ----------
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const F3 = { hvit: hex('#d9dcd6'), grå: hex('#8a9094'), mørk: hex('#33373a'), tre: hex('#8f6c46'), mørktre: hex('#5d4429'), stål: hex('#646b70'), rød: hex('#b8382f'), blå: hex('#3f6178'), pall: hex('#a7865a') };
  function bygg3d(Bg, d, T2, z0, f, o) { const BS = BSR(), U = BS.U, { boks, z3, gx, gy } = Bg, typ = T2.ting, z = z3(z0 + (d.n || 0) * BS.H), R = BS.ruter(d);
    const i0 = Math.min(...R.map(c => c[0])), j0 = Math.min(...R.map(c => c[1])), [w, h] = BS.fotRuter(d), cx = gx + (i0 + w / 2) * U, cy = gy + (j0 + h / 2) * U;
    const lx = (d.r || 0) % 2 === 0, ux = lx ? 1 : 0, uy = lx ? 0 : 1, l = (lx ? w : h) * U, b = (lx ? h : w) * U, s = Math.max(.15, f);
    const B = (c, l2, b2, a, e, dx = 0, dy = 0) => boks('farge', c, cx + dx, cy + dy, ux, uy, l2, b2, z + a * s, z + e * s);
    if (typ === 'kjøleskap') { B(F3.hvit, .7, .7, 0, 1.85); B(F3.grå, .04, .72, 1.1, 1.5, 0, 0); return; }
    if (typ === 'frysboks') { B(F3.hvit, 1.05, .7, 0, .88); B(F3.grå, 1.07, .72, .8, .86); return; }
    if (typ === 'kjølerom') { B(F3.hvit, l - .1, b - .1, 0, 2.4); B(F3.grå, .9, b - .06, .05, 2.05); return; }
    if (typ === 'medisinskap') { B(F3.hvit, .6, .4, 0, 1.25); B(F3.rød, .08, .42, .95, 1.15); B(F3.rød, .22, .42, 1.02, 1.08); return; }
    if (typ === 'verktøytavle') { B(F3.mørktre, l - .2, .25, 0, .85); B(F3.tre, l - .3, .06, .85, 1.95); for (const q of [-.3, 0, .3]) B(F3.stål, .12, .1, 1.2 + q * .5 + .3, 1.5 + q * .5 + .3, l * q, 0); return; }
    if (typ === 'garderobe') { B(F3.tre, .9, .6, 0, 2.0); B(F3.mørktre, .02, .62, .1, 1.9); return; }
    if (typ === 'kiste') { B(F3.mørktre, .9, .5, 0, .42); B(F3.tre, .94, .54, .42, .52); return; }
    if (typ === 'tønne') { B(F3.blå, .62, .62, 0, .92); B(F3.mørk, .66, .66, .3, .34); B(F3.mørk, .66, .66, .64, .68); return; }
    if (typ === 'pallreol') { for (const a of [-.5, .5]) for (const c of [-.5, .5]) B(F3.stål, .1, .1, 0, 3.2, a * (l - .2), c * (b - .2));
      for (const q of [.15, 1.2, 2.25]) { B(F3.stål, l - .1, b - .1, q, q + .08); B(F3.pall, l - .6, b - .4, q + .08, q + .22); B(F3.mørktre, l - .9, b - .6, q + .22, q + .8); } return; }
    B(F3.tre, l - .1, b - .15, 0, 1); }

  // ---------- 2D: trykk på en hylle/et skap viser innholdet; fyllingen tegnes når du er zoomet inn ----------
  // midten og halve målene til en lagringsplass i kartet (bygg med fot; byggesettets deler har x, y, ret som andre bygg)
  function fotAv(b) { const B = LB.BYGG[b.type]; if (!B || !B.fot) return null; const [x0, x1, y0, y1] = B.fot; return { x0, x1, y0, y1, c: Math.cos(b.ret || 0), s: Math.sin(b.ret || 0) }; }
  function inni(b, X, Y, kant = 0) { const F = fotAv(b); if (!F) return false; const dx = X - b.x, dy = Y - b.y, u = dx * F.c + dy * F.s, v = -dx * F.s + dy * F.c;
    return u >= F.x0 - kant && u <= F.x1 + kant && v >= F.y0 - kant && v <= F.y1 + kant; }
  // (først i lista: leir-visning.js ville ellers valgt delen som et bygg – her er innholdet mer nyttig)
  if (typeof KROKER !== 'undefined') KROKER.trykk.unshift((X, Y) => {
    if (!sikre() || typeof kam === 'undefined' || kam.m > REGLER.visM || (typeof valgt !== 'undefined' && valgt) || (window.LeirSpill && LeirSpill.plassering && LeirSpill.plassering())) return false;
    if (window.Byggesett && Byggesett.tilstand && Byggesett.tilstand().åpen) return false;
    // bare byggesettets hyller og skap (leirens egne bygg har sitt byggpanel; lageret der vises i panelet)
    const P = plasser().filter(q => q.bygg && LB.BYGG[q.bygg.type] && LB.BYGG[q.bygg.type].del); const q = P.find(p => inni(p.bygg, X, Y, .3)); if (!q) return false;
    åpne(true, q.id); return true; });
  if (typeof KROKER !== 'undefined') KROKER.tegn.push((g, vx0, vy1) => {
    if (!T || typeof kam === 'undefined' || kam.m > REGLER.visM || !T.s.length) return; const m = kam.m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m;
    for (const q of plasser()) { if (!q.bygg || !LB.BYGG[q.bygg.type] || !LB.BYGG[q.bygg.type].del) continue; const b = TL.brukt(T, q.id); if (!(b > 0)) continue;
      const X = sx(q.bygg.x), Y = sy(q.bygg.y), w = Math.max(10, .9 / m), a = Math.min(1, b / q.liter);
      g.fillStyle = 'rgba(16,13,8,.8)'; g.fillRect(X - w / 2, Y + .35 / m, w, 4); g.fillStyle = a > .95 ? '#e8c46a' : '#9fc46a'; g.fillRect(X - w / 2, Y + .35 / m, w * a, 4); } });
  { const f = KROKER && KROKER.tegn ? KROKER.tegn[KROKER.tegn.length - 1] : null; if (f) { f.over = true; f.bygg = true; } }

  Object.assign(ut, { klar: () => klar && !!T, T: () => T, last, lagre, steg, plasser, leggInnFunn, funnLinjer, åpne, erÅpen: () => åpen, vis, kom,
    heling: () => heling, moral: () => moralNå, tempo: () => tempoNå, matIAlt: () => (T ? TL.matIAlt(T) : 0), spist: () => spistAkk, nullstill: () => { T = TL.ny(); lagre(); vis(true); } });
  window.TinglagerSpill = ut;
})();
