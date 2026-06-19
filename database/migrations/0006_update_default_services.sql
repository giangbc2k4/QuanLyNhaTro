-- Run after 0005_add_free_service_billing_type.sql.
-- Update existing defaults and seed free room amenities.

update services
set price = 4000
where name = 'Điện'
  and is_default = true;

update services
set price = 30000
where name = 'Nước'
  and is_default = true;

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
  0,
  'free'::service_billing_type,
  true,
  defaults.sort_order
from accounts
cross join (
  values
    ('Điều hòa', 'phòng', 50),
    ('Nóng lạnh', 'phòng', 60)
) as defaults(name, unit, sort_order)
on conflict (account_id, name) do update
set
  unit = excluded.unit,
  price = 0,
  billing_type = 'free',
  is_default = true,
  sort_order = excluded.sort_order;

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
