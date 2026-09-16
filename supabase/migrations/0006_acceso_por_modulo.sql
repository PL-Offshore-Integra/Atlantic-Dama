-- ============================================================
-- 0006 · Acceso por modulo (piloto de aislamiento)
--
-- Hasta ahora toda tabla de este esquema llevaba:
--
--     for all to authenticated using (true) with check (true)
--
-- Eso significa que cualquier cuenta con sesion iniciada en el proyecto
-- Supabase compartido —de cualquier empresa del grupo, de cualquier
-- modulo— podia leer, modificar y borrar el inventario de este buque.
-- El control de acceso por modulo existia solo en el frontend, donde
-- decide que tarjetas se dibujan: quien consultaba la API directamente
-- no encontraba ninguna barrera. Hallazgos INT-01 e INT-07 de la
-- auditoria del 16.09.2026.
--
-- Esta migracion mueve ese control a la base. A partir de aca, ver el
-- inventario de Atlantic Dama exige tener el modulo 'atlantic-dama'
-- asignado en public.user_roles, que es la misma tabla que el portal
-- ya usa para decidir que mostrar.
--
-- Atlantic Dama es el piloto: esquema propio, cuatro tablas, poco uso.
-- Lo que se valide aca se replica al resto de los modulos.
--
-- ------------------------------------------------------------
-- ANTES DE CORRER ESTO
--
-- 1) Correrlo primero en un proyecto de staging, nunca directo en
--    produccion. El plan Free permite dos proyectos y hoy se usa uno.
--
-- 2) Este cambio falla cerrado: quien no tenga el modulo asignado deja
--    de ver el inventario. Hoy el sistema falla abierto, asi que puede
--    haber gente usandolo sin fila en user_roles. Verificar primero
--    quien quedaria afuera:
--
--      select u.email,
--             ur.modulos,
--             'atlantic-dama' = any(coalesce(ur.modulos, '{}')) as conserva_acceso
--      from auth.users u
--      left join public.user_roles ur on ur.user_id = u.id
--      order by conserva_acceso, u.email;
--
--    Si alguien que deberia tener acceso aparece en false, corregir su
--    fila en user_roles ANTES de aplicar esta migracion.
--
-- 3) Para volver atras: 0006_rollback.sql
-- ============================================================


-- ------------------------------------------------------------
-- 1) Quien tiene un modulo
--
-- security definer porque user_roles no es legible por el usuario
-- comun una vez que se cierre su RLS (trabajo aparte, INT-04).
-- search_path fijo para que nadie pueda interponer un esquema propio
-- y hacer que la funcion lea otra tabla.
--
-- stable, no volatile: Postgres puede cachear el resultado dentro de
-- la misma consulta en vez de evaluarlo fila por fila. En una tabla
-- de miles de items la diferencia es grande.
-- ------------------------------------------------------------
create or replace function public.integra_tiene_modulo(p_modulo text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and p_modulo = any (coalesce(ur.modulos, '{}'::text[]))
  );
$$;

comment on function public.integra_tiene_modulo(text) is
  'Devuelve true si el usuario de la sesion tiene asignado el modulo indicado en public.user_roles. Usada por las policies de RLS.';

-- Que nadie mas que un usuario con sesion pueda invocarla.
revoke all on function public.integra_tiene_modulo(text) from public, anon;
grant execute on function public.integra_tiene_modulo(text) to authenticated;


-- ------------------------------------------------------------
-- 2) Policies
--
-- Se reemplaza el "for all" por una policy por operacion. No es
-- cosmetico: con "for all" no se puede permitir leer sin permitir
-- borrar, y es justamente la distincion que hace falta.
-- ------------------------------------------------------------

-- --- inventario_items ---
drop policy if exists "authenticated_all_inventario_items" on atlantic_dama.inventario_items;

create policy "atlantic_dama_items_select" on atlantic_dama.inventario_items
  for select to authenticated
  using (public.integra_tiene_modulo('atlantic-dama'));

