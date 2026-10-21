-- À coller dans Supabase > SQL Editor > New query > Run (une seule fois).

create table if not exists profiles (
  user_id uuid primary key references auth.users on delete cascade,
  telegram_chat_id text,
  notify_telegram boolean not null default true,
  notify_email boolean not null default true
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  origins text[] not null default '{CDG,ORY}',
  destinations text[] not null default '{}',   -- codes IATA, ex. {JFK,EWR}
  anywhere boolean not null default false,      -- true = "n'importe où"
  date_from date not null,
  date_to date not null,
  one_way boolean not null default false,
  trip_min int,                                 -- durée du séjour (jours), aller-retour
  trip_max int,
  cabin text not null check (cabin in ('PREMIUM_ECONOMY','BUSINESS')),
  max_price numeric default 700,                -- seuil absolu (700 € par défaut)
  drop_pct int not null default 30,             -- baisse vs médiane habituelle (%)
  currency text not null default 'EUR',
  airlines_include text[] not null default '{}',
  airlines_exclude text[] not null default '{}',
  max_stops int not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_checked_at timestamptz
);

create table if not exists price_observations (
  id bigserial primary key,
  alert_id uuid not null references alerts on delete cascade,
  route text not null,                          -- "CDG-JFK"
  cabin text not null,
  depart_date date not null,
  return_date date,
  price numeric not null,
  currency text not null,
  airline text,
  stops int,
  source text,
  link text,
  observed_at timestamptz not null default now()
);
create index if not exists obs_route_idx on price_observations (route, cabin, observed_at desc);
create index if not exists obs_alert_idx on price_observations (alert_id, observed_at desc);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references alerts on delete cascade,
  user_id uuid not null,
  route text not null,
  cabin text not null,
  depart_date date not null,
  return_date date,
  price numeric not null,
  currency text not null,
  median_price numeric,
  discount_pct int,
  reasons text[] not null default '{}',
  airline text,
  stops int,
  link text,
  source text,
  status text not null default 'active',        -- active | expired
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  notified_price numeric,
  notified_at timestamptz
);
create index if not exists deals_user_idx on deals (user_id, status, last_seen desc);

create table if not exists feed_items (
  guid text primary key,
  source text not null,
  title text not null,
  link text,
  published_at timestamptz,
  matched_alert_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Compteur de recherches du mois par fournisseur (uniquement lisible par le worker).
create table if not exists api_usage (
  month text not null,
  provider text not null,
  count int not null default 0,
  primary key (month, provider)
);
alter table api_usage enable row level security;

-- Sécurité : chacun ne voit que ses données. Le worker utilise la clé "service_role" (accès total).
alter table profiles enable row level security;
alter table alerts enable row level security;
alter table price_observations enable row level security;
alter table deals enable row level security;
alter table feed_items enable row level security;

create policy "profil perso" on profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "alertes perso" on alerts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "prix de mes alertes" on price_observations for select
  using (exists (select 1 from alerts a where a.id = alert_id and a.user_id = auth.uid()));
create policy "mes offres" on deals for select using (user_id = auth.uid());
create policy "flux lisibles" on feed_items for select using (auth.role() = 'authenticated');
