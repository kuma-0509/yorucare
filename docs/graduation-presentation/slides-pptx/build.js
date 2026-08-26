const P = require('pptxgenjs');
const path = require('path');

const OUT = process.argv[2] || 'yorucare-graduation.pptx';
const MEDIA = process.argv[3] || '/home/user/yorucare/docs/graduation-presentation/media';

// 図解と同じ配色
const C = {
  ground:'080B18', surface:'111830', raised:'18203C', line:'28325A',
  ink:'E9ECF7', muted:'98A2C8', dim:'6E78A0',
  moon:'F2C97D', care:'86AEF2', mint:'7ED3B2', rose:'EE8FA0',
};
const F = 'Noto Sans JP';           // Google スライドで選べる書体
const W = 13.333, H = 7.5;
const M = 0.62;                      // 左右の余白
const CW = W - M * 2;                // 本文の幅

const pres = new P();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'ヨルケア';
pres.title = 'ヨルケア 卒業制作 発表';

const TX = { fontFace: F, isTextBox: true, margin: 0 };

function slide(notes) {
  const s = pres.addSlide();
  s.background = { color: C.ground };
  if (notes) s.addNotes(notes);
  return s;
}
function foot(s, n, label) {
  s.addText(`${n} / 9`, { ...TX, x: M, y: H - 0.52, w: 1.2, h: 0.28, fontSize: 10, color: C.dim });
  s.addText(label, { ...TX, x: W - M - 4.2, y: H - 0.52, w: 4.2, h: 0.28, fontSize: 10,
    color: C.dim, align: 'right' });
}
function kicker(s, plain, bold) {
  s.addText([
    { text: plain, options: { color: C.dim } },
    { text: bold, options: { color: C.moon, bold: true } },
  ], { ...TX, x: M, y: 0.44, w: CW, h: 0.3, fontSize: 12, charSpacing: 2 });
}
function title(s, text, size = 32, y = 0.86, h = 1.0) {
  s.addText(text, { ...TX, x: M, y, w: CW, h, fontSize: size, bold: true,
    color: C.ink, lineSpacing: size * 1.3 });
}
function card(s, o) {
  s.addShape(pres.ShapeType.roundRect, {
    x: o.x, y: o.y, w: o.w, h: o.h, rectRadius: 0.12,
    fill: { color: o.fill || C.surface },
    line: { color: o.stroke || C.line, width: 1 },
  });
}
// 直線をつなぐ折れ線。pptx に折れ線図形が無いので、線分を並べて描く
function polyline(s, pts, color, width) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    s.addShape(pres.ShapeType.line, {
      x: Math.min(x1, x2), y: Math.min(y1, y2),
      w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
      line: { color, width },
      flipV: (y2 < y1),
    });
  }
}
function arrow(s, x1, y1, x2, y2, color) {
  s.addShape(pres.ShapeType.line, {
    x: Math.min(x1, x2), y: Math.min(y1, y2),
    w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    line: { color, width: 1.75, endArrowType: 'triangle' },
    flipV: (y2 < y1),
  });
}

/* ========== 1 タイトル ========== */
{
  const s = slide(
`① タイトル ｜ 0:00 - 0:15（15秒）

ヨルケアというアプリを作りました。メンタル不調を経験して復職した人が、自分の体調を1日1〜2分で記録できるアプリです。

まず、なぜ記録が必要なのかから話させてください。

〔深呼吸してから始める〕`);
  s.addText([
    { text: 'AI-DRIVEN SCHOOL ／ 第1期 土曜クラス ／ ', options: { color: C.dim } },
    { text: '卒業制作', options: { color: C.moon, bold: true } },
  ], { ...TX, x: M, y: 1.95, w: CW, h: 0.3, fontSize: 12, charSpacing: 2 });
  s.addText('ヨルケア', { ...TX, x: M, y: 2.35, w: CW, h: 1.2, fontSize: 60, bold: true, color: C.ink });
  s.addText([
    { text: 'メンタル不調を経験して復職した人が、自分の体調を', options: { color: C.muted } },
    { text: '1日1〜2分', options: { color: C.moon, bold: true } },
    { text: 'で記録できるアプリ', options: { color: C.muted } },
  ], { ...TX, x: M, y: 3.62, w: CW, h: 0.45, fontSize: 17 });
  s.addText('まず、なぜ記録が必要なのかから話します', {
    ...TX, x: M, y: 4.45, w: CW, h: 0.5, fontSize: 22, bold: true, color: C.ink });
  foot(s, 1, 'ヨルケア ／ 卒業制作');
}

