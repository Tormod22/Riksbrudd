/* S5 – ødeleggelse og ingeniører: regler uten DOM (Node: require('./odeleggelse'); nettleser: globalThis.Odeleggelse).
 * Tilstand per infrastrukturobjekt (nøkkel 'lag:kilde-id', samme id som INFRA og vegnettet): hel, sprengt/sperret, under reparasjon.
 * Ingeniørlag sprenger og reparerer; et sprengt objekt sperrer lenkene i vegnettet (spill/vegnett.js) til det er reparert.
 * Tidene er spillverdier (forslag), ikke fasit.
 */
(function (rot) {
  'use strict';
  const REGLER = {
    tid: { // sekunder: [ødelegge, reparere]
      bru: [1800, 6 * 3600], tunnel: [3600, 4 * 3600], ferjekai: [3600, 3 * 3600], kraft: [3600, 8 * 3600],   // kraft: tettstedene rundt mister strømmen (S7)
    },
    radius: 150,   // meter: ingeniørene må være så nær objektet for å arbeide
    vegnettType: { bru: 60, tunnel: 67, ferje: 770 },
  };
  const ord = { bru: ['sprengt', 'sprenge', 'sprengt'], tunnel: ['sperret', 'sperre', 'sperret'], ferjekai: ['sperret', 'sperre', 'sperret'], kraft: ['sabotert', 'sabotere', 'sabotert'] };
  const nøkkel = (lag, id) => lag + ':' + id;
  function ny() { return new Map(); }   // nøkkel -> { tilstand: 'sprengt'|'reparasjon', igjen? }
  const tilstand = (T, lag, id) => (T.get(nøkkel(lag, id)) || { tilstand: 'hel' }).tilstand;
  const kanØdelegges = lag => !!REGLER.tid[lag];
  // Et arbeid for et ingeniørlag: { lag, id, navn, x, y, hva: 'ødelegg'|'reparer', igjen }. Gir { feil } når det ikke passer.
  function nyttArbeid(T, obj, hva) {
    const lag = obj.lag, id = obj.e.id, t = tilstand(T, lag, id);
    if (!kanØdelegges(lag)) return { feil: 'Ingeniørene kan sprenge bruer, sperre tunneler og ferjekaier og sabotere kraftverk.' };
    if (hva === 'ødelegg' && t !== 'hel') return { feil: `${obj.e.navn || 'Objektet'} er allerede ${ord[lag][0]}.` };
    if (hva === 'reparer' && t === 'hel') return { feil: `${obj.e.navn || 'Objektet'} er helt.` };
    return { arbeid: { lag, id, navn: obj.e.navn || null, hva, igjen: REGLER.tid[lag][hva === 'ødelegg' ? 0 : 1], total: REGLER.tid[lag][hva === 'ødelegg' ? 0 : 1] } };
  }
  // Arbeidet går bare når laget er nær nok (avstand i meter). Gir 'ferdig' når det er ferdig.
  function arbeid(T, a, sek, avstand) {
    if (avstand > REGLER.radius) return 'for langt unna';
    if (a.hva === 'reparer') T.set(nøkkel(a.lag, a.id), { tilstand: 'reparasjon' });
    a.igjen = Math.max(0, a.igjen - sek);
    if (a.igjen > 0) return 'arbeider';
    if (a.hva === 'ødelegg') T.set(nøkkel(a.lag, a.id), { tilstand: 'sprengt' }); else T.delete(nøkkel(a.lag, a.id));
    return 'ferdig';
  }
  // Avbrutt reparasjon: tilbake til sprengt.
  function avbryt(T, a) { if (a && a.hva === 'reparer' && T.has(nøkkel(a.lag, a.id))) T.set(nøkkel(a.lag, a.id), { tilstand: 'sprengt' }); }
  // Lenkene i vegnettet som skal være sperret for et objekt (ferjekai: ferjesambandene som går fra kaia, gitt av visningen).
  function lenker(graf, lag, id, ferjeIder = []) {
    if (lag === 'bru' || lag === 'tunnel') return graf.infraLenker(REGLER.vegnettType[lag], id);
    if (lag === 'ferjekai') return ferjeIder.flatMap(f => graf.infraLenker(770, f));
    return [];
  }
  // Sperrer/åpner vegnettet slik tilstandene er nå. Gir antall sperrede lenker.
  function oppdaterVegnett(T, graf, ferjeFor = () => []) {
    if (!graf) return 0;
    if (!graf._sperretAv) graf._sperretAv = new Set();
    for (const e of graf._sperretAv) graf.åpne(e);
    graf._sperretAv.clear();
    for (const [k, v] of T) {
      if (v.tilstand === 'hel') continue;
      const [lag, id] = k.split(':'), ider = lag === 'ferjekai' ? ferjeFor(+id) : [];
      for (const e of lenker(graf, lag, +id, ider)) { graf.sperr(e); graf._sperretAv.add(e); }
    }
    return graf._sperretAv.size;
  }
  const tekst = (lag, t) => t === 'hel' ? null : t === 'reparasjon' ? 'under reparasjon' : (ord[lag] || ['ødelagt'])[0];
  const verb = lag => (ord[lag] || ['', 'ødelegge'])[1];
  const api = { REGLER, nøkkel, ny, tilstand, kanØdelegges, nyttArbeid, arbeid, avbryt, lenker, oppdaterVegnett, tekst, verb };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Odeleggelse = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
