// Test for balansen (R18, docs/balanse-r18.md): regner en enkel økonomi i Node med de ekte reglene og sjekker at den holder
// seg innen rimelige rammer. node pipeline/fliser/test_balanse.js  (BALANSE_VIS=1 skriver døgn for døgn)
// Modellen (Claudes forslag – en «vanlig» leir, ikke et bestemt spill):
//  - start med 40 mill. kr (det nye spill får utenfor testene), materialene kjøpes med markedets påslag (× 1,5) som i spillet
//  - standardleiren: kontrollrom, brakke, aggregat og dieseltank (det spillet selv regner som minimum – oppstart.js) + 500 l diesel
//  - startgjengen på ti; maten kjøpes når det er under tre døgn igjen, diesel fylles opp til 500 l når tanken er under 150 l
//  - markedet går ett døgn om gangen (priser ± og inflasjon) med fast frø
//  - A: ti døgn uten inntekt;  B: ti døgn med «vanlige kontrakter» (én levert hvert døgn, se KONTRAKT)
// Rammene står i RAMME med forklaring. Endrer du tall i reglene og en ramme brytes, er det et tegn på at balansen er flyttet –
// ikke nødvendigvis feil, men les docs/balanse-r18.md før du flytter rammen.
const Leir = require('../../site/dovre-fliser/spill/leir.js');
const FolkR = require('../../site/dovre-fliser/spill/folk.js');
const { Marked, Oppdrag } = require('../../site/dovre-fliser/spill/spillet.js');
const Selskap = require('../../site/dovre-fliser/spill/selskap.js');
const Utstyr = require('../../site/dovre-fliser/spill/utstyr.js');

let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const mill = v => (v / 1e6).toFixed(2).replace('.', ',') + ' mill.';
const VIS = !!process.env.BALANSE_VIS;

const START = 40e6;
const GRUNNBYGG = ['kontrollrom', 'brakke', 'aggregat', 'drivstofftank'];
// én kontrakt levert per døgn: typene etter tur, 8 km unna (midt i 2,5–22 km), startryktet og vanlig pris
const KONTRAKT = { perDøgn: 1, meter: 8000, typer: ['eskorte', 'hold', 'rydd', 'hent'], holdTimer: 6 };

const RAMME = {
  // startleiren skal være en stor del av kassa (et valg), men la noe igjen til mat, diesel og en tropp.
  // Funn 13 (spilltesten 22. nov): tre grunnbygg tok 43 % – med kontrollrommet blir det mer. Over 85 % er det ingenting å velge med.
  startAndel: [.35, .85],
  // drift (diesel til strøm og varme + mat) per døgn: må merkes, men ikke spise kassa før spilleren rekker å tjene noe
  driftSommer: [5e4, 1.2e6], driftVinter: [1e5, 2e6],
  // uten inntekt skal standardleiren klare ti døgn uten å gå tom for penger …
  minstEtterTiDøgn: 0,
  // … og drifta skal likevel ta minst 2 % av startpengene på ti døgn (ellers betyr diesel og mat ingenting)
  driftTiDøgnMinst: .02 * START,
  // en vanlig kontrakt skal betale 1–15 døgn med drift (sommer): verdt å ta, men ikke så mye at én kontrakt løser alt
  // (R1-løkka 26. nov) øvre grense 15 -> 20. (R2-løkka) Lønna og vedlikeholdet er nå med i drifta; en rolig eskorte gir ca. to døgn
  kontraktDøgn: [1, 20],
  // (R2-løkka 26. nov, kritikken: «to ufarlige eskorter betalte 2,7 og 3,6 mill. kr for 20 min kjøring, kassa vokste til 20,8 mill. uten at
  // jeg måtte prioritere») en rolig eskorte skal betale høyst så stor del av en farlig jobb (eskorte med bakhold, hold i 6 timer) …
  roligMaks: .5,
  // … og med én kontrakt i døgnet skal kassa vokse med høyst denne delen av startpengene på ti døgn (før: 56 %)
  vekstTiDøgnMaks: .45,
  // de faste utgiftene (lønn + vedlikehold) skal være minst halvparten av drifta om sommeren – det er dem leiren må prioritere etter
  fasteAndel: .5,
  // med én kontrakt i døgnet skal kassa vokse, og et nytt grunnbygg skal koste 2–20 døgn med kontrakter (plan-r18.md, spor A:
  // «betaling gir neste steg i leiren») – kortere, og pengene betyr ingenting; lengre, og kontraktene føles meningsløse
  // (R1-løkka 26. nov, oppdraget: «øk kontraktenes betaling slik at én kontrakt dekker omtrent ett grunnbygg» – kritikken: kontraktene
  // betydde nesten ingenting for kassa) nedre grense 2 -> 0,8: den billigste (dieseltanken) koster nå ca. ett døgn med kontrakter
  byggDøgn: [.8, 20],
  // en ny person skal koste mindre enn én vanlig kontrakt (folk er det viktigste du har)
  rekruttMaksKontrakter: 1,
};

