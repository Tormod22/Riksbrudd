/* KOMMANDOENE FOR LEIR, FOLK, TROPPER OG KJØRETØY (22. nov, R17-4 – docs/plan-flerspiller.md, M0 punkt 1, del 2).
 * Regler uten DOM (Node: require('./kommandoer'); nettleser: globalThis.Kommandoer). Kommandolaget selv: spill/kommando.js.
 * Visningen (spill/kommando-visning.js) kaller Kommandoer.registrer(Kommando, M) med miljøet M for denne nettleseren; testen
 * (pipeline/fliser/test_kommando.js) gir et falskt miljø med de ekte reglene (leir.js, folk.js, tropper.js).
 *
 * Hver kommando har sjekk(k, ctx, s) som avviser ugyldige kommandoer med norsk tekst (finnes det, er det ditt, har du råd), og
 * utfør(k, ctx, s) som gjør det de gamle knappene gjorde (svaret er det samme som regelfunksjonen ga, så visningen kan skrive de
 * samme meldingene som før). Sjekkene for penger og plass følger samme rekkefølge og tekst som regelfunksjonene, så en
 * kommando som avvises i sjekk(), ville ha fått den samme feilen fra regelfunksjonen – oppførselen i enspiller er som før.
 *
 * Siden: alt slås opp via ctx.side (hvis leir, hvis kasse, hvis lag og kjøretøy). Ingen regel her antar at spilleren er «blå».
 *
 * Miljøet M (alt er valgfritt; det som mangler, gir «finnes ikke»):
 *   Leir, FolkRegler, Tropper, Strid       reglene
 *   leir(side) -> L | null                 leiren til siden (leir.js-tilstand)
 *   penger(side) -> kr, betal(side) -> fn(kr) -> bool, gi(side) -> fn(kr)
 *   bonus(side) -> { bygg … }              karakterens bonus (OppstartSpill.bonus)
 *   folk(side) -> F | null, folkValg(side) -> valg til folk.js, matFaktor(side) -> tall
 *   leirPunkt(side) -> { x, y } | null     der leiren står (troppene må stå nær den)
 *   kjøretøy() -> lista med kjøretøy (KJORETOY), lag() -> lista med lag (ENHETER), når ctx ikke har dem
 *   tropp: { opprett(side, ider, navn, bev, kj, o), oppløs(s), endre(s, våpen, utstyr), gåOmBord(s, kj), gåAv(s), bærer(kj) }
 *   kjør(kj, x, y), kjørStopp(kj)          handlingene for kjøretøy (kjoretoy-visning.js)
 *
 * Kommandoene (k er et rent objekt som kan sendes som JSON):
 *   leir:  bygg { bygg, kart }, byggPlan { pids }, plan { handling: 'legg'|'flytt'|'fjern', bygg, pid, til, kart }, riv { bygg },
 *          flytt { bygg, til: { x, y, ret }, kart }, oppgrader { bygg }, reparer { bygg }, prioriter { bygg }, bryter { bygg, av },
 *          kjøpDiesel { liter }, kjøpMateriale { materiale, mengde }, selgMateriale { materiale, mengde }
 *   folk:  folk { person, oppgave }, folkFlytt { oppgave, retning: 'pluss'|'minus' }, rekrutter { bygg: true = på «bygg» },
 *          kjøpMat { rasjoner }
 *   tropp: troppOpprett { personer: [id], navn, bev, kjøretøy, våpen: { id: våpen }, utstyr: [id], mal },
 *          troppOppløs { lag }, troppUtstyr { lag, våpen: { mann: våpen }, utstyr: [id] }, omBord { lag, kjøretøy }, gåAv { lag }
 *   kjøretøy: kjør { kjøretøy, x, y }, kjørStopp { kjøretøy }      (kjøretøy = nid fra Kommando.nid, eller navnet)
 *   meld: true = visningen skriver avvisningen i loggen (som for lagkommandoene)
 */
