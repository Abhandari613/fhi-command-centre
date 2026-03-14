-- Safely add address column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'subcontractors' and column_name = 'address') then
    alter table public.subcontractors add column address text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'subcontractors' and column_name = 'communication_preference') then
    alter table public.subcontractors add column communication_preference text check (communication_preference in ('email', 'sms', 'phone')) default 'email';
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'subcontractors' and column_name = 'trade') then
      alter table public.subcontractors add column trade text;
  end if;
end $$;
