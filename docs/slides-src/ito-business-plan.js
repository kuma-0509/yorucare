const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";              // 13.333 x 7.5
pres.author = "株式会社mimococo";
pres.title  = "ヨルケア事業化プラン ご相談・ご承認のお願い";

/* ===== パレット（ヨルケア既存資料の夜色を踏襲） =====
   navy が支配色。gold は「今日お願いする一点」だけに使う（連動）。 */
const NAVY_D = "0B1026";  // 表紙・結論の地
const NAVY   = "1A2148";  // 見出し文字
const INDIGO = "4C56B8";  // 支援・補助の色
const GOLD   = "B8860B";  // 明るい地の上のゴールド
const GOLD_L = "FCD34D";  // 暗い地の上のゴールド
const INK    = "1A2148";
const MUTED  = "5A6382";
const TINT   = "F2F4FB";  // カードの地
const LINE   = "D9DDEE";
const WHITE  = "FFFFFF";
const GRAY_B = "C8CDDF";  // 空白（支援なし）を表すグレー

const F = "Meiryo";
const W = 13.333, H = 7.5, M = 0.7;

/* ===== 部品 ===== */
function lightSlide() {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  return s;
}
function darkSlide() {
  const s = pres.addSlide();
  s.background = { color: NAVY_D };
  return s;
}
// Q（問い）を小さく、A（答え）を大きく。全スライドで同じ位置＝連動
function head(s, q, a, dark) {
  s.addText("Q.  " + q, {
    x: M, y: 0.55, w: W - M * 2, h: 0.32, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 13, bold: true, color: dark ? GOLD_L : INDIGO, charSpacing: 1,
  });
  s.addText(a, {
    x: M, y: 0.90, w: W - M * 2, h: 1.15, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 30, bold: true, color: dark ? WHITE : NAVY, lineSpacing: 40,
  });
}
function note(s, text, y) {
  s.addText(text, {
    x: M, y: y, w: W - M * 2, h: 0.34, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 11, color: MUTED, lineSpacing: 16,
  });
}
// カード（縁取りの矩形。差し色は意味のあるものだけ）
function card(s, o) {
  s.addShape(pres.ShapeType.roundRect, {
    x: o.x, y: o.y, w: o.w, h: o.h, rectRadius: 0.08,
    fill: { color: o.fill || TINT },
    line: { color: o.line || LINE, width: 1 },
  });
}
function label(s, o) {
  s.addText(o.text, {
    x: o.x, y: o.y, w: o.w, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 12, bold: true, color: o.color || INDIGO,
  });
}
function body(s, o) {
  s.addText(o.text, {
    x: o.x, y: o.y, w: o.w, h: o.h, isTextBox: true, margin: 0,
    fontFace: F, fontSize: o.size || 13, color: o.color || INK, lineSpacing: o.ls || 22,
    bold: !!o.bold, valign: "top",
  });
}
function bullets(s, o) {
  const items = o.items.map((t, i) => ({
    text: t, options: { bullet: true, breakLine: i !== o.items.length - 1 },
  }));
  s.addText(items, {
    x: o.x, y: o.y, w: o.w, h: o.h, isTextBox: true, margin: 0,
    fontFace: F, fontSize: o.size || 13, color: o.color || INK,
    paraSpaceAfter: 6, lineSpacing: 20,
  });
}
function stat(s, o) {
  s.addText(o.num, {
    x: o.x, y: o.y, w: o.w, h: 0.85, isTextBox: true, margin: 0,
    fontFace: F, fontSize: o.size || 44, bold: true, color: o.color || NAVY, align: o.align || "left",
  });
  s.addText(o.label, {
    x: o.x, y: o.y + 0.82, w: o.w, h: 0.36, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 11, color: MUTED, align: o.align || "left", lineSpacing: 15,
  });
}
function pageNo(s, n) {
  s.addText(String(n), {
    x: W - M - 0.6, y: H - 0.80, w: 0.6, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 10, color: MUTED, align: "right",
  });
}

