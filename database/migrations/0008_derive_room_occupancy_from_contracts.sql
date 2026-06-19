-- Room occupancy is derived from active/expiring contracts.
-- Users may only set the room's operational state: available or maintenance.

update rooms
set status = 'vacant'
where status = 'occupied';

alter table rooms
drop constraint if exists rooms_manual_status_check;

alter table rooms
add constraint rooms_manual_status_check
check (status in ('vacant', 'maintenance'));

comment on column rooms.status is
'Operational room state only: vacant means available when no active contract; maintenance means unavailable. Occupancy is derived from contracts.';
