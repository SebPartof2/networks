-- Migration: Add Station Groups feature
-- This allows multiple stations (transmitters) to share the same substations
-- Use case: Statewide channels like Iowa PBS with multiple transmitters

-- Step 1: Create station_groups table
CREATE TABLE IF NOT EXISTS station_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Add station_group_id to stations table
ALTER TABLE stations ADD COLUMN station_group_id INTEGER REFERENCES station_groups(id);

-- Step 3: Add station_group_id to substations table
ALTER TABLE substations ADD COLUMN station_group_id INTEGER REFERENCES station_groups(id) ON DELETE CASCADE;

-- Step 4: Make station_id nullable in substations (requires recreating the table in SQLite)
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Create new substations table with nullable station_id
CREATE TABLE substations_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id INTEGER,
  station_group_id INTEGER,
  number INTEGER NOT NULL,
  marketing_name TEXT NOT NULL,
  major_network_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
  FOREIGN KEY (station_group_id) REFERENCES station_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (major_network_id) REFERENCES major_networks(id),
  CHECK ((station_id IS NOT NULL AND station_group_id IS NULL) OR (station_id IS NULL AND station_group_id IS NOT NULL))
);

-- Copy existing data
INSERT INTO substations_new (id, station_id, number, marketing_name, major_network_id, created_at, updated_at)
SELECT id, station_id, number, marketing_name, major_network_id, created_at, updated_at
FROM substations;

-- Drop old table and rename new one
DROP TABLE substations;
ALTER TABLE substations_new RENAME TO substations;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_stations_group ON stations(station_group_id);
CREATE INDEX IF NOT EXISTS idx_substations_station ON substations(station_id);
CREATE INDEX IF NOT EXISTS idx_substations_group ON substations(station_group_id);
