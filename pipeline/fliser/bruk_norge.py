"""Tar i bruk en ferdig bygget Norge-versjon på /norge-1986: setter NORGE_TAG i site/dovre-fliser/index.html.
Sjekker først at releasen finnes og har manifest.json. Bruk: python3 bruk_norge.py kart-norge-<hash>"""
import os, re, sys, json, urllib.request
tag = sys.argv[1]; assert re.fullmatch(r'kart-norge-(\d{4}-)?[0-9a-f]{12}', tag), tag
m = json.load(urllib.request.urlopen(f'https://github.com/Tormod22/Riksbrudd/releases/download/{tag}/manifest.json', timeout=60))
assert m.get('versjon') == tag, m.get('versjon')
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'site', 'dovre-fliser', 'index.html')
s = open(p, encoding='utf-8').read(); s, n = re.subn(r"const NORGE_TAG = '[^']*';", f"const NORGE_TAG = '{tag}';", s); assert n == 1
open(p, 'w', encoding='utf-8').write(s)
print(tag, 'tatt i bruk:', m['statistikk'], {k: len(v) for k, v in m['filer'].items()})
