-- Big Pharma Group database schema (Cloudflare D1 / SQLite)
-- The site also creates these tables automatically on first visit.

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  name TEXT NOT NULL,
  name_en TEXT,
  unit TEXT,
  price_satang INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'medical_supplies',
  consult_required INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '',
  description TEXT,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category, active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line TEXT,
  subdistrict TEXT,
  district TEXT,
  province TEXT,
  postcode TEXT,
  preferred_payment TEXT,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  admin_notes TEXT,
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  kind TEXT NOT NULL,              -- 'customer' | 'admin'
  customer_id INTEGER,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL UNIQUE,
  access_key TEXT NOT NULL,
  customer_id INTEGER,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  delivery_method TEXT NOT NULL DEFAULT 'delivery', -- 'delivery' | 'pickup'
  address_line TEXT,
  subdistrict TEXT,
  district TEXT,
  province TEXT,
  postcode TEXT,
  note TEXT,
  subtotal_satang INTEGER NOT NULL,
  discount_satang INTEGER NOT NULL DEFAULT 0,
  shipping_satang INTEGER NOT NULL DEFAULT 0,
  total_satang INTEGER NOT NULL,
  payment_method TEXT,
  charge_id TEXT,
  qr_url TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting_payment', -- awaiting_payment | paid | failed | packing | shipped | completed | cancelled
  tracking_no TEXT,
  admin_notes TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT,
  price_satang INTEGER NOT NULL,
  qty INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Product photos are stored in the database (no extra Cloudflare service needed)
CREATE TABLE IF NOT EXISTS product_images (
  product_id INTEGER PRIMARY KEY,
  mime TEXT NOT NULL,
  data BLOB NOT NULL,
  source TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Online pharmacist consultation requests
CREATE TABLE IF NOT EXISTS consult_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  line_id TEXT,
  channel TEXT NOT NULL DEFAULT 'line',   -- line | phone | video
  preferred_time TEXT,
  symptoms TEXT NOT NULL,
  age TEXT,
  allergies TEXT,
  current_meds TEXT,
  status TEXT NOT NULL DEFAULT 'new',     -- new | contacted | done | cancelled
  admin_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Articles / health blog
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title_th TEXT NOT NULL,
  title_en TEXT,
  excerpt_th TEXT,
  excerpt_en TEXT,
  body_th TEXT,
  body_en TEXT,
  cover_media_id INTEGER,
  tags TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Uploaded images for articles (cover + inline pictures)
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mime TEXT NOT NULL,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
