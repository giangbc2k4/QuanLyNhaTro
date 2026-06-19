-- Supabase authorization and private CCCD storage.
-- Run this migration after 0001_initial_schema.sql.

alter table accounts enable row level security;
alter table owner_profiles enable row level security;
alter table tenants enable row level security;
alter table identity_documents enable row level security;
alter table buildings enable row level security;
alter table rooms enable row level security;
alter table contracts enable row level security;
alter table contract_members enable row level security;

grant select, insert, update, delete on table
  accounts,
  owner_profiles,
  tenants,
  identity_documents,
  buildings,
  rooms,
  contracts,
  contract_members
to authenticated;

create policy "Users can read their own account"
on accounts for select to authenticated
using (id = (select auth.uid()));

create policy "Users can update their own account"
on accounts for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Users can manage their own owner profile"
on owner_profiles for all to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

create policy "Users can manage their own tenants"
on tenants for all to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

create policy "Users can manage their own identity documents"
on identity_documents for all to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

create policy "Users can manage their own buildings"
on buildings for all to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

create policy "Users can manage their own rooms"
on rooms for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1
    from buildings
    where buildings.id = rooms.building_id
      and buildings.account_id = (select auth.uid())
  )
);

create policy "Users can manage their own contracts"
on contracts for all to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and exists (
    select 1
    from rooms
    where rooms.id = contracts.room_id
      and rooms.account_id = (select auth.uid())
  )
  and exists (
    select 1
    from tenants
    where tenants.id = contracts.main_tenant_id
      and tenants.account_id = (select auth.uid())
  )
);

create policy "Users can manage members of their own contracts"
on contract_members for all to authenticated
using (
  exists (
    select 1
    from contracts
    where contracts.id = contract_members.contract_id
      and contracts.account_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from contracts
    where contracts.id = contract_members.contract_id
      and contracts.account_id = (select auth.uid())
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
  'identity-documents',
  'identity-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Object paths must begin with the authenticated user's UUID:
-- {auth.uid()}/{identity_document_id}/front.jpg
-- {auth.uid()}/{identity_document_id}/back.jpg

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
