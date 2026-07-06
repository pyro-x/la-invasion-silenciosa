-- LCHP-10 · Reference data as a versioned, idempotent migration.
--
-- species and app_config are product reference data, not dev fixtures, so
-- they ship as a migration: `supabase db reset` (local) and `supabase db
-- push` (hosted) apply the exact same rows and can never drift.
-- supabase/seed.sql stays reserved for local-only fake data.
--
-- Spanish copy is product content, verbatim from
-- reglas-y-especificacion.md §2 via src/services/species.service.ts.

insert into public.species
  (slug, dex_number, name, rarity, description, habitat, tracking_tip, points)
values
  (
    'candadin', '001', 'CANDADÍN', 'común',
    'Candado o caja de llaves instalada en la vía pública.',
    'Rejas, farolas, vallas y portales del barrio.',
    'Suelen aparecer en racimos cerca de pisos turísticos.',
    10
  ),
  (
    'turistox', '002', 'TURISTOX', 'frecuente',
    'Edificio con actividad turística observable desde el espacio público.',
    'Calles principales y plazas con mucho trasiego de maletas.',
    'Mira los balcones: cajas de luz, llaveros y carteles de bienvenida.',
    10
  ),
  (
    'checkinchu', '003', 'CHECKINCHU', 'raro',
    'Punto de acceso automatizado: pantalla o terminal de auto check-in.',
    'Zaguanes, recepciones sin personal y locales reconvertidos.',
    'Brilla de noche. No fotografíes a quien lo esté usando.',
    10
  ),
  (
    'keymon', '004', 'KEYMON', 'legendario',
    'Vivienda turística completa operando en el barrio.',
    'Plantas enteras de edificios antaño de vecinos.',
    'El hallazgo más valioso. Confirma con la caja de llaves cercana.',
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

-- D-005: 1 confirmation validates a sighting for the pilot; raising it
-- later is a config change, not a deploy. DO NOTHING so a re-run never
-- clobbers a value tuned in production.
insert into public.app_config (key, value)
values ('validation_threshold', '1')
on conflict (key) do nothing;
