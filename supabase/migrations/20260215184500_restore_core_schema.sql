
-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Organizations
create table if not exists public.organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.organizations enable row level security;

create policy "Users can view their own organization"
  on public.organizations for select
  using (
    id in (
      select organization_id from public.user_profiles
      where id = auth.uid()
    )
  );

-- User Profiles
create table if not exists public.user_profiles (
  id uuid references auth.users on delete cascade not null primary key,
  organization_id uuid references public.organizations(id),
  full_name text,
  email text,
  role text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_profiles enable row level security;

create policy "Users can view their own profile"
  on public.user_profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile"
  on public.user_profiles for update
  using ( auth.uid() = id );

-- Clients
create table if not exists public.clients (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) not null,
  name text not null,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.clients enable row level security;

create policy "Users can view clients in their organization"
  on public.clients for select
  using (
    organization_id in (
      select organization_id from public.user_profiles
      where id = auth.uid()
    )
  );

create policy "Users can insert clients in their organization"
  on public.clients for insert
  with check (
    organization_id in (
      select organization_id from public.user_profiles
      where id = auth.uid()
    )
  );

create policy "Users can update clients in their organization"
  on public.clients for update
  using (
    organization_id in (
      select organization_id from public.user_profiles
      where id = auth.uid()
    )
  );

-- Trigger to create profile on signup (handling the case where it might fail)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, full_name, avatar_url, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid duplication error on restore
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
