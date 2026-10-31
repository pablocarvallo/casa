#!/usr/bin/env python3
"""Revisa el aspecto de las apps del ecosistema antes y después de un cambio común.

Abre cada app en Chrome sin ventana, al tamaño de un iPhone (390 × 844), en modo claro y oscuro.
Guarda una captura de pantalla y el estilo calculado de cada elemento (incluidos ::before y ::after).
Después compara dos revisiones y dice qué apps cambiaron, en qué elementos y en qué propiedades.

    python3 herramientas/revisar-apps.py foto <carpeta con los repositorios> <carpeta de salida> [--solo fan,master]
    python3 herramientas/revisar-apps.py comparar <revisión antes> <revisión después>

Flujo de un cambio común:
    1. foto de las apps antes de aplicar el cambio;
    2. aplicar el cambio (por ejemplo con herramientas/aplicar-base.py);
    3. foto después;
    4. comparar. Si el cambio no debía alterar el aspecto, la comparación debe salir vacía.
       Si debía alterarlo, las capturas de cada app muestran cómo queda en claro y en oscuro.

Requiere Python con playwright y Google Chrome o Chromium:
    pip install playwright
Las apps se abren desde el disco, sin red: el buzón y las fuentes externas no responden, y las
apps muestran su estado inicial vacío. Las animaciones y transiciones se detienen para que dos
revisiones sean comparables.
"""
import json, pathlib, shutil, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
CATALOGO = RAIZ / 'ecosistema.json'
ESQUEMAS = ('light', 'dark')
VISTA = {'width': 390, 'height': 844}

SIN_MOVIMIENTO = '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'

LEER_ESTILOS = r"""
() => {
  const out = [];
  const props = Array.from(getComputedStyle(document.documentElement));
  props.sort();
  const ruta = (el) => {
    const p = [];
    while (el && el.nodeType === 1) {
      let i = 0, s = el;
      while ((s = s.previousElementSibling)) i++;
      p.unshift(el.tagName.toLowerCase() + ':' + i);
      el = el.parentElement;
    }
    return p.join('>');
  };
  const leer = (cs) => props.map((k) => cs.getPropertyValue(k));
  for (const el of document.querySelectorAll('*')) {
    if (el.closest('script, style, head')) continue;
    const r = ruta(el);
    out.push([r, leer(getComputedStyle(el))]);
    for (const pe of ['::before', '::after']) {
      const cs = getComputedStyle(el, pe);
      const c = cs.getPropertyValue('content');
      if (c && c !== 'none' && c !== 'normal') out.push([r + pe, leer(cs)]);
    }
  }
  return { props, out };
}
"""


def apps_del_catalogo(solo=None):
    cat = json.loads(CATALOGO.read_text(encoding='utf-8'))
    ids = []
    for a in cat['apps']:
        if not a.get('repo'):
            continue
        carpeta = a['repo'].split('/')[-1]
        if solo and a['id'] not in solo and carpeta not in solo:
            continue
        ids.append(carpeta)
    return ids


def chrome():
    for c in ('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'):
        if pathlib.Path(c).exists():
            return c
    return None


def foto(base, salida, solo=None):
    from playwright.sync_api import sync_playwright
    base, salida = pathlib.Path(base), pathlib.Path(salida)
    if salida.exists():
        shutil.rmtree(salida)
    salida.mkdir(parents=True)
    with sync_playwright() as p:
        exe = chrome()
        nav = p.chromium.launch(executable_path=exe, args=['--no-sandbox']) if exe else p.chromium.launch()
        for app in apps_del_catalogo(solo):
            html = base / app / 'index.html'
            if not html.exists():
                print(f'  {app}: no encuentro {html}')
                continue
            datos = {}
            for esq in ESQUEMAS:
                ctx = nav.new_context(viewport=VISTA, color_scheme=esq, reduced_motion='reduce',
                                      timezone_id='America/Santiago', locale='es-CL')
                ctx.route('http*://**', lambda r: r.abort())
                pg = ctx.new_page()
                pg.goto(html.resolve().as_uri())
                pg.add_style_tag(content=SIN_MOVIMIENTO)
                pg.wait_for_timeout(700)
                pg.screenshot(path=str(salida / f'{app}-{esq}.png'))
                datos[esq] = pg.evaluate(LEER_ESTILOS)
                ctx.close()
            (salida / f'{app}.json').write_text(json.dumps(datos), encoding='utf-8')
            n = len(datos['light']['out'])
            print(f'  {app}: {n} elementos')
        nav.close()


def comparar(antes, despues):
    antes, despues = pathlib.Path(antes), pathlib.Path(despues)
    total = 0
    for fa in sorted(antes.glob('*.json')):
        fd = despues / fa.name
        app = fa.stem
        if not fd.exists():
            print(f'{app}: falta en la revisión de después')
            continue
        A, D = json.loads(fa.read_text()), json.loads(fd.read_text())
        difs = []
        for esq in ESQUEMAS:
            pa, pd = A[esq]['props'], D[esq]['props']
            ea, ed = dict(A[esq]['out']), dict(D[esq]['out'])
            for r in sorted(set(ea) | set(ed)):
                if r not in ea or r not in ed:
                    difs.append((esq, r, '(elemento)', 'existe' if r in ea else '—', 'existe' if r in ed else '—'))
                    continue
                va, vd = dict(zip(pa, ea[r])), dict(zip(pd, ed[r]))
                for k in sorted(set(va) | set(vd)):
                    if va.get(k) != vd.get(k):
                        difs.append((esq, r, k, va.get(k), vd.get(k)))
        if difs:
            total += 1
            print(f'\n{app}: {len(difs)} diferencias')
            for esq, r, k, a, d in difs[:25]:
                print(f'   [{esq}] {r[-70:]}  {k}: {a} → {d}')
            if len(difs) > 25:
                print(f'   … y {len(difs) - 25} más')
        else:
            print(f'{app}: sin cambios')
    print(f'\nApps con diferencias: {total}')
    return total


if __name__ == '__main__':
    args = sys.argv[1:]
    solo = None
    if '--solo' in args:
        i = args.index('--solo')
        solo = set(args[i + 1].split(','))
        del args[i:i + 2]
    if len(args) == 3 and args[0] == 'foto':
        foto(args[1], args[2], solo)
    elif len(args) == 3 and args[0] == 'comparar':
        sys.exit(1 if comparar(args[1], args[2]) else 0)
    else:
        sys.exit(__doc__)
