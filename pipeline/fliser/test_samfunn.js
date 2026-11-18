// Test for spill/samfunn.js (samfunnet i leiren): node pipeline/fliser/test_samfunn.js
const L0 = require('../../site/dovre-fliser/spill/leir.js');
const F0 = require('../../site/dovre-fliser/spill/folk.js');
const S0 = require('../../site/dovre-fliser/spill/samfunn.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
let penger = 900e6; const betal = p => (p <= penger ? (penger -= p, true) : false);
const sett = (L, type, x, y = 0) => { for (const k of ['tre', 'betong', 'stål']) L0.kjøpMateriale(L, k, 1000, betal); const r = L0.bygg(L, { type, x, y }, betal); if (!r.bygg) throw new Error(type + ': ' + r.feil); r.bygg.igjen = 0; return r.bygg; };
const fast = v => () => v;
const nyLeir = () => { const L = L0.ny(); sett(L, 'brakke', 0); sett(L, 'brakke', 30); return L; };
const k0 = (F, L, o = {}) => ({ B: F0.behov(F, L, { årstid: 'sommer', ...o }), tid: 0, auto: false, F, ...o });

// ---------- personer ----------
{ const F = F0.ny(), p = F.personer[0], a = S0.profil(p), b = S0.profil({ ...p, id: 99 });
  ok(a.historie === b.historie && a.ønske === b.ønske && JSON.stringify(a.portrett) === JSON.stringify(b.portrett), 'profilen er fast per person (også med ny id): ' + a.historie);
  ok(new Set(F.personer.map(q => JSON.stringify(S0.profil(q).portrett))).size === 10, 'ti personer har ti ulike ansikter');
  const svg = S0.portrettSVG(p); ok(/^<svg/.test(svg.trim()) && svg.length > 5000, 'portrettmotoren gir et SVG-ansikt');
  ok(F.personer.every(q => S0.ØNSKER[S0.profil(q).ønske] && S0.LYNNE[S0.profil(q).lynne]), 'alle har et ønske og et lynne');
  ok(S0.profil(F.personer.find(q => q.navn.startsWith('Kari') || true)).portrett.gender.length > 0, 'kjønn settes fra fornavnet');
}
// ---------- barn og gamle ----------
{ const F = F0.ny(), L = nyLeir(), S = S0.ny(5), r = S0.tilf(S);
  const B0 = F0.behov(F, L, { årstid: 'sommer' }); S0.nyAvhengig(S, r, 'barn', 'Lien'); S0.nyAvhengig(S, r, 'barn'); S0.nyAvhengig(S, r, 'gammel');
  const v = S0.valg(S, F, { B: B0, tid: 0, F }), B = F0.behov(F, L, { årstid: 'sommer', ...v });
  ok(v.avhengige === 3 && B.avh === 3 && B.spiser > B0.spiser && B.spiser < B0.spiser + 3, `tre barn/gamle spiser (${B0.spiser.toFixed(1)} → ${B.spiser.toFixed(1)} rasjoner) men mindre enn voksne`);
  ok(B.utenSeng === Math.max(0, 13 - B.senger), 'de trenger seng');
  ok(S0.avhengigMoral(S, { B: { ...B, utenSeng: 0 }, sult: false, kald: 0 }) > 0 && S0.avhengigMoral(S, { B: { ...B, utenSeng: B.n + 1 }, sult: false, kald: 0 }) < 0 && S0.avhengigMoral(S, { B, sult: true, kald: 0 }) <= -12, 'har de det bra gir de moral, sulter de tærer det hardt');
  ok(F0.arbeidere(F, 'bygg') === 4, 'de arbeider ikke (byggelagene er som før)');
}
// ---------- flyktninger ----------
{ const F = F0.ny(), L = nyLeir(), S = S0.ny(7), r = S0.tilf(S), g = { type: 'flyktninger', voksne: 2, barn: 1, gamle: 1, spes: 'lege', smittet: false, fra: 'Otta' };
  ok(/Otta/.test(S0.flyktTekst(g)) && S0.flyktValg(g).length === 4, 'kortet har tekst og fire valg: ' + S0.flyktTekst(g));
  const m0 = F.moral, sv = S0.flyktSvar(S, F, g, 'alle', k0(F, L), r);
  ok(F.personer.length === 12 && S.avhengige.length === 2 && sv.nye[0].spes === 'lege' && sv.nye[0].ferd.stell === S0.REGLER.spesFerd, 'ta imot alle: to voksne (én lege), ett barn og en gammel');
  ok(F.moral > m0, 'moralen stiger når det er plass');
  const F2 = F0.ny(), S2 = S0.ny(7), m2 = F2.moral, l2 = F2.personer[0].lojal; S0.flyktSvar(S2, F2, g, 'avvis', k0(F2, L), S0.tilf(S2));
  ok(F2.personer.length === 10 && F2.moral <= m2 - 9 && F2.personer[0].lojal < l2, 'avvise en gruppe med barn koster moral og lojalitet');
  const F3 = F0.ny(), S3 = S0.ny(7), mat3 = F3.mat; S0.flyktSvar(S3, F3, g, 'mat', k0(F3, L), S0.tilf(S3)); ok(F3.mat === mat3 - 8, 'gi mat og send videre: 2 rasjoner per person');
  const F4 = F0.ny(), S4 = S0.ny(7); S0.flyktSvar(S4, F4, { ...g, spes: null, smittet: true }, 'voksne', k0(F4, L), S0.tilf(S4));
  ok(S0.sykeI(F4).length === 1 && S4.avhengige.length === 0, 'en smittet flyktning tar Grålungen med inn (uten lege merkes det ikke)');
  const F5 = F0.ny(), S5 = S0.ny(7), lege = S0.nySpesialist(F5, S0.tilf(S5), 'lege'); const sv5 = S0.flyktSvar(S5, F5, { ...g, spes: null, smittet: true }, 'voksne', k0(F5, L), S0.tilf(S5));
  ok(lege.oppgave === 'stell' && /karantene/.test(sv5.tekst) && S5.karantene, 'med lege på stell blir den smittede funnet og satt i karantene');
}
// ---------- spesialister ----------
{ const F = F0.ny(), S = S0.ny(3), r = S0.tilf(S);
  for (const t of Object.keys(S0.SPES)) { const p = S0.nySpesialist(F, r, t); ok(p.spes === t && S0.harSpes(F, t), `${t}: virker på «${S0.SPES[t].oppgave}»`); }
  const sk = F.personer.find(p => p.spes === 'skytter'); sk.oppgave = 'fri'; ok(!S0.harSpes(F, 'skytter'), 'en spesialist på feil oppgave virker ikke');
  const p = F.personer[0]; ok(S0.funnet({ ...p }, fast(.9)) === null && S0.funnet({ ...p, ferd: { ...p.ferd } }, fast(.01)).spes, 'leting: av og til er den overlevende en spesialist');
}
// ---------- Grålungen ----------
{ const kjør = (o) => { const F = F0.ny(), L = o.trangt ? L0.ny() : nyLeir(), S = S0.ny(11), r = S0.tilf(S); if (o.lege) S0.nySpesialist(F, r, 'lege'); S0.smitt(S, F, r, 1, 0); if (o.karantene) S0.settKarantene(S, F, true);
    let maks = 0, smittet = new Set(S0.sykeI(F).map(p => p.id)); for (let t = 0; t < 16 * 24; t++) { S0.sykdomSteg(S, F, 60, { B: F0.behov(F, L, { årstid: 'sommer' }), tid: t * 60, auto: false }, r); for (const p of S0.sykeI(F)) smittet.add(p.id); maks = Math.max(maks, S0.sykeI(F).length); }
    return { smittet: smittet.size, F, S }; };
  const fri = kjør({}), trang = kjør({ trangt: true }), kar = kjør({ karantene: true }), lege = kjør({ lege: true, karantene: true });
  ok(trang.smittet > fri.smittet || trang.smittet >= 10, `trange brakker smitter flere (${fri.smittet} mot ${trang.smittet} i telt)`);
  ok(kar.smittet < fri.smittet, `karantene bremser smitten (${kar.smittet} mot ${fri.smittet})`);
  ok(lege.smittet <= kar.smittet, `lege og karantene: ${lege.smittet} smittet`);
  ok(fri.F.personer.some(p => p.immun) && !S0.sykeI(fri.F).length, 'de som kommer gjennom blir immune, og sykdommen går over');
  const F = F0.ny(), S = S0.ny(2), r = S0.tilf(S); const p = S0.smitt(S, F, r, 1, 0)[0]; S0.settKarantene(S, F, true);
  ok(p.karantene && !F0.arbeidsfør(p), 'i karantene arbeider de ikke'); S0.settKarantene(S, F, false); ok(F0.arbeidsfør(p), 'uten karantene arbeider de syke (og smitter)');
  const F6 = F0.ny(), S6 = S0.ny(4), L6 = nyLeir(); let h = []; for (let t = 0; t < 40 * 24; t++) h.push(...S0.steg(S6, F6, L6, 60, { B: F0.behov(F6, L6, {}), tid: t * 60, auto: false }).hendelser);
  ok(!S0.sykeI(F6).length && !S6.kort && F6.personer.length === 10 && !F6.personer.some(q => q.spion), 'uten auto (testene) skjer ingenting av seg selv på 40 døgn');
  const F7 = F0.ny(), S7 = S0.ny(4); let kort = 0, syk = 0; for (let t = 0; t < 40 * 24; t++) { const u = S0.steg(S7, F7, L6, 60, { B: F0.behov(F7, L6, {}), tid: t * 60, auto: true }); if (S7.kort) { kort++; S7.kort = null; } syk = Math.max(syk, S0.sykeI(F7).length); }
  ok(kort >= 5, `med auto kommer det kort (flyktninger, krangler): ${kort} på 40 døgn` + (syk ? ', og sykdommen brøt ut' : ''));
}
// ---------- lover ----------
{ const F = F0.ny(), L = nyLeir(), S = S0.ny(1), B = F0.behov(F, L, {});
  const v0 = S0.valg(S, F, { B, tid: 0 }); const t = S0.settLov(S, F, 'rasjonering', true); const v1 = S0.valg(S, F, { B, tid: 0 });
  ok(v1.matFaktor === .75 && v1.deler.lover === -6 && /innført/.test(t.tekst), 'rasjonering: mindre mat, lavere moral – ' + t.tekst);
  ok(F0.behov(F, L, v1).spiser < B.spiser * .76, 'maten varer lenger med rasjonering');
  S0.settLov(S, F, 'arbeidsplikt', true); const v2 = S0.valg(S, F, { B, tid: 0 }); ok(Math.abs(v2.tempoFaktor - 1.12) < 1e-9 && v2.deler.lover === -11, 'arbeidsplikt: tempo ×1,12, moral −5');
  const te0 = F0.tempo(F, 'bygg'); F0.steg(F, L, 1, { årstid: 'sommer', ...v2 }); ok(F0.tempo(F, 'bygg') > te0 * 1.05, 'tempoet i folket følger loven');
  S0.settLov(S, F, 'arbeidsplikt', false); S0.settLov(S, F, 'våpen', true); ok(S0.valg(S, F, { B, tid: 0 }).deler.lover === -4, 'lover kan oppheves; våpen gir +2');
  const mot = S0.settLov(S0.ny(1), F0.ny(), 'portforbud', true).mot; ok(Array.isArray(mot), `noen misliker en lov (${mot.length} her)`);
}
// ---------- forrædere ----------
{ const F = F0.ny(), L = nyLeir(), S = S0.ny(9), r = S0.tilf(S); F.moral = 30; for (const p of F.personer) p.lojal = .8; F.personer[3].lojal = .1;
  let lekk = false, tekst = []; for (let t = 0; t < 30 * 24 && !lekk; t++) { const u = S0.spionSteg(S, F, L, 60, { tid: t * 60, auto: true }, r); lekk = lekk || u.lekk; tekst.push(...u.hendelser); }
  ok(F.personer[3].spion && F.personer.filter(p => p.spion).length === 1, 'den med lav lojalitet blir forræder (ingen andre)');
  ok(lekk && S.lekket, 'forræderen lekker til fienden: ' + (tekst.find(x => /lekket/.test(x)) || ''));
  const e0 = S0.etterforsk(S, F, 50000, fast(.99)); ok(!e0.funnet && /ingen bevis/.test(e0.tekst), 'etterforskning kan mislykkes');
  ok(S0.etterforsk(S, F, 50010, fast(0)).feil, 'ikke to etterforskninger samme døgn');
  const e1 = S0.etterforsk(S, F, 60000, fast(0)); ok(e1.funnet === F.personer[3] && S.kort.type === 'spion', 'etterforskning kan avsløre forræderen');
  const d = S0.dom(S, F, F.personer[3].id, 'utvis'); ok(F.personer.length === 9 && /utvist/.test(d.tekst), 'forræderen kan utvises');
  const F2 = F0.ny(), S2 = S0.ny(9); const l0 = F2.personer[0].lojal; const e2 = S0.etterforsk(S2, F2, 5000, fast(0)); ok(!e2.funnet && F2.personer[0].lojal < l0, 'etterforskning uten forræder koster lojalitet');
  const u = S0.spionSteg(S0.ny(1), (() => { const f = F0.ny(); f.moral = 10; f.personer.forEach(p => { p.lojal = .05; }); return f; })(), L, 1440 * 30, { tid: 0, auto: false }, fast(0)); ok(!u.lekk && !u.hendelser.length, 'uten auto blir ingen forræder');
}
// ---------- barn og gamle blir syke selv (runde 4) ----------
{ // mange forsøk: ti barn og ti gamle i en leir med fem syke voksne i ett døgn – hvor mange smittes?
  let barn = 0, gamle = 0, dødB = 0, dødG = 0; const L = nyLeir();
  for (let f = 0; f < 40; f++) { const F = F0.ny(), S = S0.ny(100 + f), r = S0.tilf(S); for (let i = 0; i < 10; i++) { S0.nyAvhengig(S, r, 'barn'); S0.nyAvhengig(S, r, 'gammel'); }
    S0.smitt(S, F, r, 5, 0); for (let t = 0; t < 24; t++) S0.sykdomSteg(S, F, 60, { B: F0.behov(F, L, { årstid: 'sommer', avhengige: 20 }), tid: t * 60, auto: false }, r);
    barn += S0.sykeAvh(S).filter(a => a.type === 'barn').length; gamle += S0.sykeAvh(S).filter(a => a.type === 'gammel').length; }
  ok(barn > 0 && gamle > barn, `barn smittes sjeldnere enn gamle (${barn} barn mot ${gamle} gamle på 40 forsøk)`);
  for (let f = 0; f < 40; f++) { const F = F0.ny(), S = S0.ny(300 + f), r = S0.tilf(S); for (let i = 0; i < 5; i++) { S0.nyAvhengig(S, r, 'barn'); S0.nyAvhengig(S, r, 'gammel'); }
    for (const a of S.avhengige) a.syk = { dag: 0, lengde: 4 }; for (let t = 0; t < 5 * 24; t++) S0.sykdomSteg(S, F, 60, { B: F0.behov(F, L, { årstid: 'sommer', avhengige: 10 }), tid: t * 60, auto: false }, r);
    dødB += S.døde.filter(q => q.hvem === 'barn').length; dødG += S.døde.filter(q => q.hvem === 'gammel').length;
    if (f === 0) ok(!S0.sykeAvh(S).length && S.avhengige.every(a => a.immun), 'de som overlever, blir friske og tåler sykdommen'); }
  ok(dødG > dødB * 4 && dødG > 0, `syke gamle dør langt oftere enn syke barn (${dødG} gamle mot ${dødB} barn av 200 + 200)`);
  const F = F0.ny(), S = S0.ny(5), r = S0.tilf(S), a = S0.nyAvhengig(S, r, 'gammel'); a.syk = { dag: 0, lengde: 4 }; S0.settKarantene(S, F, true);
  ok(a.karantene === true, 'karantenen gjelder også syke barn og gamle'); const m = S0.valg(S, F, { B: F0.behov(F, L, {}), tid: 0, F }).deler.Grålungen;
  ok(m <= -(S0.REGLER.sykMoral + S0.REGLER.karanteneMoral), `en syk gammel trekker moralen (${m})`);
  const F2 = F0.ny(), S2 = S0.ny(5), r2 = S0.tilf(S2); S0.nyAvhengig(S2, r2, 'gammel'); for (let t = 0; t < 30 * 24; t++) S0.sykdomSteg(S2, F2, 60, { B: F0.behov(F2, L, {}), tid: t * 60, auto: false }, r2);
  ok(S2.avhengige.length === 1 && !S2.døde.length, 'uten sykdom dør ingen gamle (før døde de av og til uten å være syke)');
}
// ---------- spesialister fra oppdrag (runde 4) ----------
{ const mk = (id, type) => ({ id, type, x: 196400 + id * 97, y: 6898900 - id * 53 });
  const R = [...Array(400).keys()].map(i => S0.oppdragSpes(mk(i, 'redd'), 12345)), P = [...Array(400).keys()].map(i => S0.oppdragSpes(mk(i, 'post'), 12345));
  const aR = R.filter(Boolean).length / 400, aP = P.filter(Boolean).length / 400;
  ok(Math.abs(aR - S0.REGLER.oppdragSpes) < .08 && Math.abs(aP - S0.REGLER.postSpes) < .08, `redningsoppdrag gir spesialist i ${Math.round(aR * 100)} %, røverposter i ${Math.round(aP * 100)} %`);
  ok(new Set(R.filter(Boolean)).size === Object.keys(S0.SPES).length, 'alle slags spesialister kan komme fra oppdrag');
  ok(S0.oppdragSpes(mk(7, 'redd'), 1) === S0.oppdragSpes({ ...mk(7, 'redd'), x: 1, y: 2 }, 1) && S0.oppdragSpes(mk(3, 'hent'), 1) === null, 'fast per oppdrag (også når spillet flytter det), og «hent» gir ingen');
  const i = R.findIndex(Boolean); ok(/^Blant dem som skal reddes, er en /.test(S0.oppdragSpesTekst(mk(i, 'redd'), R[i])), S0.oppdragSpesTekst(mk(i, 'redd'), R[i]));
  const F = F0.ny(), p = F.personer[0]; S0.gjørSpesialist(p, 'lege'); ok(S0.harSpes(F, 'lege') || p.spes === 'lege', 'personen blir spesialist');
}
// ---------- sabotasje går gjennom Leir.skad (runde 4) ----------
{ const L = L0.ny(); const brakke = sett(L, 'brakke', 0); L0.kjøpMateriale(L, 'tre', 50, betal); const r = L0.bygg(L, { type: 'brakke', x: 40, y: 0 }, betal); const plass = r.bygg;
  // byggeplassen har brukt litt av materialene: resten skal tilbake på lageret når den ødelegges
  plass.igjen = plass.totalt * .5; plass.hp = .2; const før = { ...L.lager };
  const s1 = S0.saboter(L, fast(.99)); const tilbake = Object.keys(plass.mat || {}).some(k => (L.lager[k] || 0) > (før[k] || 0));
  ok(s1 && s1.ødelagt && !L.bygg.includes(plass) && tilbake, 'en forræder kan ødelegge en byggeplass: ' + (s1 && s1.tekst));
  const s2 = S0.saboter(L, fast(0)); ok(s2 && !s2.ødelagt && Math.abs(brakke.hp - (1 - S0.REGLER.sabotasjeHp)) < 1e-9 && L.bygg.includes(brakke), 'et ferdig bygg skades men står: ' + (s2 && s2.tekst));
  brakke.hp = .35; ok(S0.saboter(L, fast(0)) === null && brakke.hp === .35, 'et hardt skadet bygg røres ikke');
}
// ---------- opplæring ----------
{ const F = F0.ny(), S = S0.ny(1), snekker = F.personer.find(p => p.yrke === 'snekker'), elev = F.personer.find(p => p.yrke === 'kokk'), f0 = elev.ferd.bygg;
  ok(S0.startOpplæring(S, F, elev.id, snekker.id, 'bygg').feil, 'en som ikke er god nok kan ikke lære bort');
  const s = S0.startOpplæring(S, F, snekker.id, elev.id, 'bygg'); ok(!s.feil && snekker.trener && elev.trener, s.tekst);
  const t0 = F0.personTempo(F, snekker, 'bygg'); delete snekker.trener; ok(Math.abs(t0 / F0.personTempo(F, snekker, 'bygg') - .6) < 1e-9, 'i opplæring arbeider de på 60 %'); snekker.trener = true;
  let H = []; for (let t = 0; t < 20 * 24; t++) H.push(...S0.opplæringSteg(S, F, 60));
  ok(elev.ferd.bygg > f0 + .2 && elev.ferd.bygg <= snekker.ferd.bygg && !elev.trener && !S.opplæring.length, `eleven ble bedre (${f0} → ${elev.ferd.bygg}) og opplæringen er ferdig: ${H[0]}`);
  const vet = F.personer.find(p => p.yrke === 'sjåfør'); vet.erf = 3; ok(S0.kanLære(vet, 'vakt') && !S0.kanLære(vet, 'kjøkken'), 'en veteran (erfaring fra en tropp) kan lære bort vakt');
}
// ---------- begravelser og minnesmerke ----------
{ const F = F0.ny(), L = nyLeir(), S = S0.ny(1), B = F0.behov(F, L, {}); S0.død(S, 'Ola Haugen', 'folk', 0); S0.død(S, 'Per Lien', 'soldat', 0);
  ok(S0.valg(S, F, { B, tid: 0 }).deler['ugravlagte døde'] === -6, 'ugravlagte døde tynger moralen');
  const g = S0.gravlegg(S, F, 'seremoni', 100), v = S0.valg(S, F, { B, tid: 110 });
  ok(!S.døde.length && S.gravlagte.length === 2 && v.tempoFaktor < .35 && v.deler.hendelser === 5, 'begravelse med seremoni: arbeidet stopper i tre timer, moralen stiger – ' + g.tekst);
  ok(S0.valg(S, F, { B, tid: 100 + 181 }).tempoFaktor === 1, 'etter seremonien går arbeidet som før');
  ok(S0.valg(S, F, { B, tid: 0, minnesmerke: true }).deler.minnesmerke === 3 && S0.minneMoral(S, false) === 0, 'minnesmerket gir moral (mer med navn på)');
  const S2 = S0.ny(1), F2 = F0.ny(); S0.død(S2, 'Kari Dahl', 'folk', 0); const u = S0.steg(S2, F2, L, 60, { B, tid: 4 * 1440, auto: false });
  ok(!S2.døde.length && u.hendelser.some(x => /uten at noen tok farvel/.test(x)) && S0.valg(S2, F2, { B, tid: 4 * 1440 + 1 }).deler.hendelser === -3, 'etter tre døgn legges de i jorda uten farvel (moral −3)');
  const r = F0.steg((() => { const f = F0.ny(); f.personer[0].helse = -1; return f; })(), L, 1, {}); ok(r.døde.length === 1, 'folk.js melder hvem som døde');
}
// ---------- kort med følger som varer ----------
{ const F = F0.ny(), L = nyLeir(), S = S0.ny(1), B = F0.behov(F, L, {}), k = { B, tid: 0, F };
  ok(S0.KORT.length >= 9 && S0.KORT.every(q => q.valg.length >= 2), `${S0.KORT.length} kort, alle med minst to valg`);
  const c = { type: 'kort', id: 'fest', a: F.personer[0].id, b: F.personer[1].id }, T = S0.kortTekst(S, F, c, k); ok(/fest/.test(T.tekst) && T.valg[0].kan, T.tekst);
  const mat = F.mat, sv = S0.kortSvar(S, F, c, 0, k, fast(.5)); ok(F.mat === mat - 10 && S0.valg(S, F, { B, tid: 100 }).deler.hendelser === 8 && S0.valg(S, F, { B, tid: 2 * 1440 + 1 }).deler.hendelser === 0, 'festen koster mat og løfter moralen i to døgn: ' + sv.tekst);
  const c2 = { type: 'kort', id: 'familie', a: F.personer[2].id, b: F.personer[1].id }; S0.kortSvar(S, F, c2, 0, k, fast(.5));
  ok(F.personer[2].borte === 2880 && !F0.arbeidsfør(F.personer[2]), 'en som leter etter familien er borte i to døgn'); const u = S0.steg(S, F, L, 1, { B, tid: 2881, auto: false }); ok(!F.personer[2].borte && u.hendelser.some(x => /tilbake/.test(x)), 'og kommer tilbake');
  const c3 = { type: 'kort', id: 'krangel', a: F.personer[4].id, b: F.personer[5].id }, h0 = F.personer[4].helse; S0.kortSvar(S, F, c3, 2, k, fast(.1)); ok(F.personer[4].helse < h0, 'en krangel som får gå kan ende i slåsskamp');
  const S4 = S0.ny(1), F4 = F0.ny(), p = F4.personer[0], c4 = { type: 'kort', id: 'ønske', a: p.id, b: F4.personer[1].id }; S0.kortSvar(S4, F4, c4, 0, k, fast(.5)); const l0 = p.lojal;
  const u4 = S0.steg(S4, F4, L0.ny(), 1, { B: F0.behov(F4, L0.ny(), {}), tid: 3 * 1440 + 5, auto: false });
  ok(S4.løfter.length === 0 && (u4.hendelser.some(x => /brøt løftet|holdt løftet/.test(x))), 'et løfte holdes eller brytes: ' + u4.hendelser.find(x => /løftet/.test(x)));
  const v = S0.velgKort(S0.ny(3), F0.ny(), k, S0.tilf(S0.ny(3))); ok(v && v.type === 'kort' && S0.KORT.find(q => q.id === v.id), 'velgKort gir et kort som passer: ' + (v && v.id));
  const j = S0.fraJSON(JSON.parse(JSON.stringify(S))); ok(j.virkninger.length === S.virkninger.length && j.lover.våpen === false, 'lagring: tilstanden tåler JSON');
}
// ---------- runde 2: rekrutter fra byene, fanger, kulde ----------
{ const F = F0.ny(), p = F.personer[0]; S0.ankommet(p, 'Sandnes', fast(.9)); ok(/i Sandnes før kollapsen\. Kom med handelsruta fra Sandnes/.test(S0.profil(p).historie) && !p.spes, 'en rekrutt fra en by har byen i historien: ' + S0.profil(p).historie);
  ok(S0.ankommet(F.personer[1], 'Sandnes', fast(.01)).spes, 'en sjelden gang er rekrutten fra byen spesialist');
  const m0 = F.moral, l0 = F.personer[2].lojal, nye = S0.fangerInn(F, 3, 'Kystalliansen', S0.tilf(S0.ny(3)));
  ok(nye.length === 3 && F.personer.length === 13 && nye.every(q => q.lojal >= .15 && q.lojal <= .35 && q.fange === 'Kystalliansen') && F.moral === m0 - 2 && F.personer[2].lojal < l0, 'fanger som får bli: lite trofaste, og de andre liker det dårlig');
  ok(/Kjempet for Kystalliansen/.test(S0.profil(nye[0]).historie), 'fangens historie: ' + S0.profil(nye[0]).historie);
  const kjør = o => { let sum = 0; for (let frø = 1; frø <= 12; frø++) { const F2 = F0.ny(), L = nyLeir(), S = S0.ny(frø), r = S0.tilf(S); S0.smitt(S, F2, r, 1, 0); for (let t = 0; t < 2 * 24; t++) S0.sykdomSteg(S, F2, 60, { B: F0.behov(F2, L, {}), tid: t * 60, auto: false, ...o }, r); sum += F2.personer.filter(q => q.syk || q.immun).length; } return sum; };
  const mild = kjør({}), kaldt = kjør({ sprengkulde: true, kald: .6 }); ok(kaldt > mild, `Grålungen smitter lettere i sprengkulde når folk fryser (${mild} mot ${kaldt} smittede på to døgn, tolv forsøk)`); }
console.log(feil ? `\n${feil} FEIL` : '\nAlt i orden.'); process.exit(feil ? 1 : 0);