/* ========== 2 12年の現場 ========== */
{
  const s = slide(
`② 12年の現場 ｜ 0:15 - 0:47（32秒）

私は12年以上、障がいのある方の就労支援をしています。働きたい人と会社のあいだに入って、働き続けられるように支える仕事です。

メンタル不調で体調を崩して、働き続けるのが難しくなる方に、何人も出会ってきました。

数字も同じです。日本人が【生涯に】うつ病を経験する割合は約6%。一度目のあと、再発する可能性は【約50%】。就職して1年以内に離職した精神障がいのある方は、【50.7%】です。

〔「生涯に」を落とさない。落とすと「今6%の人がうつ病」と読まれる〕
〔「約50%」は次の章の入口。強く言う〕`);
  kicker(s, 'WHY ／ ', '01 前提');
  title(s, '12年以上、障がいのある方の就労支援をしています', 30, 0.86, 0.7);
  const stats = [
    { n: '約6', u: '%', t: '日本人が生涯にうつ病を\n経験する割合', c: C.moon, hi: false },
    { n: '約50', u: '%', t: '初回のうつ病エピソード後に\n再発する可能性', c: C.moon, hi: true },
    { n: '50.7', u: '%', t: '精神障がい者が\n就職後1年以内に離職した割合', c: C.rose, hi: false },
  ];
  const cw = (CW - 0.5) / 3;
  stats.forEach((st, i) => {
    const x = M + i * (cw + 0.25);
    card(s, { x, y: 2.3, w: cw, h: 2.75, stroke: st.hi ? C.moon : C.line });
    s.addText([
      { text: st.n, options: { fontSize: 44, bold: true, color: st.c } },
      { text: st.u, options: { fontSize: 24, bold: true, color: st.c } },
    ], { ...TX, x: x + 0.3, y: 2.68, w: cw - 0.6, h: 0.8 });
    s.addText(st.t, { ...TX, x: x + 0.3, y: 3.7, w: cw - 0.6, h: 1.0,
      fontSize: 13, color: C.muted, lineSpacing: 20 });
  });
  s.addText(
    '国立精神・神経医療研究センター／Ishikawa et al.（2018）　｜　NICE, Depression in adults（NG222, 2022）　｜　JEED 障害者職業総合センター No.137（2017）\n' +
    '離職割合は、2015年7〜8月にハローワーク紹介で一般企業へ就職した精神障がい者1,206人の1年後定着率49.3%から算出。就労継続支援A型を除く。',
    { ...TX, x: M, y: 5.42, w: CW, h: 0.8, fontSize: 9.5, color: C.dim, lineSpacing: 16 });
  foot(s, 2, 'ヨルケア ／ 卒業制作');
}

