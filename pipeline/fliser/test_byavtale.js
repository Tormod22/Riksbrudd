// Test av reglene i spill/byavtale.js (fase Ø3, byene på laget). Kjør fra repo-roten: node pipeline/fliser/test_byavtale.js
const B = require('../../site/dovre-fliser/spill/byavtale.js'); let feil = 0;
const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const R = B.REGLER;

// leder og holdning: fast per tettsted, alle fire holdninger finnes
{ const a = B.leder(17, 1300), b = B.leder(17, 1300), sett = new Set(); for (let i = 0; i < 200; i++) sett.add(B.leder(i, 900).holdning);
  ok(a.navn === b.navn && a.holdning === b.holdning && B.HOLDNING[a.holdning], 'samme tettsted gir samme leder og holdning');
  ok(sett.size === 4, 'alle fire holdningene forekommer'); ok(B.leder(1, 800).tittel === 'ordfører' && B.leder(1, 20000).tittel === 'leder for krisestyret', 'ordfører i bygda, krisestyre i byen'); }
// behov
{ const trygg = B.behov({ fiendeKm: 30, strøm: true, type: 'bygd' }), fare = B.behov({ fiendeKm: 1, strøm: true, type: 'bygd' }), mørk = B.behov({ fiendeKm: 30, strøm: false, type: 'bygd' });
  ok(fare.verdi > trygg.verdi && fare.hoved === 'trygghet', 'fiender nær gir høyt behov for trygghet');
  ok(mørk.hoved === 'strøm' && mørk.verdi > trygg.verdi, 'uten strøm er strøm det byen trenger mest');
  ok(B.behov({ fiendeKm: 1, garnison: true }).trygghet < fare.trygghet, 'en garnison gjør byen tryggere'); }
// grunnpris: ca. 15 kr per innbygger, med gulv og tak
ok(B.grunnpris('beskyttelse', 1300) === Math.max(R.pris.minst.beskyttelse, 1300 * R.pris.beskyttelse) && B.grunnpris('beskyttelse', 28000) === 28000 * R.pris.beskyttelse, `Dombås ${B.grunnpris('beskyttelse', 1300)} kr (gulvet), Lillehammer ${B.grunnpris('beskyttelse', 28000)} kr per døgn`);
ok(B.grunnpris('beskyttelse', 200) === R.pris.minst.beskyttelse && B.grunnpris('beskyttelse', 1e6) === R.pris.tak.beskyttelse, 'gulv og tak');
// trinnene
{ const b = B.by(B.ny(), 'x');
  ok(B.trinn(b) === 'nøytral' && b.tillit === R.start.tillit, 'et nytt tettsted er nøytralt');
  b.kontrakter = 1; ok(B.trinn(b) === 'kunde', 'én kontrakt gjør byen til kunde');
  ok(/tillit/.test(B.kanTrinn(b, 'beskyttelse')), 'beskyttelse krever tillit 40');
  b.tillit = 60; ok(/beskyttelses/.test(B.kanTrinn(b, 'handel')), 'handel krever beskyttelse først');
  ok(B.kanTrinn(b, 'beskyttelse') === null, 'tillit 60: beskyttelse er mulig'); }
