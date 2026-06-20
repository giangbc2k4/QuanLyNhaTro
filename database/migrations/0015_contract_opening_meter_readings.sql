-- Store the meter readings handed over at the beginning of a contract.
-- Run after 0014_zalo_meter_readings.sql.

create type room_meter_reading_type as enum (
  'initial',
  'contract_start',
  'monthly',
  'contract_end'
);

alter table contract_services
add column opening_reading numeric(14, 2)
check (opening_reading is null or opening_reading >= 0);

create table room_meter_readings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  service_id uuid not null references services(id) on delete restrict,
  contract_id uuid references contracts(id) on delete set null,
  reading_type room_meter_reading_type not null,
  reading_value numeric(14, 2) not null check (reading_value >= 0),
  recorded_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create index room_meter_readings_room_service_idx
on room_meter_readings(room_id, service_id, recorded_at desc);

create index room_meter_readings_contract_idx
on room_meter_readings(contract_id)
where contract_id is not null;

create unique index room_meter_contract_start_uidx
on room_meter_readings(contract_id, service_id)
where reading_type = 'contract_start' and contract_id is not null;

alter table room_meter_readings enable row level security;

grant select, insert, update, delete on table room_meter_readings
to authenticated;

create policy "Users can manage their own room meter readings"
on room_meter_readings for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1
    from rooms
    where rooms.id = room_meter_readings.room_id
      and rooms.account_id = (select auth.uid())
  )
  and exists (
    select 1
    from room_services
    where room_services.room_id = room_meter_readings.room_id
      and room_services.service_id = room_meter_readings.service_id
      and room_services.account_id = (select auth.uid())
  )
  and (
    contract_id is null
    or exists (
      select 1
      from contracts
      where contracts.id = room_meter_readings.contract_id
        and contracts.room_id = room_meter_readings.room_id
        and contracts.account_id = (select auth.uid())
    )
  )
);
