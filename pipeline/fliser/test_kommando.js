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


// ---------- del 2 (R17-4): leir, folk, tropper og kjøretøy (spill/kommandoer.js) med de ekte reglene ----------
K._tøm();
const LB = require('../../site/dovre-fliser/spill/leir.js'), FR = require('../../site/dovre-fliser/spill/folk.js'), TR = require('../../site/dovre-fliser/spill/tropper.js');
const KS = require('../../site/dovre-fliser/spill/kommandoer.js');
// én leir og én kasse per side – testen sjekker at kommandoene leser ctx.side (rød har sin egen, tomme leir)
const sider = { blå: { L: LB.ny(), F: FR.ny(), penger: 200e6, leir: { x: 0, y: 0 } }, rød: { L: LB.ny(), F: FR.ny(), penger: 0, leir: { x: 5000, y: 0 } } };
const LAG = [], KJ = [];
const kall = { opprett: 0, oppløs: 0, endre: 0, omBord: 0, gåAv: 0, kjør: [], stopp: 0 };
const M = { Leir: LB, FolkRegler: FR, Tropper: TR, Strid: { BEVÆPNING: { standard: { pris: 0 }, tung: { pris: 600000 } } },
  leir: sd => (sider[sd] ? sider[sd].L : null), penger: sd => sider[sd].penger,
  betal: sd => kr => (kr >= 0 && sider[sd].penger >= kr ? (sider[sd].penger -= kr, true) : false), gi: sd => kr => { sider[sd].penger += kr; },
  bonus: () => ({}), folk: sd => (sider[sd] ? sider[sd].F : null), folkValg: () => ({}), matFaktor: () => 1, leirPunkt: sd => (sider[sd] ? sider[sd].leir : null),
  lag: () => LAG, kjøretøy: () => KJ,
  tropp: { opprett: (sd, ider, navn, bev, kj, o) => { kall.opprett++; const F = sider[sd].F, P = F.personer.filter(p => ider.includes(p.id)), r = TR.opprett(P, navn);
      F.personer = F.personer.filter(p => !ider.includes(p.id)); const s = { ...r, side: sd, x: 10, y: 0, utstyr: o.utstyr && o.utstyr.length ? Object.fromEntries(o.utstyr.map(u => [u, true])) : undefined }; if (kj) s.ombord = kj; LAG.push(s); return { lag: s }; },
    oppløs: s => { kall.oppløs++; LAG.splice(LAG.indexOf(s), 1); return { hjem: s.menn.length }; }, endre: (s, v, u) => { kall.endre++; return { sum: 0 }; },
    gåOmBord: (s, kj) => { kall.omBord++; s.ombord = kj; return true; }, gåAv: s => { kall.gåAv++; s.ombord = null; }, bærer: kj => LAG.find(s => s.ombord === kj) || null },
  kjør: (kj, x, y) => { kall.kjør.push([kj.navn, x, y]); kj.sti = [[x, y]]; }, kjørStopp: kj => { kall.stopp++; kj.sti = null; } };
KS.registrer(K, M);
const C = { lag: LAG, kjøretøy: KJ, side: 'blå', spiller: null, erVert: true }, CR = { ...C, side: 'rød' };
const B = sider.blå, Lb = B.L;
const gyldig = (k, t, c = C) => { const r = K.utfør(k, c); sjekk(r.ok, `${t}: gyldig ${JSON.stringify(r).slice(0, 160)}`); return r; };
const avvist = (k, t, tekst, c = C) => { const r = K.utfør(k, c); sjekk(!r.ok && (!tekst || (tekst instanceof RegExp ? tekst.test(r.feil) : r.feil === tekst)), `${t}: avvist ${JSON.stringify(r).slice(0, 160)}`); return r; };
// alle typene finnes
const alle = ['bygg', 'byggPlan', 'plan', 'riv', 'flytt', 'oppgrader', 'reparer', 'prioriter', 'bryter', 'kjøpDiesel', 'kjøpMateriale', 'selgMateriale',
  'folk', 'folkFlytt', 'rekrutter', 'kjøpMat', 'troppOpprett', 'troppOppløs', 'troppUtstyr', 'omBord', 'gåAv', 'kjør', 'kjørStopp'];
sjekk(alle.every(t => K.finnes(t)), 'alle typene er registrert: ' + alle.filter(t => !K.finnes(t)));

