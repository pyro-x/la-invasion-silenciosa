-- LCHP-10 · Adversarial-review fixes (D-033 triage), applied as a new
-- migration because 0001/0002 are already recorded on the hosted project.
--
-- 1) Coordinates and accuracy get range CHECKs. In Postgres, NaN sorts
--    greater than every other double (Infinity included), so BETWEEN
--    rejects NaN and ±Infinity for the coordinate columns, and the
--    explicit `< 'Infinity'` bound does the same for the accuracy.
alter table public.sightings
  add constraint sightings_lat_public_range
    check (lat_public between -90 and 90),
  add constraint sightings_lng_public_range
    check (lng_public between -180 and 180),
  add constraint sightings_lat_private_range
    check (lat_private between -90 and 90),
  add constraint sightings_lng_private_range
    check (lng_private between -180 and 180),
  add constraint sightings_location_accuracy_m_valid
    check (location_accuracy_m >= 0
           and location_accuracy_m < 'Infinity'::double precision);

-- 2) Make the counter semantics explicit: these are historical counters
--    incremented server-side (LCHP-12/15), NOT live aggregates over the
--    verifications/reports tables. Deleting a verifier's account cascades
--    away their verifications rows (GDPR) but does not rewind counters,
--    past moderation transitions, or awarded points — an approved
--    sighting stays approved.
comment on column public.sightings.verification_count is
  'Historical count of confirmations received, incremented server-side '
  'when a verification is accepted. Not a live aggregate of the '
  'verifications table: rows deleted by account removal do not rewind '
  'this counter, past state transitions, or awarded points.';

comment on column public.sightings.report_count is
  'Historical count of reports received, incremented server-side. Not a '
  'live aggregate of the reports table.';
