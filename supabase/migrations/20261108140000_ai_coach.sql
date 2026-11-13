-- Phase 9: AI Coach daily usage counters for rate limits.
-- Do not edit earlier migrations.
--
-- Before applying this file, schema_migrations must already record Phase 1–8
-- versions (through 20261107180000). Those earlier files are idempotent; if
-- objects exist but versions are missing, push/repair them first, then this.

create table if not exists public.ai_coach_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_day date not null,
  request_count integer not null default 0,
  token_estimate integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_day),
  constraint ai_coach_usage_request_count_nonneg check (request_count >= 0),
  constraint ai_coach_usage_token_estimate_nonneg check (token_estimate >= 0)
);

create index if not exists ai_coach_usage_day_idx
  on public.ai_coach_usage (usage_day);

alter table public.ai_coach_usage enable row level security;

drop policy if exists ai_coach_usage_select_own on public.ai_coach_usage;
create policy ai_coach_usage_select_own
  on public.ai_coach_usage
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists ai_coach_usage_insert_own on public.ai_coach_usage;
create policy ai_coach_usage_insert_own
  on public.ai_coach_usage
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists ai_coach_usage_update_own on public.ai_coach_usage;
create policy ai_coach_usage_update_own
  on public.ai_coach_usage
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Atomic consume of one daily request. Returns remaining allowance after success,
-- or raises when the daily cap is exceeded. user_id always comes from auth.uid().
create or replace function public.consume_ai_coach_request(
  p_daily_limit integer default 10,
  p_token_estimate integer default 0
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_day date := (timezone('utc', now()))::date;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_daily_limit is null or p_daily_limit < 1 then
    raise exception 'Invalid daily limit';
  end if;

  if p_token_estimate is null or p_token_estimate < 0 then
    p_token_estimate := 0;
  end if;

  insert into public.ai_coach_usage as u (user_id, usage_day, request_count, token_estimate)
  values (v_user_id, v_day, 1, p_token_estimate)
  on conflict (user_id, usage_day) do update
    set
      request_count = u.request_count + 1,
      token_estimate = u.token_estimate + excluded.token_estimate,
      updated_at = now()
    where u.request_count < p_daily_limit
  returning u.request_count into v_count;

  -- No returning row means the athlete is already at the daily cap.
  if v_count is null then
    raise exception 'AI Coach daily limit reached';
  end if;

  return p_daily_limit - v_count;
end;
$$;

revoke all on function public.consume_ai_coach_request(integer, integer) from public;
grant execute on function public.consume_ai_coach_request(integer, integer) to authenticated;
