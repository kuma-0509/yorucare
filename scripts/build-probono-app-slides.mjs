/** プロボノの方へアプリを説明するスライド（16:9・12枚）を組み立てる。
 *
 * 使い方（pptxgenjs は本体の依存に入れていないため、都度取得する）:
 *   npm exec --yes --package=pptxgenjs -- node scripts/build-probono-app-slides.mjs
 *
 * 出力: ヨルケア_アプリのご説明_プロボノ向け.pptx（実行したディレクトリ）
 * PDF にするときは PowerPoint か LibreOffice で書き出す。
 *
 * 中身を直すときの注意:
 * - 画面文言を引用する箇所は `src/lib/copy.ts` を正とする。
 * - 相談先の並びと境界は `docs/consultation-routing.md` を正とする。
 * - 数字（テストファイル数・記録項目・週の所要時間）は出典を確かめてから変える。
 */
import pptxgen from "pptxgenjs";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.author = "熊谷祐希";
pres.company = "ヨルケア";
pres.title = "ヨルケア アプリのご説明";

const W = 13.333;
const M = 0.6;
const CW = W - M * 2; // 12.133

// ---- palette (夜・月) ----
const NAVY = "141B3D";
const NAVY_SOFT = "232B57";
const INK = "131A33";
const INK_MID = "495270";
const INK_SOFT = "79839F";
const PAPER = "F2F5FB";
const CARD = "FFFFFF";
const LINE = "DCE2EE";
const AMBER = "F4BF3F";
const AMBER_INK = "8A4F08";
const AMBER_FILL = "FBF0D8";
const INDIGO = "3F3BC4";
const INDIGO_FILL = "E9EAFD";
const BAND_INK = "F2F5FF";
const BAND_SOFT = "B9C2E6";

const JP = "Meiryo";

const RR = pres.ShapeType.roundRect;
const ELL = pres.ShapeType.ellipse;

const shadow = () => ({ type: "outer", color: "0A102D", blur: 10, offset: 2, angle: 90, opacity: 0.1 });

// ---------- helpers ----------
function pageFoot(slide, n) {
  slide.addText("ヨルケア", {
    x: M, y: 6.92, w: 3, h: 0.3, fontFace: JP, fontSize: 9, color: INK_SOFT, margin: 0,
  });
  slide.addText(String(n), {
    x: W - M - 1, y: 6.92, w: 1, h: 0.3, fontFace: JP, fontSize: 9, color: INK_SOFT,
    align: "right", margin: 0,
  });
}

// content-slide header: moon dot + eyebrow + title (no underline / no bars)
function header(slide, eyebrow, title) {
  slide.addShape(ELL, { x: M, y: 0.52, w: 0.15, h: 0.15, fill: { color: AMBER }, line: { color: AMBER } });
  slide.addText(eyebrow, {
    x: M + 0.27, y: 0.4, w: 8, h: 0.32, fontFace: "Calibri", fontSize: 11, bold: true,
    color: AMBER_INK, charSpacing: 2, margin: 0, valign: "middle",
  });
  slide.addText(title, {
    x: M - 0.04, y: 0.82, w: CW, h: 0.72, fontFace: JP, fontSize: 30, bold: true,
    color: INK, margin: 0, valign: "middle",
  });
}

function contentSlide(eyebrow, title, n) {
  const s = pres.addSlide();
  s.background = { color: CARD };
  header(s, eyebrow, title);
  pageFoot(s, n);
  return s;
}

function card(slide, x, y, w, h, fill) {
  slide.addShape(RR, {
    x, y, w, h, rectRadius: 0.12,
    fill: { color: fill || PAPER }, line: { color: "FFFFFF", width: 0 },
    shadow: shadow(),
  });
}

// numbered amber circle
function numDot(slide, x, y, label, size) {
  const d = size || 0.42;
  slide.addShape(ELL, { x, y, w: d, h: d, fill: { color: AMBER }, line: { color: AMBER } });
  slide.addText(label, {
    x, y, w: d, h: d, fontFace: "Calibri", fontSize: 12, bold: true, color: "3A2704",
    align: "center", valign: "middle", margin: 0,
  });
}

function chip(slide, x, y, w, text, fill, color) {
  slide.addShape(RR, {
    x, y, w, h: 0.5, rectRadius: 0.1,
    fill: { color: fill }, line: { color: "FFFFFF", width: 0 },
  });
  slide.addText(text, {
    x, y, w, h: 0.5, fontFace: JP, fontSize: 12.5, bold: true, color,
    align: "center", valign: "middle", margin: 0,
  });
}

function note(slide, y, text) {
  slide.addText(text, {
    x: M, y, w: CW, h: 0.34, fontFace: JP, fontSize: 11, color: INK_SOFT, margin: 0, valign: "middle",
  });
}

