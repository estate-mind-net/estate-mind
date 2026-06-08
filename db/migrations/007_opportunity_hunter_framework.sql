-- Migration 007: Opportunity Hunter framework

create extension if not exists pgcrypto;

create table if not exists public.investment_search_briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  countries text[] not null default '{}',
  cities text[] not null default '{}',
  districts text[] not null default '{}',
  min_price numeric,
  max_price numeric,
  currency text,
  min_size_m2 numeric,
  max_size_m2 numeric,
  property_types text[] not null default '{}',
  rental_strategy text not null default 'mixed' check (rental_strategy in ('long_term', 'airbnb', 'flip', 'mixed')),
  target_yield numeric,
  risk_tolerance text not null default 'medium' check (risk_tolerance in ('low', 'medium', 'high')),
  renovation_preference text not null default 'any' check (renovation_preference in ('none', 'light', 'heavy', 'any')),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_investment_search_briefs_org on public.investment_search_briefs(organization_id);
create index if not exists idx_investment_search_briefs_active on public.investment_search_briefs(organization_id, is_active);

create table if not exists public.opportunity_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  type text not null,
  source_url text,
  seed_urls text[] not null default '{}',
  connector_config jsonb not null default '{}'::jsonb,
  terms_checked boolean not null default false,
  allowed_use_notes text,
  rate_limit_per_hour integer,
  contact_email text,
  is_enabled boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_opportunity_sources_org on public.opportunity_sources(organization_id);
create index if not exists idx_opportunity_sources_enabled on public.opportunity_sources(organization_id, is_enabled);

create table if not exists public.source_connector_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid references public.opportunity_sources(id) on delete set null,
  brief_id uuid references public.investment_search_briefs(id) on delete set null,
  connector_name text not null,
  connector_type text not null,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed', 'partial')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  opportunities_fetched integer not null default 0,
  opportunities_inserted integer not null default 0,
  opportunities_deduplicated integer not null default 0,
  opportunities_matched integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_source_connector_runs_org on public.source_connector_runs(organization_id, started_at desc);
create index if not exists idx_source_connector_runs_source on public.source_connector_runs(source_id, started_at desc);

create table if not exists public.raw_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid references public.opportunity_sources(id) on delete set null,
  connector_run_id uuid references public.source_connector_runs(id) on delete set null,
  external_id text,
  source_url text,
  title text not null,
  description text,
  country text,
  city text,
  district text,
  price numeric,
  currency text,
  size_m2 numeric,
  bedrooms numeric,
  property_type text,
  raw_payload jsonb not null default '{}'::jsonb,
  normalized_payload jsonb not null default '{}'::jsonb,
  dedupe_key text,
  is_duplicate boolean not null default false,
  canonical_raw_opportunity_id uuid references public.raw_opportunities(id) on delete set null,
  discovered_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_raw_opportunities_org on public.raw_opportunities(organization_id, created_at desc);
create index if not exists idx_raw_opportunities_source_url on public.raw_opportunities(source_url);
create index if not exists idx_raw_opportunities_external on public.raw_opportunities(source_id, external_id);
create index if not exists idx_raw_opportunities_dedupe_key on public.raw_opportunities(organization_id, dedupe_key);

create table if not exists public.opportunity_matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  brief_id uuid not null references public.investment_search_briefs(id) on delete cascade,
  raw_opportunity_id uuid not null references public.raw_opportunities(id) on delete cascade,
  source_id uuid references public.opportunity_sources(id) on delete set null,
  match_score integer not null check (match_score >= 0 and match_score <= 100),
  match_reasons jsonb not null default '[]'::jsonb,
  mismatch_reasons jsonb not null default '[]'::jsonb,
  missing_data jsonb not null default '[]'::jsonb,
  suggested_next_step text,
  rank_score numeric not null default 0,
  ai_analysis jsonb,
  ai_investment_score integer,
  recommendation text,
  is_top_match boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brief_id, raw_opportunity_id)
);

create index if not exists idx_opportunity_matches_org on public.opportunity_matches(organization_id, created_at desc);
create index if not exists idx_opportunity_matches_brief_score on public.opportunity_matches(brief_id, match_score desc);
create index if not exists idx_opportunity_matches_top on public.opportunity_matches(organization_id, is_top_match, rank_score desc);

create table if not exists public.discovery_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  brief_id uuid references public.investment_search_briefs(id) on delete cascade,
  raw_opportunity_id uuid references public.raw_opportunities(id) on delete cascade,
  match_id uuid references public.opportunity_matches(id) on delete set null,
  alert_type text not null default 'new_match' check (alert_type in ('new_match', 'high_match', 'source_failure', 'discovery_run')),
  title text not null,
  message text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_discovery_alerts_org on public.discovery_alerts(organization_id, created_at desc);
create index if not exists idx_discovery_alerts_unread on public.discovery_alerts(organization_id, is_read);

create or replace function public.set_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_investment_search_briefs_updated_at on public.investment_search_briefs;
create trigger trg_investment_search_briefs_updated_at
before update on public.investment_search_briefs
for each row execute function public.set_timestamp_updated_at();

drop trigger if exists trg_opportunity_sources_updated_at on public.opportunity_sources;
create trigger trg_opportunity_sources_updated_at
before update on public.opportunity_sources
for each row execute function public.set_timestamp_updated_at();

drop trigger if exists trg_opportunity_matches_updated_at on public.opportunity_matches;
create trigger trg_opportunity_matches_updated_at
before update on public.opportunity_matches
for each row execute function public.set_timestamp_updated_at();

do $$
declare
  tbl text;
  table_names text[] := array[
    'investment_search_briefs',
    'opportunity_sources',
    'source_connector_runs',
    'raw_opportunities',
    'opportunity_matches',
    'discovery_alerts'
  ];
begin
  foreach tbl in array table_names
  loop
    execute format('alter table public.%I enable row level security', tbl);

    execute format('drop policy if exists %I_select_org on public.%I', tbl, tbl);
    execute format(
      'create policy %I_select_org on public.%I for select using (public.is_org_member(organization_id))',
      tbl,
      tbl
    );

    execute format('drop policy if exists %I_insert_org on public.%I', tbl, tbl);
    execute format(
      'create policy %I_insert_org on public.%I for insert with check (public.is_org_member(organization_id))',
      tbl,
      tbl
    );

    execute format('drop policy if exists %I_update_org on public.%I', tbl, tbl);
    execute format(
      'create policy %I_update_org on public.%I for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))',
      tbl,
      tbl
    );

    execute format('drop policy if exists %I_delete_org on public.%I', tbl, tbl);
    execute format(
      'create policy %I_delete_org on public.%I for delete using (public.is_org_member(organization_id))',
      tbl,
      tbl
    );
  end loop;
end;
$$;
