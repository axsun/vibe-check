-- ── Vibe Check schema ── paste into Supabase SQL editor (one time) ──

create table if not exists vibes (
  id            uuid primary key default gen_random_uuid(),
  place_name    text not null,
  lat           float8,
  lng           float8,
  handle        text not null default 'anon',
  clip_url      text,
  loudness      int  not null default 0,
  music_present bool not null default false,
  music_volume  int,
  music_genre   text,
  has_lyrics    bool,
  talk_level    int  not null default 0,
  emotional_register text not null default 'lively',
  summary       text not null default '',
  popping_score int  not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists vibes_created_at_idx on vibes (created_at desc);

-- Server writes with the service_role key (bypasses RLS). For the demo we also
-- allow anon read so the browser could query directly if you ever want to.
alter table vibes enable row level security;
drop policy if exists "public read vibes" on vibes;
create policy "public read vibes" on vibes for select using (true);

-- ── Storage ──
-- In the dashboard: Storage -> New bucket -> name "clips" -> Public bucket = ON.
-- (Public read lets the feed's <audio> play clips without signed URLs.)

-- Stretch: reactions
-- create table if not exists reactions (
--   id uuid primary key default gen_random_uuid(),
--   vibe_id uuid references vibes(id) on delete cascade,
--   handle text, type text default 'fire',
--   created_at timestamptz default now()
-- );
