-- Snapshot room services into each contract.
-- Run after 0006_update_default_services.sql.
--
-- room_services describes the current defaults of a room.
-- contract_services preserves the agreed service terms of a contract.

create table contract_services (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  source_service_id uuid references services(id) on delete set null,
  service_name text not null,
  unit text not null,
  price bigint not null default 0 check (price >= 0),
  billing_type service_billing_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, service_name)
);

create index contract_services_account_id_idx
on contract_services(account_id);

create index contract_services_contract_id_idx
on contract_services(contract_id);

create index contract_services_source_service_id_idx
on contract_services(source_service_id);

create trigger contract_services_set_updated_at
before update on contract_services
for each row execute function set_updated_at();

alter table contract_services enable row level security;

grant select, insert, update, delete on table contract_services
to authenticated;

create policy "Users can manage services of their own contracts"
on contract_services for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and contract_id in (
    select id
    from contracts
    where account_id = (select auth.uid())
  )
);

create or replace function private.snapshot_contract_room_services()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.contract_services (
    account_id,
    contract_id,
    source_service_id,
    service_name,
    unit,
    price,
    billing_type
  )
  select
    new.account_id,
    new.id,
    services.id,
    services.name,
    services.unit,
    services.price,
    services.billing_type
  from public.room_services
  join public.services
    on services.id = room_services.service_id
  where room_services.room_id = new.room_id
    and room_services.account_id = new.account_id
    and services.account_id = new.account_id
  on conflict (contract_id, service_name) do nothing;

  return new;
end;
$$;

create trigger on_contract_created_snapshot_services
after insert on contracts
for each row execute function private.snapshot_contract_room_services();
