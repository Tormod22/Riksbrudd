// Test av reglene i spill/eventyr.js (eventyret til fots). Kjør: node pipeline/fliser/test_eventyr.js
const E = require('../../site/dovre-fliser/spill/eventyr.js'), R = E.REGLER;
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
// tur
{ const g = E.Tur.slit(450, false), l = E.Tur.slit(450, true), lett = E.Tur.slit(450, true, true);
  ok(Math.abs(g.tørst - 10) < 1e-9 && l.tørst === 20 && lett.tørst === g.tørst && g.sult > 3 && g.sult < 4, 'tur: 450 m koster 10 tørst (løping 20, «Lett til beins» 10) og litt sult');
  const t = { vann: 2 }; ok(E.Tur.drikk(t) === R.tur.slurk && t.vann === 1 && E.Tur.drikk(t) > 0 && t.vann === undefined && E.Tur.drikk(t) === 0, 'flaska: en slurk om gangen, tom gir 0');
  ok(E.Tur.fyll(t) === R.tur.flaske && t.vann === R.tur.flaske && E.Tur.fyll(t) === 0, 'flaska fylles helt'); }
// skader
{ const S = {}; ok(E.Skader.fall(5) === null && E.Skader.fall(4.2) === null, 'et vanlig hopp skader ikke');
  const f = E.Skader.fall(12), s = E.Skader.fall(12, true); ok(f.helse > 15 && f.bein > .6 && s.bein === f.bein / 2, `høyt fall: −${f.helse} helse, brudd ${Math.round(f.bein * 100)} % (seig: halvparten)`);
  ok(E.Skader.få(S, 'bein', 0, 'x') && !E.Skader.få(S, 'bein', 0) && E.Skader.fart(S) === .5 && !E.Skader.kanLøpe(S), 'brukket bein: halv fart, ingen løping, bare én om gangen');
  ok(/spjelk/.test(E.Skader.behandle(S, 'bein', {})) && E.Skader.behandle(S, 'bein', { spjelk: 1 }) === null && S.bein.behandlet && E.Skader.fart(S) === .8, 'spjelk: nesten vanlig fart');
  E.Skader.få(S, 'infeksjon', 0); let r = E.Skader.steg(S, 2, 10); ok(r.helse === 6 && !r.friske.length, 'infeksjon tærer 3 helse per time');
  const t = { forbinding: 1 }; ok(E.Skader.behandle(S, 'infeksjon', t) === null && !t.forbinding && E.Skader.steg(S, 1, 1).helse === 0, 'behandlet infeksjon tærer ikke');
  r = E.Skader.steg(S, 0, 0, { sykestue: true }); ok(r.friske.length === 2 && !Object.keys(S).length, 'sykestua gjør deg frisk straks');
  E.Skader.få(S, 'bein', 0); E.Skader.steg(S, 47, 0); ok(S.bein, 'beinet er ikke grodd etter 47 timer'); ok(E.Skader.steg(S, 2, 0).friske[0] === 'bein', '… men etter 48');
  E.Skader.få(S, 'bein', 0); ok(E.Skader.steg(S, 0, 21 * 60).friske[0] === 'bein', 'eller etter 20 ekte minutter');
  E.Skader.få(S, 'bein', 0); E.Skader.steg(S, 13, 0, { leir: true }); ok(!S.bein, 'i leiren gror det fire ganger så fort');
  ok(E.Skader.skudd(10) > .1 && E.Skader.skudd(1000) === R.skade.skuddMaks && E.Skader.kulde(1, false, false) === 0 && E.Skader.kulde(1, true, true) === 2 * E.Skader.kulde(1, true, false), 'sjansene for infeksjon av skudd og kulde'); }
