-- Prevent deleting any tenant who participates in a current contract,
-- either as the main tenant or as a contract member.
-- Run after 0011_backfill_account_registration_data.sql.

create index if not exists contract_members_tenant_id_idx
on contract_members(tenant_id)
where tenant_id is not null;

create or replace function private.prevent_deleting_active_contract_tenant()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.contracts
    where contracts.main_tenant_id = old.id
      and contracts.status in ('draft', 'active', 'expiring')
  ) or exists (
    select 1
    from public.contract_members
    join public.contracts
      on contracts.id = contract_members.contract_id
    where contract_members.tenant_id = old.id
      and contracts.status in ('draft', 'active', 'expiring')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Không thể xóa người thuê đang tham gia hợp đồng chưa kết thúc.';
  end if;

  return old;
end;
$$;

create trigger tenants_block_delete_with_current_contract
before delete on tenants
for each row execute function private.prevent_deleting_active_contract_tenant();
