/**
 * 本人記録スナップショットの親鍵を、現行版へ包み直す。
 *
 * 記録本文は復号しない。公開されるエンドポイントは増やさない。
 * 接続文字列を持つ管理環境で、運営者が手元から実行する。
 *
 * 既定は確認だけ（書き込まない）。書き込むときは `--apply` を付ける。
 *
 * アプリ用の実行時ロール（RLSあり）では全件が見えない。
 * マイグレーション用のownerロールを USER_DATA_KEY_ROTATION_DATABASE_URL に渡す。
 * この変数はVercelに置かない。
 */
import { neon } from "@neondatabase/serverless";

const MODULE_URLS = {
  crypto: new URL("../src/lib/server/user-data-crypto.ts", import.meta.url),
  rotation: new URL(
    "../src/lib/server/user-data-key-rotation.ts",
    import.meta.url
  ),
};

async function loadModule(url) {
  try {
    return await import(url.href);
  } catch (error) {
    throw new Error(
      `${url.pathname} を読み込めませんでした。` +
        "TypeScript をそのまま実行できる Node.js 22.18 以降で実行してください。",
      { cause: error }
    );
  }
}

const apply = process.argv.includes("--apply");
const databaseUrl = process.env.USER_DATA_KEY_ROTATION_DATABASE_URL ?? "";

if (!databaseUrl) {
  throw new Error(
    "USER_DATA_KEY_ROTATION_DATABASE_URL を設定してください。" +
      "アプリ用の USER_DATA_DATABASE_URL は使いません（RLSで全件が見えないため）。"
  );
}

const { currentUserDataKeyVersion, isUserDataKeyConfigured } = await loadModule(
  MODULE_URLS.crypto
);
const {
  assertRotationRole,
  formatRewrapReport,
  planSnapshotKeyRewrap,
  summarizeRewrapPlan,
} = await loadModule(MODULE_URLS.rotation);

if (!isUserDataKeyConfigured()) {
  throw new Error(
    "USER_DATA_KEK が未設定か、形式が違います。`版:base64鍵` をカンマで並べてください。"
  );
}

const sql = neon(databaseUrl);
const roleRows = await sql`
  SELECT rolbypassrls AS bypass_rls
  FROM pg_roles
  WHERE rolname = current_user
`;
const bypassRls = Boolean(roleRows[0]?.bypass_rls);
assertRotationRole({ bypassRls });

const rows = await sql`
  SELECT
    owner_id,
    generation,
    algorithm,
    key_version,
    wrapped_dek,
    nonce,
    ciphertext
  FROM user_data_snapshots
`;

const currentVersion = currentUserDataKeyVersion();
const plan = planSnapshotKeyRewrap(
  rows.map((row) => ({
    ownerId: String(row.owner_id),
    generation: Number(row.generation),
    snapshot: {
      algorithm: String(row.algorithm),
      keyVersion: String(row.key_version),
      wrappedDek: String(row.wrapped_dek),
      nonce: String(row.nonce),
      ciphertext: String(row.ciphertext),
    },
  })),
  currentVersion
);
const report = summarizeRewrapPlan(plan);

if (rows.length === 0) {
  console.log(
    "対象: 0件。空のDBか、接続ロールが全件を見られていない可能性があります。"
  );
}

console.log(formatRewrapReport(report, "dry-run"));

if (report.fail > 0) {
  throw new Error(
    "包み直せない行があります。旧版の親鍵を環境変数から外さないでください。"
  );
}

if (!apply) {
  console.log("書き込むときは --apply を付けて同じコマンドを実行してください。");
  process.exit(0);
}

const updates = plan.decisions.filter((decision) => decision.action === "update");
for (const update of updates) {
  try {
    await sql`
      UPDATE user_data_snapshots
      SET
        key_version = ${update.snapshot.keyVersion},
        wrapped_dek = ${update.snapshot.wrappedDek}
      WHERE owner_id = ${update.ownerId}
        AND generation = ${update.generation}
    `;
  } catch {
    throw new Error(
      "包み直しの書き込みに失敗しました。所有者IDや暗号文は出さない。旧版は外さないでください。"
    );
  }
}

const remaining = await sql`
  SELECT key_version, count(*)::int AS n
  FROM user_data_snapshots
  GROUP BY key_version
  ORDER BY key_version
`;

console.log(formatRewrapReport(report, "apply"));
console.log("書き込み後の版ごとの件数:");
if (remaining.length === 0) {
  console.log("（行なし）");
} else {
  for (const row of remaining) {
    console.log(`- ${row.key_version}: ${row.n}件`);
  }
}

const leftover = remaining.filter((row) => String(row.key_version) !== currentVersion);
if (leftover.length > 0) {
  throw new Error(
    "現行版以外の行が残っています。旧版を環境変数から外さないでください。"
  );
}
