// Casa · cálculos y cambios de los datos de la casa. Sin pantalla: lo usan la app (index.html) y las pruebas
// (node --test app/pruebas/*.test.js). Las reglas son las mismas de las apps Balón de gas, Mi cápsula diaria,
// Filtro de agua, Cepillos y Sábanas, para que los números coincidan durante el mes de convivencia.
// Los datos viven en pablocarvallo/datos: ciclos.json (gas, filtro, cepillos y cápsula) y rutinas.json (sábanas).

export const VERSION = '1.0.2';

/* ---------- Fechas: claves «AAAA-MM-DD» en la hora del iPhone (Chile) ---------- */
const pad = (n) => (n < 10 ? '0' : '') + n;
const utc = (k) => { const p = String(k).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); };
export function diaDe(d) { const x = new Date(d); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); }
export function sumarDias(k, n) { const d = new Date(utc(k) + n * 86400000); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
export function esFecha(k) { return /^\d{4}-\d{2}-\d{2}$/.test(String(k)) && sumarDias(k, 0) === k; }
export function dias(a, b) { return Math.round((utc(b) - utc(a)) / 86400000); }
export function diaSemana(k) { return new Date(utc(k)).getUTCDay(); }
// Misma fecha n meses después; si ese mes es más corto, su último día (31 nov → 30 nov)
export function sumarMeses(k, n) {
  const p = String(k).split('-'); let y = +p[0], m = +p[1] - 1 + n;
  y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
  const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return y + '-' + pad(m + 1) + '-' + pad(Math.min(+p[2], ultimo));
}
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const nombreDia = (k) => DIAS[diaSemana(k)];
export const fechaCorta = (k) => { const p = k.split('-'); return (+p[2]) + ' ' + MES[+p[1] - 1]; };
export const fechaLarga = (k, hoy) => { const p = k.split('-'); return (+p[2]) + ' de ' + MESES[+p[1] - 1] + (hoy && hoy.slice(0, 4) === p[0] ? '' : ' de ' + p[0]); };
export const plural = (n, uno, varios) => (n === 1 ? uno : varios);
export const pesos = (n) => '$ ' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const acotar = (x) => Math.max(0, Math.min(1, x));
const copiar = (o) => JSON.parse(JSON.stringify(o));
export function nuevoId(letra) { return letra + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* ---------- Plantillas (igual a lo que hay en pablocarvallo/datos al empezar) ---------- */
export const PLANTILLAS = {
  'ciclos.json': { ciclos: [
    { id: 'gas', nombre: 'Balón de gas', regla: 'historial', nota: 'Balones de 45 kg: apertura, cierre y compra de reserva.', registros: [] },
    { id: 'agua', nombre: 'Filtro de agua', regla: 'meses', duracion: 3, avisos_dias: [14, 7], registros: [] },
    { id: 'cepillos', nombre: 'Cepillos', regla: 'cepillos', lavados_por_dia: 3, avisos_dias: [14, 7],
      cepillos: [{ id: 'casa', max_dias: 70, max_lavados: 180 }, { id: 'oficina', max_dias: 365, max_lavados: 180, dias: ['lunes', 'martes', 'jueves'] }], registros: [] },
    { id: 'capsula', nombre: 'Mi cápsula diaria', regla: 'consumo', por_dia: 1, avisos_unidades: [12, 10], critico: 5, registros: [] },
  ] },
  'rutinas.json': { sabanas: { dia: 'miércoles', inicio: '2026-10-07', turnos: ['Piti', 'Emi'], hechos: [] } },
};
export function ciclo(datos, id) { return ((datos && datos.ciclos) || []).find((c) => c.id === id) || null; }

/* ---------- Balón de gas ---------- */
// registros: { id, compra, apertura, cierre, kg, precio } (fechas o null). Sin apertura = reserva llena.
export function estadoGas(c, hoy) {
  const regs = ((c && c.registros) || []).filter((t) => t && (esFecha(t.apertura) || esFecha(t.compra)));
  const activo = regs.find((t) => t.apertura && !t.cierre) || null;
  const reservas = regs.filter((t) => !t.apertura).sort((a, b) => (a.compra < b.compra ? -1 : a.compra > b.compra ? 1 : a.id < b.id ? -1 : 1));
  const cerrados = regs.filter((t) => t.apertura && t.cierre).map((t) => ({ t, d: dias(t.apertura, t.cierre) }));
  const e = { hay: regs.length > 0, activo, reservas, cerrados, n: cerrados.length, promedio: null, min: null, max: null, porDia: null, porBalon: null };
  if (cerrados.length) {
    const suma = cerrados.reduce((s, r) => s + r.d, 0);
    e.promedio = suma / cerrados.length;
    e.min = Math.min(...cerrados.map((r) => r.d));
    e.max = Math.max(...cerrados.map((r) => r.d));
    const conPrecio = cerrados.filter((r) => r.t.precio);
    if (conPrecio.length) {
      const ps = conPrecio.reduce((s, r) => s + r.t.precio, 0), ds = conPrecio.reduce((s, r) => s + r.d, 0);
      e.porBalon = ps / conPrecio.length;
      if (ds > 0) e.porDia = ps / ds;
    }
  }
  if (activo) {
    e.enUso = Math.max(0, dias(activo.apertura, hoy));
    if (e.promedio != null) {
      const r = Math.max(Math.round(e.promedio), 1);
      e.quedan = r - e.enUso; e.fin = sumarDias(activo.apertura, r); e.avance = Math.min(e.enUso / r, 1);
    }
  }
  // Historial: reservas primero, después del más nuevo al más antiguo
  e.historial = regs.slice().sort((a, b) => {
    if (!a.apertura !== !b.apertura) return !a.apertura ? -1 : 1;
    const ka = a.apertura || a.compra, kb = b.apertura || b.compra;
    return ka < kb ? 1 : ka > kb ? -1 : a.id < b.id ? 1 : -1;
  });
  return e;
}

/* ---------- Filtro de agua: se cambia cada 3 meses calendario ---------- */
export function estadoAgua(c, hoy) {
  const regs = ((c && c.registros) || []).filter((f) => f && esFecha(f.fecha)).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  const actual = regs[0] || null;
  if (!actual) return { regs, actual: null };
  const cambio = sumarMeses(actual.fecha, (c && c.duracion) || 3);
  const total = Math.max(1, dias(actual.fecha, cambio)), quedan = dias(hoy, cambio);
  return { regs, actual, cambio, total, quedan, avance: acotar(1 - quedan / total) };
}

/* ---------- Cepillos: 180 lavados o el máximo de días, lo que ocurra primero ---------- */
// 3 lavados al día (7, 13 y 21 h). Los días de oficina (lunes, martes y jueves) el del mediodía es con el cepillo
// de la oficina; todos los demás, con el de la casa. El desgaste se calcula por calendario, sin anotar cada lavado.
const NUM_DIA = { domingo: 0, lunes: 1, martes: 2, 'miércoles': 3, miercoles: 3, jueves: 4, viernes: 5, 'sábado': 6, sabado: 6 };
function reglaCepillos(c) {
  const lista = (c && c.cepillos) || PLANTILLAS['ciclos.json'].ciclos[2].cepillos;
  const oficina = lista.find((x) => Array.isArray(x.dias)) || null;
  const casa = lista.find((x) => !Array.isArray(x.dias)) || lista[0];
  return {
    lista, casa, oficina,
    horas: (c && c.horas_lavado) || [7, 13, 21],
    lavadoOficina: c && c.lavado_oficina != null ? c.lavado_oficina : 1,
    diasOficina: oficina ? oficina.dias.map((d) => NUM_DIA[String(d).toLowerCase()]) : [],
  };
}
function lavadosDelDia(R, k, id, hasta) {
  const ofi = R.oficina && R.diasOficina.includes(diaSemana(k));
  let n = 0;
  R.horas.forEach((h, i) => {
    if (hasta != null && h > hasta) return;
    const usa = ofi && i === R.lavadoOficina ? R.oficina.id : R.casa.id;
    if (usa === id) n++;
  });
  return n;
}
function lavadosDesde(R, id, inicio, hoy, hora) {
  let n = 0, k = inicio;
  while (k < hoy) { n += lavadosDelDia(R, k, id, null); k = sumarDias(k, 1); }
  if (inicio <= hoy) n += lavadosDelDia(R, hoy, id, hora);
  return n;
}
function cambioPorLavados(R, cep, inicio) {
  let n = 0, k = inicio;
  for (let i = 0; i < 4000; i++) { n += lavadosDelDia(R, k, cep.id, null); if (n >= cep.max_lavados) return k; k = sumarDias(k, 1); }
  return k;
}
export function cambioCepillo(c, id, inicio) {
  const R = reglaCepillos(c), cep = R.lista.find((x) => x.id === id);
  const porLavados = cambioPorLavados(R, cep, inicio), porDias = sumarDias(inicio, cep.max_dias - 1);
  return { cambio: porLavados < porDias ? porLavados : porDias, porDias: porDias <= porLavados };
}
export function estadoCepillos(c, hoy, hora) {
  const R = reglaCepillos(c);
  const regs = ((c && c.registros) || []).filter((r) => r && esFecha(r.fecha) && R.lista.some((x) => x.id === r.cepillo))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.cepillo < b.cepillo ? -1 : 1));
  const por = {};
  R.lista.forEach((cep) => {
    const actual = regs.find((r) => r.cepillo === cep.id);
    if (!actual) { por[cep.id] = null; return; }
    const hechos = lavadosDesde(R, cep.id, actual.fecha, hoy, hora);
    const { cambio, porDias } = cambioCepillo(c, cep.id, actual.fecha);
    const usados = Math.max(0, dias(actual.fecha, hoy)) + hora / 24;
    por[cep.id] = {
      actual, hechos, max: cep.max_lavados, maxDias: cep.max_dias, cambio, porDias, quedan: dias(hoy, cambio),
      avance: acotar(Math.max(hechos / cep.max_lavados, usados / cep.max_dias)),
      hoyHechos: lavadosDelDia(R, hoy, cep.id, hora), hoyTotal: lavadosDelDia(R, hoy, cep.id, null),
    };
  });
  const activos = Object.keys(por).filter((k) => por[k]);
  const primero = activos.sort((a, b) => por[a].quedan - por[b].quedan)[0] || null;
  return { regs, por, primero, ids: R.lista.map((x) => x.id) };
}
export const NOMBRE_CEPILLO = { casa: 'Casa', oficina: 'Oficina' };
export const DEL_CEPILLO = { casa: 'de la casa', oficina: 'de la oficina' };

