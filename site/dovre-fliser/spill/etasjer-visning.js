/* ETASJENE I 2D (fase B2, 28. nov). Reglene: spill/etasjer.js. Modellen: spill/bygning.js. Plantegningen: spill/plantegning-visning.js.
 * Karakteren din kan gå til en annen etasje gjennom trappene, og letingen, «Hent det som ligger igjen» og tilflukten gjelder
 * etasjen du står i:
 *  - Etasjevelgeren (#plan2d) får en linje til: «Du er i 2. etasje» og knappene «Gå hit», «Let gjennom etasjen», «Hent det som
 *    ligger igjen», «Bruk kjelleren som tilflukt». (Kroken window.PLAN2D_RAD / PLAN2D_KLIKK i plantegning-visning.js.)
 *  - Huspanelet (trykk på et hus) får «Etasjer: Kjeller · 2 · Loft» – karakteren går til huset og så opp/ned trappa.
 *  - Karakteren går langs veien i huset (Etasjer.vei: rutenett i etasjen og trappene), i kartet, med etasjen som lapp ved figuren.
 *  - Funn per etasje: Etasjer.funn (loft og kjeller har egne funn). Letingen huskes per leir i «riksbrudd-etasjer»
 *    = { v: 1, leir, lett: { 'hus:etasje': rest | 1 } } (1. etasje bruker leting-visning.js som før).
 *  - Tilflukt: kjeller i store bygg og tilfluktsrom kan brukes som tilfluktssted uten planker (OverlevSpill sin liste, k: 'kjeller').
 * Handlingene som endrer leiren går gjennom kommandolaget («etasjeLet», «etasjeTilflukt»). API: window.Etasjer2D.
 */
