/* Riksbrudd – TROPPER DU LAGER SELV: regler uten DOM (Node: require('./tropper'); nettleser: globalThis.Tropper).
 * (17. nov, brukeren: «jeg ønsker at jeg skal selv måtte lage troppene selv med å velge folk og evt. kjøretøy».)
 * En tropp settes sammen av folkene i leiren (2–12), får navn, bevæpning og kan få et kjøretøy å kjøre i. Folkene går ut av leirens
 * folk og blir soldater i troppen (de arbeider ikke i leiren lenger); oppløser du troppen ved leiren, kommer de som lever, hjem igjen.
 * Kjøretøy: en tropp som er om bord, følger kjøretøyet – slik kommer den fram på minutter i stedet for timer. Tallene er Claudes.
 */
(function (rot) {
  'use strict';
  const R = { min: 2, maks: 12, nær: 300, bord: 60, plass: { speiderbil: 4, lastebil: 12 } };
  const ROLLER = ['lagfører', 'nestlagfører', 'skarpskytter', 'sanitet', 'radio', 'maskingevær', 'maskingevær', 'rifle', 'rifle', 'rifle', 'rifle', 'rifle'];
  const vakt = p => (p.ferd && p.ferd.vakt) || .9, stell = p => (p.ferd && p.ferd.stell) || .9;
  // Setter sammen mannskapet: den beste på vakt leder, den beste på stell blir sanitet (fra fire og oppover), resten etter vaktferdighet.
  function opprett(personer, navn) { const P = (personer || []).filter(p => p && p.navn); if (P.length < R.min) return { feil: `En tropp trenger minst ${R.min} personer.` }; if (P.length > R.maks) return { feil: `En tropp kan ha høyst ${R.maks} personer.` };
    const etter = P.slice().sort((a, b) => vakt(b) - vakt(a)), san = P.length >= 4 ? etter.slice(1).sort((a, b) => stell(b) - stell(a))[0] : null, rest = etter.filter(p => p !== san), roller = ROLLER.filter(r => r !== 'sanitet').slice(0, rest.length);
    const menn = rest.map((p, i) => ({ navn: p.navn, rolle: roller[i] || 'rifle', hp: p.helse >= .99 ? 1 : p.helse >= .4 ? .5 : .5, loy: p.lojal === undefined ? .7 : p.lojal, erf: p.erf || 0, person: { ...p, ferd: { ...(p.ferd || {}) } } }));
    if (san) menn.splice(Math.min(3, menn.length), 0, { navn: san.navn, rolle: 'sanitet', hp: san.helse >= .99 ? 1 : .5, loy: san.lojal === undefined ? .7 : san.lojal, erf: san.erf || 0, person: { ...san, ferd: { ...(san.ferd || {}) } } });
    return { navn: String(navn || 'Tropp').slice(0, 30), menn, leder: 0 }; }
  // Oppløser: de som lever, blir personer igjen (sårede med lav helse). oppgaver: lista over oppgaver i leiren (for dem uten persondata).
  function oppløs(lag, oppgaver = []) { const ut = []; for (const m of lag.menn) { if (!(m.hp > 0)) continue; const p = m.person ? { ...m.person, ferd: { ...(m.person.ferd || {}) } } : { navn: m.navn, alder: 30, yrke: 'soldat', ferd: { vakt: 1.2 }, lojal: m.loy === undefined ? .7 : m.loy, seng: false };
      for (const o of oppgaver) if (o !== 'fri' && !p.ferd[o]) p.ferd[o] = .9; if (m.erf > 0) p.erf = Math.round(m.erf * 10) / 10; p.oppgave = 'fri'; p.helse = m.hp >= 1 ? Math.max(.6, p.helse === undefined ? 1 : p.helse) : .35; delete p.id; ut.push(p); } return ut; }
  // ---------- FOLK OG UTSTYR (17. nov, brukeren: «forbedre systemet spilleren bruker for å lage sine egne tropper, hvor han velger folk
  // og utstyr»). Våpen velges mann for mann, troppen kan få utstyr, og det finnes ferdige forslag. Alle tallene er Claudes forslag.
  const VÅPEN = {   // kr per våpen; riflen og pistolen har leiren fra før
    rifle: { navn: 'Rifle', pris: 0, tekst: 'jevnt god til 600 m' }, maskinpistol: { navn: 'Maskinpistol', pris: 25000, tekst: 'best under 300 m' }, hagle: { navn: 'Hagle', pris: 20000, tekst: 'farligst under 150 m' },
    presisjonsrifle: { navn: 'Presisjonsrifle', pris: 80000, tekst: 'når 1100 m' }, maskingevær: { navn: 'Maskingevær', pris: 150000, tekst: 'mest ild til 900 m' }, pistol: { navn: 'Pistol', pris: 0, tekst: 'bare helt nært' } };
  const UTSTYR = {
    kikkert: { navn: 'Kikkerter', pris: 150000, tekst: 'Troppen ser 20 % lenger.', sikt: 1.2 },
    ammo: { navn: 'Ekstra ammunisjon', pris: 100000, tekst: 'Ammunisjonen varer dobbelt så lenge.', sparer: .5 },
    sanitet: { navn: 'Sanitetsutstyr', pris: 200000, tekst: 'Saniteten får én såret kampklar hver sjette time (krever sanitet i troppen).', timer: 6 },
    feltradio: { navn: 'Feltradio', pris: 1000000, tekst: 'Kontakt med leiren like langt som leirens radio rekker (ellers håndradio, 3 km).' },
  };
  // Ferdige forslag: antall, våpen etter plass i troppen (resten rifle), utstyr og kjøretøy.
  const MALER = {
    speider: { navn: 'Speidertropp', n: 4, våpen: ['rifle', 'presisjonsrifle', 'rifle', 'rifle'], utstyr: ['kikkert', 'feltradio'], bil: 'speiderbil', tekst: 'Fire med kikkert og feltradio i en speiderbil: finner fienden uten å slåss.' },
    storm: { navn: 'Stormtropp', n: 8, våpen: ['maskinpistol', 'maskinpistol', 'hagle', 'maskinpistol', 'maskingevær', 'maskinpistol', 'hagle', 'maskinpistol'], utstyr: ['ammo', 'sanitet'], bil: 'lastebil', tekst: 'Åtte for kamp på kort hold: tar tettsteder og stillinger.' },
    vakt: { navn: 'Vaktlag', n: 6, våpen: ['rifle', 'rifle', 'maskingevær', 'rifle', 'rifle', 'rifle'], utstyr: [], bil: null, tekst: 'Seks med rifler og ett maskingevær: billig garnison.' },
    støtte: { navn: 'Ildstøtte', n: 6, våpen: ['presisjonsrifle', 'maskingevær', 'maskingevær', 'presisjonsrifle', 'rifle', 'rifle'], utstyr: ['kikkert', 'ammo'], bil: null, tekst: 'Seks med maskingevær og presisjonsrifler: holder fienden nede på lang avstand, helst fra høyden.' },
  };
  // Hvem bør med? De beste i strid først, men den som alt har en jobb i leiren, trekkes litt ned (fri og vakt først), og syke sist.
  const egnet = p => vakt(p) + (p.oppgave === 'fri' ? .25 : p.oppgave === 'vakt' ? .15 : 0) - (p.helse !== undefined && p.helse < .6 ? .5 : 0);
  function foreslå(personer, n) { return (personer || []).filter(p => p && p.navn).slice().sort((a, b) => egnet(b) - egnet(a)).slice(0, Math.max(0, n)).map(p => p.id); }
  // Prisen for våpnene (liste med våpen-id-er) og utstyret (liste med utstyr-id-er).
  function pris(våpen, utstyr) { return (våpen || []).reduce((s, v) => s + ((VÅPEN[v] && VÅPEN[v].pris) || 0), 0) + (utstyr || []).reduce((s, u) => s + ((UTSTYR[u] && UTSTYR[u].pris) || 0), 0); }
  // Hva leiren mister: { oppgave: antall } for dem som tas ut.
  function mister(personer) { const ut = {}; for (const p of personer || []) if (p.oppgave && p.oppgave !== 'fri') ut[p.oppgave] = (ut[p.oppgave] || 0) + 1; return ut; }
  // Setter de valgte våpnene på mennene: valg = { personens id: våpen }. Rifle = rollens vanlige våpen for dem uten egen rolle.
  function utrust(lag, valg) { for (const m of lag.menn) { const v = valg && m.person && valg[m.person.id]; if (v && VÅPEN[v]) m.valgt = v; } return lag; }
  // Sanitetsutstyret: gir true når en såret ble kampklar (kalles med timer siden sist).
  function pleie(lag, timer) { if (!lag.utstyr || !lag.utstyr.sanitet || timer < UTSTYR.sanitet.timer) return false; if (!lag.menn.some(m => m.rolle === 'sanitet' && m.hp >= 1)) return false; const s = lag.menn.find(m => m.hp > 0 && m.hp < 1); if (!s) return false; s.hp = 1; return true; }
  const plass = k => (R.plass[k.type] || 0) * (k.antall || 1);
  const friske = lag => lag.menn.filter(m => m.hp > 0).length;
  // Kan troppen gå om bord? avstand i meter. Gir null når det går, ellers grunnen.
  function ombordFeil(lag, k, avstand, opptatt) { if (!plass(k)) return 'Kjøretøyet frakter ikke folk.'; if (opptatt) return 'Kjøretøyet frakter alt en tropp.'; if (friske(lag) > plass(k)) return `Det er bare plass til ${plass(k)} i ${k.navn}.`; if (avstand > R.bord) return `For langt unna (${Math.round(avstand)} m – må være innen ${R.bord} m).`; if (k.sti) return 'Kjøretøyet kjører.'; return null; }
  const api = { VÅPEN, UTSTYR, MALER, foreslå, pris, mister, utrust, pleie, egnet, R, ROLLER, opprett, oppløs, plass, friske, ombordFeil };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Tropper = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
