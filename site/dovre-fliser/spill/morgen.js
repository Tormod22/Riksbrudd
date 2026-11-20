/* Riksbrudd – MORGENMØTET (runde 8, 20. nov natt, pakke «morgen»). Kritiker C: «Jeg følte at spillet spilte seg selv: hogst, frakt, mat
 * og forsvar går av seg selv, og jeg hadde lite å avgjøre de første døgnene.»
 *  1. Hver morgen kl. 06 (sammen med dagboka og døgnoppgjøret) får du et kort med 2–3 valg for dagen, ut fra det som faktisk står på i leiren:
 *     lite mat -> jakt og fiske / kjøp mat / halve rasjoner; røvere ventes -> dobbel vakt i natt; lite penger -> selg tre / et risikabelt
 *     oppdrag; godt med folk -> en speidertur; lav moral -> fridag; ellers ekstra skift. Hvert valg sier hva det koster og hva det gir.
 *     Neste morgen står det på kortet hvordan det gikk («I går: jakta ga 13 rasjoner»).
 *  2. Noen dager (fra dag 2, så hver tredje dag) kommer også én større beslutning på samme kort: et nabogårdsfolk vil bli med, en forlatt
 *     tankbil (et lite oppdrag i kartet), røvere som vil ha betalt for å la dere være, eller en handelskaravane.
 * Reglene her er uten DOM (Node: require('./morgen'); nettleser: globalThis.Morgen) – test: pipeline/fliser/test_morgen.js.
 * Visningen (kortet, virkningene på folk, lager, kasse og angrep) ligger i spill/morgen-visning.js. Alle tall er Claudes forslag.
 */
