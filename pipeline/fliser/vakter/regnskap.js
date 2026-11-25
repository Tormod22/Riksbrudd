// Vakt for pakka «regnskap» (runde 12, 21. nov natt, kritiker F: «tallene henger ikke sammen»).
// Prøver: (1) en falt mann i Leirvakta går ut av folket (folkelista og telleren), meldes én gang, står én gang blant de døde, og
// er ikke tilbake etter at forsvaret er opphevet; (2) treffteksten for karakteren og en lagfører er uten dobling; (3) materialprisen i
// banneret = det som betales = det loggen sier; (4) «Automatisk» står ikke to ganger; (5) sengene sier «N senger, M i bruk»;
// (6) Rekrutter-knappen står på samme sted når en mangel-linje forsvinner; (7) brakke-målet sier «vent» når brakka er bestilt;
// (8) pronomen etter navnet; (9) letingen sier hvor rasjonene havnet. RUNDE 13: ordre lagres straks, klokka, loggen lagres, tyverikortet
// følger maten, krangel navngir begge, ingen like navn, opplæringens krav, Folk sier hvem som flyttes, prisen sier «utstyr og deler». Setter alt tilbake (folket, samfunnet, penger, leiren, logg).
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
        // (runde 13) prisen sier hva den kjøper: «utstyr og deler», og at byggelagene gjør arbeidet
        ut.utstyrOk = /utstyr og deler/.test(bt) && /byggelagene dine/.test(bt) && !/\(arbeid /.test(bt);
        // (runde 14) og hva utstyret er (brakka: senger, ovn …)
        ut.utstyrForklart = /senger, ovn/.test(bt);
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
    // ---------- RUNDE 13 (kritiker G og H): ingenting går tapt, og tekstene stemmer ----------
    const e = await pg.evaluate(async () => {
      const ut = {}, vent = ms => new Promise(r => setTimeout(r, ms));
      const F = FolkSpill.tilstand(), f0 = JSON.stringify(F), SS = window.SamfunnSpill, S0 = SS && SS.tilstand() ? JSON.stringify(SS.tilstand()) : null, tempo0 = tempo;
      const sp = OppstartSpill.tilstand(), leir = sp.leir, lag = (() => { const e = nyttLag('Vaktprøve 13', leir.x + 60, leir.y + 40, 'blå'); ENHETER.push(e); return e; })();
      const plass0 = lag ? { x: lag.x, y: lag.y } : null, LL = window.LoggLager, linjer0 = LL && LL.tilstand() ? LL.tilstand().linjer.length : 0;
      try {
        tempo = 0;
        // (10) en ordre lagres straks – også mens ruta planlegges
        if (lag && window.LagringSpill) { const målet = d => !!(d && d.mål && Math.abs(d.mål[0] - (plass0.x + 500)) < 60 && Math.abs(d.mål[1] - (plass0.y + 350)) < 60), lest = () => (JSON.parse(localStorage.getItem(LagringSpill.NØKKEL) || '{}').lag || []).find(q => q.navn === lag.navn);
          // a) mens ruta planlegges (ingen sti ennå): lagret med målet; b) uten å lagre selv: lagret av seg selv like etter ordren
          localStorage.removeItem(LagringSpill.NØKKEL); const p = ordre(lag, lag.x + 500, lag.y + 350, true); const planlegger = !lag.sti; LagringSpill.lagre(); const a = lest();
          localStorage.removeItem(LagringSpill.NØKKEL); await vent(300); const b = lest();
          ut.ordre = { planlegger, a: a && a.mål, b: b && b.mål }; ut.ordreOk = målet(a) && målet(b);
          try { await p; } catch (e) { /* ruta */ } lag.sti = null; lag.steg = null; lag.x = plass0.x; lag.y = plass0.y; delete lag.ordreMål; }
        else ut.ordreOk = !lag ? 'ingen lag' : false;
        // (11) klokka: klokkenøkkelen har samme tid som spillet etter en lagring
        if (window.LagringSpill) { tid += 0.5; LagringSpill.lagre(); ut.klokke = [LagringSpill.klokkeLest(leir), tid]; ut.klokkeOk = Math.abs(ut.klokke[0] - tid) < 0.01; } else ut.klokkeOk = false;
        // (12) loggen lagres per leir
        if (LL && LL.tilstand()) { logg('Vaktprøve runde 13: denne linja skal lagres.'); LL.lagre(); const lagret = LL.les(localStorage.getItem('riksbrudd-logg'), LL.leirId(leir));
          ut.loggOk = lagret.linjer.some(q => /Vaktprøve runde 13/.test(q[1])); const L = LL.tilstand(); L.linjer = L.linjer.filter(q => !/Vaktprøve runde 13/.test(q[1])); LL.lagre(); }
        else ut.loggOk = false;
        // (13) kortet om tyveri: «alle er sultne» bare når maten er knapp
        if (SS && window.Samfunn && Samfunn.kortTekst) { const S = SS.tilstand(), c = { type: 'kort', id: 'tyv', a: F.personer[0].id, b: F.personer[1].id }, k = SS.ktx ? SS.ktx() : {};
          F.mat = F.personer.length * 17; const mye = Samfunn.kortTekst(S, F, c, k).valg[1].t; F.mat = F.personer.length * 1.5; const lite = Samfunn.kortTekst(S, F, c, k).valg[1].t;
          ut.tyv = [mye, lite]; ut.tyvOk = !/sultne/.test(mye) && /sultne/.test(lite); } else ut.tyvOk = true;
        // (14) krangel navngir begge
        const kr = window.Spillet && Spillet.Hendelser.LISTE.find(h => h.id === 'krangel'); ut.krangelOk = !kr || (kr.to && /Ola og Kari har/.test(kr.tekst('Ola', 'Kari')));
        // (15) navn: en ny person får aldri navnet til en død eller en i en tropp
        { const G = FolkRegler.fraJSON(JSON.parse(f0)), S = SS && SS.tilstand(), døde0 = S ? S.døde.length : 0; if (S) S.døde.push({ navn: 'Ragnhild Tangen', hvem: 'soldat', tid: 0 });
          const r = FolkRegler.rng(13); for (let i = 0; i < 60; i++) FolkRegler.nyPerson(G, r);
          const lagNavn = ENHETER.filter(q => q.side === 'blå').flatMap(q => q.menn.map(m => m.navn)), alle = G.personer.map(p => p.navn);
          ut.navnOk = new Set(alle).size === alle.length && !alle.includes('Ragnhild Tangen') && !alle.some(n => lagNavn.includes(n)); if (S) S.døde.length = døde0; }
        // (16) opplæringen steg 6: kravet står konkret og to på Vakt holder
        if (window.Opplaering) { const s6 = Opplaering.STEG.find(q => q.id === 'tropp2'); ut.krav = Opplaering.krav(s6, { tropper: 0, påVakt: 1 });
          ut.kravOk = /1 på Vakt \(trenger 2\)/.test(ut.krav) && s6.ferdig({ tropper: 0, påVakt: 2 }); } else ut.kravOk = false;
        // (17) Folk: + på Vakt når ingen har fri sier hvem som flyttes og hvorfra; byggelagene «N på bygg = M byggelag»
        for (const p of F.personer) if (p.oppgave === 'fri' || p.oppgave === 'vakt') p.oppgave = 'bygg'; FolkSpill.åpne(true); await vent(300);
        const pl = document.querySelector('#folkmeny button.pluss[data-o="vakt"]'), tittel = pl ? pl.title : ''; if (pl) pl.click(); await vent(300);
        const fl = (document.getElementById('folkflyttet') || {}).textContent || '', bygg = [...document.querySelectorAll('#folkmeny .opp small')].map(q => q.textContent)[0] || '';
        ut.folk = { tittel, fl, bygg }; ut.folkOk = /fra Bygg/.test(tittel) && /^Flyttet: .+ fra Bygg til Vakt/.test(fl) && /\d+ på bygg = \d+ byggelag/.test(bygg); FolkSpill.åpne(false);
      } catch (e) { ut.feil = String(e && e.stack || e).slice(0, 300); }
      finally {
        const ny = FolkRegler.fraJSON(JSON.parse(f0)); Object.keys(F).forEach(k => delete F[k]); Object.assign(F, ny);
        if (SS && S0) { const S = SS.tilstand(); Object.keys(S).forEach(k => delete S[k]); Object.assign(S, JSON.parse(S0)); if (SS.lagre) SS.lagre(); }
        if (lag) { const i = ENHETER.indexOf(lag); if (i >= 0) ENHETER.splice(i, 1); }
        tempo = tempo0; if (window.LeirSpill) LeirSpill.lagre(); if (window.LagringSpill) LagringSpill.lagre(); skitten = true;
      }
      return ut;
    });
    // ---------- RUNDE 14 (kritiker I og J): høyst én modal, ingen loggspam, opplæringen henger ikke, småting ----------
    const f = await pg.evaluate(async () => {
      const ut = {}, vent = ms => new Promise(r => setTimeout(r, ms)), synlig = id => { const e = document.getElementById(id); return !!(e && e.classList.contains('på') && e.getClientRects().length); };
      const MOD = ['loggvelkommen', 'hendelse', 'samfunnkort', 'morgenkort', 'formkort', 'krigkort'];
      const F = FolkSpill.tilstand(), f0 = JSON.stringify(F), SS = window.SamfunnSpill, S0 = SS && SS.tilstand() ? JSON.stringify(SS.tilstand()) : null, tempo0 = tempo;
      try {
        // 1+2: et kort står oppe, velkomsten kommer: kortet viker (høyst én modal), og etter «Fortsett» står samme kort med samme valg
        let kortTekst = null;
        if (SS && SS.nyttKort && SS.nyttKort('flyktninger')) { await vent(300); kortTekst = synlig('samfunnkort') ? document.getElementById('samfunnkort').innerText : null; }
        const o = { fra: LoggLager.når(0), til: LoggLager.når(60), antall: 1, alle: 3, viktige: [{ ...LoggLager.når(30), tekst: 'Røysland er vårt.' }] };
        LoggLager.velkommen(o); await vent(400);
        ut.modaler = MOD.filter(synlig); ut.énModal = ut.modaler.length === 1 && ut.modaler[0] === 'loggvelkommen';
        // (fiks 15) står et annet kort oppe (f.eks. #krigkort), vises ikke velkomsten – da er det en feil i vakta, ikke et TypeError
        const lv = document.getElementById('loggvelkommen'), lvOk = document.getElementById('loggvelkommen-ok'); ut.velkommen = !!lv;
        ut.zOk = !!lv && +getComputedStyle(lv).zIndex < 21;
        if (lvOk) lvOk.click(); await vent(1600);
        ut.etter = MOD.filter(synlig); ut.kortTilbake = kortTekst === null ? null : synlig('samfunnkort') && document.getElementById('samfunnkort').innerText === kortTekst;
        // velkomsten lukkes når spillet går igjen
        LoggLager.velkommen(o); await vent(300); const p1 = document.getElementById('sp1'); if (p1) p1.click(); await vent(500); ut.lukketVedFart = !document.getElementById('loggvelkommen');
        // 3: innledningen skrives ikke ved omlasting (reglene), bare i et nytt spill
        const D = LoggDemp.lag(); ut.spamOk = D.vurder('Spillform: Vanlig.', [], 0, true) === null && D.vurder('Ravnsund (rød) holder til i Rognan, 8 km nord.', [], 0, true) === null && !!D.vurder('Spillform: Vanlig.', [], 0, false);
        // 4: utvalget: aldri «Farten er», eldste først, ingen boks uten tid
        let A = LoggLager.tom('1,1'); LoggLager.legg(A, 'Farten er senket til 10×: et bygg er ferdig.', 5); LoggLager.legg(A, 'Kampen om leiren er i gang.', 10); LoggLager.legg(A, 'Bølge 1 er slått tilbake.', 40); A.økt += 1;
        const oa = LoggLager.oppsummer(A); ut.utvalgOk = !!oa && !oa.viktige.some(v => /Farten/.test(v.tekst)) && /Kampen/.test(oa.viktige[0].tekst) && oa.antall === oa.viktige.length;
        // 5: opplæringen: to på bygg holder uten Folk, dobbel vakt før teller, «før dag 4» borte på dag 4
        const S2 = Opplaering.STEG.find(s => s.id === 'bygg2'), S6 = Opplaering.STEG.find(s => s.id === 'tropp2'), t0 = tid;
        tid = 3 * 1440 + 5; const tit4 = S6.tittel; tid = t0;
        ut.oppOk = S2.ferdig({ påBygg: 2, folkÅpnet: false }) && !/åpne Folk/.test(Opplaering.krav(S2, { påBygg: 4 })) && S6.ferdig({ tropper: 0, påVakt: 0, vaktFør: true }) && tit4 === 'Mer forsvar';
        // 6: Folk-tallet øverst følger knappen også på pause; kassekortet har innhold og sum; farten blar ikke ved et skriptklikk
        tempo = 0; const p = F.personer.pop(); await vent(700); ut.folkTall = [document.getElementById('sFolk').textContent, F.personer.length]; F.personer.push(p);
        ut.folkOk = ut.folkTall[0].split(' ')[0] === String(ut.folkTall[1]);
        const funn = SpilletSpill && window.Spillet ? Spillet.Hendelser.LISTE.find(h => h.id === 'funn') : null; ut.kasseOk = !!funn && /800 000 kr/.test(funn.tekst('Eli')) && funn.valg.every(v => /kr/.test(v.logg || ''));
        if (p1) { p1.click(); await vent(100); p1.click(); await vent(100); ut.fart = tempo; ut.fartOk = tempo === 1; }
      } catch (e) { ut.feil = String(e && e.stack || e).slice(0, 300); }
      finally {
        if (LoggLager.lukkVelkommen) LoggLager.lukkVelkommen(false);
        const ny = FolkRegler.fraJSON(JSON.parse(f0)); Object.keys(F).forEach(k => delete F[k]); Object.assign(F, ny);
        if (SS && S0) { const S = SS.tilstand(); Object.keys(S).forEach(k => delete S[k]); Object.assign(S, JSON.parse(S0)); if (SS.lagre) SS.lagre(); if (SS.vis) SS.vis(); }
        const sk = document.getElementById('samfunnkort'); if (sk) { sk.classList.remove('på'); sk.innerHTML = ''; } if (window.Kortkø) Kortkø.ferdig('samfunnkort');
        tempo = tempo0; if (window.LeirSpill) LeirSpill.lagre(); skitten = true;
      }
      return ut;
    });
    Object.assign(d, { r14: f });
    const ok14 = !f.feil && f.énModal && f.zOk && f.kortTilbake !== false && f.lukketVedFart && f.spamOk && f.utvalgOk && f.oppOk && f.folkOk && f.kasseOk && f.fartOk !== false && d.utstyrForklart;
    Object.assign(d, { r13: e });
    const ok13 = !e.feil && e.ordreOk === true && e.klokkeOk && e.loggOk && e.tyvOk && e.krangelOk && e.navnOk && e.kravOk && e.folkOk && d.utstyrOk;
    const ok = ok13 && ok14 && !d.feil && d.falneOk && d.treffOk && d.prisOk && d.målOk && d.autoOk && d.sengerOk && d.knappOk && d.pronOk && d.letOk;
    return { ok, tekst: `RUNDE 14: ${JSON.stringify(f)} utstyr forklart ${d.utstyrForklart} · RUNDE 13: ordre ${JSON.stringify(e.ordre)} ${e.ordreOk}, klokke ${e.klokkeOk}, logg ${e.loggOk}, tyveri ${JSON.stringify(e.tyv)}, navn ${e.navnOk}, krav «${e.krav}», folk ${JSON.stringify(e.folk)}, utstyr ${d.utstyrOk}` + (e.feil ? ' FEIL13: ' + e.feil : '') + ` · falne ${JSON.stringify(d.falne)}, treff ${JSON.stringify(d.treff)}, pris ${JSON.stringify(d.pris)}, senger «${d.senger}», knapp ${JSON.stringify(d.knapp)}, mål «${d.mål}», pronomen «${d.pron}»` + (d.feil ? ' FEIL: ' + d.feil : ''), data: d };
  },
};
