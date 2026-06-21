-- ============================================================
-- NHATROPRO - COMPLETE SUPABASE DATABASE
-- ============================================================
-- Day la file database duy nhat cua du an.
--
-- Cach dung:
--   1. Tao mot Supabase project moi.
--   2. Mo SQL Editor.
--   3. Dan va chay toan bo file nay mot lan.
--
-- Luu y:
--   - Chi chay tren database moi/chua co schema NhaTroPro.
--   - Khong chay lai tren database dang co du lieu.
--   - File tao day du enum, bang, index, function, trigger, RLS,
--     Storage bucket, Storage policy va dong bo auth.users da ton tai.
-- ============================================================

begin;

create extension if not exists pgcrypto;
create schema if not exists private;

-- ============================================================
-- 1. ENUM NGHIEP VU
-- ============================================================

create type public.account_status as enum ('active', 'suspended', 'closed');
create type public.room_status as enum ('vacant', 'occupied', 'maintenance');
create type public.contract_status as enum ('draft', 'active', 'expiring', 'expired', 'terminated');
create type public.identity_owner_type as enum ('owner', 'tenant');
create type public.identity_verification_status as enum ('pending', 'ocr_completed', 'verified', 'rejected');
create type public.service_billing_type as enum ('metered', 'fixed', 'free', 'per_person');
create type public.invoice_status as enum ('draft', 'issued', 'paid', 'cancelled');
create type public.invoice_item_type as enum ('rent', 'service', 'additional');
create type public.meter_submission_status as enum (
  'processing',
  'awaiting_confirmation',
  'confirmed',
  'rejected',
  'failed'
);
create type public.room_meter_reading_type as enum (
  'initial',
  'contract_start',
  'monthly',
  'contract_end'
);

-- ============================================================
-- 2. BANG DU LIEU
-- ============================================================

create table public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  phone text,
  phone_normalized text,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.owner_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.accounts(id) on delete cascade,
  full_name text not null,
  date_of_birth date,
  gender text,
  hometown text,
  permanent_address text,
  avatar_url text,
  bank_name text,
  bank_account_number text,
  bank_account_holder text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
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

create table public.identity_documents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  owner_type public.identity_owner_type not null,
  owner_profile_id uuid references public.owner_profiles(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
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
  verification_status public.identity_verification_status not null default 'pending',
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

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  address text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, name)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  room_number text not null,
  monthly_rent bigint not null default 0 check (monthly_rent >= 0),
  status public.room_status not null default 'vacant',
  floor_number integer,
  area_m2 numeric(8, 2),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_manual_status_check check (status in ('vacant', 'maintenance')),
  unique (building_id, room_number)
);

comment on column public.rooms.status is
'Trang thai van hanh: vacant hoac maintenance. Dang thue duoc suy ra tu hop dong.';

create table public.services (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  unit text not null,
  price bigint not null default 0 check (price >= 0),
  billing_type public.service_billing_type not null default 'fixed',
  description text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, name)
);

create table public.room_services (
  account_id uuid not null references public.accounts(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, service_id)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  contract_code text not null,
  room_id uuid not null references public.rooms(id) on delete restrict,
  main_tenant_id uuid not null references public.tenants(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  monthly_rent bigint not null check (monthly_rent >= 0),
  deposit_amount bigint not null default 0 check (deposit_amount >= 0),
  status public.contract_status not null default 'draft',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_date_check check (end_date >= start_date),
  unique (account_id, contract_code)
);

create table public.contract_members (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  full_name text not null,
  phone text,
  relationship text,
  created_at timestamptz not null default now()
);

create table public.contract_services (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  source_service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  unit text not null,
  price bigint not null default 0 check (price >= 0),
  billing_type public.service_billing_type not null,
  opening_reading numeric(14, 2) check (opening_reading is null or opening_reading >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, service_name)
);

create table public.room_meter_readings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  contract_id uuid references public.contracts(id) on delete set null,
  reading_type public.room_meter_reading_type not null,
  reading_value numeric(14, 2) not null check (reading_value >= 0),
  recorded_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  invoice_code text not null,
  billing_month date not null,
  due_date date not null,
  status public.invoice_status not null default 'issued',
  subtotal bigint not null default 0 check (subtotal >= 0),
  total_amount bigint not null default 0 check (total_amount >= 0),
  note text,
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_billing_month_check
    check (billing_month = date_trunc('month', billing_month)::date),
  unique (account_id, invoice_code)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  source_contract_service_id uuid references public.contract_services(id) on delete set null,
  item_type public.invoice_item_type not null,
  item_name text not null,
  unit text not null,
  billing_type public.service_billing_type,
  unit_price bigint not null default 0 check (unit_price >= 0),
  previous_reading numeric(14, 2),
  current_reading numeric(14, 2),
  quantity numeric(14, 2) not null default 1 check (quantity >= 0),
  amount bigint not null default 0 check (amount >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint invoice_item_meter_reading_check check (
    billing_type <> 'metered'
    or (
      previous_reading is not null
      and current_reading is not null
      and current_reading >= previous_reading
    )
  )
);

create table public.zalo_room_links (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  zalo_user_id text not null,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id),
  unique (account_id, zalo_user_id)
);

