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
const vl = F.lesVertLenke('https://riksbrudd.vercel.app/norge#vert=wss%3A%2F%2Fa-b.trycloudflare.com');
sjekk(vl && vl.adresse === 'wss://a-b.trycloudflare.com' && F.lesVertLenke('#spill=x&kode=ABCDEF') === null, 'vertslenke');
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
sjekk(k({ type: 'pos', x: 1, y: 2, går: 1 }, 'gx').type === 'pos' && !k({ type: 'pos', x: 'a', y: 2 }, 'gx').ok, 'pos');
sjekk(F.bilde({ lag: [], tid: 0, tempo: 1, ser: () => true, spillere: [{ id: 'a', navn: 'Ola', x: 1.4, y: 2, går: true }, { id: 'b', navn: 'x', x: NaN, y: 0 }] }).sp.length === 1, 'spillernes steder i bildet');
const bb = F.bilde({ lag: [], tid: 0, tempo: 1, ser: () => true, bygg: [{ type: 'brakke', x: 10, y: 20, ret: Math.PI / 2, igjen: 0 }, { type: 'gjerde', x: 0, y: 0, punkter: [[0, 0], [10.4, 0]], igjen: 30 }] });
sjekk(bb.bygg.length === 2 && bb.bygg[0].f === 1 && bb.bygg[1].f === 0 && bb.bygg[1].p[1][0] === 10, 'leirbygg i bildet');
const hj = F.hjørner({ x: 10, y: 20, r: Math.PI / 2 }, [-1, 2, -3, 3]);
sjekk(Math.abs(hj[0][0] - 13) < 1e-9 && Math.abs(hj[0][1] - 19) < 1e-9 && Math.abs(hj[1][1] - 22) < 1e-9, 'hjørnene dreies');
// eier og tid
const g = [{ id: 'a' }, { id: 'b' }];
sjekk(F.nesteEier(null, g) === 'a' && F.nesteEier('a', g) === 'b' && F.nesteEier('b', g) === null && F.nesteEier('borte', g) === null, 'nesteEier');
sjekk(F.framTid(60) === 0 && F.framTid(3600) === 60 && F.framTid(1e9) === 7 * 24 * 60, 'framTid');
// R18-D: gjester i vertens leir – tillatelsen, leirbildet og loggtekstene
sjekk(F.rensTillat('tull') === 'alt' && F.rensTillat('se') === 'se' && F.TILLAT_STANDARD === 'alt', 'tillatelsen renses (standard «alt»)');
sjekk(/bare se/.test(F.leirLov('se', 'bygg')) && F.leirLov('bygg', 'bygg') === null && F.leirLov('bygg', 'folk') === null, 'bare se avviser, bygge og folk slipper bygg og folk');
sjekk(/rive/.test(F.leirLov('bygg', 'riv')) && /tropper/.test(F.leirLov('bygg', 'troppOpprett')) && F.leirLov('alt', 'riv') === null && F.leirLov('alt', 'troppOpprett') === null, 'riving og tropper bare med «alt»');
const pl = F.pakkLeir({ L: '{"versjon":2,"bygg":[]}', ver: 3, penger: 1234.6, tillat: 'x', leir: { x: 1.26, y: 2 }, navn: 'Olas vakt', kvitt: { g1: 4 } });
sjekk(pl.ver === 3 && pl.penger === 1235 && pl.tillat === 'alt' && pl.leir.x === 1.3 && pl.kvitt.g1 === 4 && F.pakkLeir({}) === null, 'pakkLeir');
sjekk(F.brukLeirNå(pl, 'g1', 4, 0, 1e9) && !F.brukLeirNå(pl, 'g1', 5, 1000, 2000) && F.brukLeirNå(pl, 'g1', 5, 1000, 1000 + F.REGLER_LEIR.ventMaks + 1) && F.brukLeirNå(pl, 'g2', 0, 0, 0) && !F.brukLeirNå({ v: 0 }, 'g1', 0, 0, 0), 'brukLeirNå venter på kvitteringen, men ikke for alltid');
sjekk(F.leirTekst({ type: 'bygg' }, { bygg: 'Brakke', ny: true }) === 'bygger en brakke' && F.leirTekst({ type: 'folk', oppgave: 'vakt' }, { person: 'Kari Nilsen', oppgave: '«vakt»' }) === 'setter Kari Nilsen på «vakt»'
  && F.leirTekst({ type: 'riv' }, { bygg: 'Brakke' }) === 'river brakke' && F.leirTekst({ type: 'ukjent' }) === null, 'leirTekst');
sjekk(F.BARE_HOS_VERTEN.includes('troppOpprett') && !F.BARE_HOS_VERTEN.includes('bygg'), 'tropper kjøres bare hos verten');
if (feil) { console.log(feil + ' feil'); process.exit(1); } console.log('ok');
