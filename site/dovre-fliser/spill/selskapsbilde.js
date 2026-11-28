'use strict';
/* Riksbrudd – BILDET AV SELSKAPET (fase Ø0, 28. nov; docs/plan-selskap-okonomi.md kapittel 15 punkt 1 og kapittel 17).
 * Reglene uten DOM bak panelet «Selskapet» (spill/selskapspanel.js): fanene, ukas resultat fra dagboka over pengene, lista over byene
 * med eier, de tre viktigste tingene nå, og når kortet «Storlia Tømmer har hørt om dere» skal komme (den første halvtimen, punkt 6).
 * Test: pipeline/fliser/test_selskapsbilde.js. Node: require('./selskapsbilde'); nettleser: globalThis.Selskapsbilde.
 * Tekstene og tallene er Claudes forslag.
 */
(function (rot) {
  // Claudes forslag
  const REGLER = {
    // fanene i panelet (kapittel 17). klar = fanen har innhold i denne fasen (Ø0); de andre har en rolig tekst om hva som kommer
    FANER: [
      { id: 'oversikt', navn: 'Oversikt', klar: true },
      { id: 'produksjon', navn: 'Produksjon', klar: false, kommer: 'Sagbruk og maskiner kommer her.',
        mer: 'Her ser du maskinene i leiren som rader: hva som går inn og ut, hvem som driver dem, strømmen og tilstanden. Det første er sagbruket, som låses opp av en tømmerkontrakt.' },
      { id: 'kontrakter', navn: 'Kontrakter', klar: true },
      { id: 'byer', navn: 'Byer', klar: true },
      { id: 'partnere', navn: 'Partnere', klar: false, kommer: 'Firmaene og rivalene kommer her.',
        mer: 'Her kommer firmaene dere gjør forretninger med – som Storlia Tømmer og Gråfjell Frakt – og rivalene Ravnsund og Mosevakt: faste kunder, samarbeid og våpenhvile.' },
      { id: 'eiere', navn: 'Eiere', klar: false, kommer: 'Investorer og børsen kommer her.',
        mer: 'Når selskapet har levert nok, ringer den første investoren. Senere kan dere selge andeler, få utbytte og bli notert på svartebørsen.' },
    ],
    uke: 7,             // døgn i «ukas resultat»
    viktigste: 3,       // så mange linjer i «Det viktigste nå»
    // kortet etter den første leverte kontrakten: vent så mange sekunder etter leveringskortet før det kommer (rolig, ikke oppå)
    storlia: { vent: 25, vis: 40, firma: 'Storlia Tømmer' },
    EIER: { blå: 'Dere', rød: 'Ravnsund', grønn: 'Mosevakt' },
  };
  const tall = v => (Number.isFinite(+v) ? +v : 0);
  // UKAS RESULTAT: døgn(n) gir { inn, ut } for spilldøgn n (PengerSpill.døgn); dag = døgnet nå. Gir { inn, ut, netto, dager }
  // over de siste REGLER.uke døgnene, også det som har kommet inn i dag.
  function uke(døgn, dag, n = REGLER.uke) {
    const ut = { inn: 0, ut: 0, netto: 0, dager: 0 }; if (typeof døgn !== 'function') return ut; const d = Math.max(1, Math.floor(tall(dag)) || 1);
    for (let i = Math.max(1, d - n + 1); i <= d; i++) { let D = null; try { D = døgn(i); } catch (e) { D = null; } if (!D) continue; ut.inn += tall(D.inn); ut.ut += tall(D.ut); ut.dager++; }
    ut.netto = ut.inn - ut.ut; return ut;
  }
  // BYENE: steder = [{ id, navn, folk, slag: 'tettsted' | 'bru' }]; eier(id) gir 'blå' | 'rød' | 'grønn' | null; loj(id) gir lojaliteten
  // (eller null). Gir tettstedene (ikke bruene): deres først, så etter folketall.
  function byer(steder, eier, loj) {
    const L = (steder || []).filter(s => s && s.navn && (s.slag === undefined || s.slag === 'tettsted')).map(s => {
      let e = null; try { e = eier ? eier(s.id) || null : null; } catch (x) { e = null; } let l = null; try { l = loj ? loj(s.id) : null; } catch (x) { l = null; }
      return { id: s.id, navn: s.navn, folk: tall(s.folk), x: s.x, y: s.y, eier: e, eierNavn: REGLER.EIER[e] || (e ? e : 'Ingen'), loj: Number.isFinite(l) ? Math.round(l) : null }; });
    return L.sort((a, b) => (b.eier === 'blå') - (a.eier === 'blå') || b.folk - a.folk || String(a.navn).localeCompare(String(b.navn), 'nb'));
  }
  // DET VIKTIGSTE NÅ: lista fra Neste.sorter (eller en annen liste med { tekst }) – de første REGLER.viktigste, uten tomme
  const viktigste = (liste, n = REGLER.viktigste) => (liste || []).filter(k => k && k.tekst).slice(0, n);
  // KORTET «Storlia Tømmer har hørt om dere»: én gang per leir, etter at den første kontrakten er levert
  const storliaNå = (husk, levert) => !(husk && husk.storlia) && tall(levert) >= 1;
  function storliaTekst(navn, trinn) {
    const n = navn || 'dere';
    return { tittel: `${REGLER.storlia.firma} har hørt om dere`,
      tekst: `Ryktet går: ${n} holder ord. ${REGLER.storlia.firma} har tømmer som skal fram gjennom dalen, og de vil gjerne ha et selskap de kan stole på.`,
      neste: trinn && trinn.nr < 2 ? 'Neste mål: trinn 2, Leverandør – et selskap folk stoler på. Selskapet viser hva som mangler.' : 'Dere er på vei til å bli en leverandør. Selskapet viser veien videre.' };
  }
  // kroner med «mill.» – samme form som resten av spillet
  const des = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',').replace(/,0$/, '');
  const kr = v => { const a = Math.abs(tall(v)), f = v < 0 ? '−' : ''; return f + (a >= 1e6 ? des(a / 1e6) + ' mill. kr' : a >= 1000 ? Math.round(a / 1000) + ' 000 kr' : Math.round(a) + ' kr'); };
  const Selskapsbilde = { REGLER, uke, byer, viktigste, storliaNå, storliaTekst, kr };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Selskapsbilde; return; }
  rot.Selskapsbilde = Selskapsbilde;
})(typeof globalThis !== 'undefined' ? globalThis : this);
