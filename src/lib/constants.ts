import type { MedicationStatus, MoodScore, WarningLevel } from "./types";

export const MOOD_OPTIONS: { score: MoodScore; label: string }[] = [
  { score: 1, label: "かなりしんどい" },
  { score: 2, label: "少ししんどい" },
  { score: 3, label: "ふつう" },
  { score: 4, label: "まあまあ良い" },
  { score: 5, label: "かなり良い" },
];

export const MOOD_LABEL_POSITIVE = [
  "満足",
  "感謝",
  "嬉しい",
  "ワクワク",
  "好き",
  "楽しい",
  "スッキリ",
  "安心",
] as const;

export const MOOD_LABEL_NEUTRAL = [
  "普通",
  "穏やか",
  "ドキドキ",
  "モヤモヤ",
  "退屈",
  "緊張",
  "ぼんやり",
  "落ち着かない",
] as const;

export const MOOD_LABEL_NEGATIVE = [
  "不安",
  "悲しい",
  "疲れた",
  "後悔",
  "恐れる",
  "イライラ",
  "怒り",
  "嫌い",
] as const;

export const MEDICATION_OPTIONS: {
  value: MedicationStatus;
  label: string;
}[] = [
  { value: "done", label: "できた" },
  { value: "partial", label: "一部できた" },
  { value: "forgot", label: "忘れた" },
  { value: "none", label: "該当なし" },
];

export const WARNING_LEVEL_OPTIONS: {
  value: WarningLevel;
  label: string;
}[] = [
  { value: "none", label: "なし" },
  { value: "small", label: "少しあり" },
  { value: "yes", label: "あり" },
];

export const WARNING_TAGS_SLEEP = [
  "眠れない",
  "朝起きづらい",
  "生活リズムが崩れた",
  "食欲がない",
  "疲れが抜けない",
] as const;

export const WARNING_TAGS_MOOD = [
  "強い不安",
  "イライラが強い",
  "涙が出る",
  "落ち込みが強い",
  "気持ちが焦る",
] as const;

export const WARNING_TAGS_WORK = [
  "出勤がつらい",
  "人と話すのがつらい",
  "仕事中に集中しづらい",
  "帰宅後に動けない",
  "予定をこなせない",
] as const;

export const WARNING_TAGS_OTHER = ["その他"] as const;

export const SAMPLE_SELF_CARE = [
  "早めに布団に入る",
  "コーヒーをゆっくり飲む",
  "帰宅後に10分横になる",
  "好きな音楽を聴く",
  "予定を減らす",
];

export const STORAGE_KEYS = {
  records: "yorucare_daily_records",
  selfCare: "yorucare_self_care_items",
  storageNoticeDismissed: "yorucare_storage_notice_dismissed",
} as const;

/** 利用者向けふりかえりタブに表示する予定機能（短く） */
export const REFLECTION_USER_FEATURES = [
  "1週間の記録から、今週のまとめを見る",
  "面談や通院前に、伝えたいことを整理する",
];

/** 開発・Phase 2 向けの詳細リスト（UIには出さない） */
export const REFLECTION_FUTURE_FEATURES = [
  "週次サマリー",
  "グループワーク文字起こし取り込み",
  "自分の発言抽出",
  "来週の目標作成",
  "月次サマリー",
  "主治医・支援者向け相談文生成",
];