// forhandlingen: ja, motbud og nei
{ const S = B.ny(), b = B.by(S, 'y'); b.tillit = 50; const om = { folk: 3000, behov: 60, holdning: 'forsiktig' };
  const v = B.verdi('beskyttelse', 3000, { behov: 60, holdning: 'forsiktig', løfte: 'vanlig', varighet: 14, tillit: 50 });
  const ja = B.forhandle(b, { trinn: 'beskyttelse', pris: v, løfte: 'vanlig', varighet: 14 }, om);
  const mot = B.forhandle(b, { trinn: 'beskyttelse', pris: Math.round(v * 1.2), løfte: 'vanlig', varighet: 14 }, om);
  const nei = B.forhandle(b, { trinn: 'beskyttelse', pris: v * 3, løfte: 'vanlig', varighet: 14 }, om);
  ok(ja.svar === 'ja' && mot.svar === 'motbud' && mot.motbud.pris === v && nei.svar === 'nei', `ja ved verdien (${v} kr), motbud litt over, nei langt over`);
  const stort = B.verdi('beskyttelse', 3000, { behov: 60, løfte: 'stort', holdning: 'forsiktig' }), lite = B.verdi('beskyttelse', 3000, { behov: 60, løfte: 'lite', holdning: 'forsiktig' });
  ok(stort > v && lite < v, 'et større løfte er verdt mer');
  ok(B.verdi('beskyttelse', 3000, { behov: 90 }) > B.verdi('beskyttelse', 3000, { behov: 20 }), 'jo mer byen trenger dere, jo mer betaler den');
  ok(B.verdi('beskyttelse', 3000, { holdning: 'grådig' }) < B.verdi('beskyttelse', 3000, { holdning: 'redd' }), 'grådig betaler mindre enn redd');
  const pb = B.by(S, 'p'); pb.tillit = 60; pb.frykt = 60; ok(B.forhandle(pb, { trinn: 'beskyttelse', pris: 1000, løfte: 'vanlig', varighet: 14 }, { folk: 3000, holdning: 'patriot' }).svar === 'nei', 'en patriot lar seg ikke true (frykt 60)');
  ok(B.forhandle(b, { trinn: 'beskyttelse', pris: v, løfte: 'vanlig', varighet: 10 }, om).svar === 'nei', 'varigheten må være 7, 14 eller 30');
  // rivalen forhandler: dere må by under rivalens pris × overby
  const r = B.forhandle(b, { trinn: 'beskyttelse', pris: v, løfte: 'vanlig', varighet: 14 }, { ...om, rivalPris: Math.round(v * .5) });
  ok(r.svar !== 'ja', 'med en billig rival holder ikke den vanlige prisen'); }
// avtalen holdes og brytes
{ const S = B.ny(), b = B.by(S, 'z'); b.tillit = 50;
  B.inngå(b, { trinn: 'beskyttelse', pris: 40000, løfte: 'vanlig', varighet: 7 }, 0);
  ok(B.betaling(b) === 40000 && B.trinn(b) === 'beskyttelse' && b.avtale.mann === 4 && b.avtale.slutt === 7 * 1440, 'avtalen er inngått: 40 000 kr per døgn, 4 mann, 7 døgn');
  for (let h = 0; h < 24; h++) B.time(b, 5); const d1 = B.døgn(b, { holdning: 'forsiktig' });
  ok(d1.holdt && b.tillit === 50 + R.tillit.holdt, 'holdt løfte: tilliten går opp');
  for (let h = 0; h < 24; h++) B.time(b, h < 10 ? 4 : 1); const d2 = B.døgn(b, {});
  ok(d2.holdt === false && b.tillit === 52 + R.tillit.brutt && b.avtale.brudd === 1, 'brutt løfte (bare 10 av 24 timer): tilliten synker');
  for (let i = 0; i < 2; i++) { for (let h = 0; h < 24; h++) B.time(b, 0); var d3 = B.døgn(b, {}); }
  ok(d3.sierOpp, 'tre brudd: byen sier opp');
  ok(B.siOpp(b, 3000, d3.grunn) && B.slutt(b, 3000 + 100) === null && B.slutt(b, 3000 + R.oppsigelse.varsel) === 'oppsagt', 'oppsigelsen gjelder etter et døgns varsel');
  B.avslutt(b, 'oppsagt'); ok(!b.avtale && B.trinn(b) === 'nøytral', 'etter oppsigelsen er byen nøytral igjen');
  const n = B.naboer({ id: 1, x: 0, y: 0 }, [{ id: 1, x: 0, y: 0 }, { id: 2, x: 9000, y: 0 }, { id: 3, x: 40000, y: 0 }]); ok(n.length === 1 && n[0].id === 2, 'nabobyene innen 15 km får høre om det'); }
