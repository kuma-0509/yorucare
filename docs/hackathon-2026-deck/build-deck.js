/**
 * ヨルケア — 都知事杯オープンデータ・ハッカソン 2026 提出スライド
 *
 * 色・字送り・格子の基準は ./design-system.md が単一の出典。
 * 値を変えるときは先にそちらを直す。1枚だけの例外を足さない。
 * 素材の用意と組み立て手順は ./README.md を参照。
 */
const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");

const A = path.join(__dirname, "assets");
const OUT_DIR = path.join(__dirname, "out");
const OUT = path.join(OUT_DIR, "yorucare-hackathon-2026.pptx");

fs.mkdirSync(OUT_DIR, { recursive: true });

/* ---------- Design tokens ----------
   プロダクトの tailwind.config.ts (primary #3d7ab8 / background #f8f9fb) を
   夜のグラウンド上で成立するように持ち上げた一組。 */
const C = {
  night: "0E1E33", // 唯一の背景色
  surface: "17293F", // カード面
  line: "26405C", // カード罫
  white: "FFFFFF",
  sec: "AFC3D9", // 二次テキスト
  muted: "8CA4BF", // 注釈
  blue: "4E93D2", // ブランドアクセント
  blueDeep: "3D7AB8", // プロダクト primary（塗りチップ）
  amber: "F2C97D", // 唯一の強調色。1スライド1回まで
  amberLine: "6B5836",
};

/* ---------- Type scale ---------- */
const T = {
  display: 54,
  h1: 30,
  h2: 17,
  body: 13,
  chip: 10,
  eyebrow: 11,
  caption: 9.5,
  stat: 50,
};

const JP = "Meiryo";

/* ---------- Grid ---------- */
const G = {
  ml: 0.72,
  mr: 0.72,
  W: 13.333,
  H: 7.5,
  get cw() {
    return this.W - this.ml - this.mr;
  }, // 11.893
  eyebrowY: 0.44,
  titleY: 0.8,
  bodyTop: 1.95,
  footerY: 6.94,
  gut: 0.32,
};
const col3 = (G.cw - 2 * G.gut) / 3; // 3.751
const x3 = [G.ml, G.ml + col3 + G.gut, G.ml + 2 * (col3 + G.gut)];
const colL = 6.75; // 2カラム 58/42
const colR = G.cw - colL - G.gut; // 4.823
const xR = G.ml + colL + G.gut;

const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.author = "熊谷 祐希";
pres.company = "担当者レンタル";
pres.title = "ヨルケア — 都知事杯オープンデータ・ハッカソン 2026";
pres.theme = { headFontFace: JP, bodyFontFace: JP };

/* ---------- Primitives ---------- */
const newSlide = () => {
  const s = pres.addSlide();
  s.background = { color: C.night };
  return s;
};

// カード: 面 + 全周の罫。片側だけの線・帯は使わない。
function card(s, { x, y, w, h, emphasis = false }) {
  s.addShape(pres.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.09,
    fill: { color: C.surface },
    line: { color: emphasis ? C.amberLine : C.line, width: 1 },
  });
}

// モチーフ: 塗りチップ。列挙・ラベルはすべてこれに統一する。
function chip(s, { x, y, w, text, fill = C.blueDeep, color = C.white, size = T.chip }) {
  s.addShape(pres.ShapeType.roundRect, {
    x,
    y,
    w,
    h: 0.3,
    rectRadius: 0.15,
    fill: { color: fill },
    line: { color: fill, width: 0.75 },
  });
  s.addText(text, {
    x,
    y,
    w,
    h: 0.3,
    align: "center",
    valign: "middle",
    margin: 0,
    fontFace: JP,
    fontSize: size,
    bold: true,
    color,
    isTextBox: true,
  });
}

function eyebrow(s, text) {
  s.addText(text, {
    x: G.ml,
    y: G.eyebrowY,
    w: G.cw,
    h: 0.3,
    margin: 0,
    valign: "middle",
    fontFace: JP,
    fontSize: T.eyebrow,
    bold: true,
    charSpacing: 2.2,
    color: C.blue,
    isTextBox: true,
  });
}

