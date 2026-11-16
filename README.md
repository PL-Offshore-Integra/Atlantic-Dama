# Atlantic Dama

Portal de gestion del buque Atlantic Dama, dentro de la organizacion PL Offshore.

Stack: Next.js (App Router) + TypeScript + Supabase (datos y Auth). Estetica
y layout tomados del sistema de marca "INTEGRA Brand Book v1.0" (IBM Plex
Sans/Mono, navy `#002247` para la instancia PL Offshore), mismo shell (barra
superior + sidebar) y misma pantalla de login que el resto de los modulos
PL Offshore.

- GitHub: https://github.com/PL-Offshore-Integra/Atlantic-Dama
- Supabase (proyecto compartido, esquema propio `atlantic_dama`):
  https://supabase.com/dashboard/project/mwrhonkvcyyueixbdrat
- Vercel: https://vercel.com/terracompras-projects

## Setup local

```bash
npm install
cp .env.local.example .env.local
# completar NEXT_PUBLIC_SUPABASE_ANON_KEY
# desde https://supabase.com/dashboard/project/mwrhonkvcyyueixbdrat/settings/api
npm run dev
```

## Base de datos

Las tablas de este buque viven en el esquema `atlantic_dama` (no en `public`),
para no chocar con tablas de otros modulos en el mismo proyecto Supabase
compartido (ej. `comercial`, `proveedores`).

1. Abrir el SQL Editor del proyecto Supabase.
2. Correr en orden `0001_init.sql`, `0002_inventario.sql`,
   `0003_seed_inventario_maquinas.sql` y `0004_seed_inventario_towing.sql`
   (los dos ultimos cargan los datos migrados desde los Excel de inventario
   y towing gear — se pueden omitir si se prefiere arrancar vacio).
3. En **Project Settings > API > Exposed schemas**, agregar `atlantic_dama`
   a la lista de esquemas expuestos (por defecto solo `public` esta
   expuesto), o el cliente de Supabase no va a poder leer/escribir estas
   tablas.

## Modulo de inventario

Tres categorias de items, en la misma tabla (`inventario_items.categoria`):
`maquinas` (herramientas y repuestos), `towing_gear` (elementos de
remolque, con WLL/MBL, fabricante y fecha de certificado) y `cubierta`
(pañol y elementos de cubierta: amarre, LSA, pintura, ferreteria y
consumibles). `cubierta` reutiliza el mismo layout simple que `maquinas`
(sin WLL/MBL ni certificado), con el campo de agrupacion rotulado como
"Grupo / Rubro". La `categoria` es texto libre en la base (sin CHECK), asi
que sumar la categoria no requiere migracion de esquema.

- **Ubicaciones** y **motivos de movimiento** son catalogos editables desde
  `/catalogos` (sin tocar la base a mano).
- La **cantidad** de un item nunca se edita directamente: se ajusta
  solamente a traves de "Reportar cambio de inventario" (alta o baja, con
  motivo y detalle libre), que queda registrado en
  `inventario_movimientos` y actualiza el stock por trigger. El resto de
  los campos del item (nombre, ubicacion, comentarios, etc.) se edita
  directo desde la ficha del item.
- Los datos migrados desde los Excel originales que no pudieron mapearse a
  una ubicacion limpia (texto combinado tipo "1 en SDM, 1 en Camarote JDM")
  quedan sin ubicacion asignada, con el texto original anotado en
  comentarios para revisar y corregir manualmente.

## Modulo DPR (Daily Progress Report)

Reemplaza la planilla `AD-DAILY REPORT nnn-ddmmaa.xlsx`. Migraciones `0006_dpr.sql`
(tablas), `0007_seed_dpr.sql` (datos del DPR 106), `0008_dpr_pestanas.sql`
(tripulacion por DPR, eventos EHSQ y shipment; elimina el padron `dpr_personas`)
y `0009_seed_ehsq.sql` (historico del registro EHSQ de la planilla).

- Cada DPR pertenece a un proyecto del modulo Comercial (`comercial.proyectos`
  del buque, leidos por la vista `atlantic_dama.proyectos`; migracion
  `0010_dpr_proyecto.sql`). El DPR nuevo hereda el proyecto del anterior y al
  elegir proyecto se completa el fletador. El listado tiene columna y filtro
  por proyecto.
