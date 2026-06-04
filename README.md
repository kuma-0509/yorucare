# ヨルケア — セルフケア記録 WEBアプリ（Phase 1 MVP）

働く障がい者本人・障害者雇用枠で働く人が、スマホで毎日のセルフケア記録を1〜2分で残せる WEB アプリの Phase 1 MVP です。

## 技術スタック

- Next.js（App Router）
- TypeScript
- Tailwind CSS
- shadcn/ui 相当の UI コンポーネント（Button / Card / Input / Textarea / Dialog など）

## 機能（Phase 1）

- 下部タブナビゲーション（今日の記録 / 記録 / セルフケア / ふりかえり）
- 今日・昨日の記録入力（localStorage 保存）
- 気分・睡眠・服薬・注意サイン・セルフケア・特記事項
- 直近7日の記録一覧
- セルフケア辞書の CRUD
- ふりかえりタブ（準備中）

## 開発

依存関係のインストール（Windows では `pnpm` を推奨）:

```bash
pnpm install
pnpm dev
```

`npm` でも動作しますが、環境によっては optional 依存でエラーになる場合があります。

```bash
npm install
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## ビルド

```bash
npm run build
npm start
```

## データ保存

ブラウザの `localStorage` に保存します。ログイン・API・DB は Phase 1 では未実装です。

- `yorucare_daily_records` — 日次記録
- `yorucare_self_care_items` — セルフケア項目
