"""Assemble les deux versions du Banquet à partir des sources communes (ce dossier).
Usage : python3 src/build.py [chemin_artefact.html]
  -> index.html à la racine du dépôt (site) ; et la version artefact si un chemin est donné."""
import os, sys
H=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(H)
r=lambda f: open(os.path.join(H,f)).read()
css, js, body = r("style.css"), r("app.js"), r("body.html")
FONTS='<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..500;1,400&family=Instrument+Sans:wght@400..600&display=swap">'
site=f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#EEE6D6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1A1513" media="(prefers-color-scheme: dark)">
<title>Le Banquet</title>
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-180.png">
<meta name="apple-mobile-web-app-title" content="Le Banquet">
<meta name="apple-mobile-web-app-capable" content="yes">
{FONTS}
<style>
html{{-webkit-text-size-adjust:100%}}
body{{margin:0}}
img{{max-width:100%}}
[hidden]{{display:none!important}}
:root{{padding-top:env(safe-area-inset-top,0px)}}
{css}</style>
</head>
<body>
{body}
<script>
{js}
{r("adapter-site.js")}
</script>
</body>
</html>
'''
open(os.path.join(ROOT,"index.html"),"w").write(site)
if len(sys.argv)>1:
    art=f'''<title>Le Banquet</title>
<meta name="claude:viewport-fit-sides" content="cover">
{FONTS}
<style>
{css}</style>

{body}
<script>
{js}
{r("adapter-artifact.js")}
</script>
'''
    open(sys.argv[1],"w").write(art)
print("ok")
