-- ============================================================
-- Staging · usuarios y datos para las pruebas
--
-- Dos cuentas que representan el caso que hay que probar:
--
--   tripulante@prueba.local  → tiene el modulo 'atlantic-dama'
--   ajeno@prueba.local       → NO lo tiene (simula a alguien de
--                              Clean Sea, o de otro modulo)
--
-- Si el aislamiento funciona, el segundo no tiene que ver nada del
-- inventario del buque. Hoy, en produccion, lo ve todo.
--
-- Solo para staging. Estas cuentas no existen en produccion.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Cuentas
--
-- Se insertan directo en auth.users porque en staging no hay nadie a
-- quien invitar. La contrasena no importa: las pruebas simulan la
-- sesion fijando el claim del JWT, no haciendo login de verdad: por eso
-- el hash de contrasena es un valor fijo cualquiera.
-- ------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000000',
   'a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'tripulante@prueba.local', '$2a$10$staging.sin.login.real.no.usar.jamas.en.produccion.xx', now(),
   now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000',
   'a0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'ajeno@prueba.local', '$2a$10$staging.sin.login.real.no.usar.jamas.en.produccion.xx', now(),
   now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- 2) Permisos
--
-- El tripulante tiene el modulo del buque. El ajeno tiene otro modulo
-- cualquiera: no es un usuario sin permisos, es un usuario con
-- permisos de OTRA cosa. Ese es el caso que importa.
-- ------------------------------------------------------------
insert into public.user_roles (user_id, empresas, modulos, rol)
values
  ('a0000000-0000-4000-8000-000000000001', '{parana}',   '{atlantic-dama,viveres}', 'usuario'),
  ('a0000000-0000-4000-8000-000000000002', '{cleansea}', '{hsqe,inventario}',       'usuario')
on conflict (user_id) do update
  set empresas = excluded.empresas,
      modulos  = excluded.modulos;


-- ------------------------------------------------------------
-- 3) Inventario de ejemplo
--
-- Cantidades bajas a proposito: una de las pruebas da de baja mas
-- unidades de las que hay, para verificar que el sistema se niega en
-- vez de dejar el stock en cero y descuadrar el libro.
-- ------------------------------------------------------------
insert into atlantic_dama.ubicaciones (id, nombre, descripcion)
values ('b0000000-0000-4000-8000-000000000001', 'Panol de proa', 'Ubicacion de prueba')
on conflict (nombre) do nothing;

insert into atlantic_dama.motivos_movimiento (id, nombre, tipo, orden)
values
  ('c0000000-0000-4000-8000-000000000001', 'Compra',  'alta', 1),
  ('c0000000-0000-4000-8000-000000000002', 'Rotura',  'baja', 2)
on conflict (nombre) do nothing;

insert into atlantic_dama.inventario_items
  (id, categoria, nombre, codigo, marca, cantidad, ubicacion_id)
values
  -- Arranca en 0: el movimiento de alta de mas abajo la deja en 3, que es
  -- como se cargan los items de verdad (la cantidad nunca se escribe a mano).
  ('d0000000-0000-4000-8000-000000000001', 'maquinas',    'Llave de golpe 2"',     'LLG-2',  'Bahco', 0, 'b0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000002', 'towing_gear', 'Grillete 85 t',          'GRI-85', 'Crosby', 2, 'b0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000003', 'maquinas',    'Filtro de aceite MTU',   'FIL-MTU','MTU',   12, 'b0000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into atlantic_dama.inventario_movimientos (item_id, tipo, cantidad, motivo_id, detalle, usuario_email)
values ('d0000000-0000-4000-8000-000000000001', 'alta', 3,
        'c0000000-0000-4000-8000-000000000001', 'Carga inicial de prueba',
        'firma-no-confiable@ejemplo.com')
on conflict do nothing;
