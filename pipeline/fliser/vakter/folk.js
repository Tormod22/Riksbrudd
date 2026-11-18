// Vakt for pakka «folk» (nattarbeidet 18. nov): samfunnet i leiren – personkort, flyktninger, spesialister, barn og gamle, Grålungen,
// lover, forrædere, opplæring, begravelser, flere trinn i forfallet, romtyper i byggesettet og varselkortet fra kameravakta.
// Runde 4: varselbrikker, sabotasje via Leir.skad, én kortkø, syke barn og gamle, spesialist fra oppdrag, portretter i Folk,
// vakta oppe i tårnet (bare når 3D er åpent), hundens regler, dekning bak bakketopp og sløret som minikart-API.
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
        // kortkøen: mens et annet kort med valg står oppe, venter samfunnskortet
        const hd = document.getElementById('hendelse'); S.kort = { type: 'flyktninger', voksne: 1, barn: 0, gamle: 0, spes: null, smittet: false, fra: 'Lom' };
        if (hd && window.Kortkø) { hd.classList.add('på'); SS.visKort(); const venter = !kort.classList.contains('på') && Kortkø.åpent() === 'hendelse'; hd.classList.remove('på'); SS.visKort(); ut.kortkø = venter && kort.classList.contains('på'); } else ut.kortkø = false;
        S.kort = null; SS.visKort();
        // en rekrutt fra en by får byen i historien; fanger kan få bli (lite trofaste)
        const by = F.personer.find(q => !q.spes && q !== elev); SR.ankommet(by, 'Prøveby', fast(.9)); ut.fraBy = /Kom med handelsruta fra Prøveby/.test(SR.profil(by).historie);
        if (window.KrigSpill && KrigSpill.T && KrigSpill.T()) { const T = KrigSpill.T(), n2 = F.personer.length, t0 = T.fanger.length; T.fanger.push({ side: 'rød', n: 2, t: 0 }); const nye = SS.taFanger(T.fanger.length - 1);
          ut.fanger = !!nye && nye.length === 2 && F.personer.length === n2 + 2 && nye.every(q => q.lojal <= .35 && q.fange) && T.fanger.length === t0; } else ut.fanger = 'ingen KrigSpill';
        // panelet
        SS.åpne(true); const pan = document.getElementById('samfunnmeny'); ut.panel = pan.classList.contains('på') && /Lov i leiren/.test(pan.textContent) && /Grålungen/.test(pan.textContent) && pan.querySelectorAll('[data-lov]').length === 4 && !!pan.querySelector('#etterforsk') && pan.scrollWidth <= pan.clientWidth + 2; SS.åpne(false);
        // forfallet har flere trinn, byggesettet romtyper, kameravakta et varselkort
        const D = window.Overlev && Overlev.Forfall; ut.forfall = !!(D && D.MER && Object.keys(D.nyMer(0)).join() === 'mobil,butikk,veg' && OverlevSpill.matFaktor() === 1);
        ut.romtyper = !!(window.Byggesett && Byggesett.romBruk && Byggesett.byttBruk && Byggesett.romBruk().kjøkken === 0 && Byggesett.romBruk().lager === 0);
        if (window.KameravaktSpill && KameravaktSpill.varselKort) { const S0 = OppstartSpill.tilstand(); KameravaktSpill.varselKort({ kam: 1, x: S0.leir.x + 300, y: S0.leir.y, hva: 'folk', antall: 3, meter: 120, retning: 'nord' }, null); const vk = document.getElementById('kamvarsel');
          ut.kamvarsel = vk.classList.contains('på') && vk.querySelectorAll('button').length === 3 && /3 personer/.test(vk.textContent) && /300 m øst/.test(vk.textContent); KameravaktSpill.skjulVarsel(); ut.kamvarselBort = !vk.classList.contains('på'); }
        else ut.kamvarsel = ut.kamvarselBort = false;
        // ---------- RUNDE 4 ----------
        // varselbrikkene: Grålungen, ugravlagte døde (samfunnet) – via window.VARSEL_TILLEGG i narhud.js
        if (window.NarHud && NarHud.brikker) { const s2 = SR.smitt(S, F, fast(0), 1, S.klokke)[0]; SR.død(S, 'Ola Varselsen', 'folk', S.klokke); const B = NarHud.brikker().map(b => b.t).join('|');
          ut.varsler = /Grålungen/.test(B) && /begravelse/.test(B); if (s2) { delete s2.syk; delete s2.karantene; } S.døde = S.døde.filter(q => q.navn !== 'Ola Varselsen'); } else ut.varsler = 'ingen NarHud';
        // sabotasje gjennom Leir.skad: en byggeplass i en prøveleir ødelegges, og materialene kommer tilbake
        { const L2 = Leir.ny(); L2.lager = { tre: 0, betong: 0, stål: 0 }; L2.bygg.push({ id: 1, type: 'brakke', x: 0, y: 0, ret: 0, nivå: 1, hp: .2, igjen: 5, totalt: 10, mat: { tre: 20, betong: 4 }, nr: 1 }); const sb = SR.saboter(L2, fast(0));
          ut.sabotasje = !!sb && sb.ødelagt && !L2.bygg.length && L2.lager.tre > 0; }
        // én kortkø: et kort som venter, får plassen når samfunnskortet er lukket
        if (window.Kortkø && Kortkø.ta) { S.kort = { type: 'flyktninger', voksne: 1, barn: 0, gamle: 0, spes: null, smittet: false, fra: 'Lesja' }; SS.visKort(); let vist = 0;
          const venter = !Kortkø.ta('hendelse') && kort.classList.contains('på'); Kortkø.be('hendelse', () => { vist++; }, { tittel: 'Prøve' }); const iKø = Kortkø.venter().some(q => q.id === 'hendelse');
          S.kort = null; SS.visKort(); Kortkø.nå(); Kortkø.ferdig('hendelse'); ut.énKø = venter && iKø && vist === 1 && !Kortkø.venter().length; } else ut.énKø = false;
        // barn og gamle blir syke selv, og en syk gammel kan dø
        { const a = SR.nyAvhengig(S, fast(.5), 'gammel'); a.syk = { dag: 0, lengde: 4 }; SR.sykdomSteg(S, F, 1440, { ...SS.ktx(), auto: false }, fast(0)); ut.barnGamle = !S.avhengige.includes(a) && S.døde.some(q => q.navn === a.navn && q.hvem === 'gammel'); S.døde = []; }
        // spesialist fra et oppdrag
        { let o = null; for (let id = 900; id < 1100 && !o; id++) { const q = { id, type: 'redd', x: 0, y: 0, meter: 900, retning: 'øst' }; if (SR.oppdragSpes(q, SS.leirFrø())) o = q; }
          const pp = F.personer.find(q => !q.spes); const sp2 = o && SS.fraOppdrag(o, [pp]); ut.oppdragSpes = !!sp2 && pp.spes === SR.oppdragSpes(o, SS.leirFrø()); }
        // portretter i Folk-panelet
        { const fm = document.getElementById('folkmeny'), åpen0 = fm.classList.contains('på'); FolkSpill.åpne(true); FolkSpill.vis(); let vf = document.getElementById('visfolk'); const viste = vf && /Skjul/.test(vf.textContent); if (vf && !viste) { vf.click(); FolkSpill.vis(); }
          const n = fm.querySelectorAll('img.ansikt').length; ut.portretter = n === F.personer.length && n > 0; vf = document.getElementById('visfolk'); if (vf && !viste) vf.click(); if (!åpen0) FolkSpill.åpne(false); }
        // folk inne i byggene / oppe i tårnet (bare når 3D er åpent): vakta står 5,6 m over bakken i et prøvetårn
        if (typeof R3 !== 'undefined' && R3 && R3.ut && window.Folk3d && Folk3d.plassVed) { const u = R3.ut, b = { id: -77, type: 'vakttårn', x: u.cx + 10, y: u.cy + 10, ret: 0, nivå: 1, igjen: 0 }, pl = Folk3d.plassVed(b, 3);
          // (18. nov) tårnet står på det høyeste punktet under fotavtrykket (LeirSpill.grunn3d, «bygg i skråning») – ikke midtens høyde
          const G3 = window.LeirSpill && LeirSpill.grunn3d ? LeirSpill.grunn3d(b, u, R3) : null, bunn = G3 ? G3.topp : (hoyde3d(b.x, b.y) - u.h0) * R3.EX;
          ut.tårn = !!pl && pl.tårn && Math.abs(pl.z - (bunn + 5.65)) < 1.5; if (!ut.tårn) ut.tårnMål = { z: pl && pl.z, bunn }; } else ut.tårn = '2D';
        // hunden (regler), dekning bak bakketopp (regler) og sløret i et minikart
        { const E2 = window.Eventyr; const h = E2.Hund.fyll({ navn: 'Prøve' }); E2.Hund.steg(h, E2.REGLER.hund.sultTimer, 0, {}); const sulten = h.mett < E2.REGLER.hund.spisUnder; E2.Hund.steg(h, 1, 0, { leir: true, mat: () => true });
          ut.hund = sulten && h.mett === 100 && E2.Hund.truffet(h, 10, 0) > 0; ut.bakke = E2.Snik.bakkeImellom([100, 100, 104, 104, 100, 100], 1.6) && !E2.Snik.bakkeImellom([100, 100, 100, 100, 100, 100], 1.6);
          const ET = window.EventyrSpill, t0 = ET.test; ET.test = true; const c = document.createElement('canvas'); c.width = c.height = 64; const S0 = OppstartSpill.tilstand(); ut.slør = ET.slørTegn ? ET.slørTegn(c.getContext('2d'), S0.leir.x - 2000, S0.leir.y + 2000, 4000 / 64, 64, 64) === true : false; ET.test = t0; }
      } catch (err) { ut.feil = String(err && err.stack || err).slice(0, 300); }
      // alt tilbake
      const g0 = JSON.parse(f0); for (const k of Object.keys(F)) delete F[k]; Object.assign(F, g0); if (romBruk0 === undefined) delete L.romBruk; else L.romBruk = romBruk0;
      SS.visPerson(null); SS.åpne(false); SS.nullstill(); SS.test = test0; try { localStorage.removeItem('riksbrudd-samfunn'); } catch (e2) { /* ok */ } if (LeirSpill.lagre) LeirSpill.lagre();
      if (åpenFolk) FolkSpill.åpne(true); FolkSpill.vis();
      ut.tilbake = JSON.stringify(FolkSpill.tilstand()) === f0 && !SS.våken() === !!navigator.webdriver;
      return ut;
    });
    if (d.mangler) return { ok: false, tekst: 'SamfunnSpill finnes ikke (eller spillet er ikke startet)', data: d };
    const krav = ['sover', 'person', 'personLukket', 'flyktKort', 'flykt', 'avhengige', 'lov', 'sykdom', 'spesialist', 'opplæring', 'begravelse', 'spion', 'utvist', 'kort', 'virkning', 'kortkø', 'fraBy', 'fanger', 'panel', 'forfall', 'romtyper', 'kamvarsel', 'kamvarselBort',
      'varsler', 'sabotasje', 'énKø', 'barnGamle', 'oppdragSpes', 'portretter', 'tårn', 'hund', 'bakke', 'slør', 'tilbake'];
    const feil = krav.filter(k => !d[k]); if (d.feil) feil.push('feil: ' + d.feil);
    return { ok: !feil.length, tekst: feil.length ? `${profil}: mangler ${feil.join(', ')}` : `${profil}: personkort, flyktninger, barn og gamle, lov, Grålungen, spesialist, opplæring, begravelse, forræder, kort, kortkø, rekrutt fra by, fanger, panel, forfall, romtyper, kameravarsel – og (runde 4) varselbrikker, sabotasje via Leir.skad, én kortkø, syke barn/gamle, spesialist fra oppdrag, portretter, vakta i tårnet (${d.tårn === '2D' ? 'ikke prøvd: 2D' : '3D'}), hunden, bakkedekning og sløret virker`, data: d };
  },
};