function title(s, runs) {
  s.addText(runs, {
    x: G.ml,
    y: G.titleY,
    w: G.cw,
    h: 0.82,
    margin: 0,
    valign: "middle",
    fontFace: JP,
    fontSize: T.h1,
    bold: true,
    color: C.white,
    isTextBox: true,
  });
}

function h2(s, text, { x, y, w }) {
  s.addText(text, {
    x,
    y,
    w,
    h: 0.34,
    margin: 0,
    valign: "middle",
    fontFace: JP,
    fontSize: T.h2,
    bold: true,
    color: C.white,
    isTextBox: true,
  });
}

function body(s, text, { x, y, w, h, color = C.sec, size = T.body, bold = false, align = "left" }) {
  s.addText(text, {
    x,
    y,
    w,
    h,
    margin: 0,
    valign: "top",
    align,
    fontFace: JP,
    fontSize: size,
    bold,
    color,
    lineSpacingMultiple: 1.45,
    isTextBox: true,
  });
}

function footer(s, n) {
  s.addText("ヨルケア｜都知事杯オープンデータ・ハッカソン 2026", {
    x: G.ml,
    y: G.footerY,
    w: 8,
    h: 0.26,
    margin: 0,
    valign: "middle",
    fontFace: JP,
    fontSize: T.caption,
    color: C.muted,
    isTextBox: true,
  });
  s.addText(String(n), {
    x: G.W - G.mr - 1.2,
    y: G.footerY,
    w: 1.2,
    h: 0.26,
    margin: 0,
    valign: "middle",
    align: "right",
    fontFace: JP,
    fontSize: T.caption,
    color: C.muted,
    isTextBox: true,
  });
}

/* =====================================================================
   1 — TITLE
   ===================================================================== */
{
  const s = newSlide();

  chip(s, { x: G.ml, y: 0.92, w: 4.1, text: "都知事杯オープンデータ・ハッカソン 2026", fill: "1B3454", color: C.sec, size: 10.5 });

  s.addText("ヨルケア", {
    x: G.ml,
    y: 1.5,
    w: 7.4,
    h: 1.3,
    margin: 0,
    valign: "middle",
    fontFace: JP,
    fontSize: T.display,
    bold: true,
    color: C.white,
    charSpacing: 1,
    isTextBox: true,
  });

  s.addText(
    [
      { text: "復職後の心の体調管理を、", options: { breakLine: true } },
      { text: "1〜2分の記録から。" },
    ],
    {
      x: G.ml,
      y: 3.0,
      w: 7.4,
      h: 1.1,
      margin: 0,
      valign: "middle",
      fontFace: JP,
      fontSize: 23,
      bold: true,
      color: C.blue,
      lineSpacingMultiple: 1.28,
      isTextBox: true,
    }
  );

  body(
    s,
    "メンタル不調を経験して復職した人が、気分・睡眠・できたことを毎日1〜2分で記録。\n主治医や支援者と相談しながら記録項目を決められ、地域の相談先探しまでつながります。",
    { x: G.ml, y: 4.35, w: 7.3, h: 1.0 }
  );

  s.addText("熊谷 祐希", {
    x: G.ml,
    y: 5.86,
    w: 3.4,
    h: 0.3,
    margin: 0,
    fontFace: JP,
    fontSize: 13.5,
    bold: true,
    color: C.white,
    isTextBox: true,
  });
  s.addText("yorucare.vercel.app", {
    x: G.ml,
    y: 6.26,
    w: 3.4,
    h: 0.3,
    margin: 0,
    fontFace: JP,
    fontSize: 13,
    color: C.blue,
    isTextBox: true,
  });

  // 端末: 夜のなかで画面だけが光る。ベゼルはカードと同じ角丸・同じ罫。
  const ph = { w: 3.19, h: 5.9, x: 9.0, y: 0.8 };
  s.addShape(pres.ShapeType.roundRect, {
    x: ph.x - 0.11,
    y: ph.y - 0.11,
    w: ph.w + 0.22,
    h: ph.h + 0.22,
    rectRadius: 0.09,
    fill: { color: C.surface },
    line: { color: C.line, width: 1 },
  });
  s.addImage({ path: path.join(A, "hero_phone.jpg"), x: ph.x, y: ph.y, w: ph.w, h: ph.h });

  s.addNotes(
    "ヨルケアは、メンタル不調を経験し復職した方が、日付・気分・睡眠・振り返りを1〜2分で記録するWebアプリです。" +
      "状態を一覧・グラフ・文章で整理し、主治医・支援者への共有や相談先探しに活用できます。" +
      "主治医や支援者と相談しながら記録項目をカスタマイズでき、治療方針に合わせた記録として続けられます。"
  );
}