create table public.meter_reading_submissions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  zalo_user_id text not null,
  zalo_message_id text,
  billing_month date not null,
  image_path text,
  status public.meter_submission_status not null default 'processing',
  ai_provider text,
  ai_model text,
  ai_payload jsonb,
  error_message text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meter_submission_billing_month_check
    check (billing_month = date_trunc('month', billing_month)::date)
);

create table public.meter_reading_values (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  submission_id uuid not null references public.meter_reading_submissions(id) on delete cascade,
  contract_service_id uuid not null references public.contract_services(id) on delete cascade,
  service_name text not null,
  unit text not null,
  unit_price bigint not null check (unit_price >= 0),
  previous_reading numeric(14, 2) not null default 0,
  current_reading numeric(14, 2) not null,
  quantity numeric(14, 2) not null check (quantity >= 0),
  amount bigint not null check (amount >= 0),
  confidence numeric(5, 2),
  billing_month date not null,
  created_at timestamptz not null default now(),
  constraint meter_value_reading_check check (current_reading >= previous_reading),
  constraint meter_value_billing_month_check
    check (billing_month = date_trunc('month', billing_month)::date),
  unique (submission_id, contract_service_id)
);

-- ============================================================
-- 3. INDEX VA RANG BUOC TRUY VAN
-- ============================================================

