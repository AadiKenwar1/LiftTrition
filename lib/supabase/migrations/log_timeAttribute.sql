-- Ordering key: epoch milliseconds (same idea as JS Date.now())
ALTER TABLE public.logs
ADD COLUMN IF NOT EXISTS time bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.logs.time IS 'When the set was logged (ms since epoch); used for ordering within a day.';