// materialene kjøpes med påslaget (spillet: Marked.kjøpspris med «dyrt» utenfor testene)
function byggPris(type, M) {
  const k = Leir.kostnad(type); let kr = k.pris;
  for (const [v, m] of Object.entries(k.mat || {})) kr += m * Marked.kjøpspris(M, v, Leir.MATERIALER[v].pris, true);
  return kr;
}

function kjør(årstid, medKontrakter) {
  const M = Marked.ny(); let s = 4711; const rng = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const L = Leir.ny(), F = FolkR.ny(); L.folk = F;
  let kasse = START, startKr = 0;
  const betal = kr => (kr <= kasse ? (kasse -= kr, true) : false);
  for (const type of GRUNNBYGG) { const kr = byggPris(type, M); startKr += kr; kasse -= kr;
    L.bygg.push({ id: L.neste++, type, x: L.bygg.length * 30, y: 0, ret: 0, igjen: 0, totalt: 60, pris: Leir.kostnad(type).pris, mat: {}, nivå: 1, hp: 1, nr: L.nesteJobb++, arbeid: null }); }
  const dieselPris = () => Marked.pris(M, 'diesel', 3000), matPris = () => Marked.pris(M, 'mat', FolkR.R.matPris);
  const fyllDiesel = mål => { const l = Math.max(0, Math.min(mål, Leir.kapasitet ? Leir.kapasitet(L) : mål) - L.drivstoff); const kr = Math.round(l * dieselPris()); if (betal(kr)) L.drivstoff += l; return kr; };
  startKr += fyllDiesel(500);
  const etterStart = kasse, dager = []; let drift = 0, faste = 0, inn = 0, rykte = { ...Selskap.REGLER.rykte.start };
  for (let d = 0; d < 10; d++) {
    let dDrift = 0, dFaste = 0;
    for (let h = 0; h < 24; h++) {
      const sol = h >= 6 && h < 20 ? 1 : 0;
      Leir.steg(L, 60, sol);
      FolkR.steg(F, L, 60, { årstid });
      if (L.drivstoff < 150) dDrift += fyllDiesel(500);
      const B = FolkR.behov(F, L, { årstid });
      if (B.dager < 3) { const n = Math.ceil(B.spiser * 5); const kr = Math.round(n * matPris()); if (betal(kr)) { F.mat += n; dDrift += kr; } }
    }
    // (R2-løkka 26. nov) lønna (brukerens 15 000 kr per person per døgn, med inflasjonen) og vedlikeholdet av byggene (Leir.vedlikehold)
    // er med i modellen – før var drifta her bare diesel og mat, og kassa så sterkere ut enn i spillet
    { const lønn = FolkR.lønnPerDøgn(F.personer.length, M.infl), vedl = Leir.vedlikehold(L).perDøgn; if (betal(lønn + vedl)) { dDrift += lønn + vedl; dFaste += lønn + vedl; } }
    let dInn = 0;
    if (medKontrakter) for (let k = 0; k < KONTRAKT.perDøgn; k++) {
      const typ = KONTRAKT.typer[(d + k) % KONTRAKT.typer.length];
      dInn += Selskap.betaling(typ, rykte, 'vanlig', KONTRAKT.meter, KONTRAKT.holdTimer);
      rykte.pålitelig = Math.min(100, rykte.pålitelig + Selskap.REGLER.levert.pålitelig);
    }
    kasse += dInn; inn += dInn; drift += dDrift; faste += dFaste; Marked.steg(M, rng);
    dager.push({ d: d + 1, kasse, drift: dDrift, inn: dInn, folk: F.personer.length, moral: Math.round(F.moral) });
    if (VIS) console.log(`  ${årstid} ${medKontrakter ? 'B' : 'A'} døgn ${d + 1}: kassa ${mill(kasse)}, drift ${mill(dDrift)}, inn ${mill(dInn)}, folk ${F.personer.length}, moral ${Math.round(F.moral)}`);
  }
  return { startKr, etterStart, kasse, drift, faste, inn, dager, infl: M.infl, folk: F.personer.length, L };
}

