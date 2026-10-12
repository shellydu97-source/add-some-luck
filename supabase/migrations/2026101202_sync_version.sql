alter table public.user_app_data add column if not exists version bigint not null default 0;
alter table public.user_app_data enable row level security;
-- Direct writes would bypass optimistic concurrency.
revoke insert, update on public.user_app_data from authenticated;
revoke all on public.user_app_data from public, anon;
grant select, delete on public.user_app_data to authenticated;
do $$ begin
  if not exists (select 1 from pg_catalog.pg_constraint where conname = 'user_app_data_payload_size' and conrelid = 'public.user_app_data'::regclass) then
    alter table public.user_app_data add constraint user_app_data_payload_size check (pg_column_size(payload) <= 5 * 1024 * 1024) not valid;
  end if;
end $$;
create or replace function public.save_user_app_data(p_payload jsonb, p_data_hash text, p_expected_version bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_version bigint;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' or pg_catalog.pg_column_size(p_payload) > 5 * 1024 * 1024 then raise exception 'payload_invalid' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text, 6101202));
  select version into v_version from public.user_app_data where user_id = v_uid for update;
  if v_version is null then
    if p_expected_version is distinct from 0 then raise exception 'version_conflict' using errcode = 'P0001'; end if;
    insert into public.user_app_data(user_id, payload, data_hash, version) values (v_uid, p_payload, p_data_hash, 1);
    return 1;
  end if;
  if v_version is distinct from p_expected_version then raise exception 'version_conflict' using errcode = 'P0001'; end if;
  update public.user_app_data set payload = p_payload, data_hash = p_data_hash, client_updated_at = pg_catalog.now(), version = version + 1 where user_id = v_uid;
  return v_version + 1;
end;
$$;
revoke all on function public.save_user_app_data(jsonb, text, bigint) from public, anon;
grant execute on function public.save_user_app_data(jsonb, text, bigint) to authenticated;
