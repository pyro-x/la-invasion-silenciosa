-- LCHP-11 · RLS policies, public map view, private Storage bucket.
-- Brief §12 mirrors this file exactly (sync rule). Architecture decided in
-- D-037 (hybrid PostgREST-first): reads and verifications go straight
-- through PostgREST guarded by these policies; sighting creation and photo
-- access go exclusively through the Edge Function (LCHP-12), so `sightings`,
-- `point_events`, `reports`, `app_config` and the storage bucket keep ZERO
-- client policies on purpose — deny-all is their contract, not an omission.

-- ---------------------------------------------------------------------------
-- Privilege hardening (defense in depth under RLS)
--
-- Supabase's default privileges grant broad table access to anon and
-- authenticated; RLS already blocks every row, but revoking the privileges
-- outright means a direct query on a locked table fails loudly (42501)
-- instead of returning misleading empty sets, and client-supplied columns
-- on verifications are rejected at the privilege layer before RLS runs.
-- ---------------------------------------------------------------------------

revoke all on public.species from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.sightings from anon, authenticated;
revoke all on public.verifications from anon, authenticated;
revoke all on public.point_events from anon, authenticated;
revoke all on public.reports from anon, authenticated;
revoke all on public.app_config from anon, authenticated;

grant select on public.species to anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.verifications to authenticated;
-- Column list on purpose: status/points_awarded can never be client-supplied,
-- they fall to their defaults ('pending', false) at the privilege layer.
grant insert (sighting_id, user_id, type, note)
  on public.verifications to authenticated;

-- ---------------------------------------------------------------------------
-- Policies: species (public catalog, active entries only)
-- ---------------------------------------------------------------------------

create policy "species_select_active"
  on public.species
  for select
  to anon, authenticated
  using (is_active);

-- ---------------------------------------------------------------------------
-- Policies: profiles (own row only; ranking gets its own view in LCHP-16)
-- ---------------------------------------------------------------------------

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- Policies: verifications (the one client write path, D-038)
--
-- Registered users only (brief §16 lists verifying under the registered
-- role; with validation_threshold=1 an anonymous verifier would make
-- self-validation via incognito session trivial). Uniqueness per user and
-- sighting is the UNIQUE constraint from 0001; consolidation (threshold →
-- approved, +10/+5 point events) is LCHP-15's server-side trigger.
--
-- The target-sighting invariants live HERE, at the database boundary, not
-- in future application code (Codex adversarial review, LCHP-11): only a
-- currently-pending sighting accepts verifications, and never from its own
-- author — otherwise, with threshold 1, an author could self-approve and
-- forge the +10/+5. The helper is security definer because the policy's
-- subquery must read `sightings`, which clients cannot.
--
-- It lives in the non-exposed `private` schema and derives the verifier
-- from auth.uid() internally (Codex round 2): in `public` with an arbitrary
-- verifier parameter, PostgREST would expose it as an RPC oracle letting
-- any authenticated client probe "was sighting X created by user Y?" —
-- exactly the created_by linkage the map view withholds.
--
-- NOTE (LCHP-15 contract): this WITH CHECK proves the target was pending in
-- the statement snapshot; it does NOT serialize concurrent verifications.
-- The consolidation trigger must be the concurrency boundary: lock the
-- sighting row (or atomic UPDATE ... WHERE moderation_status = 'pending')
-- and award points only when that transition succeeds.
-- ---------------------------------------------------------------------------

create schema private;
grant usage on schema private to authenticated;

create function private.verification_target_is_valid(target_sighting uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.sightings s
    where s.id = target_sighting
      and s.moderation_status = 'pending'
      and s.created_by is distinct from (select auth.uid())
  );
$$;

revoke execute on function private.verification_target_is_valid(uuid) from public;
grant execute on function private.verification_target_is_valid(uuid) to authenticated;

create policy "verifications_select_own"
  on public.verifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "verifications_insert_own_registered"
  on public.verifications
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
    and private.verification_target_is_valid(sighting_id)
  );

-- ---------------------------------------------------------------------------
-- Public map view (brief §12): the ONLY read surface over sightings.
--
-- Owner-rights view on purpose (security_invoker = false): the postgres
-- owner bypasses the table's RLS, and the view's column list + WHERE are
-- the whole exposure contract. NEVER add: photo_path, photo_blurred_path,
-- photo_thumbnail_path, lat_private, lng_private, location_accuracy_m,
-- created_by, reviewed_by, reviewed_at, rejection_reason, points_awarded*,
-- auto_moderation_*, image_processing_status, report_count, updated_at.
-- ---------------------------------------------------------------------------

create view public.public_map_sightings
  with (security_invoker = false, security_barrier = true)
  as
select
  id,
  species_id,
  lat_public,
  lng_public,
  moderation_status as status,
  confidence,
  verification_count,
  created_at
from public.sightings
where moderation_status in ('pending', 'approved');

revoke all on public.public_map_sightings from anon, authenticated;
grant select on public.public_map_sightings to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for sighting photos.
--
-- No storage.objects policies AT ALL: with RLS enabled and zero policies,
-- neither anon nor authenticated can read, upload or list anything. The
-- Edge Function (service role) is the only writer, and photo access is
-- exclusively via its short-lived signed URLs (/get-photo-url, LCHP-12).
-- Bucket-level caps are a backstop for every caller, service role included.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sightings-photos',
  'sightings-photos',
  false,
  524288, -- 512 KB: client re-encodes to ~50 KB (LCHP-5), post-MVP target ≤300 KB
  array['image/jpeg', 'image/webp']
)
on conflict (id) do nothing;
