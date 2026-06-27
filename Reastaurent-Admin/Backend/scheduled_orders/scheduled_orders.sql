-- SQL schema changes for Scheduled Orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'ASAP';

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS scheduled_datetime TIMESTAMPTZ NULL;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS scheduled_slot VARCHAR(50) NULL;

CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_datetime ON orders(scheduled_datetime);