/* ---------- Mi cápsula diaria: una al día; avisos a 12 y 10, crítico a 5 ---------- */
// frasco: { total, base, quedan, inicio, pedida }; tomas: momentos ISO; historial: frascos anteriores (los últimos 10)
export function tomaDel(c, dia) { return ((c && c.tomas) || []).slice().reverse().find((t) => diaDe(t) === dia) || null; }
export function estadoCapsula(c, hoy) {
  const f = c && c.frasco;
  if (!f) return { frasco: null };
  const quedan = Math.max(0, Math.round(f.quedan || 0)), total = Math.max(quedan, Math.round(f.total || 0));
  const tomoHoy = !!tomaDel(c, hoy);
  const avisos = (c.avisos_unidades || [12, 10]), critico = c.critico || 5;
  const nivel = quedan <= 0 ? 'vacio' : quedan <= critico ? 'critico' : quedan <= Math.max(...avisos) ? 'aviso' : 'ok';
  return {
    frasco: f, quedan, total, tomoHoy, pedida: f.pedida || null, nivel,
    ultimo: quedan > 0 ? sumarDias(hoy, tomoHoy ? quedan : quedan - 1) : '',   // último día con cápsula
    avance: total ? acotar(1 - quedan / total) : 1,
  };
}

/* ---------- Sábanas: cada miércoles, alternando Piti y Emi desde el 7 oct 2026 ---------- */
export function turnoDe(r, k) {
  const t = (r && r.turnos) || ['Piti', 'Emi'];
  const w = Math.round(dias(r.inicio, k) / 7);
  return t[((w % t.length) + t.length) % t.length];
}
export function estadoSabanas(r, hoy) {
  const hechos = new Set(((r && r.hechos) || []).filter(esFecha));
  const dia = NUM_DIA[String((r && r.dia) || 'miércoles').toLowerCase()];
  const esta = sumarDias(hoy, (dia - diaSemana(hoy) + 7) % 7);       // este miércoles (hoy, si es miércoles)
  const atrasados = [];
  for (let k = r.inicio; k < hoy; k = sumarDias(k, 7)) if (!hechos.has(k)) atrasados.push(k);
  const hoyHecho = esta === hoy && hechos.has(hoy);
  const proximo = atrasados[0] || (hoyHecho ? sumarDias(hoy, 7) : esta);
  const manana = sumarDias(hoy, 1);
  const lista = [];
  for (let i = -3; i <= 3; i++) {
    const k = sumarDias(esta, 7 * i);
    if (k >= r.inicio) lista.push({ fecha: k, turno: turnoDe(r, k), hecho: hechos.has(k), atrasado: !hechos.has(k) && k < hoy, futuro: k > hoy });
  }
  return {
    proximo, turno: turnoDe(r, proximo), atrasados, atrasado: atrasados.length > 0,
    esHoy: !atrasados.length && proximo === hoy, esManana: !atrasados.length && proximo === manana,
    hoyPendiente: esta === hoy && !hechos.has(hoy), mananaPendiente: esta === manana && !hechos.has(esta),
    esta, turnoEsta: turnoDe(r, esta), lista, total: hechos.size,
  };
}

