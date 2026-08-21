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
  reflection: {
    description: "記録を重ねた分だけ、自分の体調の波が見えてきます。",
    futureTitle: "これから追加予定",
    futureDescription:
      "ふりかえりを、面談や通院前の準備にも使えるようにしていきます。",
  },
  warningSign: "しんどさのサイン",
  /** 「くわしく書く」の折りたたみ。カスタム入力の項目名にも同じ語を使う */
  detailSection: "くわしく書く（任意）",
  /** 記録画面でいつも表示する睡眠の入力 */
  sleep: {
    title: "睡眠",
    description: "おおよその時間で構いません。書ける範囲で入力してください。",
    startLabel: "寝た時間",
    endLabel: "起きた時間",
    durationLabel: "睡眠時間",
  },
  /** 全タブ共通ヘッダーのメニュー。相談先と設定への入口をまとめる */
  menu: {
    open: "メニューを開く",
    title: "メニュー",
    description: "相談先と、記録画面に出す項目の設定を開けます。",
    consultation: "相談先",
    consultationDescription: "電話や公式の相談窓口を開けます",
    customInput: "カスタム入力",
    customInputDescription: "記録画面に出す項目を選べます",
  },
  /** 記録画面に出す項目の設定。端末内にだけ残し、記録そのものは変えない */
  customInput: {
    title: "カスタム入力",
    description:
      "記録画面に出す項目を選べます。日付・気分・睡眠・メモはいつも表示されます。",
    legend: "記録画面に出す項目",
    notice:
      "表示を消しても、これまでに残した記録は消えません。もう一度表示にすれば、また見られます。",
    deviceOnly: "この設定はこの端末にだけ保存され、どこへも送信しません。",
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
   * 期間の報告書。数値はアプリが確定させ、文章の穴だけを LLM が埋める。
   * 載せる項目は `docs/sharing-decision.md` 5節の初期版に合わせる。
   */
  report: {
    title: "期間の報告書",
    description:
      "記録した数を並べたものです。お薬、しんどさのサイン、メモ、できることの名前は含みません。",
    sectionPeriod: "対象期間",
    sectionMood: "状態の推移",
    sectionSleep: "睡眠時間の推移",
    sectionSelfCare: "できたことがあった日",
    factRecordedDays: "記録した日数",
    factMoodAverage: "気分の平均",
    factMoodRange: "気分の幅",
    factSleepAverage: "睡眠時間の平均",
    factSleepDeviation: "日による差",
    factSelfCareDays: "できたことがあった日数",
    // 文章の穴に入れてよい文の全体。LLM はこの中から1つ選ぶだけで、文は書かない。
    // 先頭が既定で、選ばれなかったときはこれになる。
    // 追加するときは評価語・助言・診断・数を入れない（report.test.ts で固定）。
    narrativeOverview: [
      "この期間に残った記録を、下に並べています。",
      "この期間の記録から、数えられるぶんだけを並べています。",
      "下の数は、この期間に残っていた記録から数えたものです。",
    ],
    narrativeMood: [
      "気分の数値は、記録した日の平均です。",
      "気分の数値は、記録した日のぶんだけを平均しています。",
      "気分の数値には、記録した日数を母数として添えています。",
    ],
    narrativeSleep: [
      "睡眠時間は、記録した日の平均です。",
      "睡眠時間は、記録した日のぶんだけを平均しています。",
      "睡眠時間の数値には、記録した日数を母数として添えています。",
    ],
    narrativeSelfCare: [
      "できたことがあった日を数えています。",
      "できたことがあった日数は、記録した日を母数にしています。",
      "できたことの名前は数えず、あった日だけを数えています。",
    ],
    emptyHeadline:
      "この期間の記録はまだありません。書けそうなときに、1日分からで大丈夫です。",
    notice:
      "記録した内容をそのまま数えたものです。診断や治療の判断には使えません。",
    copyAction: "報告書をコピー",
    copied: "報告書をコピーしました。渡す相手はご自身で選べます。",
    copyFailed: "コピーできませんでした。",
  },
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
    // 「書庫にしまう」演出の終わりと、完了後のカードで同じ一文を使う
    shelfDoneSub: "必要なときに、また静かに開けます。",
    paperDone: "今日のモヤモヤを手放しました",
    skipDone: "おつかれさまでした。また明日。",
    burnDone: "今週のモヤモヤを手放しました",
    // 演出中に出す案内。急かさず、押さなくてもよいことが分かる言い方にする
    shelfRunning: "書庫にしまっています",
    // 演出の音の切り替え。押すとどうなるかを label にする（いまの状態ではなく操作を書く）
    soundEnable: "音を出す",
    soundDisable: "音を消す",
    // 完了後の案内。次にできることを並べるだけで、次の行動をすすめない
    doneGuide: "このあとは、これまでの記録を見る・今日の記録を書き直す・閉じる、から選べます。",
    // 「整える」全画面演出の完了文言（静かで自然に）
    flowTitle: "少し、整いました",
    flowSubtitle: "今日の記録をしまいました。また明日、見にきてください。",
    // まとめて手放す導線。枚数は前後の語で挟んで組み立てる
    burnCountPrefix: "紙が",
    burnCountSuffix: "枚たまっています",
    burnBannerHint: "まとめて手放すことができます",
    burnBannerAction: "手放す",
    burnReadyLead: "今週分のモヤモヤを、まとめて手放しませんか。",
    burnReadyKeep: "記録はそのまま残ります。",
    burnReadyAction: "今週のモヤモヤを手放す",
    burnReadyNote: "記録は消えません。演出上だけ手放します。",
    skipDuringEffect: "スキップ",
  },
} as const;
