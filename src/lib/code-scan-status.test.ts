import { describe, expect, it } from "vitest";
import {
  CODE_SCAN_ANALYSIS_JQ,
  CODE_SCAN_DEFAULT_REF,
  codeScanAnalysesRequestPath,
  formatCodeScanReport,
  hasForbiddenAuditKeys,
  interpretCodeScanAnalyses,
  toCodeScanAuditJson,
} from "./code-scan-status";

const REPO = "kuma-0509/yorucare";
const CHECKED_AT = "2026-09-11T15:17:22.000Z";
const SHA = "e91d64aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const CREATED_AT = "2026-09-10T12:00:00Z";

function ghOutput(headers: string, body: string): string {
  return `${headers}\r\n\r\n${body}`;
}

function interpret(raw: string) {
  return interpretCodeScanAnalyses({
    raw,
    checkedAt: CHECKED_AT,
    repository: REPO,
  });
}

function foundProjection(overrides?: {
  resultsCount?: number;
  toolName?: string | null;
}): string {
  return JSON.stringify({
    found: true,
    commitSha: SHA,
    createdAt: CREATED_AT,
    resultsCount: overrides?.resultsCount ?? 3,
    toolName: overrides?.toolName === undefined ? "CodeQL" : overrides.toolName,
  });
}

describe("codeScanAnalysesRequestPath", () => {
  it("main の最新1件だけ取り、全件取得の指定を付けない", () => {
    expect(codeScanAnalysesRequestPath(REPO)).toBe(
      "repos/kuma-0509/yorucare/code-scanning/analyses?ref=refs%2Fheads%2Fmain&per_page=1"
    );
    expect(codeScanAnalysesRequestPath(REPO)).toContain("per_page=1");
    expect(codeScanAnalysesRequestPath(REPO)).not.toContain("paginate");
    expect(CODE_SCAN_DEFAULT_REF).toBe("refs/heads/main");
  });

  it("jq は許可したフィールドだけを残し、警告本文や URL を指名しない", () => {
    expect(CODE_SCAN_ANALYSIS_JQ).toContain("commit_sha");
    expect(CODE_SCAN_ANALYSIS_JQ).toContain("results_count");
    expect(CODE_SCAN_ANALYSIS_JQ).toContain("created_at");
    expect(CODE_SCAN_ANALYSIS_JQ).not.toContain("html_url");
    expect(CODE_SCAN_ANALYSIS_JQ).not.toContain("sarif");
    expect(CODE_SCAN_ANALYSIS_JQ).not.toContain("most_recent_instance");
    expect(CODE_SCAN_ANALYSIS_JQ).not.toMatch(/\.rule\b/);
    expect(CODE_SCAN_ANALYSIS_JQ).not.toContain("paginate");
  });
});