create unique index accounts_phone_normalized_unique_idx
on public.accounts(phone_normalized) where phone_normalized is not null;
create index tenants_account_id_idx on public.tenants(account_id);
create index identity_documents_account_id_idx on public.identity_documents(account_id);
create index identity_documents_document_number_idx on public.identity_documents(document_number);
create index identity_documents_owner_profile_id_idx
on public.identity_documents(owner_profile_id) where owner_profile_id is not null;
create index identity_documents_tenant_id_idx
on public.identity_documents(tenant_id) where tenant_id is not null;
create unique index identity_documents_one_owner_uidx
on public.identity_documents(account_id) where owner_type = 'owner';
create unique index identity_documents_one_tenant_uidx
on public.identity_documents(tenant_id)
where owner_type = 'tenant' and tenant_id is not null;
create index buildings_account_id_idx on public.buildings(account_id);
create index rooms_account_id_idx on public.rooms(account_id);
create index rooms_building_id_idx on public.rooms(building_id);
create index contracts_account_id_idx on public.contracts(account_id);
create index contracts_room_id_idx on public.contracts(room_id);
create index contracts_main_tenant_id_idx on public.contracts(main_tenant_id);
create unique index contracts_one_active_room_uidx
on public.contracts(room_id) where status in ('active', 'expiring');
create unique index contracts_one_active_main_tenant_uidx
on public.contracts(main_tenant_id) where status in ('active', 'expiring');
create index contract_members_tenant_id_idx on public.contract_members(tenant_id)
where tenant_id is not null;
create index contract_members_contract_id_idx
on public.contract_members(contract_id);
create index services_account_id_idx on public.services(account_id);
create index services_account_active_idx on public.services(account_id, is_active);
create index room_services_account_id_idx on public.room_services(account_id);
create index room_services_service_id_idx on public.room_services(service_id);
create index contract_services_account_id_idx on public.contract_services(account_id);
create index contract_services_contract_id_idx on public.contract_services(contract_id);
create index contract_services_source_service_id_idx on public.contract_services(source_service_id);
create index room_meter_readings_room_service_idx
on public.room_meter_readings(room_id, service_id, recorded_at desc);
create index room_meter_readings_contract_idx
on public.room_meter_readings(contract_id) where contract_id is not null;
create unique index room_meter_contract_start_uidx
on public.room_meter_readings(contract_id, service_id)
where reading_type = 'contract_start' and contract_id is not null;
create index invoices_account_month_idx on public.invoices(account_id, billing_month desc);
create index invoices_account_status_idx on public.invoices(account_id, status);
create index invoices_contract_id_idx on public.invoices(contract_id);
create index invoices_room_id_idx on public.invoices(room_id);
create index invoices_tenant_id_idx on public.invoices(tenant_id);
create unique index invoices_current_contract_month_uidx
on public.invoices(contract_id, billing_month) where status <> 'cancelled';
create index invoice_items_invoice_id_idx on public.invoice_items(invoice_id);
create index invoice_items_account_id_idx on public.invoice_items(account_id);
create index invoice_items_source_service_idx
on public.invoice_items(source_contract_service_id)
where source_contract_service_id is not null;
create index zalo_room_links_user_idx on public.zalo_room_links(zalo_user_id);
create index zalo_room_links_room_id_idx on public.zalo_room_links(room_id);
create index meter_submissions_account_month_idx
on public.meter_reading_submissions(account_id, billing_month desc);
create index meter_submissions_contract_id_idx
on public.meter_reading_submissions(contract_id);
create index meter_submissions_room_id_idx
on public.meter_reading_submissions(room_id);
create index meter_submissions_zalo_status_idx
on public.meter_reading_submissions(zalo_user_id, status, created_at desc);
create index meter_values_service_idx
on public.meter_reading_values(contract_service_id, created_at desc);
create unique index meter_values_service_month_uidx
on public.meter_reading_values(contract_service_id, billing_month);
create index meter_values_account_month_idx
on public.meter_reading_values(account_id, billing_month desc);
create index room_meter_readings_account_id_idx
on public.room_meter_readings(account_id);
create index room_meter_readings_service_id_idx
on public.room_meter_readings(service_id);

-- ============================================================
-- 4. HAM NGHIEP VU VA TRIGGER
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.normalize_vietnam_phone(phone_value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  digits text;
begin
  if phone_value is null or btrim(phone_value) = '' then
    return null;
  end if;
  digits := regexp_replace(phone_value, '[^0-9]', '', 'g');
  if digits like '0%' then
    digits := '84' || substring(digits from 2);
  end if;
  if digits !~ '^84(3|5|7|8|9)[0-9]{8}$' then
    raise exception 'invalid_vietnam_phone';
  end if;
  return digits;
end;
$$;

create or replace function private.set_account_phone_normalized()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.phone_normalized := private.normalize_vietnam_phone(new.phone);
  return new;
end;
$$;

create or replace function private.seed_default_services()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.services (
    account_id, name, unit, price, billing_type, is_default, sort_order
  )
  values
    (new.id, 'Điện', 'kWh', 4000, 'metered', true, 10),
    (new.id, 'Nước', 'm³', 30000, 'metered', true, 20),
    (new.id, 'Máy giặt', 'tháng', 0, 'fixed', true, 30),
    (new.id, 'Phí dọn vệ sinh', 'tháng', 0, 'fixed', true, 40),
    (new.id, 'Điều hòa', 'phòng', 0, 'free', true, 50),
    (new.id, 'Nóng lạnh', 'phòng', 0, 'free', true, 60)
  on conflict (account_id, name) do nothing;
  return new;
end;
$$;

create or replace function private.snapshot_contract_room_services()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.contract_services (
    account_id, contract_id, source_service_id, service_name, unit, price, billing_type
  )
  select
    new.account_id, new.id, s.id, s.name, s.unit, s.price, s.billing_type
  from public.room_services rs
  join public.services s on s.id = rs.service_id
  where rs.room_id = new.room_id
    and rs.account_id = new.account_id
    and s.account_id = new.account_id
  on conflict (contract_id, service_name) do nothing;
  return new;
end;
$$;

create or replace function private.ensure_contract_room_is_available()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  room_operational_status public.room_status;
begin
  select r.status into room_operational_status
  from public.rooms r
  where r.id = new.room_id and r.account_id = new.account_id;

  if room_operational_status is null then
    raise exception using errcode = 'P0001',
      message = 'Phòng không tồn tại hoặc không thuộc tài khoản này.';
  end if;

  if room_operational_status = 'maintenance'
    and (
      tg_op = 'INSERT'
      or new.room_id is distinct from old.room_id
      or (
        new.status in ('draft', 'active', 'expiring')
        and new.status is distinct from old.status
      )
    )
  then
    raise exception using errcode = 'P0001',
      message = 'Phòng đang bảo trì. Hãy chuyển phòng về trạng thái sẵn sàng trước khi tạo hoặc kích hoạt hợp đồng.';
  end if;
  return new;
end;
$$;

create or replace function private.prevent_deleting_active_contract_tenant()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.contracts c
    where c.main_tenant_id = old.id
      and c.status in ('draft', 'active', 'expiring')
  ) or exists (
    select 1
    from public.contract_members cm
    join public.contracts c on c.id = cm.contract_id
    where cm.tenant_id = old.id
      and c.status in ('draft', 'active', 'expiring')
  ) then
    raise exception using errcode = 'P0001',
      message = 'Không thể xóa người thuê đang tham gia hợp đồng chưa kết thúc.';
  end if;
  return old;
