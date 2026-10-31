# Panel Casa

Portada de las apps de la casa: en una sola pantalla, lo que hay que atender hoy, las cuatro cuentas y la lista de la casa.

Es un panel de lectura. No guarda datos propios: muestra lo que cada app publica en el buzón privado de GitHub.

## Qué muestra

- **Hoy**: lo que hay que atender, de lo más urgente a lo menos. Por ejemplo, cápsulas por debajo de 12 sin receta pedida, pagos pendientes, el balón de gas cerca de su promedio (y si hay reserva), la cápsula del día sin tomar o el cambio de sábanas de hoy o mañana.
- **Cuentas**: el saldo de FAN, el total a pagar de Master este mes, el total del periodo de LiderBCI (con sus puntos) y el saldo de Copec Pay, cada una con su último movimiento. Se calculan igual que en los widgets: lo que publicó la app más los avisos que llegaron al buzón después, aunque no se haya abierto la app. Al tocar una cuenta se ven sus tres últimos movimientos.
- **La casa**:
  - **Pagos del mes**: cuántos van hechos y cuáles faltan. Avisa si la lista sigue con el título de un mes que ya pasó.
  - **Balón de gas**: días del balón en uso, fecha estimada de cambio según el promedio y si hay reserva.
  - **Mi cápsula diaria**: cuántas quedan, hasta qué día alcanzan, si la de hoy ya se tomó y si la receta está pedida.
  - **Sábanas**: el próximo miércoles y a quién le toca (el 7 de octubre de 2026 le tocó a Piti, y desde ahí se alternan). Con la app Sábanas conectada, además sabe si el cambio ya se hizo y avisa si uno quedó atrasado.
  - **Mesadas**: lo entregado en el mes a Piti y a Emi, con el total acumulado y los últimos aportes.
- **Sin conexión**: si no se puede leer el buzón, muestra lo último que se leyó.

## Conectar

1. **Cuentas**: en FAN toca «Copiar el script del widget» y pégalo en Panel Casa → Conexiones. FAN, Master y LiderBCI comparten el buzón, así que con el de FAN quedan las tres. Copec tiene su propio buzón: repite el paso con el script del widget de Copec.
2. **Apps de la casa**: en Conexiones toca «Copiar código para las apps». Luego, en Pagos del mes, Balón de gas, Mi cápsula diaria, Mesadas y Sábanas, baja hasta «Panel Casa» y toca «Pegar código». Desde ese momento, cada cambio en esas apps se publica en el buzón (en un hito con el nombre de la app, por ejemplo «Gas · panel») y el panel lo muestra.

Los tokens quedan guardados solo en el iPhone. «Quitar conexiones» los borra.

## Instalar en el iPhone

1. La app se publica con GitHub Pages en `https://pablocarvallo.github.io/casa/`.
2. Abre esa dirección en **Safari** en el iPhone.
3. Toca **Compartir → Agregar a inicio**.

## Para mantenerla

- Los lectores de las cuentas son los mismos del panel de widgets de Copec (`copec/widget/panel-widget.js`). Si cambia un lector en Copec, FAN o Master, se copian de nuevo con:

  ```
  python3 herramientas/armar-lectores.py ../copec/widget/panel-widget.js
  ```

- El diseño sigue la base común de las apps domésticas (marcas `DS:TOKENS`, `DS:VARS`, `DS:BASE` y `DS:APP` en `index.html`).
- Lo que publica cada app de la casa (descripción del hito, en JSON):
  - `Pagos · panel`: `{ app: "pagos", v, at, title, s: [{ n: sección, i: [{ t: pago, d: 1 si está hecho, a: fecha }] }] }`
  - `Gas · panel`: `{ app: "gas", v, at, open: fecha de apertura, avg: días promedio, kg, res: balones de reserva }`
  - `Cápsula · panel`: `{ app: "capsula", v, at, left, total, last: fecha de la última toma, ordered: fecha en que se pidió la receta }`
  - `Mesadas · panel`: `{ app: "mesadas", v, at, tot: { piti, emi }, mes: { ym, piti, emi }, ult: [{ w, m, s, d }] }`
  - `Sábanas · panel`: `{ app: "sabanas", v, at, hechos: [los últimos miércoles marcados], pend: el primer miércoles sin marcar }`

## Base común de las apps

Este repositorio también guarda el catálogo de las apps (`ecosistema.json`), la base común de diseño (`base/`) y las herramientas que la copian a cada app (`herramientas/aplicar-base.py`) y revisan su aspecto (`herramientas/revisar-apps.py`). El detalle está en `CLAUDE.md`.
