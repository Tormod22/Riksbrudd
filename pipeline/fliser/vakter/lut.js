// VAKT for pakka «lut» (18. nov kveld, brukeren: «finne lut inni hus – brunost, saft, rifle, ammunisjon …» og «inventar systemet til
// project zomboid»): beholdere i et prøvehus (knappen «Åpne kjøleskapet», panelet, fanen), flytting med trykk på begge sider, våpen i
// beltet og lading, ingen plass i sekken, ferskhet (fersk, råtten, spoling), at maten fyller sult og råtten mat gir dårlig helse, og at
// tung last gjør deg treg (og svært tung: ingen løping). Uten 3D prøves reglene med en beholder laget for vakten. Alt settes tilbake.
module.exports = {
  navn: 'lut og beholdere',
  kjør: async (pg, profil) => {
    const data = await pg.evaluate(async () => {
      const d = { feil: [] }, krev = (b, t) => { if (!b) d.feil.push(t); }, DAG = 1440;
      if (!window.LutSpill || !LutSpill.klar() || !window.UtstyrSpill || !UtstyrSpill.klar() || !window.KarakterSpill || !KarakterSpill.klar()) { d.feil.push('LutSpill, sekken eller karakteren er ikke klar'); return d; }
      const LS = LutSpill, I = UtstyrSpill.tilstand(), B = KarakterSpill.T().behov, K = SpilletSpill.K();
      const før = { I: JSON.stringify(I), S: JSON.stringify(LS.S()), B: { ...B }, hp: K.hp, tid, lagret: {}, ekstra: Utstyr.ekstraVekt };
      for (const k of ['riksbrudd-lut', 'riksbrudd-utstyr', 'riksbrudd-karakter', 'riksbrudd-mobler']) før.lagret[k] = localStorage.getItem(k);
      const mFør = window.MoblerSpill && MoblerSpill.klar() ? JSON.stringify({ F: MoblerSpill.F(), b: MoblerSpill.bæres() }) : null;
      // i 3D: vent litt hvis et utsnitt bygges (en tidligere vakt kan ha flyttet kameraet)
      for (let q = 0; q < 60 && typeof på3d !== 'undefined' && på3d && typeof R3 !== 'undefined' && R3 && R3.bygger; q++) await new Promise(r => setTimeout(r, 200));
      const i3d = typeof på3d !== 'undefined' && på3d && typeof R3 !== 'undefined' && R3 && R3.ut && !R3.bygger; d.i3d = !!i3d;
      let P = null, nøkler = [], o = null, husFør, gikk = false; const pn = document.getElementById('lutpanel');
      const pek = (el, type) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: 5, clientY: 5, pointerId: 7, button: 0 }));
      const trykk = el => { pek(el, 'pointerdown'); pek(el, 'pointerup'); };
      try {
        // tingene finnes i sekkens tabeller (og kan ikke kjøpes), jaktrifla er et våpen
        krev(Utstyr.TING.brunost && Utstyr.TING.brunost.del && Utstyr.TING.saft && Utstyr.TING.v_jaktrifle && Utstyr.VÅPEN.jaktrifle && Utstyr.VÅPEN.jaktrifle.selges === false, 'lut-tingene mangler i sekkens tabeller');
        // sekken nullstilles til start: gevær og pistol, litt ammunisjon; tursekk på ryggen
        I.våpen.length = 0; I.våpen.push({ id: 'gevær', mag: 30 }, { id: 'pistol', mag: 15 }); I.aktiv = 0; for (const k of Object.keys(I.ting)) delete I.ting[k]; Object.assign(I.ting, { a556: 30, a9: 15 });
        LS.settS({ rygg: 'tursekk', dato: {}, b: {}, gulv: [], strømAv: null }); K.hp = 100;
        let c = null;
        if (i3d) {
          // PRØVEHUSET (som i vakten «interiør»): 10 × 8 m, dør midt på sørveggen
          const u = R3.ut, R = R3, x0 = 40, y0 = 60; P = [[x0, y0], [x0 + 10, y0], [x0 + 10, y0 + 8], [x0, y0 + 8]]; P.bygg = { i: 4242, t: 0, h: 6, kl: 'hus' };
          P.dør = { x: x0 + 5, y: y0, ux: 1, uy: 0, w: 1, hh: 2.1, z0: (hoyde3d(u.cx + x0 + 5, u.cy + y0 + 4, u) - u.h0) * R.EX };
          husFør = u.hus; o = { P }; if (!u.hus) u.hus = { omriss: [] };
          for (let a = Math.floor(x0 / 20); a <= Math.floor((x0 + 10) / 20); a++) for (let q = Math.floor(y0 / 20); q <= Math.floor((y0 + 8) / 20); q++) { const k = a + ',' + q; if (!R.hindre.has(k)) R.hindre.set(k, []); R.hindre.get(k).push(o); nøkler.push(k); }
          gikk = !!R.fot; if (!gikk) Gange.start();
          const sett = (x, y, a) => { R.bane.x = x; R.bane.y = y; const k = Gange.kropp(); k.x = x; k.y = y; k.vx = k.vy = 0; k.z = P.inne ? P.inne.gulv : (hoyde3d(u.cx + x, u.cy + y, u) - u.h0) * R.EX; R.fot.a = a; R.fot.pitch = 0; };
          sett(x0 + 5, y0 + 1, 0); for (let q = 0; q < 12; q++) Interior3d.oppdater(true);
          const kj = P.inne && P.inne.møbler.find(m => m.type === 'kjøleskap'); krev(!!kj, 'prøvehuset har ikke kjøleskap');
          if (kj) { const dx = x0 + 5 - kj.x, dy = y0 + 4 - kj.y, l = Math.hypot(dx, dy); sett(kj.x + dx / l, kj.y + dy / l, 0); for (let q = 0; q < 3; q++) { Interior3d.oppdater(true); KROKER.ramme3d.forEach(f => f(R)); } LS.oppdaterKnapp();
            const kn = document.getElementById('lutknapp'); d.knapp = kn.textContent; krev(kn.classList.contains('på') && /Åpne kjøleskapet/.test(kn.textContent), 'knappen «Åpne kjøleskapet (E)» kom ikke ved kjøleskapet');
            d.beholdere = LS.beholdere().map(q => q.fane); krev(d.beholdere.includes('Kjøleskap') && d.beholdere.includes('Gulvet'), 'kjøleskapet eller gulvet mangler i lista');
            kn.click(); krev(pn.classList.contains('på') && /Kjøleskap/.test(pn.querySelector('.faner button.på') ? pn.querySelector('.faner button.på').textContent : ''), 'panelet åpnet ikke med kjøleskapet');
            c = LS.aktiv(); }
        } else {
          // uten 3D: en beholder laget for vakten (samme regler)
          c = { nk: '4242:kjøleskap:0', type: 'kjøleskap', navn: 'kjøleskapet', tittel: 'Kjøleskap', fane: 'Kjøleskap', kg: 25, kald: true, P: { bygg: { i: 4242 } }, B: Lut.ny() };
        }
        if (c) {
          // kjent innhold: en fersk og en råtten melk (kjøleskap: [alder, når den kom inn]), brunost, jaktrifle og patroner
          const nå = tid; c.B.t = { melk: 2, brunost: 1, v_jaktrifle: 1, a762: 20 }; c.B.d = { melk: [[0, nå], [12 * DAG, nå]], brunost: [[0, nå]] }; LS.endretInnhold(c); LS.vis(true);
          if (i3d) { const rader = [...pn.querySelectorAll('.side[data-side="der"] .rad')].map(r => r.textContent); d.rader = rader;
            krev(rader.some(t => /1 × Melk/.test(t) && !/råtten/.test(t)) && rader.some(t => /1 × Melk.*råtten/.test(t)) && rader.some(t => /20 × 7,62 mm/.test(t)), 'radene viser ikke ferskheten eller stablene («20 × 7,62 mm»)');
            // trykk brunosten, så trykk på din side: den flyttes
            const r = pn.querySelector('.side[data-side="der"] .rad[data-id="brunost"]'); trykk(r); krev(!!pn.querySelector('.rad.valgt[data-id="brunost"]'), 'trykket valgte ikke brunosten');
            trykk(pn.querySelector('.side[data-side="deg"] .liste')); krev(I.ting.brunost === 1 && !c.B.t.brunost && !!pn.querySelector('.side[data-side="deg"] .rad[data-id="brunost"]'), 'trykk på den andre siden flyttet ikke brunosten');
            // høyreklikk gir valgene
            const rr = pn.querySelector('.side[data-side="deg"] .rad[data-id="brunost"]'); rr.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
            d.valg = [...pn.querySelectorAll('.detalj .valg button')].map(b => b.textContent); krev(d.valg.includes('Spis') && d.valg.some(t => /Legg i kjøleskap/.test(t)), 'valgene for brunosten mangler (Spis, Legg i …)');
          } else { LS.taFra(c, 'brunost', 'fersk', 1); krev(I.ting.brunost === 1, 'brunosten ble ikke tatt med'); }
          // å spise: sult opp; råtten mat gir dårlig helse
          B.sult = 30; krev(LS.spis(null, 'brunost', 'fersk') && B.sult === 55 && !I.ting.brunost, 'brunosten fylte ikke sulten (+25)');
          const hp0 = K.hp; B.tørst = 50; krev(LS.spis(c, 'melk', 'råtten') && K.hp === hp0 - 12 && c.B.t.melk === 1, 'råtten melk gir ikke −12 helse');
          // våpen i beltet, patroner i sekken og lading
          krev(LS.taFra(c, 'v_jaktrifle', null, 1) === 1 && I.våpen.length === 3 && I.våpen[2].id === 'jaktrifle' && I.våpen[2].mag === 0, 'jaktrifla kom ikke i beltet');
          krev(LS.taFra(c, 'a762', null, 20) === 20 && I.ting.a762 === 20 && LS.lad('a762') && I.våpen[2].mag === 4 && I.ting.a762 === 16, 'jaktrifla ble ikke ladet fra sekken');
          // ferskhet: den ferske melka i sekken (uten kjøleskap) er råtten etter ti døgn
          krev(LS.taFra(c, 'melk', 'fersk', 1) === 1 && Lut.stabler({ t: I.ting, d: LS.S().dato }, tid).find(q => q.id === 'melk').st === 'fersk', 'den ferske melka er ikke fersk i sekken');
          tid = før.tid + 10 * DAG; d.melk10 = (Lut.stabler({ t: I.ting, d: LS.S().dato }, tid).find(q => q.id === 'melk') || {}).st; tid = før.tid; krev(d.melk10 === 'råtten', 'melka i sekken ble ikke råtten etter ti døgn');
          // ingen plass i sekken: det som ikke får plass, blir liggende i beholderen
          I.ting.verktøy = 4; c.B.t.flaskevann = 6; d.plass = LS.bær().plass - LS.bær().tingKg; const fikk = LS.taFra(c, 'flaskevann', null, 6);
          krev(fikk === Math.floor((d.plass + 1e-9) / 1.55) && c.B.t.flaskevann === 6 - fikk && fikk < 6, `ikke plass i sekken: fikk ${fikk} av 6 flasker`);
          // legg i beholderen igjen (og tilbake til sekken)
          krev(LS.leggI(c, 'verktøy', null, 4) === 4 && !I.ting.verktøy && c.B.t.verktøy === 4, 'verktøyet ble ikke lagt i beholderen');
        }
        // RUNDE 12 (kritiker E/F): knappene inne står samlet i #inneknapper, resultatet av letingen er et panel med «Se i skapene», og den
        // åpner alle beholderne i huset (ikke bare de innen rekkevidde)
        if (i3d && P && P.inne) { LS.åpne(false);
          const rk = document.getElementById('inneknapper'); krev(!!rk && ['letknapp', 'lutknapp', 'mobelknapp', 'dorknapp'].every(id => document.getElementById(id) && document.getElementById(id).parentNode === rk), 'knappene inne står ikke samlet i #inneknapper');
          const O = LS.husOversikt(P); d.oversikt = `${O.medTing} av ${O.antall}`; krev(O.antall >= 2 && O.medTing >= 1, 'husOversikt fant ikke beholderne i prøvehuset: ' + d.oversikt);
          LeteSpill.visResultat(P, { fikk: { mat: 3, tre: 1 }, sekken: ['Deler til håndverk: 1 tau.'] }); const fp = document.getElementById('funnpanel'), ft = fp.innerText;
          krev(fp.classList.contains('på') && /3 rasjoner/.test(ft) && /leirens mat/.test(ft) && /lageret/.test(ft) && /I sekken/i.test(ft), 'resultatpanelet viser ikke hva som gikk hvor: ' + ft.replace(/\s+/g, ' ').slice(0, 140));
          const seKn = [...fp.querySelectorAll('button')].find(b => /Se i skapene/.test(b.textContent)); krev(!!seKn, '«Se i skapene» mangler i resultatpanelet');
          if (seKn) { seKn.click(); d.alle = LS.beholdere().length - 1; krev(pn.classList.contains('på') && !fp.classList.contains('på') && d.alle === O.antall, `«Se i skapene» åpnet ikke alle beholderne (${d.alle} av ${O.antall})`); }
          LS.åpne(false); LeteSpill.lukkFunn(); }
        // RUNDE 12: varselet om tørst sier «feltflaska» og har «Drikk», som drikker av flaska
        { const v0 = I.ting.vann; I.ting.vann = 2; B.tørst = 10; const v = KarakterSpill.varsler().find(q => q.id === 'tørst'); d.drikk = v ? v.råd + (v.knapp ? ' [' + v.knapp.t + ']' : '') : '(ingen varsel)';
          krev(!!v && /feltflaska/.test(v.råd) && v.knapp && v.knapp.t === 'Drikk', 'tørst-varselet har ikke «Drikk» / «drikk fra feltflaska»: ' + d.drikk);
          if (v && v.knapp) { v.knapp.f(); krev(I.ting.vann === 1 && B.tørst > 10, '«Drikk» i varselet drakk ikke av flaska'); }
          if (v0 === undefined) delete I.ting.vann; else I.ting.vann = v0; B.tørst = før.B.tørst; }
        // VEKT: tung last gjør deg treg, svært tung = ingen løping
        for (const k of Object.keys(I.ting)) delete I.ting[k]; I.våpen.length = 2; I.aktiv = 0; LS.S().rygg = 'tursekk';
        const lett = { fart: LS.fart(), løp: LS.kanLøpe() }; I.ting.verktøy = 5; const tungt = { fart: LS.fart(), status: LS.bær().status }; I.ting.verktøy = 9; const svært = { fart: LS.fart(), løp: LS.kanLøpe(), status: LS.bær().status };
        d.vekt = { lett, tungt, svært }; krev(lett.fart === 1 && lett.løp && tungt.status === 'tungt' && tungt.fart < 1 && svært.status === 'svært' && !svært.løp && svært.fart < tungt.fart, 'vekta gir ikke tungt/svært tungt');
        krev(Utstyr.vekt(I) === LS.bær().vekt && Utstyr.maks() === Lut.REGLER.bæreevne + (Utstyr.ekstraVekt || 0), 'Utstyr.vekt/maks bruker ikke lommene og sekken');
        if (i3d) {
          // gå 4 s mot sør med lett og svært tung last: kortere med tung
          const R = R3, u = R.ut, k = Gange.kropp(), ekte = performance.now.bind(performance); let t = ekte(); const gå = () => { R.bane.x = k.x = 45; R.bane.y = k.y = 50; k.vx = k.vy = 0; k.z = (hoyde3d(u.cx + 45, u.cy + 50, u) - u.h0) * R.EX; R.fot.a = Math.PI; R.fot.pitch = 0;
            performance.now = () => (t += 25); try { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' })); for (let q = 0; q < 160; q++) Gange.kamera(R); } finally { performance.now = ekte; window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' })); } return Math.hypot(k.x - 45, k.y - 50); };
          I.ting.verktøy = 9; const tung = gå(); delete I.ting.verktøy; const fri = gå(); d.gått = [Math.round(fri * 10) / 10, Math.round(tung * 10) / 10];
          krev(fri > 2 && tung < fri * .8, `tung last gjorde deg ikke tregere (${d.gått.join(' mot ')} m)`);
          // Tab lukker panelet
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); krev(!pn.classList.contains('på'), 'Tab lukket ikke panelet');
          // MØBLER (runde 5, brukeren: «Flyttbare møbler og alt»): kjøleskapet med brunost plukkes opp, bæres (ingen løping eller skyting),
          // settes ned et annet sted i huset (sperrer der), innholdet følger med, det lagres og står der når huset bygges på nytt
          if (window.MoblerSpill && MoblerSpill.klar() && P.inne) { const x0 = P[0][0], y0 = P[0][1], u = R3.ut;
            const sett = (x, y, a) => { R3.bane.x = x; R3.bane.y = y; const k = Gange.kropp(); k.x = x; k.y = y; k.vx = k.vy = 0; k.z = P.inne.gulv; R3.fot.a = a; R3.fot.pitch = -.3; };
            const MS = MoblerSpill, pl = () => P.inne, kj = pl().møbler.find(m => m.type === 'kjøleskap'), nk = kj && kj.nk;
            krev(!!nk, 'kjøleskapet har ingen møbelnøkkel');
            if (nk) { LS.endretInnhold({ nk, B: { t: { brunost: 2 }, d: { brunost: [[0, tid], [0, tid]] } } }); I.ting = I.ting || {}; for (const k of Object.keys(I.ting)) delete I.ting[k];
              const tungt = { nk, B: { t: { verktøy: 6 }, d: {} } }; LS.endretInnhold(tungt); krev(!MS.plukkOpp({ m: kj, P }) && pl().møbler.some(m => m.nk === nk), 'et kjøleskap med 27 kg i ble plukket opp (skal tømmes først)');
              LS.endretInnhold({ nk, B: { t: { brunost: 2 }, d: { brunost: [[0, tid], [0, tid]] } } });
              krev(MS.plukkOpp({ m: kj, P }) && MS.bærer() && !pl().møbler.some(m => m.nk === nk), 'kjøleskapet ble ikke plukket opp (står igjen i planen)');
              d.møbelFart = Math.round(LS.fart() * 100) / 100; krev(!LS.kanLøpe() && LS.fart() < 1 && MS.stor(), 'med kjøleskapet i armene kan du løpe / går like fort');
              const K0 = { mag: K.mag, sist: K.sist, lader: K.lader }; K.lader = 0; K.sist = 0; krev(SpilletSpill.skyt() === false, 'du kan skyte mens du bærer kjøleskapet'); Object.assign(K, K0);
              // en ledig plass minst 1,5 m fra der det sto, og stå slik at spøkelset havner der
              const b = MS.bæres(); let mål = null;
              for (let x = x0 + .5; x < x0 + 9.5 && !mål; x += .25) for (let y = y0 + .5; y < y0 + 7.5 && !mål; y += .25) { if (Math.hypot(x - kj.x, y - kj.y) < 1.5) continue; const q = { type: b.type, x, y, a: 0, b: b.b, d: b.d };
                if (!Mobler.kanSettes(pl(), q, Interior, nk).ok) continue; const smal = typeof VW !== 'undefined' && typeof VH !== 'undefined' && (VW < 700 || VW < VH), g = Mobler.foran(0, 0, 0, b, 0, 0, smal ? Mobler.REGLER.foranSmal : Mobler.REGLER.foran), px = x, py = y - g.y; if (!Interior.blokkert(pl(), px, py) && Interior.inni(P, px, py)) mål = [px, py, x, y]; }
              krev(!!mål, 'fant ingen ledig plass til kjøleskapet');
              if (mål) { b.k = 0; sett(mål[0], mål[1], 0); for (let q = 0; q < 4; q++) { KROKER.ramme3d.forEach(f => f(R3)); await new Promise(r => setTimeout(r, 130)); }
                d.spøkelse = !!MS.spøkelse() && MS.spøkelse().parent === R3.scene; krev(d.spøkelse && b.mål && b.mål.ok, 'spøkelset står ikke grønt i scenen (' + (b.mål ? b.mål.grunn : 'ingen plass') + ')');
                krev(MS.settNed() && !MS.bærer() && !MS.spøkelse(), 'kjøleskapet ble ikke satt ned');
                const ny = pl().møbler.find(m => m.nk === nk); krev(!!ny && Math.abs(ny.x - mål[2]) < .05 && Math.abs(ny.y - mål[3]) < .05, 'kjøleskapet står ikke der det ble satt');
                if (ny) { krev(Interior.blokkert(pl(), ny.x, ny.y), 'det nye stedet sperrer ikke når du går');
                  const g2 = Mobler.foran(0, 0, 0, b, 0, 0, Mobler.REGLER.foran); sett(ny.x, ny.y - g2.y, 0); const bh = LS.beholdere().find(q => q.nk === nk); krev(!!bh && bh.B.t.brunost === 2, 'innholdet (brunosten) fulgte ikke med kjøleskapet');
                  const lag = JSON.parse(localStorage.getItem('riksbrudd-mobler') || '{}'); krev(!!(lag.F && lag.F[nk] && lag.F[nk].i === P.bygg.i), 'flyttet er ikke lagret');
                  Interior3d.bygOm(P.bygg.i); const igjen = P.inne.møbler.find(m => m.nk === nk); krev(!!igjen && Math.abs(igjen.x - ny.x) < .01, 'bygget på nytt: kjøleskapet står ikke der det ble satt');
                  d.møbel = `kjøleskap ${kj.x.toFixed(1)},${kj.y.toFixed(1)} -> ${ny.x.toFixed(1)},${ny.y.toFixed(1)}`; } } } }
        }
      } catch (e) { d.feil.push('unntak: ' + e.message); }
      // sett alt tilbake
      LS.åpne(false); tid = før.tid;
      const I0 = JSON.parse(før.I); I.våpen.length = 0; I.våpen.push(...I0.våpen); I.aktiv = I0.aktiv; for (const k of Object.keys(I.ting)) delete I.ting[k]; Object.assign(I.ting, I0.ting);
      LS.settS(JSON.parse(før.S)); Object.assign(B, før.B); K.hp = før.hp; Utstyr.ekstraVekt = før.ekstra;
      if (mFør) { const q = JSON.parse(mFør); MoblerSpill.settTilstand(q.F, q.b); }
      if (P) { const R = R3; for (const k of nøkler) { const A = R.hindre.get(k), q = A ? A.indexOf(o) : -1; if (q >= 0) A.splice(q, 1); } R.ut.hus = husFør; if (!gikk) Gange.stopp(); Interior3d.oppdater(true); }
      LS.lagreNå(); for (const [k, v] of Object.entries(før.lagret)) { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }
      UtstyrSpill.vis(); return d;
    });
    const ok = !data.feil.length;
    return { ok, tekst: ok ? `${data.i3d ? `«${data.knapp}» i prøvehuset, panelet med ${(data.beholdere || []).join(' og ')}, trykk-flytt, valg (${(data.valg || []).slice(0, 3).join(', ')} …), gått ${(data.gått || []).join(' mot ')} m lett/tungt${data.møbel ? `, møbel flyttet (${data.møbel}, fart ${data.møbelFart} i armene)` : ''}` : 'uten 3D (bare reglene)'}; brunost mettet, råtten melk −12 helse, jaktrifle i beltet og ladet, melka råtten etter ti døgn, sekken full, tungt ${data.vekt ? data.vekt.tungt.fart.toFixed(2) : '?'} / svært tungt uten løping${data.alle !== undefined ? `, «Se i skapene» åpnet ${data.alle} beholdere (${data.oversikt} med ting)` : ''}, varselet: ${data.drikk} (${profil})` : data.feil.join('; '), data };
  },
};