// byen ber om hjelp
{ const b = B.by(B.ny(), 'h'); b.tillit = 50; B.inngå(b, { trinn: 'beskyttelse', pris: 30000, løfte: 'vanlig', varighet: 14 }, 0);
  const h = B.berOmHjelp(b, { nå: 100, fiender: 2, km: 1.4, retning: 'nord' });
  ok(h && h.frist === 100 + 120 && !B.berOmHjelp(b, { nå: 110 }), 'byen ber om hjelp (svartid 2 t), og ikke to ganger samtidig');
  ok(B.hjelpSteg(b, { nå: 150, framme: false }) === null, 'underveis: ingenting ennå');
  ok(B.hjelpSteg(b, { nå: 400, framme: false }) === 'for sent' && b.tillit === 50 + R.tillit.ikkeHjelp && b.avtale.brudd === 1, 'kommer du for sent, synker tilliten');
  ok(!B.berOmHjelp(b, { nå: 200 }), 'ikke en ny bønn rett etterpå');
  B.berOmHjelp(b, { nå: 1000 }); ok(B.hjelpSteg(b, { nå: 1030, framme: true }) === 'hjulpet' && b.tillit === 40 + R.tillit.hjelp, 'kommer du i tide, stiger tilliten'); }
// rivalene
{ const S = B.ny(), byer = [{ id: 'r', x: 0, y: 0, folk: 2000, eier: 'rød' }, { id: 'n1', x: 5000, y: 0, folk: 3000, eier: null }, { id: 'n2', x: 60000, y: 0, folk: 90000, eier: null }];
  ok(B.rivalMål(S, byer, 'rød') === 'n1' && B.rivalMål(S, byer, 'grønn') === null, 'rivalen frir til nøytrale byer nær seg (ikke uten egne tettsteder)');
  const b = B.by(S, 'n1'); B.rivalFrir(b, 'rød', 3000, 0, 'forsiktig');
  ok(B.rivalMål(S, byer, 'rød') === null, 'ikke samme by to ganger');
  ok(B.rivalSteg(b, 100) === null && B.rivalSteg(b, R.rival.tid) === 'rival' && b.rival.side === 'rød', 'etter et døgn får rivalen avtalen');
  ok(B.rivalVokser(b, 7 * 1440 + R.rival.tid) && B.stillingVekt(b).side === 'rød' && B.stillingVekt(b).vekt === .5, 'rivalens handelspartner teller halvt for rivalen');
  const c = B.by(S, 'n9'); c.tillit = 60; B.rivalFrir(c, 'grønn', 3000, 0, 'forsiktig'); B.inngå(c, { trinn: 'beskyttelse', pris: 30000, løfte: 'vanlig', varighet: 14 }, 10);
  ok(!c.forhandler && B.rivalSteg(c, R.rival.tid) === null && !c.rival, 'by over: dere fikk avtalen, rivalen gikk tomhendt'); }
// hvert trinn må holdes en stund før det neste, og etter en oppsigelse vil byen ikke forhandle med en gang
{ const b = B.by(B.ny(), 'e'); b.tillit = 60; B.inngå(b, { trinn: 'beskyttelse', pris: 30000, løfte: 'vanlig', varighet: 30 }, 0);
  ok(/døgn først/.test(B.kanTrinn(b, 'handel', 'blå', false, 1440)) && B.kanTrinn(b, 'handel', 'blå', false, R.trinn.handel.etter * 1440) === null, `handel tidligst etter ${R.trinn.handel.etter} døgn med beskyttelse`);
  ok(B.forhandle(b, { trinn: 'handel', pris: 1000, løfte: 'vanlig', varighet: 14 }, { folk: 2000, nå: 60 }).svar === 'nei', 'forhandlingen sier nei for tidlig');
  B.siOpp(b, 100, 'prøve'); B.avslutt(b, 'oppsagt', 100 + R.oppsigelse.varsel);
  ok(/nylig/.test(B.kanTrinn(b, 'beskyttelse', 'blå', false, 3000)) && B.kanTrinn(b, 'beskyttelse', 'blå', false, 100 + R.oppsigelse.varsel + R.oppsigelse.stengt * 1440) === null, `etter en oppsigelse: ${R.oppsigelse.stengt} døgn uten forhandling`); }
