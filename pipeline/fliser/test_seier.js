// Test av de tre veiene til seier (site/dovre-fliser/spill/seier.js). Kjør: node pipeline/fliser/test_seier.js
const S = require('../../site/dovre-fliser/spill/seier.js');
const St = require('../../site/dovre-fliser/spill/strategi.js');
let feil = 0; const sjekk = (ok, t) => { if (!ok) { feil++; console.log('FEIL: ' + t); } };
const D = 1440;

// ---------- MAKT: leser Strategi sin stilling ----------
const byer = [{ id: 1, folk: 6000 }, { id: 2, folk: 3000 }, { id: 3, folk: 1000 }];
const eier = { 1: 'blå', 2: 'rød', 3: null };
const st = St.stilling(byer, id => eier[id]);
let m = S.makt(st, 'blå', 4 * D, St.REGLER);
sjekk(Math.abs(m.andel - .6) < 1e-9 && m.nådd && m.fremdrift === 1, 'makt: 60 % gir seier ' + JSON.stringify(m));
m = S.makt(st, 'rød', 4 * D, St.REGLER); sjekk(!m.nådd && Math.abs(m.fremdrift - .5) < 1e-9, 'makt: rød 30 % = halvveis ' + m.fremdrift);
m = S.makt(st, 'blå', D, St.REGLER); sjekk(!m.nådd && m.fremdrift < 1 && /tidligst dag 4/.test(m.mangler.join()), 'makt: for tidlig');
m = S.makt(St.stilling(byer.slice(0, 2), id => eier[id]), 'blå', 9 * D, St.REGLER); sjekk(!m.nådd && /bare 2/.test(m.mangler.join()), 'makt: færre enn tre tettsteder');
m = S.makt(null, 'blå', 0); sjekk(m.fremdrift === 0 && !m.nådd, 'makt uten stilling');

// ---------- PENGER ----------
const BYGG = { brakke: { pris: 4e6 }, aggregat: { pris: 3.5e6 } };
sjekk(S.byggVerdi([{ type: 'brakke' }, { type: 'aggregat', hp: .5 }, { type: 'brakke', ferdig: false }, { type: 'x', pris: 1e6 }], BYGG) === 4e6 + 1.75e6 + 1e6, 'byggVerdi');
const MAT = { tre: { pris: 20000 }, stål: { pris: 60000 } };
sjekk(S.lagerVerdi({ tre: 10, stål: 1, ukjent: 5 }, MAT, 100, 3000) === 200000 + 60000 + 300000, 'lagerVerdi');
sjekk(S.kjøretøyVerdi([{ type: 'lastebil', antall: 2 }, { type: 'fly' }]) === 3e6 + 2e6, 'kjøretøyVerdi');
const v = S.verdi({ kassa: 200e6, bygg: 40e6, lager: 10e6, kjøretøy: 3e6 }); sjekk(v.sum === 253e6, 'verdi sum ' + v.sum);
const rv = S.rivalVerdi({ kasse: 5e6, folk: 10000, lag: 4, kjøretøy: 1.5e6 }); sjekk(rv.sum === 5e6 + 15e6 + 8e6 + 10e6 + 1.5e6 && rv.anslag, 'rivalVerdi ' + rv.sum);
let p = S.penger({ blå: 253e6, rød: 39.5e6, grønn: 20e6 }, 'blå', 4 * D);
sjekk(p.nådd && p.fremdrift === 1 && p.foran, 'penger: over målet og størst');
p = S.penger({ blå: 125e6, rød: 39.5e6, grønn: 20e6 }, 'blå', 4 * D); sjekk(!p.nådd && Math.abs(p.fremdrift - .5) < 1e-9, 'penger: halvveis');
p = S.penger({ blå: 260e6, rød: 300e6, grønn: 20e6 }, 'blå', 4 * D); sjekk(!p.nådd && p.fremdrift === .99 && p.størst === 'rød' && /rød er verdt mer/.test(p.mangler.join()), 'penger: rival er større');
p = S.penger({ blå: 260e6, rød: 300e6, grønn: 20e6 }, 'rød', 4 * D); sjekk(p.nådd, 'penger: rivalen kan vinne');
p = S.penger({ blå: 400e6 }, 'blå', D); sjekk(!p.nådd, 'penger: for tidlig');

