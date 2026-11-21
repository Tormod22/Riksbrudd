'use strict';
/* Riksbrudd – FORSVAR AV LEIREN I SPILLET (17. nov, brukeren – se spill/forsvar.js for reglene).
 *  ALARMEN: når røvere er på vei (SpilletSpill.T().aktiv), står det et banner øverst: hvor mange, fra hvilken kant, hvor langt unna og
 *   hvor lenge til de er framme (avstanden bare når noen faktisk ser dem – derfor lønner vakter, tårn og kameraer seg).
 *  «FORSVAR LEIREN»: ett trykk sender alle lag innen 3 km til stillinger på den siden fienden kommer fra – bak sandsekkvollene først –,
 *   lar dem grave seg ned, og gir dem regelen «hold stillingen» til angrepet er over. Folk på «vakt» blir Leirvakta, et eget lag.
 *  BEREDSKAPEN står i Leir-menyen (fanen Bygg): poeng, hva som mangler, og hva som hjelper mest.
 *  RAPPORTEN kommer i loggen når angrepet er over. window.ForsvarSpill. Alarmen setter ikke forsvaret av seg selv – du trykker.
 *  RUNDE 12: unntaket er når du spoler (60× eller mer, også ⏭) mens angrepet pågår, eller angriperne er nesten i leiren: da gjør lagene
 *   hjemme det selv (autoForsvar).
 */