// =====================================================================
// 1. Title
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: NAVY };

  // moon motif
  s.addShape(ELL, { x: 10.15, y: 0.75, w: 2.5, h: 2.5, fill: { color: AMBER, transparency: 90 }, line: { color: NAVY, width: 0 } });
  s.addShape(ELL, { x: 10.65, y: 1.25, w: 1.5, h: 1.5, fill: { color: AMBER, transparency: 78 }, line: { color: NAVY, width: 0 } });
  s.addShape(ELL, { x: 11.05, y: 1.65, w: 0.7, h: 0.7, fill: { color: AMBER }, line: { color: AMBER } });

  s.addShape(ELL, { x: M, y: 1.46, w: 0.15, h: 0.15, fill: { color: AMBER }, line: { color: AMBER } });
  s.addText("SELF-CARE RECORD APP", {
    x: M + 0.27, y: 1.34, w: 6, h: 0.32, fontFace: "Calibri", fontSize: 12, bold: true,
    color: AMBER, charSpacing: 3, margin: 0, valign: "middle",
  });

  s.addText("ヨルケア", {
    x: M - 0.06, y: 1.78, w: 8, h: 1.15, fontFace: JP, fontSize: 54, bold: true, color: "FFFFFF", margin: 0, valign: "middle",
  });
  s.addText("夜と休日に、自分の状態を残すためのアプリ", {
    x: M - 0.02, y: 2.98, w: 9, h: 0.5, fontFace: JP, fontSize: 21, bold: true, color: BAND_SOFT, margin: 0, valign: "middle",
  });
  s.addText(
    "メンタル不調を経験して復職した方が、1日1〜2分で気分・睡眠・できたことを記録し、\n通院や面談で自分の状態を伝えられるようにするWebアプリです。",
    { x: M - 0.02, y: 3.62, w: 8.6, h: 0.95, fontFace: JP, fontSize: 14, color: "AEB8D6", lineSpacing: 24, margin: 0 }
  );

  const chips = [
    ["1日1〜2分", "書くのは、これだけ"],
    ["登録なし・インストールなし", "スマホのブラウザだけ"],
    ["記録は本人の端末内", "運営者も原則見ません"],
  ];
  chips.forEach((c, i) => {
    const x = M + i * 4.0;
    s.addShape(RR, { x, y: 5.05, w: 3.75, h: 0.95, rectRadius: 0.12, fill: { color: NAVY_SOFT }, line: { color: "FFFFFF", width: 0 } });
    s.addText(c[0], { x: x + 0.25, y: 5.15, w: 3.3, h: 0.4, fontFace: JP, fontSize: 14, bold: true, color: AMBER, margin: 0, valign: "middle" });
    s.addText(c[1], { x: x + 0.25, y: 5.52, w: 3.3, h: 0.34, fontFace: JP, fontSize: 10.5, color: BAND_SOFT, margin: 0, valign: "middle" });
  });

  s.addText("アプリ試作　yorucare.vercel.app", {
    x: M, y: 6.5, w: 9, h: 0.34, fontFace: JP, fontSize: 12, color: "8891B1", margin: 0, valign: "middle",
  });
  s.addText("プロボノの皆さまへ", {
    x: W - M - 4, y: 6.5, w: 4, h: 0.34, fontFace: JP, fontSize: 12, bold: true, color: BAND_SOFT, align: "right", margin: 0, valign: "middle",
  });

  s.addNotes("ヨルケアのアプリ部分だけを説明する資料です。コミュニティ運営や事業の話は別紙にまとめています。");
}

