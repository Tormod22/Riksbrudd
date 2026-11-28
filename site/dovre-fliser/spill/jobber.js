/* JOBBTAVLA OG DØGNET (28. nov, fase F0 i docs/plan-selskap-okonomi.md, kapittel 6.3, 6.4 og 6.8). Regler uten DOM
 * (Node: require('./jobber'); nettleser: globalThis.Jobber). Visningen: spill/jobber-visning.js (del i Folk-panelet).
 *
 * Fortsatt REGNET: figurene går ikke etter jobbene ennå (det er F2). Det som er nytt:
 *  - JOBBTAVLA: leiren lager jobber ut fra det som finnes (byggejobbene i leir.js, hogst/riving/frakt fra ressurser.js, vakt,
 *    overvåking, kjøkken, stell og verksted). Hver jobbtype har et antall plasser, en prioritet 1–5 (1 = først) og en grunn når
 *    den står fast («ingen ledige», «ingen med ferdighet», «uten strøm» …).
 *  - FORDELING (når «Jobbtavla fordeler» er på): de låste først, så prioritet 1, 2 … og innen prioriteten den som er best på jobben
 *    (den som alt har jobben, får et lite forsprang, så folk ikke bytter jobb hele tida). Resultatet skrives i p.oppgave, så alt som
 *    leser oppgavene (folk.js, leir.js, ressurser.js, 2D og 3D) virker som før. Uten tavla fordeler spilleren selv med − / + som før.
 *  - DØGNPLANEN: hver person har arbeid, mat, søvn og fri. Utenfor arbeidstida bidrar personen ikke til arbeidstempoet i
 *    produksjonsjobbene (bygg, hogst, riving, frakt, verksted). Vakt, overvåking og stell går i turnus (alltid noen på post), og
 *    kjøkkenet lager alle måltidene – de regnes som før hele døgnet. I arbeidstida arbeider folk tettere (ARBEID_K), så et helt døgn
 *    gir like mye arbeid som før (se docs/natt/ut1-jobber.md for tallene).
 *  - SKIFT per jobbtype: «dag» (07–11 og 12–17), «to skift» (tidlig 06–14:30 og sen 14:30–23) og «døgnet rundt» (også natt
 *    22:30–07). Nattskift gir litt lavere moral.
 * Alle tallene her er Claudes forslag (ikke brukerens fasit). Tilstanden J lagres av visningen i «riksbrudd-jobber» (per leir).
 */
