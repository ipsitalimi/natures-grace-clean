-- Remove dev/mock catalog rows inserted by legacy seedContentIfEmpty() and related seeds.
-- Safe for production: only targets rows with known legacy seed markers (image_key, legacy_id, titles).
-- Does NOT delete user profiles, sellers linked to profiles, or admin accounts.

DO $$
DECLARE
  v_product_ids UUID[];
  v_practitioner_ids UUID[];
  v_event_ids UUID[];
  v_resource_ids UUID[];
  v_thread_ids UUID[];
BEGIN
  -- Products seeded with bundled image keys (sp-1, mr-2, etc.)
  SELECT COALESCE(array_agg(id), '{}')
  INTO v_product_ids
  FROM public.products
  WHERE metadata->>'image_key' ~ '^(sp|mr|cn|ss|sr|dv)-[0-9]+$'
     OR name IN (
       'Switchword Energy Circle',
       'Evil Eye Protection Bracelet',
       'Manifestation Journal',
       'Organic Rose Face Serum',
       'Turmeric Glow Mask',
       'Lavender Body Oil',
       'Green Superfood Blend',
       'Golden Milk Turmeric Latte',
       'Adaptogen Chai Mix',
       'Bamboo Water Bottle',
       'Himalayan Salt Lamp',
       'Copper Meditation Pyramid',
       'Crystal Singing Bowl',
       'Palo Santo & Sage Bundle',
       'Sandalwood Mala Beads',
       'Complete Puja Kit',
       'Healing Crystal Set',
       'Eco Cork Yoga Mat'
     );

  -- Practitioners seeded without a linked profile (catalog-only demo roster)
  SELECT COALESCE(array_agg(id), '{}')
  INTO v_practitioner_ids
  FROM public.practitioners
  WHERE profile_id IS NULL
    AND name IN (
      'Dr. Neelam Parwani',
      'Ananya Sharma',
      'Vikram Mehta',
      'Priya Desai',
      'Ritu Agarwal',
      'Dr. Meera Kapoor',
      'Arjun Nair',
      'Shalini Gupta',
      'Neha Joshi',
      'Raghav Menon',
      'Dr. Rajesh Iyer',
      'Suresh Menon',
      'Tanvi Kulkarni',
      'Acharya Ramesh',
      'Dr. Sunita Verma',
      'Mystic Anand',
      'Shanti Devi',
      'Pandit Suraj Kumar',
      'Arun Krishnan',
      'Divya Sharma',
      'Rajan Verma',
      'Nisha Patel',
      'Dr. Kavita Deshmukh',
      'Sneha Kulkarni',
      'Dr. Amit Saxena',
      'Ritika Agarwal'
    );

  SELECT COALESCE(array_agg(id), '{}')
  INTO v_event_ids
  FROM public.events
  WHERE metadata->>'legacy_id' IN ('har-ghar-dhyan', 'listening-ear')
     OR title IN ('Har Ghar Dhyan', 'Listening Ear (Suno - Sunao)');

  SELECT COALESCE(array_agg(id), '{}')
  INTO v_resource_ids
  FROM public.resources
  WHERE title IN (
    'Reiki Level 1',
    'Reiki Level 2',
    'Kids Reiki Program',
    'Switchwords',
    'Tarot Reading Course',
    'Su-Jok Course - Basic',
    'Su-Jok Course - Advanced',
    'Kids Reiki',
    'Kids Reiki - Healing Practice',
    'Reiki for Money',
    'Reiki for Business Growth',
    'Reiki Healing for Animals',
    'Switchword for Positive Mindset',
    'Su-Jok Point for Headache'
  );

  SELECT COALESCE(array_agg(id), '{}')
  INTO v_thread_ids
  FROM public.discussion_threads
  WHERE title = 'Daily Wellness Discussion'
     OR question = 'How do you nurture your inner peace in daily life?';

  IF cardinality(v_product_ids) > 0 THEN
    DELETE FROM public.cart_items WHERE product_id = ANY (v_product_ids);
    DELETE FROM public.order_items WHERE product_id = ANY (v_product_ids);
    DELETE FROM public.favorite_items WHERE item_type = 'product' AND item_id = ANY (v_product_ids::text[]);
    DELETE FROM public.reviews WHERE product_id = ANY (v_product_ids);
    DELETE FROM public.products WHERE id = ANY (v_product_ids);
  END IF;

  IF cardinality(v_practitioner_ids) > 0 THEN
    DELETE FROM public.favorite_items
    WHERE item_type = 'practitioner' AND item_id = ANY (v_practitioner_ids::text[]);
    DELETE FROM public.reviews WHERE practitioner_id = ANY (v_practitioner_ids);
    DELETE FROM public.practitioner_bookings WHERE practitioner_id = ANY (v_practitioner_ids);
    DELETE FROM public.practitioner_availability WHERE practitioner_id = ANY (v_practitioner_ids);
    DELETE FROM public.practitioner_offerings WHERE practitioner_id = ANY (v_practitioner_ids);
    DELETE FROM public.practitioner_wallets WHERE practitioner_id = ANY (v_practitioner_ids);
    DELETE FROM public.practitioners WHERE id = ANY (v_practitioner_ids);
  END IF;

  IF cardinality(v_event_ids) > 0 THEN
    DELETE FROM public.event_registrations WHERE event_id = ANY (v_event_ids);
    DELETE FROM public.events WHERE id = ANY (v_event_ids);
  END IF;

  IF cardinality(v_resource_ids) > 0 THEN
    DELETE FROM public.resource_enrollments WHERE resource_id = ANY (v_resource_ids);
    DELETE FROM public.resources WHERE id = ANY (v_resource_ids);
  END IF;

  IF cardinality(v_thread_ids) > 0 THEN
    DELETE FROM public.discussion_replies WHERE thread_id = ANY (v_thread_ids);
    DELETE FROM public.discussion_threads WHERE id = ANY (v_thread_ids);
  END IF;

  -- Demo moderation queue rows from legacy seedContentReportsIfEmpty
  DELETE FROM public.content_reports
  WHERE detail ILIKE '%seed%'
     OR detail ILIKE '%demo%'
     OR content_preview ILIKE '%sample%';

  -- Legacy reflection prompts from dev seed
  DELETE FROM public.prompts
  WHERE text IN (
    'What moment today made you pause and feel something?',
    'If your body could speak right now, what would it say?',
    'What''s one thing you''d like to gently release today?',
    'Who or what are you grateful for in this moment?',
    'What small act of kindness could you offer yourself today?'
  );

  -- Clear featured IDs that pointed at removed catalog rows
  UPDATE public.platform_settings
  SET
    home_content = jsonb_set(
      jsonb_set(COALESCE(home_content, '{}'::jsonb), '{featuredPractitionerIds}', '[]'::jsonb, true),
      '{featuredProductIds}',
      '[]'::jsonb,
      true
    ),
    product_approvals = '{}'::jsonb,
    practitioner_meta = '{}'::jsonb,
    event_visibility = '{}'::jsonb,
    resource_published = '{}'::jsonb
  WHERE id = 'default';
END $$;