/* ============ S1 表紙 ============ */
{
  const s = darkSlide();
  s.addText("2026年9月5日   株式会社mimococo 伊藤さま", {
    x: M, y: 1.5, w: W - M * 2, h: 0.34, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 13, color: GOLD_L, charSpacing: 1,
  });
  s.addText("ヨルケア事業化プラン\nご相談・ご承認のお願い", {
    x: M, y: 2.0, w: W - M * 2, h: 1.9, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 40, bold: true, color: WHITE, lineSpacing: 56,
  });
  s.addText("復職後の夜間・休日オンラインケアを、企業に届く形へ", {
    x: M, y: 4.05, w: W - M * 2, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 16, color: "B9C0DC",
  });
  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 4.95, w: 5.0, h: 0.62, rectRadius: 0.1,
    fill: { color: "17204A" }, line: { color: "3A4478", width: 1 },
  });
  s.addText("今日のお願いは、1つだけです", {
    x: M + 0.28, y: 5.06, w: 4.5, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 15, bold: true, color: GOLD_L,
  });
  s.addText("所要 15〜20分（質疑込み）／参照：docs/business-plan-return-to-work.md", {
    x: M, y: 6.5, w: W - M * 2, h: 0.34, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 10, color: "8A93B8",
  });
  s.addNotes("時間をもらったお礼から入る。結論を先に置く。ゴールは細部を固めることではなく、試運転の合意ひとつ。");
}

/* ============ S2 今日お願いしたいこと（結論ファースト） ============ */
{
  const s = darkSlide();
  head(s, "今日お願いしたいことは、何か？", "まずは1か月、試運転を一緒に", true);
  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 2.15, w: W - M * 2, h: 1.35, rectRadius: 0.1,
    fill: { color: "17204A" }, line: { color: GOLD_L, width: 2 },
  });
  s.addText("最少3名・1か月。ここだけ、お返事をいただけたら十分です。", {
    x: M + 0.35, y: 2.55, w: W - M * 2 - 0.7, h: 0.6, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 21, bold: true, color: WHITE,
  });
  s.addText("今日、決めないこと", {
    x: M, y: 3.85, w: 4.0, h: 0.32, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 13, bold: true, color: "8A93B8",
  });
  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 4.28, w: W - M * 2, h: 0.78, rectRadius: 0.08,
    fill: { color: "141B3C" }, line: { color: "343D6E", width: 1 },
  });
  s.addText("役割分担と稼働の細部（全12項目）は、これから一緒に決めていきます", {
    x: M + 0.3, y: 4.48, w: W - M * 2 - 0.6, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 13, color: "C3C9E4",
  });
  s.addText("必要なタイミングで、そのつどご相談させてください。", {
    x: M, y: 5.4, w: W - M * 2, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 11, color: "8A93B8",
  });
  pageNo(s, 2);
  s.addNotes("結論から言う。今日のゴールはこの1点だけで、それ以上は求めないと明言する。");
}

