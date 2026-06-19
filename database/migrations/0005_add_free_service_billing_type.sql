-- Add the free billing type to databases that already ran migration 0004.
-- This must commit before the new enum value is used by the next migration.

alter type service_billing_type add value if not exists 'free';
