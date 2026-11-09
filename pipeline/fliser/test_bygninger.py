"""Test for kjedene og anleggene i bygninger.py: python3 pipeline/fliser/test_bygninger.py"""
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
from bygninger import kjede, anlegg_type
feil = 0
for navn, ventet in [('KIWI Dombås', 1), ('Sparebank 1 SMN', 0), ('Coop Extra Lesja', 3), ('Coop Marked Dovre', 32), ('REMA 1000', 2),
                     ('Bunnpris Otta', 10), ('Circle K Dombås', 12), ("McDonald's", 28), ('Joker Hjerkinn', 9), ('Vitusapotek', 18), ('Kiwiklubben', 0)]:
    k = kjede({'name': navn}); ok = k == ventet; feil += not ok; print(('ok   ' if ok else 'FEIL ') + f'{navn} -> {k}')
for tags, ventet in [({'leisure': 'pitch', 'sport': 'soccer'}, 1), ({'leisure': 'pitch', 'sport': 'tennis'}, 2), ({'leisure': 'track'}, 4),
                     ({'amenity': 'parking'}, 6), ({'amenity': 'parking', 'parking': 'underground'}, 0)]:
    a = anlegg_type(tags); ok = a == ventet; feil += not ok; print(('ok   ' if ok else 'FEIL ') + f'{tags} -> {a}')
sys.exit(1 if feil else 0)