// =====================================================================
// 2. What it is  (left: 3 steps / right: phone mock)
// =====================================================================
{
  const s = contentSlide("WHAT IT IS", "書いて、見返して、そのまま渡せる", 2);

  const steps = [
    ["01", "記録する", "気分・睡眠・お薬・しんどさのサイン・できたこと。\nタップ中心で、書ける範囲だけ残します。"],
    ["02", "見返す", "週から月の単位でグラフになり、\n自分の調子の波を後から確かめられます。"],
    ["03", "伝える", "期間の報告書を作れます。通院や面談で、\n1か月の状態をその場で整理せずに済みます。"],
  ];
  steps.forEach((st, i) => {
    const y = 1.85 + i * 1.55;
    numDot(s, M, y + 0.05, st[0]);
    s.addText(st[1], { x: M + 0.62, y, w: 6.4, h: 0.42, fontFace: JP, fontSize: 17, bold: true, color: INK, margin: 0, valign: "middle" });
    s.addText(st[2], { x: M + 0.62, y: y + 0.44, w: 6.5, h: 0.85, fontFace: JP, fontSize: 12.5, color: INK_MID, lineSpacing: 20, margin: 0 });
  });

  // ---- phone mock ----
  card(s, 7.85, 1.7, 4.88, 4.95, PAPER);
  const px = 8.75, py = 1.9, pw = 3.05, ph = 4.3;
  s.addShape(RR, { x: px, y: py, w: pw, h: ph, rectRadius: 0.16, fill: { color: CARD }, line: { color: LINE, width: 1 }, shadow: shadow() });
  s.addText("ヨルケア", { x: px + 0.18, y: py + 0.14, w: 1.4, h: 0.28, fontFace: JP, fontSize: 10, bold: true, color: INK, margin: 0, valign: "middle" });
  s.addShape(RR, { x: px + 2.05, y: py + 0.15, w: 0.82, h: 0.26, rectRadius: 0.08, fill: { color: AMBER_FILL }, line: { color: "FFFFFF", width: 0 } });
  s.addText("相談先", { x: px + 2.05, y: py + 0.15, w: 0.82, h: 0.26, fontFace: JP, fontSize: 8, bold: true, color: AMBER_INK, align: "center", valign: "middle", margin: 0 });
  s.addText("8月25日（月）", { x: px + 0.18, y: py + 0.48, w: 1.8, h: 0.24, fontFace: JP, fontSize: 8.5, color: INK_SOFT, margin: 0, valign: "middle" });

  const rows = [
    ["今日の気分", "mood"],
    ["睡眠", "7時間30分"],
    ["今日できたこと", "chips"],
  ];
  rows.forEach((r, i) => {
    const ry = py + 0.8 + i * 0.86;
    s.addShape(RR, { x: px + 0.18, y: ry, w: pw - 0.36, h: 0.74, rectRadius: 0.1, fill: { color: "F6F8FD" }, line: { color: "FFFFFF", width: 0 } });
    s.addText(r[0], { x: px + 0.32, y: ry + 0.06, w: 2, h: 0.24, fontFace: JP, fontSize: 8.5, color: INK_SOFT, margin: 0, valign: "middle" });
    if (r[1] === "mood") {
      for (let k = 0; k < 5; k++) {
        const on = k === 3;
        s.addShape(ELL, {
          x: px + 0.34 + k * 0.44, y: ry + 0.33, w: 0.3, h: 0.3,
          fill: { color: on ? INDIGO : "E2E7F4" }, line: { color: on ? INDIGO : "E2E7F4" },
        });
      }
    } else if (r[1] === "chips") {
      s.addShape(RR, { x: px + 0.32, y: ry + 0.32, w: 1.02, h: 0.3, rectRadius: 0.09, fill: { color: INDIGO_FILL }, line: { color: "FFFFFF", width: 0 } });
      s.addText("散歩", { x: px + 0.32, y: ry + 0.32, w: 1.02, h: 0.3, fontFace: JP, fontSize: 8, bold: true, color: INDIGO, align: "center", valign: "middle", margin: 0 });
      s.addShape(RR, { x: px + 1.44, y: ry + 0.32, w: 1.25, h: 0.3, rectRadius: 0.09, fill: { color: INDIGO_FILL }, line: { color: "FFFFFF", width: 0 } });
      s.addText("湯船に入る", { x: px + 1.44, y: ry + 0.32, w: 1.25, h: 0.3, fontFace: JP, fontSize: 8, bold: true, color: INDIGO, align: "center", valign: "middle", margin: 0 });
    } else {
      s.addText(r[1], { x: px + 0.32, y: ry + 0.3, w: 2.4, h: 0.32, fontFace: JP, fontSize: 11, bold: true, color: INK, margin: 0, valign: "middle" });
    }
  });

  // tab bar
  s.addShape(RR, { x: px + 0.02, y: py + ph - 0.62, w: pw - 0.04, h: 0.6, rectRadius: 0.12, fill: { color: PAPER }, line: { color: "FFFFFF", width: 0 } });
  ["書く", "これまで", "できること", "ふりかえり"].forEach((t, i) => {
    const tw = (pw - 0.1) / 4;
    s.addText(t, {
      x: px + 0.05 + i * tw, y: py + ph - 0.56, w: tw, h: 0.48,
      fontFace: JP, fontSize: 7.5, bold: i === 0, color: i === 0 ? INDIGO : INK_SOFT,
      align: "center", valign: "middle", margin: 0,
    });
  });
  s.addText("画面イメージ", { x: 7.85, y: 6.26, w: 4.88, h: 0.3, fontFace: JP, fontSize: 10, color: INK_SOFT, align: "center", margin: 0, valign: "middle" });

  s.addNotes("アプリでやることは3つだけ。記録・見返し・共有です。");
}

// =====================================================================
// 3. Why
// =====================================================================
{
  const s = contentSlide("WHY", "「一人で体調管理を続ける」のは、とても難しい", 3);

  const items = [
    ["01", "記録が続かない", "入力する項目が多いほど、調子が悪い日ほど書けなくなる。続かなければ、振り返る材料も残らない。"],
    ["02", "短い診察で伝えにくい", "限られた診察時間で、1か月ぶんの状態を思い出しながら整理して話すのは難しい。"],
    ["03", "変化に気づくのが遅れる", "睡眠や気分のゆるやかな変化は、後から並べて見ないと自分では見えにくい。"],
  ];
  items.forEach((it, i) => {
    const x = M + i * 4.05;
    card(s, x, 1.8, 3.83, 2.6, PAPER);
    numDot(s, x + 0.32, 2.08, it[0]);
    s.addText(it[1], { x: x + 0.32, y: 2.62, w: 3.2, h: 0.4, fontFace: JP, fontSize: 15.5, bold: true, color: INK, margin: 0, valign: "middle" });
    s.addText(it[2], { x: x + 0.32, y: 3.06, w: 3.2, h: 1.1, fontFace: JP, fontSize: 11.5, color: INK_MID, lineSpacing: 18, margin: 0 });
  });

  card(s, M, 4.7, CW, 1.45, AMBER_FILL);
  s.addText("だからヨルケアは、「書く負担を減らすこと」と「そのまま渡せる形にすること」だけに集中しています。", {
    x: M + 0.4, y: 4.9, w: CW - 0.8, h: 0.45, fontFace: JP, fontSize: 16, bold: true, color: "6B3D06", margin: 0, valign: "middle",
  });
  s.addText("毎日の入力は義務にしません。書けない日があっても、これまでの記録は減らず、いつでも再開できます。", {
    x: M + 0.4, y: 5.4, w: CW - 0.8, h: 0.45, fontFace: JP, fontSize: 12.5, color: "7A4A0C", margin: 0, valign: "middle",
  });

  note(s, 6.35, "※ ヨルケアは医療・緊急支援サービスではありません。診断・治療・危険度の判定は行いません。");
  s.addNotes("課題は3つ。記録が続かない、診察で伝えにくい、変化に気づけない。");
}