- `/dpr` lista los reportes; `/dpr/nuevo` arranca precargado con el anterior
  (numero y fecha siguientes, contrato, MGO de inicio = cierre del dia previo y
  la misma tripulacion a bordo).
- El formulario tiene cinco pestañas que se guardan juntas: **Info general**
  (cabecera, operaciones, guardias, condiciones), **Info maquinas** (consumo,
  horas de motores, ROB), **Info HSE** (eventos EHSQ del dia, drills, safety
  cards, descargas), **Tripulacion** (lista de a bordo del dia; marca quien
  subio y quien bajo respecto del DPR anterior) y **Shipment**.
- `/dpr/{id}/imprimir` arma la hoja DR (A4 vertical, igual a la planilla) y las
  anexas: Crew and Pax List (con el cambio de tripulacion), EHSQ Events Record
  del mes y Shipment (si hay envios). El PDF sale con "Imprimir / PDF".
- Calculos: MGO end of day = start - consumo + bunkered - delivered (la planilla
  no restaba lo entregado); MGO de carga al cierre; aviso si las horas de motores
  no suman 24; dias de combustible = MGO al cierre / consumo promedio de las
  ultimas 7 jornadas; tabla mensual 1-31 desde `dpr_consumo_diario`. Un Toolbox o
  Safety meeting registrado en el dia marca su X en la hoja DR.
- Jornada: el DPR del dia D cubre las 24 h que terminan a las 0900 LT de D, asi
  que su consumo y horas de motores van al renglon D-1 de la tabla mensual (como
  en la planilla: el DPR 106 del 15/11 informa el dia 14).
- **Info RIB** (migracion `0011_dpr_rib.sql`): horas de uso, combustible
  utilizado y disponible del bote; sale en la hoja impresa junto a la tripulacion.
- `/dpr/dashboard`: resumen del dia (posicion, POB, MGO, motores, RIB,
  navegacion, cambios de tripulacion, HSE) y acumulado del proyecto (MGO total y
  diario, millas, RIB, eventos HSE, cambios de tripulacion, horas por motores,
  drills). Filtros por proyecto y por dia.
- `/dpr/importar`: carga masiva de planillas AD-DAILY REPORT (lector en
  `lib/dpr-excel.ts`, con exceljs). Vista previa antes de guardar; si el numero o
  la fecha de la planilla chocan con otro DPR y el nombre del archivo no, se usa
  el del nombre del archivo. Los DPR ya cargados se saltean salvo "Reemplazar".
  Si una planilla no trae eventos EHSQ de su fecha, no se borran los registrados.
- Los eventos EHSQ se guardan por fecha (`ehsq_eventos`), no por DPR: borrar un
  DPR no borra los eventos de ese dia.

## Usuarios (login)

No hay alta de usuarios publica: el acceso es por invitacion. Para crear el
primer usuario, en el dashboard de Supabase ir a **Authentication > Users >
Add user**, cargar email y contrasena, y compartirle esos datos a la
persona. Cualquier usuario de Supabase Auth del proyecto puede loguearse
(el aislamiento de datos lo da el esquema, no el login).

## Deploy

1. `git push` a `main` en GitHub.
2. En Vercel (team `terracompras-projects`), importar el repo
   `PL-Offshore-Integra/Atlantic-Dama`.
3. Configurar las mismas variables de entorno que en `.env.local` en el
   proyecto de Vercel.

## Estructura

- `app/login` — pantalla de acceso (Supabase Auth, email + contrasena).
- `app/(app)/layout.tsx` — exige sesion activa y arma el shell (barra
  superior + sidebar + encabezado de pantalla).
- `app/(app)/page.tsx` — pantalla de inicio, con accesos rapidos a los modulos.
- `app/(app)/inventario/maquinas`, `app/(app)/inventario/towing-gear` y
  `app/(app)/inventario/cubierta` — listado por ubicacion, alta/edicion de
  items y reporte de movimientos.
- `app/(app)/catalogos` — administracion de ubicaciones y motivos.
- `components/InventarioLista.tsx`, `InventarioItemForm.tsx`,
  `InventarioMovimientoForm.tsx` — UI compartida entre las dos categorias.
- `components/Shell.tsx` — navegacion y encabezado, estilo PL Offshore.
- `proxy.ts` — refresca la sesion de Supabase en cada request (antes
  `middleware.ts`; Next.js 16 renombro la convencion a "Proxy").
- `supabase/migrations` — esquema SQL.
