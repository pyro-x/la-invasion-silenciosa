-- LCHP-10 · Initial schema per brief-tecnico.md §14 (mirror kept in sync).
--
-- State fields use text + CHECK constraints instead of Postgres enums
-- (D-034): adding a state later is a one-line constraint swap instead of
-- ALTER TYPE ceremony, and generated TS types are identical either way.
--
-- RLS is ENABLED on every table with ZERO policies on purpose: the
-- hosted project is live with anonymous sign-ins, so tables must be born
-- deny-all. Policies (and the public map view) are LCHP-11's scope.

-- PostGIS now, plain double precision columns for the MVP (D-035):
-- enabling the extension is free-tier-cheap and M3+ distance queries
-- (nearby sightings, brief §21+) will need it; migrating columns to
-- geography can happen later without churn.
create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Trigger functions
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.species (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  dex_number text not null unique,
  name text not null,
  rarity text not null
    check (rarity in ('común', 'frecuente', 'raro', 'legendario')),
  description text not null,
  habitat text not null,
  tracking_tip text not null,
  points integer not null default 10 check (points > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'user'
    check (role in ('user', 'trusted_contributor', 'moderator', 'admin')),
  total_points integer not null default 0,
  weekly_points integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.sightings (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.species (id) on delete restrict,
  -- SET NULL per brief §14: deleting an account must not erase the map.
  created_by uuid references public.profiles (id) on delete set null,

  lat_public double precision not null,
  lng_public double precision not null,
  lat_private double precision,
  lng_private double precision,
  location_accuracy_m double precision,

  photo_path text,
  photo_blurred_path text,
  photo_thumbnail_path text,

  moderation_status text not null default 'pending'
    check (moderation_status in
      ('pending', 'needs_review', 'auto_rejected', 'approved', 'rejected', 'removed')),
  confidence text not null default 'unverified'
    check (confidence in
      ('unverified', 'community_verified', 'moderator_verified', 'disputed')),

  verification_count integer not null default 0 check (verification_count >= 0),
  report_count integer not null default 0 check (report_count >= 0),

  points_awarded boolean not null default false,
  points_awarded_at timestamptz,

  auto_moderation_provider text,
  auto_moderation_result jsonb,
  auto_moderation_score double precision,
  auto_moderation_flags text[],

  image_processing_status text not null default 'not_started'
    check (image_processing_status in ('not_started', 'processed', 'failed')),

  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  sighting_id uuid not null references public.sightings (id) on delete cascade,
  -- CASCADE: a verification without its verifier is meaningless, and
  -- account deletion (GDPR) must not be blocked by it.
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null
    check (type in ('confirm_exists', 'not_found', 'duplicate', 'problematic')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  note text,
  points_awarded boolean not null default false,
  created_at timestamptz not null default now(),
  unique (sighting_id, user_id)
);

create table public.point_events (
  id uuid primary key default gen_random_uuid(),
  -- CASCADE: point_events audit a user's points; when the profile is
  -- deleted (GDPR erasure) its ledger goes with it. RESTRICT would make
  -- account deletion impossible without a manual sweep.
  user_id uuid not null references public.profiles (id) on delete cascade,
  sighting_id uuid references public.sightings (id) on delete set null,
  verification_id uuid references public.verifications (id) on delete set null,
  type text not null
    check (type in
      ('sighting_validated', 'verification_accepted', 'video_bonus', 'manual_adjustment')),
  points integer not null,
  created_at timestamptz not null default now()
);

-- Post-MVP escape valve (brief §14, D-004): schema only, no UI.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  sighting_id uuid not null references public.sightings (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  reason text not null
    check (reason in
      ('person_visible', 'private_data_visible', 'wrong_location',
       'duplicate', 'offensive_content', 'other')),
  note text,
  status text not null default 'open'
    check (status in ('open', 'reviewed', 'dismissed', 'resolved')),
  created_at timestamptz not null default now()
);

-- Operational config editable without a deploy (D-005: validation_threshold).
create table public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index sightings_species_id_idx on public.sightings (species_id);
create index sightings_moderation_status_idx on public.sightings (moderation_status);
-- (created_by, created_at) serves the per-user/day quota count (brief §30, D-032).
create index sightings_created_by_created_at_idx on public.sightings (created_by, created_at);
create index point_events_user_id_created_at_idx on public.point_events (user_id, created_at);
create index point_events_sighting_id_idx on public.point_events (sighting_id);
create index point_events_verification_id_idx on public.point_events (verification_id);
create index reports_sighting_id_idx on public.reports (sighting_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger set_sightings_updated_at
  before update on public.sightings
  for each row execute function public.set_updated_at();

create trigger set_app_config_updated_at
  before update on public.app_config
  for each row execute function public.set_updated_at();

-- Create a profiles row for every new auth user (anonymous ones included:
-- they are permanent auth.users rows that may later upgrade, D-032).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS: deny-all baseline. NO policies here on purpose — they are LCHP-11's
-- scope (public map view, own-profile access, insert paths). With RLS
-- enabled and zero policies, anon/authenticated can read and write NOTHING.
-- ---------------------------------------------------------------------------

alter table public.species enable row level security;
alter table public.profiles enable row level security;
alter table public.sightings enable row level security;
alter table public.verifications enable row level security;
alter table public.point_events enable row level security;
alter table public.reports enable row level security;
alter table public.app_config enable row level security;
