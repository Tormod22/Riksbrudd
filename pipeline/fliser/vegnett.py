"""S1: NVDB 1. juni 2023 -> kompakt rutegraf (ingen kartfiler endres).

python3 pipeline/fliser/vegnett.py /tmp/vegnett --buffer /tmp/nvdb-buffer
Bruk --veg EV6 for en rask, ekte E6-test; uten filter bygges hele Norge.
Kilde: Statens vegvesen/NVDB, NLOD. Se spill/VEGNETT.md for format og regler.
"""
import argparse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
import struct
import time
import tempfile
import urllib.parse
import urllib.request

BASE = 'https://nvdbapiles.atlas.vegvesen.no'
KATEGORIER = 'ERFKPS'
VEGTYPER = 'enkelBilveg,kanalisertVeg,rampe,rundkjøring,bilferje,gatetun'
HODE = {'X-Client': 'riksbrudd-vegnett', 'Accept': 'application/json'}
MAGIC = b'RBVEG002'   # kolonneformat (se spill/VEGNETT.md); RBVEG001 (40 byte per lenke) kan fortsatt leses av vegnett.js
KOLONNER = ('x', 'y', 'fra', 'til', 'lengde', 'sekvens', 'start', 'slutt', 'vegnummer', 'flagg', 'fart', 'kategori',
            'indre', 'geometri', 'infratype', 'infralenke', 'infraid')


def sider(sti, param, buffer):
    """Behold egne parametre: NVDBs neste.href mangler ofte /api/v4."""
    sett = set()
    while True:
        url = BASE + sti + '?' + urllib.parse.urlencode(param)
        fil = buffer / (hashlib.sha256(url.encode()).hexdigest() + '.json.gz')
        if fil.exists():
            d = json.loads(gzip.decompress(fil.read_bytes()))
        else:
            for forsok in range(5):
                try:
                    with urllib.request.urlopen(urllib.request.Request(url, headers=HODE), timeout=120) as svar:
                        raw = svar.read()
                    d = json.loads(raw)
                    if 'objekter' not in d: raise ValueError('NVDB svarte uten objekter')
                    with tempfile.NamedTemporaryFile(dir=buffer, delete=False) as tmp:
                        tmp.write(gzip.compress(raw, mtime=0))
                        tmpnavn = tmp.name
                    Path(tmpnavn).replace(fil)
                    break
                except Exception:
                    if forsok == 4: raise
                    time.sleep(min(2 ** forsok, 8))
        yield from d['objekter']
        start = d.get('metadata', {}).get('neste', {}).get('start')
        if not start or not d['objekter']: return
        if start in sett: raise ValueError('NVDB gjentok sidestart')
        sett.add(start)
        param = dict(param, start=start)
        print(sti.rsplit('/', 1)[-1], param.get('vegsystemreferanse', param.get('fylke', '')), 'side', len(sett), flush=True)


def egenskap(o, navn):
    return next((e.get('verdi') for e in o.get('egenskaper', []) if e.get('navn') == navn), None)


def indekser(objekter, typ):
    ut = defaultdict(list)
    for o in objekter:
        if typ == 60 and egenskap(o, 'Brukategori') != 'Vegbru': continue
        verdi = egenskap(o, 'Fartsgrense') if typ == 105 else o['id']
        if verdi is None: continue
        for s in o.get('lokasjon', {}).get('stedfestinger', []):
            if 'startposisjon' not in s or 'sluttposisjon' not in s: continue
            ut[s['veglenkesekvensid']].append((s['startposisjon'], s['sluttposisjon'], int(verdi)))
    return ut


def overlapper(indeks, o):
    a, b = o['startposisjon'], o['sluttposisjon']
    return sorted({v for x, y, v in indeks.get(o['veglenkesekvensid'], []) if min(b, y) - max(a, x) > 1e-9})


def punkter(wkt):
    if not re.match(r'^LINESTRING(?: Z)?\s*\(', wkt): raise ValueError('Forventet LINESTRING fra NVDB')
    return [tuple(round(float(v)) for v in p.split()[:2]) for p in wkt[wkt.index('(') + 1:wkt.rindex(')')].split(',')]


def uvarint(v, ut):
    if v < 0: raise ValueError('Negativt tall i uvarint')
    while v >= 128:
        ut.append((v & 127) | 128); v >>= 7
    ut.append(v)


def zvarint(v, ut): uvarint(v * 2 if v >= 0 else -2 * v - 1, ut)


def varint(v):
    ut = bytearray(); zvarint(v, ut); return ut


def geometri(p):
    ut, x, y = bytearray(), 0, 0
    for a, b in p:
        ut.extend(varint(a - x)); ut.extend(varint(b - y)); x, y = a, b
    return ut