(function (rot) {
  'use strict';
  const ord = v => typeof v === 'string' && v.length > 0;
  const tall = v => typeof v === 'number' && Number.isFinite(v);
  const side = c => (c && c.side) || 'blå';

  function registrer(K, M) {
    M = M || {};
    const LB = () => M.Leir || null, FR = () => M.FolkRegler || null, TR = () => M.Tropper || null;
    const leir = c => (M.leir ? M.leir(side(c)) : null);
    const penger = c => (M.penger ? +M.penger(side(c)) || 0 : 0);
    const betal = c => (M.betal ? M.betal(side(c)) : () => false);
    const gi = c => (M.gi ? M.gi(side(c)) : () => {});
    const bonus = c => (M.bonus ? M.bonus(side(c)) || {} : {});
    const folk = c => (M.folk ? M.folk(side(c)) : null);
    const kr = n => (LB() ? LB().kroner(n) : `${Math.round(n)} kr`);
    const ikkePenger = pris => `Ikke nok penger (${kr(pris)}).`;
    const utenLeir = c => (!LB() || !leir(c) ? 'Ingen leir ennå.' : null);
    const finnBygg = (c, id) => { const L = leir(c); return L && LB() ? LB().finn(L, id) : null; };
    const ukjentBygg = (c, id) => (!Number.isInteger(id) ? 'Ugyldig bygg.' : !finnBygg(c, id) ? 'Fant ikke bygget.' : null);
    const lagListe = c => (c && c.lag) || (M.lag ? M.lag() : []);
    const kjListe = c => (c && c.kjøretøy) || (M.kjøretøy ? M.kjøretøy() : []);
    // kjøretøyet: nid først, så navnet (lagringen og flerspilleren kjenner navnet)
    const finnKj = (c, ref) => { if (ref == null) return null; const L = kjListe(c); return L.find(q => q && q.nid != null && q.nid === ref) || L.find(q => q && q.navn === ref) || null; };
    const egetKj = (c, kj) => (!kj ? 'Fant ikke kjøretøyet.' : kj.side !== side(c) ? 'Det er ikke vårt kjøretøy.'
      : K.fjern(c) && kj.eier !== c.spiller ? `${kj.navn} styres av ${kj.eier ? 'en annen spiller' : 'verten'}.` : null);
    const egetLag = (c, s) => (s.side === side(c) ? null : 'Det er ikke vårt lag.');
    const vedLeir = (c, o) => { const P = M.leirPunkt ? M.leirPunkt(side(c)) : null, T = TR(); return !!P && !!T && Math.hypot(o.x - P.x, o.y - P.y) <= T.R.nær; };

    // ---------- leiren ----------
    // Bygg: samme sjekker i samme rekkefølge som Leir.bygg (plass, materialer, penger)
    function byggFeil(c, b, kart, o) {
      const L = leir(c), Lr = LB(); const f = Lr.kanBygge(L, b, kart || {}, null, o || {}); if (f) return f;
      const B = Lr.BYGG[b.type], k = Lr.kostnad(b.type, B.linje ? Lr.lengde(b.punkter, b.lukket) : 0, bonus(c));
      if (!Lr.harMat(L, k.mat)) return null;   // Leir.bygg svarer med { feil, mangler } – visningen tilbyr å kjøpe det som mangler
      return penger(c) < k.pris ? ikkePenger(k.pris) : null;
    }
    const gyldigBygg = b => (!b || typeof b !== 'object' || !LB().BYGG[b.type] ? 'Ukjent bygg.'
      : b.punkter ? (!Array.isArray(b.punkter) || b.punkter.length < 2 || !b.punkter.every(p => Array.isArray(p) && tall(+p[0]) && tall(+p[1])) ? 'Ugyldig linje.' : null)
        : !tall(+b.x) || !tall(+b.y) ? 'Ugyldig plass.' : null);
    K.registrer('bygg', { leir: true,
      sjekk: (k, c) => utenLeir(c) || gyldigBygg(k.bygg) || (k.bs != null && (typeof k.bs !== 'object' || !Object.values(k.bs).every(v => v == null || tall(v) || ord(v))) ? 'Ugyldig plass i byggesettet.' : null) || byggFeil(c, k.bygg, k.kart),
      // bs: delens plass i byggesettets rutenett (byggesett-visning.js) settes på det nye bygget
      utfør: (k, c) => { const r = LB().bygg(leir(c), k.bygg, betal(c), bonus(c), k.kart || {}); if (r.bygg && k.bs) r.bygg.bs = { ...k.bs }; return r; },
      beskriv: k => `bygger ${LB() && LB().BYGG[k.bygg.type] ? LB().BYGG[k.bygg.type].navn.toLowerCase() : 'noe'}` });
    // planlagte skisser bygges (alle, eller pids); materialene kjøpes med kjøpMateriale først
    K.registrer('byggPlan', { leir: true,
      sjekk: (k, c) => utenLeir(c) || (k.pids != null && (!Array.isArray(k.pids) || !k.pids.every(Number.isInteger)) ? 'Ugyldige skisser.'
        : !(leir(c).plan || []).some(a => !k.pids || k.pids.includes(a.pid)) ? 'Ingen skisser å bygge.' : null),
      utfør: (k, c) => LB().byggPlan(leir(c), betal(c), bonus(c), {}, k.pids || null),   // { bygget, feil: [[pid, tekst]] } – feilene står i lista
      beskriv: () => 'bygger fra planen' });
    // planen (gratis skisser): legg, flytt, fjern
    K.registrer('plan', { leir: true,
      sjekk: (k, c) => utenLeir(c) || (k.handling === 'legg' ? gyldigBygg(k.bygg)
        : k.handling === 'flytt' ? (!LB().planFinn(leir(c), k.pid) ? 'Fant ikke skissen.' : !k.til || !tall(+k.til.x) || !tall(+k.til.y) ? 'Ugyldig plass.' : null)
          : k.handling === 'fjern' ? (!LB().planFinn(leir(c), k.pid) ? 'Fant ikke skissen.' : null) : 'Ukjent planendring.'),
      utfør: (k, c) => { const L = leir(c), Lr = LB();
        if (k.handling === 'legg') return Lr.planLegg(L, k.bygg, k.kart || {});
        if (k.handling === 'flytt') return Lr.planFlytt(L, k.pid, k.til, k.kart || {});
        return { fjernet: Lr.planFjern(L, k.pid) }; } });
    K.registrer('riv', { leir: true, sjekk: (k, c) => utenLeir(c) || ukjentBygg(c, k.bygg),
      utfør: (k, c) => { const r = LB().riv(leir(c), k.bygg); if (!r.feil) gi(c)(r.penger); return r; }, beskriv: () => 'river et bygg' });
    K.registrer('flytt', { leir: true,
      sjekk: (k, c) => { const f = utenLeir(c) || ukjentBygg(c, k.bygg); if (f) return f; if (!k.til || !tall(+k.til.x) || !tall(+k.til.y)) return 'Ugyldig plass.';
        const b = finnBygg(c, k.bygg), Lr = LB(); if (Lr.BYGG[b.type].linje) return 'Kan ikke flyttes.'; if (b.arbeid) return 'Bygget er opptatt.';
        const g = Lr.kanBygge(leir(c), { type: b.type, x: k.til.x, y: k.til.y, ret: k.til.ret }, k.kart || {}, b.id); if (g) return g;
        const pris = Math.round(Lr.BYGG[b.type].pris * Lr.REGLER.flyttPris); return penger(c) < pris ? ikkePenger(pris) : null; },
      utfør: (k, c) => LB().flytt(leir(c), k.bygg, k.til, betal(c), bonus(c), k.kart || {}), beskriv: () => 'flytter et bygg' });
    K.registrer('oppgrader', { leir: true,
      sjekk: (k, c) => { const f = utenLeir(c) || ukjentBygg(c, k.bygg); if (f) return f; const b = finnBygg(c, k.bygg), Lr = LB();
        if (!Lr.ferdig(b) || b.arbeid) return 'Bygget er ikke klart.'; const o = Lr.oppgraderKostnad(b, bonus(c)); if (!o) return 'Høyeste nivå.';
        if (!Lr.harMat(leir(c), o.mat)) return null;   // { feil, mangler } fra Leir.oppgrader: visningen tilbyr kjøp
        return penger(c) < o.pris ? ikkePenger(o.pris) : null; },
      utfør: (k, c) => LB().oppgrader(leir(c), k.bygg, betal(c), bonus(c)), beskriv: () => 'oppgraderer et bygg' });
    K.registrer('reparer', { leir: true,
      sjekk: (k, c) => { const f = utenLeir(c) || ukjentBygg(c, k.bygg); if (f) return f; const b = finnBygg(c, k.bygg), Lr = LB(); if (b.arbeid) return 'Bygget er opptatt.';
        const o = Lr.reparerKostnad(b, bonus(c)); if (!o) return 'Bygget er helt.'; return penger(c) < o.pris ? ikkePenger(o.pris) : null; },
      utfør: (k, c) => LB().reparer(leir(c), k.bygg, betal(c), bonus(c)), beskriv: () => 'reparerer et bygg' });
    K.registrer('prioriter', { leir: true, sjekk: (k, c) => utenLeir(c) || ukjentBygg(c, k.bygg), utfør: (k, c) => LB().prioriter(leir(c), k.bygg) });
    K.registrer('bryter', { leir: true,
      sjekk: (k, c) => utenLeir(c) || ukjentBygg(c, k.bygg) || (!(LB().BYGG[finnBygg(c, k.bygg).type].kw < 0) ? 'Bygget bruker ikke strøm.' : k.av != null && typeof k.av !== 'boolean' ? 'Ugyldig bryter.' : null),
      utfør: (k, c) => ({ av: LB().bryter(leir(c), k.bygg, k.av == null ? undefined : k.av) }), beskriv: () => 'slår et bygg av eller på' });
    // Diesel: så mye som får plass (høyst liter), samme tekst som Leir.kjøpDrivstoff
    K.registrer('kjøpDiesel', { leir: true,
      sjekk: (k, c) => { const f = utenLeir(c); if (f) return f; if (!tall(k.liter) || k.liter <= 0) return 'Ugyldig mengde.';
        const L = leir(c), Lr = LB(), l = Math.min(k.liter, Math.floor(Math.max(0, Lr.kapasitet(L) - L.drivstoff)));
        if (l <= 0) return 'Ingen plass til mer diesel: bygg en dieseltank (eller et aggregat).';
        const pris = l * Lr.DRIVSTOFF.prisPerLiter; return penger(c) < pris ? ikkePenger(pris) : null; },
      utfør: (k, c) => LB().kjøpDrivstoff(leir(c), k.liter, betal(c)), beskriv: k => `kjøper ${k.liter} l diesel` });
    const gyldigMat = k => (!ord(k.materiale) || !LB().MATERIALER[k.materiale] ? 'Ukjent materiale.' : !tall(k.mengde) || k.mengde <= 0 ? 'Ugyldig mengde.' : null);
    K.registrer('kjøpMateriale', { leir: true,
      sjekk: (k, c) => { const f = utenLeir(c) || gyldigMat(k); if (f) return f; const L = leir(c), Lr = LB();
        const plass = Math.max(0, Lr.lagerplass(L) - (L.lager[k.materiale] || 0)), m = Math.min(k.mengde, Math.floor(plass * 10) / 10);
        if (m <= 0) return 'Lageret er fullt: bygg lagertelt eller containere.';
        const pris = Math.round(m * Lr.MATERIALER[k.materiale].pris); return penger(c) < pris ? ikkePenger(pris) : null; },
      utfør: (k, c) => LB().kjøpMateriale(leir(c), k.materiale, k.mengde, betal(c)), beskriv: k => `kjøper ${String(k.mengde).replace('.', ',')} ${k.materiale}` });
    K.registrer('selgMateriale', { leir: true,
      sjekk: (k, c) => utenLeir(c) || gyldigMat(k) || (!(Math.floor((leir(c).lager[k.materiale] || 0) * 10) / 10 > 0) ? `Ingen ${LB().MATERIALER[k.materiale].navn.toLowerCase()} å selge.` : null),
      utfør: (k, c) => LB().selgMateriale(leir(c), k.materiale, k.mengde, gi(c)), beskriv: k => `selger ${k.materiale}` });

    // ---------- folk ----------
    const utenFolk = c => (!FR() || !folk(c) ? 'Ingen folk i leiren.' : null);
    const ukjentOppgave = o => (!FR().OPPGAVER.includes(o) ? 'Ukjent oppgave.' : null);
    K.registrer('folk', { leir: true,
      sjekk: (k, c) => utenFolk(c) || ukjentOppgave(k.oppgave) || (!folk(c).personer.some(p => p.id === k.person) ? 'Fant ikke personen.' : null),
      utfør: (k, c) => FR().sett(folk(c), k.person, k.oppgave) });
    K.registrer('folkFlytt', { leir: true,
      sjekk: (k, c) => utenFolk(c) || ukjentOppgave(k.oppgave) || (k.retning !== 'pluss' && k.retning !== 'minus' ? 'Ugyldig retning.' : null),
      utfør: (k, c) => { const p = (k.retning === 'minus' ? FR().minus : FR().pluss)(folk(c), k.oppgave); return p ? { id: p.id, navn: p.navn, oppgave: p.oppgave } : null; } });
    // Rekrutter: samme regel som FolkRegler.rekrutter (nødrekrutteringen er gratis når kassa er tom)
    const valg = c => (M.folkValg ? M.folkValg(side(c)) : {});
    K.registrer('rekrutter', { leir: true,
      sjekk: (k, c) => { const f = utenFolk(c) || utenLeir(c); if (f) return f; const F = folk(c), R = FR();
        return R.kanRekruttere(F, leir(c), valg(c)) || (!R.nød(F) && penger(c) < R.R.rekruttPris ? ikkePenger(R.R.rekruttPris) : null); },
      utfør: (k, c) => { const r = FR().rekrutter(folk(c), leir(c), betal(c), valg(c)); if (!r.feil && k.bygg && r.person.oppgave !== 'bygg') r.person.oppgave = 'bygg'; return r; },
      beskriv: () => 'rekrutterer en ny i gjengen' });
    const matF = c => (M.matFaktor ? M.matFaktor(side(c)) : 1);
    K.registrer('kjøpMat', { leir: true,
      sjekk: (k, c) => { const f = utenFolk(c); if (f) return f; if (!Number.isInteger(k.rasjoner) || k.rasjoner <= 0) return 'Ugyldig mengde.';
        const fk = matF(c), pris = Math.round(k.rasjoner * FR().R.matPris * (fk > 0 ? fk : 1)); return penger(c) < pris ? ikkePenger(pris) : null; },
      utfør: (k, c) => FR().kjøpMat(folk(c), k.rasjoner, betal(c), matF(c)), beskriv: k => `kjøper ${k.rasjoner} rasjoner mat` });

    // ---------- tropper ----------
    const T = () => M.tropp || null;
    // det troppen koster: våpen mann for mann og utstyr, ellers en ferdig bevæpning (samme regning som TropperSpill.opprett)
    function troppPris(k, P) {
      const Tr = TR(), egen = k.våpen && Object.keys(k.våpen).length > 0, ut = (k.utstyr || []).filter(u => Tr.UTSTYR[u]);
      const sum = Tr.pris(egen ? P.map(q => k.våpen[q.id] || 'rifle') : [], ut), B = !egen && M.Strid && M.Strid.BEVÆPNING[k.bev];
      return sum + (B && B.pris > 0 ? B.pris : 0);
    }
    K.registrer('troppOpprett', { leir: true,
      sjekk: (k, c) => { const f = utenFolk(c) || (!TR() || !T() ? 'Troppene finnes ikke.' : null) || (!(M.leirPunkt && M.leirPunkt(side(c))) ? 'Ingen leir.' : null); if (f) return f;
        if (!Array.isArray(k.personer) || !k.personer.every(Number.isInteger)) return 'Ugyldige personer.';
        const P = folk(c).personer.filter(p => k.personer.includes(p.id)); if (P.length < k.personer.length) return 'Fant ikke alle personene.';
        if (k.våpen != null && (typeof k.våpen !== 'object' || Object.values(k.våpen).some(v => !TR().VÅPEN[v]))) return 'Ukjent våpen.';
        if (k.utstyr != null && !Array.isArray(k.utstyr)) return 'Ugyldig utstyr.';
        const r = TR().opprett(P, k.navn); if (r.feil) return r.feil;
        if (k.kjøretøy != null) { const kj = finnKj(c, k.kjøretøy), g = egetKj(c, kj); if (g) return g; if (TR().plass(kj) < r.menn.length) return `Det er bare plass til ${TR().plass(kj)} i ${kj.navn}.`; }
        const alt = troppPris(k, P); return alt > 0 && penger(c) < alt ? `Ikke råd til våpnene og utstyret (${alt.toLocaleString('nb-NO')} kr).` : null; },
      utfør: (k, c) => T().opprett(side(c), k.personer, k.navn, k.bev, k.kjøretøy != null ? finnKj(c, k.kjøretøy) : null, { våpen: k.våpen, utstyr: k.utstyr, mal: k.mal }),
      beskriv: k => `setter opp ${k.navn || 'en tropp'}` });
    K.registrer('troppOppløs', { lag: true,
      sjekk: (k, c, s) => egetLag(c, s) || (!utenFolk(c) && T() ? null : 'Leiren har ingen folk-liste.') || (s.karakter || s.leirvakt || s.ai ? `${s.navn} kan ikke oppløses.` : null)
        || (!vedLeir(c, s) ? `${s.navn} må stå innen ${TR().R.nær} m fra leiren for å oppløses.` : null),
      utfør: (k, c, s) => T().oppløs(s), beskriv: (k, s) => `oppløser ${s.navn}` });
    K.registrer('troppUtstyr', { lag: true,
      sjekk: (k, c, s) => { const f = egetLag(c, s) || (!TR() || !T() ? 'Troppene finnes ikke.' : null); if (f) return f;
        if (!vedLeir(c, s)) return `${s.navn} må stå innen ${TR().R.nær} m fra leiren for å bytte våpen og utstyr.`;
        if (!k.våpen || typeof k.våpen !== 'object' || Object.entries(k.våpen).some(([i, v]) => !(+i >= 0 && +i < s.menn.length) || (v && !TR().VÅPEN[v]))) return 'Ukjent våpen.';
        if (!Array.isArray(k.utstyr) || k.utstyr.some(u => !TR().UTSTYR[u])) return 'Ukjent utstyr.';
        const sum = utstyrPris(s, k); return sum > 0 && penger(c) < sum ? `Ikke råd (${sum.toLocaleString('nb-NO')} kr).` : null; },
      utfør: (k, c, s) => T().endre(s, k.våpen, k.utstyr), beskriv: (k, s) => `gir ${s.navn} nye våpen og utstyr` });
    // det nye koster; det som byttes ut, gir ingenting tilbake (samme regning som TropperSpill.brukEndring)
    function utstyrPris(s, k) { const Tr = TR(); let sum = 0;
      s.menn.forEach((m, i) => { const v = k.våpen[i]; if (m.hp > 0 && v && v !== (m.valgt || '')) sum += Tr.VÅPEN[v].pris; });
      for (const u of k.utstyr) if (!(s.utstyr && s.utstyr[u]) && !(u === 'feltradio' && s.radio === 'felt')) sum += Tr.UTSTYR[u].pris; return sum; }
    K.registrer('omBord', { lag: true,
      sjekk: (k, c, s) => { const f = egetLag(c, s) || (!TR() || !T() ? 'Troppene finnes ikke.' : null); if (f) return f; const kj = finnKj(c, k.kjøretøy), g = egetKj(c, kj); if (g) return g;
        if (s.ombord) return `${s.navn} sitter alt i ${s.ombord.navn}.`;
        const o = TR().ombordFeil(s, kj, Math.hypot(s.x - kj.x, s.y - kj.y), !!T().bærer(kj)); return o ? `${s.navn}: ${o}` : null; },
      utfør: (k, c, s) => T().gåOmBord(s, finnKj(c, k.kjøretøy)), beskriv: (k, s) => `setter ${s.navn} om bord` });
    K.registrer('gåAv', { lag: true, sjekk: (k, c, s) => egetLag(c, s) || (!T() ? 'Troppene finnes ikke.' : !s.ombord ? `${s.navn} sitter ikke i et kjøretøy.` : null),
      utfør: (k, c, s) => T().gåAv(s), beskriv: (k, s) => `lar ${s.navn} gå av` });

    // ---------- kjøretøy ----------
    K.registrer('kjør', { meld: true,
      sjekk: (k, c) => { const kj = finnKj(c, k.kjøretøy); return egetKj(c, kj) || (!M.kjør ? 'Kjøretøyene finnes ikke.' : !tall(+k.x) || !tall(+k.y) ? 'Ugyldig mål.' : null); },
      utfør: (k, c) => M.kjør(finnKj(c, k.kjøretøy), +k.x, +k.y), beskriv: k => 'sender et kjøretøy av gårde' });
    K.registrer('kjørStopp', { meld: true,
      sjekk: (k, c) => { const kj = finnKj(c, k.kjøretøy); return egetKj(c, kj) || (!M.kjørStopp ? 'Kjøretøyene finnes ikke.' : kj.oppdrag ? `${kj.navn} er på oppdrag.` : null); },
      utfør: (k, c) => M.kjørStopp(finnKj(c, k.kjøretøy)), beskriv: () => 'stanser et kjøretøy' });
    return K;
  }
  const API = { registrer };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else rot.Kommandoer = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