// å vokte en by uten avtale bygger tillit, men bare opp til taket
{ const b = B.by(B.ny(), 'v'); B.døgn(b, { vokter: true }); ok(b.tillit === R.start.tillit + R.tillit.holdt, 'vakt uten avtale: tilliten stiger');
  B.døgn(b, {}); ok(b.tillit === R.start.tillit + R.tillit.holdt, 'uten vakt: ingenting'); b.tillit = R.vakt.tak - 1; B.døgn(b, { vokter: true }); B.døgn(b, { vokter: true }); ok(b.tillit === R.vakt.tak, 'taket holder'); }
// medlem og stillingen
{ const b = B.by(B.ny(), 'm'); b.tillit = 75; b.frykt = 20; B.inngå(b, { trinn: 'beskyttelse', pris: 30000, løfte: 'vanlig', varighet: 30 }, 0);
  B.inngå(b, { trinn: 'handel', pris: 25000, løfte: 'vanlig', varighet: 30 }, 0);
  ok(B.stillingVekt(b).vekt === .5 && B.stillingVekt(b).side === 'blå', 'en handelspartner teller halvt');
  b.frykt = 60; ok(/redd/.test(B.kanTrinn(b, 'medlem')), 'medlem krever frykt under 50');
  b.frykt = 20; const f = B.forhandle(b, { trinn: 'medlem', løfte: 'vanlig', varighet: 30 }, { folk: 2000, holdning: 'redd' });
  ok(f.svar === 'ja', 'tillit 75 og lite frykt: byen vil bli medlem'); B.inngå(b, { trinn: 'medlem', løfte: 'vanlig', varighet: 30 }, 0);
  ok(B.trinn(b) === 'medlem' && B.betaling(b) === 0 && B.stillingVekt(b) === null, 'et medlem betaler skatt (region.js), ikke avtalepris, og er eid (teller fullt via eieren)'); }
// lagring
{ const S = B.ny(), b = B.by(S, 7); b.tillit = 66; B.inngå(b, { trinn: 'beskyttelse', pris: 30000, løfte: 'stort', varighet: 30 }, 5);
  const T = B.fraJSON(JSON.parse(JSON.stringify(S))); ok(T.byer[7].tillit === 66 && T.byer[7].avtale.mann === 6, 'lagres og leses');
  ok(Object.keys(B.fraJSON({ byer: { a: null } }).byer).length === 0 && B.fraJSON(null).versjon === 1, 'tåler dårlige data'); }
// krigsstillingen i strategi.js: medlemmer fullt (eid), partnere halvt
{ const ST = require('../../site/dovre-fliser/spill/strategi.js'), byer = [{ id: 'a', folk: 1000 }, { id: 'b', folk: 1000 }, { id: 'c', folk: 2000 }];
  const før = ST.stilling(byer, id => (id === 'a' ? 'blå' : null));
  const med = ST.stilling(byer, id => (id === 'a' ? 'blå' : null), undefined, id => (id === 'c' ? { side: 'blå', vekt: .5 } : null));
  ok(Math.abs(før.sider.blå.andel - .25) < 1e-9 && Math.abs(med.sider.blå.andel - .5) < 1e-9 && med.sider.blå.partnere === 1, 'krigsstillingen: partneren (2000) teller halvt');
  ST.avtaler = id => (id === 'b' ? { side: 'rød', vekt: .5 } : null); const g = ST.stilling(byer, () => null); ST.avtaler = null;
  ok(Math.abs(g.sider.rød.andel - .125) < 1e-9 && Math.abs(g.nøytral.andel - .875) < 1e-9, 'krigsstillingen: Strategi.avtaler gjelder når ingen funksjon er gitt (rivalens partner)'); }

