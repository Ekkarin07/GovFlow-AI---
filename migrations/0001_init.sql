
-- GovFlow AI - Initial D1 migration
-- Generic records for phased migration

CREATE TABLE IF NOT EXISTS app_records (
  collection TEXT NOT NULL,
  record_id TEXT NOT NULL,
  data_json TEXT NOT NULL
    CHECK (json_valid(data_json)),
  created_at TEXT NOT NULL
    DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL
    DEFAULT (datetime('now')),
  PRIMARY KEY (collection, record_id)
);

CREATE INDEX IF NOT EXISTS
  idx_app_records_collection
ON app_records(collection);

-- Audit log: separate from editable records
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details_json TEXT NOT NULL
    DEFAULT '{}'
    CHECK (json_valid(details_json)),
  occurred_at TEXT NOT NULL
    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS
  idx_audit_events_entity
ON audit_events(entity_type, entity_id);
