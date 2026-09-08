-- Regression test for gpc_address_key (migrations/024_address_key.sql), the
-- normalization that decides whether a booking address is one we have served
-- before — and therefore whether the customer gets the 10% first-time
-- discount.
--
--   psql "$DATABASE_URL" -f test-address-key.sql
--
-- Every row must report PASS. The `false` cases matter more than the `true`
-- ones: merging two addresses that are not the same property denies a real
-- new customer their discount, which is worse than failing to merge and
-- giving 10% away once.
with cases(label, a, b, should_match) as (values
  ('case + punctuation',      '123 Main St, Destin, FL 32541',        '123 main street, destin, fl. 32541',   true),
  ('zip+4',                   '123 Main St, Destin, FL 32541',        '123 Main St, Destin, FL 32541-1198',   true),
  ('unit spelling apt vs #',  '55 Gulf Blvd, Apt 4B, Destin, FL 32541','55 Gulf Boulevard, #4B, Destin, FL 32541', true),
  ('suite vs ste',            '900 Harbor Dr, Suite 200, Destin, FL 32541','900 Harbor Drive, Ste. 200, Destin, FL 32541', true),
  ('unit vs apartment',       '12 Bay Ct, Unit 7, Destin, FL 32541',  '12 Bay Court, Apartment 7, Destin, FL 32541', true),
  ('directional',             '10 North Bay Ave, Navarre, FL 32566',  '10 N Bay Avenue, Navarre, FL 32566',   true),
  ('extra whitespace',        '  123   Main  St , Destin, FL 32541 ', '123 Main St, Destin, FL 32541',        true),
  ('parkway',                 '7 Emerald Pkway, Destin, FL 32541',    '7 Emerald Parkway, Destin, FL 32541',  true),
  ('terrace',                 '3 Palm Terrace, Fort Walton, FL 32547','3 Palm Terr, Fort Walton, FL 32547',   true),
  ('DIFFERENT house number',  '123 Main St, Destin, FL 32541',        '125 Main St, Destin, FL 32541',        false),
  ('DIFFERENT unit',          '55 Gulf Blvd, Apt 4B, Destin, FL 32541','55 Gulf Blvd, Apt 4C, Destin, FL 32541', false),
  ('DIFFERENT street',        '123 Main St, Destin, FL 32541',        '123 Maple St, Destin, FL 32541',       false),
  ('DIFFERENT city',          '123 Main St, Destin, FL 32541',        '123 Main St, Navarre, FL 32566',       false),
  ('DIFFERENT zip',           '123 Main St, Destin, FL 32541',        '123 Main St, Destin, FL 32550',        false),
  ('unit present vs absent',  '55 Gulf Blvd, Apt 4B, Destin, FL 32541','55 Gulf Blvd, Destin, FL 32541',      false),
  ('word-boundary safety',    '4 Eastwood Ln, Destin, FL 32541',      '4 E wood Ln, Destin, FL 32541',        false),
  ('N vs S directional',      '10 N Bay Av, Navarre, FL 32566',       '10 S Bay Av, Navarre, FL 32566',       false)
)
select case when (gpc_address_key(a) = gpc_address_key(b)) = should_match
            then 'PASS' else 'FAIL' end as result,
       label,
       gpc_address_key(a) as key_a,
       gpc_address_key(b) as key_b
from cases
order by result, label;
