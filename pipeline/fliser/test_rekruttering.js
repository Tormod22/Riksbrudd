// Test av spill/rekruttering.js (pakke «rekruttering», 28. nov): søkere, lønnskrav, bud og «By over», lokking, egen lønn per person,
// opplæring på øvingsfeltet og mester og lærling. Kjør: node pipeline/fliser/test_rekruttering.js
const path = require('path'), SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const FR = require(SP + '/folk.js'), LB = require(SP + '/leir.js'), RK = require(SP + '/rekruttering.js'), K = require(SP + '/kommando.js');
let feil = 0; const ok = (b, t) => { if (b) console.log('ok  ', t); else { feil++; console.log('FEIL', t); } };
const R = RK.REGLER;
// en leir med brakke (16 senger) og et ferdig øvingsfelt
let bid = 1; const bygg = (type, ekstra = {}) => ({ id: bid++, type, x: bid * 20, y: 0, ret: 0, igjen: 0, totalt: 60, hp: 1, nivå: 1, ...ekstra });
const leir = () => { const L = LB.ny(); L.bygg.push(bygg('brakke', { nivå: 2 }), bygg('brakke')); return L; };

// ---------- søkerne ----------
{ ok(LB.BYGG.øvingsfelt && LB.BYGG.øvingsfelt.nivå.elever.length === 3, 'øvingsfeltet ligger i Leir.BYGG med elevplasser per nivå');
  ok(RK.forventet({ rykte: 50 }) === 1 && RK.forventet({ rykte: 90, byer: 4, avtaler: 3 }) === 3 && RK.forventet({ rykte: 0 }) < RK.forventet({ rykte: 50 }), 'flere søkere med godt rykte, byer og avtaler (0–3)');
  const S = RK.ny(7), F = FR.ny(11); let tall = [], alle = [];
  for (let d = 0; d < 60; d++) { const S2 = RK.ny(100 + d), r = RK.rng(S2); const u = RK.morgen(S2, F, d * 1440, { rykte: 50 }, r, { lokk: false }); tall.push(u.nye.length); alle.push(...u.nye); }
  ok(Math.min(...tall) >= 0 && Math.max(...tall) <= 3 && tall.some(n => n === 0) && tall.some(n => n >= 2), 'hver morgen 0–3 søkere: ' + tall.slice(0, 20).join(','));
  ok(F.personer.length === 10, 'søkerne er ikke med i gjengen før de er ansatt');
  const navn = new Set(alle.map(s => s.navn)); ok(navn.size === alle.length && alle.every(s => !F.personer.some(p => p.navn === s.navn)), 'alle søkerne har ulike navn (ikke brukt i gjengen)');
  ok(alle.every(s => s.lønn >= 12000 && s.lønn <= 25000 && s.lønn % 500 === 0), 'lønnskravet er 12 000–25 000 kr (hele 500)');
  const dyktig = alle.filter(s => RK.beste(s) >= 1.4), svak = alle.filter(s => RK.beste(s) < 1.1); ok(dyktig.length && svak.length && Math.min(...dyktig.map(s => s.lønn)) > Math.max(...svak.map(s => s.lønn)) - 1, 'de dyktige krever mer enn de svake');
  ok(alle.some(s => s.egen.length) && alle.some(s => !s.egen.length) && alle.every(s => s.egen.length <= 2 && s.egen.every(e => RK.EGENSKAPER[e])), 'noen har 1–2 egenskaper, mange ingen');
  ok(alle.some(s => s.bud) && alle.every(s => !s.bud || (RK.beste(s) >= R.bud.ferdighet && s.bud.lønn > s.lønn && /Ravnsund|Mosevakt/.test(s.bud.navn))), 'bare de dyktigste har bud fra Ravnsund/Mosevakt, høyere enn kravet');
  // de står i noen døgn og går
  const r = RK.rng(S); let u; do { u = RK.morgen(S, F, 0, { rykte: 90, byer: 3 }, r, { lokk: false }); } while (!u.nye.length);
  const n0 = S.søkere.length; ok(!RK.steg(S, F, 1440).length && S.søkere.length === n0, 'etter ett døgn står søkerne fortsatt');
  const h = RK.steg(S, F, 5 * 1440); ok(S.søkere.length === 0 && h.length === 1 && /ventet ikke lenger/.test(h[0]), 'etter fire døgn er de gått (én linje i loggen)');
  // bud: venter du, går de til rivalen
  const S3 = RK.ny(5), F3 = FR.ny(3); S3.søkere.push({ id: 99, navn: 'Ola Test', yrke: 'bilmekaniker', ferd: { verksted: 1.45 }, egen: [], lønn: 20000, går: 1e9, bud: { navn: 'Ravnsund', lønn: 23000 } });
  let gikk = false; for (let i = 0; i < 30 && !gikk; i++) gikk = RK.morgen(S3, F3, i * 1440, { rykte: 0 }, RK.rng(S3), { lokk: false }).tilRival.length > 0;
  ok(gikk && !S3.søkere.some(s => s.id === 99), 'en søker med bud går til rivalen hvis du venter');
  ok(RK.morgen(RK.ny(1), F3, 0, {}, RK.rng(RK.ny(1)), { lokk: false }).nye.length <= R.maksListe, 'høyst seks på lista'); }

