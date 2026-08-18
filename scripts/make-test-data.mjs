/**
 * スマホ実機テスト用の見本データを作る。
 *
 * `docs/smartphone-test-checklist.md` の C-10・F・G-7 は、実施の前に
 * 「昨日の目標」「数日分の記録」「復職日を持たない旧形式のファイル」が要る。
 * 手で作ると人によって中身が変わり、行ごとの母数（F-17）や連続日数（F-7）が
 * 出たり出なかったりするため、同じ内容を毎回作れるようにする。
 *
 * 日付は実行した日を起点に決める。固定日で持つと、数日後には直近7日の
 * 範囲から外れて「これまで」に出なくなるため。
 *
 * Usage:
 *   node scripts/make-test-data.mjs [--out <dir>] [--today YYYY-MM-DD]
 *
 * 出力（アプリの「保存したファイルから復元する」でそのまま読める形式）:
 *   yorucare-testdata.json        現行形式（復職日あり）
 *   yorucare-testdata-legacy.json 旧形式（復職日のフィールドを持たない。G-7 用）
 *
 * 入っているのはテスト用のダミーだけで、実在の体調・服薬・面談の内容は含めない。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** 書き出しの版。`src/lib/schemas.ts` の EXPORT_VERSION と揃える */
const EXPORT_VERSION = 1;

/** 見本の「できること」。`SAMPLE_SELF_CARE` と同じ並びにする */
const SELF_CARE = [
  { id: "sample-selfcare-1", title: "早めに布団に入る" },
  { id: "sample-selfcare-2", title: "コーヒーをゆっくり飲む" },
  { id: "sample-selfcare-3", title: "帰宅後に10分横になる" },
  { id: "sample-selfcare-4", title: "好きな音楽を聴く" },
  { id: "sample-selfcare-5", title: "予定を減らす" },
];

/**
 * 何日前の記録を作るか。4日前を空けて、連続して書けた日を3日にする。
 * 今日のぶんは作らない（実機テストでは本人が書くため）。
 */
const DAY_OFFSETS = [1, 2, 3, 5];

