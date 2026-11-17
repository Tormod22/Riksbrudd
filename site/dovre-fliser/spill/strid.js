/* Riksbrudd – STRIDSREGLER: regler uten DOM (Node: require('./strid'); nettleser: globalThis.Strid).
 * (17. nov, brukeren: «jeg ønsker at en kunne definere litt på forhånd hvordan troppene skal reagere i møte med fiender – skal de
 * angripe når de vet at de kanskje taper? High ground skal gi en fordel, samt om du blir oppdaget eller oppdager dem først, og
 * hvilket våpen troppene mine har, og fienden. Dette bør jeg kunne endre på, og det skal ha noe å si når de møter andre.»)
 *  STRIDSREGLER per lag: når laget åpner ild, hva det gjør når det er underlegent, hvor store tap det tåler, og om det rykker fram.
 *  BEVÆPNING per lag: standard, nærstrid, avstand eller tung – hver mann får et våpen (m.våpen) som Terreng.treffsjanse bruker.
 *  HØYDE: jo høyere du står over målet, jo bedre treffer du (og dårligere oppover).
 *  OPPDAGELSE: den som ser den andre først, får et overtak de første rundene; ser ikke fienden deg i det hele tatt, er det et bakhold.
 *  STYRKEFORHOLD: forventede treff per runde for hver side med alt dette regnet inn – det laget «vet» før det velger.
 * Alle tallene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  // Våpnene (lagt inn i Terreng.VÅPEN av visningen): [rekkevidde m, grunnsjanse per skudd]
  const VÅPEN = { maskinpistol: [300, .11], hagle: [150, .16], pistol: [120, .05], presisjonsrifle: [1100, .07] };
  // Bevæpning: hvilket våpen hver av de tolv i laget får (rollene i laget står som før). null = våpenet rollen har fra før.
  const BEVÆPNING = {
    standard: { navn: 'Standard', kort: 'rifler, to maskingevær og en skarpskytter', pris: 0, våpen: () => null, tekst: 'Jevnt god på alle hold opp til 600 m, maskingeværene til 900 m.' },
    nærstrid: { navn: 'Nærstrid', kort: 'maskinpistoler og hagler', pris: 200000, våpen: (rolle, i) => (rolle === 'maskingevær' ? null : i % 4 === 3 ? 'hagle' : 'maskinpistol'), tekst: 'Dobbelt så farlig under 150 m, men når ikke lenger enn 300 m. Best i skog og tettsteder.' },
    avstand: { navn: 'Avstand', kort: 'seks presisjonsrifler og rifler', pris: 400000, våpen: (rolle, i) => (i % 2 === 0 ? 'presisjonsrifle' : 'rifle'), tekst: 'Når 1100 m og treffer klart best over 400 m. Ingen maskingevær, så ikke sterkere enn standard helt nært.' },
    tung: { navn: 'Tung', kort: 'fire maskingevær og rifler', pris: 600000, våpen: (rolle, i) => (i % 3 === 2 ? 'maskingevær' : null), tekst: 'Mest ildkraft på alle hold opp til 900 m. Dyrest.' },
    // våpen valgt mann for mann i troppebyggeren (spill/tropper.js): m.valgt, ellers rollens våpen
    egen: { navn: 'Egen sammensetning', kort: 'våpen valgt mann for mann', pris: 0, våpen: (rolle, i, m) => (m && m.valgt) || null, tekst: 'Satt sammen i troppebyggeren.' },
    lett: { navn: 'Lett', kort: 'pistoler, hagler og noen rifler', pris: 0, våpen: (rolle, i) => (i % 3 === 0 ? 'rifle' : i % 3 === 1 ? 'hagle' : 'pistol'), tekst: 'Det røvere har. Farlig helt nært, ufarlig på avstand.' },
  };
  const VALGBARE = ['standard', 'nærstrid', 'avstand', 'tung'];
  function bevæpn(menn, id) { const B = BEVÆPNING[id] || BEVÆPNING.standard; menn.forEach((m, i) => { const v = B.våpen(m.rolle, i, m); if (v) m.våpen = v; else delete m.våpen; }); return menn; }
  // Høyde: dh = hvor mange meter skytteren står over målet. +10 m gir litt, +80 m gir mest; oppover skyter du dårligere.
  const HØYDE = { fra: 10, full: 80, maks: 1.6, ned: .7 };
  const høyde = dh => (dh >= HØYDE.fra ? 1 + (HØYDE.maks - 1) * Math.min(1, (dh - HØYDE.fra) / (HØYDE.full - HØYDE.fra)) : dh <= -HØYDE.fra ? 1 - (1 - HØYDE.ned) * Math.min(1, (-dh - HØYDE.fra) / (HØYDE.full - HØYDE.fra)) : 1);
  // (Terreng.treffsjanse har fra før ×1,2 over 20 m – den tas ut, så høyden bare teller én gang)
  const høydeRett = dh => høyde(dh) / (dh > 20 ? 1.2 : 1);
  // Oppdagelse: k = { a, b } = spillminuttet a først så b og omvendt (null = har ikke sett). Faktor for a sin ild akkurat nå.
  const OPPDAG = { bakhold: 1.6, først: 1.35, overrasket: .6, forsprang: 3, varer: 15 };
  function oppdagelse(k, nå) { if (!k || k.a === null || k.a === undefined) return 1; if (k.b === null || k.b === undefined) return OPPDAG.bakhold;
    if (k.b - k.a >= OPPDAG.forsprang && nå - k.b < OPPDAG.varer) return OPPDAG.først; if (k.a - k.b >= OPPDAG.forsprang && nå - k.a < OPPDAG.varer) return OPPDAG.overrasket; return 1; }
  const oppdagetTekst = f => (f >= OPPDAG.bakhold ? 'bakhold – fienden ser oss ikke' : f > 1 ? 'vi oppdaget dem først' : f < 1 ? 'vi ble overrasket' : '');
  // Ildkraft: forventede treff per runde fra mennene mot et mål på avstand d med forholdene f (som Terreng.treffsjanse) og faktoren k.
  function kraft(menn, d, f, k, treffsjanse) { let s = 0; for (const m of menn) if (m.hp >= 1) s += treffsjanse(m.våpen || m.rolle, d, f); return s * (k === undefined ? 1 : k); }
  // Styrkeforhold: vår ildkraft delt på fiendens (over 1 = vi har overtaket). Uendelig når bare vi når fram, 0 når bare de gjør det.
  function forhold(vår, deres) { if (deres <= 0) return vår > 0 ? Infinity : 1; return vår / deres; }
  const forholdTekst = v => (v === Infinity ? 'bare vi når fram' : v <= 0 ? 'bare de når fram' : v >= 2 ? 'klart overtak' : v >= 1.25 ? 'overtak' : v >= .8 ? 'jevnt' : v >= .5 ? 'underlegne' : 'klart underlegne');
  // STRIDSREGLENE. ild: fri | besvar | nær; underlegen: kjemp | trekk | unngå; tap: tap (antall ute) før laget trekker seg, 0 = aldri; fram: rykk fram med overtak.
  const VALG = {
    ild: { navn: 'Åpne ild', valg: { fri: 'Skyt på alt laget ser', besvar: 'Bare når vi blir beskutt', nær: 'Vent til de er innen 200 m (bakhold)' } },
    underlegen: { navn: 'Når vi er underlegne', valg: { kjemp: 'Kjemp likevel', trekk: 'Trekk oss tilbake', unngå: 'Unngå kontakt – trekk unna før kampen' } },
    tap: { navn: 'Tap før retrett', valg: { 0: 'Aldri – kjemp til siste mann', 3: 'Tre ute av kamp', 5: 'Fem ute av kamp' } },
    fram: { navn: 'Når vi har overtaket', valg: { nei: 'Hold stillingen', ja: 'Rykk fram mot fienden' } },
    // EGET INITIATIV (17. nov, brukeren: «forbedre spillerens egen AI for tropper»): det laget gjør uten ordre
    dekning: { navn: 'Når fienden er nær', valg: { ja: 'Søk høyere terreng i nærheten', nei: 'Bli stående der vi står' } },
    støtte: { navn: 'Lag under ild i nærheten', valg: { nei: 'Bli på plassen vår', ja: 'Kom dem til hjelp (innen 1,5 km)' } },
    forsyn: { navn: 'Lite ammunisjon', valg: { nei: 'Vent på ordre', ja: 'Gå og hent selv (under 25 %)' } },
  };
  const INITIATIV = { dekning: 1200, høyde: 8, søk: 150, støtte: 1500, ammo: .25 };
  // Det laget gjør på eget initiativ når stridsreglene ellers ikke sier noe. t: { stille (står uten ordre), fiende (meter til nærmeste
  // fiende laget ser, eller null), beskutt, høyde (meter laget kan vinne innen INITIATIV.søk), venn (meter til et eget lag under ild,
  // eller null), ammo (0–1), hjemme (står der ammunisjonen fylles) }. Gir { hva: 'forsyn' | 'støtte' | 'dekning', grunn } eller null.
  function tiltak(r, t) { const I = INITIATIV;
    if (r.forsyn === 'ja' && t.ammo !== undefined && t.ammo < I.ammo && !t.beskutt && !t.hjemme && (t.fiende === null || t.fiende === undefined || t.fiende > 600)) return { hva: 'forsyn', grunn: `${Math.round(t.ammo * 100)} % ammunisjon igjen` };
    if (!t.stille) return null;
    if (r.støtte === 'ja' && t.venn !== null && t.venn !== undefined && t.venn <= I.støtte && t.venn > 200 && (t.fiende === null || t.fiende === undefined) && !(t.ammo < I.ammo)) return { hva: 'støtte', grunn: 'et lag i nærheten blir beskutt' };
    if (r.dekning === 'ja' && t.fiende !== null && t.fiende !== undefined && t.fiende <= I.dekning && t.fiende > 150 && t.høyde >= I.høyde) return { hva: 'dekning', grunn: `${Math.round(t.høyde)} m høyere terreng like ved` };
    return null; }
  const HOLDNING = {
    aggressiv: { navn: 'Aggressiv', tekst: 'Skyter på alt, kjemper også som underlegne og rykker fram.', regel: { ild: 'fri', underlegen: 'kjemp', tap: 0, fram: 'ja' } },
    balansert: { navn: 'Balansert', tekst: 'Skyter på alt, men trekker seg når det ser ut til å gå galt.', regel: { ild: 'fri', underlegen: 'trekk', tap: 5, fram: 'nei' } },
    forsiktig: { navn: 'Forsiktig', tekst: 'Svarer bare på ild og unngår kamper laget ikke kan vinne.', regel: { ild: 'besvar', underlegen: 'unngå', tap: 3, fram: 'nei' } },
    bakhold: { navn: 'Bakhold', tekst: 'Ligger stille og venter til fienden er innen 200 m.', regel: { ild: 'nær', underlegen: 'trekk', tap: 5, fram: 'nei' } },
  };
  const GRENSE = { underlegen: .7, overtak: 1.3, nær: 200, unngå: 1200 };
  const standard = () => ({ ...HOLDNING.balansert.regel, dekning: 'ja', støtte: 'nei', forsyn: 'nei', bev: 'standard' });
  const ren = r => { const s = standard(), u = { ...s, ...(r || {}) }; for (const k of Object.keys(VALG)) if (!(String(u[k]) in VALG[k].valg)) u[k] = s[k]; u.tap = +u.tap; if (!BEVÆPNING[u.bev]) u.bev = 'standard'; return u; };
  const holdningFor = r => Object.keys(HOLDNING).find(id => Object.entries(HOLDNING[id].regel).every(([k, v]) => String(r[k]) === String(v))) || null;
  // Får laget skyte? t: { avstand, beskutt }
  const ildLov = (r, t) => (r.ild === 'fri' ? true : r.ild === 'besvar' ? !!t.beskutt : !!t.beskutt || t.avstand <= GRENSE.nær);
  // Hva laget gjør av seg selv. t: { forhold, ute (antall ute av kamp), avstand (til nærmeste fiende laget ser), beskutt, rekkevidde (lagets lengste) }.
  // Gir 'trekk' (bort fra fienden), 'unngå' (før kampen), 'fram' (nærmere fienden) eller null, med grunnen.
  function reaksjon(r, t) {
    if (r.tap > 0 && t.ute >= r.tap) return { hva: 'trekk', grunn: `${t.ute} er ute av kamp` };
    if (t.avstand === undefined || t.avstand === null) return null;
    if (t.forhold < GRENSE.underlegen) { if (r.underlegen === 'trekk' && t.beskutt) return { hva: 'trekk', grunn: `laget er ${forholdTekst(t.forhold)}` }; if (r.underlegen === 'unngå' && t.avstand <= GRENSE.unngå) return { hva: t.beskutt ? 'trekk' : 'unngå', grunn: `laget er ${forholdTekst(t.forhold)}` }; }
    if (r.fram === 'ja' && t.forhold >= GRENSE.overtak && t.avstand > (t.rekkevidde || 600) * .5) return { hva: 'fram', grunn: `laget har ${forholdTekst(t.forhold)}` };
    return null;
  }
  const api = { VÅPEN, BEVÆPNING, VALGBARE, bevæpn, HØYDE, høyde, høydeRett, OPPDAG, oppdagelse, oppdagetTekst, kraft, forhold, forholdTekst, VALG, HOLDNING, GRENSE, INITIATIV, tiltak, standard, ren, holdningFor, ildLov, reaksjon };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Strid = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
