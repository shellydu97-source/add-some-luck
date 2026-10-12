-- Atomic per-account and global quota; no service_role secret in the frontend.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  request_count int not null default 0 check (request_count >= 0),
  primary key (user_id, usage_date)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from public, anon, authenticated;
grant select on public.ai_usage to authenticated;
drop policy if exists "Users read their AI usage" on public.ai_usage;
create policy "Users read their AI usage" on public.ai_usage for select to authenticated using ((select auth.uid()) = user_id);

-- Only project administrators can configure upper bounds; API clients cannot raise them.
create table if not exists public.ai_quota_limits (
  id boolean primary key default true check (id),
  user_daily_limit int not null default 30 check (user_daily_limit > 0),
  global_daily_limit int not null default 1000 check (global_daily_limit > 0)
);
insert into public.ai_quota_limits(id) values (true) on conflict do nothing;
alter table public.ai_quota_limits enable row level security;
revoke all on public.ai_quota_limits from public, anon, authenticated;

create or replace function public.consume_ai_quota(p_daily_limit int, p_global_daily_limit int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (pg_catalog.now() at time zone 'Asia/Shanghai')::date;
  v_count int;
  v_total bigint;
  v_user_limit int;
  v_global_limit int;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  -- Callers cannot enlarge limits through a direct RPC call. Server settings may lower them.
  if p_daily_limit is null or p_global_daily_limit is null or p_daily_limit < 1 or p_global_daily_limit < 1 then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(6101201);
  select user_daily_limit, global_daily_limit into v_user_limit, v_global_limit from public.ai_quota_limits where id = true;
  select coalesce(sum(request_count), 0) into v_total from public.ai_usage where usage_date = v_day;
  select request_count into v_count from public.ai_usage where user_id = v_uid and usage_date = v_day;
  if coalesce(v_count, 0) >= least(p_daily_limit, v_user_limit) or v_total >= least(p_global_daily_limit, v_global_limit) then return false; end if;
  insert into public.ai_usage(user_id, usage_date, request_count) values (v_uid, v_day, 1)
  on conflict (user_id, usage_date) do update set request_count = public.ai_usage.request_count + 1;
  return true;
end;
$$;
revoke all on function public.consume_ai_quota(int, int) from public, anon;
grant execute on function public.consume_ai_quota(int, int) to authenticated;
