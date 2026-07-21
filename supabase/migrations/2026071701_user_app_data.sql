create table if not exists public.user_app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  data_hash text not null,
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_app_data enable row level security;

revoke all on table public.user_app_data from anon;
grant select, insert, update, delete on table public.user_app_data to authenticated;

drop policy if exists "Users can read their own app data" on public.user_app_data;
create policy "Users can read their own app data"
on public.user_app_data
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own app data" on public.user_app_data;
create policy "Users can create their own app data"
on public.user_app_data
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own app data" on public.user_app_data;
create policy "Users can update their own app data"
on public.user_app_data
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own app data" on public.user_app_data;
create policy "Users can delete their own app data"
on public.user_app_data
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.touch_user_app_data_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_user_app_data_updated_at on public.user_app_data;
create trigger touch_user_app_data_updated_at
before update on public.user_app_data
for each row execute function public.touch_user_app_data_updated_at();
