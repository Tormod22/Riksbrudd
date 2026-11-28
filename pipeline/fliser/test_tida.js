// Test av reglene for tida (site/dovre-fliser/spill/tida.js). Kjør: node pipeline/fliser/test_tida.js
const T = require('../../site/dovre-fliser/spill/tida.js');
let feil = 0; const sjekk = (ok, t) => { if (!ok) { feil++; console.log('FEIL: ' + t); } };

// klokka: tid 0 = dag 1 kl. 06:00
sjekk(T.kl(0) === '06:00' && T.kl(18 * 60) === '00:00' && T.kl(1440 + 125) === '08:05', 'kl ' + [T.kl(0), T.kl(1080), T.kl(1565)]);
sjekk(T.nesteMorgen(0) === 1440 && T.nesteMorgen(1439.5) === 1440 && T.nesteMorgen(1440) === 2880, 'nesteMorgen');
// når() regner kalenderdøgn (fra midnatt): kl. 02 om natta er «i dag» for kl. 07 samme morgen
sjekk(T.når(300, 0) === 'kl. 11:00' && T.når(1500, 0) === 'i morgen kl. 07:00', 'når ' + T.når(1500, 0));
sjekk(T.når(1500, 1200) === 'kl. 07:00' && /^dag 3/.test(T.når(3000, 0)), 'når over midnatt ' + T.når(1500, 1200) + ' / ' + T.når(3000, 0));
sjekk(T.om(0.4) === 'nå' && T.om(35) === 'om 35 min' && T.om(135) === 'om 2 t 15 min' && T.om(3000) === 'om 2 d 2 t' && T.om(1440) === 'om 24 t', 'om ' + T.om(3000));

// byggeplanen: to lag, tre jobber
const o = { tid: 100, lag: 2, fart: 1, jobber: [{ id: 'a', navn: 'Brakke', hva: 'bygg', igjen: 120, reise: 0 }, { id: 'b', navn: 'Kjøkken', hva: 'bygg', igjen: 60, reise: 10 }, { id: 'c', navn: 'Vakttårn', hva: 'oppgrader', igjen: 30, reise: 0 }] };
let P = T.byggeplan(o);
sjekk(P[0].ferdig === 220 && P[1].ferdig === 170 && P[2].ferdig === 200, 'byggeplan ' + P.map(j => j.ferdig));
sjekk(T.byggeplan({ ...o, lag: 0 }).every(j => j.ferdig === null), 'ingen byggelag: står stille');
sjekk(T.byggeplan({ ...o, fart: 2 })[0].ferdig === 160, 'dobbel fart');

// kjente hendelser og valg
const o2 = { ...o, kontrakter: [{ id: 7, tittel: 'Eskorte til Dombås', frist: 600, klar: false }], angrep: { min: 400, aktiv: false } };
const K = T.kjente(o2);
sjekk(K.map(h => h.type).join() === 'bygg,bygg,bygg,angrep,frist,morgen', 'kjente sortert ' + K.map(h => h.type + '@' + h.når));
sjekk(K.find(h => h.type === 'bygg' && h.id === 'bygg:c').tekst === 'Vakttårn bygd ut', 'jobbtekst oppgrader');
const V = T.valg(o2), ids = V.map(v => v.id);
sjekk(ids.join() === 'morgen,kontrakt:7,bygg,byggAlle,angrep', 'valg ' + ids);
sjekk(V.find(v => v.id === 'kontrakt:7').når === 540, 'kontrakt stopper en time før fristen');
sjekk(V.find(v => v.id === 'bygg').når === 170 && /Kjøkken/.test(V.find(v => v.id === 'bygg').tekst), 'neste bygg ferdig er kjøkkenet');
sjekk(!T.valg({ tid: 0 }).some(v => v.id === 'angrep' || v.id === 'bygg'), 'uten jobber og angrep: bare morgenen');
sjekk(T.kjente({ tid: 0, angrep: { min: 9000 } }).every(h => h.type !== 'angrep'), 'horisonten tar bort det som er langt fram');

