-- Enable RLS for quote_line_items (already enabled, just ensuring)
alter table public.quote_line_items enable row level security;

-- Policy for INSERT
create policy "Users can insert quote line items for their org's jobs"
on public.quote_line_items for insert
with check (
  job_id in (
    select id from public.jobs
    where organization_id in (
      select organization_id from public.user_profiles
      where id = auth.uid()
    )
  )
);

-- Policy for UPDATE
create policy "Users can update quote line items for their org's jobs"
on public.quote_line_items for update
using (
  job_id in (
    select id from public.jobs
    where organization_id in (
      select organization_id from public.user_profiles
      where id = auth.uid()
    )
  )
);

-- Policy for DELETE
create policy "Users can delete quote line items for their org's jobs"
on public.quote_line_items for delete
using (
  job_id in (
    select id from public.jobs
    where organization_id in (
      select organization_id from public.user_profiles
      where id = auth.uid()
    )
  )
);