/* ========== 3 なぜ記録が必要なのか ========== */
{
  const s = slide(
`③ なぜ記録が必要なのか ｜ 0:47 - 1:41（54秒）★この発表の核

〔いちばんゆっくり話す章。焦らない〕

再発する可能性が約50%ということは、【復職したあとも治療が続く】ということです。薬を続けるのか、減らすのか。それを決めるのは、【月に1回の診察】です。

その診察で、主治医は必ずこう聞きます。【「この1か月、どうでしたか」】

〔ここで一拍置く〕

本人は、【記憶で】答えます。

ここが問題です。人の記憶は、【その日の体調に引きずられます。】診察の日にたまたま調子が良ければ、しんどい日が10日あった月でも「まあまあでした」になる。

つまり今は、【治療を決める材料が、診察の日の気分で変わってしまう。】

私たち支援者が会えるのも、月に1回の面談だけです。【残りの29日を知っている人は、本人しかいません。】

だから記録が要ります。記録は、自分のためだけのものではなくて、【主治医が判断するための材料】です。`);
  kicker(s, 'WHY ／ ', '02 なぜ記録が必要なのか');
  title(s, '診察室で起きていること', 28, 0.86, 0.55);

  // 左：この1か月に、実際に起きたこと
  card(s, { x: M, y: 2.05, w: 2.85, h: 3.35 });
  s.addText('この1か月に、実際に起きたこと', { ...TX, x: M + 0.18, y: 2.25, w: 2.5, h: 0.25,
    fontSize: 10.5, color: C.muted });
  const wx = M + 0.22, ww = 2.4, wy = 2.78, wh = 1.5;
  const vals = [.42, .32, .5, .26, .74, .82, .56, .36, .78, .88, .6, .38];
  const pts = vals.map((v, i) => [wx + (ww * i) / (vals.length - 1), wy + wh * v]);
  polyline(s, pts, C.care, 2.25);
  [4, 5, 8, 9].forEach(i => {
    s.addShape(pres.ShapeType.ellipse, { x: pts[i][0] - 0.055, y: pts[i][1] - 0.055,
      w: 0.11, h: 0.11, fill: { color: C.rose }, line: { color: C.rose, width: 0.5 } });
  });
  s.addText('● しんどかった日', { ...TX, x: M + 0.18, y: 4.6, w: 2.5, h: 0.25,
    fontSize: 10, color: C.rose });
  s.addText('30日ぶん、毎日', { ...TX, x: M + 0.18, y: 4.9, w: 2.5, h: 0.25,
    fontSize: 10, color: C.dim });

  const yA = 2.95, yB = 4.6;   // 上下2本の道の中心
  // 道の名前
  s.addText('いま', { ...TX, x: 3.86, y: 2.19, w: 1.2, h: 0.25, fontSize: 11, bold: true, color: C.rose });
  s.addText('記録があると', { ...TX, x: 3.86, y: 3.84, w: 1.6, h: 0.25, fontSize: 11, bold: true, color: C.mint });

  // 上の道：記憶 →「まあまあでした」
  arrow(s, 3.52, yA, 3.82, yA, C.dim);
  card(s, { x: 3.86, y: yA - 0.45, w: 2.1, h: 0.9, fill: C.raised, stroke: C.rose });
  s.addText('記　憶', { ...TX, x: 3.86, y: yA - 0.34, w: 2.1, h: 0.32, fontSize: 16, bold: true,
    color: C.ink, align: 'center' });
  s.addText('その日の体調に引きずられる', { ...TX, x: 3.9, y: yA + 0.02, w: 2.02, h: 0.28,
    fontSize: 9.5, color: C.rose, align: 'center' });
  arrow(s, 5.98, yA, 6.34, yA, C.dim);
  card(s, { x: 6.38, y: yA - 0.5, w: 3.3, h: 1.0, fill: C.raised });
  s.addText('「この1か月、どうでしたか」', { ...TX, x: 6.58, y: yA - 0.36, w: 3.0, h: 0.28,
    fontSize: 10, color: C.dim });
  s.addText('「まあまあでした」', { ...TX, x: 6.58, y: yA - 0.02, w: 3.0, h: 0.4,
    fontSize: 18, bold: true, color: C.ink });
  arrow(s, 9.71, yA, 10.12, yA + 0.18, C.dim);

  // 下の道：記録 → 30日ぶんの事実
  arrow(s, 3.52, yB, 3.82, yB, C.mint);
  card(s, { x: 3.86, y: yB - 0.45, w: 2.1, h: 0.9, fill: C.raised, stroke: C.mint });
  s.addText('記　録', { ...TX, x: 3.86, y: yB - 0.34, w: 2.1, h: 0.32, fontSize: 16, bold: true,
    color: C.ink, align: 'center' });
  s.addText('1日1〜2分、その場で残す', { ...TX, x: 3.9, y: yB + 0.02, w: 2.02, h: 0.28,
    fontSize: 9.5, color: C.mint, align: 'center' });
  arrow(s, 5.98, yB, 6.34, yB, C.mint);
  card(s, { x: 6.38, y: yB - 0.5, w: 3.3, h: 1.0, fill: C.raised, stroke: C.mint });
  s.addText('「この1か月、どうでしたか」', { ...TX, x: 6.58, y: yB - 0.36, w: 3.0, h: 0.28,
    fontSize: 10, color: C.dim });
  s.addText('30日ぶんの事実', { ...TX, x: 6.58, y: yB - 0.02, w: 3.0, h: 0.4,
    fontSize: 18, bold: true, color: C.mint });
  arrow(s, 9.71, yB, 10.12, yB - 0.18, C.mint);

  // 右：治療の判断
  card(s, { x: 10.16, y: 2.92, w: 2.55, h: 1.9, stroke: C.moon });
  s.addText('月に1回の診察', { ...TX, x: 10.16, y: 3.16, w: 2.55, h: 0.28, fontSize: 11,
    color: C.moon, align: 'center' });
  s.addText('治療の判断', { ...TX, x: 10.16, y: 3.52, w: 2.55, h: 0.45, fontSize: 21, bold: true,
    color: C.ink, align: 'center' });
  s.addText('薬を続けるのか、減らすのか', { ...TX, x: 10.26, y: 4.1, w: 2.35, h: 0.45,
    fontSize: 11, color: C.muted, align: 'center', lineSpacing: 17 });

  s.addText([
    { text: '残りの', options: { color: C.ink } },
    { text: '29日', options: { color: C.moon } },
    { text: 'を知っている人は、本人しかいない', options: { color: C.ink } },
  ], { ...TX, x: M, y: 5.85, w: CW, h: 0.5, fontSize: 21, bold: true, align: 'center' });
  foot(s, 3, 'ヨルケア ／ 卒業制作');
}

