/**
 * Secret scanning の件数と取得成否だけを表示する。
 *
 * 警告一覧の本文（秘密値）は証跡に残さない。解釈は
 * `src/lib/secret-scan-status.ts` に置き、ここでは gh を呼ぶだけにする。
 *
 * `src/lib/*.ts` を読み込む。Node.js 22.6 以降で `--experimental-strip-types`
 * を付ける（22.18 以降は既定）。`package.json` の `security:secret-scan` が
 * そのフラグを付ける。
 */
import { spawnSync } from "node:child_process";

const MODULE_URL = new URL("../src/lib/secret-scan-status.ts", import.meta.url);

async function loadModule() {
  try {
    return await import(MODULE_URL.href);
  } catch (error) {
    throw new Error(
      `${MODULE_URL.pathname} を読み込めませんでした。` +
        "Node.js 22.6 以降で `pnpm security:secret-scan` を使ってください。",
      { cause: error }
    );
  }
}

function resolveRepository(args) {
  const fromArg = args[0];
  if (fromArg) return fromArg;
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;

  const viewed = spawnSync(
    "gh",
    ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"],
    { encoding: "utf8" }
  );
  const name = (viewed.stdout ?? "").trim();
  if (viewed.status === 0 && name) return name;

  throw new Error(
    "リポジトリ名を引数 owner/name で渡すか、gh repo view が使える環境で実行してください。"
  );
}

function readGhCountOutput(path, jq) {
  const result = spawnSync(
    "gh",
    ["api", "--include", "--jq", jq, path],
    { encoding: "utf8" }
  );
  const stdout = result.stdout ?? "";
  if (/^HTTP\//m.test(stdout)) return stdout;

  const http = (result.stderr ?? "").match(/HTTP (\d{3})/);
  if (http) return `HTTP/2.0 ${http[1]}\n\n`;
  return stdout;
}

const {
  SECRET_SCAN_COUNT_JQ,
  combineSecretScanCounts,
  formatSecretScanReport,
  hasForbiddenAuditKeys,
  interpretSecretScanCount,
  secretScanAlertsRequestPath,
  toSecretScanAuditJson,
} = await loadModule();

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const repository = resolveRepository(argv.filter((arg) => arg !== "--json"));
const checkedAt = new Date().toISOString();
const status = combineSecretScanCounts({
  checkedAt,
  repository,
  open: interpretSecretScanCount(
    readGhCountOutput(
      secretScanAlertsRequestPath(repository, "open"),
      SECRET_SCAN_COUNT_JQ
    )
  ),
  resolved: interpretSecretScanCount(
    readGhCountOutput(
      secretScanAlertsRequestPath(repository, "resolved"),
      SECRET_SCAN_COUNT_JQ
    )
  ),
});

if (hasForbiddenAuditKeys(status)) {
  throw new Error("監査結果に残してはいけないキーが含まれたため、出力を中止しました。");
}

process.stdout.write(
  asJson ? toSecretScanAuditJson(status) : `${formatSecretScanReport(status)}\n`
);
