import { describe, expect, it } from "vitest";
import {
  combineSecretScanCounts,
  formatSecretScanReport,
  hasForbiddenAuditKeys,
  interpretSecretScanCount,
  parseGhApiCountOutput,
  parseLinkLastPage,
  SECRET_SCAN_COUNT_JQ,
  secretScanAlertsRequestPath,
  toSecretScanAuditJson,
  type SecretScanCountResult,
} from "./secret-scan-status";

const REPO = "kuma-0509/yorucare";
const CHECKED_AT = "2026-09-10T15:17:22.000Z";

function ghOutput(headers: string, body: string): string {
  return `${headers}\r\n\r\n${body}`;
}

const okZero = ghOutput("HTTP/2.0 200 OK", "0");
const forbidden = ghOutput("HTTP/2.0 403 Forbidden", "");
const leakedBody = ghOutput(
  "HTTP/2.0 200 OK",
  '[{"secret":"ghp_should-never-appear","state":"open"}]'
);

function countOk(count: number): SecretScanCountResult {
  return {
    available: true,
    unavailableReason: null,
    httpStatus: 200,
    count,
  };
}

describe("secretScanAlertsRequestPath", () => {
  it("1ページだけ取り、全件取得の指定を付けない", () => {
    expect(secretScanAlertsRequestPath(REPO, "open")).toBe(
      "repos/kuma-0509/yorucare/secret-scanning/alerts?state=open&per_page=1"
    );
    expect(secretScanAlertsRequestPath(REPO, "resolved")).toContain(
      "state=resolved&per_page=1"
    );
    expect(secretScanAlertsRequestPath(REPO, "open")).not.toContain("paginate");
  });

  it("jq は配列長だけを残し、secret フィールドを指名しない", () => {
    expect(SECRET_SCAN_COUNT_JQ).toContain("length");
    expect(SECRET_SCAN_COUNT_JQ).not.toMatch(/\.secret\b/);
    expect(SECRET_SCAN_COUNT_JQ).not.toContain("nodes");
  });
});

describe("parseLinkLastPage", () => {
  it("rel=last の page を件数として読む", () => {
    expect(
      parseLinkLastPage(
        '<https://api.github.com/repositories/1/secret-scanning/alerts?state=open&per_page=1&page=2>; rel="next", <https://api.github.com/repositories/1/secret-scanning/alerts?state=open&per_page=1&page=4>; rel="last"'
      )
    ).toBe(4);
  });

  it("last が無ければ null", () => {
    expect(parseLinkLastPage('<https://example.com>; rel="next"')).toBeNull();
    expect(parseLinkLastPage(undefined)).toBeNull();
  });
});

describe("interpretSecretScanCount", () => {
  it("403 は取得不能であり件数は null", () => {
    expect(interpretSecretScanCount(forbidden)).toEqual({
      available: false,
      unavailableReason: "permission_denied",
      httpStatus: 403,
      count: null,
    });
  });

  it("403 の JSON 本文は読まず permission_denied にする", () => {
    const raw = ghOutput(
      "HTTP/2.0 403 Forbidden",
      '{"message":"Must have admin rights to Repository.","secret":"ghp_should-never-appear"}'
    );
    const result = interpretSecretScanCount(raw);
    expect(result).toEqual({
      available: false,
      unavailableReason: "permission_denied",
      httpStatus: 403,
      count: null,
    });
    expect(JSON.stringify(result)).not.toContain("ghp_should-never-appear");
    expect(JSON.stringify(result)).not.toContain("admin rights");
  });

  it("404 は機能または解析なしであり 0件にしない", () => {
    expect(interpretSecretScanCount(ghOutput("HTTP/2.0 404 Not Found", ""))).toEqual({
      available: false,
      unavailableReason: "not_found",
      httpStatus: 404,
      count: null,
    });
  });

  it("200 で jq が 0 なら 0件", () => {
    expect(interpretSecretScanCount(okZero)).toEqual({
      available: true,
      unavailableReason: null,
      httpStatus: 200,
      count: 0,
    });
  });

  it("200 で1件かつ Link last があれば last を件数にする", () => {
    const raw = ghOutput(
      [
        "HTTP/2.0 200 OK",
        'Link: <https://api.github.com/repositories/1/secret-scanning/alerts?state=open&per_page=1&page=7>; rel="last"',
      ].join("\r\n"),
      "1"
    );
    expect(interpretSecretScanCount(raw)).toEqual({
      available: true,
      unavailableReason: null,
      httpStatus: 200,
      count: 7,
    });
  });

  it("200 で1件かつ Link が無ければ 1件", () => {
    expect(interpretSecretScanCount(ghOutput("HTTP/2.0 200 OK", "1"))).toEqual({
      available: true,
      unavailableReason: null,
      httpStatus: 200,
      count: 1,
    });
  });

  it("秘密値を含む本文は破棄し、件数にしない", () => {
    const parsed = parseGhApiCountOutput(leakedBody);
    expect(parsed.rejected).toBe(true);
    expect(parsed.countFromJq).toBeNull();

    const result = interpretSecretScanCount(leakedBody);
    expect(result.available).toBe(false);
    expect(result.unavailableReason).toBe("response_rejected");
    expect(result.count).toBeNull();
    expect(JSON.stringify(result)).not.toContain("ghp_should-never-appear");
  });

  it("jq が配列以外を -1 にしたときは取得不能", () => {
    expect(interpretSecretScanCount(ghOutput("HTTP/2.0 200 OK", "-1"))).toEqual({
      available: false,
      unavailableReason: "response_rejected",
      httpStatus: 200,
      count: null,
    });
  });
});

