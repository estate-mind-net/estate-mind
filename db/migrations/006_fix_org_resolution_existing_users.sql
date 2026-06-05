-- Migration 006: Fix active organization resolution for existing users
--
-- Problem: Existing users have profiles.organization_id set, but have no row in
-- organization_members. All RLS policies on organizations, properties, and
-- opportunities check organization_members via is_org_member(), so those users
-- can neither read their org nor create opportunities.
--
-- Fix:
--   1. Backfill organization_members for existing users.
--   2. Update is_org_member() to also accept profiles.organization_id as fallback.
--   3. Add an alternate SELECT policy on organizations via profiles.organization_id
--      so the auth context can load the org even if member row is still missing.

-- 1. Backfill organization_members rows for existing users.
insert into public.organization_members (organization_id, user_id, role)
select p.organization_id, p.user_id, 'owner'
from public.profiles p
where p.organization_id is not null
  and p.user_id is not null
  and not exists (
    select 1
    from public.organization_members om
    where om.user_id = p.user_id
      and om.organization_id = p.organization_id
  )
on conflict (organization_id, user_id) do nothing;

-- 2. Update is_org_member() to also check profiles.organization_id as fallback.
--    This ensures properties/opportunities insert policies work for users whose
--    organization_members row may be missing due to data inconsistency.
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.organization_id = org_id
      and p.user_id = auth.uid()
  );
$$;

-- 3. Add a direct-profile SELECT policy on organizations so the auth context can
--    resolve the org even when organization_members is empty for the user.
drop policy if exists "organizations_select_direct" on public.organizations;
create policy "organizations_select_direct"
  on public.organizations
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.organization_id = organizations.id
        and p.user_id = auth.uid()
    )
  );
