-- Esquema dedicado para no interferir con otras tablas del proyecto compartido
create schema if not exists atlantic_dama;

-- Las tablas de este buque se agregan aca, todas dentro del esquema atlantic_dama.
-- Ejemplo de patron a seguir (RLS + policy de solo autenticados), ver
-- PL-Offshore-Comerical/supabase/migrations/0001_init.sql para referencia completa:
--
-- create table atlantic_dama.<tabla> (
--   id uuid primary key default gen_random_uuid(),
--   ...
--   created_at timestamptz not null default now()
-- );
-- alter table atlantic_dama.<tabla> enable row level security;
-- create policy "authenticated_all_<tabla>" on atlantic_dama.<tabla>
--   for all to authenticated using (true) with check (true);
