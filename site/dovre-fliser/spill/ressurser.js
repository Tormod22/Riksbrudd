/* Materialer fra verden: regler uten DOM (Node: require('./ressurser'); nettleser: globalThis.Ressurser).
 * Brukeren 12. nov («et enda bedre byggesystem», valgte «materialer fra verden»): i stedet for å kjøpe tre, betong og stål kan gjengen
 *  - hogge skog nær leiren (et rundt hogstfelt, 20–50 m radius): gir tre etter hvor mye skog det er i feltet;
 *  - rive forlatte hus (husomrissene fra kartet, ikke leirens egne bygg): gir tre, betong og stål etter byggtype og størrelse.
 * Arbeidet gjøres av folk på oppgaven 'hogst' eller 'riving' (window.Folk), og materialene legges i en haug der arbeidet skjer.
 * Haugen fraktes til leiren av folk på oppgaven 'frakt' (sakte, til fots) eller av en lastebil (oppdrag type 'ressurs' med turer fram og
 * tilbake). Innen 150 m fra leiren bærer arbeiderne det rett i lageret. Lageret har tak (Leir.lagerplass): er det fullt, venter resten.
 * Hogde felt og revne hus huskes (R.hogd, R.revet), så trærne og husene er borte i 3D og kartet også etter at spillet lastes på nytt.
 * Tallene er Claudes forslag (spillverdier, ikke fasit) – spør brukeren før de endres mye.
 */