/* ============ S3 支援が薄いのはどこか（週の帯） ============ */
{
  const s = lightSlide();
  head(s, "支援が薄いのは、どこか？", "支援が途切れるのは、平日の夜と土日祝", false);

  const days = ["月", "火", "水", "木", "金", "土", "日"];
  const gx = M + 1.45, gw = (W - M * 2 - 1.45), cw = gw / 7 - 0.12;
  days.forEach((d, i) => {
    s.addText(d, {
      x: gx + i * (gw / 7), y: 2.12, w: cw, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 12, bold: true, color: MUTED, align: "center",
    });
  });
  // 行1：平日の日中＝支援あり
  s.addText("日中\n（通勤・勤務）", {
    x: M, y: 2.55, w: 1.3, h: 0.7, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 11, bold: true, color: INK, lineSpacing: 16,
  });
  // 行2：夜・休日＝空白
  s.addText("夜間・休日\n（帰宅後／土日祝）", {
    x: M, y: 3.55, w: 1.35, h: 0.7, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 11, bold: true, color: INK, lineSpacing: 16,
  });
  days.forEach((d, i) => {
    const x = gx + i * (gw / 7);
    const weekend = i >= 5;
    // 日中
    s.addShape(pres.ShapeType.roundRect, {
      x: x, y: 2.5, w: cw, h: 0.82, rectRadius: 0.06,
      fill: { color: weekend ? GRAY_B : INDIGO }, line: { color: weekend ? GRAY_B : INDIGO, width: 1 },
    });
    s.addText(weekend ? "空白" : "支援あり", {
      x: x, y: 2.75, w: cw, h: 0.32, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 11, bold: true, color: weekend ? "5A6382" : WHITE, align: "center",
    });
    // 夜・休日（すべて空白）
    s.addShape(pres.ShapeType.roundRect, {
      x: x, y: 3.5, w: cw, h: 0.82, rectRadius: 0.06,
      fill: { color: GRAY_B }, line: { color: GRAY_B, width: 1 },
    });
    s.addText("空白", {
      x: x, y: 3.75, w: cw, h: 0.32, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 11, bold: true, color: "5A6382", align: "center",
    });
  });
  s.addText("この帯の、グレーの部分がヨルケアの持ち場です。", {
    x: M, y: 4.65, w: W - M * 2, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 15, bold: true, color: NAVY,
  });
  body(s, {
    x: M, y: 5.15, w: W - M * 2, h: 0.9,
    text: "通勤や業務そのものは、緊張感で乗り切れることが多い。落ちるのは、帰宅後の夜間と土日祝でした。",
    size: 13,
  });
  note(s, "※これまでのヒアリングから見えた傾向を図にしたものです（実測データではありません）。", 6.28);
  pageNo(s, 3);
  s.addNotes("支援の空白を、曜日と時間帯という見える形にする。ここを埋めることがヨルケアの役割。");
}

/* ============ S4 そこで何が起きているか（2つの声） ============ */
{
  const s = lightSlide();
  head(s, "そこで何が起きているのか？", "「週末で回復しても月曜が怖い」が、再休職の入口になる", false);
  const cw2 = (W - M * 2 - 0.45) / 2;
  const voices = [
    { t: "復職された方の声", q: "「週末で回復しても、月曜が怖い」",
      b: "通勤や業務は緊張感で乗り切れる。一方で、帰宅後の夜間や土日祝に気力・体力が一気に落ちる。この状態が続くと、再休職のきっかけになりやすい。" },
    { t: "支援員さんの声", q: "「復職後1〜2か月で、体調記録が途切れる」",
      b: "記録が途切れた頃に不調が出る。けれど面談は、仕事の確認で精一杯。夜間や休日の様子までは、手が回らない。" },
  ];
  voices.forEach((v, i) => {
    const x = M + i * (cw2 + 0.45);
    card(s, { x: x, y: 2.2, w: cw2, h: 2.9 });
    label(s, { x: x + 0.35, y: 2.48, w: cw2 - 0.7, text: v.t });
    body(s, { x: x + 0.35, y: 2.88, w: cw2 - 0.7, h: 0.75, text: v.q, size: 17, bold: true, color: NAVY, ls: 26 });
    body(s, { x: x + 0.35, y: 3.78, w: cw2 - 0.7, h: 1.15, text: v.b, size: 12.5, ls: 21 });
  });
  s.addText("支援が薄いのは平日夜間・土日祝。ここを埋めることが、ヨルケアが役に立てる場所です。", {
    x: M, y: 5.45, w: W - M * 2, h: 0.45, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 15, bold: true, color: NAVY,
  });
  note(s, "出典：これまでのヒアリング（復職された方・支援員の方）", 6.15);
  pageNo(s, 4);
  s.addNotes("当事者と支援者、別の立場の声が同じ穴を指していることを見せる。");
}

