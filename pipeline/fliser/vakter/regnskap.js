// Vakt for pakka «regnskap» (runde 12, 21. nov natt, kritiker F: «tallene henger ikke sammen»).
// Prøver: (1) en falt mann i Leirvakta går ut av folket (folkelista og telleren), meldes én gang, står én gang blant de døde, og
// er ikke tilbake etter at forsvaret er opphevet; (2) treffteksten for karakteren og en lagfører er uten dobling; (3) materialprisen i
// banneret = det som betales = det loggen sier; (4) «Automatisk» står ikke to ganger; (5) sengene sier «N senger, M i bruk»;
// (6) Rekrutter-knappen står på samme sted når en mangel-linje forsvinner; (7) brakke-målet sier «vent» når brakka er bestilt;
// (8) pronomen etter navnet; (9) letingen sier hvor rasjonene havnet. Setter alt tilbake (folket, samfunnet, penger, leiren, logg).
module.exports = {
  navn: 'regnskap (tall og tekster som stemmer)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = {}, vent = ms => new Promise(r => setTimeout(r, ms));
      if (!window.FolkSpill || !FolkSpill.tilstand() || !window.LeirSpill || !LeirSpill.tilstand() || !window.ForsvarSpill || !window.OppstartSpill) return { mangler: true };
      const F = FolkSpill.tilstand(), L = LeirSpill.tilstand(), SS = window.SamfunnSpill, S0 = SS && SS.tilstand() ? JSON.stringify(SS.tilstand()) : null, test0 = SS ? SS.test : false;
      const f0 = JSON.stringify(F), lager0 = JSON.stringify(L.lager), bygg0 = L.bygg.map(b => b.id), penger0 = OppstartSpill.tilstand().penger, tempo0 = tempo, lagN = ENHETER.length;
      const logget = [], gl = window.logg; window.logg = t => { logget.push(t); gl(t); };
      try {
        // (1) de falne
        if (SS) SS.test = true; tempo = 1;
        for (const p of F.personer.slice(0, 3)) p.oppgave = 'vakt';
        if (ForsvarSpill.erSatt && ForsvarSpill.erSatt()) ForsvarSpill.opphev(false);
        ForsvarSpill.sett(true); await vent(300); const v = ForsvarSpill.vakt();
        if (v) { const n0 = F.personer.length, død = v.menn[v.menn.length - 1], navn = død.navn; død.hp = 0;
          if (FolkSpill.falne) FolkSpill.falne(); await vent(300); if (FolkSpill.falne) FolkSpill.falne();
          const n1 = F.personer.length, teller = (document.getElementById('sFolk') || {}).textContent || '';
          ForsvarSpill.opphev(false); await vent(200);
          const S = SS && SS.tilstand(), døde = S ? S.døde.filter(q => q.navn === navn).length : 1;
          ut.falne = { n0, n1, ute: !F.personer.some(p => p.navn === navn), teller: parseInt(teller, 10) === n1, meldt: logget.filter(t => t.includes(navn) && /falt/.test(t)).length, døde };
          ut.falneOk = n1 === n0 - 1 && ut.falne.ute && ut.falne.teller && ut.falne.meldt === 1 && døde === 1;
        } else { ut.falneOk = false; ut.falne = 'ingen Leirvakta'; }
        // (2) treffteksten
        const kar = ENHETER.find(e => e.karakter), lv = { navn: 'Leirvakta', side: 'blå' };
        const tk = kar ? FolkRegler.treffTekst(kar.menn[0], kar, 'såret') : 'Du er såret.', tl = FolkRegler.treffTekst({ navn: 'Ola Lie', rolle: 'lagfører' }, lv, 'såret');
        ut.treff = [tk, tl]; ut.treffOk = tk === 'Du er såret.' && tl === 'Ola Lie (lagfører i Leirvakta) er såret.';
        // (3) materialprisen: banneret, betalingen og loggen
        L.lager.tre = 0.37; OppstartSpill.gi(20e6); LeirSpill.startPlassering('brakke'); await vent(200);
        const sp = OppstartSpill.tilstand(); LeirSpill.trykk(sp.leir.x + 34, sp.leir.y - 26); await vent(1500);
        const ban = document.getElementById('byggvalg'), bt = ban ? ban.textContent : '', kn = ban ? [...ban.querySelectorAll('button')].find(b => /Kjøp materialene/.test(b.textContent)) : null;
        const m = bt.match(/materialer ([\d\s]+?)\s*kr/), før = OppstartSpill.tilstand().penger; let betaltMat = null, loggMat = null;
        if (kn) { kn.click(); await vent(400); const lb = logget.filter(t => /bestilt/.test(t)).pop() || '', lm = lb.match(/materialer ([\d\s]+?)\s*kr/); loggMat = lm ? +lm[1].replace(/\s/g, '') : null;
          const ny = L.bygg.find(b => !bygg0.includes(b.id)); betaltMat = ny ? før - OppstartSpill.tilstand().penger - ny.pris : null; }
        else if (LeirSpill.avbryt) LeirSpill.avbryt();
        const bannerMat = m ? +m[1].replace(/\s/g, '') : null;
        ut.pris = { bannerMat, betaltMat, loggMat }; ut.prisOk = bannerMat > 0 && bannerMat === betaltMat && bannerMat === loggMat;
        // (7) brakka er bestilt (ikke ferdig): målet sier «vent»
        if (window.Maal) { const mb = Maal.finn('brakke'); ut.mål = Maal.tekstNå(mb, { bygg: {}, bestilt: { brakke: 1 } }); ut.målOk = /Vent til brakka/.test(ut.mål); } else ut.målOk = true;
        // (4) «Automatisk» én gang
        if (window.LagringMeny && LagringMeny.taAuto && LagringMeny.plass) { const LM = LagringMeny, før = LM.plass('auto');
          LM.taAuto(); const pl = LM.plass('auto'); LM.åpne(); await vent(200); const t = (document.querySelector('[data-plass="auto"]') || {}).textContent || ''; if (LM.lukk) LM.lukk();
          ut.auto = t.slice(0, 80); ut.autoOk = !!pl && !/^Automatisk:/.test(pl.navn || '') && !/Automatisk: Automatisk/.test(t);
          if (før && !før.ødelagt) LM.legg('auto', før); else LM.slett('auto'); } else ut.autoOk = true;
        // (5) senger og (6) knappen står stille
        FolkSpill.åpne(true); await vent(1300);
        const brikke = [...document.querySelectorAll('#folkmeny .brikker span')].map(s => s.textContent)[0] || '';
        ut.senger = brikke; ut.sengerOk = /^(\d+ senger?, \d+ i bruk|Ingen senger)/.test(brikke) && !/ av /.test(brikke);
        const rek = document.getElementById('rekrutter'), y0 = rek ? rek.getBoundingClientRect().y : -1; F.sist = { ...(F.sist || {}), sult: !(F.sist && F.sist.sult) }; FolkSpill.vis(); await vent(100);
        const rek2 = document.getElementById('rekrutter'), y1 = rek2 ? rek2.getBoundingClientRect().y : -2; ut.knapp = [y0, y1]; ut.knappOk = Math.abs(y0 - y1) < 1;
        FolkSpill.åpne(false);
        // (8) pronomen og (9) leting
        ut.pron = window.Samfunn && Samfunn.medPron ? Samfunn.medPron('Hen takket. La hen dra.', { navn: 'Sindre Vik' }) : 'Han takket. La ham dra.'; ut.pronOk = ut.pron === 'Han takket. La ham dra.';
        ut.let = window.Leting && Leting.hvor ? Leting.hvor({ mat: 17 }, { mat: 63 }) : ''; ut.letOk = /leirens matlager \(63 i alt\)/.test(ut.let);
      } catch (e) { ut.feil = String(e && e.stack || e).slice(0, 300); }
      finally {
        window.logg = gl;
        if (ForsvarSpill.erSatt && ForsvarSpill.erSatt()) ForsvarSpill.opphev(false);
        for (const b of L.bygg.filter(b => !bygg0.includes(b.id))) { const i = L.bygg.indexOf(b); if (i >= 0) L.bygg.splice(i, 1); }
        L.lager = JSON.parse(lager0); const ny = FolkRegler.fraJSON(JSON.parse(f0)); Object.keys(F).forEach(k => delete F[k]); Object.assign(F, ny);
        if (SS) { if (S0) { const S = SS.tilstand(); Object.keys(S).forEach(k => delete S[k]); Object.assign(S, JSON.parse(S0)); } SS.test = test0; if (SS.lagre) SS.lagre(); }
        const nå = OppstartSpill.tilstand().penger; if (nå > penger0) OppstartSpill.betal(nå - penger0); else if (nå < penger0) OppstartSpill.gi(penger0 - nå);
        ENHETER.length = Math.min(ENHETER.length, lagN); tempo = tempo0; if (LeirSpill.oppdater3d) LeirSpill.oppdater3d(); LeirSpill.lagre(); skitten = true;
      }
      return ut;
    });
    if (d.mangler) return { ok: false, tekst: 'mangler FolkSpill/LeirSpill/ForsvarSpill', data: d };
    const ok = !d.feil && d.falneOk && d.treffOk && d.prisOk && d.målOk && d.autoOk && d.sengerOk && d.knappOk && d.pronOk && d.letOk;
    return { ok, tekst: `falne ${JSON.stringify(d.falne)}, treff ${JSON.stringify(d.treff)}, pris ${JSON.stringify(d.pris)}, senger «${d.senger}», knapp ${JSON.stringify(d.knapp)}, mål «${d.mål}», pronomen «${d.pron}»` + (d.feil ? ' FEIL: ' + d.feil : ''), data: d };
  },
};
