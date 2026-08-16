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
  /** 記録から見える変化（事実の列挙。状態のラベル付けはしない） */
  changeFacts: {
    title: "記録から見えること",
    description: "直近7日の記録を、そのまま数えたものです。",
    empty:
      "この期間の記録はまだありません。書けそうなときに、1日分からで大丈夫です。",
    noFacts:
      "数えられる項目がまだありません。気分・睡眠・お薬・しんどさのサインのどれかを記録すると、ここに出ます。",
    /** 変化の有無にかかわらず、常に同じ場所に同じ強さで置く */
    consultationHeading: "相談先を見る",
    consultationBody:
      "相談先は、記録の内容にかかわらずいつでも同じ場所から開けます。開くかどうかはご自身で選べます。",
  },
  /** 東京都内の支援先をさがす */
  support: {
    finderTitle: "東京都内の支援先をさがす",
    finderDescription:
      "条件を選ぶと、受付状況とあわせて表示します。ヨルケアが状態から相談先を選ぶことはありません。",
    safetyHeading: "安全のための案内",
    safetyItems: [
      "ひとりにならず、近くの人にも助けを求めてください。",
      "命や身体に差し迫った危険があるときは、救急・消防は119、事件・事故は110です。",
      "公的な相談窓口は、下の一覧からいつでも開けます。",
      "安全な場所へ移ってから、落ち着いて話せる相手を選んでください。",
    ],
    municipalityLegend: "いま、いる市区町村",
    categoryLegend: "相談したい内容",
    methodLegend: "相談方法",
    urgencyLegend: "いつ相談したいか",
    urgencyNote:
      "この選択は表示の順番を変えるだけです。選んだ内容を、ヨルケアが緊急度として判定することはありません。",
    anyMunicipality: "指定しない（都内すべて）",
    anyCategory: "指定しない",
    anyMethod: "指定しない",
    resultsHeading: "条件に合う支援先",
    noResults:
      "選んだ条件に合う支援先が、いまのデータにはありません。条件を減らすと、ほかの支援先が出ます。",
    demoBadge: "デモデータ",
    demoNotice:
      "現在表示している東京都内の支援先は、画面を確かめるためのデモデータです。実在の窓口ではないため、電話番号とリンクは持っていません。",
    dataAboutHeading: "データについて",
    dataProviderLabel: "提供者",
    dataDatasetLabel: "データセット",
    dataUpdatedLabel: "更新日",
    dataKindLabel: "種別",
    dataLicenseLabel: "ライセンス",
    dataReferenceLabel: "参照",
    dataKindOfficial: "出典を確認したデータ",
    dataUpdatedUnknown: "確認できていません",
    dataPermissionLabel: "利用の根拠",
    dataPermissionOpenDataCatalog:
      "オープンデータとして公開され、許諾なく利用できるデータ",
    dataPermissionGranted: "掲載元から利用の許諾を得たデータ",
    dataPermissionRequired: "利用の許諾が必要で、まだ得られていないデータ",
    dataPermissionUnverified: "掲載元の利用条件を確認していないデータ",
    dataPermissionDemoOnly: "外部データを含まない、画面確認用のデータ",
    officialPage: "公式ページ",
    openUntilSuffix: "まで",
    dataVerifyBody:
      "受付時間や連絡先は変わることがあります。利用の前に、公式サイトか電話で最新の情報をご確認ください。",
    plannedHeading: "接続を予定しているデータ",
    plannedNote:
      "接続先のデータ形式に加えて、掲載元の利用条件を確認できていないため、まだ接続していません。利用の根拠が確かめられたデータだけを、確認できた順に足していきます。",
    plannedMunicipalNote:
      "区市町村や他の道府県のデータは、掲載元ごとに利用条件が異なります。条件を確認できた地域から順に足します。",
    // 受付状況（色だけに頼らず、必ず語でも示す）
    statusOpen24Hours: "24時間対応",
    statusOpen: "受付中",
    statusBeforeOpening: "本日この後に受付",
    statusClosedToday: "本日は受付終了",
    statusClosedByDay: "本日は受付日ではありません",
    statusUnknown: "受付時間は確認が必要です",
    nextOpeningLabel: "次回受付",
    reservationRequired: "予約が必要です",
    reservationNotRequired: "予約なしで相談できます",
    methodLabelPhone: "電話",
    methodLabelOnline: "オンライン",
    methodLabelInPerson: "対面",
    urgencyNow: "今すぐ",
    urgencyToday: "今日中",
    urgencyWithinDays: "数日以内",
    categoryMentalHealth: "こころの健康",
    categoryMedical: "医療機関",
    categoryEmployment: "就労・生活",
    categoryDevelopmentalDisability: "発達障害",
    categoryWelfare: "福祉窓口",
    categoryNightConsultation: "夜間・休日の相談",
    categoryEmergency: "緊急の通報",
    targetUsersLabel: "対象",
    prefectureWideLabel: "都内全域",
  },
  /** 自分メンテ（状態に応じた運動の選択肢） */
  movement: {
    title: "今日の自分メンテ",
    description:
      "今日の記録をもとに、負担の軽い順に並べています。提案であって、指示ではありません。",
    noRecordNote:
      "今日の記録がまだないため、負担の軽い選択肢だけを並べています。記録がない日を、何かを逃した日としては扱いません。",
    basisHeading: "並べ方の根拠",
    optionsHeading: "ほかの選択肢",
    restHeading: "休むという選択肢",
    choiceSuffix: "という選択肢があります",
    notCounted:
      "選んでも選ばなくても、続いた日数や割合として数えることはありません。",
    cautionHeading: "気をつけること",
    addToDictionary: "「できること」に追加する",
    addedToDictionary: "「できること」に追加しました",
  },
  /** 相談文テキストへの追加項目 */
  shareExtras: {
    factsOption: "記録から数えた事実（選んだ期間）",
    factsDescription: "日数と母数だけを入れます。メモの本文は入りません。",
    supportOption: "見た相談先の名称",
    supportDescription:
      "自分で選んだ相談先の名称だけを入れます。選ばなければ入りません。",
    supportPickerLegend: "相談文に入れる相談先",
    noFactsAvailable: "数えられる事実がまだないため、この項目は入りません。",
  },
} as const;
