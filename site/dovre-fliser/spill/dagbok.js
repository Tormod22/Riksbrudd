/* Dagbok: en kort rapport hver morgen (kl. 06). Reglene øverst er uten DOM (Node: require('./dagbok'); nettleser: globalThis.Dagbok),
 * visningen nederst kobler dem på spillet. Brukeren 16. nov: «legg til flere funksjoner … om noe er uklart».
 * Rapporten sier hvor mange dere er, moralen, hvor lenge maten og dieselen rekker, og hva som skjedde med kassa siste døgn –
 * og advarer når noe er i ferd med å ta slutt. De siste rapportene står nederst i fanen «Mål» i Leir-menyen («Dagbok»).
 */
(function (rot) {
  'use strict';
  const des = (v, n = 1) => (Math.round(v * 10 ** n) / 10 ** n).toFixed(n).replace('.', ',').replace(/,0+$/, '');
  const kr = v => { const a = Math.abs(v); return (v < 0 ? '−' : '') + (a >= 1e6 ? des(a / 1e6) + ' mill. kr' : a >= 1000 ? Math.round(a / 1000) + ' 000 kr' : Math.round(a) + ' kr'); };
  // d: { dag, folk, moral, matDager (Infinity = drivhusene dekker alt), diesel (l), dieselBruk (l siste døgn), kassa, kassaFør (for et døgn siden, eller null), mål: [gjort, alle] }
  function rapport(d) {
    const varsler = [], deler = [`Dag ${d.dag}: ${d.folk} ${d.folk === 1 ? 'person' : 'personer'}, moral ${Math.round(d.moral)}.`];
    if (d.folk > 0) { if (d.matDager === Infinity) deler.push('Maten dekkes av drivhusene.'); else { deler.push(`Mat til ${des(Math.max(0, d.matDager))} døgn.`); if (d.matDager < 2) varsler.push(d.matDager <= 0 ? 'Dere er tomme for mat' : 'Lite mat'); } }
    // (runde 6) d.rekkerDøgn = den felles prognosen (Leir.dieselRekker, samme tall som i Lager); uten den: forbruket siste døgn som før
    if (d.diesel > 0 || d.dieselBruk > 0) { const døgn = d.rekkerDøgn !== undefined && d.rekkerDøgn !== null ? d.rekkerDøgn : d.dieselBruk > 0 ? d.diesel / d.dieselBruk : Infinity;
      deler.push(`Diesel ${Math.round(d.diesel).toLocaleString('nb-NO')} l` + (døgn === Infinity ? '.' : ` (rekker ca. ${des(døgn)} døgn).`)); if (døgn < 1.5) varsler.push(d.diesel <= 0 ? 'Tomt for diesel' : 'Lite diesel');
      // (R2-løkka 26. nov, kritikken: «dieselen rekker ca. 167,4 døgn») strømnettet dekker leiren de første døgnene – si hva det blir uten det
      if (d.utenNett > 0 && d.diesel > 0) deler.push(`Strømnettet dekker det meste nå; uten nettet bruker aggregatene ca. ${Math.round(d.utenNett)} l i døgnet (ca. ${des(d.diesel / d.utenNett)} døgn).`); }
    if (d.moral < 30 && d.folk > 0) varsler.push('Moralen er farlig lav');
    // (R2-løkka 26. nov) d.bok = dagboka over inn og ut for siste døgn (PengerSpill) – samme tall som Lager → Penger inn
    if (d.bok) deler.push(`Kassa ${kr(d.kassa)} (siste døgn: ${kr(d.bok.inn)} inn, ${kr(d.bok.ut)} ut).` + (d.faste > 0 ? ` Faste utgifter ca. ${kr(d.faste)} i døgnet (lønn og vedlikehold).` : ''));
    else deler.push(`Kassa ${kr(d.kassa)}` + (d.kassaFør === null || d.kassaFør === undefined || Math.abs(d.kassa - d.kassaFør) < 1000 ? '.' : ` (${d.kassa >= d.kassaFør ? '+' : ''}${kr(d.kassa - d.kassaFør)} siste døgn).`));
    if (d.mål && d.mål[0] < d.mål[1]) deler.push(`Mål ${d.mål[0]} av ${d.mål[1]}.`);
    return { tekst: (varsler.length ? varsler.join('. ') + '! ' : '') + deler.join(' '), varsler };
  }
  // Dagen for en tid i spillminutter (spillet begynner kl. 06 dag 1; ny dag regnes fra kl. 06)
  const dag = tidMin => Math.floor(tidMin / 1440) + 1;
  const api = { rapport, dag, kr, des };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Dagbok = api;
  if (typeof document === 'undefined' || typeof KROKER === 'undefined') return;

  // ---------- visningen ----------
  const NØKKEL = 'riksbrudd-dagbok'; let S = null, leirId = '', klar = false;
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, ...S })); } catch (e) { /* fullt eller sperret */ } };
  function start() {
    const O = rot.OppstartSpill && OppstartSpill.tilstand(); leirId = O && O.leir ? Math.round(O.leir.x) + ',' + Math.round(O.leir.y) : 'x';
    try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); S = d && d.leir === leirId ? { dag: d.dag, kassa: d.kassa, diesel: d.diesel, liste: Array.isArray(d.liste) ? d.liste : [] } : null; } catch (e) { S = null; }
    if (!S) S = { dag: dag(tid), kassa: O ? O.penger : null, diesel: null, liste: [] };
    klar = true;
  }
  function nå() {
    const O = rot.OppstartSpill && OppstartSpill.tilstand(), L = rot.LeirSpill && LeirSpill.tilstand(), F = rot.FolkSpill && FolkSpill.tilstand(); if (!O || !L) return null;
    let matDager = 0; try { const B = F && rot.FolkRegler ? FolkRegler.behov(F, L, FolkSpill.valg ? FolkSpill.valg() : {}) : null; matDager = B ? B.dager : 0; } catch (e) { matDager = 0; }
    const bruk = S.diesel === null ? 0 : Math.max(0, S.diesel - (L.drivstoff || 0)), P = rot.LeirSpill && LeirSpill.diesel ? LeirSpill.diesel() : null;
    return { dag: dag(tid), folk: F ? F.personer.length : 0, moral: F ? F.moral : 0, matDager, diesel: L.drivstoff || 0, dieselBruk: P ? P.perDøgn : bruk, rekkerDøgn: P ? P.timer / 24 : undefined, kassa: O.penger, kassaFør: S.kassa, bok: bok(), faste: faste(), utenNett: utenNett(L, P),
      mål: rot.MaalSpill ? [MaalSpill.stilling().totalt, MaalSpill.stilling().alle] : null };
  }
  // (R2-løkka) dagboka over inn og ut for døgnet som nettopp er slutt (06–06), og de faste utgiftene (spill/penger-visning.js)
  const bok = () => { try { const P = rot.PengerSpill; if (!P || !P.døgn || !P.tilstand || !P.tilstand()) return null; const D = P.døgn(dag(tid) - 1); return { inn: D.inn, ut: D.ut }; } catch (e) { return null; } };
  const faste = () => { try { return rot.PengerSpill && PengerSpill.faste ? PengerSpill.faste().sum : 0; } catch (e) { return 0; } };
  // dieselen uten strømnettet: det byggene som er på, bruker (kW) × 24 t × liter per kWt – bare når nettet dekker mer enn halvparten nå
  function utenNett(L, P) { try { const LB = rot.Leir; if (!LB || !L || !Array.isArray(L.bygg)) return 0; let kw = 0;
    for (const b of L.bygg) { const B = LB.BYGG[b.type]; if (B && B.kw < 0 && b.igjen <= 0 && !b.av) kw -= B.kw; }
    const l = kw * 24 * LB.DRIVSTOFF.literPerKWt, nå = P ? P.perDøgn : 0; return l > 1 && nå < l * .5 && LB.nettKW && LB.nettKW(L) > 0 ? l : 0; } catch (e) { return 0; } }
  // RUNDE 13 (kritiker H: etter omlasting kl. 05:59 kom «Dag 2: …» en gang til): bare en NYERE dag gir rapport – klokka kan stå litt bak etter en omlasting
  KROKER.sim.push(() => { if (!klar || (Number.isFinite(S.dag) && dag(tid) <= S.dag)) return; const d = nå(); if (!d) return;
    const r = rapport(d); logg(r.tekst); S.liste.unshift(r.tekst); S.liste.length = Math.min(S.liste.length, 7); S.dag = d.dag; S.kassa = d.kassa; S.diesel = d.diesel; lagre(); });
  (rot.LEIR_MENY = rot.LEIR_MENY || []).push((hode, { el }) => { if (!klar || !S.liste.length) return; hode.appendChild(el('h3', {}, 'Dagbok'));
    for (const t of S.liste) hode.appendChild(el('div', { klasse: 'dagbok' }, t)); });
  const css = document.createElement('style'); css.textContent = '#leirmeny .dagbok{ font-size:13.5px; color:var(--ink-dim); line-height:1.35; padding:5px 0; border-bottom:1px solid #3a3226; }'; document.head.appendChild(css);
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  // noter(tekst): en linje i dagboka utenom morgenrapporten (seier, tap av leiren, scenarier)
  function noter(tekst) { if (!klar || !S) return false; S.liste.unshift(`Dag ${dag(tid)}: ${tekst}`); S.liste.length = Math.min(S.liste.length, 7); lagre(); return true; }
  // siste(): den siste rapporten (morgenmøtet viser den øverst på kortet, spill/morgen-visning.js)
  const siste = () => (klar && S && S.liste.length && /^(.*! )?Dag \d+:/.test(S.liste[0]) ? S.liste[0] : null);
  rot.DagbokSpill = { start, nå, noter, siste, tilstand: () => S };
})(typeof globalThis !== 'undefined' ? globalThis : this);
