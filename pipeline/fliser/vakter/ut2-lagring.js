// VAKT for pakka «ut2-lagring» (G0, 28. nov – docs/natt/ut2-lagring.md): nettleserens database (IndexedDB) under localStorage.
// (1) lagringsplassene ligger i databasen (ikke i localStorage) og står der også når databasen leses direkte; (2) versjonsmerket finnes og
// omgjøringen ved oppstart gikk uten feil, og registeret kjører en prøveomgjøring; (3) LagringStor skriver og leser per leir; (4) full
// localStorage (LagringSide.simuler('fullt-ls')): en nøkkel som ikke får plass, flyttes til databasen og kan leses, og går tilbake når det
// er plass; (5) lagringsmenyen viser plassen spillet bruker. Setter alt tilbake: localStorage, databasen, simuleringen og panelet.
module.exports = {
  navn: 'lagring i nettleserens database (ut2-lagring)',
  kjør: async (pg, profil) => pg.evaluate(async (profil) => {
    const feil = [], d = { profil }, krev = (b, t) => { if (!b) feil.push(t); };
    const LS = window.LagringSide, M = window.LagringMeny, ST = window.LagringStor;
    if (!LS || !M || !ST || !LS.klar || !window.Lagring || !Lagring.omgjør) return { ok: false, tekst: 'LagringSide/LagringMeny/LagringStor/Lagring.omgjør mangler' };
    await LS.klar;
    // les én nøkkel rett fra databasen (uten minnekopien)
    const fraDb = k => new Promise(ja => { try { const r = indexedDB.open('riksbrudd'); r.onsuccess = () => { const db = r.result; try {
      const q = db.transaction('nokler', 'readonly').objectStore('nokler').get(k); q.onsuccess = () => { ja(q.result === undefined ? null : q.result); db.close(); }; q.onerror = () => { ja(null); db.close(); }; }
      catch (e) { ja(null); db.close(); } }; r.onerror = () => ja(null); } catch (e) { ja(null); } });
    // ta vare på alt (localStorage rått og databasens nøkler, via key()/rå.get som også ser databasen)
    const før = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && /^riksbrudd-/.test(k)) før[k] = LS.rå.get(k); }
    const varÅpen = M.erÅpen();
    try {
      krev(LS.database() === 'ok', 'databasen virker ikke: ' + LS.database() + ' ' + (LS.dbFeil() ? LS.dbFeil().message : ''));
      // (1) plassen
      const r1 = M.lagreHer('1', 'Vakt ut2'); await LS.tømt();
      const nøkkel = LS.tilRå('riksbrudd-plass-1');
      krev(r1.ok, 'lagret ikke i plass 1: ' + (r1.feil || ''));
      krev(!Object.keys(localStorage).includes(nøkkel), 'lagringsplassen ligger i localStorage (skal ligge i databasen)');
      const iDb = await fraDb(nøkkel); krev(iDb && JSON.parse(iDb).navn === 'Vakt ut2', 'lagringsplassen finnes ikke i databasen');
      krev(M.plass('1') && M.plass('1').navn === 'Vakt ut2', 'lagringsmenyen leser ikke plassen fra databasen');
      let fantKey = false; for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i) === nøkkel) fantKey = true;
      krev(fantKey && localStorage.getItem('riksbrudd-plass-1') === iDb, 'localStorage.key()/getItem ser ikke plassen i databasen (modulene skal ikke merke noe)');
      d.plass = Math.round(iDb.length / 1000) + ' k tegn';
      // (2) versjonen og omgjøringene
      const v = LS.versjon(); d.versjon = v.lagret;
      krev(v.lagret === LS.VERSJON && v.omgjort && !v.omgjort.feil, 'versjonsmerket mangler eller omgjøringen feilet: ' + JSON.stringify(v));
      const R = LS.lagOmgjøringer(2); R.omgjør(1, l => { const k2 = l.json('riksbrudd-k2'); k2.prøve = true; l.skriv('riksbrudd-k2', k2); });
      const ro = R.kjør({ 'riksbrudd-k2': LS.rå.get('riksbrudd-k2') || '{}' }, 1);
      krev(ro.til === 2 && JSON.parse(ro.endringer['riksbrudd-k2']).prøve === true, 'prøveomgjøringen ble ikke kjørt');
      // (3) LagringStor
      krev(ST.skriv('vaktut2', { n: [1, 2, 3] }), 'LagringStor.skriv feilet');
      krev(JSON.stringify(ST.les('vaktut2')) === '{"n":[1,2,3]}', 'LagringStor.les gir ikke det som ble skrevet');
      krev(ST.les('vaktut2', { felles: true }) === null, 'en verdi for leiren leses som felles');
      await LS.tømt(); const s = await fraDb(LS.tilRå('riksbrudd-stor-vaktut2'));
      krev(s && JSON.parse(s).v.n.length === 3, 'LagringStor er ikke skrevet til databasen');
      krev(M.spillNå()['riksbrudd-stor-vaktut2'], 'de store dataene følger ikke med i en lagringsplass');
      ST.fjern('vaktut2'); krev(ST.les('vaktut2') === null, 'LagringStor.fjern virket ikke');
      // (4) full localStorage: nøkkelen flyttes til databasen, og tilbake når det er plass
      const stor = JSON.stringify({ leir: 'vakt', d: 'z'.repeat(20000) });
      LS.simuler('fullt-ls');
      let kastet = false; try { localStorage.setItem('riksbrudd-vaktut2', stor); } catch (e) { kastet = true; }
      krev(!kastet, 'setItem kastet med full localStorage (skulle flyttes til databasen)');
      krev(LS.flyttede().includes(LS.tilRå('riksbrudd-vaktut2')), 'nøkkelen ble ikke flyttet til databasen');
      krev(localStorage.getItem('riksbrudd-vaktut2') === stor, 'den flyttede nøkkelen kan ikke leses');
      krev(LS.virker() === 'ok' && M.status().tilstand === 'ok' && /database/.test(M.status().tekst), 'statusen sier ikke at spillet ligger i databasen: ' + M.status().tekst);
      await LS.tømt(); krev((await fraDb(LS.tilRå('riksbrudd-vaktut2'))) === stor, 'den flyttede nøkkelen er ikke i databasen');
      LS.simuler(null);
      localStorage.setItem('riksbrudd-vaktut2', stor);
      krev(!LS.flyttede().includes(LS.tilRå('riksbrudd-vaktut2')) && Object.keys(localStorage).includes(LS.tilRå('riksbrudd-vaktut2')), 'nøkkelen gikk ikke tilbake til localStorage');
      localStorage.removeItem('riksbrudd-vaktut2');
      // (5) panelet
      M.åpne(); await new Promise(r => setTimeout(r, 50)); const pb = document.querySelector('#lagremeny .plassbruk');
      d.plassbruk = pb ? pb.textContent : ''; krev(/^Plass: spillet \d/.test(d.plassbruk) && /database/.test(d.plassbruk), 'panelet viser ikke plassen: ' + d.plassbruk);
      const ark = document.querySelector('#lagremeny .ark').getBoundingClientRect();
      krev(ark.left >= 0 && ark.right <= innerWidth + 1, 'panelet går utenfor skjermen');
      if (!varÅpen) M.lukk();
      d.str = LS.størrelse();
    } catch (e) { feil.push('kastet: ' + e.message); }
    finally {
      LS.simuler(null); LS.lås(false); if (!varÅpen) M.lukk();
      const nå = []; for (let i = 0; i < localStorage.length; i++) nå.push(localStorage.key(i));
      for (const k of nå) if (k && /^riksbrudd-/.test(k) && !(k in før)) LS.rå.del(k);
      for (const [k, v] of Object.entries(før)) if (LS.rå.get(k) !== v) LS.rå.set(k, v);
      // (sjekkes før noe ventes på: modulene skriver klokka og verden av seg selv)
      let likt = true; for (const [k, v] of Object.entries(før)) if (LS.rå.get(k) !== v) likt = false;
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && /^riksbrudd-/.test(k) && !(k in før)) likt = false; }
      krev(likt && !LS.flyttede().includes(LS.tilRå('riksbrudd-vaktut2')), 'lagringen ble ikke satt tilbake');
      await LS.tømt();
    }
    const ok = feil.length === 0;
    return { ok, tekst: ok ? `plass i databasen (${d.plass}), versjon ${d.versjon}, prøveomgjøring, LagringStor, full localStorage flyttet og tilbake, «${d.plassbruk.slice(0, 70)}…»` : feil.join('; '), data: d };
  }, profil),
};
