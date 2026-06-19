-- Complete the owner profile created during registration and keep
-- account-level preferences separate from landlord payment information.
-- Run after 0009_block_contracts_for_maintenance_rooms.sql.

alter table owner_profiles
add column if not exists bank_name text,
add column if not exists bank_account_number text,
add column if not exists bank_account_holder text;

create table account_preferences (
  account_id uuid primary key references accounts(id) on delete cascade,
  zalo_reminder boolean not null default true,
  email_report boolean not null default true,
  contract_expiry boolean not null default true,
  overdue_payment boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger account_preferences_set_updated_at
before update on account_preferences
for each row execute function set_updated_at();

alter table account_preferences enable row level security;

grant select, insert, update, delete on table account_preferences
to authenticated;

create policy "Users can manage their own account preferences"
on account_preferences for all to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

-- Create the landlord profile from the name already collected at sign-up.
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

  insert into public.account_preferences (account_id)
  values (new.id)
  on conflict (account_id) do nothing;

  return new;
exception
  when unique_violation then
    raise exception 'phone_already_registered';
end;
$$;

-- Backfill profiles and preferences for accounts created before this migration.
insert into owner_profiles (account_id, full_name)
select
  users.id,
  btrim(users.raw_user_meta_data->>'full_name')
from auth.users as users
where nullif(btrim(users.raw_user_meta_data->>'full_name'), '') is not null
on conflict (account_id) do nothing;

-- Backfill registration phone numbers for accounts created before this migration.
update accounts as account
set
  phone = coalesce(
    auth_user.phone,
    auth_user.raw_user_meta_data->>'phone'
  ),
  phone_normalized = private.normalize_vietnam_phone(
    coalesce(
      auth_user.phone,
      auth_user.raw_user_meta_data->>'phone'
    )
  ),
  updated_at = now()
from auth.users as auth_user
where account.id = auth_user.id
  and account.phone is null
  and nullif(
    btrim(
      coalesce(
        auth_user.phone,
        auth_user.raw_user_meta_data->>'phone'
      )
    ),
    ''
  ) is not null;

insert into account_preferences (account_id)
select id from accounts
on conflict (account_id) do nothing;

-- Migrate and remove the earlier mixed-purpose table if it was already run.
do $$
begin
  if to_regclass('public.account_settings') is not null then
    execute $migration$
      update public.owner_profiles as profiles
      set
        bank_name = settings.bank_name,
        bank_account_number = settings.bank_account_number,
        bank_account_holder = settings.bank_account_holder
      from public.account_settings as settings
      where profiles.account_id = settings.account_id
    $migration$;

    execute $migration$
      insert into public.account_preferences (
        account_id,
        zalo_reminder,
        email_report,
        contract_expiry,
        overdue_payment
      )
      select
        account_id,
        zalo_reminder,
        email_report,
        contract_expiry,
        overdue_payment
      from public.account_settings
      on conflict (account_id) do update
      set
        zalo_reminder = excluded.zalo_reminder,
        email_report = excluded.email_report,
        contract_expiry = excluded.contract_expiry,
        overdue_payment = excluded.overdue_payment
    $migration$;

    execute 'drop table public.account_settings cascade';
  end if;
end;
$$;
