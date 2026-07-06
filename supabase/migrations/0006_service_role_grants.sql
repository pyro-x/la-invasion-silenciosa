-- LCHP-12 · Explicit least-privilege grants for the Edge Function's role.
--
-- Discovered while wiring the function against the local stack: modern
-- local baselines create public tables with NO DML for service_role
-- (only REFERENCES/TRIGGER/TRUNCATE), while the hosted project — created
-- under the classic defaults — still hands service_role implicit ALL.
-- Relying on either implicit behavior is fragile; these grants make the
-- function's data surface explicit, identical in every environment, and
-- reviewable in one place. The function needs nothing else today:
-- storage access goes through the Storage API (its own role), and the
-- point_events/verifications writes belong to LCHP-15's trigger, which
-- runs security definer.

-- REVOKE FIRST (Codex round 2): GRANT is additive, so on the hosted
-- project — provisioned under classic defaults where service_role holds
-- implicit ALL — granting narrower privileges would constrain nothing.
-- Revoking here makes this migration produce the SAME privilege shape in
-- every environment, past or future defaults alike.
revoke all on public.species from service_role;
revoke all on public.profiles from service_role;
revoke all on public.sightings from service_role;
revoke all on public.verifications from service_role;
revoke all on public.point_events from service_role;
revoke all on public.reports from service_role;
revoke all on public.app_config from service_role;

grant select on public.species to service_role;
grant select on public.app_config to service_role;

-- Column-scoped on purpose (Codex adversarial review): full INSERT would
-- let a future route bug set privileged columns (moderation_status,
-- confidence, points_awarded, report_count…) at creation time, and full
-- SELECT would expose private coordinates and authorship beyond what the
-- function's queries actually read. What create-sighting writes:
grant insert (
  species_id, created_by,
  lat_public, lng_public, lat_private, lng_private, location_accuracy_m,
  photo_path
) on public.sightings to service_role;

-- What countSightingsToday, insert RETURNING and photoPathIfVisible read:
grant select (id, created_by, created_at, photo_path, moderation_status)
  on public.sightings to service_role;
