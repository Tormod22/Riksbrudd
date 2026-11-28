// Test for spill/fabrikk.js og maskinene i byggesettet (fase B5: fabrikken du bygger selv). Kjør: node pipeline/fliser/test_fabrikk.js
'use strict';
const path = require('path');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const Leir = require(SP + '/leir.js'), BS = require(SP + '/byggesett.js'), PR = require(SP + '/produksjon.js'), FB = require(SP + '/fabrikk.js'), BR = require(SP + '/baering.js');
let feil = 0; const ok = (v, t) => { console.log((v ? 'ok   ' : 'FEIL ') + t); if (!v) feil++; };
const nf = v => String(Math.round(v * 100) / 100).replace('.', ',');
const o = { ox: 0, oy: 0 };

// en blikkhall 9,6 × 19,2 m (8 × 16 ruter) på betongfundament, med port i sør (x 0–4,8 m) og – når toPorter – en port i nord (x 4,8–9,6 m)
function hall(toPorter = true, gulv = 'bs_fundament') {
  const M = BS.lagHus({ navn: 'Prøvehall', w: 8, h: 16, s: 4, gulv, stoff: 'blikk', tak: 'bs_tak_blikk', inngang: 'port' });
  const D = M.deler.map(d => ({ ...d }));
  if (toPorter) { const n = D.find(d => d.a === 'x' && d.j === 16 && d.i === 4 && d.n === 0); n.type = 'bs_vegg_blikk_port_4'; }
  return D;
}
// leiren med delene som ferdige bygg (id 1, 2 …) – maskinene og lampene legges til med leggTil
function leir(deler) {
  const L = Leir.ny(); L.byggesett = o; let id = 1;
  for (const d of deler) { const m = BS.midt(o, d); L.bygg.push({ id: id++, type: d.type, x: m.x, y: m.y, ret: m.ret, igjen: 0, hp: 1, nivå: 1, bs: BS.plassFor(d) }); }
  for (let k = 0; k < 6; k++) L.bygg.push({ id: id++, type: 'lagertelt', x: 200 + k * 20, y: 200, ret: 0, igjen: 0, hp: 1, nivå: 1 });
  return L;
}
function leggTil(L, type, i, j, r = 0, n = 0) {
  const alle = BS.fraLeir(L, Leir), p = BS.plassering(alle, type, { i, j, a: null, r, u: true }, { nivå: n, r });
  if (p.feil) return { feil: p.feil };
  const m = BS.midt(o, p.d), id = Math.max(...L.bygg.map(b => b.id)) + 1, b = { id, type, x: m.x, y: m.y, ret: m.ret, igjen: 0, hp: 1, nivå: 1, bs: BS.plassFor(p.d) };
  L.bygg.push(b); return { b, d: p.d };
}

// 1. delene finnes, med pris og strøm som maskin-byggene
{ const S = Leir.BYGG.bs_sagbenk_1, H = Leir.BYGG.bs_høvel_1, K = Leir.BYGG.bs_vedkløyver_1, F = Leir.BYGG.bs_fyrkjele_1;
  ok(S && S.del && S.maskin && S.maskinType === 'sagbruk' && S.pris === Leir.BYGG.sagbruk.pris && S.kw === Leir.BYGG.sagbruk.kw, 'sagbenken er en del med samme pris og kW som sagbruket');
  ok(Math.abs(S.fot[1] - S.fot[0] - 9.6) < 1e-9 && Math.abs(S.fot[3] - S.fot[2] - 3.6) < 1e-9, 'sagbenken er 3,6 × 9,6 m');
  ok(K.pris === Leir.BYGG.vedkløyver.pris && F.pris === Leir.BYGG.fyrkjele.pris && H && H.kw === -5, 'vedkløyver, fyrkjele og høvel');
  ok(PR.erMaskin('bs_sagbenk_1') && PR.REGLER.maskiner.bs_sagbenk_1 === PR.REGLER.maskiner.sagbruk && PR.base('bs_sagbenk_1') === 'sagbruk', 'produksjon.js bruker de samme reglene (base = sagbruk)');
  ok(Leir.BYGG.bs_lysrør_1.lampe === 6 && Leir.BYGG.bs_lysrør_1.kw < 0 && Leir.BYGG.bs_hylle_1.hylle === 6, 'lysrør (6 m, bruker strøm) og hyllerekke (6 m³)'); }