end;
$$;

create or replace function private.ensure_contract_member_is_available()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tenant_id is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.tenant_id::text, 0));

  if exists (
    select 1
    from public.contracts c
    where c.main_tenant_id = new.tenant_id
      and c.status in ('active', 'expiring')
  ) or exists (
    select 1
    from public.contract_members cm
    join public.contracts c on c.id = cm.contract_id
    where cm.tenant_id = new.tenant_id
      and c.status in ('active', 'expiring')
      and cm.id is distinct from new.id
  ) then
    raise exception using errcode = 'P0001',
      message = 'Người thuê đã thuộc một hợp đồng đang hoạt động.';
  end if;
  return new;
end;
$$;

create or replace function private.ensure_contract_tenants_are_available()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  member_tenant_id uuid;
begin
  if new.status not in ('active', 'expiring') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.main_tenant_id::text, 0));

  if exists (
    select 1
    from public.contract_members cm
    join public.contracts c on c.id = cm.contract_id
    where cm.tenant_id = new.main_tenant_id
      and c.status in ('active', 'expiring')
      and c.id <> new.id
  ) then
    raise exception using errcode = 'P0001',
      message = 'Người thuê chính đã thuộc một hợp đồng đang hoạt động.';
  end if;

  for member_tenant_id in
    select cm.tenant_id
    from public.contract_members cm
    where cm.contract_id = new.id and cm.tenant_id is not null
  loop
    perform pg_advisory_xact_lock(hashtextextended(member_tenant_id::text, 0));
    if exists (
      select 1 from public.contracts c
      where c.main_tenant_id = member_tenant_id
        and c.status in ('active', 'expiring')
        and c.id <> new.id
    ) or exists (
      select 1
      from public.contract_members cm
      join public.contracts c on c.id = cm.contract_id
      where cm.tenant_id = member_tenant_id
        and c.status in ('active', 'expiring')
        and c.id <> new.id
    ) then
      raise exception using errcode = 'P0001',
        message = 'Có người ở cùng đã thuộc một hợp đồng đang hoạt động.';
    end if;
  end loop;
  return new;
end;
$$;

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

create trigger accounts_normalize_phone
before insert or update of phone on public.accounts
for each row execute function private.set_account_phone_normalized();

create trigger on_account_created_seed_services
after insert on public.accounts
for each row execute function private.seed_default_services();

create trigger on_contract_created_snapshot_services
after insert on public.contracts
for each row execute function private.snapshot_contract_room_services();

create trigger contracts_require_available_room
before insert or update of room_id, status on public.contracts
for each row execute function private.ensure_contract_room_is_available();

