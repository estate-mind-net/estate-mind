create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
  );
$$;

do $$
declare
  tbl text;
  table_names text[] := array['opportunities', 'properties', 'deal_analyses', 'documents', 'notes', 'tasks'];
begin
  foreach tbl in array table_names
  loop
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = tbl
    ) and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = tbl
        and column_name = 'organization_id'
    ) then
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
    end if;
  end loop;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'opportunities'
      and column_name = 'created_by'
  ) then
    execute 'drop policy if exists opportunities_insert_org on public.opportunities';
    execute 'create policy opportunities_insert_org on public.opportunities for insert with check (public.is_org_member(organization_id) and (created_by is null or created_by = auth.uid()))';
  end if;
end;
$$;
