"""Byggerkontroller og liten topologisk testgraf; ingen nettverk."""
import json
from pathlib import Path
import struct
import sys
import unittest
from vegnett import bygg, geometri, indekser, MAGIC, overlapper, retning


def segment(seq, a, b, p, **valg):
    o = {'veglenkesekvensid': seq, 'startposisjon': 0, 'sluttposisjon': 1,
         'startnode': str(a), 'sluttnode': str(b), 'lengde': sum(__import__('math').dist(x, y) for x, y in zip(p, p[1:])),
         'detaljnivå': 'Vegtrase og kjørebane', 'typeVeg_sosi': 'enkelBilveg', 'feltoversikt': ['1', '2'],
         'geometri': {'wkt': 'LINESTRING Z (' + ','.join(f'{x} {y} 0' for x, y in p) + ')'},
         'vegsystemreferanse': {'vegsystem': {'vegkategori': 'E', 'fase': 'V', 'nummer': 6}, 'strekning': {'trafikantgruppe': 'K'}}}
    o.update(valg)
    return o


def fixture():
    # A--B--C, omkjøring A--D--C. C--kai~~ferje~~kai--E. Separat planskilt veg.
    s = [segment(1, 'A', 'B', [(0, 0), (500, 20), (1000, 0)]),
         segment(2, 'B', 'C', [(1000, 0), (2000, 0)]),
         segment(3, 'A', 'D', [(0, 0), (0, 1000)]),
         segment(4, 'D', 'C', [(0, 1000), (2000, 0)], feltoversikt=['1']),
         segment(5, 'C', 'kai1', [(2000, 0), (2500, 0)]),
         segment(6, 'kai1', 'sjo', [(2500, 0), (3000, 0)], typeVeg_sosi='bilferje'),
         segment(7, 'sjo', 'kai2', [(3000, 0), (3500, 0)], typeVeg_sosi='bilferje'),
         segment(8, 'kai2', 'E', [(3500, 0), (4000, 0)]),
         segment(9, 'over1', 'over2', [(1000, -1000), (1000, 1000)])]
    indeks = {60: {2: [(0.1, 0.9, 12345)]}, 67: {4: [(0, 1, 23456)]},
              770: {6: [(0, 1, 34567)], 7: [(0, 1, 34567)]}, 105: {1: [(0, 1, 60)]}}
    return bygg(s, indeks, '2023-06-01')[0]


class ByggerTest(unittest.TestCase):
    def test_format(self):
        b = fixture()
        self.assertEqual(MAGIC, b'RBVEG002')
        self.assertEqual(b[:8], MAGIC)
        self.assertEqual(struct.unpack_from('<III', b, 8), (10, 9, 4))   # noder, lenker, infrakoblinger
        k = struct.unpack_from('<I', b, 24)[0]
        self.assertEqual(28 + 4 * k + sum(struct.unpack_from(f'<{k}I', b, 28)), len(b), 'kolonnelengdene dekker hele fila')

    def test_retning(self):
        for f, ventet in [([], 3), (['1'], 1), (['2'], 2), (['1', '2'], 3), (['1R'], 3), (['1K'], 1)]:
            self.assertEqual(retning({'feltoversikt': f}), ventet)

    def test_overlap(self):
        o = {'veglenkesekvensid': 3, 'startposisjon': .2, 'sluttposisjon': .4}
        self.assertEqual(overlapper({3: [(0, .2, 1), (.4, .8, 2), (.3, .5, 3)]}, o), [3])

    def test_bru_id(self):
        o = {'id': 987, 'egenskaper': [{'navn': 'Brukategori', 'verdi': 'Vegbru'}],
             'lokasjon': {'stedfestinger': [{'veglenkesekvensid': 7, 'startposisjon': .1, 'sluttposisjon': .2}]}}
        self.assertEqual(indekser([o], 60)[7], [(.1, .2, 987)])
        o['egenskaper'][0]['verdi'] = 'G/S-bru'
        self.assertFalse(indekser([o], 60))

    def test_fiktive_noder_og_dubletter(self):
        a = segment(1, '1', '0.5@1', [(0, 0), (10, 0)], sluttposisjon=.5)
        b = segment(1, '0.5@1', '2', [(10, 0), (20, 0)], startposisjon=.5)
        raw, stat = bygg([a, b, a], {}, '2023-06-01')
        self.assertEqual(stat['noder'], 3)
        self.assertEqual(stat['veglenker'], 2)

    def test_fotveg_filtreres(self):
        a = segment(1, 'A', 'B', [(0, 0), (10, 0)], typeVeg_sosi='gangOgSykkelveg')
        self.assertEqual(bygg([a], {}, '2023-06-01')[1]['noder'], 0)

    def test_mangler_node(self):
        with self.assertRaises(ValueError): bygg([segment(1, None, 'B', [(0, 0), (10, 0)], startnode=None)], {}, '2023-06-01')


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--fixture': Path(sys.argv[2]).write_bytes(fixture())
    else: unittest.main()
