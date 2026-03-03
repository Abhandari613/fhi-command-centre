Scanning 5 lines...
-- Create Subcontractors Table
create table if not exists public.subcontractors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text,
  phone text,
  organization_id uuid references public.organizations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Job Assignments Table
create table if not exists public.job_assignments (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  subcontractor_id uuid references public.subcontractors(id) on delete cascade not null,
  status text default 'assigned',
  magic_link_token uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
