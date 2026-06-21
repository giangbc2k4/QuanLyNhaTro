-- Remove the unused notification preferences feature.
-- Run after 0017_limit_meter_confirmation_per_month.sql.

drop table if exists account_preferences cascade;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  registered_name text;
  registered_phone text;
begin
  registered_name := nullif(btrim(new.raw_user_meta_data->>'full_name'), '');
  registered_phone := coalesce(new.phone, new.raw_user_meta_data->>'phone');

  insert into public.accounts (id, email, phone, phone_normalized)
  values (
    new.id,
    new.email,
    registered_phone,
    private.normalize_vietnam_phone(registered_phone)
  )
  on conflict (id) do update
  set
    email = excluded.email,
    phone = excluded.phone,
    phone_normalized = excluded.phone_normalized,
    updated_at = now();

  if registered_name is not null then
    insert into public.owner_profiles (account_id, full_name)
    values (new.id, registered_name)
    on conflict (account_id) do nothing;
  end if;

  return new;
exception
  when unique_violation then
    raise exception 'phone_already_registered';
end;
$$;
