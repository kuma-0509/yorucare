import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function extractProposal(mdPath) {
  const md = fs.readFileSync(mdPath, "utf8");
  const m = md.match(/```\r?\n([\s\S]*?)\r?\n```/);
  if (!m) throw new Error(`no code block in ${mdPath}`);
  return m[1].trim();
}

function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const before = extractProposal(
  path.join(root, "docs/proposal-presentation-employed-users-v1-original.md"),
);
const after = extractProposal(
  path.join(root, "docs/proposal-presentation-employed-users.md"),
);

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>提案スキルチューニング図解 | AI Driven School 提出用</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Zen+Maru+Gothic:wght@500;700;900&display=swap" rel="stylesheet" />
<script>
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans JP"', 'sans-serif'],
        maru: ['"Zen Maru Gothic"', 'sans-serif'],
      },
      colors: {
        night: { 950:'#0b1026', 900:'#111736', 800:'#1a2148', 700:'#252d5c' },
        moon: { 300:'#fde68a', 400:'#fcd34d' },
        care: { 300:'#a5b4fc', 400:'#818cf8', 500:'#6366f1' },
      },
      keyframes: {
        fadeUp: { '0%':{opacity:'0',transform:'translateY(24px)'}, '100%':{opacity:'1',transform:'translateY(0)'} },
        twinkle: { '0%,100%':{opacity:'0.25'}, '50%':{opacity:'1'} },
      },
      animation: {
        fadeUp: 'fadeUp 0.7s ease-out both',
        twinkle: 'twinkle 3s ease-in-out infinite',
      },
    },
  },
};
</script>
<style>
  html { scroll-behavior: smooth; }
  .reveal { opacity: 0; transform: translateY(28px); transition: opacity .7s ease, transform .7s ease; }
  .reveal.is-visible { opacity: 1; transform: translateY(0); }
  .proposal-box {
    max-height: 28rem;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 0.8125rem;
    line-height: 1.7;
  }
  ::selection { background: #6366f1; color: #fff; }
</style>
</head>
<body class="bg-night-950 text-slate-200 font-sans antialiased">

<nav class="fixed top-0 inset-x-0 z-50 bg-night-950/85 backdrop-blur border-b border-white/10">
  <div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
    <a href="#top" class="flex items-center gap-2 shrink-0">
      <span class="w-8 h-8 rounded-full bg-gradient-to-br from-care-500 to-night-700 grid place-items-center text-moon-300 font-maru font-black">夜</span>
      <span class="font-maru font-bold text-white tracking-wide hidden sm:inline">提案スキルチューニング図解</span>
    </a>
    <div class="flex items-center gap-1 text-xs sm:text-sm overflow-x-auto">
      <a href="#sec-who" class="px-3 py-1.5 rounded-full hover:bg-white/10 whitespace-nowrap">①相手と変えたいこと</a>
      <a href="#sec-before" class="px-3 py-1.5 rounded-full hover:bg-white/10 whitespace-nowrap">②チューニング前</a>
      <a href="#sec-after" class="px-3 py-1.5 rounded-full hover:bg-white/10 whitespace-nowrap">③チューニング後</a>
      <a href="#sec-learn" class="px-3 py-1.5 rounded-full hover:bg-white/10 whitespace-nowrap">④工夫と苦戦</a>
    </div>
  </div>
  <div id="progress-bar" class="h-0.5 bg-gradient-to-r from-care-400 to-moon-400 w-0 transition-[width] duration-150"></div>
</nav>

<header id="top" class="relative overflow-hidden pt-28 pb-16 px-4">
  <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
    <span class="absolute top-16 left-[12%] w-1 h-1 rounded-full bg-white animate-twinkle"></span>
    <span class="absolute top-32 left-[28%] w-1.5 h-1.5 rounded-full bg-moon-300 animate-twinkle" style="animation-delay:.8s"></span>
    <span class="absolute top-20 right-[18%] w-1 h-1 rounded-full bg-white animate-twinkle" style="animation-delay:1.4s"></span>
    <div class="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-care-500/20 blur-3xl"></div>
    <div class="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-moon-400/10 blur-3xl"></div>
  </div>
  <div class="relative max-w-4xl mx-auto text-center animate-fadeUp">
    <p class="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-moon-300 border border-moon-300/40 rounded-full px-4 py-1.5 mb-6">
      AI DRIVEN SCHOOL ／ 5ヶ月目 提出用図解
    </p>
    <h1 class="font-maru font-black text-3xl sm:text-5xl leading-tight text-white">
      ヨルケア参加提案のための<br class="hidden sm:block" />
      <span class="text-transparent bg-clip-text bg-gradient-to-r from-care-300 to-moon-300">提案スキルチューニング</span>
    </h1>
    <p class="mt-6 text-slate-300 leading-relaxed max-w-2xl mx-auto">
      配布スキルを自分の業務向けにチューニングし、<br class="hidden sm:block" />
      AIによる一発出しの提案文（前後）と学びをまとめた提出用図解です。
    </p>
    <div class="mt-8 flex flex-wrap justify-center gap-3 text-sm">
      <span class="px-4 py-2 rounded-xl bg-night-800 border border-white/10">必須4項目を掲載</span>
      <span class="px-4 py-2 rounded-xl bg-night-800 border border-white/10">ルール：手で直さず、渡すものを直す</span>
      <span class="px-4 py-2 rounded-xl bg-night-800 border border-white/10">スキル：writing-proposals</span>
    </div>
    <p class="mt-5 text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
      発表では全文を読み上げず、<span class="text-moon-300">「発表で指すところ」</span>の帯と結論行だけを追います。全文は提出用にそのまま残しています。
    </p>
  </div>
</header>

<main class="max-w-6xl mx-auto px-4 pb-24 space-y-20">

<section class="reveal scroll-mt-24">
  <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
    <a href="#sec-who" class="rounded-2xl bg-night-900 border border-white/10 p-5 hover:border-care-400/50 transition-colors">
      <p class="text-xs font-bold text-care-300 tracking-widest mb-2">必須①</p>
      <p class="font-maru font-bold text-white">相手と変えたいこと</p>
    </a>
    <a href="#sec-before" class="rounded-2xl bg-night-900 border border-white/10 p-5 hover:border-rose-400/50 transition-colors">
      <p class="text-xs font-bold text-rose-300 tracking-widest mb-2">必須②</p>
      <p class="font-maru font-bold text-white">チューニング前の提案文</p>
    </a>
    <a href="#sec-after" class="rounded-2xl bg-night-900 border border-white/10 p-5 hover:border-emerald-400/50 transition-colors">
      <p class="text-xs font-bold text-emerald-300 tracking-widest mb-2">必須③</p>
      <p class="font-maru font-bold text-white">チューニング後の提案文</p>
    </a>
    <a href="#sec-learn" class="rounded-2xl bg-night-900 border border-white/10 p-5 hover:border-moon-300/50 transition-colors">
      <p class="text-xs font-bold text-moon-300 tracking-widest mb-2">必須④</p>
      <p class="font-maru font-bold text-white">工夫と苦戦</p>
    </a>
  </div>
  <div class="mt-6 rounded-2xl border border-white/10 bg-night-900/80 p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
    <div class="flex-1">
      <p class="text-xs text-slate-500 mb-1">Before（配布スキルのまま）</p>
      <p class="font-maru font-bold text-slate-300">アプリの1週間無料体験案内</p>
      <p class="text-xs text-slate-500 mt-1">「ヨルケアを1週間、無料で試してほしい」</p>
    </div>
    <div class="text-moon-300 font-black text-2xl self-center">→</div>
    <div class="flex-1">
      <p class="text-xs text-care-300 mb-1">After（自分専用スキル）</p>
      <p class="font-maru font-bold text-white">生活の変化を提案する文章</p>
      <p class="text-xs text-slate-400 mt-1">「夜と休日の過ごし方を、5か月だけ一緒に変えてみてほしい」</p>
    </div>
  </div>
</section>

<section id="sec-who" class="reveal scroll-mt-24">
  <div class="flex items-center gap-3 mb-2">
    <span class="w-10 h-10 rounded-xl bg-care-500/20 border border-care-400/40 grid place-items-center font-maru font-black text-care-300">①</span>
    <h2 class="font-maru font-black text-2xl sm:text-3xl text-white">想定した相手と、変えたいこと</h2>
  </div>
  <p class="text-slate-400 mb-8 ml-[3.25rem]">誰の、何を変える提案なのか</p>

  <div class="grid md:grid-cols-2 gap-4">
    <div class="rounded-2xl bg-night-900 border border-care-400/30 p-6">
      <p class="text-xs font-bold tracking-widest text-care-300 mb-3">想定した相手</p>
      <h3 class="font-maru font-bold text-xl text-white mb-4">就労中のメンタル不調経験者（本人）</h3>
      <ul class="space-y-2 text-sm text-slate-300">
        <li>・不調を経験したあと、現在は働いている</li>
        <li>・平日は何とか踏ん張れるが、夜・休日に気力・体力が落ちやすい</li>
        <li>・セルフケアが大事なのは分かるが、一人だと習慣化が難しい</li>
        <li>・主治医・支援者に最近の状態を整理して伝えるのが大変</li>
      </ul>
      <p class="mt-5 text-xs leading-relaxed text-slate-400 border-t border-white/10 pt-4">
        配布スキル標準の「忙しい・せっかちな決裁者」ではなく、<br />
        <span class="text-moon-300">警戒心がありつつ、自分の生活は自分で決めたい意思決定者</span>として扱う。
      </p>
    </div>
    <div class="rounded-2xl bg-night-900 border border-moon-300/30 p-6">
      <p class="text-xs font-bold tracking-widest text-moon-300 mb-3">変えたいこと</p>
      <h3 class="font-maru font-bold text-xl text-white mb-4">夜と休日の過ごし方を変え、ヨルケアに参加してもらう</h3>
      <p class="text-sm text-slate-300 leading-relaxed mb-4">
        企業向けの導入提案ではなく、本人に対して<br />
        「運動・記録・振り返り・仲間とのつながりを5か月間試してみませんか」と提案する。
      </p>
      <div class="rounded-xl bg-night-950/70 border border-white/10 p-4 text-sm text-slate-300 leading-relaxed">
        <p class="font-bold text-white mb-2">言い切りたいこと</p>
        <p>ヨルケアは治療の代わりではない。<br />働き続けるための心身の土台を、夜と休日に整える5か月間のオンラインプログラムに参加してほしい。</p>
      </div>
    </div>
  </div>

  <div class="mt-4 rounded-2xl border border-moon-300/40 bg-gradient-to-r from-moon-400/10 to-care-500/10 p-5 sm:p-6">
    <p class="text-xs font-bold tracking-widest text-moon-300 mb-2">ヨルケアとは（1行）</p>
    <p class="font-maru font-bold text-white text-base sm:text-lg leading-relaxed">
      夜と休日向けの、運動・記録・振り返り・仲間の5か月オンラインプログラム。<span class="text-moon-300">治療ではない。</span>
    </p>
  </div>
</section>

<section id="sec-before" class="reveal scroll-mt-24">
  <div class="flex items-center gap-3 mb-2">
    <span class="w-10 h-10 rounded-xl bg-rose-400/20 border border-rose-400/40 grid place-items-center font-maru font-black text-rose-300">②</span>
    <h2 class="font-maru font-black text-2xl sm:text-3xl text-white">チューニング前のスキルで作成した提案文</h2>
  </div>
  <p class="text-slate-400 mb-4">ステップ②：配布されたままの writing-proposals から出力した提案文（手直しなし・そのまま掲載）</p>
  <div class="mb-4 flex flex-wrap gap-2 text-xs">
    <span class="px-3 py-1 rounded-full bg-rose-400/10 border border-rose-400/30 text-rose-200">出典：proposal-presentation-employed-users-v1-original.md</span>
    <span class="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400">結論：「1週間、無料で試してほしい」＝アプリ体験案内</span>
  </div>

  <div class="mb-4 rounded-2xl border border-rose-400/40 bg-rose-400/10 p-5">
    <p class="text-xs font-bold tracking-widest text-rose-200 mb-3">発表で指すところ（全文は読まない）</p>
    <div class="grid sm:grid-cols-3 gap-3 text-sm">
      <div class="rounded-xl bg-night-950/50 border border-white/10 p-3">
        <p class="text-xs text-slate-500 mb-1">結論</p>
        <p class="font-bold text-white leading-snug">1週間、無料で試してほしい</p>
      </div>
      <div class="rounded-xl bg-night-950/50 border border-white/10 p-3">
        <p class="text-xs text-slate-500 mb-1">中身の見え方</p>
        <p class="font-bold text-white leading-snug">記録アプリの体験案内</p>
      </div>
      <div class="rounded-xl bg-night-950/50 border border-white/10 p-3">
        <p class="text-xs text-slate-500 mb-1">お願い</p>
        <p class="font-bold text-white leading-snug">今日1回、記録してみて</p>
      </div>
    </div>
  </div>

  <div class="rounded-2xl bg-night-900 border border-rose-400/25 overflow-hidden">
    <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
      <p class="text-sm font-bold text-rose-200">チューニング前・一発出し全文（提出用）</p>
      <p class="text-xs text-slate-500">必要ならスクロール</p>
    </div>
    <pre class="proposal-box p-4 sm:p-6 text-slate-300 font-sans">${esc(before)}</pre>
  </div>
</section>

<section id="sec-after" class="reveal scroll-mt-24">
  <div class="flex items-center gap-3 mb-2">
    <span class="w-10 h-10 rounded-xl bg-emerald-400/20 border border-emerald-400/40 grid place-items-center font-maru font-black text-emerald-300">③</span>
    <h2 class="font-maru font-black text-2xl sm:text-3xl text-white">チューニング後のスキルでAIによる一発出しした提案文</h2>
  </div>
  <p class="text-slate-400 mb-4">ステップ⑤：自分専用にチューニングしたスキルでの一発出し（手作業の文章修正なし・そのまま掲載）</p>
  <div class="mb-4 flex flex-wrap gap-2 text-xs">
    <span class="px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-200">出典：proposal-presentation-employed-users.md</span>
    <span class="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400">結論：「夜と休日の過ごし方を、5か月だけ変えてほしい」</span>
  </div>

  <div class="mb-4 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-5">
    <p class="text-xs font-bold tracking-widest text-emerald-200 mb-3">発表で指すところ（全文は読まない）</p>
    <div class="grid sm:grid-cols-3 gap-3 text-sm">
      <div class="rounded-xl bg-night-950/50 border border-white/10 p-3">
        <p class="text-xs text-slate-500 mb-1">結論</p>
        <p class="font-bold text-white leading-snug">夜と休日を、5か月だけ変えてほしい</p>
      </div>
      <div class="rounded-xl bg-night-950/50 border border-white/10 p-3">
        <p class="text-xs text-slate-500 mb-1">相手の状況</p>
        <p class="font-bold text-white leading-snug">復職後も残る、夜・休日の空白</p>
      </div>
      <div class="rounded-xl bg-night-950/50 border border-white/10 p-3">
        <p class="text-xs text-slate-500 mb-1">お願い</p>
        <p class="font-bold text-white leading-snug">今日の記録 ＋ プログラム案内</p>
      </div>
    </div>
    <p class="mt-3 text-xs text-slate-400 leading-relaxed">詳細（週の分数・ガイドライン番号など）は提出用全文に残し、発表では追わない。</p>
  </div>

  <div class="rounded-2xl bg-night-900 border border-emerald-400/25 overflow-hidden">
    <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
      <p class="text-sm font-bold text-emerald-200">チューニング後・一発出し全文（提出用）</p>
      <p class="text-xs text-slate-500">必要ならスクロール</p>
    </div>
    <pre class="proposal-box p-4 sm:p-6 text-slate-200 font-sans">${esc(after)}</pre>
  </div>
</section>

<section id="sec-learn" class="reveal scroll-mt-24">
  <div class="flex items-center gap-3 mb-2">
    <span class="w-10 h-10 rounded-xl bg-moon-400/20 border border-moon-300/40 grid place-items-center font-maru font-black text-moon-300">④</span>
    <h2 class="font-maru font-black text-2xl sm:text-3xl text-white">工夫したポイントと苦戦したポイント</h2>
  </div>
  <p class="text-slate-400 mb-6">スキルをどうチューニングしたか／線引き／やり直したこと</p>

  <div class="mb-8 rounded-2xl border border-moon-300/40 bg-night-900 p-5 sm:p-6">
    <p class="text-xs font-bold tracking-widest text-moon-300 mb-4">発表で先に伝える学び（3つ）</p>
    <div class="grid md:grid-cols-3 gap-3">
      <div class="rounded-xl bg-moon-400/10 border border-moon-300/30 p-4">
        <p class="text-xs text-moon-300 font-bold mb-2">1. お手本1本</p>
        <p class="text-sm text-white font-bold mb-2">模範回答をスキルに渡す</p>
        <p class="text-xs text-slate-400 leading-relaxed">「もっとこうして」と注文を増やすより、5か月版のお手本1本の方が出力が寄った。</p>
      </div>
      <div class="rounded-xl bg-moon-400/10 border border-moon-300/30 p-4">
        <p class="text-xs text-moon-300 font-bold mb-2">2. 事実突合</p>
        <p class="text-sm text-white font-bold mb-2">実装と突き合わせてから断言</p>
        <p class="text-xs text-slate-400 leading-relaxed">未実装機能の断言や、プライバシーの過剰断言を防ぐガードレールを追加した。</p>
      </div>
      <div class="rounded-xl bg-moon-400/10 border border-moon-300/30 p-4">
        <p class="text-xs text-moon-300 font-bold mb-2">3. 線引き</p>
        <p class="text-sm text-white font-bold mb-2">手で直さず、渡すものを直す</p>
        <p class="text-xs text-slate-400 leading-relaxed">出力の手直しは禁止。気になる点はスキル／材料を直して最初から再実行した。</p>
      </div>
    </div>
  </div>

  <div class="grid md:grid-cols-2 gap-4 mb-8">
    <div class="rounded-2xl bg-night-900 border border-emerald-400/30 p-6">
      <p class="font-maru font-bold text-emerald-300 mb-4">工夫したポイント（詳細）</p>
      <ul class="space-y-4 text-sm text-slate-300">
        <li>
          <p class="font-bold text-white mb-1">相手像を入れ替えた</p>
          <p class="text-xs text-slate-400 leading-relaxed">「せっかちな決裁者」→「警戒心があるが自分で決めたい本人」。企業向け導入提案から、生活を変える提案へ軸を移した。</p>
        </li>
        <li>
          <p class="font-bold text-white mb-1">模範回答をスキルに渡した</p>
          <p class="text-xs text-slate-400 leading-relaxed">チャットで注文を増やすより、お手本1本を入れる方が再現性が高かった。</p>
        </li>
        <li>
          <p class="font-bold text-white mb-1">コンテキストを固定した</p>
          <p class="text-xs text-slate-400 leading-relaxed">サービス定義文、copy.ts、根拠3系統（事業・医学・プログラム仕様）、プライバシー3層を毎回参照する形にした。</p>
        </li>
        <li>
          <p class="font-bold text-white mb-1">事実ガードレールを追加した</p>
          <p class="text-xs text-slate-400 leading-relaxed">未実装機能の断言禁止、送信有無を「記録本文／共有／匿名計測」に分解してから書くルールを入れた。</p>
        </li>
      </ul>
    </div>
    <div class="rounded-2xl bg-night-900 border border-rose-400/30 p-6">
      <p class="font-maru font-bold text-rose-300 mb-4">苦戦したポイント（詳細）</p>
      <ul class="space-y-4 text-sm text-slate-300">
        <li>
          <p class="font-bold text-white mb-1">最初の一発出しが「アプリ案内」になった</p>
          <p class="text-xs text-slate-400 leading-relaxed">配布スキルのままでは、提案の核が「1週間無料体験」になり、本来の「5か月の生活変化」に届かなかった。</p>
        </li>
        <li>
          <p class="font-bold text-white mb-1">事実と実装のズレ</p>
          <p class="text-xs text-slate-400 leading-relaxed">未実装の相談窓口リンクなどを実装済みのように書いてしまった。文章力より「事実突合」の工程が足りなかった。</p>
        </li>
        <li>
          <p class="font-bold text-white mb-1">プライバシーの過剰断言</p>
          <p class="text-xs text-slate-400 leading-relaxed">「運営へ送信されない」と書いたが、匿名の利用計測は送信されていた。センシティブ領域向けのガードが必要だった。</p>
        </li>
        <li>
          <p class="font-bold text-white mb-1">一発出しルールの線引き</p>
          <p class="text-xs text-slate-400 leading-relaxed">材料集め・スキル質問への回答はOK。出力された提案文の手直しは禁止。気になる箇所はスキル／材料を直して最初から再実行した。</p>
        </li>
      </ul>
    </div>
  </div>

  <div class="rounded-2xl bg-night-900 border border-white/10 p-6 mb-8">
    <h3 class="font-maru font-bold text-lg text-white mb-4">線引きの判断（自分の基準）</h3>
    <div class="grid sm:grid-cols-2 gap-4 text-sm">
      <div class="rounded-xl bg-emerald-400/5 border border-emerald-400/20 p-4">
        <p class="font-bold text-emerald-300 mb-2">やってよい</p>
        <ul class="text-slate-300 space-y-1.5 text-xs leading-relaxed">
          <li>・対話で①〜⑤の材料を集める</li>
          <li>・模範回答・SKILL.md・根拠資料を直す</li>
          <li>・気になる出力は捨てて、渡すものを直して再実行</li>
        </ul>
      </div>
      <div class="rounded-xl bg-rose-400/5 border border-rose-400/20 p-4">
        <p class="font-bold text-rose-300 mb-2">やらない</p>
        <ul class="text-slate-300 space-y-1.5 text-xs leading-relaxed">
          <li>・出力された提案文をタイピングで直す</li>
          <li>・チャットで「この段落だけ直して」と磨き続ける</li>
          <li>・提出用にだけ手直しした「使い捨て完成稿」を作る</li>
        </ul>
      </div>
    </div>
    <p class="mt-4 text-xs text-slate-400 leading-relaxed">
      やり直した回数の感覚：チューニング前の原本（v1）を残したうえで、スキルと材料側を直し、提案文は v2（Surprise形式の5か月版）まで再出力。募集ページ向けの別用途（v3/v4）も試したが、本図解の前後比較は同じ【提案】形式の v1 ↔ 現行原稿で揃えた。
    </p>
  </div>

  <div class="rounded-2xl bg-night-900 border border-white/10 overflow-hidden mb-8">
    <div class="px-6 py-4 border-b border-white/10">
      <h3 class="font-maru font-bold text-lg text-white">ズレの要約（前後の差）</h3>
    </div>
    <div class="p-4 sm:p-6 space-y-3" id="cmp-rows"></div>
  </div>

  <div class="relative rounded-3xl overflow-hidden border border-care-400/30 bg-gradient-to-br from-night-800 via-night-900 to-night-950 p-8 sm:p-10 text-center">
    <p class="text-xs font-bold tracking-widest text-moon-300 mb-4">一言まとめ</p>
    <p class="font-maru font-bold text-xl sm:text-2xl text-white leading-relaxed max-w-3xl mx-auto">
      提案文を「アプリの無料体験案内」から、<br class="hidden sm:block" />
      「<span class="text-transparent bg-clip-text bg-gradient-to-r from-care-300 to-moon-300">生活の変化を提案する文章</span>」に変えた。
    </p>
    <p class="mt-6 text-sm text-slate-300 leading-loose max-w-2xl mx-auto">
      自分専用化とは、テンプレートの言い回しを変えることではない。<br />
      サービスの定義・相手の不安・文体の正を、スキルが毎回参照する形で固定することだった。
    </p>
  </div>
</section>

</main>

<footer class="border-t border-white/10 py-8 text-center text-xs text-slate-500">
  AI Driven School 5ヶ月目提出用 ── ヨルケア参加提案文のための提案スキルチューニング図解
</footer>

<script>
const progressBar = document.getElementById('progress-bar');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const ratio = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
  progressBar.style.width = (ratio * 100) + '%';
}, { passive: true });

