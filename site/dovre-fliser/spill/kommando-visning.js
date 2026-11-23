/* KOMMANDOLAGET i spillet (22. nov, R16-A). Reglene: spill/kommando.js. Her registreres de ekte handlingene, og window.KOMMANDO(k)
 * er den ene funksjonen knappene kaller. I enspiller gjør den nøyaktig det knappen gjorde før. Hos en gjest i flerspiller
 * (NETT.gjest, spill/flerspiller-visning.js) sendes lagkommandoene til verten, og verten kjører dem med NETT.utførFra(k, gjest).
 *
 * Kommandoene (k er et rent objekt som kan sendes som JSON; lag = lagets nid, KOMMANDO.nid(s) gir den):
 *   lag:  ordre { lag, x, y, stille }, stopp { lag }, speider { lag, på }, lagfører { lag, mann }, grav { lag }, miner { lag },
 *         formasjon { lag, id }, strid { lag, endring, alle }
 *   leir, folk, tropper og kjøretøy (R17-4): reglene og lista står i spill/kommandoer.js; her får de miljøet i denne nettleseren
 *         (leiren, kassa og folket til MIN_SIDE, TropperSpill.rett, kjørTil, KjoretoySpill.stoppRett).
 * Leirkommandoene fra gjester (R18-D): kjøres på speilet av vertens leir og sendes til verten, når verten har gitt lov (NETT.leirTillatt). Kjøretøy (kjør, kjørStopp) kan gjester styre når de eier dem.
 * Kommandoer med lag: true eller meld: true skriver avvisningen i loggen; de andre lar visningen si det (som før).
 */
