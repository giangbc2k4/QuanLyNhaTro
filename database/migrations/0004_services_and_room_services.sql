-- Per-account service catalog and room service assignments.
-- Run after 0003_unique_account_phone.sql.

create type service_billing_type as enum ('metered', 'fixed', 'free');

create table services (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  unit text not null,
  price bigint not null default 0 check (price >= 0),
  billing_type service_billing_type not null default 'fixed',
  description text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, name)
);

create table room_services (
  account_id uuid not null references accounts(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, service_id)
);

create index services_account_id_idx on services(account_id);
create index services_account_active_idx on services(account_id, is_active);
create index room_services_account_id_idx on room_services(account_id);
create index room_services_service_id_idx on room_services(service_id);

create trigger services_set_updated_at
before update on services
for each row execute function set_updated_at();

alter table services enable row level security;
alter table room_services enable row level security;

grant select, insert, update, delete on table services, room_services
to authenticated;

create policy "Users can manage their own services"
on services for all to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

create policy "Users can manage services of their own rooms"
on room_services for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and room_id in (
    select id from rooms where account_id = (select auth.uid())
  )
  and service_id in (
    select id from services where account_id = (select auth.uid())
  )
);

create or replace function private.seed_default_services()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.services (
    account_id,
    name,
    unit,
    price,
    billing_type,
    is_default,
    sort_order
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

create trigger on_account_created_seed_services
after insert on accounts
for each row execute function private.seed_default_services();

-- Seed defaults for accounts created before this migration.
insert into services (
  account_id,
  name,
  unit,
  price,
  billing_type,
  is_default,
  sort_order
)
select
  accounts.id,
  defaults.name,
  defaults.unit,
  defaults.price,
  defaults.billing_type::service_billing_type,
  true,
  defaults.sort_order
from accounts
cross join (
  values
    ('Điện', 'kWh', 4000::bigint, 'metered', 10),
    ('Nước', 'm³', 30000::bigint, 'metered', 20),
    ('Máy giặt', 'tháng', 0::bigint, 'fixed', 30),
    ('Phí dọn vệ sinh', 'tháng', 0::bigint, 'fixed', 40),
    ('Điều hòa', 'phòng', 0::bigint, 'free', 50),
    ('Nóng lạnh', 'phòng', 0::bigint, 'free', 60)
) as defaults(name, unit, price, billing_type, sort_order)
on conflict (account_id, name) do nothing;
