/**
 * 既に作成したGoogleフォームから、運営メモ（note列）の表示を消すスクリプト
 *
 * 背景
 *   最初の生成スクリプトが note 列（運営向けメモ）を回答者向けの説明として
 *   表示していた。「効果を過大に見せないため必須にする」「正確な日数は運営記録
 *   から取る」などが参加者に見えてしまうため、help 列の内容だけに置き換える。
 *
 * 使い方
 * 1. 設問定義スプレッドシート（pre / weekly / post / withdrawal の4シート）を開く
 * 2. CSVを最新版（help列つき・10列）に取り込み直す
 * 3. 拡張機能 > Apps Script を開き、このファイルを追加する
 * 4. 下の FORM_IDS に、自分のフォームIDを貼る
 *    （編集URL https://docs.google.com/forms/d/★ここ★/edit の★の部分）
 * 5. 関数 fixAllForms を実行する
 * 6. 実行ログで、書き換えた件数と消した件数を確認する
 *
 * このスクリプトは説明文だけを書き換える。設問文・選択肢・必須設定・順番は触らない。
 */

var FORM_IDS = {
  pre:        '1dDo-qXIQM7ZPCheqzezCLlPyoaGmM17hSvrWpxuEUZE',
  weekly:     '15_ktnv03k4_9KnMMLHe3Q4uY8Qa2yyqq1zvTWeSsjNQ',
  post:       '1MQzKwDia7GffdUjcUALe0UujMfiVF6oq_e1xYYZVi5I',
  withdrawal: '1Ik8hD-fvsoimrI23y-Wcxh8_95X9omAAQe57qI7bJ6k'
};

function fixAllForms() {
  Object.keys(FORM_IDS).forEach(function (sheetName) {
    fixOneForm(sheetName, FORM_IDS[sheetName]);
  });
}

function fixOneForm(sheetName, formId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('シートが見つかりません: ' + sheetName);

  var values = sheet.getDataRange().getValues();
  var header = values[0].map(function (v) { return String(v).trim(); });
  var col = {};
  header.forEach(function (name, i) { col[name] = i; });
  if (col.help === undefined) {
    throw new Error('help列がありません。最新のCSVを取り込み直してください: ' + sheetName);
  }

  // qid -> help の対応表を作る
  var helpByQid = {};
  values.slice(1).forEach(function (row) {
    var qid = String(row[col.qid]).trim();
    if (qid && qid !== '-') helpByQid[qid] = String(row[col.help]).trim();
  });

  var form = FormApp.openById(formId);
  var updated = 0, cleared = 0, unmatched = [];

  form.getItems().forEach(function (item) {
    var title = item.getTitle();
    var m = title.match(/^([A-Za-z0-9\-]+)\.\s/); // 「A1. 」「S1-S7. 」などの接頭辞
    if (!m) return;

    var qid = m[1];
    if (!(qid in helpByQid)) { unmatched.push(qid); return; }

    var desired = helpByQid[qid];
    var typed = asTypedItem(item);
    if (!typed) return;

    var current = typed.getHelpText();
    if (current === desired) return;

    typed.setHelpText(desired);
    if (desired === '') cleared++; else updated++;
  });

  Logger.log(
    sheetName + ': 説明を消した ' + cleared + '件 / 書き換えた ' + updated + '件' +
    (unmatched.length ? ' / 定義に無いqid: ' + unmatched.join(',') : '')
  );
}

function asTypedItem(item) {
  switch (item.getType()) {
    case FormApp.ItemType.TEXT:           return item.asTextItem();
    case FormApp.ItemType.PARAGRAPH_TEXT: return item.asParagraphTextItem();
    case FormApp.ItemType.MULTIPLE_CHOICE:return item.asMultipleChoiceItem();
    case FormApp.ItemType.CHECKBOX:       return item.asCheckboxItem();
    case FormApp.ItemType.GRID:           return item.asGridItem();
    case FormApp.ItemType.SCALE:          return item.asScaleItem();
    default:                              return null;
  }
}
