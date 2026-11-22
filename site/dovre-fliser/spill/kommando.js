/* KOMMANDOLAGET (22. nov, R16-A – docs/plan-flerspiller.md, M0 punkt 1). Regler uten DOM (Node: require('./kommando');
 * nettleser: globalThis.Kommando). De ekte handlingene registreres i spill/kommando-visning.js.
 *
 * Alt spilleren gjør med lag og leir går gjennom ÉN funksjon, så de samme handlingene kan sendes over nettet i flerspiller:
 *   Kommando.registrer(type, { lag, leir, sjekk(k, ctx, s) -> null | feiltekst, utfør(k, ctx, s) -> svar, beskriv(k, s) -> tekst })
 *   Kommando.utfør(k, ctx) -> { ok, feil?, svar? }
 *   Kommando.typer() -> navnene på kommandoene
 * k er et rent objekt som kan sendes som JSON: { type: 'formasjon', lag: 'l3', id: 'linje' }. Lagkommandoer (lag: true) finner laget
 * med k.lag = lagets nid (Kommando.nid(s) gir laget en nid når det mangler; flerspiller.js sender lagene med samme nid).
 * ctx = { lag: lista med lag (ENHETER), side: 'blå', spiller: id-en til den som spør (null = denne nettleseren), erVert }.
 * Fjern = ctx.spiller er satt og ikke verten selv (en gjest i flerspiller): da må laget ha s.eier === ctx.spiller, og
 * leirkommandoer (leir: true) avvises foreløpig. Handlingene selv gjør ingen sjekk av hvem som spør – det gjør utfør().
 */
(function (rot) {
  'use strict';
  const TYPER = new Map();
  let teller = 0;
  // Tekstene til spilleren
  const TEKST = {
    ukjent: t => `Ukjent kommando «${t}».`,
    ugyldig: 'Ugyldig kommando.',
    ingenLag: 'Fant ikke laget.',
    ikkeVårt: 'Det er ikke vårt lag.',
    styresAv: (navn, annen) => `${navn} styres av ${annen ? 'en annen spiller' : 'verten'}.`,
    leir: 'Leiren styres av verten. Be verten bygge eller flytte folk for deg.',
    feilet: m => `Noe gikk galt: ${m}`,
  };

  function registrer(type, def) {
    if (!type || typeof type !== 'string') throw new Error('Kommandoen må ha et navn.');
    if (!def || typeof def.utfør !== 'function') throw new Error(`Kommandoen ${type} mangler utfør().`);
    TYPER.set(type, def); return def;
  }
  const typer = () => [...TYPER.keys()];
  const def = t => TYPER.get(t) || null;
  const finnes = t => TYPER.has(t);
  // Laget får en nid ('l1', 'l2' …) når det mangler; tellingen hopper over nid-er som er brukt (liste = alle lagene)
  function nid(s, liste) {
    if (!s) return null; if (s.nid != null) return s.nid;
    const brukt = new Set((liste || []).map(q => q && q.nid).filter(v => v != null));
    let n; do n = 'l' + (++teller); while (brukt.has(n));
    s.nid = n; return n;
  }
  const fjern = ctx => !!(ctx && ctx.spiller != null && !ctx.erVert);
  function finnLag(k, ctx) { const L = (ctx && ctx.lag) || []; return L.find(s => s && s.nid != null && s.nid === k.lag) || null; }

  // Det som sjekkes for alle kommandoer før handlingens egen sjekk: finnes kommandoen og laget, og får den som spør lov.
  // Gir { feil } eller { def, s }. Brukes også hos en gjest før kommandoen sendes til verten.
  function tillatt(k, ctx) {
    ctx = ctx || {};
    if (!k || typeof k !== 'object' || typeof k.type !== 'string') return { feil: TEKST.ugyldig };
    const def = TYPER.get(k.type); if (!def) return { feil: TEKST.ukjent(k.type) };
    let s = null;
    if (def.lag) {
      s = finnLag(k, ctx); if (!s) return { feil: TEKST.ingenLag };
      if (fjern(ctx)) {
        if (s.side !== (ctx.side || 'blå')) return { feil: TEKST.ikkeVårt };
        if (s.eier !== ctx.spiller) return { feil: TEKST.styresAv(s.navn, !!s.eier) };
      }
    }
    if (def.leir && fjern(ctx)) return { feil: TEKST.leir };
    if (def.vertAlene && fjern(ctx)) return { feil: def.vertAlene === true ? 'Bare verten kan gjøre dette.' : def.vertAlene };
    return { def, s };
  }
  // Svarer handlingen med et objekt som har en feiltekst ({ feil: '…' }, slik Leir.bygg gjør), regnes kommandoen som avvist.
  function utfør(k, ctx) {
    ctx = ctx || {};
    const t = tillatt(k, ctx); if (t.feil) return { ok: false, feil: t.feil };
    const { def, s } = t;
    try {
      const f = def.sjekk ? def.sjekk(k, ctx, s) : null; if (f) return { ok: false, feil: String(f) };
      const svar = def.utfør(k, ctx, s);
      if (svar && typeof svar === 'object' && typeof svar.feil === 'string' && svar.feil) return { ok: false, feil: svar.feil, svar };
      return svar === undefined ? { ok: true } : { ok: true, svar };
    } catch (e) { return { ok: false, feil: TEKST.feilet(e && e.message ? e.message : String(e)) }; }
  }
  // Kort tekst om hva kommandoen gjorde («sender Lag 1 av gårde»), til loggen hos verten
  function beskriv(k, ctx) {
    const def = k && TYPER.get(k.type); if (!def || !def.beskriv) return null;
    try { return def.beskriv(k, def.lag ? finnLag(k, ctx) : null); } catch (e) { return null; }
  }
  // Bare tall og tekst (ingen funksjoner eller DOM) – det som kan sendes over nettet
  function kanSendes(v, dybde = 0) {
    if (dybde > 8) return false; if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
    if (typeof v === 'number') return Number.isFinite(v);
    if (Array.isArray(v)) return v.every(x => kanSendes(x, dybde + 1));
    if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) return Object.values(v).every(x => x !== undefined && kanSendes(x, dybde + 1));
    return false;
  }

  const K = { registrer, utfør, tillatt, typer, finnes, def, nid, beskriv, kanSendes, fjern, TEKST, _tøm: () => { TYPER.clear(); teller = 0; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = K; else rot.Kommando = K;
})(typeof globalThis !== 'undefined' ? globalThis : this);