// kjøpMateriale / selgMateriale: samme mengde, pris og tekst som Leir.kjøpMateriale
r = gyldig({ type: 'kjøpMateriale', materiale: 'tre', mengde: 10 }, 'kjøpMateriale'); sjekk(r.svar.mengde === 10 && Lb.lager.tre === 10, 'kjøpMateriale legger i lageret');
avvist({ type: 'kjøpMateriale', materiale: 'gull', mengde: 10 }, 'kjøpMateriale ukjent', 'Ukjent materiale.');
avvist({ type: 'kjøpMateriale', materiale: 'tre', mengde: -1 }, 'kjøpMateriale negativ', 'Ugyldig mengde.');
{ const L2 = JSON.parse(JSON.stringify(Lb)), fasit = LB.kjøpMateriale(L2, 'stål', 10, () => false); avvist({ type: 'kjøpMateriale', materiale: 'stål', mengde: 10 }, 'kjøpMateriale uten penger (rød har 0 kr og ingen plass)', /Ikke nok penger|Lageret er fullt/, CR);
  const før = B.penger; B.penger = 0; avvist({ type: 'kjøpMateriale', materiale: 'stål', mengde: 10 }, 'kjøpMateriale uten penger', fasit.feil); B.penger = før; }
r = gyldig({ type: 'selgMateriale', materiale: 'tre', mengde: 4 }, 'selgMateriale'); sjekk(Math.abs(Lb.lager.tre - 6) < 1e-9 && r.svar.pris > 0, 'selgMateriale tar fra lageret');
avvist({ type: 'selgMateriale', materiale: 'betong', mengde: 1 }, 'selgMateriale tomt', 'Ingen betong å selge.');
// fyll lageret for byggingen
for (const m of ['tre', 'betong', 'stål']) gyldig({ type: 'kjøpMateriale', materiale: m, mengde: 1000 }, 'fyll ' + m);

