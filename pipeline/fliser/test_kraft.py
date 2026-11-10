"""Test av geometrien i kraft.py (uten nett): python3 pipeline/fliser/test_kraft.py"""
import os, sys, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kraft import klynger, master_langs, klipp, UT

feil = 0
def sjekk(navn, ok, info=''):
    global feil
    if not ok: feil += 1
    print(('ok  ' if ok else 'FEIL'), navn, info)

# fire bein-punkt på én mast + en mast 300 m unna -> to master
k = klynger([(0, 0), (6, 0), (0, 6), (6, 6), (300, 0)])
sjekk('mastebein slås sammen', len(k) == 2 and abs(k[0][0] - 3) < .01 and abs(k[0][1] - 3) < .01, str(k))

# rett linje 1000 m uten ekte master, spenn 300 -> master i endene og jevnt fordelt (spenn ≤ 1,45 × 300)
m = master_langs([(0, 0), (1000, 0)], [], 300)
spenn = [m[i + 1][0] - m[i][0] for i in range(len(m) - 1)]
sjekk('fyller inn master', m[0][0] == 0 and m[-1][0] == 1000 and max(spenn) <= 300 * 1.45 and not any(e for _, e in m), str([round(s) for s, _ in m]))

# knekk midt på: der må det stå en mast
m = master_langs([(0, 0), (500, 0), (500, 500)], [100, 400], 300)
sjekk('mast i knekkpunktet', any(abs(s - 500) < 1 for s, _ in m), str([(round(s), e) for s, e in m]))
sjekk('ekte master beholdes', sum(1 for _, e in m if e) == 2)

# klipp: bare biter inne i området, med én mast utenfor i hver ende
b = klipp([(-100, 0, 1), (50, 0, 1), (150, 0, 1), (400, 0, 1), (600, 0, 1)], (0, -10, 200, 10))
sjekk('klipp ved kanten', len(b) == 1 and len(b[0]) == 4, str(b))

# filen i git: liten, har store linjer med master og trafostasjonen ved Dombås
if os.path.exists(UT):
    K = json.load(open(UT, encoding='utf-8'))
    st = os.path.getsize(UT)
    kv = {l['kv'] for l in K['linjer']}
    sjekk('kraft.json < 1 MB', st < 1024 * 1024, f'{st / 1024:.0f} KB')
    sjekk('300, 132, 66 og 22 kV', {300, 132, 66, 22} <= kv, str(sorted(kv)))
    sjekk('mastene i par', all(len(l['m']) == 2 * len(l['e']) for l in K['linjer']))
    sjekk('trafostasjon', len(K['trafo']) >= 1)
print('feil:', feil)
sys.exit(1 if feil else 0)
