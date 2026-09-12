/**
 * Code scanning の定期監査向けに、解析の有無と対象SHA・実行結果・日時だけを残す。
 *
 * 警告本文、ファイルパス、SARIF、生API応答は証跡にしない。
 * 解析メタデータは1件（per_page=1）に限り、jq で許可したフィールドだけを残す。
 * HTTP 404 と空配列は「解析なし」であり、問題0件とは区別する。
 */

const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function assertRepositoryName(repository: string): string {
  if (!REPO_PATTERN.test(repository)) {
    throw new Error("リポジトリ名は owner/name の形式で指定してください。");
  }
  return repository;
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

export const CODE_SCAN_REQUIRED_PERMISSION = "security_events=read";
export const CODE_SCAN_DEFAULT_REF = "refs/heads/main";

export type CodeScanUnavailableReason =
  | "permission_denied"
  | "http_error"
  | "response_rejected"
  | "command_failed";

export type CodeScanStatus = {
  checkedAt: string;
  repository: string;
  ref: string;
  available: boolean;
  unavailableReason: CodeScanUnavailableReason | null;
  httpStatus: number | null;
  analysisFound: boolean | null;
  commitSha: string | null;
  createdAt: string | null;
  resultsCount: number | null;
  toolName: string | null;
};

const ALLOWED_PROJECTION_KEYS = new Set([
  "found",
  "commitSha",
  "createdAt",
  "resultsCount",
  "toolName",
]);

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const TOOL_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._+-]{0,63}$/;

/**
 * 解析一覧の取得パス。main の最新1件だけを取る。全件取得はしない。
 */
export function codeScanAnalysesRequestPath(
  repository: string,
  ref: string = CODE_SCAN_DEFAULT_REF
): string {
  const [owner, repo] = assertRepositoryName(repository).split("/");
  const encodedRef = encodeURIComponent(ref);
  return `repos/${owner}/${repo}/code-scanning/analyses?ref=${encodedRef}&per_page=1`;
}

/**
 * 許可したフィールドだけを残す jq。警告本文や URL、SARIF は指名しない。
 * 配列以外は -1 にして、解釈側で破棄する。
 */
export const CODE_SCAN_ANALYSIS_JQ =
  'if type == "array" then (if length == 0 then {found:false} else {found:true, commitSha:.[0].commit_sha, createdAt:.[0].created_at, resultsCount:.[0].results_count, toolName:(.[0].tool.name // null)} end) else -1 end';

function parseHttpStatus(headers: string): number | null {
  const matches = [...headers.matchAll(/^HTTP\/[\d.]+[^\n]* (\d{3})/gm)];
  if (matches.length === 0) return null;
  return Number(matches[matches.length - 1][1]);
}

export function parseGhApiOutput(raw: string): {
  httpStatus: number | null;
  body: string;
} {
  const split = raw.search(/\r?\n\r?\n/);
  const headers = split === -1 ? raw : raw.slice(0, split);
  const body = split === -1 ? "" : raw.slice(split).replace(/^\r?\n\r?\n/, "");
  return { httpStatus: parseHttpStatus(headers), body: body.trim() };
}

type AnalysisProjection = {
  found: boolean;
  commitSha: string | null;
  createdAt: string | null;
  resultsCount: number | null;
  toolName: string | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseToolName(value: unknown): string | null | "rejected" {
  if (value == null) return null;
  if (typeof value !== "string") return "rejected";
  if (!TOOL_NAME_PATTERN.test(value)) return "rejected";
  return value;
}

function parseAnalysisProjection(body: string): AnalysisProjection | "rejected" {
  if (body === "" || body === "-1") return "rejected";

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return "rejected";
  }

  if (!isPlainObject(parsed)) return "rejected";
  if (Object.keys(parsed).some((key) => !ALLOWED_PROJECTION_KEYS.has(key))) {
    return "rejected";
  }
  if (typeof parsed.found !== "boolean") return "rejected";

  if (!parsed.found) {
    if (Object.keys(parsed).length !== 1) return "rejected";
    return {
      found: false,
      commitSha: null,
      createdAt: null,
      resultsCount: null,
      toolName: null,
    };
  }

  if (typeof parsed.commitSha !== "string" || !SHA_PATTERN.test(parsed.commitSha)) {
    return "rejected";
  }
  if (typeof parsed.createdAt !== "string" || !ISO_TIMESTAMP_PATTERN.test(parsed.createdAt)) {
    return "rejected";
  }
  if (
    typeof parsed.resultsCount !== "number" ||
    !Number.isInteger(parsed.resultsCount) ||
    parsed.resultsCount < 0
  ) {
    return "rejected";
  }
  const toolName = parseToolName(parsed.toolName);
  if (toolName === "rejected") return "rejected";

  return {
    found: true,
    commitSha: parsed.commitSha.toLowerCase(),
    createdAt: parsed.createdAt,
    resultsCount: parsed.resultsCount,
    toolName,
  };
}

function reasonForStatus(httpStatus: number | null): CodeScanUnavailableReason {
  if (httpStatus === 401 || httpStatus === 403) return "permission_denied";
  return "http_error";
}

function unavailable(
  input: {
    checkedAt: string;
    repository: string;
    ref?: string;
  },
  reason: CodeScanUnavailableReason,
  httpStatus: number | null
): CodeScanStatus {
  return {
    checkedAt: input.checkedAt,
    repository: assertRepositoryName(input.repository),
    ref: input.ref ?? CODE_SCAN_DEFAULT_REF,
    available: false,
    unavailableReason: reason,
    httpStatus,
    analysisFound: null,
    commitSha: null,
    createdAt: null,
    resultsCount: null,
    toolName: null,
  };
}