// bygg: plass, materialer og penger som Leir.bygg; rød får ikke bygge i blås leir (egen, tom leir uten penger)
r = gyldig({ type: 'bygg', bygg: { type: 'drivstofftank', x: 0, y: 0 } }, 'bygg'); const tank = r.svar.bygg; sjekk(Lb.bygg.length === 1 && tank.type === 'drivstofftank', 'bygg står i leiren');
avvist({ type: 'bygg', bygg: { type: 'slott', x: 50, y: 0 } }, 'bygg ukjent', 'Ukjent bygg.');
avvist({ type: 'bygg', bygg: { type: 'brakke', x: 'her' } }, 'bygg uten plass', 'Ugyldig plass.');
avvist({ type: 'bygg', bygg: { type: 'brakke', x: 0, y: 0 } }, 'bygg oppå et annet', /.+/);
avvist({ type: 'bygg', bygg: { type: 'brakke', x: 0, y: 0 } }, 'rød har ikke råd', /Ikke nok penger|Mangler materialer/, CR);
sjekk(sider.rød.L.bygg.length === 0, 'rød fikk ikke noe bygg');
{ const før = B.penger; B.penger = 10; avvist({ type: 'bygg', bygg: { type: 'kontrollrom', x: 200, y: 0 } }, 'bygg uten penger', `Ikke nok penger (${LB.kroner(LB.kostnad('kontrollrom', 0, {}).pris)}).`); B.penger = før; }
r = gyldig({ type: 'bygg', bygg: { type: 'sandsekkvoll', x: 60, y: 60 }, bs: { i: 1, j: 2, a: 'x', n: 0 } }, 'bygg med bs'); sjekk(r.svar.bygg.bs && r.svar.bygg.bs.a === 'x', 'bs settes på bygget');
avvist({ type: 'bygg', bygg: { type: 'sandsekkvoll', x: 90, y: 90 }, bs: 'feil' }, 'bygg med ugyldig bs', 'Ugyldig plass i byggesettet.');
// prioriter
const kr2 = gyldig({ type: 'bygg', bygg: { type: 'radiomast', x: -80, y: 0 } }, 'bygg radiomast').svar.bygg;
gyldig({ type: 'prioriter', bygg: kr2.id }, 'prioriter'); avvist({ type: 'prioriter', bygg: 999 }, 'prioriter ukjent', 'Fant ikke bygget.');
avvist({ type: 'prioriter', bygg: 'x' }, 'prioriter ugyldig', 'Ugyldig bygg.');
// bryter: bare bygg som bruker strøm
r = gyldig({ type: 'bryter', bygg: kr2.id }, 'bryter'); sjekk(r.svar.av === true && LB.finn(Lb, kr2.id).av === true, 'bryter slår av');
gyldig({ type: 'bryter', bygg: kr2.id, av: false }, 'bryter på'); sjekk(!LB.finn(Lb, kr2.id).av, 'bryter slår på');
avvist({ type: 'bryter', bygg: tank.id }, 'bryter på tank', 'Bygget bruker ikke strøm.');
// kjøpDiesel: tanken må være ferdig
avvist({ type: 'kjøpDiesel', liter: 500 }, 'kjøpDiesel uten tank', 'Ingen plass til mer diesel: bygg en dieseltank (eller et aggregat).');
tank.igjen = 0;
r = gyldig({ type: 'kjøpDiesel', liter: 500 }, 'kjøpDiesel'); sjekk(Lb.drivstoff === 500 && r.svar.liter === 500, 'diesel i tanken');
avvist({ type: 'kjøpDiesel', liter: 'mye' }, 'kjøpDiesel ugyldig', 'Ugyldig mengde.');
{ const før = B.penger; B.penger = 0; avvist({ type: 'kjøpDiesel', liter: 100 }, 'kjøpDiesel uten penger', `Ikke nok penger (${LB.kroner(100 * LB.DRIVSTOFF.prisPerLiter)}).`); B.penger = før; }
// oppgrader og reparer
r = gyldig({ type: 'oppgrader', bygg: tank.id }, 'oppgrader'); sjekk(tank.arbeid && tank.arbeid.hva === 'oppgrader', 'oppgraderingen er i gang');
avvist({ type: 'oppgrader', bygg: tank.id }, 'oppgrader opptatt', 'Bygget er ikke klart.');
avvist({ type: 'oppgrader', bygg: kr2.id }, 'oppgrader uferdig', 'Bygget er ikke klart.');
tank.arbeid = null; tank.hp = .5;
{ const før = B.penger; B.penger = 0; avvist({ type: 'reparer', bygg: tank.id }, 'reparer uten penger', /Ikke nok penger/); B.penger = før; }
gyldig({ type: 'reparer', bygg: tank.id }, 'reparer'); sjekk(tank.arbeid && tank.arbeid.hva === 'reparer', 'reparasjonen er i gang');
avvist({ type: 'reparer', bygg: tank.id }, 'reparer opptatt', 'Bygget er opptatt.');
// flytt
tank.arbeid = null; tank.hp = 1;
r = gyldig({ type: 'flytt', bygg: tank.id, til: { x: 300, y: 300, ret: 0 } }, 'flytt'); sjekk(tank.x === 300 && tank.arbeid.hva === 'flytt', 'bygget er flyttet');
avvist({ type: 'flytt', bygg: tank.id, til: { x: 0, y: 900 } }, 'flytt opptatt', 'Bygget er opptatt.');
avvist({ type: 'flytt', bygg: kr2.id, til: {} }, 'flytt uten plass', 'Ugyldig plass.');
// planen: legg, flytt, fjern, bygg fra planen
r = gyldig({ type: 'plan', handling: 'legg', bygg: { type: 'container', x: -300, y: -300 } }, 'plan legg'); const pid = r.svar.plan.pid;
gyldig({ type: 'plan', handling: 'flytt', pid, til: { x: -320, y: -300, ret: 0 } }, 'plan flytt'); sjekk(Lb.plan[0].x === -320, 'skissen er flyttet');
avvist({ type: 'plan', handling: 'flytt', pid: 77, til: { x: 1, y: 1 } }, 'plan flytt ukjent', 'Fant ikke skissen.');
avvist({ type: 'plan', handling: 'tegn' }, 'plan ukjent', 'Ukjent planendring.');
r = gyldig({ type: 'byggPlan', pids: [pid] }, 'byggPlan'); sjekk(r.svar.bygget.length === 1 && Lb.plan.length === 0, 'skissen er bygget');
avvist({ type: 'byggPlan', pids: [pid] }, 'byggPlan tom', 'Ingen skisser å bygge.');
const pid2 = gyldig({ type: 'plan', handling: 'legg', bygg: { type: 'container', x: -400, y: -400 } }, 'plan legg 2').svar.plan.pid;
gyldig({ type: 'plan', handling: 'fjern', pid: pid2 }, 'plan fjern'); avvist({ type: 'plan', handling: 'fjern', pid: pid2 }, 'plan fjern igjen', 'Fant ikke skissen.');
// riv: pengene tilbake til riktig kasse
{ const før = B.penger; r = gyldig({ type: 'riv', bygg: kr2.id }, 'riv'); sjekk(B.penger === før + r.svar.penger && !LB.finn(Lb, kr2.id), 'riv gir pengene tilbake'); }
avvist({ type: 'riv', bygg: kr2.id }, 'riv igjen', 'Fant ikke bygget.');
avvist({ type: 'riv', bygg: tank.id }, 'rød river ikke blås bygg', /Fant ikke bygget|Ingen leir/, CR);

