/* K3 – kontrollrommet: regler uten DOM (Node: require('./kontrollrom'); nettleser: globalThis.Kontrollrom).
 * Hva du ser av lagene dine avhenger av hvor du er (brukeren 11. nov, «mellomting» + nettbrett):
 *  - i kontrollrommet (bygget, med strøm, og du har gått inn): lagene med radiokontakt vises der de er, og fiendene de ser;
 *  - ute med nettbrett (ladet): lagene med radiokontakt vises der de er, men fiender bare der de sist ble meldt;
 *  - ute uten nettbrett: lagene vises der de sist meldte seg på radio, fiender der de sist ble meldt.
 * Lag nær deg (500 m) ser du alltid selv. Radioens rekkevidde avhenger av radioen laget har, leirens radio (mast eller ikke) og
 * terrenget mellom (brukeren: «spør på hvilken radio du har samt terreng samt om du har ekstra mast»). Tallene er forslag.
 * Radiomasten (brukeren 12. nov, etter feiljakten: nivå 2 og 3 hadde ingen virkning): nivået forlenger lagenes rekkevidde. Feltradio når
 * 8 km uten mast, og 15, 25 og 40 km med radiomast på nivå 1, 2 og 3 (masten må virke og ha strøm). Håndradioen når 3 km uansett.
 */