/* ========== 4 でも、続かない ========== */
{
  const s = slide(
`④ でも、続かない ｜ 1:41 - 2:03（22秒）

ところが、その記録が続きません。

現場で聞くのは、決まって2つです。ひとつ、【日々記録するツールはあるが、使いづらくて続かない。】もうひとつ、【続いたとしても、3分の診察で整理して伝えきれない。】

続かなければ材料がない。伝わらなければ、材料になりません。`);
  kicker(s, 'PROBLEM ／ ', '03 ところが');
  title(s, 'その記録が、続かない', 30, 0.86, 0.6);

  const bw = 2.16, gap = (CW - bw * 5) / 4, by = 2.15, bh = 0.78;
  const chain = [
    { t: '状態を記録する', hot: true },
    { t: 'セルフケア', hot: false },
    { t: '主治医に伝える', hot: true },
    { t: '治療・服薬調整', hot: false },
    { t: '働き続ける', hot: false },
  ];
  chain.forEach((c, i) => {
    const x = M + i * (bw + gap);
    card(s, { x, y: by, w: bw, h: bh, fill: c.hot ? C.raised : C.surface,
      stroke: c.hot ? C.rose : C.line });
    s.addText(c.t, { ...TX, x, y: by + 0.22, w: bw, h: 0.3, fontSize: 12.5,
      bold: c.hot, color: c.hot ? C.ink : C.muted, align: 'center' });
    if (c.hot) s.addText('詰まり' + (i === 0 ? '①' : '②'), { ...TX, x, y: by - 0.34, w: bw, h: 0.28,
      fontSize: 11, bold: true, color: C.rose, align: 'center' });
    if (i < 4) arrow(s, x + bw + 0.04, by + bh / 2, x + bw + gap - 0.04, by + bh / 2, C.dim);
  });
  // 毎日くり返す、を示す戻りの線
  const lastX = M + 4 * (bw + gap) + bw / 2, firstX = M + bw / 2, ry = by + bh + 0.3;
  s.addShape(pres.ShapeType.line, { x: lastX, y: by + bh, w: 0, h: 0.3,
    line: { color: C.dim, width: 1.25, dashType: 'dash' } });
  s.addShape(pres.ShapeType.line, { x: firstX, y: ry, w: lastX - firstX, h: 0,
    line: { color: C.dim, width: 1.25, dashType: 'dash' } });
  s.addShape(pres.ShapeType.line, { x: firstX, y: by + bh, w: 0, h: 0.3,
    line: { color: C.dim, width: 1.25, dashType: 'dash', endArrowType: 'triangle' }, flipV: true });
  s.addText('毎日、本人がひとりで回している', { ...TX, x: M, y: ry + 0.08, w: CW, h: 0.28,
    fontSize: 10.5, color: C.dim, align: 'center' });

  const hw = (CW - 0.35) / 2;
  [['①', '日々記録するツールはあるが、\n使いづらくて続かない'],
   ['②', '続いたとしても、3分の診察で\n整理して伝えきれない']].forEach((d, i) => {
    const x = M + i * (hw + 0.35);
    card(s, { x, y: 4.2, w: hw, h: 1.45 });
    s.addText([
      { text: d[0] + '　', options: { color: C.rose, bold: true } },
      { text: d[1], options: { color: C.ink, bold: true } },
    ], { ...TX, x: x + 0.32, y: 4.55, w: hw - 0.64, h: 0.8, fontSize: 15, lineSpacing: 26 });
  });
  s.addText('続かなければ材料がない。伝わらなければ、材料になりません。',
    { ...TX, x: M, y: 5.95, w: CW, h: 0.4, fontSize: 15, color: C.muted });
  foot(s, 4, 'ヨルケア ／ 卒業制作');
}