/* ---------- Lo que hay que atender hoy, de lo más urgente a lo menos ---------- */
// tono: 'neg' (vencido o crítico), 'aviso' (faltan pocos días) o 'info'. ir: a qué ciclo lleva al tocarlo.
export function avisosDeHoy(ciclos, rutinas, hoy, hora) {
  const out = [];
  const cap = estadoCapsula(ciclo(ciclos, 'capsula'), hoy);
  if (cap.frasco) {
    if (cap.quedan <= 0) out.push({ tono: 'neg', peso: 1, ir: 'capsula', texto: 'Se acabaron las cápsulas' });
    else if (cap.nivel !== 'ok' && !cap.pedida) out.push({ tono: cap.nivel === 'critico' ? 'neg' : 'aviso', peso: cap.nivel === 'critico' ? 1 : 3, ir: 'capsula', texto: (cap.quedan === 1 ? 'Queda 1 cápsula' : 'Quedan ' + cap.quedan + ' cápsulas') + ': manda a hacer la receta' });
    if (cap.quedan > 0 && !cap.tomoHoy) out.push({ tono: 'info', peso: 6, ir: 'capsula', texto: 'Falta la cápsula de hoy', accion: 'tomar' });
  }
  const g = estadoGas(ciclo(ciclos, 'gas'), hoy);
  if (g.hay) {
    if (!g.activo) out.push({ tono: 'aviso', peso: 2, ir: 'gas', texto: 'No hay balón de gas en uso' });
    else if (g.quedan != null && g.quedan <= 3) {
      const t = g.quedan < 0 ? 'El gas lleva ' + (-g.quedan) + ' ' + plural(-g.quedan, 'día', 'días') + ' sobre su promedio'
        : g.quedan === 0 ? 'El gas llega hoy a su promedio' : 'Al gas le quedan unos ' + g.quedan + ' ' + plural(g.quedan, 'día', 'días');
      const res = g.reservas.length > 0;
      out.push({ tono: res ? 'aviso' : 'neg', peso: res ? 4 : 2, ir: 'gas', texto: t + (res ? ' (hay reserva)' : ' y no hay reserva') });
    }
  }
  const a = estadoAgua(ciclo(ciclos, 'agua'), hoy);
  if (a.actual) {
    if (a.quedan < 0) out.push({ tono: 'neg', peso: 2, ir: 'agua', texto: 'El filtro de agua lleva ' + (-a.quedan) + ' ' + plural(-a.quedan, 'día', 'días') + ' vencido' });
    else if (a.quedan === 0) out.push({ tono: 'neg', peso: 2, ir: 'agua', texto: 'Hoy toca cambiar el filtro de agua' });
    else if (a.quedan <= 14) out.push({ tono: a.quedan <= 7 ? 'neg' : 'aviso', peso: a.quedan <= 7 ? 3 : 4, ir: 'agua', texto: 'Al filtro de agua le ' + plural(a.quedan, 'falta', 'faltan') + ' ' + a.quedan + ' ' + plural(a.quedan, 'día', 'días') + ' para el cambio' });
  }
  const cp = estadoCepillos(ciclo(ciclos, 'cepillos'), hoy, hora);
  cp.ids.forEach((id) => {
    const r = cp.por[id];
    if (!r) return;
    const cual = 'cepillo ' + DEL_CEPILLO[id];
    if (r.quedan < 0) out.push({ tono: 'neg', peso: 2, ir: 'cepillos', texto: 'El ' + cual + ' lleva ' + (-r.quedan) + ' ' + plural(-r.quedan, 'día', 'días') + ' vencido' });
    else if (r.quedan === 0) out.push({ tono: 'neg', peso: 2, ir: 'cepillos', texto: 'Hoy toca cambiar el ' + cual });
    else if (r.quedan <= 14) out.push({ tono: r.quedan <= 7 ? 'neg' : 'aviso', peso: r.quedan <= 7 ? 3 : 4, ir: 'cepillos', texto: 'Al ' + cual + ' le ' + plural(r.quedan, 'falta', 'faltan') + ' ' + r.quedan + ' ' + plural(r.quedan, 'día', 'días') + ' para el cambio' });
  });
  const s = estadoSabanas(rutinas.sabanas, hoy);
  if (s.atrasado) {
    const k = s.atrasados[0];
    out.push({ tono: 'aviso', peso: 4, ir: 'sabanas', texto: s.atrasados.length > 1 ? s.atrasados.length + ' cambios de sábanas sin marcar, desde el ' + fechaCorta(k) : 'Sábanas atrasadas: le tocaba a ' + turnoDe(rutinas.sabanas, k) + ' el miércoles ' + fechaCorta(k) });
  }
  if (s.hoyPendiente) out.push({ tono: 'info', peso: 5, ir: 'sabanas', texto: 'Hoy toca cambiar sábanas: ' + s.turnoEsta, accion: 'sabanas' });
  else if (s.mananaPendiente) out.push({ tono: 'info', peso: 7, ir: 'sabanas', texto: 'Mañana toca cambiar sábanas: ' + s.turnoEsta });
  return out.sort((x, y) => x.peso - y.peso);
}

