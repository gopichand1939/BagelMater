CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  gateway VARCHAR(40) NOT NULL DEFAULT 'stripe',
  rrn VARCHAR(80) NOT NULL UNIQUE,
  transaction_id VARCHAR(255) NOT NULL UNIQUE,
  provider_payment_id VARCHAR(255),
  provider_charge_id VARCHAR(255),
  provider_balance_transaction_id VARCHAR(255),
  amount NUMERIC(12, 2) NOT NULL,
  amount_in_paise INTEGER NOT NULL,
  currency_code VARCHAR(10) NOT NULL DEFAULT 'INR',
  payment_method VARCHAR(80),
  status VARCHAR(40) NOT NULL DEFAULT 'created',
  is_payment_success SMALLINT NOT NULL DEFAULT 0,
  failure_code VARCHAR(120),
  failure_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_event JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

CREATE TABLE IF NOT EXISTS pending_payment_checkouts (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  checkout_payload JSONB NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'created',
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_payment_checkouts_customer_id
  ON pending_payment_checkouts(customer_id);
