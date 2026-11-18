// VAKT «ui» (nattarbeid 18. nov): ressursene på én rad med «mer»-flis og forklaring, kommandolinja på telefon, opplæringen,
// kort logg med ikon, byggene som kort med tegning, ett merkesett og færre infrastrukturmerker. Setter alt tilbake.
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
      if (ut.telefon) { krev(kn.length >= 3 && kn.every(b => b.getBoundingClientRect().height >= 44), 'knappene i telefonlinja er for små'); const z = document.querySelector('.ctl'), zr = z && z.getBoundingClientRect(), siste = kn[kn.length - 1].getBoundingClientRect(); krev(!zr || siste.right <= zr.left + 1, 'telefonlinja ligger oppå zoomknappene');
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
    ut.var3d = var3d; return ut; });
  const ok = d.feil.length === 0;
  return { ok, tekst: ok ? (d.spill ? `PC: ${d.fliser} fliser på én rad (+${d.mer} bak «mer»), alle med forklaring` : `telefon: fliser i ${d.fliser} brikker, kommandolinja nederst ${d.telefon ? 'vises' : 'viker (panel åpent / du går)'}`) + ', opplæringen kan hoppes over og slås av, loggen har ikoner, alle bygg har tegning, fienden har egen form, færre infrastrukturmerker' : d.feil.join('; '), data: d };
} };
