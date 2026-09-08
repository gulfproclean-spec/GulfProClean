-- Drug-free workplace program removed at the owner's explicit instruction
-- (2026-09-08) rather than completing the drafted policy. Every application
-- and API reference to this column was removed in the same change; this
-- drops the column itself.
--
-- Safe: prehire_authorizations has 0 rows in production as of this
-- migration (nobody has completed onboarding yet), so this is a structural
-- change only, not a data loss.

alter table prehire_authorizations
  drop column if exists drug_policy_acknowledged;