function shiftDate(baseIso, days) {
  const [y, m, d] = baseIso.split("-").map(Number);
  const date = new Date(y, m - 1, d - days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayIso() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function label(text, category) {
  return { label: text, category, isCustom: false };
}

/**
 * 1日前〜5日前のダミー記録。項目ごとに答えた日数を変えてあるので、
 * 週のまとめの母数が行ごとに違う状態（F-17・F-24）をそのまま確かめられる。
 */
function buildRecords(today) {
  const at = (offset) => `${shiftDate(today, offset)}T12:00:00.000Z`;

  return [
    {
      // 1日前: 目標を書いた日。今日の「昨日の目標をふりかえる」（C-10）はここから出る
      offset: 1,
      moodScore: 3,
      moodLabels: [label("穏やか", "普通")],
      sleepStart: "23:30",
      sleepEnd: "07:00",
      sleepMinutes: 450,
      medication: "done",
      warningLevel: "none",
      warningTags: [],
      selfCareIds: ["sample-selfcare-1"],
      selfCareFeeling: "good",
      // 「〜する」で終わる形にしておくと、C-10e の言い換えの案が自然な文になる
      tomorrowGoal: "洗濯する",
      goalReviewStatus: "done",
    },
    {
      offset: 2,
      moodScore: 2,
      moodLabels: [label("疲れた", "ネガティブ")],
      sleepStart: "00:30",
      sleepEnd: "06:15",
      sleepMinutes: 345,
      medication: "partial",
      warningLevel: "small",
      warningTags: ["眠れない", "出勤がつらい"],
      selfCareIds: [],
      selfCareFeeling: null,
      tomorrowGoal: "郵便を出す",
      goalReviewStatus: null,
    },
    {
      // 3日前: 睡眠・お薬・サインを飛ばした日。母数が行ごとに違う状態を作る
      offset: 3,
      moodScore: 4,
      moodLabels: [],
      sleepStart: null,
      sleepEnd: null,
      sleepMinutes: null,
      medication: null,
      warningLevel: null,
      warningTags: [],
      selfCareIds: ["sample-selfcare-3"],
      selfCareFeeling: "neutral",
      tomorrowGoal: "",
      goalReviewStatus: null,
    },
    // 4日前は空ける（続けて書けた日を3日で区切る）
    {
      offset: 5,
      moodScore: 3,
      moodLabels: [label("落ち着かない", "普通")],
      sleepStart: "23:00",
      sleepEnd: "06:30",
      sleepMinutes: 450,
      medication: "done",
      warningLevel: "yes",
      warningTags: ["眠れない", "落ち込みが強い"],
      selfCareIds: ["sample-selfcare-1", "sample-selfcare-2"],
      selfCareFeeling: "good",
      tomorrowGoal: "",
      goalReviewStatus: null,
    },
  ].map((day) => ({
    id: `testdata-${day.offset}`,
    date: shiftDate(today, day.offset),
    moodScore: day.moodScore,
    moodLabels: day.moodLabels,
    sleepStart: day.sleepStart,
    sleepEnd: day.sleepEnd,
    sleepMinutes: day.sleepMinutes,
    medication: day.medication,
    warningLevel: day.warningLevel,
    warningTags: day.warningTags,
    // 自由記述は空のままにする。実機テストでは本人が入れて確かめる項目で、
    // 見本に文章を持たせる必要がない
    warningNote: "",
    selfCareIds: day.selfCareIds,
    selfCareMemo: "",
    selfCareFeeling: day.selfCareFeeling,
    note: "",
    tomorrowGoal: day.tomorrowGoal,
    goalReviewStatus: day.goalReviewStatus,
    createdAt: at(day.offset),
    updatedAt: at(day.offset),
  }));
}

/**
 * 見本データを組み立てる。
 * `legacy` は復職日のフィールドを持たない旧形式で、G-7（取り込みで未設定へ戻る）に使う。
 * 記録は現行形式と同じにしてあるので、旧形式を読ませても記録は消えない。
 */
export function buildTestData(today = todayIso()) {
  const records = buildRecords(today);
  const exportedAt = `${today}T12:00:00.000Z`;
  const current = {
    version: EXPORT_VERSION,
    exportedAt,
    returnDate: shiftDate(today, 10),
    records,
    selfCareItems: SELF_CARE.map((item) => ({
      ...item,
      createdAt: exportedAt,
      updatedAt: exportedAt,
    })),
  };

  const legacy = { ...current };
  delete legacy.returnDate;

  return { today, current, legacy };
}

function parseArgs(argv) {
  const args = { out: process.cwd(), today: todayIso() };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--out") args.out = argv[i + 1] ?? args.out;
    if (argv[i] === "--today") args.today = argv[i + 1] ?? args.today;
  }
  return args;
}

function main() {
  const { out, today } = parseArgs(process.argv.slice(2));
  const { current, legacy } = buildTestData(today);

  mkdirSync(out, { recursive: true });
  const currentPath = join(out, "yorucare-testdata.json");
  const legacyPath = join(out, "yorucare-testdata-legacy.json");
  writeFileSync(currentPath, `${JSON.stringify(current, null, 2)}\n`);
  writeFileSync(legacyPath, `${JSON.stringify(legacy, null, 2)}\n`);

  console.log("スマホ実機テスト用の見本データを作りました。");
  console.log(`  ${currentPath}      現行形式（復職日 ${current.returnDate}）`);
  console.log(`  ${legacyPath} 旧形式（復職日なし・G-7 用）`);
  console.log("");
  console.log(`起点の日付: ${today}`);
  console.log(`記録: ${current.records.map((r) => r.date).join(", ")}`);
  console.log("アプリの「これまで」→「保存したファイルから復元する」で読み込む。");
  console.log("復元は端末の記録を置き換えるため、残したい記録は先にファイルへ保存する。");
}

if (process.argv[1] && process.argv[1].endsWith("make-test-data.mjs")) {
  main();
}