/* ============ S5 全体の道筋（タイムライン） ============ */
{
  const s = lightSlide();
  head(s, "どういう順番で育てるのか？", "3名の試運転から始めて、2028年3月に企業1社の受注まで運ぶ", false);
  const steps = [
    { n: "1", t: "試運転", d: "1か月・最少3名", gold: true },
    { n: "2", t: "振り返り", d: "ブラッシュアップ" },
    { n: "3", t: "無料モニター本編", d: "5か月・21名" },
    { n: "4", t: "エビデンスづくり", d: "参加者の変化・完走率" },
    { n: "5", t: "個人会員の募集", d: "1か月" },
    { n: "6", t: "個人向けサービス開始", d: "月5,000円" },
    { n: "7", t: "企業・支援機関へ営業", d: "2027年7月ごろ〜" },
    { n: "8", t: "企業から試験導入を受注", d: "2028年3月まで" },
  ];
  const bw = (W - M * 2 - 0.3 * 3) / 4;
  steps.forEach((st, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = M + col * (bw + 0.3), y = 2.2 + row * 1.75;
    card(s, { x: x, y: y, w: bw, h: 1.45, fill: st.gold ? "FFF7E0" : TINT, line: st.gold ? GOLD : LINE });
    s.addShape(pres.ShapeType.ellipse, {
      x: x + 0.25, y: y + 0.25, w: 0.42, h: 0.42,
      fill: { color: st.gold ? GOLD : NAVY }, line: { color: st.gold ? GOLD : NAVY, width: 1 },
    });
    s.addText(st.n, {
      x: x + 0.25, y: y + 0.31, w: 0.42, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 12, bold: true, color: WHITE, align: "center",
    });
    body(s, { x: x + 0.25, y: y + 0.74, w: bw - 0.5, h: 0.30, text: st.t, size: 13.5, bold: true, color: NAVY });
    body(s, { x: x + 0.25, y: y + 1.06, w: bw - 0.5, h: 0.32, text: st.d, size: 11, color: MUTED });
  });
  s.addText("今日ご相談しているのは、1つめのマスだけです。", {
    x: M, y: 5.85, w: 6.5, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 15, bold: true, color: GOLD,
  });
  note(s, "企業への営業は、エビデンスと個人会員という実績ができてから始める設計。地ならしの期間がない分、受注までの期間は長めに見ています。", 6.28);
  pageNo(s, 5);
  s.addNotes("消える口頭の順序を、1本の線として目に残す。今日の話は最初の1マスだけ、と繰り返す。");
}

/* ============ S6 なぜ試運転から ============ */
{
  const s = lightSlide();
  head(s, "なぜ、いきなり本編ではないのか？", "最少3名で進行と安全対応を確かめてから、21名に進む", false);
  card(s, { x: M, y: 2.2, w: 5.6, h: 2.85, fill: "FFF7E0", line: GOLD });
  label(s, { x: M + 0.35, y: 2.48, w: 5.0, text: "試運転（1か月・最少3名）", color: GOLD });
  body(s, { x: M + 0.35, y: 2.88, w: 5.0, h: 0.35, text: "ここで確かめること", size: 12.5, bold: true, color: NAVY });
  bullets(s, {
    x: M + 0.35, y: 3.25, w: 5.0, h: 1.5,
    items: ["進行のしかた（火・木の夜／日曜）", "アプリの入力項目が実際に使えるか", "安全対応が、実際にどう動くか"],
    size: 12.5,
  });
  s.addShape(pres.ShapeType.rightArrow, {
    x: 6.5, y: 3.35, w: 0.62, h: 0.42, fill: { color: GRAY_B }, line: { color: GRAY_B, width: 1 },
  });
  card(s, { x: 7.35, y: 2.2, w: 5.25, h: 2.85 });
  label(s, { x: 7.7, y: 2.48, w: 4.6, text: "無料モニター本編（5か月・21名）" });
  body(s, {
    x: 7.7, y: 2.9, w: 4.55, h: 1.9, size: 12.5, ls: 21,
    text: "試運転で直したものを持って、本編に進みます。いきなり21名で走り出すと、進行の詰まりも安全対応の穴も、参加者の負担として出てしまう。まずは小さく確かめさせてください。",
  });
  pageNo(s, 6);
  s.addNotes("ここは伊藤さんにも一緒に体験してほしい部分だと伝える。");
}

