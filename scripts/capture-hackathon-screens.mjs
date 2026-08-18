/**
 * 都知事杯オープンデータ・ハッカソン2026 提出用の画面キャプチャ（1600×900）。
 *
 * Usage: node scripts/capture-hackathon-screens.mjs [baseUrl]
 *
 * 注意: 投入するのは架空のダミー記録だけ。実在の健康・服薬情報は使わない
 * （docs/phase2-plan.md 3.3節）。
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const OUT_DIR = path.resolve(
  import.meta.dirname,
  "../outputs/hackathon2026",
);
const VIEWPORT = { width: 1600, height: 900 };
/** 環境に用意された Chromium を使う（ダウンロードを避けるため） */
const EXECUTABLE_PATH = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";

const STORAGE_KEYS = {
  records: "yorucare_daily_records",
  selfCare: "yorucare_self_care_items",
  storageNoticeDismissed: "yorucare_storage_notice_dismissed",
  schemaVersion: "yorucare_schema_version",
  returnDate: "yorucare_return_date",
  lastBackupAt: "yorucare_last_backup_at",
};

/** 架空のセルフケア項目 */
const SELF_CARE = [
  "早めに布団に入る",
  "帰宅後に10分横になる",
  "好きな音楽を聴く",
  "予定を減らす",
].map((title, i) => ({
  id: `demo-care-${i + 1}`,
  title,
  createdAt: "2026-07-01T09:00:00.000Z",
  updatedAt: "2026-07-01T09:00:00.000Z",
}));

/** 波のある14日ぶんの架空の記録。書けなかった日をわざと2日あける */
const PATTERN = [
  { mood: 3, labels: ["ふつう"], start: "24:10", end: "07:00", warn: "none", tags: [], care: [0] },
  { mood: 2, labels: ["疲れた"], start: "25:20", end: "07:10", warn: "small", tags: ["朝起きづらい"], care: [1] },
  { mood: 2, labels: ["不安", "疲れた"], start: "25:40", end: "06:50", warn: "yes", tags: ["眠れない", "帰宅後に動けない"], care: [1, 3] },
  null,
  { mood: 3, labels: ["穏やか"], start: "23:50", end: "07:00", warn: "small", tags: ["疲れが抜けない"], care: [0, 2] },
  { mood: 4, labels: ["スッキリ"], start: "23:20", end: "06:40", warn: "none", tags: [], care: [0, 2] },
  { mood: 3, labels: ["ふつう"], start: "24:00", end: "07:00", warn: "none", tags: [], care: [2] },
  { mood: 2, labels: ["モヤモヤ"], start: "25:10", end: "07:20", warn: "small", tags: ["生活リズムが崩れた"], care: [3] },
  null,
  { mood: 3, labels: ["落ち着かない"], start: "24:30", end: "06:50", warn: "small", tags: ["強い不安"], care: [1] },
  { mood: 4, labels: ["安心"], start: "23:30", end: "06:50", warn: "none", tags: [], care: [0, 1] },
  { mood: 4, labels: ["楽しい"], start: "23:10", end: "06:40", warn: "none", tags: [], care: [0, 2] },
  { mood: 3, labels: ["ふつう"], start: "23:55", end: "07:00", warn: "none", tags: [], care: [0] },
  { mood: 3, labels: ["穏やか"], start: "23:40", end: "06:45", warn: "small", tags: ["疲れが抜けない"], care: [0, 3] },
];

const GOALS = [
  "昼休みに5分だけ外に出る",
  "22時にスマホを充電器へ置く",
  "帰ったらまず座って一息つく",
];

function toDateString(offsetFromToday) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetFromToday);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "25:20" のような就寝時刻を 24時間表記へ直しつつ睡眠時間を出す */
function sleepMinutesOf(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em + 24 * 60 - (sh * 60 + sm)) % (24 * 60);
}

