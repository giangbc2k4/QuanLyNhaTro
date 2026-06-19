-- Receive meter photos from Zalo, extract readings with AI and wait for
-- tenant confirmation before the readings can be used by an invoice.
-- Run after 0013_invoices.sql.

create type meter_submission_status as enum (
  'processing',
  'awaiting_confirmation',
  'confirmed',
  'rejected',
  'failed'
);

create table zalo_room_links (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  zalo_user_id text not null,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id),
  unique (account_id, zalo_user_id)
);

create table meter_reading_submissions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  zalo_user_id text not null,
  zalo_message_id text,
  billing_month date not null,
  image_path text,
  status meter_submission_status not null default 'processing',
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

create table meter_reading_values (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  submission_id uuid not null references meter_reading_submissions(id) on delete cascade,
  contract_service_id uuid not null references contract_services(id) on delete cascade,
  service_name text not null,
  unit text not null,
  unit_price bigint not null check (unit_price >= 0),
  previous_reading numeric(14, 2) not null default 0,
  current_reading numeric(14, 2) not null,
  quantity numeric(14, 2) not null check (quantity >= 0),
  amount bigint not null check (amount >= 0),
  confidence numeric(5, 2),
  created_at timestamptz not null default now(),
  constraint meter_value_reading_check
    check (current_reading >= previous_reading),
  unique (submission_id, contract_service_id)
);

create index zalo_room_links_user_idx
on zalo_room_links(zalo_user_id);

create index meter_submissions_account_month_idx
on meter_reading_submissions(account_id, billing_month desc);

create index meter_submissions_zalo_status_idx
on meter_reading_submissions(zalo_user_id, status, created_at desc);

create index meter_values_service_idx
on meter_reading_values(contract_service_id, created_at desc);

create trigger zalo_room_links_set_updated_at
before update on zalo_room_links
for each row execute function set_updated_at();

create trigger meter_reading_submissions_set_updated_at
before update on meter_reading_submissions
for each row execute function set_updated_at();

alter table zalo_room_links enable row level security;
alter table meter_reading_submissions enable row level security;
alter table meter_reading_values enable row level security;

grant select, insert, update, delete on table
  zalo_room_links,
  meter_reading_submissions,
  meter_reading_values
to authenticated;

create policy "Users can manage their own Zalo room links"
on zalo_room_links for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1
    from contracts
    where contracts.id = zalo_room_links.contract_id
      and contracts.account_id = (select auth.uid())
      and contracts.room_id = zalo_room_links.room_id
  )
);

create policy "Users can manage their own meter submissions"
on meter_reading_submissions for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1
    from contracts
    where contracts.id = meter_reading_submissions.contract_id
      and contracts.account_id = (select auth.uid())
      and contracts.room_id = meter_reading_submissions.room_id
  )
);

create policy "Users can manage their own meter values"
on meter_reading_values for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1
    from meter_reading_submissions
    where meter_reading_submissions.id = meter_reading_values.submission_id
      and meter_reading_submissions.account_id = (select auth.uid())
  )
  and exists (
    select 1
    from contract_services
    where contract_services.id = meter_reading_values.contract_service_id
      and contract_services.account_id = (select auth.uid())
  )
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
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

create policy "Users can view their own meter photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'meter-readings'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
