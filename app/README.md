# Casa

App de la casa del plan de 5 apps (plan/plan-5-apps.md): reúne Balón de gas, Filtro de agua, Cepillos, Mi cápsula
diaria, Sábanas y Maletas. Publicada en **https://pablocarvallo.github.io/casa/app/**. Convive un mes con las apps
antiguas (desde el 24 nov 2026); Panel Casa sigue en `https://pablocarvallo.github.io/casa/`.

## Pestañas

- **Hoy**: lo que hay que atender, de lo más urgente a lo menos, con botones para marcar la cápsula de hoy y las
  sábanas; los cuatro ciclos con su anillo de avance; sábanas y maletas.
- **Ciclos**: detalle de gas, filtro, cepillos, cápsula y sábanas, con su historial y sus acciones.
- **Maletas**: la app Maletas (`/maletas/`) dentro de Casa, con su estilo ilustrado. Sus datos quedan en el iPhone,
  como hoy; todavía no se guardan en GitHub.
- **Ajustes**: conexión con GitHub, traer los respaldos de las apps antiguas, skin (Vidrio o Tinta electrónica), tema y
  vidrio, respaldo.

El botón **+** abre los registros rápidos (cápsula, abrir o comprar balón, filtro, cepillo, sábanas, frasco nuevo).

## Datos

Gas, filtro, cepillos y cápsula van en `ciclos.json`, y sábanas en `rutinas.json`, en el repositorio privado
pablocarvallo/datos. La app los lee y guarda a través de domesticas-api (`/api/datos`) con la llave de cada iPhone.

- Cada registro es un cambio (`calculos.js` → `aplicar`). Se aplica al tiro en pantalla y queda en una cola en el
  iPhone hasta que se guarda en GitHub. Si otro dispositivo guardó antes (409), la app vuelve a leer el archivo y
  aplica de nuevo los cambios pendientes. Los últimos ids aplicados quedan en `ultimos_cambios` del archivo para no
  aplicar dos veces el mismo.
- Sin conexión, los cambios esperan en el iPhone y se guardan al volver la señal.
- Sin llave, la app funciona igual, pero solo en el iPhone; al conectarla, la cola se guarda sobre lo que haya en GitHub.

## Conectar un iPhone

1. En pablocarvallo/datos: **Actions → Llaves → Run workflow**, acción `crear`, tipo `dispositivo` y un nombre.
2. El código de 8 caracteres aparece en el resumen de la ejecución y vale 15 minutos.
3. En Casa → Ajustes → Conexión, escribir el código y tocar «Conectar este iPhone».

## Traer los datos de las apps antiguas

En Balón de gas, Filtro de agua, Cepillos o Maletas: **Respaldo de datos → Copiar respaldo**, y pegarlo en
Casa → Ajustes → Traer datos. Reemplaza lo de esa app en Casa. Mi cápsula diaria no tiene respaldo: en Ciclos →
Cápsula se registra el frasco con las cápsulas que quedan. En Sábanas, los miércoles pasados sin marcar se marcan
todos de una vez.

## Reglas

Las de las apps antiguas, para que los números coincidan (`pruebas/calculos.test.js` compara Cepillos contra el código
original):

- Gas: días desde la apertura contra el promedio de los balones cerrados; aviso con 3 días o menos.
- Filtro: 3 meses calendario; avisos a 14 y 7 días.
- Cepillos: 3 lavados al día (7, 13 y 21 h); lunes, martes y jueves el del mediodía es de la oficina; cambio a los
  180 lavados o a 70 días (casa) o 365 (oficina), lo primero.
- Cápsula: una al día; avisos a 12 y 10 sin receta pedida, crítico a 5.
- Sábanas: cada miércoles, Piti y Emi alternados desde el 7 oct 2026.

## Mantener

- Diseño: Domésticas 27, en `diseno27/` del repositorio. Se copia dentro de `index.html` con
  `python3 herramientas/aplicar-diseno27.py`; lo propio de la app va entre `/*APP:START*/` y `/*APP:END*/`.
- Pruebas: `TZ=America/Santiago node --test app/pruebas/*.test.js`.
- Al publicar un cambio, subir `VERSION` en `calculos.js` (y `CACHE` en `sw.js`). Al abrir o volver a Casa, la app
  compara su versión con la publicada y se recarga sola una vez: no hay que reinstalarla. Borrar el icono del iPhone
  borra la llave y las maletas guardadas en él; los demás datos siguen en GitHub.
