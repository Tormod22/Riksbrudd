// Vakt for pakka «ut8-kr-krig» (kritikken fra Ingrid Sæther 28. nov; docs/natt/ut8-kr-krig.md).
// 1) MARSJRUTA FØR BEKREFTELSEN: et lag sendes fra leiren mot et prøvetettsted bak et annet prøvetettsted med bygdevern (et belte på tvers
//    uten omveg). Bekreftelsen (#krigadvarsel) skal si «Marsjen går gjennom Vakt kr-belte – bygdevern ca. N mann» FØR laget går, og
//    «Send likevel» skal være rød. Uten StrategiSpill.ruteTest (som i de andre vaktene) regnes ingen rute.
// 2) STORE KJØP: en knapp «Tilby våpenhvile (2,7 mill. kr)» trekker ingenting på første trykk; boksen #stortkjop spør, og «Ja» gjør kjøpet.
//    Under 1 mill. kr går kjøpet rett gjennom.
// 3) ETT KORT OM GANGEN: morgenmøtet med en stor beslutning – etter valget lukkes møtet, og beslutningen kommer som eget kort («Viktig
//    beslutning», uten røverlinja). «Velkommen tilbake» venter mens Selskapet-panelet er åpent.
// 4) Ferdige bygg senker ikke farten som standard (FlytSpill.valg().bygg).
// Setter alt tilbake: lagene, prøvetettstedene, kassa, testbryterne, morgenmøtet og panelene.
module.exports = {
  navn: 'ut8-kr-krig',
  kjør: async (pg, profil) => pg.evaluate(async (profil) => {
    const feil = [], d = {}, krev = (b, t) => { if (!b) feil.push(t); };
    const vent = ms => new Promise(r => setTimeout(r, ms));
    const SS = window.StrategiSpill, OS = window.OppstartSpill, KS = window.KrigSpill;
    if (!SS || !OS || !SS.ruteKjent || !window.StortKjøp || typeof INFRA === 'undefined' || !INFRA || !INFRA.tettsted) return { ok: false, tekst: 'StrategiSpill (med ruteKjent), StortKjøp, OppstartSpill eller INFRA mangler', data: {} };
    const S0 = OS.tilstand(), L = S0.leir, penger0 = S0.penger, tid0 = tid, tempo0 = tempo, kam0 = { x: kam.x, y: kam.y, m: kam.m }, valgt0 = valgt;
    const enh0 = ENHETER.slice(), tett0 = INFRA.tettsted.slice(), test0 = { st: SS.test, rt: SS.ruteTest, sk: StortKjøp.test, ks: KS ? KS.test : null }, åpen0 = SS.erÅpen();
    const krp = window.KontrollromSpill && KontrollromSpill.på ? KontrollromSpill.på() : false, vern0 = KS && KS.T ? JSON.stringify(KS.T().vern || {}) : null;
    const MS = window.MorgenSpill, morgen0 = MS && MS.tilstand() ? JSON.stringify(MS.tilstand()) : null, mt0 = MS ? [MS.test, MS.køTest] : null;
    const LL = window.LoggLager, ll0 = LL ? LL.test : null, kk0 = !!(document.getElementById('krigkort') && document.getElementById('krigkort').classList.contains('på'));
    try {
      // ---------- 1) marsjruta ----------
      // et belte (16 km × 600 m) på tvers 2,5 km nord for leiren med bygdevern, og målet 5 km nord for leiren
      const nyBy = (id, x0, y0, x1, y1, folk) => ({ lag: 'tettsted', e: { id, navn: 'Vakt ' + id, folk }, bb: [x0, y0, x1, y1], deler: [[x0, y0, x1, y0, x1, y1, x0, y1]] });
      const belte = nyBy('kr-belte', L.x - 8000, L.y + 2200, L.x + 8000, L.y + 2800, 1200), mål = nyBy('kr-mål', L.x - 300, L.y + 4700, L.x + 300, L.y + 5300, 400);
      INFRA.tettsted.push(belte, mål); TETTSTEDER.delete('kr-belte'); TETTSTEDER.delete('kr-mål');
      SS.test = true; SS.ruteTest = true; if (SS.glemRuter) SS.glemRuter();
      const a = nyttLag('Vakt kr A', L.x + 30, L.y + 20, 'blå'); ENHETER.push(a);
      const by = SS.område().find(b => b.id === 'kr-mål'); krev(!!by, 'prøvemålet er ikke med i krigsområdet');
      if (by) {
        if (SS.settTerreng) SS.settTerreng(by, false);
        if (profil !== '3D' && !(typeof på3d !== 'undefined' && på3d)) SS.åpne(); SS.velg('kr-mål');
        SS.send(by, a);
        let A = SS.advarsel(); for (let i = 0; i < 150 && A && A.sjekker; i++) { await vent(100); A = SS.advarsel(); }
        d.sjekket = !!A && !A.sjekker; krev(!a.sti && !a.planlegger, 'laget gikk før bekreftelsen');
        const rk = SS.ruteKjent(a, by); d.rute = rk && rk.gjennom ? rk.gjennom.map(b => b.navn + ':' + b.mann) : rk;
        krev(rk && rk.gjennom && rk.gjennom.some(b => b.navn === 'Vakt kr-belte' && b.mann > 0), 'marsjruta ble ikke regnet ut gjennom beltet: ' + JSON.stringify(d.rute));
        const fa = A && A.farer ? A.farer.find(f => f.id === 'rute' && f.alvor >= 2) : null; d.fare = fa ? fa.tekst : null;
        krev(fa && /Marsjen går gjennom Vakt kr-belte – bygdevern ca\. \d+ mann/.test(fa.tekst), 'bekreftelsen sier ikke at marsjen går gjennom beltet: ' + (fa ? fa.tekst : JSON.stringify(A && A.farer && A.farer.map(f => f.id))));
        const boks = document.getElementById('krigadvarsel');
        if (boks && boks.getClientRects().length) { d.boks = boks.innerText.slice(0, 400); krev(/Marsjen går gjennom Vakt kr-belte/.test(boks.innerText), 'teksten om ruta står ikke i boksen');
          const lv = boks.querySelector('[data-advarsel=likevel]'); krev(lv && lv.classList.contains('rød'), '«Send likevel» er ikke rød når ruta går gjennom bygdevern');
          const av = boks.querySelector('[data-advarsel=avbryt]'); if (av) av.click(); }
        else { d.boks = 'ikke synlig (3D/lukket)'; }
        // trekket: ruta står på forslaget og trekker det ned
        const T = SS.bilde(), t = T && T.trekk.find(q => q.by.id === 'kr-mål'); d.trekk = t ? { rute: !!t.rute, sterk: t.sterk } : null;
        krev(t && t.rute && t.rute.mann > 0, 'forslaget i «Neste trekk» vet ikke om ruta gjennom beltet');
        // uten ruteTest: ingen rute (de andre vaktene går som før)
        SS.ruteTest = false; krev(SS.ruteKjent(a, by) === null, 'ruta regnes også uten ruteTest');
        if (SS.advarsel()) SS.send(by, a, { likevel: true }); a.sti = null;
      }
      // krigskortet (seier/tap) kan komme av seg selv med StrategiSpill.test – det og prøvebyene tas bort før kortene prøves
      if (SS.erÅpen()) SS.lukk(); SS.test = test0.st; SS.ruteTest = test0.rt; INFRA.tettsted.length = 0; INFRA.tettsted.push(...tett0); { const kk = document.getElementById('krigkort'); if (kk && !kk0) kk.classList.remove('på'); }
      // ---------- 2) store kjøp ----------
      StortKjøp.test = true; const p0 = OS.tilstand().penger;
      const lag = (tekst, kr) => { const b = document.createElement('button'); b.textContent = tekst; b.style.cssText = 'position:fixed;left:10px;top:200px;z-index:99'; b.onclick = () => { OS.betal(kr); b.dataset.kjøpt = '1'; }; document.body.appendChild(b); return b; };
      const b1 = lag('Tilby våpenhvile (2,7 mill. kr)', 2.7e6); b1.click(); await vent(30);
      const boks2 = document.getElementById('stortkjop'); d.kjøpBoks = boks2 ? boks2.innerText : null;
      krev(!b1.dataset.kjøpt && OS.tilstand().penger === p0, 'våpenhvilen ble trukket på første trykk');
      krev(boks2 && /Tilby våpenhvile for 2,7 mill\. kr\?/.test(boks2.innerText), 'bekreftelsen kom ikke (eller feil tekst)');
      const ja = document.getElementById('stortkjop-ja'); if (ja) ja.click(); await vent(30);
      krev(b1.dataset.kjøpt === '1' && OS.tilstand().penger === p0 - 2.7e6, '«Ja» gjorde ikke kjøpet');
      const b2 = lag('Kjøp (900 000 kr)', 9e5); b2.click(); await vent(30); krev(b2.dataset.kjøpt === '1' && !document.getElementById('stortkjop'), 'et kjøp under 1 mill. kr ble stoppet');
      const b3 = lag('Gjør avtale (8 mill. kr)', 8e6); b3.click(); await vent(30); const nei = document.getElementById('stortkjop-nei'); if (nei) nei.click();
      krev(!b3.dataset.kjøpt, '«Nei» kjøpte likevel'); b1.remove(); b2.remove(); b3.remove(); StortKjøp.test = test0.sk;
      // ---------- 3) ett kort om gangen ----------
      if (MS && MS.morgen && window.Kortkø) {
        MS.test = true; MS.køTest = true; MS.morgen(true, { stor: 'nabo' }); await vent(50);
        const K = MS.tilstand().kort; krev(K && K.stor, 'morgenmøtet fikk ingen stor beslutning');
        // (sjekkes straks: i testene er det ingen pause i kortkøen, så kortet kommer igjen innen ett sekund)
        const ingen = [...document.querySelectorAll('#morgenkort button')].find(b => /Ingen endring i dag/.test(b.textContent)); if (ingen) ingen.click();
        const mk = document.getElementById('morgenkort');
        d.etterValg = { steg: MS.tilstand().kort.steg, på: mk.classList.contains('på'), venter: Kortkø.venter().map(q => q.tittel) };
        krev(MS.tilstand().kort.steg === 1 && !mk.classList.contains('på'), 'den store beslutningen kom i samme kort som morgenmøtet');
        krev(Kortkø.venter().some(q => q.id === 'morgenkort' && /Viktig beslutning/.test(q.tittel)), 'den store beslutningen står ikke i kortkøen');
        Kortkø.nå(); await vent(50); d.etterNå = { på: mk.classList.contains('på'), h3: (mk.querySelector('h3') || {}).textContent };
        krev(mk.classList.contains('på') && /^Viktig beslutning/.test((mk.querySelector('h3') || {}).textContent || '') && !mk.querySelector('#morgenraid') && !!mk.querySelector('.mstor'), 'beslutningskortet har ikke egen overskrift (eller har røverlinja)');
        const v = [...mk.querySelectorAll('.mvalg button')].pop(); if (v) v.click(); await vent(30);
        krev(MS.tilstand().kort.ferdig && !mk.classList.contains('på'), 'beslutningskortet lukkes ikke');
      } else d.morgen = 'uten MorgenSpill/Kortkø';
      if (LL && LL.velkommen && window.SelskapSpill && SelskapSpill.vis) {
        LL.test = true; LL.velkommen({ nå: { dag: 1, klokke: '06:30' }, viktige: [{ dag: 1, klokke: '06:20', tekst: 'Vakt: prøvemelding' }], antall: 1 }); krev(LL.vist(), 'Velkommen tilbake vises ikke uten panel'); LL.lukkVelkommen(false);
        SelskapSpill.vis(true); await vent(50);
        LL.velkommen({ nå: { dag: 1, klokke: '06:30' }, viktige: [{ dag: 1, klokke: '06:20', tekst: 'Vakt: prøvemelding' }], antall: 1 }); await vent(50);
        d.velkommenUnderPanel = LL.vist(); krev(!LL.vist(), 'Velkommen tilbake la seg oppå Selskapet-panelet');
        SelskapSpill.vis(false); for (let i = 0; i < 20 && !LL.vist(); i++) await vent(100);
        d.kortOppe = ['formkort', 'krigkort', 'morgenkort'].filter(id => { const e = document.getElementById(id); return e && e.classList.contains('på'); });
        krev(LL.vist(), 'Velkommen tilbake kom ikke etter at Selskapet ble lukket'); LL.lukkVelkommen(false);
      }
      // ---------- 4) farten ----------
      if (window.FlytSpill && FlytSpill.valg) krev(FlytSpill.valg().bygg !== true, 'ferdige bygg senker farten som standard');
    } catch (e) { feil.push('unntak: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
    finally {
      // alt tilbake
      if (SS.advarsel && SS.advarsel()) { const av = document.querySelector('[data-advarsel=avbryt]'); if (av) av.click(); }
      ENHETER.length = 0; ENHETER.push(...enh0); INFRA.tettsted.length = 0; INFRA.tettsted.push(...tett0); TETTSTEDER.delete('kr-belte'); TETTSTEDER.delete('kr-mål');
      if (KS && KS.T && vern0 !== null) { const V = KS.T().vern; for (const k of Object.keys(V)) delete V[k]; Object.assign(V, JSON.parse(vern0)); }
      SS.test = test0.st; SS.ruteTest = test0.rt; StortKjøp.test = test0.sk; if (KS && test0.ks !== null) KS.test = test0.ks; if (SS.glemRuter) SS.glemRuter();
      if (!åpen0 && SS.erÅpen()) SS.lukk();
      if (MS && mt0) { [MS.test, MS.køTest] = mt0; const mk = document.getElementById('morgenkort'); if (mk) mk.classList.remove('på'); if (window.Kortkø) Kortkø.ferdig('morgenkort');
        if (morgen0 && MS.tilstand()) { const M0 = JSON.parse(morgen0), M1 = MS.tilstand(); for (const k of Object.keys(M1)) delete M1[k]; Object.assign(M1, M0); } }
      if (LL) { LL.test = ll0; if (LL.vist && LL.vist()) LL.lukkVelkommen(false); } if (window.SelskapSpill && SelskapSpill.vis) SelskapSpill.vis(false);
      { const b = document.getElementById('stortkjop'); if (b) b.remove(); }
      const p = OS.tilstand().penger; if (p > penger0) OS.betal(p - penger0); else if (p < penger0) OS.gi(penger0 - p);
      tid = tid0; tempo = tempo0; Object.assign(kam, kam0); valgt = valgt0; skitten = true;
    }
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : 'marsjruta i bekreftelsen, store kjøp bekreftes, ett kort om gangen, velkomsten venter', data: d };
  }, profil),
};