// 2. plassering i byggesettet: krever gulv, betong for de tunge, ikke over vegger
{ const D = hall(), L = leir(D);
  let r = leggTil(L, 'bs_sagbenk_1', 3, 4, 1); ok(!r.feil && r.d.n === 0, 'sagbenken settes på betonggulvet i hallen' + (r.feil ? ': ' + r.feil : ''));
  const r2 = leggTil(L, 'bs_sagbenk_1', 3, 4, 1); ok(!!r2.feil && /alt en maskin/.test(r2.feil), 'to maskiner på samme plass avvises: ' + r2.feil);
  const r3 = leggTil(L, 'bs_sagbenk_1', 40, 40, 0); ok(!!r3.feil && /gulv/.test(r3.feil), 'uten gulv avvises: ' + r3.feil);
  const Lt = leir(hall(true, 'bs_tregulv')), r4 = leggTil(Lt, 'bs_sagbenk_1', 3, 4, 1); ok(!!r4.feil && /betonggulv/.test(r4.feil), 'på tregulv: ' + r4.feil);
  const r5 = leggTil(Lt, 'bs_høvel_1', 3, 4, 1); ok(!r5.feil, 'høvelen tåler tregulv');
  // på tvers av en vegg: et lite rom (hytta) med vegg midt i en sagbenk
  const Lh = leir(BS.husDeler('brakke', 0, 0).concat(BS.husDeler('brakke', 8, 0)).filter(d => BS.kat(d) !== 'tak'));
  const r6 = leggTil(Lh, 'bs_vedkløyver_1', 7, 1, 0); ok(!!r6.feil && /vegg/.test(r6.feil), 'over en vegg avvises: ' + (r6.feil || 'ingen feil'));
  // rommet er nå en fabrikk
  const R = BS.rom(BS.fraLeir(L, Leir), L.romBruk), rr = R.find(q => q.maskiner.length);
  ok(rr && rr.type.id === 'fabrikk' && /Fabrikk/.test(rr.navn), 'rommet med sagbenken er en fabrikk (romType): ' + (rr && rr.navn));
  // fotavtrykket: 3 × 8 ruter (dreid)
  ok(BS.ruter(r.d).length === 24 && BS.biter(r.d)[0].startsWith('m:'), 'fotavtrykket er 24 ruter'); }

// 3. plassene: utenfor fotavtrykket, i rutene rett ved
{ const L = leir(hall()), r = leggTil(L, 'bs_sagbenk_1', 3, 4, 1), P = FB.plasser(r.b), Pb = BR.plasser(r.b);
  const inni = p => p.x > 3 * 1.2 && p.x < 6 * 1.2 && p.y > 4 * 1.2 && p.y < 12 * 1.2;
  ok(P.bruks.length === 3 && !inni(P.inn) && !inni(P.ut) && P.bruks.every(q => !inni(q)), 'innmating, utmating og tre bruksplasser utenfor fotavtrykket');
  ok(P.inn.y < 4 * 1.2 && P.ut.y > 12 * 1.2, 'flyten går +y (r = 1): inn i sør, ut i nord');
  ok(JSON.stringify(Pb) === JSON.stringify(P), 'baering.js bruker de samme plassene'); }

// 4. flyt: riktig rekkefølge +15 %, hulter til bulter −10 %, én port = som før
{ const L = leir(hall()), s = leggTil(L, 'bs_sagbenk_1', 3, 3, 1).b, H = FB.hall(L), I = H.get(s.id);
  ok(I && I.flyt === FB.REGLER.flyt && I.riktig && /riktig/.test(I.flytTekst), `port inn → sag → port ut: ${I && I.flytTekst}`);
  const h = leggTil(L, 'bs_høvel_1', 4, 12, 1).b, H2 = FB.hall(L);
  ok(H2.get(s.id).flyt === 1.15 && H2.get(h.id).flyt === 1.15, `port → sag → høvel → port: ${H2.get(s.id).flytTekst}`);
  const L2 = leir(hall()), s2 = leggTil(L2, 'bs_sagbenk_1', 3, 4, 1).b; leggTil(L2, 'bs_høvel_1', 0, 0, 0);
  const H3 = FB.hall(L2); ok(H3.get(s2.id).flyt === FB.REGLER.hulter, `høvelen foran saga: ${H3.get(s2.id).flytTekst}`);
  const L3 = leir(hall(false)), s3 = leggTil(L3, 'bs_sagbenk_1', 3, 4, 1).b, H4 = FB.hall(L3); ok(H4.get(s3.id).flyt === 1 && /én åpning/.test(H4.get(s3.id).flytTekst), 'bare én port: ' + H4.get(s3.id).flytTekst);
  // selvtest (en feil med vilje): uten toleranse skal ikke et bakoverskritt på 0,6 m stoppe flyten – men med toleranse −10 m blir alt «riktig»
  const t0 = FB.REGLER.toleranse; FB.REGLER.toleranse = 100; ok(FB.hall(L2).get(s2.id).flyt === 1.15, 'selvtest: målingen virker (med en feil lagt inn blir hulter til bulter «riktig»)'); FB.REGLER.toleranse = t0; }