def pakk(xy, lenker, koblinger, dato):
    """RBVEG002: hver verdi i sin egen kolonne, sortert så nabotall ligner hverandre, og små tall som varint.
    Noder i bånd på 2 km (slangerekkefølge), lenker langs NVDB-sekvensene: fra-noden er da som regel forrige til-node,
    og startposisjonen forrige sluttposisjon. Geometrien lagrer bare punktene mellom endenodene."""
    band = lambda n: xy[n][1] // 2000
    orden = sorted(range(len(xy)), key=lambda n: (band(n), xy[n][0] if band(n) % 2 == 0 else -xy[n][0], xy[n][1]))
    ny = [0] * len(xy)
    for i, n in enumerate(orden): ny[n] = i
    lorden = sorted(range(len(lenker)), key=lambda e: (lenker[e][3], lenker[e][4], lenker[e][5]))
    nyl = [0] * len(lenker)
    for i, e in enumerate(lorden): nyl[e] = i
    k = {n: bytearray() for n in KOLONNER}
    px = py = 0
    for n in orden:
        x, y = xy[n]; zvarint(x - px, k['x']); zvarint(y - py, k['y']); px, py = x, y
    forrige = (0, -1, 0, 0)   # til-node, sekvens, sluttposisjon, vegnummer
    for e in lorden:
        a, b, lengde, sekvens, start, slutt, vegnr, flagg, fart, kat, indre = lenker[e]
        a, b = ny[a], ny[b]
        zvarint(a - forrige[0], k['fra']); zvarint(b - a, k['til'])
        uvarint(max(1, math.ceil(lengde * 10)), k['lengde'])   # desimeter, rundet opp (aldri kortere enn luftlinjen)
        if sekvens < forrige[1] or not 0 <= start < slutt <= 10 ** 8: raise ValueError('Ugyldig sekvens eller posisjon')
        uvarint(sekvens - max(forrige[1], 0), k['sekvens'])
        zvarint(start - (forrige[2] if sekvens == forrige[1] else 0), k['start'])
        uvarint(slutt - start, k['slutt']); zvarint(vegnr - forrige[3], k['vegnummer'])
        k['flagg'].append(flagg); k['fart'].append(fart); k['kategori'].append(kat)
        uvarint(len(indre), k['indre'])
        qx, qy = xy[orden[a]]
        for x, y in indre: zvarint(x - qx, k['geometri']); zvarint(y - qy, k['geometri']); qx, qy = x, y
        forrige = (b, sekvens, slutt, vegnr)
    sist = 0
    for e, typ, ident in sorted((nyl[e], typ, ident) for e, typ, ident in koblinger):
        k['infratype'].append((60, 67, 770).index(typ)); uvarint(e - sist, k['infralenke']); uvarint(ident, k['infraid']); sist = e
    header = struct.pack('<8sIIII', MAGIC, len(xy), len(lenker), len(koblinger), int(dato.replace('-', ''))) + \
        struct.pack('<I', len(KOLONNER)) + b''.join(struct.pack('<I', len(k[n])) for n in KOLONNER)
    return header + b''.join(bytes(k[n]) for n in KOLONNER)


def retning(o):
    # feltoversikt følger geometrien; feltoversiktMetreringsretning gjør ikke det.
    # Reversible felt (R) eller manglende felt brukes begge veier i spillet.
    felt = o.get('feltoversikt') or []
    if not felt or any(str(f).endswith('R') for f in felt): return 3
    tall = [int(m.group()) for f in felt if (m := re.match(r'^\d+', str(f)))]
    return (1 if any(v % 2 for v in tall) else 0) | (2 if any(v % 2 == 0 for v in tall) else 0) or 3


def bygg(veger, indekser_, dato):
    noder, xy, lenker, koblinger, sett = {}, [], [], [], set()
    stat = defaultdict(int)

    def node(navn, p):
        # Fiktive segmentnoder er 'posisjon@sekvens'; aldri koble etter XY.
        if not navn: raise ValueError('Vegsegment mangler topologisk node')
        if navn not in noder:
            noder[navn] = len(xy); xy.append(p)
        return noder[navn]

    for o in veger:
        ref = (o['veglenkesekvensid'], o['startposisjon'], o['sluttposisjon'])
        if ref in sett: continue
        vsr = o.get('vegsystemreferanse') or {}
        vs = vsr.get('vegsystem', {})
        if vs.get('fase') != 'V' or vs.get('vegkategori') not in KATEGORIER: continue
        if o.get('detaljnivå') not in ('Vegtrase', 'Vegtrase og kjørebane'): continue
        if o.get('typeVeg_sosi') not in VEGTYPER.split(','): continue
        if any(vsr.get(k, {}).get('trafikantgruppe') == 'G' for k in ('strekning', 'kryssystem', 'sideanlegg')): continue
        sett.add(ref)
        p = punkter(o['geometri']['wkt'])
        if len(p) < 2: raise ValueError('Veg uten linje')
        a, b = node(o.get('startnode'), p[0]), node(o.get('sluttnode'), p[-1])
        # Minst luftlinje (avrunding kan ellers gjøre A*-heuristikken for stor).
        lengde = max(float(o['lengde']), math.dist(xy[a], xy[b]), .01)
        if not math.isfinite(lengde): raise ValueError('Ugyldig veglengde')
        fart = overlapper(indekser_.get(105, {}), o)
        fart = min(fart) if fart else 0  # 0 = ukjent; aldri lat som spillfart er målt fartsgrense
        if not 0 <= fart <= 255: raise ValueError('Ugyldig fartsgrense')
        ferje = o['typeVeg_sosi'] == 'bilferje'
        flagg = retning(o) | (4 if ferje else 0)
        e = len(lenker)
        lenker.append((a, b, lengde, o['veglenkesekvensid'], round(o['startposisjon'] * 1e8), round(o['sluttposisjon'] * 1e8),
                       vs['nummer'], flagg, fart, KATEGORIER.index(vs['vegkategori']), p[1:-1]))
        for typ in (60, 67, 770):
            for ident in overlapper(indekser_.get(typ, {}), o): koblinger.append((e, typ, ident))
        stat['ferjelenker' if ferje else 'veglenker'] += 1
        if fart: stat['med_fartsgrense'] += 1
    return pakk(xy, lenker, koblinger, dato), dict(stat, noder=len(xy), koblinger=len(koblinger))


