-- First-time-customer eligibility is decided by ADDRESS, not just by account:
-- a new email at a property we have already served is not a new customer.
--
-- Comparing raw address strings does not survive contact with real typing.
-- "123 Main St, Destin, FL 32541" and "123 main street, destin, fl 32541-1198"
-- are the same house, and under a plain lower(address) comparison each one
-- earns its own 10% first-time discount.
--
-- gpc_address_key() reduces an address to a comparable key: case-folded,
-- punctuation removed, whitespace collapsed, ZIP+4 truncated to ZIP5, and the
-- common street-type / directional / unit words folded to a single spelling.
--
-- It is deliberately conservative. It never merges two addresses that differ
-- in house number, street name, unit number, city or ZIP — failing to merge
-- costs us 10% once, merging wrongly denies a real new customer their
-- discount, and those are not equally bad.
--
-- This function is the ONLY definition of the normalization. Application code
-- calls it instead of reimplementing it (see functions/_lib/first-time.js),
-- so the comparison that sets the price and the index that makes it fast
-- cannot drift apart.

create or replace function gpc_address_key(addr text)
returns text
language plpgsql
immutable
parallel safe
as $$
declare
  s text;
begin
  if addr is null then
    return null;
  end if;

  s := lower(addr);

  -- ZIP+4 down to ZIP5, while the hyphen still exists to anchor on.
  s := regexp_replace(s, '(\d{5})-\d{4}\y', '\1', 'g');

  -- Everything that is not a letter or a digit becomes a single space, so
  -- "#4B", "Apt. 4-B" and "Apt 4 B" converge on the same token stream.
  s := regexp_replace(s, '[^a-z0-9]+', ' ', 'g');

  -- Street types. \y is a word boundary, so "Eastwood" and "Streetsboro"
  -- are left alone.
  s := regexp_replace(s, '\y(street|str)\y',           'st',   'g');
  s := regexp_replace(s, '\y(avenue|aven|ave)\y',      'av',   'g');
  s := regexp_replace(s, '\y(road)\y',                 'rd',   'g');
  s := regexp_replace(s, '\y(drive|driv)\y',           'dr',   'g');
  s := regexp_replace(s, '\y(lane)\y',                 'ln',   'g');
  s := regexp_replace(s, '\y(boulevard|boul|blvd)\y',  'blvd', 'g');
  s := regexp_replace(s, '\y(court)\y',                'ct',   'g');
  s := regexp_replace(s, '\y(place)\y',                'pl',   'g');
  s := regexp_replace(s, '\y(terrace|terr)\y',         'ter',  'g');
  s := regexp_replace(s, '\y(circle|circ)\y',          'cir',  'g');
  s := regexp_replace(s, '\y(highway)\y',              'hwy',  'g');
  s := regexp_replace(s, '\y(parkway|pkway)\y',        'pkwy', 'g');
  s := regexp_replace(s, '\y(trail)\y',                'trl',  'g');
  s := regexp_replace(s, '\y(square)\y',               'sq',   'g');

  -- Directionals.
  s := regexp_replace(s, '\y(northeast)\y', 'ne', 'g');
  s := regexp_replace(s, '\y(northwest)\y', 'nw', 'g');
  s := regexp_replace(s, '\y(southeast)\y', 'se', 'g');
  s := regexp_replace(s, '\y(southwest)\y', 'sw', 'g');
  s := regexp_replace(s, '\y(north)\y',     'n',  'g');
  s := regexp_replace(s, '\y(south)\y',     's',  'g');
  s := regexp_replace(s, '\y(east)\y',      'e',  'g');
  s := regexp_replace(s, '\y(west)\y',      'w',  'g');

  -- Unit designators are DROPPED, not renamed: "Apt 4B", "Unit 4B",
  -- "Suite 4B" and "#4B" (the # is already a space by now) must all reduce
  -- to the same thing, and the last of those carries no designator word at
  -- all to rename. The unit VALUE is never touched, so 4B and 4C stay
  -- different addresses, and a unit that is present still differs from one
  -- that is absent.
  s := regexp_replace(s, '\y(apartment|apt|unit|suite|ste)\y', ' ', 'g');

  -- State.
  s := regexp_replace(s, '\y(florida)\y', 'fl', 'g');

  s := btrim(regexp_replace(s, '\s+', ' ', 'g'));
  return nullif(s, '');
end;
$$;

-- Makes the first-time lookup an index scan rather than a normalization of
-- every row in the table. Must match the expression in first-time.js exactly.
create index if not exists bookings_address_key_idx
  on bookings (gpc_address_key(address));
