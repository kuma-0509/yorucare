# Handoff

日付: 2026-08-15
担当チャット: 4件目

## 今回実装したタスク

- DEVELOPMENT_BOARD.md「記録した状態から実行しやすいセルフケア行動へつなげる仕組みが不足している」（自分メンテ）
- 記録画面に「自分メンテ」カードを追加し、記録した状態から選べそうなセルフケア案を出すようにした。提案は `src/lib/self-care.ts` の定型ルールだけで組み、LLMも外部通信も使わない。既存の `src/lib/goal.ts` と同じく、ルールと文言をライブラリ側に置き、コンポーネントは並べ方だけを持つ。
- 既存の「できること」（`SelfCareItem`）とは**役割を一本化**した。案を押すと `SelfCareItem` として登録され、その日の `selfCareIds` に入る。つまり実施可否は既存の記録経路そのままで残る。同じ名前がすでにあれば登録し直さず、その項目を選ぶだけにして辞書が二重にならないようにしている。
- 実施後の感想は選択式だけにし、`DailyRecord.selfCareFeeling`（`good` / `neutral` / `notFit`、未選択は `null`）を追加した。自由記述の置き場を増やさないため、本文フィールドは作っていない。
- 出し分けの入力は `StateLevel`（3段階、`src/lib/state-level.ts`）と選択式の `warningTags` の2つだけ。どちらも本人の自由記述ではない。タグは個々のサインと1対1で対応させず、既存の3区分（睡眠・気分・仕事）ごとにまとめて案を足す。個別のサインに対する処置の提示に読ませないため。「その他」タグは内容が分からないので案を変えない。
- 上限は4件。タグ由来の案は `上限 - 1` 件までに抑え、状態由来の案が必ず1件は残るようにした。状態が主で、タグは絞り込みという位置づけを保つため。
- `DailyRecord` にフィールドを追加したため、Zodに既定値（`null`）を付け、`STORAGE_SCHEMA_VERSION` を2から3へ上げた。`EXPORT_VERSION` は取り込み互換のため1のまま据え置き。

## 変更ファイル

- `src/lib/self-care.ts`（新規）: `buildSelfCareSuggestions` と案の定型ルール
- `src/lib/self-care.test.ts`（新規）: 出し分け、上限、決定性、診断・治療語を含めないことのテスト
- `src/components/selfcare/self-care-suggestion-card.tsx`（新規）: 自分メンテのカード
- `src/components/selfcare/self-care-suggestion-card.test.tsx`（新規）: 表示テスト
- `src/lib/types.ts`: `SelfCareFeeling` 型と `DailyRecord.selfCareFeeling` を追加
- `src/lib/schemas.ts`: `selfCareFeeling` のZod定義（既定値 `null`）、`STORAGE_SCHEMA_VERSION` を3へ
- `src/lib/repository.ts`: `saveRecord` / `createEmptyRecordForm` / `recordToFormState` / `isRecordEmpty` / `isDailyRecordEmpty` に `selfCareFeeling` を反映
- `src/lib/constants.ts`: `SELF_CARE_FEELING_OPTIONS` を追加
- `src/lib/copy.ts`: `selfCareSuggestion`（見出し・説明・注意書き・感想の見出し）を追加
- `src/components/tabs/today-record-tab.tsx`: 自分メンテカードの配置、案から「できること」への登録導線、感想の選択UI
- テスト（追記・修正）: `src/lib/repository.test.ts`（版2→版3の移行テスト）、`src/lib/schemas.test.ts`（後方互換）、`src/lib/ai/daily-view.test.ts`、`src/lib/ai/period-summary.test.ts`、`src/lib/ai-share-text.test.ts`（感想を外へ出さないことの固定）、および `DailyRecord` を組み立てる既存テストの fixture 更新

## 検証結果

- `pnpm lint`: 成功（警告・エラーなし）
- `pnpm test`: 成功（27 test files / 235 tests。前回の25ファイル・202件から2ファイル・33件増）
- `pnpm build`: 成功（Compiled successfully、型チェック通過、8ページ生成）。ローカルで完走したため代替検証は不要

## 次のタスク候補

