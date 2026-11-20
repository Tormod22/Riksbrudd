/* Riksbrudd – MORGENMØTET, visningen (runde 8, 20. nov natt, pakke «morgen»; reglene i spill/morgen.js).
 * Hver morgen kl. 06 (ny dag, samme regel som dagboka og døgnoppgjøret, fra dag 2) kommer kortet #morgenkort: øverst dagbokas rapport,
 * døgnoppgjøret og hvordan gårsdagens valg gikk, så 2–3 valg for dagen (Morgen.dagensValg) og «Ingen endring i dag». Noen dager
 * (Morgen.erStorDag) kommer en større beslutning som steg 2 på samme kort. Valgene virker på ekte tilstand:
 *  - folk som sendes ut (jakt, speidertur, leie ut, tankbilen til fots) er borte til neste morgen (p.borte = BORTE, arbeider ikke);
 *  - dobbel vakt flytter to til «vakt» til neste morgen (tårnene bemannes, vaktene ser lenger) og lagene ved leiren treffer bedre
 *    (KROKER.ild); neste dag er folk slitne;
 *  - fridag, ekstra skift og halve rasjoner virker til neste morgen gjennom SamfunnSpill.valg (tempo, moral, mat i FolkRegler.steg);
 *  - kjøp mat (FolkRegler.kjøpMat – markedets hyller), selg tre (Leir.selgMateriale), røverposten (SpilletSpill.ta), nye folk
 *    (FolkRegler.nyPerson), tankbilen (et lite oppdrag i kartet, KROKER.sim/tegn), beskyttelse (neste bølge senere: SpilletSpill.T()).
 * Kortet går gjennom kortkøen (window.Kortkø, spill/samfunn-visning.js) og pausereglene (Skjermlag: pause mens det står oppe, skjult under
 * angrep). Lagres per leir i «riksbrudd-morgen». I testene (navigator.webdriver) skjer ingenting av seg selv: MorgenSpill.test = true
 * slår det på (vakta pipeline/fliser/vakter/morgen.js). window.MorgenSpill.
 */
