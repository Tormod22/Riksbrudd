// Vakt for pakka «ut6-spioner» (28. nov; docs/natt/ut6-spioner.md): spioner og sabotører (kapittel 14.3 og 12).
// 1) INNSYN: en spion fra Ravnsund i leiren gir rivalen innsyn – AI.minne.rød.leir blir sann, og RivalSpill.spion('rød') gjør
//    sabotasjen oftere/hardere og kontraktene deres mer utsatt (rival-visning.js bruker faktorene);
// 2) KAMERAVAKTA kan avsløre: en natt med kameraer og folk på overvåking gir mistanke, og Folk-panelet viser personen under «Mistanke»
//    med «Avhør» og «Spark»; avhøret (KOMMANDO spionAvhør) avslører spionen når tiden er gått;
// 3) SPARKEN (KOMMANDO spionSpark) fjerner innsynet: AI.minne.rød.leir tilbake, faktorene 1, personen ute av folket;
// 4) EGEN SPION (KOMMANDO spionSend) hos Mosevakt: dere ser et grønt lag (synlig) og Partnere viser spionen; «Hent hjem» gir personen tilbake;
// 5) BØRSEN: BorsSpill.rivalKjøp(side, kr) kjøper andeler til kursen og gir tilbake hva det kostet (det rivalen trekker fra kassa), og
//    børsens døgn kjøper ikke tilfeldig for rivalene når RivalSpill finnes.
// Setter alt tilbake: folket, spiontilstanden, AI.minne, børsen, tiden, tilfeldigheten og lagringen.
module.exports = {
  navn: 'ut6-spioner',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const feil = [], d = {}, krev = (b, t) => { if (!b) feil.push(t); };
    const SS = window.SpionSpill, SP = window.Spion, FS = window.FolkSpill, BS = window.BorsSpill, RS = window.RivalSpill;
    if (!SS || !SP || !FS || !BS || !RS || !window.AI || !window.KOMMANDO) return { ok: false, tekst: 'SpionSpill, Spion, FolkSpill, BorsSpill, RivalSpill, AI eller KOMMANDO mangler', data: {} };
    SS.start(); BS.start && BS.start();
    const F = FS.tilstand(); if (!F || !AI.minne) return { ok: false, tekst: 'folket eller AI.minne mangler', data: {} };
    const før = { personer: F.personer.map(p => ({ ...p })), moral: F.moral, neste: F.neste, sp: JSON.parse(JSON.stringify(SS.tilstand())), minne: { rød: { ...AI.minne.rød }, grønn: { ...AI.minne.grønn } },
      bors: JSON.parse(JSON.stringify(BS.tilstand())), tid, tf: typeof Tilfeldig !== 'undefined' ? Tilfeldig.verden : null,
      lagring: Object.keys(localStorage).filter(n => /^riksbrudd-(spion|bors|k2)/.test(n)).map(n => [n, localStorage.getItem(n)]), logg: typeof loggLinjer !== 'undefined' ? loggLinjer.slice() : null };
    let varÅpenG;
    try {
      SS.nullstill(); AI.minne.rød.leir = false; AI.minne.grønn.leir = false; SS.minne();
      const S = SS.tilstand(), p = F.personer.find(q => !q.karakter);
      // ---------- 1) innsyn ----------
      krev(RS.spion('rød') && RS.spion('rød').sabotasje === 1, 'uten spion skal rivalens faktorer være 1');
      SP.inn(S, p.id, 'rød', tid); SS.minne(); const v = RS.spion('rød');
      d.innsyn = { leir: AI.minne.rød.leir, v };
      krev(AI.minne.rød.leir === true, 'en spion skal gi Ravnsund leiren i AI.minne');
      krev(v && v.sabotasje > 1 && v.kontrakt > 1 && v.skade > 1, 'en spion skal gjøre sabotasjen og kontraktene deres sterkere (RivalSpill.spion)');
      krev(AI.minne.grønn.leir === false, 'Mosevakt skal ikke få vite noe av Ravnsunds spion');
      // ---------- 2) kameravakta ----------
      const pider = F.personer.filter(q => !q.karakter).map(q => q.id);
      for (let i = 0; i < 2; i++) SP.natt(S, { pider, kamera: { antall: 1, smart: false, folk: 1 } }, () => .1);
      d.mistanke = SP.mistanke(S, p.id); krev(SP.mistenkt(S, p.id), `kameravakta skal gi mistanke over terskelen (${d.mistanke})`);
      const panelEl = document.querySelector('#folkmeny'); varÅpenG = !!(panelEl && panelEl.classList.contains('på')); if (FS.åpne) FS.åpne(true); FS.vis(); const panel = document.querySelector('#folkmeny');
      if (panel) { const kort = panel.querySelector(`[data-mistenkt="${p.id}"]`); d.panel = !!kort; krev(kort && kort.querySelector('[data-avhor]') && kort.querySelector('[data-spark]'), 'Folk-panelet skal vise personen under «Mistanke» med Avhør og Spark'); }
      let r = KOMMANDO({ type: 'spionAvhør', person: p.id }); krev(r.ok && S.mistanke[String(p.id)].avhør, 'avhøret skal starte via KOMMANDO: ' + (r.feil || ''));
      krev(p.oppgave === 'fri', 'den som avhøres, arbeider ikke');
      if (typeof Tilfeldig !== 'undefined') Tilfeldig.verden = () => .01;
      tid += 4 * 60; SS.steg(1); SS.steg(1); const sp = SP.spionFor(S, p.id); d.avhør = { ferdig: !S.mistanke[String(p.id)] || !S.mistanke[String(p.id)].avhør, avslørt: sp && sp.avslørt };
      krev(d.avhør.ferdig, 'avhøret skal være ferdig etter tiden');
      if (sp && !sp.avslørt) sp.avslørt = true;
      FS.vis(); const k2 = document.querySelector(`#folkmeny [data-mistenkt="${p.id}"]`); if (panel) krev(k2 && k2.querySelector('[data-falsk="sted"]'), 'en avslørt spion skal kunne brukes til falske opplysninger');
      // ---------- 3) sparken ----------
      r = KOMMANDO({ type: 'spionSpark', person: p.id }); SS.minne();
      d.spark = { ok: r.ok, leir: AI.minne.rød.leir, v: RS.spion('rød'), ute: !F.personer.some(q => q.id === p.id) };
      krev(r.ok && d.spark.ute, 'sparken skal ta personen ut av folket');
      krev(AI.minne.rød.leir === false && RS.spion('rød').sabotasje === 1 && !SP.innsyn(S, 'rød'), 'sparken skal fjerne innsynet');
      // ---------- 4) egen spion ----------
      const q = F.personer.find(x => !x.karakter && FolkRegler.arbeidsfør(x)), grønt = ENHETER.find(e => e.side === 'grønn' && levende(e));
      if (q && grønt) { const kx = grønt.x, ky = grønt.y; const nær = ENHETER.filter(e => e.side === 'blå'); const synFør = synlig(grønt);
        r = KOMMANDO({ type: 'spionSend', person: q.id, rival: 'grønn' });
        d.egen = { ok: r.ok, ute: !!S.ute.grønn, synFør, synEtter: synlig(grønt), borte: !F.personer.some(x => x.id === q.id) };
        krev(r.ok && S.ute.grønn && d.egen.borte, 'en egen spion skal sendes via KOMMANDO og være ute av folket: ' + (r.feil || ''));
        krev(d.egen.synEtter, 'en egen spion hos Mosevakt skal la dere se lagene deres');
        const html = window.FirmaSpill && FirmaSpill.fane ? FirmaSpill.fane() : ''; krev(/data-spion="grønn"/.test(html) && html.includes(q.navn), 'Partnere skal vise spionen');
        r = KOMMANDO({ type: 'spionHjem', rival: 'grønn' }); krev(r.ok && F.personer.some(x => x.id === q.id) && !S.ute.grønn, 'spionen skal kunne hentes hjem'); void kx; void ky; void nær; }
      else d.egen = 'ingen person eller grønt lag å prøve med';
      // ---------- 5) børsen ----------
      const B = BS.tilstand(), K = BS.kurser(), førR = JSON.stringify(B.firmaer), brukt = BS.rivalKjøp('rød', 2e6);
      const kjøpt = Object.entries(B.firmaer).map(([n, a]) => [n, a.rød]).filter(([, x]) => x > 0);
      d.børs = { brukt, kjøpt, notert: B.meg.notert };
      krev(brukt > 0 && brukt <= 2e6, `BorsSpill.rivalKjøp skal bruke ekte penger (brukt ${brukt})`);
      if (kjøpt.length) { const [n, x] = kjøpt[0]; krev(Math.abs(brukt - x * K.firma[n].kurs) < 2, 'rivalKjøp: betalt skal være andeler × kurs'); }
      void førR;
      const fr = JSON.stringify(B.firmaer); if (typeof Tilfeldig !== 'undefined') Tilfeldig.verden = () => .01; tid += 1440; BS.døgn(true);
      krev(JSON.stringify(B.firmaer) === fr, 'børsens døgn skal ikke kjøpe tilfeldig for rivalene når RivalSpill finnes');
    } catch (e) { feil.push('unntak: ' + e.message); }
    finally {
      if (typeof Tilfeldig !== 'undefined' && før.tf) Tilfeldig.verden = før.tf;
      tid = før.tid; F.personer.splice(0, F.personer.length, ...før.personer); F.moral = før.moral; F.neste = før.neste;
      SS.sett(før.sp); AI.minne.rød.leir = før.minne.rød.leir; AI.minne.grønn.leir = før.minne.grønn.leir; AI.minne.rød.spion = før.minne.rød.spion; AI.minne.grønn.spion = før.minne.grønn.spion;
      BS.sett(før.bors);
      for (const n of Object.keys(localStorage)) if (/^riksbrudd-(spion|bors|k2)/.test(n)) localStorage.removeItem(n); for (const [n, v] of før.lagring) localStorage.setItem(n, v);
      if (før.logg && typeof loggLinjer !== 'undefined') loggLinjer.splice(0, loggLinjer.length, ...før.logg);
      if (FS.åpne && varÅpenG === false) FS.åpne(false); if (FS.vis) FS.vis(); skitten = true;
    }
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : 'spion gir innsyn, kameravakta avslører, sparken fjerner innsynet, egen spion gir innsyn, rivalen kjøper med kassa', data: d };
  }),
};
