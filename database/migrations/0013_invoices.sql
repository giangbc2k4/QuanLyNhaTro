-- Real invoices generated from active contracts and their service snapshots.
-- Run after 0012_block_deleting_active_contract_tenants.sql.

create type invoice_status as enum (
  'draft',
  'issued',
  'paid',
  'cancelled'
);

create type invoice_item_type as enum (
  'rent',
  'service',
  'additional'
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete restrict,
  room_id uuid not null references rooms(id) on delete restrict,
  tenant_id uuid not null references tenants(id) on delete restrict,
  invoice_code text not null,
  billing_month date not null,
  due_date date not null,
  status invoice_status not null default 'issued',
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

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  source_contract_service_id uuid references contract_services(id) on delete set null,
  item_type invoice_item_type not null,
  item_name text not null,
  unit text not null,
  billing_type service_billing_type,
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

create index invoices_account_month_idx
on invoices(account_id, billing_month desc);

create index invoices_account_status_idx
on invoices(account_id, status);

create index invoices_contract_id_idx
on invoices(contract_id);

create unique index invoices_current_contract_month_uidx
on invoices(contract_id, billing_month)
where status <> 'cancelled';

create index invoice_items_invoice_id_idx
on invoice_items(invoice_id);

create index invoice_items_source_service_idx
on invoice_items(source_contract_service_id)
where source_contract_service_id is not null;

create trigger invoices_set_updated_at
before update on invoices
for each row execute function set_updated_at();

alter table invoices enable row level security;
alter table invoice_items enable row level security;

grant select, insert, update, delete on table invoices, invoice_items
to authenticated;

create policy "Users can manage their own invoices"
on invoices for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1
    from contracts
    where contracts.id = invoices.contract_id
      and contracts.account_id = (select auth.uid())
      and contracts.room_id = invoices.room_id
      and contracts.main_tenant_id = invoices.tenant_id
  )
);

create policy "Users can manage their own invoice items"
on invoice_items for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and invoice_id in (
    select id from invoices where account_id = (select auth.uid())
  )
);
