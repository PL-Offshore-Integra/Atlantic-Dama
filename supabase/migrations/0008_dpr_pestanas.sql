-- DPR en pestañas: la tripulacion se reporta dia a dia (lista propia de cada
-- DPR, en lugar del padron unico dpr_personas), registro de eventos EHSQ
-- (hoja "AD - EHSQ Event") y shipment (hoja "Shipment").

-- Tripulacion y pasajeros a bordo, por DPR. El DPR nuevo arranca con la lista
-- del anterior; la diferencia entre ambas dice quien subio y quien bajo.
create table atlantic_dama.dpr_tripulacion (
  id uuid primary key default gen_random_uuid(),
  dpr_id uuid not null references atlantic_dama.dpr(id) on delete cascade,
  tipo text not null check (tipo in ('tripulante', 'pasajero')),
  orden int not null default 0,
  cargo text,
  nombre text not null,
  apellido text,
  nacionalidad text,
  pasaporte text,
  pasaporte_vence date,
  fecha_nacimiento date,
  fecha_embarque date
);
create index dpr_tripulacion_dpr_idx on atlantic_dama.dpr_tripulacion(dpr_id, tipo, orden);

-- La lista del DPR 106 sale del padron cargado en 0007, que deja de usarse.
insert into atlantic_dama.dpr_tripulacion
  (dpr_id, tipo, orden, cargo, nombre, apellido, nacionalidad, pasaporte, pasaporte_vence,
   fecha_nacimiento, fecha_embarque)
select d.id, p.tipo, p.orden, p.cargo, p.nombre, p.apellido, p.nacionalidad, p.pasaporte,
       p.pasaporte_vence, p.fecha_nacimiento, p.fecha_embarque
from atlantic_dama.dpr_personas p
cross join atlantic_dama.dpr d
where d.numero = 106;

drop table atlantic_dama.dpr_personas;

-- Registro de eventos EHSQ (toolbox, safety meeting, inspecciones...). Se carga
-- desde la pestaña HSE de cada DPR (fecha = fecha del DPR); conserva tambien el
-- historico de la planilla, que no tiene DPR asociado.
create table atlantic_dama.ehsq_eventos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  tipo text not null,
  tarea text,
  personas int,
  lugar text,
  hora_inicio text,
  hora_fin text,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
create index ehsq_eventos_fecha_idx on atlantic_dama.ehsq_eventos(fecha, orden);

-- Shipment (B/L o AWB, orden de compra, bultos, peso, comentario del agente).
create table atlantic_dama.dpr_shipment (
  id uuid primary key default gen_random_uuid(),
  dpr_id uuid not null references atlantic_dama.dpr(id) on delete cascade,
  orden int not null default 0,
  bl_awb text,
  po text,
  bultos text,
  peso text,
  comentario text
);
create index dpr_shipment_dpr_idx on atlantic_dama.dpr_shipment(dpr_id, orden);

alter table atlantic_dama.dpr_tripulacion enable row level security;
alter table atlantic_dama.ehsq_eventos enable row level security;
alter table atlantic_dama.dpr_shipment enable row level security;

create policy "authenticated_all_dpr_tripulacion" on atlantic_dama.dpr_tripulacion
  for all to authenticated using (true) with check (true);
create policy "authenticated_all_ehsq_eventos" on atlantic_dama.ehsq_eventos
  for all to authenticated using (true) with check (true);
create policy "authenticated_all_dpr_shipment" on atlantic_dama.dpr_shipment
  for all to authenticated using (true) with check (true);

grant all on atlantic_dama.dpr_tripulacion, atlantic_dama.ehsq_eventos, atlantic_dama.dpr_shipment
  to authenticated, service_role;

notify pgrst, 'reload schema';
