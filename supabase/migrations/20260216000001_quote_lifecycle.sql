-- 1. Create client_locations table
create table if not exists public.client_locations (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade not null,
  name text not null, -- e.g. "Main House", "Rental Unit"
  address text not null,
  is_primary boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.client_locations enable row level security;

-- Policies for client_locations
create policy "Users can view locations for their org clients"
  on public.client_locations for select
  using (
    client_id in (
      select id from public.clients
      where organization_id in (
        select organization_id from public.user_profiles
        where id = auth.uid()
      )
    )
  );

create policy "Users can insert locations for their org clients"
  on public.client_locations for insert
  with check (
    client_id in (
      select id from public.clients
      where organization_id in (
        select organization_id from public.user_profiles
        where id = auth.uid()
      )
    )
  );

create policy "Users can update locations for their org clients"
  on public.client_locations for update
  using (
    client_id in (
      select id from public.clients
      where organization_id in (
        select organization_id from public.user_profiles
        where id = auth.uid()
      )
    )
  );

-- 2. Create job_events table (Chronology)
create table if not exists public.job_events (
  id uuid default uuid_generate_v4() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  event_type text not null, -- 'created', 'email_sent', 'viewed', 'reminder_sent', 'replied', 'approved', 'declined'
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.job_events enable row level security;

-- Policies for job_events
create policy "Users can view events for their org jobs"
  on public.job_events for select
  using (
    job_id in (
      select id from public.jobs
      where organization_id in (
        select organization_id from public.user_profiles
        where id = auth.uid()
      )
    )
  );

create policy "Users can insert events for their org jobs"
  on public.job_events for insert
  with check (
    job_id in (
      select id from public.jobs
      where organization_id in (
        select organization_id from public.user_profiles
        where id = auth.uid()
      )
    )
  );

-- 3. Update jobs table
alter table public.jobs 
add column if not exists location_id uuid references public.client_locations(id),
add column if not exists quote_expiry_date date,
add column if not exists last_contact_date timestamp with time zone,
add column if not exists next_reminder_date timestamp with time zone;
