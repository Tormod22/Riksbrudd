// Test av spill/ledere.js (G5, formenn og ledere) og ferdigheten «ledelse» i folk.js. Kjør: node pipeline/fliser/test_ledere.js
'use strict';
const path = require('path');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const LR = require(SP + '/ledere.js'), FR = require(SP + '/folk.js'), K = require(SP + '/kommando.js');
let feil = 0;
const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const fast = v => () => v;

// ---------- ferdigheten «ledelse» ----------
{
  const G = FR.ny(1987), L = G.personer.map(p => FR.ledelse(p));
  ok(L.every(v => v >= .7 && v <= 1.45), `ledelse 0,7–1,45 for startgjengen (${L.join(', ')})`);
  ok(G.personer.every(p => FR.ledelse(p) === FR.ledelse({ ...p })), 'ledelse er fast per person (samme tall hver gang)');
  ok(G.personer.every(p => !('ledelse' in p.ferd)), 'ledelse står ikke i p.ferd (lønnskrav og «best på» er som før)');
  ok(FR.ledelse({ navn: 'X', ledelse: 1.4 }) === 1.4 && FR.ledelse({ navn: 'X', ledelse: 3 }) === 1.45, 'p.ledelse brukes når den er satt (tak 1,45)');
  const mange = []; for (let i = 0; i < 400; i++) mange.push(FR.ledelse({ navn: 'Person ' + i, yrke: 'student' }));
  const snitt = mange.reduce((a, b) => a + b, 0) / mange.length, høye = mange.filter(v => v >= 1.3).length / mange.length;
  ok(snitt > .85 && snitt < 1.05 && høye > .05 && høye < .25, `fordelingen: snitt ${snitt.toFixed(2)}, ${Math.round(høye * 100)} % over 1,3`);
  const G2 = FR.ny(1987); ok(JSON.stringify(G2.personer.map(p => p.ferd)) === JSON.stringify(FR.ny(1987).personer.map(p => p.ferd)), 'nye gjenger er like som før (ingen ny tilfeldig trekning)');
}

// ---------- lønn og utnevnelse ----------
{
  ok(LR.lønnFaktor(.7) === 1.5 && LR.lønnFaktor(1.45) === 2, 'lønna som leder: 1,5 × (ledelse 0,7) til 2 × (1,45)');
  const S = LR.ny(), p = { id: 3, navn: 'Kari Haugen', yrke: 'lærer' }, q = { id: 4, navn: 'Per Lien', lønn: 18000 };
  const r = LR.utnevn(S, 'leirsjef', null, p, 0);
  ok(r.nøkkel === 'leirsjef' && p.lønn === LR.lederLønn(15000, FR.ledelse(p)) && p.lønn >= 22500 && p.lønn <= 30000, `leirsjef utnevnt, lønn ${p.lønn}`);
  ok(LR.utnevn(S, 'kasserer', null, p, 0).feil, 'samme person kan ikke ha to roller');
  LR.utnevn(S, 'kasserer', null, q, 0); ok(q.lønn >= 27000 && S.ledere.kasserer.lønnFør === 18000, 'egen lønn (18 000) ganges også');
  LR.av(S, 'kasserer', q, 0); ok(q.lønn === 18000 && !S.ledere.kasserer, 'av rollen: lønna tilbake');
  LR.av(S, 'leirsjef', p, 0); ok(!('lønn' in p), 'uten egen lønn før: lønna fjernes (standard igjen)');
  ok(LR.utnevn(S, 'formann', null, p).feil && LR.utnevn(S, 'formann', '12', p).nøkkel === 'formann:12', 'formann trenger en maskin');
  const S2 = LR.fraJSON(JSON.parse(JSON.stringify(S))); ok(S2.ledere['formann:12'] && S2.ledere['formann:12'].regler.folk === 'vakt', 'lagring og lesing');
  ok(LR.fraJSON({ ledere: { tull: { person: 1 }, 'leirsjef:3': { person: 1 } } }).ledere && !Object.keys(LR.fraJSON({ ledere: { tull: { person: 1 } } }).ledere).length, 'ukjente nøkler forkastes');
  ok(LR.settRegel(S, 'formann:12', 'folk', 'fri').ok && S.ledere['formann:12'].regler.folk === 'fri' && LR.settRegel(S, 'formann:12', 'folk', 'tull').feil, 'regel endres bare til gyldige valg');
}

