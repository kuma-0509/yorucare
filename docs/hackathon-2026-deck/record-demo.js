/**
 * 5枚目のデモ動画を実機の画面から収録する。
 *
 * 流れ（約24秒）:
 *   1 簡単に記録ができる
 *   2 記録した内容をふりかえりで確認できる（35件のグラフ）
 *   3 主治医に相談して、記録内容をカスタマイズできる
 *   4 相談先を区を指定して見つけることができる
 *
 * 見本データは34日分。収録中に1件書いて35件にしてからグラフを出す。
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { buildSeed } = require("./demo-seed");

const BASE = process.env.YORUCARE_URL || "http://localhost:3000";
// 端末ごとに違うため、環境変数で渡せるようにする（未指定なら Playwright の既定）
const CHROME = process.env.CHROME_PATH || undefined;
const OUT = path.join(__dirname, "record-out");

const now = new Date();
const TODAY = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
].join("-");

/** 全体を 20〜25 秒に収めるための間の取り方。個々の間合いの比は変えない */
const SPEED = 0.74;
const wait = (p, ms) => p.waitForTimeout(Math.round(ms * SPEED));

/** 画面の移動は、指で送ったように滑らかにする */
async function smoothTo(page, selectorOrY) {
  if (typeof selectorOrY === "number") {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), selectorOrY);
  } else {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, selectorOrY);
  }
  await wait(page, 900);
}

async function smoothInDialog(page, ratio) {
  await page.evaluate((r) => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
    const target = dialogs
      .flatMap((d) => [d, ...Array.from(d.querySelectorAll("*"))])
      .find((el) => el.scrollHeight > el.clientHeight + 40);
    if (target) target.scrollTo({ top: target.scrollHeight * r, behavior: "smooth" });
  }, ratio);
  await wait(page, 900);
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 882 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    reducedMotion: "no-preference",
    recordVideo: { dir: OUT, size: { width: 430, height: 882 } },
  });

  // Next.js の開発バッジを画面から外す
  await ctx.addInitScript(() => {
    const hide = () => {
      const s = document.createElement("style");
      s.textContent =
        "nextjs-portal,[data-nextjs-dialog-overlay],#__next-build-watcher{display:none!important}";
      document.head && document.head.appendChild(s);
    };
    if (document.head) hide();
    else document.addEventListener("DOMContentLoaded", hide);
  });

  const page = await ctx.newPage();

  // 見本データを入れて、案内・同意のダイアログを出ない状態にしてから始める
  await page.goto(BASE);
  await page.evaluate(
    ([s, iso]) => {
      localStorage.setItem("yorucare_daily_records", JSON.stringify(s.records));
      localStorage.setItem("yorucare_self_care_items", JSON.stringify(s.selfCareItems));
      localStorage.setItem("yorucare_return_date", s.returnDate);
      localStorage.setItem("yorucare_schema_version", "3");
      localStorage.setItem("yorucare_storage_notice_dismissed", "1");
      localStorage.setItem("yorucare_review_consent", "1");
      localStorage.setItem("yorucare_analytics_consent", "denied");
      localStorage.setItem("yorucare_last_backup_at", iso);
      localStorage.removeItem("yorucare_record_form_sections");
    },
    [buildSeed(TODAY), new Date().toISOString()]
  );
  await page.reload();
  await page.waitForLoadState("networkidle");
  await wait(page, 1400);

  // 役割が radio / button と混在するため、要素そのもので指す
  const btn = (re) => page.locator("button").filter({ hasText: re });
  const tab = async (name) => {
    await btn(new RegExp("^" + name + "$")).last().click();
    await wait(page, 1100);
  };
  const menu = async () => {
    await page.getByRole("button", { name: "メニューを開く" }).click();
    await wait(page, 800);
  };

  /* ---------- 1 簡単に記録ができる ---------- */
  await btn(/気分は落ち着いています/).first().click();
  await wait(page, 1100);
  await smoothTo(page, 1200);
  await btn(/^記録を保存する$/).first().click();
  await wait(page, 1900);

  // 保存後の案内を閉じる
  const close = btn(/^閉じる$/).first();
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await wait(page, 900);
  }

  /* ---------- 2 ふりかえりで確認する（35件のグラフ） ---------- */
  await tab("ふりかえり");
  await smoothTo(page, 2100);
  await wait(page, 500);
  await btn(/^月$/).first().click();
  await wait(page, 1900);
  await smoothTo(page, 2400);
  await wait(page, 1400);

  /* ---------- 3 記録項目をカスタマイズする ---------- */
  await tab("書く");
  await menu();
  await btn(/カスタム入力/).first().click();
  await wait(page, 1100);
  await btn(/くわしく書く/).first().click();
  await wait(page, 700);
  await btn(/しんどさのサイン/).first().click();
  await wait(page, 900);
  await page.keyboard.press("Escape");
  await wait(page, 1000);
  await smoothTo(page, 900);
  await wait(page, 1200);

  /* ---------- 4 相談先を区から見つける ---------- */
  await smoothTo(page, 0);
  await menu();
  await btn(/相談先/).first().click();
  await wait(page, 1200);
  await smoothInDialog(page, 0.55);
  const select = page.locator('[role="dialog"] select').first();
  await select.selectOption({ label: "江東区" });
  await wait(page, 1600);
  await smoothInDialog(page, 0.72);
  await wait(page, 2200);

  await page.close();
  await ctx.close();
  await browser.close();

  // 書き出し: 先頭の読み込み表示を落とし、2倍へ拡大して mp4 にする
  const { execFileSync } = require("child_process");
  const webm = path.join(OUT, fs.readdirSync(OUT).find((f) => f.endsWith(".webm")));
  const assets = path.join(__dirname, "assets");
  fs.mkdirSync(assets, { recursive: true });
  const mp4 = path.join(assets, "demo.mp4");
  const poster = path.join(assets, "demo_poster.jpg");

  execFileSync("ffmpeg", ["-v", "error", "-ss", "0.75", "-i", webm,
    "-vf", "scale=860:1764:flags=lanczos", "-c:v", "libx264", "-preset", "slow",
    "-crf", "23", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", mp4, "-y"]);
  // ポスターは PDF 配布時に残る絵。記録画面を選ぶ
  execFileSync("ffmpeg", ["-v", "error", "-ss", "2.6", "-i", mp4,
    "-frames:v", "1", "-q:v", "2", poster, "-y"]);

  console.log("wrote", mp4, "and", poster);
})();