function normalizeTime(value) {
  const [h, m] = value.split(":").map(Number);
  return `${String(h % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildRecords() {
  const records = [];
  PATTERN.forEach((day, i) => {
    if (!day) return;
    // 末尾が「今日」になるよう、後ろから並べる
    const date = toDateString(i - (PATTERN.length - 1));
    const stamp = `${date}T21:30:00.000Z`;
    records.push({
      id: `demo-${date}`,
      date,
      moodScore: day.mood,
      moodLabels: day.labels,
      sleepStart: normalizeTime(day.start),
      sleepEnd: day.end,
      sleepMinutes: sleepMinutesOf(day.start, day.end),
      medication: "done",
      warningLevel: day.warn,
      warningTags: day.tags,
      warningNote: "",
      selfCareIds: day.care.map((n) => SELF_CARE[n].id),
      selfCareMemo: "",
      selfCareFeeling: day.care.length > 0 ? "good" : null,
      note: "",
      tomorrowGoal: GOALS[i % GOALS.length],
      goalReviewStatus: i % 3 === 0 ? "done" : i % 3 === 1 ? "partial" : null,
      createdAt: stamp,
      updatedAt: stamp,
    });
  });
  return records;
}

async function seed(page) {
  const records = buildRecords();
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([keys, recordsJson, selfCareJson, returnDate]) => {
      localStorage.setItem(keys.records, recordsJson);
      localStorage.setItem(keys.selfCare, selfCareJson);
      localStorage.setItem(keys.schemaVersion, "3");
      localStorage.setItem(keys.storageNoticeDismissed, "1");
      localStorage.setItem(keys.returnDate, returnDate);
      localStorage.setItem(keys.lastBackupAt, new Date().toISOString());
    },
    [
      STORAGE_KEYS,
      JSON.stringify(records),
      JSON.stringify(SELF_CARE),
      toDateString(-120),
    ],
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await dismissDialogs(page);
}

/**
 * 開いたダイアログを閉じる。
 * Radix の Dialog は背後を aria-hidden にするため、開いたままだとタブのボタンを役割で探せない。
 */
async function dismissDialogs(page) {
  for (let i = 0; i < 3; i += 1) {
    const dialog = page.locator('[role="dialog"]');
    if ((await dialog.count()) === 0) return;
    const ack = dialog.getByRole("button", { name: "わかりました" });
    if ((await ack.count()) > 0) {
      await ack.first().click();
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(500);
  }
}

async function tab(page, name) {
  await dismissDialogs(page);
  await page
    .locator("nav.fixed")
    .getByRole("button", { name, exact: true })
    .click();
  await page.waitForTimeout(900);
}

/** アプリはスマートフォン前提の幅なので、実機に近い縦画面で撮る */
const PHONE = { width: 430, height: 932 };

async function shootPhone(page, name, { scrollTo = 0 } = {}) {
  await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
  await page.waitForTimeout(600);
  const file = path.join(OUT_DIR, "phone", `${name}.png`);
  await page.screenshot({ path: file });
  console.log("phone shot:", file);
  return file;
}

function dataUri(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
}

/**
 * スマホ画面を並べた 1600×900 の提出用キャプチャを組む。
 * 見出しと短い説明だけを添え、数値や効果の主張は書かない。
 */
async function composeSheet(sheetContext, { file, title, lead, shots }) {
  const cards = shots
    .map(
      (shot) => `
      <figure class="card">
        <div class="phone"><img src="${dataUri(shot.file)}" alt="" /></div>
        <figcaption>
          <p class="cap-title">${shot.title}</p>
          <p class="cap-note">${shot.note}</p>
        </figcaption>
      </figure>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1600px; height: 900px; overflow: hidden;
    font-family: "Noto Sans JP", "IPAGothic", sans-serif;
    background: radial-gradient(1200px 700px at 12% -10%, #252d5c 0%, #111736 45%, #0b1026 100%);
    color: #e2e8f0;
    display: flex; flex-direction: column;
    padding: 44px 56px 40px;
  }
  header { flex: 0 0 auto; }
  .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .mark {
    width: 40px; height: 40px; border-radius: 999px;
    background: linear-gradient(135deg, #6366f1, #252d5c);
    display: grid; place-items: center;
    color: #fde68a; font-weight: 900; font-size: 20px;
  }
  .brand-name { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: .04em; }
  h1 { font-size: 38px; font-weight: 900; color: #fff; line-height: 1.25; }
  .lead { margin-top: 10px; font-size: 17px; color: #a5b4fc; line-height: 1.6; }
  .row { flex: 1 1 auto; display: flex; gap: 34px; align-items: flex-end; justify-content: center; padding-top: 22px; }
  .card { display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .phone {
    width: 258px; height: 559px; border-radius: 26px; overflow: hidden;
    border: 3px solid rgba(255,255,255,.16);
    box-shadow: 0 26px 60px rgba(0,0,0,.55);
    background: #fff;
  }
  .phone img { width: 100%; display: block; }
  figcaption { text-align: center; max-width: 280px; }
  .cap-title { font-size: 17px; font-weight: 700; color: #fde68a; }
  .cap-note { margin-top: 5px; font-size: 13px; color: #94a3b8; line-height: 1.55; }
</style></head><body>
  <header>
    <div class="brand"><span class="mark">夜</span><span class="brand-name">ヨルケア</span></div>
    <h1>${title}</h1>
    <p class="lead">${lead}</p>
  </header>
  <div class="row">${cards}</div>
</body></html>`;

  const page = await sheetContext.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForTimeout(400);
  const target = path.join(OUT_DIR, file);
  await page.screenshot({ path: target });
  await page.close();
  console.log("wrote", target);
}

async function main() {
  fs.mkdirSync(path.join(OUT_DIR, "phone"), { recursive: true });
  const browser = await chromium.launch(
    fs.existsSync(EXECUTABLE_PATH) ? { executablePath: EXECUTABLE_PATH } : {},
  );
  const context = await browser.newContext({
    viewport: PHONE,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "ja-JP",
  });
  const page = await context.newPage();

  await seed(page);

  await tab(page, "書く");
  const todayTop = await shootPhone(page, "today-top");
  const todayCare = await shootPhone(page, "today-selfcare", { scrollTo: 1150 });

  await tab(page, "ふりかえり");
  const reflectionTop = await shootPhone(page, "reflection-top");
  const reflectionWeek = await shootPhone(page, "reflection-week", { scrollTo: 900 });

  await tab(page, "これまで");
  const records = await shootPhone(page, "records");

  // 相談導線（全タブ共通のヘッダーから開く）
  await page.getByRole("button", { name: "相談先" }).first().click();
  await page.waitForTimeout(800);
  const consultation = await shootPhone(page, "consultation");

  // 提出要件は1600×900。端末の倍率を持ち込まないよう、等倍のコンテキストで組む
  const sheetContext = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
    locale: "ja-JP",
  });

  await composeSheet(sheetContext, {
    file: "capture-1.png",
    title: "夜と休日のセルフケアを、1日1〜2分で残す",
    lead: "しんどい日ほど短く終わる入力設計。書けなかった日を、失敗として扱わない。",
    shots: [
      { file: todayTop, title: "3段階の入口", note: "「よい・ふつう・しんどい」を選ぶと、続く質問が必要な分だけに絞られます。" },
      { file: todayCare, title: "自分メンテ", note: "記録した状態から、いま選べそうなセルフケア案を定型ルールだけで並べます。" },
      { file: records, title: "これまで", note: "書けた日の記録を一覧で見返せます。記録は端末の中だけに残ります。" },
    ],
  });

  await composeSheet(sheetContext, {
    file: "capture-2.png",
    title: "溜めた記録が、伝えるための材料になる",
    lead: "1週間を日数でまとめ、月1回の面談や診察で「最近どうですか」に答えられる形にします。",
    shots: [
      { file: reflectionTop, title: "積み重ね", note: "中断しても減らない累計を先に置き、いま続いている日数は強調しません。" },
      { file: reflectionWeek, title: "週のまとめ", note: "割合ではなく日数で示し、母数を必ず添えます。評価語と助言は出しません。" },
      { file: consultation, title: "相談導線", note: "どの画面からも一手で相談先へ。記録は送らず、本人の操作だけで開きます。" },
    ],
  });

  await composeSheet(sheetContext, {
    file: "capture-3.png",
    title: "支援が届かない時間に、一人でも続けられる形へ",
    lead: "医療・福祉の代わりではなく、平日夜間と土日祝の空白を補うセルフケア記録です。",
    shots: [
      { file: todayTop, title: "書く", note: "毎日1〜2分。抜けた日があっても、また書ける日に戻れます。" },
      { file: reflectionTop, title: "ふりかえり", note: "記録を重ねた分だけ、自分の体調の波が見えてきます。" },
      { file: consultation, title: "相談先", note: "オープンデータで、地域の窓口まで案内できる形へ広げます。" },
    ],
  });

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
