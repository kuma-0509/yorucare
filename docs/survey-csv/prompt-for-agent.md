# エージェントに渡すプロンプト

ChatGPT のエージェントモード（Work / ブラウザを自分で操作するモード）で
Googleフォームを作らせるための指示文です。

`【　】` の中だけ書き換えて、CSV4本を添付して貼り付けてください。

---

## プロンプト1：Googleフォームを4つ作らせる（メイン・これ1本で完結）

> **添付するファイル**：`01_pre.csv` / `02_weekly.csv` / `03_post.csv` / `04_withdrawal.csv`

```text
あなたはアンケート実装の担当者です。添付した4つのCSVから、Googleフォームを4つ作ってください。
私のGoogleアカウントは【ブラウザにログイン済み / これからログインします】。

────────────────────────────────
■ 結論から言うと、やることはこれだけ
────────────────────────────────
Googleフォームの画面で1問ずつ手入力すると80問あって必ず失敗します。
下に完成したスクリプトを渡すので、それをそのまま貼って実行するだけにしてください。
スクリプトを自分で書き直さないでください。

────────────────────────────────
■ 手順
────────────────────────────────
1. Googleスプレッドシートを新規作成し、名前を「ヨルケア アンケート設問定義」にする。
2. ファイル > インポート で 01_pre.csv を読み込む。
   インポート場所は「新しいシートを挿入する」、区切り文字は「カンマ」を選ぶ。
   同じ手順で 02_weekly.csv、03_post.csv、04_withdrawal.csv も読み込む（合計4シート）。
3. 各シートの名前を pre / weekly / post / withdrawal に変える。
4. 拡張機能 > Apps Script を開く。
5. エディタの中身をすべて消し、この指示の末尾にある【スクリプト】をそのまま貼り付けて保存する。
6. シート「pre」のタブを開いた状態にしてから、Apps Script で関数
   buildFormFromActiveSheet を選んで実行する。
   ※ 初回は権限の承認画面が出る。「詳細」→「（プロジェクト名）に移動」→「許可」と進む。
   ※ この承認は私のGoogleアカウントに、私自身のフォームを作らせるためのもの。
7. 実行ログに出た「編集URL」と「回答URL」を控える。
8. シートを weekly → post → withdrawal の順に切り替えて、そのつど 6 を繰り返す。
   実行する前に必ず対象のシートのタブを開くこと（開いているシートを読むため）。

────────────────────────────────
■ 途中で止まって私に聞くこと
────────────────────────────────
- Googleアカウントのログインや2段階認証を求められたとき
- 権限の承認画面の内容が、上に書いた説明と違うとき
- スクリプトがエラーで止まったとき（エラー文をそのまま貼って報告する）
- CSVの中身に矛盾を見つけたとき（勝手に直さず、質問として挙げる）

自分で判断してアカウントを新規作成したり、別のGoogleアカウントを使ったりしないでください。

────────────────────────────────
■ 絶対に守ること
────────────────────────────────
1. 設問文と選択肢の文言を変えない。
   言い換え、要約、敬語の統一、誤字の修正、句読点の調整、どれもしない。
   → このアンケートは参加前と参加後に同じ質問をして差を見る設計です。
     片方だけ文言が変わると、その設問は集計に使えなくなります。
2. 設問の順番を変えない。CSVの並び順のままにする。
3. 設問を足さない。減らさない。「あった方がよさそう」と思っても足さない。
4. required列が「必須」の行だけ必須にする。それ以外を必須にしない。
5. メールアドレスの自動収集をONにしない。氏名を尋ねる設問を追加しない。
6. ログイン必須、1人1回の制限をかけない。
7. フォームのデザインやテーマを凝らない。既定のままでよい。

────────────────────────────────
■ 完了したら、この形式で報告してください
────────────────────────────────
| フォーム | 設問数 | CSVの行数 | 編集URL | 回答URL |
|---|---|---|---|---|
| 事前 | | 15 | | |
| 週次 | | 5 | | |
| 事後 | | 80 | | |
| 辞退時 | | 4 | | |

あわせて次も書いてください。
- 設問数がCSVの行数と合わなかったフォームがあれば、どの設問が抜けたか
- 判断に迷った箇所の一覧（勝手に直していないこと）
- 権限承認で私が操作した内容

────────────────────────────────
■ 参考：CSVの列の意味（スクリプトが読む形式）
────────────────────────────────
form      : どのアンケートか
section   : フォーム内のセクション名。変わるところでページを分ける
qid       : 設問番号。設問文の先頭に「Q1. 」のように付く
required  : 「必須」の行だけ必須。空欄は任意
question  : 設問文
type      : 回答形式（説明 / 記述 / 段落 / ラジオ / チェックボックス / グリッド / 目盛）
options   : 選択肢。半角の「|」区切り。目盛だけは「下限|上限|下限ラベル|上限ラベル」
rows      : グリッドの行。半角の「|」区切り
note      : 補足説明（ヘルプテキスト）に入れる

────────────────────────────────
■ 【スクリプト】ここから下をそのまま Apps Script に貼る
────────────────────────────────
var FORM_TITLES = {
  '事前': 'ヨルケア 1か月プログラム 事前アンケート',
  '週次': 'ヨルケア 1か月プログラム 週次アンケート',
  '事後': 'ヨルケア 1か月プログラム 事後アンケート',
  '辞退時': 'ヨルケア 1か月プログラム 途中辞退時アンケート'
};

var SAFETY_TEXT =
  'この回答はリアルタイムには確認されません。急ぎの相談や支援が必要なときは、' +
  'このアンケートを使わず、医療機関や緊急サービスへ直接ご連絡ください。\n\n' +
  'お名前は取得しません。参加者IDだけでお答えください。';

function buildFormFromActiveSheet() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    throw new Error('データ行がありません。CSVを取り込んだシートを開いて実行してください。');
  }

  var header = values[0].map(function (v) { return String(v).trim(); });
  var col = {};
  header.forEach(function (name, i) { col[name] = i; });
  ['form', 'section', 'qid', 'question', 'type'].forEach(function (name) {
    if (col[name] === undefined) throw new Error('列が見つかりません: ' + name);
  });

  var rows = values.slice(1).filter(function (r) { return String(r[col.question]).trim() !== ''; });
  var formKey = String(rows[0][col.form]).trim();
  var title = FORM_TITLES[formKey] || ('ヨルケア アンケート（' + formKey + '）');

  var form = FormApp.create(title);
  form.setDescription(SAFETY_TEXT);
  form.setProgressBar(true);
  form.setCollectEmail(false);      // メールアドレスは集めない
  form.setLimitOneResponsePerUser(false);

  var currentSection = '';

  rows.forEach(function (row) {
    var section = String(row[col.section]).trim();
    var qid = String(row[col.qid]).trim();
    var required = String(row[col.required]).trim() === '必須';
    var question = String(row[col.question]).trim();
    var type = String(row[col.type]).trim();
    var options = splitList(row[col.options]);
    var gridRows = splitList(row[col.rows]);
    var note = col.note !== undefined ? String(row[col.note]).trim() : '';

    if (type === '説明') {
      return; // 冒頭の説明文はフォームの説明に入れてあるので項目にしない
    }

    if (section && section !== currentSection && section !== '説明') {
      form.addPageBreakItem().setTitle(section);
      currentSection = section;
    }

    var label = qid && qid !== '-' ? qid + '. ' + question : question;

    switch (type) {
      case '記述':
        form.addTextItem().setTitle(label).setHelpText(note).setRequired(required);
        break;
      case '段落':
        form.addParagraphTextItem().setTitle(label).setHelpText(note).setRequired(required);
        break;
      case 'ラジオ':
        form.addMultipleChoiceItem().setTitle(label).setHelpText(note)
          .setChoiceValues(options).setRequired(required);
        break;
      case 'チェックボックス':
        form.addCheckboxItem().setTitle(label).setHelpText(note)
          .setChoiceValues(options).setRequired(required);
        break;
      case 'グリッド':
        form.addGridItem().setTitle(label).setHelpText(note)
          .setRows(gridRows).setColumns(options).setRequired(required);
        break;
      case '目盛':
        form.addScaleItem().setTitle(label).setHelpText(note)
          .setBounds(Number(options[0]), Number(options[1]))
          .setLabels(options[2] || '', options[3] || '')
          .setRequired(required);
        break;
      default:
        throw new Error('未知の type です: ' + type + '（' + qid + '）');
    }
  });

  Logger.log('作成しました: ' + title);
  Logger.log('編集URL: ' + form.getEditUrl());
  Logger.log('回答URL: ' + form.getPublishedUrl());
}

function splitList(value) {
  var text = String(value == null ? '' : value).trim();
  if (!text) return [];
  return text.split('|').map(function (s) { return s.trim(); }).filter(function (s) { return s !== ''; });
}
```

