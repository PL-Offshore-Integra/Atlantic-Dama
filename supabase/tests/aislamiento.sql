-- ============================================================
-- Prueba de aislamiento · modulo Atlantic Dama
--
-- VERIFICADA el 16.09.2026 contra el proyecto de staging
-- (zgvbpzquejzdjppsxkly). Los 8 bloques pasaron.
--
-- Cada bloque lanza una excepcion si el aislamiento no se cumple, asi
-- que si el archivo corre entero sin error, paso. No usa comandos de
-- psql: se puede aplicar con `supabase db push` o pegar en el SQL
-- Editor.
--
-- Requiere los datos de prueba: dos usuarios, uno con el modulo
-- 'atlantic-dama' y otro sin el, y tres items de inventario. Ver
-- supabase/tests/datos_de_prueba.sql
--
-- CONTRA STAGING. Crea y deja registros de prueba.
-- ============================================================

-- ------------------------------------------------------------
-- 1 · El usuario ajeno deja de ver el inventario del buque
-- ------------------------------------------------------------
reset role;

do $$
declare v_items int; v_mov int; v_ubic int;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub','a0000000-0000-4000-8000-000000000002','role','authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_items from atlantic_dama.inventario_items;
  select count(*) into v_mov   from atlantic_dama.inventario_movimientos;
  select count(*) into v_ubic  from atlantic_dama.ubicaciones;

  reset role;

  if v_items <> 0 or v_mov <> 0 or v_ubic <> 0 then
    raise exception
      'FALLA 1 · el usuario ajeno sigue viendo datos: % items, % movimientos, % ubicaciones',
      v_items, v_mov, v_ubic;
  end if;
  raise notice 'OK 1 · el usuario ajeno ya no ve nada del buque';
end $$;


-- ------------------------------------------------------------
-- 2 · Tampoco puede escribir
-- ------------------------------------------------------------
reset role;

do $$
declare v_entro boolean := false;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub','a0000000-0000-4000-8000-000000000002','role','authenticated')::text, true);
  set local role authenticated;

  begin
    insert into atlantic_dama.inventario_items (categoria, nombre)
    values ('maquinas', 'NO DEBERIA ENTRAR');
    v_entro := true;
  exception when others then
    null;
  end;

  reset role;

  if v_entro then
    raise exception 'FALLA 2 · el usuario ajeno pudo insertar un item';
  end if;
  raise notice 'OK 2 · el usuario ajeno no puede escribir';
end $$;


-- ------------------------------------------------------------
-- 3 · El tripulante sigue trabajando normalmente
--
-- Tan importante como cerrar el acceso ajeno: si el arreglo tambien
-- dejara afuera a quien si tiene el modulo, no serviria.
-- ------------------------------------------------------------
reset role;

do $$
declare v_items int;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub','a0000000-0000-4000-8000-000000000001','role','authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_items from atlantic_dama.inventario_items;

  reset role;

  if v_items <> 3 then
    raise exception
      'FALLA 3 · el tripulante ve % items y deberia ver los 3', v_items;
  end if;
  raise notice 'OK 3 · el tripulante sigue viendo los 3 items';
end $$;


-- ------------------------------------------------------------
-- 4 · El libro de movimientos sigue siendo de solo agregar
-- ------------------------------------------------------------
reset role;

do $$
declare v_pudo boolean := false;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub','a0000000-0000-4000-8000-000000000001','role','authenticated')::text, true);
  set local role authenticated;

  begin
    update atlantic_dama.inventario_movimientos set detalle = 'reescrito';
    v_pudo := true;
  exception when others then null;
  end;

  reset role;

  if v_pudo then
    raise exception 'FALLA 4 · se pudo editar un movimiento; el libro dejo de ser inmutable';
  end if;
  raise notice 'OK 4 · los movimientos no se pueden editar';
end $$;


