-- Local-only seed (runs on `supabase db reset`, never on hosted).
--
-- Product reference data (species, app_config.validation_threshold) is
-- intentionally NOT here: it lives in migrations/0002_seed_reference_data.sql
-- so local and hosted apply identical rows through the same mechanism.
--
-- Dev fixtures below (LCHP-13): the 7 prototype sightings (data.jsx)
-- converted once from the mockup's 1000×527 canvas space to real lat/lng via
-- the LCHP-4 spike affine transform (brief §21), so the dev map + visual loop
-- look like the mockup. created_by is NULL on purpose (authorless seed rows:
-- no fake auth users needed, and the 0005 quota trigger exempts them).
-- photo_path is NULL — «Ver evidencia» degrades gracefully for seeds.

-- Streets in the comments are Nominatim reverse-geocodes of each coordinate
-- (LCHP-13 seed validation): they confirm the affine transform lands on real
-- La Latina streets — and reproduce the prototype's original street labels
-- almost exactly. Not stored (the public view is location-approximate by
-- design); shown here only as evidence the transform is faithful.
insert into public.sightings
  (species_id, lat_public, lng_public, moderation_status, confidence, verification_count, created_at)
values
  ((select id from public.species where slug = 'candadin'),   40.411828, -3.710467, 'approved', 'community_verified', 4, now() - interval '2 hours'),    -- Calle de la Cava Baja
  ((select id from public.species where slug = 'keymon'),      40.412648, -3.710045, 'approved', 'community_verified', 6, now() - interval '4 hours'),    -- Calle del Almendro
  ((select id from public.species where slug = 'turistox'),    40.412954, -3.711578, 'approved', 'community_verified', 3, now() - interval '5 hours'),    -- Plaza de la Paja
  ((select id from public.species where slug = 'checkinchu'),  40.411046, -3.708487, 'approved', 'community_verified', 5, now() - interval '1 day'),      -- Calle de Toledo
  ((select id from public.species where slug = 'candadin'),    40.411436, -3.711331, 'pending',  'unverified',         1, now() - interval '20 minutes'), -- Plaza de los Carros
  ((select id from public.species where slug = 'turistox'),    40.410929, -3.707373, 'pending',  'unverified',         0, now() - interval '35 minutes'), -- Plaza de Cascorro
  ((select id from public.species where slug = 'keymon'),      40.411613, -3.710446, 'pending',  'unverified',         2, now() - interval '1 hour')      -- Calle de la Cava Alta
on conflict do nothing;
