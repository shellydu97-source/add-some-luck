-- Give back one request when generation fails before any answer reaches the user.
create or replace function public.refund_ai_quota()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (pg_catalog.now() at time zone 'Asia/Shanghai')::date;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  update public.ai_usage set request_count = greatest(request_count - 1, 0)
  where user_id = v_uid and usage_date = v_day;
end;
$$;
revoke all on function public.refund_ai_quota() from public, anon;
grant execute on function public.refund_ai_quota() to authenticated;