// håndverk
{ const H = E.Handverk, t = { tøy: 2, sprit: 1, tau: 1 };
  ok(H.mangler(t, 'forbinding') === null && /ståltråd/.test(H.mangler(t, 'felle')) && H.mangler(t, 'tull') !== null, 'oppskriftene sier hva som mangler');
  const r = H.lag(t, 'forbinding'); ok(r.ting === 'forbinding' && r.n === 1 && !t.tøy && !t.sprit && t.tau === 1 && H.lag(t, 'forbinding').feil, 'lage trekker delene, og går ikke uten');
  ok(H.lag({ skrap: 2, tau: 1, ståltråd: 1 }, 'armbrøst').våpen === 'armbrøst' && H.ARMBRØST.stille && H.lag({ skrap: 1, tøy: 1 }, 'abolt').n === 5, 'armbrøst og fem bolter');
  let med = 0, sum = 0; for (let i = 1; i <= 1000; i++) { const f = H.funn('hus', i); const n = Object.values(f).reduce((a, b) => a + b, 0); if (n) med++; sum += n; if (JSON.stringify(f) !== JSON.stringify(H.funn('hus', i))) feil++; }
  ok(med > 600 && med < 800 && sum / med > 1.5 && sum / med < 2.5, `deler i ${med} av 1000 hus, snitt ${(sum / med).toFixed(2)} (fast per bygg)`);
  const d = H.funn('industri', 7, true), e = H.funn('industri', 7); ok(Object.keys(e).every(k => d[k] === 2 * e[k]), '«Finner alt» gir dobbelt');
  ok(H.trolig({ tomt: true }) === 'ser tomt ut' && H.trolig({ mat: 9, penger: 5000 }) === 'trolig mat og penger' && H.trolig({ stål: 2, mat: 3 }) === 'trolig stål og mat', 'trent øye sier hva huset trolig har');
  for (const o of H.OPPSKRIFTER) for (const d2 of Object.keys(o.trenger)) if (!H.DELER[d2]) { feil++; console.log('FEIL ukjent del ' + d2); } }
// felle
{ const f = { tid: 0, ekte: 0, skog: false }; ok(E.Felle.sjekk(f, 300, 100, 0, 0) === null && E.Felle.sjekk(f, 360, 100, .1, .9) === 1 && E.Felle.sjekk(f, 10, 301, .1, .1) === 2 && E.Felle.sjekk(f, 360, 0, .7, 0) === 0 && E.Felle.sjekk({ ...f, skog: true }, 360, 0, .7, .9) === 1, 'fella: klar etter 6 timer eller 5 ekte minutter, bedre i skog'); }
// sniking og dekning
{ const S = E.Snik, stå = S.rekkevidde({ stilling: 'stå', fart: 1.7 }), huk = S.rekkevidde({ stilling: 'huk', fart: .9 }), ligg = S.rekkevidde({ stilling: 'ligg', fart: 0, mørke: 1, skog: true });
  ok(stå === 220 && huk === 132 && ligg < 25, `oppdages fra ${stå} m stående, ${huk} m på huk, ${ligg.toFixed(0)} m liggende stille i mørk skog`);
  ok(S.rekkevidde({ stilling: 'stå', løper: true, fart: 5 }) === 308 && S.rekkevidde({ stilling: 'stå', løper: true, stilleLøp: true, fart: 5 }) < 260, 'løping høres lenger, «Stille løp» mindre');
  ok(S.rekkevidde({ stilling: 'ligg', skuddSiden: 2 }) === 420 && S.rekkevidde({ stilling: 'ligg', skuddSiden: 2, stilleVåpen: true }) === 126 && S.rekkevidde({ stilling: 'ligg', skuddSiden: 30 }) < 80, 'et skudd røper deg i 20 s (armbrøsten mye mindre)');
  let n = 0, t = 0; while (n < 1 && t < 20) { n = S.steg(n, 200, 220, 1); t++; } ok(t >= 1 && t <= 3, `i ytterkanten tar det ${t} s å bli sett`); n = 0; t = 0; while (n < 1 && t < 20) { n = S.steg(n, 20, 220, 1); t++; } ok(t === 1, 'helt nær: straks');
  ok(S.steg(.5, 300, 220, 1) < .5 && S.sett(true, .5) && !S.sett(true, .3) && !S.sett(false, .9) && S.sett(false, 1), 'utenfor glemmer de deg sakte (sett til under 0,4)');
  ok(S.dekning('stå', false) === 1 && S.dekning('ligg', false) === .5 && Math.abs(S.dekning('ligg', true) - .2) < 1e-9 && S.dekning('stå', true) === .4 && S.ord(1) === 'Sett' && S.ord(0) === 'Skjult', 'dekning: liggende halv skade, bak vegg 40 %'); }
