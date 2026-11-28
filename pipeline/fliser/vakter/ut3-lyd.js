// VAKT «lyd i 2D» (fase Ø4, spill/lyd2d.js): de riktige hendelsene gir de riktige lydene (lest fra Lyd2d.sjekk().siste), lydene har
// faktisk lyd i seg (OfflineAudioContext, rms > 0), maskinene høres bare zoomet inn på leiren, ☰ «Kartlyd»/«Meldingslyd» står under
// «Bilde og lyd» og blar gjennom trinnene, og ☰ «Lyd» av demper. Alt settes tilbake (kassa, kameraet, valgene, ☰ «Lyd»).
// NB: kassaapparatet og klunket prøves med OppstartSpill.betal + gi av samme beløp (kassa er lik etterpå, men dagboka har de to postene).
module.exports = {
  navn: 'lyd i 2D (radio, alarm, kasse, telefon, maskiner, ☰)',
  kjør: async (pg) => {
    const r = await pg.evaluate(async () => {
      const feil = [], data = {}, vent = ms => new Promise(r => setTimeout(r, ms));
      if (!window.Lyd2d || !Lyd2d.sjekk) return { feil: ['Lyd2d mangler'], data };
      const valgFør = { ...Lyd2d.sjekk().valg }, kamFør = { x: kam.x, y: kam.y, m: kam.m }, var3d = typeof på3d !== 'undefined' && på3d;
      let lydKnappAv = false;
      try {
        if (var3d && typeof slå3d === 'function') { slå3d(false); await vent(300); }
        Lyd.start(); Lyd2d.velg('kart', 'lav'); Lyd2d.velg('meld', 'middels'); Lyd2d.nullstill(); await vent(100);
        const sisteNavn = () => Lyd2d.sjekk().siste[0];
        // (fiksb) et nummer per kjøring i tekstene, så loggdemp.js ikke slår dem sammen med samme tekst fra en kjøring like før
        const nr = Math.floor(Math.random() * 1e6);
        const lag = ENHETER.find(s => s.side === 'blå' && !s.ai && !s.karakter && s.navn);
        if (!lag) feil.push('ingen egne lag å prøve radioen med');
        else {
          // radio: et lag melder; ordre: «planlegger rute» (det ordre() skriver); sus: ingen radiokontakt
          logg(`${lag.navn}: ordren er mottatt (lydvakt).`); await vent(20);
          const a = sisteNavn(); if (!a || a.navn !== 'radio') feil.push('en melding fra et lag ga ikke radio: ' + JSON.stringify(a));
          // (28. nov, fiksb) ordren gis med selve ordre() – lyd2d lytter på kallet. Før skrev vakta «planlegger rute …» i loggen, men
          // loggdemp.js holder den linja igjen når laget fikk en ordre for under 3 min siden (det skjer i full kontroll), og da kom ingen lyd.
          // Laget settes tilbake etterpå (ruta, planleggingen, hvor langt det var kommet).
          const lagFør = { x: lag.x, y: lag.y, sti: lag.sti, planlegger: lag.planlegger, timerIgjen: lag.timerIgjen, prog: lag.prog, seg: lag.seg, steg: lag.steg, kø: lag.kø, køSlutt: lag.køSlutt, køSiste: lag.køSiste };
          // (svaret fra ordren – «marsj 0,1 km» – kan komme før vi ser etter, så ordrelyden letes etter blant lydene etter kallet)
          Lyd2d.nullstill(); const topp = Lyd2d.sjekk().siste[0], po = ordre(lag, lag.x + 60, lag.y + 40, false); await vent(20);
          const etter = (l => { const i = l.indexOf(topp); return i < 0 ? l : l.slice(0, i); })(Lyd2d.sjekk().siste), b = etter.find(x => x.navn === 'ordre') || etter[0];
          if (!b || b.navn !== 'ordre') feil.push('en ordre ga ikke ordrelyden: ' + JSON.stringify(b));
          logg(`${lag.navn}: marsj 1,2 km, ca. 0,3 t. (lydvakt ${nr})`); await vent(20);
          const c = sisteNavn(); if (!c || c.navn !== 'radio' || c.spilt !== false || c.grunn !== 'svar på ordren') feil.push('svaret på ordren skulle vært stille: ' + JSON.stringify(c));
          try { await Promise.race([po, vent(8000)]); } catch (e) { /* ruta trengs ikke */ }
          for (const [k, v] of Object.entries(lagFør)) { if (v === undefined) delete lag[k]; else lag[k] = v; } lag.siktSkitten = true;
          Lyd2d.nullstill(); logg(`${lag.navn}: ingen radiokontakt – ordren når ikke fram (lydvakt ${nr}).`); await vent(20);
          const d = sisteNavn(); if (!d || d.navn !== 'stille') feil.push('ingen kontakt ga ikke sus: ' + JSON.stringify(d));
          // samme lyd rett etter: holdes igjen (ingen ny lyd i det hele tatt – loggdemp.js holdt linja igjen – er også stille)
          logg(`${lag.navn}: ingen radiokontakt – ordren når ikke fram (lydvakt ${nr}).`); await vent(20);
          const e = sisteNavn(); if (e !== d && (!e || e.spilt !== false)) feil.push('samme lyd to ganger på rad ble ikke holdt igjen');
        }
        const n0 = Lyd2d.sjekk().teller.radio || 0; logg('Ravnsund har tatt et tettsted (lydvakt).'); await vent(20);
        if ((Lyd2d.sjekk().teller.radio || 0) !== n0) feil.push('en melding som ikke er fra dine lag ga radio');
        // alarm
        Lyd2d.nullstill(); window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type: 'alarm', tekst: 'lydvakt' } })); await vent(20);
        if ((sisteNavn() || {}).navn !== 'alarm') feil.push('alarmen kom ikke');
        // penger: klunk ved store utgifter, kasse ved inntekt (samme beløp tilbake)
        const kr0 = OppstartSpill.tilstand().penger, beløp = Math.max(Lyd2d.REGLER.klunkFra, Lyd2d.REGLER.kasseFra);
        if (kr0 >= beløp) {
          Lyd2d.nullstill(); OppstartSpill.betal(beløp); const k1 = sisteNavn(); OppstartSpill.gi(beløp); const k2 = sisteNavn();
          if (!k1 || k1.navn !== 'klunk') feil.push('en stor utgift ga ikke klunk: ' + JSON.stringify(k1));
          if (!k2 || k2.navn !== 'kasse') feil.push('inntekten ga ikke kassaapparat: ' + JSON.stringify(k2));
          if (OppstartSpill.tilstand().penger !== kr0) feil.push('kassa ble ikke som før');
          const T0 = { ...Lyd2d.sjekk().teller }; Lyd2d.nullstill(); OppstartSpill.betal(100); OppstartSpill.gi(100); const T1 = Lyd2d.sjekk().teller;
          if ((T1.kasse || 0) !== (T0.kasse || 0) || (T1.klunk || 0) !== (T0.klunk || 0)) feil.push('100 kr ga pengelyd');
        } else feil.push('for lite i kassa til å prøve pengelyden');
        // telefon: en by ber om hjelp, og Storlia-kortet
        Lyd2d.nullstill(); window.dispatchEvent(new CustomEvent('riksbrudd-telefon', { detail: { tekst: 'lydvakt' } })); await vent(20);
        if ((sisteNavn() || {}).navn !== 'telefon') feil.push('telefonen ringte ikke');
        Lyd2d.nullstill(); const kort = document.createElement('div'); kort.id = 'storliakort'; kort.hidden = true; document.body.appendChild(kort); await vent(30); kort.remove();
        if ((sisteNavn() || {}).navn !== 'telefon' || sisteNavn().hva !== 'Storlia Tømmer') feil.push('Storlia-kortet ga ikke telefon');
        // maskinene: zoomet inn på leiren høres de, zoomet ut ikke
        const S = OppstartSpill.tilstand(); Lyd2d.test = { maskiner: { sag: 1, kjele: 1 } };
        kam.x = S.leir.x; kam.y = S.leir.y; kam.m = 1; Lyd2d.steg(); await vent(900); Lyd2d.steg();
        const inn = Lyd2d.sjekk(); data.inne = inn.nivå;
        if (!(inn.nivå.nær > .9 && inn.nivå.maskiner.sag === 1)) feil.push('maskinene høres ikke zoomet inn: ' + JSON.stringify(inn.nivå.maskiner) + ' nær ' + inn.nivå.nær);
        if (inn.nivå.lyd && !(inn.nivå.lyd.sagBånd > 0 || inn.nivå.lyd.sagMotor > 0)) feil.push('saga har ingen lyd i kanalen');
        kam.m = 20; Lyd2d.steg(); const ute = Lyd2d.sjekk(); data.ute = ute.nivå.maskiner;
        if (ute.nivå.nær !== 0 || ute.nivå.maskiner.sag !== 0) feil.push('maskinene høres zoomet ut');
        Lyd2d.test = null;
        // lydene har lyd i seg
        data.måle = {}; for (const n of Lyd2d.LYDER) { const m = await Lyd2d.måle(n, 3); data.måle[n] = m ? +m.rms.toFixed(4) : null; if (m && !(m.rms > 1e-4 && m.topp < 1)) feil.push(`lyden ${n} er tom eller for sterk`); }
        // ☰: knappene står under «Bilde og lyd» og blar
        const sek = [...document.querySelectorAll('#lagmeny section')].find(s => s.contains(document.getElementById('lyd-kart')));
        data.gruppe = sek ? sek.querySelector('h3').firstChild.textContent : null;
        if (!sek || !sek.contains(document.getElementById('vis-lyd')) || !sek.contains(document.getElementById('lyd-meld'))) feil.push('Kartlyd/Meldingslyd står ikke sammen med Lyd i menyen: ' + data.gruppe);
        const bk = document.getElementById('lyd-kart'); bk.click(); const t1 = Lyd2d.sjekk().valg.kart, l1 = JSON.parse(localStorage.getItem('riksbrudd-lydnivå') || '{}').kart;
        if (t1 !== 'middels' || l1 !== 'middels' || !/Middels/.test(bk.textContent)) feil.push('Kartlyd blar ikke (lav -> middels): ' + t1 + ' ' + bk.textContent);
        // ☰ «Lyd» av: lydene føres, men spilles ikke
        const vl = document.getElementById('vis-lyd'); if (Lyd.på()) { vl.click(); lydKnappAv = true; }
        Lyd2d.nullstill(); Lyd2d.hør('kasse'); const av = sisteNavn(); if (!av || av.spilt !== false || av.grunn !== 'dempet') feil.push('☰ «Lyd» av demper ikke: ' + JSON.stringify(av));
        data.sjekk = { startet: Lyd2d.sjekk().startet, kanaler: Lyd2d.sjekk().kanaler, tilstand: Lyd.sjekk().tilstand };
      } catch (e) { feil.push('unntak: ' + e.message); }
      finally {
        if (lydKnappAv) document.getElementById('vis-lyd').click();
        Lyd2d.test = null; Lyd2d.velg('kart', valgFør.kart); Lyd2d.velg('meld', valgFør.meld); Lyd2d.nullstill();
        kam.x = kamFør.x; kam.y = kamFør.y; kam.m = kamFør.m; skitten = true;
        if (var3d && typeof slå3d === 'function') slå3d(true);
      }
      return { feil, data };
    });
    return { ok: r.feil.length === 0, tekst: r.feil.length ? r.feil.join('; ') : `radio, ordre, sus, alarm, kasse, klunk og telefon på riktige hendelser; maskinene bare zoomet inn; ☰ under «${r.data.gruppe}»`, data: r.data };
  },
};
