/* S3 – oljeøkonomien: regler uten DOM (Node-test og senere spillserver). Node: require('./okonomi'); nettleser: globalThis.Okonomi.
 * Olje er eneste penger. Den produseres ved oljeterminalene på land (INFRA.olje type 3), kjøres med lastebil til en base
 * og brukes der til å bygge enheter. Alle mengder i tonn, all tid i spillsekunder. Tallene er spillverdier (forslag), ikke fasit.
 */
(function (rot) {
  'use strict';
  const REGLER = {
    last: { lastebil: 25, speiderbil: 0 },   // tonn per kjøretøy
    lastetid: 1800, lossetid: 1800,           // sekunder per kolonne (lasting/lossing skjer samtidig for alle bilene)
    produksjon: 150 / 3600, lagerTerminal: 3000,   // tonn per sekund (150 t/t) og plass på terminalen
    pris: { lastebil: 40, speiderbil: 30, lag: 20 },
    byggetid: { lastebil: 7200, speiderbil: 5400, lag: 3600 },
    navn: { lastebil: 'Lastebil', speiderbil: 'Speiderbil', lag: 'Infanterilag' },
  };
  function terminal({ id, navn, x, y, beholdning = 500 }) { return { id, navn, x, y, beholdning }; }
  function base({ navn, x, y, side = 'blå', beholdning = 0 }) { return { navn, x, y, side, beholdning, kø: [], bygget: 0 }; }
  const kapasitet = kj => (REGLER.last[kj.type] || 0) * kj.antall;

  // Produksjon på terminalene og bygging på basene. Gir listen over enheter som ble ferdige: [{ base, type }].
  function tikk(terminaler, baser, sek) {
    for (const t of terminaler) t.beholdning = Math.min(REGLER.lagerTerminal, t.beholdning + REGLER.produksjon * sek);
    const ferdige = [];
    for (const b of baser) {
      let igjen = sek;
      while (igjen > 0 && b.kø.length) {
        const j = b.kø[0], d = Math.min(igjen, j.igjen); j.igjen -= d; igjen -= d;
        if (j.igjen <= 0) { b.kø.shift(); b.bygget++; ferdige.push({ base: b, type: j.type }); }
      }
    }
    return ferdige;
  }
  // Bestill en enhet: oljen trekkes med en gang; den står i kø og blir ferdig etter byggetiden. Gir { feil } når oljen ikke rekker.
  function bygg(b, type) {
    const pris = REGLER.pris[type]; if (pris === undefined) throw new RangeError('Ukjent enhet ' + type);
    if (b.beholdning + 1e-9 < pris) return { feil: `For lite olje: ${Math.floor(b.beholdning)} av ${pris} t.` };
    b.beholdning -= pris; b.kø.push({ type, igjen: REGLER.byggetid[type], total: REGLER.byggetid[type] }); return { ok: true };
  }

  // Oljeoppdrag for en kolonne: kjør til terminalen, last, kjør til basen, loss – og gjenta hvis «skyttel» er på.
  // Kjoretoy (spill/kjoretoy.js) og vegnettet trengs for å planlegge rutene. Gir { feil } når det ikke går.
  function hentOlje(kj, graf, term, b, K, skyttel = true) {
    if (!kapasitet(kj)) return { feil: 'Denne enheten kan ikke frakte olje.' };
    const r = K.planlegg(kj, graf, [term.x, term.y]); if (r.feil) return r;
    kj.oppdrag = { fase: 'til terminal', terminal: term, base: b, skyttel, last: kj.oppdrag ? kj.oppdrag.last : 0, igjen: 0, levert: 0 };
    if (kj.oppdrag.last === undefined) kj.oppdrag.last = 0;
    return r;
  }
  // Ett simuleringssteg for kolonnen med oppdrag. Kaller K.steg (kjøring) og gir hendelser tilbake: [{ hva, tonn? }].
  function steg(kj, graf, sek, K) {
    const o = kj.oppdrag, hendelser = [];
    if (o && o.type) return hendelser;   // andre oppdrag (S4 forsyning) kjøres av sin egen modul
    if (!o) { K.steg(kj, sek); return hendelser; }
    while (sek > 0 && kj.oppdrag) {
      if (o.fase === 'til terminal' || o.fase === 'til base') {
        if (!kj.sti) { neste(); continue; }
        const før = K.tidIgjen(kj), framme = K.steg(kj, sek); sek = framme ? Math.max(0, sek - før) : 0;
        if (framme) neste();
      } else {   // laster eller losser
        const d = Math.min(sek, o.igjen); o.igjen -= d; sek -= d;
        if (o.igjen <= 0) neste();
      }
    }
    return hendelser;
    function neste() {
      if (o.fase === 'til terminal') { o.fase = 'laster'; o.igjen = REGLER.lastetid; }
      else if (o.fase === 'laster') {
        const t = Math.min(kapasitet(kj) - o.last, o.terminal.beholdning); o.terminal.beholdning -= t; o.last += t;
        hendelser.push({ hva: 'lastet', tonn: t });
        const r = K.planlegg(kj, graf, [o.base.x, o.base.y]); if (r.feil) { hendelser.push({ hva: 'feil', melding: r.feil }); kj.oppdrag = null; return; }
        o.fase = 'til base';
      } else if (o.fase === 'til base') { o.fase = 'losser'; o.igjen = REGLER.lossetid; }
      else if (o.fase === 'losser') {
        o.base.beholdning += o.last; o.levert += o.last; hendelser.push({ hva: 'levert', tonn: o.last }); o.last = 0;
        if (o.skyttel) { const r = K.planlegg(kj, graf, [o.terminal.x, o.terminal.y]); if (r.feil) { hendelser.push({ hva: 'feil', melding: r.feil }); kj.oppdrag = null; return; } o.fase = 'til terminal'; }
        else { kj.oppdrag = null; hendelser.push({ hva: 'ferdig' }); }
      }
    }
  }
  function avbryt(kj, K) { if (kj.oppdrag) { kj.oppdrag = null; K.stopp(kj); } }
  function tekst(kj) {
    const o = kj.oppdrag; if (!o || o.type) return null;
    const last = `last ${Math.round(o.last)}/${kapasitet(kj)} t`;
    return { 'til terminal': `kjører til ${o.terminal.navn}`, laster: `laster på ${o.terminal.navn}`, 'til base': `kjører olje til ${o.base.navn}`, losser: `losser på ${o.base.navn}` }[o.fase] + ' · ' + last + (o.skyttel ? ' · skytteltrafikk' : '');
  }
  const api = { REGLER, terminal, base, kapasitet, tikk, bygg, hentOlje, steg, avbryt, tekst };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Okonomi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