/* =====================================================================
   2 — TEAM & FOUNDER
   ===================================================================== */
{
  const s = newSlide();
  eyebrow(s, "TEAM & FOUNDER");
  title(s, [
    { text: "約12年", options: { color: C.amber } },
    { text: "の現場経験を、本人が続けられる実装に変える。" },
  ]);

  const cy = G.bodyTop;
  const ch = 4.62;
  card(s, { x: G.ml, y: cy, w: colL, h: ch });
  card(s, { x: xR, y: cy, w: colR, h: ch });

  h2(s, "経験と実績", { x: G.ml + 0.42, y: cy + 0.36, w: 4 });

  const rows = [
    ["支援現場", "グループホーム・就労継続支援B型・就労移行・特例子会社で本人支援。"],
    ["企業人事", "約2,500名規模の企業でインクルージョン型雇用を立ち上げ、2年で法定雇用率超え。"],
    ["現在", "中小企業の採用〜定着支援／研修のべ3,000名以上／江東区自立支援協議会 委員。"],
  ];
  let ry = cy + 1.12;
  rows.forEach(([label, text]) => {
    chip(s, { x: G.ml + 0.42, y: ry, w: 1.12, text: label });
    body(s, text, { x: G.ml + 1.72, y: ry - 0.02, w: colL - 2.2, h: 0.95 });
    ry += 1.12;
  });

  // 右: 人物。写真を主役にして、左カードとの重量を釣り合わせる。
  const px = xR + (colR - 1.85) / 2;
  s.addImage({
    path: path.join(A, "founder.jpg"),
    x: px,
    y: cy + 0.45,
    w: 1.85,
    h: 1.85,
    rounding: true,
  });
  s.addText("熊谷 祐希", {
    x: xR + 0.3,
    y: cy + 2.5,
    w: colR - 0.6,
    h: 0.36,
    margin: 0,
    align: "center",
    fontFace: JP,
    fontSize: 19,
    bold: true,
    color: C.white,
    isTextBox: true,
  });
  s.addText("社会福祉士／企業在籍型ジョブコーチ", {
    x: xR + 0.3,
    y: cy + 2.9,
    w: colR - 0.6,
    h: 0.3,
    margin: 0,
    align: "center",
    fontFace: JP,
    fontSize: 12,
    color: C.blue,
    isTextBox: true,
  });
  body(
    s,
    "担当者レンタル 代表。本人支援と企業人事の両面から障がい者就労・雇用に携わる。復職後セルフケアのオンラインコミュニティも運営。",
    { x: xR + 0.42, y: cy + 3.42, w: colR - 0.84, h: 1.0, align: "center" }
  );

  footer(s, 2);
  s.addNotes("現場で見てきたことを、そのまま画面の仕様に落としています。");
}

