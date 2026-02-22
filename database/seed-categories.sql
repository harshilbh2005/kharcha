-- ============================================================
-- KHARCHA — Seed Default Categories
-- Run during onboarding after profile is created.
--
-- Usage: Replace 'YOUR_PROFILE_UUID_HERE' with the actual profile UUID,
--        or call the seed_default_categories() function instead:
--        SELECT seed_default_categories('your-profile-uuid');
-- ============================================================

INSERT INTO categories (profile_id, name, icon, color, is_default, sort_order) VALUES
  ('YOUR_PROFILE_UUID_HERE', 'Food & Dining',    'UtensilsCrossed', '#A37B6F', true, 1),
  ('YOUR_PROFILE_UUID_HERE', 'Transport',        'Car',             '#8B7355', true, 2),
  ('YOUR_PROFILE_UUID_HERE', 'Entertainment',    'Gamepad2',        '#7B6B8A', true, 3),
  ('YOUR_PROFILE_UUID_HERE', 'Shopping',         'ShoppingBag',     '#6B8A7B', true, 4),
  ('YOUR_PROFILE_UUID_HERE', 'Subscriptions',    'RefreshCw',       '#8A7B6B', true, 5),
  ('YOUR_PROFILE_UUID_HERE', 'Education',        'GraduationCap',   '#6B707C', true, 6),
  ('YOUR_PROFILE_UUID_HERE', 'Health',           'Heart',           '#B85C5C', true, 7),
  ('YOUR_PROFILE_UUID_HERE', 'Utilities',        'Zap',             '#C4935A', true, 8),
  ('YOUR_PROFILE_UUID_HERE', 'Personal',         'User',            '#6B7D71', true, 9),
  ('YOUR_PROFILE_UUID_HERE', 'Other',            'MoreHorizontal',  '#9599A3', true, 10);
