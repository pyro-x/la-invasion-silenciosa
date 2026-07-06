-- LCHP-11 · Policy test suite (pgTAP, runs via `supabase test db`).
-- Every assertion mirrors a line of brief §12; if one of these fails, the
-- public API is exposing something it must not.

begin;
create extension if not exists pgtap with schema extensions;

select plan(54);

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres): two registered users, one anonymous user, one
-- sighting per relevant moderation state, one inactive species.
-- ---------------------------------------------------------------------------

insert into auth.users (id, instance_id, aud, role, is_anonymous) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', false),
  ('bbbbbbbb-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', false),
  ('cccccccc-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true);

insert into public.species (id, slug, dex_number, name, rarity, description, habitat, tracking_tip, is_active)
values ('99999999-0000-0000-0000-000000000099', 'test-inactive', '#999', 'Inactiva', 'común', 'x', 'x', 'x', false);

insert into public.sightings (id, species_id, created_by, lat_public, lng_public, moderation_status)
select
  ('dddddddd-0000-0000-0000-00000000000' || n)::uuid,
  (select id from public.species where slug = 'test-inactive'),
  'aaaaaaaa-0000-0000-0000-000000000001',
  40.411, -3.711,
  state
from (values ('1', 'pending'), ('2', 'approved'), ('3', 'rejected'), ('4', 'removed')) as t (n, state);

-- A pending sighting authored by B (the verifier), to prove self-validation
-- is blocked, and a real object in the bucket so the storage lockdown tests
-- cannot pass vacuously against an empty table (Codex review, LCHP-11).
insert into public.sightings (id, species_id, created_by, lat_public, lng_public)
values ('dddddddd-0000-0000-0000-000000000005',
        (select id from public.species where slug = 'test-inactive'),
        'bbbbbbbb-0000-0000-0000-000000000002', 40.411, -3.711);

insert into storage.objects (bucket_id, name)
values ('sightings-photos', 'fixtures/hidden-photo.jpg');

-- ---------------------------------------------------------------------------
-- View column contract (as postgres): exactly the 8 safe columns, in order.
-- ---------------------------------------------------------------------------

select is(
  (select string_agg(column_name, ',' order by ordinal_position)
     from information_schema.columns
    where table_schema = 'public' and table_name = 'public_map_sightings'),
  'id,species_id,lat_public,lng_public,status,confidence,verification_count,created_at',
  'public_map_sightings exposes exactly the 8 safe columns, nothing else'
);

-- ---------------------------------------------------------------------------
-- Anonymous visitor (anon key, no session)
-- ---------------------------------------------------------------------------

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  (select count(*)::int from public.species),
  4,
  'anon sees only the 4 active species (inactive one hidden by policy)'
);

select throws_ok(
  $$ select * from public.sightings $$,
  '42501', null,
  'anon cannot select the sightings table directly'
);

select is(
  (select count(*)::int from public.public_map_sightings
    where species_id = '99999999-0000-0000-0000-000000000099'),
  3,
  'anon sees exactly pending + approved on the map view (2 pending + 1 approved)'
);

select is(
  (select string_agg(status, ',' order by status) from public.public_map_sightings
    where species_id = '99999999-0000-0000-0000-000000000099'),
  'approved,pending,pending',
  'rejected and removed sightings never reach the map view'
);

select throws_ok(
  $$ select * from public.profiles $$,
  '42501', null,
  'anon cannot read profiles'
);

select throws_ok(
  $$ select * from public.app_config $$,
  '42501', null,
  'anon cannot read app_config'
);

select is(
  (select count(*)::int from storage.objects),
  0,
  'anon lists nothing in storage (an object DOES exist — RLS hides it)'
);

reset role;

-- ---------------------------------------------------------------------------
-- Registered user B (authenticated, is_anonymous = false)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}', true);

select throws_ok(
  $$ select * from public.sightings $$,
  '42501', null,
  'registered user cannot select the sightings table directly either'
);

select throws_ok(
  $$ insert into public.sightings (species_id, created_by, lat_public, lng_public)
     values ('99999999-0000-0000-0000-000000000099', 'bbbbbbbb-0000-0000-0000-000000000002', 40.41, -3.71) $$,
  '42501', null,
  'client cannot INSERT sightings (Edge Function only, D-037)'
);

select throws_ok(
  $$ update public.sightings set moderation_status = 'approved' $$,
  '42501', null,
  'client cannot UPDATE sightings (no status transitions from the client)'
);

select throws_ok(
  $$ delete from public.sightings $$,
  '42501', null,
  'client cannot DELETE sightings'
);

select is(
  (select count(*)::int from public.public_map_sightings
    where species_id = '99999999-0000-0000-0000-000000000099'),
  3,
  'registered user sees the same public map as anon'
);

select is(
  (select count(*)::int from public.profiles),
  1,
  'registered user sees exactly one profile'
);

