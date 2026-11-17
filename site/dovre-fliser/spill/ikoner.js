/* Riksbrudd – IKONER (17. nov, brukeren: «har spillet gode ikoner, gir ting mening?» – gjennomgangen viste at nesten alt var tekst).
 * Et eget sett enkle strekikoner (24 × 24, tegnet her – ingen filer, ingen fonter) som legges foran teksten med CSS-maske, så de får
 * tekstens farge. Et element får ikon med data-ikon="navn". Denne fila setter data-ikon på statuslinja, fanene og flisene i Leir-menyen,
 * byggene i byggelista (data-type), varslene og oppdragene. Teksten står alltid ved siden av: ikonet er en hjelp til å finne fram, ikke
 * en erstatning. window.Ikoner (navn, har, merk).
 */
(function () {
  'use strict';
  const I = {
    klokke: "<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 2'/>", fjell: "<path d='M3 19l6-10 4 6 2-3 6 7z'/>", last: "<path d='M12 4v11m-4-4l4 4 4-4M5 20h14'/>",
    olje: "<path d='M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z'/>", vaer: "<path d='M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 18z'/>",
    penger: "<circle cx='12' cy='12' r='9'/><path d='M9.5 8v8m0-4l5-4m-5 4l5 4'/>", strom: "<path d='M13 2L5 14h6l-1 8 8-12h-6z'/>",
    folk: "<circle cx='9' cy='8' r='3'/><path d='M3 20a6 6 0 0 1 12 0'/><circle cx='17' cy='9' r='2.5'/><path d='M16.5 14a5 5 0 0 1 4.5 5'/>",
    sted: "<path d='M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z'/><circle cx='12' cy='10' r='2.5'/>", fps: "<path d='M4 18a8 8 0 1 1 16 0M12 18l4-6'/>",
    maal: "<path d='M6 21V4m0 1h11l-2 4 2 4H6'/>", hammer: "<path d='M5 20l9-9M13 5l6 6-2 2-6-6zM11 7l-2-2 2-2 2 2'/>", kasse: "<path d='M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8'/>",
    plan: "<path d='M4 4h16v16H4zM4 10h16M10 4v16'/>", hus: "<path d='M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6'/>", seng: "<path d='M3 18V7m0 7h18v4M3 14v-3h7a3 3 0 0 1 3 3M21 14v-2'/>",
    mat: "<path d='M6 3v8a2 2 0 0 0 4 0V3M8 11v10M16 3c-2 2-2 7 0 9v9'/>", kors: "<rect x='3' y='3' width='18' height='18' rx='2'/><path d='M12 7v10M7 12h10'/>",
    blad: "<path d='M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19l8-8'/>", tank: "<ellipse cx='12' cy='6' rx='7' ry='3'/><path d='M5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6'/>",
    motor: "<rect x='4' y='8' width='16' height='10' rx='1'/><path d='M8 8V5h4v3M7 13h3M14 11v4M17 11v4'/>",
    sol: "<circle cx='12' cy='12' r='4'/><path d='M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19'/>",
    batteri: "<rect x='3' y='8' width='16' height='9' rx='1'/><path d='M21 11v3M7 12.5h4M9 10.5v4'/>", skjerm: "<rect x='3' y='4' width='18' height='12' rx='1'/><path d='M8 20h8M12 16v4'/>",
    mast: "<path d='M12 21V9M8 21l4-12 4 12M7 6a7 7 0 0 1 10 0M9.5 8a3.5 3.5 0 0 1 5 0'/>", kamera: "<rect x='3' y='7' width='12' height='9' rx='1'/><path d='M15 10l6-3v9l-6-3'/>",
    taarn: "<path d='M8 21l1-11h6l1 11M7 10h10V5H7zM10 21v-5h4v5'/>", telt: "<path d='M3 20L12 4l9 16zM12 4v16M9 20l3-6 3 6'/>", container: "<rect x='3' y='7' width='18' height='10'/><path d='M7 7v10M11 7v10M15 7v10'/>",
    verktoy: "<path d='M15 4a5 5 0 0 0-5 7l-7 7 3 3 7-7a5 5 0 0 0 7-5l-3 3-3-3z'/>", heli: "<circle cx='12' cy='12' r='9'/><path d='M9 8v8M15 8v8M9 12h6'/>",
    gjerde: "<path d='M4 20V8l2-3 2 3v12M12 20V8l2-3 2 3v12M2 12h20M2 16h20'/>", port: "<path d='M4 21V5h16v16M4 9h16M12 9v12'/>", sandsekk: "<path d='M4 18h16M5 14h14v4H5zM7 10h10v4H7z'/>",
    veg: "<path d='M6 21L9 3M18 21L15 3M12 5v3M12 11v3M12 17v3'/>", bronn: "<path d='M5 21V11h14v10M4 11h16M7 11V6h10v5M12 6v5'/>", varsel: "<path d='M12 3l10 18H2zM12 10v5M12 18v.5'/>",
    oppdrag: "<path d='M12 3l9 9-9 9-9-9z'/>", hjerte: "<path d='M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z'/>", sekk: "<path d='M7 9a5 5 0 0 1 10 0v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2zM9 6V5a3 3 0 0 1 6 0v1M9 14h6'/>",
    vind: "<path d='M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h6'/>", vann: "<path d='M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11zM9 15a3 3 0 0 0 3 3'/>", sikte: "<circle cx='12' cy='12' r='7'/><path d='M12 2v5M12 17v5M2 12h5M17 12h5'/>",
  };
  const url = s => `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${s}</svg>`)}")`;
  // byggene, fanene og statuslinja: hvilket ikon de får
  const BYGG = { kontrollrom: 'skjerm', brakke: 'seng', vakttårn: 'taarn', port: 'port', gjerde: 'gjerde', lagertelt: 'telt', container: 'container', verksted: 'verktoy', sykestue: 'kors', drivstofftank: 'tank', aggregat: 'motor', solcelle: 'sol',
    kameramast: 'kamera', radiomast: 'mast', drivhus: 'blad', helikopterplass: 'heli', sandsekkvoll: 'sandsekk', kjøkken: 'mat', veg: 'veg', batteri: 'batteri', brønn: 'bronn' };
  const STAT = { sDag: 'klokke', sH: 'fjell', sKB: 'last', sOlje: 'olje', sVaer: 'vaer', sPenger: 'penger', sStrom: 'strom', sFolk: 'folk', sHvor: 'sted', sFps: 'fps', sMaal: 'maal' };
  const FLIS = [[/^kassa/i, 'penger'], [/^strøm/i, 'strom'], [/^diesel/i, 'tank'], [/^senge/i, 'seng']], FANE = ['hammer', 'kasse', 'plan', 'maal'];
  const css = document.createElement('style');
  css.textContent = `[data-ikon]::before{ content:''; display:inline-block; width:1.05em; height:1.05em; margin-right:.35em; vertical-align:-.16em; background:currentColor; opacity:.85; -webkit-mask:var(--ik) center/contain no-repeat; mask:var(--ik) center/contain no-repeat; flex:none; }
${Object.entries(I).map(([n, s]) => `[data-ikon="${n}"]{ --ik:${url(s)}; }`).join('\n')}
.stats > div[data-ikon]::before{ color:var(--ink-dim,#a99); width:.95em; height:.95em; } #leirmeny .flis[data-ikon]::before{ float:right; width:1.25em; height:1.25em; margin:0; opacity:.5; }
#leirmeny .liste .bygg[data-ikon]{ position:relative; padding-left:34px; } #leirmeny .liste .bygg[data-ikon]::before{ position:absolute; left:4px; top:8px; width:22px; height:22px; margin:0; color:#c9b26a; opacity:1; }
#leirmeny .faner button{ white-space:nowrap; padding-left:3px; padding-right:3px; } #leirmeny .faner button[data-ikon]::before{ width:.85em; height:.85em; margin-right:.25em; }
#leirmeny .oppdrag[data-ikon]::before{ float:left; width:1.2em; height:1.2em; margin:.1em .45em 0 0; color:#c9b26a; opacity:1; } #varsler button[data-ikon]::before{ margin-right:0; }`;
  document.head.appendChild(css);
  function merk() {
    for (const [id, n] of Object.entries(STAT)) { const e = document.getElementById(id), d = e && e.closest('.stats > div'); if (d && d.dataset.ikon !== n) d.dataset.ikon = n; }
    const m = document.getElementById('leirmeny'); if (!m || !m.classList.contains('på')) return;
    for (const f of m.querySelectorAll('.flis:not([data-ikon])')) { const t = f.textContent, r = FLIS.find(q => q[0].test(t)); if (r) f.dataset.ikon = r[1]; }
    [...m.querySelectorAll('.faner button')].forEach((b, i) => { if (FANE[i] && b.dataset.ikon !== FANE[i]) b.dataset.ikon = FANE[i]; });
    for (const b of m.querySelectorAll('.liste .bygg[data-type]:not([data-ikon])')) { const n = BYGG[b.dataset.type]; if (n) b.dataset.ikon = n; }
  }
  setInterval(merk, 400); new MutationObserver(() => merk()).observe(document.body, { childList: true, subtree: false });
  { const m = document.getElementById('leirmeny'); if (m) new MutationObserver(merk).observe(m, { childList: true }); else setTimeout(() => { const q = document.getElementById('leirmeny'); if (q) new MutationObserver(merk).observe(q, { childList: true }); }, 2000); }
  window.Ikoner = { navn: () => Object.keys(I), har: n => !!I[n], merk, BYGG, STAT };
})();
