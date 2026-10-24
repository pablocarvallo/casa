#!/usr/bin/env python3
"""Copia en index.html los lectores de las cuatro cuentas (Copec, FAN, Master y LiderBCI).

Los lectores son los mismos del panel de widgets de la app Copec (copec/widget/panel-widget.js): desde
«const MES = …» hasta la línea «const LOADERS = …». Se copian tal cual, salvo la consulta a GitHub, que en
Scriptable usa Request y aquí la hace getJSON de index.html con fetch.

Se ejecuta desde la carpeta del repositorio cada vez que cambie un lector en Copec, FAN o Master:

    python3 herramientas/armar-lectores.py ../copec/widget/panel-widget.js
"""
import pathlib, re, sys

if len(sys.argv) != 2:
    sys.exit('Uso: python3 herramientas/armar-lectores.py <ruta a copec/widget/panel-widget.js>')

raiz = pathlib.Path(__file__).resolve().parent.parent
fuente = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')

ini = fuente.index('\nconst MES = ')
fin = re.search(r'\nconst LOADERS = [^\n]*\n', fuente)
assert fin, 'No encuentro «const LOADERS» en ' + sys.argv[1]
lectores = fuente[ini + 1:fin.end()]

# La consulta de Scriptable (Request) se quita: index.html trae su propia getJSON con fetch
lectores, n = re.subn(r'async function getJSON\(url, token\) \{\n.*?\n\}\n', '', lectores, count=1, flags=re.S)
assert n == 1, 'No encuentro getJSON en los lectores'
assert 'Request(' not in lectores and 'Keychain' not in lectores.replace("const KEYCHAIN = 'cuentas-panel';", ''), \
    'Los lectores usan algo propio de Scriptable'

app = (raiz / 'index.html').read_text(encoding='utf-8')
m = re.search(r'/\*LECTORES:INICIO\*/\n.*?/\*LECTORES:FIN\*/', app, re.S)
assert m, 'No encuentro las marcas LECTORES en index.html'
app = app[:m.start()] + '/*LECTORES:INICIO*/\n' + lectores + '/*LECTORES:FIN*/' + app[m.end():]
(raiz / 'index.html').write_text(app, encoding='utf-8')
print('Lectores copiados:', lectores.count('\n'), 'líneas')