(function (rot) {
  'use strict';
  const M = rot.Morgen; if (!M || typeof document === 'undefined' || typeof KROKER === 'undefined') return;
  const R = M.REGLER, api = { test: false }, auto = () => !navigator.webdriver || api.test === true;
  const NØKKEL = 'riksbrudd-morgen', BORTE = 1e12, dag = t => Math.floor(t / 1440) + 1;
  const O = () => rot.OppstartSpill && OppstartSpill.tilstand(), L = () => rot.LeirSpill && LeirSpill.tilstand(), F = () => rot.FolkSpill && FolkSpill.tilstand();
  const LB = () => rot.Leir, FR = () => rot.FolkRegler, kr = M.kr;
  let S = null, leirId = '', klar = false;
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, d: S })); } catch (e) { /* fullt eller sperret */ } };
  const lagreLeir = () => { if (rot.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); if (rot.LeirSpill && LeirSpill.visMeny) { try { LeirSpill.visMeny(); } catch (e) { /* menyen er lukket */ } } };
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn.filter(b => b !== null && b !== undefined && b !== false)); return e; };
  const meter = d => (d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d / 10) * 10 + ' m');

  // ---------- det som står på i leiren (til Morgen.dagensValg / storBeslutning) ----------
  function trussel() { const SS = rot.SpilletSpill; if (!SS || !SS.klar || !SS.klar() || !SS.T) return { timer: null, bølge: 0 }; const T = SS.T(); if (!T) return { timer: null, bølge: 0 };
    if (T.aktiv) return { timer: 0, bølge: T.bølge || 0 }; return { timer: Number.isFinite(T.nesteSpill) ? Math.max(0, (T.nesteSpill - tid) / 60) : null, bølge: T.bølge || 0 }; }
  function nærmesteSted() { const s = O(); if (!s || !s.leir || typeof INFRA === 'undefined' || !INFRA || !INFRA.tettsted) return null; let best = null, bd = Infinity;
    for (const t of INFRA.tettsted) { const bb = t.bb; if (!bb) continue; const d = Math.hypot((bb[0] + bb[2]) / 2 - s.leir.x, (bb[1] + bb[3]) / 2 - s.leir.y); if (d < bd && t.e && t.e.navn) { bd = d; best = t.e.navn; } } return best; }
  function situasjon() {
    const s = O(), l = L(), f = F(), Fr = FR(), Lb = LB(); if (!s || !l || !f || !Fr || !Lb) return null;
    let B = null; try { B = Fr.behov(f, l, FolkSpill.valg ? FolkSpill.valg() : {}); } catch (e) { B = null; }
    const arb = f.personer.filter(Fr.arbeidsfør), T = trussel(), SS = rot.SpilletSpill;
    const post = SS && SS.O && SS.O() ? SS.O().liste.find(o => o.type === 'post' && !o.tatt) : null;
    return { dag: dag(tid), folk: f.personer.length, arbeidsføre: arb.length, frie: arb.filter(p => p.oppgave === 'fri').length, mat: f.mat, matDøgn: B ? B.dager : (f.personer.length ? f.mat / f.personer.length : Infinity),
      moral: f.moral, penger: s.penger, matPris: Fr.R.matPris, trePris: Math.round(Lb.MATERIALER.tre.pris * Lb.REGLER.salg), dieselPris: Lb.DRIVSTOFF.prisPerLiter, lager: { tre: l.lager.tre || 0 },
      diesel: l.drivstoff || 0, dieselPlass: Lb.kapasitet ? Lb.kapasitet(l) : 0, røverTimer: T.timer, bølge: T.bølge, post: post ? { id: post.id, gir: post.gir.penger || 0, meter: post.meter, retning: post.retning } : null,
      sted: nærmesteSted(), årstid: (rot.VAER && VAER.årstid) || 'sommer' };
  }

  // ---------- virkningene som varer til neste morgen (tempo, moral, mat) – gjennom SamfunnSpill.valg ----------
  const virkning = () => { const v = { tempo: 1, moral: 0, mat: 1 }; for (const e of (S && S.effekter) || []) { v.tempo *= e.tempo || 1; v.moral += e.moral || 0; v.mat *= e.mat || 1; } return v; };
  function koblValg() { const SA = rot.SamfunnSpill; if (!SA || !SA.valg || SA.valg.morgen) return;
    const før = SA.valg;
    const ny = g => { const v = før(g), m = virkning(); if (m.tempo === 1 && !m.moral && m.mat === 1) return v;
      return { ...v, tempoFaktor: (v.tempoFaktor > 0 ? v.tempoFaktor : 1) * m.tempo, moralTillegg: (v.moralTillegg || 0) + m.moral, matFaktor: (v.matFaktor > 0 ? v.matFaktor : 1) * m.mat }; };
    ny.morgen = true; SA.valg = ny; }
  // dobbel vakt: lagene innen REGLER.vakt.radius fra leiren treffer bedre til neste morgen
  const vaktNå = () => !!(S && S.planer && S.planer.some(p => p.id === 'vakt'));
  KROKER.ild.push(a => { if (!klar || a.side !== 'blå' || !vaktNå()) return 1; const s = O(); return s && s.leir && Math.hypot(a.x - s.leir.x, a.y - s.leir.y) <= R.vakt.radius ? R.vakt.ild : 1; });

  // ---------- folk som går ut / kommer hjem ----------
  function sendUt(id, ferd, ekstra = {}) { const f = F(); if (!f) return null; const ider = M.velgFolk(f.personer, R.borte, ferd); if (ider.length < R.borte) return null;
    const folk = ider.map(i => f.personer.find(p => p.id === i)); for (const p of folk) { p.borte = BORTE; p.morgen = id; }
    const plan = { id, folk: ider, navn: folk.map(p => p.navn), ...ekstra }; S.planer.push(plan); return plan; }
  const fornavn = n => n.split(' ')[0], og = a => (a.length > 1 ? a.slice(0, -1).join(', ') + ' og ' + a[a.length - 1] : a[0] || '');
  // gårsdagens planer: gir tekstene til rapporten
  function hjem() {
    const ut = [], f = F(), l = L(), Lb = LB(), T = trussel();
    for (const p of S.planer || []) {
      const folk = f ? p.folk.map(i => f.personer.find(q => q.id === i)).filter(Boolean) : [];
      if (p.id === 'vakt') { for (const q of folk) if (p.tidl && p.tidl[q.id]) q.oppgave = p.tidl[q.id];
        S.effekter.push({ kilde: 'sliten', tempo: R.vakt.slitenTempo, moral: R.vakt.slitenMoral });
        ut.push(`Dobbel vakt i natt: ${og(folk.map(q => fornavn(q.navn)))} går tilbake til arbeidet sitt. Folk er slitne i dag.`); continue; }
      if (p.id === 'post') { const SS = rot.SpilletSpill, o = SS && SS.O && SS.O() ? SS.O().liste.find(q => q.id === p.oppdrag) : null;
        ut.push(o ? `Røverposten står fortsatt (frist om ${Math.max(1, Math.round((o.frist - tid) / 60))} t). Send en tropp dit.` : 'Røverposten er ikke lenger i lista (tatt eller utløpt).'); if (o) S.planer2.push(p); continue; }
      if (p.id === 'vern') { ut.push(T.bølge > p.bølge ? 'Røverne holdt ikke avtalen – de angrep likevel.' : 'Røverne holdt avtalen: ingen angrep i natt.'); continue; }
      if (p.id === 'nabo') { let B = null; try { B = l && f ? FR().behov(f, l, FolkSpill.valg ? FolkSpill.valg() : {}) : null; } catch (e) { B = null; }
        ut.push(`De nye fra nabogården har funnet seg til rette.` + (B && B.utenSeng ? ` ${B.utenSeng} mangler seng – bygg en brakke, ellers faller moralen.` : '')); continue; }
      if (!['jakt', 'leie', 'speid', 'tankbil'].includes(p.id)) continue;
      const u = M.utfall({ ...p, folk }, { årstid: (rot.VAER && VAER.årstid) || 'sommer', røverTimer: T.timer }, Math.random);
      for (const q of folk) { if (q.borte === BORTE) delete q.borte; delete q.morgen; }
      if (f && u.mat) f.mat += u.mat; if (u.penger) OppstartSpill.gi(u.penger);
      if (l && Lb) { if (u.tre) Lb.leggInn(l, 'tre', u.tre); if (u.stål) Lb.leggInn(l, 'stål', u.stål);
        if (u.diesel) { const plass = Math.max(0, (Lb.kapasitet ? Lb.kapasitet(l) : 0) - (l.drivstoff || 0)), d = Math.min(u.diesel, Math.floor(plass)); l.drivstoff = (l.drivstoff || 0) + d; if (d < u.diesel) u.tekst += ` Bare ${d} l fikk plass i tanken.`; } }
      for (const n of u.skadet) { const q = folk.find(x => x.navn === n); if (q) q.helse = Math.max(.15, q.helse - u.helse); }
      for (const n of u.borte) { const q = folk.find(x => x.navn === n); if (q && f) f.personer.splice(f.personer.indexOf(q), 1); }
      ut.push(u.tekst);
    }
    // folk som av en eller annen grunn fortsatt er merket borte fra morgenmøtet (planen mangler), kommer hjem
    if (f) for (const q of f.personer) if (q.morgen && !S.planer2.some(p => p.folk && p.folk.includes(q.id))) { if (q.borte === BORTE) delete q.borte; delete q.morgen; }
    return ut;
  }

  // ---------- valgene ----------
  function brukDag(v) { const f = F(), l = L(), Lb = LB(); let t = '';
    if (v.id === 'jakt') { const p = sendUt('jakt', 'hogst'); t = p ? `${og(p.navn.map(fornavn))} går på jakt og fiske. De er tilbake i morgen tidlig.` : 'Det var ingen ledige å sende.'; }
    else if (v.id === 'speid') { const p = sendUt('speid', 'frakt', { sted: v.t.replace(/^.* mot /, '') }); t = p ? `${og(p.navn.map(fornavn))} drar på speidertur. De melder fra i morgen tidlig.` : 'Det var ingen ledige å sende.'; }
    else if (v.id === 'leie') { const p = sendUt('leie', 'vakt'); t = p ? `${og(p.navn.map(fornavn))} holder vakt for en nabogård i dag. Betalingen kommer i morgen.` : 'Det var ingen ledige å sende.'; }
    else if (v.id === 'kjøp') { const r = FR().kjøpMat(f, R.kjøp, OppstartSpill.betal, rot.OverlevSpill && OverlevSpill.matFaktor ? OverlevSpill.matFaktor() : 1); t = r.feil ? r.feil : `Kjøpte ${r.rasjoner} rasjoner for ${kr(r.pris)}.`; }
    else if (v.id === 'rasjon') { S.effekter.push({ kilde: 'rasjon', mat: R.rasjon.mat, moral: R.rasjon.moral }); t = 'Halve rasjoner i dag. Folk murrer, men maten rekker lenger.'; }
    else if (v.id === 'fri') { S.effekter.push({ kilde: 'fri', tempo: R.fri.tempo, moral: R.fri.moral }); t = 'Fridag i leiren: arbeidet går sakte i dag, men folk henter seg inn.'; }
    else if (v.id === 'skift') { S.effekter.push({ kilde: 'skift', tempo: R.skift.tempo, moral: R.skift.moral }); t = 'Ekstra skift i dag: alt arbeid går raskere, men folk blir slitne.'; }
    else if (v.id === 'selg') { const r = Lb.selgMateriale(l, 'tre', v.mengde, OppstartSpill.gi); t = r.feil ? r.feil : `Solgte ${String(r.mengde).replace('.', ',')} m³ tre for ${kr(r.pris)}.`; }
    else if (v.id === 'post') { const SS = rot.SpilletSpill; if (SS && SS.ta && SS.ta(v.oppdrag)) { S.planer.push({ id: 'post', folk: [], oppdrag: v.oppdrag }); t = 'Røverposten er merket i kartet. Send en tropp dit – det er farlig, men godt betalt.'; } else t = 'Oppdraget er ikke ledig lenger.'; }
    else if (v.id === 'vakt') { const ider = M.velgFolk(f.personer.filter(p => p.oppgave !== 'vakt'), R.vakt.ekstra, 'vakt'), tidl = {};
      for (const i of ider) { const p = f.personer.find(q => q.id === i); tidl[i] = p.oppgave; p.oppgave = 'vakt'; }
      S.planer.push({ id: 'vakt', folk: ider, tidl }); t = ider.length ? `Dobbel vakt i natt: ${og(ider.map(i => fornavn(f.personer.find(q => q.id === i).navn)))} går på vakt til i morgen tidlig.` : 'Det var ingen ledige til vakta.'; }
    return t; }
  async function påLand(x, y) { try { const v = await lagVindu([x - 64, y - 64, x + 64, y + 64], false), [i, j] = Terreng.rute(v, x, y), k = v.K[j * v.w + i]; return k !== 3 && k !== 255 && k !== undefined; } catch (e) { return false; } }
  const RETN = ['øst', 'nordøst', 'nord', 'nordvest', 'vest', 'sørvest', 'sør', 'sørøst'], retning = (dx, dy) => RETN[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
  async function plasserTankbil() { const s = O(); if (!s || !s.leir) return null; const T = R.tankbil;
    for (let k = 0; k < 12; k++) { const v = Math.random() * 6.2832, d = T.avst[0] + Math.random() * (T.avst[1] - T.avst[0]), x = Math.round(s.leir.x + Math.cos(v) * d), y = Math.round(s.leir.y + Math.sin(v) * d);
      if (await påLand(x, y)) return { x, y, meter: Math.round(d), retning: retning(Math.cos(v), Math.sin(v)), diesel: Math.round((T.diesel[0] + Math.random() * (T.diesel[1] - T.diesel[0])) / 10) * 10, frist: tid + T.frist, fare: Math.random() < T.røvere, røvere: false }; }
    return null; }
  function brukStor(st, v) { const f = F(), l = L(), Lb = LB(), Fr = FR(); let t = '';
    if (st.id === 'nabo') { const n = v.id === 'alle' ? R.nabo.folk : v.id === 'to' ? 2 : 0;
      if (!n) { f.moral = Math.max(0, f.moral + R.nabo.avvistMoral); t = 'Dere avviste folket fra nabogården. De gikk videre.'; }
      else { const nye = []; for (let i = 0; i < n; i++) { const r = Fr.rng(f.frø); const p = Fr.nyPerson(f, r, 'fri'); f.frø = Math.floor(r() * 4294967296); nye.push(p.navn); }
        const mat = v.id === 'alle' ? R.nabo.mat : Math.round(R.nabo.mat / 2); f.mat += mat; S.planer.push({ id: 'nabo', folk: [] });
        t = `${og(nye)} fra nabogården er med i gjengen nå (på «fri» – sett dem i arbeid i Folk). De hadde med ${mat} rasjoner.`; } }
    else if (st.id === 'tankbil') { if (v.id === 'lag') { t = 'Leter etter tankbilen …'; plasserTankbil().then(b => { if (!b) { logg('Fant ikke noe trygt sted for tankbilen – den er borte.'); return; } S.tankbil = b; lagre(); skitten = true;
          logg(`Tankbilen står ${meter(b.meter)} mot ${b.retning} for leiren (merket i kartet). Kom dit med en tropp innen to døgn og ta dieselen.`); }); }
      else if (v.id === 'fots') { const p = sendUt('tankbil', 'frakt'); t = p ? `${og(p.navn.map(fornavn))} går til fots mot tankbilen med kanner. De er tilbake i morgen tidlig.` : 'Det var ingen ledige å sende.'; }
      else t = 'Dere lar tankbilen stå.'; }
    else if (st.id === 'vern') { if (v.id === 'betal') { const SS = rot.SpilletSpill, T = SS && SS.T ? SS.T() : null;
        if (!T || T.aktiv) t = 'Røverne angriper alt – det er for sent å forhandle.';
        else if (!OppstartSpill.betal(v.pris)) t = `Ikke nok penger (${kr(v.pris)}).`;
        else { utsett(T); S.vernTil = T.nesteSpill; S.planer.push({ id: 'vern', folk: [], bølge: T.bølge || 0 }); t = `Dere betalte røverne ${kr(v.pris)}. Neste angrep kommer et døgn senere enn ventet.`; } }
      else { f.moral = Math.min(100, f.moral + R.vern.nektMoral); t = 'Dere nektet å betale røverne. Folk er stolte av det.'; } }
    else if (st.id === 'karavane') { if (v.id === 'kjøp') { if (!OppstartSpill.betal(v.pris)) t = `Ikke nok penger (${kr(v.pris)}).`;
        else { const plass = Math.max(0, (Lb.kapasitet ? Lb.kapasitet(l) : 0) - (l.drivstoff || 0)), d = Math.min(R.karavane.diesel, Math.floor(plass)); l.drivstoff = (l.drivstoff || 0) + d; f.mat += R.karavane.mat;
          t = `Kjøpte ${R.karavane.mat} rasjoner og ${d} l diesel av karavanen for ${kr(v.pris)}.` + (d < R.karavane.diesel ? ` Resten av dieselen fikk ikke plass i tanken.` : ''); } }
      else if (v.id === 'selg') { if ((l.lager.tre || 0) < R.karavane.tre) t = 'Dere har ikke nok tre lenger.'; else { l.lager.tre -= R.karavane.tre; OppstartSpill.gi(v.pris); t = `Solgte ${R.karavane.tre} m³ tre til karavanen for ${kr(v.pris)}.`; } }
      else t = 'Ingen handel i dag. Karavanen drar videre.'; }
    return t; }
  // beskyttelsen: neste bølge et døgn senere (og like lenge i ekte tid – bølgene kommer også etter ekte minutter med spilling)
  function utsett(T) { T.nesteSpill = (Number.isFinite(T.nesteSpill) ? T.nesteSpill : tid) + R.vern.utsett; if (Number.isFinite(T.nesteEkte)) T.nesteEkte += R.vern.utsettEkte * 60; }

  // ---------- kortet ----------
  const css = document.createElement('style');
  css.textContent = `#morgenkort{ position:fixed; left:50%; transform:translateX(-50%); top:14%; z-index:13; display:none; width:min(500px,92vw); max-height:calc(86vh - 70px); overflow-y:auto; box-sizing:border-box; padding:14px 16px;
  background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); box-shadow:0 8px 30px rgba(0,0,0,.6); overscroll-behavior:contain; }
#morgenkort.på{ display:block; } body.angrepvent #morgenkort.på{ display:none; }
#morgenkort h3{ margin:0 0 6px; font-size:17px; color:#f0d79a; } #morgenkort h3 small{ font-weight:400; color:var(--ink-dim,#a99); font-size:13px; }
#morgenkort .mrapport{ font-size:13px; line-height:1.4; color:var(--ink-dim,#b5a888); border-left:2px solid #4a4030; padding:2px 0 2px 8px; margin:0 0 8px; }
#morgenkort .mrapport p{ margin:0 0 3px; } #morgenkort .mrapport .igaar{ color:#d9e6c2; }
#morgenkort .msp{ margin:6px 0 4px; font-weight:600; }
#morgenkort button{ display:block; width:100%; margin-top:6px; min-height:44px; background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); font:inherit; cursor:pointer; text-align:left; padding:6px 12px; }
#morgenkort button:hover{ border-color:#c9b26a; } #morgenkort button b{ display:block; font-weight:600; } #morgenkort button small{ display:block; color:var(--ink-dim,#b5a888); font-size:12.5px; line-height:1.3; margin-top:2px; }
#morgenkort button.mingen{ min-height:38px; text-align:center; background:none; color:var(--ink-dim,#b5a888); }
#morgenkort .mstor{ border:1px solid #8a6a2a; background:rgba(80,60,20,.25); padding:8px 10px; margin:8px 0 2px; }
#morgenkort .mstor p{ margin:0 0 4px; line-height:1.35; }
body.kort #morgenkort{ top:calc(var(--topp,44px) + 6px); max-height:calc(100vh - var(--topp,44px) - 76px - env(safe-area-inset-bottom,0px)); padding:10px 12px; }
body.kort #morgenkort .mrapport{ font-size:12.5px; } body.kort #morgenkort button{ min-height:42px; padding:5px 10px; }`;
  document.head.appendChild(css);
  const kort = el('div', { id: 'morgenkort', role: 'dialog', 'aria-label': 'Morgenmøtet' }); document.body.appendChild(kort);
  let vistNøkkel = '';
  const knappEl = (t, s, f, klasse) => { const b = el('button', { type: 'button', ...(klasse ? { klasse } : {}) }, el('b', {}, t), s ? el('small', {}, s) : null); if (klasse) b.className = klasse; b.onclick = f; return b; };
  function lukk() { kort.classList.remove('på'); vistNøkkel = ''; if (rot.Kortkø && Kortkø.ferdig) Kortkø.ferdig('morgenkort'); }
  function vis() {
    const K = S && S.kort; if (!K || K.ferdig) { lukk(); return; }
    // én kortkø for alle kortene med valg: står et annet kort oppe, venter morgenmøtet (det haster: dagen er i gang)
    if (rot.Kortkø && Kortkø.ta && !Kortkø.ta('morgenkort', true, vis)) { kort.classList.remove('på'); vistNøkkel = ''; Kortkø.be('morgenkort', vis, { tittel: 'Morgenmøtet' }); return; }
    const nøkkel = JSON.stringify([K.dag, K.steg, K.valgt]); if (nøkkel === vistNøkkel && kort.classList.contains('på')) return; vistNøkkel = nøkkel;
    kort.replaceChildren(el('h3', {}, 'Morgenmøtet ', el('small', {}, `· dag ${K.dag}`)));
    if (K.rapport && K.rapport.length) kort.append(el('div', { klasse: 'mrapport' }, ...K.rapport.map(r => el('p', { klasse: /^I går/.test(r) ? 'igaar' : '' }, r))));
    if (K.steg === 0) {
      kort.append(el('div', { klasse: 'msp' }, K.valg.length ? 'Hva gjør dere i dag?' : 'Ingenting som haster i dag.'));
      K.valg.forEach((v, i) => kort.append(knappEl(v.t, v.følge, () => velg(i))));
      kort.append(knappEl(K.valg.length ? 'Ingen endring i dag' : 'Videre', '', () => velg(-1), 'mingen'));
    } else {
      const st = K.stor; if (K.valgt) kort.append(el('div', { klasse: 'mrapport' }, el('p', { klasse: 'igaar' }, K.valgt)));
      kort.append(el('div', { klasse: 'mstor' }, el('h3', {}, 'Viktig beslutning: ' + st.tittel), el('p', {}, st.tekst)));
      st.valg.forEach((v, i) => kort.append(knappEl(v.t, v.følge, () => velgStor(i))));
    }
    kort.classList.add('på'); kort.scrollTop = 0;
  }
  function velg(i) { const K = S.kort; if (!K || K.steg !== 0) return; const v = i >= 0 ? K.valg[i] : null; let t = '';
    if (v) { t = brukDag(v); logg('Morgenmøtet: ' + t); } else t = 'Ingen endring i dag.';
    S.sistValg = v ? v.id : 'ingen'; K.valgt = t;
    if (K.stor) K.steg = 1; else K.ferdig = true;
    lagre(); lagreLeir(); vis(); }
  function velgStor(i) { const K = S.kort; if (!K || K.steg !== 1) return; const v = K.stor.valg[i]; const t = brukStor(K.stor, v); logg(K.stor.tittel + ': ' + t);
    S.storSist = K.dag; S.storId = K.stor.id; K.ferdig = true; lagre(); lagreLeir(); vis(); }

  // ---------- ny morgen ----------
  function snapOppgjør() { try { return rot.OppgjorSpill && OppgjorSpill.bilde ? OppgjorSpill.bilde() : null; } catch (e) { return null; } }
  // morgen(tving, o): gårsdagens planer kommer hjem og gir rapporten; så et nytt kort (o.stor = id tvinger en stor beslutning – vakta)
  function morgen(tving, o = {}) {
    if (!klar || !S) return null; const d = dag(tid); if (!tving && d === S.dag) return null;
    S.planer2 = []; S.effekter = [];
    const igår = hjem(); S.planer = S.planer2; delete S.planer2; S.dag = d;
    // et kort som aldri ble besvart (spilleren lukket ikke), regnes som «ingen endring»
    if (S.kort && !S.kort.ferdig) { S.kort.ferdig = true; lukk(); }
    for (const t of igår) { logg('Morgenmøtet: ' + t); if (rot.DagbokSpill && DagbokSpill.noter) DagbokSpill.noter(t); }
    const nå = snapOppgjør(); let oppgjør = null; try { if (S.oppFør && nå && rot.Oppgjor) { const r = Oppgjor.tekst(S.oppFør, nå); oppgjør = r ? r.tekst : null; } } catch (e) { oppgjør = null; } S.oppFør = nå;
    if (!(auto() || tving)) { lagre(); return { igår }; }
    const s = situasjon(); if (!s || !s.folk) { lagre(); return { igår }; }
    const rapport = [], db = rot.DagbokSpill && DagbokSpill.siste ? DagbokSpill.siste() : null;
    if (db) rapport.push(db); if (oppgjør) rapport.push(oppgjør); for (const t of igår) rapport.push('I går: ' + t);
    let stor = null; if (o.stor || M.erStorDag(d, S.storSist)) { stor = M.storBeslutning(s, Math.random, S.storId); if (o.stor) { for (let k = 0; k < 60 && (!stor || stor.id !== o.stor); k++) stor = M.storBeslutning(s, Math.random, null); if (stor && stor.id !== o.stor) stor = null; } }
    S.kort = { dag: d, rapport, valg: M.dagensValg(s, Math.random).map(v => ({ ...v, vekt: undefined })), stor, steg: 0, valgt: '', ferdig: false };
    lagre(); vistNøkkel = ''; vis(); return { igår, kort: S.kort };
  }
  KROKER.sim.push(() => { if (klar && S && dag(tid) !== S.dag) morgen(false); });

  // ---------- tankbilen: et lite oppdrag i kartet ----------
  const blåNær = (x, y, r) => ENHETER.some(e => e.side === 'blå' && !e.raid && levende(e) && Math.hypot(e.x - x, e.y - y) <= r);
  const røvereVed = b => ENHETER.filter(e => e.tankbil && levende(e) && !(rot.Terreng && Terreng.slattUt && Terreng.slattUt(e.menn)));
  function bortRøvere() { for (let i = ENHETER.length - 1; i >= 0; i--) if (ENHETER[i].tankbil) ENHETER.splice(i, 1); skitten = true; }
  KROKER.sim.push(() => { const b = S && S.tankbil; if (!klar || !b) return;
    if (tid > b.frist) { logg('Tankbilen er borte – noen andre kom først.'); S.tankbil = null; bortRøvere(); lagre(); return; }
    if (b.fare && !b.røvere && blåNær(b.x, b.y, 450) && typeof nyttLag === 'function') { const e = nyttLag('Røvere ved tankbilen', b.x + 110, b.y - 80, 'rød'); e.tankbil = true; if (e.menn.length > R.tankbil.røverMenn) { e.menn = e.menn.slice(0, R.tankbil.røverMenn); e.leder = 0; }
      ENHETER.push(e); b.røvere = true; lagre(); logg('Røvere ved tankbilen! De vil ha dieselen selv.'); skitten = true; }
    if (blåNær(b.x, b.y, 60) && !røvereVed(b).some(e => Math.hypot(e.x - b.x, e.y - b.y) < 250)) { const l = L(), Lb = LB(); if (!l || !Lb) return;
      const plass = Math.max(0, (Lb.kapasitet ? Lb.kapasitet(l) : 0) - (l.drivstoff || 0)), d = Math.min(b.diesel, Math.floor(plass)); l.drivstoff = (l.drivstoff || 0) + d;
      logg(`Tankbilen er tømt: ${d} l diesel er fraktet til leiren.` + (d < b.diesel ? ` ${b.diesel - d} l fikk ikke plass i tanken.` : '')); if (rot.DagbokSpill && DagbokSpill.noter) DagbokSpill.noter(`Hentet ${d} l diesel fra den forlatte tankbilen.`);
      S.tankbil = null; bortRøvere(); lagre(); lagreLeir(); } });
  KROKER.tegn.push((g, vx0, vy1) => { const b = S && S.tankbil; if (!klar || !b || kam.m > 60) return; const x = (b.x - vx0) / kam.m, y = (vy1 - b.y) / kam.m; if (x < -40 || y < -40 || x > VW + 40 || y > VH + 40) return;
    g.save(); g.fillStyle = 'rgba(22,18,12,.85)'; g.strokeStyle = '#f0b04a'; g.lineWidth = 1.8; g.fillRect(x - 11, y - 6, 22, 12); g.strokeRect(x - 11, y - 6, 22, 12); g.beginPath(); g.arc(x - 6, y + 7, 2.6, 0, 6.283); g.arc(x + 6, y + 7, 2.6, 0, 6.283); g.fillStyle = '#f0b04a'; g.fill();
    g.font = '600 13px "Cormorant Garamond", serif'; g.textAlign = 'center'; const t = 'Tankbil (diesel)', ty = rot.Etikett ? Etikett.tekst(g, t, x, y + 24, 1) : y + 24; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(t, x, ty); g.fillStyle = '#f6d28a'; g.fillText(t, x, ty); g.restore(); });
  KROKER.tegn3d.push((g, proj3) => { const b = S && S.tankbil; if (!klar || !b) return; const p = proj3(b.x, b.y); if (!p) return; g.save(); g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; const t = '◆ Tankbil (diesel)';
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(t, p[0], p[1] - 14); g.fillStyle = '#f6d28a'; g.fillText(t, p[0], p[1] - 14); g.restore(); });
  (rot.VARSEL_TILLEGG = rot.VARSEL_TILLEGG || []).push(() => { const b = S && S.tankbil; if (!klar || !b) return [];
    return [{ i: 'tank', k: '', t: 'Tankbil med diesel', s: `${meter(b.meter)} mot ${b.retning} · ${Math.max(1, Math.round((b.frist - tid) / 60))} t igjen`, f: () => { if (rot.kartTil && !(typeof på3d !== 'undefined' && på3d)) kartTil(b.x, b.y, 4); else logg(`Tankbilen står ${meter(b.meter)} mot ${b.retning} for leiren.`); } }]; });

  // ---------- Leir-menyen (fanen Mål): det morgenmøtet bestemte for i dag ----------
  const PLANTEKST = { jakt: 'på jakt og fiske', speid: 'på speidertur', leie: 'leid ut som vakter', tankbil: 'til fots mot tankbilen', vakt: 'på dobbel vakt' };
  const EFFTEKST = { fri: 'fridag', skift: 'ekstra skift', rasjon: 'halve rasjoner', sliten: 'slitne etter dobbel vakt' };
  (rot.LEIR_MENY = rot.LEIR_MENY || []).push((hode, { el: e, knapp }) => { if (!klar || !S) return; const linjer = [], f = F();
    for (const p of S.planer || []) if (PLANTEKST[p.id]) { const n = f ? p.folk.map(i => f.personer.find(q => q.id === i)).filter(Boolean).map(q => fornavn(q.navn)) : []; linjer.push(`${og(n) || 'To'} ${PLANTEKST[p.id]} – tilbake i morgen kl. 06.`); }
    const v = virkning(), ef = (S.effekter || []).map(x => EFFTEKST[x.kilde]).filter(Boolean);
    if (ef.length) linjer.push(`I dag: ${ef.join(', ')} (arbeid ×${String(Math.round(v.tempo * 100) / 100).replace('.', ',')}, moral ${v.moral >= 0 ? '+' : ''}${v.moral}${v.mat !== 1 ? ', mat ×' + String(v.mat).replace('.', ',') : ''}).`);
    if (S.tankbil) linjer.push(`Tankbilen venter ${meter(S.tankbil.meter)} mot ${S.tankbil.retning} (${Math.max(1, Math.round((S.tankbil.frist - tid) / 60))} t igjen).`);
    const åpent = S.kort && !S.kort.ferdig; if (!linjer.length && !åpent) return;
    hode.append(e('h3', { 'data-fane': 'mål' }, 'Morgenmøtet')); for (const t of linjer) hode.append(e('div', { klasse: 'dagbok' }, t));
    if (åpent) hode.append(knapp('Vis dagens morgenmøte', () => { vistNøkkel = ''; if (rot.Kortkø && Kortkø.åpent() && Kortkø.åpent() !== 'morgenkort') return logg('Svar på kortet som står oppe først.'); vis(); }, { id: 'morgenvis' })); });

  // ---------- start ----------
  function start() { const s = O(); if (!s || !s.leir) return; leirId = Math.round(s.leir.x) + ',' + Math.round(s.leir.y);
    let d = null; try { const o = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); d = o && o.leir === leirId ? o.d : null; } catch (e) { d = null; }
    S = d && Number.isFinite(d.dag) ? d : { dag: dag(tid), planer: [], effekter: [], kort: null, storSist: null, storId: null, tankbil: null };
    S.planer = S.planer || []; S.effekter = S.effekter || [];
    // folk som er ute for morgenmøtet, er fortsatt ute etter en omlasting (FolkSpill har lagret p.borte); de uten plan kommer hjem
    const f = F(); if (f) for (const q of f.personer) if (q.morgen && !S.planer.some(p => p.folk && p.folk.includes(q.id))) { if (q.borte === BORTE) delete q.borte; delete q.morgen; }
    // beskyttelsen gjelder etter en omlasting (spillet-visning.js regner neste bølge på nytt ved start)
    const T = rot.SpilletSpill && SpilletSpill.T ? SpilletSpill.T() : null; if (T && S.vernTil && !T.aktiv && Number.isFinite(T.nesteSpill) && T.nesteSpill < S.vernTil) T.nesteSpill = S.vernTil;
    if (!S.oppFør) S.oppFør = snapOppgjør();
    klar = true; koblValg(); lagre(); vistNøkkel = ''; if (S.kort && !S.kort.ferdig && auto()) vis(); }
  // kortet følger pausereglene (Skjermlag lastes etter denne fila): pause mens det står oppe, skjult under angrep
  function koblSkjermlag() { const Sk = rot.Skjermlag; if (!Sk || !Sk.KORT) return false; if (!Sk.KORT.includes('morgenkort')) Sk.KORT.push('morgenkort'); if (Sk.VENTER && !Sk.VENTER.includes('morgenkort')) Sk.VENTER.push('morgenkort'); return true; }
  rot.addEventListener('riksbrudd-spill', () => setTimeout(() => { start(); koblSkjermlag(); }, 0));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(koblSkjermlag, 0)); else setTimeout(koblSkjermlag, 0);
  // et kort som venter (et annet kort sto oppe), kommer fram straks plassen er ledig; SamfunnSpill kan komme etter oss
  setInterval(() => { if (!klar || !S) return; koblValg(); const K = S.kort;
    if (K && !K.ferdig && auto() && !kort.classList.contains('på') && rot.Kortkø && !Kortkø.åpent()) vis();
    // et kort med hastverk fra en annen modul (forræderen) har kommet oppå: morgenmøtet viker og venter
    if (kort.classList.contains('på') && rot.Kortkø) { const a = ['hendelse', 'samfunnkort', 'formkort', 'krigkort'].find(id => { const e = document.getElementById(id); return e && e.classList.contains('på'); });
      if (a) { kort.classList.remove('på'); vistNøkkel = ''; Kortkø.ferdig('morgenkort'); Kortkø.be('morgenkort', vis, { tittel: 'Morgenmøtet', først: true }); } } }, 1000);
  Object.assign(api, { start, morgen, situasjon, vis, velg, velgStor, lukk, tilstand: () => S, virkning, vaktNå, koblSkjermlag, åpen: () => kort.classList.contains('på') });
  rot.MorgenSpill = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
