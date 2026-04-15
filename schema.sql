-- ============================================
-- ELEGANCE JEWELRY — Schema D1
-- ============================================

CREATE TABLE IF NOT EXISTS productos (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  precio_base REAL NOT NULL,
  costo       REAL DEFAULT 0,
  categoria   TEXT,
  imagen_url  TEXT,
  stock       INTEGER DEFAULT 0,
  itbms_pct   REAL DEFAULT 7,
  destacado   INTEGER DEFAULT 0,
  activo      INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pedidos (
  id_pedido      TEXT PRIMARY KEY,
  fecha          TEXT NOT NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_email  TEXT,
  cliente_tel    TEXT,
  direccion      TEXT,
  subtotal       REAL NOT NULL,
  itbms_total    REAL NOT NULL,
  total          REAL NOT NULL,
  estado         TEXT DEFAULT 'Pendiente',
  archivado      INTEGER DEFAULT 0,
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS detalle_pedidos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  id_pedido       TEXT NOT NULL REFERENCES pedidos(id_pedido),
  id_producto     TEXT NOT NULL,
  nombre_producto TEXT NOT NULL,
  cantidad        INTEGER NOT NULL,
  precio_base     REAL NOT NULL,
  itbms_pct       REAL NOT NULL,
  itbms_monto     REAL NOT NULL,
  precio_final    REAL NOT NULL,
  subtotal        REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshots (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha          TEXT NOT NULL,
  total_pedidos  INTEGER DEFAULT 0,
  ventas_brutas  REAL DEFAULT 0,
  ganancia_total REAL DEFAULT 0,
  nota           TEXT
);

-- Índices para performance en el panel
CREATE INDEX IF NOT EXISTS idx_pedidos_estado    ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha     ON pedidos(fecha);
CREATE INDEX IF NOT EXISTS idx_pedidos_archivado ON pedidos(archivado);
CREATE INDEX IF NOT EXISTS idx_detalle_pedido    ON detalle_pedidos(id_pedido);
CREATE INDEX IF NOT EXISTS idx_productos_cat     ON productos(categoria);