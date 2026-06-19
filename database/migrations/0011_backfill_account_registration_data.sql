-- Repair accounts created before registration metadata was fully synchronized.
-- Run after 0010_account_settings.sql if 0010 was already executed.

update accounts as account
set
  phone = coalesce(
    auth_user.phone,
    auth_user.raw_user_meta_data->>'phone'
  ),
  phone_normalized = private.normalize_vietnam_phone(
    coalesce(
      auth_user.phone,
      auth_user.raw_user_meta_data->>'phone'
    )
  ),
  updated_at = now()
from auth.users as auth_user
where account.id = auth_user.id
  and account.phone is null
  and nullif(
    btrim(
      coalesce(
        auth_user.phone,
        auth_user.raw_user_meta_data->>'phone'
      )
    ),
    ''
  ) is not null;

insert into owner_profiles (account_id, full_name)
select
  auth_user.id,
  btrim(auth_user.raw_user_meta_data->>'full_name')
from auth.users as auth_user
where nullif(
  btrim(auth_user.raw_user_meta_data->>'full_name'),
  ''
) is not null
on conflict (account_id) do nothing;
