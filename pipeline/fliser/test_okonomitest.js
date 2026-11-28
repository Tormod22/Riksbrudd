// ØKONOMITESTEN (G1, docs/plan-selskap-okonomi.md 13.4): spiller 30 spilldøgn av seg selv med faste strategier og mange frø
// (pipeline/fliser/okosim.js, de ekte regelmodulene), skriver et bånd per strategi og sjekker kravene i REGLER.
//   node pipeline/fliser/test_okonomitest.js              vanlig kjøring (ca. 10–20 s)
//   OKO_FRØ=100 node …                                     flere frø per strategi
//   OKO_VIS=kontrakter OKO_FRØ_EN=3 node …                 skriver hendelsene i én kjøring (strategi og frø)
//   OKO_NYTT_BAND=1 node …                                 lagrer båndet på nytt i okonomitest-band.json (etter en ønsket endring)
//   OKO_STRENG=1 node …                                    de kjente bruddene (KJENT) feiler også
// Notatet docs/natt/ut1-okotest.md forklarer modellen, funnene og hvordan nye økonomideler legger til sin del.
'use strict';
const fs = require('fs'), path = require('path');
const O = require('./okosim.js');

// ---------- kravene (Claudes forslag) ----------
const REGLER = {
  frø: +process.env.OKO_FRØ || 60,          // kjøringer per strategi (5 strategier × 60 = 300)
  grense: 200e6,                            // ingen strategi skal ha over 200 mill. i kassa på 30 døgn (planen 13.4)
  ingentingFørst: 5,                         // «gjør ingenting» skal ikke være blakk før dag 5 i noen kjøring …
  ingentingDager: [1, 10, 20, 30],          // … og medianen skal gå nedover fra måling til måling (røverbelønningen gir små hopp innimellom)
  utenSjanse: { døgn: 3, andel: .1 },        // en fornuftig strategi: høyst 10 % av kjøringene blakk de tre siste døgnene
  slårIngenting: true,                       // en fornuftig strategi skal ende over «gjør ingenting» (medianen dag 30)
  bandDager: [1, 3, 5, 10, 15, 20, 25, 30],  // dagene båndet skrives for
  // båndet i okonomitest-band.json: medianen av kassa dag 10 og 30 skal ligge nær den lagrede (innen «bandDel» av 10–90 %-spennet,
  // minst «bandSlakk»), og medianen av hver inntekt over 30 døgn innen «postDel» (minst «bandSlakk») – ellers er balansen flyttet
  bandDel: .25, postDel: .35, bandSlakk: 1e6,
  maksSek: 100,                              // hele testen skal ta under ca. 2 minutter (inn2.sh)
};
// KJENTE BRUDD: krav som brytes i dag og er meldt i notatet (balansen endres ikke i denne pakka). De skrives ut som «KJENT» og feiler
// ikke testen – med OKO_STRENG=1 gjør de det. Fjern linja når balansen er rettet.
const KJENT = {
  'grense:kontrakter': 'docs/natt/ut1-okotest.md, funn 1 (28. nov): én tropp som tar kontrakt etter kontrakt, når 200 mill. rundt dag 15–20',
  'grense:blandet': 'samme som over: kontraktene drar «blandet» over grensen',
  'utenSjanse:byer': 'docs/natt/ut1-okotest.md, funn 2 (28. nov): småbyene gir lite skatt, og troppen og garnisonene spiser kassa',
};
const BAND_FIL = path.join(__dirname, 'okonomitest-band.json');