describe("interpretCodeScanAnalyses", () => {
  it("404 は解析なしであり問題0件にしない", () => {
    const status = interpret(
      ghOutput(
        "HTTP/2.0 404 Not Found",
        '{"message":"no analysis found for this repository"}'
      )
    );

    expect(status).toMatchObject({
      available: true,
      analysisFound: false,
      httpStatus: 404,
      commitSha: null,
      resultsCount: null,
    });
    expect(JSON.stringify(status)).not.toContain("no analysis found");
  });

  it("200 の空配列投影も解析なしであり問題0件にしない", () => {
    const status = interpret(ghOutput("HTTP/2.0 200 OK", '{"found":false}'));

    expect(status).toMatchObject({
      available: true,
      analysisFound: false,
      httpStatus: 200,
      commitSha: null,
      createdAt: null,
      resultsCount: null,
    });
  });

  it("403 は取得不能であり件数は null", () => {
    expect(interpret(ghOutput("HTTP/2.0 403 Forbidden", ""))).toMatchObject({
      available: false,
      unavailableReason: "permission_denied",
      httpStatus: 403,
      analysisFound: null,
      resultsCount: null,
    });
  });

  it("403 の JSON 本文は読まず permission_denied にする", () => {
    const raw = ghOutput(
      "HTTP/2.0 403 Forbidden",
      '{"message":"Resource not accessible by integration","token":"ghp_should-never-appear"}'
    );
    const status = interpret(raw);
    expect(status.unavailableReason).toBe("permission_denied");
    expect(status.resultsCount).toBeNull();
    expect(JSON.stringify(status)).not.toContain("ghp_should-never-appear");
    expect(JSON.stringify(status)).not.toContain("not accessible");
  });

  it("解析ありで実行結果0件なら 0件 と書いてよい", () => {
    const status = interpret(ghOutput("HTTP/2.0 200 OK", foundProjection({ resultsCount: 0 })));

    expect(status).toMatchObject({
      available: true,
      analysisFound: true,
      commitSha: SHA,
      createdAt: CREATED_AT,
      resultsCount: 0,
      toolName: "CodeQL",
    });
  });

  it("解析ありなら対象SHA・日時・件数を残す", () => {
    const status = interpret(ghOutput("HTTP/2.0 200 OK", foundProjection({ resultsCount: 17 })));

    expect(status).toMatchObject({
      available: true,
      analysisFound: true,
      commitSha: SHA,
      createdAt: CREATED_AT,
      resultsCount: 17,
      toolName: "CodeQL",
      ref: CODE_SCAN_DEFAULT_REF,
    });
    expect(hasForbiddenAuditKeys(status)).toBe(false);
  });

  it("許可していないフィールドを含む本文は破棄する", () => {
    const leaked = JSON.stringify({
      found: true,
      commitSha: SHA,
      createdAt: CREATED_AT,
      resultsCount: 1,
      toolName: "CodeQL",
      html_url: "https://github.com/kuma-0509/yorucare/security/code-scanning/1",
      snippet: "const secret = 'ghp_should-never-appear'",
    });
    const status = interpret(ghOutput("HTTP/2.0 200 OK", leaked));

    expect(status.available).toBe(false);
    expect(status.unavailableReason).toBe("response_rejected");
    expect(status.resultsCount).toBeNull();
    expect(JSON.stringify(status)).not.toContain("ghp_should-never-appear");
    expect(JSON.stringify(status)).not.toContain("html_url");
  });

  it("整数 0 だけの本文は問題0件にしない", () => {
    const status = interpret(ghOutput("HTTP/2.0 200 OK", "0"));
    expect(status.available).toBe(false);
    expect(status.unavailableReason).toBe("response_rejected");
    expect(status.resultsCount).toBeNull();
    expect(status.analysisFound).toBeNull();
  });

  it("jq が配列以外を -1 にしたときは取得不能", () => {
    expect(interpret(ghOutput("HTTP/2.0 200 OK", "-1"))).toMatchObject({
      available: false,
      unavailableReason: "response_rejected",
      resultsCount: null,
    });
  });

  it("不正なSHAは破棄する", () => {
    const body = JSON.stringify({
      found: true,
      commitSha: "not-a-sha",
      createdAt: CREATED_AT,
      resultsCount: 0,
      toolName: "CodeQL",
    });
    expect(interpret(ghOutput("HTTP/2.0 200 OK", body)).unavailableReason).toBe(
      "response_rejected"
    );
  });
});

describe("formatCodeScanReport", () => {
  it("解析なしの報告は問題0件と書かない", () => {
    const status = interpret(ghOutput("HTTP/2.0 404 Not Found", "{}"));
    const report = formatCodeScanReport(status);

    expect(report).toContain("取得: 成功");
    expect(report).toContain("解析: なし");
    expect(report).toContain("問題0件とは区別する");
    expect(report).not.toMatch(/実行結果: 0件/);
    expect(report).not.toContain("問題なし");
    expect(report).toContain("解析なしと取得不能を問題0件として扱ってはならない");
  });

  it("取得不能の報告は 0件 と書かない", () => {
    const status = interpret(ghOutput("HTTP/2.0 403 Forbidden", ""));
    const report = formatCodeScanReport(status);

    expect(report).toContain("取得: 不能");
    expect(report).toContain("HTTP 403");
    expect(report).toContain("security_events=read");
    expect(report).not.toMatch(/実行結果: 0件/);
    expect(report).toContain("問題0件とは区別する");
  });

  it("解析ありの 0件 は実行結果 0件 と書く", () => {
    const status = interpret(
      ghOutput("HTTP/2.0 200 OK", foundProjection({ resultsCount: 0 }))
    );
    const report = formatCodeScanReport(status);

    expect(report).toContain("取得: 成功");
    expect(report).toContain("解析: あり");
    expect(report).toContain(`対象SHA: ${SHA}`);
    expect(report).toContain(`解析日時: ${CREATED_AT}`);
    expect(report).toContain("実行結果: 0件");
    expect(report).toContain("ツール: CodeQL");
    expect(report).not.toContain("取得できないため出さない");
  });

  it("生APIの本文は報告文へ漏れない", () => {
    const leaked = ghOutput(
      "HTTP/2.0 200 OK",
      JSON.stringify({
        found: true,
        commitSha: SHA,
        createdAt: CREATED_AT,
        resultsCount: 1,
        html_url: "/security/code-scanning/99",
        token: "ghp_should-never-appear",
      })
    );
    const status = interpret(leaked);
    const report = formatCodeScanReport(status);
    const json = toCodeScanAuditJson(status);

    expect(report).not.toContain("ghp_should-never-appear");
    expect(report).not.toContain("code-scanning/99");
    expect(json).not.toContain("ghp_should-never-appear");
    expect(json).not.toContain("html_url");
    expect(hasForbiddenAuditKeys(JSON.parse(json))).toBe(false);
  });
});