// folk
const Fb = B.F, p0 = Fb.personer[0];
gyldig({ type: 'folk', person: p0.id, oppgave: 'vakt' }, 'folk'); sjekk(p0.oppgave === 'vakt', 'personen er flyttet');
avvist({ type: 'folk', person: p0.id, oppgave: 'dans' }, 'folk ukjent oppgave', 'Ukjent oppgave.');
avvist({ type: 'folk', person: 4242, oppgave: 'bygg' }, 'folk ukjent person', 'Fant ikke personen.');
r = gyldig({ type: 'folkFlytt', oppgave: 'kjøkken', retning: 'pluss' }, 'folkFlytt'); sjekk(r.svar && r.svar.oppgave === 'kjøkken', 'en er flyttet til kjøkkenet');
avvist({ type: 'folkFlytt', oppgave: 'kjøkken', retning: 'opp' }, 'folkFlytt retning', 'Ugyldig retning.');
// kjøp mat
{ const m0 = Fb.mat; gyldig({ type: 'kjøpMat', rasjoner: 50 }, 'kjøpMat'); sjekk(Fb.mat === m0 + 50, 'maten er kjøpt'); }
avvist({ type: 'kjøpMat', rasjoner: 1.5 }, 'kjøpMat ugyldig', 'Ugyldig mengde.');
{ const før = B.penger; B.penger = 0; avvist({ type: 'kjøpMat', rasjoner: 50 }, 'kjøpMat uten penger', FR.kjøpMat(JSON.parse(JSON.stringify(Fb)), 50, () => false).feil); B.penger = før; }
// rekrutter: samme regel og tekst som FolkRegler.rekrutter (ingen seng i leiren nå)
{ const fasit = FR.rekrutter(JSON.parse(JSON.stringify(Fb)), Lb, () => true); avvist({ type: 'rekrutter' }, 'rekrutter uten seng', fasit.feil); }
// (ti i gjengen og åtte senger i én brakke: valget til folk.js gir ekstra senger, slik visningen gjør for rom i byggesettet)
const brakke = gyldig({ type: 'bygg', bygg: { type: 'brakke', x: 0, y: 500 } }, 'bygg brakke').svar.bygg; brakke.igjen = 0; M.folkValg = () => ({ ekstraSenger: 20 });
{ const n = Fb.personer.length; r = gyldig({ type: 'rekrutter', bygg: true }, 'rekrutter'); sjekk(Fb.personer.length === n + 1 && r.svar.person.oppgave === 'bygg', 'den nye er med og går på bygg'); }
avvist({ type: 'rekrutter' }, 'rød rekrutterer uten leir og penger', /.+/, { ...CR, side: 'grønn' });

