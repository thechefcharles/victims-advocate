-- Foundation function required by all updated_at triggers.
-- Must exist before any migration that creates a trigger
-- calling public.handle_updated_at().
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
