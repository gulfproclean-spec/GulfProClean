-- Brings employee_sessions in line with the hashed-session-token scheme
-- 032 applied to sessions/applicant_sessions/vendor_sessions.
--
-- Production already has an employee_sessions table — it was created
-- out-of-band from this PR's original migration (030_employee_accounts_
-- and_field_ops.sql, applied directly by hand before this PR was merged
-- and before 032's hashing work existed), with a raw `token` primary key.
-- 033 (this PR, reconciled) defines employee_sessions with `token_hash`
-- from the start, so on any database where 033 created the table fresh
-- this is a no-op. On production, where the table predates 033/032, this
-- migrates it in place.
--
-- employee_sessions had zero rows at the time this was written (employee
-- login had not shipped to any real technician yet), so this is a same-day
-- schema fix, not a "log everyone out" migration like 032 was.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'employee_sessions' and column_name = 'token'
  ) then
    delete from employee_sessions;
    alter table employee_sessions drop column token;
    alter table employee_sessions add column token_hash text primary key;
  end if;
end $$;
