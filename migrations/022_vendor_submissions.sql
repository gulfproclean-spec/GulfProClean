-- Vendor and subcontractor pricing submissions.
--
-- The verification columns are the point of this table. A vendor is only
-- dispatchable when its licence has been checked against the issuing authority
-- and its insurance is current — an uninsured subcontractor's workers become
-- the hiring contractor's employees for injury purposes, so "we have their COI
-- somewhere" is not good enough.
--
-- No banking details are collected or stored. The W-9 arrives by email after
-- verification and lives outside this database.

create table if not exists vendor_submissions (
  id uuid primary key default gen_random_uuid(),

  business_name text not null,
  contact_name  text not null,
  email         text not null,
  phone         text not null,

  trades text[] not null default '{}',
  areas  text[] not null default '{}',

  license_number    text,
  license_authority text,
  license_expires   date,

  hourly_rate numeric(10,2),

  -- new | verifying | approved | rejected | inactive
  status text not null default 'new',

  license_verified_at   timestamptz,
  license_verified_by   text,
  coi_received          boolean not null default false,
  w9_received           boolean not null default false,
  workers_comp_verified boolean not null default false,

  -- Everything else from the form: rate card, response times, insurance
  -- limits, references, certifications.
  details jsonb not null default '{}'::jsonb,

  notes_internal text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendor_submissions_created_idx on vendor_submissions (created_at desc);
create index if not exists vendor_submissions_status_idx  on vendor_submissions (status);
create index if not exists vendor_submissions_trades_idx  on vendor_submissions using gin (trades);

-- Surfaces vendors whose licence or insurance is about to lapse, which is the
-- query the vendor coordinator should be running every week.
create index if not exists vendor_license_expiry_idx on vendor_submissions (license_expires)
  where status = 'approved';
