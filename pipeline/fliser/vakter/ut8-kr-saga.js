// Vakt for pakka «kr-saga» (28. nov, kritikeren Ingrid Sæther: produksjon og varekontrakter). Setter alt tilbake.
//  1) SAGA OG FOLK: «+» på Maskiner i Selskap → Produksjon lagres straks i leiren (før var det borte etter en omlasting, så saga sto
//     uten folk); flyttes folk bort fra «Maskiner», sier loggen det («Sagbruket mister folk …» / «Sagbruket står: … ingen igjen»), raden
//     sier hvorfor saga venter, og etter 45 spillminutter uten folk kommer en påminnelse og en varselbrikke.
//  2) TILBUDENE regner med det saga faktisk laget: en saga som står, «gir» ikke 26,4 m³ per døgn.
//  3) KJØPSAVTALE MED FULLT LAGER: kortet sier «Lageret er fullt» og krever et ekstra trykk («Ja, inngå likevel»); døgnets levering
//     som ikke får plass, betales ikke («ingenting levert, ingenting betalt»).
//  4) RIVAL: en leveranse til et sted en rival holder, er merket «holdes av …» og ikke «rolig».
module.exports = {
  navn: 'saga, folk og varekontrakter (kr-saga)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = {}, L = window.LeirSpill && LeirSpill.tilstand(), F = window.FolkSpill && FolkSpill.tilstand(), S = window.OppstartSpill && OppstartSpill.tilstand();
      if (!L || !F || !S || !window.ProduksjonSpill || !window.Produksjon || !window.VareSpill || !window.Vare || !window.SelskapSpill || !window.Selskap || typeof sim !== 'function') return { mangler: true };
      const vent = ms => new Promise(r => setTimeout(r, ms));
      const bygg0 = L.bygg.slice(), lager0 = { ...L.lager }, opp0 = F.personer.map(p => [p.id, p.oppgave]), tid0 = tid, tempo0 = tempo, neste0 = L.neste, penger0 = S.penger;
      const nøkler = ['riksbrudd-produksjon', 'riksbrudd-k2', 'riksbrudd-selskap'], lagret = nøkler.map(k => [k, localStorage.getItem(k)]);
      const SKS = SelskapSpill.tilstand(), sel0 = SKS ? JSON.stringify(SKS) : null, åpen0 = window.SelskapetSpill && SelskapetSpill.erÅpen && SelskapetSpill.erÅpen(), sÅpen0 = SelskapSpill.erÅpen();
      const T0 = typeof TETTSTEDER !== 'undefined' ? new Map(TETTSTEDER) : null;
      const linjer = [], logg0 = window.logg; window.logg = t => { linjer.push(String(t)); };
      try {
        tempo = 0;
        const nyB = (type, dx, dy) => { const id = L.neste++; L.bygg.push({ id, type, x: S.leir.x + dx, y: S.leir.y + dy, ret: 0, igjen: 0, hp: 1, nivå: 1, pris: Leir.BYGG[type].pris, mat: {} }); return id; };
        const sid = nyB('sagbruk', 70, 70);
        F.personer.forEach(p => { if (p.oppgave === 'maskin') p.oppgave = 'fri'; });
        // to som har fri, så «+» tar dem (som kritikeren gjorde)
        F.personer.filter(p => FolkRegler.arbeidsfør(p)).slice(0, 2).forEach(p => { p.oppgave = 'fri'; });
        ProduksjonSpill.nullstill(); ProduksjonSpill.steg(.01);
        // 1a) «+» to ganger i fanen Produksjon – og leiren er lagret med dem på «maskin»
        if (window.SelskapetSpill) { SelskapetSpill.vis(true, 'produksjon'); await vent(150); }
        for (let i = 0; i < 2; i++) { const b = document.querySelector('#selskapet [data-pr="folk"][data-r="pluss"]'); if (b) b.click(); await vent(60); }
        const på = F.personer.filter(p => p.oppgave === 'maskin');
        let lagretFolk = []; try { const k2 = JSON.parse(localStorage.getItem('riksbrudd-k2')); lagretFolk = (k2.folk && k2.folk.personer || []).filter(p => p.oppgave === 'maskin').map(p => p.id); } catch (e) { lagretFolk = []; }
        ut.lagret = på.length === 2 && på.every(p => lagretFolk.includes(p.id)); ut.på = på.map(p => p.navn);
        // (ut9-kontroll) feilsøking når lagringen ikke stemmer
        if (!ut.lagret) { let k2 = null; try { k2 = JSON.parse(localStorage.getItem('riksbrudd-k2')); } catch (e) { /* */ }
          ut.lagretInfo = { sammeFolk: L.folk === F, lagretFolk, påId: på.map(p => p.id), k2Lengde: (localStorage.getItem('riksbrudd-k2') || '').length, k2Folk: !!(k2 && k2.folk), k2Ant: k2 && k2.folk && k2.folk.personer ? k2.folk.personer.length : null, FAnt: F.personer.length, erSpeil: !!(LeirSpill.erSpeil && LeirSpill.erSpeil()) }; }
        // spillerens egne «+» skal ikke gi varsel
        ProduksjonSpill.steg(.01); ut.egenStille = !linjer.some(t => /mister folk|står:/.test(t));
        // 1b) noen flytter den ene til bygg (jobbtavla, morgenmøtet, et annet panel …): loggen sier det
        await vent(5); tid += 3; på[0].oppgave = 'bygg'; ProduksjonSpill.steg(.01);
        ut.mister = linjer.find(t => /mister folk/.test(t) && t.includes(på[0].navn) && /bygg/.test(t)) || null;
        // … og den andre blir med i en tropp (er ikke i leiren lenger): saga står, ingen igjen
        tid += 3; const p2 = på[1], i2 = F.personer.indexOf(p2); F.personer.splice(i2, 1); ProduksjonSpill.steg(.01);
        ut.står = linjer.find(t => /står:/.test(t) && t.includes(p2.navn) && /ingen igjen/.test(t)) || null;
        F.personer.splice(i2, 0, p2);
        // hvorfor-teksten i raden
        p2.oppgave = 'bygg'; ProduksjonSpill.steg(.01);
        ut.hvorfor = ProduksjonSpill.hvorforFolk(L.bygg.find(b => b.id === sid));
        // 1c) påminnelse og varselbrikke etter 45 spillminutter uten folk
        for (let i = 0; i < 6; i++) { tid += 10; ProduksjonSpill.steg(.5); }
        ut.påminnelse = linjer.find(t => /har stått i .* ingen på «Maskiner»/.test(t)) || null;
        ut.brikke = (window.VARSEL_TILLEGG || []).some(fn => { try { return (fn() || []).some(b => /står: ingen folk/.test(b.t)); } catch (e) { return false; } });
        // 2) tilbudene: saga står (ingen folk) – «står nå», ikke «gir 26,4 m³ per døgn»
        const SK = SelskapSpill.tilstand(), sd = SK.sider.blå, tilbud0 = SK.tilbud.slice(), aktive0 = sd.aktive.slice();
        const o = { steder: [{ navn: 'Prøvebygd', x: S.leir.x + 6000, y: S.leir.y, slag: 'tettsted', id: 'prøve-kr' }], verdi: VareSpill.verdi(), leir: S.leir };
        const kl = Vare.lagEtt(SK, 'blå', 'lever', tid, o, 'tre', 'Storlia Tømmer');
        const kortL = kl ? VareSpill.kort(kl, false, {}) : '';
        ut.tilbud = !!kl && /står nå|laget ingenting/.test(kortL) && !/sagbruket gir/.test(kortL); ut.tilbudTekst = (kortL.match(/Dere har[^<]*/) || [''])[0];
        // 4) rival: stedet holdes av en motstander
        if (typeof TETTSTEDER !== 'undefined' && kl) { TETTSTEDER.set('prøve-kr', { eier: 'rød', inntar: null }); const kr = VareSpill.kort(kl, false, {});
          ut.rival = !!kl.rival && /holdes av/.test(kr) && !/rolig/.test(kr); TETTSTEDER.delete('prøve-kr'); } else ut.rival = true;
        // 3) kjøpsavtale med fullt lager
        L.lager.tømmer = Leir.lagerplass(L); if (window.VarelagerSpill && VarelagerSpill.avstem) VarelagerSpill.avstem();
        const kk = Vare.lagEtt(SK, 'blå', 'kjøp', tid, o, 'tømmer', 'Storlia Tømmer'); SK.tilbud = [kk]; sd.aktive = [];
        const k1 = VareSpill.kort(kk, false, {});
        const boks = document.createElement('div'); boks.innerHTML = k1; document.body.appendChild(boks); const vb = boks.querySelector('[data-s="varebekreft"]'); if (vb) vb.click(); boks.remove();
        const k2 = VareSpill.kort(kk, false, {});
        ut.sperre = /Lageret er fullt/.test(k1) && !!vb && !/data-s="ta"/.test(k1) && /Ja, inngå likevel/.test(k2) && /data-s="ta"/.test(k2);
        const g = Selskap.godta(SK, 'blå', kk.id, tid, () => .99); const pFør = S.penger;
        const hend = Selskap.steg(SK, 'blå', tid + 1, 1, { [kk.id]: VareSpill.mål(kk) }); for (const h of hend) VareSpill.hendelse(h);
        ut.ikkeBetalt = !(g && g.feil) && S.penger === pFør && linjer.some(t => /lageret var fullt – ingenting levert, ingenting betalt/.test(t));
        ut.kjøpTekst = linjer.filter(t => /Storlia/.test(t)).slice(-1)[0] || null;
        SK.tilbud = tilbud0; sd.aktive = aktive0;
      } finally {
        window.logg = logg0;
        L.bygg = bygg0; L.neste = neste0; Object.assign(L.lager, lager0); for (const k of Object.keys(L.lager)) if (!(k in lager0)) delete L.lager[k];
        for (const [id, o] of opp0) { const p = F.personer.find(q => q.id === id); if (p) p.oppgave = o; }
        tid = tid0; tempo = tempo0; S.penger = penger0; ProduksjonSpill.nullstill();
        if (sel0 && SelskapSpill.sett) try { SelskapSpill.sett(JSON.parse(sel0)); } catch (e) { /* */ }
        if (T0 && typeof TETTSTEDER !== 'undefined') { TETTSTEDER.clear(); for (const [k, v] of T0) TETTSTEDER.set(k, v); }
        if (window.VarelagerSpill && VarelagerSpill.avstem) VarelagerSpill.avstem();
        if (window.SelskapetSpill && !åpen0) SelskapetSpill.vis(false); if (!sÅpen0 && SelskapSpill.erÅpen()) SelskapSpill.vis(false);
        for (const [k, v] of lagret) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* */ } }
        skitten = true;
      }
      ut.linjer = linjer.slice(-8);
      return ut;
    });
    if (d.mangler) return { ok: false, tekst: 'kr-saga mangler (ProduksjonSpill, VareSpill, SelskapSpill, Selskap eller sim)', data: d };
    const del = ['lagret', 'egenStille', 'mister', 'står', 'påminnelse', 'brikke', 'tilbud', 'rival', 'sperre', 'ikkeBetalt'], feil = del.filter(k => !d[k]);
    if (!/ingen på «Maskiner»|bygg/.test(d.hvorfor || '')) feil.push('hvorfor');
    return { ok: !feil.length, tekst: feil.length ? 'feilet: ' + feil.join(', ') + ' ' + JSON.stringify({ hvorfor: d.hvorfor, tilbud: d.tilbudTekst, kjøp: d.kjøpTekst, linjer: d.linjer })
      : `«+» på Maskiner lagres, «${d.mister}», «${d.står}», påminnelse og brikke, tilbudet «${d.tilbudTekst}», rivalens sted merket, fullt lager må bekreftes og betales ikke (${profil})`, data: d };
  },
};