// ---------- ansette og «By over» ----------
{ const S = RK.ny(9), F = FR.ny(12), L = leir(); let kasse = 5e6; const betal = kr => (kasse >= kr ? (kasse -= kr, true) : false);
  S.søkere.push({ id: 1, navn: 'Kari Søker', alder: 30, yrke: 'kokk', ferd: { ...F.personer[0].ferd, kjøkken: 1.45 }, lojal: .6, egen: ['flittig'], lønn: 19000, går: 1e9 },
    { id: 2, navn: 'Per Dyktig', alder: 40, yrke: 'bilmekaniker', ferd: { ...F.personer[0].ferd, verksted: 1.45 }, lojal: .5, egen: [], lønn: 20000, går: 1e9, bud: { navn: 'Mosevakt', lønn: 23000 } });
  F.moral = 70; const a = RK.ansett(S, F, L, 1, betal);
  ok(a.person && a.pris === R.utstyr && kasse === 5e6 - R.utstyr && F.personer.length === 11 && a.person.lønn === 19000 && a.person.egen[0] === 'flittig', 'ansettelse: utstyret trekkes, personen er med og har lønnskravet sitt');
  ok(F.personer.filter(p => p.id === a.person.id).length === 1 && new Set(F.personer.map(p => p.id)).size === F.personer.length, 'ny id som ingen andre har');
  ok(/bud fra Mosevakt/.test(RK.ansett(S, F, L, 2, betal).feil), 'en med bud kan ikke ansettes til kravet – du må by over');
  const b = RK.ansett(S, F, L, 2, betal, { byOver: true });
  ok(b.person && b.person.lønn === 23000 + R.bud.overbud && b.byOver && !S.søkere.length, '«By over»: ansatt for budet + 1 000 kr');
  // lønna per person
  const før = FR.lønnSum(F), standard = (F.personer.length - 2) * FR.R.lønn + 19000 + 24000; ok(før === standard, 'lønnSum regner hver persons egen lønn: ' + før);
  let k2 = 1e7; const G = FR.fraJSON(JSON.parse(JSON.stringify(F))); G.lønnAkk = 0; G.lønnTid = 0; FR.lønnSteg(G, 60, kr => { k2 -= kr; return true; });
  ok(1e7 - k2 === Math.round(standard / 24), 'lønnSteg trekker lønna per person (en time): ' + (1e7 - k2));
  ok(G.personer.find(p => p.navn === 'Per Dyktig').lønn === 24000, 'egen lønn lagres med folket (fraJSON)');
  ok(FR.lønnSum(FR.ny(1)) === 150000 && FR.lønnSum(FR.ny(1), 2, 1.1) === Math.round(12 * 15000 * 1.1), 'uten egen lønn: 15 000 kr som før (også troppene og inflasjonen)');
  // uten seng: ingen ansettelse; i nød: alltid
  const S4 = RK.ny(2), F4 = FR.ny(3), L4 = LB.ny(); S4.søkere.push({ id: 5, navn: 'Liv Uten', ferd: { bygg: 1 }, egen: [], lønn: 14000, går: 1e9 });
  ok(/seng/.test(RK.ansett(S4, F4, L4, 5, () => true).feil), 'uten ledig seng kan ingen ansettes');
  F4.personer.splice(2); const n = RK.ansett(S4, F4, L4, 5, () => true); ok(n.person && n.person.oppgave === 'bygg' && F4.personer.length === 3, 'under tre i gjengen (nød): ansettelse uten seng, rett på bygg');
  ok(/penger/.test(RK.ansett(RK.fraJSON({ søkere: [{ id: 1, navn: 'A B', ferd: { bygg: 1 }, lønn: 13000, går: 1e9 }] }), FR.ny(1), L, 1, () => false).feil || ''), 'uten penger til utstyret: avvist'); }

