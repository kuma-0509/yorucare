# Secret scanning の定期監査

策定日: 2026-09-10
対象課題: 開発管理表の YC-MON-SECRET-RESULT

## 1. 目的

Secret scanning の結果を、秘密値に触れずに定期監査する。証跡に残すのは次だけである。

- 確認日時
- リポジトリ
- 取得できたかどうか
- open / resolved の件数

警告の本文、検出された値、検出箇所、生API応答は証跡にしない。GitHub の警告一覧APIは応答本文に秘密値を含むため、その生出力を保存・共有・コミットしない。

## 2. 実行

管理環境で GitHub CLI にログインした状態で次を実行する。公開されるエンドポイントは増やさない。Node.js は 22.6 以降。

```bash
pnpm security:secret-scan
```

リポジトリを明示する場合は `pnpm security:secret-scan owner/name`。機械可読な件数だけが必要なときは `pnpm security:secret-scan --json`。

件数APIの参照には `secret_scanning_alerts=read` が必要である。権限が無いトークンでは HTTP 403 になり、これは失敗ではなく「取得不能」として記録する。

## 3. 取得不能と 0件

| 結果 | 意味 | 書いてはいけないこと |
| --- | --- | --- |
| 取得: 成功 / open: 0件 | 権限のある取得が成功し、未解決が0件 | なし |
| 取得: 不能 | 権限不足、未設定、件数以外の本文を破棄した、CLI失敗 | 「0件」「問題なし」 |

取得不能を 0件として扱ってはならない。権限の無い監査で 0件と書くと、見ていないことを見たと誤る。

## 4. 取得の仕方

実装は `src/lib/secret-scan-status.ts` と `scripts/secret-scan-status.mjs`。

1. `per_page=1` で open と resolved を1ページずつ取る。全件の `--paginate` は使わない。
2. `gh api --jq` で配列長だけを残す。`secret` フィールドは指名しない。
3. ヘッダより後ろが整数でなければ本文を破棄し、取得不能にする。
4. 1件以上のときは Link の `rel=last` ページ番号を件数にする。0件は jq の `0` で確定する。

単体テストは、403 と 0件の報告文が異なること、秘密値を含む本文が報告へ漏れないことを固定する。

## 5. このリポジトリでの確認（2026-09-10）

日次開発エージェントの GitHub CLI トークンで HEAD/件数取得を試したところ、Secret scanning alerts API は HTTP 403 だった（必要な権限は `secret_scanning_alerts=read`）。この実行では件数を 0 とせず、取得不能として区別できることを確認した。Push protection と Secret scanning 自体は GitHub 上で有効と管理表に記録済みである。

権限を持つ運営者が `pnpm security:secret-scan` を実行すれば、成功時の件数または不能の理由が同じ形式で残る。