(function (rot) {
  'use strict';
  // meter: det lengste radioen selv kan nå. Feltradioen når så langt som leirens radio (se LEIR); håndradioen er den som begrenser.
  const RADIO = { hånd: { navn: 'Håndradio', meter: 3000 }, felt: { navn: 'Feltradio', meter: 40000, pris: 1e6 } };
  // leirens egen radio: 8 km uten radiomast; masten (K2, med strøm) gir 15, 25 og 40 km på nivå 1, 2 og 3
  // (samme tall som Leir.BYGG.radiomast.nivå.rekkevidde – test_kontrollrom.js sjekker at de er like)
  const LEIR = { uten: 8000, mast: 15000, nivå: [15000, 25000, 40000] };
  const REGLER = {
    terreng: .35,          // en fjellrygg mellom: rekkevidden blir 35 % (radiobølgene bøyes litt over kanten)
    nær: 500,              // lag nærmere deg enn dette ser du selv
    inne: 25,              // så nær kontrollrommet må du stå for å gå inn
    posisjon: 15,          // spillminutter mellom hver posisjonsmelding
    nyFiende: 10,          // spillminutter før samme fiende meldes på nytt
    underIld: 5,           // spillminutter mellom hver «under ild»-melding fra samme lag
    nettbrett: { pris: 1.5e6, timer: 8, lading: 2, ladeAvstand: 150 },   // batteri i spilltimer, full lading i leiren på 2 t
    mastHøyde: 24, antenne: 2,
  };
  // mast: true (nivå 1: 15 km), eller rekkevidden i meter for radiomasten (nivå 1–3 gir 15, 25 og 40 km), eller 0/false uten mast.
  // En hardt skadet mast (halv rekkevidde) er aldri dårligere enn ingen mast.
  const leirRadio = mast => (mast ? Math.max(LEIR.uten, typeof mast === 'number' ? mast : LEIR.mast) : LEIR.uten);
  const rekkevidde = (radio, mast) => Math.min((RADIO[radio] || RADIO.hånd).meter, leirRadio(mast));
  const km = m => (m / 1000).toLocaleString('nb-NO', { maximumFractionDigits: 1 }) + ' km';
  // Forklaringen av radiorekkevidden (lagpanelet, kontrollrommet, byggpanelet for radiomasten og hjelpen bruker samme tekst)
  const forklaring = () => `Håndradio når ${km(RADIO.hånd.meter)}. Feltradio når ${km(LEIR.uten)} uten radiomast og ${LEIR.nivå.slice(0, -1).map(v => v / 1000).join(', ')} og ${km(LEIR.nivå[LEIR.nivå.length - 1])} med radiomast på nivå 1, 2 og 3 (masten må ha strøm). Står terrenget i veien, rekker radioen bare ${Math.round(REGLER.terreng * 100)} % så langt.`;
  // Hvorfor laget ikke har kontakt: «12,4 km fra leiren – håndradioen når 3 km» (+ hva som hjelper)
  function utenKontakt(radio, mast, avstand) {
    const r = rekkevidde(radio, mast), felt = radio === 'felt', n = (RADIO[radio] || RADIO.hånd).navn.toLowerCase();
    if (avstand <= r) return `${km(avstand)} fra leiren – ${n}en når ${km(r)}, men terrenget står i veien (da rekker den ${km(r * REGLER.terreng)})`;
    const nivå = LEIR.nivå.findIndex(v => v >= avstand), råd = !felt ? (avstand <= rekkevidde('felt', mast) ? 'kjøp feltradio' : 'kjøp feltradio og bygg ut radiomasten')
      : nivå < 0 ? 'for langt for radioen' : mast ? `oppgrader radiomasten til nivå ${nivå + 1}` : `bygg radiomast${nivå > 0 ? ` og oppgrader den til nivå ${nivå + 1}` : ''}`;
    return `${km(avstand)} fra leiren – ${n}en når ${km(r)} (${råd})`;
  }
  // Står terrenget i veien? profil: høyder (moh.) i like store steg fra A til B; hA og hB er antennenes høyde (moh.). Jordkrumningen
  // (med radiohorisont, k = 4/3) senker punktene midt på linjen.
  function blokkert(profil, hA, hB, avstand) {
    const n = profil.length - 1; if (n < 2) return false; const R = 6371000 * 4 / 3;
    for (let i = 1; i < n; i++) { const t = i / n, d1 = t * avstand, d2 = (1 - t) * avstand, linje = hA + (hB - hA) * t - d1 * d2 / (2 * R);
      if (profil[i] > linje + 1) return true; }
    return false;
  }
  const kontakt = (avstand, meter, blokk) => avstand <= meter * (blokk ? REGLER.terreng : 1);
  // Hvor er du? inne = du har gått inn i et kontrollrom med strøm; nettbrett = { har, batteri (spilltimer) }
  const modus = (inne, nb) => (inne ? 'kontrollrom' : nb && nb.har && nb.batteri > 0 ? 'nettbrett' : 'ute');
  // Hva du ser av et lag: { live: posisjonen nå, fiender: det laget ser vises nå }. Uten spill (før K1) ser du alt som før.
  function innsyn(m, lag) {
    if (!m) return { live: true, fiender: true };
    if (lag.karakter || lag.nær) return { live: true, fiender: true };
    if (m === 'kontrollrom') return { live: lag.kontakt, fiender: lag.kontakt };
    if (m === 'nettbrett') return { live: lag.kontakt, fiender: false };
    return { live: false, fiender: false };
  }
  // Nettbrettet: tømmes ute, lades i leiren når det er strøm. dt i spillminutter.
  function batteri(nb, dt, iLeiren, strøm) {
    if (!nb || !nb.har) return; const R = REGLER.nettbrett;
    if (iLeiren && strøm) nb.batteri = Math.min(R.timer, nb.batteri + R.timer / R.lading * dt / 60);
    else if (!iLeiren) nb.batteri = Math.max(0, nb.batteri - dt / 60);
  }
  // Retning og avstand som i en radiomelding: «ca. 800 m nordøst»
  const RETNINGER = ['nord', 'nordøst', 'øst', 'sørøst', 'sør', 'sørvest', 'vest', 'nordvest'];
  function retning(fra, til) {
    const dx = til.x - fra.x, dy = til.y - fra.y, a = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360, d = Math.hypot(dx, dy);
    const m = d >= 2000 ? (Math.round(d / 500) * 500 / 1000).toLocaleString('nb-NO') + ' km' : Math.round(d / 50) * 50 + ' m';
    return `ca. ${m} ${RETNINGER[Math.round(a / 45) % 8]}`;
  }
  // Rutinemeldingen (hvert 15. spillminutt per lag): står i radiolista i kontrollrommet, men ikke i loggen på kartet, der den
  // skjøv ut alle viktige meldinger (feiljakt 12. nov: 352 av 364 linjer)
  const RUTINE = 'Posisjon meldt. Alt rolig.';
  // Meldingene fra et lag siden forrige gang (ren logikk): før/nå = { framme, ute (sårede+falne), underIld, fiender: [{ id, navn, x, y }] }
  function meldinger(lag, før, nå, sistMeldt, t) {
    const ut = [];
    if (før.marsj && !nå.marsj) ut.push(`Framme. Posisjon ${nå.sted || 'meldt'}.`);
    if (nå.ute > før.ute) ut.push(`${nå.ute - før.ute} ${nå.ute - før.ute === 1 ? 'mann' : 'menn'} såret eller falt. ${nå.ute} ute av kamp nå.`);
    if (nå.underIld && (t - (sistMeldt.ild || -1e9)) >= REGLER.underIld) { ut.push('Under ild!'); sistMeldt.ild = t; }
    for (const f of nå.fiender) { const k = 'f' + f.id; if (t - (sistMeldt[k] || -1e9) < REGLER.nyFiende) continue; sistMeldt[k] = t; ut.push(`Fiende sett: ${f.navn}, ${retning(lag, f)}.`); }
    if (!ut.length && t - (sistMeldt.pos || -1e9) >= REGLER.posisjon) { ut.push(RUTINE); }
    if (ut.length) sistMeldt.pos = t;
    return ut;
  }
  const api = { RADIO, LEIR, REGLER, RUTINE, rekkevidde, leirRadio, km, forklaring, utenKontakt, blokkert, kontakt, modus, innsyn, batteri, retning, meldinger };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Kontrollrom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
