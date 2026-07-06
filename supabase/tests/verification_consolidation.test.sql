-- LCHP-15 · Consolidation behavior suite (pgTAP, runs via `supabase test db`).
--
-- Covers the D-054 model end to end: threshold parameterization (1 and 2),
-- provisional anonymous confirmations under the closed switch, the open
-- switch, retroactive activation on registration, exactly-once awards, and
-- the race-loser path (a confirmation landing on an already-approved
-- sighting — the LCHP-11 concurrency contract's observable outcome).
--
-- Everything here runs as postgres on purpose: triggers fire regardless of
-- role, and inserting fixtures directly lets us simulate states (like the
-- lost race) that RLS forbids clients from creating. Access control itself
-- is rls_policies.test.sql's job.

begin;
create extension if not exists pgtap with schema extensions;

select plan(37);

-- ---------------------------------------------------------------------------
-- Fixtures: three registered users (author + two verifiers), two anonymous
-- users, and a species to hang sightings on.
-- ---------------------------------------------------------------------------

insert into auth.users (id, instance_id, aud, role, is_anonymous) values
  ('a0000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', false), -- author
  ('b0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', false), -- verifier 1 (registered)
  ('c0000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', false), -- verifier 2 (registered)
  ('d0000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true),  -- anonymous verifier
  ('e0000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true);  -- anonymous verifier 2

insert into public.species (id, slug, dex_number, name, rarity, description, habitat, tracking_tip)
values ('99999999-0000-0000-0000-000000000098', 'test-consolidation', '#998', 'Consolidada', 'común', 'x', 'x', 'x');

-- One pending sighting per scenario, all authored by A — backdated so six
-- fixtures by one author do not trip the daily quota trigger (D-032).
insert into public.sightings (id, species_id, created_by, lat_public, lng_public, created_at)
select
  ('f0000000-0000-0000-0000-00000000000' || n)::uuid,
  '99999999-0000-0000-0000-000000000098',
  'a0000000-0000-0000-0000-00000000000a',
  40.411, -3.711,
  now() - interval '1 day'
from (values ('1'), ('2'), ('3'), ('4'), ('5'), ('6'), ('7')) as t (n);

-- The suite assumes the seeded pilot defaults; assert them so a drifted
-- local database fails loudly instead of producing confusing results.
select is(
  (select value from public.app_config where key = 'validation_threshold'),
  '1', 'precondition: validation_threshold seeded at 1');
select is(
  (select value from public.app_config where key = 'verification_requires_registration'),
  'true', 'precondition: verification switch seeded closed');

-- ---------------------------------------------------------------------------
-- Scenario 1 · threshold 1, registered verifier: one confirmation validates,
-- +10 author / +5 verifier, caches updated, everything exactly once.
-- ---------------------------------------------------------------------------

insert into public.verifications (sighting_id, user_id, type)
values ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-00000000000b', 'confirm_exists');

select is(
  (select moderation_status from public.sightings where id = 'f0000000-0000-0000-0000-000000000001'),
  'approved', 'threshold 1: first registered confirmation approves the sighting');
select is(
  (select confidence from public.sightings where id = 'f0000000-0000-0000-0000-000000000001'),
  'community_verified', 'approval sets confidence = community_verified');
select is(
  (select verification_count from public.sightings where id = 'f0000000-0000-0000-0000-000000000001'),
  1, 'verification_count reflects the counting confirmation');
select is(
  (select points_awarded from public.sightings where id = 'f0000000-0000-0000-0000-000000000001'),
  true, 'sighting is marked paid');
select is(
  (select count(*)::int from public.point_events
    where sighting_id = 'f0000000-0000-0000-0000-000000000001' and type = 'sighting_validated' and points = 10
      and user_id = 'a0000000-0000-0000-0000-00000000000a'),
  1, 'author earned exactly one +10');
select is(
  (select count(*)::int from public.point_events
    where sighting_id = 'f0000000-0000-0000-0000-000000000001' and type = 'verification_accepted' and points = 5
      and user_id = 'b0000000-0000-0000-0000-00000000000b'),
  1, 'verifier earned exactly one +5');
select is(
  (select status from public.verifications
    where sighting_id = 'f0000000-0000-0000-0000-000000000001' and user_id = 'b0000000-0000-0000-0000-00000000000b'),
  'accepted', 'the confirmation was accepted');
select is(
  (select total_points from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  10, 'author profile cache = 10');
select is(
  (select total_points from public.profiles where id = 'b0000000-0000-0000-0000-00000000000b'),
  5, 'verifier profile cache = 5');

-- ---------------------------------------------------------------------------
-- Scenario 2 · race loser (LCHP-11 concurrency contract, observable half):
-- a confirmation that lands on an ALREADY approved sighting (its RLS
-- snapshot saw pending) must not re-approve nor duplicate the author's +10
-- — but its verifier still earns their +5 (David's all-verifiers rule).
-- ---------------------------------------------------------------------------

insert into public.verifications (sighting_id, user_id, type)
values ('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000c', 'confirm_exists');

select is(
  (select count(*)::int from public.point_events
    where sighting_id = 'f0000000-0000-0000-0000-000000000001' and type = 'sighting_validated'),
  1, 'race loser: the author +10 is NOT duplicated');
select is(
  (select count(*)::int from public.point_events
    where sighting_id = 'f0000000-0000-0000-0000-000000000001' and type = 'verification_accepted'),
  2, 'race loser: the late confirming verifier still earns their +5');
select is(
  (select verification_count from public.sightings where id = 'f0000000-0000-0000-0000-000000000001'),
  2, 'verification_count refreshed to 2');

-- ---------------------------------------------------------------------------
-- Scenario 3 · provisional anonymous confirmation (switch closed): stored,
-- pending, uncounted, unpaid — the sighting stays pending.
-- ---------------------------------------------------------------------------

insert into public.verifications (sighting_id, user_id, type)
values ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-00000000000d', 'confirm_exists');

select is(
  (select moderation_status from public.sightings where id = 'f0000000-0000-0000-0000-000000000002'),
  'pending', 'anonymous confirmation does not approve (switch closed)');
select is(
  (select status from public.verifications
    where sighting_id = 'f0000000-0000-0000-0000-000000000002' and user_id = 'd0000000-0000-0000-0000-00000000000d'),
  'pending', 'the anonymous confirmation is stored as provisional');
select is(
  (select count(*)::int from public.point_events where sighting_id = 'f0000000-0000-0000-0000-000000000002'),
  0, 'no points minted by a provisional confirmation');

-- ---------------------------------------------------------------------------
-- Scenario 4 · retroactive activation: the anonymous verifier registers
-- (is_anonymous flips on the same row) — their confirmation now counts,
-- the sighting validates, and both +10/+5 are paid.
-- ---------------------------------------------------------------------------

update auth.users set is_anonymous = false
 where id = 'd0000000-0000-0000-0000-00000000000d';

select is(
  (select moderation_status from public.sightings where id = 'f0000000-0000-0000-0000-000000000002'),
  'approved', 'registration activates the confirmation and validates the sighting');
select is(
  (select count(*)::int from public.point_events
    where sighting_id = 'f0000000-0000-0000-0000-000000000002' and type = 'verification_accepted' and points = 5
      and user_id = 'd0000000-0000-0000-0000-00000000000d'),
  1, 'the upgraded verifier collected their +5');
select is(
  (select count(*)::int from public.point_events
    where sighting_id = 'f0000000-0000-0000-0000-000000000002' and type = 'sighting_validated'),
  1, 'the author +10 was paid on retroactive validation');

-- A second flip must not double-pay anything (the trigger only fires on the
-- anonymous → registered transition, and points_awarded guards the rows).
update auth.users set is_anonymous = false
 where id = 'd0000000-0000-0000-0000-00000000000d';
select is(
  (select count(*)::int from public.point_events
    where user_id = 'd0000000-0000-0000-0000-00000000000d'),
  1, 'idempotent: re-updating the user does not duplicate awards');

-- ---------------------------------------------------------------------------
-- Scenario 5 · threshold 2 (changed in the DB, no redeploy): the first
-- confirmation counts but does not validate; the second one does.
-- ---------------------------------------------------------------------------

update public.app_config set value = '2' where key = 'validation_threshold';

insert into public.verifications (sighting_id, user_id, type)
values ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-00000000000b', 'confirm_exists');

select is(
  (select moderation_status from public.sightings where id = 'f0000000-0000-0000-0000-000000000003'),
  'pending', 'threshold 2: first confirmation does not validate');
select is(
  (select verification_count from public.sightings where id = 'f0000000-0000-0000-0000-000000000003'),
  1, 'threshold 2: but it counts');
select is(
  (select count(*)::int from public.point_events where sighting_id = 'f0000000-0000-0000-0000-000000000003'),
  0, 'threshold 2: and mints nothing yet');

insert into public.verifications (sighting_id, user_id, type)
values ('f0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-00000000000c', 'confirm_exists');

select is(
  (select moderation_status from public.sightings where id = 'f0000000-0000-0000-0000-000000000003'),
  'approved', 'threshold 2: the second confirmation validates');
select is(
  (select count(*)::int from public.point_events
    where sighting_id = 'f0000000-0000-0000-0000-000000000003' and type = 'verification_accepted'),
  2, 'threshold 2: BOTH confirming verifiers earn +5 (all-verifiers rule)');
select is(
  (select count(*)::int from public.point_events
    where sighting_id = 'f0000000-0000-0000-0000-000000000003' and type = 'sighting_validated'),
  1, 'threshold 2: the author earns +10 once');

update public.app_config set value = '1' where key = 'validation_threshold';

-- ---------------------------------------------------------------------------
-- Scenario 6 · the switch opens (UPDATE, no redeploy): an anonymous
-- confirmation now counts fully and validates at threshold 1.
-- ---------------------------------------------------------------------------

update public.app_config set value = 'false'
 where key = 'verification_requires_registration';

insert into public.verifications (sighting_id, user_id, type)
values ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-00000000000e', 'confirm_exists');

select is(
  (select moderation_status from public.sightings where id = 'f0000000-0000-0000-0000-000000000004'),
  'approved', 'open switch: an anonymous confirmation validates');
select is(
  (select count(*)::int from public.point_events
    where sighting_id = 'f0000000-0000-0000-0000-000000000004' and type = 'verification_accepted'
      and user_id = 'e0000000-0000-0000-0000-00000000000e'),
  1, 'open switch: the anonymous verifier earns +5');

update public.app_config set value = 'true'
 where key = 'verification_requires_registration';

-- ---------------------------------------------------------------------------
-- Scenario 7 · defense in depth inside the trigger: even if a self-
-- verification row existed (RLS blocks clients; this simulates a bypassing
-- path), it never counts nor validates nor pays the author.
-- ---------------------------------------------------------------------------

insert into public.verifications (sighting_id, user_id, type)
values ('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-00000000000a', 'confirm_exists');

select is(
  (select moderation_status from public.sightings where id = 'f0000000-0000-0000-0000-000000000005'),
  'pending', 'a self-confirmation never validates, even bypassing RLS');
select is(
  (select verification_count from public.sightings where id = 'f0000000-0000-0000-0000-000000000005'),
  0, 'a self-confirmation never counts');
select is(
  (select count(*)::int from public.point_events where sighting_id = 'f0000000-0000-0000-0000-000000000005'),
  0, 'a self-confirmation never pays');

-- ---------------------------------------------------------------------------
-- Scenario 8 · non-confirm types consolidate nothing (post-MVP semantics
-- stay dormant), and authorless sightings validate without an author award.
-- ---------------------------------------------------------------------------

insert into public.verifications (sighting_id, user_id, type)
values ('f0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-00000000000b', 'not_found');

select is(
  (select moderation_status from public.sightings where id = 'f0000000-0000-0000-0000-000000000006'),
  'pending', 'a not_found verification does not consolidate');

update public.sightings set created_by = null
 where id = 'f0000000-0000-0000-0000-000000000006';

insert into public.verifications (sighting_id, user_id, type)
values ('f0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-00000000000c', 'confirm_exists');

select is(
  (select moderation_status from public.sightings where id = 'f0000000-0000-0000-0000-000000000006'),
  'approved', 'an authorless (deleted account) sighting still validates');
select is(
  (select count(*)::int from public.point_events
    where sighting_id = 'f0000000-0000-0000-0000-000000000006' and type = 'sighting_validated'),
  0, 'no +10 is minted for a deleted author');

-- ---------------------------------------------------------------------------
-- Scenario 9 · malformed config must not brick verification (Codex review,
-- HIGH): a bare ::integer cast would abort every confirmation INSERT from
-- inside the trigger. A non-integer threshold falls back to 1 — the insert
-- lives and consolidation still behaves.
-- ---------------------------------------------------------------------------

update public.app_config set value = 'tres' where key = 'validation_threshold';

select lives_ok(
  $$ insert into public.verifications (sighting_id, user_id, type)
     values ('f0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-00000000000b', 'confirm_exists') $$,
  'a malformed validation_threshold does not abort the confirmation insert');

select is(
  (select moderation_status from public.sightings where id = 'f0000000-0000-0000-0000-000000000007'),
  'approved', 'the malformed threshold falls back to 1 (never to 0, never an exception)');

update public.app_config set value = '1' where key = 'validation_threshold';

select * from finish();
rollback;