---

## プロンプト2：できたフォームを点検させる（別セッションで実行）

作った本人に検算させても見落とすので、**新しいセッション**で実行してください。

```text
添付したCSVと、次のGoogleフォームを1問ずつ照合して、食い違いを一覧にしてください。
- 事前: 【URL】
- 週次: 【URL】
- 事後: 【URL】
- 辞退時: 【URL】

確認する点:
1. 設問数がCSVの行数と一致しているか（事前15・週次5・事後80・辞退時4）
2. 設問文がCSVと1文字も違わないか。違う箇所はCSV側とフォーム側を並べて示す
3. 選択肢の文言と並び順がCSVと一致しているか
4. required列が「必須」の行だけが必須になっているか
5. メールアドレスの収集がOFFになっているか
6. 事前フォームと事後フォームで、qidが S1-S7 / SL1〜SL6 / LR1-LR4 / LR5 の
   設問文と選択肢が完全に同じか（ここが違うと1か月の変化を集計できません）

見つけても勝手に直さないでください。一覧にして私に報告してください。
```

---

## プロンプト3：1か月後に集計させる

```text
あなたは調査結果をまとめる担当者です。添付した回答データを集計して、報告書のたたき台を作ってください。

# 添付
- 事前アンケートの回答（スプレッドシート）
- 事後アンケートの回答（スプレッドシート）
- 週次アンケートの回答（スプレッドシート）
- 設問定義: 01_pre.csv / 03_post.csv

# やってほしいこと
1. 参加者IDで事前と事後を突き合わせる
2. S1〜S7、SL1〜SL6、LR1〜LR4、LR5 の事前・事後の値と、その差を出す
3. Q1（体調）・Q2（メンタル）の回答分布を出す
4. SL11（睡眠で一番変わったもの）の内訳を出す
5. LR6（生活リズムの作りやすさ）の分布を出す
6. P1（総合満足度）、P15（継続意向）、P16（推奨意向）の分布を出す
7. 自由記述（Q10, P2, P12b, P13b, A10, O11）を、良い点・改善点・その他に分けて全文を並べる
8. 週次のW1・W2の推移（1週目→4週目）を出す

# 集計と書き方のルール（必ず守る）
1. 割合を書くときは必ず母数を添える（例:「21人中14人（67%）」）。割合だけの数字を単独で書かない。
2. 統計的な有意差を主張しない。「有意に改善」「効果が確認された」と書かない。
3. 「症状が改善する」「治る」「効果がある」と書かない。
   書けるのは「参加者の主観的な実感」と「満足度」まで。
4. Q8（プログラム以外で影響したこと）で「特になし」以外を選んだ人数を必ず併記する。
   比較する集団がない調査なので、変化をプログラムの成果と断定しない。
5. 自由記述は良い評価だけを抜き出さない。否定的な意見も件数とともにそのまま載せる。
6. 回答が5人未満の項目は、個人が特定されうるため割合を出さず件数だけにする。
7. 事後だけ回答があり事前がない人は、変化の集計から除外し、その人数を明記する。
8. 氏名や個人が特定できる記述が自由記述にあれば、伏せ字にして報告する。

# 出力
- 見出しごとに表と箇条書きでまとめた報告書のたたき台（Markdown）
- 各表に母数の行を入れる
```

---

## 補足：なぜ「文言を変えるな」を何度も書いているか

エージェントは親切心で言い回しを整えたり、選択肢を足したりします。
このアンケートは**事前と事後で同じ質問をして差を見る**設計なので、
片方だけ文言が変わると、その設問は集計に使えなくなります。
「絶対に守ること」の7項目は削らずに使ってください。

## 補足：エージェントが失敗しやすい場所

| つまずく場所 | 対策（プロンプトに入れてある） |
|---|---|
| 80問を画面で手入力しようとして途中で力尽きる | スクリプト方式を最初に指定し、完成コードを渡す |
| スクリプトを自分で書き直して型を間違える | 「書き直さない」と明記 |
| Apps Scriptの権限承認画面で止まる | 承認の進み方を手順に書き、止まったら聞くよう指示 |
| 実行前に対象シートを開き忘れて同じフォームを4つ作る | 各回「対象のシートのタブを開く」と明記 |
| 設問数が合わないまま完了報告する | 報告フォーマットにCSVの行数を先に入れておく |
