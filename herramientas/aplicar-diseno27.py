#!/usr/bin/env python3
"""Copia el sistema de diseño Domésticas 27 (diseno27/tokens.css y diseno27/componentes.css) dentro de cada app que
lo usa, entre las marcas /*D27:TOKENS:START*/ … END y /*D27:COMP:START*/ … END. Uso:
  python3 herramientas/aplicar-diseno27.py [archivo.html …]   (por omisión, app/index.html)
"""
import re, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BLOQUES = {'TOKENS': RAIZ / 'diseno27' / 'tokens.css', 'COMP': RAIZ / 'diseno27' / 'componentes.css'}

def aplicar(html: Path) -> bool:
    texto = html.read_text(encoding='utf-8')
    nuevo = texto
    for marca, fuente in BLOQUES.items():
        css = fuente.read_text(encoding='utf-8').strip()
        patron = re.compile(r'(/\*D27:%s:START\*/)(.*?)(/\*D27:%s:END\*/)' % (marca, marca), re.S)
        if not patron.search(nuevo):
            sys.exit(f'{html}: falta la marca D27:{marca}')
        nuevo = patron.sub(lambda m: m.group(1) + '\n' + css + '\n' + m.group(3), nuevo)
    if nuevo != texto:
        html.write_text(nuevo, encoding='utf-8')
    return nuevo != texto

archivos = [Path(a) for a in sys.argv[1:]] or [RAIZ / 'app' / 'index.html']
for a in archivos:
    print(('actualizado ' if aplicar(a) else 'sin cambios ') + str(a))