// tropper
const ider = Fb.personer.slice(0, 3).map(p => p.id);
avvist({ type: 'troppOpprett', personer: [ider[0]], navn: 'Én' }, 'troppOpprett for få', `En tropp trenger minst ${TR.R.min} personer.`);
avvist({ type: 'troppOpprett', personer: [ider[0], 99999], navn: 'X' }, 'troppOpprett ukjent person', 'Fant ikke alle personene.');
avvist({ type: 'troppOpprett', personer: ider, navn: 'X', våpen: { [ider[0]]: 'laser' } }, 'troppOpprett ukjent våpen', 'Ukjent våpen.');
{ const før = B.penger; B.penger = 0; avvist({ type: 'troppOpprett', personer: ider, navn: 'X', bev: 'tung' }, 'troppOpprett uten penger', /Ikke råd til våpnene og utstyret/); B.penger = før; }
KJ.push({ navn: 'Bil 1', type: 'speiderbil', antall: 1, side: 'blå', x: 12, y: 0 }, { navn: 'Fiendebil', type: 'lastebil', antall: 1, side: 'rød', x: 40, y: 0 });
avvist({ type: 'troppOpprett', personer: Fb.personer.slice(0, 5).map(p => p.id), navn: 'Stor', kjøretøy: 'Bil 1' }, 'troppOpprett for liten bil', 'Det er bare plass til 4 i Bil 1.');
avvist({ type: 'troppOpprett', personer: ider, navn: 'X', kjøretøy: 'Fiendebil' }, 'troppOpprett fiendens bil', 'Det er ikke vårt kjøretøy.');
r = gyldig({ type: 'troppOpprett', personer: ider, navn: '1. tropp', bev: 'standard' }, 'troppOpprett'); const tropp = r.svar.lag; K.nid(tropp, LAG);
sjekk(kall.opprett === 1 && tropp.side === 'blå' && !Fb.personer.some(p => ider.includes(p.id)), 'troppen er satt opp for blå');
// om bord / gå av (bilen innen 60 m)
avvist({ type: 'omBord', lag: tropp.nid, kjøretøy: 'Fiendebil' }, 'omBord fiendens bil', 'Det er ikke vårt kjøretøy.');
K.nid(KJ[0], KJ); gyldig({ type: 'omBord', lag: tropp.nid, kjøretøy: KJ[0].nid }, 'omBord (nid)'); sjekk(tropp.ombord === KJ[0], 'troppen er om bord');
avvist({ type: 'omBord', lag: tropp.nid, kjøretøy: 'Bil 1' }, 'omBord igjen', '1. tropp sitter alt i Bil 1.');
gyldig({ type: 'gåAv', lag: tropp.nid }, 'gåAv'); sjekk(!tropp.ombord, 'troppen har gått av'); avvist({ type: 'gåAv', lag: tropp.nid }, 'gåAv igjen', '1. tropp sitter ikke i et kjøretøy.');
// utstyr: ved leiren, kjente våpen, penger
gyldig({ type: 'troppUtstyr', lag: tropp.nid, våpen: { 0: 'hagle' }, utstyr: [] }, 'troppUtstyr'); sjekk(kall.endre === 1, 'utstyret er byttet');
avvist({ type: 'troppUtstyr', lag: tropp.nid, våpen: { 0: 'laser' }, utstyr: [] }, 'troppUtstyr ukjent våpen', 'Ukjent våpen.');
avvist({ type: 'troppUtstyr', lag: tropp.nid, våpen: {}, utstyr: ['jetpack'] }, 'troppUtstyr ukjent utstyr', 'Ukjent utstyr.');
{ const før = B.penger; B.penger = 0; avvist({ type: 'troppUtstyr', lag: tropp.nid, våpen: { 0: 'maskingevær' }, utstyr: [] }, 'troppUtstyr uten penger', /Ikke råd/); B.penger = før; }
avvist({ type: 'troppUtstyr', lag: tropp.nid, våpen: {}, utstyr: [] }, 'troppUtstyr for rød', 'Det er ikke vårt lag.', CR);
tropp.x = 2000; avvist({ type: 'troppOppløs', lag: tropp.nid }, 'troppOppløs langt ute', `1. tropp må stå innen ${TR.R.nær} m fra leiren for å oppløses.`);
avvist({ type: 'troppUtstyr', lag: tropp.nid, våpen: {}, utstyr: [] }, 'troppUtstyr langt ute', `1. tropp må stå innen ${TR.R.nær} m fra leiren for å bytte våpen og utstyr.`);
tropp.x = 10; gyldig({ type: 'troppOppløs', lag: tropp.nid }, 'troppOppløs'); sjekk(kall.oppløs === 1 && !LAG.includes(tropp), 'troppen er oppløst');

