-- Himova 00007: notifications, rewards, app events

-- ---------------------------------------------------------------------------
-- notifications: per-recipient in-app messages
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id                      uuid primary key default gen_random_uuid(),
  recipient_profile_id    uuid not null references public.profiles(id) on delete cascade,
  category                text not null check (category in (
    'order', 'stock', 'leaderboard', 'reward', 'system', 'marketing'
  )),
  title                   text not null,
  body                    text,
  link                    text,
  read_at                 timestamptz,
  created_at              timestamptz not null default now()
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_profile_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (recipient_profile_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- rewards: leaderboard cycle winners and what they won
-- ---------------------------------------------------------------------------
create table if not exists public.rewards (
  id              uuid primary key default gen_random_uuid(),
  cycle_label     text not null,
  shopkeeper_id   uuid not null references public.shopkeepers(id) on delete cascade,
  rank            int not null check (rank > 0),
  reward_type     text not null check (reward_type in ('discount_percent', 'free_set', 'custom_item')),
  reward_value    text not null,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (cycle_label, shopkeeper_id)
);

create index if not exists rewards_cycle_idx on public.rewards (cycle_label);
create index if not exists rewards_shopkeeper_idx on public.rewards (shopkeeper_id);

-- ---------------------------------------------------------------------------
-- app_events: structured business event log for debugging and analytics
-- ---------------------------------------------------------------------------
create table if not exists public.app_events (
  id                  uuid primary key default gen_random_uuid(),
  event_type          text not null,
  actor_profile_id    uuid references public.profiles(id) on delete set null,
  shopkeeper_id       uuid references public.shopkeepers(id) on delete set null,
  payload             jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists app_events_type_idx on public.app_events (event_type, created_at desc);
create index if not exists app_events_shopkeeper_idx on public.app_events (shopkeeper_id, created_at desc);
