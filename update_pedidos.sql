ALTER TABLE pedidos ADD COLUMN estado_pago TEXT DEFAULT 'pendiente';
ALTER TABLE pedidos ADD COLUMN metodo_pago TEXT DEFAULT '';
ALTER TABLE pedidos ADD COLUMN token_vista TEXT DEFAULT '';
ALTER TABLE pedidos ADD COLUMN datos_pago TEXT DEFAULT '';
ALTER TABLE pedidos ADD COLUMN aprobado_at TEXT DEFAULT '';
ALTER TABLE pedidos ADD COLUMN cancelado_at TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_pedidos_token ON pedidos(token_vista);