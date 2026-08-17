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
  memo: "メモ",
  memoOptional: "メモ（任意）",
  /** セルフケアの登録簿（マスタ）。常にこの語で呼ぶ */
  selfCareAction: "できること",
  /**
   * 本人が「その日は控えたい」と決めて登録しておくこと。
   * 実施の可否は記録せず、思い出すために並べるだけにする。
   * 守れたかどうかを残さないのは、できなかった日を失敗として扱わないため。
   */
  avoid: {
    action: "控えたいこと",
    tabDescription:
      "状態によっては、あとで負担になりやすいことを登録できます。守れたかどうかは記録しません。",
    todayTitle: "今日は控えたいこと",
    todayDescription:
      "自分で登録したものを、今日の状態に合わせて並べています。",
    todayNotice:
      "これは自分で決めた覚え書きです。できたかどうかは記録しません。",
    stateHeading: "どんな日に出しますか？",
    stateDescription: "選ばなければ、状態にかかわらずいつも出します。",
    stateAnytime: "いつでも",
    emptyList: "まだ登録がありません。",
  },
  /** その日に実行したセルフケア。表示はこの1語に統一する */
  doneToday: "できたこと",
  /** 「書く」タブで今日の分を選ぶときの見出し */
  doneTodayToday: "今日できたこと",
  /**
   * 思いつかないまま空欄になりやすいため、対象の幅を先に示す。
   * 特別なことを促す表現にせず、いつもどおりのことも入ると書くだけにとどめる。
   */
  doneTodayDescription:
    "いつもどおりにできたことも入ります。思いつかない日は、選ばなくて構いません。",
  medicationNone: "お薬は飲んでいない",
  /** 翌日に向けた小さな目標・行動実験。達成を評価せず、次の大きさを決める材料として扱う */
  goal: {
    fieldToday: "明日の小さな目標",
    fieldOther: "翌日の小さな目標",
    fieldDescription:
      "すぐ終わる大きさにすると続けやすくなります。書かなくても構いません。",
    fieldPlaceholder: "例：昼休みに5分だけ外に出る",
    reviewToday: "昨日の目標をふりかえる",
    reviewOther: "前日の目標をふりかえる",
    reviewDescription:
      "できていなくても大丈夫です。次の大きさを決めるために使います。",
    helperHeading: "次は、もう少し小さくできそうですか？",
    suggestionHint: "選ぶと、翌日の目標に入ります",
  },
  /** 記録した状態から、その日に選べそうなセルフケア行動へつなぐ入口 */
  selfCareSuggestion: {
    title: "自分メンテ",
    description:
      "今日の状態から、選べそうなことを並べています。選ぶと「できること」に登録され、今日できたこととして残ります。",
    notice:
      "体調を判断したり、治し方を示すものではありません。合わないものは選ばなくて構いません。",
    feelingHeading: "やってみて、どうでしたか？（任意）",
  },
  /** 起点からの積み重ね。連続記録を主役にせず、中断で減らない累計を先に置く */
  accumulation: {
    title: "積み重ね",
    description:
      "書けた日を数えています。空いた日があっても、これまでの記録は減りません。",
    milestoneHeading: "節目",
    nextPrefix: "つぎは",
    notReached: "これから",
    startHeading: "復職日",
    startDescription:
      "積み重ねを数えはじめる日です。設定しなければ、はじめて記録した日から数えます。",
    startEditAction: "復職日を設定する",
    startChangeAction: "復職日を変更する",
    startClearAction: "設定を消す",
    startSaved: "復職日を設定しました。",
    startCleared: "復職日の設定を消しました。はじめて記録した日から数えます。",
    startNotice: "復職日はこの端末にだけ保存され、どこへも送信しません。",
  },
  /**
   * 必要なときに自分で見せるための、お薬の覚え書き。
   * 日々の記録とは別に1つだけ持ち、状態の集計にもグラフにも使わない。
   * 端末の外へ出す手段を持たせない（生成AIなどへ共有する項目にも入れない）。
   */
  medicationNote: {
    title: "お薬メモ",
    triggerLabel: "お薬メモ",
    description:
      "飲んでいるお薬を書いておくと、必要なときにこの画面を開いて見せられます。",
    placeholder:
      "例：（薬の名前）朝1錠 / （薬の名前）就寝前1錠　※処方元：○○クリニック",
    notice:
      "この端末にだけ保存され、どこへも送信しません。記録のまとめや生成AIなどへ共有する内容には入りません。",
    sharedDeviceNotice:
      "他の人も使う端末では、書く内容を必要な範囲にとどめてください。",
    empty: "まだ入力していません。",
    saved: "お薬メモを保存しました。",
    cleared: "お薬メモを消しました。",
    editAction: "編集する",
    medicalNotice:
      "お薬の内容や飲み方については、主治医や薬剤師へご相談ください。",
  },
  notEntered: "まだ入力していません",
  sleepNotEntered: "まだ入力していません",
  chartWarningDescription: "なし／少しあり／あり の3段階で表示します",
  chartWarningAxis: "しんどさ",
  /**
   * 2項目を重ねて見る機能。
   * 目盛りを並べるだけにとどめ、相関の強さや向きは出さない。
   * 一方が他方の原因だと読めてしまう表現を画面に出さないため。
   */
  chartCompare: {
    heading: "重ねて比べる（任意）",
    none: "重ねない",
    axisNotice: "重ねた項目は右の目盛りで読みます。",
    causeNotice:
      "同じ時期に動いて見えても、どちらかがもう一方の原因であるとは限りません。",
  },
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
