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
    selfCare: "セルフケア",
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
  /** 「できること」を記録画面から選ぶには、カスタム入力で表示にしておく必要がある */
  selfCareActionHint:
    "登録したものは、カスタム入力で「できたこと」を表示にすると、記録画面から選べます。",
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
  /** 「これまで」の直近7日を表形式で見るときの見出し・案内 */
  recordsList: {
    description: "直近7日の記録です。1週間以内ならあとから直せます。",
    scrollHint: "表は左右に動かせます。",
    emptyGuide:
      "書けていない日は空欄です。気分だけでも、あとから残せます。",
    caption: "直近7日の記録一覧",
    date: "日付",
    mood: "気分",
    moodLabels: "気持ち",
    medication: "お薬",
    emptyCell: "—",
    addRecord: "この日の記録をつける",
    viewDetail: "詳しく見る",
    edit: "編集する",
  },
  /** セルフケアの登録簿（マスタ）。常にこの語で呼ぶ */
  selfCareAction: "できること",
  /** その日に実行したセルフケア。表示はこの1語に統一する */
  doneToday: "できたこと",
  /** 「書く」タブで今日の分を選ぶときの見出し */
  doneTodayToday: "今日できたこと",
  /** あえて実行しないと決めた項目の登録簿 */
  notToDoAction: "やらないこと",
  /** 「書く」タブで今日の分を選ぶときの見出し */
  notToDoToday: "今日やらないこと",
  /** 第3ペインの説明 */
  selfCareTabDescription:
    "自分に合う「できること」と、負担を減らすための「やらないこと」を登録できます。",
  medicationNone: "お薬は飲んでいない",
  /** 翌日に向けた小さな目標・行動実験。達成を評価せず、次の大きさを決める材料として扱う */
  goal: {
    /** カスタム入力に並べる項目名。カードの見出しは日付で変わるため、名前だけを1語で持つ */
    sectionName: "小さな目標",
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
   * 記録画面の見出し上。{n} は復職日を1日目とする序数。
   * 復職日が未設定、または対象日が復職日前なら出さない。
   */
  returnAfterWork: {
    label: "復職後{n}日目",
  },
  /**
   * 生成AIなどへの端末内テキスト共有。{n} は一度に出せる日数の上限。
   * サーバー送信や対人共有リンクの説明には使わない。
   */
  aiShare: {
    periodLimitHint: "一度に共有できる期間は{n}日間までです。",
    periodLimitError: "共有できる期間は{n}日間までです。",
    saveCsv: "CSVファイルを保存",
    savedCsv:
      "CSVファイルを保存しました。不要になったファイルは端末から削除してください。",
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
    "今の端末にある記録・「できること」・「やらないこと」は、ファイルの内容に置き換わります。保存したファイルには体調に関わる内容がそのまま読める形で入っているため、信頼できるファイルだけを読み込んでください。",
  // 共有端末で使い終わったあとの全削除
  deleteAllTitle: "すべての記録を削除",
  deleteAllSharedDeviceHeading: "共有端末で使い終わったら",
  deleteAllSharedDeviceBody:
    "この端末に保存されたヨルケアの記録だけを消します。「できること」「やらないこと」の登録や、他のアプリのデータは消えません。",
  deleteAllConfirmBody:
    "この端末に保存された記録をすべて消しますか？この操作は元に戻せません。",
  deleteAllConfirmNote:
    "消えるのは、この端末に保存されたヨルケアの記録だけです。",
  /**
   * クラウド保存。入口は既定で閉じており、フラグが有効なときだけ画面に出る。
   * 説明の中身は `docs/account-cloud-storage-decision.md` 3節・4節・8節が基準。
   */
  cloudBackup: {
    title: "クラウドに預ける",
    description:
      "機種変更や、ブラウザのデータを消したときに記録が戻せるよう、この端末の記録の控えをクラウドに預けられます。",
    // 有効化前に示す短い要約
    summaryHeading: "預ける前に知っておいてほしいこと",
    summary: [
      "預けるのは、記録・「できること」・「やらないこと」・復職日の設定だけです。",
      "保存先はシンガポールにあるサーバーです。中身は鍵をかけた状態で預かります。",
      "運営者が中身を読むことはありません。読めるのは、ログインしたあなただけです。",
      "あなたが消すまで預かります。自動で消えることはありません。",
      "いつでもやめられます。やめるときにクラウド上の控えも消せます。",
    ],
    detailsLabel: "くわしく",
    details: [
      {
        heading: "預けるもの",
        body: "記録、「できること」、「やらないこと」、復職日の設定です。匿名の利用状況、画面の設定、外部のAIへ渡した文章は預けません。",
      },
      {
        heading: "預ける場所",
        body: "シンガポールにあるサーバーに預けます。預ける前にこの端末で鍵をかけるため、サーバーの中身を直接見ても記録は読めません。",
      },
      {
        heading: "見られる人",
        body: "ログインしたあなただけです。運営者が記録を一覧で見る画面や仕組みは作っていません。",
      },
      {
        heading: "預かる期間",
        body: "あなたが消すまで預かります。使っていないからといって自動で消すことはしません。検証が終わる日には、運営者がクラウド上の控えをすべて消します。",
      },
      {
        heading: "消し方",
        body: "「クラウド保存をやめる」から、クラウド上の控えを消せます。消しても、この端末の記録はそのまま残ります。",
      },
      {
        heading: "やめ方",
        body: "「クラウド保存をやめる」を押すと、それ以降は預けなくなります。もう一度始めることもできます。",
      },
      {
        heading: "消したあとに残るもの",
        body: "障害に備えた控えの中に、鍵のかかったままの状態でしばらく残ることがあります。期限を過ぎると元に戻せなくなります。",
      },
    ],
    // ログインの前。ここではまだ1件も送らない
    signInHeading: "まずログインします",
    signInBody:
      "メールアドレスに6桁のコードを送ります。ログインしただけでは、記録は1件も送られません。預けるかどうかは、このあとで決められます。",
    signInAction: "ログインする",
    // ログインはできたが、許可リスト外のとき。記録の保存・復元はできない
    notAllowedHeading: "このアカウントでは使えません",
    notAllowedBody:
      "このメールアドレスはクラウド保存の利用対象に登録されていません。記録の保存や復元は行えません。",
    notAllowedAction: "別のメールアドレスでログインし直す",
    // 有効化の直前。件数だけを出し、記録の中身は出さない
    confirmHeading: "この内容を預けます",
    confirmCounts: (
      records: number,
      selfCare: number,
      notToDo: number
    ): string =>
      `記録 ${records} 件、「できること」 ${selfCare} 件、「やらないこと」 ${notToDo} 件`,
    confirmPeriod: (first: string, last: string): string =>
      `${first} 〜 ${last} の記録です`,
    confirmNoRecords: "まだ記録がありません。預けるものはありません。",
    confirmAction: "この内容を預ける",
    confirmBusy: "預けています…",
    cancelAction: "いまはやめておく",
    uploadFailed:
      "いまは預けられませんでした。時間をおいてもう一度お試しください。この端末の記録はそのまま残っています。",
    // 有効化後の状態表示
    enabledHeading: "クラウドに預けています",
    lastSyncedAt: (when: string): string => `最後にクラウドに預けた：${when}`,
    neverSynced: "まだ一度も預けていません。",
    // 何日も預けられていないとき。責めない言い方にする
    staleNotice: (days: number): string =>
      `${days}日ほど、クラウドに預けられていません。通信が届いていないのかもしれません。この端末の記録は残っています。`,
    // 別の端末へ引き継がれたとき
    handedOverHeading: "この端末は、いまは預けていません",
    handedOverBody: (when: string): string =>
      `この端末は、${when}に別の端末へ引き継がれました。`,
    handedOverKept:
      "この端末の記録は消えていません。これまでどおり書けますし、見られます。",
    handedOverReturn:
      "これから書く分をクラウドに預けたいときは、下の「この端末で預け直す」から戻せます。",
    handedOverAction: "この端末で預け直す",
    // 復元
    restoreAction: "クラウドから戻す",
    restoreHint:
      "機種を変えたときや、この端末の記録が消えてしまったときは、ここからクラウドの控えを戻せます。",
    restoreHeading: "クラウドから戻す",
    restoreLoading: "クラウドの控えを確かめています…",
    restoreUnavailable:
      "いまはクラウドの控えを取り出せませんでした。時間をおいてもう一度お試しください。",
    restoreNothing:
      "この端末にもクラウドにも記録がありません。戻すものはありません。",
    restoreCloudOnly:
      "この端末には記録がありません。クラウドの控えをこの端末に戻せます。",
    restoreLocalOnly:
      "クラウドにはまだ控えがありません。この端末の記録を預けられます。",
    restoreCloudAction: "クラウドの内容をこの端末に戻す",
    restoreUploadAction: "この端末の内容をクラウドに預ける",
    // 両方に記録があるとき。自動で混ぜず、本人に選んでもらう
    restoreChoiceHeading: "どちらを残すか選んでください",
    restoreChoiceBody:
      "この端末とクラウドの両方に記録があります。自動では混ぜません。選んだほうが残り、選ばなかったほうは上書きされます。",
    restoreLocalColumn: "この端末",
    restoreCloudColumn: "クラウド",
    restoreBackupRequired:
      "選ぶ前に、いまの記録をファイルに保存してください。選び直したくなったときに戻せます。",
    restoreBackupAction: "いまの記録をファイルに保存する",
    restoreBackupDone: "ファイルに保存しました。これで選べます。",
    restoreBackupFailed:
      "ファイルに保存できませんでした。保存できるまでは選べません。",
    restoreChooseCloud: "クラウドの内容で置き換える",
    restoreChooseLocal: "この端末を残して、クラウドを上書きする",
    restoreDone: "戻しました。この端末をクラウドに預ける端末にしました。",
    restoreFailed:
      "戻せませんでした。この端末の記録はそのまま残っています。時間をおいてもう一度お試しください。",
    // 停止と退会
    stopAction: "クラウド保存をやめる",
    stopHeading: "クラウド保存をやめる",
    stopBody:
      "これ以降、記録をクラウドへ預けなくなります。クラウド上の控えも消します。この端末の記録は消えません。",
    stopConfirmAction: "やめて、クラウド上の控えも消す",
    stopDone:
      "クラウド保存をやめ、クラウド上の控えを消しました。この端末の記録はそのまま残っています。",
    stopFailed:
      "クラウド上の控えを消せませんでした。時間をおいてもう一度お試しください。",
    leaveAction: "退会する",
    leaveHeading: "退会する",
    leaveBody:
      "クラウド上の控えをすべて消して、ログインからも出ます。この端末の記録は消えません。",
    leaveConfirmAction: "退会して、クラウド上の控えを消す",
    leaveDone:
      "クラウド上の控えを消して、ログインから出ました。この端末の記録はそのまま残っています。",
    // 再認証。取り返しのつかない操作の前に必ず通す
    reauthRequired:
      "本人確認から時間が経っています。安全のため、もう一度ログインしてから消します。",
    reauthAction: "もう一度ログインする",
    busy: "処理しています…",
  },
  // 記録の保存後。演出は挟まず、保存できたことと次にできることだけを示す
  completion: {
    // 完了後の案内。次にできることを並べるだけで、次の行動をすすめない
    doneGuide: "このあとは、これまでの記録を見る・今日の記録を書き直す・閉じる、から選べます。",
    // 「整える」全画面演出（`/preview/completion` のプロトタイプ）の完了文言
    flowTitle: "少し、整いました",
    flowSubtitle: "今日の記録をしまいました。また明日、見にきてください。",
  },
} as const;