(function () {
  'use strict';
  const K = window.Kommando; if (!K || typeof ENHETER === 'undefined') return;
  const lev = s => (typeof levende === 'function' ? levende(s) : true);
  const panel = () => { try { visPanel(); } catch (e) { /* før spillet er klart */ } };
  // laget må høre til siden som spør (ctx.side)
  const blå = (s, c) => (s.side === ((c && c.side) || 'blå') ? null : 'Det er ikke vårt lag.');

  // ---------- lagene (index.html, feltarbeid, formasjon, strid) ----------
  K.registrer('ordre', { lag: true,
    sjekk: (k, c, s) => blå(s, c) || (!Number.isFinite(+k.x) || !Number.isFinite(+k.y) ? 'Ugyldig mål.' : null),
    utfør: (k, c, s) => { ordre(s, +k.x, +k.y, !!k.stille); return `${s.navn}: ordren er mottatt.`; },
    beskriv: (k, s) => `sender ${s.navn} av gårde` });
  K.registrer('stopp', { lag: true, sjekk: (k, c, s) => blå(s, c),
    utfør: (k, c, s) => { s.sti = null; s.kø = null; s.køSlutt = null; s.køSiste = false; s.siktSkitten = true; panel(); skitten = true; return `${s.navn} står.`; },
    beskriv: (k, s) => `stanser ${s.navn}` });
  K.registrer('speider', { lag: true, sjekk: (k, c, s) => blå(s, c),
    utfør: (k, c, s) => { s.speider = k.på === undefined ? !s.speider : !!k.på; s.siktSkitten = true; panel(); return `${s.navn}: ${s.speider ? 'speider (8 km sikt)' : 'vanlig lag (4 km sikt)'}.`; },
    beskriv: (k, s) => `gjør ${s.navn} til ${s.speider ? 'speidere' : 'vanlig lag'}` });
  K.registrer('lagfører', { lag: true,
    sjekk: (k, c, s) => blå(s, c) || (!Number.isInteger(k.mann) || k.mann < 0 || k.mann >= s.menn.length ? 'Fant ikke soldaten.' : null),
    utfør: (k, c, s) => { s.leder = k.mann; panel(); skitten = true; return `${s.menn[k.mann].navn} leder nå ${s.navn}.`; },
    beskriv: (k, s) => `gjør ${s.menn[k.mann] ? s.menn[k.mann].navn : 'en ny'} til lagfører i ${s.navn}` });
  K.registrer('grav', { lag: true,
    sjekk: (k, c, s) => blå(s, c) || (!window.Feltarbeid ? 'Feltarbeid finnes ikke.' : s.sti ? `${s.navn} marsjerer – stopp laget først.` : s.nedgravd ? `${s.navn} er alt gravd ned.` : s.graver != null ? `${s.navn} graver alt.` : null),
    utfør: (k, c, s) => { const FA = Feltarbeid, R = FA.REGLER, r = FA.startGrav(s);
      const t = r.feil ? `${s.navn}: ${r.feil}` : `${s.navn} graver seg ned (${(s.ingeniør ? R.gravIngeniør : R.grav) / 60} min).`; logg(t); panel(); return t; },
    beskriv: (k, s) => `ber ${s.navn} grave seg ned` });
  K.registrer('miner', { lag: true,
    sjekk: (k, c, s) => blå(s, c) || (!window.Feltarbeid ? 'Feltarbeid finnes ikke.' : !s.ingeniør ? 'Bare ingeniørlag kan legge miner.' : s.sti ? `${s.navn} marsjerer – stopp laget først.` : s.minelegging ? `${s.navn} legger alt miner.` : null),
    utfør: (k, c, s) => { const R = Feltarbeid.REGLER; s.minelegging = { igjen: R.mine.tid };
      const t = `${s.navn} legger miner der laget står (${R.mine.tid / 60} min). Fiender som går eller kjører gjennom, kan løse dem ut.`; logg(t); panel(); return t; },
    beskriv: (k, s) => `ber ${s.navn} legge miner` });
  K.registrer('formasjon', { lag: true,
    sjekk: (k, c, s) => blå(s, c) || (!window.Formasjon ? 'Formasjoner finnes ikke.' : s.karakter ? 'Du går ikke i formasjon.' : s.ombord ? `${s.navn} sitter i et kjøretøy.` : k.id != null && !Formasjon.TYPER[k.id] ? 'Ukjent formasjon.' : null),
    utfør: (k, c, s) => { const F = Formasjon; s.formasjon = k.id != null ? k.id : F.neste(s.formasjon); const N = F.type(s.formasjon);
      const t = `${s.navn} går i ${N.navn.toLowerCase()}. ${N.tekst}`; logg(t); skitten = true; panel(); return t; },
    beskriv: (k, s) => `setter ${s.navn} i ${window.Formasjon ? Formasjon.type(k.id || s.formasjon).navn.toLowerCase() : 'ny formasjon'}` });
  // stridsreglene: bare valgene i Strid.VALG (bevæpningen koster penger og går ikke her)
  K.registrer('strid', { lag: true,
    sjekk: (k, c, s) => blå(s, c) || (!window.StridSpill || !window.Strid ? 'Stridsreglene finnes ikke.' : s.karakter ? 'Stridsreglene gjelder lagene, ikke deg.'
      : !k.endring || typeof k.endring !== 'object' ? 'Ingen endring.' : k.alle && K.fjern(c) ? 'Bare verten kan endre reglene for alle lag.'
      : Object.keys(k.endring).some(n => !Strid.VALG[n] || !(String(k.endring[n]) in Strid.VALG[n].valg)) ? 'Ukjent stridsregel.' : null),
    utfør: (k, c, s) => { const e = {}; for (const [n, v] of Object.entries(k.endring)) e[n] = n === 'tap' ? +v : String(v);
      StridSpill.sett(s, e, !!k.alle); const h = Strid.holdningFor(StridSpill.regel(s)); return `${s.navn}: stridsreglene er endret${h ? ' (' + Strid.HOLDNING[h].navn.toLowerCase() + ')' : ''}.`; },
    beskriv: (k, s) => `endrer stridsreglene for ${k.alle ? 'alle lag' : s.navn}` });

  // ---------- leiren, folk, tropper og kjøretøy (reglene i spill/kommandoer.js; her miljøet i denne nettleseren) ----------
  // Denne nettleseren har én leir og én kasse: de hører til siden som spiller her (MIN_SIDE). En annen side har ingen leir her ennå.
  const MIN_SIDE = 'blå';
  const min = sd => sd === MIN_SIDE;
  const S0 = () => (window.OppstartSpill && OppstartSpill.tilstand ? OppstartSpill.tilstand() : null);
  if (window.Kommandoer) Kommandoer.registrer(K, {
    get Leir() { return window.Leir || null; }, get FolkRegler() { return window.FolkRegler || null; }, get Tropper() { return window.Tropper || null; }, get Strid() { return window.Strid || null; },
    leir: sd => (min(sd) && window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null),
    penger: sd => { const S = min(sd) ? S0() : null; return S ? S.penger : 0; },
    betal: sd => (min(sd) && window.OppstartSpill ? OppstartSpill.betal : () => false),
    gi: sd => (min(sd) && window.OppstartSpill ? OppstartSpill.gi : () => {}),
    bonus: sd => (min(sd) && window.OppstartSpill && OppstartSpill.bonus ? OppstartSpill.bonus() : {}),
    folk: sd => (min(sd) && window.FolkSpill && FolkSpill.tilstand ? FolkSpill.tilstand() : null),
    folkValg: sd => (window.FolkSpill && FolkSpill.valg ? FolkSpill.valg() : {}),
    matFaktor: sd => (window.FolkSpill && FolkSpill.matFaktor ? FolkSpill.matFaktor() : 1),
    leirPunkt: sd => { const S = min(sd) ? S0() : null; return S && S.leir ? S.leir : null; },
    lag: () => ENHETER, kjøretøy: () => window.KJORETOY || [],
    get tropp() { return window.TropperSpill && TropperSpill.rett ? TropperSpill.rett : null; },
    kjør: (kj, x, y) => (window.kjørTil ? kjørTil(kj, x, y) : null),
    kjørStopp: kj => (window.KjoretoySpill && KjoretoySpill.stoppRett ? KjoretoySpill.stoppRett(kj) : null),
  });

  // KONTRAKTENE (R18-A): knappene i «Selskapet» (spill/selskap-visning.js). Selskapet er vertens eget (lagres ikke hos gjester),
  // så kommandoene er leirkommandoer; arbeidet gjøres av SelskapSpill.rett, og svaret { ok: false, grunn } blir en feil.
  for (const [type, hva] of [['kontraktTa', 'tar en kontrakt'], ['kontraktAvslå', 'avslår et kontrakttilbud'], ['kontraktLever', 'leverer en kontrakt'], ['kontraktAvbryt', 'avbryter en kontrakt'], ['kontraktPris', 'endrer selskapets pris']])
    K.registrer(type, { leir: true,
      sjekk: () => (window.SelskapSpill && SelskapSpill.rett ? null : 'Selskapet er ikke klart.'),
      utfør: k => { const r = SelskapSpill.rett[type](k.id); return r && r.ok === false && r.grunn ? { feil: r.grunn } : r; },
      beskriv: () => hva });

  // ---------- den ene funksjonen knappene kaller ----------
  const nid = s => K.nid(s, ENHETER);
  const lokal = () => ({ lag: ENHETER, kjøretøy: window.KJORETOY || [], side: MIN_SIDE, spiller: null, erVert: true });
  const NETT = () => window.NETT || null;
  function KOMMANDO(k) {
    const N = NETT();
    // gjest i flerspiller: de felles sjekkene her (raskt svar), så går kommandoen til verten
    if (N && N.gjest) {
      const t = K.tillatt(k, { lag: ENHETER, kjøretøy: window.KJORETOY || [], side: MIN_SIDE, spiller: N.id, erVert: false, leirTillatt: N.leirTillatt });
      if (t.feil) { if (!k.stille) logg(t.def && t.def.leir ? t.feil : t.feil + (t.feil.includes('styres av') ? ' Be verten gi deg laget.' : '')); return { ok: false, feil: t.feil }; }
      // troppene (oppløs, bytt utstyr) er lagkommandoer, men hører til leiren: vertens tillatelse gjelder dem også (R18-D)
      const lov = t.def.leir || (N.bareHosVerten && N.bareHosVerten(k.type)) ? (N.leirTillatt ? N.leirTillatt(k.type) : null) : null;
      if (lov) { if (!k.stille) logg(lov); return { ok: false, feil: lov }; }
      if (!N.tilkoblet) { if (!k.stille) logg('Ingen forbindelse med verten.'); return { ok: false, feil: 'Ingen forbindelse med verten.' }; }
      const nr = N.nesteNr ? N.nesteNr() : 0, ut = Object.assign({}, k, { nr });
      // R18-D: leirkommandoer kjøres først på speilet av vertens leir (samme regler, svaret kommer straks og panelene viser det
      // nye), så hos verten. Neste speil fra verten tar over. Det som lager eller tar bort lag, kjøres bare hos verten.
      if (t.def.leir && N.speilet && N.speilet() && !(N.bareHosVerten && N.bareHosVerten(k.type))) {
        N.iKommando = true; let r; try { r = K.utfør(k, lokal()); } finally { N.iKommando = false; } if (!r.ok) return r;
        N.send({ t: 'kommando', k: ut }); return r;
      }
      N.send({ t: 'kommando', k: ut }); if (!k.stille && t.s) logg(`${t.s.navn}: sendt til verten …`);
      else if (!k.stille && t.def.leir) logg('Sendt til verten …');
      return { ok: true, sendt: true, svar: { sendt: true } };
    }
    const r = K.utfør(k, lokal());
    if (!r.ok && r.feil && !k.stille && K.def(k.type) && (K.def(k.type).lag || K.def(k.type).meld)) logg(r.feil);
    return r;
  }
  KOMMANDO.nid = nid;
  window.KOMMANDO = KOMMANDO;
  window.KommandoSpill = { KOMMANDO, nid, lokal };
})();