// ---------- startleiren ----------
{ const M = Marked.ny(), deler = GRUNNBYGG.map(t => `${Leir.BYGG[t].navn} ${mill(byggPris(t, M))}`);
  const A = kjør('sommer', false), andel = A.startKr / START;
  ok(andel >= RAMME.startAndel[0] && andel <= RAMME.startAndel[1], `startleiren (${deler.join(', ')} + 500 l diesel) koster ${mill(A.startKr)} = ${Math.round(andel * 100)} % av 40 mill. (ramme ${RAMME.startAndel.map(v => v * 100 + ' %').join('–')})`); }

// ---------- A: ti døgn uten inntekt ----------
const SA = kjør('sommer', false), VA = kjør('vinter', false);
const dS = SA.drift / 10, dV = VA.drift / 10;
ok(dS >= RAMME.driftSommer[0] && dS <= RAMME.driftSommer[1], `drift om sommeren: ${mill(dS)} per døgn (diesel, mat, lønn og vedlikehold; ramme ${mill(RAMME.driftSommer[0])}–${mill(RAMME.driftSommer[1])})`);
ok(dV >= RAMME.driftVinter[0] && dV <= RAMME.driftVinter[1] && dV > dS, `drift om vinteren: ${mill(dV)} per døgn – mer enn om sommeren (fyring; ramme ${mill(RAMME.driftVinter[0])}–${mill(RAMME.driftVinter[1])})`);
ok(SA.kasse > RAMME.minstEtterTiDøgn && VA.kasse > RAMME.minstEtterTiDøgn, `uten inntekt klarer leiren ti døgn: ${mill(SA.etterStart)} etter start -> ${mill(SA.kasse)} (sommer) / ${mill(VA.kasse)} (vinter)`);
ok(SA.drift >= RAMME.driftTiDøgnMinst, `drifta på ti døgn (${mill(SA.drift)}) merkes: minst ${mill(RAMME.driftTiDøgnMinst)}`);
ok(SA.folk === 10 && VA.folk === 10, `ingen sulter eller drar: ${SA.folk} / ${VA.folk} personer etter ti døgn`);
ok(SA.infl > 1.08 && SA.infl < 1.12, `inflasjonen: prisene er ${Math.round((SA.infl - 1) * 100)} % høyere etter ti døgn (1 % per døgn)`);
{ const n = Math.floor(SA.etterStart / dS); ok(n >= 10, `pengene som er igjen etter start rekker ca. ${n} døgn med drift alene om sommeren (${Math.floor(VA.etterStart / dV)} om vinteren)`); }

// ---------- B: ti døgn med vanlige kontrakter ----------
const SB = kjør('sommer', true), snitt = SB.inn / 10;
ok(SB.kasse > SB.etterStart, `med én kontrakt i døgnet vokser kassa: ${mill(SB.etterStart)} -> ${mill(SB.kasse)} (inn ${mill(SB.inn)}, drift ${mill(SB.drift)})`);
{ const M = Marked.ny(), d = GRUNNBYGG.map(t => byggPris(t, M) / (snitt - dS)), tekst = GRUNNBYGG.map((t, i) => `${Leir.BYGG[t].navn.toLowerCase()} ${d[i].toFixed(1).replace('.', ',')}`);
  ok(d.every(v => v >= RAMME.byggDøgn[0] && v <= RAMME.byggDøgn[1]), `kontraktene gir ${mill(snitt)} per døgn (${(snitt / dS).toFixed(1).replace('.', ',')} × drifta); et nytt grunnbygg koster så mange døgn med kontrakter: ${tekst.join(', ')} (ramme ${RAMME.byggDøgn.join('–')})`); }
{ const r = Selskap.REGLER.rykte.start, en = Selskap.betaling('eskorte', r, 'vanlig', KONTRAKT.meter, 0), ganger = en / dS;
  ok(ganger >= RAMME.kontraktDøgn[0] && ganger <= RAMME.kontraktDøgn[1], `én eskorte (8 km, startryktet) betaler ${mill(en)} = ${ganger.toFixed(1).replace('.', ',')} døgn med drift (ramme ${RAMME.kontraktDøgn.join('–')})`);
  ok(FolkR.R.rekruttPris <= RAMME.rekruttMaksKontrakter * en, `en ny person (${mill(FolkR.R.rekruttPris)}) koster høyst én eskorte (${mill(en)})`);
  // oppdragene (spillet.js) skal ikke betale mer enn kontraktene for mindre fare: et «hent» under en eskorte, en røverpost høyst 2 ×
  let rnd = 7; const rng = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
  let hentMaks = 0, postMaks = 0;
  for (let i = 0; i < 200; i++) { const o = Oppdrag.lag({ x: 0, y: 0 }, i + 2, rng, 0); if (o.type === 'hent') hentMaks = Math.max(hentMaks, o.gir.penger); if (o.type === 'post') postMaks = Math.max(postMaks, o.gir.penger / o.fiender); }
  ok(hentMaks <= en, `oppdraget «hent» betaler høyst ${mill(hentMaks)} – ikke mer enn en eskorte`);
  ok(postMaks <= 2.5 * en, `en røverpost betaler høyst ${mill(postMaks)} per røverlag (høyst 2,5 eskorter)`); }

