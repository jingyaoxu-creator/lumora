-- ─── Lumora Database Schema ───
-- Run this in Supabase SQL Editor to set up tables

-- Scan history: stores each URL analysis
create table if not exists scan_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  page_title text,
  seo_score integer,
  geo_score integer,
  overall_score integer,
  results jsonb, -- full AnalysisResult payload
  created_at timestamptz default now() not null
);

-- User profiles: extended user data & plan info
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  plan text default 'free' check (plan in ('free', 'pro', 'business')),
  scans_used integer default 0,
  scans_limit integer default 5,
  waffo_customer_id text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Row-level security
alter table scan_history enable row level security;
alter table profiles enable row level security;

-- Policies: users can only see/modify their own data
create policy "Users can view own scans"
  on scan_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on scan_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own scans"
  on scan_history for delete
  using (auth.uid() = user_id);

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Trigger: auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Index for faster scan lookups
create index if not exists idx_scan_history_user_id on scan_history(user_id);
create index if not exists idx_scan_history_created_at on scan_history(created_at desc);

-- ─── Ranked Sites: public leaderboard data ───
create table if not exists ranked_sites (
  id uuid primary key default gen_random_uuid(),
  domain text unique not null,
  url text not null,
  name text not null,
  category text not null,
  description text,
  overall_score integer,
  seo_score integer,
  geo_score integer,
  results jsonb,  -- full AnalysisResult payload
  scanned_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Public read access (no auth needed), only service role can write
alter table ranked_sites enable row level security;

create policy "Anyone can view ranked sites"
  on ranked_sites for select
  using (true);

-- Index for leaderboard queries
create index if not exists idx_ranked_sites_category on ranked_sites(category);
create index if not exists idx_ranked_sites_overall_score on ranked_sites(overall_score desc nulls last);
