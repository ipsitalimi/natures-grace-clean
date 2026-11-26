-- Clear legacy bank labels and remove the placeholder defaults now that payouts are manually handled by the admin team.
-- Keep nullable columns for compatibility with older deployed schema/functions,
-- but no app surface or API collects or reads these values.
ALTER TABLE public.seller_wallets
  ALTER COLUMN bank_account_label DROP DEFAULT;
ALTER TABLE public.practitioner_wallets
  ALTER COLUMN bank_account_label DROP DEFAULT;

UPDATE public.seller_wallets
SET bank_account_label = NULL
WHERE bank_account_label IS NOT NULL;

UPDATE public.practitioner_wallets
SET bank_account_label = NULL
WHERE bank_account_label IS NOT NULL;