// =====================================================================
// 4. How it's used in a week
// =====================================================================
{
  const s = contentSlide("HOW IT'S USED", "アプリは、週の生活リズムの土台にあります", 4);

  card(s, M, 1.85, 4.0, 3.9, INDIGO_FILL);
  s.addText("毎日", { x: M + 0.35, y: 2.1, w: 3.3, h: 0.36, fontFace: JP, fontSize: 12, bold: true, color: INDIGO, margin: 0, valign: "middle" });
  s.addText("1〜2分", { x: M + 0.35, y: 2.46, w: 3.3, h: 0.7, fontFace: JP, fontSize: 34, bold: true, color: INDIGO, margin: 0, valign: "middle" });
  s.addText("アプリに記録する", { x: M + 0.35, y: 3.22, w: 3.3, h: 0.38, fontFace: JP, fontSize: 14, bold: true, color: INK, margin: 0, valign: "middle" });
  s.addText("気分／睡眠／お薬／しんどさのサイン／\nできたこと／メモ", {
    x: M + 0.35, y: 3.66, w: 3.35, h: 0.9, fontFace: JP, fontSize: 11.5, color: INK_MID, lineSpacing: 18, margin: 0,
  });
  s.addText("書けない日があっても大丈夫。\n積み重ねた日数は減りません。", {
    x: M + 0.35, y: 4.7, w: 3.35, h: 0.8, fontFace: JP, fontSize: 11.5, color: INDIGO, lineSpacing: 18, margin: 0,
  });

  const sess = [
    ["火・木　21:00", "夜の運動　20分", "セルフマッサージ／ストレッチ／呼吸法。\nカメラOFF可、座ったままでも参加できます。"],
    ["日曜　21:00", "疲労回復20分＋振り返り25分", "3名グループで、1人5分ずつ。今週の状態と、\n来週やってみるセルフケアを話します。"],
  ];
  sess.forEach((v, i) => {
    const y = 1.85 + i * 2.05;
    card(s, 4.85, y, 3.9, 1.85, PAPER);
    s.addText(v[0], { x: 5.15, y: y + 0.16, w: 3.3, h: 0.3, fontFace: JP, fontSize: 11, bold: true, color: AMBER_INK, margin: 0, valign: "middle" });
    s.addText(v[1], { x: 5.15, y: y + 0.48, w: 3.4, h: 0.38, fontFace: JP, fontSize: 14.5, bold: true, color: INK, margin: 0, valign: "middle" });
    s.addText(v[2], { x: 5.15, y: y + 0.9, w: 3.4, h: 0.8, fontFace: JP, fontSize: 11, color: INK_MID, lineSpacing: 17, margin: 0 });
  });

  card(s, 9.0, 1.85, 3.73, 3.9, AMBER_FILL);
  s.addText("記録と場が\nつながる", { x: 9.3, y: 2.1, w: 3.15, h: 0.9, fontFace: JP, fontSize: 19, bold: true, color: "6B3D06", lineSpacing: 28, margin: 0 });
  s.addText("日曜の振り返りは、最初の3分でアプリの記録を見ながら、話す内容を各自で整理します。", {
    x: 9.3, y: 3.1, w: 3.15, h: 1.1, fontFace: JP, fontSize: 12, color: "7A4A0C", lineSpacing: 19, margin: 0,
  });
  s.addText("うまく話すことも、深い悩みを話すことも求めません。自分の状態と次の行動を整理する時間です。", {
    x: 9.3, y: 4.3, w: 3.15, h: 1.2, fontFace: JP, fontSize: 12, color: "7A4A0C", lineSpacing: 19, margin: 0,
  });

  note(s, 6.0, "すべて参加した場合の目安は週約92〜99分。実践研究は21名・5か月で進めます。");
  s.addNotes("アプリ単体ではなく、週のプログラムとセットで使われます。");
}

// =====================================================================
// 5. Four screens
// =====================================================================
{
  const s = contentSlide("SCREENS", "画面は4つ。下のタブで行き来します", 5);

  const scr = [
    ["01", "書く", "今日から7日前までの記録を書く・書き直す。\n保存後は演出をはさまず、次にできることだけを案内します。"],
    ["02", "これまで", "直近の記録を一覧で確認。ファイルへの保存と復元、\n共有端末で使い終わったときの全削除もここから。"],
    ["03", "できること", "自分に効くセルフケアを登録しておく辞書。\n登録したものは記録画面から選べるようになります。"],
    ["04", "ふりかえり", "気分・睡眠・しんどさのサイン・できたことを期間別グラフで。\n期間の報告書もここで作ります。"],
  ];
  scr.forEach((v, i) => {
    const x = M + (i % 2) * 6.23;
    const y = 1.85 + Math.floor(i / 2) * 2.2;
    card(s, x, y, 5.9, 2.05, PAPER);
    numDot(s, x + 0.3, y + 0.28, v[0]);
    s.addText(v[1], { x: x + 0.92, y: y + 0.26, w: 4.6, h: 0.44, fontFace: JP, fontSize: 18, bold: true, color: INK, margin: 0, valign: "middle" });
    s.addText(v[2], { x: x + 0.3, y: y + 0.86, w: 5.3, h: 0.95, fontFace: JP, fontSize: 11.5, color: INK_MID, lineSpacing: 18, margin: 0 });
  });

  note(s, 6.35, "「相談先」は全画面共通のヘッダーからいつでも開けます。どのタブにいても同じ操作で届きます。");
  s.addNotes("4タブ構成。相談先だけは全画面共通のヘッダーに常設。");
}