create trigger contracts_require_available_tenants
before insert or update of main_tenant_id, status on public.contracts
for each row execute function private.ensure_contract_tenants_are_available();

create trigger tenants_block_delete_with_current_contract
before delete on public.tenants
for each row execute function private.prevent_deleting_active_contract_tenant();

create trigger contract_members_require_available_tenant
before insert or update of tenant_id, contract_id on public.contract_members
for each row execute function private.ensure_contract_member_is_available();

create trigger on_auth_user_created
after insert or update of email, phone on auth.users
for each row execute function private.handle_new_auth_user();

create trigger accounts_set_updated_at before update on public.accounts
for each row execute function public.set_updated_at();
create trigger owner_profiles_set_updated_at before update on public.owner_profiles
for each row execute function public.set_updated_at();
create trigger tenants_set_updated_at before update on public.tenants
for each row execute function public.set_updated_at();
create trigger identity_documents_set_updated_at before update on public.identity_documents
for each row execute function public.set_updated_at();
create trigger buildings_set_updated_at before update on public.buildings
for each row execute function public.set_updated_at();
create trigger rooms_set_updated_at before update on public.rooms
for each row execute function public.set_updated_at();
create trigger services_set_updated_at before update on public.services
for each row execute function public.set_updated_at();
create trigger contracts_set_updated_at before update on public.contracts
for each row execute function public.set_updated_at();
create trigger contract_services_set_updated_at before update on public.contract_services
for each row execute function public.set_updated_at();
create trigger invoices_set_updated_at before update on public.invoices
for each row execute function public.set_updated_at();
create trigger zalo_room_links_set_updated_at before update on public.zalo_room_links
for each row execute function public.set_updated_at();
create trigger meter_reading_submissions_set_updated_at
before update on public.meter_reading_submissions
for each row execute function public.set_updated_at();

-- ============================================================
-- 5. ROW LEVEL SECURITY VA QUYEN DATA API
-- ============================================================

alter table public.accounts enable row level security;
alter table public.owner_profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.identity_documents enable row level security;
alter table public.buildings enable row level security;
alter table public.rooms enable row level security;
alter table public.services enable row level security;
alter table public.room_services enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_members enable row level security;
alter table public.contract_services enable row level security;
alter table public.room_meter_readings enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.zalo_room_links enable row level security;
alter table public.meter_reading_submissions enable row level security;
alter table public.meter_reading_values enable row level security;

grant select on table public.accounts to authenticated;

grant select, insert, update, delete on table
  public.owner_profiles,
  public.tenants,
  public.identity_documents,
  public.buildings,
  public.rooms,
  public.services,
  public.room_services,
  public.contracts,
  public.contract_members,
  public.contract_services,
  public.room_meter_readings,
  public.invoices,
  public.invoice_items,
  public.zalo_room_links,
  public.meter_reading_submissions,
  public.meter_reading_values
to authenticated;

create policy "Users can read their own account"
on public.accounts for select to authenticated
using (id = (select auth.uid()));

create policy "Users can manage their own owner profile"
on public.owner_profiles for all to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

create policy "Users can manage their own tenants"
on public.tenants for all to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

create policy "Users can manage their own identity documents"
on public.identity_documents for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and (
    (
      owner_type = 'owner'
      and tenant_id is null
      and owner_profile_id in (
        select id from public.owner_profiles
        where account_id = (select auth.uid())
      )
    )
    or
    (
      owner_type = 'tenant'
      and owner_profile_id is null
      and tenant_id in (
        select id from public.tenants
        where account_id = (select auth.uid())
      )
    )
  )
);

create policy "Users can manage their own buildings"
on public.buildings for all to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

create policy "Users can manage their own rooms"
on public.rooms for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1 from public.buildings b
    where b.id = rooms.building_id and b.account_id = (select auth.uid())
  )
);

create policy "Users can manage their own services"
on public.services for all to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

create policy "Users can manage services of their own rooms"
on public.room_services for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1 from public.rooms r
    where r.id = room_services.room_id and r.account_id = (select auth.uid())
  )
  and exists (
    select 1 from public.services s
    where s.id = room_services.service_id and s.account_id = (select auth.uid())
  )
);

