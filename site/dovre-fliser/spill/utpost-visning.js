'use strict';
// UTPOSTER – visningen (28. nov, fase F5; reglene: spill/utpost.js). Lastes rett etter oppforsel-visning.js.
//  - window.Utpost: API-et andre deler kan bruke (B7 «ta over hus» kan kalle Utpost.lag(x, y, navn, { hus }) når et hus er tatt over):
//    lag(x, y, navn, o), tildel(person | id, utpostId | null), fjern(id), liste(), hvor(pid), finn(id), senger(), velgSted(), tilstand().
//    Alt som endrer spillet, går gjennom KOMMANDO (utpostLag, utpostTildel, utpostFjern, utpostSenger, utpostMat, utpostJobb).
//  - Folkene i en utpost (FolkgangSpill.utpostKrok) reiser dit med reisetid, bor, spiser og arbeider der (spill/folkgang.js).
//    Etter hvert steg regner UtpostRegler.steg timeverkene, frakten av mat og lokal mat (betales bare i et ekte spill / UtpostSpill.test).
//  - Folk.js teller sengene i utpostene med leirens (FolkSpill.grunn -> ekstraSenger i folk-visning.js).
//  - Leir-menyen (fanen Bygg): «Utposter» med ny utpost (trykk i kartet), jobb, senger, mat og hvem som er der. 2D: merke med navn og antall.
//  - Lagres per leir i «riksbrudd-utpost» ({ leir: 'x,y', S }).
(function () {
  const UR = window.UtpostRegler; if (!UR || typeof KROKER === 'undefined') return;
  const NØKKEL = 'riksbrudd-utpost', FR = window.FolkRegler;
  let S = UR.ny(), leirNøkkel = '', velger = false, kartV = -1, kart = new Map(), mat = { kr: 0, r: 0 };
  const Sp = () => (window.OppstartSpill ? OppstartSpill.tilstand() : null);
  const midte = () => { const s = Sp(); return s && s.leir ? s.leir : null; };
  const Fo = () => (window.FolkSpill ? FolkSpill.tilstand() : null);
  const nøkkel = () => { const m = midte(); return m ? Math.round(m.x) + ',' + Math.round(m.y) : ''; };
  const kr = n => (window.Leir ? Leir.kroner(n) : Math.round(n) + ' kr');
  // lokal mat betales av seg selv bare i et ekte spill (ikke i testene med navigator.webdriver, uten UtpostSpill.test)
  const auto = () => !navigator.webdriver || window.UtpostSpill.test === true;

  // ---------- lagring ----------
  function lagre() { if (!leirNøkkel) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirNøkkel, S })); } catch (e) { /* fullt */ } }
  function les() { leirNøkkel = nøkkel(); S = UR.ny(); try { const o = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); if (o && o.leir === leirNøkkel) S = UR.fraJSON(o.S); } catch (e) { S = UR.ny(); } bytt(); }
  window.addEventListener('riksbrudd-spill', les);
  // oppslaget person -> utpost (bygges på nytt når noe endres)
  function bytt() { kartV++; kart = new Map(); for (const U of S.liste) for (const id of U.folk) kart.set(id, U); if (window.FolkgangSpill && FolkgangSpill.tilstand) { const G = FolkgangSpill.tilstand(); for (const s of Object.values(G.pers)) s.mk = null; } }

  // ---------- kroken til gangen ----------
  const fra = new Map();
  function krok(p) { const U = kart.get(p.id); if (!U) return null; let q = fra.get(U.id); if (!q || q.v !== kartV) { q = { v: kartV, id: U.id, x: U.x, y: U.y, navn: U.navn, seng: pp => UR.seng(U, pp.id) }; fra.set(U.id, q); } return q; }
  if (window.FolkgangSpill) {
    FolkgangSpill.utpostKrok = krok;
    FolkgangSpill.etter.push((G, dt) => {
      if (!S.liste.length) return; const m = midte(), F = Fo(); if (!m || !F) return;
      // personer som er borte (falt, sluttet, i en tropp) tas ut av utpostene
      if (UR.rydd(S, F.personer.map(p => p.id))) { bytt(); lagre(); }
      const r = UR.steg(S, G.ute, dt, { leir: m });
      if (r.kr > 0 && auto()) { mat.kr += r.kr; mat.r += r.rasjoner;
        // betales samlet (ca. hver halvtime spilltid): pengene ut, og rasjonene tilbake i leirens lager (folk.js trekker dem fra alle)
        if (mat.kr >= 2000) { if (OppstartSpill.betal(Math.round(mat.kr))) F.mat += mat.r; mat = { kr: 0, r: 0 }; } }
    });
  }

  // ---------- kommandoene ----------
  const finn = id => UR.finn(S, id);
  function lagRett(k) {
    const m = midte(); const U = UR.lag(S, k.x, k.y, k.navn || stedNavn(k.x, k.y), { leir: m, hus: k.hus || null, jobb: k.jobb, tid: typeof tid !== 'undefined' ? tid : 0 });
    if (U.feil) return U; bytt(); lagre(); logg(`Ny utpost: ${U.navn}, ${(Math.round(Math.hypot(U.x - m.x, U.y - m.y) / 100) / 10).toString().replace('.', ',')} km fra leiren. Send folk dit fra Folk.`); return { ok: true, id: U.id };
  }
  function tildelRett(k) {
    const F = Fo(), p = F && F.personer.find(q => q.id === k.person); if (!p) return { feil: 'Fant ikke personen.' };
    const r = UR.tildel(S, p.id, k.utpost === null || k.utpost === undefined ? null : k.utpost); if (r.feil) return r;
    const J = window.JobberSpill && JobberSpill.tilstand ? JobberSpill.tilstand() : null;
    if (r.utpost) { p.oppgave = r.utpost.jobb; if (J && J.auto && window.KOMMANDO) KOMMANDO({ type: 'jobbLås', person: p.id, jobb: r.utpost.jobb }); }
    else if (r.fra && J && J.auto && window.KOMMANDO) KOMMANDO({ type: 'jobbLås', person: p.id, jobb: null });
    bytt(); lagre(); if (window.LeirSpill) LeirSpill.lagre();
    const navn = p.navn.split(' ')[0], m = midte();
    logg(r.utpost ? `${navn} reiser til ${r.utpost.navn} (ca. ${tidTekst(UR.reisetid(r.utpost, m))}).` : r.fra ? `${navn} reiser hjem fra ${r.fra.navn}.` : `${navn} er i leiren.`);
    return { ok: true };
  }
  function fjernRett(k) { const U = finn(k.utpost); if (!U) return { feil: 'Fant ikke utposten.' }; for (const id of U.folk.slice()) tildelRett({ person: id, utpost: null }); UR.fjern(S, U.id); bytt(); lagre(); logg(`${U.navn} er lagt ned – folkene reiser hjem.`); return { ok: true }; }
  function sengRett(k) { const U = finn(k.utpost); if (!U) return { feil: 'Fant ikke utposten.' }; const n = Math.max(1, Math.min(UR.REGLER.maksSenger - U.senger, Math.round(+k.antall || 4)));
    if (n <= 0) return { feil: `Utposten har alt ${UR.REGLER.maksSenger} senger.` }; const pris = n * UR.REGLER.sengPris;
    if (!OppstartSpill.betal(pris)) return { feil: `Ikke nok penger (${kr(pris)}).` }; U.senger += n; bytt(); lagre(); logg(`${n} senger til ${U.navn} (${kr(pris)}).`); return { ok: true }; }
  function matRett(k) { const U = finn(k.utpost); if (!U || !UR.MAT[k.mat]) return { feil: 'Ugyldig valg.' }; U.mat = k.mat; lagre(); return { ok: true }; }
  function jobbRett(k) { const U = finn(k.utpost); if (!U || !UR.REGLER.JOBB[k.jobb]) return { feil: 'Ugyldig jobb.' }; U.jobb = k.jobb;
    const F = Fo(); if (F) for (const p of F.personer) if (U.folk.includes(p.id)) { p.oppgave = k.jobb; const J = window.JobberSpill && JobberSpill.tilstand ? JobberSpill.tilstand() : null; if (J && J.auto && window.KOMMANDO) KOMMANDO({ type: 'jobbLås', person: p.id, jobb: k.jobb }); }
    bytt(); lagre(); if (window.LeirSpill) LeirSpill.lagre(); return { ok: true }; }
  function registrer() {
    if (!window.Kommando || registrer.ferdig) return; registrer.ferdig = true; const K = window.Kommando, tall = v => Number.isFinite(v);
    K.registrer('utpostLag', { leir: true, sjekk: k => (tall(k.x) && tall(k.y) ? null : 'Ugyldig sted.'), utfør: lagRett, beskriv: () => 'lager en utpost' });
    K.registrer('utpostTildel', { leir: true, sjekk: k => (tall(k.person) ? null : 'Ugyldig person.'), utfør: tildelRett, beskriv: () => 'sender en person til en utpost' });
    K.registrer('utpostFjern', { leir: true, utfør: fjernRett, beskriv: () => 'legger ned en utpost' });
    K.registrer('utpostSenger', { leir: true, utfør: sengRett, beskriv: () => 'kjøper senger til en utpost' });
    K.registrer('utpostMat', { leir: true, utfør: matRett, beskriv: () => 'velger mat til en utpost' });
    K.registrer('utpostJobb', { leir: true, utfør: jobbRett, beskriv: () => 'velger arbeidet i en utpost' });
  }
  document.addEventListener('DOMContentLoaded', registrer); setTimeout(registrer, 0);
  const kom = k => { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' }; const f = r.ok ? r.svar && r.svar.feil : r.feil || 'Avvist.'; if (f) logg(f); return r; };

  // ---------- tekster ----------
  const tidTekst = sek => { const m = sek / 60; return m < 60 ? Math.max(1, Math.round(m)) + ' min' : (Math.round(m / 6) / 10).toString().replace('.', ',') + ' t'; };
  // navnet på stedet: nærmeste tettsted innen 3 km, ellers «Utpost N»
  function stedNavn(x, y) {
    try { if (typeof INFRA !== 'undefined' && INFRA && Array.isArray(INFRA.tettsted) && typeof navnP === 'function') { let best = null, bd = 3000;
      for (const o of INFRA.tettsted) { const [X, Y] = navnP(o), d = Math.hypot(X - x, Y - y); if (d < bd && o.e && o.e.navn) { bd = d; best = o.e.navn; } } if (best) return 'Utpost ' + best; } } catch (e) { /* uten tettsteder */ }
    return 'Utpost ' + S.neste;
  }

  // ---------- Leir-menyen ----------
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el, knapp }) => {
    if (!midte() || !window.LeirSpill) return; const m = midte();
    hode.appendChild(el('h3', { 'data-fane': 'bygg' }, 'Utposter'));
    hode.appendChild(el('div', { klasse: 'status', style: 'font-size:13px' }, velger ? 'Trykk i kartet der utposten skal ligge (minst 500 m fra leiren).' :
      'Et sted langt unna (et hus, et hogstfelt) med egne folk, senger og mat. Folkene reiser dit én gang og arbeider der. Send folk dit fra Folk.'));
    hode.appendChild(el('div', { klasse: 'rad' }, knapp(velger ? 'Avbryt' : 'Ny utpost (trykk i kartet)', () => { velger = !velger; if (window.LeirSpill.visMeny) LeirSpill.visMeny(); }, { id: 'nyutpost' })));
    for (const U of S.liste) {
      const v = el('select', { 'aria-label': 'Arbeid i ' + U.navn, 'data-utpost': String(U.id) }); for (const [j, t] of Object.entries(UR.REGLER.JOBB)) { const o = el('option', { value: j }, t); if (j === U.jobb) o.setAttribute('selected', ''); v.appendChild(o); }
      v.onchange = () => kom({ type: 'utpostJobb', utpost: U.id, jobb: v.value });
      const navn = Fo() ? Fo().personer.filter(p => U.folk.includes(p.id)).map(p => p.navn.split(' ')[0]) : [];
      hode.appendChild(el('div', { klasse: 'utpost', 'data-utpost': String(U.id) }, el('b', {}, U.navn), el('small', { style: 'display:block;color:var(--ink-dim)' }, UR.tekst(U, m)),
        el('small', { style: 'display:block' }, navn.length ? 'Der: ' + navn.join(', ') : 'Ingen der ennå – velg utposten ved en person i Folk.'),
        el('div', { klasse: 'rad' }, v, knapp(`+4 senger (${kr(4 * UR.REGLER.sengPris)})`, () => kom({ type: 'utpostSenger', utpost: U.id, antall: 4 })),
          knapp(U.mat === 'lokal' ? 'Mat: kjøpes lokalt' : 'Mat: fra leiren', () => kom({ type: 'utpostMat', utpost: U.id, mat: U.mat === 'lokal' ? 'leir' : 'lokal' }), { title: U.mat === 'lokal' ? `Ca. ${kr(UR.lokalKr(U))} per døgn – ingen frakttur` : 'Én frakttur hver dag tar arbeidstid' }),
          knapp('Vis', () => { kam.x = U.x; kam.y = U.y; kam.m = Math.min(kam.m, 2); skitten = true; }), knapp('Legg ned', () => kom({ type: 'utpostFjern', utpost: U.id })))));
    }
  });
  KROKER.trykk.unshift((X, Y) => { if (!velger) return false; velger = false; kom({ type: 'utpostLag', x: X, y: Y }); if (window.LeirSpill && LeirSpill.visMeny) LeirSpill.visMeny(); return true; });

  // ---------- 2D: merket ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!S.liste.length || typeof kam === 'undefined' || (typeof på3d !== 'undefined' && på3d) || kam.m > 60) return; const m = kam.m;
    g.save(); g.font = '600 13px "Cormorant Garamond", serif'; g.textAlign = 'center';
    for (const U of S.liste) { const x = (U.x - vx0) / m, y = (vy1 - U.y) / m; if (x < -40 || y < -40 || x > g.canvas.width + 40 || y > g.canvas.height + 40) continue;
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x - 8, y - 8, 16, 16); g.strokeStyle = '#f0d79a'; g.lineWidth = 2; g.strokeRect(x - 7, y - 7, 14, 14);
      g.fillStyle = '#f0d79a'; g.beginPath(); g.moveTo(x - 4, y + 3); g.lineTo(x, y - 4); g.lineTo(x + 4, y + 3); g.closePath(); g.fill();
      const t = `${U.navn} · ${U.folk.length}`; g.fillStyle = 'rgba(0,0,0,.6)'; const w = g.measureText(t).width; g.fillRect(x - w / 2 - 4, y + 10, w + 8, 17); g.fillStyle = '#efe7d2'; g.fillText(t, x, y + 23); }
    g.restore(); });

  // ---------- API-et ----------
  const pid = p => (typeof p === 'object' && p ? p.id : p);
  window.Utpost = {
    lag: (x, y, navn, o = {}) => { const r = kom({ type: 'utpostLag', x, y, navn, hus: o.hus, jobb: o.jobb }); return r.ok && r.svar && r.svar.id ? finn(r.svar.id) : null; },
    tildel: (person, id) => { const r = kom({ type: 'utpostTildel', person: pid(person), utpost: id === undefined ? (S.liste[0] ? S.liste[0].id : null) : id }); return !!(r.ok && r.svar && r.svar.ok); },
    fjern: id => kom({ type: 'utpostFjern', utpost: id }).ok,
    liste: () => S.liste, finn, hvor: id => kart.get(id) || null, senger: () => UR.sengerIBruk(S), tilstand: () => S,
    velgSted: () => { velger = true; }, reisetid: U => UR.reisetid(U, midte()),
  };
  window.UtpostSpill = { test: false, tilstand: () => S, lagre, les, nullstill: () => { S = UR.ny(); bytt(); lagre(); } };
})();
