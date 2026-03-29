-- HealthArena Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  bio text,
  social_links jsonb default '{}',  -- { "ig": "...", "line": "...", "fb": "..." }
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view all profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- ============================================================
-- FRIENDSHIPS
-- ============================================================
create table friendships (
  id uuid default uuid_generate_v4() primary key,
  requester_id uuid references profiles(id) on delete cascade,
  addressee_id uuid references profiles(id) on delete cascade,
  status text check (status in ('pending', 'accepted', 'blocked')) default 'pending',
  created_at timestamptz default now(),
  unique(requester_id, addressee_id)
);

alter table friendships enable row level security;
create policy "Users can see own friendships" on friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "Users can manage own friendships" on friendships for all
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ============================================================
-- HEALTH DATA
-- ============================================================
create table health_data (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  steps integer,
  weight numeric(5,2),       -- kg
  body_fat numeric(4,2),     -- %
  water_ml integer,          -- ml
  cigarettes integer,        -- 0 = quit smoking that day
  source text default 'manual' check (source in ('manual', 'healthkit')),
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table health_data enable row level security;
create policy "Users can manage own health data" on health_data for all
  using (auth.uid() = user_id);
-- Friends can view health data (for competition)
create policy "Friends can view health data" on health_data for select
  using (
    exists (
      select 1 from friendships
      where status = 'accepted'
      and (
        (requester_id = auth.uid() and addressee_id = user_id) or
        (addressee_id = auth.uid() and requester_id = user_id)
      )
    )
  );

-- ============================================================
-- ARENAS (競技場)
-- ============================================================
create table arenas (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references profiles(id) on delete cascade,
  name text not null,
  description text,
  rules jsonb not null,       -- ArenaRule schema
  reward_winner text not null,
  penalty_loser text not null,
  start_date date not null,
  end_date date not null,
  max_members integer,        -- null = unlimited
  status text check (status in ('pending', 'active', 'finished')) default 'pending',
  invite_code text unique not null,
  created_at timestamptz default now()
);

alter table arenas enable row level security;
create policy "Users can create arenas" on arenas for insert
  with check (auth.uid() = creator_id);
create policy "Creator can update arena" on arenas for update
  using (auth.uid() = creator_id);

-- ============================================================
-- ARENA MEMBERS
-- ============================================================
create table arena_members (
  id uuid default uuid_generate_v4() primary key,
  arena_id uuid references arenas(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(arena_id, user_id)
);

alter table arena_members enable row level security;

-- Arenas select policy (placed here because it references arena_members)
create policy "Arena members can view arenas" on arenas for select
  using (
    exists (
      select 1 from arena_members
      where arena_id = arenas.id and user_id = auth.uid()
    )
  );

create policy "Members can view arena membership" on arena_members for select
  using (
    exists (
      select 1 from arena_members am
      where am.arena_id = arena_members.arena_id and am.user_id = auth.uid()
    )
  );
create policy "Users can join arenas" on arena_members for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- DAILY REPORTS (AI 戰報)
-- ============================================================
create table daily_reports (
  id uuid default uuid_generate_v4() primary key,
  arena_id uuid references arenas(id) on delete cascade,
  date date not null,
  content text not null,      -- AI generated report
  suggestions jsonb default '[]',
  created_at timestamptz default now(),
  unique(arena_id, date)
);

alter table daily_reports enable row level security;
create policy "Arena members can view reports" on daily_reports for select
  using (
    exists (
      select 1 from arena_members
      where arena_id = daily_reports.arena_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- CHECK-INS (打卡拍照)
-- ============================================================
create table checkins (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  arena_id uuid references arenas(id) on delete cascade,
  photo_url text,
  caption text,
  created_at timestamptz default now()
);

alter table checkins enable row level security;
create policy "Arena members can view checkins" on checkins for select
  using (
    exists (
      select 1 from arena_members
      where arena_id = checkins.arena_id and user_id = auth.uid()
    )
  );
create policy "Users can create own checkins" on checkins for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- LEADERBOARD VIEW
-- ============================================================
create or replace view arena_leaderboard as
select
  am.arena_id,
  am.user_id,
  p.username,
  p.avatar_url,
  coalesce(hd.steps, 0) as today_steps,
  coalesce(hd.water_ml, 0) as today_water,
  hd.weight,
  hd.body_fat,
  -- Simple scoring: sum of normalized metrics (will be refined by backend)
  0 as total_score,
  row_number() over (partition by am.arena_id order by coalesce(hd.steps, 0) desc) as rank
from arena_members am
join profiles p on p.id = am.user_id
left join health_data hd on hd.user_id = am.user_id and hd.date = current_date;

-- ============================================================
-- AUTO-ACTIVATE ARENAS (trigger)
-- ============================================================
create or replace function update_arena_status()
returns void as $$
begin
  -- Activate arenas that have started
  update arenas set status = 'active'
  where status = 'pending' and start_date <= current_date;

  -- Finish arenas that have ended
  update arenas set status = 'finished'
  where status = 'active' and end_date < current_date;
end;
$$ language plpgsql;