/* ========== 5 3つの条件 ========== */
{
  const s = slide(
`⑤ 3つの条件 ｜ 2:03 - 2:30（27秒）

この2か所を、自分の見立てで直したくなかったので、企業で働いている精神障がいのある方に聞きました。

返ってきたのは、ほしい機能ではなく、【3つの条件】でした。

ひとつ。【Excelでの管理が大変で、続けるのがつらい。】

ふたつ。【会社のものだと、土日は書けない。】

みっつ。【会社の人に見られないようにしたい。】

〔1つずつ、間を置いて読む〕`);
  kicker(s, 'RESEARCH ／ ', '04 当事者に聞いた');
  s.addText([
    { text: '返ってきたのは、ほしい機能ではなく\n', options: { color: C.ink } },
    { text: '3つの条件', options: { color: C.moon } },
    { text: 'でした', options: { color: C.ink } },
  ], { ...TX, x: M, y: 0.86, w: CW, h: 1.1, fontSize: 30, bold: true, lineSpacing: 42 });

  [['条件 01', 'Excelでの管理が大変で、続けるのがつらい'],
   ['条件 02', '会社のものだと、土日は書けない'],
   ['条件 03', '会社の人に見られないようにしたい']].forEach((q, i) => {
    const y = 2.5 + i * 1.42;
    card(s, { x: M, y, w: CW, h: 1.22 });
    // 引用の目印。飾りの帯ではなく、番号を置く
    s.addText(q[0], { ...TX, x: M + 0.42, y: y + 0.2, w: 2.0, h: 0.26, fontSize: 10,
      color: C.moon, charSpacing: 1.5 });
    s.addText(q[1], { ...TX, x: M + 0.42, y: y + 0.56, w: CW - 0.84, h: 0.45,
      fontSize: 21, bold: true, color: C.ink });
  });
  foot(s, 5, 'ヨルケア ／ 卒業制作');
}

