-- ============================================================================
-- Security fix: session tokens for customers, job applicants, and vendors
-- were stored RAW in sessions / applicant_sessions / vendor_sessions and
-- compared directly against the incoming cookie value on every request
-- (see functions/_lib/auth.js). Passwords in this codebase already use
-- salted PBKDF2-SHA256 hashes (hashPassword/verifyPassword) — sessions now
-- get the equivalent protection: only sha256(token) is ever written to the
-- database (see hashToken in functions/_lib/auth.js), never the raw,
-- bearer-usable token itself. If the database were ever read by someone
-- unauthorized, a stolen token_hash cannot be replayed as a session cookie
-- the way a stolen raw token could.
--
-- ****************************************************************************
-- WARNING — APPLYING THIS MIGRATION LOGS EVERYONE OUT.
--
-- There is no way to compute sha256(token) for a session created under the
-- old scheme without its raw token, so every row in the three tables below
-- is deleted as part of this migration. Every customer, job applicant, and
-- vendor who is currently logged in will be signed out immediately and will
-- need to log in again. This is expected, was accepted by the owner as the
-- tradeoff for closing this vulnerability, and is not a bug in this
-- migration or in the application. Apply it at a low-traffic time and give
-- the team a heads-up beforehand.
-- ****************************************************************************
--
-- Corresponding code changes: functions/_lib/auth.js (hashToken, and
-- getCustomerFromSession / getApplicantFromSession / getVendorFromSession
-- now query token_hash instead of token) and every login/signup/logout
-- endpoint under functions/api/{auth,applicant-auth,vendor-auth}/ (each now
-- hashes the token before it is written to or looked up in the database;
-- the raw token in the Set-Cookie response header is unchanged).
-- ============================================================================

-- Invalidate every existing session outright (see warning above) rather
-- than leaving orphaned rows behind with no usable token_hash.
delete from sessions;
delete from applicant_sessions;
delete from vendor_sessions;

-- Drop the raw token column (it was the primary key) so it can never again
-- be read or written by any code path, old or new.
alter table sessions drop column token;
alter table applicant_sessions drop column token;
alter table vendor_sessions drop column token;

-- Replace it with a hash-only column. All three tables are empty at this
-- point (see deletes above), so it's safe to make this the new primary key
-- directly — matching the original "token is the primary key" shape, just
-- hashed.
alter table sessions add column token_hash text primary key;
alter table applicant_sessions add column token_hash text primary key;
alter table vendor_sessions add column token_hash text primary key;
