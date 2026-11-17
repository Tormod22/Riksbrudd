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
    const menn = rest.map((p, i) => ({ navn: p.navn, rolle: roller[i] || 'rifle', hp: p.helse >= .99 ? 1 : p.helse >= .4 ? .5 : .5, loy: p.lojal === undefined ? .7 : p.lojal, person: { ...p, ferd: { ...(p.ferd || {}) } } }));
    if (san) menn.splice(Math.min(3, menn.length), 0, { navn: san.navn, rolle: 'sanitet', hp: san.helse >= .99 ? 1 : .5, loy: san.lojal === undefined ? .7 : san.lojal, person: { ...san, ferd: { ...(san.ferd || {}) } } });
    return { navn: String(navn || 'Tropp').slice(0, 30), menn, leder: 0 }; }
  // Oppløser: de som lever, blir personer igjen (sårede med lav helse). oppgaver: lista over oppgaver i leiren (for dem uten persondata).
  function oppløs(lag, oppgaver = []) { const ut = []; for (const m of lag.menn) { if (!(m.hp > 0)) continue; const p = m.person ? { ...m.person, ferd: { ...(m.person.ferd || {}) } } : { navn: m.navn, alder: 30, yrke: 'soldat', ferd: { vakt: 1.2 }, lojal: m.loy === undefined ? .7 : m.loy, seng: false };
      for (const o of oppgaver) if (o !== 'fri' && !p.ferd[o]) p.ferd[o] = .9; p.oppgave = 'fri'; p.helse = m.hp >= 1 ? Math.max(.6, p.helse === undefined ? 1 : p.helse) : .35; delete p.id; ut.push(p); } return ut; }
  const plass = k => (R.plass[k.type] || 0) * (k.antall || 1);
  const friske = lag => lag.menn.filter(m => m.hp > 0).length;
  // Kan troppen gå om bord? avstand i meter. Gir null når det går, ellers grunnen.
  function ombordFeil(lag, k, avstand, opptatt) { if (!plass(k)) return 'Kjøretøyet frakter ikke folk.'; if (opptatt) return 'Kjøretøyet frakter alt en tropp.'; if (friske(lag) > plass(k)) return `Det er bare plass til ${plass(k)} i ${k.navn}.`; if (avstand > R.bord) return `For langt unna (${Math.round(avstand)} m – må være innen ${R.bord} m).`; if (k.sti) return 'Kjøretøyet kjører.'; return null; }
  const api = { R, ROLLER, opprett, oppløs, plass, friske, ombordFeil };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Tropper = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