// 5. lys, tak og varme
{ const L = leir(hall()), s = leggTil(L, 'bs_sagbenk_1', 3, 3, 1).b, H = FB.hall(L);
  let F = FB.faktorer(L, H, { time: 12 }); ok(Math.abs(F.fart[s.id] - 1.15) < 1e-9 && F.slit[s.id] === 1, 'om dagen i hallen (porter gir dagslys): fart 1,15, vanlig slitasje');
  F = FB.faktorer(L, H, { time: 2 }); ok(Math.abs(F.fart[s.id] - 1.15 * .6) < 1e-9 && /natta/.test(F.del[s.id].tekster.join()), 'om natta uten lys: 40 % saktere');
  const lp = leggTil(L, 'bs_lysrør_1', 4, 7).b, H2 = FB.hall(L); ok(H2.get(s.id).lamper.includes(lp.id), 'lysrøret lyser på sagbenken');
  F = FB.faktorer(L, H2, { time: 2, virker: () => true }); ok(Math.abs(F.fart[s.id] - 1.15) < 1e-9, 'om natta med lys: full fart');
  F = FB.faktorer(L, H2, { time: 2, virker: () => false }); ok(F.fart[s.id] < 1, 'lampen uten strøm lyser ikke');
  F = FB.faktorer(L, H2, { time: 12, vinter: true }); ok(Math.abs(F.fart[s.id] - 1.15 * .8) < 1e-9, 'om vinteren uten fyrkjele: 20 % saktere');
  const k = leggTil(L, 'bs_fyrkjele_1', 0, 12, 1).b, H3 = FB.hall(L);
  F = FB.faktorer(L, H3, { time: 12, vinter: true, status: { [k.id]: { går: true } } }); ok(Math.abs(F.fart[s.id] - 1.15) < 1e-9, 'fyrkjelen i rommet gir varme');
  // uten tak: en sagbenk ute på et fundament
  const Lu = leir(BS.husDeler(BS.lagHus({ navn: 'plass', w: 10, h: 10, gulv: 'bs_fundament', stoff: 'tre', tak: 'bs_tak_flatt' }), 30, 30).filter(d => BS.kat(d) === 'gulv')), su = leggTil(Lu, 'bs_sagbenk_1', 30, 30, 0);
  ok(!su.feil, 'på et fundament uten tak er det lov' + (su.feil ? ': ' + su.feil : '')); const Fu = FB.faktorer(Lu, FB.hall(Lu), { time: 12 });
  ok(Fu.slit[su.b.id] === 2 && /tak/.test(Fu.del[su.b.id].tekster.join()), 'uten tak: slites dobbelt');
  ok(/under tak/.test(FB.sjekkNy(BS.fraLeir(Lu, Leir), su.d).advarsel || ''), 'byggesettet advarer: ' + FB.sjekkNy(BS.fraLeir(Lu, Leir), su.d).advarsel); }

