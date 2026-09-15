import { rewrapDataKey, type EncryptedSnapshot } from "./user-data-crypto";

/**
 * 親鍵入れ替えの包み直し計画。
 *
 * 記録本文は復号しない。DEKの包みだけを現行版へ付け替える。
 * 公開されるエンドポイントは増やさない。計画の要約には件数と版だけを載せ、
 * 所有者ID・暗号文・包んだ鍵は出さない。
 */

export type SnapshotKeyRow = {
  ownerId: string;
  generation: number;
  snapshot: EncryptedSnapshot;
};

export type RewrapDecision =
  | { action: "skip" }
  | { action: "update"; ownerId: string; generation: number; snapshot: EncryptedSnapshot }
  | { action: "fail"; reason: "unknown_version" | "rewrap_failed" };

export type RewrapPlan = {
  currentVersion: string;
  decisions: RewrapDecision[];
};

export function planSnapshotKeyRewrap(
  rows: SnapshotKeyRow[],
  currentVersion: string,
  rewrap: typeof rewrapDataKey = rewrapDataKey
): RewrapPlan {
  const decisions = rows.map((row): RewrapDecision => {
    if (row.snapshot.keyVersion === currentVersion) {
      return { action: "skip" };
    }

    try {
      const snapshot = rewrap(row.snapshot);
      if (snapshot.keyVersion !== currentVersion) {
        return { action: "fail", reason: "rewrap_failed" };
      }
      return {
        action: "update",
        ownerId: row.ownerId,
        generation: row.generation,
        snapshot,
      };
    } catch {
      return { action: "fail", reason: "unknown_version" };
    }
  });

  return { currentVersion, decisions };
}

export type RewrapReport = {
  currentVersion: string;
  total: number;
  skip: number;
  update: number;
  fail: number;
};

export function summarizeRewrapPlan(plan: RewrapPlan): RewrapReport {
  let skip = 0;
  let update = 0;
  let fail = 0;

  for (const decision of plan.decisions) {
    if (decision.action === "skip") skip += 1;
    else if (decision.action === "update") update += 1;
    else fail += 1;
  }

  return {
    currentVersion: plan.currentVersion,
    total: plan.decisions.length,
    skip,
    update,
    fail,
  };
}

export function formatRewrapReport(
  report: RewrapReport,
  mode: "dry-run" | "apply"
): string {
  const header =
    mode === "apply"
      ? "親鍵の包み直しを書き込みました。"
      : "親鍵の包み直し（確認だけ。まだ書き込んでいません）。";

  const failLine =
    report.fail > 0
      ? `失敗: ${report.fail}件。旧版を環境変数から外してはいけない。`
      : "失敗: 0件。";

  return [
    header,
    `現行の版: ${report.currentVersion}`,
    `対象: ${report.total}件`,
    `そのまま: ${report.skip}件`,
    `包み直し: ${report.update}件`,
    failLine,
  ].join("\n");
}

/**
 * 全件を見る入れ替え作業は、RLSを素通りできるロールだけで行う。
 * アプリ用ロールだと0件に見えて、旧版を外す判断を誤る。
 */
export function assertRotationRole(role: { bypassRls: boolean }): void {
  if (!role.bypassRls) {
    throw new Error(
      "この接続ロールはRLSを素通りできないため、全件を包み直せません。" +
        "マイグレーション用のownerロールの接続文字列を USER_DATA_KEY_ROTATION_DATABASE_URL に渡し、" +
        "アプリ用の実行時ロールは使わないでください。"
    );
  }
}
