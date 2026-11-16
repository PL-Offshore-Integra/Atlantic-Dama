-- Modulo DPR (Daily Progress Report / reporte diario del buque).
-- Reemplaza la planilla "AD-DAILY REPORT nnn-ddmmaa.xlsx" (hoja DR).
--
-- * dpr: un registro por reporte diario. La bitacora de guardias va en jsonb
--   (6 guardias fijas, cada una con su posicion y sus eventos con hora LT).
-- * dpr_personas: tripulacion y pasajeros, con fecha de embarque/desembarque.
--   El DPR lista quienes estaban a bordo en la fecha del reporte.
-- * dpr_consumo_diario: consumo de MGO y horas de motores por jornada. Lo
--   escribe cada DPR (jornada = fecha del DPR - 1, porque el reporte cubre las
--   24 h que terminan a las 0900 LT del dia del reporte) y alimenta la tabla
--   mensual 1-31 del reporte. Tambien admite jornadas cargadas a mano (historico
--   previo a la app).

create table atlantic_dama.dpr (
  id uuid primary key default gen_random_uuid(),
  numero int not null unique,
  fecha date not null unique,
  huso text not null default 'UTC-3',
  buque text not null default 'Atlantic Dama',
  operador text,
  fletador text,
  mother_vessel text,
  ubicacion text,
  pais text,
  lat text,
  lon text,
  pob int,
  pasajeros int,
  -- claves de operaciones y drills/eventos marcados con X
  operaciones text[] not null default '{}',
  drills text[] not null default '{}',
  eta_proximo text,
  -- [{ relevo, lat, lon, eventos: [{ hora, texto }] }] x 6 guardias
  guardias jsonb not null default '[]'::jsonb,
  velocidad_media numeric,
  distancia numeric,
  safety_cards text[] not null default '{}',
  -- condiciones 24:00 UTC
  tiempo text,
  estado_mar text,
  viento text,
  visibilidad text,
  mar_fondo text,
  -- ROB
  mgo_inicio numeric,
  mgo_consumo numeric,
  mgo_bunkered numeric,
  mgo_entregado numeric,
  mgo_carga_inicio numeric,
  mgo_carga_cargado numeric,
  mgo_carga_entregado numeric,
  aceite_l numeric,
  agua_dulce numeric,
  sludge_tk numeric,
  limite_critico numeric,
  -- a descargar en puerto
  descarga_sludge numeric,
  descarga_basura numeric,
  descarga_pesca numeric,
  -- horas de la jornada con 0 / 1 / 2 motores
  horas_0 numeric,
  horas_1 numeric,
  horas_2 numeric,
  usuario_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table atlantic_dama.dpr_personas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('tripulante', 'pasajero')),
  orden int not null default 0,
  cargo text,
  nombre text not null,
  apellido text,
  nacionalidad text,
  pasaporte text,
  pasaporte_vence date,
  fecha_nacimiento date,
  fecha_embarque date,
  fecha_desembarque date,
  created_at timestamptz not null default now()
);

create table atlantic_dama.dpr_consumo_diario (
  fecha date primary key,
  consumo numeric,
  horas_0 numeric not null default 0,
  horas_1 numeric not null default 0,
  horas_2 numeric not null default 0,
  dpr_id uuid references atlantic_dama.dpr(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index dpr_personas_tipo_idx on atlantic_dama.dpr_personas(tipo, orden);

alter table atlantic_dama.dpr enable row level security;
alter table atlantic_dama.dpr_personas enable row level security;
alter table atlantic_dama.dpr_consumo_diario enable row level security;

create policy "authenticated_all_dpr" on atlantic_dama.dpr
  for all to authenticated using (true) with check (true);
create policy "authenticated_all_dpr_personas" on atlantic_dama.dpr_personas
  for all to authenticated using (true) with check (true);
create policy "authenticated_all_dpr_consumo_diario" on atlantic_dama.dpr_consumo_diario
  for all to authenticated using (true) with check (true);

create trigger dpr_set_updated_at before update on atlantic_dama.dpr
  for each row execute function atlantic_dama.set_updated_at();

grant all on atlantic_dama.dpr, atlantic_dama.dpr_personas, atlantic_dama.dpr_consumo_diario
  to authenticated, service_role;

notify pgrst, 'reload schema';
