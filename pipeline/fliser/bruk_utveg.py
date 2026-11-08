"""Tar i bruk en ferdig bygget versjon av jernbanen og vegene i nabolandene: setter UTVEG_TAG i site/dovre-fliser/index.html.
Sjekker først at releasen finnes og har manifest.json. Bruk: python3 bruk_utveg.py kart-utveg-<hash>"""
import os, re, sys, json, urllib.request
tag = sys.argv[1]; assert re.fullmatch(r'kart-utveg-[0-9a-f]{12}', tag), tag
m = json.load(urllib.request.urlopen(f'https://github.com/Tormod22/Riksbrudd/releases/download/{tag}/manifest.json', timeout=60))
assert m.get('versjon') == tag, m.get('versjon')
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'site', 'dovre-fliser', 'index.html')
s = open(p, encoding='utf-8').read(); s, n = re.subn(r"const UTVEG_TAG = '[^']*';", f"const UTVEG_TAG = '{tag}';", s); assert n == 1
open(p, 'w', encoding='utf-8').write(s)
print(tag, 'tatt i bruk:', m['statistikk'], {k: v[0]['byte'] // 1_000_000 for k, v in m['filer'].items()}, 'MB')