// =====================================================================
// 6. Record items / custom input
// =====================================================================
{
  const s = contentSlide("RECORD", "記録項目は、本人が選んで増やせます", 6);

  s.addText("いつも表示される項目", { x: M, y: 1.85, w: 7.2, h: 0.34, fontFace: JP, fontSize: 12.5, bold: true, color: INK_SOFT, margin: 0, valign: "middle" });
  ["日付", "気分", "睡眠", "メモ"].forEach((t, i) => {
    chip(s, M + i * 1.72, 2.24, 1.58, t, INDIGO_FILL, INDIGO);
  });

  s.addText("表示するかを選べる項目", { x: M, y: 3.0, w: 7.2, h: 0.34, fontFace: JP, fontSize: 12.5, bold: true, color: INK_SOFT, margin: 0, valign: "middle" });
  const opt = ["お薬", "しんどさのサイン", "できたこと", "小さな目標", "自分メンテ", "くわしく書く"];
  opt.forEach((t, i) => {
    const x = M + (i % 3) * 2.42;
    const y = 3.39 + Math.floor(i / 3) * 0.64;
    chip(s, x, y, 2.28, t, PAPER, INK_MID);
  });

  card(s, M, 5.05, 7.3, 0.8, "F6F8FD");
  s.addText("主治医と相談しながら、治療方針に合わせて記録項目を足していけます。", {
    x: M + 0.32, y: 5.05, w: 6.7, h: 0.8, fontFace: JP, fontSize: 12.5, bold: true, color: INK, margin: 0, valign: "middle",
  });

  card(s, 8.2, 1.85, 4.53, 4.0, AMBER_FILL);
  s.addText("カスタム入力", { x: 8.55, y: 2.1, w: 3.9, h: 0.42, fontFace: JP, fontSize: 17, bold: true, color: "6B3D06", margin: 0, valign: "middle" });
  s.addText("記録画面に出す項目を、本人が選べる設定です。", {
    x: 8.55, y: 2.56, w: 3.9, h: 0.6, fontFace: JP, fontSize: 12, color: "7A4A0C", lineSpacing: 19, margin: 0,
  });
  s.addText(
    "「表示を消しても、これまでに残した記録は消えません。もう一度表示にすれば、また見られます。」",
    { x: 8.55, y: 3.2, w: 3.9, h: 1.0, fontFace: JP, fontSize: 12, italic: true, color: "6B3D06", lineSpacing: 19, margin: 0 }
  );
  s.addText(
    "「この設定はこの端末にだけ保存され、どこへも送信しません。」",
    { x: 8.55, y: 4.25, w: 3.9, h: 0.7, fontFace: JP, fontSize: 12, italic: true, color: "6B3D06", lineSpacing: 19, margin: 0 }
  );
  s.addText("― 実際の画面文言より", { x: 8.55, y: 5.05, w: 3.9, h: 0.34, fontFace: JP, fontSize: 10, color: "8A6320", margin: 0, valign: "middle" });

  note(s, 6.2, "画面に出す言葉は copy.ts に一本化し、技術用語や、体調を評価する言い回しを出さないようにしています。");
  s.addNotes("項目を減らせることが大事。調子が悪い日でも書ける量にできる。");
}

