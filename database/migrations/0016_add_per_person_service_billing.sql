-- Support services charged by the number of residents each month.
-- Run after 0015_contract_opening_meter_readings.sql.

alter type service_billing_type
add value if not exists 'per_person';