const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('is-visible');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

const cmpData = [
  { label: '提案の中心', before: 'アプリを1週間試してほしい', after: '夜と休日の過ごし方を5か月変えてほしい' },
  { label: '相手', before: 'アプリ利用者', after: '生活を変えるかどうかを決める当事者' },
  { label: 'サービス定義', before: 'セルフケア日記・記録ツール', after: '運動・記録・振り返り・仲間で心身の土台を整えるプログラム' },
  { label: '困りごと', before: '記録できない、説明しづらい', after: 'セルフケアを一人で続ける難しさ、夜・休日に支援がないこと' },
  { label: '文体', before: '機能説明が多い', after: '共感から入り、最後は参加・試行をお願いする' },
];
const cmpRows = document.getElementById('cmp-rows');
cmpData.forEach((row) => {
  const div = document.createElement('div');
  div.className = 'grid grid-cols-1 sm:grid-cols-[8rem_1fr_auto_1fr] gap-2 sm:gap-3 items-stretch';
  div.innerHTML =
    '<div class="flex items-center"><span class="text-xs font-bold text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 w-full sm:w-auto text-center">' + row.label + '</span></div>' +
    '<div class="rounded-xl border border-white/10 bg-night-950/60 p-3.5 text-sm text-slate-400 leading-relaxed">' + row.before + '</div>' +
    '<div class="hidden sm:grid place-items-center text-moon-300 font-black">→</div>' +
    '<div class="rounded-xl border border-care-400/40 bg-care-500/10 p-3.5 text-sm text-slate-100 leading-relaxed">' + row.after + '</div>';
  cmpRows.appendChild(div);
});
</script>
</body>
</html>
`;

const outDocs = path.join(root, "docs/ai-driven-school-presentation.html");
const outDeploy = path.join(root, ".tmp-ads-deploy/index.html");
fs.mkdirSync(path.dirname(outDeploy), { recursive: true });
fs.writeFileSync(outDocs, html, "utf8");
fs.writeFileSync(outDeploy, html, "utf8");
console.log("wrote", outDocs);
console.log("wrote", outDeploy);
console.log("bytes", Buffer.byteLength(html), "before", before.length, "after", after.length);
