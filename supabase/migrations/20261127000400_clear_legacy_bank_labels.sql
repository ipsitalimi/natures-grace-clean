-- Clear legacy bank labels now that payouts are manually handled by the admin team.
-- Keep nullable columns for compatibility with older deployed schema/functions,
-- but no app surface or API collects or reads these values.
UPDATE public.seller_wallets
SET bank_account_label = NULL
WHERE bank_account_label IS NOT NULL;

UPDATE public.practitioner_wallets
SET bank_account_label = NULL
WHERE bank_account_label IS NOT NULL;
