/** 画面に出す文言の単一基準（言葉の辞典） */
export const COPY = {
  productName: "ヨルケア",
  tab: {
    today: "書く",
    records: "これまで",
    selfCare: "できること",
    reflection: "ふりかえり",
  },
  warningSign: "しんどさのサイン",
  memo: "メモ",
  memoOptional: "メモ（任意）",
  selfCareAction: "できること",
  doneToday: "できたこと",
  doneTodayToday: "今日できたこと",
  medicationNone: "お薬は飲んでいない",
  notEntered: "未記入",
  sleepNotEntered: "まだ入力していません",
  chartWarningDescription: "なし／少しあり／あり の3段階で表示します",
  chartWarningAxis: "しんどさ",
  storageDismiss: "わかりました",
  storageBackupHint:
    "機種変更の前は「これまで」タブから記録をファイルで保存できます。",
  backupPlaintextNotice:
    "バックアップJSONには、気分・睡眠・お薬・メモなどの健康記録に近い内容が平文で含まれます。共有フォルダや他人が見られる場所には置かないでください。",
  importConfirmTitle: "バックアップを復元しますか？",
  importConfirmBody:
    "今の端末にある記録と「できること」は、ファイルの内容に置き換わります。バックアップJSONには健康記録に近い内容が平文で含まれるため、信頼できるファイルだけを読み込んでください。",
} as const;