// kjøretøy: nid eller navn, bare egne
gyldig({ type: 'kjør', kjøretøy: 'Bil 1', x: 500, y: 600 }, 'kjør'); sjekk(kall.kjør.length === 1 && kall.kjør[0][1] === 500, 'kjøretøyet har fått mål');
avvist({ type: 'kjør', kjøretøy: 'Fiendebil', x: 1, y: 1 }, 'kjør fiendens', 'Det er ikke vårt kjøretøy.');
avvist({ type: 'kjør', kjøretøy: 'Bil 9', x: 1, y: 1 }, 'kjør ukjent', 'Fant ikke kjøretøyet.');
avvist({ type: 'kjør', kjøretøy: 'Bil 1', x: 'nord' }, 'kjør ugyldig mål', 'Ugyldig mål.');
gyldig({ type: 'kjør', kjøretøy: 'Fiendebil', x: 1, y: 1 }, 'rød kjører sin egen', CR);
gyldig({ type: 'kjørStopp', kjøretøy: KJ[0].nid }, 'kjørStopp'); sjekk(kall.stopp === 1 && !KJ[0].sti, 'kjøretøyet står');
avvist({ type: 'kjørStopp', kjøretøy: 'Fiendebil' }, 'kjørStopp fiendens', 'Det er ikke vårt kjøretøy.');
// gjest: leirkommandoer avvist, kjøretøy bare når han eier det
const G = { lag: LAG, kjøretøy: KJ, side: 'blå', spiller: 'g1', erVert: false };
avvist({ type: 'kjøpMateriale', materiale: 'tre', mengde: 1 }, 'gjest kjøper ikke', K.TEKST.leir, G);
avvist({ type: 'kjør', kjøretøy: 'Bil 1', x: 1, y: 1 }, 'gjest uten bilen', 'Bil 1 styres av verten.', G);
KJ[0].eier = 'g1'; gyldig({ type: 'kjør', kjøretøy: 'Bil 1', x: 1, y: 1 }, 'gjest med bilen', G); delete KJ[0].eier;
// alle kommandoene kan sendes som JSON
sjekk([{ type: 'bygg', bygg: { type: 'brakke', x: 1, y: 2 }, kart: {} }, { type: 'troppOpprett', personer: [1, 2], navn: 'A', bev: 'standard', kjøretøy: 'l3', våpen: { 1: 'hagle' }, utstyr: ['kikkert'] },
  { type: 'kjør', kjøretøy: 'l4', x: 1, y: 2 }].every(k => K.kanSendes(k)), 'kommandoene kan sendes');

gyldig({ type: 'plan', handling: 'legg', bygg: { type: 'container', x: -500, y: -500 } }, 'plan legg 3'); gyldig({ type: 'plan', handling: 'tøm' }, 'plan tøm'); sjekk(Lb.plan.length === 0, 'planen er tømt');

