'use client'
import { useState } from 'react'

const SCHEMA_SQL = `-- KALIMAT — Schéma Supabase
-- Copiez-collez ce SQL dans l'éditeur SQL de Supabase

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists word_options (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references words(id) on delete cascade,
  option_text text not null,
  language text not null default 'french' check (language in ('french', 'arabic'))
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  module text not null check (module in ('cartes', 'ecriture')),
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

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

create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, word_id)
);

create table if not exists daily_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  correct integer not null default 0,
  incorrect integer not null default 0,
  unique(user_id, date)
);

create or replace function increment_stat(uid uuid, stat_name text)
returns void language plpgsql security definer as $$
begin
  if stat_name = 'total_correct' then
    insert into user_stats (user_id, total_correct) values (uid, 1)
    on conflict (user_id) do update set total_correct = user_stats.total_correct + 1, updated_at = now();
  elsif stat_name = 'total_incorrect' then
    insert into user_stats (user_id, total_incorrect) values (uid, 0)
    on conflict (user_id) do update set total_incorrect = user_stats.total_incorrect + 1, updated_at = now();
  elsif stat_name = 'cards_completed' then
    insert into user_stats (user_id, cards_completed) values (uid, 1)
    on conflict (user_id) do update set cards_completed = user_stats.cards_completed + 1, updated_at = now();
  elsif stat_name = 'courses_started' then
    insert into user_stats (user_id, courses_started) values (uid, 1)
    on conflict (user_id) do update set courses_started = user_stats.courses_started + 1, updated_at = now();
  end if;
end; $$;

alter table profiles enable row level security;
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_select_all_authenticated" on profiles for select using (auth.role() = 'authenticated');

alter table courses enable row level security;
create policy "courses_select_published" on courses for select using (is_published = true or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "courses_admin_all" on courses for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

alter table words enable row level security;
create policy "words_select_published" on words for select using (is_published = true or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "words_admin_all" on words for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

alter table word_options enable row level security;
create policy "word_options_select_all" on word_options for select using (true);
create policy "word_options_admin_all" on word_options for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

alter table attempts enable row level security;
create policy "attempts_own" on attempts for all using (auth.uid() = user_id);
create policy "attempts_admin_select" on attempts for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

alter table user_stats enable row level security;
create policy "user_stats_own" on user_stats for all using (auth.uid() = user_id);
create policy "user_stats_select_all_authenticated" on user_stats for select using (auth.role() = 'authenticated');

alter table favorites enable row level security;
create policy "favorites_own" on favorites for all using (auth.uid() = user_id);

alter table daily_progress enable row level security;
create policy "daily_progress_own" on daily_progress for all using (auth.uid() = user_id);

create index if not exists idx_words_course_id on words(course_id);
create index if not exists idx_attempts_user_id on attempts(user_id);
create index if not exists idx_attempts_word_id on attempts(word_id);
create index if not exists idx_attempts_created_at on attempts(created_at desc);
create index if not exists idx_user_stats_total_correct on user_stats(total_correct desc);
create index if not exists idx_word_options_word_id on word_options(word_id);`

