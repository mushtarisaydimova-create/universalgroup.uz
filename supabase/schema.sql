-- ============================================================================
-- universalgroup.uz — Supabase Persistent Backend Schema
-- Run this SQL in your Supabase SQL Editor to enable global real-time
-- persistence for Admin Panel content and progressive lockout state.
-- ============================================================================

create table if not exists public.ug_app_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ug_app_state enable row level security;

create policy "Public read access for universalgroup.uz"
  on public.ug_app_state for select
  using (true);

create policy "Admin write/upsert access for universalgroup.uz"
  on public.ug_app_state for insert
  with check (id in ('content', 'lockout'));

create policy "Admin update access for universalgroup.uz"
  on public.ug_app_state for update
  using (id in ('content', 'lockout'));

alter publication supabase_realtime add table public.ug_app_state;