// ---------- dyktighet: feil ----------
ok(LR.feilSjanse(1.2) === 0 && LR.feilSjanse(1.45) === 0 && Math.abs(LR.feilSjanse(.7) - .3) < 1e-9, 'dårlige valg: 30 % ved 0,7, ingen fra 1,2');

// ---------- leirsjefen ----------
{
  const R = { mat: 2, diesel: 1, bygg: 'plan', senger: 'ja' };
  const v = LR.matValg({ mat: 10, forbruk: 10 }, R, 1.3, fast(.9));
  ok(v && v.rasjoner === 20 && Math.abs(v.dagerFør - 1) < 1e-9, `mat: rakk 1 døgn av 2 -> kjøper 20 rasjoner (3 døgn) (${v && v.rasjoner})`);
  ok(!LR.matValg({ mat: 25, forbruk: 10 }, R, 1.3, fast(.9)), 'mat: 2,5 døgn -> kjøper ikke');
  const t2 = LR.byTilbud({ folk: 3000, kan: 'beskyttelse', grunnpris: 75000 }, { by: 20 }, 1.45); ok(JSON.stringify(t2.bud) === '[98000,75000,60000]', `forhandleren går ned: ${t2.bud}`);
  ok(!LR.matValg({ mat: 15, forbruk: 10 }, R, .7, fast(.9)) && LR.matValg({ mat: 15, forbruk: 10 }, R, 1.0, fast(.9)), 'lite dyktig leirsjef venter lenger (1,5 døgn: dyktig kjøper, lite dyktig ikke)');
  ok(LR.matValg({ mat: 10, forbruk: 10 }, R, .7, fast(.01)).rasjoner < 20, 'et dårlig valg kjøper for lite');
  ok(!LR.matValg({ mat: 0, forbruk: 10 }, { ...R, mat: 0 }, 1.3, fast(.9)) && !LR.matValg({ mat: 0, forbruk: -2 }, R, 1.3, fast(.9)), 'mat av / drivhusene dekker: ingenting');
  const d = LR.dieselValg({ liter: 100, perDøgn: 200, plass: 5000 }, R, 1.3, fast(.9)); ok(d && d.liter === 300, `diesel: 0,5 døgn av 1 -> ${d && d.liter} liter`);
  ok(LR.dieselValg({ liter: 100, perDøgn: 200, plass: 120 }, R, 1.3, fast(.9)).liter === 100, 'diesel: høyst det tanken har plass til');
  const plan = [{ pid: 1, type: 'drivhus', pris: 2e6 }, { pid: 2, type: 'brakke', pris: 1e6 }, { pid: 3, type: 'vakttårn', pris: 4e6 }];
  ok(LR.byggValg({ plan, kø: 0, utenSeng: 0 }, R, 1.3, fast(.9)).pid === 1, 'bygg: planen i rekkefølge');
  ok(LR.byggValg({ plan, kø: 0, utenSeng: 2 }, R, 1.3, fast(.9)).pid === 2, 'bygg: brakka først når noen sover i telt');
  ok(!LR.byggValg({ plan, kø: 1, utenSeng: 0 }, R, 1.3, fast(.9)), 'bygg: venter til køen er tom');
  ok(!LR.byggValg({ plan, kø: 0 }, { ...R, bygg: 'av' }, 1.3, fast(.9)), 'bygg av: ingenting');
  ok(LR.byggValg({ plan, kø: 0, utenSeng: 2 }, R, .7, fast(.01)).pid === 3, 'et dårlig valg: det dyreste først');
}