// 6. produksjonen: sagbenken går som et sagbruk, med hallens fart og slitasje; høvelen gir høvlede planker
function døgn(L, ctxF, timer = 24) { const P = PR.ny(); L.lager.tømmer = 200; for (let t = 0; t < timer * 6; t++) { const time = (t / 6) % 24, c = ctxF ? ctxF(time) : {}; PR.steg(P, L, 10, { kraft: 6, ...c }); } return P; }
{ const Lf = Leir.ny(); for (let k = 0; k < 6; k++) Lf.bygg.push({ id: 100 + k, type: 'lagertelt', x: 200 + k * 20, y: 200, igjen: 0, hp: 1, nivå: 1 }); Lf.bygg.push({ id: 1, type: 'sagbruk', x: 0, y: 0, igjen: 0, hp: 1, nivå: 1 });
  const Pf = døgn(Lf);
  const L = leir(hall()), s = leggTil(L, 'bs_sagbenk_1', 3, 3, 1).b; leggTil(L, 'bs_lysrør_1', 4, 7); const H = FB.hall(L);
  const Ph = døgn(L, time => FB.faktorer(L, H, { time, virker: () => true }));
  ok(Math.abs(Pf.laget.tre - 26.4) < .01, `frittstående sagbruk: ${nf(Pf.laget.tre)} m³ planker i døgnet (som før)`);
  ok(Math.abs(Ph.laget.tre / Pf.laget.tre - 1.15) < .01, `sagbenk i en god hall: ${nf(Ph.laget.tre)} m³ (+${Math.round((Ph.laget.tre / Pf.laget.tre - 1) * 100)} %)`);
  // uten lys om natta: 12 timer med 60 % fart
  const L2 = leir(hall()); leggTil(L2, 'bs_sagbenk_1', 3, 3, 1); const H2 = FB.hall(L2), P2 = døgn(L2, time => FB.faktorer(L2, H2, { time }));
  ok(P2.laget.tre < Ph.laget.tre * .85, `uten lys om natta: ${nf(P2.laget.tre)} m³`);
  // slitasjen uten tak er dobbel
  const Lu = leir(BS.husDeler(BS.lagHus({ navn: 'plass', w: 10, h: 10, gulv: 'bs_fundament', stoff: 'tre', tak: 'bs_tak_flatt' }), 30, 30).filter(d => BS.kat(d) === 'gulv')), su = leggTil(Lu, 'bs_sagbenk_1', 30, 30, 0).b, Hu = FB.hall(Lu); døgn(Lu, time => FB.faktorer(Lu, Hu, { time: 12 }));
  ok(Math.abs((1 - su.hp) / (1 - Lf.bygg.find(b => b.id === 1).hp) - 2) < .01, `uten tak slites sagbenken dobbelt (hp ${su.hp.toFixed(4)})`);
  // høvelen: planker × 1,4 mens den går
  const L3 = leir(hall()), s3 = leggTil(L3, 'bs_sagbenk_1', 3, 3, 1).b, h3 = leggTil(L3, 'bs_høvel_1', 4, 12, 1).b, H3 = FB.hall(L3);
  const P3 = PR.ny(); L3.lager.tømmer = 50; const F3 = FB.faktorer(L3, H3, { time: 12 }); const r3 = PR.steg(P3, L3, 60, { kraft: 6, ...F3 });
  ok(r3.status[h3.id].går && r3.status[s3.id].høvlet && Math.abs(L3.lager.tre - 1.1 * 1.4 * 1.15) < 1e-6, `høvelen går og saga gir ${nf(L3.lager.tre)} m³ høvlede planker i timen`);
  const L4 = leir(hall()), h4 = leggTil(L4, 'bs_høvel_1', 4, 12, 1).b, r4 = PR.steg(PR.ny(), L4, 60, { kraft: 6, ...FB.faktorer(L4, FB.hall(L4), { time: 12 }) });
  ok(!r4.status[h4.id].går && r4.status[h4.id].tekst === 'venter på saga', 'høvelen uten sag: «venter på saga»');
  // ØKONOMIEN (planen 4.2 og oppdraget): verdien over tømmeret (alt til salgspris 80 %, som okosim-sagbruk.js) mot lønna til ti (150 000 kr).
  // Brutto gir hallen +15 % (flyt). Netto trekkes hallens vedlikehold (Leir.REGLER.vedlikehold av delene, ikke maskinen – den slites som
  // sagbruket) og dieselen til lyset om natta (12 t). Kravet: hallen gir brutto litt mer enn frittstående (høyst 25 % mer), og netto
  // ligger i båndet 0,7–1,4 × lønna til ti (okosim-sagbruk.js).
  const MAT = Leir.MATERIALER, verdi = P => ((P.laget.tre || 0) * MAT.tre.pris + (P.laget.flis || 0) * MAT.flis.pris - (P.brukt.tømmer || 0) * MAT.tømmer.pris) * .8;
  const vf = verdi(Pf), vh = verdi(Ph), lønn = 150000;
  const vedl = L.bygg.filter(b => b.bs && !Leir.BYGG[b.type].maskin && !Leir.BYGG[b.type].lampe).reduce((a, b) => a + Leir.BYGG[b.type].pris, 0) * Leir.REGLER.vedlikehold;
  const lys = L.bygg.filter(b => Leir.BYGG[b.type].lampe).reduce((a, b) => a - Leir.BYGG[b.type].kw, 0) * 12 * Leir.DRIVSTOFF.literPerKWt * Leir.DRIVSTOFF.prisPerLiter, netto = vh - vedl - lys;
  ok(vh / vf > 1 && vh / vf <= 1.25 && netto / lønn >= .7 && netto / lønn <= 1.4, `økonomien: frittstående ${Math.round(vf)} kr/døgn (${nf(vf / lønn)} × lønna til ti); sagbenk i hall brutto ${Math.round(vh)} kr (${nf(vh / vf)} × frittstående, ${nf(vh / lønn)} × lønna), netto etter hallens vedlikehold ${Math.round(vedl)} kr og lys ${Math.round(lys)} kr: ${Math.round(netto)} kr (${nf(netto / lønn)} × lønna)`);
  console.log(`     (hallen 9,6 × 19,2 m koster ${nf(Math.round(BS.husDeler(BS.lagHus({ navn: 'h', w: 8, h: 16, s: 4, gulv: 'bs_fundament', stoff: 'blikk', tak: 'bs_tak_blikk', inngang: 'port' }), 0, 0).reduce((a, d) => a + Leir.BYGG[d.type].pris, 0) / 1e5) / 10)} mill. kr i deler + materialer; lysrøret 0,3 kW)`); }

