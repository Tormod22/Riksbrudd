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
        const hk = $('hendelse'); if (hk && !Skjermlag.KORT.some(id => $(id) && $(id).classList.contains('på')) && $('sp0')) { if (tempo === 0) $('sp0').click(); if ($('sp2') && !$('sp2').classList.contains('på')) $('sp2').click(); await vent(60); const førKort = tempo, inn0 = hk.innerHTML;
          if (!hk.textContent.trim()) hk.innerHTML = '<h3>Prøvekort</h3><button>Svar</button>'; hk.classList.add('på'); await vent(450);
          r6.pause = { tempo, merke: Skjermlag.merke(), z: [+getComputedStyle(hk).zIndex] };
          krev(tempo === 0 && Skjermlag.merke() && /pause til du svarer/.test($('kortpause').textContent), 'kortet setter ikke spillet på pause med lapp');
          const al = $('alarm'); if (al) r6.pause.z.push(+getComputedStyle(al).zIndex || 0);
          hk.classList.remove('på'); hk.innerHTML = inn0; await vent(450); r6.pause.etter = tempo; krev(førKort > 0 && tempo === førKort && !Skjermlag.merke(), 'spillet går ikke videre (i samme fart) når kortet er besvart'); }
        // (4) telefon: bunnmenyen står med et panel åpent, og panelet slutter over den
        if (!spill && !går6 && !i36 && window.FolkSpill && SpillHud.telefon && !Paneler.åpne().length) { FolkSpill.åpne(true); await vent(500); SpillHud.oppdater(); await vent(400);
          const mk = $('mkom'), fm = $('folkmeny'), mr = mk.getBoundingClientRect(), fr = fm.getBoundingClientRect(); r6.bunn = { mkom: mk.classList.contains('på') && getComputedStyle(mk).display !== 'none', folkBunn: Math.round(fr.bottom), mkomTopp: Math.round(mr.top) };
          krev(r6.bunn.mkom, 'bunnmenyen forsvinner når Folk er åpent'); if (r6.bunn.mkom) krev(fr.bottom <= mr.top + 1, 'Folk-panelet ligger oppå bunnmenyen'); FolkSpill.åpne(false); await vent(300); }
        Skjermlag.test = st0; Skjermlag.lag(); Skjermlag.løft(); if (fart0 && $(fart0) && !$(fart0).classList.contains('på')) $(fart0).click(); else if (typeof tempo !== 'undefined' && tempo !== tempo0 && tempo0 === 0) $('sp0').click(); if (typeof tempo !== 'undefined' && tempo !== tempo0) tempo = tempo0; SpillHud.oppdater(); }
      // (5) opplæringen: ✓ gjort står en stund, og ruta kan legges sammen
      krev(typeof OpplaeringSpill.gjort === 'function' && OpplaeringSpill.VIS_GJORT >= 2000, 'opplæringen viser ikke «✓ Gjort» før neste steg');
      // (6) Leir-menyen starter øverst, og fanene står fast når du ruller
      { const m = $('leirmeny'), lk = $('leirknapp'); if (!går6 && m && lk && !lk.hidden && window.LeirSpill && LeirSpill.tilstand() && !m.classList.contains('på')) { lk.click(); await vent(300); m.scrollTop = 800; await vent(200);
          await vent(150); const fa = m.querySelector('.hode .faner'), k2 = $('leirfaner2'), synlig = (fa && fa.getBoundingClientRect().top >= m.getBoundingClientRect().top - 2) || (!!k2 && k2.classList.contains('på') && Math.abs(k2.getBoundingClientRect().top - m.getBoundingClientRect().top) < 4); lk.click(); await vent(200); lk.click(); await vent(350); r6.leir = { rull: m.scrollTop, faner: synlig };
          krev(m.scrollTop === 0, 'Leir-menyen husker hvor langt du rullet (' + m.scrollTop + ')'); krev(synlig, 'fanene i Leir-menyen rulles ut av syne'); lk.click(); await vent(150); } }
      // (7) panelplassene: alt fra bunnmenyen til venstre, tilleggene til høyre
      krev(['leirmeny', 'folkmeny', 'tropppanel', 'krig', 'karakterark'].every(id => Paneler.plass(id) === 'venstre') && ['stridpanel', 'sekk'].every(id => Paneler.plass(id) === 'høyre'), 'panelene fra bunnmenyen åpnes ikke på samme side');
      // (9) hjelpen: grupper som foldes ut, og søket finner noe
      { const gr = document.querySelectorAll('#hjelp details.gruppe'), åpne = [...gr].filter(g => g.open).length; r6.hjelp = { grupper: gr.length, åpne }; krev(gr.length >= 8 && åpne <= 1, 'hjelpen er ikke delt i grupper som foldes ut');
        const sk = document.querySelector('#hjelp .sok'); if (sk) { sk.value = 'ferje'; sk.dispatchEvent(new Event('input')); const n = [...document.querySelectorAll('#hjelp details:not(.gruppe):not([hidden])')].length; sk.value = ''; sk.dispatchEvent(new Event('input')); r6.hjelp.søk = n; krev(n >= 1 && n < 40, 'søket i hjelpen virker ikke'); } }
      r6.ms = Math.round(performance.now() - t6); }
    // RUNDE 8 (20. nov natt, ny kritikk): loggen demper gjentakelser, ⏭ stopper bare for det som krever deg, kortpausen holder også når
    // noen starter tiden, kortene venter mens leiren angripes, hjelpen har alle pakkene, «Nytt spill» øverst i ☰, spillets skrift i 3D
    { const r8 = ut.runde8 = {}, t8 = performance.now();
      for (const n of ['LoggDemp', 'Flyt', 'FlytSpill', 'Skjermlag', 'NarHud']) krev(!!window[n], 'mangler ' + n);
      if (window.LoggDemp && typeof loggLinjer !== 'undefined') {
        // (1) samme melding tre ganger = én linje med «×3» (loggen settes tilbake etterpå)
        const L0 = loggLinjer.slice(), T = 'Prøvemelding fra vakta «ui» (runde 8).'; logg(T); logg(T); logg(T);
        r8.logg = loggLinjer.filter(l => l.startsWith(T)); krev(r8.logg.length === 1 && /\(×3\)$/.test(r8.logg[0]) && loggLinjer[0] === r8.logg[0], 'like meldinger slås ikke sammen: ' + JSON.stringify(r8.logg));
        loggLinjer.length = 0; loggLinjer.push(...L0); const LL = $('logg'); LL.innerHTML = L0.map((x, i) => '<div style="opacity:' + (1 - i * .15) + '"></div>').join(''); [...LL.children].forEach((q, i) => { q.textContent = L0[i]; });
        // (2) reglene i en egen utgave (rører ikke spillets logg): rutine, vær og tips
        const D = LoggDemp.lag(LoggDemp.REGLER, new Set()), v = (t, n) => !!D.vurder(t, [], n);
        r8.regler = [v('Du drikker deg utørst i leiren.', 0), v('Du drikker deg utørst i leiren.', 60), v('Det begynner å regne. Sikten er 95 % av vanlig.', 70), v('Tåka kommer sigende.', 80), v('Det klarner opp.', 400)].map(Number).join('');
        krev(r8.regler === '10011', 'loggreglene (rutine, vær) stemmer ikke: ' + r8.regler);
        const h1 = D.vurder('Hogstlaget fant skog 70 m øst for leiren. Vil du velge stedet selv: Leir → Lager → «Hogst …».', [], 0), h2 = D.vurder('Lageret er fullt. Vil du velge stedet selv: Leir → Lager → «Hogst …».', [], 10);
        krev(h1 && /Vil du/.test(h1.tekst) && h2 && !/Vil du/.test(h2.tekst), 'tipset vises mer enn første gang'); }
      // (3) ⏭: flom/ras, toget og et nådd mål stopper ikke; lag som går av seg selv merkes
      if (window.Flyt) { const H = Flyt.HENDELSER; krev(!H.natur.spol && !H.tog.spol && !H['mål'].spol && H.kort.spol && H.alarm.spol && H.framme.spol, '⏭ stopper fortsatt på småting'); }
      krev(typeof ordre === 'function' && ordre.flyt === true, 'ordre() merker ikke lag som går av seg selv');
      // (4) kortpausen holder: ⏭ og en fartsknapp mens kortet står gir fortsatt pause, og farten du valgte gjelder etter svaret
      const hk = $('hendelse');
      if (window.Skjermlag && window.FlytSpill && hk && $('sp0') && $('sp2') && $('sp3') && !Skjermlag.KORT.some(id => $(id) && $(id).classList.contains('på')) && !(Skjermlag.angrepPågår && Skjermlag.angrepPågår())) {
        const st0 = Skjermlag.test, ft0 = FlytSpill.test, tempo0 = tempo, fart0 = [...document.querySelectorAll('[id^=sp].på')].map(b => b.id)[0], inn0 = hk.innerHTML;
        Skjermlag.test = true; FlytSpill.test = true; if (tempo === 0) $('sp0').click(); $('sp2').click(); await vent(80);
        if (!hk.textContent.trim()) hk.innerHTML = '<h3>Prøvekort</h3><button>Svar</button>'; hk.classList.add('på'); await vent(450);
        const p = { før: tempo }; p.spol = FlytSpill.spol(); await vent(60); p.etterSpol = tempo; p.spoler = FlytSpill.spoler(); $('sp3').click(); await vent(450); p.etterFart = tempo; p.merke = Skjermlag.merke();
        // (5) mens leiren angripes venter hendelseskortet (klassen settes av Skjermlag.vent hvert 0,15 s – prøves med en gang)
        document.body.classList.add('angrepvent'); p.skjult = hk.getClientRects().length === 0; document.body.classList.remove('angrepvent');
        hk.classList.remove('på'); hk.innerHTML = inn0; await vent(450); p.svart = tempo; r8.kort = p;
        krev(p.før === 0 && p.spol === false && p.etterSpol === 0 && !p.spoler, '⏭ spoler med et kort som venter på svar');
        krev(p.etterFart === 0 && p.merke, 'en fartsknapp starter tiden med et kort oppe');
        krev(p.svart === 60, 'farten du valgte med kortet oppe, gjelder ikke etter svaret (' + p.svart + ')'); krev(p.skjult, 'hendelseskortet står oppe mens leiren angripes');
        Skjermlag.test = st0; FlytSpill.test = ft0; if (fart0 && $(fart0)) $(fart0).click(); if (tempo0 === 0 && tempo !== 0) $('sp0').click(); if (tempo !== tempo0) tempo = tempo0; }
      // (6) hjelpen: emnene fra pakkene står i riktig gruppe (når de finnes i HJELP_TILLEGG)
      { const har = t => (window.HJELP_TILLEGG || []).some(q => q[0] === t), iGruppe = (t, g) => [...document.querySelectorAll('#hjelp section')].some(sec => sec.dataset.gruppe === g && [...sec.querySelectorAll('details:not(.gruppe) h3')].some(h => h.textContent === t));
        const PRØV = [['Flytte møbler', 'I 3D'], ['Lommelykt', 'I 3D'], ['Lagre og last', 'Kom i gang'], ['Leiren på nær zoom', 'Leiren og bygging'], ['Gå inn i et hus', 'I 3D'], ['Seier tidligst dag 4', 'Krigen og regionen']].filter(([t]) => har(t));
        r8.hjelp = PRØV.length; const feilG = PRØV.filter(([t, g]) => !iGruppe(t, g)).map(q => q[0]); krev(feilG.length === 0, 'hjelpeemner i feil gruppe: ' + feilG.join(', '));
        const annet = document.querySelector('#hjelp section[data-gruppe="Annet"]'); r8.annet = annet ? annet.querySelectorAll('details:not(.gruppe)').length : 0; }
      // (7) ☰: «Nytt spill» rett under overskriften
      { const m = $('lagmeny'), rad = m && m.querySelector('.mtopp + .spillrad'); r8.nyttSpill = !!rad && /Nytt spill/.test(rad.textContent); krev(!m || !m.querySelector('button.fare') || r8.nyttSpill, '«Nytt spill» står ikke øverst i ☰'); }
      // (8) navnelappene i 3D får spillets skrift
      if (window.NarHud && NarHud.byttSkrift) krev(/Cormorant/.test(NarHud.byttSkrift('bold 13px sans-serif')) && NarHud.byttSkrift('12px monospace') === '12px monospace', 'navnene i 3D får ikke spillets skrift');
      r8.ms = Math.round(performance.now() - t8); }
    ut.var3d = var3d; return ut; });
  // RUNDE 10 (20. nov, brukerens iPhone liggende 844 × 390): «Lag ny tropp» over hele høyden i to kolonner med «Opprett» synlig,
  // opplæringen ved siden av en åpen meny (ikke nederst oppå den), hogst-/rivelappen over bunnmenyen og opplæringen borte imens,
  // og gåmodus: få knapper øverst (resten bak «⋯»), «Sett deg inn» nede til høyre, helse/våpen små ved styrespaken.
  // Vinduet settes til 844 × 390 en liten stund og tilbake. Alt settes tilbake.
  { const vp = pg.viewportSize(); let r10 = null;
    try { await pg.setViewportSize({ width: 844, height: 390 }); await pg.waitForTimeout(700);
      r10 = await pg.evaluate(async () => { const u = { feil: [] }, vent = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id), krev = (b, t) => { if (!b) u.feil.push(t); }, B = document.body;
        const synligPå = e => { if (!e) return false; const r = e.getBoundingClientRect(); if (r.width < 2 || r.top < 0 || r.bottom > innerHeight + 1) return false; const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === e || e.contains(t)); };
        const over = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
        if (window.Telefon) Telefon.pass(); await vent(400); u.ligg = B.classList.contains('kort') && B.classList.contains('tlfligg'); krev(u.ligg, 'liggende telefon gir ikke body.kort/tlfligg');
        const st0 = window.Skjermlag ? Skjermlag.test : undefined, ot0 = window.OpplaeringSpill ? OpplaeringSpill.test : undefined, lsv = localStorage.getItem('riksbrudd-opplaering');
        try {
          if (window.Skjermlag) Skjermlag.test = true; if (window.SpillHud) SpillHud.oppdater(); await vent(350);
          // 1: «Lag ny tropp»
          if (window.TropperSpill && window.FolkSpill && FolkSpill.tilstand()) { TropperSpill.åpne(); await vent(500); const p = $('tropppanel'), r = p.getBoundingClientRect(), kol = p.querySelector('.kolonner'), k2 = p.querySelector('.kol2 .p'), opp = p.querySelector('.opprett button');
            u.tropp = { h: Math.round(r.height), grid: kol ? getComputedStyle(kol).display : '', folk: !!k2 && k2.getBoundingClientRect().bottom <= r.bottom, opprett: synligPå(opp) };
            krev(r.height >= innerHeight * .6, 'tropppanelet er lavt på liggende telefon (' + u.tropp.h + ' px)'); krev(u.tropp.grid === 'grid', 'tropppanelet står ikke i to kolonner'); krev(u.tropp.folk, 'lista over folk synes ikke i tropppanelet'); krev(u.tropp.opprett, '«Opprett» synes ikke i tropppanelet');
            const m = $('mkom'); if (m && m.classList.contains('på')) krev(r.bottom <= m.getBoundingClientRect().top + 1, 'tropppanelet går ned bak bunnmenyen'); TropperSpill.lukk(); await vent(200); }
          // 2: opplæringen ved siden av Leir-menyen
          if (window.OpplaeringSpill && !OpplaeringSpill.av() && $('leirknapp') && $('leirmeny')) { OpplaeringSpill.test = true; const lm = $('leirmeny'), var0 = lm.classList.contains('på'); if (!var0) $('leirknapp').click(); await vent(300); OpplaeringSpill.kjør(); await vent(80);
            const o = $('opplaering'); u.oppl = { på: o.classList.contains('på'), ved: B.classList.contains('oppved') };
            if (u.oppl.på && o.classList.contains('liten')) { krev(u.oppl.ved, 'opplæringen står ikke ved siden av menyen'); krev(!over(o.getBoundingClientRect(), lm.getBoundingClientRect()), 'opplæringen ligger oppå Leir-menyen'); }
            if (!var0 && lm.classList.contains('på')) $('leirknapp').click(); await vent(200); }
          // 3: hogst-/rivelappen over bunnmenyen, og opplæringen borte imens
          { const rv = $('ressursvalg'), m = $('mkom'); if (rv && m && !rv.classList.contains('på')) { const inn0 = rv.innerHTML; rv.innerHTML = '<div><b>Hogstfelt (35 m)</b> – prøve</div><button>Lukk</button>'; rv.classList.add('på'); await vent(60); if (window.OpplaeringSpill) OpplaeringSpill.kjør();
            if (m.classList.contains('på')) krev(rv.getBoundingClientRect().bottom <= m.getBoundingClientRect().top + 1, 'hogstlappen ligger bak bunnmenyen');
            if (window.OpplaeringSpill && OpplaeringSpill.test) krev(!$('opplaering').classList.contains('på'), 'opplæringen står oppe sammen med hogstlappen'); u.hogst = true; rv.classList.remove('på'); rv.innerHTML = inn0; } }
          // 4: gåmodus (klassene settes og tas bort i samme slag, før spillets egne takter rekker å endre dem)
          if (window.NarHud && NarHud.BEHOLD) { const kj = $('kjorknapp'), hud = $('nhud'), t0 = kj ? kj.textContent : '', kp = kj && kj.classList.contains('på'), hp = hud && hud.classList.contains('på'), før = ['gaar', 'gaarydd'].filter(c => B.classList.contains(c));
            B.classList.add('gaar', 'gaarydd'); if (kj) { kj.textContent = 'Sett deg inn i feltbilen'; kj.classList.add('på'); } if (hud) hud.classList.add('på');
            const vis = [...document.querySelectorAll('.knapper > *')].filter(e => e.getClientRects().length).map(e => e.id); u.gå = { knapper: vis };
            krev(vis.length <= NarHud.BEHOLD.length && vis.every(id => NarHud.BEHOLD.includes(id)) && vis.includes('gaamer'), 'knapperaden i gåmodus: ' + vis.join(' '));
            if (kj) { const r = kj.getBoundingClientRect(); u.gå.kjør = [r.left, r.top, r.right, r.bottom].map(Math.round); krev(r.right > innerWidth - 30 && r.top > innerHeight / 2, '«Sett deg inn» står ikke nede til høyre'); }
            if (hud) { const h = hud.querySelector('.helse').getBoundingClientRect(), v = hud.querySelector('.vapen').getBoundingClientRect(); u.gå.helse = [h.left, h.top].map(Math.round); u.gå.vapen = [v.left, v.top].map(Math.round);
              krev(!over(h, v) && h.left >= 140 && v.left >= 140 && h.right < innerWidth / 2 && v.right < innerWidth / 2, 'helse- og våpenruta står ikke ved styrespaken'); }
            for (const c of ['gaar', 'gaarydd']) if (!før.includes(c)) B.classList.remove(c); if (kj) { kj.textContent = t0; if (!kp) kj.classList.remove('på'); } if (hud && !hp) hud.classList.remove('på'); }
        } finally {
          if (window.Skjermlag && st0 !== undefined) Skjermlag.test = st0; if (window.OpplaeringSpill && ot0 !== undefined) { OpplaeringSpill.test = ot0; if (lsv === null) localStorage.removeItem('riksbrudd-opplaering'); else localStorage.setItem('riksbrudd-opplaering', lsv); OpplaeringSpill.last(); OpplaeringSpill.kjør(); }
          if (window.SpillHud) SpillHud.oppdater(); }
        return u; });
    } catch (e) { r10 = { feil: ['runde 10: ' + e.message] }; }
    finally { await pg.setViewportSize(vp); await pg.waitForTimeout(500); }
    d.r10 = r10; for (const f of r10.feil || []) d.feil.push(f); }
  // RUNDE 12 (21. nov, kritiker E – liggende telefon 844 × 390): opplæringen som én tynn linje til du trykker, Leir-menyen i full høyde med
  // bunnmenyen som ikonrad ved siden av, byggebanneret som én smal rad, varslene samlet i én brikke, stoppkortet i angrepsbanneret, kort som
  // venter på svar over panelene (og et varsel åpner ikke et panel over dem), ingen klypezoom (meta + touch-action), tastehint borte på
  // berøringsskjerm, og gåmodus: kildene skjult, «Gå ut» ikke på minikartet. Vinduet settes til 844 × 390 en liten stund. Alt settes tilbake.
  { const vp = pg.viewportSize(); let r12 = null;
    try { await pg.setViewportSize({ width: 844, height: 390 }); await pg.waitForTimeout(700);
      r12 = await pg.evaluate(async () => { const u = { feil: [] }, vent = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id), krev = (b, t) => { if (!b) u.feil.push(t); }, B = document.body;
        const over = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
        if (window.Telefon) Telefon.pass(); await vent(400); if (!B.classList.contains('tlfligg')) { u.feil.push('liggende telefon gir ikke body.tlfligg'); return u; }
        const går = B.classList.contains('gaar'), i3 = typeof på3d !== 'undefined' && på3d;
        const st0 = window.Skjermlag ? Skjermlag.test : undefined, ot0 = window.OpplaeringSpill ? OpplaeringSpill.test : undefined, nt0 = window.NarHud ? NarHud.test : undefined, tt0 = Telefon.test, lsv = localStorage.getItem('riksbrudd-opplaering'), sam0 = localStorage.getItem('riksbrudd-opplaering-sammen');
        try {
          // (7) ingen klypezoom
          { const m = document.querySelector('meta[name=viewport]'); u.meta = m && m.content; krev(!!m && /user-scalable=no/.test(m.content) && /maximum-scale=1/.test(m.content), 'meta viewport tillater zoom'); krev(/pan-x pan-y|pan-y pan-x/.test(getComputedStyle(B).touchAction), 'siden mangler touch-action: pan-x pan-y'); }
          // (5) kort som venter på svar over panelene
          if (window.Skjermlag) krev(Skjermlag.zFor('morgenkort', ['karakterark']) > Skjermlag.zFor('karakterark', ['karakterark']) && Skjermlag.zFor('hendelse', ['leirmeny']) > Skjermlag.zFor('leirmeny', ['leirmeny']), 'kort som venter på svar ligger under panelene');
          if (window.Skjermlag) Skjermlag.test = true; Telefon.test = true; if (window.SpillHud) SpillHud.oppdater(); await vent(300);
          // (1a) opplæringen: én tynn linje liggende, + åpner hele steget
          if (window.OpplaeringSpill && !går && !i3 && !Paneler.åpne().length) { localStorage.removeItem('riksbrudd-opplaering-sammen'); if (OpplaeringSpill.av()) OpplaeringSpill.slå(true); OpplaeringSpill.test = true; OpplaeringSpill.tilSteg('bygg2'); await vent(500); const o = $('opplaering');
            if (o.classList.contains('på')) { const h0 = o.getBoundingClientRect().height; u.oppl = { h: Math.round(h0), sammen: o.classList.contains('sammen') }; krev(u.oppl.sammen && h0 < 46, `opplæringen er ikke én linje liggende (${Math.round(h0)} px)`);
              o.click(); await vent(450); const h1 = o.getBoundingClientRect().height; u.oppl.åpen = Math.round(h1); krev(h1 > h0 + 20 && !o.classList.contains('sammen'), 'et trykk på linja åpner ikke steget');
              const f = $('oppfold'); if (f) f.click(); await vent(450); krev(o.classList.contains('sammen'), '– legger ikke steget sammen igjen'); krev(localStorage.getItem('riksbrudd-opplaering-sammen') === null, '– liggende endret det lagrede valget'); } }
          // (1b) Leir-menyen i full høyde, bunnmenyen som ikoner ved siden av
          { const lm = $('leirmeny'), lk = $('leirknapp'), mk = $('mkom'); if (!går && !i3 && lm && lk && !lk.hidden && mk && mk.classList.contains('på') && window.LeirSpill && LeirSpill.tilstand()) { const var0 = lm.classList.contains('på'); if (!var0) lk.click(); await vent(500); Telefon.pass(); await vent(450); if (window.Skjermlag) Skjermlag.løft(); await vent(100);
            const r = lm.getBoundingClientRect(), mr = mk.getBoundingClientRect(); u.leir = { bunn: Math.round(r.bottom), h: Math.round(r.height), ved: B.classList.contains('mkomved'), mkom: [Math.round(mr.left), Math.round(mr.right)] };
            krev(u.leir.ved, 'bunnmenyen står ikke ved siden av Leir-menyen'); krev(r.bottom >= innerHeight - 20, `Leir-menyen går ikke helt ned (${u.leir.bunn} av ${innerHeight})`); krev(!over(r, mr), 'Leir-menyen og bunnmenyen ligger oppå hverandre');
            if (!var0) lk.click(); await vent(350); Telefon.pass(); await vent(50); krev(!B.classList.contains('mkomved'), 'bunnmenyen står igjen ved siden av når menyen er lukket'); } }
          // (1c) byggebanneret: én smal rad med ikoner
          if (!går && !i3 && window.LeirSpill && LeirSpill.tilstand() && !LeirSpill.plassering()) { const L0 = OppstartSpill.tilstand().leir; LeirSpill.startPlassering('brakke'); await vent(150); LeirSpill.trykk(L0.x + 40, L0.y + 30); await vent(1500);
            const bv = $('byggvalg'), r = bv.getBoundingClientRect(); u.banner = { h: Math.round(r.height), ikoner: bv.querySelectorAll('button[data-kort], button[data-etikett]').length };
            krev(bv.classList.contains('på') && r.height <= 96, `byggebanneret er for høyt liggende (${u.banner.h} px)`); krev(u.banner.ikoner >= 3, 'veksleknappene i byggebanneret er ikke ikoner');
            krev([...bv.querySelectorAll('button')].some(b => /^Avbryt$/.test(b.textContent.trim())), 'knappene i banneret har mistet teksten sin'); LeirSpill.avbryt(); await vent(100); }
          // (6) varslene samles i én brikke + «+n», og et varsel åpner ikke et panel over et kort som venter
          if (window.NarHud && window.KarakterSpill && KarakterSpill.klar()) { NarHud.test = true; const T = KarakterSpill.T(), b0 = { ...T.behov }; T.behov.tørst = 3; T.behov.sult = 3; T.behov.søvn = 3;
            const VT = (window.VARSEL_TILLEGG = window.VARSEL_TILLEGG || []), ekstra = () => [{ i: 'varsel', k: 'fare', t: 'Prøvevarsel', s: 'vakt', f: () => {} }]; VT.push(ekstra);
            NarHud.tegnVarsler(); await vent(50); const kn = [...$('varsler').querySelectorAll('button')]; u.varsler = kn.map(b => b.textContent.slice(0, 24));
            krev(kn.length === 2 && kn[1].classList.contains('flere'), 'varslene er ikke samlet i én brikke + «+n» (' + kn.length + ')');
            if (kn[1]) { kn[1].click(); await vent(50); krev($('varsler').querySelectorAll('button').length >= 3, '«+n» folder ikke ut varslene'); }
            const hk = $('hendelse'), s12 = window.Skjermlag ? Skjermlag.test : false; if (window.Skjermlag) Skjermlag.test = false; if (hk && !hk.classList.contains('på') && window.KarakterSpill) { const inn0 = hk.innerHTML, kar0 = $('karakterark') && $('karakterark').classList.contains('på'); hk.innerHTML = '<p>Prøvekort</p><button>Svar</button>'; hk.classList.add('på'); await vent(30);
              NarHud.tegnVarsler(); const kv = [...$('varsler').querySelectorAll('button')].find(b => /Du er/.test(b.textContent)); if (kv) { kv.click(); await vent(250); u.kortVarsel = { åpnet: !kar0 && $('karakterark').classList.contains('på'), blink: hk.classList.contains('kortblink') }; krev(!u.kortVarsel.åpnet && u.kortVarsel.blink, 'et varsel åpnet et panel over kortet som venter på svar'); }
              hk.classList.remove('på', 'kortblink'); hk.innerHTML = inn0; if (!kar0 && $('karakterark').classList.contains('på') && window.KarakterSpill.åpne) KarakterSpill.åpne(); } if (window.Skjermlag) Skjermlag.test = s12;
            VT.splice(VT.indexOf(ekstra), 1); Object.assign(T.behov, b0); NarHud.test = nt0; NarHud.tegnVarsler(); }
          // (6b) stoppkortet henger under angrepsbanneret som én boks
          // (alt i samme slag: angrepsbanneret og stoppkortet styres ellers av sine egne takter)
          { const a = $('alarm'), k = $('flytkort'); if (a && k && !a.classList.contains('på') && !k.classList.contains('på')) { const ai = a.innerHTML, ki = k.innerHTML; a.innerHTML = '<span>Angrep: prøve</span><button>Forsvar leiren</button>'; a.classList.add('på'); k.innerHTML = '<span>⏭ Stoppet: prøve.</span><button>Spol videre</button>'; k.classList.add('på');
            Telefon.pass(); const ar = a.getBoundingClientRect(), kr = k.getBoundingClientRect(); u.stopp = { a: [Math.round(ar.left), Math.round(ar.bottom)], k: [Math.round(kr.left), Math.round(kr.top)] };
            krev(k.classList.contains('ibanner') && Math.abs(kr.left - ar.left) < 2 && Math.abs(kr.top - ar.bottom) < 3, 'stoppkortet henger ikke under angrepsbanneret');
            a.classList.remove('på'); k.classList.remove('på'); a.innerHTML = ai; k.innerHTML = ki; Telefon.pass(); } }
          // (8) gåmodus: kildene skjult, «Gå ut» ikke oppå minikartet
          // (runde 12) knappene inne står samlet i #inneknapper – på liggende telefon i en rad under kompasset; da må «Gå ut» være hel,
          // på skjermen og ikke oppå kompasset
          { const før = ['gaar'].filter(c => B.classList.contains(c)); B.classList.add('gaar'); const d = $('dorknapp'), mini = $('minikart'); u.kilde = getComputedStyle($('kilde')).display; krev(u.kilde === 'none', 'kildeteksten vises i gåmodus på telefon');
            if (d && mini) { const dp = d.classList.contains('på'); d.classList.add('på'); const dr = d.getBoundingClientRect(); mini.style.display = 'block'; const mr2 = mini.getBoundingClientRect(); mini.style.display = ''; u.dør = [Math.round(dr.left), Math.round(dr.top)]; if (mr2.width) krev(!over(dr, mr2), '«Gå ut» ligger oppå minikartet'); { const rad = d.parentNode && d.parentNode.id === 'inneknapper', ko = $('kompass'), kr = ko && ko.getBoundingClientRect(); if (rad) { krev(!dr.width || !d.textContent.trim() || (dr.top >= 0 && dr.bottom <= innerHeight && dr.width >= 50), '«Gå ut» i knapperaden inne er klemt eller utenfor skjermen (' + [dr.left, dr.top, dr.width, dr.height].map(Math.round) + ')'); if (kr && kr.width && dr.width) krev(!over(dr, kr), '«Gå ut» ligger oppå kompasset (knappen ' + Math.round(dr.top) + '–' + Math.round(dr.bottom) + ', kompasset ' + Math.round(kr.top) + '–' + Math.round(kr.bottom) + ')'); } else krev(dr.top > innerHeight / 2, '«Gå ut» står ikke nede'); } if (!dp) d.classList.remove('på'); }
            if (!før.includes('gaar')) B.classList.remove('gaar'); }
          // (9) tastehint: tas bort på berøringsskjerm (bare når skjermen er det)
          { krev(Telefon.TAST.test('Inventar (Tab)') && Telefon.TAST.test('Gå ut (F)') && !Telefon.TAST.test('Speidertropp (4)'), 'regelen for tastehint stemmer ikke'); }
          krev(!!document.querySelector('#lagmeny p.mkilder'), 'kildene står ikke i ☰');
        } finally {
          if (window.Skjermlag && st0 !== undefined) Skjermlag.test = st0; Telefon.test = tt0; if (window.NarHud && nt0 !== undefined) NarHud.test = nt0;
          if (sam0 === null) localStorage.removeItem('riksbrudd-opplaering-sammen'); else localStorage.setItem('riksbrudd-opplaering-sammen', sam0);
          if (window.OpplaeringSpill && ot0 !== undefined) { OpplaeringSpill.test = ot0; if (lsv === null) localStorage.removeItem('riksbrudd-opplaering'); else localStorage.setItem('riksbrudd-opplaering', lsv); OpplaeringSpill.last(); OpplaeringSpill.kjør(); }
          if (window.SpillHud) SpillHud.oppdater(); Telefon.pass(); }
        return u; });
    } catch (e) { r12 = { feil: ['runde 12: ' + e.message] }; }
    finally { await pg.setViewportSize(vp); await pg.waitForTimeout(500); }
    d.r12 = r12; for (const f of r12.feil || []) d.feil.push(f); }
  // RUNDE 13 (21. nov, kritiker G/H – «knapper, tall og symboler skal kunne forstås»): tekst under ikonene i byggelinja, hjelpen over
  // morgenmøtet, «+n tall» øverst og «Mer» uten tall nederst, ingen boble ved kort trykk på en flis som åpner noe, tallboksene i Leir uten «…»,
  // Folk sist ut av raden på PC, bare klokke og vær før leiren, årsaken bak varseltrekanten, og hendelseskortet tett fra første bilde. Alt settes tilbake.
  { const vp = pg.viewportSize(); let r13 = null;
    try { await pg.setViewportSize({ width: 844, height: 390 }); await pg.waitForTimeout(700);
      r13 = await pg.evaluate(async () => { const u = { feil: [] }, vent = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id), krev = (b, t) => { if (!b) u.feil.push(t); }, B = document.body;
        const etter = (e, p = '::after') => { const c = getComputedStyle(e, p).content; return c && c !== 'none' && c !== 'normal' ? c.replace(/^"|"$/g, '') : ''; };
        if (window.Telefon) Telefon.pass(); if (window.SpillHud) SpillHud.oppdater(); await vent(300);
        const går = B.classList.contains('gaar'), i3 = typeof på3d !== 'undefined' && på3d;
        // (1) byggelinja: hvert ikon har en kort tekst under seg, og ⧉ er borte
        if (!går && !i3 && window.LeirSpill && !LeirSpill.plassering() && window.OppstartSpill && OppstartSpill.tilstand()) {
          const S = OppstartSpill.tilstand(); LeirSpill.startPlassering('brakke'); LeirSpill.trykk(S.leir.x + 40, S.leir.y + 30); await vent(1200);
          const kn = [...document.querySelectorAll('#byggvalg > button')].filter(b => b.getClientRects().length), ik = kn.filter(b => b.dataset.tegn);
          u.byggelinje = ik.map(b => b.dataset.tegn + ' ' + etter(b)); krev(ik.length >= 5, `byggelinja har for få ikonknapper (${ik.length})`);
          for (const b of ik) krev(etter(b).length >= 3 && etter(b) === b.dataset.etikett && b.getBoundingClientRect().height <= 44, `ikonet ${b.dataset.tegn} i byggelinja har ingen synlig tekst («${etter(b)}»)`);
          krev(!kn.some(b => /⧉/.test(b.textContent + (b.dataset.kort || '') + (b.dataset.tegn || ''))), 'byggelinja bruker fortsatt ⧉ (ser ut som «kopier»)');
          LeirSpill.avbryt(); await vent(200); }
        // (2) hjelpen over morgenmøtet
        if (window.Hjelp && !$('hjelp').classList.contains('på')) { const m = $('morgenkort'), varPå = m && m.classList.contains('på'), html = m ? m.innerHTML : '';
          if (m && !varPå) { m.innerHTML = '<h3>Morgenmøtet</h3><p>Prøve fra vakta.</p><button type="button">Valg</button>'; m.classList.add('på'); }
          Hjelp.vis(true); await vent(250); const r = m ? m.getBoundingClientRect() : null, t = r && r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(30, r.height / 2)) : null;
          u.hjelpZ = [getComputedStyle($('hjelp')).zIndex, m ? getComputedStyle(m).zIndex : '']; krev(!r || !r.width || (t && t.closest('#hjelp')), `hjelpen ligger under morgenmøtet (z ${u.hjelpZ})`);
          Hjelp.vis(false); if (m && !varPå) { m.classList.remove('på'); m.innerHTML = html; } await vent(100); }
        // (3) «Mer» bare ett sted: flisa øverst heter «+n tall», knappen nederst har ikke noe tall
        { const f = $('flismer'); krev(!!f && f.dataset.ord === 'tall' && !/mer/i.test(etter(f)), `flisa øverst heter fortsatt «${f ? etter(f) : '?'}»`);
          krev(![...document.querySelectorAll('[data-k="mer"]')].some(b => b.querySelector('.merke')), '«Mer» nederst har fortsatt et tall'); }
        // (4) et kort trykk på en flis som åpner noe, gir ingen boble oppå
        { const f = $('flismer'); if (f && f.getClientRects().length && window.FlisTips) { FlisTips.skjul(); f.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));
            f.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true })); f.click(); await vent(350); u.tallTrykk = { liste: $('flismerliste').classList.contains('på'), boble: $('tips').classList.contains('på') };
            krev(!u.tallTrykk.boble, 'et kort trykk på «+n tall» viser fortsatt forklaringsboblen oppå lista'); SpillHud.åpneMer(false); FlisTips.skjul(); } }
        // (5) tallboksene i Leir-menyen: ingen «…»
        if (!går && $('leirknapp')) { const var0 = $('leirmeny').classList.contains('på'); if (!var0) $('leirknapp').click(); await vent(500);
          const fl = [...document.querySelectorAll('#leirmeny .flis')].filter(f => f.getClientRects().length); u.tallbokser = fl.map(f => (f.querySelector('b') || {}).dataset ? etter(f.querySelector('b')) || f.textContent : f.textContent);
          krev(fl.length >= 4, `Leir-menyen har ${fl.length} tallbokser`);
          for (const f of fl) { const b = f.querySelector('b'), sm = f.querySelector('small'), kutt = e => !!e && getComputedStyle(e).textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1;
            krev(!kutt(b) && !kutt(sm) && f.scrollWidth <= f.clientWidth + 1 && !!b && !!b.dataset.kort && etter(b) === b.dataset.kort, `tallboksen «${f.textContent}» kuttes på liggende telefon`); }
          if (!var0) $('leirknapp').click(); await vent(200); }
        // (6) før leiren er lagt: bare klokke og vær
        { const lv = $('leirvalg'), var0 = lv && lv.classList.contains('på'); if (lv && !var0) { lv.classList.add('på'); SpillHud.oppdater();
            const vis = [...document.querySelectorAll('.stats > div')].filter(d => d.getClientRects().length && d.id !== 'flismer').map(d => d.dataset.s); u.førLeir = vis;
            krev(vis.every(s => ['sDag', 'sVaer', 'sVind', 'sAar'].includes(s)) && !$('flismer').getClientRects().length, `før leiren står det mer enn klokke og vær øverst (${vis})`); lv.classList.remove('på'); SpillHud.oppdater(); } }
        // (7) varseltrekanten på Folk sier årsaken
        { const d = document.querySelector('.stats > div[data-s="sFolk"]'); if (d && /⚠/.test(d.textContent) && window.FlisTips) { const T = FlisTips.tekst(d); u.folkÅrsak = T && T.nå;
            krev(!!T && /seng|mat|fryser|moral/.test(T.nå || ''), `varseltrekanten på Folk sier ikke hva som mangler («${T && T.nå}»)`); } }
        // (8) hendelseskortet: tett bakgrunn og ingen gjennomsiktig inntoning fra første bilde
        { const k = $('hendelse'); if (k && !k.classList.contains('på')) { k.classList.add('på'); const c = getComputedStyle(k), a = c.animationName; u.hendelse = [c.opacity, a, c.backgroundImage.slice(0, 40)]; k.classList.remove('på');
            krev(c.opacity === '1' && a !== 'panelopp' && /gradient/.test(c.backgroundImage), `hendelseskortet tones inn gjennomsiktig (${u.hendelse})`); } }
        if (window.Telefon) Telefon.pass(); if (window.SpillHud) SpillHud.oppdater(); return u; });
      // (9) PC, smalt vindu: Folk er den siste flisa som går inn bak «+n tall»
      await pg.setViewportSize({ width: 960, height: 700 }); await pg.waitForTimeout(600);
      const r9 = await pg.evaluate(async () => { const u = { feil: [] }; if (window.SpillHud) { SpillHud.oppdater(); SpillHud.passInn(); } await new Promise(r => setTimeout(r, 200));
        const fl = id => document.querySelector(`.stats > div[data-s="${id}"]`), f = fl('sFolk');
        if (window.SpillHud && SpillHud.aktiv() && f && !f.dataset.tom) { u.folk = f.dataset.mer ? 'bak' : 'synlig'; if (f.dataset.mer && ['sStrom', 'sDiesel', 'sTre'].some(id => { const d = fl(id); return d && !d.dataset.tom && !d.hidden && !d.dataset.mer; })) u.feil.push('Folk går inn bak «+n tall» før strøm/diesel/tre (runde 13)'); }
        return u; });
      r13.pcSmal = r9.folk; for (const f of r9.feil) r13.feil.push(f);
    } catch (e) { r13 = { feil: ['runde 13: ' + e.message] }; }
    finally { await pg.setViewportSize(vp); await pg.waitForTimeout(500); await pg.evaluate(() => { if (window.Telefon) Telefon.pass(); if (window.SpillHud) { SpillHud.oppdater(); SpillHud.passInn(); } }); }
    d.r13 = r13; for (const f of r13.feil || []) d.feil.push(f); }
  const ok = d.feil.length === 0;
  return { ok, tekst: ok ? (d.spill ? `PC: ${d.fliser} fliser på én rad (+${d.mer} bak «mer»), alle med forklaring` : `telefon: fliser i ${d.fliser} brikker, kommandolinja nederst ${d.telefon ? 'vises' : 'viker (panel åpent / du går)'}`) + ', opplæringen kan hoppes over og slås av, loggen har ikoner, alle bygg har tegning, fienden har egen form, færre infrastrukturmerker' + (d.bakMer ? `, «Mer» samler ${d.bakMer.length} tillegg, ett panel per plass, ${d.deler === undefined ? 'Leir-delene ikke prøvd' : d.deler + ' deler i Leir-menyen kan legges sammen'}` : '') + (d.runde4 ? ' · runde 4: ' + [d.runde4.lagpanel ? 'Folk viker for lagpanelet' : '', d.runde4.forklaring ? d.runde4.forklaring + ' eksempler i tegnforklaringen' : '', d.runde4.langt ? 'langt trykk viser forklaringen' : '', d.runde4.byggkort ? d.runde4.byggkort.n + ' byggekort med ikon' : '', d.runde4.byggtegn ? 'tegning i byggpanelet' : '', d.runde4.etterspill ? 'etterspillet har tallene' : '', d.runde4.ramme3d !== undefined ? 'ramme i 3D (' + d.runde4.ramme3d + ' lag)' : ''].filter(Boolean).join(', ') : '') + (d.runde8 ? ` · runde 8: like meldinger slås sammen, ⏭ venter på kortet${d.runde8.kort ? ' og fartsknappen også' : ''}, ${d.runde8.hjelp} hjelpeemner fra pakkene i riktig gruppe, «Nytt spill» øverst` : '') + (d.r13 ? ' · runde 13: tekst under ikonene i byggelinja, hjelpen over morgenmøtet, «+n tall» og «Mer» uten tall, ingen boble ved kort trykk, ingen «…» i tallboksene, klokke og vær før leiren, årsaken bak varseltrekanten, tett hendelseskort' + (d.r13.pcSmal ? ', Folk ' + d.r13.pcSmal + ' i smalt PC-vindu' : '') : '') : d.feil.join('; '), data: d };
} };
