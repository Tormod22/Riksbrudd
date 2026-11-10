"""Test av bitdelingen i nve.py (uten nett): python3 pipeline/fliser/test_nve.py
Hvis NVE_UT er satt (mappa fra nve.py), sjekkes også de ferdige filene: manifestet, at hver bit er gyldig JSON og ligger i sin blokk."""
import os, sys, json, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nve
from shapely.geometry import LineString

feil = 0
def sjekk(navn, ok, info=''):
    global feil
    if not ok: feil += 1
    print(('ok  ' if ok else 'FEIL'), navn, info)

S = nve.SPAN
sjekk('blokkstørrelse z7 = 32 768 m', S == 32768, str(S))
# blokk og blokk_boks henger sammen
x, y = 193300.0, 6896300.0; bx, by = nve.blokk(x, y); b = nve.blokk_boks(bx, by)
sjekk('Dombås ligger i sin blokk', b[0] <= x < b[2] and b[1] < y <= b[3], f'{bx},{by} {b}')
# nivå per bekk
sjekk('nivå: brede elver og orden ≥ 5 grov, 3–4 mellom, 1–2 fin',
      [nve.nivå_bekk(1, 1), nve.nivå_bekk(0, 6), nve.nivå_bekk(0, 4), nve.nivå_bekk(0, 3), nve.nivå_bekk(0, 2), nve.nivå_bekk(0, 1)] == [0, 0, 1, 1, 2, 2])
# delta-koding tilbake
P = [(100, 200), (110, 195), (130, 230)]; d = nve.delta(P, 50, 60)
x, y = d[0] + 50, d[1] + 60; Q = [(x, y)]
for i in range(2, len(d), 2): x += d[i]; y += d[i + 1]; Q.append((x, y))
sjekk('delta-koding', Q == P, str(d))
# en linje over blokkanten deles i to som møtes i kanten
x0 = b[2]; L = LineString([(x0 - 500, b[1] + 1000), (x0 + 700, b[1] + 1000)])
deler = nve.klipp_blokker(L)
sjekk('linje over kanten: to deler', len(deler) == 2 and {k for k, _ in deler} == {(bx, by), (bx + 1, by)}, str([(k, g.length) for k, g in deler]))
sjekk('delene har hele lengden', abs(sum(g.length for _, g in deler) - 1200) < 1e-6)
sjekk('linje inne i blokken: hel', len(nve.klipp_blokker(LineString([(b[0] + 10, b[1] + 10), (b[0] + 90, b[1] + 50)]))) == 1)
# mastrekke over kanten: spennet over kanten i blokka der det starter, første mast i neste blokk tas med
M = [(x0 - 600, b[1] + 100, True), (x0 - 250, b[1] + 100, False), (x0 + 120, b[1] + 100, True), (x0 + 480, b[1] + 100, True)]
mb = nve.master_blokker(M)
sjekk('mastrekke: to biter', len(mb) == 2 and len(mb[0][1]) == 3 and len(mb[1][1]) == 2 and mb[0][1][-1] == mb[1][1][0], str([(k, len(v)) for k, v in mb]))
sjekk('mastrekke: alle spenn med én gang', sum(len(v) - 1 for _, v in mb) == len(M) - 1)
# skriv: bitene etter hverandre, indeksen peker riktig
with tempfile.TemporaryDirectory() as t:
    B = {(bx, by, 0): {'v': 1}, (bx, by, 2): {'v': 2}, (bx + 1, by, 1): {'v': 3}}
    fil, idx, n = nve.skriv(t, 'prøve', B, 3, lambda o, x0, y0: {'x0': x0, 'y0': y0, **o})
    data = open(fil, 'rb').read()
    les = lambda k, nv: json.loads(data[idx[k][nv][0]: idx[k][nv][0] + idx[k][nv][1]])
    sjekk('skriv: indeksen finner bitene', les(f'{bx},{by}', 0)['v'] == 1 and les(f'{bx},{by}', 2)['v'] == 2 and les(f'{bx + 1},{by}', 1)['v'] == 3 and n == len(data))
    sjekk('skriv: tom bit har lengde 0', idx[f'{bx},{by}'][1] == [0, 0])
    sjekk('skriv: hjørnet er blokkens nedre venstre', les(f'{bx},{by}', 0)['x0'] == int(b[0]) and les(f'{bx},{by}', 0)['y0'] == int(b[1]))

# ferdige filer (valgfritt)
ut = os.environ.get('NVE_UT')
if ut:
    m = json.load(open(os.path.join(ut, 'manifest.json')))
    sjekk('manifest: versjon', m['versjon'].startswith('kart-nve-'), m['versjon'])
    for lag in ('bekker', 'kraft'):
        if lag not in m: continue
        data = open(os.path.join(ut, lag + '.json'), 'rb').read(); n = utenfor = 0; største = 0
        for k, liste in m[lag].items():
            bx, by = map(int, k.split(',')); bb = nve.blokk_boks(bx, by)
            for fra, lengde in liste:
                if not lengde: continue
                o = json.loads(data[fra: fra + lengde]); n += 1; største = max(største, lengde)
                if (o['x0'], o['y0']) != (int(bb[0]), int(bb[1])): utenfor += 1
        sjekk(f'{lag}: {n} biter er gyldig JSON i sin blokk', n > 100 and utenfor == 0, f'største bit {største / 1e6:.2f} MB')
        sjekk(f'{lag}: største bit under 4 MB (mellomstasjonen)', største < 4 * 1024 * 1024)
print('feil:', feil)
sys.exit(1 if feil else 0)
