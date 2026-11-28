// VAKT «ut5-ledere» (G5, formenn og ledere – spill/ledere.js og ledere-visning.js): leirsjefen kjøper mat når regelen sier det,
// formannen flytter en person til saga når den står for «venter på folk», forhandleren sier ja til et tilbud over grensen, kassereren
// stopper et kjøp under minimum, og «Ta over selv» virker (lederen gjør ingenting). Alt settes tilbake (folk, lønn, penger, mat, byene).
module.exports = {
  navn: 'ledere (G5)',
  kjør: async (pg) => pg.evaluate(async () => {
    const ut = { ok: false, tekst: '', data: {} }, feil = [];
    if (!window.LedereSpill || !window.Ledere || !window.FolkSpill || !window.KOMMANDO) return { ok: false, tekst: 'LedereSpill, Ledere, FolkSpill eller KOMMANDO mangler', data: {} };
    const F = FolkSpill.tilstand(), L = LeirSpill.tilstand(), S0 = OppstartSpill.tilstand();
    if (!F || !L || !S0) return { ok: false, tekst: 'spillet er ikke klart', data: {} };
    // husk alt som kan endres
    const før = { S: JSON.parse(JSON.stringify(LedereSpill.tilstand())), F: JSON.parse(JSON.stringify(F)), penger: S0.penger, test: LedereSpill.test,
      by: window.ByavtaleSpill ? JSON.parse(JSON.stringify(ByavtaleSpill.tilstand())) : null, J: window.JobberSpill ? JSON.parse(JSON.stringify(JobberSpill.tilstand())) : null,
      status: window.ProduksjonSpill ? ProduksjonSpill.siste().status : null, sistKey: null };
    let prøveby = null, lagetInfra = false;
    const tilbake = () => {
      if (prøveby) INFRA.tettsted = INFRA.tettsted.filter(t => t !== prøveby); if (lagetInfra) INFRA = null;
      LedereSpill.sett(før.S); LedereSpill.test = før.test;
      // personene: oppgave, lønn og ledelse som før (samme objekter – andre moduler holder på dem)
      for (const p of F.personer) { const q = før.F.personer.find(x => x.id === p.id); if (!q) continue; p.oppgave = q.oppgave;
        for (const n of ['lønn', 'ledelse']) { if (n in q) p[n] = q[n]; else delete p[n]; } }
      F.mat = før.F.mat;
      const d = OppstartSpill.tilstand().penger - før.penger; if (d > 0) OppstartSpill.betal(d); else if (d < 0) OppstartSpill.gi(-d);
      if (før.by && window.ByavtaleSpill) ByavtaleSpill.sett(før.by);
      if (før.J && window.JobberSpill) JobberSpill.sett(før.J);
      if (før.status) delete før.status[990001];
      if (window.FolkSpill.vis) FolkSpill.vis();
    };
    try {
      LedereSpill.nullstill(); LedereSpill.test = true;
      // de tre dyktigste (ledelse ≥ 1,2 gjør aldri et dårlig valg) – ellers settes ledelsen på personen for vakta
      const P = F.personer.slice(0, 4); P.forEach(p => { p.ledelse = 1.3; });
      const [a, b, c, d] = P;
      // 1) LEIRSJEFEN kjøper mat: maten rekker under ett døgn, regelen «hold 2 døgn mat»
      const r1 = KOMMANDO({ type: 'lederUtnevn', rolle: 'leirsjef', person: a.id });
      if (!r1.ok) feil.push('utnevn leirsjef: ' + r1.feil);
      if (!(a.lønn >= 15000 * 1.5)) feil.push('lederlønn ' + a.lønn);
      KOMMANDO({ type: 'lederRegel', nøkkel: 'leirsjef', regel: 'diesel', verdi: 0 }); KOMMANDO({ type: 'lederRegel', nøkkel: 'leirsjef', regel: 'bygg', verdi: 'av' });
      F.mat = 2; const p0 = OppstartSpill.tilstand().penger; LedereSpill.steg(true);
      ut.data.mat = F.mat; ut.data.matKr = p0 - OppstartSpill.tilstand().penger;
      if (!(F.mat > 2 && ut.data.matKr > 0)) feil.push(`leirsjefen kjøpte ikke mat (mat ${F.mat})`);
      if (!LedereSpill.tilstand().logg.some(q => /Leirsjef .* kjøpte \d+ rasjoner/.test(q.tekst))) feil.push('ingen melding om maten');
      // 2) «TA OVER SELV»: lederen gjør ingenting til i morgen
      KOMMANDO({ type: 'lederSelv', nøkkel: 'leirsjef', på: true }); F.mat = 2; LedereSpill.tilstand().sist = {}; LedereSpill.steg(true);
      ut.data.selvMat = F.mat; if (F.mat !== 2) feil.push('«Ta over selv»: leirsjefen kjøpte likevel');
      KOMMANDO({ type: 'lederSelv', nøkkel: null, på: true }); KOMMANDO({ type: 'lederSelv', nøkkel: 'leirsjef', på: false }); LedereSpill.steg(true);
      if (F.mat !== 2) feil.push('«Jeg styrer selv i dag»: leirsjefen kjøpte likevel');
      KOMMANDO({ type: 'lederSelv', nøkkel: null, på: false });
      // 3) KASSEREREN stopper et kjøp under minimum (spillerens eget kjøp)
      KOMMANDO({ type: 'lederUtnevn', rolle: 'kasserer', person: b.id });
      const kassa = OppstartSpill.tilstand().penger, min = [20e6, 10e6, 5e6, 2e6].find(v => v < kassa) || 0;
      KOMMANDO({ type: 'lederRegel', nøkkel: 'kasserer', regel: 'minimum', verdi: min });
      // så mye mat at kjøpet tar kassa under minimum
      const rasjoner = Math.ceil((kassa - min) / FolkRegler.R.matPris) + 10;
      const r3 = KOMMANDO({ type: 'kjøpMat', rasjoner });
      ut.data.kasse = r3.feil || 'gikk gjennom';
      if (r3.ok || !/Kasserer/.test(r3.feil || '')) feil.push('kassereren stoppet ikke kjøpet: ' + (r3.feil || 'ok'));
      if (!KOMMANDO({ type: 'kjøpMat', rasjoner: 5 }).ok) feil.push('kassereren stoppet et lite kjøp over minimum');
      KOMMANDO({ type: 'lederAv', nøkkel: 'kasserer' }); if (b.lønn > 0) feil.push('lønna ble ikke satt tilbake');
      // 4) FORMANNEN flytter en person til saga når den står for «venter på folk» (maskinens status lagt inn for vakta)
      if (window.ProduksjonSpill) {
        const st = ProduksjonSpill.siste().status; st[990001] = { type: 'sagbruk', går: false, grunn: 'folk', folk: 0, drift: 0 };
        const fri = F.personer.find(p => p.id !== a.id && p.id !== c.id && p.oppgave === 'fri') || F.personer.find(p => p.id !== a.id && p.id !== c.id && !['vakt', 'kjøkken'].includes(p.oppgave));
        if (fri.oppgave !== 'fri') fri.oppgave = 'fri';
        const vakt = F.personer.filter(p => p.oppgave === 'vakt').map(p => p.id);
        const r4 = KOMMANDO({ type: 'lederUtnevn', rolle: 'formann', del: '990001', person: c.id }); if (!r4.ok) feil.push('utnevn formann: ' + r4.feil);
        const påFør = F.personer.filter(p => p.oppgave === 'maskin').length; LedereSpill.steg(true);
        const på = F.personer.filter(p => p.oppgave === 'maskin').length; ut.data.maskin = [påFør, på];
        if (!(på === påFør + 1)) feil.push(`formannen flyttet ingen til saga (${påFør} -> ${på})`);
        if (F.personer.some(p => vakt.includes(p.id) && p.oppgave === 'maskin')) feil.push('formannen tok fra vakta');
        delete st[990001];
      } else feil.push('ProduksjonSpill mangler');
      // 5) FORHANDLEREN sier ja til et tilbud over grensen (byen stoler nok på oss; grensen 15 kr per innbygger)
      // et prøvetettsted (3000 innb.) 7 km fra leiren legges inn og tas bort igjen (som i vakta ut2-byer)
      if (typeof INFRA !== 'undefined' && !INFRA) { INFRA = {}; for (const k of ['felt', 'tettsted', 'magasin', 'ror', 'ferje', 'tunnel', 'dam', 'bru', 'ferjekai', 'kraft', 'olje', 'kai']) INFRA[k] = []; lagetInfra = true; }
      if (typeof INFRA !== 'undefined' && INFRA) { if (!INFRA.tettsted) INFRA.tettsted = []; const x = S0.leir.x + 7000, y = S0.leir.y, r = 300;
        prøveby = { lag: 'tettsted', e: { id: 'ut5a', navn: 'Vakt ut5a', folk: 3000 }, bb: [x - r, y - r, x + r, y + r], deler: [[x - r, y - r, x + r, y - r, x + r, y + r, x - r, y + r]] }; INFRA.tettsted.push(prøveby); }
      if (window.ByavtaleSpill && ByavtaleSpill.område().some(b => b.id === 'ut5a')) {
        const by = ByavtaleSpill.område().find(b => b.id === 'ut5a'); ByavtaleSpill.endreTillit(by.id, 60 - ByavtaleSpill.tillit(by.id));
        KOMMANDO({ type: 'lederUtnevn', rolle: 'forhandler', person: d.id }); KOMMANDO({ type: 'lederRegel', nøkkel: 'forhandler', regel: 'by', verdi: 15 });
        LedereSpill.steg(true);
        const i = ByavtaleSpill.info(by.id), A = i && i.b.avtale; ut.data.by = { navn: by.navn, folk: by.folk, avtale: A ? A.trinn : null, pris: A ? A.pris : 0 };
        if (!A || A.trinn !== 'beskyttelse') feil.push(`forhandleren fikk ingen avtale med ${by.navn}: ${(LedereSpill.tilstand().logg.find(q => q.rolle === 'forhandler') || {}).tekst || '–'}`);
        else if (!(A.pris >= 15 * by.folk)) feil.push(`avtalen er under grensen (${A.pris} for ${by.folk} innb.)`);
        if (A && !LedereSpill.tilstand().logg.some(q => /Forhandler .* avtalte beskyttelse/.test(q.tekst))) feil.push('ingen melding om avtalen');
      } else feil.push('prøvebyen er ikke med i byavtalens område');
      // verdien for børsen
      const v = LedereSpill.verdi(); ut.data.verdi = v; if (!(v.antall >= 2 && v.kr > 0)) feil.push('verdi() gir ' + JSON.stringify(v));
      // panelet viser delen
      FolkSpill.åpne && FolkSpill.åpne(); await new Promise(r => setTimeout(r, 300));
      if (!document.querySelector('#ledere')) feil.push('delen «Ledere» står ikke i Folk-panelet');
    } catch (e) { feil.push('unntak: ' + e.message); }
    finally { tilbake(); }
    if (OppstartSpill.tilstand().penger !== før.penger) feil.push('pengene ble ikke satt tilbake');
    ut.ok = !feil.length; ut.tekst = feil.length ? feil.join('; ') : 'leirsjef kjøper mat, «ta over selv», kasserer stopper kjøp, formann flytter til saga, forhandler sier ja';
    return ut;
  }),
};