// hund
{ const H = E.Hund; ok(H.retning(0, 100) === 'nord' && H.retning(100, 100) === 'nordøst' && H.retning(-100, 0) === 'vest' && H.retning(0, -5) === 'sør', 'retningsordene');
  const v = {}, F = [{ id: 'a', dx: 0, dy: 200, avst: 200, synlig: false }, { id: 'b', dx: 100, dy: 0, avst: 100, synlig: true }, { id: 'c', dx: 0, dy: 900, avst: 900, synlig: false }];
  const u = H.varsler(F, v, 0); ok(u.length === 1 && /nord/.test(u[0].tekst) && H.varsler(F, v, 30).length === 0 && H.varsler(F, v, 61).length === 1, 'hunden varsler om usette fiender innen 350 m, høyst hvert minutt');
  ok(H.kommer(900, 1, .99, true) && !H.kommer(900, 1, .99, false) && H.kommer(0, 100, .01, false), 'hunden kommer sikkert etter 800 m når kapittelet ber om den'); }
// historien
{ const H = E.Historie; for (const [b, L] of Object.entries(H.KAPITLER)) { ok(L.length === 3 && L.every(k => k.tittel && k.tekst.length > 30 && H.TELLERE[k.mål.slag] && k.mål.n > 0 && k.etter && (k.belønning.penger || k.belønning.ting || k.belønning.ferdighet)), `${b}: tre kapitler med mål og belønning`); }
  for (const b of ['soldat', 'lege', 'ingeniør', 'bonde', 'forretningsmann', 'politi']) if (!H.KAPITLER[b]) { feil++; console.log('FEIL mangler bakgrunn ' + b); }
  const h = H.ny(), T = { gått: 500, tilflukt: 0, felt: 0 }; ok(H.framgang('soldat', h, T).andel === 1 / 3 && H.fullfør('soldat', h, T) === null, 'kapittel 1: 500 av 1500 m');
  T.gått = 1600; const k = H.fullfør('soldat', h, T); ok(k && k.tittel === 'Gamle vaner' && h.kap === 1 && H.framgang('soldat', h, T).nå === 0, 'fullført -> neste kapittel');
  T.tilflukt = 1; ok(H.fullfør('soldat', h, T) && h.kap === 2 && h.fra === 0, 'tilflukt teller det du har'); T.felt = 2; ok(!H.framgang('soldat', h, T).ferdig, 'to av tre'); T.felt = 3; ok(H.fullfør('soldat', h, T) && H.kapittel('soldat', h) === null && H.framgang('soldat', h, T) === null, 'etter tre kapitler er historien fortalt');
  const h2 = H.ny(); h2.kap = 1; h2.fra = 4; ok(H.framgang('lege', h2, { hus: 6 }).nå === 2, 'tellere regnes fra kapittelets start'); ok(H.kapittel('ukjent', H.ny()).tittel === 'Gamle vaner', 'ukjent bakgrunn får soldatens historie'); }
// sløret
{ const S = E.Slør, M = S.ny(200000, 6900000); ok(!S.sett(M, 200000, 6900000) && S.km2(M) === 0, 'alt er uoppdaget først');
  const ny = S.merk(M, 200000, 6900000, 1000); ok(ny.length > 40 && ny.length < 90 && S.sett(M, 200000, 6900000) && S.sett(M, 200900, 6900000) && !S.sett(M, 201600, 6900000) && S.merk(M, 200000, 6900000, 1000).length === 0, `1 km rundt gir ${ny.length} celler (${S.km2(M).toFixed(1)} km²), og bare én gang`);
  S.merk(M, 230000, 6930000, 700); S.merk(M, 0, 0, 5000); const t = S.tilTekst(M), M2 = S.fraTekst(S.ny(200000, 6900000), t); ok(M2.antall === M.antall && S.sett(M2, 230000, 6930000) && !S.sett(M2, 215000, 6915000) && t.length < 2000, `lagres som ${t.length} tegn og leses likt`);
  ok(!S.sett(M, 0, 0) && S.fraTekst(S.ny(0, 0), 'tull').antall === 0 && S.fraTekst(S.ny(0, 0), '').antall === 0, 'utenfor rutenettet og ødelagt lagring tåles'); }
// tilfluktslageret
{ const L = E.Lager.ny(), sekk = { a9: 40, rasjon: 2 }; ok(E.Lager.flytt(sekk, L.ting, 'a9', 30) === 30 && sekk.a9 === 10 && L.ting.a9 === 30 && E.Lager.flytt(sekk, L.ting, 'rasjon', 5) === 2 && !sekk.rasjon && E.Lager.flytt(sekk, L.ting, 'x', 1) === 0, 'flytt mellom sekk og lager');
  L.våpen.push({ id: 'pistol' }); ok(Math.abs(E.Lager.vekt(L, { a9: { vekt: .01 }, rasjon: { vekt: .5 } }, { pistol: { vekt: 1 } }) - 2.3) < 1e-9, 'lagerets vekt'); }