/* ============ S7 なぜ企業受注をゴールにするか ============ */
{
  const s = lightSlide();
  head(s, "なぜ企業受注をゴールにするのか？", "個人向けは実績づくり。企業受注は、同じ稼働で約7倍の単価", false);
  const cw3 = 3.71;   // 3枚 + 余白0.4 x2 が W-M*2 にちょうど収まる幅
  // 個人向け
  card(s, { x: M, y: 2.2, w: cw3, h: 3.1 });
  label(s, { x: M + 0.35, y: 2.45, w: cw3 - 0.7, text: "個人向け", color: MUTED });
  stat(s, { x: M + 0.35, y: 2.8, w: cw3 - 0.7, num: "月5,000円", size: 26, color: MUTED,
            label: "21名が満席のとき" });
  body(s, {
    x: M + 0.35, y: 4.1, w: cw3 - 0.7, h: 1.0, size: 12.5, ls: 21,
    text: "満席の21名でも、二人分の人件費は出ません。ここで稼ぐ設計にはしていません。",
  });
  // 企業向け
  card(s, { x: M + cw3 + 0.4, y: 2.2, w: cw3, h: 3.1, fill: "EEF0FA", line: INDIGO });
  label(s, { x: M + cw3 + 0.75, y: 2.45, w: cw3 - 0.7, text: "企業向け（本命）", color: INDIGO });
  stat(s, { x: M + cw3 + 0.75, y: 2.8, w: cw3 - 0.7, num: "月3〜5万円", size: 26, color: NAVY,
            label: "1人あたり × 3〜6か月" });
  body(s, {
    x: M + cw3 + 0.75, y: 4.1, w: cw3 - 0.7, h: 1.0, size: 12.5, ls: 21,
    text: "復職後3〜6か月のサポートとして、企業から受注する。同じ稼働で単価が変わります。",
  });
  // 倍率
  card(s, { x: M + (cw3 + 0.4) * 2, y: 2.2, w: cw3, h: 3.1, fill: NAVY_D, line: NAVY_D });
  s.addText("約7倍", {
    x: M + (cw3 + 0.4) * 2 + 0.3, y: 3.2, w: cw3 - 0.6, h: 0.9, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 40, bold: true, color: GOLD_L, align: "center",
  });
  s.addText("同じ稼働あたりの単価", {
    x: M + (cw3 + 0.4) * 2 + 0.3, y: 4.15, w: cw3 - 0.6, h: 0.35, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 11, color: "B9C0DC", align: "center",
  });
  body(s, {
    x: M, y: 5.6, w: W - M * 2, h: 0.6, size: 13, bold: true, color: NAVY,
    text: "個人有料版の役割は「お金を払ってでも続けたい人がいる」という実績づくりです。",
  });
  note(s, "出典：事業計画（docs/business-plan-return-to-work.md）", 6.28);
  pageNo(s, 7);
  s.addNotes("稼げないから意味がない、ではなく、実績づくりという役割がある、と説明する。");
}

/* ============ S8 企業に何を見せるか ============ */
{
  const s = lightSlide();
  head(s, "企業には、何を見せるのか？", "症状スコアではなく「休まずに働き続けられたか」", false);
  const cw4 = (W - M * 2 - 0.45) / 2;
  card(s, { x: M, y: 2.2, w: cw4, h: 2.95, fill: "EEF0FA", line: INDIGO });
  label(s, { x: M + 0.35, y: 2.48, w: cw4 - 0.7, text: "主役にする指標" });
  bullets(s, {
    x: M + 0.35, y: 2.92, w: cw4 - 0.7, h: 1.25,
    items: ["勤怠（休まずに働き続けられたか）", "仕事のパフォーマンス", "活力"], size: 14,
  });
  body(s, { x: M + 0.35, y: 4.35, w: cw4 - 0.7, h: 0.7, size: 12, color: MUTED,
            text: "企業が見ているのは、症状の点数ではなく、働き続けられたかどうか。" });
  card(s, { x: M + cw4 + 0.45, y: 2.2, w: cw4, h: 2.95 });
  label(s, { x: M + cw4 + 0.8, y: 2.48, w: cw4 - 0.7, text: "書き方は、誠実に", color: MUTED });
  bullets(s, {
    x: M + cw4 + 0.8, y: 2.92, w: cw4 - 0.7, h: 1.25,
    items: ["「効果があった」とは書かない", "「参加者の変化」までを出す", "「完走率」までを参考データとして出す"], size: 14,
  });
  body(s, { x: M + cw4 + 0.8, y: 4.35, w: cw4 - 0.7, h: 0.7, size: 12, color: MUTED,
            text: "言い切らないことが、結果として企業に信用される見せ方だと考えています。" });
  card(s, { x: M, y: 5.4, w: W - M * 2, h: 1.0, fill: TINT, line: LINE });
  body(s, {
    x: M + 0.35, y: 5.6, w: W - M * 2 - 0.7, h: 0.65, size: 12.5, ls: 21, color: INK,
    text: "対象は、休職から復職して働いている方です。企業には、再休職1件あたりの損失を自社で試算していただいたうえで、復職後3〜6か月の夜間・休日サポートとして提案します。",
  });
  pageNo(s, 8);
  s.addNotes("誠実な見せ方にしている理由を言う。対象は休職から復職した働く方で、障がい福祉サービスの枠ではない。");
}