describe("combineSecretScanCounts と証跡", () => {
  it("片方でも取得不能なら件数を出さない", () => {
    const status = combineSecretScanCounts({
      checkedAt: CHECKED_AT,
      repository: REPO,
      open: interpretSecretScanCount(forbidden),
      resolved: countOk(0),
    });

    expect(status.available).toBe(false);
    expect(status.openCount).toBeNull();
    expect(status.resolvedCount).toBeNull();
    expect(status.unavailableReason).toBe("permission_denied");
  });

  it("両方成功したときだけ件数を残す", () => {
    const status = combineSecretScanCounts({
      checkedAt: CHECKED_AT,
      repository: REPO,
      open: countOk(0),
      resolved: countOk(2),
    });

    expect(status).toEqual({
      checkedAt: CHECKED_AT,
      repository: REPO,
      available: true,
      unavailableReason: null,
      httpStatus: 200,
      openCount: 0,
      resolvedCount: 2,
    });
    expect(hasForbiddenAuditKeys(status)).toBe(false);
  });

  it("取得不能の報告は 0件 と書かない", () => {
    const status = combineSecretScanCounts({
      checkedAt: CHECKED_AT,
      repository: REPO,
      open: interpretSecretScanCount(forbidden),
      resolved: interpretSecretScanCount(forbidden),
    });
    const report = formatSecretScanReport(status);

    expect(report).toContain("取得: 不能");
    expect(report).toContain("HTTP 403");
    expect(report).toContain("0件とは区別する");
    expect(report).not.toMatch(/open: 0件/);
    expect(report).not.toMatch(/resolved: 0件/);
    expect(report).toContain("取得不能を 0件として扱ってはならない");
  });

  it("0件は取得成功として 0件 と書く", () => {
    const status = combineSecretScanCounts({
      checkedAt: CHECKED_AT,
      repository: REPO,
      open: countOk(0),
      resolved: countOk(0),
    });
    const report = formatSecretScanReport(status);

    expect(report).toContain("取得: 成功");
    expect(report).toContain("open: 0件");
    expect(report).toContain("resolved: 0件");
    expect(report).not.toContain("取得できないため出さない");
  });

  it("生APIの秘密値は報告文へ漏れない", () => {
    const status = combineSecretScanCounts({
      checkedAt: CHECKED_AT,
      repository: REPO,
      open: interpretSecretScanCount(leakedBody),
      resolved: countOk(0),
    });
    const report = formatSecretScanReport(status);
    const json = toSecretScanAuditJson(status);

    expect(report).not.toContain("ghp_should-never-appear");
    expect(json).not.toContain("ghp_should-never-appear");
    expect(json).not.toContain('"secret"');
    expect(hasForbiddenAuditKeys(JSON.parse(json))).toBe(false);
  });

  it("禁止キーを持つオブジェクトを検出する", () => {
    expect(hasForbiddenAuditKeys({ secret: "x" })).toBe(true);
    expect(hasForbiddenAuditKeys({ openCount: 0 })).toBe(false);
  });
});