// =====================================================================
// 7. Review & report (native chart)
// =====================================================================
{
  const s = contentSlide("REVIEW & SHARE", "グラフで確かめ、そのまま渡せる文章にする", 7);

  s.addChart(
    pres.ChartType.line,
    [{
      name: "気分",
      labels: ["8/18", "8/19", "8/20", "8/21", "8/22", "8/23", "8/24"],
      values: [3, 2, 3, 4, 3, 5, 4],
    }],
    {
      x: M, y: 1.85, w: 6.15, h: 3.95,
      showTitle: true, title: "気分の推移（表示イメージ）", titleFontFace: JP, titleFontSize: 13, titleColor: INK,
      chartColors: [INDIGO], lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 8,
      showLegend: false,
      showValue: true, dataLabelPosition: "t", dataLabelFontFace: JP, dataLabelFontSize: 10, dataLabelColor: INK_MID,
      catAxisLabelFontFace: JP, catAxisLabelFontSize: 11, catAxisLabelColor: INK_SOFT,
      valAxisLabelFontFace: JP, valAxisLabelFontSize: 11, valAxisLabelColor: INK_SOFT,
      valAxisMinVal: 1, valAxisMaxVal: 5, valAxisMajorUnit: 1,
      valGridLine: { color: "E6EAF4", size: 1 }, catGridLine: { style: "none" },
      border: { pt: 0, color: "FFFFFF" }, fill: PAPER,
    }
  );

  card(s, 7.05, 1.85, 5.68, 3.95, CARD);
  s.addShape(RR, { x: 7.05, y: 1.85, w: 5.68, h: 3.95, rectRadius: 0.12, fill: { color: PAPER }, line: { color: "FFFFFF", width: 0 } });
  s.addText("期間の報告書", { x: 7.4, y: 2.1, w: 5.0, h: 0.44, fontFace: JP, fontSize: 18, bold: true, color: INK, margin: 0, valign: "middle" });
  s.addText("指定した期間の記録を数え、そのまま渡せる文章にします。", {
    x: 7.4, y: 2.56, w: 5.0, h: 0.36, fontFace: JP, fontSize: 12, color: INK_MID, margin: 0, valign: "middle",
  });

  const rep = [
    "記録した日数／気分の平均と幅",
    "睡眠時間の平均と、日による差",
    "できたことがあった日数",
    "コピーして、渡す相手は本人が選ぶ",
  ];
  rep.forEach((t, i) => {
    const y = 3.05 + i * 0.5;
    s.addShape(ELL, { x: 7.42, y: y + 0.15, w: 0.13, h: 0.13, fill: { color: AMBER }, line: { color: AMBER } });
    s.addText(t, { x: 7.68, y, w: 4.8, h: 0.42, fontFace: JP, fontSize: 12.5, color: INK, margin: 0, valign: "middle" });
  });

  s.addShape(RR, { x: 7.4, y: 4.98, w: 5.0, h: 0.72, rectRadius: 0.1, fill: { color: "FFFFFF" }, line: { color: "FFFFFF", width: 0 } });
  s.addText("お薬・しんどさのサイン・メモ・\nできることの名前は含みません。", {
    x: 7.62, y: 4.98, w: 4.6, h: 0.72, fontFace: JP, fontSize: 11.5, bold: true, color: INK_MID, lineSpacing: 17, margin: 0, valign: "middle",
  });

  note(s, 6.05, "数値はアプリが確定させ、評価・助言・診断の言葉は入れません。グラフは表示イメージで、実データは本人の端末内だけにあります。");
  s.addNotes("3分診療でも、1か月を思い出さずに渡せる状態にするのが狙い。");
}

// =====================================================================
// 8. Consultation links
// =====================================================================
{
  const s = contentSlide("SUPPORT LINKS", "どの画面からでも、公的な相談先へ", 8);

  const links = [
    ["1", "命や身体に差し迫った危険", "救急・消防 119 ／ 事件・事故 110"],
    ["2", "つらい気持ちを今すぐ話したい", "#いのちSOS ／ まもろうよ こころ（厚生労働省）"],
    ["3", "仕事や復職の悩み", "こころの耳（厚生労働省）の相談窓口"],
    ["4", "東京都内の地域相談", "区市町村を選ぶと、保健所・保健センターを住所と電話番号つきで表示"],
    ["5", "診断・治療・薬の相談", "主治医または医療機関へ"],
  ];
  links.forEach((v, i) => {
    const y = 1.88 + i * 0.79;
    s.addShape(RR, { x: M, y, w: 7.2, h: 0.7, rectRadius: 0.1, fill: { color: PAPER }, line: { color: "FFFFFF", width: 0 } });
    numDot(s, M + 0.2, y + 0.16, v[0], 0.38);
    s.addText(v[1], { x: M + 0.72, y: y + 0.05, w: 6.3, h: 0.34, fontFace: JP, fontSize: 13, bold: true, color: INK, margin: 0, valign: "middle" });
    s.addText(v[2], { x: M + 0.72, y: y + 0.36, w: 6.35, h: 0.3, fontFace: JP, fontSize: 10.5, color: INK_MID, margin: 0, valign: "middle" });
  });

  card(s, 8.1, 1.88, 4.63, 3.85, INDIGO_FILL);
  s.addText("データと、引かれている線", { x: 8.42, y: 2.12, w: 4.0, h: 0.42, fontFace: JP, fontSize: 15.5, bold: true, color: INDIGO, margin: 0, valign: "middle" });
  const bounds = [
    "東京都オープンデータの施設一覧をアプリに同梱（CC BY 4.0・出典を画面に表示）",
    "表示時に外部へ接続しないため、選んだ地域は誰にも伝わらない",
    "端末内の記録は読み取らず、危険度も判定しない",
    "現在地・位置情報は取得しない",
  ];
  bounds.forEach((t, i) => {
    const y = 2.66 + i * 0.75;
    s.addShape(ELL, { x: 8.45, y: y + 0.055, w: 0.13, h: 0.13, fill: { color: INDIGO }, line: { color: INDIGO } });
    s.addText(t, { x: 8.7, y, w: 3.85, h: 0.68, fontFace: JP, fontSize: 11.5, color: "2E2B93", lineSpacing: 17, margin: 0, valign: "top" });
  });

  note(s, 6.0, "電話番号と受付条件は変わることがあるため、最新は公式ページで確認するよう画面でも案内しています。");
  s.addNotes("緊急通報と一般相談を混ぜず、本人が状況に近いものを選ぶ設計。");
}

