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
const Tropper = require('../../site/dovre-fliser/spill/tropper.js');

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
  kontraktDøgn: [1, 15],
  // med én kontrakt i døgnet skal kassa vokse, og et nytt grunnbygg skal koste 2–20 døgn med kontrakter (plan-r18.md, spor A:
  // «betaling gir neste steg i leiren») – kortere, og pengene betyr ingenting; lengre, og kontraktene føles meningsløse
  byggDøgn: [2, 20],
  // en ny person skal koste mindre enn én vanlig kontrakt (folk er det viktigste du har)
  rekruttMaksKontrakter: 1,
  // samme våpen skal koste omtrent det samme for deg (sekken) og for lagene (troppebyggeren): sekken 1–3 ganger troppens pris
  våpenForhold: [1, 3],
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
  const etterStart = kasse, dager = []; let drift = 0, inn = 0, rykte = { ...Selskap.REGLER.rykte.start };
  for (let d = 0; d < 10; d++) {
    let dDrift = 0;
    for (let h = 0; h < 24; h++) {
      const sol = h >= 6 && h < 20 ? 1 : 0;
      Leir.steg(L, 60, sol);
      FolkR.steg(F, L, 60, { årstid });
      if (L.drivstoff < 150) dDrift += fyllDiesel(500);
      const B = FolkR.behov(F, L, { årstid });
      if (B.dager < 3) { const n = Math.ceil(B.spiser * 5); const kr = Math.round(n * matPris()); if (betal(kr)) { F.mat += n; dDrift += kr; } }
    }
    let dInn = 0;
    if (medKontrakter) for (let k = 0; k < KONTRAKT.perDøgn; k++) {
      const typ = KONTRAKT.typer[(d + k) % KONTRAKT.typer.length];
      dInn += Selskap.betaling(typ, rykte, 'vanlig', KONTRAKT.meter, KONTRAKT.holdTimer);
      rykte.pålitelig = Math.min(100, rykte.pålitelig + Selskap.REGLER.levert.pålitelig);
    }
    kasse += dInn; inn += dInn; drift += dDrift; Marked.steg(M, rng);
    dager.push({ d: d + 1, kasse, drift: dDrift, inn: dInn, folk: F.personer.length, moral: Math.round(F.moral) });
    if (VIS) console.log(`  ${årstid} ${medKontrakter ? 'B' : 'A'} døgn ${d + 1}: kassa ${mill(kasse)}, drift ${mill(dDrift)}, inn ${mill(dInn)}, folk ${F.personer.length}, moral ${Math.round(F.moral)}`);
  }
  return { startKr, etterStart, kasse, drift, inn, dager, infl: M.infl, folk: F.personer.length };
}

// ---------- startleiren ----------
{ const M = Marked.ny(), deler = GRUNNBYGG.map(t => `${Leir.BYGG[t].navn} ${mill(byggPris(t, M))}`);
  const A = kjør('sommer', false), andel = A.startKr / START;
  ok(andel >= RAMME.startAndel[0] && andel <= RAMME.startAndel[1], `startleiren (${deler.join(', ')} + 500 l diesel) koster ${mill(A.startKr)} = ${Math.round(andel * 100)} % av 40 mill. (ramme ${RAMME.startAndel.map(v => v * 100 + ' %').join('–')})`); }

// ---------- A: ti døgn uten inntekt ----------
const SA = kjør('sommer', false), VA = kjør('vinter', false);
const dS = SA.drift / 10, dV = VA.drift / 10;
ok(dS >= RAMME.driftSommer[0] && dS <= RAMME.driftSommer[1], `drift om sommeren: ${mill(dS)} per døgn (diesel og mat; ramme ${mill(RAMME.driftSommer[0])}–${mill(RAMME.driftSommer[1])})`);
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

// ---------- våpenprisene henger sammen ----------
{ const PAR = [['mp', 'maskinpistol'], ['hagle', 'hagle'], ['rifle', 'presisjonsrifle']], linjer = [];
  let alle = true;
  for (const [s, t] of PAR) { const a = Utstyr.VÅPEN[s].pris, b = Tropper.VÅPEN[t].pris, f = a / b; linjer.push(`${Utstyr.VÅPEN[s].navn} ${a / 1000}k / ${b / 1000}k`); alle = alle && f >= RAMME.våpenForhold[0] && f <= RAMME.våpenForhold[1]; }
  ok(alle, `samme våpen koster 1–3 ganger så mye i sekken som i troppebyggeren: ${linjer.join(', ')}`);
  const pakke = Utstyr.TING.a556.pris * Utstyr.TING.a556.pakke; ok(pakke < Utstyr.VÅPEN.gevær.pris / 5, `en pakke 5,56 mm (${pakke} kr) koster under en femdel av geværet (${Utstyr.VÅPEN.gevær.pris} kr)`); }

// ---------- drivhuset lønner seg ----------
{ const kwKr = -Leir.BYGG.drivhus.kw * 24 * Leir.DRIVSTOFF.literPerKWt * Leir.DRIVSTOFF.prisPerLiter, mat = FolkR.R.drivhus * FolkR.R.matPris;
  ok(mat >= kwKr * .8, `drivhuset om sommeren: ${FolkR.R.drivhus} rasjoner (${Math.round(mat)} kr) mot strøm fra aggregat (${Math.round(kwKr)} kr) i døgnet`); }

console.log(feil ? `${feil} FEIL i balansen` : 'alle balansetestene ok');
process.exit(feil ? 1 : 0);
