-- 本人のセルフケア記録のクラウドバックアップ用。
-- 匿名利用イベント（0001）とは別のNeonプロジェクトへ適用する。
-- 平文で持つのは所有者ID、世代、件数、スキーマ版、時刻だけとし、
-- 記録の中身はすべて ciphertext に入れる。

CREATE TABLE IF NOT EXISTS user_data_snapshots (
  owner_id text NOT NULL,
  generation bigint NOT NULL,
  schema_version integer NOT NULL,
  record_count integer NOT NULL CHECK (record_count >= 0),
  algorithm text NOT NULL,
  key_version text NOT NULL,
  wrapped_dek text NOT NULL,
  nonce text NOT NULL,
  ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, generation)
);

-- statement-breakpoint

CREATE INDEX IF NOT EXISTS user_data_snapshots_owner_generation_idx
  ON user_data_snapshots (owner_id, generation DESC);

-- statement-breakpoint

-- 同期する端末は1アカウントにつき1台。owner_id を主キーにすることで、
-- 「2台目が同時に同期している」状態を表そうとしても表現できないようにする。
CREATE TABLE IF NOT EXISTS user_data_devices (
  owner_id text PRIMARY KEY,
  active_device_id text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

-- statement-breakpoint

-- APIでの所有者確認に加えた第二の防御。
-- 実行時ロールにも適用されるよう FORCE を付ける。
ALTER TABLE user_data_snapshots ENABLE ROW LEVEL SECURITY;

-- statement-breakpoint

ALTER TABLE user_data_snapshots FORCE ROW LEVEL SECURITY;

-- statement-breakpoint

ALTER TABLE user_data_devices ENABLE ROW LEVEL SECURITY;

-- statement-breakpoint

ALTER TABLE user_data_devices FORCE ROW LEVEL SECURITY;

-- statement-breakpoint

-- 操作ごとに別のポリシーで検証する。app.owner_id は、検証済みセッションから
-- 取り出した所有者IDを、同じトランザクションの先頭で set_config した値。
DROP POLICY IF EXISTS user_data_snapshots_select ON user_data_snapshots;

-- statement-breakpoint

CREATE POLICY user_data_snapshots_select ON user_data_snapshots
  FOR SELECT USING (owner_id = current_setting('app.owner_id', true));

-- statement-breakpoint

DROP POLICY IF EXISTS user_data_snapshots_insert ON user_data_snapshots;

-- statement-breakpoint

CREATE POLICY user_data_snapshots_insert ON user_data_snapshots
  FOR INSERT WITH CHECK (owner_id = current_setting('app.owner_id', true));

-- statement-breakpoint

DROP POLICY IF EXISTS user_data_snapshots_delete ON user_data_snapshots;

-- statement-breakpoint

CREATE POLICY user_data_snapshots_delete ON user_data_snapshots
  FOR DELETE USING (owner_id = current_setting('app.owner_id', true));

-- statement-breakpoint

DROP POLICY IF EXISTS user_data_devices_select ON user_data_devices;

-- statement-breakpoint

CREATE POLICY user_data_devices_select ON user_data_devices
  FOR SELECT USING (owner_id = current_setting('app.owner_id', true));

-- statement-breakpoint

DROP POLICY IF EXISTS user_data_devices_insert ON user_data_devices;

-- statement-breakpoint

CREATE POLICY user_data_devices_insert ON user_data_devices
  FOR INSERT WITH CHECK (owner_id = current_setting('app.owner_id', true));

-- statement-breakpoint

DROP POLICY IF EXISTS user_data_devices_update ON user_data_devices;

-- statement-breakpoint

CREATE POLICY user_data_devices_update ON user_data_devices
  FOR UPDATE USING (owner_id = current_setting('app.owner_id', true))
  WITH CHECK (owner_id = current_setting('app.owner_id', true));

-- statement-breakpoint

DROP POLICY IF EXISTS user_data_devices_delete ON user_data_devices;

-- statement-breakpoint

CREATE POLICY user_data_devices_delete ON user_data_devices
  FOR DELETE USING (owner_id = current_setting('app.owner_id', true));
