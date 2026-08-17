/**
 * 都知事杯オープンデータ・ハッカソン2026 提出用プレゼン資料を組む。
 *
 * Usage:
 *   node scripts/capture-hackathon-screens.mjs   # 先に画面を撮る
 *   node scripts/build-hackathon-slides.mjs
 *
 * 出力:
 *   outputs/hackathon2026/yorucare-hackathon2026.pdf   提出物（16:9・1ページ1スライド）
 *   outputs/hackathon2026/slides.html                  画像を埋め込んだ確認用
 *   docs/hackathon2026/slides/index.html               追跡用（画像は相対参照）
 *
 * 文言の制約: 診断・治療の代替と読める表現、効果の断言、未確認データの数値を書かない
 * （AGENTS.md / docs/phase2-plan.md 1節）。
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "outputs/hackathon2026");
const PHONE_DIR = path.join(OUT_DIR, "phone");
const DOCS_DIR = path.join(ROOT, "docs/hackathon2026/slides");
const EXECUTABLE_PATH = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";

/** 表紙とチームのスライドで使う。提出前に埋める */
const TEAM = {
  name: "（チーム名）",
  members: "（メンバー名・役割）",
};

const PHONE_SHOTS = [
  "today-top",
  "today-selfcare",
  "reflection-top",
  "reflection-week",
  "records",
  "consultation",
];

function imageSource(name, { embed }) {
  const file = path.join(PHONE_DIR, `${name}.png`);
  if (!embed) return `../../../outputs/hackathon2026/phone/${name}.png`;
  if (!fs.existsSync(file)) {
    throw new Error(
      `画面キャプチャがありません: ${file}\n先に node scripts/capture-hackathon-screens.mjs を実行してください。`,
    );
  }
  return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
}

