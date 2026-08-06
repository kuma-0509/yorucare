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
- 気分・睡眠・お薬・しんどさのサイン・できること・メモ
- 直近7日の記録一覧
- 「できること」辞書の CRUD
- ふりかえりタブ（気分・睡眠・しんどさのサイン・できることの期間別グラフ）
- 本人が任意同意した匿名利用イベント計測（保存・初回保存・タブ遷移・バックアップ操作）

## 機能（相談・セルフケアの拡張）

タブ構成（書く / これまで / できること / ふりかえり）は変えず、既存の画面に足しています。

- **記録から見えること**（ふりかえりタブ）— 直近7日の記録を数えて事実だけを並べます。状態のラベル付けや危険度の推定は行いません。数値には母数を添え、割合ではなく日数で示します。対象が0件の項目は0ではなく非表示にし、「値が低い」と「データがない」を区別します。「相談先を見る」は、事実の件数にかかわらず常に同じ場所・同じ見せ方で置きます。
- **都内の支援先をさがす**（ヘッダー常設の「相談先」ダイアログ）— 全国窓口（119 / 110 / #いのちSOS / 厚生労働省リンク）の表示順1〜2位はそのままに、市区町村・相談内容・相談方法・本人が選ぶ緊急度で並べ替えられる一覧を追加しています。現在時刻と曜日から、受付中・本日は受付終了・次回受付日時・24時間対応・予約要否・相談方法を表示します。緊急度は本人の選択であり、アプリが記録から推定することはありません。
- **今日の自分メンテ**（できることタブ）— その日の記録に応じて、負担の軽い順に運動の選択肢を並べます。「今日は休む」は代替ではなく対等な選択肢として常に先頭に置きます。実施の有無は保存せず、達成率や連続日数として集計しません。
- **相談文への追加項目**（これまでタブ）— 既存の共有テキストに、母数つきの事実と、本人が選んだ相談先の名称だけを足せます。本人が書いたメモ本文はこの経路を通りません（戻り値型に本文のフィールドを持たせないことで保証しています）。

### 外部公開データの扱い

支援先のデータは `src/lib/support/` のアダプター層から読み込みます。東京都オープンデータの実URLとデータ形式は未確認のため、現在はローカルJSONのデモデータで動かしています。デモデータは電話番号とURLを持たず、画面上で「デモデータ」と明示します。

すべての外部データは `DataSource`（提供者 / データセット名 / 更新日 / 参照URL / デモか実データか / ライセンス）を持ち、ダイアログ内の「データについて」で開示します。更新日が確認できない場合は、利用前に公式サイトか電話で確認するよう案内します。

`src/lib/support/` は本人の記録を扱う `src/lib/repository.ts` 配下を参照しません。境界は `src/lib/support/module-boundary.test.ts` で固定しています。

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
- 期間集計は `src/lib/ai/period-summary.ts` が単一の数値源。週のまとめ・変化の提示・共有テキストはここを再利用し、数値を自前で計算しない
- 変化の提示の閾値は `src/lib/ai/change-thresholds.ts`、運動提案の閾値と選択肢は `src/lib/selfcare/movement-config.ts` に集約（コード内に散らさない）
- 外部公開データは `src/lib/support/`、本人の記録は `src/lib/repository.ts` 配下と、モジュールとして分離

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
