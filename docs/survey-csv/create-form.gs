/**
 * ヨルケア 1か月試運転アンケート — Googleフォーム自動生成スクリプト
 *
 * 使い方
 * 1. Googleスプレッドシートを新規作成する
 * 2. ファイル > インポート で 01_pre.csv などを読み込む（1ファイル＝1シート）
 * 3. 拡張機能 > Apps Script を開き、このファイルの内容を貼り付けて保存する
 * 4. 関数 buildFormFromActiveSheet を選んで実行する（初回は権限の承認が必要）
 * 5. 実行ログに出るフォームの編集URLを開く
 *
 * 期待する列（1行目がヘッダー）
 * form / section / qid / required / question / type / options / rows / note
 *
 * type の値
 * 説明 / 記述 / 段落 / ラジオ / チェックボックス / グリッド / 目盛
 * options と rows は「|」区切り
 * 目盛の options は「下限|上限|下限ラベル|上限ラベル」
 */

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
