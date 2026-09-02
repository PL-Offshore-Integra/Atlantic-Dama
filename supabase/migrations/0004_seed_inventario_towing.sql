-- Datos migrados desde "AD - Towing gear summary.xlsx" (hojas Towing y Quarantine Items).
insert into atlantic_dama.ubicaciones (nombre) values
  ('Bodega'),
  ('Lower drum'),
  ('Main Tow Wire'),
  ('Spare Tow Wire'),
  ('Upper drum');

insert into atlantic_dama.inventario_items
  (categoria, nombre, codigo, cantidad, ubicacion_id, marca, wll_mbl, fecha_referencia, estado, comentarios)
select * from (values
  ('towing_gear', 'Main Tow Wire', '262386', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Lower drum'), 'Haggie', 'MBL 350T', date '2019-06-11', 'activo', '1219m x 71mm with closed spelter socket'),
  ('towing_gear', 'Spelter Socket', '20190326-01', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Main Tow Wire'), 'De Haan', 'MBL 500T', date '2019-05-02', 'activo', 'Closed'),
  ('towing_gear', 'Spare Tow Wire', '520220', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Upper drum'), 'IPH', 'MBL 193T', date '2025-08-12', 'activo', '750m x 52mm with closed spelter socket'),
  ('towing_gear', 'Spelter Socket', 'CC1-2025081200191', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Spare Tow Wire'), 'Crosby', 'MBL 309T', date '2025-08-12', 'activo', 'Closed'),
  ('towing_gear', 'Spare Wire', 'EXS/19/19988-2', 1, (select id from atlantic_dama.ubicaciones where nombre = ''), 'Exsil NV', 'MBL 55T', date '2019-12-19', 'activo', '1500m x 28mm. Astillero'),
  ('towing_gear', 'Spare Wire', 'EXS/19/19988-1', 1, (select id from atlantic_dama.ubicaciones where nombre = ''), 'Exsil NV', 'MBL 55T', date '2019-12-19', 'activo', '500m x 28mm. Astillero'),
  ('towing_gear', 'Spelter Socket', 'EXS/19/19988-3', 1, (select id from atlantic_dama.ubicaciones where nombre = ''), 'Exsil NV', 'MBL 80T', date '2019-12-19', 'activo', 'Closed. Astillero'),
  ('towing_gear', 'Spelter Socket', 'EXS/19/19988-4', 1, (select id from atlantic_dama.ubicaciones where nombre = ''), 'Exsil NV', 'MBL 8T', date '2019-12-19', 'activo', 'Open. Astillero'),
  ('towing_gear', 'Poliprop Rope', '10227CHN20', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'Jiuli Rope Co Ltd', 'MBL 90T', date '2020-06-20', 'activo', '70m x 90mm'),
  ('towing_gear', 'Shackle', '82304223/110', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'Gunnebo', 'WLL 35T', date '2019-01-31', 'activo', 'Bolt Type'),
  ('towing_gear', 'Shackle', '82304223/110', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'Gunnebo', 'WLL 35T', date '2019-01-31', 'activo', 'Bolt Type'),
  ('towing_gear', 'Shackle', '82304223/110', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'Gunnebo', 'WLL 35T', date '2019-01-31', 'activo', 'Bolt Type'),
  ('towing_gear', 'Shackle', '20H013557', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'Crosby', 'WLL 55T', date '2020-01-30', 'activo', 'Bolt Type - #9643.05'),
  ('towing_gear', 'Shackle', '20H013557', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'Crosby', 'WLL 55T', date '2020-01-30', 'activo', 'Bolt Type - #9643.06'),
  ('towing_gear', 'Shackle', '20H013557', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'Crosby', 'WLL 55T', date '2020-01-30', 'activo', 'Bolt Type - #9643.07'),
  ('towing_gear', 'Shackle', 'CE-C-1216-14-162-04-9A', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'JULI Sling Co', 'WLL 25T', date '2014-12-31', 'activo', 'Bow type (Bolt & Nut). Tuerca y chaveta azul'),
  ('towing_gear', 'Shackle', 'CE-C-1216-14-162-04-9A', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'JULI Sling Co', 'WLL 25T', date '2014-12-31', 'activo', 'Bow type (Bolt & Nut). Tuerca y chaveta azul'),
  ('towing_gear', 'Shackle', 'CE-C-1216-14-162-04-9A', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'JULI Sling Co', 'WLL 25T', date '2014-12-31', 'activo', 'Bow type (Bolt & Nut). Tuerca y chaveta azul'),
  ('towing_gear', 'Shacke', 'CE-C-1216-14-162-04-9A', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'JULI Sling Co', 'WLL 25T', date '2014-12-31', 'activo', 'Bow type (Bolt & Nut). Tuerca y chaveta azul'),
  ('towing_gear', 'Shackle', '2104-8307', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'ELD', 'WLL 17T', date '2021-04-22', 'activo', 'Bow type'),
  ('towing_gear', 'Shackle', '2104-8307', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'ELD', 'WLL 17T', date '2021-04-22', 'activo', 'Bow type'),
  ('towing_gear', 'Shackle', '2104-8307', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'ELD', 'WLL 17T', date '2021-04-22', 'activo', 'Bow type'),
  ('towing_gear', 'Shackle', '133844', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'ELD', 'WLL 12T', date '2021-04-22', 'activo', 'Bow type'),
  ('towing_gear', 'Shackle', '133844', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'ELD', 'WLL 12T', date '2021-04-22', 'activo', 'Bow type'),
  ('towing_gear', 'Shackle', '133844', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'ELD', 'WLL 12T', date '2021-04-22', 'activo', 'Bow type'),
  ('towing_gear', 'Shackle', '133844', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'ELD', 'WLL 12T', date '2021-04-22', 'activo', 'Bow type'),
  ('towing_gear', 'Shackle', '133844', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'ELD', 'WLL 12T', date '2021-04-22', 'activo', 'Bow type'),
  ('towing_gear', 'Delta Plate', '20H013581', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'Lankhorst', 'WLL 35T', date '2020-02-13', 'activo', 'Triangle - #105363'),
  ('towing_gear', 'Delta Plate', '20H013581', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'Lankhorst', 'WLL 55T', date '2020-02-13', 'activo', 'Triangle - #923131'),
  ('towing_gear', 'Pennant Wire', '3018/20', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'Steelropes', 'MBL 137T', date '2020-09-16', 'activo', '36m x 44mm'),
  ('towing_gear', 'Pennant Wire', '445892', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'IPH', 'MBL 138T', date '2021-11-04', 'activo', '18m x 44mm'),
  ('towing_gear', 'Pennant Wire', '445892', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'IPH', 'MBL 138T', date '2021-11-04', 'activo', '18m x 44mm'),
  ('towing_gear', 'Chain', 'JJG2010496/1', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'Jiangsu', 'MBL 15T', date '2020-08-18', 'activo', '27.5m x 16mm'),
  ('towing_gear', 'Poliprop Rope', 'JM-04520-N2', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'Moscuzza', 'MBL 47T', date '2023-08-01', 'activo', 'TYPE POLYSTEEL 56mm x 220m'),
  ('towing_gear', 'Poliprop Rope', 'JM-04521-N2', 1, (select id from atlantic_dama.ubicaciones where nombre = 'Bodega'), 'Moscuzza', 'MBL 47T', date '2023-08-01', 'activo', 'TYPE POLYSTEEL 56mm x 220m')
) as t (categoria, nombre, codigo, cantidad, ubicacion_id, marca, wll_mbl, fecha_referencia, estado, comentarios);