let feil = 0, kjente = 0;
const ok = (b, t, nøkkel) => {
  if (b) { console.log('ok    ' + t); return; }
  if (nøkkel && KJENT[nøkkel] && !process.env.OKO_STRENG) { kjente++; console.log('KJENT ' + t + '\n        (' + KJENT[nøkkel] + ')'); return; }
  feil++; console.log('FEIL  ' + t);
};
const mill = v => (v / 1e6).toFixed(1).replace('.', ',') + ' mill.';
const kvant = (L, q) => { const a = L.slice().sort((x, y) => x - y); if (!a.length) return NaN; const i = (a.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };

// ---------- én kjøring med hendelser (feilsøking) ----------
if (process.env.OKO_VIS) {
  const r = O.kjør(process.env.OKO_VIS, +process.env.OKO_FRØ_EN || 1, { logg: true });
  console.log(r.hendelser.join('\n'));
  console.log(`slutt ${mill(r.slutt)}, maks ${mill(r.maks)} (dag ${r.maksDag}), blakk fra dag ${r.blakkDag}, inn`, r.sum.inn, 'ut', r.sum.ut);
  process.exit(0);
}

// ---------- alle kjøringene ----------
const t0 = Date.now(), RES = {};
for (const id of Object.keys(O.STRATEGIER)) { RES[id] = []; for (let f = 1; f <= REGLER.frø; f++) RES[id].push(O.kjør(id, f)); }
const sek = (Date.now() - t0) / 1000, antall = Object.values(RES).reduce((a, L) => a + L.length, 0);

// ---------- båndet ----------
const kasseDag = (L, d) => L.map(r => (r.dager[d - 1] || r.dager[r.dager.length - 1]).kasse);
const BAND = {};
// båndet for én strategi: kassa (10 %, median, 90 %) per dag i bandDager, og medianen av hver inntekt over hele kjøringen
function lagBand(L) {
  const B = { dager: {}, inn: {} };
  for (const d of REGLER.bandDager) { const k = kasseDag(L, d); B.dager[d] = [kvant(k, .1), kvant(k, .5), kvant(k, .9)]; }
  const poster = new Set(L.flatMap(r => Object.keys(r.sum.inn))); for (const p of poster) B.inn[p] = kvant(L.map(r => r.sum.inn[p] || 0), .5);
  return B;
}
// sammenlign et bånd med det lagrede: gir [{ ok, tekst }]
function motBand(id, B, R) {
  const ut = [], navn = O.STRATEGIER[id].navn;
  for (const d of [10, 30]) { const [a, ref, b] = R.dager[d], m = B.dager[d][1], tol = Math.max(REGLER.bandSlakk, REGLER.bandDel * (b - a)), inne = Math.abs(m - ref) <= tol;
    ut.push({ ok: inne, tekst: `«${navn}» dag ${d}: median ${mill(m)} ${inne ? 'som før' : 'FLYTTET'} (lagret ${mill(ref)} ± ${mill(tol)})` }); }
  for (const p of new Set([...Object.keys(R.inn), ...Object.keys(B.inn)])) { const ref = R.inn[p] || 0, m = B.inn[p] || 0, tol = Math.max(REGLER.bandSlakk, REGLER.postDel * ref), inne = Math.abs(m - ref) <= tol;
    if (!inne || ref > REGLER.bandSlakk) ut.push({ ok: inne, tekst: `«${navn}» inntekten «${p}» på 30 døgn: median ${mill(m)} ${inne ? 'som før' : 'FLYTTET'} (lagret ${mill(ref)} ± ${mill(tol)})` }); }
  return ut;
}
console.log(`\nØkonomitesten: ${antall} kjøringer à ${O.REGLER.døgn} spilldøgn på ${sek.toFixed(1).replace('.', ',')} s (start ${mill(O.ekteStartpenger())}, ${O.REGLER.årstid})`);
console.log('Kassa per strategi: median [10 %–90 %] i mill. kr');
console.log('strategi'.padEnd(26) + REGLER.bandDager.map(d => ('dag ' + d).padStart(16)).join(''));
for (const [id, L] of Object.entries(RES)) {
  BAND[id] = lagBand(L);
  const celler = REGLER.bandDager.map(d => { const [a, m, b] = BAND[id].dager[d];
    return `${(m / 1e6).toFixed(0)} [${(a / 1e6).toFixed(0)}–${(b / 1e6).toFixed(0)}]`.padStart(16); });
  console.log(O.STRATEGIER[id].navn.padEnd(26) + celler.join(''));
}
// hva pengene kom fra og gikk til (snitt over kjøringene), og noen nøkkeltall
console.log('\nPenger inn og ut på 30 døgn (snitt, mill. kr), og nøkkeltall:');
for (const [id, L] of Object.entries(RES)) {
  const sum = (hva) => { const t = {}; for (const r of L) for (const [k, v] of Object.entries(r.sum[hva])) t[k] = (t[k] || 0) + v / L.length; return Object.entries(t).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / 1e6).toFixed(1).replace('.', ',')}`).join(', '); };
  const snitt = f => (L.reduce((a, r) => a + f(r), 0) / L.length);
  const k = snitt(r => r.kontrakter ? r.kontrakter.levert : 0), b = snitt(r => r.kontrakter ? r.kontrakter.brutt : 0);
  console.log(`  ${O.STRATEGIER[id].navn}: inn: ${sum('inn') || '–'} · ut: ${sum('ut')}`);
  console.log(`      kontrakter levert ${k.toFixed(1)} / brutt ${b.toFixed(1)}, tettsteder tatt ${snitt(r => r.byerTatt || 0).toFixed(1)} (holder ${snitt(r => r.byer).toFixed(1)} på dag 30), nivå ${snitt(r => r.nivå).toFixed(1)}, folk ${snitt(r => r.folk).toFixed(0)}, døde ${snitt(r => r.døde).toFixed(0)}, røverbølger slått ${snitt(r => r.røverInn).toFixed(0)} / herjet ${snitt(r => r.røverUt).toFixed(0)}`);
}
console.log('');

// ---------- kravene ----------
// 1) ingen strategi over grensen
for (const [id, L] of Object.entries(RES)) {
  const over = L.map(r => ({ r, dag: (r.dager.find(d => d.kasse > REGLER.grense) || {}).dag })).filter(q => q.dag);
  const navn = O.STRATEGIER[id].navn;
  if (!over.length) { ok(true, `«${navn}» holder seg under ${mill(REGLER.grense)} (høyst ${mill(Math.max(...L.map(r => r.maks)))})`); continue; }
  const dag = Math.round(kvant(over.map(q => q.dag), .5)), verst = over.reduce((a, q) => (q.r.maks > a.r.maks ? q : a));
  ok(false, `«${navn}» går over grensen på dag ${dag} (median i ${over.length} av ${L.length} kjøringer; verst frø ${verst.r.frø}: ${mill(verst.r.maks)} på dag ${verst.r.maksDag})`, 'grense:' + id);
}
// 2) «gjør ingenting» taper penger sakte
if (RES.ingenting) { const L = RES.ingenting, navn = O.STRATEGIER.ingenting.navn;
  const tidlig = L.filter(r => r.dager.some(d => d.dag < REGLER.ingentingFørst && d.kasse < d.faste));
  ok(!tidlig.length && L.every(r => r.dager[0].kasse > r.dager[0].faste), `«${navn}» er ikke blakk før dag ${REGLER.ingentingFørst} (${tidlig.length} av ${L.length} kjøringer er det; dag 1: ${mill(kvant(kasseDag(L, 1), .5))})`);
  const D = REGLER.ingentingDager, m = D.map(d => kvant(kasseDag(L, d), .5)), ned = m.every((v, i) => !i || v < m[i - 1] || (v === 0 && m[i - 1] === 0));
  const blakk = Math.round(kvant(L.map(r => (r.dager.find(d => d.kasse < d.faste) || { dag: Infinity }).dag), .5));
  ok(ned, `«${navn}» går nedover: ${D.map((d, i) => `dag ${d} ${mill(m[i])}`).join(' -> ')}, blakk rundt dag ${Number.isFinite(blakk) ? blakk : 'aldri'}`); }
// 3) en fornuftig strategi blir ikke blakk uten sjanse, og 4) slår «gjør ingenting»
const ingenMed = RES.ingenting ? kvant(kasseDag(RES.ingenting, O.REGLER.døgn), .5) : -Infinity;
for (const [id, L] of Object.entries(RES)) { const st = O.STRATEGIER[id]; if (!st.fornuftig) continue;
  const U = REGLER.utenSjanse, uten = L.filter(r => r.dager.slice(-U.døgn).every(d => d.kasse < d.faste)), andel = uten.length / L.length;
  ok(andel <= U.andel, `«${st.navn}» blir ikke blakk uten sjanse: ${uten.length} av ${L.length} kjøringer (${Math.round(andel * 100)} %) er blakk de ${U.døgn} siste døgnene (høyst ${U.andel * 100} %)` + (uten.length ? `, f.eks. frø ${uten.slice(0, 3).map(r => r.frø).join(', ')}` : ''), 'utenSjanse:' + id);
  if (REGLER.slårIngenting) { const m = kvant(kasseDag(L, O.REGLER.døgn), .5); ok(m > ingenMed, `«${st.navn}» ender over «gjør ingenting» (median dag ${O.REGLER.døgn}: ${mill(m)} mot ${mill(ingenMed)})`, 'utenSjanse:' + id); } }
// 5) krav fra økonomidelene (okosim.leggTilKrav) – f.eks. sagbruk, byavtaler, børs
for (const K of O.KRAV) for (const q of [].concat(K.sjekk(RES, REGLER) || [])) ok(q.ok, `${K.navn}: ${q.tekst}`, q.kjent);
// 6) båndet: medianene skal ligge nær de lagrede (en endring i reglene som flytter balansen mye, sies fra om her)
if (process.env.OKO_NYTT_BAND) { fs.writeFileSync(BAND_FIL, JSON.stringify({ laget: new Date().toISOString().slice(0, 10), frø: REGLER.frø, band: BAND }, null, 1)); console.log('ok    båndet er lagret på nytt i ' + path.basename(BAND_FIL)); }
else if (fs.existsSync(BAND_FIL)) { const ref = JSON.parse(fs.readFileSync(BAND_FIL, 'utf8'));
  if (ref.frø !== REGLER.frø) console.log(`obs   båndet er lagret med ${ref.frø} frø per strategi, nå ${REGLER.frø} – sammenligningen blir grovere`);
  for (const [id, B] of Object.entries(BAND)) { const R = ref.band[id]; if (!R || !R.dager) { console.log(`ny    «${O.STRATEGIER[id].navn}» har ikke noe lagret bånd ennå (OKO_NYTT_BAND=1)`); continue; }
    for (const q of motBand(id, B, R)) ok(q.ok, q.tekst + (q.ok ? '' : ` (${ref.laget}) – er endringen meningen, kjør OKO_NYTT_BAND=1`)); }
  // 7) SELVTEST (årsak H: en kontroll må finne en feil lagt inn med vilje): den gamle feilen med døgnlengden i tettstedene (R3-løkka 26. nov:
  // et «handelsdøgn» var ti minutter ekte spilling, så tettstedene ga 2,4 ganger så mye per spilldøgn). Lagt inn her som skatt × 2,4 for
  // «byer med makt» – båndkontrollen skal si fra.
  if (RES.byer && ref.band.byer && ref.frø === REGLER.frø) { const L = Array.from({ length: REGLER.frø }, (_, i) => O.kjør('byer', i + 1, { faktor: { skatt: 2.4 } }));
    const q = motBand('byer', lagBand(L), ref.band.byer).filter(x => !x.ok);
    ok(q.length > 0, `selvtest: med den gamle døgnlengdefeilen (skatt × 2,4) sier båndkontrollen fra (${q.length} avvik, f.eks. ${q.length ? q[q.length - 1].tekst : '–'})`); } }
else console.log('ny    ingen lagret bånd (kjør OKO_NYTT_BAND=1 for å lage okonomitest-band.json)');
// 8) tiden
ok(sek < REGLER.maksSek, `${antall} kjøringer tok ${sek.toFixed(1).replace('.', ',')} s (høyst ${REGLER.maksSek} s, så inn2.sh rekker det)`);

console.log(feil ? `\n${feil} FEIL i økonomitesten` + (kjente ? ` (og ${kjente} kjente brudd)` : '') : `\nøkonomitesten ok` + (kjente ? ` – men ${kjente} kjente brudd (se KJENT øverst og docs/natt/ut1-okotest.md)` : ''));
process.exit(feil ? 1 : 0);
