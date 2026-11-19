// VAKT «ui» (nattarbeid 18. nov): ressursene på én rad med «mer»-flis og forklaring, kommandolinja på telefon, opplæringen,
// kort logg med ikon, byggene som kort med tegning, ett merkesett og færre infrastrukturmerker. Runde 4: paneler oppå hverandre, merker for
// kjøretøy, tegnforklaring, «Påvirkes av» og langt trykk, byggelista som rutenett, tegning i byggpanelet, etterspill og ramme i 3D. Setter alt tilbake.
module.exports = { navn: 'ui', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => { const ut = { feil: [] }, vent = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id), krev = (b, t) => { if (!b) ut.feil.push(t); };
    for (const n of ['SpillHud', 'FlisTips', 'OpplaeringSpill', 'Opplaering', 'Merker', 'Tegninger', 'Hud']) krev(!!window[n], 'mangler ' + n); if (ut.feil.length) return ut;
    SpillHud.oppdater(); const spill = SpillHud.aktiv(); ut.spill = spill;
    // flisene: forklaring på alle som vises, og én rad på PC
    const fliser = [...document.querySelectorAll('.stats > div')].filter(q => q.getClientRects().length && q.id !== 'flismer'); ut.fliser = fliser.length;
    const uten = fliser.filter(q => !FlisTips.tekst(q)).map(q => q.dataset.s || q.textContent); krev(uten.length === 0, 'fliser uten forklaring: ' + uten.join());
    const diesel = fliser.find(q => q.dataset.s === 'sPenger') || fliser[0]; krev(FlisTips.vis(diesel) && $('tips').classList.contains('på') && $('tips').textContent.length > 30, 'forklaringen vises ikke'); FlisTips.skjul();
    for (const id of ['sKrig', 'sHvor']) { const b = $(id), f = b && b.closest('.stats > div'); if (f && f.getClientRects().length) krev(!!f.dataset.ord && getComputedStyle(f, '::after').content.length > 3, id + ' mangler ordet sitt'); }
    if (spill) { SpillHud.passInn(); const topp = fliser.filter(q => q.getClientRects().length).map(q => q.offsetTop); ut.rader = new Set(topp.map(t => Math.round(t / 6))).size; krev(Math.max(...topp) - Math.min(...topp) < 6, 'ressursene står på flere rader');
      const m = SpillHud.mer(); ut.mer = m.antall; if (m.antall > 0) { SpillHud.åpneMer(true); await vent(30); const rader = document.querySelectorAll('#flismerliste button').length; krev(rader === m.antall && $('flismerliste').getClientRects().length > 0, `«mer» viser ${rader} av ${m.antall}`); SpillHud.åpneMer(false); }
      krev(getComputedStyle($('mkom')).display === 'none', 'telefonlinja vises på PC'); }
    else { ut.telefon = SpillHud.telefon(); const kn = [...document.querySelectorAll('#mkom button')].filter(b => b.getClientRects().length);
      // (runde 4) står raden skjult fordi en tidligere vakt har latt noe stå oppe (alarm, tlfdekk, kort), prøves ikke størrelsen
      if (ut.telefon && getComputedStyle($('mkom')).display === 'none') ut.telefon = false;
      if (ut.telefon) { krev(kn.length >= 3 && kn.every(b => b.offsetHeight >= 44), 'knappene i telefonlinja er for små'); const z = document.querySelector('.ctl'), zr = z && z.getBoundingClientRect(), siste = kn.length ? kn[kn.length - 1].getBoundingClientRect() : { right: -1, top: 1e9 }; krev(!zr || siste.right <= zr.left + 1 || zr.bottom <= siste.top + 1, 'telefonlinja ligger oppå zoomknappene');
        krev(getComputedStyle($('leirknapp')).display === 'none', 'Leir står både oppe og nede'); }
      krev(document.querySelector('.stats').getBoundingClientRect().height < 34, 'statuslinja på telefon er for høy'); }
    // loggen: ikon etter innholdet
    krev(Hud.slag('Røvere angriper leiren') === 'varsel' && Hud.slag('Mål nådd: få strøm') === 'maal' && Hud.slag('Hei') === 'snakk', 'loggen velger feil ikon'); krev([...$('logg').children].every(q => q.dataset.slag), 'loggmeldinger uten ikon');
    // opplæringen: vises bare når testen ber om det, peker på noe, kan hoppes over og slås av
    krev(!OpplaeringSpill.vises(), 'opplæringen vises av seg selv i testene');
    const lagret = localStorage.getItem('riksbrudd-opplaering'), av0 = localStorage.getItem('riksbrudd-opplaering-av'), var3d = typeof på3d !== 'undefined' && på3d;
    if (OpplaeringSpill.av()) OpplaeringSpill.slå(true); OpplaeringSpill.test = true; OpplaeringSpill.nullstill(); await vent(60);
    const s0 = Opplaering.neste(OpplaeringSpill.tilstand()); ut.steg = s0 && s0.id; krev(!!s0, 'opplæringen har ingen steg');
    SpillHud.oppdater(); const dekket = ['gaar', 'ikontrollrom', 'ikamera', 'foto'].some(k => document.body.classList.contains(k)) || ['panel', 'stridpanel', 'byggvalg', 'oppstart', 'hendelse'].some(id => $(id) && $(id).getClientRects().length && (id !== 'oppstart' || $(id).classList.contains('på')));
    if (!dekket) krev(OpplaeringSpill.vises() && /Opplæring/.test($('opplaering').textContent), 'opplæringsruta vises ikke');
    const hoppet = OpplaeringSpill.hopp(), s1 = Opplaering.neste(OpplaeringSpill.tilstand()); krev(hoppet === (s0 && s0.id) && s1 && s1.id !== s0.id, '«Hopp over» går ikke videre');
    OpplaeringSpill.slå(false); await vent(30); krev(!OpplaeringSpill.vises() && localStorage.getItem('riksbrudd-opplaering-av') === '1', '«Slå av» virker ikke');
    OpplaeringSpill.test = false; if (av0 === null) localStorage.removeItem('riksbrudd-opplaering-av'); else localStorage.setItem('riksbrudd-opplaering-av', av0); if (av0 !== '1') OpplaeringSpill.slå(true);
    if (lagret === null) localStorage.removeItem('riksbrudd-opplaering'); else localStorage.setItem('riksbrudd-opplaering', lagret); OpplaeringSpill.last(); OpplaeringSpill.kjør();
    { const L = $('logg'); if (L.firstChild && /Opplæringen er slått av/.test(L.firstChild.textContent) && typeof loggLinjer !== 'undefined') { loggLinjer.shift(); L.firstChild.remove(); } }
    // tegninger og merker
    const utenTegning = Object.keys(Leir.BYGG).filter(t => !Leir.BYGG[t].del && !Tegninger.har(t)); krev(utenTegning.length === 0, 'bygg uten tegning: ' + utenTegning.join());
    const im = new Image(); const lastet = new Promise(r => { im.onload = () => r(true); im.onerror = () => r(false); setTimeout(() => r(false), 3000); }); im.src = Tegninger.bilde(Tegninger.bygg('brakke')); krev(await lastet && im.naturalWidth > 0, 'tegningen av brakka lar seg ikke vise');
    const c = document.createElement('canvas'); c.width = c.height = 40; const g = c.getContext('2d'); Merker.tegn(g, 20, 20, { forhold: 'fiende', slag: 'lag', farge: '#a03020' }); const px = g.getImageData(20, 9, 1, 1).data, hj = g.getImageData(10, 12, 1, 1).data; krev(px[3] > 200 && hj[3] < 60, 'fiendens merke er ikke en rute på spissen');
    krev(Merker.form('eget') !== Merker.form('fiende') && Merker.form('fiende') !== Merker.form('nøytral'), 'merkene har ikke ulike former');
    // færre infrastrukturmerker: en liten bru langt unna vises ikke på 20 m per punkt, men gjør det med «alle» og helt nær
    if (typeof INFRA_FOKUS !== 'undefined') { const t0 = INFRA_FOKUS.test, a0 = INFRA_FOKUS.alt, bru = { e: { lengde: 40, id: -77 }, bb: [-9e6, -9e6, -9e6 + 40, -9e6 + 10] }; INFRA_FOKUS.test = true; INFRA_FOKUS.alt = false;
      const skjult = !VISES.bru(bru, 20), nær = VISES.bru(bru, 2), stor = VISES.bru({ e: { lengde: 900, id: -78 }, bb: bru.bb }, 20); INFRA_FOKUS.alt = true; const alle = VISES.bru(bru, 20); INFRA_FOKUS.test = false; INFRA_FOKUS.alt = false; const iTest = VISES.bru(bru, 20); INFRA_FOKUS.test = t0; INFRA_FOKUS.alt = a0;
      ut.infra = { skjult, nær, stor, alle, iTest }; krev(skjult && nær && stor && alle && iTest, 'reglene for færre merker stemmer ikke'); }
    // RUNDE 2: «Mer» i kommandolinja, ett panel per plass, og delene i Leir-menyen kan legges sammen
    krev(!!window.Paneler && !!SpillHud.bakMer, 'mangler Paneler / SpillHud.bakMer');
    if (window.Paneler && SpillHud.bakMer) { const går = document.body.classList.contains('gaar');
      SpillHud.oppdater(); const linje = document.querySelector('#kommando.på, #mkom.på'); ut.bakMer = SpillHud.bakMer();
      if (linje) { const r = linje.getBoundingClientRect(), merKn = linje.querySelector('[data-k=mer]'); krev(r.left >= 0 && r.right <= innerWidth + 1, 'kommandolinja går ut av skjermen'); krev(linje.querySelectorAll('button:not([hidden])').length <= 7, 'for mange knapper i kommandolinja');
        if (ut.bakMer.length) { krev(merKn && !merKn.hidden, '«Mer» mangler'); SpillHud.åpneKomMer(true); await vent(40); const rad = document.querySelector('#kommer.på, #mkommer.på'); krev(!!rad && rad.querySelectorAll('button:not([hidden])').length === ut.bakMer.length, '«Mer» viser ikke tilleggene'); SpillHud.åpneKomMer(false); } }
      krev(Paneler.viker('region', ['leirmeny', 'stridpanel', 'region'], false).join() === 'leirmeny' && Paneler.viker('sjopanel', ['leirmeny', 'sjopanel'], true).join() === 'leirmeny', 'reglene for panelplassene stemmer ikke');
      if (!går && window.VerdenSpill && window.SjoSpill && VerdenSpill.vis && SjoSpill.vis && !Paneler.åpne().length) { const t0 = Paneler.test; Paneler.test = true; Paneler.sjekk(); VerdenSpill.vis(true); await vent(200); SjoSpill.vis(true); await vent(320); ut.plass = Paneler.åpne().join();
        krev(ut.plass === 'sjopanel', 'to paneler på samme plass står åpne samtidig: ' + ut.plass); for (const id of Paneler.åpne()) Paneler.lukk(id); if (SjoSpill.erÅpen && SjoSpill.erÅpen()) SjoSpill.vis(false); if (VerdenSpill.erÅpen && VerdenSpill.erÅpen()) VerdenSpill.vis(false); await vent(150); Paneler.test = t0; krev(Paneler.åpne().length === 0, 'panelene ble stående åpne etter prøven'); }
      const m = $('leirmeny'), lk = $('leirknapp'); if (!går && m && lk && !lk.hidden && window.LeirSpill && LeirSpill.tilstand()) { const var0 = m.classList.contains('på'), valg0 = localStorage.getItem('riksbrudd-leirdeler'); if (!var0) lk.click(); await vent(250);
        const finn = () => [...m.querySelectorAll('h3.del')].filter(h => h.getClientRects().length), H = finn(); ut.deler = H.length; krev(H.length >= 1, 'ingen deler i Leir-menyen kan legges sammen');
        if (H.length) { const navn = H[H.length - 1].dataset.del, h0 = m.scrollHeight, lukket0 = H[H.length - 1].classList.contains('lukket'); H[H.length - 1].click(); await vent(250); const h = finn().find(q => q.dataset.del === navn); krev(h && h.classList.contains('lukket') !== lukket0 && m.scrollHeight !== h0, 'overskriften åpner/lukker ikke delen'); krev(/"/.test(localStorage.getItem('riksbrudd-leirdeler') || ''), 'valget huskes ikke'); if (h) h.click(); await vent(200); }
        if (valg0 === null) localStorage.removeItem('riksbrudd-leirdeler'); else localStorage.setItem('riksbrudd-leirdeler', valg0); if (!var0) lk.click(); await vent(100); } }
    // RUNDE 4 (18. nov dag): paneler oppå hverandre, merker for kjøretøy og tettsteder, tegnforklaring, «Påvirkes av» og langt trykk,
    // byggelista som rutenett på PC, tegning i byggpanelet, etterspillet med bygg/kjøretøy/kamper og ramme i 3D
    { const r4 = ut.runde4 = {}, t4 = performance.now(), går4 = document.body.classList.contains('gaar'), i3 = typeof på3d !== 'undefined' && på3d;
      for (const n of ['Tegnforklaring']) krev(!!window[n], 'mangler ' + n);
      // (1) lagpanelet står til venstre: Folk viker når et lag velges (og omvendt)
      krev(Paneler.plass('panel') === 'venstre' && Paneler.plass('forklaring') === 'høyre', 'lagpanelet/tegnforklaringen har ikke plassen sin');
      const egneL = ENHETER.filter(e => e.side === 'blå' && !e.karakter && levende(e)), valgt0 = valgt, pÅpen0 = $('panel').classList.contains('på');
      if (!går4 && !i3 && window.FolkSpill && egneL.length && !Paneler.åpne().length && !pÅpen0) { const t0 = Paneler.test; Paneler.test = true; Paneler.sjekk();
        FolkSpill.åpne(true); await vent(300); const folkÅpen = $('folkmeny').classList.contains('på'); r4.vik = document.body.classList.contains('skalavik') ? 'skjult' : document.body.style.getPropertyValue('--venstrekant') || '-';
        valgt = egneL[0]; visPanel(); await vent(350); r4.folkEtterLag = $('folkmeny').classList.contains('på'); r4.lagpanel = $('panel').classList.contains('på');
        krev(folkÅpen && !r4.folkEtterLag && r4.lagpanel, 'Folk og lagpanelet står oppå hverandre (Folk lukkes ikke når et lag velges)');
        if (spill) krev(r4.vik !== '-', 'målestokken/nordpila står under panelet til venstre');
        if (typeof lukkPanel === 'function') lukkPanel(); if ($('folkmeny').classList.contains('på')) FolkSpill.åpne(false); valgt = valgt0; if (valgt) visPanel(); await vent(150); Paneler.test = t0; Paneler.sjekk(); }
      // (2) kjøretøymerkene: hver type sitt tegn, antallet ved siden av
      { const c4 = document.createElement('canvas'); c4.width = 60; c4.height = 40; const g4 = c4.getContext('2d'), bilder = new Set();
        for (const t of Merker.KJØRETØY || []) { g4.clearRect(0, 0, 60, 40); Merker.tegn(g4, 25, 20, { forhold: 'eget', slag: 'kjøretøy', type: t, antall: 3, farge: '#3b5878', r: 11 }); bilder.add(c4.toDataURL()); }
        krev((Merker.KJØRETØY || []).length >= 5 && bilder.size === Merker.KJØRETØY.length, 'kjøretøytypene får ikke hvert sitt merke'); }
      // (3) tegnforklaringen: knappen blant zoomknappene (ikke i 3D), ruta med eksempler som er tegnet
      { const kn = $('forklarknapp'); krev(!!kn && !!kn.closest('.ctl'), 'knappen for tegnforklaringen mangler');
        if (kn) krev(i3 ? getComputedStyle(kn).display === 'none' : kn.getClientRects().length > 0, i3 ? 'tegnforklaringen vises i 3D' : 'knappen for tegnforklaringen vises ikke');
        if (!i3) { const var4 = Tegnforklaring.erÅpen(); Tegnforklaring.vis(true); await vent(80); const P = $('forklaring'), rader = [...P.querySelectorAll('.rad canvas')];
          const tegnet = rader.filter(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++; return n > 20; }).length;
          r4.forklaring = rader.length; krev(P.getClientRects().length > 0 && rader.length >= 15 && tegnet === rader.length, `tegnforklaringen viser ${tegnet} av ${rader.length} eksempler`);
          const pr = P.getBoundingClientRect(); krev(pr.left >= 0 && pr.right <= innerWidth + 1 && pr.top >= 0 && pr.bottom <= innerHeight + 1, 'tegnforklaringen går ut av skjermen'); Tegnforklaring.vis(var4); } }
      // (4) forklaringen på flisene: «Påvirkes av», og langt trykk viser ruta uten å trykke flisa
      // (i 3D tegner programvare-grafikken sekunder per bilde: ventingen i (4)–(6) prøves bare i 2D – det er de samme rutene)
      if (!i3) { const fl = [...document.querySelectorAll('.stats > div')].filter(q => q.getClientRects().length && q.id !== 'flismer' && !q.dataset.teknisk);
        const uten = fl.filter(q => { const T = FlisTips.tekst(q); return T && !T.påvirkes && !['sH', 'sKB'].includes(q.dataset.s); }).map(q => q.dataset.s); krev(uten.length === 0, 'fliser uten «Påvirkes av»: ' + uten.join());
        const d4 = fl.find(q => q.dataset.s === 'sDag') || fl[0];
        if (d4) { let klikket = 0; const merk = () => { klikket++; }; d4.addEventListener('click', merk); const r = d4.getBoundingClientRect(), o = { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 77, isPrimary: true, clientX: r.left + 5, clientY: r.top + 5 };
          d4.dispatchEvent(new PointerEvent('pointerdown', o)); await vent(FlisTips.LANGT.ms + 150); const vist = FlisTips.viser() === d4; d4.dispatchEvent(new PointerEvent('pointerup', o)); d4.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          d4.removeEventListener('click', merk); r4.langt = { vist, klikket }; krev(vist && klikket === 0, 'langt trykk på en flis viser ikke forklaringen (eller trykker flisa)'); FlisTips.skjul();
          document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' })); } }
      // (5) byggelista som rutenett på PC (ikon, navn, pris; hele flisa er knappen) og (6) tegningen i byggpanelet
      const m4 = $('leirmeny'), lk4 = $('leirknapp');
      if (spill && !i3 && !går4 && m4 && lk4 && window.LeirSpill && LeirSpill.tilstand()) { const var0 = m4.classList.contains('på'), fane0 = ((m4.querySelector('[data-fane-knapp].på') || {}).dataset || {}).faneKnapp || 'bygg';
        if (!var0) lk4.click(); LeirSpill.fane('bygg'); await vent(250); const kort = [...m4.querySelectorAll('.liste .bygg.kort')].filter(k => k.getClientRects().length);
        const høy = kort.filter(k => k.getBoundingClientRect().height > 95).length, medTegn = kort.filter(k => { const t = k.querySelector('.tegn'); return t && t.getClientRects().length; }).length, utenIkon = kort.filter(k => !k.dataset.ikon).length;
        const dekker = kort.every(k => { const b = k.querySelector(':scope > button'), kr = k.getBoundingClientRect(), br = b && b.getBoundingClientRect(); return br && Math.abs(br.width - kr.width) < 3 && Math.abs(br.height - kr.height) < 3; });
        r4.byggkort = { n: kort.length, høy, medTegn, utenIkon, dekker }; krev(kort.length >= 10 && !høy && !medTegn && !utenIkon && dekker, 'byggelista på PC er ikke et tett rutenett med ikon (' + JSON.stringify(r4.byggkort) + ')');
        LeirSpill.fane(fane0); if (!var0) lk4.click(); await vent(100); }
      if (!i3 && !går4 && window.LeirSpill && LeirSpill.tilstand() && !$('byggvalg').classList.contains('på') && !LeirSpill.plassering()) { const L4 = LeirSpill.tilstand(), S4 = OppstartSpill.tilstand(), id = 987654;
        const b = { id, type: 'brakke', x: S4.leir.x + 1800, y: S4.leir.y + 1800, ret: 0, nivå: 1, hp: 1, igjen: 0, pris: 1 }; L4.bygg.push(b); LeirSpill.trykk(b.x, b.y); await vent(150);
        const bv = $('byggvalg'), t4 = bv.querySelector('.byggtegn'); r4.byggtegn = !!t4 && bv.classList.contains('på'); krev(r4.byggtegn, 'byggpanelet har ingen tegning av bygget');
        const lukk = [...bv.querySelectorAll('button')].find(q => q.textContent === 'Lukk'); if (lukk) lukk.click(); const i4 = L4.bygg.indexOf(b); if (i4 >= 0) L4.bygg.splice(i4, 1); if (typeof skitten !== 'undefined') skitten = true; }
      // (7) etterspillet: bildet har tallene, kjøretøyene og byggene (byggI), og teksten sier det
      if (window.ScenarioSpill && ScenarioSpill.bilder && !ScenarioSpill.etterspillÅpen()) { const E = ScenarioSpill.bilder(), n0 = E.length, rå = localStorage.getItem('riksbrudd-etterspill'), t0 = tid;
        tid = (n0 ? E[n0 - 1].t : t0) + Scenario.REGLER.etterspill.hver + 1; const lagt = ScenarioSpill.taBilde(); tid = t0; const b = E[E.length - 1];
        r4.etterspill = lagt && b ? { n: !!b.n, k: (b.k || []).length, bygg: Scenario.byggI(E, E.length - 1).length } : null;
        krev(lagt && b && b.n && typeof b.n.m === 'number' && typeof b.n.b === 'number', 'etterspillets bilde mangler tallene (lag, mann, bygg)');
        if (!i3 && lagt) { ScenarioSpill.etterspill(); await vent(150); const tx = ($('etterspill').querySelector('.tekst') || {}).textContent || ''; ScenarioSpill.etterspillLukk(); krev(/Dere: \d+ lag/.test(tx), 'etterspillet viser ikke lagene, byggene og kjøretøyene'); }
        E.length = n0; if (rå === null) localStorage.removeItem('riksbrudd-etterspill'); else localStorage.setItem('riksbrudd-etterspill', rå); }
      // (8) 3D: rammen velger lagene på skjermen (prøves bare når 3D er oppe og du ikke går)
      if (i3 && typeof R3 !== 'undefined' && R3 && R3.ut && !R3.fot && window.FlytSpill && FlytSpill.iRamme3d) { const på = FlytSpill.iRamme3d(0, 0, innerWidth, innerHeight), synlige = egneL.filter(s => FlytSpill.skjerm3d(s.x, s.y));
        r4.ramme3d = på.length; krev(på.length === synlige.filter(s => { const q = FlytSpill.skjerm3d(s.x, s.y); return q[0] >= 0 && q[1] >= 0 && q[0] <= innerWidth && q[1] <= innerHeight; }).length, 'rammen i 3D velger ikke lagene på skjermen'); }
      r4.ms = Math.round(performance.now() - t4); }
    // RUNDE 6 (19. nov, kritikerne): ord/enhet på flisene og telefonraden uten kutt, rekkefølgen på vinduene, kort som setter spillet på pause,
    // bunnmenyen på telefon står alltid, opplæringen (✓, sammenleggbar), Leir-menyen starter øverst, panelplassene og hjelpen i grupper
    { const r6 = ut.runde6 = {}, t6 = performance.now(), går6 = document.body.classList.contains('gaar'), i36 = typeof på3d !== 'undefined' && på3d;
      krev(!!window.Skjermlag, 'mangler Skjermlag');
      // (1) toppstripa: hver flis har et ord foran eller en enhet bak (klokka, kassa og været forklarer seg selv); telefonraden er ikke kuttet
      SpillHud.passInn(); await vent(30);
      const fl6 = [...document.querySelectorAll('.stats > div')].filter(q => q.getClientRects().length && q.id !== 'flismer' && !q.dataset.teknisk);
      const utenOrd = fl6.filter(q => !['sPenger', 'sVaer', 'sDag', 'sAar'].includes(q.dataset.s) && !q.dataset.ord && !(q.querySelector('b[data-enhet]'))).map(q => q.dataset.s);
      krev(utenOrd.length === 0, 'fliser uten ord eller enhet: ' + utenOrd.join());
      if (!spill) { const S = document.querySelector('.stats'); r6.rad = [S.scrollWidth, S.clientWidth]; krev(S.scrollWidth <= S.clientWidth + 2, 'telefonraden øverst er kuttet (' + S.scrollWidth + ' > ' + S.clientWidth + ')'); }
      if (window.Skjermlag) { const st0 = Skjermlag.test, tempo0 = typeof tempo !== 'undefined' ? tempo : 1, fart0 = [...document.querySelectorAll('[id^=sp].på')].map(b => b.id)[0];
        Skjermlag.test = true; SpillHud.oppdater(); await vent(200);
        // (2) rekkefølgen: det som åpnes sist, ligger øverst (Deg, så hjelpen)
        if (!går6 && window.KarakterSpill && KarakterSpill.åpne && KarakterSpill.klar() && window.Hjelp && !$('karakterark').classList.contains('på') && !$('hjelp').classList.contains('på')) {
          KarakterSpill.åpne(); await vent(250); Hjelp.vis(true); await vent(250); const zk = +getComputedStyle($('karakterark')).zIndex, zh = +getComputedStyle($('hjelp')).zIndex; r6.z = [zk, zh];
          krev(zh > zk, `hjelpen åpnes under Deg-panelet (z ${zh} mot ${zk})`); Hjelp.vis(false); KarakterSpill.lukk(); await vent(200); }
        // (3) et kort som venter på svar, setter spillet på pause og sier det – og spillet går videre når kortet er borte
        const hk = $('hendelse'); if (hk && !Skjermlag.KORT.some(id => $(id) && $(id).classList.contains('på')) && $('sp0')) { if (tempo === 0) $('sp0').click(); await vent(60); const førKort = tempo, inn0 = hk.innerHTML;
          if (!hk.textContent.trim()) hk.innerHTML = '<h3>Prøvekort</h3><button>Svar</button>'; hk.classList.add('på'); await vent(450);
          r6.pause = { tempo, merke: Skjermlag.merke(), z: [+getComputedStyle(hk).zIndex] };
          krev(tempo === 0 && Skjermlag.merke() && /pause til du svarer/.test($('kortpause').textContent), 'kortet setter ikke spillet på pause med lapp');
          const al = $('alarm'); if (al) r6.pause.z.push(+getComputedStyle(al).zIndex || 0);
          hk.classList.remove('på'); hk.innerHTML = inn0; await vent(450); r6.pause.etter = tempo; krev(førKort > 0 && tempo === førKort && !Skjermlag.merke(), 'spillet går ikke videre (i samme fart) når kortet er besvart'); }
        // (4) telefon: bunnmenyen står med et panel åpent, og panelet slutter over den
        if (!spill && !går6 && !i36 && window.FolkSpill && SpillHud.telefon && !Paneler.åpne().length) { FolkSpill.åpne(true); await vent(500); SpillHud.oppdater(); await vent(400);
          const mk = $('mkom'), fm = $('folkmeny'), mr = mk.getBoundingClientRect(), fr = fm.getBoundingClientRect(); r6.bunn = { mkom: mk.classList.contains('på') && getComputedStyle(mk).display !== 'none', folkBunn: Math.round(fr.bottom), mkomTopp: Math.round(mr.top) };
          krev(r6.bunn.mkom, 'bunnmenyen forsvinner når Folk er åpent'); if (r6.bunn.mkom) krev(fr.bottom <= mr.top + 1, 'Folk-panelet ligger oppå bunnmenyen'); FolkSpill.åpne(false); await vent(300); }
        Skjermlag.test = st0; Skjermlag.lag(); Skjermlag.løft(); if (fart0 && $(fart0) && !$(fart0).classList.contains('på')) $(fart0).click(); else if (typeof tempo !== 'undefined' && tempo !== tempo0 && tempo0 === 0) $('sp0').click(); SpillHud.oppdater(); }
      // (5) opplæringen: ✓ gjort står en stund, og ruta kan legges sammen
      krev(typeof OpplaeringSpill.gjort === 'function' && OpplaeringSpill.VIS_GJORT >= 2000, 'opplæringen viser ikke «✓ Gjort» før neste steg');
      // (6) Leir-menyen starter øverst, og fanene står fast når du ruller
      { const m = $('leirmeny'), lk = $('leirknapp'); if (!går6 && m && lk && !lk.hidden && window.LeirSpill && LeirSpill.tilstand() && !m.classList.contains('på')) { lk.click(); await vent(300); m.scrollTop = 800; await vent(200);
          const fa = m.querySelector('.faner'), synlig = fa && fa.getBoundingClientRect().top >= m.getBoundingClientRect().top - 2; lk.click(); await vent(200); lk.click(); await vent(350); r6.leir = { rull: m.scrollTop, faner: synlig };
          krev(m.scrollTop === 0, 'Leir-menyen husker hvor langt du rullet (' + m.scrollTop + ')'); krev(synlig, 'fanene i Leir-menyen rulles ut av syne'); lk.click(); await vent(150); } }
      // (7) panelplassene: alt fra bunnmenyen til venstre, tilleggene til høyre
      krev(['leirmeny', 'folkmeny', 'tropppanel', 'krig', 'karakterark'].every(id => Paneler.plass(id) === 'venstre') && ['stridpanel', 'sekk'].every(id => Paneler.plass(id) === 'høyre'), 'panelene fra bunnmenyen åpnes ikke på samme side');
      // (9) hjelpen: grupper som foldes ut, og søket finner noe
      { const gr = document.querySelectorAll('#hjelp details.gruppe'), åpne = [...gr].filter(g => g.open).length; r6.hjelp = { grupper: gr.length, åpne }; krev(gr.length >= 8 && åpne <= 1, 'hjelpen er ikke delt i grupper som foldes ut');
        const sk = document.querySelector('#hjelp .sok'); if (sk) { sk.value = 'ferje'; sk.dispatchEvent(new Event('input')); const n = [...document.querySelectorAll('#hjelp details:not(.gruppe):not([hidden])')].length; sk.value = ''; sk.dispatchEvent(new Event('input')); r6.hjelp.søk = n; krev(n >= 1 && n < 40, 'søket i hjelpen virker ikke'); } }
      r6.ms = Math.round(performance.now() - t6); }
    ut.var3d = var3d; return ut; });
  const ok = d.feil.length === 0;
  return { ok, tekst: ok ? (d.spill ? `PC: ${d.fliser} fliser på én rad (+${d.mer} bak «mer»), alle med forklaring` : `telefon: fliser i ${d.fliser} brikker, kommandolinja nederst ${d.telefon ? 'vises' : 'viker (panel åpent / du går)'}`) + ', opplæringen kan hoppes over og slås av, loggen har ikoner, alle bygg har tegning, fienden har egen form, færre infrastrukturmerker' + (d.bakMer ? `, «Mer» samler ${d.bakMer.length} tillegg, ett panel per plass, ${d.deler === undefined ? 'Leir-delene ikke prøvd' : d.deler + ' deler i Leir-menyen kan legges sammen'}` : '') + (d.runde4 ? ' · runde 4: ' + [d.runde4.lagpanel ? 'Folk viker for lagpanelet' : '', d.runde4.forklaring ? d.runde4.forklaring + ' eksempler i tegnforklaringen' : '', d.runde4.langt ? 'langt trykk viser forklaringen' : '', d.runde4.byggkort ? d.runde4.byggkort.n + ' byggekort med ikon' : '', d.runde4.byggtegn ? 'tegning i byggpanelet' : '', d.runde4.etterspill ? 'etterspillet har tallene' : '', d.runde4.ramme3d !== undefined ? 'ramme i 3D (' + d.runde4.ramme3d + ' lag)' : ''].filter(Boolean).join(', ') : '') : d.feil.join('; '), data: d };
} };