// ---------- rivalene lokker ----------
{ const S = RK.ny(3), F = FR.ny(5); for (const p of F.personer) p.lojal = .9; const p = F.personer[0]; p.lojal = .3; p.ferd.bygg = 1.45; p.lønn = 12000;
  ok(RK.misfornøyd(F, p) && !RK.misfornøyd(F, F.personer[1]), 'misfornøyd: lav lojalitet og lav lønn mot ferdigheten');
  let l = null; for (let i = 0; i < 60 && !l; i++) l = RK.lokkSjekk(S, F, i * 1440, RK.rng(S));
  ok(l && l.id === p.id && l.lønn > 12000 && /tilbudt/.test(l.tekst), 'en misfornøyd får tilbud fra en rival: ' + (l && l.tekst));
  const T = JSON.parse(JSON.stringify(S)), FT = FR.fraJSON(JSON.parse(JSON.stringify(F)));
  const s1 = RK.svarLokk(S, F, 'tillegg'); ok(p.lønn === l.lønn && p.lojal > .3 && !S.lokk && F.personer.includes(p), '«Gi lønnstillegg»: lønna opp, hen blir: ' + s1.tekst);
  const S2 = RK.fraJSON(T), h = RK.steg(S2, FT, l.frist + 1); ok(!FT.personer.some(q => q.id === p.id) && /gått over til/.test(h.join()), 'svarer du ikke innen fristen, går hen');
  const S3 = RK.fraJSON(T), F3 = FR.fraJSON(JSON.parse(JSON.stringify(F))); RK.svarLokk(S3, F3, 'gå'); ok(F3.personer.length === 9, '«La gå»: hen går');
  const F5 = FR.ny(5); for (const q of F5.personer) q.lojal = .95; let ingen = true; const S5 = RK.ny(4); for (let i = 0; i < 40; i++) if (RK.lokkSjekk(S5, F5, 0, RK.rng(S5))) ingen = false;
  ok(ingen, 'fornøyde folk blir ikke lokket'); }

// ---------- egenskaper ----------
{ const p = { egen: ['flittig', 'nattmenneske', 'modig'] };
  ok(RK.personF(p, 'bygg', 12) === 1.1 && Math.abs(RK.personF(p, 'bygg', 23) - 1.1 * 1.15) < 1e-9 && Math.abs(RK.personF(p, 'vakt', 12) - 1.1 * 1.15) < 1e-9 && RK.personF({}, 'bygg', 12) === 1, 'flittig +10 %, nattmenneske om natta, modig på vakt');
  const F = FR.ny(2), q = F.personer.find(x => x.oppgave === 'bygg'), t0 = FR.personTempo(F, q, 'bygg'); q.egen = ['flittig']; FR.personF = (a, o) => RK.personF(a, o, 12);
  ok(Math.abs(FR.personTempo(F, q, 'bygg') / t0 - 1.1) < 1e-9, 'kroken FolkRegler.personF gir tempoet'); FR.personF = null; }

// ---------- opplæring ----------
{ const F = FR.ny(8), L = leir(); const p = F.personer.find(x => x.oppgave === 'bygg'); p.ferd.maskin = 1;
  ok(/øvingsfelt/.test(RK.startOpplæring(F, L, p.id, 'maskin').feil), 'uten øvingsfelt: ingen opplæring');
  L.bygg.push(bygg('øvingsfelt')); ok(RK.plasser(L) === 4, 'et øvingsfelt gir fire elevplasser');
  ok(RK.plasser(L, new Set([L.bygg[2].id])) === 0, 'uten strøm: ingen plasser');
  const a0 = FR.arbeidere(F, 'bygg'), s = RK.startOpplæring(F, L, p.id, 'maskin'); ok(s.person && p.skole === 'maskin' && !FR.arbeidsfør(p) && FR.arbeidere(F, 'bygg') === a0 - 1, 'på opplæring arbeider hen ikke');
  RK.skoleSteg(F, L, 1440); ok(Math.abs(p.ferd.maskin - 1.05) < 1e-6, 'ferdigheten stiger 0,05 per døgn: ' + p.ferd.maskin);
  let H = []; for (let i = 0; i < 20 && p.skole; i++) H = H.concat(RK.skoleSteg(F, L, 1440)); ok(p.ferd.maskin === 1.45 && !p.skole && FR.arbeidsfør(p) && /ferdig utlært/.test(H.join()), 'taket 1,45, og så tilbake i arbeid');
  const q = F.personer.find(x => x !== p); q.egen = ['lærenem']; q.ferd.stell = 1; RK.startOpplæring(F, L, q.id, 'stell'); RK.skoleSteg(F, L, 1440); ok(Math.abs(q.ferd.stell - 1.075) < 1e-6, 'lærenem lærer 50 % raskere');
  for (const x of F.personer.filter(x => x !== q).slice(0, 3)) RK.startOpplæring(F, L, x.id, 'vakt');
  const sjette = F.personer.find(x => !x.skole); ok(/fullt/.test(RK.startOpplæring(F, L, sjette.id, 'vakt').feil), 'fullt øvingsfelt avviser flere');
  ok(RK.stoppOpplæring(F, q.id).person && !q.skole, 'kan tas ut av opplæringen');
  const J = FR.fraJSON(JSON.parse(JSON.stringify(F))); ok(J.personer.filter(x => x.skole).length === RK.elever(F).length, 'opplæringen lagres med folket'); }

