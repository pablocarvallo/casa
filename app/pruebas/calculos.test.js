// Pruebas de los cálculos de Casa. Correr con: TZ=America/Santiago node --test app/pruebas/*.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../calculos.js';

const ciclos = () => JSON.parse(JSON.stringify(C.PLANTILLAS['ciclos.json']));
const rutinas = () => JSON.parse(JSON.stringify(C.PLANTILLAS['rutinas.json']));

// ---- Lógica de la app Cepillos, copiada sin cambios (repo pablocarvallo/cepillos), para comparar ----
const V = (() => {
  var WASH_HOURS = [7, 13, 21], OFFICE_WASH = 1, OFFICE_DAYS = [1, 2, 4];
  var BRUSHES = { casa: { cap: 180, maxDays: 70 }, oficina: { cap: 180, maxDays: 365 } };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function utc(k) { var p = k.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function diff(a, b) { return Math.round((utc(b) - utc(a)) / 86400000); }
  function addDays(k, n) { var d = new Date(utc(k) + n * 86400000); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function dow(k) { return new Date(utc(k)).getUTCDay(); }
  function isOffice(k) { return OFFICE_DAYS.indexOf(dow(k)) >= 0; }
  function washes(k, brush, upTo) { var n = 0, ofi = isOffice(k); for (var i = 0; i < WASH_HOURS.length; i++) { if (upTo != null && WASH_HOURS[i] > upTo) continue; if ((brush === 'oficina') === (ofi && i === OFFICE_WASH)) n++; } return n; }
  function worn(brush, start, today, hour) { var n = 0, k = start; while (k < today) { n += washes(k, brush, null); k = addDays(k, 1); } if (start <= today) n += washes(today, brush, hour); return n; }
  function washDue(brush, start) { var cap = BRUSHES[brush].cap, n = 0, k = start; for (var i = 0; i < 4000; i++) { n += washes(k, brush, null); if (n >= cap) return k; k = addDays(k, 1); } return k; }
  function timeDue(brush, start) { return addDays(start, BRUSHES[brush].maxDays - 1); }
  function dueDate(brush, start) { var a = washDue(brush, start), b = timeDue(brush, start); return a < b ? a : b; }
  function stats(brush, date, today, hour) {
    var cap = BRUSHES[brush].cap, done = worn(brush, date, today, hour), due = dueDate(brush, date), md = BRUSHES[brush].maxDays;
    var days = Math.max(0, diff(date, today)) + hour / 24;
    return { done, due, left: diff(today, due), frac: Math.max(0, Math.min(1, Math.max(done / cap, days / md))) };
  }
  return { stats, addDays };
})();

test('Cepillos: mismos lavados, fecha de cambio y desgaste que la app Cepillos', () => {
  const c = ciclos();
  const cep = C.ciclo(c, 'cepillos');
  for (let i = 0; i < 60; i++) {
    const inicio = V.addDays('2026-09-01', i * 3);
    cep.registros = [{ id: 'a', cepillo: 'casa', fecha: inicio }, { id: 'b', cepillo: 'oficina', fecha: inicio }];
    for (const hoy of [inicio, V.addDays(inicio, 9), V.addDays(inicio, 40), V.addDays(inicio, 80)]) {
      for (const hora of [6, 12.5, 22]) {
        const e = C.estadoCepillos(cep, hoy, hora);
        for (const b of ['casa', 'oficina']) {
          const v = V.stats(b, inicio, hoy, hora), n = e.por[b];
          assert.deepEqual([n.hechos, n.cambio, n.quedan, n.avance.toFixed(6)], [v.done, v.due, v.left, v.frac.toFixed(6)], `${b} desde ${inicio}, hoy ${hoy} ${hora} h`);
        }
      }
    }
  }
});

test('Filtro de agua: 3 meses calendario, con fin de mes', () => {
  const c = C.ciclo(ciclos(), 'agua');
  c.registros = [{ id: 'x', fecha: '2026-08-31' }, { id: 'y', fecha: '2026-05-31' }];
  const e = C.estadoAgua(c, '2026-11-20');
  assert.equal(e.actual.id, 'x');
  assert.equal(e.cambio, '2026-11-30');
  assert.equal(e.quedan, 10);
});

test('Gas: promedio de los balones cerrados, días en uso y reserva más antigua primero', () => {
  const c = C.ciclo(ciclos(), 'gas');
  c.registros = [
    { id: 'a', compra: null, apertura: '2026-06-01', cierre: '2026-07-21', kg: 45, precio: 60000 },
    { id: 'b', compra: null, apertura: '2026-07-21', cierre: '2026-09-19', kg: 45, precio: 66000 },
    { id: 'c', compra: null, apertura: '2026-09-19', cierre: null, kg: 45, precio: null },
    { id: 'r2', compra: '2026-11-10', apertura: null, cierre: null, kg: 45, precio: null },
    { id: 'r1', compra: '2026-10-30', apertura: null, cierre: null, kg: 45, precio: null },
  ];
  const e = C.estadoGas(c, '2026-11-24');
  assert.equal(e.promedio, 55);          // 50 y 60 días
  assert.equal(e.enUso, 66);
  assert.equal(e.quedan, -11);
  assert.equal(e.reservas[0].id, 'r1');
  assert.equal(e.porBalon, 63000);
  assert.equal(Math.round(e.porDia), 1145);
  assert.deepEqual(e.historial.map((t) => t.id), ['r2', 'r1', 'c', 'b', 'a']);
});

test('Cápsula: tomar, quitar, frasco nuevo sumando las que quedan, y el último día con cápsula', () => {
  let d = ciclos();
  d = C.aplicar('ciclos.json', d, { id: '1', tipo: 'frasco', cantidad: 30, sumarQuedan: false, momento: '2026-11-01T12:00:00.000Z' });
  d = C.aplicar('ciclos.json', d, { id: '2', tipo: 'tomar', dia: '2026-11-24', momento: new Date(2026, 10, 24, 8, 0).toISOString() });
  d = C.aplicar('ciclos.json', d, { id: '3', tipo: 'tomar', dia: '2026-11-24', momento: new Date(2026, 10, 24, 9, 0).toISOString() });
  let e = C.estadoCapsula(C.ciclo(d, 'capsula'), '2026-11-24');
  assert.deepEqual([e.quedan, e.tomoHoy, e.ultimo], [29, true, '2026-12-23']);
  d = C.aplicar('ciclos.json', d, { id: '4', tipo: 'corregir', cantidad: 11 });
  e = C.estadoCapsula(C.ciclo(d, 'capsula'), '2026-11-24');
  assert.equal(e.nivel, 'aviso');
  d = C.aplicar('ciclos.json', d, { id: '5', tipo: 'quitarToma', dia: '2026-11-24' });
  e = C.estadoCapsula(C.ciclo(d, 'capsula'), '2026-11-24');
  assert.deepEqual([e.quedan, e.tomoHoy, e.ultimo], [12, false, '2026-12-05']);
  d = C.aplicar('ciclos.json', d, { id: '6', tipo: 'frasco', cantidad: 60, sumarQuedan: true, momento: '2026-11-24T15:00:00.000Z' });
  const c = C.ciclo(d, 'capsula');
  assert.deepEqual([c.frasco.total, c.frasco.quedan, c.historial[0].quedaron], [72, 72, 12]);
});

test('Un mismo cambio aplicado dos veces no se repite', () => {
  let d = ciclos();
  d = C.aplicar('ciclos.json', d, { id: 'f', tipo: 'frasco', cantidad: 30, sumarQuedan: false, momento: 'x' });
  const t = { id: 't1', tipo: 'tomar', dia: '2026-11-23', momento: new Date(2026, 10, 23, 12).toISOString() };
  d = C.aplicar('ciclos.json', d, t);
  d = C.aplicar('ciclos.json', d, t);
  assert.equal(C.ciclo(d, 'capsula').frasco.quedan, 29);
  assert.ok(d.ultimos_cambios.includes('t1'));
});

test('Sábanas: miércoles alternados desde el 7 oct 2026 y atrasados', () => {
  let r = rutinas();
  assert.equal(C.turnoDe(r.sabanas, '2026-10-07'), 'Piti');
  assert.equal(C.turnoDe(r.sabanas, '2026-11-25'), 'Emi');
  let e = C.estadoSabanas(r.sabanas, '2026-11-24');
  assert.equal(e.atrasados.length, 7);   // 7 oct a 18 nov sin marcar
  r = C.aplicar('rutinas.json', r, { id: 'h', tipo: 'sabanasHasta', hasta: '2026-11-18' });
  e = C.estadoSabanas(r.sabanas, '2026-11-24');
  assert.deepEqual([e.atrasado, e.proximo, e.turno, e.esManana, e.mananaPendiente], [false, '2026-11-25', 'Emi', true, true]);
  r = C.aplicar('rutinas.json', r, { id: 'm', tipo: 'sabanas', fecha: '2026-11-25', hecho: true });
  e = C.estadoSabanas(r.sabanas, '2026-11-25');
  assert.deepEqual([e.proximo, e.turno, e.hoyPendiente], ['2026-12-02', 'Piti', false]);
});

test('Avisos de hoy, del más urgente al menos', () => {
  const d = ciclos(), r = rutinas();
  C.ciclo(d, 'agua').registros = [{ id: 'f', fecha: '2026-08-28' }];      // cambio el 28 nov: faltan 4 días
  C.ciclo(d, 'capsula').frasco = { total: 60, base: 60, quedan: 4, inicio: 'x', pedida: null };
  r.sabanas.hechos = [];
  const a = C.avisosDeHoy(d, r, '2026-11-24', 10);
  assert.deepEqual(a.map((x) => x.texto), [
    'Quedan 4 cápsulas: manda a hacer la receta',
    'Al filtro de agua le faltan 4 días para el cambio',
    '7 cambios de sábanas sin marcar, desde el 7 oct',
    'Falta la cápsula de hoy',
    'Mañana toca cambiar sábanas: Emi',
  ]);
});

test('Respaldos de las apps antiguas', () => {
  const g = C.leerRespaldo('[{"id":"t1","bought":null,"open":"2026-10-01","close":null,"kg":45,"price":null},{"id":"t2","bought":"2026-11-02","open":null,"close":null,"kg":null,"price":25000}]');
  assert.equal(g.app, 'gas');
  assert.deepEqual(g.cambio.registros[1], { id: 't2', compra: '2026-11-02', apertura: null, cierre: null, kg: null, precio: 25000 });
  const a = C.leerRespaldo('{"app":"filtro-agua","version":1,"filtros":[{"id":"f1","date":"2026-09-02"}]}');
  assert.deepEqual(a.cambio, { tipo: 'reemplazar', ciclo: 'agua', registros: [{ id: 'f1', fecha: '2026-09-02' }] });
  const c = C.leerRespaldo('{"app":"cepillos","version":1,"registros":[{"id":"c1","b":"oficina","date":"2026-11-16"}]}');
  assert.deepEqual(c.cambio.registros, [{ id: 'c1', cepillo: 'oficina', fecha: '2026-11-16' }]);
  assert.equal(C.leerRespaldo('{"v":1,"cases":[{"id":"g1"}],"items":[]}').app, 'maletas');
  assert.ok(C.leerRespaldo('hola').error);
  assert.ok(C.leerRespaldo('{"otra":1}').error);
});