const SEED_SQL = `-- KALIMAT — Données de base
insert into courses (title, description, slug, level, "order") values
  ('Les chiffres', 'Apprenez les chiffres de 0 à 100 en arabe.', 'les-chiffres', 'beginner', 1),
  ('Les couleurs', 'Les couleurs essentielles en arabe.', 'les-couleurs', 'beginner', 2),
  ('Les jours', 'Les jours de la semaine en arabe.', 'les-jours', 'beginner', 3),
  ('La famille', 'Le vocabulaire de la famille en arabe.', 'la-famille', 'beginner', 4),
  ('Les pronoms', 'Les pronoms personnels en arabe.', 'les-pronoms', 'beginner', 5),
  ('Les phrases utiles', 'Phrases essentielles pour communiquer.', 'les-phrases-utiles', 'beginner', 6)
on conflict (slug) do nothing;

with c as (select id from courses where slug = 'les-chiffres')
insert into words (arabic, french, phonetic, course_id, level) values
  ('صفر','zéro','sifr',(select id from c),'beginner'),
  ('واحد','un','wahid',(select id from c),'beginner'),
  ('اثنان','deux','ithnan',(select id from c),'beginner'),
  ('ثلاثة','trois','thalatha',(select id from c),'beginner'),
  ('أربعة','quatre','arba''a',(select id from c),'beginner'),
  ('خمسة','cinq','khamsa',(select id from c),'beginner'),
  ('ستة','six','sitta',(select id from c),'beginner'),
  ('سبعة','sept','sab''a',(select id from c),'beginner'),
  ('ثمانية','huit','thamaniya',(select id from c),'beginner'),
  ('تسعة','neuf','tis''a',(select id from c),'beginner'),
  ('عشرة','dix','''ashara',(select id from c),'beginner')
on conflict do nothing;

with c as (select id from courses where slug = 'les-phrases-utiles')
insert into words (arabic, french, phonetic, course_id, level) values
  ('مرحبا','bonjour / salut','marhaba',(select id from c),'beginner'),
  ('شكرا','merci','shukran',(select id from c),'beginner'),
  ('من فضلك','s''il vous plaît','min fadlak',(select id from c),'beginner'),
  ('نعم','oui','na''am',(select id from c),'beginner'),
  ('لا','non','la',(select id from c),'beginner'),
  ('كيف حالك','comment vas-tu ?','kayfa halak',(select id from c),'beginner'),
  ('إلى اللقاء','au revoir','ila al-liqa',(select id from c),'beginner')
on conflict do nothing;

with c as (select id from courses where slug = 'la-famille')
insert into words (arabic, french, phonetic, course_id, level) values
  ('أب','père','ab',(select id from c),'beginner'),
  ('أم','mère','umm',(select id from c),'beginner'),
  ('أخ','frère','akh',(select id from c),'beginner'),
  ('أخت','soeur','ukht',(select id from c),'beginner'),
  ('ابن','fils','ibn',(select id from c),'beginner'),
  ('بنت','fille','bint',(select id from c),'beginner')
on conflict do nothing;`

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      style={{ background: copied ? '#16a34a' : '#2563EB', color: 'white' }}
    >
      {copied ? 'Copié !' : label}
    </button>
  )
}

export default function SetupPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Configuration de la base de données Kalimat
      </h1>
      <p style={{ color: '#6B7280', marginBottom: '2rem' }}>
        Exécutez ces deux requêtes SQL dans l&apos;éditeur Supabase pour initialiser la base de données.
      </p>

      <a
        href="https://supabase.com/dashboard/project/lzbcltsxfshfguivgcji/sql/new"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-block', marginBottom: '2rem', padding: '0.75rem 1.5rem', background: '#1a1a2e', color: 'white', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 600 }}
      >
        Ouvrir Supabase SQL Editor
      </a>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>1. Schéma (tables + fonctions + RLS)</h2>
          <CopyButton text={SCHEMA_SQL} label="Copier le schéma" />
        </div>
        <pre style={{ background: '#f3f4f6', borderRadius: '0.5rem', padding: '1rem', overflow: 'auto', fontSize: '0.75rem', maxHeight: 200 }}>
          {SCHEMA_SQL.slice(0, 300)}...
        </pre>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>2. Données de base (cours + mots)</h2>
          <CopyButton text={SEED_SQL} label="Copier les données" />
        </div>
        <pre style={{ background: '#f3f4f6', borderRadius: '0.5rem', padding: '1rem', overflow: 'auto', fontSize: '0.75rem', maxHeight: 200 }}>
          {SEED_SQL.slice(0, 300)}...
        </pre>
      </div>

      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.75rem', padding: '1rem' }}>
        <p style={{ fontSize: '0.875rem', color: '#15803d' }}>
          Une fois les deux requêtes exécutées, rendez-vous sur <strong>/register</strong> pour créer votre compte admin.
          Puis allez dans la table <code>profiles</code> de Supabase et changez votre <code>role</code> en <code>admin</code>.
        </p>
      </div>
    </div>
  )
}
