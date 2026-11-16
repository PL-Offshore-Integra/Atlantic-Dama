-- Proyecto de cada DPR. Los proyectos son los del modulo Comercial
-- (comercial.proyectos, ej. PRY-4-2026 "HOC / Flotel VMOS"); este modulo solo
-- los lee, a traves de una vista con los del buque.

create or replace view atlantic_dama.proyectos
with (security_invoker = true) as
select id, nro_proyecto, nombre, compania, estado, fecha_inicio_estimada, fecha_fin_estimada
from comercial.proyectos
where buque = 'Atlantic Dama';

grant select on atlantic_dama.proyectos to authenticated, service_role;

alter table atlantic_dama.dpr
  add column proyecto_id uuid references comercial.proyectos(id) on delete set null;
create index dpr_proyecto_idx on atlantic_dama.dpr(proyecto_id);

-- El DPR 106 (15/11/2026, fletador HOC Contratistas SA) es del proyecto PRY-4-2026.
update atlantic_dama.dpr d
set proyecto_id = p.id
from comercial.proyectos p
where d.numero = 106 and p.nro_proyecto = 'PRY-4-2026';

notify pgrst, 'reload schema';
