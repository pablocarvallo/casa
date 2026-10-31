#!/usr/bin/env python3
"""Copia la base común de diseño a las apps del ecosistema.

La base vive en base/ de este repositorio:
    base/tokens.css       paleta, tipografía, radios, sombras (variables --ds-*), claro y oscuro
    base/elementos.css    fondo, títulos, campos, selección e icono de la app
    base/componentes.css  encabezado, botones, tarjeta principal, listas, filtros, hojas, avisos

Cada app lleva la base en su index.html, entre marcas:
    /*DS:TOKENS:START*/ … /*DS:TOKENS:END*/   ← base/tokens.css
    /*DS:VARS:START*/   … /*DS:VARS:END*/     propio de la app: sus variables, tomadas de las --ds-*
    /*DS:BASE:START*/   … /*DS:BASE:END*/     ← base/elementos.css
    /*DS:COMP:START*/   … /*DS:COMP:END*/     ← base/componentes.css (solo apps con componentes comunes)
    /*DS:APP:START*/    … /*DS:APP:END*/      propio de la app: lo que la distingue
La herramienta solo reemplaza los tres bloques comunes; nunca toca VARS ni APP.

Qué bloques recibe cada app lo dice ecosistema.json, en «capas» de cada app:
    "tokens": true · "elementos": true · "componentes": "comunes" | "propios" | null

Uso, desde la carpeta de este repositorio:
    python3 herramientas/aplicar-base.py <carpeta con los repositorios> [opciones]

    --revisar          muestra qué cambiaría, sin escribir nada
    --solo fan,master  limita a esas apps (id o nombre de repositorio)
    --grupo cuentas    limita a las apps de un grupo del catálogo
    --subir-cache      renueva el nombre de caché en sw.js de cada app que cambie, para que el iPhone
                       descargue de nuevo todos los archivos

Cada repositorio debe estar en la carpeta indicada, con su nombre (fan, master, beds…) y en la rama
que publica la app (campo «rama» del catálogo). La herramienta avisa si la rama no coincide.
Después de aplicar, revisar el aspecto con herramientas/revisar-apps.py y publicar cada repositorio.
"""
import json, pathlib, re, subprocess, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
BASE = RAIZ / 'base'
CATALOGO = RAIZ / 'ecosistema.json'

BLOQUES = [
    ('TOKENS', 'tokens', 'tokens.css'),
    ('BASE', 'elementos', 'elementos.css'),
    ('COMP', 'componentes', 'componentes.css'),
]
ORDEN = ['TOKENS', 'VARS', 'BASE', 'COMP', 'APP']


def marcas(texto):
    """Posición de cada marca; error si alguna está repetida, incompleta o fuera de orden."""
    pos = {}
    for n in ORDEN:
        a, b = f'/*DS:{n}:START*/', f'/*DS:{n}:END*/'
        ca, cb = texto.count(a), texto.count(b)
        if ca == cb == 0:
            continue
        if ca != 1 or cb != 1:
            raise ValueError(f'la marca DS:{n} aparece {ca} y {cb} veces')
        ia, ib = texto.index(a), texto.index(b)
        if ib < ia:
            raise ValueError(f'DS:{n}: el cierre está antes que la apertura')
        pos[n] = (ia, ib)
    seq = [n for n in ORDEN if n in pos]
    for x, y in zip(seq, seq[1:]):
        if pos[x][1] > pos[y][0]:
            raise ValueError(f'DS:{x} y DS:{y} están cruzadas o fuera de orden')
    return pos


def reemplazar(texto, nombre, contenido):
    a, b = f'/*DS:{nombre}:START*/', f'/*DS:{nombre}:END*/'
    ia, ib = texto.index(a) + len(a), texto.index(b)
    nuevo = '\n' + contenido
    return texto[:ia] + nuevo + texto[ib:], texto[ia:ib] != nuevo


def rama_actual(carpeta):
    try:
        r = subprocess.run(['git', '-C', str(carpeta), 'rev-parse', '--abbrev-ref', 'HEAD'],
                           capture_output=True, text=True, timeout=10)
        return r.stdout.strip() or None
    except Exception:
        return None


def subir_cache(sw):
    m = re.search(r"(const\s+CACHE\s*=\s*)(['\"])([^'\"]+)\2", sw)
    if not m:
        return sw, None
    nombre = m.group(3)
    n = re.search(r'-b(\d+)$', nombre)
    nuevo = nombre[:n.start()] + f'-b{int(n.group(1)) + 1}' if n else nombre + '-b1'
    return sw[:m.start(3)] + nuevo + sw[m.end(3):], nuevo


def main(argv):
    args = list(argv)
    def opcion(nombre):
        if nombre in args:
            i = args.index(nombre)
            v = args[i + 1].split(',')
            del args[i:i + 2]
            return set(v)
        return None
    def bandera(nombre):
        if nombre in args:
            args.remove(nombre)
            return True
        return False
    revisar, cache = bandera('--revisar'), bandera('--subir-cache')
    solo, grupo = opcion('--solo'), opcion('--grupo')
    if len(args) != 1:
        sys.exit(__doc__)
    carpeta = pathlib.Path(args[0])

    cat = json.loads(CATALOGO.read_text(encoding='utf-8'))
    piezas = {clave: (BASE / archivo).read_text(encoding='utf-8') for _, clave, archivo in BLOQUES}

    cambiadas, errores = [], []
    for app in cat['apps']:
        capas = app.get('capas') or {}
        repo = (app.get('repo') or '').split('/')[-1]
        if not repo or not (capas.get('tokens') or capas.get('elementos') or capas.get('componentes') == 'comunes'):
            continue
        if solo and app['id'] not in solo and repo not in solo:
            continue
        if grupo and not grupo & set(app.get('grupos', [])):
            continue
        html = carpeta / repo / 'index.html'
        if not html.exists():
            errores.append(f'{app["id"]}: no encuentro {html}')
            continue
        rama = rama_actual(html.parent)
        if app.get('rama') and rama and rama != app['rama']:
            errores.append(f'{app["id"]}: la carpeta está en la rama «{rama}» y la app se publica desde «{app["rama"]}»')
            continue
        texto = html.read_text(encoding='utf-8')
        try:
            pos = marcas(texto)
        except ValueError as e:
            errores.append(f'{app["id"]}: {e}')
            continue
        hechos = []
        for nombre, clave, _ in BLOQUES:
            quiere = capas.get(clave) is True or (clave == 'componentes' and capas.get(clave) == 'comunes')
            if not quiere:
                continue
            if nombre not in pos:
                errores.append(f'{app["id"]}: el catálogo pide {clave} pero falta la marca DS:{nombre}')
                continue
            texto, cambio = reemplazar(texto, nombre, piezas[clave])
            if cambio:
                hechos.append(clave)
        if not hechos:
            continue
        cambiadas.append(f'{app["id"]}: {", ".join(hechos)}')
        if revisar:
            continue
        html.write_text(texto, encoding='utf-8')
        if cache and (html.parent / 'sw.js').exists():
            sw = (html.parent / 'sw.js').read_text(encoding='utf-8')
            sw, nuevo = subir_cache(sw)
            if nuevo:
                (html.parent / 'sw.js').write_text(sw, encoding='utf-8')
                cambiadas[-1] += f' · caché {nuevo}'

    titulo = 'Cambiarían' if revisar else 'Actualizadas'
    print(f'{titulo}: {len(cambiadas)}')
    for c in cambiadas:
        print('  ' + c)
    if errores:
        print(f'Con problemas: {len(errores)}')
        for e in errores:
            print('  ' + e)
    return 1 if errores else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
