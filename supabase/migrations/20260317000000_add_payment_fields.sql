ALTER TABLE client_info ADD COLUMN IF NOT EXISTS payment_amount NUMERIC;
ALTER TABLE client_info ADD COLUMN IF NOT EXISTS payment_frequency TEXT CHECK(payment_frequency IN ('monthly','yearly'));
ALTER TABLE client_info ADD COLUMN IF NOT EXISTS renewal_day INTEGER;
