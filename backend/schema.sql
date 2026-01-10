-- Television Market Areas
-- status: 'not_implemented', 'in_progress', 'complete'
CREATE TABLE IF NOT EXISTS tmas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'not_implemented' CHECK(status IN ('not_implemented', 'in_progress', 'complete'))
);

-- Major Networks (NBC, CBS, ABC, FOX, etc.)
CREATE TABLE IF NOT EXISTS major_networks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  short_name TEXT NOT NULL UNIQUE,
  long_name TEXT NOT NULL,
  logo_url TEXT
);

-- Main TV Stations
CREATE TABLE IF NOT EXISTS stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  callsign TEXT NOT NULL,
  station_number INTEGER NOT NULL,
  marketing_name TEXT NOT NULL,
  logo_url TEXT,
  tma_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tma_id) REFERENCES tmas(id)
);

-- Substations (X.1, X.2, etc.)
CREATE TABLE IF NOT EXISTS substations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id INTEGER NOT NULL,
  number INTEGER NOT NULL,
  marketing_name TEXT NOT NULL,
  major_network_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
  FOREIGN KEY (major_network_id) REFERENCES major_networks(id),
  UNIQUE(station_id, number)
);

-- Users (synced from S-Auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  given_name TEXT,
  family_name TEXT,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Feedback (TMA addition requests)
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  tma_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stations_tma ON stations(tma_id);
CREATE INDEX IF NOT EXISTS idx_substations_station ON substations(station_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