// =====================================================================
// 9. Data handling
// =====================================================================
{
  const s = contentSlide("DATA", "扱いを、3つの線で決めています", 9);

  const rules = [
    ["01", "記録は本人の端末内", "ログインなし。記録は使っている端末のブラウザにだけ残り、運営者も原則見ません。機種変更の前は、本人がファイルに保存して持ち運びます。", PAPER, INK, INK_MID],
    ["02", "匿名の利用状況だけ、任意で", "初期はOFF。同意した場合だけ「保存した」「画面を開いた」などを送ります。入力した記録の中身は送りません。端末IDは戻せない形に変換し、期限が来たものは自動で消します。", INDIGO_FILL, INDIGO, "2E2B93"],
    ["03", "アプリは判定しない", "診断・治療・危険度の推定はしません。リアルタイムの見守りもしません。気づいた本人が、自分で相談先を選ぶための材料を並べるだけです。", AMBER_FILL, "6B3D06", "7A4A0C"],
  ];
  rules.forEach((r, i) => {
    const x = M + i * 4.05;
    card(s, x, 1.8, 3.83, 3.05, r[3]);
    numDot(s, x + 0.32, 2.05, r[0]);
    s.addText(r[1], { x: x + 0.32, y: 2.58, w: 3.2, h: 0.44, fontFace: JP, fontSize: 15, bold: true, color: r[4], margin: 0, valign: "middle" });
    s.addText(r[2], { x: x + 0.32, y: 3.06, w: 3.24, h: 1.6, fontFace: JP, fontSize: 11.5, color: r[5], lineSpacing: 18, margin: 0 });
  });

  card(s, M, 5.15, CW, 1.1, "F6F8FD");
  s.addText("プロボノの皆さまにも、参加者ご本人の記録・個人情報に触れない範囲でのご協力をお願いしています。", {
    x: M + 0.4, y: 5.15, w: CW - 0.8, h: 1.1, fontFace: JP, fontSize: 14, bold: true, color: INK, margin: 0, valign: "middle",
  });

  note(s, 6.45, "匿名の利用状況は Neon Postgres に保存し、期限切れは日次で削除します。記録本文は入れません。");
  s.addNotes("健康情報を扱うからこそ、送らない・持たないを既定にしている。");
}

// =====================================================================
// 10. Tech & quality
// =====================================================================
{
  const s = contentSlide("TECH", "小さく作って、壊さずに変えられる構成", 10);

  card(s, M, 1.85, 6.15, 3.95, PAPER);
  s.addText("構成", { x: M + 0.35, y: 2.08, w: 5.4, h: 0.4, fontFace: JP, fontSize: 16, bold: true, color: INK, margin: 0, valign: "middle" });
  const tech = [
    ["画面", "Next.js 15（App Router）／React 19／TypeScript"],
    ["見た目", "Tailwind CSS ／ Radix UI ベースの部品"],
    ["データ検証", "Zod（端末内データのスキーマ検証）"],
    ["グラフ", "Recharts"],
    ["公開", "Vercel 無料枠／GitHub 連携で自動デプロイ"],
    ["匿名ログ", "Neon Postgres（記録本文は入れない）"],
  ];
  tech.forEach((t, i) => {
    const y = 2.58 + i * 0.53;
    s.addText(t[0], { x: M + 0.35, y, w: 1.35, h: 0.4, fontFace: JP, fontSize: 11, bold: true, color: AMBER_INK, margin: 0, valign: "middle" });
    s.addText(t[1], { x: M + 1.72, y, w: 4.3, h: 0.4, fontFace: JP, fontSize: 11.5, color: INK, margin: 0, valign: "middle" });
  });

  card(s, 7.05, 1.85, 5.68, 3.95, PAPER);
  s.addText("壊さないための仕組み", { x: 7.4, y: 2.08, w: 5.0, h: 0.4, fontFace: JP, fontSize: 16, bold: true, color: INK, margin: 0, valign: "middle" });
  const qa = [
    "Vitest の単体テスト44ファイル（睡眠計算・日付・スキーマ・バックアップ判定など）",
    "GitHub Actions で push・PR ごとに lint／テスト／ビルド",
    "実機チェックリストを Playwright で自動実行",
    "画面文言は copy.ts に一本化",
    "データ操作は repository.ts に集約し、将来の差し替えに備える",
  ];
  qa.forEach((t, i) => {
    const y = 2.6 + i * 0.62;
    s.addShape(ELL, { x: 7.42, y: y + 0.055, w: 0.13, h: 0.13, fill: { color: AMBER }, line: { color: AMBER } });
    s.addText(t, { x: 7.68, y, w: 4.85, h: 0.56, fontFace: JP, fontSize: 11.5, color: INK, lineSpacing: 17, margin: 0, valign: "top" });
  });

  note(s, 6.05, "いま動いている範囲は、追加費用0円（Vercel・Neon の無料枠）で運用しています。");
  s.addNotes("個人開発でも壊れないように、自動チェックを厚めにしている。");
}

