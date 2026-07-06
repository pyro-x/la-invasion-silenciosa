-- LCHP-12 · Per-user/day quota on sighting creation (D-032, brief §30).
--
-- The LCHP-3 spike proved this trigger against real anonymous/registered
-- sessions, reading is_anonymous from the caller's JWT. One redesign now
-- that inserts arrive via the Edge Function's service role (D-037): the
-- JWT belongs to the service, not the user, so anonymity is derived from
-- auth.users.is_anonymous for the row's created_by instead. This keeps the
-- trigger the source of truth for EVERY entry path — service role included,
-- since triggers fire regardless of role and RLS.
--
-- Limits are brief §30's literals (2/day anonymous, 5/day registered);
-- moving them to app_config stays a one-line migration if the pilot needs
-- tuning. Day boundary is UTC (the database's clock) — a pilot-acceptable
-- approximation of Madrid midnight, same as the spike.

create function private.enforce_sighting_daily_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_anon boolean;
  quota integer;
  used integer;
begin
  -- Authorless rows (created_by set null after account deletion, or manual
  -- administrative inserts) are not quota material.
  if new.created_by is null then
    return new;
  end if;

  -- Serialize same-user inserts for the day: count-then-insert races under
  -- READ COMMITTED (Codex adversarial review — N parallel requests could
  -- all pass the count before any sibling commits). The advisory lock is
  -- transaction-scoped (released at commit/rollback) and keyed per user and
  -- UTC day, so different users never contend.
  perform pg_advisory_xact_lock(
    hashtextextended(
      'sighting_quota:' || new.created_by::text || ':'
        || to_char(now() at time zone 'utc', 'YYYY-MM-DD'),
      0
    )
  );

  select coalesce(u.is_anonymous, false)
    into is_anon
    from auth.users u
   where u.id = new.created_by;

  quota := case when is_anon then 2 else 5 end;

  select count(*)
    into used
    from public.sightings s
   where s.created_by = new.created_by
     and s.created_at >= date_trunc('day', now());

  if used >= quota then
    raise exception 'daily quota exceeded: % of % used', used, quota;
  end if;

  return new;
end;
$$;

create trigger enforce_sighting_daily_quota
  before insert on public.sightings
  for each row execute function private.enforce_sighting_daily_quota();
