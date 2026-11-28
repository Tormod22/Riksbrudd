/* AVISA (ut6-kjeder 28. nov, fase Ø9 – planen kapittel 12): en kort lokalavis hver morgen med det som har skjedd. Regler uten DOM
 * (Node: require('./avis'); nettleser: globalThis.Avis). Visningen (spill/kjeder-visning.js) samler «saker» fra spillet – markedet,
 * byene, Gråbørsen, ulykker og angrep fra loggen, produksjonen, lån, været – og Avis.lag velger det viktigste:
 *   { navn, dag, tittel, linjer: [ … ] }  – tittelen er den største saken, så høyst tre korte notiser.
 * Ingen tilfeldighet utenom frøet (dag + leir), så samme døgn gir samme avis. Navnet og vektene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  const REGLER = {
    navn: 'Fjellposten',
    // vekt per slag sak: det største blir tittelen
    vekt: { angrep: 9, ulykke: 8, by: 7, børs: 6, lån: 5, marked: 5, produksjon: 4, rykte: 4, vær: 3, rolig: 1 },
    notiser: 3,
    // når ingenting har skjedd
    rolig: ['Rolig natt i bygda. Folk venter på bedre tider.', 'Lite nytt å melde. Bøndene gjør klar til neste sesong.', 'Stille på vegene i natt. Prisene står omtrent stille.'],
    // innledningen per slag (ett av ordene velges av frøet)
    før: { angrep: ['Uro:', 'Siste:'], ulykke: ['Ulykke:', 'Uhell:'], by: ['Byene:', 'Bygdene:'], børs: ['Gråbørsen:'], lån: ['Penger:'], marked: ['Markedet:'], produksjon: ['Næring:'], rykte: ['Rykter:'], vær: ['Været:'] },
  };
  // fast tall 0–1 av dag og et ord (samme avis for samme dag)
  const frø = (dag, t) => { let h = 2166136261 ^ (dag | 0); for (const c of String(t)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 10007) / 10007; };
  const velg = (liste, dag, t) => liste[Math.floor(frø(dag, t) * liste.length) % liste.length];
  const rens = t => String(t || '').replace(/\s+/g, ' ').trim().replace(/^(Markedet|Gråbørsen):\s*/i, '');
  const punktum = t => { const u = /[.!?]$/.test(t) ? t : t + '.'; return u.charAt(0).toUpperCase() + u.slice(1); };

  // saker = [{ slag, tekst, vekt? }]. Gir avisa for dagen.
  function lag(saker, dag, leir = '') {
    const S = (saker || []).filter(s => s && s.tekst && String(s.tekst).trim()).map((s, i) => ({ ...s, tekst: punktum(rens(s.tekst)), v: (s.vekt || REGLER.vekt[s.slag] || 2) + frø(dag, leir + i) * .5 }));
    // samme tekst bare én gang
    const sett = new Set(), U = S.filter(s => (sett.has(s.tekst) ? false : (sett.add(s.tekst), true))).sort((a, b) => b.v - a.v);
    const navn = REGLER.navn, d = Math.max(1, dag | 0);
    if (!U.length) return { navn, dag: d, tittel: velg(REGLER.rolig, d, leir), linjer: [], tekst: `${navn}, dag ${d}: ${velg(REGLER.rolig, d, leir)}` };
    const ord = s => (REGLER.før[s.slag] ? velg(REGLER.før[s.slag], d, s.tekst) + ' ' : '');
    const tittel = U[0].tekst, linjer = U.slice(1, 1 + REGLER.notiser).map(s => ord(s) + s.tekst);
    return { navn, dag: d, tittel, linjer, tekst: `${navn}, dag ${d}: ${tittel}` + (linjer.length ? ' ' + linjer.join(' ') : '') };
  }
  // én linje til morgenmøtet / dagboka
  const linje = a => (a ? `${a.navn}: ${a.tittel}` : '');

  // Saker fra loggen: linjer fra siste døgn som handler om angrep og ulykker (visningen gir dem)
  const ULYKKE = /ulykke|brann|brant|skadet|kollaps|uhell|ras\b/i, ANGREP = /røver|angrep|angrip|beskut|falt\b|overfall/i;
  function fraLogg(linjer) {
    const ut = [];
    for (const t of linjer || []) { if (ULYKKE.test(t)) ut.push({ slag: 'ulykke', tekst: t }); else if (ANGREP.test(t)) ut.push({ slag: 'angrep', tekst: t }); }
    return ut.slice(-4);
  }

  const api = { REGLER, lag, linje, fraLogg, frø };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Avis = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
