-- Ensure every new auth.users row gets a matching public.profiles row with role from signup metadata.
-- Safe to apply if profiles already exists. ON CONFLICT DO NOTHING avoids errors if a row was created elsewhere.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
begin
  r := coalesce(new.raw_user_meta_data->>'role', 'victim');
  if r not in ('victim', 'advocate', 'organization') then
    r := 'victim';
  end if;

  insert into public.profiles (id, role)
  values (new.id, r)
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates public.profiles row on signup; role from raw_user_meta_data.role or victim.';

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
