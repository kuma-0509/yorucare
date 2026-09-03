/**
 * デモ収録用の見本データ。
 * 34日分を入れておき、収録中に本人が1件書いて 35 件にする。
 * 実在の体調・服薬・面談の内容は含めない。
 */
const SELF_CARE = [
  { id: "demo-sc-1", title: "早めに布団に入る" },
  { id: "demo-sc-2", title: "コーヒーをゆっくり飲む" },
  { id: "demo-sc-3", title: "帰宅後に10分横になる" },
  { id: "demo-sc-4", title: "好きな音楽を聴く" },
  { id: "demo-sc-5", title: "予定を減らす" },
];

const MOOD_LABELS = {
  5: [["気分がよい", "ポジティブ"], ["前向き", "ポジティブ"]],
  4: [["穏やか", "ややポジティブ"], ["まあまあ良い", "ややポジティブ"]],
  3: [["ふつう", "普通"], ["落ち着かない", "普通"]],
  2: [["疲れた", "ややネガティブ"], ["気が重い", "ややネガティブ"]],
  1: [["しんどい", "ネガティブ"], ["落ち込みが強い", "ネガティブ"]],
};

const WARNING_TAGS = ["眠れない", "出勤がつらい", "落ち込みが強い", "食欲がない"];

function shiftDate(baseIso, days) {
  const [y, m, d] = baseIso.split("-").map(Number);
  const dt = new Date(y, m - 1, d - days);
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, "0"),
    String(dt.getDate()).padStart(2, "0"),
  ].join("-");
}

/** 収録のたびに同じ絵になるよう、乱数は使わず日付から決める */
function pick(list, n) {
  return list[n % list.length];
}

/**
 * 34日分を作る。ゆっくり持ち直す形にして、月のグラフが読める線になるようにする。
 * 2日だけ空けて、記録がない日があっても続く様子を見せる。
 */
function buildRecords(today) {
  const skip = new Set([12, 25]);
  const records = [];

  for (let offset = 36; offset >= 1; offset -= 1) {
    if (skip.has(offset)) continue;

    // 36日前の2から直近の5へ、波を持たせながら上げる
    const progress = (36 - offset) / 35;
    // 2つの周期を重ね、日ごとの動きと数週間の波の両方を出す。
    // 片方だけだと、線が階段状か、毎日ギザギザのどちらかになる。
    const wave = Math.sin(offset * 0.7) * 0.6 + Math.cos(offset * 0.23) * 0.35;
    const score = Math.min(5, Math.max(1, Math.round(2.4 + progress * 1.8 + wave)));

    const [labelText, category] = pick(MOOD_LABELS[score], offset);
    const date = shiftDate(today, offset);
    const at = `${date}T12:00:00.000Z`;

    // 睡眠は 5.5〜7.8 時間のあいだで動かす
    const sleepMinutes = Math.round(330 + progress * 120 + Math.sin(offset * 1.4) * 45);
    const startHour = 23 + (offset % 2);
    const sleepStart = `${String(startHour % 24).padStart(2, "0")}:${offset % 2 ? "30" : "00"}`;
    const endTotal = (startHour * 60 + (offset % 2 ? 30 : 0) + sleepMinutes) % (24 * 60);
    const sleepEnd = `${String(Math.floor(endTotal / 60)).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`;

    const warningLevel = score <= 2 ? (score === 1 ? "yes" : "small") : "none";
    const warningTags =
      warningLevel === "none" ? [] : [pick(WARNING_TAGS, offset), pick(WARNING_TAGS, offset + 1)];

    const selfCareIds =
      offset % 3 === 0
        ? []
        : [pick(SELF_CARE, offset).id].concat(offset % 5 === 0 ? [pick(SELF_CARE, offset + 2).id] : []);

    records.push({
      id: `demo-${date}`,
      date,
      moodScore: score,
      moodLabels: [{ label: labelText, category, isCustom: false }],
      sleepStart,
      sleepEnd,
      sleepMinutes,
      medication: offset % 7 === 0 ? "partial" : "done",
      warningLevel,
      warningTags: [...new Set(warningTags)],
      warningNote: "",
      selfCareIds,
      selfCareMemo: "",
      selfCareFeeling: selfCareIds.length ? (score >= 3 ? "good" : "neutral") : null,
      note: "",
      tomorrowGoal: "",
      goalReviewStatus: null,
      createdAt: at,
      updatedAt: at,
    });
  }

  return records;
}

function buildSeed(today) {
  const exportedAt = `${today}T12:00:00.000Z`;
  return {
    records: buildRecords(today),
    selfCareItems: SELF_CARE.map((item) => ({
      ...item,
      createdAt: exportedAt,
      updatedAt: exportedAt,
    })),
    returnDate: shiftDate(today, 37),
  };
}

module.exports = { buildSeed };

if (require.main === module) {
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const seed = buildSeed(today);
  console.log("records:", seed.records.length, "returnDate:", seed.returnDate);
  console.log("scores:", seed.records.map((r) => r.moodScore).join(""));
}