- DEVELOPMENT_BOARD.md「継続や積み重ねを実感しにくくモチベーションを保ちにくい」（積み重ね表示）。`docs/phase2-plan.md` 5節のP1で最後に残った項目で、記載順でも次に来る。`findStreaks`（`src/lib/ai/streaks.ts`）と `summarizePeriod`（`src/lib/ai/period-summary.ts`）が既にあるため、集計側の土台は揃っている。
  - 着手前の論点: 「本人が選んだ起点」をどこに持つか。`DailyRecord` ではなく設定値なので、`STORAGE_KEYS` に新しいキーを足すのか、最初の記録日を既定の起点にするのかを先に決める必要がある。前者なら `repository.ts` に読み書きを足し、書き出し・取り込みの対象に含めるかも判断する。
  - 制約: `phase2-plan.md` 2節に「未入力や中断を失敗として扱わず、連続記録だけを評価・強調しない」とある。連続日数を主役にしない並べ方と、途切れを責めない文言を先に決めること。`findStreaks` は未記録日で連続を途切れさせる実装になっている。
- P1が終わったあとは、`phase2-plan.md` 5節ではP2（リマインドの最小検証）だが、これはGate 2（固定選択フィードバックの30%以上）を満たすまで着手しない。管理表でも「保留」のまま。実装で進められる残りは、管理表の演出系（改善中・確認待ち・未着手）と「LLM呼び出しと報告書出力が未実装」になる。

## 引き継ぎ事項・注意点

- **感想（`selfCareFeeling`）は外部へ渡る型に入れていない。** `DailyView`（`src/lib/ai/daily-view.ts`）と `PeriodSummary`（`src/lib/ai/period-summary.ts`）はどちらも変更していない。`daily-view.test.ts` と `period-summary.test.ts` に、感想が戻り値に現れないことを確認するテストを置いた。選択式なので方針上は渡せる値だが、利用側を確認せずに戻り値型を広げない、という3件目の判断をそのまま継いでいる。
- `src/lib/ai-share-text.ts`（本人が全文確認して自分で渡すテキスト）にも感想を追加していない。共有項目を増やすと `AI_SHARE_FIELDS` の選択UIと確認手順に影響するため。`ai-share-text.test.ts` に、感想が共有テキストに出ないことを確認するテストを置いた。
- `src/lib/format.ts` の `buildRecordSummaryLines`（保存後のまとめ表示）にも感想を追加していない。保存直後のまとめは行数を増やさない方が読みやすいと判断した。追加する場合は `CompletionChoice` へ渡す `summaryTextLines` にも入るため、演出側と併せて確認すること。
- **自分メンテカードの位置は、状態カードとふりかえりカードの下、「くわしく書く（任意）」の上。** 状態選択の直後という依頼どおりに上部へ置いたが、絞り込みに使う `warningTags` は画面のもっと下（しんどさのサインの節）で入力する。タグを選ぶとカードの案は即座に入れ替わるが、その位置は画面外になりうる。実機テストで「タグを入れても案が変わったことに気づけない」という所見が出たら、カードをしんどさのサインの直後へ動かすことを検討してほしい。
- 感想の選択UIは自分メンテカードではなく、既存の「できること」カードの中（実施のチップとメモの間）に置いた。実施の記録とすぐ隣に並び、状態を選んでいない日でも感想を残せるようにするため。自分メンテカードは状態を選んだ日にしか出ないので、そちらに置くと感想が出せない日ができてしまう。
- 実施をすべて外すと感想も `null` に戻す（`toggleSelfCare`）。画面から消えた値をそのまま保存しないため。
- 提案の文言は `src/lib/self-care.ts` に直接置いており、`COPY` には入れていない。`goal.ts` の `GOAL_HELPER_QUESTIONS` と同じ扱い（ルールと一体の文言はルール側に置く）。画面の見出し・説明・注意書きは `COPY.selfCareSuggestion` にある。
- 案の文言を足すときは `self-care.test.ts` の「診断・治療・危機判定に読める語を案に含めない」テストが効く。禁止語の一覧はそこにある。
- 3件目からの持ち越しで未確認の論点が1件ある。管理表の「本棚演出の方向性確定前には着手しない項目がある」（判断済み）にある「本番データ構造の `DailyRecord` と `schemas.ts` は変更しない」を、記録完了演出の作業に対する制約と解釈して2件目が `DailyRecord` を変更した。今回も同じ解釈で `DailyRecord` と `schemas.ts` を変更している。演出側の作業を再開する前に、この解釈で問題がないか確認してほしい。