/* ---------- Cambios ---------- */
// Cada cambio es { id, tipo, …datos }. aplicar() lo aplica sobre el contenido de un archivo y devuelve una copia.
// Si el guardado choca con el de otro dispositivo, la app vuelve a leer el archivo y aplica de nuevo los cambios
// pendientes. Los últimos ids aplicados quedan en «ultimos_cambios» para no aplicar dos veces el mismo.
const MAX_IDS = 40;
export function aplicar(archivo, contenido, cambio) {
  const d = copiar(contenido || PLANTILLAS[archivo]);
  d.ultimos_cambios = Array.isArray(d.ultimos_cambios) ? d.ultimos_cambios : [];
  if (cambio.id && d.ultimos_cambios.includes(cambio.id)) return d;
  const f = CAMBIOS[cambio.tipo];
  if (!f) throw new Error('Cambio desconocido: ' + cambio.tipo);
  f(d, cambio);
  if (cambio.id) d.ultimos_cambios = d.ultimos_cambios.concat(cambio.id).slice(-MAX_IDS);
  return d;
}
function cicloDe(d, id) {
  d.ciclos = Array.isArray(d.ciclos) ? d.ciclos : [];
  let c = d.ciclos.find((x) => x.id === id);
  if (!c) { c = copiar(PLANTILLAS['ciclos.json'].ciclos.find((x) => x.id === id)); d.ciclos.push(c); }
  c.registros = Array.isArray(c.registros) ? c.registros : [];
  return c;
}
const CAMBIOS = {
  // Agrega o reemplaza registros por id (gas, agua, cepillos)
  guardar(d, { ciclo: id, registros }) {
    const c = cicloDe(d, id);
    registros.forEach((r) => { const i = c.registros.findIndex((x) => x.id === r.id); if (i >= 0) c.registros[i] = r; else c.registros.push(r); });
  },
  borrar(d, { ciclo: id, ids }) { const c = cicloDe(d, id); c.registros = c.registros.filter((x) => !ids.includes(x.id)); },
  // Reemplaza todos los registros de un ciclo (al traer el respaldo de una app antigua)
  reemplazar(d, { ciclo: id, registros }) { cicloDe(d, id).registros = registros; },
  tomar(d, { dia, momento }) {
    const c = cicloDe(d, 'capsula'), f = c.frasco;
    c.tomas = Array.isArray(c.tomas) ? c.tomas : [];
    if (!f || f.quedan <= 0 || tomaDel(c, dia)) return;
    f.quedan -= 1;
    c.tomas.push(momento);
    c.tomas.sort((a, b) => new Date(a) - new Date(b));
    if (c.tomas.length > 120) c.tomas = c.tomas.slice(-120);
  },
  quitarToma(d, { dia }) {
    const c = cicloDe(d, 'capsula'), f = c.frasco, t = tomaDel(c, dia);
    if (!f || !t) return;
    c.tomas.splice(c.tomas.lastIndexOf(t), 1);
    f.quedan += 1;
    if (f.quedan > f.total) f.total = f.quedan;
  },
  frasco(d, { cantidad, sumarQuedan, momento }) {
    const c = cicloDe(d, 'capsula'), viejo = c.frasco, quedaban = viejo ? viejo.quedan : 0;
    c.historial = Array.isArray(c.historial) ? c.historial : [];
    if (viejo) c.historial = [{ inicio: viejo.inicio, fin: momento, total: viejo.total, quedaron: quedaban }].concat(c.historial).slice(0, 10);
    const total = cantidad + (viejo && sumarQuedan ? quedaban : 0);
    c.frasco = { total, base: cantidad, quedan: total, inicio: momento, pedida: null };
  },
  corregir(d, { cantidad }) {
    const f = cicloDe(d, 'capsula').frasco;
    if (!f) return;
    f.quedan = cantidad;
    if (cantidad > f.total) f.total = cantidad;
  },
  pedida(d, { si, momento }) { const f = cicloDe(d, 'capsula').frasco; if (f) f.pedida = si ? momento : null; },
  capsulaImportada(d, { frasco, tomas, historial }) {
    const c = cicloDe(d, 'capsula');
    c.frasco = frasco; c.tomas = tomas || []; c.historial = historial || [];
  },
  sabanas(d, { fecha, hecho }) {
    const s = d.sabanas; s.hechos = Array.isArray(s.hechos) ? s.hechos : [];
    s.hechos = s.hechos.filter((k) => k !== fecha);
    if (hecho) s.hechos.push(fecha);
    s.hechos.sort();
  },
  // Marca como hechos todos los miércoles desde el inicio hasta la fecha dada (al empezar a usar la app)
  sabanasHasta(d, { hasta }) {
    const s = d.sabanas, set = new Set(s.hechos || []);
    for (let k = s.inicio; k <= hasta; k = sumarDias(k, 7)) set.add(k);
    s.hechos = Array.from(set).sort();
  },
};

