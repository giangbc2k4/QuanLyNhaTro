create extension if not exists pgcrypto;

create schema if not exists private;

create type account_status as enum ('active', 'suspended', 'closed');
create type room_status as enum ('vacant', 'occupied', 'maintenance');
create type contract_status as enum ('draft', 'active', 'expiring', 'expired', 'terminated');
create type identity_owner_type as enum ('owner', 'tenant');
create type identity_verification_status as enum ('pending', 'ocr_completed', 'verified', 'rejected');

create table accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  phone text,
  phone_normalized text,
  status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table owner_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references accounts(id) on delete cascade,
  full_name text not null,
  date_of_birth date,
  gender text,
  hometown text,
  permanent_address text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tenants (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  date_of_birth date,
  gender text,
  hometown text,
  permanent_address text,
  occupation text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, phone)
);

create table identity_documents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  owner_type identity_owner_type not null,
  owner_profile_id uuid references owner_profiles(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  document_number text not null,
  full_name text not null,
  date_of_birth date,
  gender text,
  hometown text,
  permanent_address text,
  issued_at date,
  issued_by text,
  front_image_path text,
  back_image_path text,
  verification_status identity_verification_status not null default 'pending',
  ocr_confidence numeric(5, 2),
  ocr_payload jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint identity_document_owner_check check (
    (owner_type = 'owner' and owner_profile_id is not null and tenant_id is null)
    or
    (owner_type = 'tenant' and tenant_id is not null and owner_profile_id is null)
  ),
  unique (account_id, document_number)
);

create table buildings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  address text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, name)
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  building_id uuid not null references buildings(id) on delete cascade,
  room_number text not null,
  monthly_rent bigint not null default 0 check (monthly_rent >= 0),
  status room_status not null default 'vacant',
  floor_number integer,
  area_m2 numeric(8, 2),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, room_number)
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  contract_code text not null,
  room_id uuid not null references rooms(id) on delete restrict,
  main_tenant_id uuid not null references tenants(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  monthly_rent bigint not null check (monthly_rent >= 0),
  deposit_amount bigint not null default 0 check (deposit_amount >= 0),
  status contract_status not null default 'draft',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_date_check check (end_date >= start_date),
  unique (account_id, contract_code)
);

create table contract_members (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete set null,
  full_name text not null,
  phone text,
  relationship text,
  created_at timestamptz not null default now()
);

create index tenants_account_id_idx on tenants(account_id);
create index identity_documents_account_id_idx on identity_documents(account_id);
create index identity_documents_document_number_idx on identity_documents(document_number);
create index buildings_account_id_idx on buildings(account_id);
create index rooms_account_id_idx on rooms(account_id);
create index rooms_building_id_idx on rooms(building_id);
create index contracts_account_id_idx on contracts(account_id);
create index contracts_room_id_idx on contracts(room_id);
create index contracts_main_tenant_id_idx on contracts(main_tenant_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_set_updated_at
before update on accounts
for each row execute function set_updated_at();

create trigger owner_profiles_set_updated_at
before update on owner_profiles
for each row execute function set_updated_at();

create trigger tenants_set_updated_at
before update on tenants
for each row execute function set_updated_at();

create trigger identity_documents_set_updated_at
before update on identity_documents
for each row execute function set_updated_at();

create trigger buildings_set_updated_at
before update on buildings
for each row execute function set_updated_at();

create trigger rooms_set_updated_at
before update on rooms
for each row execute function set_updated_at();

create trigger contracts_set_updated_at
before update on contracts
for each row execute function set_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (id, email, phone)
  values (
    new.id,
    new.email,
    coalesce(new.phone, new.raw_user_meta_data->>'phone')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    phone = excluded.phone,
    updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert or update of email, phone on auth.users
for each row execute function private.handle_new_auth_user();