/* ============ S9 伊藤さんへのお願い（本題） ============ */
{
  const s = lightSlide();
  head(s, "伊藤さんに、何をお願いしたいのか？", "夜の運動と疲労回復、そして個人向けが始まってからの接点づくり", false);
  const cw5 = (W - M * 2 - 0.45) / 2;
  // ① 今から
  card(s, { x: M, y: 2.2, w: cw5, h: 2.75, fill: "FFF7E0", line: GOLD });
  label(s, { x: M + 0.35, y: 2.45, w: cw5 - 0.7, text: "① 今から（試運転から）", color: GOLD });
  body(s, { x: M + 0.35, y: 2.85, w: cw5 - 0.7, h: 0.75, size: 18, bold: true, color: NAVY, ls: 26,
            text: "火・木の夜運動と\n日曜の疲労回復パート" });
  body(s, { x: M + 0.35, y: 3.9, w: cw5 - 0.7, h: 0.85, size: 12.5, ls: 21,
            text: "運動指導の専門性は、伊藤さんにしかない部分です。ここは一緒にやっていきたいです。" });
  // ② 後から
  card(s, { x: M + cw5 + 0.45, y: 2.2, w: cw5, h: 2.75 });
  label(s, { x: M + cw5 + 0.8, y: 2.45, w: cw5 - 0.7, text: "② 2027年7月ごろから" });
  body(s, { x: M + cw5 + 0.8, y: 2.85, w: cw5 - 0.7, h: 0.75, size: 18, bold: true, color: NAVY, ls: 26,
            text: "企業・支援機関への\n接点づくり" });
  body(s, { x: M + cw5 + 0.8, y: 3.9, w: cw5 - 0.7, h: 0.85, size: 12.5, ls: 21,
            text: "既存の6法人・137事業所との関係、支援機関へのパイプは一番の武器です。私も一緒に動きます。" });
  card(s, { x: M, y: 5.25, w: W - M * 2, h: 0.85, fill: "EEF0FA", line: "C9CFEA" });
  body(s, {
    x: M + 0.35, y: 5.53, w: W - M * 2 - 0.7, h: 0.35, size: 13, ls: 20, color: INK,
    text: "法人営業は、個人向け有料サービスが始まってから始めます。",
  });
  pageNo(s, 9);
  s.addNotes("お願いを『今から』と『後から』に分けて、時間差を見せる。役割分担は今日決め切るものではない、と添える。");
}