create policy "atlantic_dama_items_insert" on atlantic_dama.inventario_items
  for insert to authenticated
  with check (public.integra_tiene_modulo('atlantic-dama'));

create policy "atlantic_dama_items_update" on atlantic_dama.inventario_items
  for update to authenticated
  using (public.integra_tiene_modulo('atlantic-dama'))
  with check (public.integra_tiene_modulo('atlantic-dama'));

create policy "atlantic_dama_items_delete" on atlantic_dama.inventario_items
  for delete to authenticated
  using (public.integra_tiene_modulo('atlantic-dama'));


-- --- ubicaciones ---
drop policy if exists "authenticated_all_ubicaciones" on atlantic_dama.ubicaciones;

create policy "atlantic_dama_ubicaciones_select" on atlantic_dama.ubicaciones
  for select to authenticated
  using (public.integra_tiene_modulo('atlantic-dama'));

create policy "atlantic_dama_ubicaciones_insert" on atlantic_dama.ubicaciones
  for insert to authenticated
  with check (public.integra_tiene_modulo('atlantic-dama'));

create policy "atlantic_dama_ubicaciones_update" on atlantic_dama.ubicaciones
  for update to authenticated
  using (public.integra_tiene_modulo('atlantic-dama'))
  with check (public.integra_tiene_modulo('atlantic-dama'));

-- Sin policy de delete: una ubicacion se desactiva con el campo "activo",
-- no se borra. Borrarla pondria en null la ubicacion de items historicos.


-- --- motivos_movimiento ---
drop policy if exists "authenticated_all_motivos_movimiento" on atlantic_dama.motivos_movimiento;

create policy "atlantic_dama_motivos_select" on atlantic_dama.motivos_movimiento
  for select to authenticated
  using (public.integra_tiene_modulo('atlantic-dama'));

create policy "atlantic_dama_motivos_insert" on atlantic_dama.motivos_movimiento
  for insert to authenticated
  with check (public.integra_tiene_modulo('atlantic-dama'));

create policy "atlantic_dama_motivos_update" on atlantic_dama.motivos_movimiento
  for update to authenticated
  using (public.integra_tiene_modulo('atlantic-dama'))
  with check (public.integra_tiene_modulo('atlantic-dama'));

-- Sin delete, por el mismo motivo que ubicaciones.


-- --- inventario_movimientos ---
-- Sigue siendo un libro de solo agregar: select e insert, nunca update
-- ni delete. Ese criterio ya estaba bien y se conserva tal cual.
drop policy if exists "authenticated_select_inventario_movimientos" on atlantic_dama.inventario_movimientos;
drop policy if exists "authenticated_insert_inventario_movimientos" on atlantic_dama.inventario_movimientos;

create policy "atlantic_dama_movimientos_select" on atlantic_dama.inventario_movimientos
  for select to authenticated
  using (public.integra_tiene_modulo('atlantic-dama'));

create policy "atlantic_dama_movimientos_insert" on atlantic_dama.inventario_movimientos
  for insert to authenticated
  with check (public.integra_tiene_modulo('atlantic-dama'));


-- ------------------------------------------------------------
-- 3) Permisos de Postgres
--
-- Las policies filtran, pero el grant es la puerta: sin el, RLS ni
-- siquiera se evalua. 0005_grants.sql habia dado "grant all", que
-- incluye TRUNCATE y REFERENCES ademas de lo que la app necesita.
-- Se baja a lo minimo.
-- ------------------------------------------------------------
revoke all on all tables in schema atlantic_dama from authenticated;

grant select, insert, update, delete
  on atlantic_dama.inventario_items
  to authenticated;

grant select, insert, update
  on atlantic_dama.ubicaciones, atlantic_dama.motivos_movimiento
  to authenticated;

grant select, insert
  on atlantic_dama.inventario_movimientos
  to authenticated;

