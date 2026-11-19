// VAKT «startskjermen (runde 6)»: kjønn gir et passende portrett (og valg gjort etterpå står), «Tilfeldig» gir aldri kvinne med skjegg,
// fanene står under «Utseende», portrettet er fast (sticky) og glideren har spillets stil, utkastet lagres og leses igjen, steg 3 sier
// riktig område, pilotens lag/kjøretøy/base kan gjemmes og kommer tilbake på samme plass, og leirvalget advarer om høyfjell.
// Setter alt tilbake: startskjermen og banneret lukkes, kameraet, valgt, OppstartSpill.test og utkastnøkkelen som før.
module.exports = {
  navn: 'startskjermen (runde 6)',
  kjør: async (pg, profil) => {
    const data = await pg.evaluate(async () => {
      const OS = window.OppstartSpill, d = {}; if (!OS || !window.Oppstart || !window.Leirvalg) return { mangler: true };
      const el = id => document.getElementById(id), kam0 = { ...kam }, valgt0 = valgt, test0 = OS.test, utk0 = localStorage.getItem(OS.UTKAST);
      const vent = ms => new Promise(r => setTimeout(r, ms));
      const klikk = t => { const b = [...document.querySelectorAll('#oppstart button')].find(x => x.textContent.trim() === t); if (!b) throw new Error('mangler knappen ' + t); b.click(); };
      try {
        // 1. kjønnet
        OS.nytt(); const src0 = (document.querySelector('#oppstart .bilde img') || {}).src;
        klikk('Kvinne'); let p = OS.utkast().karakter.portrett; d.kvinne = [p.hair, p.facialHair];
        d.bildeEndret = (document.querySelector('#oppstart .bilde img') || {}).src !== src0;
        d.kvinneOk = p.gender === 'kvinne' && p.facialHair === 'ingen' && Oppstart.KJØNN.kvinne.hår.includes(p.hair);
        klikk('Hår'); klikk('Kort'); klikk('Ansikt'); klikk('Mann'); klikk('Kvinne'); p = OS.utkast().karakter.portrett;
        d.valgtBeholdt = p.hair === 'short' && p.facialHair === 'ingen';
        let skjegg = 0; for (let i = 0; i < 30; i++) { klikk('Tilfeldig utseende'); p = OS.utkast().karakter.portrett; if (p.gender === 'kvinne' && p.facialHair !== 'ingen') skjegg++; }
        d.skjegg = skjegg;
        // 2. fanene, portrettet og glideren
        klikk('Ansikt'); const faner = document.querySelector('#oppstart .faner'), utseende = faner && faner.parentElement.previousElementSibling;
        d.faner = !!faner && !!utseende && utseende.textContent === 'Utseende';
        const bl = document.querySelector('#oppstart .to>.bilde'); d.sticky = !!bl && getComputedStyle(bl).position === 'sticky';
        const rg = document.querySelector('#oppstart input[type=range]'), cs = rg && getComputedStyle(rg); d.glider = !!cs && (cs.appearance === 'none' || cs.webkitAppearance === 'none');
        // 3. utkastet
        OS.utkast().karakter.navn = 'Vakt Utkast'; OS.lagreUtkast(true); const lest = OS.lesUtkast(); d.utkast = !!(lest && lest.utkast.karakter.navn === 'Vakt Utkast' && lest.steg === 1);
        // 4. steg 3 sier riktig område
        OS.vis(3); const st = OS.sted(); d.område = st.navn; d.steg3 = document.querySelector('#oppstart .steg').textContent.includes('Hvor som helst ' + st.hvor);
        // 5. lagene fra piloten gjemmes og kommer tilbake på samme plass
        const før = { e: ENHETER.slice(), k: KJORETOY.slice(), b: OLJE.BASER[0] ? [OLJE.BASER[0].x, OLJE.BASER[0].y] : null };
        d.gjemt = OS.gjemStart(true);
        d.ingenIgjen = !ENHETER.some(e => e.side === 'blå' && !e.karakter) && !KJORETOY.some(k => k.side === 'blå') && (!før.b || OLJE.BASER[0].x < -1e6);
        OS.gjemTilbake();
        d.tilbake = ENHETER.length === før.e.length && ENHETER.every((e, i) => e === før.e[i]) && KJORETOY.length === før.k.length && KJORETOY.every((k, i) => k === før.k[i]) && (!før.b || (OLJE.BASER[0].x === før.b[0] && OLJE.BASER[0].y === før.b[1]));
        // 6. leirvalget: høyfjell gir advarsel, «ingen kai» ties der det ikke er sjø
        const v = Leirvalg.vurder({ land: 100, skog: 0, åpent: 1, vegM: Infinity, sjø: false }, { h: 1575, tregrense: 1100, by: null });
        d.regel = v.advarsler.length === 2 && /Høyfjell/.test(v.advarsler[0]) && Leirvalg.kaiTekst('Ingen kai innen 10 km – leiren får ingen båter.', false) === '';
        klikk('Velg på kartet'); const grunn = await OS.prøvLeir(206000, 6893500);
        for (let i = 0; i < 60 && !document.querySelector('#leirvalg .adv'); i++) await vent(250);
        d.banner = el('leirvalg').innerText.replace(/\s+/g, ' ').slice(0, 160); d.advarsel = !grunn && !!document.querySelector('#leirvalg .adv') && /Høyfjell/.test(d.banner);
      } catch (e) { d.feil = e.message; }
      finally {
        OS.lukk(); OS.test = test0; Object.assign(kam, kam0); valgt = valgt0; skitten = true;
        try { if (utk0 === null) localStorage.removeItem(OS.UTKAST); else localStorage.setItem(OS.UTKAST, utk0); } catch (e) { /* ingen lagring */ }
        if (window.visPanel) visPanel();
      }
      d.lukket = !el('oppstart').classList.contains('på') && !el('leirvalg').classList.contains('på');
      return d;
    });
    if (data.mangler) return { ok: true, tekst: 'startskjermen: modulene mangler (hoppet over)', data };
    const ok = !data.feil && data.kvinneOk && data.bildeEndret && data.valgtBeholdt && data.skjegg === 0 && data.faner && data.sticky && data.glider && data.utkast &&
      data.steg3 && data.gjemt > 0 && data.ingenIgjen && data.tilbake && data.regel && data.advarsel && data.lukket;
    return { ok, tekst: `startskjermen: kvinne ${data.kvinne} (bilde endret ${data.bildeEndret}), valgt frisyre står ${data.valgtBeholdt}, tilfeldig med skjegg ${data.skjegg}, faner/fast portrett/glider ${data.faner}/${data.sticky}/${data.glider}, utkast ${data.utkast}, steg 3 «${data.område}» ${data.steg3}, gjemt ${data.gjemt} og tilbake ${data.tilbake}, høyfjell-advarsel ${data.advarsel}${data.feil ? ' FEIL: ' + data.feil : ''}`, data };
  },
};
