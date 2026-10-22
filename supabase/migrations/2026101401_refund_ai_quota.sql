-- Give back one request when generation fails before any answer reaches the user.
-- Each charge made by the server gets a random reservation id that only the server ever sees.
-- A refund must name that id, so a user calling these RPCs directly can at most undo a charge
-- they made themselves (net zero) and never the charges behind answers they received.
drop function if exists public.refund_ai_quota();

create table if not exists public.ai_quota_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null
);
alter table public.ai_quota_reservations enable row level security;
revoke all on public.ai_quota_reservations from public, anon, authenticated;

create or replace function public.reserve_ai_quota(p_daily_limit int, p_global_daily_limit int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_day date := (pg_catalog.now() at time zone 'Asia/Shanghai')::date;
  v_id uuid;
begin
  if not public.consume_ai_quota(p_daily_limit, p_global_daily_limit) then return null; end if;
  delete from public.ai_quota_reservations where usage_date < v_day - 1;
  insert into public.ai_quota_reservations(user_id, usage_date) values (auth.uid(), v_day) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.reserve_ai_quota(int, int) from public, anon;
grant execute on function public.reserve_ai_quota(int, int) to authenticated;

create or replace function public.refund_ai_quota(p_reservation uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_day date;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  delete from public.ai_quota_reservations where id = p_reservation and user_id = v_uid returning usage_date into v_day;
  if v_day is null then return false; end if;
  update public.ai_usage set request_count = greatest(request_count - 1, 0)
  where user_id = v_uid and usage_date = v_day;
  return true;
end;
$$;
revoke all on function public.refund_ai_quota(uuid) from public, anon;
grant execute on function public.refund_ai_quota(uuid) to authenticated;