// (ut8-kr-ro) BUDKAMPEN: en rival frir – et stort løfte senker kravet til tillit for beskyttelse (30 = det en ny by starter på)
{ const b = B.by(B.ny(), 'x'); ok(B.kanTrinn(b, 'beskyttelse', 'blå', false, 0, { løfte: 'stort' }) === 'Byen stoler ikke nok på dere: tillit 30 av 40.', 'uten rival: kravet er 40 også med stort løfte');
  b.forhandler = { side: 'rød', fra: 0, ferdig: 1440, pris: 400000 }; ok(B.budkamp(b), 'rivalen frir = budkamp');
  ok(B.tillitKrav(b, 'beskyttelse', 'stort') === 30 && B.tillitKrav(b, 'beskyttelse', 'vanlig') === 35 && B.tillitKrav(b, 'beskyttelse', 'lite') === 40, 'budkamp: kravet 30/35/40 etter løftet');
  ok(B.tillitKrav(b, 'handel', 'stort') === R.trinn.handel.tillit, 'budkampen gjelder bare beskyttelse');
  ok(B.kanTrinn(b, 'beskyttelse', 'blå', false, 0, { løfte: 'stort' }) === null, 'budkamp: tillit 30 og stort løfte er nok');
  ok(/30 av 35/.test(B.kanTrinn(b, 'beskyttelse', 'blå', false, 0, { løfte: 'vanlig' })), 'budkamp: vanlig løfte krever 35');
  const lav = B.forhandle(b, { trinn: 'beskyttelse', pris: 300000, løfte: 'stort', varighet: 14 }, { folk: 21000, behov: 50, holdning: 'forsiktig', rivalPris: 400000 });
  ok(lav.svar === 'ja', 'budkamp: under rivalens pris og stort løfte gir ja (' + lav.grunn + ')');
  const dyr = B.forhandle(b, { trinn: 'beskyttelse', pris: 900000, løfte: 'stort', varighet: 14 }, { folk: 21000, behov: 50, holdning: 'forsiktig', rivalPris: 400000 });
  ok(dyr.svar !== 'ja', 'budkamp: over rivalens pris er fortsatt ikke ja');
  const nei = B.forhandle(b, { trinn: 'beskyttelse', pris: 300000, løfte: 'lite', varighet: 14 }, { folk: 21000, behov: 50, holdning: 'forsiktig', rivalPris: 400000 });
  ok(nei.svar === 'nei' && /30 av 40/.test(nei.grunn), 'budkamp: lite løfte holder ikke');
  b.tillit = 20; ok(B.tillitKrav(b, 'beskyttelse', 'stort') === 30 && /20 av 30/.test(B.kanTrinn(b, 'beskyttelse', 'blå', false, 0, { løfte: 'stort' })), 'budkamp: lavere tillit enn 30 holder ikke'); }
// (ut8-kr-ro) SPORET til mer tillit
{ const b = B.by(B.ny(), 'y'), S = B.tillitSpor(b, { navn: 'Lillehammer', holdning: 'forsiktig' });
  ok(S.krav === 40 && S.mangler === 10 && !S.budkamp, 'sporet: 10 tillit mangler til beskyttelse');
  const k = S.veier.find(v => v.id === 'kontrakt'), v = S.veier.find(v => v.id === 'vakt');
  ok(k && k.pluss === R.tillit.kontrakt && /Lillehammer/.test(k.tekst), 'sporet: en kontrakt for byen gir +' + R.tillit.kontrakt);
  ok(v && v.pluss === R.tillit.holdt && v.per === 'døgn' && v.tak === R.vakt.tak, 'sporet: å vokte byen gir +' + R.tillit.holdt + ' per døgn');
  ok(B.tillitSpor(b, { holdning: 'patriot' }).veier.find(v => v.id === 'vakt').pluss === 1.4, 'sporet: patrioten stoler sakte (+1,4 per døgn)');
  b.forhandler = { side: 'grønn', fra: 0, ferdig: 1440, pris: 1 }; const bk = B.tillitSpor(b, {}).budkamp; ok(bk && bk.løfte === 'stort' && bk.mann === 6 && bk.krav === 30, 'sporet i budkamp: løftet 6 mann holder');
  b.tillit = 36; ok(B.tillitSpor(b, {}).budkamp.løfte === 'vanlig', 'sporet i budkamp: med tillit 36 holder det vanlige løftet');
  b.avtale = { trinn: 'beskyttelse' }; ok(B.tillitSpor(b, { trinn: 'handel' }).veier.some(v => v.id === 'holdt') && !B.tillitSpor(b, { trinn: 'handel' }).veier.some(v => v.id === 'vakt'), 'sporet med avtale: hold løftet, ikke vakt'); }

console.log(feil ? `\n${feil} FEIL` : '\nalle byavtale-testene ok'); process.exit(feil ? 1 : 0);
