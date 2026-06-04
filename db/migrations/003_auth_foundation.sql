create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subscription_tier text not null default 'starter',
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id),
  constraint organization_members_role_check check (role in ('owner', 'admin', 'member'))
);

create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_organization_members_user_id on public.organization_members(user_id);
create index if not exists idx_organization_members_organization_id on public.organization_members(organization_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  created_organization_id uuid;
  derived_full_name text;
  derived_org_name text;
begin
  derived_full_name := nullif(coalesce(new.raw_user_meta_data ->> 'full_name', ''), '');
  derived_org_name := coalesce(derived_full_name, split_part(new.email, '@', 1)) || '''s Organization';

  insert into public.profiles (user_id, full_name, email)
  values (new.id, derived_full_name, new.email)
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        email = excluded.email;

  insert into public.organizations (name)
  values (derived_org_name)
  returning id into created_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (created_organization_id, new.id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member"
  on public.organizations
  for select
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = organizations.id
        and om.user_id = auth.uid()
    )
  );

drop policy if exists "organization_members_select_own" on public.organization_members;
create policy "organization_members_select_own"
  on public.organization_members
  for select
  using (auth.uid() = user_id);

drop policy if exists "organization_members_insert_self" on public.organization_members;
create policy "organization_members_insert_self"
  on public.organization_members
  for insert
  with check (auth.uid() = user_id);

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'opportunities') then
    execute 'alter table public.opportunities enable row level security';

    execute 'drop policy if exists opportunities_select_org on public.opportunities';
    execute $sql$create policy opportunities_select_org
      on public.opportunities
      for select
      using (
        organization_id in (
          select organization_id
          from public.organization_members
          where user_id = auth.uid()
        )
      )$sql$;

    execute 'drop policy if exists opportunities_insert_org on public.opportunities';
    execute $sql$create policy opportunities_insert_org
      on public.opportunities
      for insert
      with check (
        organization_id in (
          select organization_id
          from public.organization_members
          where user_id = auth.uid()
        )
      )$sql$;

    execute 'drop policy if exists opportunities_update_org on public.opportunities';
    execute $sql$create policy opportunities_update_org
      on public.opportunities
      for update
      using (
        organization_id in (
          select organization_id
          from public.organization_members
          where user_id = auth.uid()
        )
      )
      with check (
        organization_id in (
          select organization_id
          from public.organization_members
          where user_id = auth.uid()
        )
      )$sql$;
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'analyses') then
    execute 'alter table public.analyses enable row level security';

    execute 'drop policy if exists analyses_select_org on public.analyses';
    execute $sql$create policy analyses_select_org
      on public.analyses
      for select
      using (
        organization_id in (
          select organization_id
          from public.organization_members
          where user_id = auth.uid()
        )
      )$sql$;

    execute 'drop policy if exists analyses_insert_org on public.analyses';
    execute $sql$create policy analyses_insert_org
      on public.analyses
      for insert
      with check (
        organization_id in (
          select organization_id
          from public.organization_members
          where user_id = auth.uid()
        )
      )$sql$;
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'deal_analyses') then
    execute 'alter table public.deal_analyses enable row level security';

    execute 'drop policy if exists deal_analyses_select_org on public.deal_analyses';
    execute $sql$create policy deal_analyses_select_org
      on public.deal_analyses
      for select
      using (
        organization_id in (
          select organization_id
          from public.organization_members
          where user_id = auth.uid()
        )
      )$sql$;

    execute 'drop policy if exists deal_analyses_insert_org on public.deal_analyses';
    execute $sql$create policy deal_analyses_insert_org
      on public.deal_analyses
      for insert
      with check (
        organization_id in (
          select organization_id
          from public.organization_members
          where user_id = auth.uid()
        )
      )$sql$;
  end if;
end;
$$;
