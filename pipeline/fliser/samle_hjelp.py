"""Samler hjelpetekstene fra pakkene (docs/natt/*-hjelp.json = [[tittel, tekst, gruppe]]) i site/dovre-fliser/spill/hjelp-natt.js
(window.HJELP_TILLEGG), som spill/hjelp.js leser. Kjør på nytt når en pakke har endret hjelpefila si, og så versjon.py."""
import glob, json, os
HER = os.path.dirname(os.path.abspath(__file__)); ROT = os.path.join(HER, '..', '..')
GRUPPER = ['Kom i gang', 'Leiren', 'Lag og strid', 'I 3D', 'Vær, lyd og bilde']; alle = []; sett = set()
for f in sorted(glob.glob(os.path.join(ROT, 'docs', 'natt', '*-hjelp.json'))):
    for rad in json.load(open(f, encoding='utf-8')):
        t, tekst = rad[0], rad[1]; g = rad[2] if len(rad) > 2 and rad[2] in GRUPPER else 'Kom i gang'
        if t in sett: continue
        sett.add(t); alle.append([t, tekst, g])
ut = os.path.join(ROT, 'site', 'dovre-fliser', 'spill', 'hjelp-natt.js')
open(ut, 'w', encoding='utf-8').write("'use strict';\n// Laget av pipeline/fliser/samle_hjelp.py fra docs/natt/*-hjelp.json – ikke rediger for hånd.\nwindow.HJELP_TILLEGG = " + json.dumps(alle, ensure_ascii=False, indent=0) + ";\n")
print(len(alle), 'hjelpeemner', {g: sum(1 for a in alle if a[2] == g) for g in GRUPPER})
