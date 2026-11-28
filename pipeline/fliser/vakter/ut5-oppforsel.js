// Vakt «oppførsel» (ut5-oppforsel, fase F4): alarm sender ikke-vakter til tilflukt og vaktene til stillingene, brann i leiren gir en
// slukkejobb som tas (og brannen slokner), en skadet går til sykestua (og en hardt skadet bæres), venner gir moral, og ulykkessjansen
// stiger med trettheten og faller med verneutstyr. Setter alt tilbake (bygg, folk, tid, brann, penger, tilstanden og testbryterne).
module.exports = {
  navn: 'oppførsel (F4)',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (b, t) => { if (!b) ut.feil.push(t); };
    if (!window.Oppforsel || !window.OppforselSpill || !window.FolkgangSpill || !window.LeirSpill || !window.FolkSpill || !window.JobberSpill) return { ok: false, tekst: 'Oppforsel/OppforselSpill mangler', data: ut };
    const L = LeirSpill.tilstand(), F = FolkSpill.tilstand(), S0 = OppstartSpill.tilstand(), m = S0.leir, OP = Oppforsel, OS = OppforselSpill;
    const bygg0 = JSON.stringify(L.bygg), neste0 = L.neste, nj0 = L.nesteJobb, tid0 = tid, jt0 = JobberSpill.test, ot0 = OS.test, penger0 = S0.penger;
    const pers0 = F.personer.map(p => ({ id: p.id, oppgave: p.oppgave, helse: p.helse, har: 'egen' in p, egen: p.egen ? p.egen.slice() : undefined }));
    const tilst0 = JSON.stringify(OS.tilstand()), V = window.VerdenSpill && VerdenSpill.tilstand ? VerdenSpill.tilstand() : null, brann0 = V ? JSON.stringify(V.brann) : null;
    const kl = h => ((h - 6 + 24) % 24) * 60, G = () => FolkgangSpill.tilstand(), steg = (n, dt) => { for (let k = 0; k < n; k++) FolkgangSpill.steg(dt); };
    const listerPåNytt = () => { if (!V || !window.Verden) return; const Lb = Verden.brannListe(V.brann); BRANNER.length = 0; for (const c of Lb.brenner) BRANNER.push(c); BRENT.length = 0; for (const c of Lb.brent) BRENT.push(c); };
    try {
      // (ut6-fiksd) vaktene før kan ha lagt et lukket gjerde uten port rundt leiren (sjekk.js, K2): da når ingen lagerplassen ute eller
      // brannen. Gjerder og porter tas bort mens vakta går (L.bygg settes tilbake i finally).
      { const ut = L.bygg.filter(b => { const B = Leir.BYGG[b.type]; return !(B && ((B.linje && !B.veg) || B.port)); }); L.bygg.splice(0, L.bygg.length, ...ut); }
      // prøveleiren: brakke, sykestue, vakttårn og (hvis den finnes) en betongbunker
      let id = 910000; const legg = (type, x, y, ferdig = true) => { const b = { id: id++, type, x: m.x + x, y: m.y + y, ret: 0, nivå: 1, hp: 1, igjen: ferdig ? 0 : 600, totalt: 60, nr: id, arbeid: null }; L.bygg.push(b); return b; };
      const brakke = legg('brakke', -30, 22), syk = legg('sykestue', 24, -20), tårn = legg('vakttårn', 40, 8), bunker = Leir.BYGG.betongbunker ? legg('betongbunker', -40, -30) : null;
      const P = F.personer; P.forEach((p, i) => { p.oppgave = i === 0 ? 'vakt' : i < 4 ? 'bygg' : 'fri'; p.helse = 1; p.egen = []; });
      JobberSpill.test = true; OS.test = true; OS.nullstill(); OS.alarm = null; tid = kl(9.5); FolkgangSpill.nullstill(); steg(2, .25);
      // 1. ALARM
      OS.alarm = 'nær'; steg(3, .25);
      const g = G(), vakt = P[0], andre = P.slice(1).filter(p => !p.borte);
      const iTilflukt = andre.filter(p => g.pers[p.id] && g.pers[p.id].mål && /^tilflukt:/.test(g.pers[p.id].mål.k));
      ut.alarm = { andre: andre.length, iTilflukt: iTilflukt.length, vakt: g.pers[vakt.id] && g.pers[vakt.id].mål ? g.pers[vakt.id].mål.gjør : null, sted: iTilflukt[0] ? g.pers[iTilflukt[0].id].mål.navn : null, linjer: FolkgangSpill.fastLinjer().filter(t => /^Alarm/.test(t)) };
      krev(iTilflukt.length === andre.length, 'alarm: ikke alle andre går i tilflukt ' + JSON.stringify(ut.alarm));
      krev(/stillingen/.test(ut.alarm.vakt || '') && g.pers[vakt.id].mål.bygg === tårn.id, 'alarm: vakta går ikke til tårnet ' + JSON.stringify(ut.alarm));
      krev(!bunker || ut.alarm.sted === 'betongbunker', 'alarm: bunkeren brukes ikke først (' + ut.alarm.sted + ')');
      krev(ut.alarm.linjer.length === 1, 'alarm: jobbtavla mangler linja');
      steg(10, 15); ut.alarm.framme = iTilflukt.filter(p => g.pers[p.id].framme).length;
      krev(ut.alarm.framme >= 1, 'alarm: ingen kom fram til tilflukt');
      OS.alarm = null; steg(3, .25); ut.alarm.etter = andre.filter(p => g.pers[p.id] && g.pers[p.id].mål && /^tilflukt:/.test(g.pers[p.id].mål.k)).length;
      krev(ut.alarm.etter === 0, 'etter alarmen: fortsatt i tilflukt (' + ut.alarm.etter + ')');
      // 2. BRANN ved brakka: slukkejobb, folk tar den, brannen slokner
      if (V && window.Verden) {
        V.brann = Verden.nyBrann(); Verden.tenn(V.brann, brakke.x, brakke.y, tid); listerPåNytt(); steg(2, .25);
        const pl = OS.plan(); ut.brann = { jobber: pl.jobber.length, slukkere: pl.slukk.size, linje: FolkgangSpill.fastLinjer().find(t => /^Slukk brannen/.test(t)) || null };
        krev(ut.brann.jobber === 1 && ut.brann.slukkere >= 2, 'brann: ingen slukkejobb/slukkere ' + JSON.stringify(ut.brann));
        // (ut6-fiksd) jobben får navnet på et bygg i brannruta (32 m) – et bygg fra en vakt før (aggregatet fra K2) kan stå der også
        const iRuta = L.bygg.filter(q => Leir.BYGG[q.type] && Math.hypot(q.x - brakke.x, q.y - brakke.y) < 50).map(q => Leir.BYGG[q.type].navn.toLowerCase());
        krev(/^Slukk brannen/.test(ut.brann.linje || '') && (/brakke/.test(ut.brann.linje) || iRuta.some(n => ut.brann.linje.includes(n))), 'brann: jobbtavla mangler slukkejobben ' + JSON.stringify(ut.brann));
        let fr = 0; for (let k = 0; k < 12 && BRANNER.length; k++) { steg(1, 15); fr = Math.max(fr, [...OS.plan().slukk.keys()].filter(i => G().pers[i] && G().pers[i].ved).length); }
        ut.brann.framme = fr; krev(fr >= 1 || OS.plan().slukket > 0, 'brann: ingen slukkere kom fram');
        for (let k = 0; k < 40 && BRANNER.length; k++) steg(1, 300); ut.brann.igjen = BRANNER.length; ut.brann.avOss = OS.plan().slukket || 0;
        krev(!BRANNER.length, 'brann: brannen slokner ikke');
        V.brann = Verden.nyBrann(); listerPåNytt(); steg(1, .25);
      }
      // 3. SKADE: en skadet går til sykestua, en hardt skadet bæres
      const lett = P[2], hard = P[3]; lett.helse = .55; hard.helse = .15; steg(2, .25);
      ut.skade = { lett: G().pers[lett.id].mål && G().pers[lett.id].mål.gjør, lettBygg: G().pers[lett.id].mål && G().pers[lett.id].mål.bygg, bærere: OS.plan().bær.size, tekst: OS.personTekst(lett) };
      krev(/sykestua/.test(ut.skade.lett || '') && ut.skade.lettBygg === syk.id, 'skadet går ikke til sykestua ' + JSON.stringify(ut.skade));
      krev(ut.skade.bærere === 1, 'den hardt skadde får ingen bærer ' + JSON.stringify(ut.skade));
      krev(/skadet/.test(ut.skade.tekst), 'personen viser ikke «skadet»');
      steg(16, 15); ut.skade.båret = !!(OS.tilstand().skadet[hard.id] && OS.tilstand().skadet[hard.id].båret); ut.skade.lettFramme = G().pers[lett.id].framme;
      krev(ut.skade.lettFramme, 'den skadde kom ikke fram til sykestua');
      // 4. VENNER: to på samme jobb som er venner, gir moral; teksten ved personen
      const a = P[1], b = P[2]; b.helse = 1; hard.helse = 1; steg(1, .25); b.oppgave = a.oppgave = 'bygg';
      if (OS.tøm) OS.tøm(); const m0 = FolkRegler.moralF(F, L); OS.tilstand().rel[OP.nøkkel(a.id, b.id)] = .8; if (OS.tøm) OS.tøm(); const m1 = FolkRegler.moralF(F, L);
      ut.venner = { før: +m0.toFixed(2), etter: +m1.toFixed(2), tekst: OS.personTekst(a) };
      krev(m1 > m0, 'venner gir ikke moral ' + JSON.stringify(ut.venner)); krev(/venn med/.test(ut.venner.tekst), 'personen viser ikke vennen');
      // 5. ULYKKER: sjansen stiger med trettheten og faller med verneutstyr
      const q = P[1]; q.oppgave = 'maskin'; tid = kl(13); q.seng = true; const t0 = OS.trøtt(q); tid = kl(2); q.seng = false; const t1 = OS.trøtt(q);
      ut.ulykke = { uthvilt: +OP.ulykkeSjanse(t0, false).toFixed(5), sliten: +OP.ulykkeSjanse(t1, false).toFixed(5), vern: +OP.ulykkeSjanse(t1, true).toFixed(5) };
      krev(ut.ulykke.sliten > ut.ulykke.uthvilt * 3 && ut.ulykke.vern < ut.ulykke.sliten, 'ulykkessjansen ' + JSON.stringify(ut.ulykke));
      // 6. RYDDING: en vare ute når det er plass i et lagertelt – en ledig bærer den inn
      const VL = window.VarelagerSpill && VarelagerSpill.V ? VarelagerSpill.V() : null;
      if (VL && window.Varelager && Varelager.ryddbare) { const e0 = JSON.stringify(VL.e), n0 = VL.neste; ut.rydd = {};
        try { const telt = legg('lagertelt', 10, 34), uid = VL.neste; VL.e.push({ id: VL.neste++, v: 'tre', m: .5, p: 'ute', i: 99, r: null });
          P.forEach((p, i) => { p.oppgave = i === 5 ? 'fri' : 'bygg'; }); tid = kl(10); steg(2, .25);
          ut.rydd.ryddere = OS.plan().rydd.size; ut.rydd.linje = FolkgangSpill.fastLinjer().find(t => /^Rydd lageret/.test(t)) || null;
          krev(ut.rydd.ryddere === 1 && ut.rydd.linje, 'rydding: ingen ledig rydder ' + JSON.stringify(ut.rydd));
          // (ut6-fiksd) bare vaktas egen vare telles: vaktene før kan ha latt andre varer ligge ute (ut5-bors la 18 m³ tømmer i lageret),
          // og et lagertelt fra en vakt før kan være nærmere enn vaktas eget (da er varen båret inn der)
          steg(30, 10); ut.rydd.ute = VL.e.filter(u => u.p === 'ute' && u.id === uid).length; ut.rydd.inne = VL.e.filter(u => u.v === 'tre' && /^b\d+$/.test(String(u.p))).length;
          ut.rydd.alleUte = VL.e.filter(u => u.p === 'ute').length;
          krev(ut.rydd.ute === 0 && ut.rydd.inne >= 1, 'rydding: varen ble ikke båret inn ' + JSON.stringify(ut.rydd)); }
        finally { VL.e.splice(0, VL.e.length, ...JSON.parse(e0)); VL.neste = n0; } }
      // 7. en ulykke i spillet (sjansen satt kunstig høyt): personen blir skadet og teller i ulykkene
      { const U = OP.REGLER.ulykke, u0 = [U.uthvilt, U.sliten]; U.uthvilt = U.sliten = .999;
        try { const plass0 = legg('brakke', 60, -30, false); plass0.igjen = 600; P.forEach((p, i) => { p.oppgave = i === 0 ? 'vakt' : 'bygg'; p.helse = 1; }); tid = kl(12); steg(2, .25); steg(12, 15);
          const n0 = OS.tilstand().ulykker.length; steg(1, 6000); ut.ulykke.live = OS.tilstand().ulykker.length - n0;
          krev(ut.ulykke.live >= 1 && P.some(p => OS.tilstand().skadet[p.id] && OS.tilstand().skadet[p.id].grunn === 'ulykke'), 'ulykke i spillet: ingen ble skadet ' + ut.ulykke.live); }
        finally { U.uthvilt = u0[0]; U.sliten = u0[1]; } }
      const r = OS.kjøpVern(1); ut.ulykke.kjøpt = OS.tilstand().vern; krev(r.ok && OS.tilstand().vern === OP.REGLER.vern.pakke, 'kjøp av verneutstyr: ' + JSON.stringify(r));
    } catch (e) { ut.feil.push('unntak: ' + e.message); }
    finally {
      L.bygg.splice(0, L.bygg.length, ...JSON.parse(bygg0)); L.neste = neste0; L.nesteJobb = nj0;
      for (const o of pers0) { const p = F.personer.find(x => x.id === o.id); if (!p) continue; p.oppgave = o.oppgave; p.helse = o.helse; if (o.har) p.egen = o.egen; else delete p.egen; }
      if (V && brann0) { V.brann = JSON.parse(brann0); if (window.Verden) { const Lb = Verden.brannListe(V.brann); BRANNER.length = 0; for (const c of Lb.brenner) BRANNER.push(c); BRENT.length = 0; for (const c of Lb.brent) BRENT.push(c); } }
      S0.penger = penger0; if (window.OppstartSpill && OppstartSpill.lagre) try { OppstartSpill.lagre(); } catch (e) { /* uten lagring */ }
      OS.alarm = null; OS.nullstill(); OS.sett(JSON.parse(tilst0)); tid = tid0; JobberSpill.test = jt0; OS.test = ot0; FolkgangSpill.nullstill(); if (typeof skitten !== 'undefined') skitten = true;
    }
    return { ok: !ut.feil.length, tekst: ut.feil.length ? ut.feil.join('; ') : `alarm ${ut.alarm.iTilflukt} i tilflukt (${ut.alarm.sted}), brann slukket av ${ut.brann ? ut.brann.slukkere : '–'}, skadet til sykestua, venner +${(ut.venner.etter - ut.venner.før).toFixed(1)} moral, rydding ${ut.rydd ? ut.rydd.inne + " inn" : "–"}, ulykke ${ut.ulykke.uthvilt}→${ut.ulykke.sliten} (vern ${ut.ulykke.vern}), ${ut.ulykke.live} ulykke(r) med høy sjanse`, data: ut };
  }),
};