// ---------- mester og lærling ----------
{ const F = FR.ny(4); for (const p of F.personer) p.oppgave = 'fri'; const [m, l, l2] = F.personer; m.oppgave = l.oppgave = 'verksted'; m.ferd.verksted = 1.45; l.ferd.verksted = 1.0;
  RK.mesterSteg(F, 1440); ok(Math.abs(l.ferd.verksted - 1.01) < 1e-6, 'lærlingen lærer 0,01 per døgn av mesteren: ' + l.ferd.verksted);
  for (let i = 0; i < 100; i++) RK.mesterSteg(F, 1440); ok(Math.abs(l.ferd.verksted - 1.35) < 1e-6, 'høyst til mesteren − 0,1');
  l2.oppgave = 'hogst'; l2.ferd.hogst = 1; const før = l2.ferd.hogst; RK.mesterSteg(F, 1440); ok(l2.ferd.hogst === før, 'alene på oppgaven: ingen læring');
  m.ferd.verksted = 1.2; l.ferd.verksted = 1; RK.mesterSteg(F, 1440); ok(l.ferd.verksted === 1, 'mesteren må være dyktig (minst 1,3)'); }

// ---------- kommandoene ----------
{ K._tøm(); const S = RK.ny(1), F = FR.ny(6), L = leir(); let kasse = 1e6; F.moral = 70;
  S.søkere.push({ id: 1, navn: 'Eli Kommando', ferd: { ...F.personer[0].ferd }, egen: [], lønn: 16000, går: 1e9 }, { id: 2, navn: 'Tor Bud', ferd: { ...F.personer[0].ferd, vakt: 1.45 }, egen: [], lønn: 20000, går: 1e9, bud: { navn: 'Ravnsund', lønn: 22000 } });
  const endret = []; RK.registrerKommandoer(K, { tilstand: () => S, folk: () => F, leir: () => L, penger: () => kasse, betal: () => kr => (kasse >= kr ? (kasse -= kr, true) : false), endret: (s, h) => endret.push(h) });
  let r = K.utfør({ type: 'ansett', søker: 1 }, {}); ok(r.ok && r.svar.person.lønn === 16000 && kasse === 1e6 - R.utstyr && endret[0] === 'ansett', 'kommandoen ansett');
  r = K.utfør({ type: 'ansett', søker: 2 }, {}); ok(!r.ok && /by over/.test(r.feil), 'ansett uten å by over avvises når det er bud');
  r = K.utfør({ type: 'ansett', søker: 2, byOver: true }, {}); ok(r.ok && r.svar.person.lønn === 23000, 'kommandoen ansett med byOver');
  kasse = 0; S.søkere.push({ id: 3, navn: 'Uten Penger', ferd: { bygg: 1 }, lønn: 13000, går: 1e9 }); r = K.utfør({ type: 'ansett', søker: 3 }, {}); ok(!r.ok && /penger/.test(r.feil), 'uten penger: avvist i sjekken');
  S.lokk = { id: F.personer[0].id, navn: 'Mosevakt', lønn: 21000, frist: 1e9 }; r = K.utfør({ type: 'lokkSvar', valg: 'tillegg' }, {}); ok(r.ok && F.personer[0].lønn === 21000, 'kommandoen lokkSvar');
  L.bygg.push(bygg('øvingsfelt')); r = K.utfør({ type: 'opplæring', person: F.personer[1].id, ferdighet: 'stell' }, {}); ok(r.ok && F.personer[1].skole === 'stell', 'kommandoen opplæring');
  r = K.utfør({ type: 'opplæring', person: F.personer[1].id, ferdighet: null }, {}); ok(r.ok && !F.personer[1].skole, 'kommandoen opplæring uten ferdighet stopper');
  ok(K.kanSendes({ type: 'ansett', søker: 1, byOver: true }), 'kommandoene kan sendes som JSON'); }

// ---------- lagring ----------
{ const S = RK.ny(3); RK.morgen(S, FR.ny(1), 0, { rykte: 100, byer: 5 }, RK.rng(S), { lokk: false }); const T = RK.fraJSON(JSON.parse(JSON.stringify(S)));
  ok(T.søkere.length === S.søkere.length && T.frø === S.frø && RK.fraJSON(null) === null, 'tilstanden lagres og leses'); }

console.log(feil ? `${feil} FEIL` : 'Alle testene for rekruttering.js er ok'); process.exit(feil ? 1 : 0);
