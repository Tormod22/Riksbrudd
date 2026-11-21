"""Test for kjedene og anleggene i bygninger.py: python3 pipeline/fliser/test_bygninger.py"""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
from bygninger import kjede, anlegg_type, bygg_type, utseende, farge, lag_fliser
feil = 0
for navn, ventet in [('KIWI Dombås', 1), ('Sparebank 1 SMN', 0), ('Coop Extra Lesja', 3), ('Coop Marked Dovre', 32), ('REMA 1000', 2),
                     ('Bunnpris Otta', 10), ('Circle K Dombås', 12), ("McDonald's", 28), ('Joker Hjerkinn', 9), ('Vitusapotek', 18), ('Kiwiklubben', 0)]:
    k = kjede({'name': navn}); ok = k == ventet; feil += not ok; print(('ok   ' if ok else 'FEIL ') + f'{navn} -> {k}')
for tags, ventet in [({'leisure': 'pitch', 'sport': 'soccer'}, 1), ({'leisure': 'pitch', 'sport': 'tennis'}, 2), ({'leisure': 'track'}, 4),
                     ({'amenity': 'parking'}, 6), ({'amenity': 'parking', 'parking': 'underground'}, 0)]:
    a = anlegg_type(tags); ok = a == ventet; feil += not ok; print(('ok   ' if ok else 'FEIL ') + f'{tags} -> {a}')
# (21. nov, runde 15) helsebygg og utseende fra OSM
for b, tags, ventet in [('yes', {'amenity': 'nursing_home'}, 15), ('residential', {'amenity': 'nursing_home'}, 15), ('nursing_home', {}, 15),
                        ('yes', {'amenity': 'social_facility', 'social_facility': 'nursing_home'}, 15), ('yes', {'amenity': 'social_facility', 'social_facility': 'food_bank'}, 5),
                        ('yes', {'amenity': 'clinic'}, 16), ('commercial', {'amenity': 'doctors'}, 16), ('hospital', {'amenity': 'clinic'}, 13),
                        ('yes', {'amenity': 'hospital'}, 13), ('house', {}, 0), ('garage', {'amenity': 'clinic'}, 1), ('yes', {}, 5), ('church', {}, 8)]:
    t = bygg_type(b, tags); ok = t == ventet; feil += not ok; print(('ok   ' if ok else 'FEIL ') + f'building={b} {tags} -> {t}')
for tags, ventet in [({'roof:shape': 'gabled', 'building:levels': '2', 'roof:colour': 'red', 'building:colour': '#fff'}, {'r': 2, 'l': 2, 'tf': 0x9a3a2c + 1, 'vf': 0xffffff + 1}),
                     ({'roof:shape': 'hipped', 'building:material': 'brick'}, {'r': 3, 'm': 2}), ({'roof:colour': 'blåaktig'}, {}), ({}, {}),
                     ({'building:levels': '3;4', 'roof:shape': 'Flat'}, {'r': 1})]:
    e = utseende(tags); ok = e == ventet; feil += not ok; print(('ok   ' if ok else 'FEIL ') + f'{tags} -> {e}')
ok = farge('#abc') == 0xaabbcc + 1 and farge('dark grey') == 0x555555 + 1 and farge('#12345') == 0; feil += not ok; print(('ok   ' if ok else 'FEIL ') + 'farge()')
# feltene havner i flisa (og bygg uten merker får ingen ekstra felt)
import numpy as np, gzip, mapbox_vector_tile
from felles import X0, Y0, span
sp = span(13); x0, y0 = X0 + 100 * sp + 100, Y0 - 100 * sp - 300
R = [np.array([[x0, y0], [x0 + 10, y0], [x0 + 10, y0 + 8], [x0, y0 + 8], [x0, y0]], float), np.array([[x0 + 30, y0], [x0 + 40, y0], [x0 + 40, y0 + 8], [x0 + 30, y0 + 8], [x0 + 30, y0]], float)]
fl = lag_fliser(R, [7, 8], [0, 15], [0, 0], u=[{'r': 2, 'vf': 0xf2f0ea + 1}, {}])
d = mapbox_vector_tile.decode(gzip.decompress(fl[(13, 100, 100)]), default_options={'y_coord_down': True})
pr = sorted([f['properties'] for f in d['hus']['features']], key=lambda p: p['i'])
ok = pr[0].get('r') == 2 and pr[0].get('vf') == 0xf2f0ea + 1 and 'r' not in pr[1] and pr[1]['t'] == 15; feil += not ok; print(('ok   ' if ok else 'FEIL ') + f'flisa: {pr}')
sys.exit(1 if feil else 0)