/* ============ S10 負担はどれくらいか ============ */
{
  const s = lightSlide();
  head(s, "伊藤さんの負担は、どれくらいか？", "21名の本編でも週2時間。試運転は、もっと小さい", false);
  card(s, { x: M, y: 2.2, w: 3.9, h: 2.5, fill: NAVY_D, line: NAVY_D });
  s.addText("週 約2時間", {
    x: M + 0.3, y: 3.0, w: 3.3, h: 0.85, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 34, bold: true, color: WHITE, align: "center",
  });
  s.addText("本編（21名）のとき", {
    x: M + 0.3, y: 3.9, w: 3.3, h: 0.35, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 11, color: "B9C0DC", align: "center",
  });
  const rows = [
    { t: "内訳", d: "火・木の夜運動 ＋ 日曜の疲労回復パート" },
    { t: "営業活動", d: "個人向けサービスが始まってから発生します（2027年7月ごろ〜）" },
    { t: "試運転（1か月・3名）", d: "この2時間よりも、ずっと小さい規模から始まります" },
  ];
  rows.forEach((r, i) => {
    const y = 2.2 + i * 0.87;
    card(s, { x: 5.0, y: y, w: W - M - 5.0, h: 0.76 });
    body(s, { x: 5.3, y: y + 0.13, w: 2.5, h: 0.3, text: r.t, size: 12.5, bold: true, color: INDIGO });
    body(s, { x: 7.9, y: y + 0.13, w: W - M - 8.2, h: 0.5, text: r.d, size: 12, ls: 18 });
  });
  body(s, {
    x: M, y: 5.1, w: W - M * 2, h: 0.6, size: 13, bold: true, color: NAVY,
    text: "私の方は、日曜の振り返り進行と、アプリ・アンケート・データまわりの運営、そして営業の接点づくりを担当します。",
  });
  note(s, "※週の目安は21名時の想定です。実際の稼働は、試運転の振り返りで一緒に見直します。", 5.85);
  pageNo(s, 10);
  s.addNotes("負担への不安に先回りして答える。試運転はもっと小さいことを強調する。");
}

/* ============ S11 今日決めないこと（12項目） ============ */
{
  const s = lightSlide();
  head(s, "今日、決めないことは何か？", "12項目は今日決めません。これから一緒に決めていきます", false);
  const items = [
    "ゴールと期限", "モニターの期間", "役割分担と稼働の目安",
    "精神科医・安全責任者の役割範囲", "測る指標", "参加者情報の扱い",
    "続ける・やめるの判断基準", "判断する場をいつ持つか", "ほか（全12項目）",
  ];
  const bw2 = (W - M * 2 - 0.3 * 3) / 4;
  items.forEach((t, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = M + col * (bw2 + 0.3), y = 2.2 + row * 0.86;
    card(s, { x: x, y: y, w: bw2, h: 0.74 });
    body(s, { x: x + 0.22, y: y + 0.14, w: bw2 - 0.44, h: 0.5, text: t, size: 11.5, ls: 17 });
  });
  card(s, { x: M, y: 5.1, w: W - M * 2, h: 1.0, fill: "EEF0FA", line: "C9CFEA" });
  body(s, {
    x: M + 0.35, y: 5.33, w: W - M * 2 - 0.7, h: 0.6, size: 12.5, ls: 20,
    text: "月末の定例ミーティングのような形は決めません。細かい項目は、必要なタイミングでそのつどご相談させてください。",
  });
  pageNo(s, 11);
  s.addNotes("決め切ってはいけないと思っている、という言い方をする。即答も期限も求めない。");
}

/* ============ S12 先に伝えておきたい心配 ============ */
{
  const s = lightSlide();
  head(s, "先に伝えておきたい心配は？", "地ならしなしで営業を始めるので、2028年3月は確約できない", false);
  const cw6 = (W - M * 2 - 0.45) / 2;
  card(s, { x: M, y: 2.2, w: cw6, h: 2.7 });
  label(s, { x: M + 0.35, y: 2.48, w: cw6 - 0.7, text: "① アンケート・データの管理" });
  body(s, { x: M + 0.35, y: 2.9, w: cw6 - 0.7, h: 0.5, size: 17, bold: true, color: NAVY, text: "私が担当します" });
  body(s, { x: M + 0.35, y: 3.55, w: cw6 - 0.7, h: 1.05, size: 12.5, ls: 21,
            text: "参加者情報の扱いは、これから一緒に決める12項目のひとつとして、改めてご相談させてください。" });
  card(s, { x: M + cw6 + 0.45, y: 2.2, w: cw6, h: 2.7, fill: "FFF7E0", line: GOLD });
  label(s, { x: M + cw6 + 0.8, y: 2.48, w: cw6 - 0.7, text: "② 法人営業のスケジュール", color: GOLD });
  body(s, { x: M + cw6 + 0.8, y: 2.9, w: cw6 - 0.7, h: 0.5, size: 17, bold: true, color: NAVY, text: "2028年3月は、確約できません" });
  body(s, { x: M + cw6 + 0.8, y: 3.55, w: cw6 - 0.7, h: 1.05, size: 12.5, ls: 21,
            text: "地ならしを先に始めず、エビデンスと個人会員の実績ができてから営業を始める順番にしたためです。実際に営業を始めてみないと、確定的なことは言えません。" });
  card(s, { x: M, y: 5.2, w: W - M * 2, h: 1.0, fill: "EEF0FA", line: "C9CFEA" });
  body(s, {
    x: M + 0.35, y: 5.43, w: W - M * 2 - 0.7, h: 0.6, size: 13, bold: true, color: NAVY,
    text: "早められる部分が見つかれば、その都度、伊藤さんにご相談します。",
  });
  pageNo(s, 12);
  s.addNotes("リスクを先に自分から出す。隠さないことで、後の相談がしやすくなる。");
}

