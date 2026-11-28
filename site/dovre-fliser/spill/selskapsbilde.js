'use strict';
/* Riksbrudd – BILDET AV SELSKAPET (fase Ø0, 28. nov; docs/plan-selskap-okonomi.md kapittel 15 punkt 1 og kapittel 17).
 * Reglene uten DOM bak panelet «Selskapet» (spill/selskapspanel.js): fanene, ukas resultat fra dagboka over pengene, lista over byene
 * med eier, de tre viktigste tingene nå, og når kortet «Storlia Tømmer har hørt om dere» skal komme (den første halvtimen, punkt 6).
 * Test: pipeline/fliser/test_selskapsbilde.js. Node: require('./selskapsbilde'); nettleser: globalThis.Selskapsbilde.
 * Tekstene og tallene er Claudes forslag.
 */
(function (rot) {
  // Claudes forslag
  const REGLER = {
    // fanene i panelet (kapittel 17). klar = fanen har innhold i denne fasen (Ø0); de andre har en rolig tekst om hva som kommer
    FANER: [
      { id: 'oversikt', navn: 'Oversikt', klar: true },
      { id: 'produksjon', navn: 'Produksjon', klar: false, kommer: 'Sagbruk og maskiner kommer her.',
        mer: 'Her ser du maskinene i leiren som rader: hva som går inn og ut, hvem som driver dem, strømmen og tilstanden. Det første er sagbruket, som låses opp av en tømmerkontrakt.' },
      { id: 'kontrakter', navn: 'Kontrakter', klar: true },
      { id: 'byer', navn: 'Byer', klar: true },
      { id: 'partnere', navn: 'Partnere', klar: false, kommer: 'Firmaene og rivalene kommer her.',
        mer: 'Her kommer firmaene dere gjør forretninger med – som Storlia Tømmer og Gråfjell Frakt – og rivalene Ravnsund og Mosevakt: faste kunder, samarbeid og våpenhvile.' },
      { id: 'eiere', navn: 'Eiere', klar: false, kommer: 'Investorer og børsen kommer her.',
        mer: 'Når selskapet har levert nok, ringer den første investoren. Senere kan dere selge andeler, få utbytte og bli notert på svartebørsen.' },
    ],
    uke: 7,             // døgn i «ukas resultat»
    viktigste: 3,       // så mange linjer i «Det viktigste nå»
    // kortet etter den første leverte kontrakten: vent så mange sekunder etter leveringskortet før det kommer (rolig, ikke oppå)
    storlia: { vent: 25, vis: 40, firma: 'Storlia Tømmer' },
    EIER: { blå: 'Dere', rød: 'Ravnsund', grønn: 'Mosevakt' },
  };
  const tall = v => (Number.isFinite(+v) ? +v : 0);
  // UKAS RESULTAT: døgn(n) gir { inn, ut } for spilldøgn n (PengerSpill.døgn); dag = døgnet nå. Gir { inn, ut, netto, dager }
  // over de siste REGLER.uke døgnene, også det som har kommet inn i dag.
  function uke(døgn, dag, n = REGLER.uke) {
    const ut = { inn: 0, ut: 0, netto: 0, dager: 0 }; if (typeof døgn !== 'function') return ut; const d = Math.max(1, Math.floor(tall(dag)) || 1);
    for (let i = Math.max(1, d - n + 1); i <= d; i++) { let D = null; try { D = døgn(i); } catch (e) { D = null; } if (!D) continue; ut.inn += tall(D.inn); ut.ut += tall(D.ut); ut.dager++; }
    ut.netto = ut.inn - ut.ut; return ut;
  }
  // BYENE: steder = [{ id, navn, folk, slag: 'tettsted' | 'bru' }]; eier(id) gir 'blå' | 'rød' | 'grønn' | null; loj(id) gir lojaliteten
  // (eller null). Gir tettstedene (ikke bruene): deres først, så etter folketall.
  function byer(steder, eier, loj) {
    const L = (steder || []).filter(s => s && s.navn && (s.slag === undefined || s.slag === 'tettsted')).map(s => {
      let e = null; try { e = eier ? eier(s.id) || null : null; } catch (x) { e = null; } let l = null; try { l = loj ? loj(s.id) : null; } catch (x) { l = null; }
      return { id: s.id, navn: s.navn, folk: tall(s.folk), x: s.x, y: s.y, eier: e, eierNavn: REGLER.EIER[e] || (e ? e : 'Ingen'), loj: Number.isFinite(l) ? Math.round(l) : null }; });
    return L.sort((a, b) => (b.eier === 'blå') - (a.eier === 'blå') || b.folk - a.folk || String(a.navn).localeCompare(String(b.navn), 'nb'));
  }
  // DET VIKTIGSTE NÅ: lista fra Neste.sorter (eller en annen liste med { tekst }) – de første REGLER.viktigste, uten tomme
  const viktigste = (liste, n = REGLER.viktigste) => (liste || []).filter(k => k && k.tekst).slice(0, n);
  // KORTET «Storlia Tømmer har hørt om dere»: én gang per leir, etter at den første kontrakten er levert
  const storliaNå = (husk, levert) => !(husk && husk.storlia) && tall(levert) >= 1;
  function storliaTekst(navn, trinn) {
    const n = navn || 'dere';
    return { tittel: `${REGLER.storlia.firma} har hørt om dere`,
      tekst: `Ryktet går: ${n} holder ord. ${REGLER.storlia.firma} har tømmer som skal fram gjennom dalen, og de vil gjerne ha et selskap de kan stole på.`,
      // (ut3-varekontrakt) kortet leder til Storlias første tømmerkontrakt (spill/vare.js), som kommer når trinn 2 er nådd
      neste: trinn && trinn.nr < 2 ? 'Neste mål: trinn 2, Leverandør – et selskap folk stoler på. Da har Storlia en tømmerkontrakt til dere. Selskapet viser hva som mangler.' : 'Storlia har en tømmerkontrakt til dere: billig tømmer – og et sagbruk gjør det til planker de kjøper. Se Selskap → Kontrakter.' };
  }
  // kroner med «mill.» – samme form som resten av spillet
  const des = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',').replace(/,0$/, '');
  const kr = v => { const a = Math.abs(tall(v)), f = v < 0 ? '−' : ''; return f + (a >= 1e6 ? des(a / 1e6) + ' mill. kr' : a >= 1000 ? Math.round(a / 1000) + ' 000 kr' : Math.round(a) + ' kr'); };
  // UKAS RESULTAT NÅ (ut8-kr-penger, Jonas: «−23,7 mill. i Oversikt og −12,9 mill. i Eiere samtidig»): én kilde for alle panelene –
  // dagboka over pengene (PengerSpill) de siste REGLER.uke døgnene. Børsen regner selv med en del av det (tak og uten børsens egne penger),
  // men viser dette tallet. Gir null uten dagbok (Node).
  function ukeNå() { const P = rot.PengerSpill; if (!P || !P.døgn || !P.døgnNå || !P.tilstand || !P.tilstand()) return null; return uke(n => P.døgn(n), P.døgnNå()); }
  // ---------- DRIFTEN (ut8-kr-penger, 28. nov) ----------
  // Kritikken: «Faste utgifter steg fra 254 000 til 411 000 kr i døgnet … diesel 3 000 kr literen … spillet viser ingen vei ut». Oversikt
  // får én linje: hva leiren bruker i døgnet, de største postene og et råd med et tilbud dere klarer. poster = { navn: kr per døgn }.
  // Gir { sum, største: [[navn, kr], …] } (høyst REGLER.driftPoster, størst først, uten poster under 1 000 kr).
  REGLER.driftPoster = 3;
  function drift(poster) {
    const L = Object.entries(poster || {}).map(([k, v]) => [k, Math.max(0, tall(v))]).filter(([, v]) => v >= 1000).sort((a, b) => b[1] - a[1]);
    return { sum: L.reduce((a, [, v]) => a + v, 0), største: L.slice(0, REGLER.driftPoster) };
  }
  // «Leiren bruker ca. 650 000 kr i døgnet – største poster: lønn 240 000 kr, diesel 250 000 kr og vedlikehold 170 000 kr.»
  function driftTekst(d) {
    if (!d || !(d.sum > 0)) return 'Leiren bruker nesten ingenting i døgnet ennå.';
    const p = d.største.map(([k, v]) => `${k} ${kr(v)}`), liste = p.length > 1 ? p.slice(0, -1).join(', ') + ' og ' + p[p.length - 1] : p.join('');
    return `Leiren bruker ca. ${kr(Math.round(d.sum / 1000) * 1000)} i døgnet – største poster: ${liste}.`;
  }
  // rådet under linja. o = { kontrakt: { tittel, kr } | null, oppdrag: { navn, gir } | null, kassa, aktive (kontrakter i gang) }
  function driftRåd(d, o = {}) {
    const sum = d && d.sum > 0 ? d.sum : 0, ut = [];
    if (o.kontrakt) ut.push(`Ta en kontrakt: «${o.kontrakt.tittel}» gir ${kr(o.kontrakt.kr)}${sum ? ` – ca. ${des(o.kontrakt.kr / sum)} døgn med drift` : ''}. Én tropp klarer den.`);
    else if (tall(o.aktive) > 0) ut.push('Lever kontraktene dere har i gang – det er der pengene kommer fra.');
    else if (o.oppdrag) ut.push(`Ta et lite oppdrag: «${o.oppdrag.navn}» (gir ${o.oppdrag.gir}). Nye kontrakter kommer i morgen tidlig.`);
    else ut.push('Nye kontrakter kommer i morgen tidlig. Imens: selg tre dere ikke trenger (Leir → Lager).');
    if (d && d.største.length && d.største[0][0] === 'diesel') ut.push('Diesel er største post: solceller, batteri og å slå av bygg dere ikke bruker (Leir → Bygg → Strøm) sparer mest.');
    if (sum && Number.isFinite(o.kassa) && o.kassa < sum * 5) ut.push(o.kassa < sum ? 'Kassa rekker ikke ett døgn til!' : `Kassa rekker ca. ${des(o.kassa / sum)} døgn.`);
    return ut.join(' ');
  }
  const Selskapsbilde = { REGLER, uke, ukeNå, byer, viktigste, storliaNå, storliaTekst, kr, drift, driftTekst, driftRåd };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Selskapsbilde; return; }
  rot.Selskapsbilde = Selskapsbilde;
})(typeof globalThis !== 'undefined' ? globalThis : this);