/* =====================================================================
   3 — PROBLEM
   ===================================================================== */
{
  const s = newSlide();
  eyebrow(s, "PROBLEM");
  title(s, [{ text: "メンタル不調後、長く安定して働き続けることが難しい" }]);

  const cy = G.bodyTop;
  const ch = 3.95;
  const stats = [
    { n: "約6", u: "%", label: "日本人が生涯に\nうつ病を経験する割合", src: "国立精神・神経医療研究センター／Ishikawa et al.（2018）", hot: false },
    { n: "約50", u: "%", label: "初回のうつ病エピソード後に\n再発する可能性", src: "NICE, Depression in adults（NG222, 2022）", hot: false },
    { n: "50.7", u: "%", label: "精神障がい者が\n就職後1年以内に離職した割合", src: "JEED 障害者職業総合センター No.137（2017）", hot: true },
  ];

  stats.forEach((st, i) => {
    card(s, { x: x3[i], y: cy, w: col3, h: ch, emphasis: st.hot });
    s.addText(
      [
        { text: st.n, options: { fontSize: T.stat, bold: true, color: st.hot ? C.amber : C.white } },
        { text: st.u, options: { fontSize: 22, bold: true, color: st.hot ? C.amber : C.white } },
      ],
      {
        x: x3[i] + 0.42,
        y: cy + 0.5,
        w: col3 - 0.84,
        h: 1.1,
        margin: 0,
        valign: "middle",
        fontFace: JP,
        isTextBox: true,
      }
    );
    body(s, st.label, { x: x3[i] + 0.42, y: cy + 1.85, w: col3 - 0.84, h: 0.95, color: st.hot ? C.white : C.sec });
    body(s, st.src, { x: x3[i] + 0.42, y: cy + 3.0, w: col3 - 0.84, h: 0.75, color: C.muted, size: T.caption });
  });

  body(
    s,
    "離職割合は、2015年7〜8月にハローワーク紹介で一般企業へ就職した精神障がい者1,206人の1年後定着率49.3%から算出。就労継続支援A型を除く。",
    { x: G.ml, y: cy + ch + 0.28, w: G.cw, h: 0.4, color: C.muted, size: T.caption }
  );

  footer(s, 3);
  s.addNotes("復職できても、続けられない。ここが解くべき地点です。");
}

/* =====================================================================
   4 — INSIGHT
   ===================================================================== */
{
  const s = newSlide();
  eyebrow(s, "INSIGHT ／ 支援者・当事者 50人へのヒアリング");
  title(s, [
    { text: "メンタル不調と向き合いながら、安定して働く人の" },
    { text: "3つの特徴", options: { color: C.amber } },
  ]);

  const cy = G.bodyTop;
  const ch = 3.92;
  const items = [
    { n: "①", h: "自己理解", lines: "自分の変化に気づける\n自分のできる範囲が分かる", feat: "毎日の記録とグラフ" },
    { n: "②", h: "セルフケア", lines: "自己改善ができる\n崩れる前に整えられる", feat: "「できること」辞書" },
    { n: "③", h: "サポート", lines: "必要な相手へ相談ができる\n適切なサポートが受けられる", feat: "共有と相談先の導線" },
  ];

  items.forEach((it, i) => {
    card(s, { x: x3[i], y: cy, w: col3, h: ch });
    s.addText(
      [
        { text: it.n + " ", options: { color: C.blue } },
        { text: it.h, options: { color: C.white } },
      ],
      {
        x: x3[i] + 0.42,
        y: cy + 0.48,
        w: col3 - 0.84,
        h: 0.6,
        margin: 0,
        valign: "middle",
        fontFace: JP,
        fontSize: 24,
        bold: true,
        isTextBox: true,
      }
    );
    body(s, it.lines, { x: x3[i] + 0.42, y: cy + 1.42, w: col3 - 0.84, h: 1.0 });

    s.addText("ヨルケアの対応機能", {
      x: x3[i] + 0.42,
      y: cy + 2.82,
      w: col3 - 0.84,
      h: 0.26,
      margin: 0,
      fontFace: JP,
      fontSize: T.caption,
      color: C.muted,
      charSpacing: 0.6,
      isTextBox: true,
    });
    chip(s, { x: x3[i] + 0.42, y: cy + 3.18, w: col3 - 0.84, text: it.feat, fill: "1B3454", color: C.blue, size: 11.5 });
  });

  footer(s, 4);
  s.addNotes("50人のヒアリングから見えた3つの特徴に、機能を1対1で対応させています。");
}