/* ============ S13 今日のお返事（S2と同じ言葉・同じ位置） ============ */
{
  const s = darkSlide();
  head(s, "今日、お返事いただきたいこと", "まずは1か月、試運転を一緒に", true);
  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 2.15, w: W - M * 2, h: 1.35, rectRadius: 0.1,
    fill: { color: "17204A" }, line: { color: GOLD_L, width: 2 },
  });
  s.addText("「1か月、試運転をやってみる」。この一点だけ、お考えを聞かせてください。", {
    x: M + 0.35, y: 2.55, w: W - M * 2 - 0.7, h: 0.6, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 21, bold: true, color: WHITE,
  });
  s.addText("一緒にやっていきたいこと", {
    x: M, y: 3.85, w: 6.0, h: 0.32, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 13, bold: true, color: "8A93B8",
  });
  const yes = ["火・木の夜運動", "日曜の疲労回復パート", "個人向けが始まってからの接点づくり"];
  yes.forEach((t, i) => {
    const x = M + i * 4.05;
    s.addShape(pres.ShapeType.roundRect, {
      x: x, y: 4.28, w: 3.75, h: 0.78, rectRadius: 0.08,
      fill: { color: "141B3C" }, line: { color: GOLD_L, width: 1 },
    });
    s.addText(t, {
      x: x + 0.22, y: 4.45, w: 3.35, h: 0.5, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 12.5, color: WHITE, lineSpacing: 17,
    });
  });
  s.addText("今日この場で、すべて決めていただかなくて大丈夫です。", {
    x: M, y: 5.4, w: W - M * 2, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 13, color: "B9C0DC",
  });
  pageNo(s, 13);
  s.addNotes("2枚目と同じ言葉で閉じる。ここで話を止めて、伊藤さんの反応を待つ。");
}

/* ============ S14 出典・免責 ============ */
{
  const s = lightSlide();
  s.addText("出典・ご参考", {
    x: M, y: 0.86, w: W - M * 2, h: 0.6, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 26, bold: true, color: NAVY,
  });
  card(s, { x: M, y: 1.9, w: W - M * 2, h: 2.45 });
  body(s, {
    x: M + 0.35, y: 2.15, w: W - M * 2 - 0.7, h: 2.0, size: 12.5, ls: 22,
    text: "事業内容の整理：株式会社mimococo「支援の空白を埋める 〜復職後の夜間・休日オンラインケア〜」\n（Vision Hacker Association 2026 エントリーシート記載内容に基づく）\n\nプログラム仕様：ヨルケア「5か月間オンラインプログラム 実施・研究・安全管理に関する確定仕様」（2026年）\n\n事業計画本体：docs/business-plan-return-to-work.md",
  });
  card(s, { x: M, y: 4.55, w: W - M * 2, h: 0.95, fill: "EEF0FA", line: "C9CFEA" });
  body(s, {
    x: M + 0.35, y: 4.8, w: W - M * 2 - 0.7, h: 0.5, size: 12.5, bold: true, color: NAVY,
    text: "※ ヨルケア／本プログラムは、診断・治療・処方を行うものではありません。",
  });
  note(s, "本資料内の週の帯（3ページ）は、ヒアリングから見えた傾向を図にしたものであり、実測データではありません。", 5.8);
  pageNo(s, 14);
  s.addNotes("配布後に一人で読み返したときのために、出典と免責を必ず添える。");
}

pres.writeFile({ fileName: process.argv[2] || "out.pptx" }).then(f => console.log("written:", f));
