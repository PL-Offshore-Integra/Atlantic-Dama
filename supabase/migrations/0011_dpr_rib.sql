-- Pestaña "Info RIB" del DPR: uso diario del bote de rescate / trabajo.
alter table atlantic_dama.dpr
  add column rib_horas numeric,             -- horas de uso en la jornada
  add column rib_comb_usado numeric,        -- combustible utilizado (litros)
  add column rib_comb_disponible numeric;   -- combustible disponible al cierre (litros)

notify pgrst, 'reload schema';