/* =====================================================================
   5 — PRODUCT / DEMO
   ===================================================================== */
{
  const s = newSlide();
  eyebrow(s, "PRODUCT ／ DEMO");
  title(s, [
    { text: "記録から、" },
    { text: "ふりかえり・調整・相談まで。", options: { color: C.sec } },
  ]);

  // 端末は実機の録画。会場では再生し、PDFではポスターが残る。
  const pw = 2.18;
  const phh = pw * (1764 / 860); // 4.471
  const px = G.ml;
  const py = G.bodyTop;

  s.addShape(pres.ShapeType.roundRect, {
    x: px - 0.11,
    y: py - 0.11,
    w: pw + 0.22,
    h: phh + 0.22,
    rectRadius: 0.09,
    fill: { color: C.surface },
    line: { color: C.line, width: 1 },
  });
  s.addMedia({
    type: "video",
    path: path.join(A, "demo.mp4"),
    cover:
      "data:image/jpeg;base64," +
      fs.readFileSync(path.join(A, "demo_poster.jpg")).toString("base64"),
    x: px,
    y: py,
    w: pw,
    h: phh,
  });

  // 右: 録画の4場面を、同じ順番で読めるように置く
  const gx = 3.35;
  const gw = (G.W - G.mr - gx - 0.3) / 2; // 4.4815
  const gh = (phh - 0.25) / 2; // 2.11
  const steps = [
    ["①", "簡単に記録できる", "気分をひとつ選ぶだけで保存できる。書ける日は睡眠やメモも足せる。"],
    ["②", "ふりかえりで確かめる", "35日分の記録から、気分と睡眠の変化を期間別の折れ線で見る。"],
    ["③", "記録項目を自分に合わせる", "主治医や支援者と相談して、画面に出す項目を本人が決められる。"],
    ["④", "相談先を地域から探す", "区市町村を選ぶと、地域の保健所・保健センターが住所・電話つきで出る。"],
  ];

  steps.forEach(([n, h, d], i) => {
    const cx = gx + (i % 2) * (gw + 0.3);
    const cy = py + Math.floor(i / 2) * (gh + 0.25);
    card(s, { x: cx, y: cy, w: gw, h: gh });
    s.addText(
      [
        { text: n + " ", options: { color: C.blue } },
        { text: h, options: { color: C.white } },
      ],
      {
        x: cx + 0.36,
        y: cy + 0.42,
        w: gw - 0.72,
        h: 0.38,
        margin: 0,
        valign: "middle",
        fontFace: JP,
        fontSize: 15.5,
        bold: true,
        isTextBox: true,
      }
    );
    body(s, d, { x: cx + 0.36, y: cy + 1.0, w: gw - 0.72, h: 0.9, size: 12 });
  });

  footer(s, 5);
  s.addNotes(
    "左は実機の録画です。記録 → ふりかえり → カスタム入力 → 相談先の順に、約23秒で操作しています。" +
      "グラフは35日分の記録が入った状態で出しています。"
  );
}

/* =====================================================================
   6 — OPEN DATA
   ===================================================================== */
{
  const s = newSlide();
  eyebrow(s, "OPEN DATA");
  title(s, [{ text: "必要なときに、地域の公的な相談先へ。" }]);

  const cy = G.bodyTop;
  const ch = 4.28;
  card(s, { x: G.ml, y: cy, w: colL, h: ch });
  card(s, { x: xR, y: cy, w: colR, h: ch });

  h2(s, "活用する東京都オープンデータ", { x: G.ml + 0.42, y: cy + 0.34, w: 5 });

  const ds = [
    ["施設", "特別区保健所・保健センター一覧"],
    ["施設", "市町村保健センター一覧"],
    ["施設", "中核市・政令市保健所・保健センター一覧"],
    ["調査", "令和6年度 東京都福祉保健基礎調査"],
  ];
  let dy = cy + 1.0;
  ds.forEach(([tag, name]) => {
    chip(s, { x: G.ml + 0.42, y: dy, w: 0.66, text: tag, fill: "1B3454", color: C.blue, size: 9.5 });
    s.addText(name, {
      x: G.ml + 1.24,
      y: dy,
      w: colL - 1.7,
      h: 0.3,
      margin: 0,
      valign: "middle",
      fontFace: JP,
      fontSize: 13,
      color: C.white,
      isTextBox: true,
    });
    dy += 0.62;
  });
  body(s, "出典：東京都オープンデータカタログサイト（東京都保健医療局）", {
    x: G.ml + 0.42,
    y: cy + 3.62,
    w: colL - 0.84,
    h: 0.34,
    color: C.muted,
    size: T.caption,
  });

  h2(s, "端末のなかだけで探す", { x: xR + 0.42, y: cy + 0.34, w: 4 });

  const steps = [
    ["1", "地域を選ぶ", "住まいの区市町村を選択する。"],
    ["2", "相談先を確認", "名称・住所・電話番号を確認する。"],
    ["3", "本人が決めて動く", "発信も外部サイトも、押したときだけ。"],
  ];
  let sy = cy + 0.95;
  steps.forEach(([n, h, d]) => {
    chip(s, { x: xR + 0.42, y: sy, w: 0.3, text: n, size: 10 });
    s.addText(h, {
      x: xR + 0.86,
      y: sy,
      w: colR - 1.3,
      h: 0.3,
      margin: 0,
      valign: "middle",
      fontFace: JP,
      fontSize: 13,
      bold: true,
      color: C.white,
      isTextBox: true,
    });
    body(s, d, { x: xR + 0.86, y: sy + 0.34, w: colR - 1.3, h: 0.32, color: C.sec, size: 11.5 });
    sy += 0.86;
  });

  body(
    s,
    "CSVをアプリへ同梱。外部APIへ接続せず、選んだ地域も現在地も送信しません。",
    { x: xR + 0.42, y: cy + 3.5, w: colR - 0.84, h: 0.62, color: C.amber, size: 11.5 }
  );

  footer(s, 6);
  s.addNotes(
    "オープンデータはビルド時に同梱しています。検索のたびに外部へ問い合わせないので、どの地域を見たかが誰にも残りません。"
  );
}

