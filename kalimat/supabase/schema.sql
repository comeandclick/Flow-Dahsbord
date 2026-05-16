-- ============================================================
-- KALIMAT — Schéma Supabase
-- ============================================================

-- Extension
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- COURSES
-- ============================================================
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  slug text unique not null,
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  "order" integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- WORDS
-- ============================================================
create table if not exists words (
  id uuid primary key default gen_random_uuid(),
  arabic text not null,
  french text not null,
  phonetic text,
  course_id uuid references courses(id) on delete set null,
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  example_arabic text,
  example_french text,
  audio_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- WORD OPTIONS (wrong answers)
-- ============================================================
create table if not exists word_options (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references words(id) on delete cascade,
  option_text text not null,
  language text not null default 'french' check (language in ('french', 'arabic'))
);

-- ============================================================
-- ATTEMPTS
-- ============================================================
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  module text not null check (module in ('cartes', 'ecriture')),
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- USER STATS
-- ============================================================
create table if not exists user_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  total_correct integer not null default 0,
  total_incorrect integer not null default 0,
  streak_days integer not null default 0,
  last_activity_at timestamptz,
  cards_completed integer not null default 0,
  courses_started integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- FAVORITES
-- ============================================================
create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, word_id)
);

-- ============================================================
-- DAILY PROGRESS
-- ============================================================
create table if not exists daily_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  correct integer not null default 0,
  incorrect integer not null default 0,
  unique(user_id, date)
);

-- ============================================================
-- FUNCTION: increment_stat
-- ============================================================
create or replace function increment_stat(uid uuid, stat_name text)
returns void
language plpgsql
security definer
as $$
begin
  if stat_name = 'total_correct' then
    insert into user_stats (user_id, total_correct)
    values (uid, 1)
    on conflict (user_id) do update set total_correct = user_stats.total_correct + 1, updated_at = now();
  elsif stat_name = 'total_incorrect' then
    insert into user_stats (user_id, total_incorrect)
    values (uid, 0)
    on conflict (user_id) do update set total_incorrect = user_stats.total_incorrect + 1, updated_at = now();
  elsif stat_name = 'cards_completed' then
    insert into user_stats (user_id, cards_completed)
    values (uid, 1)
    on conflict (user_id) do update set cards_completed = user_stats.cards_completed + 1, updated_at = now();
  elsif stat_name = 'courses_started' then
    insert into user_stats (user_id, courses_started)
    values (uid, 1)
    on conflict (user_id) do update set courses_started = user_stats.courses_started + 1, updated_at = now();
  end if;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- profiles
alter table profiles enable row level security;
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_select_all_authenticated" on profiles for select using (auth.role() = 'authenticated');

-- courses (public read)
alter table courses enable row level security;
create policy "courses_select_published" on courses for select using (is_published = true or exists (
  select 1 from profiles where id = auth.uid() and role = 'admin'
));
create policy "courses_admin_all" on courses for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- words (public read)
alter table words enable row level security;
create policy "words_select_published" on words for select using (is_published = true or exists (
  select 1 from profiles where id = auth.uid() and role = 'admin'
));
create policy "words_admin_all" on words for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- word_options
alter table word_options enable row level security;
create policy "word_options_select_all" on word_options for select using (true);
create policy "word_options_admin_all" on word_options for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- attempts
alter table attempts enable row level security;
create policy "attempts_own" on attempts for all using (auth.uid() = user_id);
create policy "attempts_admin_select" on attempts for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- user_stats
alter table user_stats enable row level security;
create policy "user_stats_own" on user_stats for all using (auth.uid() = user_id);
create policy "user_stats_select_all_authenticated" on user_stats for select using (auth.role() = 'authenticated');

-- favorites
alter table favorites enable row level security;
create policy "favorites_own" on favorites for all using (auth.uid() = user_id);

-- daily_progress
alter table daily_progress enable row level security;
create policy "daily_progress_own" on daily_progress for all using (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_words_course_id on words(course_id);
create index if not exists idx_attempts_user_id on attempts(user_id);
create index if not exists idx_attempts_word_id on attempts(word_id);
create index if not exists idx_attempts_created_at on attempts(created_at desc);
create index if not exists idx_user_stats_total_correct on user_stats(total_correct desc);
create index if not exists idx_word_options_word_id on word_options(word_id);