// ---------- formannen ----------
{
  const folk = [{ id: 1, oppgave: 'vakt', arbeidsfør: true, maskin: 1.4, prio: 1 }, { id: 2, oppgave: 'bygg', arbeidsfør: true, maskin: .8, prio: 2 },
    { id: 3, oppgave: 'hogst', arbeidsfør: true, maskin: 1.1, prio: 3 }, { id: 4, oppgave: 'fri', arbeidsfør: true, maskin: .9, prio: 3 }, { id: 5, oppgave: 'fri', arbeidsfør: false, maskin: 1.4 }];
  const st = { grunn: 'folk' };
  ok(LR.formannValg(st, folk, { folk: 'vakt' }, 1.3, fast(.9)).person === 4, 'formann: den med fri først (ikke den syke)');
  ok(LR.formannValg(st, folk.filter(p => p.oppgave !== 'fri'), { folk: 'vakt' }, 1.3, fast(.9)).person === 3, 'formann: så fra jobben med lavest prioritet');
  ok(!LR.formannValg(st, [folk[0]], { folk: 'vakt' }, 1.3, fast(.9)), '«vakta først»: aldri fra vakt');
  ok(LR.formannValg(st, [folk[0]], { folk: 'alltid' }, 1.3, fast(.9)).person === 1, '«for enhver pris»: også fra vakt');
  ok(!LR.formannValg(st, folk.slice(0, 3), { folk: 'fri' }, 1.3, fast(.9)), '«bare folk som har fri»');
  ok(!LR.formannValg({ grunn: 'tom' }, folk, { folk: 'vakt' }, 1.3, fast(.9)) && !LR.formannValg(null, folk, { folk: 'vakt' }, 1.3, fast(.9)), 'bare når maskinen venter på folk');
  ok(LR.formannValg(st, folk.filter(p => p.oppgave !== 'fri'), { folk: 'vakt' }, .7, fast(.01)).person === 2, 'et dårlig valg: den som er dårligst ved maskinen');
}

// ---------- forhandleren ----------
{
  const t = LR.byTilbud({ folk: 3000, kan: 'beskyttelse', grunnpris: 75000 }, { by: 20, trinn: 'beskyttelse' }, 1.45);
  ok(t && t.min === 60000 && t.pris === 98000 && t.varighet === 14, `by: åpningsbud ${t && t.pris} (grense 60 000)`);
  ok(LR.byTilbud({ folk: 3000, kan: 'beskyttelse', grunnpris: 30000 }, { by: 20 }, .7).pris === 60000, 'by: aldri under grensen');
  ok(!LR.byTilbud({ folk: 3000, kan: 'handel', grunnpris: 1 }, { by: 20, trinn: 'beskyttelse' }, 1) && LR.byTilbud({ folk: 3000, kan: 'handel', grunnpris: 1 }, { by: 20, trinn: 'begge' }, 1), 'by: handel bare med «beskyttelse og handel»');
  ok(!LR.byTilbud({ folk: 3000, kan: 'beskyttelse' }, { by: 0 }, 1), 'by: regelen av');
  ok(LR.svarMotbud(65000, 60000, 1.3, fast(.9)).ja && !LR.svarMotbud(55000, 60000, 1.3, fast(.9)).ja, 'motbud: ja over grensen, nei under');
  ok(LR.svarMotbud(50000, 60000, .7, fast(.01)).ja, 'et dårlig valg: ja litt under grensen');
  ok(JSON.stringify(LR.firmaTyper({ firma: 'fastVern' })) === '["fast","vern"]' && !LR.firmaTyper({ firma: 'nei' }).length, 'firma: typene regelen sier ja til');
}

// ---------- troppsjefen ----------
{
  const R = { ammo: .25 };
  ok(LR.troppValg({ ammo: .2 }, R, 1.3) === 'hjem' && !LR.troppValg({ ammo: .3 }, R, 1.3), 'tropp: hjem under 25 %');
  ok(!LR.troppValg({ ammo: .2, hjemme: true }, R, 1.3) && !LR.troppValg({ ammo: .2, påVei: true }, R, 1.3), 'tropp: ikke når den er hjemme eller på vei');
  ok(!LR.troppValg({ ammo: .2 }, R, .7) && LR.troppValg({ ammo: .1 }, R, .7) === 'hjem', 'lite dyktig troppsjef reagerer seint');
}

