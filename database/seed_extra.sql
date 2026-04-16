-- =============================================================
-- Remote SQL Architect and Explorer — Extended Seed Data
-- Authors: Eduardo Martinez, Raschid Llamas
-- Run AFTER schema.sql and seed.sql
--   psql -d remotesql -f database/seed_extra.sql
-- =============================================================

-- -------------------------------------------------------------
-- USERS  (8 more — IDs 13-20)
-- -------------------------------------------------------------
INSERT INTO users (email, first_name, last_name, phone, created_at) VALUES
    ('natalia.fuentes@mail.com', 'Natalia',   'Fuentes',   '5551001013', '2024-01-05 09:00:00'),
    ('omar.delgado@mail.com',    'Omar',      'Delgado',   '5551001014', '2024-01-12 10:30:00'),
    ('patricia.wong@mail.com',   'Patricia',  'Wong',      '5551001015', '2024-02-03 08:45:00'),
    ('rodrigo.serna@mail.com',   'Rodrigo',   'Serna',     '5551001016', '2024-02-20 11:00:00'),
    ('sofia.ibanez@mail.com',    'Sofía',     'Ibáñez',    '5551001017', '2024-03-01 09:15:00'),
    ('tomas.guerrero@mail.com',  'Tomás',     'Guerrero',  '5551001018', '2024-03-10 14:00:00'),
    ('valentina.cruz@mail.com',  'Valentina', 'Cruz',      '5551001019', '2024-03-18 08:00:00'),
    ('xavier.mendoza@mail.com',  'Xavier',    'Mendoza',   '5551001020', '2024-04-01 10:00:00');

-- -------------------------------------------------------------
-- USER_ACCOUNTS  (20 more — IDs 15-34)
-- Wide spread of balances to make the "above average" query rich
-- -------------------------------------------------------------
INSERT INTO user_accounts (user_id, product_id, balance, account_number, opened_at) VALUES
    -- Existing users getting additional products
    (12, 5,  72000.00,  'ACC-00000015', '2024-01-10 09:00:00'),  -- Mario,   Growth Portfolio
    (11, 1,  18900.00,  'ACC-00000016', '2024-01-15 10:00:00'),  -- Laura,   FlexSave
    (10, 2,   3200.00,  'ACC-00000017', '2024-02-01 11:00:00'),  -- Kevin,   Smart Checking
    (7,  4,  -4200.00,  'ACC-00000018', '2024-02-10 09:00:00'),  -- Helena,  Personal Loan
    (6,  2,  11500.00,  'ACC-00000019', '2024-02-15 10:00:00'),  -- Gabriel, Smart Checking
    (3,  1,  28000.00,  'ACC-00000020', '2024-03-01 08:00:00'),  -- Diana,   FlexSave

    -- New users
    (13, 1,  55000.00,  'ACC-00000021', '2024-01-08 09:00:00'),  -- Natalia,   FlexSave
    (14, 1,  22000.00,  'ACC-00000022', '2024-01-15 10:00:00'),  -- Omar,      FlexSave
    (14, 3,   -500.00,  'ACC-00000023', '2024-01-15 10:10:00'),  -- Omar,      Platinum Card
    (15, 2,   3500.00,  'ACC-00000024', '2024-02-05 09:00:00'),  -- Patricia,  Smart Checking
    (16, 5,  30000.00,  'ACC-00000025', '2024-02-22 11:00:00'),  -- Rodrigo,   Growth Portfolio
    (16, 4,  -5000.00,  'ACC-00000026', '2024-02-22 11:10:00'),  -- Rodrigo,   Personal Loan
    (17, 1,  42000.00,  'ACC-00000027', '2024-03-03 08:30:00'),  -- Sofía,     FlexSave
    (18, 3, -15000.00,  'ACC-00000028', '2024-03-12 14:00:00'),  -- Tomás,     Platinum Card
    (19, 1,  95000.00,  'ACC-00000029', '2024-03-20 09:00:00'),  -- Valentina, FlexSave
    (19, 2,   8200.00,  'ACC-00000030', '2024-03-20 09:10:00'),  -- Valentina, Smart Checking
    (20, 5, 150000.00,  'ACC-00000031', '2024-04-02 10:00:00'),  -- Xavier,    Growth Portfolio
    (2,  5,  35000.00,  'ACC-00000032', '2024-04-05 09:00:00'),  -- Carlos,    Growth Portfolio
    (5,  1,  16000.00,  'ACC-00000033', '2024-04-10 11:00:00'),  -- Fabiola,   FlexSave
    (9,  2,   1500.00,  'ACC-00000034', '2024-04-15 10:00:00');  -- Julia,     Smart Checking