// ---------- GJENOPPBYGGING ----------
const t = 8 * D, gml = t - 3 * D;
const B = [
  { id: 'a', navn: 'A', folk: 3000, eier: 'blå', strøm: true, ødelagt: 0, loj: 70, holdtFra: gml },
  { id: 'b', navn: 'B', folk: 2000, eier: 'blå', strøm: true, ødelagt: 0, loj: 60, holdtFra: gml },
  { id: 'c', navn: 'C', folk: 1000, eier: 'blå', strøm: true, ødelagt: 0, loj: 56, holdtFra: gml },
  { id: 'd', navn: 'D', folk: 9000, eier: 'rød', strøm: true, ødelagt: 0, loj: null, holdtFra: gml },
  { id: 'e', navn: 'E', folk: 5000, eier: null, strøm: false, ødelagt: 1, loj: null, holdtFra: null },
];
let g = S.gjenoppbygging(B, 'blå', { tid: t });
sjekk(g.nådd && g.fremdrift === 1 && g.holdt === 3 && g.ok === 3, 'gjenoppbygging: tre gode tettsteder (30 % av folket) ' + JSON.stringify(g.mangler));
g = S.gjenoppbygging(B.map(b => (b.id === 'b' ? { ...b, strøm: false } : b)), 'blå', { tid: t });
sjekk(!g.nådd && g.ok === 2 && /B: uten strøm/.test(g.mangler.join()) && g.fremdrift < 1 && g.fremdrift > .5, 'gjenoppbygging: ett uten strøm ' + g.fremdrift);
g = S.gjenoppbygging(B.map(b => (b.id === 'c' ? { ...b, ødelagt: 2 } : b)), 'blå', { tid: t }); sjekk(!g.nådd && /C: 2 bruer/.test(g.mangler.join()), 'gjenoppbygging: ødelagt bru');
g = S.gjenoppbygging(B.map(b => (b.id === 'c' ? { ...b, loj: 40 } : b)), 'blå', { tid: t }); sjekk(!g.nådd && /lojalitet 40/.test(g.mangler.join()), 'gjenoppbygging: sult/lojalitet');
g = S.gjenoppbygging(B.map(b => (b.id === 'a' ? { ...b, holdtFra: t - 600 } : b)), 'blå', { tid: t }); sjekk(!g.nådd && /holdt i/.test(g.mangler.join()), 'gjenoppbygging: nylig tatt');
g = S.gjenoppbygging(B, 'blå', { tid: t, sult: true }); sjekk(!g.nådd && /tom for mat/.test(g.mangler.join()), 'gjenoppbygging: leiren sulter');
g = S.gjenoppbygging(B, 'blå', { tid: 2 * D }); sjekk(!g.nådd, 'gjenoppbygging: for tidlig');
g = S.gjenoppbygging(B.slice(0, 2), 'blå', { tid: t }); sjekk(!g.nådd && /minst 3/.test(g.mangler.join()), 'gjenoppbygging: bare to tettsteder');
// rivalen: uten lojalitet, men samme krav om tre tettsteder
g = S.gjenoppbygging(B, 'rød', { tid: t }); sjekk(!g.nådd && g.holdt === 1, 'gjenoppbygging: rød har bare ett');
g = S.gjenoppbygging(B.map(b => ({ ...b, eier: b.id === 'e' ? null : 'grønn', loj: null })), 'grønn', { tid: t }); sjekk(g.nådd, 'gjenoppbygging: rivalen kan vinne');
sjekk(S.ødelagtNær(0, 0, [{ x: 1000, y: 0, lag: 'bru', tilstand: 'sprengt' }, { x: 20000, y: 0, lag: 'bru', tilstand: 'sprengt' }, { x: 0, y: 0, lag: 'kraft', tilstand: 'hel' }, { x: 0, y: 0, lag: 'tunnel', tilstand: 'sperret' }]) === 1, 'ødelagtNær');

// ---------- holdt siden ----------
let H = S.holdt({}, [['a', 'blå'], ['b', null]], 100); sjekk(H.a.fra === 100 && !H.b, 'holdt: nytt');
H = S.holdt(H, [['a', 'blå']], 500); sjekk(H.a.fra === 100, 'holdt: samme eier beholder tida');
H = S.holdt(H, [['a', 'rød']], 900); sjekk(H.a.eier === 'rød' && H.a.fra === 900, 'holdt: ny eier');

// ---------- alle, nye, husk, lagring ----------
const A = S.alle({ tid: t, st, SR: St.REGLER, verdier: { blå: 10e6, rød: 300e6, grønn: 1 }, byer: B });
sjekk(A.blå.makt.nådd && A.rød.penger.nådd && A.blå.gjenoppbygging.nådd && !A.grønn.makt.nådd, 'alle');
sjekk(S.nådd(A).map(q => q.side + ':' + q.vei).join() === 'blå:makt,blå:gjenoppbygging,rød:penger', 'nådd ' + JSON.stringify(S.nådd(A)));
let T = S.ny('1,2'), n = S.nye(T, A);
sjekk(n.length === 3 && n[0].side === 'blå' && n[2].side === 'rød', 'nye: din først');
S.husk(T, 'blå', 'makt', t, 'videre'); sjekk(S.nye(T, A).length === 2 && S.vunnet(T, 'blå').length === 1, 'husk');
const A2 = S.alle({ tid: t, st: St.stilling(byer, () => null), verdier: {}, byer: [] }); S.nye(T, A2); sjekk(!T.aktiv['blå:makt'], 'glemmes når fremdriften faller');
const J = S.fraJSON(JSON.parse(JSON.stringify(T)), '1,2'); sjekk(J.seire.length === 1 && J.seire[0].valg === 'videre', 'fraJSON');
sjekk(S.fraJSON(T, 'annen').seire.length === 0, 'fraJSON: annen leir'); sjekk(S.fraJSON('tull', 'x').v === 1, 'fraJSON tåler tull');
// avisa
const N = { blå: 'Har', rød: 'Ravnsund', grønn: 'Mosevakt' };
for (const vei of ['makt', 'penger', 'gjenoppbygging']) for (const side of ['blå', 'rød']) { const a = S.avis(vei, side, N, { andel: .62, verdi: 260e6, byer: 4, dag: 12 }); sjekk(a.overskrift && a.ingress.length > 40 && a.dato === 'Dag 12' && a.du === (side === 'blå'), 'avis ' + vei + side); }
sjekk(/Har styrer regionen/.test(S.avis('makt', 'blå', N, { andel: .6 }).overskrift) && /Ravnsund og Mosevakt/.test(S.avis('makt', 'blå', N, { andel: .6 }).ingress), 'avis-tekst');
sjekk(S.mill(253e6) === '253 mill. kr' && S.mill(12.34e6) === '12,3 mill. kr', 'mill');

console.log(feil ? `${feil} FEIL` : 'test_seier: alt ok');
process.exit(feil ? 1 : 0);
