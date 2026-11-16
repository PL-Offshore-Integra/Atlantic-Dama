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

Reemplaza la planilla `AD-DAILY REPORT nnn-ddmmaa.xlsx` (hoja DR). Migraciones
`0006_dpr.sql` (tablas) y `0007_seed_dpr.sql` (tripulacion/pasajeros y consumo
01-13/11/2026 tomados del DPR 106).

- `/dpr` lista los reportes; `/dpr/nuevo` arranca precargado con el anterior
  (numero y fecha siguientes, contrato, MGO de inicio = cierre del dia previo,
  POB segun quienes estan a bordo).
- `/dpr/{id}/imprimir` arma la hoja DR en A4 vertical, igual a la planilla; el
  PDF sale con "Imprimir / PDF" -> "Guardar como PDF".
- `/dpr/tripulacion`: tripulacion y pasajeros con fecha de embarque/desembarque.
  Cada DPR lista a quienes estaban a bordo en su fecha.
- Calculos: MGO end of day = start - consumo + bunkered - delivered (la planilla
  no restaba lo entregado); MGO de carga al cierre; aviso si las horas de motores
  no suman 24; dias de combustible = MGO al cierre / consumo promedio de las
  ultimas 7 jornadas; tabla mensual 1-31 desde `dpr_consumo_diario`.
- Jornada: el DPR del dia D cubre las 24 h que terminan a las 0900 LT de D, asi
  que su consumo y horas de motores van al renglon D-1 de la tabla mensual (como
  en la planilla: el DPR 106 del 15/11 informa el dia 14).

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
