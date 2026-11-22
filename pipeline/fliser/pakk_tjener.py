"""Pakker tjenerprogrammet for flerspilleren (tjener/) i site/tjener/riksbrudd-tjener.zip, så verten kan laste det ned fra spillet
(☰ → Spill sammen → «Last ned tjeneren»). Kjør etter hver endring i tjener/: python3 pipeline/fliser/pakk_tjener.py
Med --sjekk: feiler (kode 1) hvis zip-fila ikke har samme innhold som tjener/."""
import sys, zipfile, pathlib, io
ROT = pathlib.Path(__file__).resolve().parents[2]
KILDE, MÅL = ROT / 'tjener', ROT / 'site' / 'tjener' / 'riksbrudd-tjener.zip'
FILER = ['riksbrudd-tjener.js', 'start-tjener.bat', 'LESMEG.md']

def innhold():
    return {f: (KILDE / f).read_bytes() for f in FILER}

def pakk():
    b = io.BytesIO()
    with zipfile.ZipFile(b, 'w', zipfile.ZIP_DEFLATED) as z:
        for f, d in innhold().items():
            i = zipfile.ZipInfo('riksbrudd-tjener/' + f, date_time=(2026, 1, 1, 0, 0, 0)); i.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(i, d)
    return b.getvalue()

if '--sjekk' in sys.argv:
    with zipfile.ZipFile(MÅL) as z:
        ok = all(z.read('riksbrudd-tjener/' + f) == d for f, d in innhold().items())
    print('ok' if ok else 'FEIL: site/tjener/riksbrudd-tjener.zip er ikke lik tjener/ – kjør python3 pipeline/fliser/pakk_tjener.py'); sys.exit(0 if ok else 1)
MÅL.parent.mkdir(parents=True, exist_ok=True); MÅL.write_bytes(pakk()); print('skrev', MÅL.relative_to(ROT), MÅL.stat().st_size, 'byte')