/* ========== 6 デモ ========== */
{
  const s = slide(
`⑥ デモ ｜ 2:30 - 3:40（70秒）

〔このスライドに動画は入っていません。media/demo.mp4 を別に開いて流すか、Google スライドなら動画を Drive へ上げて挿入してください〕

〔前振り 9秒〕
作ったのがこれです。ブラウザで開くだけ。ログインもインストールも要りません。46秒の動画でお見せします。

── 再生。以下を上からかぶせる。余ったら黙って待つ ──

〔0-8秒｜記録画面〕
開いて最初に出るのは、よい・ふつう・しんどい、の3つだけです。ひとつ押して保存すれば、その日の記録は終わりです。

〔8-16秒｜任意項目〕
書ける日は、睡眠やメモを足せます。【どの項目を出すかは、主治医と相談して選べます。】〔⑦の伏線。はっきり言う〕

〔16-24秒｜一覧〕
ためた記録は一覧で見返せます。書かなかった日は空欄のまま置いて、責める言葉は出しません。

〔24-36秒｜ふりかえり・グラフ〕
ふりかえりでは、積み重ねと、気分や睡眠の変化をグラフで見られます。連続日数は主役にしていません。中断しても減らない数字を、先に置いています。

〔36-47秒｜相談先〕
最後が相談先の検索です。東京都のオープンデータから、58の区市町村、163か所の保健所と保健センターを、住所と電話番号つきで引けます。

── 動画が止まってから。受け 14秒。早口にしない ──
今の記録は、すべてダミーデータです。それと、前提をひとつ。【ヨルケアは、診断も治療もしません。】良し悪しも言いません。主治医に伝える材料を作る道具に徹しています。`);
  kicker(s, 'DEMO ／ ', '（ここでデモ動画を流す）');
  title(s, 'ブラウザで開くだけ。ログインもインストールも要りません', 25, 0.86, 0.55);
  const shots = [
    ['today-state.png', '書く', '開いて最初に出るのは3つだけ'],
    ['records.png', 'これまで', '書かなかった日は空欄のまま置く'],
    ['reflection-chart.png', 'ふりかえり', '記録がある日だけ線でつなぐ'],
  ];
  const iw = 1.62, ih = iw * (844 / 390), gapx = 1.15;
  const total = iw * 3 + gapx * 2, sx = (W - total) / 2;
  shots.forEach((sh, i) => {
    const x = sx + i * (iw + gapx);
    s.addImage({ path: path.join(MEDIA, sh[0]), x, y: 1.72, w: iw, h: ih });
    s.addText(sh[1], { ...TX, x: x - 0.5, y: 1.72 + ih + 0.16, w: iw + 1.0, h: 0.28,
      fontSize: 14, bold: true, color: C.moon, align: 'center' });
    s.addText(sh[2], { ...TX, x: x - 0.5, y: 1.72 + ih + 0.48, w: iw + 1.0, h: 0.28,
      fontSize: 10.5, color: C.muted, align: 'center' });
  });
  s.addText('画面はすべて検証用のダミーデータ', { ...TX, x: M, y: H - 0.9, w: CW, h: 0.28,
    fontSize: 10, color: C.dim, align: 'center' });
  foot(s, 6, 'ヨルケア ／ 卒業制作');
}

