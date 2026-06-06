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
  importConfirmTitle: "バックアップを復元しますか？",
  importConfirmBody:
    "今の端末にある記録と「できること」は、ファイルの内容に置き換わります。復元の前に、今の記録をファイルで保存しておくことをおすすめします。",
} as const;
