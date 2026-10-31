# Ecosistema de apps domésticas

Este repositorio es Panel Casa y, además, el centro del ecosistema: aquí viven el catálogo de apps,
la base común de diseño y las herramientas que la copian a cada app.

- `ecosistema.json`: catálogo. Cada app con su repositorio, rama publicada, URL, grupos, qué piezas
  comunes usa (capas), dónde guarda datos, excepciones y notas. Es la fuente de verdad: leerlo antes
  de cualquier cambio que toque más de una app, y actualizarlo cuando cambie algo de lo que registra.
- `base/`: diseño común. `tokens.css` (paleta, tipografía, radios, sombras), `elementos.css`
  (fondo, títulos, campos, icono) y `componentes.css` (encabezado, botones, tarjeta principal,
  listas, filtros, hojas, avisos).
- `herramientas/aplicar-base.py`: copia `base/` a las apps según el catálogo.
- `herramientas/revisar-apps.py`: fotografía las apps (claro y oscuro, tamaño iPhone) y compara
  antes y después de un cambio.
- `herramientas/conectar-apps.py`, `panel-casa.js`, `armar-lectores.py`: conexión con Panel Casa
  (ver README.md).

## Alcance de una instrucción

El usuario indica a qué apps aplica: «todas», un grupo del catálogo («las de cuentas», «las de la
casa») o apps concretas. «Todas» abarca las apps con `diseno` = `comun` o `comun-con-excepcion`.
Las de `diseno` = `propio` (Calendario, Mini Planilla) reciben cambios de comportamiento
(zoom, respaldo, actualización), no de diseño, salvo que se las nombre. Summer Kamp está fuera del
ecosistema y nunca recibe cambios comunes.

## Cómo está organizado el CSS de cada app

En el `index.html` de cada app, entre marcas, en este orden:

| Marca | Contenido | Dueño |
|---|---|---|
| `/*DS:TOKENS:START*/ … END` | `base/tokens.css` | base común |
| `/*DS:VARS:START*/ … END` | variables propias de la app, tomadas de las `--ds-*` | la app |
| `/*DS:BASE:START*/ … END` | `base/elementos.css` | base común |
| `/*DS:COMP:START*/ … END` | `base/componentes.css` (solo apps con `componentes: "comunes"`) | base común |
| `/*DS:APP:START*/ … END` | estilos propios, después de la base para poder ajustarla | la app |

Reglas:
- Nunca editar TOKENS, BASE ni COMP dentro de una app: la herramienta los sobrescribe. Se edita
  `base/` y se aplica.
- Lo que solo afecta a una app va en su VARS o APP.
- Las apps con `componentes: "propios"` tienen sus componentes dentro de APP. Pasarlas a los
  componentes comunes cambia su aspecto: se hace de a una, con capturas para que el usuario apruebe.

## Flujo de un cambio común

1. Clonar los repositorios del catálogo uno al lado del otro, cada uno en la rama de su campo
   `rama` (Sábanas y Mis créditos publican desde `gh-pages`).
2. `python3 herramientas/revisar-apps.py foto <carpeta> <antes>`
3. Editar `base/` y ejecutar `python3 herramientas/aplicar-base.py <carpeta> --revisar`, luego sin
   `--revisar`. Agregar `--subir-cache` cuando el cambio altera el aspecto, para que el iPhone
   descargue los archivos nuevos.
4. `python3 herramientas/revisar-apps.py foto <carpeta> <despues>` y
   `python3 herramientas/revisar-apps.py comparar <antes> <despues>`. Si el cambio no debía alterar
   el aspecto, la comparación debe salir vacía. Si debía, mostrar las capturas al usuario.
5. Publicar cada repositorio en su rama, con un mensaje en español que diga qué cambió.

## Convenciones

- Textos de las apps y mensajes de commit en español latino neutro.
- Diseño: ver el documento del sistema de diseño (paleta, tipografía, componentes, iconos y
  excepciones). Respetar las excepciones de cada app registradas en el catálogo.
- Apps de una sola página, sin dependencias externas ni Google Fonts (salvo Calendario).
- Despertador debe seguir funcionando en un iPhone 7 con iOS 15.8.