select is(
  (select id::text from public.profiles),
  'bbbbbbbb-0000-0000-0000-000000000002',
  '...and it is their own'
);

select throws_ok(
  $$ select * from public.point_events $$,
  '42501', null,
  'client cannot read point_events'
);

select throws_ok(
  $$ insert into public.point_events (user_id, type, points)
     values ('bbbbbbbb-0000-0000-0000-000000000002', 'manual_adjustment', 9999) $$,
  '42501', null,
  'client cannot INSERT point_events (server-side only)'
);

select throws_ok(
  $$ insert into public.reports (sighting_id, user_id, reason)
     values ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'other') $$,
  '42501', null,
  'client cannot INSERT reports (post-MVP surface stays closed)'
);

select throws_ok(
  $$ select * from public.app_config $$,
  '42501', null,
  'registered user cannot read app_config'
);

-- Verifications: the one open write path (D-038).

select lives_ok(
  $$ insert into public.verifications (sighting_id, user_id, type)
     values ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'confirm_exists') $$,
  'registered user CAN verify a sighting with their own uid'
);

select is(
  (select count(*)::int from public.verifications),
  1,
  'registered user sees their own verification'
);

select throws_ok(
  $$ insert into public.verifications (sighting_id, user_id, type)
     values ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'confirm_exists') $$,
  '42501', null,
  'spoofing another uid in verifications is blocked by RLS'
);

select throws_ok(
  $$ insert into public.verifications (sighting_id, user_id, type)
     values ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'not_found') $$,
  '23505', null,
  'second verification of the same sighting by the same user hits UNIQUE'
);

select throws_ok(
  $$ insert into public.verifications (sighting_id, user_id, type)
     values ('dddddddd-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000002', 'confirm_exists') $$,
  '42501', null,
  'author cannot verify their own sighting (anti self-approval)'
);

select throws_ok(
  $$ insert into public.verifications (sighting_id, user_id, type)
     values ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'confirm_exists') $$,
  '42501', null,
  'approved sightings do not accept further verifications'
);

select throws_ok(
  $$ insert into public.verifications (sighting_id, user_id, type)
     values ('dddddddd-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002', 'confirm_exists') $$,
  '42501', null,
  'rejected/removed sightings do not accept verifications'
);

select throws_ok(
  $$ insert into public.verifications (sighting_id, user_id, type, status)
     values ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'confirm_exists', 'accepted') $$,
  '42501', null,
  'client cannot supply the verification status (column privilege)'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('sightings-photos', 'sneaky.jpg') $$,
  '42501', null,
  'registered user cannot write to the photo bucket (Edge Function only)'
);

select is(
  (select count(*)::int from storage.objects),
  0,
  'registered user cannot see or list bucket objects either'
);

reset role;

-- ---------------------------------------------------------------------------
-- Anonymous SESSION user C (authenticated role, is_anonymous = true)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","is_anonymous":true}', true);

select throws_ok(
  $$ insert into public.verifications (sighting_id, user_id, type)
     values ('dddddddd-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000003', 'confirm_exists') $$,
  '42501', null,
  'anonymous sessions cannot verify (registered only, D-038 anti-sybil)'
);

select is(
  (select count(*)::int from public.public_map_sightings
    where species_id = '99999999-0000-0000-0000-000000000099'),
  3,
  'anonymous session still sees the public map'
);

reset role;

-- ---------------------------------------------------------------------------
-- Bucket contract (as postgres)
-- ---------------------------------------------------------------------------

select is(
  (select public from storage.buckets where id = 'sightings-photos'),
  false,
  'sightings-photos bucket exists and is private'
);

select is(
  (select file_size_limit::int from storage.buckets where id = 'sightings-photos'),
  524288,
  'bucket caps uploads at 512 KB'
);

select is(
  (select array_to_string(allowed_mime_types, ',') from storage.buckets where id = 'sightings-photos'),
  'image/jpeg,image/webp',
  'bucket only accepts jpeg/webp'
);

select is(
  (select count(*)::int from pg_policies
    where schemaname = 'storage' and tablename = 'objects'),
  0,
  'storage.objects carries ZERO policies — any future policy must consciously update this test'
);

-- The policy helper must never live in an exposed schema: in `public`,
-- PostgREST would serve it as an RPC oracle over hidden sighting authorship.
select is(
  (select count(*)::int from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'verification_target_is_valid' and n.nspname = 'public'),
  0,
  'verification helper is NOT exposed in the public schema (no PostgREST RPC)'
);

select is(
  (select count(*)::int from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'verification_target_is_valid' and n.nspname = 'private'),
  1,
  'verification helper lives in the non-exposed private schema'
);

-- ---------------------------------------------------------------------------
-- Daily quota trigger (0005, D-032) — fires for every entry path, service
-- role included, since it's a trigger, not a policy. Fixture state today:
-- registered A authored 4 sightings, registered B 1, anonymous C 0.
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into public.sightings (species_id, created_by, lat_public, lng_public)
     values ('99999999-0000-0000-0000-000000000099', 'aaaaaaaa-0000-0000-0000-000000000001', 40.411, -3.711) $$,
  'registered user: 5th sighting of the day is accepted (quota 5)'
);