// runde 2: frost, søvn i andeler, kjøtt i sekken
ok(E.Skader.kulde(1, false, false, -12) === 3 * R.skade.kuldePerTime && E.Skader.kulde(1, false, false, 2) === 0 && E.Skader.kulde(1, true, false, -12) === 3 * E.Skader.kulde(1, true, false, 0), 'under −8 °C er kulda farlig uansett årstid (tre ganger sjansen)');
ok(E.Tur.søvn(1).søvn === R.tilflukt.sovSøvn && E.Tur.søvn(.5).helse === R.tilflukt.sovHelse / 2 && E.Tur.søvn(-1).søvn === 0, 'avbrutt søvn gir en andel');
{ const k = E.Tur.kjøtt(25, 10), a = E.Tur.kjøtt(5, 10), n = E.Tur.kjøtt(5, -2); ok(k.med === 10 && k.igjen === 15 && a.med === 5 && a.igjen === 0 && n.med === 0 && n.igjen === 5, 'kjøtt: det som får plass i sekken, resten blir liggende'); }
// (runde 4) dekning bak en bakketopp
{ const S = E.Snik, flat = Array(32).fill(100), ås = flat.map((v, i) => v + (i > 10 && i < 20 ? 3 : 0)), lav = flat.map((v, i) => v + (i > 10 && i < 20 ? .8 : 0));
  ok(!S.bakkeImellom(flat, 1.6) && S.bakkeImellom(ås, 1.6), 'en ås på 3 m mellom deg og fienden gir dekning, flatt terreng ikke');
  ok(S.bakkeImellom(lav, .35) && !S.bakkeImellom(lav, 1.6), 'en lav kul skjuler deg bare når du ligger');
  const opp = flat.map((v, i) => v + i * 2); ok(!S.bakkeImellom(opp, 1.6), 'en jevn bakke opp mot fienden gir ikke dekning');
  ok(Math.abs(S.dekning('stå', false, true) - R.dekning.bakke) < 1e-9 && S.dekning('ligg', true, true) < S.dekning('ligg', true, false), 'bakketoppen ganges med de andre dekningene');
}
// (runde 4) hunden spiser og kan skades
{ const H = E.Hund, RH = R.hund, h = H.fyll({ navn: 'Rex' }); ok(h.mett === 100 && h.hp === 100, 'en ny hund er mett og frisk');
  let u = H.steg(h, RH.sultTimer * .7, 0, {}); ok(u.sulten && h.mett < RH.spisUnder && !u.spiste, `sulten etter ${Math.round(RH.sultTimer * .7)} spilltimer (mett ${Math.round(h.mett)})`);
  let spist = 0; u = H.steg(h, 1, 0, { leir: true, mat: () => { spist++; return true; } }); ok(u.spiste && spist === 1 && h.mett === 100, 'i leiren spiser den en rasjon av leirens mat');
  const h2 = H.fyll({ navn: 'Luna' }); H.steg(h2, 0, RH.sultEkteMin * 60, {}); ok(h2.mett === 0, `uten spilltid blir den sulten på ${RH.sultEkteMin} ekte minutter`);
  u = H.steg(h2, RH.gårTimer + 1, 0, { leir: true, mat: () => false }); ok(u.går, 'uten mat (heller ikke i leiren) går den sin vei');
  const t = { rasjon: 1 }, h3 = H.fyll({ navn: 'Mira', mett: 10 }); ok(H.mat(h3, t) === null && h3.mett === 100 && !t.rasjon && H.mat(h3, t) !== null, 'du kan gi den en rasjon fra sekken (og ikke når du er tom)');
  ok(H.truffet(h3, 20, .1) === 20 * RH.skade && H.truffet(h3, 20, .9) === 0, 'den kan bli truffet når du blir truffet');
  h3.hp = 30; ok(H.tilstand(h3) === 'hardt skadet', 'hardt skadet'); H.steg(h3, 2, 0, { leir: true }); ok(h3.hp === 30 + RH.gror * 2 * 4, 'gror fire ganger så fort i leiren');
}
console.log(feil ? feil + ' feil' : 'alle eventyrtestene ok'); process.exit(feil ? 1 : 0);