// =====================================================================
// 11. Roadmap
// =====================================================================
{
  const s = contentSlide("ROADMAP", "いまは Phase 1。次に進むかは、使われ方を見て決めます", 11);

  const ph = [
    ["NOW", "いまできていること", ["記録・編集（直近7日）", "期間別グラフ", "期間の報告書", "相談先の常設導線", "ファイル保存・復元", "任意同意の匿名計測"], AMBER_FILL, "6B3D06", "7A4A0C"],
    ["NEXT", "これから確かめること", ["初週の複数日記録率", "Week 2 継続率", "Week 4 継続率", "端末を変えたときに離脱が起きるか"], PAPER, INK, INK_MID],
    ["GATE", "その先の判断", ["続く形だと確認できた場合にだけ、アカウントとクラウド保存の検討へ進む", "確認できるまでは、記録本文をクラウドに置かない"], INDIGO_FILL, INDIGO, "2E2B93"],
  ];
  ph.forEach((p, i) => {
    const x = M + i * 4.05;
    card(s, x, 1.85, 3.83, 3.6, p[3]);
    s.addText(p[0], { x: x + 0.32, y: 2.08, w: 3.2, h: 0.32, fontFace: "Calibri", fontSize: 11, bold: true, color: p[4], charSpacing: 2, margin: 0, valign: "middle" });
    s.addText(p[1], { x: x + 0.32, y: 2.44, w: 3.2, h: 0.44, fontFace: JP, fontSize: 15.5, bold: true, color: p[4], margin: 0, valign: "middle" });
    p[2].forEach((t, k) => {
      const y = 2.98 + k * (p[2].length > 4 ? 0.38 : 0.5);
      s.addShape(ELL, { x: x + 0.34, y: y + 0.055, w: 0.11, h: 0.11, fill: { color: p[4] }, line: { color: p[4] } });
      s.addText(t, { x: x + 0.56, y, w: 3.0, h: p[2].length > 4 ? 0.34 : 0.46, fontFace: JP, fontSize: 11, color: p[5], lineSpacing: 16, margin: 0, valign: "top" });
    });
  });

  card(s, M, 5.7, CW, 0.95, "F6F8FD");
  s.addText("機能を足す前に、「続くかどうか」を先に確かめる。段階を分けて、確認できた分だけ進めます。", {
    x: M + 0.4, y: 5.7, w: CW - 0.8, h: 0.95, fontFace: JP, fontSize: 13.5, bold: true, color: INK, margin: 0, valign: "middle",
  });

  s.addNotes("Gate方式。継続が確認できるまでクラウド保存には進まない。");
}

// =====================================================================
// 12. To pro bono
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: NAVY };

  s.addShape(ELL, { x: M, y: 0.87, w: 0.15, h: 0.15, fill: { color: AMBER }, line: { color: AMBER } });
  s.addText("FOR PRO BONO", {
    x: M + 0.27, y: 0.75, w: 6, h: 0.32, fontFace: "Calibri", fontSize: 12, bold: true, color: AMBER, charSpacing: 3, margin: 0, valign: "middle",
  });
  s.addText("見ていただきたいのは、この3つです", {
    x: M - 0.04, y: 1.18, w: CW, h: 0.7, fontFace: JP, fontSize: 30, bold: true, color: "FFFFFF", margin: 0, valign: "middle",
  });

  const asks = [
    ["01", "続く形になっているか", "書く負担、言葉の選び方、画面の流れ。\n調子が悪い日でも開けるかどうか。"],
    ["02", "安全の線引き", "端末内保存のまま進めるか、どこから\n守りを足すか。過不足の判断。"],
    ["03", "確かめ方", "「続いた」と言うために、何をどう\n数えるか。記録の取り方と指標。"],
  ];
  asks.forEach((a, i) => {
    const x = M + i * 4.05;
    s.addShape(RR, { x, y: 2.15, w: 3.83, h: 2.35, rectRadius: 0.12, fill: { color: NAVY_SOFT }, line: { color: "FFFFFF", width: 0 } });
    numDot(s, x + 0.32, 2.42, a[0]);
    s.addText(a[1], { x: x + 0.32, y: 2.96, w: 3.2, h: 0.44, fontFace: JP, fontSize: 15.5, bold: true, color: "FFFFFF", margin: 0, valign: "middle" });
    s.addText(a[2], { x: x + 0.32, y: 3.44, w: 3.24, h: 0.9, fontFace: JP, fontSize: 11.5, color: BAND_SOFT, lineSpacing: 18, margin: 0 });
  });

  s.addText("関わり方", { x: M, y: 4.75, w: 2, h: 0.34, fontFace: JP, fontSize: 12, bold: true, color: AMBER, margin: 0, valign: "middle" });
  s.addText(
    "オンライン中心　|　単発1回の壁打ちだけでも歓迎です　|　NDA対応可　|　実装は当方で行うので、手を動かしていただくことは前提にしません　|　参加者ご本人の記録・個人情報には触れない範囲でお願いします",
    { x: M, y: 5.1, w: CW, h: 0.75, fontFace: JP, fontSize: 12, color: BAND_INK, lineSpacing: 20, margin: 0 }
  );

  s.addText("ヨルケア", { x: M, y: 6.1, w: 6, h: 0.34, fontFace: JP, fontSize: 13, bold: true, color: "FFFFFF", margin: 0, valign: "middle" });
  s.addText("担当：熊谷祐希　問い合わせ先：gmpm1001@gmail.com", { x: M, y: 6.45, w: 6.5, h: 0.34, fontFace: JP, fontSize: 12, color: BAND_SOFT, margin: 0, valign: "middle" });
  s.addText("アプリ試作　yorucare.vercel.app", { x: W - M - 5, y: 6.1, w: 5, h: 0.34, fontFace: JP, fontSize: 12.5, bold: true, color: AMBER, align: "right", margin: 0, valign: "middle" });
  s.addText("※ ヨルケアは医療・緊急支援サービスではありません。", { x: W - M - 6, y: 6.45, w: 6, h: 0.34, fontFace: JP, fontSize: 11, color: "8891B1", align: "right", margin: 0, valign: "middle" });

  s.addNotes("アプリ側で見てほしい観点は3つ。単発でも歓迎であることを伝える。");
}

pres.writeFile({ fileName: "ヨルケア_アプリのご説明_プロボノ向け.pptx" })
  .then((f) => console.log("written:", f));