// ---------- R2-løkka: betaling etter risiko, drift som vokser med leiren ----------
// (ut2-balanse 28. nov) lagTilbud ganger nå også en rolig rute med RISIKO.rolig.faktor – samme regel her
{ const r = Selskap.REGLER.rykte.start, grunnE = Selskap.betaling('eskorte', r, 'vanlig', KONTRAKT.meter, 0), rolig = Math.round(grunnE * (Selskap.REGLER.RISIKO.rolig.faktor || 1)), bakhold = Math.round(grunnE * Selskap.REGLER.RISIKO.bakhold.faktor),
    hold = Selskap.betaling('hold', r, 'vanlig', KONTRAKT.meter, 6);
  ok(rolig <= RAMME.roligMaks * bakhold && rolig <= RAMME.roligMaks * hold, `en rolig eskorte (${mill(rolig)}) betaler høyst ${RAMME.roligMaks * 100} % av en eskorte med bakhold (${mill(bakhold)}) og av å holde et sted i 6 t (${mill(hold)})`);
  const vekst = (SB.kasse - SB.etterStart) / START;
  ok(vekst <= RAMME.vekstTiDøgnMaks, `med én kontrakt i døgnet vokser kassa med ${Math.round(vekst * 100)} % av startpengene på ti døgn (høyst ${RAMME.vekstTiDøgnMaks * 100} %) – pengene må prioriteres`);
  ok(SA.faste / SA.drift >= RAMME.fasteAndel, `lønn og vedlikehold er ${Math.round(SA.faste / SA.drift * 100)} % av drifta om sommeren (${mill(SA.faste / 10)} av ${mill(SA.drift / 10)} per døgn)`);
  const L2 = JSON.parse(JSON.stringify(SA.L)); for (const t of ['brakke', 'verksted', 'sykestue', 'vakttårn']) L2.bygg.push({ id: L2.neste++, type: t, igjen: 0, pris: Leir.kostnad(t).pris, nivå: 1, hp: 1 });
  const v1 = Leir.vedlikehold(SA.L).perDøgn, v2 = Leir.vedlikehold(L2).perDøgn;
  ok(v2 > 1.8 * v1, `vedlikeholdet vokser med leiren: startleiren ${mill(v1)}, med fire bygg til ${mill(v2)} per døgn`); }

// ---------- (R3-løkka 26. nov) tettstedene: verdt å holde, men ikke en pengemaskin ----------
// Kritikken: «Gjøvik gir 1,5–1,7 mill. kr i skatt per døgn mot 0,39 mill. kr i faste utgifter, og kassa steg fra 11,8 til 15,5 mill. med ti
// døde». Oppdraget: et tettsted skal være verdt å holde, men ikke gi mer enn ca. én middels kontrakt per døgn for en mellomstor by.
// Middels kontrakt = «hent person» med startryktet 8 km unna (Claudes valg: midt mellom eskorte og rydd/hold). Mellomstor by = 20 000.
{ const Region = require('../../site/dovre-fliser/spill/region.js'), r = Selskap.REGLER.rykte.start;
  const middels = Selskap.betaling('hent', r, 'vanlig', KONTRAKT.meter, 0), garnison = 12 * FolkR.lønnPerDøgn(1, 1);
  // lojaliteten en garnison holder den på (vanlig skatt + garnison), strøm og åpen rute
  const st = { loj: Region.lojMål({ skatt: 'vanlig', strøm: true, garnison: true }), skatt: 'vanlig', strøm: true, rute: 'åpen' };
  const full = Region.gir(20000, 'by', { ...st, holdt: 99 }).penger, første = Region.gir(20000, 'by', { ...st, holdt: 0 }).penger;
  ok(full <= middels, `en by på 20 000 med full skatt gir ${mill(full)} per døgn til leiren – høyst én middels kontrakt (hent person ${mill(middels)})`);
  ok(full >= 3 * garnison, `… og er verdt å holde: minst tre ganger lønna til en garnison på 12 (${mill(garnison)} per døgn)`);
  ok(første <= .4 * middels, `det første døgnet gir byen bare ${mill(første)} (skatten kommer gradvis)`);
  const smått = Region.gir(1500, 'bygd', { ...st, holdt: 99 }).penger;
  // (ut2-balanse 28. nov) små steder betaler nå minst 6000 × √innbyggere (region.js skattRot), så en bygd på 1500 dekker lønna til en
  // garnison – men den skal fortsatt ikke være en pengemaskin: høyst halvparten av drifta i startleiren (før: under lønna til 12 mann)
  ok(smått <= .5 * SA.drift / 10, `en bygd på 1500 gir ${mill(smått)} i skatt – høyst halvparten av drifta i startleiren (${mill(SA.drift / 10)} per døgn)`);
  ok(smått > 3 * FolkR.lønnPerDøgn(1, 1), `… men mer enn lønna til en garnison på tre (${mill(3 * FolkR.lønnPerDøgn(1, 1))} per døgn)`); }

