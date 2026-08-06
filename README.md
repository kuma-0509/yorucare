# ヨルケア — セルフケア記録 WEBアプリ（Phase 1 MVP）

働く障がい者本人・障がい者雇用枠で働く人が、スマホで毎日のセルフケア記録を1〜2分で残せる WEB アプリの Phase 1 MVP です（介護・夜勤の業務記録ではなく、本人のセルフケア日記です）。

## 技術スタック

- Next.js（App Router）
- TypeScript
- Tailwind CSS
- shadcn/ui 相当の UI コンポーネント（Button / Card / Input / Textarea / Dialog など）
- Zod（localStorage データのスキーマ検証）

## 機能（Phase 1）

- 下部タブナビゲーション（書く / これまで / できること / ふりかえり）
- 画面上部にプロダクト説明・端末保存の注意表示
- 記録の JSON バックアップ（エクスポート / インポート・復元前確認ダイアログ）
- 直近7日の記録入力・編集（localStorage 保存・スキーマ検証付き）
- 記録の入口を「よい／ふつう／しんどい」の3段階にし、選んだ状態に合う項目だけを表示（5段階の総合気分は入口から開いて選べる）
- 気分・睡眠・お薬・しんどさのサイン・できること・メモ
- 直近7日の記録一覧
- 「できること」辞書の CRUD
- ふりかえりタブ（気分・睡眠・しんどさのサイン・できることの期間別グラフ）
- 本人が任意同意した匿名利用イベント計測（保存・初回保存・タブ遷移・バックアップ操作）

## 開発

依存関係のインストール（Windows では `pnpm` を推奨）:

```bash
pnpm install
pnpm dev
```

`npm` でも動作しますが、環境によっては optional 依存でエラーになる場合があります。

```bash
npm install
npm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## ビルド

```bash
npm run build
npm start
```

## 公開 URL（実機テスト用）

デプロイ後は次の URL で最新版を確認してください。

- **本番**: [https://yorucare.vercel.app](https://yorucare.vercel.app)

画面フッターに `Phase 1 · 更新 YYYY-MM-DD` が表示されていれば、最新ビルドです。表示が古い場合は `main` を push して Vercel の再デプロイを待ってください。

## データ保存

本人が入力したセルフケア記録は、ブラウザの `localStorage` に保存します。ログインと記録本文のクラウド保存は未実装です。

- `yorucare_daily_records` — 日次記録
- `yorucare_self_care_items` — 「できること」項目
- `yorucare_schema_version` — データスキーマ版
- `yorucare_analytics` — 匿名利用イベント（パイロット検証用）
- `yorucare_analytics_consent` — 匿名利用イベントの送信可否

記録は**この端末のブラウザだけ**に残ります（別端末・別ブラウザでは共有されません）。

## アーキテクチャメモ

- データ操作は `src/lib/repository.ts` に一本化（Phase 2 で API 層へ差し替え可能）
- 画面文言は `src/lib/copy.ts` が単一基準
- 選択 UI の a11y 契約は `src/components/shared/selection-control.tsx`

## テスト

lib 層の純粋ロジック（睡眠計算・日付・スキーマ・バックアップ判定・気分ラベル移行など）は Vitest で単体テストしています。

```bash
pnpm test          # 1回実行
pnpm test:watch    # 監視実行
pnpm test:coverage # カバレッジ
```

CI（`.github/workflows/ci.yml`）で push / PR ごとに lint・テスト・ビルドを実行します。

### 自動チェックリスト（実機 E2E・開発用）

```bash
pnpm start
pnpm test:checklist
# 本番確認:
pnpm test:checklist https://yorucare.vercel.app
```

手順の詳細は [docs/smartphone-test-checklist.md](docs/smartphone-test-checklist.md) を参照してください。

## 計測（パイロット検証用）

匿名の利用イベントは、本人が任意同意した場合だけ、端末・ブラウザごとの匿名 ID 付きで同一オリジンの `POST /api/events` に送信します。入力した記録本文は送信しません。許可済みイベントはNeon Postgresへ180日間保存し、端末IDとイベントIDは保存前に不可逆化します。

継続指標は、初週複数日記録率、Week 2継続率、Week 4継続率を日本時間のサーバ受信日から集計します。送信停止と保存済み匿名データの削除は「これまで」タブから行えます。詳しいデータ境界と運用手順は [docs/anonymous-analytics.md](docs/anonymous-analytics.md) を参照してください。

DBを準備する場合は、`.env.example` を参考に `ANALYTICS_DATABASE_URL` と `ANALYTICS_ID_SALT` を設定し、次を実行します。

```bash
pnpm db:analytics:setup
```

## バックアップの能動的リマインド

最終ファイル保存からの経過日数を検知し、保存が必要なときだけ「ファイルに保存しておきましょう」と能動的に促します（`src/lib/backup-reminder.ts`）。判定ロジックは単体テスト済みです。
