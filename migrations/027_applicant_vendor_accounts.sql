-- Required accounts for applicants and vendors (customers already had this —
-- see customers/sessions from an earlier migration). Per the owner's
-- instruction, a job application or a vendor pricing submission may no
-- longer be filed anonymously: each requires its own account, separate from
-- a customer account and from each other, matching the "three separate
-- account types" decision recorded in the accounts-feature-plan project doc.
--
-- Mirrors the customers/sessions shape exactly (email+hash+salt, a
-- token-keyed session table) so functions/_lib/auth.js can reuse the same
-- password hashing and session-cookie helpers for all three account types.
--
-- Additive only. No drops, no data changes. job_applications and
-- vendor_submissions each get a nullable link column so existing rows (there
-- are none in production yet) are not invalidated.

create table if not exists applicant_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now()
);

create table if not exists applicant_sessions (
  token text primary key,
  applicant_account_id uuid not null references applicant_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists vendor_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now()
);

create table if not exists vendor_sessions (
  token text primary key,
  vendor_account_id uuid not null references vendor_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table job_applications
  add column if not exists applicant_account_id uuid references applicant_accounts(id);

alter table vendor_submissions
  add column if not exists vendor_account_id uuid references vendor_accounts(id);

create index if not exists job_applications_applicant_account_idx on job_applications(applicant_account_id);
create index if not exists vendor_submissions_vendor_account_idx on vendor_submissions(vendor_account_id);
