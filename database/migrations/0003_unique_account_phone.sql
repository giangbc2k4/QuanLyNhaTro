-- Mỗi số điện thoại chỉ được sử dụng cho một tài khoản.
-- Số được chuẩn hóa về dạng 84xxxxxxxxx trước khi so sánh.

create or replace function private.normalize_vietnam_phone(phone_value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  digits text;
begin
  if phone_value is null or btrim(phone_value) = '' then
    return null;
  end if;

  digits := regexp_replace(phone_value, '[^0-9]', '', 'g');

  if digits like '0%' then
    digits := '84' || substring(digits from 2);
  end if;

  if digits !~ '^84(3|5|7|8|9)[0-9]{8}$' then
    raise exception 'invalid_vietnam_phone';
  end if;

  return digits;
end;
$$;

alter table public.accounts
add column if not exists phone_normalized text;

update public.accounts
set phone_normalized = private.normalize_vietnam_phone(phone)
where phone is not null
  and phone_normalized is null;

do $$
begin
  if exists (
    select phone_normalized
    from public.accounts
    where phone_normalized is not null
    group by phone_normalized
    having count(*) > 1
  ) then
    raise exception 'duplicate_phone_numbers_exist';
  end if;
end;
$$;

create unique index if not exists accounts_phone_normalized_unique_idx
on public.accounts(phone_normalized)
where phone_normalized is not null;

create or replace function private.set_account_phone_normalized()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.phone_normalized := private.normalize_vietnam_phone(new.phone);
  return new;
end;
$$;

drop trigger if exists accounts_normalize_phone on public.accounts;

create trigger accounts_normalize_phone
before insert or update of phone on public.accounts
for each row execute function private.set_account_phone_normalized();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (id, email, phone, phone_normalized)
  values (
    new.id,
    new.email,
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    private.normalize_vietnam_phone(
      coalesce(new.phone, new.raw_user_meta_data->>'phone')
    )
  )
  on conflict (id) do update
  set
    email = excluded.email,
    phone = excluded.phone,
    phone_normalized = excluded.phone_normalized,
    updated_at = now();

  return new;
exception
  when unique_violation then
    raise exception 'phone_already_registered';
end;
$$;
