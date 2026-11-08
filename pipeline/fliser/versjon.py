"""Setter versjonsmerke (innholds-hash) på terreng.js i site/dovre-fliser/index.html, så nettleseren aldri bruker en
gammel kopi (brukeren fikk «Terreng.frø is not a function» 8. nov). Kjør etter hver endring i terreng.js.
sjekk.js feiler hvis merket ikke stemmer."""
import hashlib, os, re
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'site', 'dovre-fliser')
h = hashlib.sha256(open(os.path.join(D, 'terreng.js'), 'rb').read()).hexdigest()[:10]
p = os.path.join(D, 'index.html'); s = open(p, encoding='utf-8').read()
ny, n = re.subn(r'/dovre-fliser/terreng\.js(\?v=[0-9a-f]+)?"', f'/dovre-fliser/terreng.js?v={h}"', s)
assert n == 1, n
open(p, 'w', encoding='utf-8').write(ny); print('terreng.js?v=' + h)