(function () {
  'use strict';
  const E = window.Etasjer; if (!E || typeof document === 'undefined') return;
  const PT = () => window.Plantegning2D || null, NØKKEL = 'riksbrudd-etasjer';
  // S: karakterens etasje (hus, n, p = plass i husets meter), gang = veien som gås nå, leter = letingen som pågår
  const S = { hus: null, n: 1, p: null, gang: null, leter: null, lett: {}, leir: '' };
  const karakter = () => (window.Spill2D && Spill2D.karakter ? Spill2D.karakter() : null);
  const tegnPå = () => { if (typeof skitten !== 'undefined') skitten = true; };
  const tall = v => String(v).replace('.', ',');
  const leirId = () => { const s = window.OppstartSpill && OppstartSpill.tilstand && OppstartSpill.tilstand(); return s && s.leir ? Math.round(s.leir.x) + ',' + Math.round(s.leir.y) : ''; };
  function les() { S.leir = leirId(); let d = null; try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    S.lett = d && d.v === 1 && d.leir === S.leir && d.lett && typeof d.lett === 'object' ? d.lett : {}; }
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify({ v: 1, leir: S.leir || leirId(), lett: S.lett })); } catch (e) { /* sperret */ } };
  window.addEventListener('riksbrudd-spill', () => setTimeout(les, 0)); les();

  // ---------- huset karakteren står i ----------
  const inni = (P, X, Y) => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > Y) !== (b[1] > Y) && X < (b[0] - a[0]) * (Y - a[1]) / (b[1] - a[1]) + a[0]) inn = !inn; } return inn; };
  // h = huset i plantegningen (Plantegning2D.hus): { i, o, Pv, m, info, A }
  const husAv = i => (PT() ? PT().hus(i) : null);
  const modell = h => (h ? h.m || (PT() ? PT().modell(h.i) : null) : null);
  // karakterens etasje i huset h (1 når den ikke er i huset)
  function etasjeI(h) { const A3 = window.Etasjer3d && Etasjer3d.aktiv(); if (h && A3 && A3.h && A3.h.i === h.i && typeof R3 !== 'undefined' && R3 && R3.fot) return A3.n;
    const k = karakter(); if (!h || !k) return 1; if (S.hus !== h.i) return 1;
    // har karakteren gått ut av huset (ny ordre), er den ute igjen
    if (!inni(h.Pv, k.x, k.y) && !S.gang) { S.hus = null; S.n = 1; S.p = null; return 1; } return S.n; }
  // døra inn (1. etasje): hovedinngangen, litt innenfor
  function inngang(m) { const e = E.etasje(m, 1); if (!e) return { x: 0, y: 0, n: 1 };
    const o = e.åpninger.find(q => q.inngang === 'hoved') || e.åpninger.find(q => q.inngang) || null; const w = o ? e.vegger[o.vegg] : null;
    if (!w) { let x = 0, y = 0; for (const p of m.P) { x += p[0]; y += p[1]; } return { x: x / m.P.length, y: y / m.P.length, n: 1 }; }
    const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), ux = (w.b[0] - w.a[0]) / L, uy = (w.b[1] - w.a[1]) / L;
    return { x: w.a[0] + ux * o.t - uy * .7, y: w.a[1] + uy * o.t + ux * .7, n: 1 }; }
  const husMål = h => { let x = 0, y = 0; for (const p of h.Pv) { x += p[0]; y += p[1]; } return { P: h.Pv, X: x / h.Pv.length, Y: y / h.Pv.length, i: h.i, A: h.A, kl: h.info.kl }; };

  // ---------- å gå i huset ----------
  // gå til etasje n i huset h: først til huset (Spill2D.gåTil), så langs veien inne. ferdig() når karakteren er framme.
  function gåTil(h, n, ferdig) {
    const m = modell(h), k = karakter(); if (!m || !k) { if (typeof logg === 'function') logg(k ? 'Huset er ikke lastet ennå.' : 'Du har ingen karakter i kartet.'); return false; }
    const et = E.etasje(m, n); if (!et) return false;
    if (et.stengt) { if (typeof logg === 'function') logg(`Trapperommet er sperret – ${et.navn.toLowerCase()} er stengt.`); return false; }
    const inne = () => {
      const nå = etasjeI(h), fra = nå !== 1 || (S.hus === h.i && S.p) ? Object.assign({ n: nå }, S.p || inngang(m)) : inngang(m);
      if (S.hus !== h.i) { S.hus = h.i; S.n = 1; }
      const v = E.vei(m, fra, n); if (!v) { if (typeof logg === 'function') logg(`Det finnes ingen vei til ${E.navn(et)} – trappa er borte.`); return false; }
      start(h, v, ferdig); return true; };
    if (S.hus === h.i && inni(h.Pv, k.x, k.y)) return inne();
    if (!window.Spill2D || !Spill2D.gåTil) return false;
    return Spill2D.gåTil(husMål(h), inne, 'Du går til huset …');
  }
  // gangen langs veien: REGLER.gange.fart m/s, høyst REGLER.gange.maks s (lengre veier går fortere)
  function start(h, v, ferdig) {
    const L = E.lengde(v), fart = Math.max(E.REGLER.gange.fart, L / E.REGLER.gange.maks), t0 = performance.now();
    S.gang = { h, v, L, fart, t0, ferdig, sist: null }; steg();
  }
  function steg() {
    const g = S.gang; if (!g) return; const k = karakter();
    // ny ordre eller karakteren er borte: gangen stopper
    if (!k || (g.sist && Math.hypot(k.x - g.sist[0], k.y - g.sist[1]) > 1.5)) { S.gang = null; tegnPå(); return; }
    let d = (performance.now() - g.t0) / 1000 * g.fart, p = g.v[0], n = g.v[0].n;
    for (let s = 1; s < g.v.length; s++) { const a = g.v[s - 1], b = g.v[s], l = Math.hypot(b.x - a.x, b.y - a.y);
      if (d <= l) { const f = l ? d / l : 1; p = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }; n = b.trapp !== undefined ? (f > E.REGLER.trapp.bytt ? b.n : a.n) : a.n; d = -1; break; }
      d -= l; p = b; n = b.n; }
    const X = g.h.o[0] + p.x, Y = g.h.o[1] + p.y; k.x = X; k.y = Y; if (k.sti) k.sti = []; g.sist = [X, Y];
    S.p = { x: p.x, y: p.y }; if (n !== S.n) { S.n = n; const P = PT(); if (P && P.S) { P.S.etasje = n; P.S.valgt = null; } }
    tegnPå();
    if (d >= 0) { S.gang = null; const et = E.etasje(g.h.m, S.n); if (typeof logg === 'function') logg(`Du er ${E.iNavn(et)}.`); if (g.ferdig) try { g.ferdig(); } catch (e) { console.warn('etasjer:', e); } visPå(); return; }
    setTimeout(steg, 80);
  }

  // ---------- leting per etasje ----------
  const nk = (h, n) => String(E.nøkkel(h.i, n));
  const erLett = (h, n) => n === 1 ? !!(window.LeteSpill && LeteSpill.lett().has(h.i)) : S.lett[nk(h, n)] !== undefined;
  const rest = (h, n) => { const r = S.lett[nk(h, n)]; return r && typeof r === 'object' ? r : null; };
  function sjekkLet(k) {
    const h = husAv(k.hus), m = modell(h); if (!m) return 'Huset er ikke lastet.'; const et = E.etasje(m, k.n); if (!et || k.n === 1) return 'Ukjent etasje.';
    if (et.stengt) return 'Trapperommet er sperret.'; if (S.hus !== h.i || etasjeI(h) !== k.n) return `Du må være ${E.iNavn(et)}.`;
    if (k.hent) return rest(h, k.n) && window.LeteSpill && LeteSpill.plassTil(rest(h, k.n)) ? null : 'Det er ikke plass i leiren ennå.';
    return erLett(h, k.n) ? `${E.navn(et)[0].toUpperCase() + E.navn(et).slice(1)} er alt gjennomsøkt.` : null;
  }
  function utførLet(k) {
    const h = husAv(k.hus), m = modell(h), et = E.etasje(m, k.n), LS = window.LeteSpill, navn = E.navn(et);
    const f = k.hent ? Object.assign({ mat: 0, tre: 0, betong: 0, stål: 0, diesel: 0, penger: 0, tomt: false }, rest(h, k.n)) : E.funn(h.info.kl, h.A, h.i, et);
    const fikk = LS && LS.ta ? LS.ta(f) : f, igjen = {};
    for (const s of ['tre', 'betong', 'stål', 'diesel']) { const r = (f[s] || 0) - (fikk[s] || 0); if (r > (s === 'diesel' ? .5 : .05)) igjen[s] = Math.round(r * 10) / 10; }
    S.lett[nk(h, k.n)] = Object.keys(igjen).length ? igjen : 1; lagre();
    const tekst = f.tomt ? `${navn[0].toUpperCase() + navn.slice(1)} var tom${et.loft ? 't' : ''} – noen har vært her før.` : (window.Leting ? Leting.tekst(fikk).replace(/^Du fant/, k.hent ? 'Du hentet' : `Du fant ${E.iNavn(et)}`) : 'Du fant noe.') + (Object.keys(igjen).length ? ' Noe ble igjen – leiren har ikke plass.' : '');
    if (LS && LS.visResultat) try { LS.visResultat({ bygg: { i: h.i, kl: h.info.kl }, leir: false }, { i2d: true, tittel: (k.hent ? 'Hentet fra ' : 'Gjennomsøkt: ') + navn, fikk, hentet: !!k.hent, tomt: f.tomt ? tekst : '', igjen: Object.keys(igjen).length ? 'Noe ligger igjen – leiren har ikke plass til alt.' : '', sekken: [] }); } catch (e) { console.warn('etasjer:', e); }
    if (window.OverlevSpill && OverlevSpill.øk) OverlevSpill.øk('leting', 10);
    tegnPå(); return { ok: true, tekst, f, fikk };
  }
  function sjekkTilflukt(k) {
    const h = husAv(k.hus), m = modell(h); if (!m) return 'Huset er ikke lastet.'; const tf = E.tilflukt(m); if (!tf) return 'Bygget har ingen kjeller som kan brukes som tilflukt.';
    if (S.hus !== h.i || etasjeI(h) !== tf.n) return `Gå ned i ${tf.navn} først.`;
    const O = window.OverlevSpill; if (!O || !O.T) return 'Tilflukt finnes ikke i dette spillet.';
    if (O.tilflukt(h.i)) return 'Huset er alt et tilfluktssted.'; const T = O.T(), maks = 6; if (T.length >= maks) return `Du har alt ${maks} tilfluktssteder. Gi opp ett først.`;
    return null;
  }
  function utførTilflukt(k) {
    const h = husAv(k.hus), m = modell(h), tf = E.tilflukt(m), O = window.OverlevSpill, c = husMål(h);
    O.T().push({ i: h.i, x: Math.round(c.X), y: Math.round(c.Y), kl: h.info.kl, kjeller: true }); if (O.lagre) O.lagre(); tegnPå();
    return { ok: true, tekst: `${tf.navn[0].toUpperCase() + tf.navn.slice(1)} er ditt tilfluktssted – tykke vegger og ingen vinduer. Her kan du hvile og sove.` };
  }
  function registrer() {
    const K = window.Kommando; if (!K) return false;
    if (!K.finnes('etasjeLet')) K.registrer('etasjeLet', { leir: true, meld: true, sjekk: k => sjekkLet(k), utfør: k => utførLet(k), beskriv: () => 'leter gjennom en etasje' });
    if (!K.finnes('etasjeTilflukt')) K.registrer('etasjeTilflukt', { leir: true, meld: true, sjekk: k => sjekkTilflukt(k), utfør: k => utførTilflukt(k), beskriv: () => 'tar en kjeller i bruk som tilflukt' });
    return true;
  }
  function kjør(k) { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : window.Kommando ? Kommando.utfør(k, {}) : { ok: false, feil: 'Kommandolaget mangler.' };
    if (r.ok && r.svar && r.svar.tekst && typeof logg === 'function') logg(r.svar.tekst); else if (!r.ok && !window.KOMMANDO && typeof logg === 'function') logg(r.feil); visPå(); return r; }
  // letingen tar tid (Leting.tid, som i 1. etasje); karakteren må bli i etasjen
  function let2d(h, n, hent) {
    const f = sjekkLet({ hus: h.i, n, hent }); if (f) { if (typeof logg === 'function') logg(f); return false; }
    if (hent) return kjør({ type: 'etasjeLet', hus: h.i, n, hent: true }).ok;
    const m = modell(h), et = E.etasje(m, n), A = E.areal(m.P) * (et.loft ? .6 : 1), sek = (window.Leting ? Leting.tid(A) : 8) * (window.OverlevSpill && OverlevSpill.letetid ? OverlevSpill.letetid() : 1);
    S.leter = { h, n, start: performance.now(), sek }; visPå(); letSteg(); return true;
  }
  function letSteg() { const j = S.leter; if (!j) return;
    if (S.hus !== j.h.i || etasjeI(j.h) !== j.n) { S.leter = null; if (typeof logg === 'function') logg('Letingen ble avbrutt – karakteren gikk fra etasjen.'); visPå(); return; }
    if ((performance.now() - j.start) / 1000 >= j.sek) { S.leter = null; kjør({ type: 'etasjeLet', hus: j.h.i, n: j.n }); return; }
    visPå(); setTimeout(letSteg, 250); }

  // ---------- linja i etasjevelgeren og knappene ----------
  let radHus = null;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function rad(h, n) {
    radHus = h; const m = modell(h), k = karakter(); if (!m || !k || m.etasjer.length < 2) return '';
    const her = S.hus === h.i && inni(h.Pv, k.x, k.y) ? etasjeI(h) : null, et = E.etasje(m, n), tf = E.tilflukt(m), b = (h2, t, tit) => `<button type="button" data-et="${h2}" title="${esc(tit || t)}">${esc(t)}</button>`;
    let html = '<div class="rad valg" id="etasjerad">';
    if (S.gang) html += `<span>Går … ${esc(E.iNavn(E.etasje(m, S.n)))}</span>`;
    else if (S.leter) html += `<span>Leter gjennom ${esc(E.navn(E.etasje(m, S.leter.n)))} … ${Math.max(0, Math.ceil(S.leter.sek - (performance.now() - S.leter.start) / 1000))} s</span>` + b('avbryt', 'Avbryt');
    else {
      html += `<span>${her === null ? 'Karakteren er ikke i huset' : 'Du er ' + esc(E.iNavn(E.etasje(m, her)))}</span>`;
      if (et && her !== n) html += et.stengt ? '<small> · trapperommet er sperret</small>' : b('gå', her === null ? `Gå til ${E.navn(et)}` : `Gå hit (${n > (her || 1) ? 'opp' : 'ned'} trappa)`, 'Karakteren går dit – gjennom trappene');
      if (her !== null && her === n && n !== 1) {
        if (!erLett(h, n)) html += b('let', `Let gjennom ${E.navn(et)}`, et.loft ? 'Loftet har ofte mye skrot – materialer og gamle ting' : et.kjeller ? 'Kjelleren har ofte mat og diesel' : '');
        else if (rest(h, n) && window.LeteSpill && LeteSpill.plassTil(rest(h, n))) html += b('hent', 'Hent det som ligger igjen');
        else html += '<small> · gjennomsøkt</small>';
      }
      if (her !== null && tf && her === tf.n) html += window.OverlevSpill && OverlevSpill.tilflukt && OverlevSpill.tilflukt(h.i) ? '<small> · tilfluktssted</small>' : b('tilflukt', `Bruk ${tf.navn} som tilflukt`, 'Ingen planker trengs – tykke vegger og ingen vinduer');
    }
    return html + '</div>';
  }
  function klikk(hva) {
    const P = PT(); if (!P) return; const h = radHus || hoved(); if (!h) return; const n = P.S.etasje;
    if (hva === 'gå') gåTil(h, n); else if (hva === 'let') let2d(h, n); else if (hva === 'hent') let2d(h, n, true);
    else if (hva === 'tilflukt') kjør({ type: 'etasjeTilflukt', hus: h.i }); else if (hva === 'avbryt') { S.leter = null; }
    visPå();
  }
  // huset velgeren viser (det samme som plantegning-visning.js velger: fokus, ellers nærmest midten)
  function hoved() { const P = PT(); if (!P || !P.S) return null; const l = P.S.nær.filter(h => h.klar && h.m); if (!l.length) return null;
    return l.slice().sort((a, b) => Math.hypot((a.bb[0] + a.bb[2]) / 2 - kam.x, (a.bb[1] + a.bb[3]) / 2 - kam.y) - Math.hypot((b.bb[0] + b.bb[2]) / 2 - kam.x, (b.bb[1] + b.bb[3]) / 2 - kam.y))[0]; }
  const visPå = () => { const P = PT(); if (P && P.visVelger) try { P.visVelger(); } catch (e) { /* uten velger */ } };
  (window.PLAN2D_RAD = window.PLAN2D_RAD || []).push((h, n) => rad(h, n));
  (window.PLAN2D_KLIKK = window.PLAN2D_KLIKK || []).push(hva => klikk(hva));
  // velgeren viser nedtellingen mens det letes
  setInterval(() => { if (S.leter) visPå(); }, 1000);

  // ---------- huspanelet: etasjene ----------
  async function husKnapper(X, Y) {
    const H = document.getElementById('handl'); if (!H || typeof finnBygg !== 'function' || !PT() || !window.Bygning) return; const k = karakter(); if (!k) return;
    const b = await finnBygg(X, Y); if (!b || !b.o || !b.o.e || b.o.e.i == null || !window.Plantegning) return;
    const Pv = Plantegning.åpent(b.P), h0 = PT().nyttHus(Pv, b.o.e, 0), m = PT().modell(h0.i); if (!m || m.etasjer.length < 2) return;
    const gl = document.getElementById('etasjer2d'); if (gl) gl.remove();
    const r = document.createElement('div'); r.id = 'etasjer2d'; r.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;flex:1 0 100%;margin:4px 0 0;align-items:center';
    const sm = document.createElement('small'); sm.style.color = '#b9ab8a'; sm.textContent = 'Etasjer:'; r.append(sm);
    for (const v of Plantegning.etasjeValg(m)) { if (v.n === 1) continue; const kn = document.createElement('button'); kn.type = 'button'; kn.textContent = v.kort; kn.dataset.n = v.n;
      kn.title = v.stengt ? 'Trapperommet er sperret' : `Karakteren går til ${v.navn.toLowerCase()} – opp eller ned trappa`; if (v.stengt) kn.disabled = true;
      kn.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); const P = PT(); if (P.S) P.S.etasje = v.n; gåTil(P.hus(h0.i), v.n); };
      r.append(kn); }
    H.append(r);
  }
  const vb0 = typeof window.visByggVed === 'function' ? window.visByggVed : null;
  if (vb0) window.visByggVed = async function (X, Y) { const ok = await vb0.apply(this, arguments); if (ok) { try { await husKnapper(X, Y); } catch (e) { console.warn('etasjer:', e); } } return ok; };

  // ---------- åpningene der trappa møter en skillevegg (Etasjer.trappÅpninger; samme som i 3D) ----------
  // Plantegningen tegner modellens vegger; her males åpningen i gulvets farge oppå veggen, så 2D og 3D er like.
  if (typeof KROKER !== 'undefined' && KROKER.tegn) KROKER.tegn.push((g, vx0, vy1) => {
    const P = PT(); if (!P || !P.S || !P.S.tegnet || !P.aktiv || !P.aktiv()) return;
    for (const t of P.S.tegnet) { const h = P.hus(t.i), m = h && h.m, et = m && E.etasje(m, t.n); if (!et) continue;
      for (const w of et.vegger) { if (w.type !== 'skille' || !E.står(w)) continue; const Å = E.trappÅpninger(m, t.n, w); if (!Å.length) continue;
        const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), ex = (w.b[0] - w.a[0]) / L, ey = (w.b[1] - w.a[1]) / L, X = q => (h.o[0] + q[0] - vx0) / kam.m, Y = q => (vy1 - h.o[1] - q[1]) / kam.m;
        g.save(); g.strokeStyle = 'rgba(20,17,11,1)'; g.lineWidth = Math.max(3, ((w.tykk || .1) + .04) / kam.m); g.lineCap = 'butt'; g.beginPath();
        for (const q of Å) { const a = [w.a[0] + ex * (q.t - q.b / 2), w.a[1] + ey * (q.t - q.b / 2)], b = [w.a[0] + ex * (q.t + q.b / 2), w.a[1] + ey * (q.t + q.b / 2)]; g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b)); }
        g.stroke(); g.restore(); } }
  });

  // ---------- lappen ved figuren ----------
  if (typeof KROKER !== 'undefined' && KROKER.tegn) KROKER.tegn.push((g, vx0, vy1) => {
    const k = karakter(); if (!k || S.hus === null || (S.n === 1 && !S.gang)) return; const h = husAv(S.hus); if (!h || kam.m > 4) return;
    const m = modell(h), et = m && E.etasje(m, S.n); if (!et) return; const x = (k.x - vx0) / kam.m, y = (vy1 - k.y) / kam.m, t = et.kjeller ? 'Kjeller' : et.loft ? 'Loft' : et.n + '. etg.';
    g.save(); g.font = '600 12px "Cormorant Garamond", Georgia, serif'; const w = g.measureText(t).width + 10; g.fillStyle = 'rgba(22,18,12,.88)'; g.strokeStyle = '#c9b26a'; g.lineWidth = 1;
    g.fillRect(x + 9, y + 6, w, 16); g.strokeRect(x + 9, y + 6, w, 16); g.fillStyle = '#f0e2b0'; g.textBaseline = 'middle'; g.fillText(t, x + 14, y + 14); g.restore();
  });

  window.Etasjer2D = { S, gåTil, let2d, etasjeI, inngang, husAv, modell, registrer, kjør, les, lagre, erLett, rest, rad, klikk, husKnapper,
    // ferdig nå (vakta): gangen hoppes fram til enden, letingen til slutten
    spol: () => { if (S.gang) S.gang.t0 -= 600000; if (S.leter) S.leter.start -= 600000; },
    nullstill: () => { S.hus = null; S.n = 1; S.p = null; S.gang = null; S.leter = null; } };
})();