(function (rot) {
  'use strict';
  const REGLER = {
    maksAvstand: 3000,   // meter fra leiren: lenger ut hogges og rives det ikke
    nær: 150,            // meter: innenfor bærer arbeiderne materialene rett i lageret
    hogst: { radier: [20, 35, 50], treM2: .012, perArbeider: 3, minSkog: .15 },   // m³ tre per m² skog (ca. 120 m³/ha), m³ per arbeidstime
    riving: { perArbeider: 2.5, grunn: 1, maksAreal: 3000 },   // m³ (eller t) materialer per arbeidstime, + en time å komme i gang
    bæring: { last: .15, fart: 1.1 },                          // m³ per tur (trillebår/kjelke) og m/s i snitt for folk på 'frakt'
    lastebil: { last: 12, lastetid: 1200, lossetid: 900 },     // m³/t per kjøretøy i kolonnen; sekunder for lasting og lossing
    reserve: 2,          // så mange arbeidere per oppgave når Folk-delen mangler
  };
  const MAT = ['tre', 'betong', 'stål'];
  const ny = () => ({ versjon: 1, jobber: [], hogd: [], revet: [], neste: 1 });
  const r1 = v => Math.round(v * 10) / 10;
  const sum = m => MAT.reduce((s, k) => s + (m[k] || 0), 0);
  const tom = () => ({ tre: 0, betong: 0, stål: 0 });

  // Arealet av et omriss [[x, y], …] i m²
  function areal(P) { let a = 0; for (let i = 0; i < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length]; a += ax * by - bx * ay; } return Math.abs(a) / 2; }
  // Hva slags materialer bygget mest er av: tre (boliger, uthus, låver, hytter, kirker), stål (industri, lager, hangarer) eller betong (resten)
  function gruppe(t, A, h) {
    if (t === 6 || t === 12 || t === 14) return 'stål';
    if (t === 1 || t === 4 || t === 8 || t === 11) return 'tre';
    if (t === 0) return h >= 10 || A > 350 ? 'betong' : 'tre';
    if (t === 5) return A < 150 && h < 9 ? 'tre' : 'betong';
    return 'betong';
  }
  // Det et revet hus gir (det som kan brukes igjen) og arbeidet i arbeidstimer. t: byggtypen (0–14), A: grunnflate (m²), h: høyde (m)
  function husUtbytte(t, A, h) {
    if (!(A > 0)) return { feil: 'Fant ikke huset.' };
    if (A > REGLER.riving.maksAreal) return { feil: `For stort til å rives for hånd (${Math.round(A)} m²).` };
    const H = Math.max(2.5, Math.min(40, h || 6)), vol = A * H, g = gruppe(t, A, H);
    const mat = g === 'tre' ? { tre: .045 * vol, betong: .1 * A, stål: .0006 * vol }
      : g === 'stål' ? { tre: .002 * vol, betong: .12 * A, stål: .0032 * vol }
      : { tre: .004 * vol, betong: .028 * vol, stål: .0022 * vol };
    for (const k of MAT) mat[k] = r1(mat[k]);
    return { mat, gruppe: g, timer: r1(REGLER.riving.grunn + sum(mat) / REGLER.riving.perArbeider) };
  }
  // Det et hogstfelt gir: r = radius (m), skog = andelen av feltet som er skog (og ikke hogd fra før), 0–1
  function hogstUtbytte(r, skog) {
    const tre = r1(Math.PI * r * r * Math.max(0, Math.min(1, skog)) * REGLER.hogst.treM2);
    return { mat: { tre, betong: 0, stål: 0 }, timer: r1(tre / REGLER.hogst.perArbeider) };
  }
  const avstand = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function nyJobb(R, type, x, y, ut, leir, ekstra) {
    const j = { id: R.neste++, type, x: r1(x), y: r1(y), mat: ut.mat, arbeid: Math.max(.1, ut.timer), gjort: 0, haug: tom(), levert: tom(), avst: Math.round(avstand({ x, y }, leir)), frakt: 'fots', ...ekstra };
    R.jobber.push(j); return j;
  }
  // Start hogst: o = { x, y, r, skog }. leir = { x, y }. Gir { jobb } eller { feil }.
  function startHogst(R, o, leir) {
    if (!leir) return { feil: 'Sett opp leiren først.' };
    if (avstand(o, leir) > REGLER.maksAvstand) return { feil: `For langt fra leiren (høyst ${REGLER.maksAvstand / 1000} km).` };
    if (!(o.skog >= REGLER.hogst.minSkog)) return { feil: o.skog > 0 ? 'For lite skog igjen her.' : 'Det er ikke skog her.' };
    const ut = hogstUtbytte(o.r, o.skog); if (ut.mat.tre < .5) return { feil: 'For lite skog igjen her.' };
    return { jobb: nyJobb(R, 'hogst', o.x, o.y, ut, leir, { r: o.r }) };
  }
  // Start riving: hus = { i (husets nummer i kartet), P (omrisset i meter), t (type), h (høyde) }. Gir { jobb } eller { feil }.
  function startRiving(R, hus, leir) {
    if (!leir) return { feil: 'Sett opp leiren først.' };
    if (!hus || !hus.P || hus.P.length < 3) return { feil: 'Fant ikke huset.' };
    if (R.revet.some(q => q.i === hus.i)) return { feil: 'Huset er revet.' };
    if (R.jobber.some(j => j.type === 'riving' && j.hus.i === hus.i)) return { feil: 'Huset rives allerede.' };
    const P = hus.P.map(([x, y]) => [r1(x), r1(y)]), c = midt(P);
    if (avstand(c, leir) > REGLER.maksAvstand) return { feil: `For langt fra leiren (høyst ${REGLER.maksAvstand / 1000} km).` };
    const ut = husUtbytte(hus.t, areal(P), hus.h); if (ut.feil) return ut;
    return { jobb: nyJobb(R, 'riving', c.x, c.y, ut, leir, { hus: { i: hus.i, P, t: hus.t, h: hus.h || 6 }, gruppe: ut.gruppe }) };
  }
  function midt(P) { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return { x: x / P.length, y: y / P.length }; }
  const finn = (R, id) => R.jobber.find(j => j.id === id);
  const fram = j => Math.max(0, Math.min(1, j.gjort / j.arbeid));
  const iHaug = j => sum(j.haug);
  // Avbryt: arbeidet stopper (det som er gjort, beholdes og kan fortsatt fraktes). Et påbegynt hogstfelt huskes så langt det er hogd.
  function avbryt(R, id) {
    const j = finn(R, id); if (!j || j.stoppet) return false; j.stoppet = true;
    if (j.type === 'hogst' && j.gjort > 0 && j.gjort < j.arbeid) R.hogd.push({ x: j.x, y: j.y, r: j.r, andel: +fram(j).toFixed(3) });
    if (iHaug(j) < .05 && !j.påBil) R.jobber = R.jobber.filter(q => q !== j);
    return true;
  }
  // Tar `m` fra haugen, likt fordelt på materialene som ligger der. Gir det som ble tatt.
  function ta(haug, m) {
    const s = sum(haug), ut = tom(); if (s <= 0 || m <= 0) return ut; const f = Math.min(1, m / s);
    for (const k of MAT) { ut[k] = haug[k] * f; haug[k] -= ut[k]; if (haug[k] < 1e-9) haug[k] = 0; } return ut;
  }
  // Legger last i lageret (leggInn(type, mengde) -> lagt inn); det som ikke får plass, blir igjen i `last`. Gir det som ble lagt inn.
  function lever(last, leggInn) {
    const inn = tom(); for (const k of MAT) { if (last[k] <= 1e-9) continue; const l = Math.max(0, Math.min(last[k], leggInn(k, last[k]) || 0)); inn[k] = l; last[k] -= l; if (last[k] < 1e-6) last[k] = 0; }
    return inn;
  }
  const leggTil = (a, b) => { for (const k of MAT) a[k] = (a[k] || 0) + (b[k] || 0); return a; };
  // Ett steg på dt spillminutter. ctx = { arbeidere(oppgave), tempo(oppgave), leir: { x, y }, leggInn(type, mengde) -> lagt inn }.
  // Gir hendelser: { hva: 'ferdig', jobb } (arbeidet er gjort), { hva: 'levert', jobb, mat }, { hva: 'fullt', jobb } (lageret er fullt), { hva: 'tømt', jobb }.
  function steg(R, dt, ctx) {
    const hend = [], n = o => (ctx.arbeidere ? ctx.arbeidere(o) : REGLER.reserve) * (ctx.tempo ? ctx.tempo(o) : 1);
    // arbeidet: den første jobben av hvert slag får alle som har oppgaven (jobbene står i kø)
    for (const opg of ['hogst', 'riving']) {
      const j = R.jobber.find(q => q.type === opg && !q.stoppet && q.gjort < q.arbeid); if (!j) continue;
      const d = Math.min(j.arbeid - j.gjort, n(opg) * dt / 60); if (d <= 0) continue;
      for (const k of MAT) j.haug[k] += j.mat[k] * d / j.arbeid; j.gjort += d;
      if (j.gjort >= j.arbeid - 1e-9) { j.gjort = j.arbeid;
        if (j.type === 'hogst') R.hogd.push({ x: j.x, y: j.y, r: j.r }); else R.revet.push({ i: j.hus.i, P: j.hus.P, t: j.hus.t, h: j.hus.h, gruppe: j.gruppe });
        hend.push({ hva: 'ferdig', jobb: j }); }
    }
    // nær leiren: rett i lageret
    for (const j of R.jobber) if (j.avst <= REGLER.nær && iHaug(j) > 0) levering(j, j.haug);
    // til fots: folk på 'frakt' tar én haug om gangen (den eldste som ikke har lastebil)
    const fots = R.jobber.find(j => j.avst > REGLER.nær && j.frakt !== 'lastebil' && iHaug(j) > .01);
    if (fots) { const B = REGLER.bæring, perTime = n('frakt') * B.last * B.fart * 3600 / (2 * fots.avst);
      const last = ta(fots.haug, perTime * dt / 60); levering(fots, last); leggTil(fots.haug, last); }
    // ferdige jobber med tom haug tas ut av lista
    for (const j of R.jobber.slice()) if ((j.gjort >= j.arbeid || j.stoppet) && iHaug(j) < .05 && !j.påBil) { R.jobber = R.jobber.filter(q => q !== j); hend.push({ hva: 'tømt', jobb: j }); }
    return hend;
    function levering(j, last) {
      const inn = lever(last, ctx.leggInn); leggTil(j.levert, inn);
      if (sum(inn) > 0) hend.push({ hva: 'levert', jobb: j, mat: inn });
      if (sum(last) > .01) hend.push({ hva: 'fullt', jobb: j });
    }
  }
  // ---------- lastebil ----------
  // Gir en lastebilkolonne oppdraget å frakte haugen fra jobben til leiren (turer fram og tilbake til jobben er ferdig og haugen tom).
  // K = Kjoretoy (reglene), graf = vegnettet. Gir { meter, sekunder } eller { feil }.
  function lastebil(R, kj, jobbId, graf, K, leir) {
    const j = finn(R, jobbId); if (!j) return { feil: 'Jobben finnes ikke.' };
    if (kj.type !== 'lastebil' || !kj.antall) return { feil: 'Bare lastebiler kan frakte materialer.' };
    if (kj.oppdrag) return { feil: `${kj.navn} er opptatt.` };
    const r = K.planlegg(kj, graf, [j.x, j.y]); if (r.feil) return r;
    kj.oppdrag = { type: 'ressurs', jobb: j.id, fase: 'til haug', igjen: 0, last: tom() }; j.frakt = 'lastebil'; j.bil = kj.navn; return r;
  }
  const kapasitet = kj => REGLER.lastebil.last * (kj.antall || 1);
  // Ett steg for et frakteoppdrag (sek spillsekunder). Gir hendelser som steg() (levert, fullt, tømt) og { hva: 'feil', melding }, { hva: 'slutt' }.
  function bilSteg(R, kj, graf, sek, K, leir, leggInn) {
    const o = kj.oppdrag, hend = []; if (!o || o.type !== 'ressurs') return hend;
    let vakt = 20;
    while (sek > 0 && kj.oppdrag && vakt-- > 0) {
      const j = finn(R, o.jobb);
      if (o.fase === 'til haug' || o.fase === 'til leir') {
        if (o.fase === 'til haug' && !j) { gå('til leir'); continue; }
        if (!kj.sti) { neste(j); continue; }
        const før = K.tidIgjen(kj), framme = K.steg(kj, sek); sek = framme ? Math.max(0, sek - før) : 0; if (framme) neste(j);
      } else if (o.fase === 'venter') {
        // ved haugen: venter på at arbeiderne får fram mer (eller på plass i lageret når den står ved leiren)
        if (!j || iHaug(j) >= Math.min(kapasitet(kj), Math.max(1, sum(j.mat) - sum(j.levert))) || j.gjort >= j.arbeid || j.stoppet) { o.fase = 'laster'; o.igjen = REGLER.lastebil.lastetid; } else sek = 0;
      } else if (o.fase === 'fullt') { neste(j); sek = 0; }
      else { const d = Math.min(sek, o.igjen); o.igjen -= d; sek -= d; if (o.igjen <= 0) neste(j); }
    }
    return hend;
    function gå(fase) { o.fase = fase; const m = fase === 'til haug' ? [j0().x, j0().y] : [leir.x, leir.y], r = K.planlegg(kj, graf, m);
      if (r.feil) { hend.push({ hva: 'feil', melding: r.feil }); slutt(); } }
    function j0() { return finn(R, o.jobb); }
    function slutt() { const j = finn(R, o.jobb); if (j) { j.påBil = false; if (j.bil === kj.navn) { j.frakt = 'fots'; j.bil = null; } } kj.oppdrag = null; hend.push({ hva: 'slutt' }); }
    function neste(j) {
      if (o.fase === 'til haug') { o.fase = 'venter'; }
      else if (o.fase === 'laster') {
        if (j) { const t = ta(j.haug, kapasitet(kj) - sum(o.last)); leggTil(o.last, t); j.påBil = sum(o.last) > 0; }
        if (sum(o.last) < .01) { slutt(); return; } gå('til leir');
      } else if (o.fase === 'til leir') { o.fase = 'losser'; o.igjen = REGLER.lastebil.lossetid; }
      else if (o.fase === 'losser' || o.fase === 'fullt') {
        const inn = lever(o.last, leggInn), jj = finn(R, o.jobb);
        if (jj) leggTil(jj.levert, inn); if (sum(inn) > 0) hend.push({ hva: 'levert', jobb: jj || { id: o.jobb }, mat: inn });
        if (sum(o.last) > .01) { if (o.fase !== 'fullt') hend.push({ hva: 'fullt', jobb: jj || { id: o.jobb } }); o.fase = 'fullt'; return; }
        if (jj) jj.påBil = false;
        // flere turer så lenge jobben har mer å gi
        if (jj && !(jj.stoppet && iHaug(jj) < .05) && !(jj.gjort >= jj.arbeid && iHaug(jj) < .05)) { gå('til haug'); return; }
        slutt();
      }
    }
  }
  function bilTekst(kj) {
    const o = kj.oppdrag; if (!o || o.type !== 'ressurs') return null;
    return { 'til haug': 'kjører for å hente materialer', venter: 'venter på materialer', laster: 'laster materialer', 'til leir': 'kjører materialer til leiren', losser: 'losser i leiren', fullt: 'venter: lageret i leiren er fullt' }[o.fase] || null;
  }
  // ---------- det som huskes ----------
  // Kanten av et hogstfelt er ujevn (ikke en perfekt sirkel): radius × 0,8–1 etter retningen, fast per felt
  function kant(f, a) { const s = ((f.x * .37 + f.y * .73) % 6.283 + 6.283) % 6.283; return .9 + .05 * Math.sin(3 * a + s) + .03 * Math.sin(7 * a + 2 * s) + .02 * Math.sin(11 * a + 3 * s); }
  function iFelt(f, x, y) { const dx = x - f.x, dy = y - f.y, d = Math.hypot(dx, dy); return d < f.r * .8 || (d < f.r && d < f.r * kant(f, Math.atan2(dy, dx))); }
  // Er et tre i (x, y) hogd? h: treets egen tilfeldighet 0–1 (så et påbegynt felt tynnes ut litt etter litt)
  function erHogd(R, x, y, h = 0) {
    for (const f of R.hogd) if (h < (f.andel === undefined ? 1 : f.andel) && iFelt(f, x, y)) return true;
    for (const j of R.jobber) if (j.type === 'hogst' && !j.stoppet && h < fram(j) && iFelt(j, x, y)) return true;
    return false;
  }
  // Kan det hogges i (x, y)? Ikke i et pågående hogstfelt (der hogges alt), og ikke der skogen er hogd fra før: et ferdig felt er helt
  // hogd, et stoppet felt bare så langt arbeidet kom (andel). h: punktets egen tilfeldighet 0–1, som for trærne i erHogd.
  // (Før sperret et felt som ble stoppet etter 10 % hele sirkelen for ny hogst, feiljakt 12. nov.)
  function ledigSkog(R, x, y, h = 0) {
    if (R.jobber.some(j => j.type === 'hogst' && !j.stoppet && Math.hypot(x - j.x, y - j.y) < j.r)) return false;
    return !R.hogd.some(f => h < (f.andel === undefined ? 1 : f.andel) && Math.hypot(x - f.x, y - f.y) < f.r);
  }
  const revetSett = R => new Set(R.revet.map(q => q.i));
  // Hva det koster å kjøpe like mye (MATERIALER fra leir.js: { tre: { pris }, … })
  const kjøpsverdi = (mat, M) => Math.round(MAT.reduce((s, k) => s + (mat[k] || 0) * (M[k] ? M[k].pris : 0), 0));
  // Timer arbeidet tar med n arbeidere (Infinity uten folk)
  const timerMed = (j, n) => (n > 0 ? (j.arbeid - j.gjort) / n : Infinity);
  // Timer frakten til fots tar for mengde m over avstand d med n bærere (0 innen REGLER.nær)
  const fotsTimer = (m, d, n) => (d <= REGLER.nær ? 0 : n > 0 ? m / (n * REGLER.bæring.last * REGLER.bæring.fart * 3600 / (2 * d)) : Infinity);
  const tilJSON = R => JSON.stringify(R);
  function fraJSON(t) {
    try { const R = typeof t === 'string' ? JSON.parse(t) : t; if (!R || R.versjon !== 1) return null;
      const n = { ...ny(), ...R };
      n.jobber = (Array.isArray(R.jobber) ? R.jobber : []).filter(j => j && (j.type === 'hogst' || (j.type === 'riving' && j.hus && Array.isArray(j.hus.P))) && j.arbeid > 0)
        .map(j => ({ ...j, haug: { ...tom(), ...j.haug }, levert: { ...tom(), ...j.levert }, mat: { ...tom(), ...j.mat }, påBil: false, frakt: 'fots', bil: null }));
      n.hogd = (Array.isArray(R.hogd) ? R.hogd : []).filter(f => f && isFinite(f.x) && isFinite(f.y) && f.r > 0);
      n.revet = (Array.isArray(R.revet) ? R.revet : []).filter(q => q && q.i !== undefined && Array.isArray(q.P));
      n.neste = Math.max(n.neste || 1, ...n.jobber.map(j => j.id + 1)); return n;
    } catch (e) { return null; }
  }
  const api = { REGLER, MAT, ny, areal, gruppe, husUtbytte, hogstUtbytte, startHogst, startRiving, avbryt, finn, fram, iHaug, ta, lever, steg, lastebil, bilSteg, bilTekst,
    erHogd, ledigSkog, kant, iFelt, revetSett, kjøpsverdi, timerMed, fotsTimer, sum, midt, tilJSON, fraJSON };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Ressurser = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
