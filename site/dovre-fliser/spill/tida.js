/* TIDA (G2 i docs/plan-selskap-okonomi.md, kapittel 13.6, 28. nov): «Spol til …», automatisk pause per type og tidslinja.
 * Reglene her er uten DOM (Node: require('./tida'); nettleser: globalThis.Tida). Visningen er spill/tida-visning.js (window.TidaSpill),
 * og spolingen selv går gjennom spill/flyt.js (FlytSpill.spol(mål)): farten går til 600× og stopper når målet er nådd – eller når noe
 * som haster skjer (alarm, fienden nær, et kort som venter på svar …).
 *
 * Alt regnes ut fra et ØYEBLIKKSBILDE o (visningen lager det av spillet):
 *   o = { tid,                                   spillminutter (0 = dag 1 kl. 06:00)
 *         kontrakter: [{ id, tittel, frist, klar }], de aktive kontraktene (frist i spillminutter; klar = kan leveres nå)
 *         jobber: [{ id, navn, hva, igjen, reise }], byggejobbene i køen (igjen = arbeidsminutter, reise = minutter før de er framme)
 *         lag: antall byggelag (jobbene som går samtidig), fart: byggefarten (1 = vanlig),
 *         angrep: { min, aktiv } eller null,     neste røverangrep: min = spillminutter til de drar ut; aktiv = angrepet pågår
 *         alarm, fast }                           alarm = leiren angripes nå; fast = jobber venter, men ingen bygger
 * Alle tallene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  // Claudes forslag
  const REGLER = {
    morgenKl: 6,          // morgenmøtet er kl. 06 (tid 0 = dag 1 kl. 06:00)
    fristFør: 60,         // «Spol til fristen» stopper så mange spillminutter før fristen, så du rekker å gjøre noe
    tidslinjeMaks: 5,     // så mange hendelser står i tidslinja
    horisont: 2 * 1440,   // hendelser lenger fram enn dette (spillminutter) står ikke i tidslinja
    maksSpol: 3 * 1440,   // «Spol til …» stopper uansett etter så mange spillminutter
  };
  const DØGN = 1440;
  const to = n => String(n).padStart(2, '0');
  // klokkeslettet ved tid t: «14:05»
  function kl(t) { const m = ((Math.floor(t) + REGLER.morgenKl * 60) % DØGN + DØGN) % DØGN; return to(Math.floor(m / 60)) + ':' + to(m % 60); }
  const dagNr = t => Math.floor((REGLER.morgenKl * 60 + t) / DØGN) + 1 - Math.floor(REGLER.morgenKl * 60 / DØGN);
  // spillminuttet for neste morgen kl. 06 (strengt etter t)
  const nesteMorgen = t => (Math.floor(t / DØGN) + 1) * DØGN;
  // «kl. 14:05», «i morgen kl. 06:00», «dag 4 kl. 08:30»
  function når(t, nå) {
    if (!Number.isFinite(t)) return '';
    const dn = Math.floor((t + REGLER.morgenKl * 60) / DØGN), d0 = Math.floor((nå + REGLER.morgenKl * 60) / DØGN);
    if (dn === d0) return 'kl. ' + kl(t); if (dn === d0 + 1) return 'i morgen kl. ' + kl(t);
    return 'dag ' + (Math.floor(t / DØGN) + 1) + ' kl. ' + kl(t);
  }
  // «om 2 t 15 min», «om 35 min», «nå»
  function om(min) {
    if (!Number.isFinite(min)) return ''; const m = Math.round(min); if (m < 1) return 'nå';
    if (m < 60) return 'om ' + m + ' min'; const t = Math.floor(m / 60), r = m - t * 60;
    if (t >= 48) { const d = Math.floor(t / 24), tt = t - d * 24; return 'om ' + d + ' d' + (tt ? ' ' + tt + ' t' : ''); }
    return 'om ' + t + ' t' + (r ? ' ' + r + ' min' : '');
  }
  // Når hver byggejobb er ferdig: byggelagene tar jobbene i køen etter tur (de lag første går samtidig). Gir [{ ...jobb, ferdig }]
  // ferdig = spillminutt, eller null når ingen bygger (lag = 0 eller fart = 0).
  function byggeplan(o) {
    const J = (o && o.jobber) || [], n = Math.max(0, Math.floor(o && Number.isFinite(o.lag) ? o.lag : 1)), fart = o && Number.isFinite(o.fart) ? o.fart : 1;
    if (!n || !(fart > 0)) return J.map(j => ({ ...j, ferdig: null }));
    const ledig = new Array(n).fill(o.tid || 0);
    return J.map(j => { let i = 0; for (let k = 1; k < n; k++) if (ledig[k] < ledig[i]) i = k;
      const slutt = ledig[i] + Math.max(0, +j.reise || 0) + Math.max(0, +j.igjen || 0) / fart; ledig[i] = slutt; return { ...j, ferdig: slutt }; });
  }
  const jobbTekst = j => (j.hva === 'bygg' || !j.hva ? j.navn + ' ferdig' : j.hva === 'oppgrader' ? j.navn + ' bygd ut' : j.hva === 'reparer' ? j.navn + ' reparert' : j.hva === 'flytt' ? j.navn + ' flyttet' : j.navn + ' ferdig');
  // De kjente hendelsene som kommer, sortert etter tid (null = nå / ukjent først): [{ type, id, når, tekst }]
  // type: 'morgen' | 'frist' | 'levering' | 'bygg' | 'angrep'
  function kjente(o, R = REGLER) {
    const ut = [], t = (o && o.tid) || 0;
    ut.push({ type: 'morgen', id: 'morgen', når: nesteMorgen(t), tekst: 'Morgenmøtet' });
    for (const k of (o && o.kontrakter) || []) {
      if (k.klar) ut.push({ type: 'levering', id: 'kontrakt:' + k.id, når: null, tekst: k.tittel + ' kan leveres' });
      if (Number.isFinite(k.frist)) ut.push({ type: 'frist', id: 'kontrakt:' + k.id, når: k.frist, tekst: 'Fristen: ' + k.tittel });
    }
    for (const j of byggeplan(o)) ut.push({ type: 'bygg', id: 'bygg:' + j.id, når: j.ferdig, tekst: j.ferdig === null ? j.navn + ' står stille (ingen bygger)' : jobbTekst(j) });
    const A = o && o.angrep;
    if (A && A.aktiv) ut.push({ type: 'angrep', id: 'angrep', når: null, tekst: 'Angrepet pågår' });
    else if (A && Number.isFinite(A.min)) ut.push({ type: 'angrep', id: 'angrep', når: t + Math.max(0, A.min), tekst: 'Røverne drar ut mot leiren' });
    return ut.filter(h => h.når === null || h.når - t <= R.horisont).sort((a, b) => (a.når === null ? -1 : a.når) - (b.når === null ? -1 : b.når));
  }
  // Valgene i «Spol til …» nå: [{ id, tekst, når }] – id brukes i mål(id, o)
  function valg(o, R = REGLER) {
    const t = (o && o.tid) || 0, ut = [{ id: 'morgen', tekst: 'Morgenen (kl. 06)', når: nesteMorgen(t) }];
    for (const k of (o && o.kontrakter) || []) {
      if (k.klar) ut.push({ id: 'kontrakt:' + k.id, tekst: k.tittel + ': kan leveres nå', når: null, nå: true });
      else ut.push({ id: 'kontrakt:' + k.id, tekst: k.tittel + ': framme eller fristen', når: Number.isFinite(k.frist) ? Math.max(t, k.frist - R.fristFør) : null });
    }
    const P = byggeplan(o);
    if (P.length) { const først = P.filter(j => j.ferdig !== null).sort((a, b) => a.ferdig - b.ferdig)[0];
      ut.push({ id: 'bygg', tekst: 'Byggingen er ferdig' + (først ? ' (' + først.navn + ')' : ''), når: først ? først.ferdig : null, stille: !først });
      if (P.length > 1) { const siste = P.every(j => j.ferdig !== null) ? Math.max(...P.map(j => j.ferdig)) : null; ut.push({ id: 'byggAlle', tekst: 'Alle byggejobbene er ferdige (' + P.length + ')', når: siste, stille: siste === null }); } }
    const A = o && o.angrep;
    if (A && !A.aktiv && Number.isFinite(A.min)) ut.push({ id: 'angrep', tekst: 'Angrepet (røverne drar ut)', når: t + Math.max(0, A.min) });
    return ut;
  }
  // Målet for «Spol til id» ut fra bildet nå: { id, type, tekst, start, ... } eller null når det ikke finnes
  function mål(id, o, R = REGLER) {
    const t = (o && o.tid) || 0, base = { id, start: t };
    if (id === 'morgen') return { ...base, type: 'morgen', når: nesteMorgen(t), tekst: 'morgenen' };
    if (/^kontrakt:/.test(id)) { const kid = id.slice(9), k = ((o && o.kontrakter) || []).find(q => String(q.id) === kid); if (!k) return null;
      return { ...base, type: 'kontrakt', kid, tittel: k.tittel, frist: k.frist, varKlar: !!k.klar, tekst: k.tittel }; }
    if (id === 'bygg' || id === 'byggAlle') { const J = (o && o.jobber) || []; if (!J.length) return null; return { ...base, type: id, ider: J.map(j => j.id), navn: Object.fromEntries(J.map(j => [j.id, jobbTekst(j)])), tekst: id === 'bygg' ? 'byggingen er ferdig' : 'alle byggejobbene er ferdige' }; }
    // én bestemt jobb (fra tidslinja): «bygg:<jobb-id>»
    if (/^bygg:/.test(id)) { const jid = id.slice(5), j = ((o && o.jobber) || []).find(q => String(q.id) === jid); if (!j) return null; return { ...base, type: 'bygg', ider: [j.id], navn: { [j.id]: jobbTekst(j) }, tekst: jobbTekst(j).toLowerCase() }; }
    if (id === 'angrep') { const A = o && o.angrep; if (!A || A.aktiv || !Number.isFinite(A.min)) return null; return { ...base, type: 'angrep', tekst: 'angrepet' }; }
    return null;
  }
  // Er målet nådd? Gir teksten i «Stoppet: …» (uten stor forbokstav), eller null. o = bildet nå.
  function nådd(m, o, R = REGLER) {
    if (!m || !o) return null; const t = o.tid || 0;
    if (t - m.start >= R.maksSpol) return 'spolte i ' + Math.round(R.maksSpol / DØGN) + ' døgn uten at det skjedde';
    if (m.type === 'morgen') return t >= m.når ? 'det er morgen (kl. 06)' : null;
    if (m.type === 'kontrakt') { const k = (o.kontrakter || []).find(q => String(q.id) === String(m.kid));
      if (!k) return 'kontrakten «' + m.tittel + '» er avsluttet';
      if (k.klar && !m.varKlar) return '«' + m.tittel + '» kan leveres';
      if (Number.isFinite(k.frist) && t >= k.frist - R.fristFør) return 'fristen for «' + m.tittel + '» går ut ' + om(k.frist - t);
      return null; }
    if (m.type === 'bygg' || m.type === 'byggAlle') { const nå = new Set((o.jobber || []).map(j => j.id)), borte = m.ider.filter(id => !nå.has(id));
      if (m.type === 'bygg' && borte.length) return borte.map(id => m.navn[id] || 'en byggejobb ferdig').slice(0, 2).join(', ');
      if (m.type === 'byggAlle' && !borte.length) return null;
      if (m.type === 'byggAlle' && borte.length === m.ider.length) return 'alle byggejobbene er ferdige';
      return null; }
    if (m.type === 'angrep') { const A = o.angrep;
      if (o.alarm || (A && A.aktiv)) return 'leiren angripes';
      if (!A) return 'røverne er ikke ventet lenger';
      return A.min <= 0 ? 'røverne drar ut mot leiren' : null; }
    return null;
  }
  // AUTOMATISK PAUSE: det som har skjedd mellom to bilder, for typene som er slått på (på = { angrep, trenger, fast }).
  // Gir [{ type, tekst }]. angrep = leiren angripes; trenger = en kontrakt kan leveres eller fristen nærmer seg (eller en by ber om
  // hjelp – o.byBer teller dem når det kommer); fast = jobber venter, men ingen bygger.
  function pauser(før, nå, på, R = REGLER) {
    const ut = []; if (!før || !nå || !på) return ut;
    if (på.angrep && ((nå.alarm && !før.alarm) || (nå.angrep && nå.angrep.aktiv && !(før.angrep && før.angrep.aktiv)))) ut.push({ type: 'angrep', tekst: 'leiren angripes' });
    if (på.trenger) {
      const fk = new Map((før.kontrakter || []).map(k => [String(k.id), k]));
      for (const k of nå.kontrakter || []) { const f = fk.get(String(k.id));
        if (k.klar && !(f && f.klar)) ut.push({ type: 'trenger', tekst: '«' + k.tittel + '» kan leveres' });
        else if (f && Number.isFinite(k.frist) && nå.tid >= k.frist - R.fristFør && før.tid < k.frist - R.fristFør) ut.push({ type: 'trenger', tekst: 'fristen for «' + k.tittel + '» går ut ' + om(k.frist - nå.tid) }); }
      if ((nå.byBer || 0) > (før.byBer || 0)) ut.push({ type: 'trenger', tekst: 'en by ber om hjelp' });
    }
    if (på.fast && nå.fast && !før.fast) ut.push({ type: 'fast', tekst: 'byggejobbene står stille – ingen på «bygg»' });
    return ut;
  }
  const PAUSETYPER = [
    { id: 'angrep', navn: 'Angrep', tekst: 'leiren angripes' },
    { id: 'trenger', navn: 'Kontrakt trenger deg', tekst: 'en kontrakt kan leveres, eller fristen er under en time unna' },
    { id: 'fast', navn: 'Folk står fast', tekst: 'jobber venter, men ingen bygger' }];
  const api = { REGLER, PAUSETYPER, kl, dagNr, nesteMorgen, når, om, byggeplan, kjente, valg, mål, nådd, pauser, jobbTekst };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Tida = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
