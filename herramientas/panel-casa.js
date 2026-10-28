/*PANEL:START*/
/* Panel Casa: publica en el buzón privado de GitHub un resumen de esta app, para que Panel Casa lo muestre.
   Es el mismo código en Pagos del mes, Balón de gas, Mi cápsula diaria, Mesadas y Sábanas. No se edita en la app:
   se copia desde casa/herramientas/panel-casa.js con  python3 herramientas/conectar-apps.py <carpeta de las apps>
   Uso: PanelCasa.init({ app, title, mount, summary }) al abrir la app y PanelCasa.changed() cada vez que se guarda. */
var PanelCasa = (function () {
  'use strict';
  var KEY = 'panel-casa', REPO_RE = /^[\w.-]+\/[\w.-]+$/;
  var opts = null, cfg = read(), timer = 0, busy = false, again = false, armed = false, editing = false;

  function read() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      return c && REPO_RE.test(String(c.r || '')) && typeof c.t === 'string' && c.t.length >= 20 ? c : null;
    } catch (e) { return null; }
  }
  function write() { try { if (cfg) localStorage.setItem(KEY, JSON.stringify(cfg)); else localStorage.removeItem(KEY); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function when(ms) {
    var d = new Date(ms), n = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; };
    var y = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1);
    var day = d.toDateString() === n.toDateString() ? 'hoy' : d.toDateString() === y.toDateString() ? 'ayer'
      : d.getDate() + ' ' + ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()];
    return day + ', ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ---------- Publicar ---------- */
  async function gh(method, path, body, keep, conn) {
    var c = conn || cfg;
    var r = await fetch('https://api.github.com/repos/' + c.r + path, {
      method: method, cache: 'no-store', keepalive: !!keep,
      headers: { Authorization: 'Bearer ' + c.t, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!r.ok) { var e = new Error('GitHub ' + r.status); e.status = r.status; throw e; }
    return r.status === 204 ? null : r.json();
  }
  // El resumen va en la descripción de un hito cerrado con el nombre de la app (por ejemplo «Gas · panel»)
  async function send(desc, retried) {
    if (!cfg.m) {
      var list = await gh('GET', '/milestones?state=all&per_page=100');
      var f = (Array.isArray(list) ? list : []).filter(function (x) { return x && x.title === opts.title; })[0];
      if (!f) { cfg.m = (await gh('POST', '/milestones', { title: opts.title, state: 'closed', description: desc })).number; return; }
      cfg.m = f.number;
    }
    try { await gh('PATCH', '/milestones/' + cfg.m, { description: desc }, true); }
    catch (e) { if (e.status === 404 && !retried) { cfg.m = 0; return send(desc, true); } throw e; }
  }
  async function flush() {
    clearTimeout(timer); timer = 0;
    if (!cfg || !opts) return;
    if (busy) { again = true; return; }
    var data;
    try { data = opts.summary(); } catch (e) { data = null; }
    if (!data) return;
    var body = JSON.stringify(data);
    if (body === cfg.h && !cfg.err) return;          // nada cambió desde la última vez
    busy = true;
    var full = { app: opts.app, v: 1, at: Date.now() };
    Object.keys(data).forEach(function (k) { full[k] = data[k]; });
    try { await send(JSON.stringify(full)); cfg.h = body; cfg.ok = full.at; cfg.err = 0; }
    catch (e) { cfg.err = (e && e.status) || 1; }
    if (cfg) write();
    busy = false; paint();
    if (again) { again = false; flush(); }
  }
  function changed() { if (cfg && opts) { clearTimeout(timer); timer = setTimeout(flush, 1200); } }

  /* ---------- Vista: tarjeta «Panel Casa» al final de la app ---------- */
  var I_HOUSE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3.5 11.2L12 4l8.5 7.2V20a1 1 0 0 1-1 1h-5v-5.5h-5V21h-5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  function status() {
    if (!cfg) return '';
    if (busy) return '<span class="pc-st">Publicando…</span>';
    if (cfg.err === 401) return '<span class="pc-st pc-bad">El token venció: pega un código nuevo</span>';
    if (cfg.err === 403) return '<span class="pc-st pc-bad">El token no puede escribir en el buzón</span>';
    if (cfg.err === 404) return '<span class="pc-st pc-bad">No se encontró el buzón</span>';
    if (cfg.err) return '<span class="pc-st pc-bad">Sin conexión: se publicará al próximo cambio</span>';
    return '<span class="pc-st pc-ok">' + (cfg.ok ? 'Publicó ' + esc(when(cfg.ok)) : 'Conectada') + '</span>';
  }
  function paint() {
    var el = opts && opts.mount;
    if (!el) return;
    var h = '<section class="pc" aria-label="Panel Casa"><div class="pc-head"><span class="pc-ic">' + I_HOUSE + '</span><div><b>Panel Casa</b>' +
      (cfg ? status() : '<span class="pc-st">Sin conectar</span>') + '</div></div>';
    if (cfg && !editing) {
      h += '<p class="pc-p">Lo que anotas aquí se ve también en Panel Casa.</p><div class="pc-btns">' +
        '<button type="button" class="pc-btn" data-pc="now">Publicar ahora</button>' +
        '<button type="button" class="pc-btn pc-danger' + (armed ? ' pc-armed' : '') + '" data-pc="off">' + (armed ? 'Toca de nuevo' : 'Desconectar') + '</button></div>';
    } else {
      h += '<p class="pc-p">Para ver esta app en Panel Casa: en el panel, abre Conexiones y toca «Copiar código para las apps». Luego vuelve aquí.</p>';
      if (editing) {
        h += '<textarea class="pc-ta" id="pc-ta" rows="3" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Pega aquí el código (empieza con CASA1.)"></textarea>' +
          '<div class="pc-btns"><button type="button" class="pc-btn pc-main" data-pc="save">Conectar</button><button type="button" class="pc-btn" data-pc="cancel">Cancelar</button></div>';
      } else {
        h += '<div class="pc-btns"><button type="button" class="pc-btn pc-main" data-pc="paste">Pegar código</button></div>';
      }
      h += '<p class="pc-err" id="pc-err" hidden></p>';
    }
    el.innerHTML = h + '</section>';
  }
  function parseCode(text) {
    var m = /CASA1\.([A-Za-z0-9+\/=]+)/.exec(String(text || ''));
    if (!m) return null;
    try {
      var o = JSON.parse(atob(m[1]));
      return o && REPO_RE.test(String(o.r || '')) && typeof o.t === 'string' && o.t.trim().length >= 20 ? { r: String(o.r), t: o.t.trim() } : null;
    } catch (e) { return null; }
  }
  function connect(text) {
    var c = parseCode(text);
    if (!c) return false;
    cfg = { r: c.r, t: c.t, m: 0, h: '', ok: 0, err: 0 };
    editing = false; write(); paint(); flush();
    return true;
  }
  function showErr(msg) { var e = document.getElementById('pc-err'); if (e) { e.textContent = msg; e.hidden = false; } }
  function onClick(ev) {
    var b = ev.target.closest && ev.target.closest('[data-pc]');
    if (!b || !opts || !opts.mount.contains(b)) return;
    var a = b.getAttribute('data-pc');
    if (a === 'paste') {
      // Primero intenta leer el portapapeles; si el iPhone no lo permite, muestra un campo para pegar
      var manual = function () { editing = true; paint(); var t = document.getElementById('pc-ta'); if (t) t.focus(); };
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (txt) { if (!connect(txt)) manual(); }, manual);
      } else manual();
    } else if (a === 'save') {
      var t = document.getElementById('pc-ta');
      if (!connect(t ? t.value : '')) showErr('Ese no es el código del panel. Cópialo de nuevo en Panel Casa → Conexiones.');
    } else if (a === 'cancel') { editing = false; paint(); }
    else if (a === 'now') { if (cfg) { cfg.h = ''; flush(); paint(); } }
    else if (a === 'off') {
      if (!armed) { armed = true; paint(); setTimeout(function () { armed = false; paint(); }, 4000); return; }
      armed = false;
      var old = cfg; cfg = null; write(); paint();
      // El hito queda vacío para que el panel no siga mostrando datos viejos
      if (old && old.m) gh('PATCH', '/milestones/' + old.m, { description: '' }, null, false, old).catch(function () {});
    }
  }

  function init(o) {
    opts = o;
    if (!opts || typeof opts.summary !== 'function') return;
    if (opts.mount) { paint(); opts.mount.addEventListener('click', onClick); }
    if (cfg) setTimeout(flush, 1500);
    // Al salir de la app se publica lo que esté pendiente
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && timer) flush(); });
  }
  return { init: init, changed: changed };
})();
/*PANEL:END*/
