// VAKT «telefon» (kritikerløkka 26. nov, runde 1 – Jonas Bakke spilte på 390 × 844 med berøring):
//  - mens du velger mål (Marsjer / Kjør dit), går trykket på kartet bare til krokene som setter mål – ikke til merker (leiren, basen …)
//    som ellers åpner sitt eget panel (velgerMål / målKrok i index.html)
//  - en tropp om bord i et kjøretøy får målet («Kjør dit»): kjøretøyet får ordren, ikke meldingen «… trykk «Kjør dit»» (tropper-visning.js)
//  - Selskapet er med blant panelene som slutter over bunnmenyen (Skjermlag.LØFT), navn skyves inn fra kanten (Etikett.tekst)
//  - telefon: mens du velger mål, er panelene borte og stripa «Trykk på kartet …» med Avbryt står øverst (kompakt.js)
// Setter alt tilbake (lag, kjøretøy, modus, valgt, krokene, testbryterne).
module.exports = { navn: 'telefon: målvalg, Kjør dit om bord, paneler og navn i kanten', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); }, vent = ms => new Promise(r => setTimeout(r, ms));
    krev(typeof velgerMål === 'function' && typeof trykkPå === 'function', 'velgerMål/trykkPå mangler i index.html');
    const s = ENHETER.find(e => e.side === 'blå' && !e.karakter && !e.ai && levende(e)), k = (window.KJORETOY || []).find(q => q.side !== 'rød' && q.side !== 'grønn');
    if (!s || !k || ut.feil.length) { if (!s) ut.feil.push('fant ikke noe eget lag'); if (!k) ut.feil.push('fant ikke noe kjøretøy'); return ut; }
    const før = { x: s.x, y: s.y, sti: s.sti, ombord: s.ombord, avst: s.avstigning, kx: k.x, ky: k.y, ksti: k.sti, valgt, modus, kam: { ...kam }, logg: loggLinjer.length };
    // et merke som tar alle trykk (som leirmerket): skal ikke få trykket mens du velger mål
    let merket = 0; const merke = () => { merket++; return true; }; KROKER.trykk.unshift(merke);
    try {
      kam.x = s.x; kam.y = s.y; kam.m = 4;
      // 1: marsj til fots – trykket går til ordren, ikke til merket
      s.ombord = null; s.sti = null; valgt = s; modus = 'marsj';
      krev(velgerMål() === true, 'velgerMål() er ikke sann i marsjmodus');
      trykkPå(VW / 2 + 120, VH / 2 - 80);
      krev(merket === 0, 'merket tok trykket mens du valgte mål (marsj)');
      krev(modus !== 'marsj', 'marsjmodus står fortsatt etter trykket');
      await vent(400);
      krev(!!(s.sti || s.planlegger || (s.kø && s.kø.length)), 'laget fikk ingen marsjordre');
      s.sti = null; s.planlegger = null;
      // 2: om bord – målet går til kjøretøyet, også med berøring (flyt.js spør da om «Gå / Avbryt» og tok trykket før)
      s.x = k.x; s.y = k.y; s.ombord = k; delete s.avstigning; valgt = s; modus = 'marsj'; const n0 = loggLinjer.length;
      const ft = window.FlytSpill ? FlytSpill.test : undefined; if (window.FlytSpill) FlytSpill.test = true;
      document.documentElement.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));
      try { trykkPå(VW / 2 - 100, VH / 2 + 60); } finally { if (window.FlytSpill) FlytSpill.test = ft; document.documentElement.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true })); }
      if (window.FlytSpill && FlytSpill.utkast && FlytSpill.utkast()) { ut.feil.push('berøring: flyt.js tok målet til en tropp om bord'); modus = null; }
      krev(merket === 0, 'merket tok trykket mens du valgte mål (Kjør dit)');
      krev(!!s.avstigning, 'troppen om bord fikk ikke noe mål (s.avstigning mangler)');
      const nye = loggLinjer.slice(n0).map(l => String(l.t || l.tekst || l)).join(' | ');
      krev(!/trykk «Kjør dit»/.test(nye), 'meldingen «… trykk «Kjør dit»» kom selv om målet var valgt: ' + nye.slice(0, 160));
      // 3: uten målvalg får merket trykket som før
      valgt = null; modus = null; krev(velgerMål() === false, 'velgerMål() er sann uten målvalg'); trykkPå(VW / 2, VH / 2); krev(merket === 1, 'merket fikk ikke trykket utenom målvalg');
      // 4: Selskapet blant panelene som løftes over bunnmenyen, navn skyves inn fra kanten
      if (window.Skjermlag) krev(Array.isArray(Skjermlag.LØFT) && Skjermlag.LØFT.includes('selskap'), 'Selskapet er ikke med i Skjermlag.LØFT');
      if (window.Etikett) krev(!!(Etikett.tekst && Etikett.tekst.__klamp), 'Etikett.tekst skyver ikke navnene inn fra kanten');
      // 5: telefon – panelene borte og stripa øverst mens du velger mål
      if (document.body.classList.contains('kort') && window.Kompakt) {
        const t0 = Kompakt.test; Kompakt.test = true; valgt = s; s.ombord = null; modus = 'marsj'; visPanel(); await vent(450);
        const p = document.getElementById('panel'), st = document.getElementById('maalstripe');
        krev(document.body.classList.contains('målvalg'), 'body.målvalg ble ikke satt på telefon');
        krev(!!st && st.getClientRects().length > 0, 'stripa «Trykk på kartet …» vises ikke');
        krev(!p || p.getClientRects().length === 0, 'lagpanelet står fortsatt mens du velger mål');
        ut.stripe = st ? st.textContent : '';
        const avb = st && st.querySelector('button'); if (avb) avb.click(); await vent(350);
        krev(modus !== 'marsj', '«Avbryt» i stripa avbrøt ikke målvalget');
        krev(!document.body.classList.contains('målvalg'), 'body.målvalg står etter Avbryt');
        Kompakt.test = t0; await vent(200);
      }
    } finally {
      const i = KROKER.trykk.indexOf(merke); if (i >= 0) KROKER.trykk.splice(i, 1);
      Object.assign(s, { x: før.x, y: før.y, sti: før.sti, ombord: før.ombord }); if (før.avst === undefined) delete s.avstigning; else s.avstigning = før.avst;
      if (window.Kjoretoy && Kjoretoy.stopp) Kjoretoy.stopp(k); Object.assign(k, { x: før.kx, y: før.ky, sti: før.ksti });
      valgt = før.valgt; modus = før.modus; Object.assign(kam, før.kam); visPanel(); skitten = true;
    }
    return ut;
  });
  const ok = d.feil.length === 0;
  return { ok, tekst: ok ? `målvalg og Kjør dit virker${d.stripe ? ' – stripa: «' + d.stripe + '»' : ''} (${profil})` : d.feil.join('; '), data: d };
} };
