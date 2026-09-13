CREATE TABLE pending_complaints (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status = 'Pending'),
  durability_state TEXT NOT NULL CHECK (durability_state IN ('staged', 'complete')),
  longitude REAL NOT NULL,
  latitude REAL NOT NULL,
  description TEXT NULL,
  whatsapp TEXT NULL,
  photo_key TEXT NOT NULL UNIQUE,
  photo_format TEXT NOT NULL,
  photo_size INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT NULL,
  CHECK ((durability_state = 'complete' AND completed_at IS NOT NULL) OR (durability_state = 'staged' AND completed_at IS NULL))
);
