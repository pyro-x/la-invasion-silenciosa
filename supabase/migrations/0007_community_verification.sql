-- LCHP-15 · Community verification: provisional anonymous confirmations,
-- server-side consolidation, retroactive activation on registration.
--
-- Model (D-054, amends D-038): ANYONE — anonymous sessions included — may
-- INSERT a confirmation; whether it COUNTS is decided server-side. While
-- app_config.verification_requires_registration = 'true' (the default), a
-- confirmation from an anonymous session is stored as provisional support
-- (status stays 'pending', no count, no points), so the sybil cost of
-- flipping map state or minting points remains one email — the LCHP-11
-- incognito self-validation attack stays dead. When the verifier later
-- registers (same uid, LCHP-3), their confirmations activate retroactively:
-- they count toward thresholds and collect their +5s.
--
-- Concurrency contract (binding, LCHP-11 review round 2): the sighting row
-- lock in consolidate_sighting() is THE serialization point. The pending →
-- approved transition happens exactly once, and points are awarded only on
-- rows that have not been paid, re-read under that lock.

-- Operational switch (D-054): flipping to 'false' makes anonymous
-- confirmations count fully — an UPDATE, not a deploy (same lever as
-- validation_threshold). A missing key fails closed (registration required).
insert into public.app_config (key, value)
values ('verification_requires_registration', 'true')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- RLS: the INSERT path opens to anonymous sessions (provisional support).
-- Everything else is unchanged: own uid only, target must be a currently
-- pending sighting the caller did not author (private helper from 0004),
-- column privileges still block status/points_awarded.
-- ---------------------------------------------------------------------------

drop policy "verifications_insert_own_registered" on public.verifications;

create policy "verifications_insert_own"
  on public.verifications
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and private.verification_target_is_valid(sighting_id)
  );

-- ---------------------------------------------------------------------------
-- Config readers (fail-safe defaults, D-041-style derivation from the
-- database instead of trusting any JWT).
-- ---------------------------------------------------------------------------

create function private.verification_requires_registration()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select c.value from public.app_config c
      where c.key = 'verification_requires_registration'),
    'true'
  ) <> 'false';
$$;

create function private.validation_threshold()
returns integer
language sql
security definer
set search_path = ''
stable
as $$
  -- Defensive parse (Codex adversarial review, HIGH): a bare ::integer cast
  -- would RAISE on a malformed value — and since this runs inside the AFTER
  -- INSERT trigger, one config typo would abort every confirmation in
  -- production. Non-integer values fall back to 1 (the pilot value), never
  -- to 0, which would validate sightings with no confirmations at all.
  select greatest(1, coalesce(
    (select case when c.value ~ '^\d+$' then c.value::integer end
       from public.app_config c
      where c.key = 'validation_threshold'),
    1
  ));
$$;

revoke execute on function private.verification_requires_registration() from public;
revoke execute on function private.validation_threshold() from public;

-- ---------------------------------------------------------------------------
-- Consolidation core, shared by the INSERT trigger and the registration
-- activation trigger. All the sensitive work happens here, inside the
-- calling transaction, behind the sighting row lock.
-- ---------------------------------------------------------------------------