function noAnalysis(input: {
  checkedAt: string;
  repository: string;
  ref?: string;
  httpStatus: number;
}): CodeScanStatus {
  return {
    checkedAt: input.checkedAt,
    repository: assertRepositoryName(input.repository),
    ref: input.ref ?? CODE_SCAN_DEFAULT_REF,
    available: true,
    unavailableReason: null,
    httpStatus: input.httpStatus,
    analysisFound: false,
    commitSha: null,
    createdAt: null,
    resultsCount: null,
    toolName: null,
  };
}

/**
 * `gh api -i --jq` の出力を解釈する。
 * 404 と空配列は解析なし。問題0件にはしない。
 */
export function interpretCodeScanAnalyses(input: {
  raw: string;
  checkedAt: string;
  repository: string;
  ref?: string;
}): CodeScanStatus {
  const ref = input.ref ?? CODE_SCAN_DEFAULT_REF;
  const parsed = parseGhApiOutput(input.raw);

  if (parsed.httpStatus == null) {
    return unavailable(
      input,
      parsed.body === "" ? "command_failed" : "response_rejected",
      null
    );
  }
  if (parsed.httpStatus === 404) {
    return noAnalysis({
      checkedAt: input.checkedAt,
      repository: input.repository,
      ref,
      httpStatus: 404,
    });
  }
  if (parsed.httpStatus !== 200) {
    return unavailable(input, reasonForStatus(parsed.httpStatus), parsed.httpStatus);
  }

  const projection = parseAnalysisProjection(parsed.body);
  if (projection === "rejected") {
    return unavailable(input, "response_rejected", parsed.httpStatus);
  }
  if (!projection.found) {
    return noAnalysis({
      checkedAt: input.checkedAt,
      repository: input.repository,
      ref,
      httpStatus: 200,
    });
  }

  return {
    checkedAt: input.checkedAt,
    repository: assertRepositoryName(input.repository),
    ref,
    available: true,
    unavailableReason: null,
    httpStatus: 200,
    analysisFound: true,
    commitSha: projection.commitSha,
    createdAt: projection.createdAt,
    resultsCount: projection.resultsCount,
    toolName: projection.toolName,
  };
}

export function toCodeScanAuditJson(status: CodeScanStatus): string {
  return `${JSON.stringify(status, null, 2)}\n`;
}

export function formatCodeScanReport(status: CodeScanStatus): string {
  const acquisition = status.available ? "成功" : formatUnavailable(status);
  const analysisLine = formatAnalysisLine(status);
  const shaLine = formatShaLine(status);
  const createdLine = formatCreatedLine(status);
  const resultsLine = formatResultsLine(status);
  const toolLine = formatToolLine(status);

  return [
    "ヨルケア Code scanning 監査証跡",
    `確認日時: ${status.checkedAt}`,
    `リポジトリ: ${status.repository}`,
    `対象ref: ${status.ref}`,
    `取得: ${acquisition}`,
    analysisLine,
    shaLine,
    createdLine,
    resultsLine,
    toolLine,
    "",
    "この出力は対象SHA・実行結果・日時・解析の有無だけを持つ。",
    "警告本文、ファイルパス、SARIF、生API応答は含めない。",
    `解析APIの参照には ${CODE_SCAN_REQUIRED_PERMISSION} が必要。`,
    "解析なしと取得不能を問題0件として扱ってはならない。",
  ].join("\n");
}

function formatAnalysisLine(status: CodeScanStatus): string {
  if (!status.available) return "解析: —（取得できないため出さない。問題0件とは区別する）";
  return status.analysisFound ? "解析: あり" : "解析: なし";
}

function formatShaLine(status: CodeScanStatus): string {
  if (!status.available) {
    return "対象SHA: —（取得できないため出さない。問題0件とは区別する）";
  }
  if (!status.analysisFound) {
    return "対象SHA: —（解析がないため出さない。問題0件とは区別する）";
  }
  return `対象SHA: ${status.commitSha}`;
}

function formatCreatedLine(status: CodeScanStatus): string {
  if (!status.available) {
    return "解析日時: —（取得できないため出さない。問題0件とは区別する）";
  }
  if (!status.analysisFound) {
    return "解析日時: —（解析がないため出さない。問題0件とは区別する）";
  }
  return `解析日時: ${status.createdAt}`;
}

function formatResultsLine(status: CodeScanStatus): string {
  if (!status.available) {
    return "実行結果: —（取得できないため出さない。問題0件とは区別する）";
  }
  if (!status.analysisFound) {
    return "実行結果: —（解析がないため出さない。問題0件とは区別する）";
  }
  return `実行結果: ${status.resultsCount}件`;
}

function formatToolLine(status: CodeScanStatus): string {
  if (!status.available || !status.analysisFound) return "ツール: —";
  return `ツール: ${status.toolName ?? "—"}`;
}

function formatUnavailable(status: CodeScanStatus): string {
  const statusPart =
    status.httpStatus == null ? "" : `HTTP ${status.httpStatus}。`;
  switch (status.unavailableReason) {
    case "permission_denied":
      return `不能（${statusPart}${CODE_SCAN_REQUIRED_PERMISSION} が必要）`;
    case "response_rejected":
      return `不能（${statusPart}許可したフィールド以外の本文を破棄した）`;
    case "command_failed":
      return "不能（GitHub CLI の実行に失敗）";
    case "http_error":
      return `不能（${statusPart || "HTTPエラー"}）`;
    default:
      return "不能";
  }
}