// 7. gamle sagbruk-bygg: uendret (ingen faktorer gjelder dem)
{ const L = Leir.ny(); L.bygg.push({ id: 1, type: 'sagbruk', x: 0, y: 0, igjen: 0, hp: 1, nivå: 1 }); const H = FB.hall(L); ok(H.size === 0, 'et sagbruk-bygg er ikke i hallen (ingen faktorer)');
  const P = PR.ny(); L.lager.tømmer = 40; const s = PR.steg(P, L, 60, { kraft: 3, ...FB.faktorer(L, H, { time: 2, vinter: true }) }).status[1];
  ok(s.går && Math.abs(L.lager.tre - 1.1) < 1e-9 && s.tekst === 'går', 'sagbruket går som før om natta og om vinteren'); }

// 8. lager i hyllene: en hyllerekke i et lukket rom gir lagerplass
{ const L = leir(hall()); const før = Leir.lagerplass(L); const h = leggTil(L, 'bs_hylle_1', 0, 4, 1); ok(!h.feil && Leir.lagerplass(L) === før + 6, `hyllerekka gir 6 m³ lagerplass (${før} -> ${Leir.lagerplass(L)})`);
  const R = BS.rom(BS.fraLeir(L, Leir), L.romBruk).find(r => r.hyller.length); ok(R && R.type.id === 'lagerrom', 'rommet med bare hyller er et lagerrom'); }

// 9. veien til bruksplassen (Vei): gjennom porten; uten port: «ingen vei til bruksplassen»; fotavtrykket sperrer
{ const Vei = require(SP + '/vei.js');
  const L = leir(hall()), b = leggTil(L, 'bs_sagbenk_1', 3, 3, 1).b, P = FB.plasser(b), K = Vei.lag({ leir: L, start: [-8, -8], prøve: true });
  const r = P.bruks.map(q => Vei.kanNå({ x: q.x, y: q.y, bruksplass: true }, { kart: K }));
  ok(r.every(q => q.ok), 'alle bruksplassene nås gjennom porten' + (r.some(q => !q.ok) ? ': ' + r.map(q => q.grunn).join(', ') : ''));
  const midt = Vei.kanNå({ x: b.x, y: b.y }, { kart: K }); ok(!midt.ok, 'midt i sagbenken er sperret: ' + midt.grunn);
  const D2 = hall(false).map(d => (/_port_/.test(d.type) ? { ...d, type: 'bs_vegg_blikk_4' } : d)), L2 = leir(D2), b2 = leggTil(L2, 'bs_sagbenk_1', 3, 3, 1).b, P2 = FB.plasser(b2);
  const K2 = Vei.lag({ leir: L2, start: [-8, -8], prøve: true }), r2 = Vei.kanNå({ x: P2.bruks[0].x, y: P2.bruks[0].y, bruksplass: true }, { kart: K2 });
  ok(!r2.ok && /bruksplassen|dør/.test(r2.grunn), 'hall uten port: ' + r2.grunn); }

console.log(feil ? `\n${feil} FEIL` : '\nAlle testene for fabrikken er ok'); if (feil) process.exit(1);
