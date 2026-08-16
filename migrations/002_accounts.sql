create extension if not exists pgcrypto;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token text primary key,
  customer_id uuid not null references customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  page text not null,
  address text not null,
  notes text,
  tier text not null,
  booking_type text not null,
  frequency text not null,
  addons jsonb not null default '[]',
  visits_count int not null,
  gross_total numeric not null,
  final_total numeric not null,
  is_first_time boolean not null,
  scheduled_date date,
  scheduled_time text,
  created_at timestamptz not null default now()
);

create table if not exists schedule_settings (
  id int primary key default 1,
  days jsonb not null,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
