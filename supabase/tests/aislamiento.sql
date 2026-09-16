-- ============================================================
-- Prueba de aislamiento · modulo Atlantic Dama
--
-- Verifica que las policies de 0006_acceso_por_modulo.sql hagan lo que
-- dicen: que un usuario SIN el modulo 'atlantic-dama' no vea ni toque el
-- inventario del buque, y que uno CON el modulo lo vea normalmente.
--
-- Esta es la prueba que convierte el trabajo de RLS en verificable en vez
-- de esperanzado. Sin ella, reescribir las policies de sesenta tablas es
-- rehacer el problema con otra forma.
--
-- COMO CORRERLA
--
--   psql "<CADENA_DE_STAGING>" -v ON_ERROR_STOP=1 -f supabase/tests/aislamiento.sql
--
-- Contra STAGING. Todo ocurre dentro de una transaccion que termina en
-- rollback, asi que no modifica nada, pero no hay motivo para correr
-- pruebas sobre la base que opera el buque.
--
-- Requisitos: que exista al menos un usuario con el modulo asignado en
-- public.user_roles y al menos uno sin el.
-- ============================================================

\set ON_ERROR_STOP on
\timing off

begin;

-- ------------------------------------------------------------
-- Preparacion
--
-- Todo lo que hay que leer con privilegios se lee ACA, antes de bajar a
-- rol authenticated, y se guarda en variables de sesion. Dentro de los
-- bloques DO se leen con current_setting, que sobrevive al cambio de rol.
-- (Las variables de psql no se interpolan dentro de bloques $$...$$, por
-- eso no se usan.)
-- ------------------------------------------------------------
select set_config('prueba.uid_con',
  coalesce((select ur.user_id::text
              from public.user_roles ur
             where 'atlantic-dama' = any(coalesce(ur.modulos, '{}'::text[]))
             limit 1), ''), true);

select set_config('prueba.uid_sin',
  coalesce((select u.id::text
              from auth.users u
              left join public.user_roles ur on ur.user_id = u.id
             where not ('atlantic-dama' = any(coalesce(ur.modulos, '{}'::text[])))
             limit 1), ''), true);

-- Total real de items, leido sin RLS de por medio. Sirve de referencia
-- para distinguir "la policy filtra bien" de "la tabla estaba vacia".
select set_config('prueba.total_items',
  (select count(*)::text from atlantic_dama.inventario_items), true);

do $$
begin
  if current_setting('prueba.uid_con') = '' then
    raise exception
      'No hay ningun usuario con el modulo atlantic-dama en user_roles. Asignarselo a alguien antes de correr la prueba.';
  end if;
  if current_setting('prueba.uid_sin') = '' then
    raise exception
      'No hay ningun usuario SIN el modulo atlantic-dama. Hace falta uno para probar que queda afuera.';
  end if;
  raise notice 'usuario CON modulo: %', current_setting('prueba.uid_con');
  raise notice 'usuario SIN modulo: %', current_setting('prueba.uid_sin');
  raise notice 'items en la tabla:  %', current_setting('prueba.total_items');
end $$;


-- ============================================================
-- CASO 1 · El usuario SIN el modulo no ve nada
-- ============================================================
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('prueba.uid_sin'),
                    'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare v_items int; v_mov int; v_ubic int;
begin
  select count(*) into v_items from atlantic_dama.inventario_items;
  select count(*) into v_mov   from atlantic_dama.inventario_movimientos;
  select count(*) into v_ubic  from atlantic_dama.ubicaciones;

  if v_items <> 0 or v_mov <> 0 or v_ubic <> 0 then
    raise exception
      'FALLA 1.1 · un usuario sin el modulo ve datos: % items, % movimientos, % ubicaciones',
      v_items, v_mov, v_ubic;
  end if;
  raise notice 'OK 1.1 · sin el modulo no ve items, movimientos ni ubicaciones';
end $$;

do $$
begin
  begin
    insert into atlantic_dama.inventario_items (categoria, nombre)
    values ('maquinas', 'PRUEBA - no deberia entrar');
    raise exception 'FALLA 1.2 · un usuario sin el modulo pudo insertar un item';
  exception
    when insufficient_privilege or check_violation then
      raise notice 'OK 1.2 · sin el modulo no puede insertar';
  end;
end $$;

reset role;


-- ============================================================
-- CASO 2 · El usuario CON el modulo trabaja normalmente
-- ============================================================
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('prueba.uid_con'),
                    'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare v_visible int; v_total int;
begin
  select count(*) into v_visible from atlantic_dama.inventario_items;
  v_total := current_setting('prueba.total_items')::int;

  if v_total > 0 and v_visible = 0 then
    raise exception
      'FALLA 2.1 · el usuario con el modulo no ve nada (hay % items); la policy quedo demasiado cerrada',
      v_total;
  end if;
  if v_visible <> v_total then
    raise exception
      'FALLA 2.1 · el usuario con el modulo ve % de % items; deberia verlos todos',
      v_visible, v_total;
  end if;
  raise notice 'OK 2.1 · con el modulo ve los % items', v_visible;
end $$;

reset role;


-- ============================================================
-- CASO 3 · El libro de movimientos sigue siendo de solo agregar
-- ============================================================
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('prueba.uid_con'),
                    'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  begin
    update atlantic_dama.inventario_movimientos set detalle = 'reescrito';
    raise exception 'FALLA 3.1 · se pudo modificar un movimiento; el libro dejo de ser inmutable';
  exception
    when insufficient_privilege then
      raise notice 'OK 3.1 · no se pueden editar movimientos';
  end;
end $$;

do $$
begin
  begin
    delete from atlantic_dama.inventario_movimientos;
    raise exception 'FALLA 3.2 · se pudieron borrar movimientos';
  exception
    when insufficient_privilege then
      raise notice 'OK 3.2 · no se pueden borrar movimientos';
  end;
end $$;

reset role;


-- ============================================================
-- CASO 4 · Ninguna policy del esquema quedo con expresion "true"
-- ============================================================
do $$
declare v_abiertas text;
begin
  select string_agg(c.relname || '.' || p.polname, ', ')
    into v_abiertas
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'atlantic_dama'
    and (pg_get_expr(p.polqual, p.polrelid) = 'true'
      or pg_get_expr(p.polwithcheck, p.polrelid) = 'true');

  if v_abiertas is not null then
    raise exception 'FALLA 4.1 · quedaron policies permisivas: %', v_abiertas;
  end if;
  raise notice 'OK 4.1 · ninguna policy del esquema usa "true"';
end $$;


-- ============================================================
-- CASO 5 · Las tablas nuevas no nacen abiertas
--
-- Es el control que evita que el problema reaparezca solo: sin esto,
-- la proxima tabla del esquema nace con permiso total para authenticated.
-- ============================================================
do $$
declare v_default text;
begin
  select string_agg(a.acl::text, ', ') into v_default
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral unnest(d.defaclacl) as a(acl)
  where n.nspname = 'atlantic_dama'
    and d.defaclobjtype = 'r'
    and a.acl::text like '%authenticated%';

  if v_default is not null then
    raise exception
      'FALLA 5.1 · las tablas nuevas siguen naciendo con permisos para authenticated: %', v_default;
  end if;
  raise notice 'OK 5.1 · las tablas nuevas nacen sin permisos para authenticated';
end $$;


\echo ''
\echo '  Todas las pruebas pasaron.'
\echo ''

rollback;
