-- Datos iniciales del modulo DPR, tomados de "AD-DAILY REPORT 106-151126.xlsx":
-- tripulacion y pasajeros a bordo (hoja CREW AND PAX LIST + fechas de embarque
-- de la hoja DR) y consumo/horas de motores de las jornadas 01-13/11/2026
-- (tabla mensual de la hoja DR). La jornada 14/11 la escribe el DPR 106.

insert into atlantic_dama.dpr_personas
  (tipo, orden, cargo, nombre, nacionalidad, fecha_embarque) values
  ('tripulante', 1,  'Captain',  'Federico Miller',            'Argentina', '2026-11-12'),
  ('tripulante', 2,  'Ch.Mate',  'Maximiliano Heis',           'Argentina', '2026-11-12'),
  ('tripulante', 3,  '2nd Mate', 'Damian Friket',              'Argentina', '2026-11-12'),
  ('tripulante', 4,  'Ch. Eng',  'Diego Bergamasco',           'Argentina', '2026-11-03'),
  ('tripulante', 5,  '1st Eng',  'Marcos Andres Aldunate',     'Argentina', '2026-10-30'),
  ('tripulante', 6,  '2nd Eng',  'Enrique Bustos de la Villa', 'Argentina', '2026-10-06'),
  ('tripulante', 7,  'Oiler',    'Daniel Garcia',              'Argentina', '2026-06-12'),
  ('tripulante', 8,  'Cook',     'Daniel Gustavo Peralta',     'Argentina', '2026-10-15'),
  ('tripulante', 9,  '2nd Cook', 'Hugo Orlando Campins',       'Argentina', '2026-10-15'),
  ('tripulante', 10, 'Bosun',    'Gustavo Adrian Garcia',      'Argentina', '2026-10-15'),
  ('tripulante', 11, 'AB',       'Diego Krens',                'Argentina', '2026-06-12'),
  ('tripulante', 12, 'AB',       'Rolando Miguel Vargas',      'Argentina', '2026-10-15'),
  ('tripulante', 13, 'AB',       'Ariel N. Cennamo',           'Argentina', '2026-09-15'),
  ('tripulante', 14, 'Nurse',    'Juan M. Insaurralde',        'Argentina', '2026-09-15');

insert into atlantic_dama.dpr_personas
  (tipo, orden, cargo, nombre, apellido, nacionalidad, pasaporte, pasaporte_vence) values
  ('pasajero', 1, 'Tecnico',   'Sergio',  'Lopez Cobos',       'Mexicano',  'N24711446', '2029-07-21'),
  ('pasajero', 2, 'Tecnico',   'Alex',    'Chan Perez',        'Mexicano',  'N24711338', '2029-07-20'),
  ('pasajero', 3, 'Tecnico',   'Antonio', 'Machucho Comi',     'Mexicano',  'N05769399', '2028-11-15'),
  ('pasajero', 4, 'Tecnico',   'Caleb',   'Carrillo Bautista', 'Mexicano',  'G24695595', '2027-04-17'),
  ('pasajero', 5, 'Inspector', 'Marcus',  'Gomes Silva',       'Brasilero', 'GP500478',  '2036-09-24');

insert into atlantic_dama.dpr_consumo_diario (fecha, consumo, horas_0, horas_1, horas_2) values
  ('2026-11-01', 0.40, 24, 0, 0),
  ('2026-11-02', 2.30, 17, 0, 7),
  ('2026-11-03', 4.00, 17, 0, 7),
  ('2026-11-04', 3.00, 17, 0, 7),
  ('2026-11-05', 1.50, 17, 0, 7),
  ('2026-11-06', 2.00, 17, 0, 7),
  ('2026-11-07', 2.00, 17, 0, 7),
  ('2026-11-08', 0.18, 24, 0, 0),
  ('2026-11-09', 0.29, 23, 1, 0),
  ('2026-11-10', 0.50, 24, 0, 0),
  ('2026-11-11', 1.00, 18, 0, 6),
  ('2026-11-12', 0.16, 24, 0, 0),
  ('2026-11-13', 0.40, 24, 0, 0)
on conflict (fecha) do nothing;
