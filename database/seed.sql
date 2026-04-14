-- =============================================================
-- Remote SQL Architect and Explorer — Seed Data
-- Authors: Eduardo Martinez, Raschid Llamas
-- Mock data for a fintech scenario (12+ rows per table)
-- =============================================================

-- -------------------------------------------------------------
-- USERS  (12 rows)
-- -------------------------------------------------------------
INSERT INTO users (email, first_name, last_name, phone, created_at) VALUES
    ('ana.garcia@mail.com',      'Ana',      'García',     '5551001001', '2023-01-10 08:00:00'),
    ('carlos.lopez@mail.com',    'Carlos',   'López',      '5551001002', '2023-02-14 09:15:00'),
    ('diana.torres@mail.com',    'Diana',    'Torres',     '5551001003', '2023-03-05 10:30:00'),
    ('ernesto.ruiz@mail.com',    'Ernesto',  'Ruiz',       '5551001004', '2023-04-20 11:00:00'),
    ('fabiola.mora@mail.com',    'Fabiola',  'Mora',       '5551001005', '2023-05-08 14:00:00'),
    ('gabriel.nieto@mail.com',   'Gabriel',  'Nieto',      '5551001006', '2023-06-17 16:45:00'),
    ('helena.vega@mail.com',     'Helena',   'Vega',       '5551001007', '2023-07-22 08:30:00'),
    ('ivan.soto@mail.com',       'Iván',     'Soto',       '5551001008', '2023-08-01 09:00:00'),
    ('julia.mendez@mail.com',    'Julia',    'Méndez',     '5551001009', '2023-09-13 11:20:00'),
    ('kevin.rios@mail.com',      'Kevin',    'Ríos',       '5551001010', '2023-10-05 13:00:00'),
    ('laura.castillo@mail.com',  'Laura',    'Castillo',   '5551001011', '2023-11-18 15:30:00'),
    ('mario.perez@mail.com',     'Mario',    'Pérez',      '5551001012', '2023-12-01 10:00:00');

-- -------------------------------------------------------------
-- CATEGORIES  (10 rows)
-- -------------------------------------------------------------
INSERT INTO categories (name, description) VALUES
    ('salary',        'Monthly salary deposits'),
    ('food',          'Restaurants, groceries, delivery'),
    ('transport',     'Uber, metro, gas, tolls'),
    ('utilities',     'Electricity, water, internet, phone'),
    ('entertainment', 'Streaming, events, games'),
    ('healthcare',    'Pharmacy, medical consultations'),
    ('shopping',      'Clothing, electronics, general retail'),
    ('transfer',      'Person-to-person transfers'),
    ('investment',    'ETF purchases, fund contributions'),
    ('loan_payment',  'Monthly loan installments');

-- -------------------------------------------------------------
-- PRODUCTS  (5 rows — shared across users)
-- -------------------------------------------------------------
INSERT INTO products (name, type, interest_rate, credit_limit, description) VALUES
    ('FlexSave Account',    'savings_account',  0.0350,  NULL,      'High-yield savings account, 3.5% APY'),
    ('Smart Checking',      'checking_account', 0.0000,  NULL,      'Zero-fee checking with debit card'),
    ('Platinum Card',       'credit_card',      0.2499,  50000.00,  'Rewards credit card, 2% cashback'),
    ('Personal Loan 12M',   'loan',             0.1200,  NULL,      '12-month personal loan at 12% APR'),
    ('Growth Portfolio',    'investment',       NULL,    NULL,      'Diversified ETF investment account');

-- -------------------------------------------------------------
-- USER_ACCOUNTS  (14 rows — users linked to products)
-- -------------------------------------------------------------
INSERT INTO user_accounts (user_id, product_id, balance, account_number, opened_at) VALUES
    (1,  1,  25400.00,  'ACC-00000001', '2023-01-15 08:00:00'),
    (1,  3,  -1200.00,  'ACC-00000002', '2023-01-15 08:05:00'),
    (2,  1,  80000.00,  'ACC-00000003', '2023-02-20 09:00:00'),
    (2,  2,   5300.50,  'ACC-00000004', '2023-02-20 09:10:00'),
    (3,  2,   9800.75,  'ACC-00000005', '2023-03-10 10:00:00'),
    (4,  1,  12000.00,  'ACC-00000006', '2023-04-25 11:00:00'),
    (4,  4,  -8000.00,  'ACC-00000007', '2023-04-25 11:15:00'),
    (5,  3,  -3400.00,  'ACC-00000008', '2023-05-10 14:00:00'),
    (6,  5,  45000.00,  'ACC-00000009', '2023-06-20 16:00:00'),
    (7,  1,  31500.00,  'ACC-00000010', '2023-07-25 08:30:00'),
    (8,  2,   2200.00,  'ACC-00000011', '2023-08-05 09:00:00'),
    (9,  3,  -7800.00,  'ACC-00000012', '2023-09-15 11:00:00'),
    (10, 1,  60000.00,  'ACC-00000013', '2023-10-08 13:00:00'),
    (11, 2,   4100.25,  'ACC-00000014', '2023-11-20 15:00:00');

-- -------------------------------------------------------------
-- TRANSACTIONS  (15 rows)
-- -------------------------------------------------------------
INSERT INTO transactions (account_id, category_id, amount, type, description, reference_number, created_at) VALUES
    (1,  1,  18000.00, 'credit', 'January salary',           'REF-20240101-001', '2024-01-02 09:00:00'),
    (1,  2,    450.00, 'debit',  'Grocery store El Super',   'REF-20240103-002', '2024-01-03 14:30:00'),
    (1,  3,    120.00, 'debit',  'Uber trips January',       'REF-20240105-003', '2024-01-05 18:00:00'),
    (2,  7,   2800.00, 'debit',  'Nike online purchase',     'REF-20240106-004', '2024-01-06 11:00:00'),
    (3,  1,  25000.00, 'credit', 'February salary',          'REF-20240201-005', '2024-02-01 09:00:00'),
    (3,  8,   5000.00, 'debit',  'Transfer to family',       'REF-20240210-006', '2024-02-10 16:00:00'),
    (4,  4,    980.00, 'debit',  'Monthly utilities bundle', 'REF-20240215-007', '2024-02-15 10:00:00'),
    (5,  5,    350.00, 'debit',  'Netflix + Spotify combo',  'REF-20240301-008', '2024-03-01 08:00:00'),
    (6,  1,  15000.00, 'credit', 'March salary',             'REF-20240301-009', '2024-03-01 09:00:00'),
    (7,  10,  2500.00, 'debit',  'Loan installment March',   'REF-20240305-010', '2024-03-05 10:00:00'),
    (8,  7,   6200.00, 'debit',  'iPhone purchase',          'REF-20240310-011', '2024-03-10 14:00:00'),
    (9,  9,  10000.00, 'credit', 'ETF investment deposit',   'REF-20240315-012', '2024-03-15 09:30:00'),
    (10, 1,  12000.00, 'credit', 'Freelance payment',        'REF-20240320-013', '2024-03-20 11:00:00'),
    (11, 6,    650.00, 'debit',  'Medical consultation',     'REF-20240322-014', '2024-03-22 15:00:00'),
    (13, 1,  22000.00, 'credit', 'April salary',             'REF-20240401-015', '2024-04-01 09:00:00');
