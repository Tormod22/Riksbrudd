// Vakt for pakka «folk» (nattarbeidet 18. nov): samfunnet i leiren – personkort, flyktninger, spesialister, barn og gamle, Grålungen,
// lover, forrædere, opplæring, begravelser, flere trinn i forfallet, romtyper i byggesettet og varselkortet fra kameravakta.
// Setter alt tilbake (folket, samfunnet, testbryteren, lagringen).
module.exports = {
  navn: 'samfunnet i leiren (folk som personer)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = {}, SS = window.SamfunnSpill, SR = window.Samfunn, FR = window.FolkRegler;
      if (!SS || !SR || !FR || !window.FolkSpill || !FolkSpill.tilstand() || !SS.tilstand()) return { mangler: true };
      const F = FolkSpill.tilstand(), L = LeirSpill.tilstand(), f0 = JSON.stringify(F), test0 = SS.test, romBruk0 = L.romBruk, fast = v => () => v;
      const åpenFolk = document.getElementById('folkmeny').classList.contains('på');
      try {
        // i testene sover samfunnet: valgene til folket er uendret
        SS.test = false; const g = FolkSpill.grunn(), v0 = FolkSpill.valg(); ut.sover = !SS.våken() && v0.moralTillegg === g.moralTillegg && v0.avhengige === undefined;
        SS.test = true; SS.nullstill(); const S = SS.tilstand();
        // personkortet: ansikt fra portrettmotoren, historie og ønske
        const p = F.personer[0]; SS.visPerson(p.id); const pk = document.getElementById('personkort'), img = pk.querySelector('img');
        ut.person = pk.classList.contains('på') && !!img && /^data:image\/svg/.test(img.src) && img.src.length > 4000 && pk.textContent.includes(p.navn) && /før kollapsen/.test(pk.textContent) && /Ønsker seg/.test(pk.textContent) && !/null|undefined/.test(pk.textContent);
        SS.visPerson(null); ut.personLukket = !pk.classList.contains('på');
        // flyktninger: kortet kommer, og «ta imot alle» gir folk, barn og gamle
        S.kort = { type: 'flyktninger', voksne: 2, barn: 1, gamle: 1, spes: 'lege', smittet: false, fra: 'Otta' }; SS.visKort(); const kort = document.getElementById('samfunnkort'), n0 = F.personer.length;
        ut.flyktKort = kort.classList.contains('på') && kort.querySelectorAll('button').length === 4 && /Otta/.test(kort.textContent);
        kort.querySelector('[data-valg="alle"]').click();
        ut.flykt = F.personer.length === n0 + 2 && S.avhengige.length === 2 && !S.kort && !kort.classList.contains('på') && F.personer.some(q => q.spes === 'lege');
        // barn og gamle spiser og trenger seng
        const v1 = FolkSpill.valg(), B = FR.behov(F, L, v1); ut.avhengige = v1.avhengige === 2 && B.avh === 2 && B.spiser > FR.behov(F, L, g).spiser;
        // lov: rasjonering strekker maten og senker moralen
        SR.settLov(S, F, 'rasjonering', true); const v2 = FolkSpill.valg(); ut.lov = v2.matFaktor === .75 && v2.moralTillegg <= v1.moralTillegg - 6; SR.settLov(S, F, 'rasjonering', false);
        // Grålungen og karantene
        const syk = SR.smitt(S, F, fast(0), 1, S.klokke)[0]; SR.settKarantene(S, F, true); ut.sykdom = !!syk && syk.karantene === true && !FR.arbeidsfør(syk); SR.settKarantene(S, F, false); delete syk.syk;
        // spesialist, opplæring
        const sk = SR.nySpesialist(F, fast(.5), 'skytter'); ut.spesialist = SR.harSpes(F, 'skytter') && sk.ferd.vakt === SR.REGLER.spesFerd;
        const elev = F.personer.find(q => q !== sk && (q.ferd.vakt || 0) < 1.2); const o = SR.startOpplæring(S, F, sk.id, elev.id, 'vakt'); ut.opplæring = !o.feil && elev.trener === true && S.opplæring.length === 1;
        // begravelse: arbeidet stopper en stund, moralen får et løft
        SR.død(S, 'Ola Vaktesen', 'folk', S.klokke); const u1 = SR.valg(S, F, SS.ktx()).deler['ugravlagte døde']; SR.gravlegg(S, F, 'seremoni', S.klokke); const v3 = FolkSpill.valg();
        ut.begravelse = u1 === -3 && v3.tempoFaktor < .5 && S.gravlagte.includes('Ola Vaktesen') && !!Leir.BYGG.minnesmerke;
        // forræder: avsløres og utvises
        const sp = F.personer.find(q => q !== sk && q !== elev && !q.spes); sp.spion = true; const e = SR.etterforsk(S, F, S.klokke, fast(0)); SS.visKort();
        ut.spion = e.funnet === sp && S.kort && S.kort.type === 'spion' && kort.classList.contains('på'); const n1 = F.personer.length; kort.querySelector('[data-valg="utvis"]').click(); ut.utvist = F.personer.length === n1 - 1 && !S.kort;
        // et kort med følger som varer
        SS.nyttKort('fest'); ut.kort = kort.classList.contains('på') && /fest/i.test(kort.textContent); const m0 = F.mat; F.mat = Math.max(F.mat, 20); kort.querySelector('[data-valg="0"]').click(); ut.virkning = S.virkninger.some(q => q.navn === 'Etter festen' && q.moral === 8); F.mat = m0;
        // panelet
        SS.åpne(true); const pan = document.getElementById('samfunnmeny'); ut.panel = pan.classList.contains('på') && /Lov i leiren/.test(pan.textContent) && /Grålungen/.test(pan.textContent) && pan.querySelectorAll('[data-lov]').length === 4 && !!pan.querySelector('#etterforsk') && pan.scrollWidth <= pan.clientWidth + 2; SS.åpne(false);
        // forfallet har flere trinn, byggesettet romtyper, kameravakta et varselkort
        const D = window.Overlev && Overlev.Forfall; ut.forfall = !!(D && D.MER && Object.keys(D.nyMer(0)).join() === 'mobil,butikk,veg' && OverlevSpill.matFaktor() === 1);
        ut.romtyper = !!(window.Byggesett && Byggesett.romBruk && Byggesett.byttBruk && Byggesett.romBruk().kjøkken === 0 && Byggesett.romBruk().lager === 0);
        if (window.KameravaktSpill && KameravaktSpill.varselKort) { const S0 = OppstartSpill.tilstand(); KameravaktSpill.varselKort({ kam: 1, x: S0.leir.x + 300, y: S0.leir.y, hva: 'folk', antall: 3, meter: 120, retning: 'nord' }, null); const vk = document.getElementById('kamvarsel');
          ut.kamvarsel = vk.classList.contains('på') && vk.querySelectorAll('button').length === 3 && /3 personer/.test(vk.textContent) && /300 m øst/.test(vk.textContent); KameravaktSpill.skjulVarsel(); ut.kamvarselBort = !vk.classList.contains('på'); }
        else ut.kamvarsel = ut.kamvarselBort = false;
      } catch (err) { ut.feil = String(err && err.stack || err).slice(0, 300); }
      // alt tilbake
      const g0 = JSON.parse(f0); for (const k of Object.keys(F)) delete F[k]; Object.assign(F, g0); if (romBruk0 === undefined) delete L.romBruk; else L.romBruk = romBruk0;
      SS.visPerson(null); SS.åpne(false); SS.nullstill(); SS.test = test0; try { localStorage.removeItem('riksbrudd-samfunn'); } catch (e2) { /* ok */ } if (LeirSpill.lagre) LeirSpill.lagre();
      if (åpenFolk) FolkSpill.åpne(true); FolkSpill.vis();
      ut.tilbake = JSON.stringify(FolkSpill.tilstand()) === f0 && !SS.våken() === !!navigator.webdriver;
      return ut;
    });
    if (d.mangler) return { ok: false, tekst: 'SamfunnSpill finnes ikke (eller spillet er ikke startet)', data: d };
    const krav = ['sover', 'person', 'personLukket', 'flyktKort', 'flykt', 'avhengige', 'lov', 'sykdom', 'spesialist', 'opplæring', 'begravelse', 'spion', 'utvist', 'kort', 'virkning', 'panel', 'forfall', 'romtyper', 'kamvarsel', 'kamvarselBort', 'tilbake'];
    const feil = krav.filter(k => !d[k]); if (d.feil) feil.push('feil: ' + d.feil);
    return { ok: !feil.length, tekst: feil.length ? `${profil}: mangler ${feil.join(', ')}` : `${profil}: personkort, flyktninger, barn og gamle, lov, Grålungen, spesialist, opplæring, begravelse, forræder, kort, panel, forfall, romtyper og kameravarsel virker`, data: d };
  },
};
