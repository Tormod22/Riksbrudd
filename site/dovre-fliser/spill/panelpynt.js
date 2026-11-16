'use strict';
// Panelet nede til venstre (lag, kjøretøy, base, tettsted, bygg): statuslinja var én lang setning med prikker mellom
// (brukeren 16. nov: «forbedre det som allerede er»). Her blir hver opplysning en egen brikke, og et valgt lag får to målere
// (styrke og ammunisjon). Teksten i statuslinja er den samme som før for dem som leser den (prikkene står igjen, skjult).
(function () {
  const sub = document.getElementById('psub'), panel = document.getElementById('panel'); if (!sub || !panel) return;
  const css = document.createElement('style');
  css.textContent = `#psub{ display:flex; flex-wrap:wrap; gap:4px; } #psub .skille{ display:none; }
#psub .brikke{ background:#241e14; border:1px solid #3a3226; padding:1px 7px; white-space:nowrap; line-height:1.5; }
#psub .brikke.varsel{ border-color:#8a4a3a; color:#e7b3a3; } #psub .brikke.bra{ border-color:#56703a; color:#cfe0b0; }
#pmaal{ display:none; gap:10px; margin:6px 0 2px; } #pmaal.på{ display:flex; } #pmaal div{ flex:1; min-width:0; font-size:12px; color:var(--ink-dim); letter-spacing:.05em; text-transform:uppercase; }
#pmaal i{ display:block; height:6px; margin-top:2px; background:#2a2318; border:1px solid #3a3226; } #pmaal i b{ display:block; height:100%; background:#7c9a4e; } #pmaal i b.lav{ background:#c9a24a; } #pmaal i b.kritisk{ background:#c0563e; }`;
  document.head.appendChild(css);
  const maal = document.createElement('div'); maal.id = 'pmaal'; sub.after(maal);
  const VARSEL = /uten radiokontakt|ingen kontakt|såret|slått ut|tom for|mangler|sprengt|ødelagt/i, BRA = /radiokontakt|nedgravd/i;
  let jobber = false;
  function pynt() {
    if (jobber) return; jobber = true;
    try {
      if (!sub.querySelector('.brikke') && sub.childNodes.length === 1 && sub.firstChild.nodeType === 3 && sub.textContent.includes(' · ')) {
        const deler = sub.textContent.split(' · '); sub.textContent = '';
        deler.forEach((t, i) => { const b = document.createElement('span'); b.className = 'brikke' + (VARSEL.test(t) ? ' varsel' : BRA.test(t) && !/uten/.test(t) ? ' bra' : ''); b.textContent = t; sub.appendChild(b);
          if (i < deler.length - 1) { const s = document.createElement('span'); s.className = 'skille'; s.textContent = ' · '; sub.appendChild(s); } });
      }
      // målere for et valgt lag
      const s = typeof valgt !== 'undefined' && valgt && valgt.menn && panel.classList.contains('på') ? valgt : null;
      if (!s) { maal.classList.remove('på'); return; }
      const alle = s.menn.length, lev = s.menn.filter(q => q.hp > 0).length, ammo = window.Forsyning && Forsyning.ammo ? Forsyning.ammo(s) : 1;
      const kl = v => v < .34 ? 'kritisk' : v < .67 ? 'lav' : '';
      const nøkkel = lev + '/' + alle + '/' + Math.round(ammo * 100); if (maal.dataset.n !== nøkkel) { maal.dataset.n = nøkkel;
        maal.innerHTML = `<div>Styrke ${lev} av ${alle}<i><b class="${kl(lev / alle)}" style="width:${Math.round(lev / alle * 100)}%"></b></i></div><div>Ammunisjon ${Math.round(ammo * 100)} %<i><b class="${kl(ammo)}" style="width:${Math.round(Math.max(0, Math.min(1, ammo)) * 100)}%"></b></i></div>`; }
      maal.classList.add('på');
    } finally { jobber = false; }
  }
  new MutationObserver(pynt).observe(sub, { childList: true, characterData: true, subtree: true });
  new MutationObserver(pynt).observe(panel, { attributes: true, attributeFilter: ['class'] });
  window.Panelpynt = { pynt };
})();