select throws_ok(
  $$ insert into public.sightings (species_id, created_by, lat_public, lng_public)
     values ('99999999-0000-0000-0000-000000000099', 'aaaaaaaa-0000-0000-0000-000000000001', 40.411, -3.711) $$,
  'P0001', 'daily quota exceeded: 5 of 5 used',
  'registered user: 6th sighting of the day is rejected'
);

select lives_ok(
  $$ insert into public.sightings (species_id, created_by, lat_public, lng_public)
     values ('99999999-0000-0000-0000-000000000099', 'cccccccc-0000-0000-0000-000000000003', 40.411, -3.711) $$,
  'anonymous user: 1st sighting of the day is accepted'
);

select lives_ok(
  $$ insert into public.sightings (species_id, created_by, lat_public, lng_public)
     values ('99999999-0000-0000-0000-000000000099', 'cccccccc-0000-0000-0000-000000000003', 40.411, -3.711) $$,
  'anonymous user: 2nd sighting of the day is accepted (quota 2)'
);

select throws_ok(
  $$ insert into public.sightings (species_id, created_by, lat_public, lng_public)
     values ('99999999-0000-0000-0000-000000000099', 'cccccccc-0000-0000-0000-000000000003', 40.411, -3.711) $$,
  'P0001', 'daily quota exceeded: 2 of 2 used',
  'anonymous user: 3rd sighting of the day is rejected'
);

select lives_ok(
  $$ insert into public.sightings (species_id, created_by, lat_public, lng_public)
     values ('99999999-0000-0000-0000-000000000099', null, 40.411, -3.711) $$,
  'authorless rows (deleted accounts / admin inserts) are not quota material'
);

-- ---------------------------------------------------------------------------
-- Edge Function surface (0006): service_role's explicit grants. Local
-- baselines give service_role NO implicit DML on public tables, so the
-- function's needs must be granted — and only those.
-- ---------------------------------------------------------------------------

set local role service_role;

select is(
  (select count(*)::int from public.species where is_active),
  4,
  'service_role reads the species catalog (create-sighting validation)'
);

select lives_ok(
  $$ insert into public.sightings (species_id, created_by, lat_public, lng_public, photo_path)
     values ('99999999-0000-0000-0000-000000000099', 'bbbbbbbb-0000-0000-0000-000000000002', 40.411, -3.711, 'b/x.jpg') $$,
  'service_role creates sightings (the Edge Function write path)'
);

-- The quota trigger must have taken its per-user/day advisory lock during
-- that insert (serialization regression canary — a plain count-then-insert
-- would leave no advisory lock in this transaction). True multi-session
-- racing is beyond pgTAP's single connection; this asserts the mechanism.
select cmp_ok(
  (select count(*)::int from pg_locks
    where locktype = 'advisory' and pid = pg_backend_pid()),
  '>=', 1,
  'quota trigger serializes via a transaction-scoped advisory lock'
);

select throws_ok(
  $$ insert into public.sightings (species_id, created_by, lat_public, lng_public, photo_path, moderation_status)
     values ('99999999-0000-0000-0000-000000000099', 'bbbbbbbb-0000-0000-0000-000000000002', 40.411, -3.711, 'b/y.jpg', 'approved') $$,
  '42501', null,
  'service_role cannot set moderation_status at insert (column grant)'
);

select throws_ok(
  $$ select lat_private from public.sightings $$,
  '42501', null,
  'service_role cannot read private coordinates (column grant)'
);

reset role;

-- Privilege SHAPE assertions (Codex round 2): table-level privileges must
-- be absent — only the column-scoped grants exist. On an environment where
-- legacy implicit ALL survived (the hosted gap 0006 revokes), these fail.
select is(
  (select has_table_privilege('service_role', 'public.sightings', 'select')),
  false,
  'service_role holds NO table-level SELECT on sightings (columns only)'
);

select is(
  (select has_table_privilege('service_role', 'public.sightings', 'insert')),
  false,
  'service_role holds NO table-level INSERT on sightings (columns only)'
);

select is(
  (select has_table_privilege('service_role', 'public.sightings', 'update')),
  false,
  'service_role holds NO UPDATE on sightings'
);

select is(
  (select has_table_privilege('service_role', 'public.point_events', 'insert')),
  false,
  'service_role cannot forge point_events (LCHP-15 trigger territory)'
);

set local role service_role;

select is(
  (select value from public.app_config where key = 'validation_threshold'),
  '1',
  'service_role reads app_config (lib/config.ts)'
);

select throws_ok(
  $$ delete from public.sightings $$,
  '42501', null,
  'service_role got INSERT+SELECT, not DELETE — least privilege holds'
);

reset role;

select * from finish();
rollback;