/* ---------- Respaldos de las apps antiguas ---------- */
// Reconoce el texto que copia «Copiar respaldo» en Balón de gas, Filtro de agua, Cepillos y Maletas.
// Devuelve { app, nombre, cambio } (cambio listo para aplicar), { app: 'maletas', datos } o { error }.
export function leerRespaldo(texto) {
  let d;
  try { d = JSON.parse(String(texto || '').trim()); } catch (e) { return { error: 'El texto no es un respaldo. Cópialo de nuevo desde la app antigua.' }; }
  const fecha = (x) => (esFecha(x) ? x : null);
  if (Array.isArray(d) && d.every((t) => t && ('open' in t || 'bought' in t))) {
    const registros = d.map((t) => ({
      id: String(t.id || nuevoId('g')).replace(/[^\w-]/g, ''), compra: fecha(t.bought), apertura: fecha(t.open),
      cierre: fecha(t.open) && fecha(t.close) && t.close >= t.open ? t.close : null, kg: +t.kg > 0 ? +t.kg : null, precio: +t.price > 0 ? Math.round(+t.price) : null,
    })).filter((t) => t.apertura || t.compra);
    if (!registros.length) return { error: 'El respaldo de Balón de gas no tiene balones.' };
    return { app: 'gas', nombre: 'Balón de gas', resumen: registros.length + ' ' + plural(registros.length, 'balón', 'balones'), cambio: { tipo: 'reemplazar', ciclo: 'gas', registros } };
  }
  if (d && d.app === 'filtro-agua' && Array.isArray(d.filtros)) {
    const vistos = new Set();
    const registros = d.filtros.filter((f) => f && fecha(f.date) && !vistos.has(f.date) && vistos.add(f.date))
      .map((f) => ({ id: String(f.id || nuevoId('f')).replace(/[^\w-]/g, ''), fecha: f.date }));
    if (!registros.length) return { error: 'El respaldo de Filtro de agua no tiene filtros.' };
    return { app: 'agua', nombre: 'Filtro de agua', resumen: registros.length + ' ' + plural(registros.length, 'filtro', 'filtros'), cambio: { tipo: 'reemplazar', ciclo: 'agua', registros } };
  }
  if (d && d.app === 'cepillos' && Array.isArray(d.registros)) {
    const vistos = new Set();
    const registros = d.registros.filter((r) => r && (r.b === 'casa' || r.b === 'oficina') && fecha(r.date) && !vistos.has(r.b + r.date) && vistos.add(r.b + r.date))
      .map((r) => ({ id: String(r.id || nuevoId('c')).replace(/[^\w-]/g, ''), cepillo: r.b, fecha: r.date }));
    if (!registros.length) return { error: 'El respaldo de Cepillos no tiene cepillos.' };
    return { app: 'cepillos', nombre: 'Cepillos', resumen: registros.length + ' ' + plural(registros.length, 'cepillo', 'cepillos'), cambio: { tipo: 'reemplazar', ciclo: 'cepillos', registros } };
  }
  if (d && Array.isArray(d.cases) && Array.isArray(d.items)) {
    return { app: 'maletas', nombre: 'Maletas', resumen: d.cases.length + ' maletas y ' + d.items.length + ' ' + plural(d.items.length, 'objeto', 'objetos'), datos: d };
  }
  if (d && d.app === 'casa' && d.archivos) return { app: 'casa', nombre: 'Casa', resumen: 'respaldo completo de Casa', archivos: d.archivos };
  return { error: 'No reconozco este respaldo. Sirven los de Balón de gas, Filtro de agua, Cepillos y Maletas.' };
}
