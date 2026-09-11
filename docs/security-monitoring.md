# セキュリティ監視の定期監査

策定日: 2026-09-10
更新日: 2026-09-11
対象課題: 開発管理表の YC-MON-SECRET-RESULT、YC-MON-CODE-SCAN

公開されるエンドポイントは増やさない。管理環境で GitHub CLI にログインした状態で実行する。Node.js は 22.6 以降。

---

# Secret scanning

## 1. 目的

Secret scanning の結果を、秘密値に触れずに定期監査する。証跡に残すのは次だけである。

- 確認日時
- リポジトリ
- 取得できたかどうか
- open / resolved の件数

警告の本文、検出された値、検出箇所、生API応答は証跡にしない。GitHub の警告一覧APIは応答本文に秘密値を含むため、その生出力を保存・共有・コミットしない。

## 2. 実行

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

---

# Code scanning

## 1. 目的

Code scanning の解析結果を、警告本文に触れずに定期監査する。証跡に残すのは次だけである。

- 確認日時
- リポジトリ
- 対象 ref（既定は `refs/heads/main`）
- 取得できたかどうか
- 解析の有無
- 対象 SHA
- 解析日時
- 実行結果の件数
- ツール名

警告本文、ファイルパス、SARIF、生API応答は証跡にしない。解析なしを問題 0件として扱ってはならない。解析が無い状態で 0件と書くと、見ていないことを見たと誤る。

## 2. 実行

```bash
pnpm security:code-scan
```

リポジトリを明示する場合は `pnpm security:code-scan owner/name`。機械可読な証跡だけが必要なときは `pnpm security:code-scan --json`。

解析APIの参照には `security_events=read` が必要である。権限が無いトークンでは HTTP 403 になり、これは失敗ではなく「取得不能」として記録する。機能の有効化と解析の実行有無の最終確認は、権限を持つ担当者が GitHub の [Code scanning](https://github.com/kuma-0509/yorucare/security/code-scanning) 設定で行う。

## 3. 解析なし・取得不能・0件

| 結果 | 意味 | 書いてはいけないこと |
| --- | --- | --- |
| 取得: 成功 / 解析: あり / 実行結果: 0件 | 解析が存在し、その実行結果が 0件 | なし |
| 取得: 成功 / 解析: なし | HTTP 404 または解析一覧が空。機能未設定または未実行 | 「実行結果: 0件」「問題なし」 |
| 取得: 不能 | 権限不足、許可したフィールド以外の本文を破棄した、CLI失敗 | 「0件」「問題なし」「解析なし」 |

## 4. 取得の仕方

実装は `src/lib/code-scan-status.ts` と `scripts/code-scan-status.mjs`。

1. `ref=refs/heads/main&per_page=1` で解析メタデータを1件取る。全件の `--paginate` は使わない。
2. `gh api --jq` で `found` / `commitSha` / `createdAt` / `resultsCount` / `toolName` だけを残す。URL、SARIF、警告本文は指名しない。
3. HTTP 404 と `{found:false}` は解析なしにする。問題 0件にはしない。
4. 許可したフィールド以外、不正な SHA、件数以外の本文は破棄して取得不能にする。

単体テストは、404 と空配列を問題 0件と書かないこと、403 を 0件と書かないこと、解析ありの 0件だけを 0件と書くこと、本文が報告へ漏れないことを固定する。

## 5. このリポジトリでの確認（2026-09-11）

日次開発エージェントの GitHub CLI トークンで解析メタデータ取得を試したところ、Code scanning analyses API は HTTP 403 だった（必要な権限は `security_events=read`）。この実行では実行結果を 0件とせず、取得不能として区別できることを確認した。リポジトリの GitHub Actions には Code scanning 用ワークフローは置いていない。2026-09-10 の監査記録では、権限のある取得で 404・no analysis found だった。

権限を持つ運営者が `pnpm security:code-scan` を実行すれば、解析なし・解析ありの SHA と件数・取得不能のいずれかを同じ形式で残る。機能設定の確認は担当者が行う。