/* ========== 7 なぜヨルケアなのか ========== */
{
  const s = slide(
`⑦ なぜヨルケアなのか ｜ 3:40 - 4:40（60秒）★この発表の核

では、【Excelでも紙の手帳でもいいのでは】、と思われるかもしれません。実際、それで続いている方もいます。

ヨルケアが違うのは、3つです。

【ひとつ。1件が成立する条件が、いちばん軽い。】状態をひとつ選べば、その日の記録になります。表は、列が埋まらないと書いた気になりません。【しんどい日ほど、ここが効きます。】

【ふたつ。記録する項目を、主治医と相談して選べる。】当事者と、その主治医と、支援者にレビューしてもらって出てきた形です。一般の記録アプリは、項目が作った人の決めたものに固定されています。ヨルケアは出し入れできるので、【その人の治療方針に合った記録】になる。だから、診察で使えます。

【みっつ。外に出ない。】クラウドのアプリは、記録を運営に預けることになります。ヨルケアには、外に送る実装がありません。【外へ出た記録の本文は、0件です。】

続く軽さと、主治医に合わせられること。【この両立】が、ヨルケアの答えです。

〔比較であって否定ではない。「他はダメ」と言わない〕`);
  kicker(s, 'WHY THIS ／ ', '05 なぜヨルケアなのか');
  title(s, 'Excelでも紙の手帳でもいいのでは、と思われるかもしれません', 25, 0.86, 0.55);

  const head = (t, hi) => ({ text: t, options: { bold: true, fontSize: 12,
    color: hi ? C.mint : C.dim, fill: { color: hi ? '15342B' : C.ground }, valign: 'middle' } });
  const cell = (t, hi) => ({ text: t, options: { fontSize: 12.5, color: hi ? C.ink : C.muted,
    bold: hi, fill: { color: hi ? '15342B' : C.ground }, valign: 'middle' } });
  const lbl = t => ({ text: t, options: { fontSize: 11, color: C.muted, valign: 'middle' } });

  s.addTable([
    [lbl(''), head('紙の手帳・Excel', false), head('一般の記録アプリ', false), head('ヨルケア', true)],
    [lbl('1件が成立する条件'), cell('列が埋まらないと\n書いた気にならない'),
      cell('項目が多く、\n通知と連続日数で急かす'), cell('状態をひとつ選ぶだけ', true)],
    [lbl('記録する項目'), cell('自由。ただし続かない'),
      cell('作った人が決めたもので固定'), cell('主治医と相談して\n出し入れできる', true)],
    [lbl('記録の置き場所'), cell('手元、または会社のもの'),
      cell('運営に預ける'), cell('端末のなか。\n外に送る実装がない', true)],
  ], {
    x: M, y: 1.72, w: CW, colW: [2.3, 3.2, 3.35, 3.24],
    rowH: [0.5, 0.95, 0.95, 0.95],
    fontFace: F, border: { type: 'solid', color: C.line, pt: 0.75 },
    margin: [6, 10, 6, 10],
  });

  card(s, { x: M, y: 5.65, w: CW, h: 0.9 });
  s.addText([
    { text: '0', options: { fontSize: 30, bold: true, color: C.mint } },
    { text: '  件 ── 端末の外へ出た記録の本文', options: { fontSize: 13, color: C.muted } },
  ], { ...TX, x: M + 0.32, y: 5.88, w: 5.0, h: 0.45 });
  s.addText([
    { text: '続く軽さ', options: { color: C.mint } },
    { text: 'と', options: { color: C.ink } },
    { text: '主治医に合わせられること', options: { color: C.mint } },
    { text: 'の両立が、答えです', options: { color: C.ink } },
  ], { ...TX, x: M + 5.4, y: 5.96, w: CW - 5.75, h: 0.35, fontSize: 14, bold: true, align: 'right' });
  foot(s, 7, 'ヨルケア ／ 卒業制作');
}

/* ========== 8 苦戦 ========== */
{
  const s = slide(
`⑧ 苦戦したところ ｜ 4:40 - 5:16（36秒）

うまくいった話より、こちらのほうが学びが残りました。

保存したあとに、書いた紙が本になって、書庫にしまわれる3Dの演出を作っていました。〔押していたらここを飛ばす→〕革と紙と木の質感、カメラの動き、音まで詰めて、【3週間】、いちばん時間をかけた部分です。

実機で触ってもらった結果は、「毎日やるには要らない」。

【7秒かかるんです。】1〜2分で終わるという約束と両立しません。【条件1に、自分で反していました。】

3D一式も、音も、テストも、全部消しました。`);
  kicker(s, 'WHAT WENT WRONG ／ ', '06 苦戦したところ');
  title(s, '3週間かけた演出を、全部消しました', 30, 0.86, 0.6);

  const cwd = (CW - 1.1) / 2;
  card(s, { x: M, y: 2.3, w: cwd, h: 2.3 });
  s.addText('3週間', { ...TX, x: M + 0.32, y: 2.56, w: cwd - 0.64, h: 0.6, fontSize: 34,
    bold: true, color: C.moon });
  s.addText('記録を保存すると、書いた紙が本になって書庫にしまわれる3Dの演出。革と紙と木の質感、カメラの動き、音まで詰めた',
    { ...TX, x: M + 0.32, y: 3.3, w: cwd - 0.64, h: 1.1, fontSize: 12.5, color: C.muted, lineSpacing: 21 });

  s.addText('→', { ...TX, x: M + cwd, y: 3.25, w: 1.1, h: 0.4, fontSize: 24, color: C.dim, align: 'center' });

  const x2 = M + cwd + 1.1;
  card(s, { x: x2, y: 2.3, w: cwd, h: 2.3, stroke: C.rose });
  s.addText('7秒', { ...TX, x: x2 + 0.32, y: 2.56, w: cwd - 0.64, h: 0.6, fontSize: 34,
    bold: true, color: C.rose });
  s.addText([
    { text: '実機で触ってもらった結果は「毎日やるには要らない」。', options: { color: C.muted } },
    { text: '1〜2分で終わるという約束と両立しない', options: { color: C.ink, bold: true } },
  ], { ...TX, x: x2 + 0.32, y: 3.3, w: cwd - 0.64, h: 1.1, fontSize: 12.5, lineSpacing: 21 });

  s.addText('条件1に、自分で反していました', { ...TX, x: M, y: 5.05, w: CW, h: 0.5,
    fontSize: 24, bold: true, color: C.moon, align: 'center' });
  s.addText('3D一式も、音も、テストも、依存関係まで全部削除', { ...TX, x: M, y: 5.68, w: CW, h: 0.35,
    fontSize: 13, color: C.muted, align: 'center' });
  foot(s, 8, 'ヨルケア ／ 卒業制作');
}

