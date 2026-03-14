-- Subcontractors / Team Members
create table if not exists public.subcontractors (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) not null,
  name text not null,
  email text,
  phone text,
  address text, 
  communication_preference text check (communication_preference in ('email', 'sms', 'phone')) default 'email',
  trade text, -- e.g. 'Electrician', 'Plumber'
  status text check (status in ('active', 'inactive')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.subcontractors enable row level security;

create policy "Users can view subcontractors in their organization"
  on public.subcontractors for select
  using (
    organization_id in (
      select organization_id from public.user_profiles
      where id = auth.uid()
    )
  );

create policy "Users can insert subcontractors in their organization"
  on public.subcontractors for insert
  with check (
    organization_id in (
      select organization_id from public.user_profiles
      where id = auth.uid()
    )
  );

create policy "Users can update subcontractors in their organization"
  on public.subcontractors for update
  using (
    organization_id in (
      select organization_id from public.user_profiles
      where id = auth.uid()
    )
  );

create policy "Users can delete subcontractors in their organization"
  on public.subcontractors for delete
  using (
    organization_id in (
      select organization_id from public.user_profiles
      where id = auth.uid()
    )
  );
