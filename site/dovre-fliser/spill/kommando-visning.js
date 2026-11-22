/* KOMMANDOLAGET i spillet (22. nov, R16-A). Reglene: spill/kommando.js. Her registreres de ekte handlingene, og window.KOMMANDO(k)
 * er den ene funksjonen knappene kaller. I enspiller gjør den nøyaktig det knappen gjorde før. Hos en gjest i flerspiller
 * (NETT.gjest, spill/flerspiller-visning.js) sendes lagkommandoene til verten, og verten kjører dem med NETT.utførFra(k, gjest).
 *
 * Kommandoene (k er et rent objekt som kan sendes som JSON; lag = lagets nid, KOMMANDO.nid(s) gir den):
 *   lag:  ordre { lag, x, y, stille }, stopp { lag }, speider { lag, på }, lagfører { lag, mann }, grav { lag }, miner { lag },
 *         formasjon { lag, id }, strid { lag, endring, alle }
 *   leir: bygg { bygg, kart }, riv { bygg }, prioriter { bygg }, folk { person, oppgave }, folkFlytt { oppgave, retning: 'pluss'|'minus' }
 * Leirkommandoene avvises foreløpig fra gjester (de har ikke vertens leir).
 */
(function () {
  'use strict';
  const K = window.Kommando; if (!K || typeof ENHETER === 'undefined') return;
  const lev = s => (typeof levende === 'function' ? levende(s) : true);
  const panel = () => { try { visPanel(); } catch (e) { /* før spillet er klart */ } };
  const blå = s => (s.side === 'blå' ? null : 'Det er ikke vårt lag.');

  // ---------- lagene (index.html, feltarbeid, formasjon, strid) ----------
  K.registrer('ordre', { lag: true,
    sjekk: (k, c, s) => blå(s) || (!Number.isFinite(+k.x) || !Number.isFinite(+k.y) ? 'Ugyldig mål.' : null),
    utfør: (k, c, s) => { ordre(s, +k.x, +k.y, !!k.stille); return `${s.navn}: ordren er mottatt.`; },
    beskriv: (k, s) => `sender ${s.navn} av gårde` });
  K.registrer('stopp', { lag: true, sjekk: (k, c, s) => blå(s),
    utfør: (k, c, s) => { s.sti = null; s.kø = null; s.køSlutt = null; s.køSiste = false; s.siktSkitten = true; panel(); skitten = true; return `${s.navn} står.`; },
    beskriv: (k, s) => `stanser ${s.navn}` });
  K.registrer('speider', { lag: true, sjekk: (k, c, s) => blå(s),
    utfør: (k, c, s) => { s.speider = k.på === undefined ? !s.speider : !!k.på; s.siktSkitten = true; panel(); return `${s.navn}: ${s.speider ? 'speider (8 km sikt)' : 'vanlig lag (4 km sikt)'}.`; },
    beskriv: (k, s) => `gjør ${s.navn} til ${s.speider ? 'speidere' : 'vanlig lag'}` });
  K.registrer('lagfører', { lag: true,
    sjekk: (k, c, s) => blå(s) || (!Number.isInteger(k.mann) || k.mann < 0 || k.mann >= s.menn.length ? 'Fant ikke soldaten.' : null),
    utfør: (k, c, s) => { s.leder = k.mann; panel(); skitten = true; return `${s.menn[k.mann].navn} leder nå ${s.navn}.`; },
    beskriv: (k, s) => `gjør ${s.menn[k.mann] ? s.menn[k.mann].navn : 'en ny'} til lagfører i ${s.navn}` });
  K.registrer('grav', { lag: true,
    sjekk: (k, c, s) => blå(s) || (!window.Feltarbeid ? 'Feltarbeid finnes ikke.' : s.sti ? `${s.navn} marsjerer – stopp laget først.` : s.nedgravd ? `${s.navn} er alt gravd ned.` : s.graver != null ? `${s.navn} graver alt.` : null),
    utfør: (k, c, s) => { const FA = Feltarbeid, R = FA.REGLER, r = FA.startGrav(s);
      const t = r.feil ? `${s.navn}: ${r.feil}` : `${s.navn} graver seg ned (${(s.ingeniør ? R.gravIngeniør : R.grav) / 60} min).`; logg(t); panel(); return t; },
    beskriv: (k, s) => `ber ${s.navn} grave seg ned` });
  K.registrer('miner', { lag: true,
    sjekk: (k, c, s) => blå(s) || (!window.Feltarbeid ? 'Feltarbeid finnes ikke.' : !s.ingeniør ? 'Bare ingeniørlag kan legge miner.' : s.sti ? `${s.navn} marsjerer – stopp laget først.` : s.minelegging ? `${s.navn} legger alt miner.` : null),
    utfør: (k, c, s) => { const R = Feltarbeid.REGLER; s.minelegging = { igjen: R.mine.tid };
      const t = `${s.navn} legger miner der laget står (${R.mine.tid / 60} min). Fiender som går eller kjører gjennom, kan løse dem ut.`; logg(t); panel(); return t; },
    beskriv: (k, s) => `ber ${s.navn} legge miner` });
  K.registrer('formasjon', { lag: true,
    sjekk: (k, c, s) => blå(s) || (!window.Formasjon ? 'Formasjoner finnes ikke.' : s.karakter ? 'Du går ikke i formasjon.' : s.ombord ? `${s.navn} sitter i et kjøretøy.` : k.id != null && !Formasjon.TYPER[k.id] ? 'Ukjent formasjon.' : null),
    utfør: (k, c, s) => { const F = Formasjon; s.formasjon = k.id != null ? k.id : F.neste(s.formasjon); const N = F.type(s.formasjon);
      const t = `${s.navn} går i ${N.navn.toLowerCase()}. ${N.tekst}`; logg(t); skitten = true; panel(); return t; },
    beskriv: (k, s) => `setter ${s.navn} i ${window.Formasjon ? Formasjon.type(k.id || s.formasjon).navn.toLowerCase() : 'ny formasjon'}` });
  // stridsreglene: bare valgene i Strid.VALG (bevæpningen koster penger og går ikke her)
  K.registrer('strid', { lag: true,
    sjekk: (k, c, s) => blå(s) || (!window.StridSpill || !window.Strid ? 'Stridsreglene finnes ikke.' : s.karakter ? 'Stridsreglene gjelder lagene, ikke deg.'
      : !k.endring || typeof k.endring !== 'object' ? 'Ingen endring.' : k.alle && K.fjern(c) ? 'Bare verten kan endre reglene for alle lag.'
      : Object.keys(k.endring).some(n => !Strid.VALG[n] || !(String(k.endring[n]) in Strid.VALG[n].valg)) ? 'Ukjent stridsregel.' : null),
    utfør: (k, c, s) => { const e = {}; for (const [n, v] of Object.entries(k.endring)) e[n] = n === 'tap' ? +v : String(v);
      StridSpill.sett(s, e, !!k.alle); const h = Strid.holdningFor(StridSpill.regel(s)); return `${s.navn}: stridsreglene er endret${h ? ' (' + Strid.HOLDNING[h].navn.toLowerCase() + ')' : ''}.`; },
    beskriv: (k, s) => `endrer stridsreglene for ${k.alle ? 'alle lag' : s.navn}` });

  // ---------- leiren (leir-visning.js, folk-visning.js) ----------
  const leir = () => (window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null);
  const utenLeir = () => (!window.Leir || !leir() ? 'Ingen leir ennå.' : null);
  K.registrer('bygg', { leir: true, sjekk: k => utenLeir() || (!k.bygg || !Leir.BYGG[k.bygg.type] ? 'Ukjent bygg.' : null),
    utfør: k => Leir.bygg(leir(), k.bygg, OppstartSpill.betal, OppstartSpill.bonus(), k.kart || {}) });
  K.registrer('riv', { leir: true, sjekk: k => utenLeir() || (!Leir.finn(leir(), k.bygg) ? 'Fant ikke bygget.' : null),
    utfør: k => { const r = Leir.riv(leir(), k.bygg); OppstartSpill.gi(r.penger); return r; } });
  K.registrer('prioriter', { leir: true, sjekk: k => utenLeir() || (!Leir.finn(leir(), k.bygg) ? 'Fant ikke bygget.' : null),
    utfør: k => Leir.prioriter(leir(), k.bygg) });
  const folk = () => (window.FolkSpill && FolkSpill.tilstand ? FolkSpill.tilstand() : null);
  K.registrer('folk', { leir: true, sjekk: k => (!window.FolkRegler || !folk() ? 'Ingen folk i leiren.' : !FolkRegler.OPPGAVER.includes(k.oppgave) ? 'Ukjent oppgave.' : null),
    utfør: k => FolkRegler.sett(folk(), k.person, k.oppgave) });
  K.registrer('folkFlytt', { leir: true, sjekk: k => (!window.FolkRegler || !folk() ? 'Ingen folk i leiren.' : !FolkRegler.OPPGAVER.includes(k.oppgave) ? 'Ukjent oppgave.' : null),
    utfør: k => { const p = (k.retning === 'minus' ? FolkRegler.minus : FolkRegler.pluss)(folk(), k.oppgave); return p ? { id: p.id, navn: p.navn, oppgave: p.oppgave } : null; } });

  // ---------- den ene funksjonen knappene kaller ----------
  const nid = s => K.nid(s, ENHETER);
  const lokal = () => ({ lag: ENHETER, side: 'blå', spiller: null, erVert: true });
  const NETT = () => window.NETT || null;
  function KOMMANDO(k) {
    const N = NETT();
    // gjest i flerspiller: de felles sjekkene her (raskt svar), så går kommandoen til verten
    if (N && N.gjest) {
      const t = K.tillatt(k, { lag: ENHETER, side: 'blå', spiller: N.id, erVert: false });
      if (t.feil) { if (!k.stille) logg(t.def && t.def.leir ? t.feil : t.feil + (t.feil.includes('styres av') ? ' Be verten gi deg laget.' : '')); return { ok: false, feil: t.feil }; }
      if (!N.tilkoblet) { if (!k.stille) logg('Ingen forbindelse med verten.'); return { ok: false, feil: 'Ingen forbindelse med verten.' }; }
      N.send({ t: 'kommando', k }); if (!k.stille && t.s) logg(`${t.s.navn}: sendt til verten …`);
      return { ok: true, sendt: true };
    }
    const r = K.utfør(k, lokal());
    if (!r.ok && r.feil && !k.stille && K.def(k.type) && K.def(k.type).lag) logg(r.feil);
    return r;
  }
  KOMMANDO.nid = nid;
  window.KOMMANDO = KOMMANDO;
  window.KommandoSpill = { KOMMANDO, nid, lokal };
})();