// ---------- knappe ressurser (R18: «hver kule og hver førstehjelpspakke skal telle», med Silent Hill som stemning) ----------
// Prisene på våpen og ammunisjon eies av spor C (utstyr.js) – her sjekkes bare mengdene du starter med og finner.
{ const Lut = require('../../site/dovre-fliser/spill/lut.js'), Int = require('../../site/dovre-fliser/spill/interior.js');
  const I = Utstyr.ny(), mag = Utstyr.VÅPEN.gevær.magasin;
  ok(I.ting.a556 <= 2 * mag && I.ting.a556 >= mag && (I.ting.forbinding || 0) === 1, `startsekken: ${I.ting.a556} skudd i reserve til geværet (1–2 magasiner) og én førstehjelp`);
  const hus = (kl, i, w, d) => Int.plan([[0, 0], [w, 0], [w, d], [0, d]], { i, kl, h: 6, dør: { x: w / 2, y: 0, ux: 1, uy: 0, w: 1 } });
  const snitt = (kl, w, d) => { const sum = {}, N = 150; for (let n = 1; n <= N; n++) { const i = n * 37 + 11; for (const b of Lut.beholdere(hus(kl, i, w, d), i)) for (const [id, q] of Object.entries(Lut.innhold(kl, b.type, i, b.k).t)) sum[id] = (sum[id] || 0) + q; } for (const k of Object.keys(sum)) sum[k] /= N; return sum; };
  const H = snitt('hus', 10, 8), S = snitt('sykehus', 24, 16), tall = v => (v || 0).toFixed(2).replace('.', ',');
  // RAMMENE: et vanlig hus gir 0,1–0,4 førstehjelp (du må lete i 3–10 hus for én) og 0,1–1,5 skudd 5,56 mm; et sykehus minst tre
  ok(H.forbinding >= .1 && H.forbinding <= .4, `et vanlig hus gir i snitt ${tall(H.forbinding)} førstehjelp (ramme 0,1–0,4: knapt, men ikke umulig)`);
  ok(H.a556 >= .1 && H.a556 <= 1.5, `et vanlig hus gir i snitt ${tall(H.a556)} skudd 5,56 mm (ramme 0,1–1,5)`);
  ok(S.forbinding >= 3, `et sykehus gir i snitt ${tall(S.forbinding)} førstehjelp – det er der du leter etter medisin`);
  ok((H.batterier || 0) <= 1, `batterier: ${tall(H.batterier)} per hus (høyst ett – lyset skal også telle)`); }

// ---------- drivhuset lønner seg ----------
{ const kwKr = -Leir.BYGG.drivhus.kw * 24 * Leir.DRIVSTOFF.literPerKWt * Leir.DRIVSTOFF.prisPerLiter, mat = FolkR.R.drivhus * FolkR.R.matPris;
  ok(mat >= kwKr * .8, `drivhuset om sommeren: ${FolkR.R.drivhus} rasjoner (${Math.round(mat)} kr) mot strøm fra aggregat (${Math.round(kwKr)} kr) i døgnet`); }

console.log(feil ? `${feil} FEIL i balansen` : 'alle balansetestene ok');
process.exit(feil ? 1 : 0);
