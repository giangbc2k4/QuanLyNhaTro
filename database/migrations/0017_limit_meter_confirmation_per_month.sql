-- Allow each metered contract service to be confirmed only once per month.
-- Rejected and failed submissions may still be retried.
-- Run after 0016_add_per_person_service_billing.sql.

alter table meter_reading_values
add column billing_month date;

update meter_reading_values as value
set billing_month = submission.billing_month
from meter_reading_submissions as submission
where submission.id = value.submission_id;

-- Keep the latest confirmed value if old data contains duplicates.
with ranked_values as (
  select
    id,
    row_number() over (
      partition by contract_service_id, billing_month
      order by created_at desc, id desc
    ) as duplicate_rank
  from meter_reading_values
)
delete from meter_reading_values
where id in (
  select id
  from ranked_values
  where duplicate_rank > 1
);

alter table meter_reading_values
alter column billing_month set not null;

alter table meter_reading_values
add constraint meter_value_billing_month_check
check (billing_month = date_trunc('month', billing_month)::date);

create unique index meter_values_service_month_uidx
on meter_reading_values(contract_service_id, billing_month);

create index meter_values_account_month_idx
on meter_reading_values(account_id, billing_month desc);
