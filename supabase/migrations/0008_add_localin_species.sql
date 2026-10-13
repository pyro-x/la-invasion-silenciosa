-- LCHP-47 · Localín, creature 005 (D-066).
--
-- Reference data, so it ships as a migration like 0002: local and hosted
-- get the same row through the same mechanism. Idempotent upsert, same
-- shape as 0002; the four existing species and their sightings are not
-- touched.
--
-- Spanish copy is product content, verbatim from
-- reglas-y-especificacion.md §2 via src/services/species.service.ts.

insert into public.species
  (slug, dex_number, name, rarity, description, habitat, tracking_tip, points)
values
  (
    'localin', '005', 'LOCALÍN', 'frecuente',
    'Donde antes había una panadería, una ferretería o una tienda de barrio, ahora hay maletas. Localín habita antiguos locales comerciales a pie de calle convertidos en alojamientos turísticos.',
    'Bajos comerciales que antes albergaban negocios del barrio.',
    'Tienen que cumplirse dos cosas: que antes fuera un comercio del barrio y que hoy aloje visitantes. Estar en un bajo, tener la persiana echada o un candado no basta.',
    10
  )
on conflict (slug) do update set
  dex_number = excluded.dex_number,
  name = excluded.name,
  rarity = excluded.rarity,
  description = excluded.description,
  habitat = excluded.habitat,
  tracking_tip = excluded.tracking_tip,
  points = excluded.points;
