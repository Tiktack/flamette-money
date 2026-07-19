-- Transaction and trip dates are day-granularity and the convention is UTC midnight of
-- the calendar day (email imports always stored them that way). The editor UI, however,
-- used to send local midnight converted to UTC — a July 14 entry in UTC+2 was stored as
-- 2026-07-13T22:00:00Z — so day-based filters and report buckets shifted those rows into
-- the previous day. Snap every non-UTC-midnight date to UTC midnight of its LOCAL
-- calendar day: 'localtime' resolves with the timezone of the machine applying the
-- migration, which is the machine those rows were created on.
UPDATE transactions
SET date = CAST(strftime('%s', date(date / 1000, 'unixepoch', 'localtime')) AS INTEGER) * 1000
WHERE date % 86400000 <> 0;

UPDATE trips
SET start_date = CAST(strftime('%s', date(start_date / 1000, 'unixepoch', 'localtime')) AS INTEGER) * 1000
WHERE start_date IS NOT NULL AND start_date % 86400000 <> 0;

UPDATE trips
SET end_date = CAST(strftime('%s', date(end_date / 1000, 'unixepoch', 'localtime')) AS INTEGER) * 1000
WHERE end_date IS NOT NULL AND end_date % 86400000 <> 0;
