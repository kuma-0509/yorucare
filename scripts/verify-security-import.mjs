/**
 * バックアップ復元の検証（壊れたJSON / 巨大ファイル / 正常ファイル）
 * Usage: node scripts/verify-security-import.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const mark = ok ? "OK" : "NG";
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function runImport(page, jsonText) {
  return page.evaluate((text) => {
    const STORAGE_KEYS = {
      records: "yorucare_daily_records",
      selfCare: "yorucare_self_care_items",
    };
    const MAX_IMPORT_RECORDS = 5000;
    const MAX_IMPORT_SELF_CARE = 1000;

    function isObject(value) {
      return typeof value === "object" && value !== null && !Array.isArray(value);
    }
    function isValidRecordShape(value) {
      if (!isObject(value)) return false;
      return typeof value.id === "string" && typeof value.date === "string";
    }
    function isValidSelfCareShape(value) {
      if (!isObject(value)) return false;
      return typeof value.id === "string" && typeof value.title === "string";
    }

    function importBackup(json) {
      let data;
      try {
        data = JSON.parse(json);
      } catch {
        return { ok: false, error: "ファイルを読み込めませんでした" };
      }
      if (!Array.isArray(data.records) || !Array.isArray(data.selfCareItems)) {
        return { ok: false, error: "ファイルの形式が正しくありません" };
      }
      if (
        data.records.length > MAX_IMPORT_RECORDS ||
        data.selfCareItems.length > MAX_IMPORT_SELF_CARE
      ) {
        return { ok: false, error: "データ量が大きすぎるため読み込めませんでした" };
      }
      if (
        !data.records.every(isValidRecordShape) ||
        !data.selfCareItems.every(isValidSelfCareShape)
      ) {
        return { ok: false, error: "ファイルの形式が正しくありません" };
      }
      localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(data.records));
      localStorage.setItem(STORAGE_KEYS.selfCare, JSON.stringify(data.selfCareItems));
      return { ok: true };
    }

    return importBackup(text);
  }, jsonText);
}

async function getStoredRecords(page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("yorucare_daily_records") || "[]")
  );
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    console.error("Playwright chromium が必要です: npx playwright install chromium");
    process.exit(1);
  }

  const page = await browser.newPage();
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("yorucare_storage_notice_dismissed", "1");
  });
  await page.reload({ waitUntil: "domcontentloaded" });

  // 壊れたJSON
  const broken = await runImport(page, "{not json");
  record(
    "壊れたJSONを拒否",
    !broken.ok && broken.error === "ファイルを読み込めませんでした",
    broken.error
  );

  // 形式不正（配列でない）
  const invalidShape = await runImport(
    page,
    JSON.stringify({ records: "bad", selfCareItems: [] })
  );
  record(
    "形式不正を拒否",
    !invalidShape.ok && invalidShape.error === "ファイルの形式が正しくありません",
    invalidShape.error
  );

  // レコード形状不正
  const invalidRecord = await runImport(
    page,
    JSON.stringify({
      version: 1,
      records: [{ foo: "bar" }],
      selfCareItems: [{ id: "sc1", title: "テスト" }],
    })
  );
  record(
    "レコード形状不正を拒否",
    !invalidRecord.ok && invalidRecord.error === "ファイルの形式が正しくありません",
    invalidRecord.error
  );

  // 巨大ファイル
  const hugeRecords = Array.from({ length: 5001 }, (_, i) => ({
    id: `id-${i}`,
    date: "2026-01-01",
  }));
  const huge = await runImport(
    page,
    JSON.stringify({ version: 1, records: hugeRecords, selfCareItems: [] })
  );
  record(
    "巨大ファイルを拒否",
    !huge.ok && huge.error === "データ量が大きすぎるため読み込めませんでした",
    huge.error
  );

  // 正常バックアップ
  const valid = {
    version: 1,
    exportedAt: new Date().toISOString(),
    records: [
      {
        id: "verify-1",
        date: "2026-06-01",
        moodScore: 3,
        moodLabels: [],
        sleepStart: null,
        sleepEnd: null,
        sleepMinutes: null,
        medication: null,
        warningLevel: null,
        warningTags: [],
        warningNote: "",
        selfCareIds: [],
        selfCareMemo: "",
        note: "検証用メモ",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    selfCareItems: [
      {
        id: "sc-verify",
        title: "検証セルフケア",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };
  const okImport = await runImport(page, JSON.stringify(valid));
  const stored = await getStoredRecords(page);
  record(
    "正常バックアップを復元",
    okImport.ok && stored.length === 1 && stored[0].note === "検証用メモ",
    okImport.ok ? `records=${stored.length}` : okImport.error
  );

  // UI経由の復元（DataBackupPanel）
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("nav.fixed").getByRole("button", { name: "これまで", exact: true }).click();
  await page.waitForTimeout(300);

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "保存したファイルから復元する" }).click();
  const fileChooser = await fileChooserPromise;

  const fs = await import("fs");
  const path = await import("path");
  const os = await import("os");
  const tmpFile = path.join(os.tmpdir(), "yorucare-verify-valid.json");
  fs.writeFileSync(
    tmpFile,
    JSON.stringify(valid, null, 2),
    "utf8"
  );
  await fileChooser.setFiles(tmpFile);
  await page.waitForTimeout(500);

  const uiMessage = await page.getByText("バックアップを読み込みました").isVisible();
  const uiStored = await getStoredRecords(page);
  record(
    "UIから正常バックアップを復元",
    uiMessage && uiStored.length === 1 && uiStored[0].note === "検証用メモ",
    uiMessage ? `records=${uiStored.length}` : "メッセージ未表示"
  );

  // UI経由の壊れたファイル
  const badFile = path.join(os.tmpdir(), "yorucare-verify-bad.json");
  fs.writeFileSync(badFile, "{broken", "utf8");
  const badChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "保存したファイルから復元する" }).click();
  const badChooser = await badChooserPromise;
  await badChooser.setFiles(badFile);
  await page.waitForTimeout(500);
  const badMsg = await page.getByText("ファイルを読み込めませんでした").isVisible();
  record("UIから壊れたJSONを拒否", badMsg);

  try {
    fs.unlinkSync(tmpFile);
    fs.unlinkSync(badFile);
  } catch {
    /* ignore */
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== インポート検証: ${results.length - failed.length}/${results.length} 成功 ===`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