/* ========== 9 これから ========== */
{
  const s = slide(
`⑨ これから ｜ 5:16 - 5:43（27秒）

これからは、5人に実機で触ってもらって、補助なしで2分以内に記録できるかを測ります。続く兆しが出なければ、リマインド通知もクラウド保存も作りません。【作れないのではなく、まだ作らないと決めています。】

半年で身についたのは、作る速さより、【作らない判断を、根拠つきで残す書き方】でした。

ありがとうございました。

〔URLを出したまま話す〕`);
  kicker(s, 'NEXT ／ ', '07 これから');
  title(s, '作らない判断を、根拠つきで残す', 30, 0.86, 0.6);

  const sw = (CW - 0.5) / 3;
  [['STEP 1', '実機テストを終える', '5人に無誘導で触ってもらい、補助なしで2分以内に保存できるかを測る'],
   ['STEP 2', 'Gate 1 を判定する', '続く兆しが出なければ、リマインド通知もクラウド保存も作らない'],
   ['STEP 3', '診察・面談で使ってもらう', '記録から組み立てた文章が、実際に伝わるかを確かめる']].forEach((st, i) => {
    const x = M + i * (sw + 0.25);
    card(s, { x, y: 2.3, w: sw, h: 2.2 });
    s.addText(st[0], { ...TX, x: x + 0.3, y: 2.56, w: sw - 0.6, h: 0.26, fontSize: 10,
      bold: true, color: C.moon, charSpacing: 1.5 });
    s.addText(st[1], { ...TX, x: x + 0.3, y: 2.9, w: sw - 0.6, h: 0.4, fontSize: 16,
      bold: true, color: C.ink });
    s.addText(st[2], { ...TX, x: x + 0.3, y: 3.42, w: sw - 0.6, h: 0.75, fontSize: 11.5,
      color: C.muted, lineSpacing: 19 });
  });

  s.addText('TRY IT', { ...TX, x: M, y: 5.1, w: 3.0, h: 0.25, fontSize: 10, color: C.dim, charSpacing: 2 });
  s.addText('yorucare.vercel.app', { ...TX, x: M, y: 5.4, w: 4.6, h: 0.45, fontSize: 22,
    bold: true, color: C.moon });
  s.addText(
    'ヨルケアは、診断・治療・処方を行うものではありません。医療の代替ではなく、本人が自分の状態を把握し、主治医・支援者へ伝える材料を作るためのセルフケアの道具です。\n' +
    '画面はすべて検証用のダミーデータ。現場で見てきた内容は個人が特定されない形に一般化しています。',
    { ...TX, x: M + 5.3, y: 5.12, w: CW - 5.3, h: 1.0, fontSize: 9.5, color: C.dim,
      lineSpacing: 16 });
  foot(s, 9, 'ヨルケア ／ 卒業制作');
}

pres.writeFile({ fileName: OUT }).then(f => console.log('wrote', f));
