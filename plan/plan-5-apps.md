# Plan de las 5 apps domésticas

Decidido el 24 nov 2026: cinco apps (Finanzas, Casa, Noche, Consulta y Juegos), datos guardados en GitHub y web apps instaladas en la pantalla de inicio (no hay Mac, así que no hay app nativa). Se retiran Ronquidos (vive en Despertador), Prex y Suguru. El catálogo `ecosistema.json` registra estas decisiones en `decisiones`, `plan_5_apps` y `retiradas`.

Diseño: sistema «Domésticas 27» (vidrio estilo iOS 27, un acento por app). Reemplaza `base/` cuando se apruebe.

## Las 5 apps

| App | Repositorio | Reúne | Pestañas |
| --- | --- | --- | --- |
| Finanzas | pablocarvallo/finanzas (por crear) | FAN, Master, LiderBCI, Copec, Mis créditos (manual), Mesadas, Pagos del mes, Gastos médicos (manual) y el dashboard de ingresos y gastos | Resumen, Cuentas, Pagos, Más |
| Casa | pablocarvallo/casa | Panel Casa, Balón de gas, Mi cápsula, Filtro de agua, Cepillos, Sábanas, Maletas | Hoy, Ciclos, Maletas, Ajustes |
| Noche | pablocarvallo/despertador | Despertador con ronquidos | Sin pestañas |
| Consulta | pablocarvallo/consulta (por crear) | Indicadores, Lecturas, Cartelera, Calendario | Indicadores, Lecturas, Cartelera, Calendario |
| Juegos | pablocarvallo/royal-study | The Royal Study | Sin pestañas |

Noche y Juegos mantienen su repositorio y su URL: no hay que reinstalarlas. Noche debe seguir funcionando en el iPhone 7 con iOS 15.8.

Mini Planilla queda fuera de las cinco y funciona de manera independiente: no comparte datos ni se conecta con las demás apps.

Cada app nueva convive un mes con las antiguas que reemplaza; recién después se retiran.

## Cómo viajan los datos

```
Mail (avisos Banco de Chile, Copec Pay)
  → Atajos envía el aviso a la función /api/aviso (llave de Atajos: solo enviar avisos)
  → la función lo guarda como issue en pablocarvallo/datos (registro original)
  → la tarea de GitHub «leer-avisos» lo lee con el lector único, agrega el movimiento y cierra el issue
  → pablocarvallo/datos (JSON)
  → las apps leen y escriben a través de la función /api (llave del dispositivo)
  → la tarea «resumen» calcula resumen.json y envía las notificaciones push
```

El token de GitHub vive solo como secreto de la función y de las tareas. El iPhone guarda una llave por dispositivo que la función valida y que se puede revocar.

## Repositorio de datos: pablocarvallo/datos (privado)

| Archivo | Contenido |
| --- | --- |
| `cuentas.json` | Cuentas: id, nombre, tipo (débito, crédito, prepago), cupo o saldo inicial, reglas (puntos LiderBCI, Titular ****9908 y Adicional ****4526 de Master) |
| `movimientos/AAAA-MM.json` | Un archivo por mes: id, fecha, hora, cuenta, comercio, monto, tipo (compra, abono, cuota, devolución, aporte), categoría, origen (aviso o a mano), número del aviso |
| `pagos.json` | Plantilla de pagos del mes («A inicios de mes», «A mitad de mes») y estado por mes; un pago se marca solo si llega el cargo que coincide |
| `creditos.json` | Créditos de consumo y cuotas pagadas, ingresados a mano; hipotecario aparte, en UF |
| `gastos-medicos.json` | Gastos y reembolsos Cigna ingresados a mano; boletas en `boletas/` |
| `ciclos.json` | Gas, filtro, cepillos y cápsula: inicio, regla (días o consumo), umbrales de aviso e historial |
| `rutinas.json` | Sábanas (miércoles alternados desde el 7 oct 2026, Piti) |
| `maletas.json` | Maletas y objetos (los dibujos e imágenes quedan en `maletas/`) |
| `resumen.json` | Generado: saldos, avisos de «Hoy», últimos movimientos. Lo leen los widgets y Casa |
| `salud.json` | Generado: último aviso recibido por fuente, para alertar si una fuente se calla 48 horas |
| `dispositivos.json` | Huellas (hash) de las llaves de cada dispositivo, Atajos y widgets, con permisos y fecha |
| `suscripciones.json` | Suscripciones de notificaciones push de cada app instalada |

Los cierres de periodo (LiderBCI, extracto de Master) archivan; nunca borran movimientos.

## Función en Vercel: pablocarvallo/api (por crear)

Repositorio aparte del de datos, para que cada escritura de datos no publique la función de nuevo. Secretos en Vercel: `GITHUB_TOKEN` (token de grano fino solo para pablocarvallo/datos, permisos Contents e Issues) y `VAPID_PUBLIC` / `VAPID_PRIVATE`.

| Ruta | Uso | Llave |
| --- | --- | --- |
| `POST /api/aviso` | Atajos entrega el correo de aviso | Atajos (solo esta ruta) |
| `GET /api/datos/<archivo>` | Leer un archivo de datos | Dispositivo |
| `POST /api/datos/<archivo>` | Escribir con control de versión (sha) para no pisar cambios | Dispositivo |
| `GET /api/resumen` | Resumen para widgets | Widget (solo lectura) |
| `POST /api/push` | Registrar o quitar una suscripción de notificaciones | Dispositivo |
| `POST /api/emparejar` | Canjea un código de un solo uso por una llave de dispositivo | Código |

## Tareas de GitHub en pablocarvallo/datos

- `leer-avisos.yml`: al abrirse un issue; lector único con pruebas sobre correos reales anonimizados.
- `resumen.yml`: cada mañana y cada tarde; recalcula `resumen.json` y `salud.json` y envía notificaciones push (cápsula 12, 10 y 5; filtro y cepillos a 14 y 7 días; gas sin reserva; pagos a inicio y mitad de mes; fuente sin avisos 48 horas).
- `respaldo.yml`: semanal; copia comprimida de todo el repositorio como artefacto descargable.

## Orden de trabajo

1. **Fase 0 (ahora)**: rotar y limitar el token actual; borrar el repositorio ronquidos; catálogo al día (hecho el 24 nov); respaldo en Cápsula y Sábanas; reparar los avisos de Master.
2. **Fase 1**: crear `datos` y `api`; lector único con pruebas; migrar los datos actuales de cada app con su respaldo en texto; salud del buzón.
3. **Fase 2**: Casa primero (sin datos bancarios, menor riesgo), luego Finanzas, luego Consulta; cada una convive un mes con las apps que reemplaza antes de retirarlas. Notificaciones push y widgets de solo lectura.
4. **Fase 3**: base compartida con módulos, pruebas, versión visible y registro de cambios.

## Lo que debe hacer Pablo

- [ ] Revocar el token actual y crear uno de grano fino limitado a fan-avisos y copec-avisos, permiso Issues (lectura y escritura), con vencimiento a 90 días. Pegarlo en las apps y widgets hasta la fase 1.
- [ ] Borrar el repositorio pablocarvallo/ronquidos (Settings → Danger Zone). No borrar pablocarvallo/ronquidos-datos.
- [ ] Borrar los repositorios de Prex y Suguru si existen, y quitar sus iconos del iPhone (los datos guardados en Prex se pierden al quitar el icono).
- [ ] Crear los repositorios pablocarvallo/datos (privado), pablocarvallo/api, pablocarvallo/finanzas y pablocarvallo/consulta.
- [ ] Crear el proyecto de Vercel para pablocarvallo/api.
