// Vakt «folk som går» (ut3-folkgar, fase F2): en person med jobb går til arbeidsplassen og bidrar først når hen er framme; om natta går folk
// til senga; et verksted bak en palisade uten åpning gir «ingen vei» i jobbtavla; med døgnplanen av er tempoet (og byggetiden) som før.
// Setter alt tilbake (leirens bygg, folkenes oppgaver, tid, JobberSpill.test).
module.exports = {
  navn: 'folk som går (F2)',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (b, t) => { if (!b) ut.feil.push(t); };
    if (!window.Folkgang || !window.FolkgangSpill || !window.LeirSpill || !window.FolkSpill || !window.JobberSpill) return { ok: false, tekst: 'Folkgang/FolkgangSpill mangler', data: ut };
    const L = LeirSpill.tilstand(), F = FolkSpill.tilstand(), S = OppstartSpill.tilstand(), m = S.leir;
    const bygg0 = JSON.stringify(L.bygg), bs0 = L.byggesett ? { ...L.byggesett } : null, oppg0 = F.personer.map(p => [p.id, p.oppgave]), tid0 = tid, test0 = JobberSpill.test, neste0 = L.neste, nj0 = L.nesteJobb;
    const kl = h => ((h - 6 + 24) % 24) * 60;
    try {
      // en liten prøveleir: brakke, kjøkken, vakttårn, et verksted bak en palisade uten åpning, og en byggeplass 45 m unna
      let id = 900000; const legg = (type, x, y, ferdig = true) => { const b = { id: id++, type, x: m.x + x, y: m.y + y, ret: 0, nivå: 1, hp: 1, igjen: ferdig ? 0 : 240, totalt: 240, nr: id, arbeid: null }; L.bygg.push(b); return b; };
      legg('brakke', -30, 22); legg('brakke', -14, 22); legg('kjøkken', 22, -18); legg('vakttårn', 36, 6); const vk = legg('verksted', -60, -40); const tomt = legg('brakke', 45, 30, false);
      if (!L.byggesett) L.byggesett = { ox: m.x, oy: m.y }; const o = L.byggesett;
      for (const q of ByggesettRegler.rad(o, 'bs_palisade', [vk.x - 16, vk.y - 16], [vk.x + 16, vk.y + 16])) L.bygg.push({ id: id++, type: 'bs_palisade', x: vk.x, y: vk.y, bs: { i: q.i, j: q.j, a: q.a, n: 0 }, igjen: 0, hp: 1, nivå: 1, nr: id });
      // oppgavene: to på bygg, én på vakt, én på verksted, én på kjøkken
      const P = F.personer; P.forEach((p, i) => { p.oppgave = ['bygg', 'bygg', 'vakt', 'verksted', 'kjøkken'][i] || 'fri'; });
      JobberSpill.test = true; tid = kl(9); FolkgangSpill.nullstill();
      // 1. første steg: målet er satt, men ingen er framme ennå – byggingen går ikke
      FolkgangSpill.steg(.25); FolkgangSpill.steg(.25);
      const bygger = P[0], gang = FolkgangSpill.tilstand();
      ut.før = { tekst: FolkgangSpill.tekst(bygger), framme: gang.pers[bygger.id] && gang.pers[bygger.id].framme, tempo: +FolkRegler.tempo(F, 'bygg').toFixed(3) };
      krev(ut.før.framme === false && ut.før.tempo === 0 && /byggeplassen/.test(ut.før.tekst), 'byggeren bidrar før hen er framme: ' + JSON.stringify(ut.før));
      // 2. etter to minutter: framme ved byggeplassen, og byggingen går
      for (let k = 0; k < 8; k++) FolkgangSpill.steg(15);
      const sb = gang.pers[bygger.id];
      ut.etter = { tekst: FolkgangSpill.tekst(bygger), framme: sb.framme, avst: Math.round(Math.hypot(sb.x - tomt.x, sb.y - tomt.y)), tempo: +FolkRegler.tempo(F, 'bygg').toFixed(3), vakt: FolkgangSpill.tekst(P[2]) };
      krev(ut.etter.framme && ut.etter.tempo > 0 && ut.etter.avst < 12, 'byggeren kom ikke fram / bidrar ikke: ' + JSON.stringify(ut.etter));
      // 3. verkstedet bak palisaden: står fast med grunnen, og jobbtavla sier det
      const vs = gang.pers[P[3].id]; ut.verksted = { fast: vs && vs.fast, linjer: FolkgangSpill.fastLinjer() };
      krev(vs && vs.fast && /ingen vei|ingen dør/.test(vs.fast), 'verkstedet bak palisaden står ikke fast: ' + JSON.stringify(ut.verksted));
      krev(ut.verksted.linjer.some(t => /Verksted står fast/.test(t)), 'jobbtavla mangler «står fast»: ' + JSON.stringify(ut.verksted.linjer));
      { const fm = document.getElementById('folkmeny'), åpen = fm && fm.classList.contains('på'); FolkSpill.åpne(true); FolkSpill.vis(); ut.iTavla = /Verksted står fast/.test(document.getElementById('folkmeny').textContent); if (!åpen) FolkSpill.åpne(false); }
      krev(ut.iTavla, 'Folk-panelet viser ikke «Verksted står fast»');
      // 4. om natta: til senga i brakka
      tid = kl(23.5); FolkgangSpill.steg(.25); for (let k = 0; k < 12; k++) FolkgangSpill.steg(15);
      const sover = P.filter(p => gang.pers[p.id] && gang.pers[p.id].hva === 'søvn'), iSeng = sover.filter(p => gang.pers[p.id].framme && gang.pers[p.id].inne === 'brakke');
      ut.natt = { sover: sover.length, iSeng: iSeng.length, tekst: sover[0] ? FolkgangSpill.tekst(sover[0]) : '' };
      krev(sover.length >= 3 && iSeng.length === sover.length, 'om natta: ' + JSON.stringify(ut.natt));
      // 5. 2D: en person kan trykkes på (kortet med hva hen gjør)
      tid = kl(9); for (let k = 0; k < 8; k++) FolkgangSpill.steg(15);
      { const q = FolkgangSpill.plass2d(bygger), m0 = kam.m; kam.m = .8; const brukt = q ? KROKER.trykk.some(f => f(q.x, q.y)) : false, k = document.getElementById('folkgangkort'); ut.kort = brukt && k ? k.textContent : null; kam.m = m0; FolkgangSpill.visKort(-1); }
      krev(ut.kort && ut.kort.includes(bygger.navn) && /bygger|går til/i.test(ut.kort), 'trykk på personen: ' + ut.kort);
      // 6. døgnplanen av (testene, gamle spill): gangen teller ikke – tempoet er det samme som uten kroken
      JobberSpill.test = false; const t1 = FolkRegler.tempo(F, 'bygg'), krok = FolkRegler.stedF; FolkRegler.stedF = null; const t0 = FolkRegler.tempo(F, 'bygg'); FolkRegler.stedF = krok;
      ut.av = { med: +t1.toFixed(4), uten: +t0.toFixed(4) }; krev(Math.abs(t1 - t0) < 1e-9 && t0 > 0, 'døgnplanen av: tempoet endret seg ' + JSON.stringify(ut.av));
    } catch (e) { ut.feil.push('unntak: ' + e.message); }
    finally {
      L.bygg.splice(0, L.bygg.length, ...JSON.parse(bygg0)); if (bs0) L.byggesett = bs0; else delete L.byggesett; L.neste = neste0; L.nesteJobb = nj0;
      for (const [pid, o] of oppg0) { const p = F.personer.find(q => q.id === pid); if (p) p.oppgave = o; }
      tid = tid0; JobberSpill.test = test0; FolkgangSpill.nullstill(); if (typeof skitten !== 'undefined') skitten = true;
    }
    return { ok: !ut.feil.length, tekst: ut.feil.length ? ut.feil.join('; ') : `byggeren framme etter ${ut.etter && ut.etter.avst} m, natta ${ut.natt && ut.natt.iSeng} i senga, verkstedet: ${ut.verksted && ut.verksted.fast}`, data: ut };
  }),
};