/* =====================================================================
   7 — EXECUTION
   ===================================================================== */
{
  const s = newSlide();
  eyebrow(s, "EXECUTION");
  title(s, [
    { text: "AIで開発を速く、" },
    { text: "データ境界は人が設計する。", options: { color: C.sec } },
  ]);

  const cy = G.bodyTop;
  const ch = 4.62;
  card(s, { x: G.ml, y: cy, w: colL, h: ch });
  card(s, { x: xR, y: cy, w: colR, h: ch });

  h2(s, "段階的ロードマップ", { x: G.ml + 0.42, y: cy + 0.36, w: 4 });

  const phases = [
    ["Phase 1", "2026年9月から5か月の実証予定。支援機関・精神科医・ピア・当事者団体と、初週複数日記録率、Week 2／4継続率を確認する。"],
    ["Phase 2", "Gate条件は、4週間以上の継続利用と端末変更時の離脱有無。通過後に認証・クラウド保存・安全な共有を検討する。"],
    ["Phase 3–5", "利用拡大 → 効果検証 → ピア支援 → 都連携提案 → 社会実装。東京都のK6調査運用や、こころのサポーターを増やす事業への貢献を目指す。"],
  ];
  let py = cy + 1.05;
  phases.forEach(([label, text]) => {
    chip(s, { x: G.ml + 0.42, y: py, w: 1.22, text: label });
    body(s, text, { x: G.ml + 1.82, y: py - 0.02, w: colL - 2.3, h: 1.1 });
    py += 1.14;
  });

  chip(s, { x: xR + 0.42, y: cy + 0.38, w: 0.86, text: "運用", fill: "1B3454", color: C.blue });
  h2(s, "個人でも安定運用", { x: xR + 0.42, y: cy + 0.92, w: 4 });
  s.addText("Privacy by Design", {
    x: xR + 0.42,
    y: cy + 1.32,
    w: colR - 0.84,
    h: 0.3,
    margin: 0,
    fontFace: JP,
    fontSize: 12,
    color: C.blue,
    isTextBox: true,
  });

  body(
    s,
    "記録本文は端末のlocalStorageに保存。\nVercel＋GitHubで公開・更新を自動化。\n匿名の行動ログは任意同意時のみ収集。",
    { x: xR + 0.42, y: cy + 1.88, w: colR - 0.84, h: 1.1 }
  );
  body(
    s,
    "Gate通過後は、プライム上場企業でサーバー管理・PM統括の経験を持つ方がクラウド要件を設計予定。",
    { x: xR + 0.42, y: cy + 3.08, w: colR - 0.84, h: 0.85, color: C.muted, size: 11.5 }
  );
  body(s, "現時点：企画・開発・運用を一貫して担当", {
    x: xR + 0.42,
    y: cy + 4.02,
    w: colR - 0.84,
    h: 0.3,
    color: C.amber,
    size: 11.5,
    bold: true,
  });

  footer(s, 7);
  s.addNotes("開発速度はAIで確保し、データをどこに置くかの判断は人が持ちます。");
}

pres.writeFile({ fileName: OUT }).then(() => console.log("written:", OUT));