// ---------- kassereren ----------
{
  const R = { minimum: 5e6, utbytte: 'pluss' };
  ok(LR.kassaValg(6e6, 5e5, R, 1.3, fast(.9)).ok && !LR.kassaValg(6e6, 2e6, R, 1.3, fast(.9)).ok, 'kassa: stopper kjøp under minimum');
  ok(LR.kassaValg(6e6, 2e6, R, .7, fast(.01)).ok, 'et dårlig valg slipper kjøpet gjennom');
  ok(LR.kassaValg(1e6, 2e6, { minimum: 0 }, 1, fast(.9)).ok, 'uten grense: alt går');
  ok(LR.utbytteLov(R, { resultat: 1e6 }, 20e6, 2e6).ok && !LR.utbytteLov(R, { resultat: -1 }, 20e6, 2e6).ok && !LR.utbytteLov(R, { resultat: 1e6 }, 6e6, 2e6).ok
    && !LR.utbytteLov({ ...R, utbytte: 'aldri' }, { resultat: 1e6 }, 20e6, 1).ok, 'utbytte bare når uka gikk i pluss og kassa holder');
}

// ---------- verdien ----------
{
  const v0 = LR.verdi([]), v1 = LR.verdi([{ rolle: 'leirsjef', ledelse: 1.45 }]), alle = LR.verdi(LR.RO.map(r => ({ rolle: r, ledelse: 1.3 })));
  ok(v0.kr === 0 && v1.kr === 3e6 && alle.kr > 5 * 1.9e6, `verdien: ingen 0, én dyktig ${v1.kr}, alle fem ${alle.kr}`);
  ok(LR.verdi([{ rolle: 'leirsjef', ledelse: .7 }]).kr < 0, 'en dårlig leder trekker ned');
}

// ---------- kommandoene ----------
{
  K._tøm(); const S = LR.ny(), F = FR.ny(7); let t = 100;
  LR.registrerKommandoer(K, { tilstand: () => S, person: (sd, rolle, del, id) => F.personer.find(p => p.id === id) || null, tid: () => t });
  const p = F.personer[0];
  ok(K.utfør({ type: 'lederUtnevn', rolle: 'kasserer', person: p.id }, {}).ok && S.ledere.kasserer.person === p.id, 'lederUtnevn');
  ok(!K.utfør({ type: 'lederUtnevn', rolle: 'tull', person: p.id }, {}).ok && !K.utfør({ type: 'lederUtnevn', rolle: 'leirsjef', person: 999 }, {}).ok, 'ukjent rolle / person avvises');
  ok(K.utfør({ type: 'lederRegel', nøkkel: 'kasserer', regel: 'minimum', verdi: 10e6 }, {}).ok && S.ledere.kasserer.regler.minimum === 10e6, 'lederRegel');
  ok(LR.iArbeid(S, S.ledere.kasserer, t), 'lederen er i arbeid');
  ok(K.utfør({ type: 'lederSelv', nøkkel: 'kasserer', på: true }, {}).ok && !LR.iArbeid(S, S.ledere.kasserer, t) && LR.iArbeid(S, S.ledere.kasserer, 1440), '«Ta over selv» til neste morgen');
  K.utfør({ type: 'lederSelv', nøkkel: 'kasserer', på: false }, {}); ok(LR.iArbeid(S, S.ledere.kasserer, t), '«La lederen styre» igjen');
  ok(K.utfør({ type: 'lederSelv', nøkkel: null }, {}).ok && !LR.iArbeid(S, S.ledere.kasserer, t), '«Jeg styrer selv i dag» for alle');
  const l = p.lønn; ok(K.utfør({ type: 'lederAv', nøkkel: 'kasserer' }, {}).ok && !S.ledere.kasserer && !(p.lønn > 0) && l > 0, 'lederAv (lønna tilbake)');
  ok(!K.utfør({ type: 'lederUtnevn', rolle: 'kasserer', person: p.id }, { spiller: 'gjest' }).ok, 'en gjest i flerspiller kan ikke utnevne');
}

console.log(feil ? `${feil} FEIL` : 'Alle testene for ledere.js er ok');
process.exit(feil ? 1 : 0);
