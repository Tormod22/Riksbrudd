"""Test av kaier.py (uten OSM-fil). Kjør: python3 pipeline/fliser/test_kaier.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kaier as K
n = 0
def ok(b, t):
    global n; assert b, t; n += 1
ok(K.type_fra_merker({'man_made': 'pier'}) == 1 and K.type_fra_merker({'man_made': 'quay'}) == 1, 'kai og brygge')
ok(K.type_fra_merker({'leisure': 'marina'}) == 2 and K.type_fra_merker({'harbour': 'yes'}) == 3 and K.type_fra_merker({'landuse': 'port'}) == 3, 'havn og småbåthavn')
ok(K.type_fra_merker({'amenity': 'ferry_terminal', 'man_made': 'pier'}) == 4 and K.type_fra_merker({'building': 'yes'}) == 0, 'ferjeterminal går foran, bygg er ikke kai')
ok(abs(K.lengde([0, 30, 30], [0, 0, 40]) - 70) < 1e-9, 'linje')
ok(abs(K.lengde([0, 50, 50, 0, 0], [0, 0, 4, 4, 0]) - 54) < 1e-9, 'flate = halve omkretsen')
ok(K.lengde([5], [5]) == 0, 'ett punkt')
# en badebrygge alene faller bort; to brygger i samme rute som til sammen er lange nok, blir ett sted
S = K.klynger([(1000, 1000, 1, 8, ''), (5000, 5000, 1, 9, ''), (5030, 5010, 1, 12, 'Bryggen')])
ok(len(S) == 1 and S[0][3] == 21 and S[0][4] == 'Bryggen' and (S[0][0], S[0][1]) == (5030, 5010), 'slått sammen ved den lengste: ' + str(S))
# høyeste type vinner, og en havn uten lengde blir med
S = K.klynger([(100, 100, 1, 40, ''), (110, 105, 4, 0, 'Fergeleiet'), (9000, 9000, 3, 0, ''), (20000, 100, 2, 0, 'Gjestehavna')])
ok(sorted(q[2] for q in S) == [2, 3, 4], 'typer: ' + str(S)); ok(next(q for q in S if q[2] == 4)[3] == 40, 'kailengden følger med ferjeterminalen')
# samme inndata i en annen rekkefølge gir samme svar
A = [(100, 100, 1, 40, ''), (110, 105, 1, 30, 'B'), (9000, 9000, 3, 0, 'H')]
ok(K.klynger(A) == K.klynger(A[::-1]), 'fast uansett rekkefølge')
# koding fram og tilbake
S = [(250000, 6600000, 1, 55, 'Kaia'), (-30000, 6700000, 3, 0, ''), (250000, 6590000, 2, 0, 'Kaia'), (900000, 7900000, 4, 120, 'Ærøy ferjekai')]
o = K.kode(S); ok(o['n'] == 4 and len(o['d']) == 20 and o['navn'] == ['Kaia', 'Ærøy ferjekai'], 'kodet: ' + str(o))
ok(K.dekod(o) == sorted(S), 'dekodet likt'); ok(all(isinstance(v, int) for v in o['d']), 'bare heltall')
print(f'ok   kaier.py: {n} sjekker')
