-- =============================================================
-- Remote SQL Architect and Explorer — Fintech Database Schema
-- Authors: Eduardo Martinez, Raschid Llamas
-- Normal Form: 3NF
-- =============================================================

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS transactions   CASCADE;
DROP TABLE IF EXISTS user_accounts  CASCADE;
DROP TABLE IF EXISTS products       CASCADE;
DROP TABLE IF EXISTS categories     CASCADE;
DROP TABLE IF EXISTS users          CASCADE;

-- -------------------------------------------------------------
-- TABLE: users
-- Stores customer profile information.
-- Separated from accounts to satisfy 2NF/3NF (no transitive
-- dependency between email and balance).
-- -------------------------------------------------------------
CREATE TABLE users (
    id           SERIAL          PRIMARY KEY,
    email        VARCHAR(255)    NOT NULL UNIQUE,
    first_name   VARCHAR(100)    NOT NULL,
    last_name    VARCHAR(100)    NOT NULL,
    phone        VARCHAR(20),
    created_at   TIMESTAMP       NOT NULL DEFAULT NOW(),
    is_active    BOOLEAN         NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_email_format CHECK (email LIKE '%@%.%')
);

-- -------------------------------------------------------------
-- TABLE: categories
-- Lookup table for transaction categories.
-- Extracted to its own table (3NF) to avoid repeating the
-- category name string on every transaction row.
-- -------------------------------------------------------------
CREATE TABLE categories (
    id          SERIAL        PRIMARY KEY,
    name        VARCHAR(50)   NOT NULL UNIQUE,
    description TEXT
);

-- -------------------------------------------------------------
-- TABLE: products
-- Financial products offered by the fintech (accounts, cards,
-- loans). Decoupled from users so one product type can be
-- shared by many customers.
-- -------------------------------------------------------------
CREATE TABLE products (
    id              SERIAL          PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    type            VARCHAR(30)     NOT NULL,
    interest_rate   DECIMAL(6,4),
    credit_limit    DECIMAL(15,2),
    description     TEXT,

    CONSTRAINT chk_product_type CHECK (
        type IN ('savings_account', 'checking_account', 'credit_card', 'loan', 'investment')
    ),
    CONSTRAINT chk_interest_rate CHECK (interest_rate IS NULL OR interest_rate >= 0)
);

-- -------------------------------------------------------------
-- TABLE: user_accounts
-- Junction table linking users to products they hold.
-- Each row represents one account a user owns.
-- Holds balance and account_number, which are attributes of
-- the specific user–product relationship (not of user alone
-- nor product alone) — satisfying 2NF.
-- -------------------------------------------------------------
CREATE TABLE user_accounts (
    id              SERIAL          PRIMARY KEY,
    user_id         INTEGER         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    product_id      INTEGER         NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    balance         DECIMAL(15,2)   NOT NULL DEFAULT 0.00,
    account_number  VARCHAR(20)     NOT NULL UNIQUE,
    opened_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_balance CHECK (balance >= -999999999.99)
);

-- -------------------------------------------------------------
-- TABLE: transactions
-- Records every financial movement against an account.
-- category_id is a FK to categories (3NF: category name lives
-- only in the categories table).
-- -------------------------------------------------------------
CREATE TABLE transactions (
    id               SERIAL          PRIMARY KEY,
    account_id       INTEGER         NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
    category_id      INTEGER         REFERENCES categories(id),
    amount           DECIMAL(15,2)   NOT NULL,
    type             VARCHAR(10)     NOT NULL,
    description      VARCHAR(255),
    reference_number VARCHAR(50)     UNIQUE,
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_tx_type   CHECK (type IN ('credit', 'debit')),
    CONSTRAINT chk_tx_amount CHECK (amount > 0)
);

-- Indexes for common query patterns
CREATE INDEX idx_transactions_account_id  ON transactions(account_id);
CREATE INDEX idx_transactions_created_at  ON transactions(created_at);
CREATE INDEX idx_user_accounts_user_id    ON user_accounts(user_id);
