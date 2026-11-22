// Test av kommandolaget (site/dovre-fliser/spill/kommando.js). Kjør: node pipeline/fliser/test_kommando.js
const K = require('../../site/dovre-fliser/spill/kommando.js');
let feil = 0; const sjekk = (ok, t) => { if (!ok) { feil++; console.log('FEIL: ' + t); } };

K._tøm();
const lag = [{ navn: 'Lag 1', side: 'blå' }, { navn: 'Lag 2', side: 'blå', nid: 'l2' }, { navn: 'Patrulje', side: 'rød' }];
// nid: får en nid som ikke er brukt fra før
for (const s of lag) K.nid(s, lag);
sjekk(lag[0].nid === 'l1' && lag[1].nid === 'l2' && lag[2].nid === 'l3', 'nid: ' + lag.map(s => s.nid).join(','));
sjekk(K.nid(lag[0], lag) === 'l1', 'nid er fast');
sjekk(new Set(lag.map(s => s.nid)).size === 3, 'nid er unik');

// registrer og typer
let utført = 0;
K.registrer('formasjon', { lag: true, sjekk: (k, c, s) => (k.id && !['kile', 'linje'].includes(k.id) ? 'Ukjent formasjon.' : null),
  utfør: (k, c, s) => { utført++; s.formasjon = k.id || 'linje'; return `${s.navn} går i ${s.formasjon}.`; }, beskriv: (k, s) => `setter ${s.navn} i ${k.id}` });
K.registrer('bygg', { leir: true, utfør: k => ({ id: 7, type: k.bygg.type }) });
K.registrer('alle', { vertAlene: 'Bare verten kan endre alle lag.', utfør: () => 'ok' });
K.registrer('kast', { utfør: () => { throw new Error('bom'); } });
sjekk(K.typer().join() === 'formasjon,bygg,alle,kast', 'typer: ' + K.typer());
let kastet = false; try { K.registrer('tom', {}); } catch (e) { kastet = true; } sjekk(kastet, 'registrer uten utfør kaster');

// enspiller (ingen spiller i ctx)
const ctx = { lag, side: 'blå', spiller: null, erVert: false };
let r = K.utfør({ type: 'formasjon', lag: 'l1', id: 'linje' }, ctx);
sjekk(r.ok && r.svar === 'Lag 1 går i linje.' && lag[0].formasjon === 'linje', 'formasjon i enspiller ' + JSON.stringify(r));
r = K.utfør({ type: 'formasjon', lag: 'l1', id: 'sirkel' }, ctx); sjekk(!r.ok && r.feil === 'Ukjent formasjon.' && lag[0].formasjon === 'linje', 'sjekk stopper');
r = K.utfør({ type: 'formasjon', lag: 'l9' }, ctx); sjekk(!r.ok && r.feil === K.TEKST.ingenLag, 'ukjent lag');
r = K.utfør({ type: 'fly' }, ctx); sjekk(!r.ok && /Ukjent kommando/.test(r.feil), 'ukjent kommando');
r = K.utfør(null, ctx); sjekk(!r.ok, 'null er ugyldig'); r = K.utfør({}, ctx); sjekk(!r.ok, 'uten type er ugyldig');
r = K.utfør({ type: 'bygg', bygg: { type: 'brakke' } }, ctx); sjekk(r.ok && r.svar.id === 7, 'leirkommando i enspiller');
r = K.utfør({ type: 'alle' }, ctx); sjekk(r.ok, 'vertAlene i enspiller');
r = K.utfør({ type: 'kast' }, ctx); sjekk(!r.ok && /bom/.test(r.feil), 'feil i utfør blir svar');
// fiendens lag kan styres lokalt (AI-er og testene bruker de samme kommandoene); reglene for gjester gjelder bare fjern
r = K.utfør({ type: 'formasjon', lag: 'l3', id: 'kile' }, ctx); sjekk(r.ok, 'lokalt: alle lag');

// gjest (fjern): laget må være hans
const gjest = { lag, side: 'blå', spiller: 'g1', erVert: false };
sjekk(K.fjern(gjest) && !K.fjern(ctx) && !K.fjern({ spiller: 'v', erVert: true }), 'fjern');
const før = utført;
r = K.utfør({ type: 'formasjon', lag: 'l1', id: 'kile' }, gjest); sjekk(!r.ok && r.feil === 'Lag 1 styres av verten.' && utført === før, 'gjest uten laget ' + r.feil);
lag[1].eier = 'g2';
r = K.utfør({ type: 'formasjon', lag: 'l2', id: 'kile' }, gjest); sjekk(!r.ok && r.feil === 'Lag 2 styres av en annen spiller.', 'annen gjest ' + r.feil);
r = K.utfør({ type: 'formasjon', lag: 'l3', id: 'kile' }, gjest); sjekk(!r.ok && r.feil === K.TEKST.ikkeVårt, 'fiendens lag');
lag[0].eier = 'g1';
r = K.utfør({ type: 'formasjon', lag: 'l1', id: 'kile' }, gjest); sjekk(r.ok && lag[0].formasjon === 'kile', 'gjest med laget');
r = K.utfør({ type: 'bygg', bygg: { type: 'brakke' } }, gjest); sjekk(!r.ok && r.feil === K.TEKST.leir, 'leir avvist for gjest');
r = K.utfør({ type: 'alle' }, gjest); sjekk(!r.ok && r.feil === 'Bare verten kan endre alle lag.', 'vertAlene avvist for gjest');
// verten selv (spiller = vertens id, erVert) er ikke fjern
r = K.utfør({ type: 'bygg', bygg: { type: 'brakke' } }, { lag, spiller: 'v', erVert: true }); sjekk(r.ok, 'verten selv kan bygge');

// handlinger som svarer med { feil } (som Leir.bygg) regnes som avvist, med svaret med
K.registrer('nei', { utfør: () => ({ feil: 'Ikke plass her.', x: 1 }) });
r = K.utfør({ type: 'nei' }, ctx); sjekk(!r.ok && r.feil === 'Ikke plass her.' && r.svar.x === 1, 'svar med feil');
// tillatt: bare de felles sjekkene, uten å gjøre noe
const f2 = utført; sjekk(K.tillatt({ type: 'formasjon', lag: 'l1' }, gjest).s === lag[0] && utført === f2, 'tillatt gir laget');
sjekk(K.tillatt({ type: 'bygg' }, gjest).feil === K.TEKST.leir && K.def('bygg').leir === true, 'tillatt og def');
// beskriv og kanSendes
sjekk(K.beskriv({ type: 'formasjon', lag: 'l1', id: 'kile' }, ctx) === 'setter Lag 1 i kile', 'beskriv');
sjekk(K.beskriv({ type: 'bygg' }, ctx) === null, 'beskriv uten tekst');
sjekk(K.kanSendes({ type: 'ordre', lag: 'l1', x: 1, y: 2 }) && !K.kanSendes({ type: 'x', f: () => 1 }), 'kanSendes');

console.log(feil ? `${feil} FEIL` : 'kommandolaget: alt ok');
process.exit(feil ? 1 : 0);
