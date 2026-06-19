-- Prevent creating or activating contracts for rooms under maintenance.
-- Run after 0008_derive_room_occupancy_from_contracts.sql.

create or replace function private.ensure_contract_room_is_available()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  room_operational_status public.room_status;
begin
  select rooms.status
  into room_operational_status
  from public.rooms
  where rooms.id = new.room_id
    and rooms.account_id = new.account_id;

  if room_operational_status is null then
    raise exception using
      errcode = 'P0001',
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
    raise exception using
      errcode = 'P0001',
      message = 'Phòng đang bảo trì. Hãy chuyển phòng về trạng thái sẵn sàng cho thuê trước khi tạo hoặc kích hoạt hợp đồng.';
  end if;

  return new;
end;
$$;

create trigger contracts_require_available_room
before insert or update of room_id, status on contracts
for each row execute function private.ensure_contract_room_is_available();