-- ------------------------------------------------------------
-- 5 · Una baja mayor al stock se rechaza, no se descarta en silencio
--
-- El item 'Llave de golpe 2"' tiene 3 unidades. Intentar dar de baja 10
-- tiene que fallar. Antes dejaba el stock en 0 y registraba el
-- movimiento de 10, descuadrando libro y saldo para siempre.
-- ------------------------------------------------------------
reset role;

do $$
declare v_pudo boolean := false; v_cant numeric;
begin
  begin
    insert into atlantic_dama.inventario_movimientos (item_id, tipo, cantidad, detalle)
    values ('d0000000-0000-4000-8000-000000000001', 'baja', 10, 'Baja imposible de prueba');
    v_pudo := true;
  exception when others then null;
  end;

  if v_pudo then
    raise exception 'FALLA 5 · se acepto una baja de 10 unidades sobre un stock de 3';
  end if;

  select cantidad into v_cant from atlantic_dama.inventario_items
   where id = 'd0000000-0000-4000-8000-000000000001';
  if v_cant <> 3 then
    raise exception 'FALLA 5 · el stock quedo en % y deberia seguir en 3', v_cant;
  end if;
  raise notice 'OK 5 · la baja imposible se rechaza y el stock queda intacto';
end $$;


-- ------------------------------------------------------------
-- 6 · La autoria de un movimiento la pone la base, no el cliente
-- ------------------------------------------------------------
reset role;

do $$
declare v_uid uuid; v_email text;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub','a0000000-0000-4000-8000-000000000001','role','authenticated')::text, true);
  set local role authenticated;

  insert into atlantic_dama.inventario_movimientos
    (item_id, tipo, cantidad, detalle, usuario_email)
  values ('d0000000-0000-4000-8000-000000000003', 'baja', 1,
          'Prueba de autoria', 'mentira@otro-usuario.com');

  select usuario_id, usuario_email into v_uid, v_email
    from atlantic_dama.inventario_movimientos
   where detalle = 'Prueba de autoria';

  reset role;

  if v_uid is distinct from 'a0000000-0000-4000-8000-000000000001'::uuid then
    raise exception 'FALLA 6 · usuario_id quedo en % y deberia ser el de la sesion', v_uid;
  end if;
  if v_email = 'mentira@otro-usuario.com' then
    raise exception 'FALLA 6 · el cliente pudo firmar el movimiento con otro correo';
  end if;
  raise notice 'OK 6 · la autoria la pone la base (%), se ignoro lo que mando el cliente', v_email;
end $$;


-- ------------------------------------------------------------
-- 7 · Ninguna policy del esquema quedo con expresion "true"
-- ------------------------------------------------------------
reset role;

do $$
declare v_abiertas text;
begin
  select string_agg(c.relname || '.' || p.polname, ', ') into v_abiertas
  from pg_policy p
  join pg_class c     on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'atlantic_dama'
    and (pg_get_expr(p.polqual, p.polrelid) = 'true'
      or pg_get_expr(p.polwithcheck, p.polrelid) = 'true');

  if v_abiertas is not null then
    raise exception 'FALLA 7 · quedaron policies permisivas: %', v_abiertas;
  end if;
  raise notice 'OK 7 · ninguna policy del esquema usa "true"';
end $$;


-- ------------------------------------------------------------
-- 8 · Las tablas nuevas ya no nacen abiertas
--
-- El control que evita que el problema vuelva solo dentro de tres
-- migraciones sin que nadie lo note.
-- ------------------------------------------------------------
reset role;

do $$
declare v_default text;
begin
  select string_agg(a.acl::text, ', ') into v_default
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral unnest(d.defaclacl) as a(acl)
  where n.nspname = 'atlantic_dama'
    and d.defaclobjtype = 'r'
    and a.acl::text like 'authenticated=%';

  if v_default is not null then
    raise exception
      'FALLA 8 · las tablas nuevas siguen naciendo con permisos para authenticated: %', v_default;
  end if;
  raise notice 'OK 8 · las tablas nuevas nacen cerradas';
end $$;