(function () {
  const FO = window.Forsvar; if (!FO) return;
  const R = FO.R, HOLD = { ild: 'fri', underlegen: 'kjemp', tap: 0, fram: 'nei' };
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const kn = (tekst, fn, a = {}) => { const b = el('button', a, tekst); b.onclick = fn; return b; };
  const leir = () => { const S = window.OppstartSpill && OppstartSpill.tilstand(); return S && S.leir ? S.leir : null; };
  const T = () => (window.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill.T() : null);
  // (runde 8, kritikken: «ekte angrep på leiren bruker ikke røverbanneret») hvem som angriper leiren nå: røverbølgen, eller en angrepsgruppe
  // fra en motstander (spill/eskalering-visning.js) i fasen «angriper». Banneret, «Forsvar leiren», varselbrikka og rapporten bruker begge.
  const fraksjon = side => (window.Fraksjoner && Fraksjoner.FRAKSJONER[side] ? Fraksjoner.FRAKSJONER[side].navn : 'Fienden');
  function angrep() { const t = T();
    if (t && t.aktiv) { const r = ENHETER.filter(e => e.raid === t.aktiv && levende(e)); return r.length ? { id: 'r' + t.aktiv, nr: t.aktiv, røvere: true, navn: 'Røverne', lag: r } : null; }
    const ES = window.EskaleringSpill && EskaleringSpill.S ? EskaleringSpill.S() : null; if (!ES || !ES.gruppe) return null;
    for (const side of Object.keys(ES.gruppe)) { const G = ES.gruppe[side]; if (!G || !G.mål || !G.mål.leir || G.fase !== 'angriper') continue;
      const lag = ENHETER.filter(e => e.side === side && e.ai && G.lag.includes(e.navn) && levende(e)); if (lag.length) return { id: 'e' + side + Math.round(G.start || 0), side, røvere: false, navn: fraksjon(side), lag, G }; }
    return null; }
  const røvere = () => { const A = angrep(); return A ? A.lag : []; };
  const egne = () => ENHETER.filter(e => e.side === 'blå' && !e.karakter && !e.leirvakt && levende(e));
  const folk = () => (window.FolkSpill ? FolkSpill.tilstand() : null), fsv = () => (window.FolkSpill ? FolkSpill.forsvar() : { tårn: [], sekker: [], varsling: 0, vakter: 0 });
  const km = m => (m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(m / 10) * 10 + ' m');
  let satt = false, sistV = Math.PI / 2, snap = null, vakt = null, sistAktiv = '', skade = null;
  // (runde 4) det som skjer av seg selv (mot røverne i leiren, reparasjon, skadevarselet): ikke i testene (navigator.webdriver) uten ForsvarSpill.test
  const auto = () => !navigator.webdriver || !!(window.ForsvarSpill && ForsvarSpill.test);

  // ---------- beredskapen ----------
  function beredskap() { const L = leir(); if (!L) return null; const f = fsv(), t = T(), hjemme = egne().filter(s => Math.hypot(s.x - L.x, s.y - L.y) <= R.nær), ammo = hjemme.length && window.Forsyning ? hjemme.reduce((a, s) => a + Forsyning.ammo(s), 0) / hjemme.length : 1;
    const kam = window.KameraSpill ? KameraSpill.kameraer().reduce((m, c) => Math.max(m, c.r + Math.hypot(c.x - L.x, c.y - L.y)), 0) : 0;
    // (19. nov) et bemannet vakttårn ser røverne på 1,5 km (Spillet.Trussel.VARSEL.tårn)
    const tårnSer = f.tårn && f.tårn.length && window.Spillet && Spillet.Trussel.VARSEL ? Spillet.Trussel.VARSEL.tårn : 0;
    return FO.beredskap({ lag: hjemme.length, tårn: f.tårn.length, sekker: f.sekker.length, varsling: Math.max(f.varsling || 0, kam, tårnSer), vakter: f.vakter || 0, ammo, bølge: t && window.Spillet ? Spillet.Trussel.lag((t.bølge || 0) + (t.aktiv ? 0 : 1)) : 1 }); }

  // ---------- sett forsvaret ----------
  // (19. nov) retningen fra dem du kjenner til; ellers fra startstedet i varselet (så banneret og varselet sier det samme, og ikke røper hvor de er)
  // (runde 8) inne i leiren sier stedet ingenting om retningen («fra sørøst» ble «fra sørvest» når de kom inn): da står den forrige
  function retningMotFienden() { const L = leir(), r0 = røvere(); if (r0.length) { const k = r0.filter(e => kjent(e) && Math.hypot(e.x - L.x, e.y - L.y) > R.mot.inne), r = k.length ? k.map(e => ({ x: e.x, y: e.y })) : r0.some(e => kjent(e)) ? null : r0.map(e => e.fra || e); if (!r) return sistV;
      const x = r.reduce((a, e) => a + e.x, 0) / r.length, y = r.reduce((a, e) => a + e.y, 0) / r.length; sistV = Math.atan2(y - L.y, x - L.x); } return sistV; }
  function leirvakt(plass) { const F = folk(), L = leir(); if (!F || vakt || !window.FolkRegler) return null; const vakter = F.personer.filter(p => p.oppgave === 'vakt' && FolkRegler.arbeidsfør(p)), n = FO.vaktStørrelse(vakter.length); if (!n) return null;
    const s = nyttLag('Leirvakta', plass ? plass.x : L.x + 12, plass ? plass.y : L.y, 'blå'); s.menn = vakter.slice(0, n).map((p, i) => ({ navn: p.navn, rolle: i === 0 ? 'lagfører' : 'rifle', hp: 1, loy: p.lojal || .7, person: p.id })); s.leder = 0; s.leirvakt = true; s.strid = { ...HOLD, bev: 'standard' }; s.forsvar = plass || { x: s.x, y: s.y, voll: false };
    ENHETER.push(s); vakt = s; return s; }
  function sett(øvelse) { const L = leir(); if (!L) return { feil: 'Ingen leir.' }; const v = retningMotFienden(), f = fsv(), lag = egne().filter(s => Math.hypot(s.x - L.x, s.y - L.y) <= R.hent && !s.planlegger);
    const fx = L.x + Math.cos(v) * 2000, fy = L.y + Math.sin(v) * 2000; lag.sort((a, b) => Math.hypot(a.x - fx, a.y - fy) - Math.hypot(b.x - fx, b.y - fy));
    const F = folk(), nVakt = F && window.FolkRegler && !vakt ? FO.vaktStørrelse(F.personer.filter(p => p.oppgave === 'vakt' && FolkRegler.arbeidsfør(p)).length) : 0, plasser = FO.stillinger(L, v, lag.length + (nVakt ? 1 : 0), f.sekker.map(b => ({ x: b.x, y: b.y })));
    const fordelt = FO.fordel(lag, plasser), brukt = new Set(fordelt.map(q => q.plass)); let sendt = 0;
    for (const q of fordelt) { const s = q.lag; if (!s.stridFør && window.StridSpill) { s.stridFør = { ...StridSpill.regel(s) }; s.strid = { ...s.stridFør, ...HOLD }; } s.forsvar = q.plass; if (q.meter > 12 && KROKER.kanOrdre.every(h => h(s))) { ordre(s, q.plass.x, q.plass.y, true); sendt++; } }
    const lv = nVakt ? leirvakt(plasser.find(p => !brukt.has(p))) : null; satt = true;
    if (!snap) snap = { fiender: røvere().length, egne: ENHETER.filter(e => e.side === 'blå' && !e.karakter).reduce((a, s) => a + s.menn.filter(m => m.hp >= 1).length, 0), falne: ENHETER.filter(e => e.side === 'blå' && !e.karakter).reduce((a, s) => a + s.menn.filter(m => m.hp <= 0).length, 0), bygg: window.LeirSpill && LeirSpill.tilstand() ? LeirSpill.tilstand().bygg.map(b => [b.id, b.hp]) : [] };
    logg(`${øvelse ? 'Øvelse' : 'Forsvar'}: ${fordelt.length} lag går i stilling mot ${FO.retning(v)}` + (fordelt.some(q => q.plass.voll) ? ' – bak sandsekkvollene først' : '') + (lv ? `, og Leirvakta (${lv.menn.length} fra vakta) tar opp våpen` : '') + '. De holder stillingen til angrepet er over.'); vis(); skitten = true;
    return { lag: fordelt.length, sendt, vakt: lv ? lv.menn.length : 0, voller: fordelt.filter(q => q.plass.voll).length }; }
  // angrepet er over (eller øvelsen oppheves): reglene tilbake, Leirvakta går hjem, rapport
  // (runde 12) de falne i Leirvakta går ut av folket før laget tas bort (FolkSpill.falne i folk-visning.js) – ellers sto de i Folk med helse 15 %
  function opphev(rapport) { if (window.FolkSpill && FolkSpill.falne) FolkSpill.falne(); for (const s of ENHETER) { if (s.stridFør) { s.strid = s.stridFør; delete s.stridFør; delete s.bevSatt; } delete s.forsvar; }
    if (vakt) { const F = folk(); for (const m of vakt.menn) { const p = F && F.personer.find(q => q.id === m.person); if (p && m.hp < 1) p.helse = Math.min(p.helse, m.hp <= 0 ? .15 : .4); } const i = ENHETER.indexOf(vakt); if (i >= 0) ENHETER.splice(i, 1); if (valgt === vakt) { valgt = null; if (window.lukkPanel) lukkPanel(); } vakt = null; }
    if (rapport && snap) { const nå = ENHETER.filter(e => e.side === 'blå' && !e.karakter), friske = nå.reduce((a, s) => a + s.menn.filter(m => m.hp >= 1).length, 0), falne = nå.reduce((a, s) => a + s.menn.filter(m => m.hp <= 0).length, 0) - snap.falne, L = window.LeirSpill && LeirSpill.tilstand();
      const bygg = L ? snap.bygg.filter(([id, hp]) => { const b = L.bygg.find(q => q.id === id); return !b || b.hp < hp - .01; }).length : 0;
      logg('Etter angrepet: ' + FO.rapport({ fiender: snap.fiender, fienderUte: snap.fiender, falne: Math.max(0, falne), sårede: Math.max(0, snap.egne - friske - Math.max(0, falne)), bygg })); }
    satt = false; snap = null; vis(); skitten = true; }

  // ---------- alarmen ----------
  const css = document.createElement('style');
  css.textContent = `#alarm{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 54px); z-index:9; display:none; max-width:min(560px,94vw); padding:7px 10px; background:#2a120d; border:1px solid #e0714f; color:#f3e3d6; font-size:14.5px; box-shadow:0 4px 14px rgba(0,0,0,.5); }
#alarm.på{ display:flex; flex-wrap:wrap; gap:6px 10px; align-items:center; justify-content:center; } #alarm.satt.god{ background:#17200f; border-color:#8fb86a; } #alarm.god b{ color:#cfe8a8; } #alarm .rapport small{ color:#e7dcc3; } #alarm b{ color:#ffb49a; } #alarm small{ color:#d8b8a8; } #alarm button{ background:#4a1d14; border:1px solid #e0714f; color:#fff; min-height:36px; padding:2px 12px; font:inherit; font-size:14px; cursor:pointer; } #alarm button.rolig{ background:#2a2318; border-color:var(--rule,#4a4030); color:var(--ink,#e7dcc3); } #alarm.satt{ background:#1c170f; border-color:#c9b26a; }
body:not(.gaar) #alarm.på > span:first-child{ white-space:normal; overflow:visible; text-overflow:clip; min-width:12em; }
body:not(.gaar) #alarm.på > span:first-child small{ white-space:normal; }
body.kort #alarm{ top:calc(var(--topp,58px) + 42px); font-size:13.5px; padding:5px 8px; } body.krig #alarm{ display:none; }
body.gaar #alarm.på{ flex-wrap:nowrap; padding:3px 8px; gap:6px; font-size:12.5px; max-width:min(560px, calc(100vw - 16px)); } body.gaar #alarm > span:first-child{ min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
body.gaar #alarm button{ min-height:28px; padding:0 8px; font-size:12.5px; flex:none; } body.gaar #alarm.fjern{ display:none; }
#leirmeny .forsvar .sum{ display:flex; justify-content:space-between; align-items:baseline; gap:8px; } #leirmeny .forsvar .strek{ height:11px; background:#2e281e; margin:3px 0 6px; } #leirmeny .forsvar .strek i{ display:block; height:100%; background:#8fc46a; } #leirmeny .forsvar.svak .strek i{ background:#e8a46a; } #leirmeny .forsvar.middels .strek i{ background:#c9b26a; }
#leirmeny .forsvar .p{ display:grid; grid-template-columns:20px 1fr auto; gap:6px; padding:2px 0; font-size:14px; } #leirmeny .forsvar .p small{ color:var(--ink-dim,#a99); } #leirmeny .forsvar .p.ok .h{ color:#9fd08a; } #leirmeny .forsvar .p:not(.ok) .h{ color:#e8a46a; } #leirmeny .forsvar .raad{ margin:6px 0; font-size:13px; color:#e8d7a8; }`;
  document.head.appendChild(css);
  const alarm = el('div', { id: 'alarm', role: 'alert' }); document.body.appendChild(alarm);
  let sistAlarm = '';
  // (19. nov, kritikken: «banneret sier ikke sett ennå mens Vaktlaget er under ild») en røver er kjent når den er synlig, skyter på et
  // av lagene dine, blir skutt på av dem, eller står inne i leiren
  const blåLag = () => ENHETER.filter(s => s.side === 'blå' && levende(s));
  const iStrid = e => (e.skyterPå && [...e.skyterPå].some(b => b && b.side === 'blå')) ? [...e.skyterPå].find(b => b && b.side === 'blå') : blåLag().find(s => s.skyterPå && s.skyterPå.has(e)) || null;
  const kjent = e => { const L = leir(); return synlig(e) || !!iStrid(e) || (L && Math.hypot(e.x - L.x, e.y - L.y) <= R.mot.inne); };
  // anslaget fra varselet: minutter til den første er framme (startstedet og tida de har gått – ikke hvor de faktisk er)
  // (når ruta er lagt: tida som er igjen av marsjen, timerIgjen i timer)
  const anslag = r => { const L = leir(), TR = window.Spillet && Spillet.Trussel; if (!L || !TR || !TR.anslag) return null;
    const m = r.filter(e => (e.sti && e.timerIgjen > 0) || (e.fra && Number.isFinite(e.startTid))).map(e => (e.sti && e.timerIgjen > 0 ? e.timerIgjen * 60 : TR.anslag(Math.hypot(e.fra.x - L.x, e.fra.y - L.y), tid - e.startTid)));
    return m.length ? Math.min(...m) : null; };
  // ---------- (runde 8) ÉN KILDE FOR ANGREPET: ForsvarSpill.status() – banneret, varselbrikka (narhud.js) og rapporten bruker den ----------
  // Telefonkritikeren: banneret sa «ikke sett ennå · kan være framme når som helst» mens kartet viste «Røvere 1.1 · 2 min siden» i leiren, og
  // anslaget hoppet 70 → 231 → 15 min. Nå: sett nå (avstand), ellers «sist sett» (kartet, radioen eller etterretningen – det samme kartet viser),
  // ellers anslaget fra varselet; anslaget glattes (Forsvar.glatt) og står som et spenn når ingen ser dem (Forsvar.spenn).
  const sistSettAv = e => { let s = e.sett && Number.isFinite(e.sett.tid) ? { x: e.sett.x, y: e.sett.y, tid: e.sett.tid } : null;
    const KT = window.KrigSpill && KrigSpill.T ? KrigSpill.T() : null, q = KT && KT.etter ? KT.etter.find(o => o.navn === e.navn) : null;
    if (q && Number.isFinite(q.t) && (!s || q.t > s.tid)) s = { x: q.x, y: q.y, tid: q.t }; return s; };
  let est = null;
  // Claudes forslag: spillminutter etter starten der ruta (når den blir kjent) får erstatte luftlinja i anslaget
  const RUTE_FRIST = 5;
  function status() { const A = angrep(), L = leir(); if (!A || !L) { if (!A) est = null; return null; }
    const r = A.lag, d = e => Math.hypot(e.x - L.x, e.y - L.y), V = window.Spillet && Spillet.Trussel && Spillet.Trussel.VARSEL, fart = (V && V.fart) || .75;
    const kj = r.filter(e => kjent(e)), nær = kj.length ? Math.min(...kj.map(d)) : null, strid = kj.map(iStrid).find(Boolean) || null;
    let sist = null; if (!kj.length) for (const e of r) { const q = sistSettAv(e); if (q && tid - q.tid <= FO.STATUS.sistSett && tid >= q.tid && (!sist || q.tid > sist.tid)) sist = q; }
    // (runde 13) det banneret selv så sist (vakttårnet, et kamera, vaktene) når kartet og radioen ikke har noe – ellers sa banneret «ikke sett»
    // rett etter «Røverne er sett»
    if (!kj.length && est && est.id === A.id && est.sistSett && tid - est.sistSett.tid <= FO.STATUS.sistSett && tid >= est.sistSett.tid && !sist) sist = { ...est.sistSett };
    const rå = kj.length ? FO.ankomst(nær, fart) : sist ? Math.max(0, FO.ankomst(Math.hypot(sist.x - L.x, sist.y - L.y), fart) - (tid - sist.tid)) : anslag(r);
    // (runde 13, kritiker G: «5–10 min» ble til «3–7 timer» mens klokka gikk) anslaget med minutter kan bare minke så lenge angriperne ikke
    // har snudd (Forsvar.monoton). Første gang de er sett, og når de har snudd, gjelder det nye anslaget. Ser ingen dem, står det ingen
    // minutter i banneret – bare når de trolig kommer (Forsvar.når), regnet fra ruta deres når den finnes.
    if (!est || est.id !== A.id) est = { id: A.id, v: null, t: tid, minNær: Infinity, sett: false };
    if (kj.length || sist) { const dNå = kj.length ? nær : Math.hypot(sist.x - L.x, sist.y - L.y), snudd = FO.harSnudd(est.minNær, dNå, r.every(e => e.trekker || e.flykter)), nytt = est.v === null || (kj.length && !est.sett) || snudd;
      // (står de stille eller venter på mørket, teller anslaget ikke ned – men det går heller ikke opp)
      const står = kj.length > 0 && kj.every(e => !e.sti || e.venterNatt), m = FO.monoton(est.v === null ? null : { v: est.v, t: står ? tid : est.t }, rå, tid, nytt);
      if (kj.length) { const q = kj.reduce((a, e) => (Math.hypot(e.x - L.x, e.y - L.y) < Math.hypot(a.x - L.x, a.y - L.y) ? e : a)); est.sistSett = { x: q.x, y: q.y, tid }; } est.v = m ? m.v : null; est.t = tid; est.minNær = snudd ? dNå : Math.min(est.minNær, dNå); if (kj.length) est.sett = true; }
    // ser ingen dem: anslaget fra varselet teller ned og holdes fast (også etter omlasting) – det byttes bare når ruta deres blir kjent første
    // gang i de første RUTE_FRIST spillminuttene etter at de startet (luftlinja sa «5–10 min», ruta over fjellet «5 timer»); senere kan det
    // bare minke, som når de er sett
    else { const harRute = r.some(e => e.sti && e.timerIgjen > 0), tidlig = r.some(e => Number.isFinite(e.startTid) && tid - e.startTid < RUTE_FRIST);
      const m = FO.monoton(est.v === null ? null : { v: est.v, t: est.t }, rå, tid, est.v === null || (harRute && !est.rute && tidlig));
      est.v = m ? m.v : null; est.t = tid; if (harRute) est.rute = true; }
    const min = est.v, iLeiren = kj.length > 0 && nær <= R.mot.inne, syn = kj.find(e => synlig(e)), hvem = syn ? settAv(syn) : '', v = retningMotFienden(), n = r.length;
    const overskrift = A.røvere ? `Angrep: ${n === 1 ? 'ett røverlag' : n + ' røverlag'} fra ${FO.retning(v)}` : `Angrep: ${A.navn} med ${n === 1 ? 'ett lag' : n + ' lag'} fra ${FO.retning(v)}`;
    let tekst, kort;
    if (iLeiren) { tekst = 'i leiren' + (strid ? ` · i ildkamp med ${strid.navn}` : ''); kort = strid ? 'i leiren · ildkamp' : 'i leiren'; }
    else if (kj.length) { tekst = `${km(nær)} unna · ` + (kj.every(e => e.venterNatt) ? 'de venter (trolig på mørket)' : `framme om ca. ${Math.max(1, Math.round(min))} min`) + (strid ? ` · i ildkamp med ${strid.navn}` : hvem ? ` · ${hvem}` : ''); kort = `${km(nær)} fra leiren` + (strid ? ' · ildkamp' : ''); }
    else if (sist) { const ds = Math.hypot(sist.x - L.x, sist.y - L.y), m2 = Math.max(1, Math.round(tid - sist.tid)), sp = FO.spenn(min), hvor = ds <= R.mot.inne ? 'i leiren' : `${km(ds)} ${FO.retning(Math.atan2(sist.y - L.y, sist.x - L.x))} for leiren`;
      tekst = `sist sett ${hvor} for ${m2} min siden · ${sp ? 'framme om ' + sp : 'kan være framme når som helst'}`; kort = `sist sett ${ds <= R.mot.inne ? 'i leiren' : km(ds) + ' unna'} for ${m2} min siden`; }
    else { const n2 = min === null ? null : FO.når(tid, tid + min); tekst = n2 ? `ikke sett – kommer ${n2}` : 'ikke sett ennå – vakter, tårn og kameraer oppdager dem'; kort = n2 ? `ikke sett · ${n2.replace(/ \(.*\)$/, '')}` : 'ikke sett ennå'; }
    return { id: A.id, røvere: A.røvere, hvem: A.navn, side: A.side || 'rød', antall: n, lag: r, sett: kj.length > 0, kjente: kj, nær, iLeiren, strid, sist, min, overskrift, tekst, kort, retning: FO.retning(v) }; }
  // hvem som så dem: vakttårnet (Trussel.VARSEL.tårn), et kamera, vaktene, eller et lag
  function settAv(e) { const L = leir(), f = fsv(), V = window.Spillet && Spillet.Trussel && Spillet.Trussel.VARSEL; if (!L) return '';
    if (V && f.tårn && f.tårn.some(b => Number.isFinite(b.x) && Math.hypot(b.x - e.x, b.y - e.y) <= V.tårn)) return 'sett fra vakttårnet';
    if (window.KameraSpill && KameraSpill.kameraer().some(c => Math.hypot(c.x - e.x, c.y - e.y) <= c.r)) return 'sett av et kamera';
    if (f.varsling && Math.hypot(e.x - L.x, e.y - L.y) < f.varsling) return 'sett av vaktene'; return ''; }
  // ---------- (runde 13, kritiker G, 86-skapene.png) banneret skal ikke ligge oppå knappene når du går ----------
  // Inne i låven la banneret seg over «Se i skapene», «Sikre huset» og «Gå ut» (#inneknapper står under kompasset på liggende telefon).
  // Når du går (body.gaar): treffer banneret en synlig knapp, prøves plassene under knappene i #inneknapper og så nederst på skjermen;
  // den første plassen uten overlapp brukes (ellers nederst). På PC står #inneknapper nederst, så banneret blir der det er.
  const synligKnapp = b => { if (alarm.contains(b) || !b.getClientRects().length) return false; const c = getComputedStyle(b); if (c.visibility === 'hidden' || c.display === 'none' || +c.opacity === 0) return false; const r = b.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight; };
  const overlapp = (a, r) => !(r.right <= a.left + 1 || r.left >= a.right - 1 || r.bottom <= a.top + 1 || r.top >= a.bottom - 1);
  function plasserAlarm() { if (alarm.style.top || alarm.style.bottom) { alarm.style.top = ''; alarm.style.bottom = ''; }
    if (!alarm.classList.contains('på') || !document.body.classList.contains('gaar') || !alarm.getClientRects().length) return null;
    // (knappene, og boksene i skjermbildet når du går – helse/våpen nederst, spaken – så banneret ikke legger seg oppå dem nederst)
    const knapper = [...document.querySelectorAll('button, #nhud .boks, #nhud .vapen, #nhud .helse, #stikke, #spak, .styrespak')].filter(synligKnapp).map(b => b.getBoundingClientRect()), treff = () => { const a = alarm.getBoundingClientRect(); return knapper.some(r => overlapp(a, r)); };
    if (!treff()) return 'oppe';
    const inne = [...document.querySelectorAll('#inneknapper > button')].filter(synligKnapp).map(b => b.getBoundingClientRect().bottom);
    if (inne.length) { alarm.style.top = Math.round(Math.max(...inne) + 6) + 'px'; if (!treff()) return 'under'; }
    alarm.style.top = 'auto'; alarm.style.bottom = 'calc(8px + env(safe-area-inset-bottom,0px))'; return 'nede'; }
  function vis() { const svar = vis0(); plasserAlarm(); return svar; }
  function vis0() { const L = leir(), r = røvere(); if (!r.length) alarm.classList.remove('fjern'); if (L && !r.length && !satt && rapportNå && visRapport()) return; if (L && !r.length && !satt && skade && visSkade()) return; if (!L || (!r.length && !satt)) { alarm.classList.remove('på'); sistAlarm = ''; return; }
    const sett2 = r.filter(e => kjent(e)), nær = sett2.length ? Math.min(...sett2.map(e => Math.hypot(e.x - L.x, e.y - L.y))) : 0, v = retningMotFienden(); let tekst, liten;
    if (!r.length) { tekst = 'Øvelse: forsvaret er satt'; liten = `mot ${FO.retning(v)}`; }
    // (runde 8, telefonkritikeren: «banneret dekker en tredel av bildet når du går selv, også når angrepet er over 3 timer unna») når du går selv
    // (body.gaar), er banneret én smal linje, og er ingen sett og de er over en time unna, står bare varselbrikka (klassen «fjern»)
    else { const st = status(); tekst = st.overskrift; liten = st.tekst; alarm.classList.toggle('fjern', !st.sett && !st.sist && st.min !== null && st.min > 60);
      // (på små skjermer uten forklaringen om tårn og kameraer, så banneret ikke blir høyt)
      if (!st.sett && !st.sist && st.min !== null && !document.body.classList.contains('kort')) liten += ' – vakttårn og kameraer ser dem før de er framme'; }
    const nøkkel = [tekst, liten, satt, window.pekerNede && pekerNede(alarm)].join('|'); alarm.classList.add('på'); alarm.classList.toggle('satt', satt); if (nøkkel === sistAlarm) return; if (window.pekerNede && pekerNede(alarm)) return; sistAlarm = nøkkel;
    alarm.replaceChildren(el('span', {}, el('b', {}, tekst), ' ', el('small', {}, liten)));
    if (!satt) alarm.append(kn('Forsvar leiren', () => sett(false), { id: 'forsvarknapp' })); else alarm.append(el('small', {}, 'lagene holder stillingen'), kn(r.length ? 'Opphev' : 'Avslutt øvelsen', () => opphev(false), { klasse: 'rolig', id: 'opphevknapp' }));
    if (r.length && sett2.length) alarm.append(kn('Vis', () => { const e = sett2.slice().sort((a, b) => Math.hypot(a.x - L.x, a.y - L.y) - Math.hypot(b.x - L.x, b.y - L.y))[0]; if (typeof på3d !== 'undefined' && på3d) return; kam.x = (e.x + L.x) / 2; kam.y = (e.y + L.y) / 2; kam.m = Math.max(1.5, Math.hypot(e.x - L.x, e.y - L.y) * 1.6 / Math.min(VW, VH)); skitten = true; }, { klasse: 'rolig' }));
    else if (r.length) { const st = status(); if (st && st.sist) alarm.append(kn('Vis', () => { if (typeof på3d !== 'undefined' && på3d) return; const q = status(); if (!q || !q.sist) return; kam.x = (q.sist.x + L.x) / 2; kam.y = (q.sist.y + L.y) / 2; kam.m = Math.max(1.5, Math.hypot(q.sist.x - L.x, q.sist.y - L.y) * 1.6 / Math.min(VW, VH)); skitten = true; }, { klasse: 'rolig' })); } }
  // ---------- (runde 8) RAPPORTEN ETTER HVER BØLGE OG HVERT ANGREP (PC-kritikeren: «bølge 2 fikk ingen melding om hvordan det gikk») ----------
  // Ved starten tas et øyeblikksbilde (friske og falne hos oss, byggene, angriperne). Når angrepet er over, kommer én rapport (Forsvar.sluttRapport):
  // i loggen, og (ikke i testene) i banneret til du lukker den, også når det skjer under spoling – og ⏭ stopper («angrepet er over»).
  let fra = null, rapportNå = null; const gitt = new Set();
  const blåTall = () => { const nå = ENHETER.filter(e => e.side === 'blå' && Array.isArray(e.menn)); return { friske: nå.reduce((a, s) => a + s.menn.filter(m => m.hp >= 1).length, 0), falne: nå.reduce((a, s) => a + s.menn.filter(m => m.hp <= 0).length, 0) }; };
  const byggNå = () => (window.LeirSpill && LeirSpill.tilstand() ? LeirSpill.tilstand().bygg.map(b => [b.id, b.hp]) : []);
  const hend = (type, tekst, x, y) => { if (!auto()) return; try { window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: Number.isFinite(x) && Number.isFinite(y) ? { type, tekst, x, y } : { type, tekst } })); } catch (e) { /* eldre nettlesere */ } };
  // (runde 12) helsa til hver mann når angrepet starter, så rapporten kan si HVEM som falt og ble såret (kritiker E)
  const mennNå = () => { const m = new Map(); for (const s of ENHETER) if (s.side === 'blå' && Array.isArray(s.menn)) for (const q of s.menn) m.set(q, q.hp); return m; };
  const mannNavn = (q, s) => (s && s.karakter ? s.navn : s ? `${q.navn} (${s.navn})` : q.navn);
  function navnTap(F0) { const falne = [], sår = []; if (!F0 || !F0.menn) return { falne, sår };
    for (const s of ENHETER) { if (s.side !== 'blå' || !Array.isArray(s.menn)) continue; for (const q of s.menn) { const før = F0.menn.has(q) ? F0.menn.get(q) : 1;
      if (q.hp <= 0 && før > 0) falne.push(mannNavn(q, s)); else if (q.hp > 0 && q.hp < 1 && før >= 1) sår.push(mannNavn(q, s)); } }
    return { falne, sår }; }
  const byggNavn = b => (window.Leir && Leir.BYGG[b.type] ? Leir.BYGG[b.type].navn : b.type);
  function startAngrep(A, id) { const b = blåTall(); fra = { id, friske: b.friske, falne: b.falne, bygg: byggNå(), menn: mennNå(), lag: A ? A.lag.slice() : [], navn: A ? A.navn : 'Røverne', røvere: A ? A.røvere : true, side: A ? A.side : null, t: tid }; rapportNå = null; kampMeldt = ''; snartMeldt = ''; settMeldt = ''; }
  // tapene siden starten: falne, sårede, bygg skadet og ødelagt, og hvor mange av angriperne som er slått ut
  function tap(id) { const F0 = fra && fra.id === id ? fra : null, b = blåTall(); if (!F0) return { falne: 0, sårede: 0, skadet: 0, ødelagt: 0, fiender: 0, fienderUte: 0 };
    const LS = window.LeirSpill && LeirSpill.tilstand(), falne = Math.max(0, b.falne - F0.falne);
    let skadet = 0, ødelagt = 0; const skadetNavn = [], ødelagtNavn = [], skadetBygg = [];
    if (LS) for (const [bid, hp] of F0.bygg) { const q = LS.bygg.find(x => x.id === bid); if (!q || q.hp <= 0) { if (hp > 0) { ødelagt++; ødelagtNavn.push(q ? byggNavn(q) : 'et bygg'); } } else if (q.hp < hp - .01) { skadet++; skadetNavn.push(byggNavn(q)); skadetBygg.push(q.id); } }
    const ute = F0.lag.filter(e => !levende(e) || (Array.isArray(e.menn) && Terreng.slattUt(e.menn)) || e.flykter || !ENHETER.includes(e)).length, N = navnTap(F0), sårede = Math.max(0, F0.friske - b.friske - falne);
    return { falne, sårede, skadet, ødelagt, fiender: F0.lag.length, fienderUte: ute, skadetNavn, ødelagtNavn, skadetBygg,
      falneNavn: N.falne.length === falne ? N.falne : null, sårNavn: N.sår.length === sårede ? N.sår : null }; }
  function giRapport(id, u) { if (gitt.has(id)) return null; gitt.add(id); if (gitt.size > 40) gitt.delete(gitt.values().next().value);
    const r = FO.sluttRapport({ ...tap(id), ...u }); logg(`${r.tittel}. ${r.tekst}`);
    if (auto()) { const t0 = tap(id); rapportNå = { ...r, til: performance.now() + 150000, bygg: t0.skadetBygg || [], sår: (t0.sårede || 0) + (t0.falne || 0) }; hend('annet', 'angrepet er over'); } sistAlarm = ''; vis(); return r; }
  // fra spill/spillet-visning.js når en røverbølge er over: { nr, utfall: 'slått' | 'unna' | 'herjet' | 'slapp', tok, tapte }
  function slutt(u) { return giRapport('r' + u.nr, { hvem: 'Røverne', ...u }); }
  // angrepet er over uten at spillet.js meldte det (en motstanders angrepsgruppe, eller en bølge uten melding)
  function sluttAvSeg(id) { if (id.charAt(0) === 'r') { giRapport(id, { hvem: 'Røverne', nr: +id.slice(1), utfall: 'slått' }); return; }
    const F0 = fra && fra.id === id ? fra : null, ES = window.EskaleringSpill && EskaleringSpill.S ? EskaleringSpill.S() : null, side = F0 && F0.side;
    const f = ES && ES.ferdig ? ES.ferdig.slice().reverse().find(q => q.leir && q.side === side && (!F0 || q.t >= F0.t)) : null, T0 = tap(id);
    giRapport(id, { hvem: F0 ? F0.navn : 'Fienden', utfall: f ? f.utfall : T0.fiender && T0.fienderUte >= T0.fiender ? 'oppgitt' : 'ferdig' }); }
  function visRapport() { const r = rapportNå; if (!r || performance.now() > r.til) { rapportNå = null; return false; }
    const LS = window.LeirSpill && LeirSpill.tilstand(), sk = LS && window.Leir ? FO.skadet(repListe(LS)) : { n: 0 }, ventende = LS ? repListe(LS).filter(q => !q.opptatt && q.hp < FO.R.rep.varsel) : [];
    const nøkkel = ['rapport', r.tittel, ventende.length].join('|'); alarm.classList.add('på'); alarm.classList.add('satt'); alarm.classList.toggle('god', !!r.god); if (nøkkel === sistAlarm || (window.pekerNede && pekerNede(alarm))) return true; sistAlarm = nøkkel;
    // (skadevarselet etter angrepet står i rapporten når rapporten ikke alt sier det)
    alarm.replaceChildren(el('span', { klasse: 'rapport' }, el('b', {}, r.tittel + '.'), ' ', el('small', {}, r.tekst + (sk.n && !/bygg skadet|ødelagt/.test(r.tekst) ? ' ' + sk.tekst + '.' : ''))));
    if (sk.n && ventende.length) alarm.append(kn(`Reparer alle (${Leir.kroner(ventende.reduce((t, q) => t + q.pris, 0))})`, () => { reparerAlle(); rapportNå = null; vis(); }, { id: 'reparerknapp' }));
    // (runde 12) knapper dit det gjelder: det skadde bygget, og Folk (de sårede)
    { const LS2 = window.LeirSpill && LeirSpill.tilstand(), bb = LS2 && r.bygg ? r.bygg.map(i => LS2.bygg.find(q => q.id === i)).filter(Boolean) : [];
      if (bb.length) alarm.append(kn(bb.length === 1 ? `Vis ${byggNavn(bb[0]).toLowerCase()}` : 'Vis byggene', () => { if (typeof på3d !== 'undefined' && på3d) return; kam.x = bb[0].x; kam.y = bb[0].y; kam.m = Math.min(kam.m, 1); if (LeirSpill.velg) LeirSpill.velg(bb[0].id); skitten = true; }, { klasse: 'rolig', id: 'rapportbygg' }));
      if (r.sår && window.FolkSpill && FolkSpill.åpne) alarm.append(kn('De sårede', () => FolkSpill.åpne(), { klasse: 'rolig', id: 'rapportfolk' })); }
    alarm.append(kn('Lukk', () => { rapportNå = null; skade = null; alarm.classList.remove('god'); sistAlarm = ''; vis(); }, { klasse: 'rolig', id: 'rapportlukk' })); return true; }

  // ---------- (runde 8) KAMPEN SKAL SYNES: ⏭ stopper når kampen begynner, og når de er snart framme ----------
  // PC-kritikeren: «etter én spoling sto det: alle 1 røverlag er slått ut» – spolingen gikk forbi hele kampen. Første gang et av lagene dine
  // og en angriper skyter på hverandre i et angrep: en linje i loggen og hendelsen «alarm» (flyt.js stopper spolingen og går ned til 1×).
  let kampMeldt = '', snartMeldt = '', snartAkk = 0, kampUte = '', settMeldt = '';
  // Claudes forslag: et eget lag så nær leiren (meter) = kampen om leiren
  const KAMP_VED = 700;
  KROKER.sim.push(dt => { if (!auto()) return; const A = angrep(); if (!A) return;
    // (bare kamp innen 3 km av leiren – R.hent – teller: en patrulje som møter angriperne langt unna, er ikke kampen om leiren)
    // (runde 12, kritiker E: «Kampen om leiren har begynt (Kari (deg) mot Røvere 1.1)» – kampen var med karakteren i en låve 1 km unna):
    // «kampen om leiren» er bare kamp der et eget lag står innen KAMP_VED av leiren; en kamp et annet sted meldes som det den er, én gang
    if (kampMeldt !== A.id) { const L = leir(), e = L && A.lag.find(q => Math.hypot(q.x - L.x, q.y - L.y) <= R.hent && iStrid(q)), b = e && iStrid(e);
      if (b && Math.hypot(b.x - L.x, b.y - L.y) <= KAMP_VED) { kampMeldt = A.id;
        logg(`Kampen om leiren er i gang: ${b.navn} er i ildkamp med ${e.navn}.`); hend('alarm', `kampen om leiren har begynt (${b.navn} mot ${e.navn})`, b.x, b.y); settMeldt = A.id; }
      else if (b && kampUte !== A.id + b.navn) { kampUte = A.id + b.navn; const km2 = km(Math.hypot(b.x - L.x, b.y - L.y));
        logg(b.karakter ? `Du er i ildkamp med ${e.navn}, ${km2} fra leiren.` : `${b.navn} er i ildkamp med ${e.navn}, ${km2} fra leiren.`); hend('alarm', b.karakter ? `du er i ildkamp med ${e.navn} (${km2} fra leiren)` : `${b.navn} er i ildkamp med ${e.navn} (${km2} fra leiren)`, b.x, b.y); } }
    // (runde 13, kritiker G: «hele kampen skjedde mens ⏭ spolte») første gang noen ser angriperne: en linje i loggen og hendelsen «alarm» –
    // ⏭ stopper og farten går ned til 1×, og kortet har «Vis» (flyt.js). Én gang per angrep.
    if (settMeldt !== A.id) { const L = leir(), kj = L ? A.lag.filter(q => kjent(q)) : [];
      if (kj.length) { settMeldt = A.id; const e = kj.slice().sort((a, b) => Math.hypot(a.x - L.x, a.y - L.y) - Math.hypot(b.x - L.x, b.y - L.y))[0], d = Math.hypot(e.x - L.x, e.y - L.y), hvem = A.røvere ? 'røverne' : A.navn;
        const txt = d <= R.mot.inne ? `${hvem} er sett inne i leiren` : `${hvem} er sett ${km(d)} ${FO.retning(Math.atan2(e.y - L.y, e.x - L.x))} for leiren`;
        logg(txt.charAt(0).toUpperCase() + txt.slice(1) + (satt ? '.' : ' – trykk «Forsvar leiren».')); hend('alarm', txt, e.x, e.y); } }
    // senest ca. 10 min før de er framme (Trussel.VARSEL.snart): farten ned og et varsel til – én gang per angrep (sjekkes hvert spillminutt)
    snartAkk += dt; if (snartAkk < 1 || snartMeldt === A.id) return; snartAkk = 0;
    const V = window.Spillet && Spillet.Trussel && Spillet.Trussel.VARSEL, st = status(); if (!V || !st || st.min === null || st.min > V.snart || st.iLeiren || (st.sett && st.nær <= R.mot.inne * .5)) return;
    snartMeldt = A.id; const hvem = A.røvere ? 'røverne' : A.navn, txt = st.sett || st.sist ? `${hvem} er snart framme (ca. ${Math.max(1, Math.round(st.min))} min)` : `${hvem} kan være framme snart (ikke sett ennå)`;
    logg(txt.charAt(0).toUpperCase() + txt.slice(1) + (satt ? '.' : ' – trykk «Forsvar leiren».')); hend('alarm', txt); });

  // hvert sekund: alarmen, graving i stillingene, og slutten på angrepet
  // (runde 8) angrepet identifiseres med en nøkkel (røverbølgen «r2», en motstanders angrepsgruppe «erød…»): når den skifter, er angrepet over –
  // da kommer rapporten (om spillet.js ikke alt har gitt den), og forsvaret oppheves uten den gamle «Etter angrepet»-linja (rapporten sier det)
  setInterval(() => { const t = T(), A = angrep(), aktiv = A ? A.id : t && t.aktiv ? 'r' + t.aktiv : '';
    if (sistAktiv && sistAktiv !== aktiv) { if (!gitt.has(sistAktiv) && auto()) sluttAvSeg(sistAktiv); if (satt || snap || vakt) opphev(false); motFerdig(); if (auto()) etterAngrep(); }
    if (aktiv && aktiv !== sistAktiv) startAngrep(A, aktiv); sistAktiv = aktiv;
    autoForsvar(A);
    if (typeof tempo === 'undefined' || tempo > 0) { motSteg(); repSteg(); hjemSteg(); }
    if (satt && window.Feltarbeid) for (const s of ENHETER) if (s.forsvar && s.side === 'blå' && !s.sti && !s.planlegger && !s.nedgravd && s.graver == null && !s.forsvar.voll && Math.hypot(s.x - s.forsvar.x, s.y - s.forsvar.y) < 25) Feltarbeid.startGrav(s);
    vis(); }, 1000);

  // ---------- (runde 12) LEIREN FORSVARES AV SEG SELV NÅR DU SPOLER ----------
  // PC-kritiker F: «Den andre bølgen tapte jeg fordi den kom mens jeg spolte, og "Forsvar leiren" må trykkes manuelt» (67-krig-dag3.png).
  // Står farten på 60× eller mer (også ⏭) mens et angrep på leiren er i gang – eller er angriperne nærmere enn AUTO.nær – setter lagene
  // hjemme seg i forsvar av seg selv, akkurat som «Forsvar leiren», og loggen sier det. Én gang per angrep: opphever du, står det.
  // Claudes forslag. Ikke i testene uten ForsvarSpill.test.
  const AUTO = { fart: 60, nær: 600 }, autoGjort = new Set(), spolt = new Set();
  function autoForsvar(A) { if (!auto() || !A || satt || autoGjort.has(A.id)) return null; const L = leir(); if (!L) return null;
    if (typeof tempo !== 'undefined' && tempo >= AUTO.fart) spolt.add(A.id);
    const nær = A.lag.some(e => Math.hypot(e.x - L.x, e.y - L.y) <= AUTO.nær); if (!spolt.has(A.id) && !nær) return null;
    autoGjort.add(A.id); const hvem = A.røvere ? 'Røverne' : A.navn;
    logg(spolt.has(A.id) ? `${hvem} kom mens du spolte: lagene hjemme forsvarer leiren av seg selv (som «Forsvar leiren»).` : `${hvem} er nesten i leiren: lagene hjemme forsvarer den av seg selv (som «Forsvar leiren»).`);
    const r = sett(false); if (r && !r.lag && !r.vakt) logg('Ingen lag er hjemme til å forsvare leiren – send et lag hjem, eller sett folk på vakt.'); return r; }
  // ---------- kartet: pil fra røverne mot leiren, og stillingene ----------
  KROKER.tegn.push((g, vx0, vy1) => { const L = leir(); if (!L) return; const m = kam.m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m; g.save();
    for (const e of røvere()) { if (!synlig(e)) continue; const x0 = sx(e.x), y0 = sy(e.y), x1 = sx(L.x), y1 = sy(L.y), d = Math.hypot(x1 - x0, y1 - y0); if (d < 30) continue; const ux = (x1 - x0) / d, uy = (y1 - y0) / d, l = Math.min(d - 16, 90);
      g.strokeStyle = 'rgba(232,110,80,.9)'; g.fillStyle = 'rgba(232,110,80,.9)'; g.lineWidth = 2.5; g.setLineDash([7, 5]); g.beginPath(); g.moveTo(x0 + ux * 14, y0 + uy * 14); g.lineTo(x0 + ux * l, y0 + uy * l); g.stroke(); g.setLineDash([]);
      const px = x0 + ux * (l + 8), py = y0 + uy * (l + 8); g.beginPath(); g.moveTo(px, py); g.lineTo(px - ux * 11 - uy * 6, py - uy * 11 + ux * 6); g.lineTo(px - ux * 11 + uy * 6, py - uy * 11 - ux * 6); g.closePath(); g.fill(); }
    // (runde 8) KAMPEN I 2D: munningsglimt ved den som skyter (de første 0,35 s av hver salve i SKUDD) og en pulserende ring med «I ildkamp»
    // ved lagene som skyter eller blir skutt på – egne lag (der du vet hvor de er) og fiender du ser
    { const nå = performance.now(), iKamp = new Set();
      for (const k of SKUDD) { if (!k.a || !k.b) continue; const synA = k.a.side === 'blå' ? !KROKER.skjul.some(f => f(k.a)) : synlig(k.a); if (!synA && !(k.b.side === 'blå' && !KROKER.skjul.some(f => f(k.b)))) continue;
        if (synA) iKamp.add(k.a); if (k.b.side === 'blå' ? !KROKER.skjul.some(f => f(k.b)) : synlig(k.b)) iKamp.add(k.b);
        const alder = 1400 - (k.til - nå); if (!synA || alder > 350) continue; const x = sx(k.a.x), y = sy(k.a.y); if (x < -30 || y < -30 || x > VW + 30 || y > VH + 30) continue;
        const v = Math.atan2(sy(k.b.y) - y, sx(k.b.x) - x), r0 = 9, l = 7 * (1 - alder / 350) + 3; g.strokeStyle = 'rgba(255,236,170,.95)'; g.lineWidth = 2;
        for (const dv of [-.45, 0, .45]) { g.beginPath(); g.moveTo(x + Math.cos(v + dv) * r0, y + Math.sin(v + dv) * r0); g.lineTo(x + Math.cos(v + dv) * (r0 + l), y + Math.sin(v + dv) * (r0 + l)); g.stroke(); }
        g.fillStyle = 'rgba(255,214,120,.9)'; g.beginPath(); g.arc(x + Math.cos(v) * r0, y + Math.sin(v) * r0, 2.6, 0, 6.283); g.fill(); skitten = true; }
      const puls = .55 + .45 * Math.sin(nå / 160);
      for (const s of iKamp) { if (!Array.isArray(s.menn) || !levende(s)) continue; const x = sx(s.x), y = sy(s.y); if (x < -30 || y < -30 || x > VW + 30 || y > VH + 30) continue;
        g.strokeStyle = s.side === 'blå' ? `rgba(255,200,120,${.5 + .4 * puls})` : `rgba(240,110,80,${.5 + .4 * puls})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 15 + 3 * puls, 0, 6.283); g.stroke();
        if (s.side === 'blå') { g.font = '600 12px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(40,14,8,.9)'; const t = 'I ildkamp', ty = window.Etikett ? Etikett.tekst(g, t, x, y + 30, 1, Etikett.REGLER.prio.viktig) : y + 30; g.strokeText(t, x, ty); g.fillStyle = '#ffb49a'; g.fillText(t, x, ty); } skitten = true; } }
    if (satt) for (const s of ENHETER) { if (!s.forsvar || s.side !== 'blå') continue; const x = sx(s.forsvar.x), y = sy(s.forsvar.y); if (x < -20 || y < -20 || x > VW + 20 || y > VH + 20) continue; g.strokeStyle = s.forsvar.voll ? 'rgba(240,215,154,.95)' : 'rgba(150,190,235,.95)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 9, 0, 6.283); g.stroke(); g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.moveTo(x, y - 4); g.lineTo(x, y + 4); g.stroke(); }
    g.restore(); });

  // ---------- (runde 13, kritiker H: «røverne kom aldri – varselet ble flyttet et døgn fram») NESTE BØLGE: én tid og en nedtelling ----------
  // Tida er SpilletSpill.T().nesteSpill (spillminutter), som nå lagres og holdes fast etter omlasting (trussel-lagring.js). Med usikkerhet
  // (Forsvar.når: «trolig i natt (ca. kl. 02–05)») og en nedtelling. Bølgen kan komme før om du spiller lenge i sanntid (spillet-visning.js).
  function neste() { const t = T(); if (!t || t.aktiv || !Number.isFinite(t.nesteSpill)) return null; const igjen = Math.max(0, t.nesteSpill - tid);
    return { min: igjen, når: FO.når(tid, t.nesteSpill), nedtelling: FO.nedtelling(igjen), tekst: `Røverne drar ut mot leiren ${FO.når(tid, t.nesteSpill)} – om ${FO.nedtelling(igjen)}` }; }
  // brikke øverst til venstre (narhud.js, VARSEL_TILLEGG) med nedtellingen når neste bølge er under NESTE_BRIKKE spillminutter unna
  // (Claudes forslag: 12 timer). Ikke i testene uten ForsvarSpill.test.
  const NESTE_BRIKKE = 720;
  (window.VARSEL_TILLEGG = window.VARSEL_TILLEGG || []).push(() => { if (!auto()) return []; const n = neste(); if (!n || n.min > NESTE_BRIKKE) return [];
    return [{ i: 'varsel', k: n.min <= 120 ? 'fare' : '', t: `Røverne om ${n.nedtelling}`, s: n.når, f: () => logg(n.tekst + '.') }]; });
  const nesteLinje = e => { const n = neste(); return n ? e('div', { klasse: 'raad', id: 'nestebolge' }, n.tekst + '.') : ''; };
  // ---------- Leir-menyen: beredskapen ----------
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el: e, knapp }) => { const B = beredskap(); if (!B) return; const t = T(), neste = t && window.Spillet ? Spillet.Trussel.lag((t.bølge || 0) + 1) : null;
    hode.append(e('h3', { 'data-fane': 'bygg' }, 'Forsvar'));
    const boks = e('div', { klasse: 'forsvar ' + (B.sum < 30 ? 'svak' : B.sum < 55 ? 'svak' : B.sum < 80 ? 'middels' : '') }, e('div', { klasse: 'sum' }, e('b', {}, `Beredskap ${B.sum} av 100 – ${B.ord}`), e('small', {}, t && t.aktiv ? 'angrep pågår' : neste ? `neste bølge: ${neste} røverlag` : '')), nesteLinje(e), e('div', { klasse: 'strek' }, e('i', { style: `width:${B.sum}%` })));
    for (const p of B.punkter) boks.append(e('div', { klasse: 'p' + (p.ok ? ' ok' : ''), 'data-punkt': p.id }, e('span', { klasse: 'h' }, p.ok ? '✓' : '○'), e('span', {}, p.navn, ' ', e('small', {}, p.tekst)), e('small', {}, `${p.poeng}/${p.av}`)));
    if (B.råd.length) boks.append(e('div', { klasse: 'raad' }, 'Dette hjelper mest nå: ' + B.råd[0]));
    boks.append(satt ? knapp(røvere().length ? 'Opphev forsvaret' : 'Avslutt øvelsen', () => { opphev(false); if (LeirSpill.visMeny) LeirSpill.visMeny(); }, { id: 'forsvaropphev' }) : knapp(røvere().length ? 'Forsvar leiren nå' : 'Øv: sett lagene i stilling', () => { sett(!røvere().length); if (LeirSpill.visMeny) LeirSpill.visMeny(); }, { id: 'forsvarov' }));
    { const LS = window.LeirSpill && LeirSpill.tilstand(), sk = LS && window.Leir ? FO.skadet(repListe(LS).filter(q => !q.opptatt)) : { n: 0 }, på = repPå();
      boks.append(knapp(`Byggelagene reparerer av seg selv: ${på ? 'på' : 'av'}`, () => { settRep(!repPå()); if (LeirSpill.visMeny) LeirSpill.visMeny(); }, { id: 'reparerauto' }));
      if (sk.n) boks.append(knapp(`${sk.tekst} – reparer alle`, () => { reparerAlle(); if (LeirSpill.visMeny) LeirSpill.visMeny(); }, { id: 'reparerallemeny' })); }
    boks.append(e('small', { style: 'display:block;margin-top:6px;color:var(--ink-dim,#a99)' }, 'Når røverne kommer, står det et banner øverst. «Forsvar leiren» sender alle lag innen 3 km i stilling på den siden fienden kommer fra, bak sandsekkvollene først, og lar dem grave seg ned. Folk på «vakt» blir Leirvakta. Kommer røverne inn i leiren, går lagene hjemme og Leirvakta mot dem av seg selv. Mellom angrepene reparerer ledige byggelag de mest skadde byggene (det koster penger; 300 000 kr blir alltid igjen i kassa).'));
    hode.append(boks); });
  // ---------- (runde 4) MOT RØVERNE I LEIREN: lagene hjemme og Leirvakta går mot dem av seg selv ----------
  // Lag innen 3 km (R.hent) som står stille, er i forsvarsstilling eller allerede går mot røverne – ikke lag på vei et annet sted
  // (en ordre fra deg), om bord eller slått ut. Folk på «vakt» blir Leirvakta som når du trykker «Forsvar leiren».
  const kanStille = s => { const l = window.logg; window.logg = () => {}; try { return KROKER.kanOrdre.every(f => f(s)); } finally { window.logg = l; } };
  const stiSlutt = s => (s.sti && s.sti.length ? s.sti[s.sti.length - 1] : null);
  const motVår = s => { const e = stiSlutt(s); return !e || (s.motMål && Math.hypot(e[0] - s.motMål.x, e[1] - s.motMål.y) < 25) || (s.forsvar && Math.hypot(e[0] - s.forsvar.x, e[1] - s.forsvar.y) < 25); };
  let motMeldt = false;
  // inne i leiren: nær midten, eller så nær et bygg at de skader det (HERJER i leir-visning.js). (Kjøring 7: Kystalliansens lag
  // raserte leiren på dag 6 mens lagene sto stille – derfor gjelder det alle fiender i leiren, ikke bare røverbølgen.)
  const herjere = () => { const L = leir(); return L ? ENHETER.filter(e => e.side !== 'blå' && levende(e) && Array.isArray(e.menn) && !e.trekker && !e.flykter && !Terreng.slattUt(e.menn) && (Math.hypot(e.x - L.x, e.y - L.y) <= R.mot.inne || (window.HERJER && HERJER.has(e)))) : []; };
  let selvVakt = false;
  function motSteg() { if (!auto()) return; const L = leir(); if (!L) return; const inne = herjere();
    if (!inne.length) { if (motMeldt) motFerdig();
      // Leirvakta som kom av seg selv uten røverbølge (fiender fra en fraksjon), legger ned våpnene når de er ute av leiren
      if (selvVakt && vakt && !satt && !(T() && T().aktiv)) opphev(false); if (!vakt) selvVakt = false; return; }
    if (!vakt) { const lv = leirvakt({ x: L.x + 12, y: L.y, voll: false }); if (lv) { selvVakt = true; logg(`Leirvakta (${lv.menn.length} fra vakta) tar opp våpen.`); } }
    const lag = egne().filter(s => !s.ombord && !s.planlegger && !Terreng.slattUt(s.menn) && Math.hypot(s.x - L.x, s.y - L.y) <= R.hent && motVår(s));
    if (vakt && levende(vakt) && !vakt.planlegger) lag.push(vakt);
    const navn = [];
    for (const q of FO.motHerjere(lag, inne, L)) { const s = q.lag;
      // på vei dit vi sendte laget, og målet har ikke flyttet seg mye; eller står alt nær nok; eller fikk ordre for under 4 s siden
      if (s.sti && s.motMål && Math.hypot(s.motMål.x - q.mål.x, s.motMål.y - q.mål.y) < R.mot.ny) continue;
      if (!s.sti && q.meter <= R.mot.avstand + R.mot.nær) continue;
      // står laget stille og skyter alt (kjøring 6b: lagene flyttet seg hele tiden etter røverne og traff dårlig på marsj)
      if (!s.sti && s.skyterPå && s.skyterPå.size && q.meter <= R.mot.skyter) continue;
      if (performance.now() - (s.motTid || 0) < 4000 || !kanStille(s)) continue;
      s.motHerjer = q.fi.navn; s.motMål = q.mål; s.motTid = performance.now(); ordre(s, q.mål.x, q.mål.y, true); navn.push(s.navn); }
    if (navn.length && !motMeldt) { motMeldt = true; logg(`${inne.some(e => e.raid) ? 'Røverne' : 'Fienden'} er inne i leiren! ${navn.join(', ')} går mot dem.`); } }
  // røverne er ute av leiren (eller angrepet er over): lagene i forsvarsstilling går tilbake dit
  function motFerdig() { motMeldt = false; for (const s of ENHETER) { if (!s.motMål) continue; const gikk = motVår(s); delete s.motHerjer; delete s.motMål; delete s.motTid; if (gikk && s.forsvar && levende(s) && Math.hypot(s.x - s.forsvar.x, s.y - s.forsvar.y) > 12) ordre(s, s.forsvar.x, s.forsvar.y, true); } }

  // ---------- (runde 4) HJEM IGJEN: lag som trakk seg tilbake av seg selv (stridsreglene), går hjem når faren er over ----------
  function hjemSteg() { if (!auto()) return; const L = leir(); if (!L) return; let n = 0;
    for (const s of egne()) { const v = s.egetValg; if (!v || !/^trakk/.test(v.hva) || s.sti || s.planlegger || s.ombord || s.hjemSendt === v.t || tid - v.t < R.hjem.vent) continue;
      const d = Math.hypot(s.x - L.x, s.y - L.y); if (d < R.hjem.fra || d > R.hent) continue;
      if (ENHETER.some(e => e.side !== 'blå' && levende(e) && Math.hypot(e.x - s.x, e.y - s.y) < R.hjem.fiende)) continue;
      if (!kanStille(s)) continue; s.hjemSendt = v.t; const a = Math.random() * 6.2832; ordre(s, L.x + Math.cos(a) * 40, L.y + Math.sin(a) * 40, true);
      logg(`${s.navn} trakk seg tilbake tidligere og går nå hjem til leiren igjen.`); if (++n >= 3) break; } }

  // ---------- (runde 4) REPARASJON: byggelagene reparerer skadde bygg når de ikke har annet å gjøre ----------
  // Standard på (også i lagrede spill); valget lagres per leir i «riksbrudd-reparer». Bare mellom angrepene, og reserven blir i kassa.
  const REP_NØKKEL = 'riksbrudd-reparer', leirId = () => { const L = leir(); return L ? Math.round(L.x) + ',' + Math.round(L.y) : ''; };
  const repLes = () => { try { const d = JSON.parse(localStorage.getItem(REP_NØKKEL) || 'null'); return d && d.leir === leirId() ? d.d : null; } catch (e) { return null; } };
  let repValg = null;
  const repPå = () => { if (!repValg || repValg.leir !== leirId()) repValg = { leir: leirId(), auto: (repLes() || { auto: true }).auto !== false }; return repValg.auto; };
  function settRep(på) { repPå(); repValg.auto = !!på; try { localStorage.setItem(REP_NØKKEL, JSON.stringify({ leir: leirId(), d: { auto: !!på } })); } catch (e) { /* sperret */ } }
  const bonus = () => (window.OppstartSpill && OppstartSpill.bonus ? OppstartSpill.bonus() : {});
  // byggene som kan repareres: ferdige, ikke ødelagt, ikke opptatt – med prisen
  const repListe = LS => LS.bygg.filter(b => Leir.ferdig(b) && b.hp > 0 && b.hp < 1).map(b => ({ id: b.id, hp: b.hp, opptatt: !!b.arbeid, pris: (Leir.reparerKostnad(b, bonus()) || { pris: 0 }).pris }));
  function reparer(ider, stille) { const LS = window.LeirSpill && LeirSpill.tilstand(); if (!LS) return 0; let n = 0;
    for (const id of ider) { const b = LS.bygg.find(q => q.id === id), r = b && Leir.reparer(LS, id, OppstartSpill.betal, bonus()); if (!r || r.feil) continue; n++;
      if (!stille) logg(`Byggelaget reparerer ${(Leir.BYGG[b.type] || {}).navn ? Leir.BYGG[b.type].navn.toLowerCase() : 'et bygg'} (${Leir.kroner(r.pris)}, ca. ${Leir.tidTekst(r.timer * 60)}).`); }
    if (n) { if (LeirSpill.lagre) LeirSpill.lagre(); if (LeirSpill.visMeny) LeirSpill.visMeny(); skitten = true; } return n; }
  let repSist = 0;
  function repSteg(tving) { if (!auto() || !repPå() || !window.Leir || !window.LeirSpill) return; const t = T(); if (t && t.aktiv) return; if (!tving && performance.now() - repSist < 3000) return; repSist = performance.now();
    const LS = LeirSpill.tilstand(), S = window.OppstartSpill && OppstartSpill.tilstand(); if (!LS || !S) return; const ledige = Leir.byggelag(LS) - Leir.jobber(LS).length; if (ledige <= 0) return;
    // ikke mens fiender er i leiren (byggene ville bli skadet igjen med en gang)
    const L = leir(); if (L && ENHETER.some(e => e.side !== 'blå' && levende(e) && Math.hypot(e.x - L.x, e.y - L.y) <= R.mot.inne + 50)) return;
    reparer(FO.velgReparasjon(repListe(LS), ledige, S.penger)); }
  // «Reparer alle»: alle skadde bygg i køen så langt pengene rekker (uten reserve – du har trykket selv)
  function reparerAlle() { const LS = window.LeirSpill && LeirSpill.tilstand(); if (!LS) return 0; const ider = repListe(LS).filter(q => !q.opptatt && q.hp < 1).sort((a, b) => a.hp - b.hp).map(q => q.id), n = reparer(ider, true);
    logg(n ? `${n} bygg står i køen for reparasjon.` : 'Ingen bygg kunne repareres nå (opptatt, eller ikke nok penger).'); skade = null; vis(); return n; }

  // ---------- (runde 4) SKADEVARSELET etter et angrep: «N bygg er skadet» med knapp ----------
  function etterAngrep() { const LS = window.LeirSpill && LeirSpill.tilstand(); if (!LS || !window.Leir) return; const s = FO.skadet(repListe(LS)); skade = s.n ? { ...s, til: performance.now() + 180000 } : null; vis(); }
  function visSkade() { const LS = window.LeirSpill && LeirSpill.tilstand(); if (!LS || performance.now() > skade.til) { skade = null; return false; } const s = FO.skadet(repListe(LS)); if (!s.n) { skade = null; return false; }
    const ventende = repListe(LS).filter(q => !q.opptatt && q.hp < FO.R.rep.varsel), auto2 = repPå(), liten = ventende.length ? (auto2 ? 'byggelagene reparerer dem etter tur' : 'reparer dem før neste bølge') : 'byggelagene reparerer dem nå';
    const nøkkel = ['skade', s.n, ventende.length, auto2].join('|'); alarm.classList.add('på'); alarm.classList.add('satt'); if (nøkkel === sistAlarm || (window.pekerNede && pekerNede(alarm))) return true; sistAlarm = nøkkel;
    alarm.replaceChildren(el('span', {}, el('b', {}, s.tekst), ' ', el('small', {}, liten)));
    if (ventende.length) alarm.append(kn(`Reparer alle (${Leir.kroner(ventende.reduce((t, q) => t + q.pris, 0))})`, reparerAlle, { id: 'reparerknapp' }));
    alarm.append(kn('Lukk', () => { skade = null; vis(); }, { klasse: 'rolig' })); return true; }

  // VAKTTÅRNET SER RØVERNE PÅ LANGT HOLD (19. nov, Claudes forslag – Spillet.Trussel.VARSEL.tårn, 1,5 km): et bemannet vakttårn er
  // det som gir varsel i tide
  KROKER.ser.push(e => { if (!e || !(e.raid > 0) || e.side === 'blå') return false; const V = window.Spillet && Spillet.Trussel && Spillet.Trussel.VARSEL; if (!V) return false;
    const f = fsv(); return !!(f.tårn && f.tårn.some(b => Number.isFinite(b.x) && Math.hypot(b.x - e.x, b.y - e.y) <= V.tårn)); });
  // etter omlasting (spill/trussel-lagring.js): forsvaret var satt – lagene har plassen og reglene sine igjen
  // (runde 13, kritiker G: «etter omlasting var Forsvar leiren borte») – TrusselLagringSpill.tilbake kalles fra start() i spillet-visning.js
  // FØR SpilletSpill er klar, så T() var null og forsvaret ble ikke satt. Nå settes det også da (bare ikke når vi vet at ingen angriper).
  function gjenopprett() { const t = T(); if ((t && !t.aktiv) || satt) return false; satt = true; sistAlarm = ''; vis(); return true; }
  // anslaget lagres med angrepet (trussel-lagring.js), så det er det samme etter omlasting
  const anslagTilstand = () => (est && Number.isFinite(est.v) ? { id: est.id, v: est.v, t: est.t, minNær: Number.isFinite(est.minNær) ? est.minNær : null, sett: !!est.sett, rute: !!est.rute } : null);
  function settAnslag(o) { if (!o || typeof o.id !== 'string' || !Number.isFinite(o.v) || !Number.isFinite(o.t)) return false;
    est = { id: o.id, v: o.v, t: o.t, minNær: Number.isFinite(o.minNær) ? o.minNær : Infinity, sett: !!o.sett, rute: !!o.rute }; sistAlarm = ''; return true; }
  window.ForsvarSpill = { beredskap, sett, autoForsvar, AUTO, opphev, gjenopprett, anslagTilstand, settAnslag, neste, kjent, anslag, status, angrep, slutt, rapport: () => rapportNå, lukkRapport: () => { rapportNå = null; vis(); }, erSatt: () => satt, vakt: () => vakt, vis, retning: () => sistV, settRetning: v => { sistV = v; },
    test: false, motSteg, motFerdig, hjemSteg, herjere, repSteg, reparerAlle, repPå, settRep, etterAngrep, skade: () => skade, lukkSkade: () => { skade = null; vis(); } };
})();
