-- AI findings: normalized evidence separate from generated report text.
create table if not exists public.ai_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  category text not null,
  title text not null,
  finding_type text not null,
  confidence integer,
  source_type text not null,
  evidence text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_findings_finding_type_check
    check (finding_type in ('fact', 'estimate', 'assumption', 'risk', 'opportunity', 'missing_evidence')),
  constraint ai_findings_source_type_check
    check (source_type in ('user_input', 'listing', 'uploaded_document', 'portal', 'market_api', 'ai_inference')),
  constraint ai_findings_confidence_check
    check (confidence is null or (confidence >= 0 and confidence <= 100))
);

create index if not exists idx_ai_findings_opportunity_id on public.ai_findings(opportunity_id);
create index if not exists idx_ai_findings_organization_id on public.ai_findings(organization_id);
create index if not exists idx_ai_findings_finding_type on public.ai_findings(finding_type);

alter table public.ai_findings enable row level security;

drop policy if exists ai_findings_select_org on public.ai_findings;
create policy ai_findings_select_org
  on public.ai_findings
  for select
  using (public.is_org_member(organization_id));

drop policy if exists ai_findings_insert_org on public.ai_findings;
create policy ai_findings_insert_org
  on public.ai_findings
  for insert
  with check (public.is_org_member(organization_id));

drop policy if exists ai_findings_update_org on public.ai_findings;
create policy ai_findings_update_org
  on public.ai_findings
  for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists ai_findings_delete_org on public.ai_findings;
create policy ai_findings_delete_org
  on public.ai_findings
  for delete
  using (public.is_org_member(organization_id));
