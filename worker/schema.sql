-- One row per player and lock: their best time on it.
-- A "lock" is seed + level + hardened (a poor roll adds a decoy, so it is another lock).
CREATE TABLE IF NOT EXISTS runs (
  player_id  TEXT    NOT NULL,
  name       TEXT    NOT NULL,
  level      TEXT    NOT NULL,
  seed       TEXT    NOT NULL,
  hardened   INTEGER NOT NULL DEFAULT 0,
  time_ms    INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, level, seed, hardened)
);

CREATE INDEX IF NOT EXISTS runs_by_level ON runs (level, time_ms);
CREATE INDEX IF NOT EXISTS runs_by_lock ON runs (level, seed, hardened, time_ms);
