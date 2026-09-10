/**
 * Secret scanning の定期監査向けに、件数と取得成否だけを残す。
 *
 * GitHub の警告一覧APIは応答本文に秘密値を含むため、監査の証跡には使わない。
 * 取得は1ページ（per_page=1）に限り、jq で配列長だけを残した出力を解釈する。
 * 本文が件数以外なら破棄し、0件とは区別して「取得不能」にする。
 */

export const SECRET_SCAN_REQUIRED_PERMISSION = "secret_scanning_alerts=read";

export type SecretScanAlertState = "open" | "resolved";

export type SecretScanUnavailableReason =
  | "permission_denied"
  | "not_found"
  | "http_error"
  | "response_rejected"
  | "command_failed";

export type SecretScanCountResult = {
  available: boolean;
  unavailableReason: SecretScanUnavailableReason | null;
  httpStatus: number | null;
  count: number | null;
};

export type SecretScanStatus = {
  checkedAt: string;
  repository: string;
  available: boolean;
  unavailableReason: SecretScanUnavailableReason | null;
  httpStatus: number | null;
  openCount: number | null;
  resolvedCount: number | null;
};

const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const COUNT_BODY_PATTERN = /^-?\d+$/;

export function assertRepositoryName(repository: string): string {
  if (!REPO_PATTERN.test(repository)) {
    throw new Error("リポジトリ名は owner/name の形式で指定してください。");
  }
  return repository;
}

/**
 * 警告一覧の取得パス。全件取得や本文の利用はしない。
 * per_page=1 は Link の last ページ番号を件数として読むため。
 */
export function secretScanAlertsRequestPath(
  repository: string,
  state: SecretScanAlertState
): string {
  const [owner, repo] = assertRepositoryName(repository).split("/");
  return `repos/${owner}/${repo}/secret-scanning/alerts?state=${state}&per_page=1`;
}

/** 件数取得で gh に渡す jq。秘密値のフィールドを指名しない */
export const SECRET_SCAN_COUNT_JQ = "if type == \"array\" then length else -1 end";

export function parseLinkLastPage(linkHeader: string | null | undefined): number | null {
  if (!linkHeader) return null;

  for (const part of linkHeader.split(",")) {
    if (!/rel="?last"?/i.test(part)) continue;
    const page = part.match(/[?&]page=(\d+)/i);
    if (page) return Number(page[1]);
  }
  return null;
}

function parseHttpStatus(headers: string): number | null {
  const matches = [...headers.matchAll(/^HTTP\/[\d.]+[^\n]* (\d{3})/gm)];
  if (matches.length === 0) return null;
  return Number(matches[matches.length - 1][1]);
}

function parseLinkHeader(headers: string): string | null {
  const match = headers.match(/^link:\s*(.+)\s*$/im);
  return match ? match[1].trim() : null;
}

/**
 * `gh api -i --jq 'length'` の出力をヘッダと件数に分ける。
 * ヘッダより後ろが整数でなければ本文を捨てて拒否する。
 */
export function parseGhApiCountOutput(raw: string): {
  httpStatus: number | null;
  linkLastPage: number | null;
  countFromJq: number | null;
  rejected: boolean;
} {
  const split = raw.search(/\r?\n\r?\n/);
  const headers = split === -1 ? raw : raw.slice(0, split);
  const body = split === -1 ? "" : raw.slice(split).replace(/^\r?\n\r?\n/, "");
  const httpStatus = parseHttpStatus(headers);
  const linkLastPage = parseLinkLastPage(parseLinkHeader(headers));
  const trimmed = body.trim();

  if (trimmed === "") {
    return { httpStatus, linkLastPage, countFromJq: null, rejected: false };
  }
  if (!COUNT_BODY_PATTERN.test(trimmed)) {
    return { httpStatus, linkLastPage, countFromJq: null, rejected: true };
  }

  const countFromJq = Number(trimmed);
  return { httpStatus, linkLastPage, countFromJq, rejected: false };
}

function reasonForStatus(httpStatus: number | null): SecretScanUnavailableReason {
  if (httpStatus === 401 || httpStatus === 403) return "permission_denied";
  if (httpStatus === 404) return "not_found";
  return "http_error";
}

function unavailable(
  reason: SecretScanUnavailableReason,
  httpStatus: number | null
): SecretScanCountResult {
  return {
    available: false,
    unavailableReason: reason,
    httpStatus,
    count: null,
  };
}

/**
 * 1状態分の件数。jq が 0 なら 0件。1件以上は Link の last を優先する。
 */
