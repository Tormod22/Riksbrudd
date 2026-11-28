// VAKT «ut8-kr-telefon» (28. nov, kritikken fra Jonas Bakke på telefon):
//  1. Trykk forsvinner ikke på høy fart: Folk-panelet tegnes ikke på nytt mens knappen holdes (et kall fra KROKER.sim venter), knappen
//     beholder identiteten når panelet tegnes på nytt (Trykkvakt.bytt), og et klikk på en knapp som ble byttet ut mens den var nede,
//     leveres likevel til den nye knappen – én gang (spill/trykkvakt.js).
//  2. Et angrep som går i stå, avsluttes: et røverlag som ikke kommer nærmere leiren på 45 spillminutter, gir opp (Trussel.framSteg), og
//     ⏭ holdes ikke på 10× når det ikke er skutt på 20 minutter (ForsvarSpill.kampPågår).
//  3. Kort med valg venter mens leiren angripes (Kortkø + spill/telefonro.js).
// Setter alt tilbake (tid, tempo, lokk, lag, kort, testbryterne).
module.exports = { navn: 'telefon (Jonas): trykk på høy fart, angrep som henger, kort under alarmen', kjør: async (pg, profil) => {
  const feil = [], krev = (ok, t) => { if (!ok) feil.push(t); }, data = {};
  // ---------- 1a: Folk-panelet med «Gi lønnstillegg» ----------
  const før = await pg.evaluate(async () => {
    const vent = ms => new Promise(r => setTimeout(r, ms)), ut = { tid, tempo };
    if (!window.Trykkvakt || !window.RekrutteringSpill || !window.FolkSpill) return { mangler: true, ...ut };
    const F = FolkSpill.tilstand(), p = F.personer.find(q => !q.karakter), S = RekrutteringSpill.tilstand();
    ut.lokkFør = S.lokk; ut.pid = p.id; ut.folkÅpen = !!(document.getElementById('folkmeny') && document.getElementById('folkmeny').classList.contains('på')); ut.leirÅpen = !!(document.getElementById('leirmeny') && document.getElementById('leirmeny').classList.contains('på')); ut.lønn = p.lønn; ut.lojal = p.lojal;
    S.lokk = { id: p.id, navn: 'Ravnsund', rival: 'rød', lønn: 35000, frist: tid + 720, person: p.navn };
    const fm = document.getElementById('folkmeny'); if (!(fm && fm.classList.contains('på'))) FolkSpill.åpne(); await vent(300); FolkSpill.vis(); await vent(450);
    const b = document.getElementById('lokktillegg'); if (!b) return { ...ut, ingenKnapp: true };
    b.scrollIntoView({ block: 'center' }); await vent(100);
    const r = b.getBoundingClientRect(); window.__ut8knapp = b; return { ...ut, x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (før.mangler) return { ok: false, tekst: 'Trykkvakt, RekrutteringSpill eller FolkSpill mangler', data: før };
  krev(!før.ingenKnapp, 'knappen «Gi lønnstillegg» kom ikke fram i Folk');
  if (!før.ingenKnapp) {
    await pg.mouse.move(før.x, før.y); await pg.mouse.down();
    // mens knappen er nede: tida går (teksten «Svar innen …» endres), og lederne/jobbtavla ber om ny tegning (som fra KROKER.sim)
    const under = await pg.evaluate(() => { tid += 61; FolkSpill.vis(); return { samme: document.getElementById('lokktillegg') === window.__ut8knapp }; });
    krev(under.samme, 'Folk-panelet ble tegnet på nytt mens knappen var nede');
    await pg.mouse.up(); await pg.waitForTimeout(150);
    const etter = await pg.evaluate(() => ({ lokk: !!RekrutteringSpill.tilstand().lokk }));
    krev(!etter.lokk, '«Gi lønnstillegg» ble ikke levert (tilbudet står fortsatt)'); data.lønnstillegg = !etter.lokk;
  }
  // ---------- 1b: identitet og et klikk som leveres til den nye knappen ----------
  const id = await pg.evaluate(async () => {
    const vent = ms => new Promise(r => setTimeout(r, ms)), ut = {};
    // identitet: et nytt tilbud, panelet tegnes på nytt med ny tekst et annet sted – knappen er den samme
    const F = FolkSpill.tilstand(), p = F.personer.find(q => !q.karakter), S = RekrutteringSpill.tilstand();
    S.lokk = { id: p.id, navn: 'Ravnsund', rival: 'rød', lønn: 36000, frist: tid + 720, person: p.navn }; await vent(400); FolkSpill.vis(); await vent(50);
    const b0 = document.getElementById('lokktillegg'); tid += 120; FolkSpill.vis(); const b1 = document.getElementById('lokktillegg');
    ut.identitet = !!b0 && b0 === b1; S.lokk = null; FolkSpill.vis();
    // et eget lite prøvepanel som byttes ut uten å spørre pekerNede (som et panel som ikke følger regelen)
    const P = document.createElement('div'); P.id = 'ut8prove'; P.style.cssText = 'position:fixed;left:40px;top:200px;z-index:2147483647;background:#222;padding:10px';
    window.__ut8 = { gamle: 0, nye: 0 }; const lag = (hvem) => { const k = document.createElement('button'); k.type = 'button'; k.textContent = 'Prøv meg'; k.style.cssText = 'width:160px;height:50px'; k.onclick = () => { window.__ut8[hvem]++; }; return k; };
    P.append(lag('gamle')); document.body.append(P); await vent(50); const r = P.firstChild.getBoundingClientRect(); window.__ut8lag = lag;
    const x = r.left + 80, y = r.top + 25; ut.treff = document.elementFromPoint(x, y) === P.firstChild; return { ...ut, x, y };
  });
  krev(id.identitet, 'knappen «Gi lønnstillegg» fikk ny identitet da Folk-panelet ble tegnet på nytt (Trykkvakt.bytt)');
  // (prøves høyst to ganger: første trykk rett etter oppstart kan treffe noe annet som tones ut)
  for (let forsøk = 0; forsøk < 2; forsøk++) {
    await pg.mouse.move(id.x, id.y); await pg.mouse.down();
    await pg.evaluate(() => { const P = document.getElementById('ut8prove'); P.replaceChildren(window.__ut8lag('nye')); });
    await pg.mouse.up(); await pg.waitForFunction(() => window.__ut8 && window.__ut8.nye + window.__ut8.gamle > 0, null, { timeout: 2000 }).catch(() => null); await pg.waitForTimeout(150);
    const r = await pg.evaluate(() => ({ ...window.__ut8 })); if (r.nye > 0 || r.gamle > 0) break;
    data.replayForsøk = await pg.evaluate(() => (window.Trykkvakt && Trykkvakt.spor ? Trykkvakt.spor.slice(-4) : null));
    await pg.evaluate(() => { const P = document.getElementById('ut8prove'); P.replaceChildren(window.__ut8lag('gamle')); }); }
  const lev = await pg.evaluate(() => { const r = { ...window.__ut8 }; document.getElementById('ut8prove').remove(); delete window.__ut8; delete window.__ut8lag; delete window.__ut8knapp; return r; });
  krev(lev.nye === 1 && lev.gamle === 0, `klikket på en knapp som ble byttet ut mens den var nede, ble ikke levert én gang til den nye (nye ${lev.nye}, gamle ${lev.gamle})`);
  data.levert = lev;
  // ---------- 2 og 3: angrepet som går i stå, ⏭ og kortene ----------
  const ang = await pg.evaluate(async () => {
    const vent = ms => new Promise(r => setTimeout(r, ms)), ut = {};
    const Trussel = Spillet.Trussel, T = SpilletSpill.T(), t0 = { aktiv: T.aktiv, bølge: T.bølge, ns: T.nesteSpill, ne: T.nesteEkte }, test0 = SpilletSpill.test, tr0 = window.Telefonro ? Telefonro.test : undefined;
    const leir = OppstartSpill.tilstand().leir, nr = 900 + Math.floor(Math.random() * 50);
    const e = nyttLag('Røvere ut8', leir.x - 2200, leir.y, 'rød'); e.raid = nr; if (!ENHETER.includes(e)) ENHETER.push(e);
    try {
      T.aktiv = nr; T.nesteSpill = T.nesteEkte = Infinity;
      // regelen: 46 minutter uten å komme nærmere
      let q = { stå: 0 }; for (let i = 0; i < 46; i++) q = Trussel.framSteg({ nærmest: q.nærmest, stå: q.stå }, 2200, 1); ut.regel = Trussel.lei({ stå: q.stå });
      // i spillet: laget står 2,2 km unna uten ordre; hooken teller når SpilletSpill.test er på (som i det ekte spillet)
      SpilletSpill.test = true; e.sti = null; e.planlegger = null; e.leiNærmest = 2200; e.stå = 44; e.x = leir.x - 2200; e.y = leir.y;
      let n = 0; for (; n < 40 && !Trussel.lei(e); n++) SpilletSpill.leiSteg(.1);
      ut.ga = Trussel.lei(e); ut.minutter = Math.round((44 + n * .1) * 10) / 10;
      // ⏭: kampen regnes ikke som i gang uten skudd (laget står langt unna)
      ut.kamp = window.ForsvarSpill && ForsvarSpill.kampPågår ? ForsvarSpill.kampPågår() : null;
      // kortene: under angrepet får et kort som ikke haster, ikke plassen
      e.flykter = false; e.lei = false; e.raid = nr; T.aktiv = nr;
      if (window.Kortkø && window.Telefonro) { Telefonro.test = true; ut.angrepNå = Telefonro.angrepNå(); ut.ledig = Kortkø.ledig(); ut.ta = Kortkø.ta('ut8kort');
        Kortkø.ferdig('ut8kort'); Kortkø.ferdig && (Kortkø.venter().some(v => v.id === 'ut8kort')) && Kortkø.ferdig('ut8kort'); }
    } finally {
      const i = ENHETER.indexOf(e); if (i >= 0) ENHETER.splice(i, 1); T.aktiv = t0.aktiv; T.bølge = t0.bølge; T.nesteSpill = t0.ns; T.nesteEkte = t0.ne; SpilletSpill.test = test0; if (window.Telefonro) Telefonro.test = tr0; skitten = true; }
    return ut;
  });
  krev(ang.regel, 'Trussel.framSteg/lei: et lag som står stille i 46 min gir ikke opp');
  krev(ang.ga, 'røverlaget som sto 2,2 km unna uten å komme nærmere, ga ikke opp (Trussel.lei etter leiSteg)');
  krev(ang.kamp !== true, '⏭: kampen regnes som i gang uten skudd og uten røvere nær (holder 10×)');
  if (ang.angrepNå !== undefined) { krev(ang.angrepNå === true, 'Telefonro.angrepNå() så ikke angrepet'); krev(ang.ledig === false && ang.ta === false, 'et kort fikk plassen mens leiren ble angrepet'); }
  data.angrep = ang;
  // ---------- 4: navn i kartet ----------
  const navn = await pg.evaluate(() => { if (!window.Etikett || !Etikett.tegnet) return { mangler: true };
    const c = document.createElement('canvas'); c.width = Math.max(400, VW); c.height = Math.max(400, VH); const g = c.getContext('2d'), ut = {};
    const lapp = (t, x, y, r, p) => { Etikett.tekst(g, t, x, y, r, p); g.fillText(t, x, NaN); };
    // a) tekst en modul tegner rett i kartet («Lever nødlageret her») blir en hindring: leirens navn flyttes unna
    Etikett.nullstill(); g.font = '600 15px serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff';
    lapp('Først', 40, 40, 1, 1); g.fillText('Lever nødlageret her', 200, 200); lapp('Nattskift', 200, 201, 1, 2.5); Etikett.tegnAlle(g);
    const n = Etikett.tegnet().find(q => q.t === 'Nattskift'), w = g.measureText('Lever nødlageret her').width, d = [200 - w / 2, 200 - 17, w, 18];
    ut.nattskift = n ? n.ramme : null; ut.overlapp = !!n && n.ramme[0] < d[0] + d[2] && d[0] < n.ramme[0] + n.ramme[2] && n.ramme[1] < d[1] + d[3] && d[1] < n.ramme[1] + n.ramme[3];
    // b) et kjøretøy med merket utenfor skjermen får ikke navnet klemt inn fra kanten (Speiderbil 1 «midt på fjorden»)
    Etikett.nullstill(); lapp('Speiderbil ut8', VW + 80, 300, -1, 2); Etikett.tegnAlle(g); ut.bil = Etikett.tegnet().some(q => q.t === 'Speiderbil ut8');
    // c) men et navn som bare stikker litt ut, skyves inn som før
    Etikett.nullstill(); lapp('Speidertropp ut8 med langt navn', VW - 10, 300, -1, 3); Etikett.tegnAlle(g); const s = Etikett.tegnet().find(q => q.t === 'Speidertropp ut8 med langt navn');
    ut.inne = !!s && s.ramme[0] + s.ramme[2] <= VW + 1; Etikett.nullstill(); Etikett.tegnAlle(null); skitten = true; return ut; });
  if (!navn.mangler) { krev(!!navn.nattskift && !navn.overlapp, 'leirens navn ligger oppå en tekst en modul tegnet rett i kartet (' + JSON.stringify(navn.nattskift) + ')');
    krev(!navn.bil, 'et kjøretøy utenfor skjermen fikk navnet klemt inn fra kanten'); krev(navn.inne, 'et navn som stikker litt ut, ble ikke skjøvet inn'); }
  data.navn = navn;
  // ---------- 5: «Vis i kartet» og Marsjer ----------
  const vis = await pg.evaluate(async () => { if (!window.Telefonro || !window.SpilletSpill || !SpilletSpill.O || !SpilletSpill.O()) return { mangler: true };
    const vent = ms => new Promise(r => setTimeout(r, ms)), ut = {}, kam0 = { ...kam }, t0 = Telefonro.test, O = SpilletSpill.O(), leir = OppstartSpill.tilstand().leir, v0 = valgt, m0 = modus;
    const o = Spillet.Oppdrag.lag(leir, 1, () => .3, tid); o.id = 'ut8-' + o.id; o.tatt = true; o.x = leir.x - 1300; o.y = leir.y + 200; O.liste.push(o);
    try { Telefonro.test = true;
      // marsj: troppen ved leiren, målet 1,3 km unna – begge i bildet
      const s = ENHETER.find(e => e.side === 'blå' && !e.karakter && !e.ai && levende(e)); kam.x = s.x; kam.y = s.y; kam.m = 1.2; valgt = s; modus = null; await vent(250); modus = 'marsj'; await vent(400);
      const sx = X => (X - kam.x) / kam.m + VW / 2, sy = Y => (kam.y - Y) / kam.m + VH / 2, på = (x, y) => x >= 0 && x <= VW && y >= 0 && y <= VH;
      ut.marsj = på(sx(o.x), sy(o.y)) && på(sx(s.x), sy(s.y)); modus = null; valgt = null; visPanel();
      // «Vis i kartet» i Leir → Mål: målet står ikke under menyen etterpå (telefon: menyen lukkes; PC: menyen står ved siden av)
      const lk = document.getElementById('leirknapp'); if (lk && !document.getElementById('leirmeny').classList.contains('på')) lk.click(); await vent(300); LeirSpill.fane('mål'); await vent(300);
      const b = [...document.querySelectorAll('#leirmeny .oppdrag')].filter(q => q.getClientRects().length).map(q => [...q.querySelectorAll('button')].find(k => /^Vis i kartet$/.test(k.textContent.trim()))).filter(Boolean).pop();
      ut.knapp = !!b; if (b) { b.click(); await vent(250); const M = document.getElementById('leirmeny'), r = M.classList.contains('på') && M.getClientRects().length ? M.getBoundingClientRect() : null;
        const x = sx(o.x), y = sy(o.y); ut.under = !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; ut.sist = Telefonro.sist; }
      if (document.getElementById('leirmeny').classList.contains('på') && lk) lk.click();
    } finally { O.liste.splice(O.liste.indexOf(o), 1); Telefonro.test = t0; Object.assign(kam, kam0); valgt = v0; modus = m0; visPanel(); skitten = true; }
    return ut; });
  if (!vis.mangler) { krev(vis.marsj, 'Marsjer: troppen og oppdraget står ikke begge i bildet'); krev(vis.knapp, 'fant ikke «Vis i kartet» i Leir → Mål'); krev(!vis.under, '«Vis i kartet» la målet under Leir-menyen'); }
  data.vis = vis;
  // tilbake
  await pg.evaluate(f => { tid = f.tid; const S = RekrutteringSpill.tilstand(); S.lokk = f.lokkFør || null; const p = FolkSpill.tilstand().personer.find(q => q.id === f.pid); if (p) { p.lønn = f.lønn; p.lojal = f.lojal; } try { FolkSpill.åpne(!!f.folkÅpen); } catch (e) { /* lukket */ } const lm = document.getElementById('leirmeny'), lk = document.getElementById('leirknapp'); if (lm && lk && lm.classList.contains('på') !== !!f.leirÅpen) lk.click(); skitten = true; }, før);
  return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : `lønnstillegg levert, knappen beholdt, byttet knapp fikk klikket én gang, røverlaget ga opp etter ${ang.minutter} min, kort venter under angrep, navnene går unna, Vis i kartet og Marsjer viser målet`, data };
} };
