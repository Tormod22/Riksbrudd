'use strict';
/* Riksbrudd – FORSVAR AV LEIREN I SPILLET (17. nov, brukeren – se spill/forsvar.js for reglene).
 *  ALARMEN: når røvere er på vei (SpilletSpill.T().aktiv), står det et banner øverst: hvor mange, fra hvilken kant, hvor langt unna og
 *   hvor lenge til de er framme (avstanden bare når noen faktisk ser dem – derfor lønner vakter, tårn og kameraer seg).
 *  «FORSVAR LEIREN»: ett trykk sender alle lag innen 3 km til stillinger på den siden fienden kommer fra – bak sandsekkvollene først –,
 *   lar dem grave seg ned, og gir dem regelen «hold stillingen» til angrepet er over. Folk på «vakt» blir Leirvakta, et eget lag.
 *  BEREDSKAPEN står i Leir-menyen (fanen Bygg): poeng, hva som mangler, og hva som hjelper mest.
 *  RAPPORTEN kommer i loggen når angrepet er over. window.ForsvarSpill. Alarmen setter ikke forsvaret av seg selv – du trykker.
 */
(function () {
  const FO = window.Forsvar; if (!FO) return;
  const R = FO.R, HOLD = { ild: 'fri', underlegen: 'kjemp', tap: 0, fram: 'nei' };
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const kn = (tekst, fn, a = {}) => { const b = el('button', a, tekst); b.onclick = fn; return b; };
  const leir = () => { const S = window.OppstartSpill && OppstartSpill.tilstand(); return S && S.leir ? S.leir : null; };
  const T = () => (window.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill.T() : null);
  const røvere = () => { const t = T(); return t && t.aktiv ? ENHETER.filter(e => e.raid === t.aktiv && levende(e)) : []; };
  const egne = () => ENHETER.filter(e => e.side === 'blå' && !e.karakter && !e.leirvakt && levende(e));
  const folk = () => (window.FolkSpill ? FolkSpill.tilstand() : null), fsv = () => (window.FolkSpill ? FolkSpill.forsvar() : { tårn: [], sekker: [], varsling: 0, vakter: 0 });
  const km = m => (m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(m / 10) * 10 + ' m');
  let satt = false, sistV = Math.PI / 2, snap = null, vakt = null, sistAktiv = 0, skade = null;
  // (runde 4) det som skjer av seg selv (mot røverne i leiren, reparasjon, skadevarselet): ikke i testene (navigator.webdriver) uten ForsvarSpill.test
  const auto = () => !navigator.webdriver || !!(window.ForsvarSpill && ForsvarSpill.test);

  // ---------- beredskapen ----------
  function beredskap() { const L = leir(); if (!L) return null; const f = fsv(), t = T(), hjemme = egne().filter(s => Math.hypot(s.x - L.x, s.y - L.y) <= R.nær), ammo = hjemme.length && window.Forsyning ? hjemme.reduce((a, s) => a + Forsyning.ammo(s), 0) / hjemme.length : 1;
    const kam = window.KameraSpill ? KameraSpill.kameraer().reduce((m, c) => Math.max(m, c.r + Math.hypot(c.x - L.x, c.y - L.y)), 0) : 0;
    return FO.beredskap({ lag: hjemme.length, tårn: f.tårn.length, sekker: f.sekker.length, varsling: Math.max(f.varsling || 0, kam), vakter: f.vakter || 0, ammo, bølge: t && window.Spillet ? Spillet.Trussel.lag((t.bølge || 0) + (t.aktiv ? 0 : 1)) : 1 }); }

  // ---------- sett forsvaret ----------
  function retningMotFienden() { const L = leir(), r = røvere(); if (r.length) { const x = r.reduce((a, e) => a + e.x, 0) / r.length, y = r.reduce((a, e) => a + e.y, 0) / r.length; sistV = Math.atan2(y - L.y, x - L.x); } return sistV; }
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
  function opphev(rapport) { for (const s of ENHETER) { if (s.stridFør) { s.strid = s.stridFør; delete s.stridFør; delete s.bevSatt; } delete s.forsvar; }
    if (vakt) { const F = folk(); for (const m of vakt.menn) { const p = F && F.personer.find(q => q.id === m.person); if (p && m.hp < 1) p.helse = Math.min(p.helse, m.hp <= 0 ? .15 : .4); } const i = ENHETER.indexOf(vakt); if (i >= 0) ENHETER.splice(i, 1); if (valgt === vakt) { valgt = null; if (window.lukkPanel) lukkPanel(); } vakt = null; }
    if (rapport && snap) { const nå = ENHETER.filter(e => e.side === 'blå' && !e.karakter), friske = nå.reduce((a, s) => a + s.menn.filter(m => m.hp >= 1).length, 0), falne = nå.reduce((a, s) => a + s.menn.filter(m => m.hp <= 0).length, 0) - snap.falne, L = window.LeirSpill && LeirSpill.tilstand();
      const bygg = L ? snap.bygg.filter(([id, hp]) => { const b = L.bygg.find(q => q.id === id); return !b || b.hp < hp - .01; }).length : 0;
      logg('Etter angrepet: ' + FO.rapport({ fiender: snap.fiender, fienderUte: snap.fiender, falne: Math.max(0, falne), sårede: Math.max(0, snap.egne - friske - Math.max(0, falne)), bygg })); }
    satt = false; snap = null; vis(); skitten = true; }

  // ---------- alarmen ----------
  const css = document.createElement('style');
  css.textContent = `#alarm{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 54px); z-index:9; display:none; max-width:min(560px,94vw); padding:7px 10px; background:#2a120d; border:1px solid #e0714f; color:#f3e3d6; font-size:14.5px; box-shadow:0 4px 14px rgba(0,0,0,.5); }
#alarm.på{ display:flex; flex-wrap:wrap; gap:6px 10px; align-items:center; justify-content:center; } #alarm b{ color:#ffb49a; } #alarm small{ color:#d8b8a8; } #alarm button{ background:#4a1d14; border:1px solid #e0714f; color:#fff; min-height:36px; padding:2px 12px; font:inherit; font-size:14px; cursor:pointer; } #alarm button.rolig{ background:#2a2318; border-color:var(--rule,#4a4030); color:var(--ink,#e7dcc3); } #alarm.satt{ background:#1c170f; border-color:#c9b26a; }
body.kort #alarm{ top:calc(var(--topp,58px) + 42px); font-size:13.5px; padding:5px 8px; } body.krig #alarm{ display:none; }
#leirmeny .forsvar .sum{ display:flex; justify-content:space-between; align-items:baseline; gap:8px; } #leirmeny .forsvar .strek{ height:11px; background:#2e281e; margin:3px 0 6px; } #leirmeny .forsvar .strek i{ display:block; height:100%; background:#8fc46a; } #leirmeny .forsvar.svak .strek i{ background:#e8a46a; } #leirmeny .forsvar.middels .strek i{ background:#c9b26a; }
#leirmeny .forsvar .p{ display:grid; grid-template-columns:20px 1fr auto; gap:6px; padding:2px 0; font-size:14px; } #leirmeny .forsvar .p small{ color:var(--ink-dim,#a99); } #leirmeny .forsvar .p.ok .h{ color:#9fd08a; } #leirmeny .forsvar .p:not(.ok) .h{ color:#e8a46a; } #leirmeny .forsvar .raad{ margin:6px 0; font-size:13px; color:#e8d7a8; }`;
  document.head.appendChild(css);
  const alarm = el('div', { id: 'alarm', role: 'alert' }); document.body.appendChild(alarm);
  let sistAlarm = '';
  function vis() { const L = leir(), r = røvere(); if (L && !r.length && !satt && skade && visSkade()) return; if (!L || (!r.length && !satt)) { alarm.classList.remove('på'); sistAlarm = ''; return; }
    const sett2 = r.filter(e => synlig(e)), nær = r.length ? Math.min(...r.map(e => Math.hypot(e.x - L.x, e.y - L.y))) : 0, v = retningMotFienden(); let tekst, liten;
    if (!r.length) { tekst = 'Øvelse: forsvaret er satt'; liten = `mot ${FO.retning(v)}`; }
    else { tekst = `Angrep: ${r.length === 1 ? 'ett røverlag' : r.length + ' røverlag'} fra ${FO.retning(v)}`; liten = sett2.length ? `${km(nær)} unna · framme om ca. ${Math.max(1, Math.round(FO.ankomst(nær)))} min` : 'ikke sett ennå – vakter, tårn og kameraer oppdager dem'; }
    const nøkkel = [tekst, liten, satt, window.pekerNede && pekerNede(alarm)].join('|'); alarm.classList.add('på'); alarm.classList.toggle('satt', satt); if (nøkkel === sistAlarm) return; if (window.pekerNede && pekerNede(alarm)) return; sistAlarm = nøkkel;
    alarm.replaceChildren(el('span', {}, el('b', {}, tekst), ' ', el('small', {}, liten)));
    if (!satt) alarm.append(kn('Forsvar leiren', () => sett(false), { id: 'forsvarknapp' })); else alarm.append(el('small', {}, 'lagene holder stillingen'), kn(r.length ? 'Opphev' : 'Avslutt øvelsen', () => opphev(false), { klasse: 'rolig', id: 'opphevknapp' }));
    if (r.length && sett2.length) alarm.append(kn('Vis', () => { const e = sett2[0]; if (typeof på3d !== 'undefined' && på3d) return; kam.x = (e.x + L.x) / 2; kam.y = (e.y + L.y) / 2; kam.m = Math.max(1.5, Math.hypot(e.x - L.x, e.y - L.y) * 1.6 / Math.min(VW, VH)); skitten = true; }, { klasse: 'rolig' })); }
  // hvert sekund: alarmen, graving i stillingene, og slutten på angrepet
  setInterval(() => { const t = T(), aktiv = t ? t.aktiv : 0; if (sistAktiv && !aktiv) { if (satt || snap || vakt) opphev(true); motFerdig(); if (auto()) etterAngrep(); } if (aktiv && !sistAktiv && !snap) snap = null; sistAktiv = aktiv;
    if (typeof tempo === 'undefined' || tempo > 0) { motSteg(); repSteg(); }
    if (satt && window.Feltarbeid) for (const s of ENHETER) if (s.forsvar && s.side === 'blå' && !s.sti && !s.planlegger && !s.nedgravd && s.graver == null && !s.forsvar.voll && Math.hypot(s.x - s.forsvar.x, s.y - s.forsvar.y) < 25) Feltarbeid.startGrav(s);
    vis(); }, 1000);

  // ---------- kartet: pil fra røverne mot leiren, og stillingene ----------
  KROKER.tegn.push((g, vx0, vy1) => { const L = leir(); if (!L) return; const m = kam.m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m; g.save();
    for (const e of røvere()) { if (!synlig(e)) continue; const x0 = sx(e.x), y0 = sy(e.y), x1 = sx(L.x), y1 = sy(L.y), d = Math.hypot(x1 - x0, y1 - y0); if (d < 30) continue; const ux = (x1 - x0) / d, uy = (y1 - y0) / d, l = Math.min(d - 16, 90);
      g.strokeStyle = 'rgba(232,110,80,.9)'; g.fillStyle = 'rgba(232,110,80,.9)'; g.lineWidth = 2.5; g.setLineDash([7, 5]); g.beginPath(); g.moveTo(x0 + ux * 14, y0 + uy * 14); g.lineTo(x0 + ux * l, y0 + uy * l); g.stroke(); g.setLineDash([]);
      const px = x0 + ux * (l + 8), py = y0 + uy * (l + 8); g.beginPath(); g.moveTo(px, py); g.lineTo(px - ux * 11 - uy * 6, py - uy * 11 + ux * 6); g.lineTo(px - ux * 11 + uy * 6, py - uy * 11 - ux * 6); g.closePath(); g.fill(); }
    if (satt) for (const s of ENHETER) { if (!s.forsvar || s.side !== 'blå') continue; const x = sx(s.forsvar.x), y = sy(s.forsvar.y); if (x < -20 || y < -20 || x > VW + 20 || y > VH + 20) continue; g.strokeStyle = s.forsvar.voll ? 'rgba(240,215,154,.95)' : 'rgba(150,190,235,.95)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 9, 0, 6.283); g.stroke(); g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.moveTo(x, y - 4); g.lineTo(x, y + 4); g.stroke(); }
    g.restore(); });

  // ---------- Leir-menyen: beredskapen ----------
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el: e, knapp }) => { const B = beredskap(); if (!B) return; const t = T(), neste = t && window.Spillet ? Spillet.Trussel.lag((t.bølge || 0) + 1) : null;
    hode.append(e('h3', { 'data-fane': 'bygg' }, 'Forsvar'));
    const boks = e('div', { klasse: 'forsvar ' + (B.sum < 30 ? 'svak' : B.sum < 55 ? 'svak' : B.sum < 80 ? 'middels' : '') }, e('div', { klasse: 'sum' }, e('b', {}, `Beredskap ${B.sum} av 100 – ${B.ord}`), e('small', {}, t && t.aktiv ? 'angrep pågår' : neste ? `neste bølge: ${neste} røverlag` : '')), e('div', { klasse: 'strek' }, e('i', { style: `width:${B.sum}%` })));
    for (const p of B.punkter) boks.append(e('div', { klasse: 'p' + (p.ok ? ' ok' : ''), 'data-punkt': p.id }, e('span', { klasse: 'h' }, p.ok ? '✓' : '○'), e('span', {}, p.navn, ' ', e('small', {}, p.tekst)), e('small', {}, `${p.poeng}/${p.av}`)));
    if (B.råd.length) boks.append(e('div', { klasse: 'raad' }, 'Dette hjelper mest nå: ' + B.råd[0]));
    boks.append(satt ? knapp(røvere().length ? 'Opphev forsvaret' : 'Avslutt øvelsen', () => { opphev(false); if (LeirSpill.visMeny) LeirSpill.visMeny(); }, { id: 'forsvaropphev' }) : knapp(røvere().length ? 'Forsvar leiren nå' : 'Øv: sett lagene i stilling', () => { sett(!røvere().length); if (LeirSpill.visMeny) LeirSpill.visMeny(); }, { id: 'forsvarov' }));
    { const LS = window.LeirSpill && LeirSpill.tilstand(), sk = LS && window.Leir ? FO.skadet(repListe(LS)) : { n: 0 }, på = repPå();
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
  const herjere = () => { const L = leir(); return L ? røvere().filter(e => !e.trekker && !Terreng.slattUt(e.menn) && Math.hypot(e.x - L.x, e.y - L.y) <= R.mot.inne) : []; };
  function motSteg() { if (!auto()) return; const L = leir(); if (!L) return; const inne = herjere();
    if (!inne.length) { if (motMeldt) motFerdig(); return; }
    if (!vakt) { const lv = leirvakt({ x: L.x + 12, y: L.y, voll: false }); if (lv) logg(`Leirvakta (${lv.menn.length} fra vakta) tar opp våpen.`); }
    const lag = egne().filter(s => !s.ombord && !s.planlegger && !Terreng.slattUt(s.menn) && Math.hypot(s.x - L.x, s.y - L.y) <= R.hent && motVår(s));
    if (vakt && levende(vakt) && !vakt.planlegger) lag.push(vakt);
    const navn = [];
    for (const q of FO.motHerjere(lag, inne, L)) { const s = q.lag;
      if (s.motMål && Math.hypot(s.motMål.x - q.mål.x, s.motMål.y - q.mål.y) < R.mot.ny && (s.sti || Math.hypot(s.x - s.motMål.x, s.y - s.motMål.y) < 20)) continue;
      if (Math.hypot(s.x - q.mål.x, s.y - q.mål.y) < 15 || !kanStille(s)) continue;
      s.motHerjer = q.fi.navn; s.motMål = q.mål; ordre(s, q.mål.x, q.mål.y, true); navn.push(s.navn); }
    if (navn.length && !motMeldt) { motMeldt = true; logg(`Røverne er inne i leiren! ${navn.join(', ')} går mot dem.`); } }
  // røverne er ute av leiren (eller angrepet er over): lagene i forsvarsstilling går tilbake dit
  function motFerdig() { motMeldt = false; for (const s of ENHETER) { if (!s.motMål) continue; const gikk = motVår(s); delete s.motHerjer; delete s.motMål; if (gikk && s.forsvar && levende(s) && Math.hypot(s.x - s.forsvar.x, s.y - s.forsvar.y) > 12) ordre(s, s.forsvar.x, s.forsvar.y, true); } }

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

  window.ForsvarSpill = { beredskap, sett, opphev, erSatt: () => satt, vakt: () => vakt, vis, retning: () => sistV, settRetning: v => { sistV = v; },
    test: false, motSteg, motFerdig, herjere, repSteg, reparerAlle, repPå, settRep, etterAngrep, skade: () => skade, lukkSkade: () => { skade = null; vis(); } };
})();