create policy "Users can manage their own contracts"
on public.contracts for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1 from public.rooms r
    where r.id = contracts.room_id and r.account_id = (select auth.uid())
  )
  and exists (
    select 1 from public.tenants t
    where t.id = contracts.main_tenant_id and t.account_id = (select auth.uid())
  )
);

create policy "Users can manage members of their own contracts"
on public.contract_members for all to authenticated
using (
  exists (
    select 1 from public.contracts c
    where c.id = contract_members.contract_id
      and c.account_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.contracts c
    where c.id = contract_members.contract_id
      and c.account_id = (select auth.uid())
  )
  and (
    tenant_id is null
    or tenant_id in (
      select id from public.tenants
      where account_id = (select auth.uid())
    )
  )
);

create policy "Users can manage services of their own contracts"
on public.contract_services for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1 from public.contracts c
    where c.id = contract_services.contract_id
      and c.account_id = (select auth.uid())
  )
);

create policy "Users can manage their own room meter readings"
on public.room_meter_readings for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1 from public.rooms r
    where r.id = room_meter_readings.room_id
      and r.account_id = (select auth.uid())
  )
  and exists (
    select 1 from public.room_services rs
    where rs.room_id = room_meter_readings.room_id
      and rs.service_id = room_meter_readings.service_id
      and rs.account_id = (select auth.uid())
  )
  and (
    contract_id is null
    or exists (
      select 1 from public.contracts c
      where c.id = room_meter_readings.contract_id
        and c.room_id = room_meter_readings.room_id
        and c.account_id = (select auth.uid())
    )
  )
);

create policy "Users can manage their own invoices"
on public.invoices for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1 from public.contracts c
    where c.id = invoices.contract_id
      and c.account_id = (select auth.uid())
      and c.room_id = invoices.room_id
      and c.main_tenant_id = invoices.tenant_id
  )
);

create policy "Users can manage their own invoice items"
on public.invoice_items for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id
      and i.account_id = (select auth.uid())
  )
);

create policy "Users can manage their own Zalo room links"
on public.zalo_room_links for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1 from public.contracts c
    where c.id = zalo_room_links.contract_id
      and c.account_id = (select auth.uid())
      and c.room_id = zalo_room_links.room_id
  )
);

create policy "Users can manage their own meter submissions"
on public.meter_reading_submissions for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1 from public.contracts c
    where c.id = meter_reading_submissions.contract_id
      and c.account_id = (select auth.uid())
      and c.room_id = meter_reading_submissions.room_id
  )
);

create policy "Users can manage their own meter values"
on public.meter_reading_values for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1 from public.meter_reading_submissions m
    where m.id = meter_reading_values.submission_id
      and m.account_id = (select auth.uid())
  )
  and exists (
    select 1 from public.contract_services cs
    where cs.id = meter_reading_values.contract_service_id
      and cs.account_id = (select auth.uid())
  )
);

-- ============================================================
-- 6. STORAGE BUCKET VA STORAGE POLICIES
-- ============================================================

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values
  (
    'identity-documents',
    'identity-documents',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'meter-readings',
    'meter-readings',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can view their own identity images"
on storage.objects for select to authenticated
using (
  bucket_id = 'identity-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can upload their own identity images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'identity-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can replace their own identity images"
on storage.objects for update to authenticated
using (
  bucket_id = 'identity-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'identity-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can delete their own identity images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'identity-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can view their own meter photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'meter-readings'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- ============================================================
-- 7. DONG BO CAC AUTH USER DA TON TAI
-- ============================================================

insert into public.accounts (id, email, phone, phone_normalized)
select
  u.id,
  u.email,
  coalesce(u.phone, u.raw_user_meta_data->>'phone'),
  private.normalize_vietnam_phone(coalesce(u.phone, u.raw_user_meta_data->>'phone'))
from auth.users u
on conflict (id) do update
set
  email = excluded.email,
  phone = excluded.phone,
  phone_normalized = excluded.phone_normalized,
  updated_at = now();

insert into public.owner_profiles (account_id, full_name)
select
  u.id,
  coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), 'Chủ nhà')
from auth.users u
on conflict (account_id) do nothing;

commit;

select 'Da cai dat schema NhaTroPro hoan chinh.' as result;
