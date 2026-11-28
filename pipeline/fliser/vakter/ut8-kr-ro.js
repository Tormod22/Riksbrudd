// VAKT «ro i skjermen og én tydelig vei» (ut8-kr-ro, 28. nov; docs/natt/ut8-kr-ro.md – kritikken fra Ingrid Sæther):
//  1) trinn og nivå på samme linje: hodet i Selskapet har «Rykte: nivå …», Oversikt har «Nivå (rykte)», Kontrakter starter med «Trinn N»
//  2) byene: en rival frir til en prøveby -> byens kort viser sporet til mer tillit (kontrakt +4, vokt byen +2 per døgn) og budkampen,
//     byen har et tilbud i Selskapet, budkampen kan vinnes med et stort løfte (og ikke med et lite), en levert kontrakt gir tillit
//  3) fanen Byer viser bare byene i området; andre byer ligger sammenfoldet under «Andre byer»
//  4) før trinn 3 står eksport og børs bare som en rolig linje i Oversikt (når eksporten ikke er åpnet på annen måte)
//  5) bygglista: grupper i fast rekkefølge, Produksjon før Pynt, Pynt sammenfoldet nederst, hvert bygg én gang
//  6) Neste-lappen: en kjøpsavtale (går av seg selv) viker for ledige tilbud
// Prøvebyen legges inn ved leiren og tas bort igjen; alt annet settes tilbake (penger, tid, tilstanden i byavtalene og Selskapet, lagringen).
module.exports = {
  navn: 'ro i skjermen og én tydelig vei (ut8-kr-ro)',
  kjør: async (pg) => pg.evaluate(async () => {
    const d = {}, feil = [], krev = (b, t) => { if (!b) feil.push(t); }, vent = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
    const BS = window.ByavtaleSpill, BA = window.Byavtale, SS = window.SelskapSpill, SP = window.SelskapetSpill;
    if (!BS || !BA || !SS || !SP || !window.Trinn || !window.TrinnSpill) return { ok: false, tekst: 'ByavtaleSpill, Byavtale, SelskapSpill, SelskapetSpill eller Trinn mangler', data: d };
    const Sp = OppstartSpill.tilstand(), L = Sp.leir, penger0 = Sp.penger, tid0 = tid;
    const ls = ['riksbrudd-byavtale', 'riksbrudd-selskap', 'riksbrudd-selskapet', 'riksbrudd-byggrupper'].map(k => [k, localStorage.getItem(k)]);
    const SB0 = JSON.parse(JSON.stringify(BS.tilstand())), T = SS.tilstand(), sd = T && T.sider && T.sider.blå, tilbud0 = T ? T.tilbud.map(k => k.id) : [];
    const aktive0 = sd ? sd.aktive.slice() : [], ferdige0 = sd ? sd.ferdige.slice() : [];
    let lagetInfra = false; if (typeof INFRA !== 'undefined' && !INFRA) { INFRA = {}; for (const k of ['felt', 'tettsted', 'magasin', 'ror', 'ferje', 'tunnel', 'dam', 'bru', 'ferjekai', 'kraft', 'olje', 'kai']) INFRA[k] = []; lagetInfra = true; }
    if (!INFRA.tettsted) INFRA.tettsted = [];
    const x = L.x + 7000, y = L.y + 1500, r = 300, A = { lag: 'tettsted', e: { id: 'ut8a', navn: 'Vakt Ro', folk: 9000 }, bb: [x - r, y - r, x + r, y + r], deler: [[x - r, y - r, x + r, y - r, x + r, y + r, x - r, y + r]] };
    INFRA.tettsted.push(A); const eierFør = TETTSTEDER.get('ut8a');
    const menyÅpen = $('leirmeny') && $('leirmeny').classList.contains('på');
    try {
      // ---------- 1) trinn og nivå ----------
      SP.vis(true, 'oversikt'); await vent(250);
      const R = TrinnSpill.regn(), nv = SS.nivå().nr, N = Trinn.nivåLinje(R, nv), P = $('selskapet');
      const hode = (P.querySelector('.shode .nivlinje') || {}).textContent || '';
      d.hode = hode; krev(/^Rykte: nivå \d/.test(hode) && hode.includes(N.kort), `hodet i Selskapet har ikke ryktenivået under trinnet («${hode}»)`);
      krev(/Nivå \(rykte\)/.test(P.textContent), 'Oversikt har ikke linja «Nivå (rykte)»');
      if (N.krav && !N.ok) krev(P.querySelector('.skropp').textContent.includes(`Trinn ${N.trinn} krever nivå ${N.krav}`), 'Oversikt sier ikke hvilket nivå neste trinn krever');
      // ---------- 4) eksport og børs ----------
      const ES = window.EksportSpill, ESt = ES && ES.tilstand ? ES.tilstand() : null;
      const låst = R.nr < 3 && ES && !(ES.åpenNå && ES.åpenNå()) && !(ESt && ((ESt.tilbud || []).length || (ESt.aktive || []).length || ESt.ek >= 1));
      d.eksportLåst = låst;
      if (låst) { const k = P.querySelector('.skropp'); krev(k.querySelector('[data-laast="eksport"]') && !/eurokreditt/.test(k.textContent), 'eksporten står åpen i Oversikt før trinn 3');
        krev(![...k.querySelectorAll('.tall li span')].some(s => s.textContent === 'Kurs'), 'børskursen står i Oversikt før trinn 3'); }
      // Kontrakter: trinnet først, så ryktet
      SP.velgFane('kontrakter'); await vent(250); const h3 = (P.querySelector('#selskap h3') || {}).textContent || ''; d.kontrakter = h3;
      krev(new RegExp(`^Trinn ${R.nr} .*rykte: nivå ${nv}`).test(h3), `Kontrakter starter ikke med trinnet og ryktenivået («${h3.slice(0, 80)}»)`);
      // ---------- 3) fanen Byer: bare området ----------
      BS.nullstill(); const omr = BS.område(); krev(omr.some(b => String(b.id) === 'ut8a'), 'prøvebyen er ikke med i området');
      const langt = { id: 'ut8-langt', navn: 'Vakt Langtborte', folk: 500000, eierNavn: 'Ingen' };
      BS.andre(false); const h1 = BS.fane([...omr.map(b => ({ id: b.id, navn: b.navn, folk: b.folk, eierNavn: '' })), langt]);
      krev(h1 && !/Vakt Langtborte/.test(h1) && /Andre byer \(1\)/.test(h1), 'en by utenfor området står ikke sammenfoldet under «Andre byer»');
      BS.andre(true); const h2 = BS.fane([langt]); krev(/Vakt Langtborte/.test(h2), '«Andre byer» viser ikke byene når den er åpnet'); BS.andre(false);
      // ---------- 2) byene: sporet, budkampen og byoppdraget ----------
      const b = BA.by(BS.tilstand(), 'ut8a'); d.tillit0 = b.tillit;
      BA.rivalFrir(b, 'rød', 9000, tid, BA.leder('ut8a', 9000).holdning); const rivalPris = b.forhandler.pris;
      SP.velgFane('byer'); await vent(150); const kn = P.querySelector('[data-sp="ba-kort"][data-id="ut8a"]'); krev(kn, 'prøvebyen har ingen «Åpne» i fanen Byer');
      if (kn) { kn.click(); await vent(250); }
      const kort = P.querySelector('.skropp'), tk = kort.textContent;
      const sk = kort.querySelector('[data-spor="kontrakt"]'), sv = kort.querySelector('[data-spor="vakt"]');
      d.spor = [sk && sk.textContent.slice(0, 60), sv && sv.textContent.slice(0, 60)];
      krev(sk && sk.textContent.includes(`+${BA.REGLER.tillit.kontrakt} tillit`), 'byens kort sier ikke at en kontrakt for byen gir tillit');
      krev(sv && /per døgn/.test(sv.textContent), 'byens kort sier ikke at å vokte byen gir tillit per døgn');
      krev(kort.querySelector('.budkamp') && /Budkamp/.test(tk), 'byens kort viser ikke budkampen når en rival frir');
      const mine = T.tilbud.filter(k => k.giver && String(k.giver.by) === 'ut8a'); d.byOppdrag = mine.map(k => k.tittel);
      krev(mine.length === 1 && mine[0].giver.slag === 'by', 'byen fikk ikke ett tilbud i Selskapet mens rivalen frir (' + mine.length + ')');
      // ---------- 6) Neste-lappen: en kjøpsavtale viker for ledige tilbud ----------
      if (sd && mine.length && SS.lapp) { const kjøp = { id: 'ut8kjøp', type: 'kjøp', vare: 'tømmer', perDøgn: 20, døgn: 5, døgnGjort: 1, status: 'aktiv', frist: tid + 3000, giver: { slag: 'firma', navn: 'Storlia Tømmer' }, sted: { navn: 'leiren', x: L.x, y: L.y } };
        sd.aktive.push(kjøp); let l = null; try { l = SS.lapp(); } catch (e) { l = { tekst: 'unntak: ' + e.message }; } d.lapp = l && l.tekst;
        krev(l && !(l.k && l.k.id === 'ut8kjøp'), `Neste-lappen står på kjøpsavtalen selv om det finnes ledige tilbud («${l && l.tekst}»)`);
        krev(window.Neste && Neste.slagFor({ slag: 'kontrakt', tekst: 'x', igjen: 60, l0: { k: kjøp } }) === 'avtale', 'Neste regner ikke kjøpsavtalen som en avtale som går av seg selv');
        sd.aktive.splice(sd.aktive.indexOf(kjøp), 1); }
      // budkampen: et lite løfte holder ikke (tillit 30 av 40), et stort løfte under rivalens pris gir ja
      const under = Math.round(rivalPris * BA.REGLER.rival.overby / 1000) * 1000;
      const nei = BS.forhandle({ by: 'ut8a', trinn: 'beskyttelse', pris: under, løfte: 'lite', varighet: 7 });
      krev(nei && nei.svar === 'nei' && /tillit/.test(nei.grunn), 'et lite løfte i budkampen fikk ikke nei for lav tillit: ' + JSON.stringify(nei));
      const ja = BS.forhandle({ by: 'ut8a', trinn: 'beskyttelse', pris: under, løfte: 'stort', varighet: 7 });
      d.budkamp = ja && ja.svar; krev(ja && ja.svar === 'ja' && b.avtale && b.avtale.trinn === 'beskyttelse' && b.avtale.mann === 6, 'budkampen kunne ikke vinnes med et stort løfte under rivalens pris: ' + JSON.stringify(ja));
      // en levert kontrakt for byen gir tillit
      if (sd && mine.length) { const k = mine[0], t0 = b.tillit; sd.ferdige.push(k); window.dispatchEvent(new CustomEvent('riksbrudd-kontrakt', { detail: { type: 'levert', id: k.id } }));
        d.levert = [t0, b.tillit]; krev(b.tillit === Math.min(100, t0 + BA.REGLER.tillit.kontrakt), `en levert kontrakt for byen ga ikke +${BA.REGLER.tillit.kontrakt} tillit (${t0} -> ${b.tillit})`); }
      SP.vis(false);
      // ---------- 5) bygglista i grupper ----------
      const lk = $('leirknapp'); if (lk && !menyÅpen) lk.click(); await vent(300); if (window.LeirSpill && LeirSpill.fane) LeirSpill.fane('bygg'); await vent(300);
      localStorage.removeItem('riksbrudd-byggrupper');
      const gr = [...document.querySelectorAll('#leirmeny .liste h4.gruppe')].map(h => [h.dataset.gruppe, h.classList.contains('lukket')]); d.grupper = gr.map(g => g[0] + (g[1] ? '*' : '')).join(', ');
      const typer = [...document.querySelectorAll('#leirmeny .liste .bygg.kort')].map(k => k.dataset.type);
      if (!gr.length) feil.push('bygglista har ingen grupper');
      else { const i = n => gr.findIndex(g => g[0] === n), pynt = gr.find(g => g[0] === 'Pynt');
        krev(i('Produksjon') >= 0 && i('Produksjon') < i('Forsvar'), 'Produksjon står ikke høyt i bygglista');
        krev(pynt && i('Pynt') === gr.length - 1 && pynt[1], '«Pynt» står ikke sammenfoldet nederst');
        const kj = document.querySelector('#leirmeny .liste .bygg.kort[data-type="kjegler"]'), br = document.querySelector('#leirmeny .liste .bygg.kort[data-type="brakke"]');
        if (kj) krev(kj.hidden, 'trafikkjeglene står synlige i bygglista'); krev(br && !br.hidden, 'brakka er ikke synlig i bygglista');
        krev(new Set(typer).size === typer.length, 'et bygg står to ganger i bygglista');
        const ph = document.querySelector('#leirmeny .liste h4[data-gruppe="Pynt"]'); if (ph && kj) { ph.click(); await vent(50); krev(!kj.hidden, '«Pynt» åpnes ikke med et trykk'); ph.click(); } }
      if (lk && !menyÅpen && $('leirmeny').classList.contains('på')) lk.click();
    } catch (e) { feil.push('unntak: ' + e.message); }
    finally {
      try { SP.vis(false); } catch (e) { /* */ }
      if (T) { T.tilbud = T.tilbud.filter(k => tilbud0.includes(k.id)); }
      if (sd) { sd.aktive.length = 0; sd.aktive.push(...aktive0); sd.ferdige.length = 0; sd.ferdige.push(...ferdige0); }
      if (eierFør === undefined) TETTSTEDER.delete('ut8a'); else TETTSTEDER.set('ut8a', eierFør);
      INFRA.tettsted = INFRA.tettsted.filter(t => t !== A); if (lagetInfra) INFRA = null;
      BS.sett(SB0); BS.andre(false);
      for (const [k, v] of ls) { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }
      const p = OppstartSpill.tilstand().penger; if (p > penger0) OppstartSpill.betal(p - penger0); else if (p < penger0) OppstartSpill.gi(penger0 - p);
      tid = tid0; skitten = true;
    }
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : `rykte «${d.hode}», budkamp ${d.budkamp}, byoppdrag «${d.byOppdrag && d.byOppdrag[0]}», tillit ${d.levert && d.levert.join('→')}, eksport ${d.eksportLåst ? 'låst' : 'åpen'}, grupper: ${d.grupper}`, data: d };
  }),
};
