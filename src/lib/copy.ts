/** 画面に出す文言の単一基準（言葉の辞典）
 *
 * ルール:
 * - 画面に出す文言は必ずここを参照し、コンポーネントへ直書きしない。
 * - 技術用語（localStorage / JSON / 平文 など）は当事者向け画面に出さない。
 * - 同義語は1語に決める（呼称・未入力系・動詞形「〜する」）。
 */
export const COPY = {
  productName: "ヨルケア",
  tagline: "毎日1〜2分、自分の状態を残すセルフケア記録",
  tab: {
    today: "書く",
    records: "これまで",
    selfCare: "できること",
    reflection: "ふりかえり",
  },
  warningSign: "しんどさのサイン",
  /** 記録の入口。3段階を選ぶだけで保存でき、あとの項目は選択に応じて出す */
  entry: {
    questionToday: "今日の調子はどうですか？",
    questionPast: "その日の調子はどうでしたか？",
    headerHint: "まず調子を選ぶところからで大丈夫です。ほかの項目は任意です。",
    hint: "近いものを1つ選んでください。これだけでも保存できます。",
    beforeSelect: "選ぶと、そのときに合う項目だけが表示されます。",
    conditionLegend: "調子",
    scaleOpen: "5段階でくわしく選ぶ",
    scaleClose: "3段階だけにする",
    scaleLegend: "総合気分（5段階）",
    warningDescriptionOpen:
      "いま気になっているものがあれば選んでください。なければ選ばなくて構いません。",
    otherTitle: "ほかの項目も書く（任意）",
    otherDescription: "気持ち・睡眠・お薬・しんどさのサイン・メモ",
    otherDescriptionWithoutWarning: "気持ち・睡眠・お薬・メモ",
  },
  memo: "メモ",
  memoOptional: "メモ（任意）",
  /** セルフケアの登録簿（マスタ）。常にこの語で呼ぶ */
  selfCareAction: "できること",
  /** その日に実行したセルフケア。表示はこの1語に統一する */
  doneToday: "できたこと",
  /** 「書く」タブで今日の分を選ぶときの見出し */
  doneTodayToday: "今日できたこと",
  medicationNone: "お薬は飲んでいない",
  notEntered: "まだ入力していません",
  sleepNotEntered: "まだ入力していません",
  chartWarningDescription: "なし／少しあり／あり の3段階で表示します",
  chartWarningAxis: "しんどさ",
  // 動作ボタンは「〜する」で統一
  add: "追加する",
  delete: "削除する",
  cancel: "キャンセル",
  save: "保存する",
  // 端末保存・バックアップ（技術用語を出さない）
  storageDismiss: "わかりました",
  storageDeviceOnly:
    "記録はこの端末にだけ保存されます。別のスマホや別のブラウザでは見えません。",
  storageMayBeLost:
    "ファイルに保存していないと、ブラウザのデータが消えたときに記録も消えることがあります。",
  storageBackupHint:
    "機種変更の前は「これまで」タブから記録をファイルに保存できます。",
  backupReminderTitle: "記録をファイルに保存しておきましょう",
  backupReminderBody:
    "しばらくファイルに保存していません。万が一に備えて、今の記録をファイルに残しておくと安心です。",
  backupReminderAction: "記録をファイルに保存する",
  backupReminderSnooze: "あとで",
  backupPlaintextNotice:
    "保存したファイルには、気分・睡眠・お薬・メモなど、体調に関わる内容がそのまま読める形で入っています。他の人が見られる場所には置かないでください。",
  analyticsConsentTitle: "匿名の利用状況の送信",
  analyticsConsentBody:
    "記録の保存や画面の移動など、個人を特定しない利用状況だけを改善のために送信できます。気分・睡眠・お薬・メモなど、入力した内容は送りません。協力は任意で、あとから停止できます。",
  analyticsConsentOption: "匿名の利用状況の送信に協力する（任意）",
  analyticsEnabled: "匿名の利用状況を送信しています",
  analyticsDisabled: "匿名の利用状況は送信していません",
  analyticsEnableAction: "送信に協力する",
  analyticsDisableAction: "送信を停止してデータを削除する",
  analyticsRetryDeleteAction: "保存済みデータの削除を再試行する",
  importConfirmTitle: "バックアップを復元しますか？",
  importConfirmBody:
    "今の端末にある記録と「できること」は、ファイルの内容に置き換わります。保存したファイルには体調に関わる内容がそのまま読める形で入っているため、信頼できるファイルだけを読み込んでください。",
  // 共有端末で使い終わったあとの全削除
  deleteAllTitle: "すべての記録を削除",
  deleteAllSharedDeviceHeading: "共有端末で使い終わったら",
  deleteAllSharedDeviceBody:
    "この端末に保存されたヨルケアの記録だけを消します。「できること」の登録や、他のアプリのデータは消えません。",
  deleteAllConfirmBody:
    "この端末に保存された記録をすべて消しますか？この操作は元に戻せません。",
  deleteAllConfirmNote:
    "消えるのは、この端末に保存されたヨルケアの記録だけです。",
  // 記録後の締めくくり（演出選択）。義務感を出さず、毎回選び直せる
  completion: {
    prompt: "今日の記録を、どうしまっておきますか？",
    hint: "どれを選んでも、記録は消えません。",
    shelf: "書庫にしまう",
    shelfDesc: "今日の記録を大切に保管する",
    paper: "紙にして手放す",
    paperDesc: "今日のモヤモヤを外に出して区切る",
    skip: "今日はそのまま",
    skipDesc: "演出なしで終える",
    skipAction: "このまま終える",
    shelfDone: "今日の記録を書庫にしまいました",
    paperDone: "今日のモヤモヤを手放しました",
    skipDone: "おつかれさまでした。また明日。",
    burnDone: "今週のモヤモヤを手放しました",
    // 「整える」全画面演出の完了文言（静かで自然に）
    flowTitle: "少し、整いました",
    flowSubtitle: "今日の記録をしまいました。また明日、見にきてください。",
    // 「書庫にしまう」演出の完了文言
    bookDone: "今日の記録を、書庫にしまいました",
    bookDoneSub: "必要なときに、また静かに開けます。",
  },
} as const;
