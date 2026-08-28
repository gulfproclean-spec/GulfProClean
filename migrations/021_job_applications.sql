-- Job applications and the pre-hire authorizations that follow a conditional
-- offer.
--
-- DELIBERATELY NOT STORED HERE: Social Security number, date of birth, driver
-- license number, and any image of an identity document. Those identifiers go
-- straight to the consumer reporting agency through its own portal, and Form
-- I-9 documents are examined in person on the first day. What this schema
-- keeps is the *evidence of consent* — who authorized what, when, and from
-- where — which is the part an employer actually has to be able to produce.

create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),

  role_slug  text not null,
  role_title text not null,

  first_name text not null,
  last_name  text not null,
  email      text not null,
  phone      text not null,
  city       text,
  zip        text,

  -- new | screening | interview | working_interview | offer | onboarding
  -- | hired | declined | withdrawn
  status text not null default 'new',

  -- The two questions an employer may lawfully ask about work eligibility.
  -- Neither is citizenship or immigration status, which we never ask.
  work_authorized   boolean,
  needs_sponsorship boolean,
  is_adult          boolean,

  -- s.768.096(1)(c), Fla. Stat. — the application must ask whether the
  -- applicant has ever been convicted of a crime for the negligent-hiring
  -- presumption to apply. A "yes" is assessed individually, never automatic.
  convicted               boolean,
  conviction_explanation  text,

  days   text[] not null default '{}',
  shifts text[] not null default '{}',

  employment         jsonb not null default '[]'::jsonb,
  -- "references" is a reserved word in SQL, hence the name.
  reference_contacts jsonb not null default '[]'::jsonb,
  answers            jsonb not null default '{}'::jsonb,

  notes_internal text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_applications_created_idx on job_applications (created_at desc);
create index if not exists job_applications_status_idx  on job_applications (status);
create index if not exists job_applications_role_idx    on job_applications (role_slug);

-- One row per conditional offer. The token is what makes onboarding.html
-- reachable; without it the page shows nothing.
create table if not exists prehire_authorizations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references job_applications(id) on delete cascade,

  token text not null unique,

  role_slug  text,
  role_title text,
  drives     boolean not null default true,

  legal_name           text,
  confirmed_start_date date,

  fcra_authorized          boolean not null default false,
  fcra_summary_received    boolean not null default false,
  mvr_authorized           boolean not null default false,
  i9_acknowledged          boolean not null default false,
  drug_policy_acknowledged boolean not null default false,
  esign_acknowledged       boolean not null default false,

  -- Evidence for the electronic signature under the federal ESIGN Act.
  signed_ip         text,
  signed_user_agent text,

  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists prehire_app_idx on prehire_authorizations (application_id);