// mål og nådd
let m = T.mål('morgen', o2);
sjekk(T.nådd(m, { ...o2, tid: 1439 }) === null && /morgen/.test(T.nådd(m, { ...o2, tid: 1440 })), 'morgen nådd');
m = T.mål('kontrakt:7', o2);
sjekk(T.nådd(m, { ...o2, tid: 300 }) === null, 'kontrakt ikke nådd');
sjekk(/kan leveres/.test(T.nådd(m, { ...o2, tid: 300, kontrakter: [{ id: 7, tittel: 'Eskorte til Dombås', frist: 600, klar: true }] })), 'kontrakt klar');
sjekk(/fristen/.test(T.nådd(m, { ...o2, tid: 545 })), 'kontrakt nær fristen');
sjekk(/avsluttet/.test(T.nådd(m, { ...o2, tid: 300, kontrakter: [] })), 'kontrakt avsluttet');
sjekk(T.mål('kontrakt:99', o2) === null, 'ukjent kontrakt gir null');
m = T.mål('bygg', o2);
sjekk(T.nådd(m, o2) === null && T.nådd(m, { ...o2, jobber: o2.jobber.filter(j => j.id !== 'b') }) === 'Kjøkken ferdig', 'bygg nådd');
m = T.mål('byggAlle', o2);
sjekk(T.nådd(m, { ...o2, jobber: [o2.jobber[0]] }) === null && /alle/.test(T.nådd(m, { ...o2, jobber: [] })), 'alle bygg nådd');
sjekk(T.mål('bygg', { tid: 0, jobber: [] }) === null, 'ingen jobber, ikke noe mål');
m = T.mål('bygg:a', o2);
sjekk(T.nådd(m, { ...o2, jobber: o2.jobber.filter(j => j.id !== 'b') }) === null && T.nådd(m, { ...o2, jobber: o2.jobber.filter(j => j.id !== 'a') }) === 'Brakke ferdig', 'én bestemt jobb');
m = T.mål('angrep', o2);
sjekk(T.nådd(m, { ...o2, angrep: { min: 50 } }) === null && /drar ut/.test(T.nådd(m, { ...o2, angrep: { min: 0 } })), 'angrep: drar ut');
sjekk(/angripes/.test(T.nådd(m, { ...o2, alarm: true })) && /ikke ventet/.test(T.nådd(m, { ...o2, angrep: null })), 'angrep: alarm / avblåst');
sjekk(/døgn/.test(T.nådd(T.mål('angrep', o2), { ...o2, tid: 100 + T.REGLER.maksSpol, angrep: { min: 50 } })), 'maks spoletid');

// pauser
const før = { tid: 500, alarm: false, fast: false, kontrakter: [{ id: 7, tittel: 'Eskorte', frist: 600, klar: false }] };
const alle = { angrep: true, trenger: true, fast: true };
sjekk(T.pauser(før, { ...før, tid: 501 }, alle).length === 0, 'ingen endring, ingen pause');
sjekk(T.pauser(før, { ...før, alarm: true }, alle)[0].type === 'angrep', 'alarm gir pause');
sjekk(T.pauser(før, { ...før, alarm: true }, { angrep: false }).length === 0, 'avslått type gir ingen pause');
sjekk(T.pauser(før, { ...før, tid: 545 }, alle).some(p => p.type === 'trenger' && /fristen/.test(p.tekst)), 'fristen nær gir pause');
sjekk(T.pauser({ ...før, tid: 545 }, { ...før, tid: 546 }, alle).length === 0, 'fristen gir pause bare én gang');
sjekk(T.pauser(før, { ...før, kontrakter: [{ ...før.kontrakter[0], klar: true }] }, alle).some(p => /kan leveres/.test(p.tekst)), 'klar kontrakt gir pause');
sjekk(T.pauser(før, { ...før, fast: true }, alle).some(p => p.type === 'fast'), 'folk står fast gir pause');
sjekk(T.pauser(før, { ...før, byBer: 1 }, alle).some(p => /by ber/.test(p.tekst)), 'en by ber om hjelp');

console.log(feil ? feil + ' feil' : 'test_tida: alt ok'); process.exit(feil ? 1 : 0);
