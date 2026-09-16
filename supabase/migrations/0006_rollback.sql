-- ============================================================
-- Rollback de 0006_acceso_por_modulo.sql
--
-- Deja el esquema como estaba antes: acceso total para cualquier usuario
-- autenticado. Correrlo SOLO si 0006 rompio produccion y hace falta
-- restablecer el servicio mientras se corrige.
--
-- Tener presente que esto reabre INT-01: vuelve a quedar todo el
-- inventario del buque accesible para cualquier cuenta del proyecto
-- Supabase compartido. Es una salida de emergencia, no un estado al que
-- convenga volver.
-- ============================================================

-- 1) Policies: volver a la unica permisiva
drop policy if exists "atlantic_dama_items_select" on atlantic_dama.inventario_items;
drop policy if exists "atlantic_dama_items_insert" on atlantic_dama.inventario_items;
drop policy if exists "atlantic_dama_items_update" on atlantic_dama.inventario_items;
drop policy if exists "atlantic_dama_items_delete" on atlantic_dama.inventario_items;
create policy "authenticated_all_inventario_items" on atlantic_dama.inventario_items
  for all to authenticated using (true) with check (true);

drop policy if exists "atlantic_dama_ubicaciones_select" on atlantic_dama.ubicaciones;
drop policy if exists "atlantic_dama_ubicaciones_insert" on atlantic_dama.ubicaciones;
drop policy if exists "atlantic_dama_ubicaciones_update" on atlantic_dama.ubicaciones;
create policy "authenticated_all_ubicaciones" on atlantic_dama.ubicaciones
  for all to authenticated using (true) with check (true);

drop policy if exists "atlantic_dama_motivos_select" on atlantic_dama.motivos_movimiento;
drop policy if exists "atlantic_dama_motivos_insert" on atlantic_dama.motivos_movimiento;
drop policy if exists "atlantic_dama_motivos_update" on atlantic_dama.motivos_movimiento;
create policy "authenticated_all_motivos_movimiento" on atlantic_dama.motivos_movimiento
  for all to authenticated using (true) with check (true);

drop policy if exists "atlantic_dama_movimientos_select" on atlantic_dama.inventario_movimientos;
drop policy if exists "atlantic_dama_movimientos_insert" on atlantic_dama.inventario_movimientos;
create policy "authenticated_select_inventario_movimientos" on atlantic_dama.inventario_movimientos
  for select to authenticated using (true);
create policy "authenticated_insert_inventario_movimientos" on atlantic_dama.inventario_movimientos
  for insert to authenticated with check (true);

-- 2) Permisos
grant all on all tables in schema atlantic_dama to authenticated, service_role;
alter default privileges in schema atlantic_dama
  grant all on tables to authenticated, service_role;

-- 3) Autoria forzada
drop trigger if exists inventario_movimientos_autoria on atlantic_dama.inventario_movimientos;
drop function if exists atlantic_dama.forzar_autoria();

-- 4) Trigger de stock: volver al comportamiento que trunca en silencio
create or replace function atlantic_dama.aplicar_movimiento_inventario()
returns trigger as $$
begin
  if new.tipo = 'alta' then
    update atlantic_dama.inventario_items
      set cantidad = cantidad + new.cantidad
      where id = new.item_id;
  else
    update atlantic_dama.inventario_items
      set cantidad = greatest(cantidad - new.cantidad, 0)
      where id = new.item_id;
  end if;
  return new;
end;
$$ language plpgsql;

-- La columna usuario_id y la funcion public.integra_tiene_modulo se dejan:
-- no molestan a nadie y las va a necesitar el proximo intento.

notify pgrst, 'reload schema';
