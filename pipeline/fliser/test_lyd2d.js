// Test av reglene for lyd i 2D (site/dovre-fliser/spill/lyd2d.js): hvilken lyd en hendelse gir, og hvor ofte høyst.
const L = require('../../site/dovre-fliser/spill/lyd2d.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const R = L.REGLER, navn = ['Lag 1', 'Lag 10', '1. lastebilkolonne'];

// hvem som melder
ok(L.lagIMelding('Lag 10: marsj 3 km, ca. 1 t.', navn) === 'Lag 10', 'lengste navn vinner («Lag 10», ikke «Lag 1»)');
ok(L.lagIMelding('Lag 1 er framme.', navn) === 'Lag 1', 'navn fulgt av mellomrom');
ok(L.lagIMelding('Lag 12 er framme.', navn) === null, '«Lag 12» er ikke «Lag 1»');
ok(L.lagIMelding('Ravnsund har tatt Dombås.', navn) === null, 'fiendens meldinger gir ingen radio');
ok(L.lagIMelding('', navn) === null && L.lagIMelding('Lag 1: x', []) === null, 'tom tekst og ingen lag');

// hva meldingen gir
ok(L.meldingLyd('Lag 1: planlegger rute …', navn) === 'ordre', 'en ordre gis: ordrelyden');
ok(L.meldingLyd('Lag 1: marsj 3 km, ca. 1 t.', navn) === 'radio', 'laget melder: radio');
ok(L.meldingLyd('Lag 1: ingen radiokontakt – ordren når ikke fram. 12 km fra leiren.', navn) === 'stille', 'uten kontakt: bare sus');
ok(L.meldingLyd('Pengene: dere har 40 mill. kr', navn) === null, 'andre meldinger gir ingen lyd');

// penger
ok(L.pengeLyd(250000) === 'kasse' && L.pengeLyd(R.kasseFra) === 'kasse', 'inntekt fra ' + R.kasseFra + ' kr gir kassaapparat');
ok(L.pengeLyd(5000) === null, 'små inntekter (skatt hver time) gir ingen lyd');
ok(L.pengeLyd(-18750) === null, 'lønn for en time gir ingen lyd');
ok(L.pengeLyd(-3.5e6) === 'klunk', 'et aggregat til 3,5 mill. gir et klunk');
ok(L.pengeLyd(0) === null && L.pengeLyd(NaN) === null, 'ingen endring, ingen lyd');

// hvor ofte
{ const sist = {}, hist = [];
  ok(L.tillat('radio', 100, sist, hist).ok, 'første radiomelding høres');
  sist.radio = 100; ok(!L.tillat('radio', 101, sist, hist).ok, 'ikke ny radio etter 1 s (minst ' + R.minst.radio + ' s)');
  ok(L.tillat('radio', 100 + R.minst.radio, sist, hist).ok, 'ny radio etter ' + R.minst.radio + ' s');
  sist.ordre = 200; ok(!L.tillat('radio', 201.5, sist, hist).ok && L.tillat('radio', 200 + R.radioEtterOrdre + .1, sist, hist).ok, 'svaret på en ordre høres ikke, en senere melding gjør');
  ok(L.tillat('alarm', 300, { alarm: 300 - R.minst.alarm }, hist).ok && !L.tillat('alarm', 300, { alarm: 260 }, hist).ok, 'alarmen gjentas ikke før etter ' + R.minst.alarm + ' s');
  const mange = Array.from({ length: R.perMinutt }, (_, i) => 400 + i);
  ok(!L.tillat('kasse', 420, {}, mange).ok, 'høyst ' + R.perMinutt + ' meldingslyder i minuttet');
  ok(L.tillat('alarm', 420, {}, mange).ok && L.tillat('telefon', 420, {}, mange).ok, 'alarm og telefon telles ikke med');
  ok(L.tillat('kasse', 470, {}, mange).ok, 'etter et minutt er det plass igjen');
  ok(!L.tillat('sirene', 1, {}, []).ok, 'ukjent lyd spilles ikke');
  const [n, vindu] = R.alarmVindu, alarmer = Array.from({ length: n }, (_, i) => 1000 + i * R.minst.alarm);
  const nå = 1000 + n * R.minst.alarm; ok(!L.tillat('alarm', nå, { alarm: alarmer[n - 1], alarmer }, []).ok, `et langt angrep: alarmen går høyst ${n} ganger på ${vindu / 60} min`);
  ok(L.tillat('alarm', 1000 + vindu + 1, { alarm: alarmer[n - 1], alarmer }, []).ok, 'et nytt angrep senere får alarm igjen'); }
for (const n of Object.keys(R.minst)) ok(R.minst[n] >= 1, n + ': aldri oftere enn hvert ' + R.minst[n] + '. sekund');

// maskinene
ok(L.maskinNær(1, 0, 1400) === 1, 'zoomet inn på leiren: maskinene høres fullt');
ok(L.maskinNær(6, 0, 1400) === 0, 'zoomet ut (6 m per punkt): stille');
ok(L.maskinNær(1, 1300, 1400) === 0, 'leiren utenfor bildet: stille');
ok(L.maskinNær(3, 300, 1400) > 0 && L.maskinNær(3, 300, 1400) < 1, 'midt imellom: svakere');
ok(L.maskinNær(0, 0, 0) === 0 && L.maskinNær(1, NaN, 1400) === 0, 'ugyldige tall gir stille');
{ const B = [{ type: 'sagbruk', id: 1 }, { type: 'sagbruk', id: 2 }, { type: 'aggregat', id: 3 }, { type: 'fyrkjele', id: 4 }, { type: 'brakke', id: 5 }];
  const m = L.maskiner(B, b => b.id !== 2 && b.id !== 4);
  ok(m.sag === 1 && m.agg === 1 && m.kjele === 0, 'bare maskinene som går, høres (saga som står og kjelen er stille)');
  ok(Object.values(L.maskiner(B, () => false)).every(v => v === 0), 'ingenting går: stille'); }

// bakgrunnen
{ const b0 = L.bakgrunn({ vind: 1, regn: 0 }), b1 = L.bakgrunn({ vind: 14, regn: 0 }), br = L.bakgrunn({ vind: 3, regn: 1 });
  ok(b0.vind > 0 && b1.vind > b0.vind * 2, 'mer vind i kuling enn i stille vær');
  ok(b0.regn === 0 && br.regn > .5, 'regnlyd bare når det regner');
  ok(L.bakgrunn({ vind: 14, regn: 1, i3d: true }).vind === 0, 'i 3D tar 3D-lyden over');
  for (const o of [{}, { vind: 40, regn: 1, snø: 1 }]) { const v = L.bakgrunn(o); ok(v.vind >= 0 && v.vind <= 1 && v.regn >= 0 && v.regn <= 1, 'nivåene mellom 0 og 1: ' + JSON.stringify(o)); } }

// trinnene
ok(L.nesteTrinn('av') === 'lav' && L.nesteTrinn('høy') === 'av' && L.nesteTrinn('tull') === 'lav', 'trinnene går rundt: Av, Lav, Middels, Høy');
ok(L.gyldigTrinn('middels', 'lav') === 'middels' && L.gyldigTrinn('x', 'lav') === 'lav', 'ukjent lagret trinn gir standard');
ok(R.trinn.av === 0 && R.trinn.høy === 1 && R.trinn.lav < R.trinn.middels, 'Av er stille, Høy er fullt');
ok(R.rekke.includes(R.standard.kart) && R.rekke.includes(R.standard.meld) && R.trinn[R.standard.kart] < R.trinn[R.standard.meld], 'standard: kartet lavere enn meldingene');
process.exit(feil ? 1 : 0);
