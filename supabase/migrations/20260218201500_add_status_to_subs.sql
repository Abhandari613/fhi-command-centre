-- Safely add status column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'subcontractors' and column_name = 'status') then
    alter table public.subcontractors add column status text check (status in ('active', 'inactive')) default 'active';
  end if;
end $$;
