/* Riksbrudd – UTPOSTER (fase F5 i docs/plan-selskap-okonomi.md, kapittel 6.2 «regnet når du ikke ser» og 6.9): regler uten DOM.
 * Node: require('./utpost'); nettleser: globalThis.UtpostRegler (visningen og API-et Utpost.lag/Utpost.tildel: spill/utpost-visning.js).
 *
 * En utpost er et sted langt fra leiren (et overtatt hus, et sagbruk i en by, et hogstfelt) med egne folk, egne senger og egen mat.
 * Folkene der går ikke ekte fra leiren hver dag: de reiser dit én gang (reisetid = avstand / fart, spill/folkgang.js REGLER.langt) og bor der.
 * Arbeidet regnes der: hogst og riving ved utposten teller i leirens oppgaver (folkgang.js), alt annet er utpostens eget arbeid
 * (timeverk som telles her – vakt «holder utposten»). Maten kommer fra leiren (en frakttur hver dag tar arbeidstid) eller kjøpes lokalt
 * (dyrere, men ingen tur). Alle tall er Claudes forslag (REGLER).
 */
(function (rot) {
  'use strict';
  // ---------- REGLER (alle tallene er Claudes forslag) ----------
  const REGLER = {
    // så nær leirens midte kan en utpost ikke ligge (m) – da hører stedet til leiren
    minAvstand: 500,
    // senger: pris per seng (kr; feltsenger og madrasser i huset) og høyst så mange per utpost
    sengPris: 10000, maksSenger: 40,
    // mat: rasjoner per person per døgn (som folk.js), lokal mat koster så mange ganger matprisen (kr per rasjon)
    rasjon: 1, matPris: 3000, lokalFaktor: 1.5,
    // mat fra leiren: én frakttur fram og tilbake hver dag – den tida går fra arbeidet i utposten (fraktFart m/s, til fots med kjerre)
    fraktFart: 1.3,
    // høyst så mange utposter
    maks: 8,
    // arbeidene en utpost kan ha, og hva de heter
    JOBB: { vakt: 'Holde utposten (vakt)', hogst: 'Hogst ved utposten', riving: 'Riving ved utposten', bygg: 'Arbeid ved utposten' },
  };
  const MAT = { leir: 'Mat fra leiren (frakt hver dag)', lokal: 'Kjøper mat lokalt' };
  const tall = v => typeof v === 'number' && Number.isFinite(v);

  function ny() { return { versjon: 1, neste: 1, liste: [] }; }
  function fraJSON(o) {
    const S = ny(); if (!o || !Array.isArray(o.liste)) return S; S.neste = Math.max(1, +o.neste || 1);
    for (const u of o.liste) { if (!u || !tall(u.x) || !tall(u.y)) continue;
      S.liste.push({ id: +u.id || S.neste++, x: u.x, y: u.y, navn: String(u.navn || 'Utpost'), jobb: REGLER.JOBB[u.jobb] ? u.jobb : 'vakt', senger: Math.max(0, Math.min(REGLER.maksSenger, +u.senger || 0)),
        mat: MAT[u.mat] ? u.mat : 'leir', folk: Array.isArray(u.folk) ? u.folk.filter(Number.isFinite) : [], hus: u.hus || null, timer: { arbeid: 0, reise: 0, frakt: 0, matKr: 0, ...(u.timer || {}) }, laget: +u.laget || 0 }); }
    for (const u of S.liste) S.neste = Math.max(S.neste, u.id + 1);
    return S;
  }
  const finn = (S, id) => (S ? S.liste.find(u => u.id === id) || null : null);
  // utposten personen hører til (eller null)
  const hvor = (S, pid) => (S ? S.liste.find(u => u.folk.includes(pid)) || null : null);

  // Lag en utpost ved (x, y). o: { leir: { x, y } (midten), hus (id/navn på et overtatt hus), tid (spilltid) }. Gir utposten eller { feil }
  function lag(S, x, y, navn, o = {}) {
    if (!S) return { feil: 'Ingen leir.' }; if (!tall(x) || !tall(y)) return { feil: 'Ugyldig sted.' };
    if (S.liste.length >= REGLER.maks) return { feil: `Høyst ${REGLER.maks} utposter.` };
    if (o.leir && Math.hypot(x - o.leir.x, y - o.leir.y) < REGLER.minAvstand) return { feil: `For nær leiren – en utpost må ligge minst ${REGLER.minAvstand} m unna.` };
    if (S.liste.some(u => Math.hypot(u.x - x, u.y - y) < 100)) return { feil: 'Det er alt en utpost her.' };
    const id = S.neste++, U = { id, x, y, navn: String(navn || `Utpost ${id}`).slice(0, 40), jobb: REGLER.JOBB[o.jobb] ? o.jobb : 'vakt', senger: 0, mat: 'leir', folk: [], hus: o.hus || null,
      timer: { arbeid: 0, reise: 0, frakt: 0, matKr: 0 }, laget: o.tid || 0 };
    S.liste.push(U); return U;
  }
  function fjern(S, id) { const i = S ? S.liste.findIndex(u => u.id === id) : -1; if (i < 0) return null; return S.liste.splice(i, 1)[0]; }
  // Send personen pid til utposten id (null = hjem til leiren). Gir { utpost, fra } eller { feil }
  function tildel(S, pid, id) {
    if (!S || !Number.isFinite(pid)) return { feil: 'Ugyldig person.' };
    const fra = hvor(S, pid), U = id === null || id === undefined ? null : finn(S, id);
    if (id !== null && id !== undefined && !U) return { feil: 'Fant ikke utposten.' };
    if (fra) fra.folk = fra.folk.filter(q => q !== pid);
    if (U) U.folk.push(pid);
    return { utpost: U, fra };
  }
  // Fjern personer som ikke lenger finnes (falt, sluttet, gått i en tropp)
  function rydd(S, ider) { const f = new Set(ider); let n = 0; for (const u of S.liste) { const før = u.folk.length; u.folk = u.folk.filter(q => f.has(q)); n += før - u.folk.length; } return n; }
  // har personen en seng i utposten? (de første i lista får sengene)
  const seng = (U, pid) => !!U && U.folk.indexOf(pid) > -1 && U.folk.indexOf(pid) < U.senger;
  // senger som er i bruk i alle utpostene (folk.js teller dem med leirens senger)
  const sengerIBruk = S => (S ? S.liste.reduce((a, u) => a + Math.min(u.senger, u.folk.length), 0) : 0);
  // reisetid fra leiren (sekunder spilltid) og mat per døgn
  const reisetid = (U, leir, fart = REGLER.fraktFart) => (U && leir ? Math.hypot(U.x - leir.x, U.y - leir.y) / fart : 0);
  const matDøgn = U => U.folk.length * REGLER.rasjon;
  // lokal mat: kroner per døgn
  const lokalKr = U => Math.round(matDøgn(U) * REGLER.matPris * REGLER.lokalFaktor);

  // Ett steg: ute = folkgangens oppsummering per utpost (G.ute: { id: { her, reiser, arbeider, arbeidSek, reiseSek } }), dt i sekunder spilltid.
  // Teller timeverk (arbeid, reise), trekker frakttida fra arbeidet når maten kommer fra leiren, og gir det som skal betales for lokal mat:
  // { kr (lokal mat i dette steget), rasjoner (de samme rasjonene – visningen gir dem tilbake til leirens lager, så de ikke spises to ganger) }
  function steg(S, ute, dt, o = {}) {
    const ut = { kr: 0, rasjoner: 0 }; if (!S || !(dt > 0)) return ut;
    for (const U of S.liste) {
      const u = (ute && ute[U.id]) || { her: 0, reiser: 0, arbeider: 0, arbeidSek: 0, reiseSek: 0 };
      let arbeid = u.arbeidSek / 3600; U.timer.reise += u.reiseSek / 3600;
      if (U.folk.length && U.mat === 'leir' && o.leir) {
        // én tur fram og tilbake per døgn (2 × reisetid) for én person – tas fra arbeidet her (aldri under 0)
        const frakt = Math.min(arbeid, 2 * reisetid(U, o.leir) / 86400 * dt / 3600 * (u.her > 0 ? 1 : 0)); U.timer.frakt += frakt; arbeid -= frakt;
      }
      if (U.mat === 'lokal' && u.her > 0) { const r = u.her * REGLER.rasjon * dt / 86400; ut.rasjoner += r; const kr = r * REGLER.matPris * REGLER.lokalFaktor; ut.kr += kr; U.timer.matKr += kr; }
      U.timer.arbeid += arbeid; U.nå = { her: u.her, reiser: u.reiser, arbeider: u.arbeider };
    }
    return ut;
  }
  // Kort tekst om utposten: «3 folk (2 her, 1 reiser) · 4 senger · mat fra leiren · 12,5 timeverk»
  function tekst(U, leir) {
    const n = U.folk.length, nå = U.nå || { her: 0, reiser: 0 }, r = reisetid(U, leir) / 60, d = leir ? Math.hypot(U.x - leir.x, U.y - leir.y) : 0;
    const km = (Math.round(d / 100) / 10).toString().replace('.', ','), t = r < 60 ? Math.round(r) + ' min' : (Math.round(r / 6) / 10).toString().replace('.', ',') + ' t';
    const tv = (Math.round(U.timer.arbeid * 10) / 10).toString().replace('.', ',');
    return `${km} km fra leiren (${t} å gå) · ${n} ${n === 1 ? 'person' : 'folk'}` + (n ? ` (${nå.her} her${nå.reiser ? `, ${nå.reiser} på vei` : ''})` : '') +
      ` · ${U.senger} ${U.senger === 1 ? 'seng' : 'senger'}` + (n > U.senger ? ` (${n - U.senger} sover ute)` : '') + ` · ${U.mat === 'lokal' ? 'kjøper mat lokalt' : 'mat fra leiren'} · ${tv} timeverk`;
  }

  const api = { REGLER, MAT, ny, fraJSON, finn, hvor, lag, fjern, tildel, rydd, seng, sengerIBruk, reisetid, matDøgn, lokalKr, steg, tekst };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.UtpostRegler = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