def landsdekkende(q, buffer):
    """Fire samtidige fylker. Felles node-ID binder fylkesgrensene sammen."""
    url = BASE + '/omrader/api/v4/fylker'
    with urllib.request.urlopen(urllib.request.Request(url, headers=HODE), timeout=60) as svar:
        fylker = json.load(svar)
    nummer = sorted(f['nummer'] for f in fylker)
    if not nummer: raise ValueError('NVDB returnerte ingen fylker')
    with tempfile.TemporaryDirectory(prefix='riksbrudd-veger-') as tmp:
        def hent_fylke(nr):
            fil = Path(tmp) / f'{nr}.jsonl.gz'
            with gzip.open(fil, 'wt', encoding='utf-8') as f:
                for o in sider('/vegnett/api/v4/veglenkesekvenser/segmentert', dict(q, fylke=nr), buffer):
                    f.write(json.dumps(o, ensure_ascii=False, separators=(',', ':')) + '\n')
            return fil
        with ThreadPoolExecutor(max_workers=4) as ex:
            for fil in ex.map(hent_fylke, nummer):
                with gzip.open(fil, 'rt', encoding='utf-8') as f:
                    for linje in f: yield json.loads(linje)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('ut', type=Path)
    p.add_argument('--buffer', type=Path, default=Path('/tmp/riksbrudd-nvdb'))
    p.add_argument('--veg', default='', help='Tom = hele Norge; EV6 = testutvalg, ikke nasjonal release')
    p.add_argument('--aar', type=int, default=2023)
    args = p.parse_args()
    if not 1900 <= args.aar <= 2100: p.error('Ugyldig år')
    args.ut.mkdir(parents=True, exist_ok=True); args.buffer.mkdir(parents=True, exist_ok=True)
    dato = f'{args.aar}-06-01'
    q = {'tidspunkt': dato, 'antall': 10000, 'srid': 5973}

    def objekter(typ):
        oq = dict(q, inkluder='lokasjon,egenskaper')
        if args.veg: oq['vegsystemreferanse'] = args.veg
        return typ, indekser(sider(f'/vegobjekter/api/v4/vegobjekter/{typ}', oq, args.buffer), typ)

    with ThreadPoolExecutor(max_workers=4) as ex:
        indeks = dict(ex.map(objekter, (60, 67, 770, 105)))
    vq = dict(q, historisk='true', detaljniva='VT,VTKB', trafikantgruppe='K', typeveg=VEGTYPER, geometritoleranse=3)
    if args.veg: vq['vegsystemreferanse'] = args.veg
    veger = sider('/vegnett/api/v4/veglenkesekvenser/segmentert', vq, args.buffer) if args.veg else landsdekkende(vq, args.buffer)
    raw, stat = bygg(veger, indeks, dato)
    if not stat.get('veglenker'): raise ValueError('Tom graf; ingen release')
    pakket = gzip.compress(raw, compresslevel=9, mtime=0)
    (args.ut / 'vegnett.bin').write_bytes(raw)
    (args.ut / 'vegnett.bin.gz').write_bytes(pakket)
    tag = 'kart-vegnett-' + hashlib.sha256(raw).hexdigest()[:12]
    manifest = {'format': MAGIC.decode(), 'dato': dato, 'crs': 'EPSG:25833', 'utvalg': args.veg or 'hele Norge',
                'kilde': 'Statens vegvesen / NVDB (NLOD)', 'tag': tag, 'statistikk': stat,
                'fil': 'vegnett.bin', 'byte': len(raw), 'gzip_byte': len(pakket), 'sha256': hashlib.sha256(raw).hexdigest(),
                'ferje_ventetid_sekunder': 900, 'ferje_fart_kmt': 25,
                'merknad': 'Ferjefart og ventetid er spillregler, ikke rutetabell. Ukjent fartsgrense lagres som 0.'}
    (args.ut / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (args.ut / 'tag.txt').write_text(tag + '\n')
    print(json.dumps(manifest, ensure_ascii=False), flush=True)


if __name__ == '__main__': main()
