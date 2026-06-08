CREATE TABLE IF NOT EXISTS customer_notifications (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  notification_type VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_id INTEGER NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  redirect_path VARCHAR(100) NOT NULL DEFAULT 'notifications',
  source VARCHAR(100) NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read SMALLINT NOT NULL DEFAULT 0,
  read_at TIMESTAMPTZ NULL,
  is_deleted SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer
  ON customer_notifications(customer_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_unread
  ON customer_notifications(customer_id, is_read, is_deleted, id DESC);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_entity
  ON customer_notifications(customer_id, entity, entity_id);