-- -------------------------------------------------------------
-- TRANSACTIONS  (67 more — REF-016 to REF-082)
-- Spread across 2024-2025 so last_activity varies meaningfully
-- -------------------------------------------------------------
INSERT INTO transactions (account_id, category_id, amount, type, description, reference_number, created_at) VALUES

    -- ── Account 1  (Ana — FlexSave) ─────────────────────────────
    (1,  1,  18000.00, 'credit', 'February salary',             'REF-20240201-016', '2024-02-01 09:00:00'),
    (1,  2,    380.00, 'debit',  'Supermarket weekly shop',     'REF-20240210-017', '2024-02-10 17:30:00'),
    (1,  1,  18000.00, 'credit', 'March salary',                'REF-20240301-018', '2024-03-01 09:00:00'),
    (1,  9,   5000.00, 'debit',  'ETF purchase — portfolio',    'REF-20240320-019', '2024-03-20 14:00:00'),

    -- ── Account 3  (Carlos — FlexSave) ──────────────────────────
    (3,  1,  25000.00, 'credit', 'March salary',                'REF-20240301-020', '2024-03-01 09:30:00'),
    (3,  9,  15000.00, 'debit',  'Transfer to Growth Portfolio','REF-20240315-021', '2024-03-15 11:00:00'),
    (3,  2,    650.00, 'debit',  'Restaurant week',             'REF-20240318-022', '2024-03-18 20:00:00'),

    -- ── Account 6  (Ernesto — FlexSave) ─────────────────────────
    (6,  1,  15000.00, 'credit', 'April salary',                'REF-20240401-023', '2024-04-01 09:00:00'),
    (6,  3,    200.00, 'debit',  'Monthly gas station',         'REF-20240410-024', '2024-04-10 11:00:00'),
    (6,  1,  15000.00, 'credit', 'May salary',                  'REF-20240501-025', '2024-05-01 09:00:00'),

    -- ── Account 10 (Helena — FlexSave) ──────────────────────────
    (10, 1,  12000.00, 'credit', 'April salary',                'REF-20240401-026', '2024-04-01 09:00:00'),
    (10, 7,   1500.00, 'debit',  'Clothing — spring haul',      'REF-20240415-027', '2024-04-15 14:00:00'),

    -- ── Account 12 (Julia — Platinum Card) ──────────────────────
    (12, 7,   4200.00, 'debit',  'Electronics — tablet',        'REF-20240420-028', '2024-04-20 16:00:00'),
    (12, 8,   5000.00, 'credit', 'Card payment from savings',   'REF-20240501-029', '2024-05-01 10:00:00'),

    -- ── Account 14 (Laura — Smart Checking) ─────────────────────
    (14, 1,  14000.00, 'credit', 'May salary',                  'REF-20240501-030', '2024-05-01 09:00:00'),
    (14, 4,    900.00, 'debit',  'Utilities bundle May',        'REF-20240508-031', '2024-05-08 10:00:00'),

    -- ── Account 15 (Mario — Growth Portfolio) ───────────────────
    (15, 9,  50000.00, 'credit', 'Initial investment deposit',  'REF-20240515-032', '2024-05-15 10:00:00'),
    (15, 9,  25000.00, 'credit', 'Additional ETF purchase',     'REF-20240601-033', '2024-06-01 09:00:00'),
    (15, 9,   3000.00, 'debit',  'Portfolio rebalance fee',     'REF-20241101-034', '2024-11-01 11:00:00'),

    -- ── Account 16 (Laura — FlexSave) ───────────────────────────
    (16, 1,  14000.00, 'credit', 'May salary',                  'REF-20240501-035', '2024-05-01 09:00:00'),
    (16, 4,    900.00, 'debit',  'Utilities May',               'REF-20240508-036', '2024-05-08 10:00:00'),
    (16, 2,    420.00, 'debit',  'Grocery run',                 'REF-20240515-037', '2024-05-15 18:00:00'),
    (16, 1,  14000.00, 'credit', 'June salary',                 'REF-20240601-038', '2024-06-01 09:00:00'),
    (16, 1,  14000.00, 'credit', 'September salary',            'REF-20240901-039', '2024-09-01 09:00:00'),

    -- ── Account 17 (Kevin — Smart Checking) ─────────────────────
    (17, 1,   8000.00, 'credit', 'May salary',                  'REF-20240501-040', '2024-05-01 09:00:00'),
    (17, 7,   1200.00, 'debit',  'Nike + Adidas shoes',         'REF-20240520-041', '2024-05-20 14:00:00'),
    (17, 3,    350.00, 'debit',  'Monthly transport pass',      'REF-20240601-042', '2024-06-01 08:00:00'),

    -- ── Account 18 (Helena — Loan) ──────────────────────────────
    (18, 10,  1500.00, 'debit',  'Loan installment May',        'REF-20240505-043', '2024-05-05 10:00:00'),
    (18, 10,  1500.00, 'debit',  'Loan installment June',       'REF-20240605-044', '2024-06-05 10:00:00'),
    (18, 10,  1500.00, 'debit',  'Loan installment July',       'REF-20240705-045', '2024-07-05 10:00:00'),

    -- ── Account 19 (Gabriel — Smart Checking) ───────────────────
    (19, 1,  12000.00, 'credit', 'May salary',                  'REF-20240501-046', '2024-05-01 09:00:00'),
    (19, 10,  1500.00, 'debit',  'Loan payment May',            'REF-20240505-047', '2024-05-05 10:00:00'),
    (19, 2,    480.00, 'debit',  'Grocery & food delivery',     'REF-20240512-048', '2024-05-12 19:00:00'),
    (19, 10,  1500.00, 'debit',  'Loan payment June',           'REF-20240605-049', '2024-06-05 10:00:00'),

    -- ── Account 20 (Diana — FlexSave) ───────────────────────────
    (20, 1,  20000.00, 'credit', 'May salary',                  'REF-20240501-050', '2024-05-01 09:00:00'),
    (20, 6,    800.00, 'debit',  'Annual medical checkup',      'REF-20240512-051', '2024-05-12 11:00:00'),
    (20, 5,    400.00, 'debit',  'Streaming + gaming subs',     'REF-20240701-052', '2024-07-01 08:00:00'),
    (20, 1,  20000.00, 'credit', 'September salary',            'REF-20240901-053', '2024-09-01 09:00:00'),

    -- ── Account 21 (Natalia — FlexSave) ─────────────────────────
    (21, 1,  30000.00, 'credit', 'May salary',                  'REF-20240501-054', '2024-05-01 09:00:00'),
    (21, 8,   3000.00, 'debit',  'Family support transfer',     'REF-20240520-055', '2024-05-20 15:00:00'),
    (21, 7,   2000.00, 'debit',  'Designer bag purchase',       'REF-20240610-056', '2024-06-10 14:00:00'),
    (21, 1,  30000.00, 'credit', 'August salary',               'REF-20240801-057', '2024-08-01 09:00:00'),

    -- ── Account 22 (Omar — FlexSave) ────────────────────────────
    (22, 1,  18000.00, 'credit', 'May salary',                  'REF-20240501-058', '2024-05-01 09:00:00'),
    (22, 4,   1000.00, 'debit',  'Utilities bundle',            'REF-20240510-059', '2024-05-10 10:00:00'),
    (22, 1,  18000.00, 'credit', 'August salary',               'REF-20240801-060', '2024-08-01 09:00:00'),

    -- ── Account 23 (Omar — Platinum Card) ───────────────────────
    (23, 7,   3000.00, 'debit',  'Electronics — headphones',    'REF-20240525-061', '2024-05-25 16:00:00'),
    (23, 8,   3500.00, 'credit', 'Credit card payment',         'REF-20240601-062', '2024-06-01 10:00:00'),

    -- ── Account 25 (Rodrigo — Growth Portfolio) ──────────────────
    (25, 9,  20000.00, 'credit', 'Initial investment',          'REF-20240601-063', '2024-06-01 10:00:00'),
    (25, 9,  15000.00, 'credit', 'Q4 additional investment',    'REF-20241015-064', '2024-10-15 11:00:00'),

    -- ── Account 26 (Rodrigo — Loan) ─────────────────────────────
    (26, 10,  2000.00, 'debit',  'Loan installment June',       'REF-20240605-065', '2024-06-05 10:00:00'),
    (26, 10,  2000.00, 'debit',  'Loan installment July',       'REF-20240705-066', '2024-07-05 10:00:00'),
    (26, 10,  2000.00, 'debit',  'Loan installment August',     'REF-20240805-067', '2024-08-05 10:00:00'),

    -- ── Account 27 (Sofía — FlexSave) ───────────────────────────
    (27, 1,  25000.00, 'credit', 'June salary',                 'REF-20240601-068', '2024-06-01 09:00:00'),
    (27, 2,    600.00, 'debit',  'Restaurant — anniversary',    'REF-20240610-069', '2024-06-10 21:00:00'),
    (27, 7,   2000.00, 'debit',  'Summer clothing haul',        'REF-20240720-070', '2024-07-20 15:00:00'),
    (27, 1,  25000.00, 'credit', 'September salary',            'REF-20240901-071', '2024-09-01 09:00:00'),
    (27, 2,    550.00, 'debit',  'Meal prep groceries',         'REF-20241005-072', '2024-10-05 18:00:00'),

    -- ── Account 28 (Tomás — Platinum Card) ──────────────────────
    (28, 7,   8000.00, 'debit',  'MacBook Pro purchase',        'REF-20240510-073', '2024-05-10 13:00:00'),
    (28, 7,   5000.00, 'debit',  'Designer clothing',           'REF-20240615-074', '2024-06-15 16:00:00'),
    (28, 5,   2000.00, 'debit',  'VIP concert tickets',         'REF-20240720-075', '2024-07-20 18:00:00'),

    -- ── Account 29 (Valentina — FlexSave) ───────────────────────
    (29, 1,  40000.00, 'credit', 'June salary',                 'REF-20240601-076', '2024-06-01 09:00:00'),
    (29, 9,  15000.00, 'debit',  'Transfer to investment acct', 'REF-20240615-077', '2024-06-15 11:00:00'),
    (29, 2,    800.00, 'debit',  'Upscale dinner — client',     'REF-20240725-078', '2024-07-25 21:00:00'),
    (29, 1,  40000.00, 'credit', 'September salary',            'REF-20240901-079', '2024-09-01 09:00:00'),

    -- ── Account 30 (Valentina — Smart Checking) ─────────────────
    (30, 8,   5000.00, 'credit', 'Transfer from FlexSave',      'REF-20240620-080', '2024-06-20 10:00:00'),
    (30, 3,    400.00, 'debit',  'Taxi & rideshare Aug',        'REF-20240801-081', '2024-08-01 09:00:00'),
    (30, 5,    300.00, 'debit',  'Entertainment subscriptions', 'REF-20240901-082', '2024-09-01 08:00:00'),

    -- ── Account 31 (Xavier — Growth Portfolio) ──────────────────
    (31, 9, 100000.00, 'credit', 'Large ETF block purchase',    'REF-20240701-083', '2024-07-01 10:00:00'),
    (31, 9,  60000.00, 'credit', 'Portfolio expansion',         'REF-20240801-084', '2024-08-01 10:00:00'),
    (31, 9,  10000.00, 'credit', 'Q4 rebalancing deposit',      'REF-20241001-085', '2024-10-01 11:00:00'),

    -- ── Account 32 (Carlos — Growth Portfolio) ──────────────────
    (32, 9,  35000.00, 'credit', 'Initial portfolio deposit',   'REF-20240715-086', '2024-07-15 09:00:00'),

    -- ── Account 33 (Fabiola — FlexSave) ─────────────────────────
    (33, 1,  12000.00, 'credit', 'July salary',                 'REF-20240701-087', '2024-07-01 09:00:00'),
    (33, 4,    800.00, 'debit',  'Utilities bundle July',       'REF-20240708-088', '2024-07-08 10:00:00'),
    (33, 1,  12000.00, 'credit', 'October salary',              'REF-20241001-089', '2024-10-01 09:00:00'),

    -- ── Account 34 (Julia — Smart Checking) ─────────────────────
    (34, 1,   5000.00, 'credit', 'Part-time income July',       'REF-20240701-090', '2024-07-01 09:00:00'),
    (34, 10,  2500.00, 'debit',  'Loan payment July',           'REF-20240705-091', '2024-07-05 10:00:00'),
    (34, 10,  2500.00, 'debit',  'Loan payment November',       'REF-20241105-092', '2024-11-05 10:00:00');
