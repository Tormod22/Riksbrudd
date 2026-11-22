// Test av reglene for flerspilleren (site/dovre-fliser/spill/flerspiller.js). Kjør: node pipeline/fliser/test_flerspiller.js
const F = require('../../site/dovre-fliser/spill/flerspiller.js');
let feil = 0; const sjekk = (ok, t) => { if (!ok) { feil++; console.log('FEIL: ' + t); } };
// lenke
const ln = F.lagLenke('https://riksbrudd.vercel.app/norge#gammel', 'wss://abc-def.trycloudflare.com', 'K7P2QX');
sjekk(ln === 'https://riksbrudd.vercel.app/norge#spill=wss%3A%2F%2Fabc-def.trycloudflare.com&kode=K7P2QX', 'lagLenke ' + ln);
const l = F.lesLenke(ln); sjekk(l && l.adresse === 'wss://abc-def.trycloudflare.com' && l.kode === 'K7P2QX', 'lesLenke');
sjekk(F.lesLenke('https://x/#spill=wss://a.b&kode=k7p2qx').kode === 'K7P2QX', 'kode med små bokstaver');
sjekk(F.lesLenke('https://x/#venn=abc') === null, 'annen lenke gir null');
sjekk(F.lesLenke('#spill=wss://a.b&kode=ABC') === null, 'for kort kode');
sjekk(F.rensAdresse('https://abc.trycloudflare.com/') === 'wss://abc.trycloudflare.com', 'https -> wss');
sjekk(F.rensAdresse('192.168.1.20') === 'ws://192.168.1.20:8787', 'ip -> ws med port');
sjekk(F.rensAdresse('') === null, 'tom adresse');
sjekk(F.statusAdresse('ws://localhost:8787') === 'http://localhost:8787/status', 'statusadresse');
sjekk(F.kanKoble('https:', 'ws://localhost:8787') && F.kanKoble('https:', 'wss://a.b') && !F.kanKoble('https:', 'ws://192.168.1.20:8787') && F.kanKoble('http:', 'ws://192.168.1.20:8787'), 'kanKoble');
sjekk(F.rensNavn('<b>Ola</b>') === 'bOla/b' && F.rensNavn('') === 'Spiller' && F.rensNavn('x'.repeat(40)).length === 24, 'rensNavn');
// bildet og bruken av det
const mann = () => ({ navn: 'Per Dahl', rolle: 'rifle', hp: 1 });
const sti = []; for (let i = 0; i < 1000; i++) sti.push([i * 3.3, 7]);
const lag = [
  { nid: 'l1', navn: '1. lag', side: 'blå', x: 100.04, y: 200, retning: 1, leder: 0, menn: [mann(), mann()], sti, seg: 400, eier: 'g1' },
  { nid: 'l2', navn: 'Fiende synlig', side: 'rød', x: 5, y: 5, menn: [mann()] },
  { nid: 'l3', navn: 'Fiende skjult', side: 'rød', x: 9, y: 9, menn: [mann()] },
];
const b = F.bilde({ lag, kj: [{ navn: 'Lastebil', type: 'lastebil', side: 'blå', antall: 2, x: 1, y: 2, retning: 0 }, { navn: 'Fiendebil', type: 'lastebil', side: 'rød', antall: 1, x: 0, y: 0 }],
  tid: 123.4567, tempo: 10, ser: e => e.navn !== 'Fiende skjult' && e.navn !== 'Fiendebil', leir: { x: 1, y: 2, navn: 'Leir' } });
sjekk(b.lag.length === 2 && !b.lag.some(q => q.navn === 'Fiende skjult'), 'tåka: skjult fiende sendes ikke');
sjekk(b.kj.length === 1, 'tåka: skjult kjøretøy sendes ikke');
sjekk(b.lag[0].sti.length <= F.tynnSti({ sti, seg: 400 }).length && b.lag[0].sti.length <= 301 && b.lag[0].sti[0][0] === Math.round(400 * 3.3) && b.lag[0].sti[b.lag[0].sti.length - 1][0] === Math.round(999 * 3.3), 'ruta tynnes og slutter i målet');
sjekk(JSON.stringify(b).length < 12000, 'bildet er lite: ' + JSON.stringify(b).length);
const hos = [{ nid: 'l1', navn: 'gammelt', x: 0, y: 0, menn: [] }, { nid: 'lX', navn: 'borte', x: 0, y: 0, menn: [] }], før = hos[0];
const r = F.brukBilde(JSON.parse(JSON.stringify(b)), hos, q => ({ navn: q.navn, x: q.x, y: q.y, menn: [] }));
sjekk(r.ok && hos.length === 2, 'brukBilde: lista byttes');
sjekk(hos[0] === før && hos[0].navn === '1. lag' && hos[0].eier === 'g1' && hos[0].menn.length === 2 && hos[0].siktSkitten, 'brukBilde: samme objekt oppdateres');
sjekk(hos[1].nid === 'l2' && hos[1].side === 'rød', 'brukBilde: nytt lag');
sjekk(!F.brukBilde({ v: 99, lag: [] }, hos, () => ({})).ok && hos.length === 2, 'feil versjon røres ikke');
// kommandoer
const k = (o, fra) => F.sjekkKommando(o, fra, lag);
sjekk(k({ type: 'ordre', lag: 'l1', x: 1, y: 2 }, 'g1').ok, 'eier kan gi ordre');
sjekk(!k({ type: 'ordre', lag: 'l1', x: 1, y: 2 }, 'g2').ok, 'annen gjest kan ikke');
sjekk(!k({ type: 'ordre', lag: 'l2', x: 1, y: 2 }, 'g1').ok, 'ikke fiendens lag');
sjekk(!k({ type: 'ordre', lag: 'l1', x: 'a', y: 2 }, 'g1').ok && !k({ type: 'sprenge' }, 'g1').ok && !k(null, 'g1').ok, 'ugyldige kommandoer');
sjekk(k({ type: 'stopp', lag: 'l1' }, 'g1').type === 'stopp' && !k({ type: 'stopp', lag: 'l1' }, 'g2').ok, 'stopp bare for eieren');
// eier og tid
const g = [{ id: 'a' }, { id: 'b' }];
sjekk(F.nesteEier(null, g) === 'a' && F.nesteEier('a', g) === 'b' && F.nesteEier('b', g) === null && F.nesteEier('borte', g) === null, 'nesteEier');
sjekk(F.framTid(60) === 0 && F.framTid(3600) === 60 && F.framTid(1e9) === 7 * 24 * 60, 'framTid');
if (feil) { console.log(feil + ' feil'); process.exit(1); } console.log('ok');