(function (rot) {
  'use strict';
  const NODE = typeof module !== 'undefined' && module.exports;
  const LB = NODE ? require('./leir.js') : rot.Leir;
  const FR = NODE ? require('./folk.js') : rot.FolkRegler;

  // Jobbtypene er oppgavene i folk.js (uten «fri»)
  const TYPER = ['vakt', 'kjøkken', 'stell', 'bygg', 'verksted', 'overvåking', 'frakt', 'hogst', 'riving'];
  // Produksjonsjobbene følger døgnplanen; de andre går i turnus eller lager alle måltidene (regnet hele døgnet)
  const PRODUKSJON = ['bygg', 'hogst', 'riving', 'frakt', 'verksted'];
  const TURNUS = ['vakt', 'overvåking', 'stell'];

  // REGLER – alle tallene er Claudes forslag (28. nov)
  const REGLER = {
    // prioritet 1 (først) – 5 (sist). Vakt og kjøkken først (leiren skal aldri stå uten), så stell og bygging.
    prio: { vakt: 1, kjøkken: 1, stell: 2, bygg: 2, verksted: 3, overvåking: 3, frakt: 3, hogst: 3, riving: 4 },
    // så mange får hvile når tavla fordeler (som startgjengen i folk.js: to av ti har fri; moralen i folk.js vil ha minst 10 % fri)
    friAndel: .2,
    // standard skift: bygg i to skift (byggene tar 0,5–3 timer – med bare dagskift ville en bestilling om kvelden vente til neste morgen),
    // de lange jobbene (hogst, riving, frakt) og verkstedet på dagtid
    skift: { bygg: 'to', verksted: 'dag', hogst: 'dag', riving: 'dag', frakt: 'dag' },
    // hvor mange som har nytte av en jobb (plasser): bygg 2 per byggejobb (ett byggelag), hogst og riving 3 på feltet, frakt 2 bærere,
    // verksted 2 per verksted, overvåking 1 per kontrollrom, kjøkken 1 per 8 personer (som perKokk i folk.js), stell 1 per 3 syke,
    // vakt 1 per vakttårn (minst 1, så leiren aldri står uten vakt)
    plasser: { byggPerJobb: 2, hogst: 3, riving: 3, frakt: 2, verksted: 2, overvåking: 1, perKokk: 8, perStell: 3, minVakt: 1 },
    minFerd: .6,        // under dette regnes personen som uten ferdighet i jobben
    behold: .25,        // forsprang for den som alt har jobben (færre bytter)
    hvert: 30,          // spillminutter mellom hver fordeling
    // et helt døgn i et skift gir så mye arbeid per person som før (1 = som før); flere skift gir litt mer (verktøyet står mindre stille)
    dagsverk: { dag: 1, to: 1.05, døgn: 1.1 },
    nattMoral: 15,      // moralpoeng i minus når hele gjengen går nattskift (ganges med andelen som gjør det)
    leggetid: 22,       // søvn 22–06 i dagplanen
  };
  // Døgnplanene: [fra, til, hva] i timer (kan gå over midnatt). hva: arbeid, mat, søvn, fri. Hver plan dekker hele døgnet.
  const PLANER = {
    dag: [[22, 6, 'søvn'], [6, 7, 'mat'], [7, 11, 'arbeid'], [11, 12, 'mat'], [12, 17, 'arbeid'], [17, 18, 'mat'], [18, 22, 'fri']],
    tidlig: [[21, 5, 'søvn'], [5, 6, 'mat'], [6, 10, 'arbeid'], [10, 10.5, 'mat'], [10.5, 14.5, 'arbeid'], [14.5, 15.5, 'mat'], [15.5, 21, 'fri']],
    sen: [[0, 8, 'søvn'], [8, 9, 'mat'], [9, 13.5, 'fri'], [13.5, 14.5, 'mat'], [14.5, 18.5, 'arbeid'], [18.5, 19, 'mat'], [19, 23, 'arbeid'], [23, 24, 'fri']],
    natt: [[22.5, 2.5, 'arbeid'], [2.5, 3, 'mat'], [3, 7, 'arbeid'], [7, 8, 'mat'], [8, 16, 'søvn'], [16, 21.5, 'fri'], [21.5, 22.5, 'mat']],
  };
  const SKIFT = { dag: ['dag'], to: ['tidlig', 'sen'], døgn: ['tidlig', 'sen', 'natt'] };
  const SKIFTNAVN = { dag: 'dag', to: 'to skift', døgn: 'døgnet rundt' };
  const PLANNAVN = { dag: 'dag 07–17', tidlig: 'tidligskift 06–14:30', sen: 'senskift 14:30–23', natt: 'nattskift 22:30–07' };
  const HVA = { arbeid: 'arbeider', mat: 'spiser', søvn: 'sover', fri: 'fri' };
  const NAVN = t => (FR && FR.OPPGAVE[t] ? FR.OPPGAVE[t].navn : t);

  // ---------- tilstanden ----------
  function ny() { return { versjon: 1, auto: false, døgn: true, prio: {}, skift: {}, lås: {}, ute: {} }; }
  // Lagring: legger til det som mangler (ukjente verdier blir standard)
  function fraJSON(o) {
    const J = ny(); if (!o || typeof o !== 'object') return J;
    J.auto = !!o.auto; J.døgn = o.døgn !== false;
    for (const t of TYPER) { const p = o.prio && +o.prio[t]; if (p >= 1 && p <= 5) J.prio[t] = Math.round(p); const s = o.skift && o.skift[t]; if (SKIFT[s] && PRODUKSJON.includes(t)) J.skift[t] = s; }
    for (const [id, t] of Object.entries(o.lås || {})) if (TYPER.includes(t)) J.lås[id] = t;
    for (const [id, l] of Object.entries(o.ute || {})) if (Array.isArray(l)) { const u = l.filter(t => TYPER.includes(t)); if (u.length) J.ute[id] = [...new Set(u)]; }
    return J;
  }
  const prio = (J, t) => (J && J.prio[t] >= 1 ? J.prio[t] : REGLER.prio[t] || 3);
  const skift = (J, t) => (PRODUKSJON.includes(t) ? (J && J.skift[t]) || REGLER.skift[t] || 'dag' : TURNUS.includes(t) ? 'turnus' : 'dag');
  const erUte = (J, id, t) => !!(J && J.ute[id] && J.ute[id].includes(t));

  // ---------- jobbene leiren har nå ----------
  // ctx: { R (ressursene, spill/ressurser.js), mangler (Set av bygg uten strøm), avh (barn og gamle), nær (m, ressurser.REGLER.nær) }
  // Gir [{ type, navn, plasser, hva: [tekst], blokk: grunn | null, ingen: tekst når det ikke er noe å gjøre }]
  function lag(F, L, ctx = {}) {
    const P = REGLER.plasser, ut = [], mangler = ctx.mangler || new Set(), n = F ? F.personer.length : 0;
    const bygg = L && Array.isArray(L.bygg) ? L.bygg : [];
    const ferdig = t => bygg.filter(b => b.type === t && LB && LB.ferdig(b));
    const iDrift = t => ferdig(t).filter(b => LB.virker(b) && !mangler.has(b.id));
    const navnB = b => (LB && LB.BYGG[b.type] ? LB.BYGG[b.type].navn : b.type);
    const RJ = ctx.R && Array.isArray(ctx.R.jobber) ? ctx.R.jobber : [], nær = ctx.nær > 0 ? ctx.nær : 150;
    const haug = j => ['tre', 'betong', 'stål'].reduce((s, k) => s + ((j.haug && j.haug[k]) || 0), 0);
    for (const t of TYPER) {
      const j = { type: t, navn: NAVN(t), plasser: 0, hva: [], blokk: null, ingen: null };
      if (t === 'bygg') { const J = LB && L ? LB.jobber(L) : [];
        const ord = { bygg: 'Bygg', oppgrader: 'Oppgrader', flytt: 'Flytt', reparer: 'Reparer' };
        j.plasser = P.byggPerJobb * J.length; j.hva = J.map(q => `${ord[q.hva] || 'Bygg'} ${navnB(q.b).toLowerCase()}` + (q.reise > 0 ? ' (utpost)' : ''));
        if (!J.length) j.ingen = 'ingenting å bygge'; }
      else if (t === 'hogst' || t === 'riving') { const a = RJ.filter(q => q.type === t && !q.stoppet && q.gjort < q.arbeid);
        if (a.length) { j.plasser = P[t]; j.hva = a.map(q => (t === 'hogst' ? `Hogstfelt ${Math.round(q.r || 0)} m` : 'Riv hus') + ` (${Math.round(100 * q.gjort / q.arbeid)} %)`); }
        else j.ingen = t === 'hogst' ? 'ingen hogstfelt (merk et i Leir → Ressurser)' : 'ingen hus å rive (velg et i Leir → Ressurser)'; }
      else if (t === 'frakt') { const a = RJ.filter(q => q.avst > nær && q.frakt !== 'lastebil' && haug(q) > .01);
        if (a.length) { j.plasser = P.frakt; j.hva = a.map(q => `Bær materialer ${Math.round(q.avst)} m til leiren`); } else j.ingen = 'ingenting å bære'; }
      else if (t === 'vakt') { const tårn = iDrift('vakttårn').length; j.plasser = Math.max(P.minVakt, tårn);
        j.hva = tårn ? Array.from({ length: tårn }, (_, i) => `Vakttårn ${i + 1}`) : ['Vakt ved leiren']; }
      else if (t === 'kjøkken') { const v = n + (ctx.avh || 0); j.plasser = v ? Math.max(1, Math.round(v / P.perKokk)) : 0; j.hva = v ? [`Lag mat til ${v}`] : []; if (!v) j.ingen = 'ingen å lage mat til'; }
      else if (t === 'stell') { const syke = F ? F.personer.filter(p => p.helse < 1).length : 0; j.plasser = Math.ceil(syke / P.perStell); j.hva = syke ? [`Stell ${syke} syke eller skadde`] : []; if (!syke) j.ingen = 'ingen syke'; }
      else if (t === 'verksted') { const f = ferdig('verksted').length + (ctx.ekstraVerksted || 0), d = iDrift('verksted').length + (ctx.ekstraVerksted || 0);
        if (!f) j.ingen = 'trenger et verksted';
        else { j.plasser = P.verksted * f; if (!d) j.blokk = 'uten strøm';
          const skadd = bygg.filter(b => LB.ferdig(b) && !b.arbeid && b.hp < 1); j.hva = skadd.length ? skadd.slice(0, 3).map(b => `Reparer ${navnB(b).toLowerCase()}`) : ['Lag stål av skrap']; } }
      else if (t === 'overvåking') { const f = ferdig('kontrollrom').length, d = iDrift('kontrollrom').length;
        if (!f) j.ingen = 'trenger et kontrollrom'; else { j.plasser = P.overvåking * f; j.hva = ['Se gjennom kameraene']; if (!d) j.blokk = 'uten strøm'; } }
      ut.push(j);
    }
    return ut;
  }

  // ---------- fordelingen ----------
  const arbeidsfør = p => (FR ? FR.arbeidsfør(p) : p.helse >= .4);
  // Fordel folkene på jobbene. jobber = lag(...). o.spes(p) -> oppgaven en spesialist hører til (spill/samfunn.js), eller null.
  // Gir { til: Map(id -> type), fast: [{ type, mangler, grunn }], på: { type: [id] } }. Endrer ingenting (bruk).
  function fordel(F, J, jobber, o = {}) {
    const til = new Map(), på = {}, mangler = {}; for (const j of jobber) { på[j.type] = []; }
    const finnes = t => jobber.some(j => j.type === t);
    // de som ikke kan arbeide, og de i opplæring, beholder oppgaven sin (opplæringen gjelder en bestemt oppgave)
    const ledige = [];
    for (const p of F.personer) {
      if (!arbeidsfør(p) || p.trener) { til.set(p.id, p.oppgave); if (på[p.oppgave]) på[p.oppgave].push(p.id); continue; }
      const l = J.lås[p.id]; if (l && finnes(l)) { til.set(p.id, l); på[l].push(p.id); continue; }
      ledige.push(p);
    }
    const ferd = (p, t) => (p.ferd && p.ferd[t]) || 0;
    const kan = (p, t) => !erUte(J, p.id, t) && ferd(p, t) >= REGLER.minFerd;
    const rang = (p, t) => ferd(p, t) + (p.oppgave === t ? REGLER.behold : 0) + (o.spes && o.spes(p) === t ? 1 : 0);
    // de som får hvile: andelen friAndel av dem som kan arbeide (aldri flere enn at det blir minst én i arbeid)
    const tak = ledige.length - Math.min(ledige.length ? ledige.length - 1 : 0, Math.round((ledige.length + til.size) * REGLER.friAndel));
    let tatt = 0;
    const rekke = jobber.filter(j => j.plasser > 0 && !j.blokk).slice().sort((a, b) => (prio(J, a.type) - prio(J, b.type)) || (TYPER.indexOf(a.type) - TYPER.indexOf(b.type)));
    // innen samme prioritet fylles jobbene én plass om gangen etter tur, så ingen jobb tar alle før de andre får noen
    for (let nivå = 1; nivå <= 5; nivå++) {
      const her = rekke.filter(j => prio(J, j.type) === nivå); let fylte = true;
      while (fylte) { fylte = false;
        for (const j of her) { if (på[j.type].length >= j.plasser || tatt >= tak) continue;
          const k = ledige.filter(p => kan(p, j.type)).sort((a, b) => rang(b, j.type) - rang(a, j.type))[0]; if (!k) continue;
          ledige.splice(ledige.indexOf(k), 1); til.set(k.id, j.type); på[j.type].push(k.id); tatt++; fylte = true; } }
    }
    for (const p of ledige) til.set(p.id, 'fri');
    const fast = [];
    for (const j of jobber) { const mangel = j.plasser - på[j.type].length; if (mangel <= 0 && !j.blokk) continue; if (j.plasser <= 0) continue;
      // grunnen: kan noen i gjengen ta jobben (de er da opptatt med viktigere jobber eller har hvile), eller er alle utelukket / uten ferdighet?
      const alle = F.personer.filter(p => arbeidsfør(p) && !p.trener);
      let g = j.blokk;
      if (!g) g = alle.some(p => kan(p, j.type)) ? 'ingen ledige' : alle.length && alle.every(p => erUte(J, p.id, j.type)) ? 'alle er utelukket' : 'ingen med ferdighet';
      fast.push({ type: j.type, mangler: Math.max(0, mangel), grunn: g }); mangler[j.type] = mangel; }
    return { til, fast, på };
  }
  // Skriv fordelingen inn i p.oppgave. Gir lista over dem som byttet: [{ p, fra, til }]
  function bruk(F, f) {
    const bytt = []; for (const p of F.personer) { const t = f.til.get(p.id); if (t && t !== p.oppgave && (FR ? FR.OPPGAVER.includes(t) : true)) { bytt.push({ p, fra: p.oppgave, til: t }); p.oppgave = t; } }
    return bytt;
  }
  // Uten tavla (spilleren fordeler selv): hvilke jobber står fast? (plasser, men ingen på oppgaven – eller jobben er blokkert)
  function fastManuelt(F, jobber) {
    const fast = [];
    for (const j of jobber) { if (j.plasser <= 0) continue; const a = F.personer.filter(p => p.oppgave === j.type && arbeidsfør(p)).length;
      if (j.blokk) fast.push({ type: j.type, mangler: Math.max(0, j.plasser - a), grunn: j.blokk });
      else if (!a) fast.push({ type: j.type, mangler: j.plasser, grunn: F.personer.some(p => p.oppgave === j.type) ? 'de som har jobben, er syke' : 'ingen satt på jobben' }); }
    return fast;
  }

  // ---------- døgnplanen ----------
  const klokke = tid => (((6 + tid / 60) % 24) + 24) % 24;   // spillet starter kl. 06 (index.html: klokke())
  const iSeg = (h, a, b) => (a <= b ? h >= a && h < b : h >= a || h < b);
  const segLengde = ([a, b]) => (a <= b ? b - a : 24 - a + b);
  const timer = (plan, hva = 'arbeid') => plan.reduce((s, q) => s + (q[2] === hva ? segLengde(q) : 0), 0);
  // vaktturnus: k = min(3, antall vakter) skift fra kl. 06, så det alltid står en vakt (med én vakt: døgnvakt, sover på post)
  function turnusPlan(i, k) {
    if (k <= 1) return [[0, 24, 'arbeid']];
    const len = 24 / k, a = (6 + i * len) % 24, b = (a + len) % 24, m = (b + 1) % 24, s = (m + 8) % 24;
    return [[a, b, 'arbeid'], [b, m, 'mat'], [m, s, 'søvn'], [s, a, 'fri']].filter(q => segLengde(q) > 0);
  }
  // Planen til én person: { navn, plan, slot } ut fra oppgaven og skiftet for jobbtypen. Personer på samme jobb deles på skiftene etter tur.
  function planFor(J, F, p) {
    const t = p.oppgave;
    if (t === 'fri' || !TYPER.includes(t)) return { navn: 'fri', plan: PLANER.dag.map(q => (q[2] === 'arbeid' ? [q[0], q[1], 'fri'] : q)), slot: 'fri' };
    const like = F.personer.filter(q => q.oppgave === t && arbeidsfør(q)).sort((a, b) => a.id - b.id), i = Math.max(0, like.indexOf(p));
    if (TURNUS.includes(t)) { const k = Math.min(3, Math.max(1, like.length)); const plan = turnusPlan(i % k, k);
      return { navn: k <= 1 ? 'døgnvakt' : `turnus ${String(Math.round(plan[0][0])).padStart(2, '0')}–${String(Math.round(plan[0][1]) % 24).padStart(2, '0')}`, plan, slot: 'turnus' }; }
    const sk = skift(J, t), slots = SKIFT[sk] || SKIFT.dag, slot = slots[i % slots.length];
    return { navn: PLANNAVN[slot], plan: PLANER[slot], slot };
  }
  // Hva personen gjør nå: { hva: arbeid|mat|søvn|fri|syk|borte, tekst }
  function nå(J, F, p, tid) {
    if (p.borte) return { hva: 'borte', tekst: 'borte fra leiren' };
    if (p.karantene) return { hva: 'syk', tekst: 'i karantene' };
    if (!arbeidsfør(p)) return { hva: 'syk', tekst: 'syk – hviler' };
    const h = klokke(tid), pl = planFor(J, F, p), seg = pl.plan.find(q => iSeg(h, q[0], q[1])) || [0, 24, 'fri'];
    let hva = seg[2];
    if (J && J.døgn === false) hva = p.oppgave === 'fri' ? 'fri' : 'arbeid';
    let tekst = hva === 'arbeid' ? `arbeider – ${NAVN(p.oppgave).toLowerCase()}` : hva === 'mat' ? (h >= 16 && h < 20 ? 'spiser middag' : 'spiser') : HVA[hva];
    // fri eller sover, men har en jobb: når arbeidet begynner igjen (så «fri» ikke forveksles med oppgaven «Fri»)
    const neste = hva !== 'arbeid' && J && J.døgn !== false && TYPER.includes(p.oppgave) ? nesteArbeid(pl.plan, h) : null;
    if (neste !== null && hva !== 'mat') tekst += ` – ${NAVN(p.oppgave).toLowerCase()} fra ${String(Math.floor(neste)).padStart(2, '0')}:${String(Math.round((neste % 1) * 60)).padStart(2, '0')}`;
    return { hva, tekst, plan: pl.navn };
  }
  // Når begynner neste arbeidsøkt (time 0–24), eller null
  function nesteArbeid(plan, h) { let best = null, bd = 99; for (const q of plan) if (q[2] === 'arbeid') { const d = ((q[0] - h) % 24 + 24) % 24; if (d > 0 && d < bd) { bd = d; best = q[0]; } } return best; }
  // Faktoren for en produksjonsjobb nå: (summen av ARBEID_K for dem som er i arbeid) / (alle arbeidsføre på jobben).
  // 1 for turnus og kjøkken, for jobber uten folk og når døgnplanen er av. ARBEID_K = 24 / arbeidstimer × dagsverk[skift].
  function faktor(J, F, t, tid) {
    if (!J || J.døgn === false || !PRODUKSJON.includes(t)) return 1;
    const A = F.personer.filter(p => p.oppgave === t && arbeidsfør(p)); if (!A.length) return 1;
    const h = klokke(tid), sk = skift(J, t); let s = 0;
    for (const p of A) { const pl = planFor(J, F, p); const seg = pl.plan.find(q => iSeg(h, q[0], q[1])); if (seg && seg[2] === 'arbeid') s += 24 / timer(pl.plan) * (REGLER.dagsverk[sk] || 1); }
    return s / A.length;
  }
  // Moral fra nattskift: − nattMoral × andelen av gjengen som går nattskift
  function moralTillegg(J, F) {
    if (!J || J.døgn === false || !F || !F.personer.length) return 0;
    const natt = F.personer.filter(p => arbeidsfør(p) && PRODUKSJON.includes(p.oppgave) && planFor(J, F, p).slot === 'natt').length;
    return natt ? -REGLER.nattMoral * natt / F.personer.length : 0;
  }
  // Snittet av faktoren over et døgn (for testene og notatet): 1 = like mye arbeid per døgn som før
  function døgnSnitt(J, F, t, steg = 5) { let s = 0, n = 0; for (let m = 0; m < 1440; m += steg) { s += faktor(J, F, t, m); n++; } return s / n; }

  // ---------- kommandoene (spill/kommando.js) ----------
  // M: { jobber(side) -> J | null, folk(side) -> F | null, endret(side, hva) }. Kommandoene:
  //   jobbPrio { jobb, prio 1–5 } (slår på tavla), jobbAuto { på }, jobbDøgn { på }, jobbSkift { jobb, skift: dag|to|døgn },
  //   jobbLås { person, jobb | null }, jobbUte { person, jobb, ute: true|false }
  function registrerKommandoer(K, M) {
    M = M || {}; const side = c => (c && c.side) || 'blå';
    const J = c => (M.jobber ? M.jobber(side(c)) : null), F = c => (M.folk ? M.folk(side(c)) : null);
    const uten = c => (!J(c) ? 'Jobbtavla er ikke klar.' : null);
    const typ = t => (TYPER.includes(t) ? null : 'Ukjent jobb.');
    const pers = (c, id) => (F(c) && F(c).personer.some(p => p.id === id) ? null : 'Fant ikke personen.');
    const ferdig = (c, hva, svar) => { if (M.endret) M.endret(side(c), hva); return svar; };
    K.registrer('jobbPrio', { leir: true, sjekk: (k, c) => uten(c) || typ(k.jobb) || (!(Number.isInteger(k.prio) && k.prio >= 1 && k.prio <= 5) ? 'Prioriteten må være 1–5.' : null),
      utfør: (k, c) => { const j = J(c), slåPå = !j.auto; j.prio[k.jobb] = k.prio; j.auto = true; return ferdig(c, 'prio', { jobb: k.jobb, prio: k.prio, slåttPå: slåPå }); },
      beskriv: k => `setter prioriteten for ${NAVN(k.jobb).toLowerCase()} til ${k.prio}` });
    K.registrer('jobbAuto', { leir: true, sjekk: (k, c) => uten(c), utfør: (k, c) => { J(c).auto = !!k.på; return ferdig(c, 'auto', { på: J(c).auto }); },
      beskriv: k => (k.på ? 'lar jobbtavla fordele folkene' : 'fordeler folkene selv') });
    K.registrer('jobbDøgn', { leir: true, sjekk: (k, c) => uten(c), utfør: (k, c) => { J(c).døgn = !!k.på; return ferdig(c, 'døgn', { på: J(c).døgn }); },
      beskriv: k => (k.på ? 'slår på døgnplanen' : 'slår av døgnplanen') });
    K.registrer('jobbSkift', { leir: true, sjekk: (k, c) => uten(c) || typ(k.jobb) || (!PRODUKSJON.includes(k.jobb) ? `${NAVN(k.jobb)} går i turnus.` : !SKIFT[k.skift] ? 'Ukjent skift.' : null),
      utfør: (k, c) => { J(c).skift[k.jobb] = k.skift; return ferdig(c, 'skift', { jobb: k.jobb, skift: k.skift }); },
      beskriv: k => `setter ${NAVN(k.jobb).toLowerCase()} på ${SKIFTNAVN[k.skift]}` });
    K.registrer('jobbLås', { leir: true, sjekk: (k, c) => uten(c) || pers(c, k.person) || (k.jobb == null ? null : typ(k.jobb)) || (k.jobb != null && erUte(J(c), k.person, k.jobb) ? 'Personen er utelukket fra den jobben.' : null),
      utfør: (k, c) => { const j = J(c); if (k.jobb == null) delete j.lås[k.person]; else j.lås[k.person] = k.jobb; return ferdig(c, 'lås', { person: k.person, jobb: k.jobb == null ? null : k.jobb }); },
      beskriv: () => 'låser en person til en jobb' });
    K.registrer('jobbUte', { leir: true, sjekk: (k, c) => uten(c) || pers(c, k.person) || typ(k.jobb),
      utfør: (k, c) => { const j = J(c), l = new Set(j.ute[k.person] || []); if (k.ute) l.add(k.jobb); else l.delete(k.jobb);
        if (l.size) j.ute[k.person] = [...l]; else delete j.ute[k.person]; if (k.ute && j.lås[k.person] === k.jobb) delete j.lås[k.person];
        return ferdig(c, 'ute', { person: k.person, jobb: k.jobb, ute: !!k.ute }); },
      beskriv: () => 'utelukker en person fra en jobb' });
    return K;
  }

  const api = { REGLER, TYPER, PRODUKSJON, TURNUS, PLANER, SKIFT, SKIFTNAVN, PLANNAVN, ny, fraJSON, prio, skift, erUte, lag, fordel, bruk, fastManuelt,
    klokke, timer, turnusPlan, planFor, nå, faktor, moralTillegg, døgnSnitt, registrerKommandoer };
  if (NODE) module.exports = api; else rot.Jobber = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