const STYLE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --night-950: #0b1026;
    --night-900: #111736;
    --night-800: #1a2148;
    --night-700: #252d5c;
    --moon-300: #fde68a;
    --moon-400: #fcd34d;
    --care-300: #a5b4fc;
    --care-400: #818cf8;
    --care-500: #6366f1;
    --text: #e2e8f0;
    --dim: #94a3b8;
  }
  html { background: var(--night-950); }
  body {
    font-family: "Noto Sans JP", "IPAGothic", "Hiragino Kaku Gothic ProN", sans-serif;
    color: var(--text);
    -webkit-font-smoothing: antialiased;
  }
  .slide {
    position: relative;
    width: 1920px; height: 1080px;
    padding: 84px 104px;
    overflow: hidden;
    background: radial-gradient(1500px 900px at 10% -12%, #252d5c 0%, #111736 46%, #0b1026 100%);
    page-break-after: always;
    break-after: page;
    display: flex; flex-direction: column;
  }
  .slide:last-child { page-break-after: auto; break-after: auto; }
  .num {
    position: absolute; right: 64px; bottom: 48px;
    font-size: 20px; color: #4b5675; letter-spacing: .1em;
  }
  .kicker {
    display: inline-block;
    align-self: flex-start;
    font-size: 22px; font-weight: 700; letter-spacing: .18em;
    color: var(--moon-300);
    border: 2px solid rgba(253,230,138,.4);
    border-radius: 999px; padding: 8px 26px; margin-bottom: 30px;
  }
  h2 { font-size: 62px; font-weight: 900; line-height: 1.22; color: #fff; }
  .lead { margin-top: 22px; font-size: 27px; line-height: 1.65; color: var(--care-300); }
  .body { flex: 1 1 auto; display: flex; flex-direction: column; justify-content: center; }
  ul { list-style: none; }
  li { font-size: 30px; line-height: 1.7; color: var(--text); padding-left: 40px; position: relative; }
  li + li { margin-top: 18px; }
  li::before {
    content: ""; position: absolute; left: 8px; top: 21px;
    width: 12px; height: 12px; border-radius: 999px; background: var(--care-400);
  }
  .cards { display: flex; gap: 26px; }
  .card {
    flex: 1; background: rgba(17,23,54,.85);
    border: 2px solid rgba(255,255,255,.1); border-radius: 26px;
    padding: 34px 32px;
  }
  .card h3 { font-size: 31px; font-weight: 800; color: #fff; margin-bottom: 14px; }
  .card p { font-size: 22px; line-height: 1.65; color: var(--dim); }
  .card .tag { font-size: 19px; font-weight: 700; letter-spacing: .12em; color: var(--moon-300); margin-bottom: 12px; }
  .quote {
    margin-top: 34px; padding: 30px 38px;
    border-left: 8px solid var(--moon-400);
    background: rgba(252,211,77,.08); border-radius: 0 20px 20px 0;
  }
  .quote p { font-size: 34px; font-weight: 800; color: #fff; line-height: 1.5; }
  .quote span { display: block; margin-top: 10px; font-size: 21px; color: var(--dim); }
  .flow { display: flex; align-items: stretch; gap: 20px; }
  .flow .step {
    flex: 1; background: rgba(26,33,72,.9);
    border: 2px solid rgba(129,140,248,.35); border-radius: 26px; padding: 32px 28px;
  }
  .flow .step .n { font-size: 21px; font-weight: 800; color: var(--care-300); letter-spacing: .1em; }
  .flow .step h3 { margin-top: 12px; font-size: 32px; font-weight: 800; color: #fff; line-height: 1.35; }
  .flow .step p { margin-top: 12px; font-size: 21px; line-height: 1.6; color: var(--dim); }
  .arrow { align-self: center; font-size: 40px; font-weight: 900; color: var(--moon-300); }
  .shots { display: flex; gap: 40px; justify-content: center; align-items: flex-start; }
  .shot { display: flex; flex-direction: column; align-items: center; gap: 16px; width: 300px; }
  .shot .frame {
    width: 300px; height: 650px; border-radius: 30px; overflow: hidden;
    border: 4px solid rgba(255,255,255,.18); background: #fff;
    box-shadow: 0 30px 70px rgba(0,0,0,.55);
  }
  .shot img { width: 100%; display: block; }
  .shot .name { font-size: 25px; font-weight: 800; color: var(--moon-300); }
  .shot .note { font-size: 19px; line-height: 1.55; color: var(--dim); text-align: center; }
  .data-row { display: flex; gap: 22px; margin-top: 8px; }
  .data {
    flex: 1; border-radius: 24px; padding: 30px 30px;
    background: rgba(17,23,54,.85); border: 2px solid rgba(255,255,255,.1);
  }
  .data .state {
    display: inline-block; font-size: 18px; font-weight: 800; letter-spacing: .1em;
    border-radius: 999px; padding: 6px 18px; margin-bottom: 16px;
  }
  .state.now { color: #0b1026; background: var(--moon-300); }
  .state.next { color: var(--care-300); border: 2px solid rgba(165,180,252,.5); }
  .data h3 { font-size: 27px; font-weight: 800; color: #fff; line-height: 1.4; }
  .data p { margin-top: 12px; font-size: 21px; line-height: 1.6; color: var(--dim); }
  .cover { justify-content: center; align-items: center; text-align: center; }
  .cover .mark {
    width: 118px; height: 118px; border-radius: 999px;
    background: linear-gradient(135deg, var(--care-500), var(--night-700));
    display: grid; place-items: center;
    font-size: 56px; font-weight: 900; color: var(--moon-300);
    margin-bottom: 40px;
  }
  .cover h1 { font-size: 116px; font-weight: 900; color: #fff; letter-spacing: .04em; }
  .cover .tagline { margin-top: 26px; font-size: 42px; font-weight: 700; color: var(--care-300); }
  .cover .meta { margin-top: 56px; font-size: 24px; line-height: 1.9; color: var(--dim); }
  .footnote { margin-top: 30px; font-size: 20px; line-height: 1.6; color: #64748b; }
  .stars span { position: absolute; border-radius: 999px; background: #fff; opacity: .5; }
`;

function stars() {
  const points = [
    [180, 140, 3], [420, 96, 2], [760, 190, 2], [1180, 120, 3],
    [1520, 220, 2], [1740, 130, 2], [300, 880, 2], [1640, 900, 3],
  ];
  return `<div class="stars">${points
    .map(([x, y, r]) => `<span style="left:${x}px;top:${y}px;width:${r * 2}px;height:${r * 2}px"></span>`)
    .join("")}</div>`;
}

function slide(n, inner, extraClass = "") {
  return `<section class="slide ${extraClass}">${stars()}${inner}<div class="num">${n} / 8</div></section>`;
}

function shot(src, name, note) {
  return `<div class="shot">
    <div class="frame"><img src="${src}" alt="" /></div>
    <p class="name">${name}</p>
    <p class="note">${note}</p>
  </div>`;
}

function buildHtml({ embed }) {
  const img = (n) => imageSource(n, { embed });

  const s1 = slide(1, `
    <div class="body cover">
      <div class="mark">夜</div>
      <h1>ヨルケア</h1>
      <p class="tagline">夜と休日のセルフケアを、1日1〜2分で残す</p>
      <p class="meta">
        都知事杯オープンデータ・ハッカソン2026<br />
        ${TEAM.name}
      </p>
    </div>`, "cover");

  const s2 = slide(2, `
    <span class="kicker">課題</span>
    <h2>支援があるのは平日の日中だけ。<br />崩れやすいのは、夜と休日。</h2>
    <div class="body">
      <ul>
        <li>メンタル不調から復職しても、心身の波は残る。通勤や業務は緊張感で越えられる</li>
        <li>帰宅後の夜、そして土日祝に、気力と体力が一気に落ちる</li>
        <li>支援面談は月1回程度。最も崩れやすい時間帯には、ほとんど何も届かない</li>
        <li>聞き取りでは「夜のSNSで睡眠が削られる」「会社に相談しにくく、自作の表で孤独に管理」「復職後1〜2か月で記録が途切れる」</li>
      </ul>
      <div class="quote">
        <p>「週末で回復させても、月曜日が怖い」</p>
        <span>これが繰り返され、再休職の引き金になる</span>
      </div>
    </div>`);

  const s3 = slide(3, `
    <span class="kicker">解決策</span>
    <h2>空白の時間に、続けられる記録を置く</h2>
    <p class="lead">続かない理由を設計で外し、溜まった記録を「伝えるための材料」に変える。</p>
    <div class="body">
      <div class="flow">
        <div class="step">
          <p class="n">STEP 1</p>
          <h3>1〜2分で書く</h3>
          <p>「よい・ふつう・しんどい」を選ぶと、続く質問が必要な分だけに絞られる。しんどい日ほど短く終わる。</p>
        </div>
        <div class="arrow">→</div>
        <div class="step">
          <p class="n">STEP 2</p>
          <h3>1週間を日数でまとめる</h3>
          <p>書けなかった日を失敗として扱わない。中断で減らない累計を先に見せ、戻ってきやすくする。</p>
        </div>
        <div class="arrow">→</div>
        <div class="step">
          <p class="n">STEP 3</p>
          <h3>伝える材料にする</h3>
          <p>月1回の面談や診察で「最近どうですか」に答えられる。相談先へは本人の操作だけでつながる。</p>
        </div>
      </div>
    </div>`);

  const s4 = slide(4, `
    <span class="kicker">プロダクト</span>
    <h2>実際の画面</h2>
    <div class="body">
      <div class="shots">
        ${shot(img("today-top"), "書く", "3段階の入口。気分だけ選んで保存してもよい。")}
        ${shot(img("reflection-week"), "ふりかえり", "割合ではなく日数で示し、母数を必ず添える。")}
        ${shot(img("consultation"), "相談先", "全タブ共通。記録は送らず、本人の操作だけで開く。")}
      </div>
    </div>`);

  const s5 = slide(5, `
    <span class="kicker">設計</span>
    <h2>「評価しない・持ち出さない・判定しない」を実装で守る</h2>
    <div class="body">
      <div class="cards">
        <div class="card">
          <p class="tag">評価しない</p>
          <h3>日数で示す</h3>
          <p>割合を出さず、母数を必ず添える。連続記録を主役にせず、中断しても減らない累計を先に置く。評価語と助言を出さないことを表示テストで固定している。</p>
        </div>
        <div class="card">
          <p class="tag">持ち出さない</p>
          <h3>記録は端末の中だけ</h3>
          <p>ログインとサーバ保存をあえて作らず、記録はブラウザ内に保存。本人が書いた文章を外部へ渡す型そのものを用意していない。</p>
        </div>
        <div class="card">
          <p class="tag">判定しない</p>
          <h3>生成AIに自由文を書かせない</h3>
          <p>数値はアプリが確定させ、文章の穴はアプリが用意した候補から選ばせる。禁止語での事後検査は取りこぼすことを確認し、設計自体を変えた。</p>
        </div>
      </div>
      <p class="footnote">ヨルケアは診断・治療・処方や緊急対応を行うものではなく、医療・福祉が届かない時間を補うセルフケア記録です。</p>
    </div>`);

  const s6 = slide(6, `
    <span class="kicker">利用オープンデータ</span>
    <h2>相談先を、地域の窓口まで届かせる</h2>
    <p class="lead">いまアプリがつなげるのは全国共通の窓口だけ。オープンデータで、住んでいる地域の窓口へ広げる。</p>
    <div class="body">
      <div class="data-row">
        <div class="data">
          <span class="state now">利用予定・最優先</span>
          <h3>社会福祉施設等一覧（東京都）</h3>
          <p>精神保健福祉センター・保健所などの名称と連絡先を取り込み、相談導線を都内の実在窓口へ広げる。まずここから着手する。</p>
        </div>
        <div class="data">
          <span class="state next">利用予定</span>
          <h3>相談窓口の開所時間データ</h3>
          <p>開所時間を集計し、平日夜間と土日に開いている窓口がどれだけ少ないかを課題の裏づけとして示す。</p>
        </div>
        <div class="data">
          <span class="state next">利用予定</span>
          <h3>社会生活基本調査（総務省統計局）</h3>
          <p>睡眠時間の統計を、夜の過ごし方という課題背景の根拠として引用する。</p>
        </div>
      </div>
      <p class="footnote">出典は提出フォーム 4-1 に記載。データは各提供元の利用条件の範囲で使用します。現時点では取り込み前のため、集計した数値はこの資料に載せていません。</p>
    </div>`);

  const s7 = slide(7, `
    <span class="kicker">社会実装</span>
    <h2>すでにある関係の上に、届ける</h2>
    <div class="body">
      <div class="flow">
        <div class="step">
          <p class="n">いま</p>
          <h3>就労移行支援向けの運動講座</h3>
          <p>6法人137事業所での実績。この関係を通じてヨルケアを届ける。</p>
        </div>
        <div class="arrow">→</div>
        <div class="step">
          <p class="n">つぎ</p>
          <h3>21名・5か月の実践研究</h3>
          <p>継続率と使いやすさを確かめる。指標案はPHQ-9・UWES-9・WHO-HPQ・PSQI。</p>
        </div>
        <div class="arrow">→</div>
        <div class="step">
          <p class="n">その先</p>
          <h3>連携クリニック・企業へ</h3>
          <p>障害者雇用担当や産業医との協働へ広げる。株式会社mimococoの自社事業として運営を継続。</p>
        </div>
      </div>
      <p class="footnote">現時点で症状の改善を示すデータはありません。効果検証はこれから行う段階です。</p>
    </div>`);

  const s8 = slide(8, `
    <span class="kicker">チーム</span>
    <h2>${TEAM.name}</h2>
    <div class="body">
      <ul>
        <li>${TEAM.members}</li>
        <li>デモ： https://yorucare.vercel.app</li>
        <li>運営：株式会社mimococo（自社事業として運営を継続）</li>
      </ul>
      <div class="quote">
        <p>夜と休日を、一人でしんどさを抱える時間から、<br />自分を整える時間へ。</p>
      </div>
    </div>`);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<title>ヨルケア | 都知事杯オープンデータ・ハッカソン2026</title>
<style>${STYLE}</style>
</head>
<body>${[s1, s2, s3, s4, s5, s6, s7, s8].join("\n")}</body>
</html>
`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  const missing = PHONE_SHOTS.filter(
    (n) => !fs.existsSync(path.join(PHONE_DIR, `${n}.png`)),
  );
  if (missing.length > 0) {
    throw new Error(
      `画面キャプチャが足りません: ${missing.join(", ")}\n` +
        "先に node scripts/capture-hackathon-screens.mjs を実行してください。",
    );
  }

  const embedded = buildHtml({ embed: true });
  const linked = buildHtml({ embed: false });

  const htmlFile = path.join(OUT_DIR, "slides.html");
  fs.writeFileSync(htmlFile, embedded, "utf8");
  fs.writeFileSync(path.join(DOCS_DIR, "index.html"), linked, "utf8");

  const browser = await chromium.launch(
    fs.existsSync(EXECUTABLE_PATH) ? { executablePath: EXECUTABLE_PATH } : {},
  );
  const page = await browser.newPage();
  await page.setContent(embedded, { waitUntil: "load" });
  await page.emulateMedia({ media: "screen" });
  const pdfFile = path.join(OUT_DIR, "yorucare-hackathon2026.pdf");
  await page.pdf({
    path: pdfFile,
    width: "1920px",
    height: "1080px",
    printBackground: true,
    pageRanges: "1-8",
  });
  await browser.close();

  const kb = Math.round(fs.statSync(pdfFile).size / 1024);
  console.log("wrote", htmlFile);
  console.log("wrote", path.join(DOCS_DIR, "index.html"));
  console.log("wrote", pdfFile, `${kb}KB`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
