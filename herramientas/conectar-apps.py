#!/usr/bin/env python3
"""Conecta las apps de la casa con Panel Casa.

A Pagos del mes (pagos), Balón de gas (gas), Mi cápsula diaria (receta) y Mesadas (hijas) les agrega:
  1. el módulo herramientas/panel-casa.js, que publica el resumen de la app en el buzón (marcas PANEL:START/END);
  2. los estilos de la tarjeta «Panel Casa» (marcas PANEL:CSS:START/END);
  3. el lugar de la tarjeta, al final de la pantalla (<div id="panel-casa">);
  4. el aviso de cambio en la función que guarda los datos, y el resumen propio de cada app (marcas PANEL:APP).

Se puede ejecutar de nuevo: reemplaza lo que esté entre las marcas y no repite los avisos.

    python3 herramientas/conectar-apps.py <carpeta con los repositorios pagos, gas, receta e hijas>
"""
import pathlib, re, sys

if len(sys.argv) != 2:
    sys.exit('Uso: python3 herramientas/conectar-apps.py <carpeta con los repositorios>')
base = pathlib.Path(sys.argv[1])
aqui = pathlib.Path(__file__).resolve().parent
MODULO = (aqui / 'panel-casa.js').read_text(encoding='utf-8').strip('\n')

CSS = r"""/*PANEL:CSS:START*/
/* Tarjeta «Panel Casa», igual en todas las apps conectadas al panel */
.pc-host { max-width: 480px; margin: -20px auto calc(40px + env(safe-area-inset-bottom, 0px)); }
.pc { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px 16px; border-radius: 24px; background: var(--ds-surface); box-shadow: var(--ds-shadow-1); color: var(--ds-ink); font-family: var(--ds-font); text-align: left; }
.pc-head { display: flex; align-items: center; gap: 12px; }
.pc-head > div { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.pc-head b { font-size: 17px; font-weight: 600; letter-spacing: -0.015em; }
.pc-ic { width: 32px; height: 32px; flex: none; display: grid; place-items: center; border-radius: 9px; background: linear-gradient(150deg, #7AA4F7 0%, #4D78F3 46%, #2950F4 100%); color: #fff; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35); }
.pc-ic svg { display: block; }
.pc-st { font-size: 13px; line-height: 1.3; color: var(--ds-ink-2); }
.pc-ok { color: var(--ds-pos); font-weight: 600; }
.pc-bad { color: var(--ds-neg); font-weight: 600; }
.pc-p { margin: 0; font-size: 15px; line-height: 1.38; color: var(--ds-ink-2); }
.pc-btns { display: flex; gap: 10px; }
.pc-btn { flex: 1; min-width: 0; min-height: 42px; padding: 0 14px; border: 0; border-radius: 999px; background: var(--ds-tint-soft); color: var(--ds-tint); font: 600 15px/1 var(--ds-font); letter-spacing: -0.01em; cursor: pointer; -webkit-appearance: none; appearance: none; transition: transform 0.16s ease; }
.pc-btn:active { transform: scale(0.97); }
.pc-main { background: var(--ds-btn); color: var(--ds-on-btn); box-shadow: var(--ds-shadow-btn); }
.pc-danger { background: var(--ds-neg-soft); color: var(--ds-neg); }
.pc-armed { background: var(--ds-neg); color: #fff; }
.pc-ta { display: block; width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1.5px solid transparent; border-radius: 14px; background: var(--ds-surface-2); color: var(--ds-ink); font: 13px/1.4 var(--ds-font-mono); resize: vertical; -webkit-appearance: none; appearance: none; }
.pc-ta:focus { outline: none; border-color: var(--ds-tint); box-shadow: 0 0 0 4px var(--ds-tint-soft); }
.pc-err { margin: 0; padding: 10px 12px; border-radius: 14px; background: var(--ds-neg-soft); color: var(--ds-neg); font-size: 15px; font-weight: 600; }
.pc-err[hidden] { display: none; }
/*PANEL:CSS:END*/"""

HOST = '<div class="pc-host" id="panel-casa"></div>'
HOOK = 'if (window.PanelCasa) PanelCasa.changed();'

