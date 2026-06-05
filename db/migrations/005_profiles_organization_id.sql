-- Migration 005: Add organization_id to profiles and update trigger
-- This ensures new users immediately have an active organization after signup.

-- 1. Add organization_id column to profiles (nullable for backward compat).
alter table public.profiles
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index if not exists idx_profiles_organization_id on public.profiles(organization_id);

-- 2. Backfill organization_id for any existing profiles that are org owners.
update public.profiles p
set organization_id = om.organization_id
from public.organization_members om
where om.user_id = p.user_id
  and om.role = 'owner'
  and p.organization_id is null;

-- 3. Replace the trigger function to also set organization_id on profiles.
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

  -- Create or update the profile (without organization_id first, to satisfy FK ordering).
  insert into public.profiles (user_id, full_name, email)
  values (new.id, derived_full_name, new.email)
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        email = excluded.email;

  -- Create the organization.
  insert into public.organizations (name)
  values (derived_org_name)
  returning id into created_organization_id;

  -- Link user as owner.
  insert into public.organization_members (organization_id, user_id, role)
  values (created_organization_id, new.id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  -- Stamp organization_id back onto the profile.
  update public.profiles
  set organization_id = created_organization_id
  where user_id = new.id;

  return new;
end;
$$;