-- Esto es lo importante de esta seccion: sin revocarlo, toda tabla que
-- se cree de aca en adelante en este esquema vuelve a nacer con permiso
-- total para authenticated, y el problema reaparece una migracion mas
-- tarde sin que nadie lo note.
alter default privileges in schema atlantic_dama
  revoke all on tables from authenticated;


-- ------------------------------------------------------------
-- 4) Autoria real de los movimientos
--
-- usuario_email lo mandaba el cliente. Cualquiera con acceso a la API
-- podia firmar un movimiento con el correo de otra persona, asi que el
-- libro era inmutable pero su firma no valia nada (INT-03).
--
-- Ahora la autoria la pone la base desde auth.uid(). Lo que mande el
-- cliente en esos campos se descarta.
-- ------------------------------------------------------------
alter table atlantic_dama.inventario_movimientos
  add column if not exists usuario_id uuid references auth.users(id);

comment on column atlantic_dama.inventario_movimientos.usuario_email is
  'Historico. Para movimientos anteriores al 16.09.2026 lo cargaba el cliente y no es confiable. Usar usuario_id.';

create or replace function atlantic_dama.forzar_autoria()
returns trigger
language plpgsql
security definer
set search_path = atlantic_dama, public, pg_catalog
as $$
begin
  new.usuario_id := auth.uid();
  new.usuario_email := (select u.email from auth.users u where u.id = auth.uid());
  return new;
end;
$$;

drop trigger if exists inventario_movimientos_autoria on atlantic_dama.inventario_movimientos;
create trigger inventario_movimientos_autoria
  before insert on atlantic_dama.inventario_movimientos
  for each row execute function atlantic_dama.forzar_autoria();


-- ------------------------------------------------------------
-- 5) Una baja mayor al stock deja de descartarse en silencio
--
-- El trigger anterior hacia greatest(cantidad - x, 0): dar de baja 10
-- unidades de un item que tiene 3 dejaba el stock en 0 y registraba un
-- movimiento de 10. El libro y el saldo quedaban descuadrados para
-- siempre, sin error y sin rastro (INT-15).
--
-- En un inventario de equipos de remolque con WLL y MBL certificados,
-- un saldo que no refleja lo que hay a bordo tiene consecuencias
-- operativas, no contables.
--
-- El "for update" toma el lock de la fila antes de leerla, para que dos
-- bajas simultaneas no lean el mismo saldo y pasen ambas.
-- ------------------------------------------------------------
create or replace function atlantic_dama.aplicar_movimiento_inventario()
returns trigger
language plpgsql
as $$
declare
  v_actual numeric;
  v_nombre text;
begin
  select cantidad, nombre into v_actual, v_nombre
  from atlantic_dama.inventario_items
  where id = new.item_id
  for update;

  if not found then
    raise exception 'El item % no existe', new.item_id;
  end if;

  if new.tipo = 'alta' then
    update atlantic_dama.inventario_items
      set cantidad = cantidad + new.cantidad
      where id = new.item_id;
  else
    if v_actual < new.cantidad then
      raise exception
        'No se puede dar de baja % unidades de "%": hay % en stock',
        new.cantidad, v_nombre, v_actual
        using hint = 'Revisar la cantidad, o registrar primero un ajuste de inventario.';
    end if;

    update atlantic_dama.inventario_items
      set cantidad = cantidad - new.cantidad
      where id = new.item_id;
  end if;

  return new;
end;
$$;


-- ------------------------------------------------------------
-- 6) Verificacion
--
-- Correr despues de aplicar. Las cuatro tablas tienen que aparecer con
-- rls_activa = true y con policies > 0, y ninguna debe seguir teniendo
-- una policy con la expresion "true".
-- ------------------------------------------------------------
select
  c.relname                                              as tabla,
  c.relrowsecurity                                       as rls_activa,
  count(p.polname)                                       as policies,
  bool_or(pg_get_expr(p.polqual, p.polrelid) = 'true')   as alguna_permisiva
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'atlantic_dama' and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relname;