APPS = {
    'pagos': {
        'host_after': '</main>\n',
        'save': ("try { localStorage.setItem(LS_KEY, JSON.stringify(state)); return true; }",
                 "try { localStorage.setItem(LS_KEY, JSON.stringify(state)); " + HOOK + " return true; }"),
        'init': """  // Panel Casa: título del mes y cada pago con su estado
  if (window.PanelCasa) PanelCasa.init({ app: 'pagos', title: 'Pagos · panel', mount: document.getElementById('panel-casa'), summary: function () {
    return { title: state.title, s: state.sections.map(function (sec) {
      return { n: sec.name, i: sec.items.map(function (it) { var o = { t: it.text, d: it.done ? 1 : 0 }; if (it.done && it.at) o.a = it.at; return o; }) };
    }) };
  } });""",
    },
    'gas': {
        'host_after': '<main class="app" id="app" aria-live="polite"></main>\n',
        'save': ("function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(tanks)); } catch (e) {} }",
                 "function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(tanks)); } catch (e) {} " + HOOK + " }"),
        'init': """  // Panel Casa: balón en uso, promedio de días y balones de reserva (el panel cuenta los días)
  if (window.PanelCasa) PanelCasa.init({ app: 'gas', title: 'Gas · panel', mount: document.getElementById('panel-casa'), summary: function () {
    if (loading) return null;
    var act = activeTank(), st = stats();
    return { open: act ? act.open : '', avg: st.avg == null ? null : Math.round(st.avg * 10) / 10, kg: act && act.kg ? act.kg : null, res: reserves().length };
  } });""",
    },
    'receta': {
        'host_before': '\n<div class="scrim" id="sheetWrap" hidden>',
        'save': ("function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }",
                 "function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} " + HOOK + " }"),
        'init': """// Panel Casa: cápsulas que quedan, día de la última toma y si la receta ya está pedida
if (window.PanelCasa) PanelCasa.init({ app: 'capsula', title: 'Cápsula · panel', mount: document.getElementById('panel-casa'), summary: function () {
  const b = state && state.bottle;
  if (!b) return { left: null };
  const last = state.doses.length ? dayKey(state.doses[state.doses.length - 1]) : '';
  return { left: b.remaining, total: b.total, last: last, ordered: b.ordered ? dayKey(b.ordered) : '' };
} });""",
    },
    'hijas': {
        'host_after': '</main>\n',
        'save': ("function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(items)); return true; } catch (e) { return false; } }",
                 "function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(items)); " + HOOK + " return true; } catch (e) { return false; } }"),
        'init': """  // Panel Casa: totales de cada una, lo del mes y los tres últimos aportes
  if (window.PanelCasa) PanelCasa.init({ app: 'mesadas', title: 'Mesadas · panel', mount: document.getElementById('panel-casa'), summary: function () {
    var d = new Date(), ym = d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1);
    var tot = { piti: 0, emi: 0 }, mes = { ym: ym, piti: 0, emi: 0 };
    items.forEach(function (r) { if (tot[r.who] == null) return; tot[r.who] += r.amount; if (r.date.slice(0, 7) === ym) mes[r.who] += r.amount; });
    return { tot: tot, mes: mes, ult: items.slice(0, 3).map(function (r) { return { w: r.who, m: r.amount, s: r.subject, d: r.date }; }) };
  } });""",
    },
}


def between(text, start, end, block, where):
    """Reemplaza lo que haya entre las marcas, o agrega el bloque con where(text, block)."""
    m = re.search(re.escape(start) + r'.*?' + re.escape(end), text, re.S)
    if m:
        return text[:m.start()] + block + text[m.end():]
    return where(text, block)


for nombre, conf in APPS.items():
    path = base / nombre / 'index.html'
    t = path.read_text(encoding='utf-8')

    # 1. Estilos, al final del bloque <style>
    def put_css(s, b):
        i = s.index('</style>')
        return s[:i] + b + '\n' + s[i:]
    t = between(t, '/*PANEL:CSS:START*/', '/*PANEL:CSS:END*/', CSS, put_css)

    # 2. Lugar de la tarjeta
    if HOST not in t:
        if 'host_after' in conf:
            i = t.index(conf['host_after']) + len(conf['host_after'])
            t = t[:i] + HOST + '\n' + t[i:]
        else:
            i = t.index(conf['host_before'])
            t = t[:i] + '\n' + HOST + t[i:]

    # 3. Aviso de cambio al guardar
    old, new = conf['save']
    if new not in t:
        assert t.count(old) == 1, nombre + ': no encuentro la función que guarda'
        t = t.replace(old, new)

    # 4. Resumen propio de la app, al final del script principal
    init = '/*PANEL:APP:START*/\n' + conf['init'] + '\n/*PANEL:APP:END*/'
    def put_init(s, b):
        i = s.rindex('\n})();\n</script>')
        return s[:i] + '\n' + b + s[i:]
    t = between(t, '/*PANEL:APP:START*/', '/*PANEL:APP:END*/', init, put_init)

    # 5. Módulo, en su propio <script> antes del script principal
    def put_mod(s, b):
        fin = s.rindex('\n})();\n</script>')
        i = s.rindex('<script>', 0, fin)
        return s[:i] + '<script>\n' + b + '\n</script>\n' + s[i:]
    t = between(t, '/*PANEL:START*/', '/*PANEL:END*/', MODULO, put_mod)

    path.write_text(t, encoding='utf-8')
    print(nombre, 'conectada')
