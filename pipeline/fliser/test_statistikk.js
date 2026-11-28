// Test av reglene for statistikken (site/dovre-fliser/spill/statistikk.js). Kjør: node pipeline/fliser/test_statistikk.js
const S0 = require('../../site/dovre-fliser/spill/statistikk.js');
let feil = 0; const sjekk = (ok, t) => { if (!ok) { feil++; console.log('FEIL: ' + t); } };

sjekk(S0.døgnNr(0) === 1 && S0.døgnNr(1439) === 1 && S0.døgnNr(1440) === 2, 'døgnNr');
let S = S0.ny();
S0.prøve(S, 1, { moral: 60, helse: 100, folk: 10 }); S0.prøve(S, 1, { moral: 40, helse: 80, folk: 10, tull: NaN });
S0.tell(S, 1, 'bygg'); S0.tell(S, 1, 'bygg', 2);
let sn = S0.snitt(S.åpen);
sjekk(sn.moral === 50 && sn.helse === 90 && sn.folk === 10 && sn.bygg === 3 && !('tull' in sn), 'snitt ' + JSON.stringify(sn));
let r = S0.lukk(S, { inn: 5e6, ut: 1e6, p: { kontrakter: 5e6, lønn: -1e6 }, kassa: 44e6, tBlå: 1 });
sjekk(r.d === 1 && r.kassa === 44e6 && r.moral === 50 && S.åpen === null && S.dager[1] === r, 'lukk');
sjekk(S0.lukk(S, {}) === null, 'lukk uten åpent døgn');
// 35 døgn: bare 30 huskes
for (let d = 2; d <= 35; d++) { S0.prøve(S, d, { moral: d }); S0.lukk(S, { inn: d * 1000, ut: 500, p: { salg: d * 1000, bygg: -500 }, kassa: 1e6 + d }); }
const L = S0.rader(S);
sjekk(L.length === 30 && L[0].d === 6 && L[29].d === 35, 'husker 30 døgn ' + L.length + ' ' + L[0].d);
const L2 = S0.rader(S, { d: 36, moral: 70 });
sjekk(L2.length === 30 && L2[29].d === 36 && L2[29].delvis === true, 'i dag kommer med og er delvis');
sjekk(S0.serie(L, 'moral').length === 30 && S0.serie(L, 'moral')[0][1] === 6, 'serie');
sjekk(S0.serie(L, 'helse').length === 0, 'tom serie');
sjekk(S0.serie(L, 'netto')[0][1] === 5500, 'netto');
const P = S0.poster(L.slice(-2));
sjekk(P[0].post === 'salg' && P[0].inn === 69000 && P[1].post === 'bygg' && P[1].ut === 1000, 'poster ' + JSON.stringify(P));
// lagring: JSON fram og tilbake
const S2 = S0.fra(JSON.parse(JSON.stringify(S)));
sjekk(Object.keys(S2.dager).length === 30 && S2.dager[35].kassa === 1e6 + 35, 'fra(JSON)');
sjekk(Object.keys(S0.fra(null).dager).length === 0 && Object.keys(S0.fra({ dager: { x: 1, 3: null, 4: { inn: 1 } } }).dager).join() === '4', 'fra tåler tull');
// ny serie og graf
sjekk(S0.leggTilSerie({ id: 'saga', navn: 'Saga sto', enhet: 't', fra: r => r.sagaSto }) && S0.SERIER.saga, 'leggTilSerie');
sjekk(!S0.leggTilSerie({ id: 'x' }), 'serie uten fra avvises');
sjekk(S0.leggTilGraf('maskiner', { navn: 'Maskiner', serier: ['saga'] }) && S0.GRAFER.maskiner.type === 'linje', 'leggTilGraf');
sjekk(S0.serie([{ d: 1, sagaSto: 4 }, { d: 2 }], 'saga').length === 1, 'ny serie leser feltet');
// skala
let k = S0.skala(0, 87);
sjekk(k.min === 0 && k.maks === 100 && k.steg === 25 && k.merker.length === 5, 'skala ' + JSON.stringify(k));
k = S0.skala(3.2e6, 9.1e6); sjekk(k.min <= 3.2e6 && k.maks >= 9.1e6 && k.merker.length <= 6, 'skala mill ' + JSON.stringify(k));
k = S0.skala(5, 5); sjekk(k.maks > k.min, 'skala med like tall');
k = S0.skala(-2e6, 3e6); sjekk(k.merker.includes(0), 'skala over null');
sjekk(S0.kort(1234567, 'kr') === '1,2 mill. kr' && S0.kort(35000, 'kr') === '35 000 kr' && S0.kort(42.5) === '42,5' && S0.kort(-2e6) === '−2 mill.', 'kort ' + S0.kort(1234567, 'kr'));
// ferdige jobber: borte og bygget finnes = ferdig; revet = ikke ferdig
sjekk(S0.ferdigeJobber(['1:bygg', '2:bygg', '3:reparer'], ['2:bygg'], id => id !== '3:reparer') === 1, 'ferdigeJobber');
console.log(feil ? feil + ' feil' : 'test_statistikk: alt ok'); process.exit(feil ? 1 : 0);
