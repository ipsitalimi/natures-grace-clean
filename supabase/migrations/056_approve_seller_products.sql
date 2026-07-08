-- Seller listings should be visible in the store as soon as they are added.
UPDATE public.products
SET approval_status = 'Approved',
    updated_at = NOW()
WHERE seller_id IS NOT NULL
  AND approval_status = 'Pending';