(function (rot) {
  'use strict';
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  const des = (v, n = 1) => (Math.round(v * 10 ** n) / 10 ** n).toFixed(n).replace('.', ',').replace(/,0+$/, '');
  const kr = v => { const a = Math.abs(Math.round(v)); return (v < 0 ? '−' : '') + (a >= 1e6 ? des(a / 1e6) + ' mill. kr' : a >= 1000 ? Math.round(a / 1000).toLocaleString('nb-NO') + ' 000 kr' : a + ' kr'); };
  const mellom = (r, [a, b]) => a + r() * (b - a);

  // ---------- TALLENE (alle er Claudes forslag) ----------
  const REGLER = {
    // når et behov «står på»: mat til under matDøgn døgn, røvere ventet innen røverTimer spilltimer, kassa under litePenger kr,
    // minst folkNok arbeidsføre for en speidertur, moral under lavMoral / over godMoral
    matDøgn: 3, røverTimer: 20, litePenger: 12e6, folkNok: 6, lavMoral: 45, godMoral: 62,
    // folk som er borte en dag (jakt, speidertur, leie ut, tankbil til fots): så mange personer
    borte: 2,
    // jakt og fiske: rasjoner per person (ganger ferdigheten i hogst, og årstiden), og sjansen for at én blir skadet (helsa ned)
    jakt: { per: [4, 8], årstid: { vinter: .6, vår: .9, sommer: 1.1, høst: 1.2 }, skade: .1, helse: .3 },
    // kjøp mat: så mange rasjoner (prisen er markedsprisen)
    kjøp: 20,
    // halve rasjoner: forbruket ganges med mat, moralen får tillegg (en dag)
    rasjon: { mat: .6, moral: -12 },
    // dobbel vakt: så mange ekstra på vakt til neste morgen; lagene innen radius m fra leiren treffer ild ganger så ofte;
    // neste dag er folk slitne (moral og tempo)
    vakt: { ekstra: 2, radius: 450, ild: 1.2, slitenMoral: -8, slitenTempo: .9 },
    // selg tre: så mye av treet på lageret (høyst maks m³), minst min m³ for at valget kommer
    selg: { andel: .5, maks: 20, min: 4 },
    // lei ut to som vakter til en nabogård (risikabelt): betaling, sjansen for at én blir såret og for at én ikke kommer tilbake
    leie: { penger: [8e5, 1.6e6], såret: .3, helse: .45, borte: .06 },
    // speidertur: det de finner, sjansen for skade
    speid: { tre: [1, 4], stål: [0, 1.2], mat: [2, 7], skade: .08, helse: .3 },
    // fridag for alle / ekstra skift: tempo og moral (en dag)
    fri: { tempo: .5, moral: 12 }, skift: { tempo: 1.25, moral: -10 },
    // den store beslutningen: første dag, så hver «hver» dag
    stor: { første: 2, hver: 3 },
    // nabogården: så mange folk og så mye mat de har med; avvist gir moral
    nabo: { folk: 4, mat: 8, avvistMoral: -3 },
    // tankbilen: avstand (m), diesel (l), frist (spillminutter), sjansen for røvere ved bilen (lag), og til fots: sjansen for at de får med noe
    tankbil: { avst: [2400, 3400], diesel: [600, 1000], frist: 2 * 1440, røvere: .35, røverMenn: 4, fots: { lykkes: .55, diesel: [250, 450], skade: .25, helse: .35 } },
    // beskyttelse: prisen (fast + per bølge), utsettelsen av neste bølge (spillminutter, og ekte minutter med spilling – bølgene kommer
    // også etter ekte tid), moral når dere nekter
    vern: { fast: 1.5e6, perBølge: 5e5, utsett: 1440, utsettEkte: 20, nektMoral: 3 },
    // handelskaravanen: pakken (diesel l, mat) til «rabatt» av markedsprisen; kjøper tre (m³) til «tre» ganger salgsprisen
    karavane: { diesel: 500, mat: 30, rabatt: .7, tre: 15, trePris: 1.3 },
  };

  // ---------- DAGENS VALG ----------
  // s (det som står på i leiren – visningen fyller det ut): { dag, folk, arbeidsføre, frie, mat, matDøgn, moral, penger, matPris, trePris
  //   (salgspris per m³), lager: { tre }, diesel, dieselPlass, røverTimer (spilltimer til neste bølge, 0 = pågår, null = ukjent),
  //   bølge, post (et ledig oppdrag «Ta en røverpost»: { id, gir, meter, retning } eller null), sted (navn på nærmeste tettsted), årstid }
  // Gir [{ id, t (knappen), følge (hva det koster og gir), vekt }] – 2 eller 3 valg, de viktigste først.
  function dagensValg(s, rng = Math.random) {
    const R = REGLER, ut = [], kan = s.arbeidsføre >= R.borte + 2, legg = (vekt, v) => ut.push({ vekt: vekt + rng() * .01, ...v });
    const matKr = Math.round((s.matPris || 3000) * R.kjøp);
    if (s.folk > 0 && s.matDøgn < R.matDøgn) {
      const hast = 3 - s.matDøgn;
      if (kan) legg(5 + hast, { id: 'jakt', t: 'Send to på jakt og fiske', følge: `To er borte i dag og arbeider ikke. I morgen har de med seg mat (ca. ${R.jakt.per[0] * 2}–${R.jakt.per[1] * 2} rasjoner). Liten fare for at én skader seg.` });
      if (s.penger >= matKr) legg(4 + hast, { id: 'kjøp', t: `Kjøp ${R.kjøp} rasjoner (${kr(matKr)})`, følge: `Maten kommer i dag. Kassa går ned med ${kr(matKr)}.`, pris: matKr });
      legg(3 + hast, { id: 'rasjon', t: 'Halve rasjoner i dag', følge: `Maten rekker lenger (${Math.round((1 - R.rasjon.mat) * 100)} % mindre forbruk i dag), men folk blir sure (moral ${R.rasjon.moral} i dag).` });
    }
    if (s.røverTimer !== null && s.røverTimer !== undefined && s.røverTimer <= R.røverTimer && s.folk >= 3)
      legg(s.røverTimer <= 0 ? 9 : 7, { id: 'vakt', t: 'Dobbel vakt i natt (folk blir slitne)', følge: `${R.vakt.ekstra} til går på vakt til i morgen tidlig: vaktene ser røverne tidligere, og lagene ved leiren treffer bedre. I morgen er folk slitne (moral ${R.vakt.slitenMoral}, litt saktere arbeid).` });
    if (s.penger < R.litePenger) {
      const tre = Math.min(R.selg.maks, Math.floor((s.lager && s.lager.tre || 0) * R.selg.andel));
      if (tre >= R.selg.min) legg(6, { id: 'selg', t: `Selg ${tre} m³ tre (ca. ${kr(tre * (s.trePris || 0))})`, følge: 'Penger i kassa nå. Mindre tre til bygging og ved.', mengde: tre });
      if (s.post) legg(5.5, { id: 'post', t: `Ta et risikabelt oppdrag: røverposten (${kr(s.post.gir)})`, følge: `Røverposten ${s.post.meter >= 1000 ? des(s.post.meter / 1000) + ' km' : Math.round(s.post.meter / 10) * 10 + ' m'} mot ${s.post.retning} kommer i kartet. Send en tropp dit: farlig, men godt betalt.`, oppdrag: s.post.id });
      else if (kan) legg(5, { id: 'leie', t: 'Lei ut to som vakter til en nabogård', følge: `To er borte i dag. I morgen: ${kr(R.leie.penger[0])}–${kr(R.leie.penger[1])} – men omtrent hver tredje gang kommer en av dem såret hjem, og en sjelden gang ikke i det hele tatt.` });
    }
    if (kan && s.arbeidsføre >= R.folkNok) legg(3, { id: 'speid', t: s.sted ? `Send to på speidertur mot ${s.sted}` : 'Send to på speidertur rundt leiren', sted: s.sted || null, følge: 'To er borte i dag. I morgen melder de når røverne kommer neste gang, og tar med det de finner av mat og materialer.' });
    if (s.folk > 0 && s.moral < R.lavMoral) legg(4 + (R.lavMoral - s.moral) / 10, { id: 'fri', t: 'Fridag for alle', følge: `Moralen stiger (+${R.fri.moral} i dag), men alt arbeid går halvt så fort i dag.` });
    if (s.folk > 0 && s.moral >= R.godMoral) legg(2, { id: 'skift', t: 'Ekstra skift i dag', følge: `Alt arbeid går ${Math.round((R.skift.tempo - 1) * 100)} % raskere i dag, men folk blir slitne (moral ${R.skift.moral} i dag).` });
    // for få: fyll på med fridag/ekstra skift (det som passer moralen)
    if (ut.length < 2 && s.folk > 0) { if (!ut.some(v => v.id === 'skift') && s.moral >= R.lavMoral) legg(1, { id: 'skift', t: 'Ekstra skift i dag', følge: `Alt arbeid går ${Math.round((R.skift.tempo - 1) * 100)} % raskere i dag, men folk blir slitne (moral ${R.skift.moral} i dag).` });
      if (!ut.some(v => v.id === 'fri')) legg(.5, { id: 'fri', t: 'Fridag for alle', følge: `Moralen stiger (+${R.fri.moral} i dag), men alt arbeid går halvt så fort i dag.` }); }
    return ut.sort((a, b) => b.vekt - a.vekt).slice(0, 3);
  }

  // ---------- DEN STORE BESLUTNINGEN (noen dager) ----------
  const erStorDag = (dag, sist) => dag >= REGLER.stor.første && (sist === null || sist === undefined || dag - sist >= REGLER.stor.hver);
  // s som over, pluss dieselPris (kr/l). sist = id-en på den forrige (kommer ikke to ganger på rad). Gir { id, tittel, tekst, valg } eller null.
  function storBeslutning(s, rng = Math.random, sist = null) {
    const R = REGLER, mulige = [];
    if (s.folk > 0) mulige.push({ id: 'nabo', tittel: 'Et nabogårdsfolk vil bli med', tekst: `${R.nabo.folk} fra en nabogård har gitt opp gården og vil slå seg sammen med dere. De har med seg litt mat, men de trenger senger og skal ha mat hver dag.`,
      valg: [{ id: 'alle', t: `Ta dem inn (folk +${R.nabo.folk}, mat +${R.nabo.mat})`, følge: `${R.nabo.folk} nye arbeidere i dag. Uten ledige senger faller moralen, og maten går fortere.` },
        { id: 'to', t: `Ta inn to av dem (folk +2, mat +${Math.round(R.nabo.mat / 2)})`, følge: 'To nye arbeidere. De andre går videre.' },
        { id: 'nei', t: 'Avvis dem', følge: `Ingen nye munner å mette. Noen synes det er hardt (moral ${R.nabo.avvistMoral}).` }] });
    if ((s.dieselPlass || 0) - (s.diesel || 0) >= 200) mulige.push({ id: 'tankbil', tittel: 'En forlatt tankbil', tekst: `En tankbil med diesel står forlatt ca. ${des(R.tankbil.avst[0] / 1000)}–${des(R.tankbil.avst[1] / 1000)} km fra leiren. Den kan være verdt ${R.tankbil.diesel[0]}–${R.tankbil.diesel[1]} liter – hvis ingen andre kommer først.`,
      valg: [{ id: 'lag', t: 'Send en tropp dit (oppdrag i kartet)', følge: `Tankbilen kommer i kartet. Kom dit med en tropp innen to døgn og ta dieselen. Det kan være røvere der (omtrent hver tredje gang).` },
        { id: 'fots', t: 'Send to til fots (borte et døgn)', følge: `To er borte i dag. I morgen har de kanskje med ${R.tankbil.fots.diesel[0]}–${R.tankbil.fots.diesel[1]} l – eller ingenting, og en kan være skadet.` },
        { id: 'nei', t: 'La den stå', følge: 'Ingen risiko, ingen diesel.' }] });
    const vernPris = R.vern.fast + R.vern.perBølge * (s.bølge || 0);
    if ((s.bølge || 0) >= 1 && s.røverTimer > 3 && s.penger >= vernPris) mulige.push({ id: 'vern', tittel: 'Røverne vil ha betalt', tekst: `En budbærer fra røverne: betal, så lar de dere være i fred et døgn lenger enn ellers. Neste bølge ventes om ca. ${Math.round(s.røverTimer)} timer.`,
      valg: [{ id: 'betal', t: `Betal ${kr(vernPris)}`, følge: `Neste bølge kommer ett døgn senere. Kassa går ned med ${kr(vernPris)}.`, pris: vernPris },
        { id: 'nei', t: 'Nekt', følge: `Folk liker at dere står imot (moral +${R.vern.nektMoral}). Røverne kommer som før.` }] });
    // dieselen i pakken: bare så mye som får plass i tankene (hele 50 l; under 50 l: bare mat)
    const dl = Math.max(0, Math.min(R.karavane.diesel, Math.floor(((s.dieselPlass || 0) - (s.diesel || 0)) / 50) * 50));
    const pakke = Math.round((dl * (s.dieselPris || 0) + R.karavane.mat * (s.matPris || 0)) * R.karavane.rabatt / 1e4) * 1e4, treSalg = Math.round(R.karavane.tre * (s.trePris || 0) * R.karavane.trePris / 1e3) * 1e3;
    const kv = [];
    if (s.penger >= pakke && pakke > 0) kv.push({ id: 'kjøp', t: dl ? `Kjøp ${dl} l diesel og ${R.karavane.mat} rasjoner (${kr(pakke)})` : `Kjøp ${R.karavane.mat} rasjoner (${kr(pakke)})`, følge: `Omtrent ${Math.round((1 - R.karavane.rabatt) * 100)} % billigere enn markedet.` + (dl < R.karavane.diesel ? ' Dere har ikke plass til mer diesel (bygg en dieseltank).' : ''), pris: pakke, diesel: dl });
    if ((s.lager && s.lager.tre || 0) >= R.karavane.tre && treSalg > 0) kv.push({ id: 'selg', t: `Selg ${R.karavane.tre} m³ tre (${kr(treSalg)})`, følge: `Bedre betalt enn på markedet (${Math.round((R.karavane.trePris - 1) * 100)} % mer).`, pris: treSalg });
    if (kv.length) mulige.push({ id: 'karavane', tittel: 'En handelskaravane', tekst: 'En karavane med lastebiler har slått leir ved vegen i dag. De selger billig og kjøper tre.', valg: kv.concat([{ id: 'nei', t: 'Ingen handel', følge: 'Karavanen drar videre i kveld.' }]) });
    const valg = mulige.filter(m => m.id !== sist);
    return valg.length ? valg[Math.floor(rng() * valg.length)] : null;
  }

  // ---------- HVORDAN DET GIKK (regnes neste morgen) ----------
  // p: { id ('jakt' | 'leie' | 'speid' | 'tankbil'), folk: [{ navn, ferd: { hogst } }] }, o: { årstid, røverTimer }. Gir { mat, penger, diesel,
  // tre, stål, skadet: [navn], borte: [navn] (kom ikke tilbake), tekst }.
  function utfall(p, o = {}, rng = Math.random) {
    const R = REGLER, u = { mat: 0, penger: 0, diesel: 0, tre: 0, stål: 0, skadet: [], borte: [], helse: 0 }, f = p.folk || [], navn = f.map(q => q.navn.split(' ')[0]), hvem = () => f[Math.floor(rng() * f.length)];
    const og = a => (a.length > 1 ? a.slice(0, -1).join(', ') + ' og ' + a[a.length - 1] : a[0] || 'De');
    if (p.id === 'jakt') { const å = R.jakt.årstid[o.årstid] || 1; u.mat = Math.round(f.reduce((s, q) => s + mellom(rng, R.jakt.per) * klem((q.ferd && q.ferd.hogst) || 1, .7, 1.45), 0) * å);
      if (f.length && rng() < R.jakt.skade) { u.skadet.push(hvem().navn); u.helse = R.jakt.helse; }
      u.tekst = `${og(navn)} kom hjem fra jakt og fiske med ${u.mat} rasjoner.` + (u.skadet.length ? ` ${u.skadet[0].split(' ')[0]} skadet seg på turen.` : ''); }
    else if (p.id === 'leie') { const ikke = f.length && rng() < R.leie.borte, sår = !ikke && f.length && rng() < R.leie.såret; u.penger = Math.round(mellom(rng, R.leie.penger) / 1e5) * 1e5;
      if (ikke) { u.borte.push(hvem().navn); u.tekst = `Nabogården betalte ${kr(u.penger)}, men ${u.borte[0]} kom ikke tilbake fra vaktoppdraget.`; }
      else if (sår) { u.skadet.push(hvem().navn); u.helse = R.leie.helse; u.tekst = `Nabogården betalte ${kr(u.penger)}. ${u.skadet[0].split(' ')[0]} ble såret i et basketak og må hvile.`; }
      else u.tekst = `${og(navn)} holdt vakt for nabogården og kom hjem med ${kr(u.penger)}.`; }
    else if (p.id === 'speid') { u.tre = Math.round(mellom(rng, R.speid.tre) * 10) / 10; u.stål = Math.round(mellom(rng, R.speid.stål) * 10) / 10; u.mat = Math.round(mellom(rng, R.speid.mat));
      if (f.length && rng() < R.speid.skade) { u.skadet.push(hvem().navn); u.helse = R.speid.helse; }
      const røv = o.røverTimer === null || o.røverTimer === undefined ? 'De så ingen tegn til røverne.' : o.røverTimer <= 0 ? 'Røverne er alt på vei mot leiren.' : `De så røverne samle seg: de drar ut mot leiren om ca. ${Math.max(1, Math.round(o.røverTimer))} ${Math.max(1, Math.round(o.røverTimer)) === 1 ? 'time' : 'timer'}.`;
      u.tekst = `Speiderne er tilbake fra ${p.sted || 'turen'}. ${røv} De fant ${u.mat} rasjoner, ${des(u.tre)} m³ tre` + (u.stål > 0 ? ` og ${des(u.stål)} t stål.` : '.') + (u.skadet.length ? ` ${u.skadet[0].split(' ')[0]} vrikket foten.` : ''); }
    else if (p.id === 'tankbil') { const T = R.tankbil.fots; if (rng() < T.lykkes) { u.diesel = Math.round(mellom(rng, T.diesel) / 10) * 10; u.tekst = `${og(navn)} fant tankbilen og bar hjem ${u.diesel} l diesel i kanner.`; }
      else u.tekst = `${og(navn)} fant tankbilen, men noen hadde tømt den før dem.`;
      if (f.length && rng() < T.skade) { u.skadet.push(hvem().navn); u.helse = T.helse; u.tekst += ` ${u.skadet[0].split(' ')[0]} skadet seg på vegen.`; } }
    else u.tekst = '';
    return u;
  }

  // ---------- HVEM SOM GÅR ----------
  // personer: [{ id, oppgave, helse, karantene, borte, ferd }]. Gir id-ene til n arbeidsføre, helst de frie, ellers de beste på «ferd»
  // fra oppgavene med flest folk (aldri den siste på en oppgave som bare har én).
  function velgFolk(personer, n, ferd, unntatt = []) {
    const tall = {}; for (const p of personer) tall[p.oppgave] = (tall[p.oppgave] || 0) + 1;
    const ok = personer.filter(p => p.helse >= .4 && !p.karantene && !p.borte && !unntatt.includes(p.id) && !p.karakter && (p.oppgave === 'fri' || tall[p.oppgave] > 1));
    const rang = p => (p.oppgave === 'fri' ? 100 : 0) + (tall[p.oppgave] || 0) * 2 + ((p.ferd && p.ferd[ferd]) || 1);
    return ok.sort((a, b) => rang(b) - rang(a)).slice(0, n).map(p => p.id);
  }

  // ---------- KORT TEKST om valget som ble tatt ----------
  const VALGT = { jakt: 'to på jakt og fiske', kjøp: 'kjøpte mat', rasjon: 'halve rasjoner', vakt: 'dobbel vakt', selg: 'solgte tre', post: 'tok røverposten', leie: 'leide ut to som vakter',
    speid: 'speidertur', fri: 'fridag', skift: 'ekstra skift', ingen: 'ingen endring' };

  const api = { REGLER, dagensValg, erStorDag, storBeslutning, utfall, velgFolk, VALGT, kr, des };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Morgen = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