export function interpretSecretScanCount(raw: string): SecretScanCountResult {
  const parsed = parseGhApiCountOutput(raw);

  if (parsed.httpStatus == null) {
    return unavailable(
      parsed.rejected ? "response_rejected" : "command_failed",
      null
    );
  }
  if (parsed.httpStatus !== 200) {
    // 403 などの本文は件数ではないが、状態は HTTP で決める。本文は使わない。
    return unavailable(reasonForStatus(parsed.httpStatus), parsed.httpStatus);
  }
  if (parsed.rejected || parsed.countFromJq == null || parsed.countFromJq < 0) {
    return unavailable("response_rejected", parsed.httpStatus);
  }
  if (parsed.countFromJq === 0) {
    return {
      available: true,
      unavailableReason: null,
      httpStatus: 200,
      count: 0,
    };
  }

  const count = parsed.linkLastPage ?? parsed.countFromJq;
  return {
    available: true,
    unavailableReason: null,
    httpStatus: 200,
    count,
  };
}

export function combineSecretScanCounts(input: {
  checkedAt: string;
  repository: string;
  open: SecretScanCountResult;
  resolved: SecretScanCountResult;
}): SecretScanStatus {
  const repository = assertRepositoryName(input.repository);
  const available = input.open.available && input.resolved.available;

  if (!available) {
    const failed = input.open.available ? input.resolved : input.open;
    return {
      checkedAt: input.checkedAt,
      repository,
      available: false,
      unavailableReason: failed.unavailableReason,
      httpStatus: failed.httpStatus,
      openCount: null,
      resolvedCount: null,
    };
  }

  return {
    checkedAt: input.checkedAt,
    repository,
    available: true,
    unavailableReason: null,
    httpStatus: 200,
    openCount: input.open.count,
    resolvedCount: input.resolved.count,
  };
}

export function toSecretScanAuditJson(status: SecretScanStatus): string {
  return `${JSON.stringify(status, null, 2)}\n`;
}

function formatAvailableCount(label: string, count: number | null): string {
  if (count === null) return `${label}: —`;
  return `${label}: ${count}件`;
}

export function formatSecretScanReport(status: SecretScanStatus): string {
  const acquisition = status.available
    ? "成功"
    : formatUnavailable(status);

  const openLine = status.available
    ? formatAvailableCount("open", status.openCount)
    : "open: —（取得できないため出さない。0件とは区別する）";
  const resolvedLine = status.available
    ? formatAvailableCount("resolved", status.resolvedCount)
    : "resolved: —（取得できないため出さない。0件とは区別する）";

  return [
    "ヨルケア Secret scanning 監査証跡",
    `確認日時: ${status.checkedAt}`,
    `リポジトリ: ${status.repository}`,
    `取得: ${acquisition}`,
    openLine,
    resolvedLine,
    "",
    "この出力は件数・状態・確認日時だけを持つ。",
    "警告の本文、秘密値、検出箇所、生API応答は含めない。",
    `件数APIの参照には ${SECRET_SCAN_REQUIRED_PERMISSION} が必要。`,
    "取得不能を 0件として扱ってはならない。",
  ].join("\n");
}

function formatUnavailable(status: SecretScanStatus): string {
  const statusPart =
    status.httpStatus == null ? "" : `HTTP ${status.httpStatus}。`;
  switch (status.unavailableReason) {
    case "permission_denied":
      return `不能（${statusPart}${SECRET_SCAN_REQUIRED_PERMISSION} が必要）`;
    case "not_found":
      return `不能（${statusPart}解析または機能が見つからない）`;
    case "response_rejected":
      return `不能（${statusPart}件数以外の本文を破棄した）`;
    case "command_failed":
      return "不能（GitHub CLI の実行に失敗）";
    case "http_error":
      return `不能（${statusPart || "HTTPエラー"}）`;
    default:
      return "不能";
  }
}

/** 誤って秘密値キーを残していないことの検査。テストと出力直前で使う */
export function hasForbiddenAuditKeys(value: unknown): boolean {
  const forbidden = new Set([
    "secret",
    "token",
    "password",
    "private_key",
    "authorization",
    "cookie",
  ]);

  function walk(node: unknown): boolean {
    if (Array.isArray(node)) return node.some(walk);
    if (node && typeof node === "object") {
      for (const [key, child] of Object.entries(node)) {
        if (forbidden.has(key.toLowerCase())) return true;
        if (walk(child)) return true;
      }
    }
    return false;
  }

  return walk(value);
}