create function private.consolidate_sighting(target_sighting uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  author uuid;
  author_paid boolean;
  requires_registration boolean;
  counting integer;
  confirmation record;
begin
  -- THE serialization point (LCHP-11 contract): concurrent consolidations
  -- of the same sighting queue on this lock, so the count, the threshold
  -- comparison and the transition below are race-free.
  select s.moderation_status, s.created_by, s.points_awarded
    into current_status, author, author_paid
    from public.sightings s
   where s.id = target_sighting
   for update;

  if not found then
    return;
  end if;

  requires_registration := private.verification_requires_registration();

  -- Confirmations that count: registered verifiers always, anonymous ones
  -- only while the switch is open. The author exclusion is defense in
  -- depth — RLS already blocks self-verification, but this function must
  -- hold on its own for any future entry path.
  select count(*)
    into counting
    from public.verifications v
    join auth.users u on u.id = v.user_id
   where v.sighting_id = target_sighting
     and v.type = 'confirm_exists'
     and v.user_id is distinct from author
     and (not requires_registration or not coalesce(u.is_anonymous, false));

  update public.sightings
     set verification_count = counting
   where id = target_sighting;

  if current_status <> 'pending' then
    -- Already transitioned: a lost race, or a provisional confirmation
    -- activating after approval. Pay any counting-but-unpaid confirmation
    -- (David's rule: every confirming verifier earns +5) and stop — the
    -- transition and the author's +10 happened exactly once already.
    if current_status = 'approved' then
      perform private.pay_confirmations(target_sighting, author, requires_registration);
    end if;
    return;
  end if;

  if counting < private.validation_threshold() then
    return;
  end if;

  -- The atomic transition the LCHP-11 contract demands. Under the row lock
  -- the WHERE is belt and braces, but it keeps the invariant local: points
  -- below this line exist only because THIS statement changed one row.
  update public.sightings
     set moderation_status = 'approved',
         confidence = 'community_verified'
   where id = target_sighting
     and moderation_status = 'pending';

  if not found then
    return;
  end if;

  -- +10 for the author, exactly once (points_awarded re-read under the
  -- lock). Authorless sightings (account deleted) transition without pay.
  if author is not null and not author_paid then
    insert into public.point_events (user_id, sighting_id, type, points)
    values (author, target_sighting, 'sighting_validated', 10);

    update public.profiles
       set total_points = total_points + 10,
           weekly_points = weekly_points + 10
     where id = author;

    update public.sightings
       set points_awarded = true,
           points_awarded_at = now()
     where id = target_sighting;
  end if;

  perform private.pay_confirmations(target_sighting, author, requires_registration);
end;
$$;

-- +5 per counting confirmation not yet paid: accept it, ledger it, cache it.
-- points_awarded on each verification row is the exactly-once guard; every
-- caller holds the sighting row lock, so no two payers ever see the same
-- unpaid row.
create function private.pay_confirmations(
  target_sighting uuid,
  author uuid,
  requires_registration boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  confirmation record;
begin
  for confirmation in
    select v.id, v.user_id
      from public.verifications v
      join auth.users u on u.id = v.user_id
     where v.sighting_id = target_sighting
       and v.type = 'confirm_exists'
       and v.points_awarded = false
       and v.user_id is distinct from author
       and (not requires_registration or not coalesce(u.is_anonymous, false))
  loop
    update public.verifications
       set status = 'accepted',
           points_awarded = true
     where id = confirmation.id;

    insert into public.point_events
      (user_id, sighting_id, verification_id, type, points)
    values
      (confirmation.user_id, target_sighting, confirmation.id,
       'verification_accepted', 5);

    update public.profiles
       set total_points = total_points + 5,
           weekly_points = weekly_points + 5
     where id = confirmation.user_id;
  end loop;
end;
$$;

revoke execute on function private.consolidate_sighting(uuid) from public;
revoke execute on function private.pay_confirmations(uuid, uuid, boolean) from public;

-- ---------------------------------------------------------------------------
-- Trigger 1: every confirmation tries to consolidate — unless it is
-- provisional (anonymous verifier while the switch is closed), in which
-- case the row simply sits there as neighborhood support until its owner
-- registers. Anonymity is derived from auth.users, never the JWT (D-041).
-- ---------------------------------------------------------------------------

create function private.consolidate_on_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  verifier_is_anon boolean;
begin
  if new.type <> 'confirm_exists' then
    return null;
  end if;

  select coalesce(u.is_anonymous, false)
    into verifier_is_anon
    from auth.users u
   where u.id = new.user_id;

  if verifier_is_anon and private.verification_requires_registration() then
    return null; -- provisional support (D-054): stored, not counted yet
  end if;

  perform private.consolidate_sighting(new.sighting_id);
  return null;
end;
$$;

create trigger consolidate_on_verification
  after insert on public.verifications
  for each row execute function private.consolidate_on_verification();

-- ---------------------------------------------------------------------------
-- Trigger 2: retroactive activation (D-054). When an anonymous user
-- registers (GoTrue flips is_anonymous on the SAME auth.users row —
-- verified in LCHP-3), their stored confirmations start counting: each
-- affected sighting re-consolidates, which may validate it now, and their
-- accumulated +5s get paid. Plain AFTER UPDATE with a WHEN filter rather
-- than UPDATE OF, so it fires regardless of which columns GoTrue lists.
-- ---------------------------------------------------------------------------

create function private.activate_verifications_on_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  for target in
    select distinct v.sighting_id
      from public.verifications v
     where v.user_id = new.id
       and v.type = 'confirm_exists'
       and v.points_awarded = false
  loop
    perform private.consolidate_sighting(target);
  end loop;
  return new;
end;
$$;

revoke execute on function private.consolidate_on_verification() from public;
revoke execute on function private.activate_verifications_on_registration() from public;

create trigger on_auth_user_registered
  after update on auth.users
  for each row
  when (coalesce(old.is_anonymous, false) and not coalesce(new.is_anonymous, false))
  execute function private.activate_verifications_on_registration();
