/* Riksbrudd – EVENTYRET TIL FOTS (natt til 18. nov): det å gå rundt som deg selv er et lite overlevelsesspill.
 * Regler uten DOM (Node: require('./eventyr'); nettleser: globalThis.Eventyr). Visningen: spill/eventyr-visning.js.
 *  TUR: tørst og sult øker med meterne du går – ta med vann (feltflaske) og rasjoner.
 *  SKADER som varer: brukket bein (går sakte) og infeksjon (helsa synker) – fra fall, skudd og kulde.
 *  HÅNDVERK: forbinding, spjelk, felle, armbrøst og bolter av deler du finner i husene.
 *  SNIKING: stilling, mørke, skog, fart og skudd avgjør hvor langt unna fienden oppdager deg.
 *  DEKNING: liggende og bak en vegg tar du mindre skade.
 *  HUND: følger deg og varsler om fiender du ikke ser.
 *  HISTORIE: tre kapitler per bakgrunn, med mål og belønning.
 *  KART: et slør over det ingen av dine har sett (Slør).
 * ALLE TALLENE ER CLAUDES FORSLAG (samlet i REGLER).
 */
(function (rot) {
  'use strict';
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  // Claudes forslag, alt sammen
  const REGLER = {
    // tur: så mange meter til fots for ett poeng tørst/sult (løping tørster dobbelt), utenfor leiren
    tur: { tørstPerM: 1 / 45, sultPerM: 1 / 140, løp: 2, slurk: 35, flaske: 4, pakkRasjoner: 3, tørstVarsel: 45, sultVarsel: 40 },
    // (runde 5) å sove ute uten seng: med sovepose som i et sikret hus, uten den halvt så godt – og om vinteren fryser du (mindre søvn,
    // sulten og litt helse). Hver ekstra feltflaske (lut fra husene) gir flaske-slurker til. Claudes forslag.
    ute: { medPose: 1, utenPose: .5, frysSøvn: .35, frysSult: 20, frysHelse: 10, visUnder: 70 },
    // tilflukt: sove (sekunder, søvn og helse du får), hvor nær du må bli slått ut for å våkne der
    // (runde 2) søvnen spoler klokka: opptil sovTimer spilltimer i 600× (høyst sovSek ekte sekunder), og avbrytes hvis noe skjer
    tilflukt: { sovSek: 45, sovTimer: 6, sovSøvn: 80, sovHelse: 40, vekkAvstand: 300, nær: 1500, helseEtter: 45, lagerKg: 60 },
    // dekning: faktor på skaden du tar
    dekning: { ligg: .5, huk: .8, vegg: .4, veggAvstand: 10,
      // (runde 4) en bakketopp mellom deg og fienden: skaden ×0,15. Øyehøyden din etter stillingen, fienden sikter fra 1,5 m.
      bakke: .15, øye: { stå: 1.6, huk: .9, ligg: .35 }, fiendeØye: 1.5, klaring: .1, prøver: 32 },
    // sniking: grunnavstand (m) der en fiende oppdager deg når du står og går i dagslys
    snik: { grunn: 220, huk: .6, ligg: .35, mørke: .5, skog: .65, stille: .8, løp: 1.4, stilleLøp: 1.15, skudd: 420, skuddStille: .3, skuddSek: 20, opp: .5, ned: .12, glemt: .4, skogTrær: 6 },
    // skader
    skade: { fallFra: 8.5, fallHelse: 6, fallBein: 5, skuddSjanse: .012, skuddMaks: .5, kuldePerTime: .05, leirFart: 4, frost: -8, frostFaktor: 3 },
    // jakt: lenger enn dette fra leiren bærer du kjøttet selv (det som får plass i sekken)
    jakt: { nær: 500 },
    // hunden
    hund: { varsle: 350, igjen: 60, husSjanse: .05, perM: 1 / 2500, sikkertEtter: 800,
      // (runde 4) hunden spiser og kan skades: sulten etter 36 spilltimer eller 30 ekte minutter (det som kommer først), spiser en rasjon
      // (fra leirens mat når dere er i leiren, ellers fra sekken når du gir den), går sin vei etter 12 spilltimer / 10 ekte minutter uten mat.
      // Blir du truffet, kan hunden også bli truffet (sjanse 0,25, skade = 1,5 × tapet ditt); helse 100, gror 6 per spilltime (×4 i leiren).
      sultTimer: 36, sultEkteMin: 30, spisUnder: 40, gårTimer: 12, gårEkteMin: 10, treffSjanse: .25, skade: 1.5, gror: 6, gangFart: 2.6 },
    // fella
    felle: { timer: 6, ekteMin: 5, sjanse: .6, skog: .85, maks: 4, nær: 6 },
    // kartsløret
    slør: { celle: 250, n: 512, lag: 1200, leir: 3000, deg: 700, alfa: .3 },
    stødig: 1.2, hodeskudd: .15,
  };

  // ---------- skader som varer ----------
  const SKADER = {
    bein: { navn: 'Brukket bein', tekst: 'Du går sakte og kan verken løpe eller hoppe.', fart: .5, timer: 48, ekteMin: 20, kur: 'spjelk', kurTekst: 'en spjelk (lages av tøy og tau)' },
    infeksjon: { navn: 'Infeksjon', tekst: 'Helsa synker til såret er behandlet.', helse: 3, timer: 72, ekteMin: 30, kur: 'forbinding', kurTekst: 'førstehjelp' },
  };
  const Skader = {
    LISTE: SKADER,
    // legg til en skade (finnes den, forlenges den ikke): gir true når den er ny
    få(S, id, tid, årsak) { if (!SKADER[id] || S[id]) return false; S[id] = { fra: tid, ekte: 0, årsak: årsak || '' }; return true; },
    // et fall: v = farten du lander med (m/s). Gir { helse, bein } (bein = sjansen for brudd)
    fall(v, seig) { if (!(v > REGLER.skade.fallFra)) return null; const over = v - REGLER.skade.fallFra; return { helse: Math.round(over * REGLER.skade.fallHelse), bein: klem(over / REGLER.skade.fallBein * (seig ? .5 : 1), 0, 1) }; },
    // sjansen for infeksjon når du mister så mye helse av skudd
    skudd: tap => klem(tap * REGLER.skade.skuddSjanse, 0, REGLER.skade.skuddMaks),
    // kulde: sjansen per spilltime ute i vinter eller nedbør (ikke i hus, leir eller tilflukt)
    // temp (°C der du står, valgfri): under REGLER.skade.frost er det farlig uansett årstid
    kulde(timer, vinter, vått, temp) { const frost = temp !== undefined && temp !== null && temp <= REGLER.skade.frost; if (!vinter && !vått && !frost) return 0; return klem(REGLER.skade.kuldePerTime * timer * (vinter && vått ? 2 : 1) * (frost ? REGLER.skade.frostFaktor : 1), 0, 1); },
    // tiden går: t spilltimer og s ekte sekunder. o.leir: du er i leiren (gror fortere), o.sykestue: alt behandles straks, o.seig: bein gror dobbelt så fort
    // Gir { friske: [id], helse: tapet }
    steg(S, t, s, o = {}) { const ut = { friske: [], helse: 0 };
      for (const id of Object.keys(S)) { const D = SKADER[id], q = S[id]; if (!D) { delete S[id]; continue; }
        if (o.sykestue) { delete S[id]; ut.friske.push(id); continue; }
        const f = (o.leir ? REGLER.skade.leirFart : 1) * (id === 'bein' && o.seig ? 2 : 1) * (q.behandlet ? 4 : 1);
        q.timer = (q.timer || 0) + t * f; q.ekte = (q.ekte || 0) + s * f;
        if (q.timer >= D.timer || q.ekte >= D.ekteMin * 60) { delete S[id]; ut.friske.push(id); continue; }
        if (D.helse && !q.behandlet) ut.helse += D.helse * t; }
      return ut; },
    // behandle med tingen fra sekken: bein blir spjelket (går nesten normalt, gror fire ganger så fort), infeksjonen stopper
    behandle(S, id, ting) { const D = SKADER[id]; if (!D || !S[id]) return 'Du har ikke den skaden.'; if (S[id].behandlet) return 'Den er alt behandlet – nå trengs bare tid.'; if (!(ting[D.kur] > 0)) return `Du trenger ${D.kurTekst}.`;
      ting[D.kur]--; if (!ting[D.kur]) delete ting[D.kur]; S[id].behandlet = true; return null; },
    // farten din (1 = vanlig) og om du kan løpe/hoppe
    fart: S => (S.bein ? (S.bein.behandlet ? .8 : SKADER.bein.fart) : 1),
    kanLøpe: S => !S.bein,
    igjen(q, D) { const a = Math.max(q.timer / D.timer, q.ekte / (D.ekteMin * 60)); return klem(1 - a, 0, 1); },
  };

  // ---------- håndverk ----------
  // delene finnes i husene (legges inn i Utstyr.TING av visningen; kan ikke kjøpes)
  const DELER = {
    tøy: { navn: 'Tøy', enhet: 'stk.', vekt: .2, del: true }, tau: { navn: 'Tau', enhet: 'stk.', vekt: .4, del: true }, ståltråd: { navn: 'Ståltråd', enhet: 'stk.', vekt: .3, del: true },
    skrap: { navn: 'Metallskrap', enhet: 'stk.', vekt: .8, del: true }, sprit: { navn: 'Sprit', enhet: 'flasker', vekt: .5, del: true },
  };
  // det du lager og bærer (i tillegg til førstehjelp, som finnes fra før)
  const LAGET = {
    spjelk: { navn: 'Spjelk', enhet: 'stk.', vekt: .6, del: true }, felle: { navn: 'Snarefelle', enhet: 'stk.', vekt: .5, del: true },
    abolt: { navn: 'Armbrøstbolter', enhet: 'stk.', vekt: .05, del: true, pakke: 5 }, vann: { navn: 'Vann i feltflaska', enhet: 'slurker', vekt: .25, del: true, maks: REGLER.tur.flaske },
  };
  // et enkelt våpen du lager selv: stille (fienden hører det nesten ikke), ett skudd om gangen
  const ARMBRØST = { navn: 'Armbrøst', ammo: 'abolt', magasin: 1, takt: .5, lade: 2.6, rekkevidde: 90, skade: .8, bredde: 1, hagl: 1, vekt: 3, pris: 0, selges: false, stille: true, tekst: 'Laget selv. Nesten lydløs' };
  const OPPSKRIFTER = [
    { id: 'forbinding', navn: 'Førstehjelp', tekst: 'Stopper infeksjon og gir 45 helse', trenger: { tøy: 2, sprit: 1 }, gir: { ting: 'forbinding', n: 1 } },
    { id: 'spjelk', navn: 'Spjelk', tekst: 'Til et brukket bein', trenger: { tøy: 1, tau: 1 }, gir: { ting: 'spjelk', n: 1 } },
    { id: 'felle', navn: 'Snarefelle', tekst: 'Settes ut i terrenget og gir mat etter noen timer', trenger: { ståltråd: 1, tau: 1 }, gir: { ting: 'felle', n: 1 } },
    { id: 'armbrøst', navn: 'Armbrøst', tekst: 'Et stille våpen på kort hold', trenger: { skrap: 2, tau: 1, ståltråd: 1 }, gir: { våpen: 'armbrøst' } },
    { id: 'abolt', navn: 'Fem bolter', tekst: 'Ammunisjon til armbrøsten', trenger: { skrap: 1, tøy: 1 }, gir: { ting: 'abolt', n: 5 } },
  ];
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  // hva slags deler som ligger i hvilke bygg (vekter)
  const DELER_I = { hus: { tøy: 3, sprit: 2, tau: 1, ståltråd: 1 }, hytte: { tau: 3, tøy: 2, ståltråd: 2, sprit: 1 }, leil: { tøy: 3, sprit: 2 }, uthus: { tau: 2, ståltråd: 3, skrap: 3 }, låve: { tau: 3, ståltråd: 3, skrap: 2 },
    butikk: { tøy: 2, sprit: 3, tau: 2 }, kontor: { tøy: 1, sprit: 1 }, skole: { tøy: 2, tau: 1 }, sykehus: { sprit: 4, tøy: 3 }, industri: { skrap: 4, ståltråd: 3, tau: 1 }, lager: { skrap: 3, tau: 2, ståltråd: 2 }, hangar: { skrap: 4, ståltråd: 2 } };
  const Handverk = {
    DELER, LAGET, ARMBRØST, OPPSKRIFTER,
    oppskrift: id => OPPSKRIFTER.find(o => o.id === id) || null,
    // mangler du noe? gir null eller teksten
    mangler(ting, id) { const o = Handverk.oppskrift(id); if (!o) return 'Ukjent oppskrift.'; const m = Object.entries(o.trenger).filter(([d, n]) => (ting[d] || 0) < n).map(([d, n]) => `${n - (ting[d] || 0)} ${DELER[d].navn.toLowerCase()}`); return m.length ? 'Mangler ' + m.join(' og ') + '.' : null; },
    // lag tingen: trekker delene. Gir { feil } eller oppskriftens «gir» (visningen legger det i sekken)
    lag(ting, id) { const feil = Handverk.mangler(ting, id); if (feil) return { feil }; const o = Handverk.oppskrift(id); for (const [d, n] of Object.entries(o.trenger)) { ting[d] -= n; if (!ting[d]) delete ting[d]; } return { ...o.gir }; },
    // DELER I ET HUS (fast per bygg): ca. sju av ti hus har én til tre deler; dobbelt = ferdigheten «Finner alt»
    funn(kl, i, dobbelt) { const V = DELER_I[kl] || DELER_I.hus, ut = {}; if (hash(i, 11) > .7) return ut; const n = 1 + Math.floor(hash(i, 12) * 3), sum = Object.values(V).reduce((a, b) => a + b, 0);
      for (let k = 0; k < n; k++) { let r = hash(i, 20 + k) * sum; for (const [d, v] of Object.entries(V)) { r -= v; if (r <= 0) { ut[d] = (ut[d] || 0) + (dobbelt ? 2 : 1); break; } } }
      return ut; },
    tekst(f) { const d = Object.entries(f).filter(([, n]) => n > 0).map(([id, n]) => `${n} ${DELER[id].navn.toLowerCase()}`); return d.length ? 'Deler til håndverk: ' + d.join(', ') + '.' : ''; },
    // «Trent øye» (leting nivå 3): hva huset trolig inneholder, fra det leteregelen ville gitt (f = Leting.funn)
    trolig(f) { if (!f || f.tomt) return 'ser tomt ut'; const N = { mat: 'mat', tre: 'trevirke', betong: 'betong', stål: 'stål', diesel: 'diesel', penger: 'penger' }, v = { mat: 1, tre: 8, betong: 8, stål: 20, diesel: .5, penger: 1 / 4000 };
      const d = Object.keys(N).filter(k => f[k] > 0).sort((a, b) => f[b] * v[b] - f[a] * v[a]).slice(0, 2).map(k => N[k]); return d.length ? 'trolig ' + d.join(' og ') : 'ser tomt ut'; },
  };

  // ---------- fella ----------
  const Felle = {
    // er det noe i fella? null = ikke klar ennå, ellers antall rasjoner (0 = tom, fella er brukt opp)
    sjekk(f, tid, ekte, r1, r2) { const klar = (tid - f.tid) / 60 >= REGLER.felle.timer || ekte - f.ekte >= REGLER.felle.ekteMin * 60; if (!klar) return null; return r1 < (f.skog ? REGLER.felle.skog : REGLER.felle.sjanse) ? 1 + (r2 < .35 ? 1 : 0) : 0; },
    igjen(f, tid, ekte) { return klem(Math.max((tid - f.tid) / 60 / REGLER.felle.timer, (ekte - f.ekte) / (REGLER.felle.ekteMin * 60)), 0, 1); },
  };

  // ---------- sniking og dekning ----------
  const Snik = {
    // avstanden (m) der en fiende begynner å legge merke til deg
    // o: { stilling 'stå'|'huk'|'ligg', mørke 0–1, skog, fart m/s, løper, stilleLøp, skuddSiden (s siden du skjøt, eller null), stilleVåpen }
    rekkevidde(o) { const S = REGLER.snik; let r = S.grunn * (o.stilling === 'ligg' ? S.ligg : o.stilling === 'huk' ? S.huk : 1) * (1 - S.mørke * klem(o.mørke || 0, 0, 1)) * (o.skog ? S.skog : 1);
      r *= o.løper ? (o.stilleLøp ? S.stilleLøp : S.løp) : (o.fart || 0) < .2 ? S.stille : 1;
      if (o.skuddSiden !== null && o.skuddSiden !== undefined && o.skuddSiden < S.skuddSek) r = Math.max(r, S.skudd * (o.stilleVåpen ? S.skuddStille : 1));
      return r; },
    // ett steg for én fiende: nivå 0–1 (1 = sett). Nær går det fortere. Gir det nye nivået.
    steg(nivå, avst, rekk, dt) { const S = REGLER.snik; return klem(avst < rekk ? nivå + dt * S.opp * (1 + 2 * (1 - avst / rekk)) : nivå - dt * S.ned, 0, 1); },
    // sett-flagget med treghet: sett på 1, glemt igjen under REGLER.snik.glemt
    sett: (var_, nivå) => (nivå >= 1 ? true : nivå < REGLER.snik.glemt ? false : !!var_),
    ord: n => (n >= 1 ? 'Sett' : n > .05 ? 'Mistenkt' : 'Skjult'),
    // dekningen: faktor på skaden fra én fiende
    dekning(stilling, vegg, bakke) { const D = REGLER.dekning; return (stilling === 'ligg' ? D.ligg : stilling === 'huk' ? D.huk : 1) * (vegg ? D.vegg : 1) * (bakke ? D.bakke : 1); },
    // ligger terrenget i veien? h = høyder langs linja fra deg (h[0]) til fienden (h[n−1]), likt fordelt. Sant når et punkt imellom
    // (ikke de ytterste 5 %) stikker opp over siktelinja fra øyet ditt (h[0] + øye) til fiendens øye (h[n−1] + fiendeØye).
    bakkeImellom(h, øye) { const D = REGLER.dekning, n = h.length; if (n < 3) return false; const a = h[0] + øye, b = h[n - 1] + D.fiendeØye;
      for (let i = 1; i < n - 1; i++) { const t = i / (n - 1); if (t < .05 || t > .95) continue; if (h[i] > a + (b - a) * t - D.klaring) return true; } return false; },
  };

  // ---------- hunden ----------
  const RETNING = ['nord', 'nordøst', 'øst', 'sørøst', 'sør', 'sørvest', 'vest', 'nordvest'];
  const Hund = {
    NAVN: ['Bamse', 'Tinka', 'Rex', 'Luna', 'Balder', 'Frøya', 'Passop', 'Mira'],
    retning: (dx, dy) => RETNING[((Math.round(Math.atan2(dx, dy) / (Math.PI / 4)) % 8) + 8) % 8],
    // fiender hunden varsler om nå: nær nok, ikke sett av dine, og ikke varslet om nylig. varslet: { id: sekund }
    varsler(fiender, varslet, nå) { const ut = []; for (const f of fiender) { if (f.avst > REGLER.hund.varsle || f.synlig) continue; if (varslet[f.id] !== undefined && nå - varslet[f.id] < REGLER.hund.igjen) continue; varslet[f.id] = nå; ut.push({ id: f.id, tekst: `knurrer mot ${Hund.retning(f.dx, f.dy)} – noen er ${f.avst < 150 ? 'nær' : 'der ute'}` }); } return ut; },
    // dukker det opp en hund? gått = meter siden sist du lette, r = tilfeldig tall for de siste d meterne
    kommer: (gått, d, r, sikkert) => (sikkert && gått >= REGLER.hund.sikkertEtter) || r < d * REGLER.hund.perM,
    iHus: i => hash(i, 31) < REGLER.hund.husSjanse,
    // (runde 4) en ny hund: mett og frisk. Gamle lagringer får feltene når de leses (fyll).
    fyll: H => { if (!H) return H; if (typeof H.mett !== 'number') H.mett = 100; if (typeof H.hp !== 'number') H.hp = 100; if (typeof H.sulten !== 'number') H.sulten = 0; return H; },
    // tiden går: t spilltimer, s ekte sekunder. o.leir: i leiren (gror fortere), o.mat(): spis en rasjon fra leiren (gir true når det gikk).
    // Gir { spiste, sulten (nettopp blitt sulten), går (gir opp og går), hp }
    steg(H, t, s, o = {}) { const R = REGLER.hund, ut = { spiste: false, sulten: false, går: false }; Hund.fyll(H);
      const tap = Math.max(t / R.sultTimer, s / (R.sultEkteMin * 60)) * 100, før = H.mett; H.mett = Math.max(0, H.mett - tap);
      if (H.mett < R.spisUnder && o.leir && o.mat && o.mat()) { H.mett = 100; H.sulten = 0; ut.spiste = true; }
      if (før >= R.spisUnder && H.mett < R.spisUnder && !ut.spiste) ut.sulten = true;
      if (H.mett <= 0) { H.sulten += Math.max(t / R.gårTimer, s / (R.gårEkteMin * 60)); if (H.sulten >= 1) ut.går = true; } else H.sulten = 0;
      if (H.hp < 100) H.hp = Math.min(100, H.hp + R.gror * t * (o.leir ? 4 : 1));
      ut.hp = H.hp; return ut; },
    // gi hunden en rasjon fra sekken
    mat: (H, ting) => { if (!H) return 'Du har ingen hund.'; if (!(ting.rasjon > 0)) return 'Du har ingen rasjoner å gi hunden.'; ting.rasjon--; if (!ting.rasjon) delete ting.rasjon; Hund.fyll(H); H.mett = 100; H.sulten = 0; return null; },
    // du ble truffet (tap = helsa du mistet): blir hunden truffet også? r = tilfeldig tall. Gir skaden (0 = ikke truffet).
    truffet: (H, tap, r) => (H && tap > 0 && r < REGLER.hund.treffSjanse ? Math.round(tap * REGLER.hund.skade * 10) / 10 : 0),
    // ordet for hvordan hunden har det
    tilstand: H => { Hund.fyll(H); return H.hp < 35 ? 'hardt skadet' : H.hp < 80 ? 'skadet' : H.mett < REGLER.hund.spisUnder ? 'sulten' : 'i fin form'; },
  };

  // ---------- historien: tre kapitler per bakgrunn ----------
  // mål: { slag, n } der slag er en teller (se TELLERE). Belønning: penger, ting { id: n }, ferdighet [id, poeng].
  const TELLERE = { gått: 'meter til fots', hus: 'hus gjennomsøkt', tilflukt: 'tilfluktssteder', felt: 'fiender du selv slo ut', laget: 'ting du har laget', fangst: 'fangster i feller', hund: 'hund', oppdaget: 'km² oppdaget', sovet: 'netter i tilflukt' };
  const KAPITLER = {
    soldat: [
      { tittel: 'Gamle vaner', tekst: 'Du var soldat før alt raknet. Kroppen husker patruljen. Gå en runde til fots og bli kjent med lendet rundt leiren.', mål: { slag: 'gått', n: 1500 }, belønning: { ting: { a556: 60 } }, etter: 'Beina bærer deg fortsatt. I sekken fra den gamle tjenesten lå det mer ammunisjon enn du husket.' },
      { tittel: 'Et sted å falle tilbake til', tekst: 'En soldat har alltid en retrettvei. Sikre et hus utenfor leiren som tilfluktssted.', mål: { slag: 'tilflukt', n: 1 }, belønning: { penger: 500000 }, etter: 'Nå har du et sted å trekke deg tilbake til. Under gulvet i huset lå en konvolutt med kontanter.' },
      { tittel: 'Første ild', tekst: 'Før eller siden må du slåss selv. Slå ut tre fiender med ditt eget våpen.', mål: { slag: 'felt', n: 3 }, belønning: { ferdighet: ['skyting', 250] }, etter: 'Hendene var rolige. Det gamle håndlaget er tilbake.' },
    ],
    lege: [
      { tittel: 'Feltapoteket', tekst: 'Uten apotek må du lage det du trenger. Lag to ting av det du finner i husene (se «Lag noe»).', mål: { slag: 'laget', n: 2 }, belønning: { ting: { forbinding: 2 } }, etter: 'Du har ikke glemt hvordan man klarer seg med lite. Legekofferten din er litt fullere.' },
      { tittel: 'Sykebesøk', tekst: 'Folk gjemmer seg fortsatt i husene. Let gjennom fem hus – kanskje noen trenger en lege.', mål: { slag: 'hus', n: 5 }, belønning: { penger: 400000 }, etter: 'I et medisinskap fant du noe gjengen kan selge dyrt.' },
      { tittel: 'Hvile er også medisin', tekst: 'Du sier det til alle pasienter. Sov en natt i et tilfluktssted.', mål: { slag: 'sovet', n: 1 }, belønning: { ferdighet: ['utholdenhet', 250] }, etter: 'Du våkner klar i hodet for første gang på lenge.' },
    ],
    ingeniør: [
      { tittel: 'Skrot er gull', tekst: 'En ingeniør ser deler der andre ser søppel. Let gjennom tre hus.', mål: { slag: 'hus', n: 3 }, belønning: { ting: { skrap: 2, ståltråd: 2, tau: 2 } }, etter: 'Du tok med deg en haug nyttige deler de andre gikk rett forbi.' },
      { tittel: 'Fangstteknikk', tekst: 'Bygg en snarefelle, sett den ut og få fangst.', mål: { slag: 'fangst', n: 1 }, belønning: { ferdighet: ['leting', 250] }, etter: 'En enkel mekanisme, og den virker. Du ser muligheter overalt nå.' },
      { tittel: 'Landmåleren', tekst: 'Et godt kart er halve jobben. Oppdag 40 km² av kartet (du, lagene dine og leiren ser).', mål: { slag: 'oppdaget', n: 40 }, belønning: { penger: 800000 }, etter: 'Kartet ditt er verdt penger for andre gjenger også.' },
    ],
    bonde: [
      { tittel: 'Kjenne marka', tekst: 'En bonde går over jorda si. Gå to kilometer til fots.', mål: { slag: 'gått', n: 2000 }, belønning: { ting: { rasjon: 4 } }, etter: 'Du vet hvor bærene står og hvor viltet går. Nista ble fylt på veien.' },
      { tittel: 'Mat fra skogen', tekst: 'Sett ut snarefeller og få fangst to ganger.', mål: { slag: 'fangst', n: 2 }, belønning: { penger: 400000 }, etter: 'Fersk mat er god byttevare.' },
      { tittel: 'Gårdshunden', tekst: 'En gård uten hund er ingen gård. Finn en hund som vil følge deg (ha en rasjon i sekken når du går ute).', mål: { slag: 'hund', n: 1 }, belønning: { ferdighet: ['utholdenhet', 250] }, etter: 'Hunden holder deg i form.' },
    ],
    forretningsmann: [
      { tittel: 'Varetelling', tekst: 'Alt som står tomt, er varelager. Let gjennom fire hus.', mål: { slag: 'hus', n: 4 }, belønning: { penger: 600000 }, etter: 'Du fant ting de andre ikke visste var verdt noe.' },
      { tittel: 'Filialer', tekst: 'Man legger ikke alle egg i én kurv. Sikre to tilfluktssteder.', mål: { slag: 'tilflukt', n: 2 }, belønning: { ting: { forbinding: 1, rasjon: 3 } }, etter: 'To trygge adresser. Du la et lite lager i hvert.' },
      { tittel: 'Markedsoversikt', tekst: 'Den som kjenner området, vinner handelen. Oppdag 60 km² av kartet.', mål: { slag: 'oppdaget', n: 60 }, belønning: { penger: 1500000 }, etter: 'Nå vet du hvor alt ligger. Det betaler seg.' },
    ],
    politi: [
      { tittel: 'Runden', tekst: 'En politimann går runden sin. Gå to og en halv kilometer til fots.', mål: { slag: 'gått', n: 2500 }, belønning: { ting: { a9: 60 } }, etter: 'Du kjenner gatene igjen. I den gamle tjenestebilen lå det ammunisjon.' },
      { tittel: 'Tjenestehunden', tekst: 'Du savner makkeren på fire bein. Finn en hund som vil følge deg (ha en rasjon i sekken når du går ute).', mål: { slag: 'hund', n: 1 }, belønning: { ferdighet: ['leting', 250] }, etter: 'Med hund finner du mer.' },
      { tittel: 'Ro og orden', tekst: 'Røverne tar det de vil. Slå ut fire fiender med ditt eget våpen.', mål: { slag: 'felt', n: 4 }, belønning: { penger: 1000000 }, etter: 'Folk i området har samlet inn en takk.' },
    ],
  };
  const Historie = {
    KAPITLER, TELLERE,
    ny: () => ({ kap: 0, fra: 0 }),
    kapittel(bakgrunn, H) { const L = KAPITLER[bakgrunn] || KAPITLER.soldat; return H.kap < L.length ? L[H.kap] : null; },
    antall: bakgrunn => (KAPITLER[bakgrunn] || KAPITLER.soldat).length,
    // hvor langt du er: { nå, mål, andel, ferdig }. H.fra = tellerens verdi da kapittelet begynte (tilflukt og hund teller det du HAR)
    framgang(bakgrunn, H, T) { const k = Historie.kapittel(bakgrunn, H); if (!k) return null; const har = k.mål.slag === 'tilflukt' || k.mål.slag === 'hund', nå = Math.max(0, (T[k.mål.slag] || 0) - (har ? 0 : H.fra || 0)); return { nå: Math.min(nå, k.mål.n), mål: k.mål.n, andel: klem(nå / k.mål.n, 0, 1), ferdig: nå >= k.mål.n }; },
    // gå til neste kapittel: gir det fullførte kapittelet (belønningen deler visningen ut), eller null
    fullfør(bakgrunn, H, T) { const f = Historie.framgang(bakgrunn, H, T); if (!f || !f.ferdig) return null; const k = Historie.kapittel(bakgrunn, H); H.kap++; const n = Historie.kapittel(bakgrunn, H); H.fra = n ? T[n.mål.slag] || 0 : 0; return k; },
    belønning(b) { const d = []; if (b.penger) d.push(`${Math.round(b.penger / 1000)} 000 kr`); if (b.ting) for (const [id, n] of Object.entries(b.ting)) d.push(`${n} ${id}`); if (b.ferdighet) d.push(`et løft i ferdigheten ${b.ferdighet[0]}`); return d.join(', '); },
  };

  // ---------- kartsløret: det ingen av dine har sett ----------
  // Et rutenett på n × n celler rundt leiren (ett bit per celle). Utenfor rutenettet er alt uoppdaget.
  const Slør = {
    ny(leirX, leirY) { const S = REGLER.slør; return { x0: Math.round(leirX - S.n * S.celle / 2), y0: Math.round(leirY - S.n * S.celle / 2), n: S.n, celle: S.celle, bit: new Uint8Array(S.n * S.n / 8), antall: 0 }; },
    sett(M, x, y) { const i = Math.floor((x - M.x0) / M.celle), j = Math.floor((y - M.y0) / M.celle); if (i < 0 || j < 0 || i >= M.n || j >= M.n) return false; const k = j * M.n + i; return !!(M.bit[k >> 3] & (1 << (k & 7))); },
    // merk alt innen radius r som sett: gir cellene som er nye [[i, j]]
    merk(M, x, y, r) { const ny = [], c = M.celle, i0 = Math.floor((x - r - M.x0) / c), i1 = Math.floor((x + r - M.x0) / c), j0 = Math.floor((y - r - M.y0) / c), j1 = Math.floor((y + r - M.y0) / c);
      for (let j = Math.max(0, j0); j <= Math.min(M.n - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(M.n - 1, i1); i++) { const mx = M.x0 + (i + .5) * c - x, my = M.y0 + (j + .5) * c - y; if (mx * mx + my * my > (r + c * .5) * (r + c * .5)) continue;
        const k = j * M.n + i; if (!(M.bit[k >> 3] & (1 << (k & 7)))) { M.bit[k >> 3] |= 1 << (k & 7); M.antall++; ny.push([i, j]); } }
      return ny; },
    km2: M => M.antall * M.celle * M.celle / 1e6,
    // lagring: lengden på annenhver rekke av usette og sette celler, i grunntall 36
    tilTekst(M) { const ut = []; let v = 0, n = 0; for (let k = 0; k < M.n * M.n; k++) { const b = (M.bit[k >> 3] >> (k & 7)) & 1; if (b === v) n++; else { ut.push(n.toString(36)); v = b; n = 1; } } ut.push(n.toString(36)); return ut.join('.'); },
    fraTekst(M, t) { let k = 0, v = 0; M.bit.fill(0); M.antall = 0; for (const d of String(t || '').split('.')) { const n = parseInt(d, 36); if (!(n >= 0)) break; if (v) for (let q = k; q < Math.min(k + n, M.n * M.n); q++) { M.bit[q >> 3] |= 1 << (q & 7); M.antall++; } k += n; v ^= 1; if (k >= M.n * M.n) break; } return M; },
  };

  // ---------- turen: behovene øker med meterne ----------
  const Tur = {
    // d meter til fots utenfor leiren: gir { tørst, sult } som skal trekkes fra behovene
    slit(d, løper, lettTilBeins) { const T = REGLER.tur; return { tørst: d * T.tørstPerM * (løper && !lettTilBeins ? T.løp : 1), sult: d * T.sultPerM }; },
    // drikk en slurk av flaska: gir tørsten du får tilbake (0 når flaska er tom)
    drikk(ting) { if (!(ting.vann > 0)) return 0; ting.vann--; if (!ting.vann) delete ting.vann; return REGLER.tur.slurk; },
    // søvn: andelen av en hel natt (0–1) gir søvn og helse
    søvn: andel => ({ søvn: Math.round(REGLER.tilflukt.sovSøvn * klem(andel, 0, 1)), helse: Math.round(REGLER.tilflukt.sovHelse * klem(andel, 0, 1)) }),
    // kjøtt fra et felt dyr: så mange rasjoner du får med (plass i sekken), resten blir liggende
    kjøtt: (rasjoner, plass) => ({ med: Math.max(0, Math.min(rasjoner, plass)), igjen: Math.max(0, rasjoner - Math.max(0, plass)) }),
    // slurker flaskene rommer: den du har fra start pluss hver feltflaske i sekken
    maks: ting => REGLER.tur.flaske * (1 + Math.max(0, Math.floor((ting && ting.feltflaske) || 0))),
    fyll(ting) { const før = ting.vann || 0, m = Tur.maks(ting); ting.vann = Math.max(før, m); return Math.max(0, m - før); },
    // en natt ute: andelen av natta, om du har sovepose, og om det er vinter -> { søvn, helse, sult, frøs }
    ute(andel, pose, vinter) { const U = REGLER.ute, g = Tur.søvn(andel), frøs = !!vinter && !pose, k = frøs ? U.frysSøvn : pose ? U.medPose : U.utenPose;
      return { søvn: Math.round(g.søvn * k), helse: frøs ? -Math.round(U.frysHelse * klem(andel, 0, 1)) : Math.round(g.helse * k), sult: frøs ? Math.round(U.frysSult * klem(andel, 0, 1)) : 0, frøs }; },
  };

  // ---------- tilfluktslageret ----------
  const Lager = {
    ny: () => ({ ting: {}, våpen: [] }),
    vekt(L, TING, VÅPEN) { return Object.entries(L.ting).reduce((s, [id, n]) => s + (TING[id] ? TING[id].vekt * n : 0), 0) + L.våpen.reduce((s, v) => s + (VÅPEN[v.id] ? VÅPEN[v.id].vekt : 0), 0); },
    // legg n av en ting fra sekken (fra) til lageret (til) eller motsatt: gir antallet som ble flyttet
    flytt(fra, til, id, n) { const t = Math.min(Math.floor(n), fra[id] || 0); if (!(t > 0)) return 0; fra[id] -= t; if (!fra[id]) delete fra[id]; til[id] = (til[id] || 0) + t; return t; },
  };

  const api = { REGLER, Skader, Handverk, Felle, Snik, Hund, Historie, Slør, Tur, Lager };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Eventyr = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