// ---------- KONTROLL: knapper som endrer spilltilstand uten å gå gjennom KOMMANDO (enkel tekstsøk-regel) ----------
// Søker i visningsfilene for leir, byggesett, strøm, folk, tropper og kjøretøy etter direkte kall til regelfunksjonene som endrer
// leiren, folket, troppene, kjøretøyene eller kassa, og etter direkte endring av planen. Alt som treffer, må gå via KOMMANDO – eller stå i
// UNNTAK med en forklaring (hvor = en bit av linja). Et unntak som ikke treffer noe lenger, er også en feil (lista skal være riktig).
const fs = require('fs'), path = require('path'), SPILL = path.join(__dirname, '../../site/dovre-fliser/spill');
const FILER = ['leir-visning.js', 'byggesett-visning.js', 'strom-visning.js', 'folk-visning.js', 'tropper-visning.js', 'kjoretoy-visning.js'];
const FORBUDT = /\b(?:LB|Leir)\.(?:bygg|riv|flytt|oppgrader|reparer|prioriter|bryter|kjøpMateriale|kjøpDrivstoff|selgMateriale|byggPlan|planLegg|planFlytt|planFjern|planMal|leggInn|skad|skade)\(|\b(?:FR|FolkRegler)\.(?:sett|pluss|minus|rekrutter|kjøpMat|fjern)\(|\bKjoretoy\.stopp\(|\bkjørTil\(|\bOppstartSpill\.(?:betal|gi)\(|\b(?:TR|Tropper)\.(?:opprett|oppløs|utrust)\(|\bL\.(?:plan|nestePlan|midt|lager|drivstoff|bygg)\s*=(?!=)|\bF\.(?:personer|mat|moral)\s*=(?!=)|\bF\.personer\.(?:push|splice)\(/g;
const UNNTAK = [
  ['leir-visning.js', 'LB.skad(L, b.id, .08 * dt / 60)', 'fiender som står i leiren skader byggene i simuleringen (KROKER.sim), ikke en knapp'],
  ['leir-visning.js', 'LB.planMal(L, p.mal', 'malene ligger i nettleseren (localStorage) og gir bare gratis skisser; blir en egen kommando når maler kan deles'],
  ['leir-visning.js', 'L.plan = o.plan; L.nestePlan = o.nestePlan', 'angre/gjør om i planen: et øyeblikksbilde av de gratis skissene i denne nettleseren'],
  ['leir-visning.js', 'L.midt = { x: S.leir.x', 'oppstart: leirens midte settes fra OppstartSpill når spillet starter (ikke en knapp)'],
  ['folk-visning.js', 'FR.fjern(F, FR.personId(m))', 'de som faller, går ut av folket i simuleringen (ikke en knapp)'],
  ['tropper-visning.js', 'r = TR.opprett(P, navnet)', 'inne i opprettRett – den rette funksjonen kommandoen troppOpprett kaller (TropperSpill.rett.opprett)'],
  ['tropper-visning.js', 'OppstartSpill.betal(alt)', 'betalingen inne i opprettRett (kommandoen har sjekket at det er råd)'],
  ['tropper-visning.js', 'if (egen) TR.utrust(s,', 'våpnene settes inne i opprettRett'],
  ['tropper-visning.js', 'F.personer = F.personer.filter(p => !ider.includes(p.id))', 'personene går ut av folket inne i opprettRett'],
  ['tropper-visning.js', 'const hjem = TR.oppløs(s,', 'inne i oppløsRett (kommandoen troppOppløs, og hjemSteg når en tropp som er sendt hjem kommer fram)'],
  ['tropper-visning.js', 'OppstartSpill.betal(sum))) return { feil: `Ikke råd', 'betalingen inne i brukEndringRett – den rette funksjonen kommandoen troppUtstyr kaller'],
  ['tropper-visning.js', 'F.personer.push(p); } const i = ENHETER', 'de som lever, kommer tilbake i folket inne i oppløsRett'],
  ['tropper-visning.js', "const prøve = TR.opprett(VP, 'x')", 'bare et regnestykke for panelet (ildkraften til en prøvetropp) – endrer ingenting'],
  ['kjoretoy-visning.js', 'async function kjørTil(', 'definisjonen av kjørTil, som kommandoen kjør kaller'],
  ['kjoretoy-visning.js', 'stoppRett: k => { Kjoretoy.stopp(k)', 'den rette funksjonen kommandoen kjørStopp kaller'],
];
const brukt = new Set(), treff = [];
for (const fil of FILER) {
  const linjer = fs.readFileSync(path.join(SPILL, fil), 'utf8').split('\n');
  linjer.forEach((l, i) => { for (const m of l.matchAll(FORBUDT)) {
    const u = UNNTAK.findIndex(([f, hvor]) => f === fil && l.includes(hvor) && Math.abs(l.indexOf(hvor) - m.index) < hvor.length + 40);
    if (u >= 0) brukt.add(u); else treff.push(`${fil}:${i + 1}: ${m[0]}  …${l.slice(Math.max(0, m.index - 40), m.index + 60).trim()}…`); } });
}
sjekk(!treff.length, 'kontroll: alt som endrer spilltilstanden i knappene går gjennom KOMMANDO\n  ' + treff.join('\n  '));
const ubrukt = UNNTAK.filter((u, i) => !brukt.has(i)); sjekk(!ubrukt.length, 'kontroll: unntak som ikke treffer noe lenger: ' + ubrukt.map(u => u[0] + ' «' + u[1] + '»').join(', '));
// og kontrollen virker: en linje med et direkte kall blir funnet
sjekk([...'knapp(() => LB.riv(L, b.id))'.matchAll(FORBUDT)].length === 1 && [...'KOMMANDO({ type: \'riv\' })'.matchAll(FORBUDT)].length === 0, 'kontroll: regelen finner direkte kall');

console.log(feil ? `${feil} FEIL` : 'kommandolaget: alt ok');
process.exit(feil ? 1 : 0);
