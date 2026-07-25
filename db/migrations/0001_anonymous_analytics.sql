CREATE TABLE IF NOT EXISTS anonymous_analytics_events (
  event_id_hash char(64) PRIMARY KEY,
  install_id_hash char(64) NOT NULL,
  name text NOT NULL CHECK (
    name IN (
      'record_saved',
      'first_record_saved',
      'backup_exported',
      'backup_imported',
      'tab_viewed'
    )
  ),
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(meta) = 'object'),
  delete_after timestamptz NOT NULL
);

-- statement-breakpoint

CREATE INDEX IF NOT EXISTS anonymous_analytics_events_install_received_idx
  ON anonymous_analytics_events (install_id_hash, received_at);

-- statement-breakpoint

CREATE INDEX IF NOT EXISTS anonymous_analytics_events_delete_after_idx
  ON anonymous_analytics_events (delete_after);

-- statement-breakpoint

CREATE TABLE IF NOT EXISTS anonymous_analytics_record_days (
  install_id_hash char(64) NOT NULL,
  activity_date date NOT NULL,
  first_received_at timestamptz NOT NULL,
  last_received_at timestamptz NOT NULL,
  save_count integer NOT NULL CHECK (save_count > 0),
  PRIMARY KEY (install_id_hash, activity_date)
);

-- statement-breakpoint

CREATE INDEX IF NOT EXISTS anonymous_analytics_record_days_activity_idx
  ON anonymous_analytics_record_days (activity_date);
