'use strict';
// FOLK SOM GÅR – visningen (28. nov, fase F2; reglene: spill/folkgang.js). Lastes rett etter folkgang.js (som står rett etter vei.js).
//  - KROKER.sim: Folkgang.steg 4 ganger i sekundet (ekte tid) med spilltida som har gått (dt), på leirens veikart (Vei.oppdater, høyst én gang i sekundet).
//  - FolkRegler.stedF (folk.js): en person bidrar til jobben bare når hen er framme – men bare når døgnplanen er på (JobberSpill.aktiv()).
//    Med døgnplanen av (gamle spill som har slått den av, og testene med navigator.webdriver) er gangen bare pynt: stedF = 1, alt regnes som før.
//  - 2D: små figurer (prikk med retning) i jobbens farge når du er zoomet inn på leiren (leir2d.js tegner de store figurene nærmest og
//    spør FolkgangSpill.plass2d). Trykk på en person: navn, jobb, hva hen gjør nå og hvorfor (#folkgangkort).
//  - 3D: folk3d.js henter plassene herfra (FolkgangSpill.plass).
//  - Jobbtavla: JobberSpill.del viser FolkgangSpill.fastLinjer() («Verksted står fast: Per kommer ikke fram – rommet har ingen dør»).
// Ingenting lagres: plassene regnes på nytt fra leirens midte når spillet lastes.
(function () {
  const FG = window.Folkgang, FR = window.FolkRegler; if (!FG || typeof KROKER === 'undefined') return;
  let G = FG.ny(), leirNøkkel = '', sistSteg = 0, samlet = 0, sistKart = 0, kart = null, valgtId = null;
  const Fo = () => (window.FolkSpill ? FolkSpill.tilstand() : null);
  const Lr = () => (window.LeirSpill ? LeirSpill.tilstand() : null);
  const midte = () => { const S = window.OppstartSpill && OppstartSpill.tilstand(); return S && S.leir ? S.leir : null; };
  // teller gangen med i arbeidet? (døgnplanen på – i testene bare med JobberSpill.test – og ikke slått av her)
  const aktiv = () => window.FolkgangSpill.på !== false && !!(window.JobberSpill && JobberSpill.aktiv());
  // fargen per jobb (Claudes valg: dempede farger som skiller seg fra hverandre på det mørke kartet)
  const FARGE = { bygg: '#d9a441', hogst: '#6f9e4c', riving: '#a8735c', frakt: '#cdb680', vakt: '#cf5b4b', overvåking: '#7f95c8', kjøkken: '#e6c56a',
    stell: '#e9e4da', verksted: '#8fa7ad', maskin: '#d4813a', fri: '#9b9b94' };
  const farge = o => FARGE[o] || '#bbbbb2';

  // ---------- kroken til folk.js ----------
  // (plassene er regnet 4 ganger i sekundet; er tida flyttet mer enn FERSK spillminutter siden – spoling, tester som setter klokka –
  // er de ikke ferske, og arbeidet regnes som før til neste steg)
  const FERSK = 2, nåTid = () => (typeof tid !== 'undefined' ? tid : 0), fersk = () => G.tid !== undefined && Math.abs(nåTid() - G.tid) <= FERSK;
  if (FR) FR.stedF = (F, o) => (F && F === Fo() && aktiv() && fersk() ? FG.stedF(G, F, o) : 1);

  // ---------- oppdateringen ----------
  function kartNå(L, m) {
    const nu = performance.now();
    if (window.Vei && (!kart || nu - sistKart > 1000)) { sistKart = nu; try { kart = Vei.oppdater({ leir: L, start: [m.x, m.y] }); } catch (e) { kart = null; } }
    return kart;
  }
  function steg(dtSek) {
    const F = Fo(), L = Lr(), m = midte(); if (!F || !L || !m || !window.Leir) return;
    const k = Math.round(m.x) + ',' + Math.round(m.y); if (k !== leirNøkkel) { leirNøkkel = k; G = FG.ny(); kart = null; }
    const R = window.RessursSpill && RessursSpill.tilstand ? RessursSpill.tilstand() : null, t0 = performance.now();
    const ctx = { F, L, leir: m, kart: kartNå(L, m), RJ: R && Array.isArray(R.jobber) ? R.jobber : [], nær: window.Ressurser && Ressurser.REGLER ? Ressurser.REGLER.nær : 150,
      hva: p => { const n = window.JobberSpill ? JobberSpill.nå(p) : null; return n ? n.hva : p.oppgave === 'fri' ? 'fri' : 'arbeid'; } };
    // (F3) bærerne og bruksplassene (spill/baering-visning.js): målKrok gir målet, etter[] kjøres rett etter hvert steg
    const FS = window.FolkgangSpill; if (FS.målKrok) ctx.mål = FS.målKrok;
    // (F5) utpostene (spill/utpost-visning.js), trafikkartet (spill/trafikkart-visning.js) og klokka for «Gjør dette nå»
    if (FS.utpostKrok) ctx.utpost = FS.utpostKrok; if (FS.sporKrok) ctx.spor = FS.sporKrok; ctx.tid = nåTid();
    const t1 = performance.now(); FG.steg(G, ctx, dtSek); G.tid = nåTid(); const t2 = performance.now();
    for (let i = 0; i < FS.etter.length; i++) { const t = performance.now(); try { FS.etter[i](G, dtSek, ctx); } catch (e) { FS.feil = e.message; } mål('etter' + i, performance.now() - t); }
    mål('kart', t1 - t0); mål('steg', t2 - t1); mål('alt', performance.now() - t0);
    for (const h of FG.hendelser(G)) { try { ordreHendelse(h, F); } catch (e) { FS.feil = e.message; } }
  }
  // (F5) MÅLING: tida per del av oppdateringen (ms) – snitt og lengste siden nullstill (vakta og Folk-panelet leser den)
  let MÅL = {};
  function mål(k, ms) { const m = MÅL[k] || (MÅL[k] = { n: 0, sum: 0, maks: 0 }); m.n++; m.sum += ms; if (ms > m.maks) m.maks = ms; }
  function måling() { const ut = {}; for (const [k, m] of Object.entries(MÅL)) ut[k] = { n: m.n, snitt: +(m.sum / m.n).toFixed(3), maks: +m.maks.toFixed(2) }; return ut; }
  // dt i spillminutter fra løkka; regnes 4 ganger i sekundet (REGLER.takt), høyst 10 spillminutter om gangen (en skjult fane, rask spoling)
  KROKER.sim.push(dt => {
    samlet += dt > 0 ? dt : 0; const nu = performance.now(); if (nu - sistSteg < FG.REGLER.takt * 1000) return; sistSteg = nu;
    const s = Math.min(600, samlet * 60); samlet = 0; try { steg(s); } catch (e) { window.FolkgangSpill.feil = e.message; }
    if (typeof kam !== 'undefined' && kam.m < 3 && !(typeof på3d !== 'undefined' && på3d)) skitten = true;
  });

  // ---------- 2D ----------
  // plassen til en person i 2D (kartets meter), eller null (inne i et bygg, borte) – undefined når gangen ikke vet om personen
  function plass2d(p) { const s = G.pers[p.id]; if (!s) return undefined; if (s.inne || p.borte) return null;
    // flere ved samme inngang: spres litt (bare i tegningen)
    const sk = s.går ? 0 : .7, v = (p.id * 2.399) % 6.283;
    return { x: s.x + Math.cos(v) * sk, y: s.y + Math.sin(v) * sk, a: s.a || 0, går: s.går, farge: farge(p.oppgave), e: s.e || 1, sover: s.hva === 'søvn' }; }
  // prikker med retning når du er zoomet inn på leiren (de store figurene under 0,6 m per punkt tegner leir2d.js)
  KROKER.tegn.push((g, vx0, vy1) => {
    if (typeof kam === 'undefined' || (typeof på3d !== 'undefined' && på3d)) return; const m = kam.m, lt = window.Leir2d && Leir2d.REGLER ? Leir2d.REGLER.folkUnder : .6;
    const F = Fo(); if (!F || m >= 3 || (m < lt && window.Leir2d && !Leir2d.av)) return;
    g.save(); const r = Math.max(2.8, Math.min(4.5, 1.8 / Math.sqrt(m) + 1.6));
    for (const p of F.personer) { const q = plass2d(p); if (!q) continue; const x = (q.x - vx0) / m, y = (vy1 - q.y) / m;
      g.globalAlpha = q.sover ? .55 : 1; g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(x + .8, y + 1, r + .6, 0, 6.283); g.fill();
      g.fillStyle = q.farge; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
      // retningen: en liten strek fram
      g.strokeStyle = q.farge; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(q.a) * r * 2.1, y - Math.sin(q.a) * r * 2.1); g.stroke();
      if (p.id === valgtId) { g.strokeStyle = '#f0d79a'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r + 3, 0, 6.283); g.stroke(); } }
    g.restore(); });
  KROKER.tegn[KROKER.tegn.length - 1].bygg = true;

  // ---------- trykk på en person ----------
  const css = document.createElement('style');
  css.textContent = `#folkgangkort{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp, 56px) + 8px); z-index:40; max-width:min(92vw, 380px);
    background:rgba(20,22,19,.94); color:#efe7d2; border:1px solid rgba(240,215,154,.35); border-radius:8px; padding:8px 30px 8px 12px; font-size:14px; line-height:1.35; box-shadow:0 4px 16px rgba(0,0,0,.45); }
    #folkgangkort b{ font-size:15px; } #folkgangkort small{ display:block; opacity:.75; } #folkgangkort .gjor{ display:block; margin-top:2px; }
    #folkgangkort .fast{ color:#e8a35a; } #folkgangkort i{ display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:6px; vertical-align:-1px; }
    #folkgangkort > button{ position:absolute; right:4px; top:4px; background:none; border:0; color:#efe7d2; font-size:18px; cursor:pointer; min-width:28px; min-height:28px; }
    #folkgangkort .ordre{ display:block; margin-top:3px; color:#f0d79a; font-size:13px; }
    #folkgangkort .ordrerad{ display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
    #folkgangkort .ordrerad button, #folkgangkort .ordrerad select{ background:#2a2318; border:1px solid rgba(240,215,154,.35); color:#efe7d2; font:inherit; font-size:13px; min-height:32px; padding:2px 8px; border-radius:4px; cursor:pointer; }`;
  document.head.appendChild(css);
  const klokke = t => { const m = Math.round((((t / 60 + 6) % 24) + 24) % 24 * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  function kortTekst(p) { const s = G.pers[p.id], n = window.JobberSpill ? JobberSpill.nå(p) : null, jobb = FR && FR.OPPGAVE[p.oppgave] ? FR.OPPGAVE[p.oppgave].navn : p.oppgave;
    return { navn: p.navn, jobb, gjør: FG.tekst(G, p) || (n && n.tekst) || '', fast: !!(s && s.fast), plan: n && n.plan ? n.plan : '' }; }
  function visKort(p) {
    let k = document.getElementById('folkgangkort'); if (!p) { if (k) k.remove(); valgtId = null; return; }
    if (valgtId !== p.id) venterGå = null;
    valgtId = p.id; if (!k) { k = document.createElement('div'); k.id = 'folkgangkort'; document.body.appendChild(k); }
    const t = kortTekst(p), e = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    // (F5) ordre til én person: «Gå hit» og «Gjør dette nå» – sjelden nødvendig, jobbtavla gjør det meste selv
    const O = G.ordre[p.id], U = window.Utpost && Utpost.hvor ? Utpost.hvor(p.id) : null;
    const opp = FR ? FR.OPPGAVER.filter(o => o !== 'fri').map(o => `<option value="${o}"${o === p.oppgave ? ' selected' : ''}>${e(FR.OPPGAVE[o].navn)}</option>`).join('') : '';
    const ordreLinje = O ? `<span class="ordre">Ordre: ${O.type === 'gå' ? 'går dit du pekte' : 'gjør «' + e(FR && FR.OPPGAVE[O.oppgave] ? FR.OPPGAVE[O.oppgave].navn : O.oppgave) + '» til ' + klokke(O.til)}</span>` : '';
    const html = `<b><i style="background:${farge(p.oppgave)}"></i>${e(t.navn)}</b><small>${e(t.jobb)}${t.plan ? ' · ' + e(t.plan) : ''}${U ? ' · utpost: ' + e(U.navn) : ''}</small><span class="gjor${t.fast ? ' fast' : ''}">${e(t.gjør.charAt(0).toUpperCase() + t.gjør.slice(1))}</span>${ordreLinje}` +
      (venterGå === p.id ? `<span class="ordre">Trykk i kartet der ${e(nyttNavn(p.navn))} skal gå.</span>` : '') +
      `<div class="ordrerad"><button type="button" data-o="gå">${venterGå === p.id ? 'Avbryt' : 'Gå hit'}</button><select aria-label="Oppgave nå" data-o="valg">${opp}</select><button type="button" data-o="gjør">Gjør dette nå</button>${O ? '<button type="button" data-o="stopp">Stopp ordren</button>' : ''}</div><button aria-label="Lukk" data-o="lukk">×</button>`;
    // (paneler som tegnes jevnlig) bytt bare når noe er endret, og ikke mens nedtrekkslista er åpen eller fingeren er nede
    if (k.dataset.html === html || (document.activeElement && document.activeElement.tagName === 'SELECT' && k.contains(document.activeElement)) || (window.pekerNede && pekerNede(k))) return;
    k.dataset.html = html; k.innerHTML = html;
    k.querySelector('[data-o="lukk"]').onclick = () => visKort(null);
    k.querySelector('[data-o="gå"]').onclick = () => { venterGå = venterGå === p.id ? null : p.id; visKort(p); };
    k.querySelector('[data-o="gjør"]').onclick = () => { const v = k.querySelector('[data-o="valg"]').value; ordre({ person: p.id, hva: 'gjør', oppgave: v }); venterGå = null; visKort(p); };
    const st = k.querySelector('[data-o="stopp"]'); if (st) st.onclick = () => { ordre({ person: p.id, hva: 'stopp' }); visKort(p); };
    if (typeof skitten !== 'undefined') skitten = true;
  }
  // kortet holder seg oppdatert mens det står (hva personen gjør, endrer seg)
  setInterval(() => { if (valgtId === null) return; const F = Fo(), p = F && F.personer.find(q => q.id === valgtId); if (!p) visKort(null); else visKort(p); }, 1000);
  const innenfor = (P, x, y) => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inn = !inn; return inn; };
  function nærmeste(X, Y, maks) { const F = Fo(); if (!F) return null; let best = null, bd = maks;
    for (const p of F.personer) { const q = plass2d(p); if (!q) continue; const d = Math.hypot(q.x - X, q.y - Y); if (d < bd) { bd = d; best = p; } } return best; }
  KROKER.trykk.unshift((X, Y) => {
    // (F5) «Gå hit»: neste trykk i kartet er stedet
    if (venterGå !== null) { const id = venterGå; venterGå = null; ordre({ person: id, hva: 'gå', x: X, y: Y }); const F = Fo(), p = F && F.personer.find(q => q.id === id); if (p) visKort(p); return true; }
    if (typeof kam === 'undefined' || kam.m >= 3 || (window.BYGGEVISNING && BYGGEVISNING.på && BYGGEVISNING.på())) { if (valgtId !== null) visKort(null); return false; }
    // et trykk inne i et av leirens bygg hører til bygget (byggpanelet), ikke til folk som står ved døra
    const L = Lr(); if (L && window.Leir && L.bygg.some(b => Leir.BYGG[b.type] && !Leir.BYGG[b.type].del && !Leir.BYGG[b.type].linje && innenfor(Leir.hjørner(b), X, Y))) { if (valgtId !== null) visKort(null); return false; }
    const p = nærmeste(X, Y, Math.max(1, 9 * kam.m)); if (!p) { if (valgtId !== null) visKort(null); return false; }
    visKort(p); return true; });

  // ---------- (F5) ORDRE TIL ÉN PERSON ----------
  // «Gå hit» (trykk i kartet etterpå) og «Gjør dette nå» fra kortet. Begge går gjennom KOMMANDO (personOrdre). «Gjør dette nå» setter
  // oppgaven (og låser den i jobbtavla mens den varer); når tida er ute (REGLER.ordreMin) får personen oppgaven og låsen hen hadde før.
  let venterGå = null;
  const nyttNavn = n => String(n || '').split(' ')[0];
  function ordreRett(k) {
    const F = Fo(), p = F && F.personer.find(q => q.id === k.person); if (!p) return { feil: 'Fant ikke personen.' };
    if (k.hva === 'stopp') { const O = FG.stopp(G, p.id); if (O && O.type === 'gjør') tilbake(p, O); return { ok: true, stoppet: !!O }; }
    if (k.hva === 'gå') { if (!Number.isFinite(k.x) || !Number.isFinite(k.y)) return { feil: 'Ugyldig sted.' };
      const før = G.ordre[p.id]; if (før && før.type === 'gjør') tilbake(p, før);
      FG.gi(G, p.id, { type: 'gå', x: k.x, y: k.y, e: 1 }); return { ok: true }; }
    if (k.hva === 'gjør') { if (!FR || !FR.OPPGAVER.includes(k.oppgave) || k.oppgave === 'fri') return { feil: 'Ukjent oppgave.' };
      const før = G.ordre[p.id], fra = før && før.type === 'gjør' ? før.fra : p.oppgave, J = window.JobberSpill && JobberSpill.tilstand ? JobberSpill.tilstand() : null;
      const lås = før && før.type === 'gjør' ? før.lås : J && J.lås ? J.lås[p.id] || null : null;
      p.oppgave = k.oppgave; if (J && J.auto && window.KOMMANDO) KOMMANDO({ type: 'jobbLås', person: p.id, jobb: k.oppgave });
      FG.gi(G, p.id, { type: 'gjør', oppgave: k.oppgave, fra, lås, til: nåTid() + FG.REGLER.ordreMin }); if (window.LeirSpill) LeirSpill.lagre(); return { ok: true }; }
    return { feil: 'Ukjent ordre.' };
  }
  // oppgaven og låsen tilbake etter «Gjør dette nå»
  function tilbake(p, O) {
    if (FR && FR.OPPGAVER.includes(O.fra)) p.oppgave = O.fra;
    const J = window.JobberSpill && JobberSpill.tilstand ? JobberSpill.tilstand() : null;
    if (J && J.auto && window.KOMMANDO) KOMMANDO({ type: 'jobbLås', person: p.id, jobb: O.lås || null });
    if (window.LeirSpill) LeirSpill.lagre();
  }
  function ordreHendelse(h, F) {
    const p = F.personer.find(q => q.id === h.id); if (!p) return;
    if (h.type === 'framme') logg(`${nyttNavn(p.navn)} er framme der du sa – jobbtavla tar over igjen.`);
    else if (h.type === 'fast') logg(`${nyttNavn(p.navn)} kommer ikke dit du pekte: ${h.grunn}.`);
    else if (h.type === 'ferdig') { tilbake(p, h.ordre); logg(`${nyttNavn(p.navn)} er ferdig med det du ba om – tilbake til ${FR && FR.OPPGAVE[p.oppgave] ? FR.OPPGAVE[p.oppgave].navn.toLowerCase() : p.oppgave}.`); }
    if (valgtId === p.id) visKort(p);
  }
  function registrer() {
    if (!window.Kommando || registrer.ferdig) return; registrer.ferdig = true;
    Kommando.registrer('personOrdre', { leir: true, sjekk: k => (Number.isFinite(k.person) ? null : 'Ugyldig person.'), utfør: k => ordreRett(k),
      beskriv: k => (k.hva === 'gå' ? 'sender en person et sted' : k.hva === 'gjør' ? 'gir en person en oppgave nå' : 'stopper en ordre') });
  }
  document.addEventListener('DOMContentLoaded', registrer); setTimeout(registrer, 0);
  const ordre = k => { registrer(); const r = window.KOMMANDO ? KOMMANDO({ type: 'personOrdre', ...k }) : { ok: false, feil: 'Kommandolaget mangler.' };
    if (!r.ok || (r.svar && r.svar.feil)) logg((r.svar && r.svar.feil) || r.feil || 'Avvist.'); return r; };

  // ---------- jobbtavla og 3D ----------
  // linjene «… står fast» i jobbtavla (JobberSpill.del)
  function fastLinjer() { const F = Fo(); if (!F) return [];
    return FG.fast(G, F).map(q => { const navn = FR && FR.OPPGAVE[q.type] ? FR.OPPGAVE[q.type].navn : q.type, hvem = q.navn.length <= 2 ? q.navn.map(n => n.split(' ')[0]).join(' og ') : `${q.navn.length} personer`;
      return `${navn} står fast: ${hvem} kommer ikke til ${q.sted} – ${q.grunn}.`; }); }
  // plassen til en person for folk3d.js: { x, y, e, a, går, inne (byggtype), bygg (id), hva, framme } eller null
  function plass(p) { const s = G.pers[p.id]; if (!s) return null; return { x: s.x, y: s.y, e: s.e || 1, a: s.a || 0, går: s.går, inne: s.inne, bygg: s.mål ? s.mål.bygg : null, hva: s.hva, framme: s.framme, sover: s.hva === 'søvn' }; }

  // teksten ved personen i Folk-panelet: bare når den sier noe mer enn døgnplanen (går til …, står fast …) og plassene er ferske
  function gjør(p) { const s = G.pers[p.id]; if (!s || !fersk() || s.oppgave !== p.oppgave || (s.framme && !s.fast && !s.går)) return ''; return FG.tekst(G, p); }
  window.FolkgangSpill = { på: true, aktiv, ordre: k => ordre(k), venterGå: () => venterGå, tilstand: () => G, steg, plass, plass2d, tekst: p => FG.tekst(G, p), gjør, fastLinjer, fersk, visKort: id => { const F = Fo(), p = F && F.personer.find(q => q.id === id); visKort(p || null); return !!p; },
    farge, FARGE, nullstill: () => { G = FG.ny(); kart = null; }, måling, nullstillMåling: () => { MÅL = {}; }, kart: () => kart, målKrok: null, etter: [] };
})();
