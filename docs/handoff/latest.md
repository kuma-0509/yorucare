# Handoff

日付: 2026-09-13
担当チャット: 設定画面・復元画面コードの最新mainへの統合／Preview実機確認で残った2つの謎の挙動の原因調査

## 今回実装したタスク

`claude/yorucare-cloud-backup-w9p805`（コミット `805f063`）に実装済みだった、クラウド保存の**設定画面と復元画面**を、最新main（PR #60・PR #61 取り込み後）へ統合した。この統合は前回までの引き継ぎで繰り返し「残タスク」として記録していたもの。

### 何をしたか

`git cherry-pick 805f063` を新規ブランチ（`claude/cloud-backup-screens-integration`、最新main基点）で実行し、7ファイルの衝突を解消した。

1. **`docs/DEVELOPMENT_BOARD.md`・`docs/account-cloud-storage-decision.md`・`docs/handoff/latest.md`**: 記述の衝突。両ブランチの内容を統合し、事実関係を現在のmainに合わせて書き直した（後述）。
2. **`src/lib/constants.ts`**: 無関係な2つの定数追加が近接していただけ。両方を残した。
3. **`src/lib/cloud-sync.ts`**: importの並び順だけの衝突。両方のimportを残した。
4. **`src/app/api/cloud/snapshot/route.ts`・`route.test.ts`**: 本物の重複実装。**削除前の再認証チェックが、この2つのブランチで同じ日（2026-09-09）に独立に実装されていた**（本ブランチ側は `docs`コミットの実装、main側はPR #49の自動レビュー指摘 `68cf8c8` への対応）。mainにすでに入っていた`CloudSession`ベースの実装を残しつつ、`isRecentlyVerified`の判定本体を`cloud-reauth.ts`へ切り出す整理（設定画面ブランチ側の意図）は取り込んだ。`cloud-session.ts`はこの切り出しを自動マージで正しく吸収し、`getCloudAuthStatus`（PR #61由来）も無傷で残っている。

### 統合後に発見した事実（ドキュメントへ反映）

- 削除前の再認証チェックは、実は**2つの作業が同じ日に独立に同じ不具合を見つけて同じ対応をしていた**。設定画面の実装時（本コミット由来）と、PR #49の自動レビュー指摘（`fix: 自動レビューの指摘4件を直す`）の両方。mainへ実際に入ったのは後者で、今回の統合でその判定を`cloud-reauth.ts`へ切り出す整理だけを追加で取り込んだ。

### 追記（統合直後、Preview確認の準備でローカル実機確認をしたところ発見した不具合）

統合後、ユーザーがPreview環境でダミーデータの通し確認をする前に、こちらでもローカルの実際のブラウザ（Playwright）で一通り画面を確かめた。記録タブに設定画面が正しい位置に出ることは確認できたが、**設定画面（`cloud-backup-panel.tsx`）が、ログイン確認画面（`/cloud-login`）で2026-09-12に直したのと同じ不具合を独立に抱えていた**ことが分かった。

- 設定画面は`cloudAuthClient.getSession()`（Better Authのセッション有無だけ）で「ログイン済み」を判定しており、`getCloudSession`が行う許可リストの突き合わせを経由していなかった。
- 許可リスト外のアドレスでBetter Authのセッションだけがある場合、設定画面は「預ける前の説明」「この内容を預ける」の確認まで進められてしまう。実際に預けようとすると本人記録APIが401で正しく拒否するため記録が漏れることはないが、参加者からは原因の分からない「いまは預けられませんでした」に見える。

ログイン確認画面の判定ロジックを`src/lib/cloud-auth-status.ts`（`fetchCloudAuthOutcome`）として切り出し、設定画面・ログイン確認画面の両方がこれを使うように直した。設定画面には「このアカウントでは使えません」という専用の案内（`CLOUD.notAllowedHeading`/`notAllowedBody`/`notAllowedAction`）を追加した。

新設テスト3件を追加し、修正前のコードで実際に落ちる（許可リスト外でも「この内容を預ける」の確認画面を出してしまう）ことを確認したうえで直した。

### 追記（ユーザーによるPreview実機確認で発見した不具合、2026-09-13）

上記の修正をpushしたあと、ユーザーがPreview環境でダミーデータの通し確認を行った。

- **最初、設定画面が全く表示されなかった。** 原因はVercelのPreview環境変数から`NEXT_PUBLIC_CLOUD_BACKUP_ENABLED`が無くなっていたため（前回9/9の引き継ぎで「確認が終わったらPreviewからも外すことを推奨する」と書いた、その状態のままだった）。ユーザーがPreview環境変数に`NEXT_PUBLIC_CLOUD_BACKUP_ENABLED=true`を追加し、再デプロイして解消。**この変数は今後、設定・復元画面の検証が続くあいだはPreviewに設定したままにしてよい**（Productionには絶対に設定しない）。
- 設定・許可リストログイン・預ける・最終預け日時の表示・復元（両方に記録がある状態で戻す）は正常に確認できた。
- **「退会する」を実行したあと、`/cloud-login`を開くと「ログイン済みです」のままになっていた。** 実際にはサインアウトできていないのに、設定画面は「クラウド上の控えを消して、ログインから出ました」と表示していた。原因は`handleDelete`（`kind === "leave"`）が`cloudAuthClient.signOut()`の戻り値の`error`を見ておらず、例外だけを`try/catch`で握り潰していたため（2026-09-12にログイン確認画面の`handleSignOut`で直したのと同じ種類の不具合。こちらは別実装だったため直っていなかった）。戻り値を確かめ、失敗時は「ログインから出た」表示へ切り替えず、`not_enabled`のまま「クラウド上の控えは消しましたが、ログアウトできませんでした」と表示するよう直した。新設テスト2件を追加し、修正前のコードで実際に落ちることを確認したうえで直した。
- この不具合のため、許可リスト外のダミーアドレスでのログイン確認（3番目の確認項目）はまだできていない。退会の修正後、同じ端末でサインアウトし直してから確認する必要がある。

## 変更ファイル

- `src/components/shared/cloud-backup-panel.tsx` / `.test.tsx`（新規）: 設定画面。記録タブのカードとして配置（`records-tab.tsx`）。`isCloudBackupEnabled()`がfalseの間は`null`を返す
- `src/components/shared/cloud-restore-dialog.tsx` / `.test.tsx`（新規）: 復元画面。`cloud-backup-panel.tsx`からのみ呼ばれるため、フラグOFFの間は到達不可
- `src/lib/cloud-consent.ts` / `.test.tsx`（新規）: クラウド保存の同意。匿名分析の同意とは別の鍵で持つ
- `src/lib/server/cloud-reauth.ts`（新規）: 削除前の再認証判定（認証基盤に依存しない純粋関数）
- `src/lib/cloud-auto-backup.test.ts`（新規）: 保存後の自動送信のテスト
- `src/lib/cloud-sync.ts` / `.test.ts`: 送信前の同意確認、`backupAfterSave`、`deleteCloudData`の戻り値を4状態へ
- `src/lib/server/cloud-session.ts`: `isRecentlyVerified`を`cloud-reauth.ts`から再輸出する形へ整理（`getCloudAuthStatus`は無変更）
- `src/app/api/cloud/snapshot/route.ts` / `.test.ts`: `isRecentlyVerified`のimport元を`cloud-reauth.ts`へ変更。DELETEの再認証ロジック自体は無変更（既にmainにあったもの）
- `src/lib/storage.ts`: `saveRecord`成功後に`backupAfterSave()`を呼ぶ
- `src/lib/constants.ts`: `cloudBackupConsent`の鍵を追加
- `src/lib/copy.ts`: `cloudBackup`の文言一式
- `src/lib/dates.ts`: `formatDateTimeLabel`、`formatDateLabel`
- `src/components/tabs/records-tab.tsx` / `.test.tsx`: 設定画面を配置
- `src/lib/cloud-auth-status.ts`（新規）: `fetchCloudAuthOutcome`。`GET /api/cloud/session`の結果を4値へ正規化する共通判定。ログイン確認画面・設定画面の両方から使う
- `src/components/shared/cloud-backup-panel.tsx` / `.test.tsx`: `not_allowed`フェーズを追加し、`fetchCloudAuthOutcome`で判定するよう変更
- `src/app/cloud-login/page.tsx`: 独自に持っていた判定ロジックを`cloud-auth-status.ts`へ切り出し、そちらを使うよう整理（挙動は無変更）
- `src/lib/copy.ts`: `cloudBackup.notAllowedHeading`/`notAllowedBody`/`notAllowedAction`、`leaveSignOutFailed`を追加
- `src/components/shared/cloud-backup-panel.tsx` / `.test.tsx`: `handleDelete`の`kind === "leave"`分岐で`signOut()`の戻り値の`error`を確かめるよう修正
- `docs/DEVELOPMENT_BOARD.md`: クラウドバックアップの行を更新（設定画面・復元画面の実装、今回の2件の不具合修正を反映）
- `docs/account-cloud-storage-decision.md`: 4節の実装状況表、11.1節（削除前の再認証・退会時アカウント削除の未実装・今回の2件の不具合）、15節（意思決定記録）を更新
- `docs/handoff/latest.md`: 本ファイル

## 検証結果

- `pnpm lint`: 成功（警告・エラーなし）
- `pnpm test`: 成功（67 test files / 699 tests）
- `pnpm exec tsc --noEmit`: `src/components/shared/ai-share-panel.test.tsx`で4件のエラーが出るが、**この統合と無関係の既存main上の問題**（統合前のmainでも同じエラーが出ることを確認済み）
- `pnpm build`: 成功。`/cloud-login`・`/api/cloud/session`を含む全ルートがビルド出力に含まれることを確認した
- `NEXT_PUBLIC_CLOUD_BACKUP_ENABLED`は設定しておらず、`CloudBackupPanel`はフラグOFFの間`null`を返すことをコードで確認した（表示テストは前ブランチの18件がそのまま通っている）
- ローカルで`pnpm dev`を`NEXT_PUBLIC_CLOUD_BACKUP_ENABLED=true`・`USER_DATA_DEV_OWNER_ID`付きで起動し、Playwright（実ブラウザ）で記録タブを開き、設定画面が正しい位置に描画されることを確認した（本物のNeon/Managed Better Authには接続していないため、ログイン後の状態確認はできていない）
- 退会の修正は、ユーザーのPreview実機確認で見つかった不具合の再現テストを新設し、修正前のコードで実際に落ちることを確認したうえで直した（上記「追記」参照）

## 自動レビュー指摘

- まだPRを作っていないため該当なし

## 次にやること

1. **Preview実機確認の続き（最優先）。** 退会の修正をpushしたので、Preview環境で①ダミーアドレスでサインアウトし直す（またはブラウザのCookieを消す）②許可リスト外のダミーアドレスでログインし、「このアカウントでは使えません」が出ることを確認する。これが確認できれば、今回のブランチの主要な確認項目は揃う
2. **`yorucare_app`ロールのパスワード再作成**（Neon Console側の作業。作成時のSQLがエディタ履歴に残っている）
3. **別端末での復元確認**（未実施のまま。今回の統合で復元画面のコードは揃ったので、Console設定済みのPreview環境で実際に確認できる状態になった）
4. **参加者が実際に使うメール事業者での到達確認**（現在Gmail1アカウントのみ）
5. **同意文面と研究・安全管理手続きの確認**（未着手・担当と期限が未定。これが済むまで本番フラグを開けない）
6. **退会時の認証アカウント削除は未実装**（Managed Better Authの`delete-user`をアプリ側から有効化できるか未確認のまま。11.1節参照）
7. `cursor/cloud-login-allowlist-message`（`cd69d3c`）/ `fix/cloud-login-allowlist-message`（`bd16a9d`）: ログイン確認画面の「許可リスト外でも『時間をおいてもう一度』と出る」問題（送信コード時の案内文言、今回とは別の不具合）を修正する2つの候補PR。**同じ問題を再実装しないこと**

## 引き継ぎ事項・注意点

1. **設定画面・復元画面はまだPreview（本物のNeon/Managed Better Auth）で実機確認していない。** ローカルではPlaywrightで見た目の描画だけ確認済み。Neon Consoleの設定自体は2026-09-11に完了しているため、次はPreview環境でダミーデータを使い、`/cloud-login`でログイン→記録タブの設定画面で「クラウドに預ける」→復元画面で別端末からの復元、に加えて**許可リスト外のダミーアドレスで「このアカウントでは使えません」の表示になることも**確認できる状態にある。

2. **削除前の再認証は、統合の前後でロジックが変わっていない。** mainには既にPR #49由来の実装があり、今回の統合は「判定を`cloud-reauth.ts`という独立ファイルへ切り出す」という整理だけを追加した。挙動（10分以内なら削除可、それ以外は`403 reauth_required`）は変えていない。

3. **`getCloudAuthStatus`・`GET /api/cloud/session`（PR #61由来）はこの統合で変更していない。** 衝突したのは`cloud-session.ts`の`isRecentlyVerified`部分だけで、自動マージが正しく処理した。

4. **`/cloud-login`・設定画面・復元画面はすべてフラグOFFなら到達不可のまま。** `CloudBackupPanel`がフラグを見て`null`を返し、`CloudRestoreDialog`はその内側からしか呼ばれないため、フラグOFFの間はJavaScriptには含まれるが画面には現れない。

5. **「使えるか」の判定は、今後`src/lib/cloud-auth-status.ts`の`fetchCloudAuthOutcome`に一本化してある。** 新しい画面を作るときに`cloudAuthClient.getSession()`を直接見て「ログイン済みか」を判定すると、今回と同じ不具合（許可リスト外を弾けない）を再発する。必ずこの関数（または`GET /api/cloud/session`）を経由すること。

6. **`cloudAuthClient.signOut()`は例外を投げず`{data, error}`を返す。** ログイン確認画面（`handleSignOut`）と設定画面（`handleDelete`のleave分岐）で、同じ「`try/catch`だけで済ませて`error`を見ない」不具合が独立に2回見つかった。`signOut()`を新しく呼ぶ場所を作るときは、必ず戻り値の`error`を確かめ、失敗時は「ログアウトした」表示へ切り替えないこと。


---

## 追記（2026-09-13、Preview実機確認で残っていた2つの挙動の原因調査）

前回のチャットは、Preview実機確認で次の2つにぶつかり、原因未特定のまま終わっていた。

1. `gmpm1001@gmail.com` で正常にログインできている状態から「退会する」を押すと、必ず「クラウド上の控えは消しましたが、ログアウトできませんでした」になる
2. `USER_DATA_ALLOWED_EMAILS` を空にして再デプロイしても、`/cloud-login` の表示が「このアカウントでは使えません」に変わらない

### 分かったこと（2の原因、コードで確定）

**`getCloudAuthStatus`（`src/lib/server/cloud-session.ts`）が、Preview専用の抜け道 `USER_DATA_DEV_OWNER_ID` を、いちばん先に見ていた。**

```
旧: 固定IDがあれば即 ok → （ここから先は実行されない）本物のセッション確認 → 許可リストの突き合わせ
```

つまり、Vercelの環境変数に `USER_DATA_DEV_OWNER_ID` が入っているあいだは、**ログインしていてもいなくても、許可リストに載っていてもいなくても、常に「使える」**と答えていた。許可リストを空にしても表示が変わらないのは、この順序で説明がつく。

`USER_DATA_DEV_OWNER_ID` は「Preview環境でダミーデータを通すために所有者IDを固定する」ためのもので、本番（`VERCEL_ENV=production`）では無視される。設計として意図した抜け道ではあるが、**先に見ていたために、Preview環境での実機確認が「何も確かめていない」ものになっていた**。

### 直したこと

1. **判定の順序を入れ替えた。** 本物のログイン状態（Better Authのセッション＋許可リストの突き合わせ）を先に確かめ、その結果が `unauthenticated`（ログインしていない）のときにだけ固定IDへ落ちる。ログイン済みなら本物のownerIdを使い、許可リスト外なら `not_allowed` のままになる。
2. **固定IDで通ったことを画面に見せるようにした。** `GET /api/cloud/session` が `devOwner: true` を添えて返し、`/cloud-login` が「検証用の固定IDで表示しています（USER_DATA_DEV_OWNER_ID が設定されています）。この状態では、実際のログイン結果や許可リストの判定を確かめられません」と本人に見せる。同じ取り違えを次に起こさないための印。
3. **ログアウト失敗の手がかりを画面に出すようにした（1の切り分け用）。** `describeAuthError`（`src/lib/cloud-auth-status.ts`）を追加し、ログイン確認画面と設定画面の両方で、案内文の末尾にHTTPの状態番号と短い符号を添える（例:「…できませんでした。（詳細: 403 INVALID_ORIGIN）」）。Preview環境は開発者ツールを開かないと応答が見えないため、画面だけで原因を切り分けられるようにした。メールアドレスや6桁コードは添えない。
4. **認証の中継が、本文の無い要求に長さ0の本文を足して転送していたのをやめた。** `src/app/api/auth/[...path]/route.ts` は、本文を読み直して要求を組み直す際、本文が空でも `body: ""` を付けていた。ブラウザのログアウトは本文なしで送られるため、「本文なし」が「長さ0の本文あり」に変わって転送されていた。転送先での本文の解釈が変わりうるため、本文があるときだけ付けるようにした。これがログアウト失敗の原因だと確定したわけではないが、確定した差異ではあるので直した。

### 訂正（上の「2の原因」は誤り）

上の節で「2の原因は固定IDを先に見ていたこと」と書いたが、**これは誤り**だった。ユーザーがVercelの環境変数一覧を確認したところ、`USER_DATA_DEV_OWNER_ID` は**そもそも設定されていない**（Preview環境の変数は `USER_DATA_ALLOWED_EMAILS`／`NEXT_PUBLIC_CLOUD_BACKUP_ENABLED`／`USER_DATA_DATABASE_URL`／`USER_DATA_KEK`／`NEON_AUTH_COOKIE_SECRET`／`NEON_AUTH_BASE_URL` の6つだけ）。

判定の順序を入れ替えた修正そのものは、将来の取り違えを防ぐ意味で残す価値があるため取り消していないが、**2の原因ではない**。

### 1（ログアウト失敗）の原因（確定）

**中継処理が、ログアウト要求に `Content-Type: text/plain;charset=UTF-8` を勝手に付けて上流へ転送していた。**

1. ブラウザは「ログアウト」を**本文なし・Content-Typeなし**で送る（`@better-fetch/fetch` の `getBody` が `undefined` を返し、`detectContentType` もヘッダーを付けない）
2. 中継処理（`src/app/api/auth/[...path]/route.ts`）は、許可リストの照合のために本文を読み直してから要求を組み直していた。このとき本文が空でも `body: ""` を渡していたため、**`Request` が `Content-Type: text/plain;charset=UTF-8` を自動で付ける**
3. `@neondatabase/auth` の中継部分は `content-type` を転送ヘッダーの一覧に入れているため、この勝手に付いたヘッダーがそのまま上流へ届く
4. 上流のBetter Authはルーター全体に `allowedMediaTypes: ["application/json"]` を設定しており、JSON以外のContent-Typeが付いた要求を **415 UNSUPPORTED_MEDIA_TYPE** で断る（`better-call` の `getBody`）

コードの送信・検証が成功していたのは、あちらは本物のJSON本文（`content-type: application/json`）を持つため。**「ログインはできるのにログアウトだけが必ず失敗する」という症状と完全に一致する。**

実際にローカルで偽の上流サーバーを立て、本物の `@neondatabase/auth` の中継部分を通して確かめた。修正前の組み直し方では上流が `text/plain;charset=UTF-8` を受け取り、修正後はContent-Typeが付かない。この確認は `src/app/api/auth/[...path]/upstream-contract.test.ts` として残した。

### 2（許可リストを空にしても変わらない）について

こちらは**まだ確定していない**。固定IDは無関係だと分かったので、残る有力な説明は「**見ていたURLが古いデプロイのものだった**」。Vercelはデプロイのたびに新しいURLを発行し、環境変数はデプロイごとに焼き付くため、設定を直して再デプロイしても、前のURLを開いたままではスーパーリロードしても何も変わらない。

これを開発者ツールなしで自己判定できるように、**検証用の状態確認**を追加した（後述）。

### 追加した「検証用の状態確認」

`GET /api/cloud/diagnostics`（`src/app/api/cloud/diagnostics/route.ts`）を新設し、`/cloud-login` の下部に「検証用の情報」という折りたたみで表示するようにした。**本番（`VERCEL_ENV=production`）では経路そのものが404**になり、画面にも出ない。

返すのは原因の切り分けに要る事実だけで、**秘密は返さない**。

- いま動いているコミットとブランチ（`VERCEL_GIT_COMMIT_SHA`／`REF`）← 「古いURLを見ている」を一発で見分けるため
- 許可リストの**件数**（メールアドレスそのものは返さない）
- 固定IDの設定有無と、いまそれで通っているかどうか
- 認証基盤の**ホスト名**（URL全体は返さない）と、そこへ実際に届くか（状態番号／失敗の符号）
- Cookieの鍵が設定されているか（長さの条件を満たすかだけ）
- いまのCookieでのログイン判定（`ok`／`not_allowed`／`unauthenticated`）

### 検証結果

- `pnpm lint`: 成功（警告・エラーなし）
- `pnpm test`: 成功（71 test files / 739 tests）
- `pnpm build`: 成功。`/api/cloud/diagnostics` がビルド出力に含まれることを確認した
- 回帰確認: `cloud-session` の3件、認証中継の1件、上流との取り決め1件は、**修正前のコードで実際に落ちることを確認**したうえで直した

### Preview実機確認の結果（2026-09-13、ユーザー操作）

ブランチ `claude/focused-cerf-fezd9z` をPreviewへデプロイし、ブランチ名入りの固定URL
（`https://yorucare-git-claude-focused-cerf-fezd9z-kuma-0509s-projects.vercel.app`）を
Neon ConsoleのDomainsへ登録して確認した。

- 「検証用の情報」で、コミット `80b5918`／許可リスト1件／固定IDなし／認証基盤へ到達可
  （404。経路名が違うだけで、サーバーには届いている）／Cookieの鍵ありを確認した
- **ログイン（6桁コード）→ ログアウトが、エラーなく成功した。** 415の修正が効いている
  ことをPreview実機で確認できた（これまでは必ず「ログアウトできませんでした」になっていた）

Neon ConsoleのDomains登録では、末尾に `/` を付けるとブラウザが送るオリジン
（`https://ホスト名`、末尾の `/` は付かない）と形が変わるため、**末尾の `/` は付けない**。

### 追加で直したこと（実機確認中に見つけた）

「検証用の情報」が画面を開いた瞬間の値を出しっぱなしで、**ログイン後も
「いまのログイン判定: unauthenticated」のまま**だった。原因の切り分けに使う欄が
逆に人を迷わせるため、表示（フェーズ）が変わるたびに取り直すようにした。
回帰確認として、修正前のコードで新設テストが実際に落ちることを確認した。

### 退会時のログアウトが403で失敗した件（2026-09-13、実機確認②）

記録タブの設定画面から「退会する」を実行したところ、クラウド上の控えは消えたが
ログアウトが失敗し、画面に **「（詳細: 403 feature_not_supported）」** と出た。

**`feature_not_supported` という符号に意味は無い。** `@neondatabase/auth` は
HTTPの状態番号から符号を機械的に当てており、**403はすべて `feature_not_supported`**
になる（`better-auth-helpers-DlzEQzcv.mjs` の `STATUS_CODE_ERROR_MAP`）。読み取れる
事実は「403だった」ことだけ。

この案件で実際に起きた403は、**Managed Better Auth の「Domains」に画面のURLが
登録されていない場合**だった（2026-09-11に実測。15節の意思決定記録にもあるとおり、
「ログインは通るのにサインアウトだけが `INVALID_ORIGIN` で失敗する」）。同じ日の
`/cloud-login` ではブランチ名入りの固定URL（登録済み）でログアウトに成功しているため、
**②を別のURL（環境変数を変えて再デプロイした後の、デプロイ専用URL）で実行した**
可能性が高い。Vercelの「Visit」ボタンはデプロイ専用URLを開くため、取り違えやすい。

これを見分けられるよう、次を追加した。

- 「検証用の情報」に **「この画面のURL」** の行を足した。ここに出る値をそのまま
  Domainsへ登録すればよい（末尾に `/` を付けない）
- `/cloud-login` でログアウトが**403で失敗したときだけ**、「この画面のURLがDomainsに
  登録されていない可能性があります」という手がかりを案内に添えるようにした
  （参加者向けの設定画面には出さない）

### Preview実機確認の最終結果（2026-09-13、すべて完了）

ブランチ名入りの固定URL（`https://yorucare-git-claude-focused-cerf-fezd9z-kuma-0509s-projects.vercel.app`）で、
ダミーデータによる通し確認をすべて終えた。

| 確認したこと | 結果 |
| --- | --- |
| ログイン確認画面でのログイン（6桁コード）とログアウト | 成功。415の修正が効いている |
| 許可リスト外のアドレスでの拒否 | 「このメールアドレスは…登録されていません」が出る |
| 設定画面: 預ける／最終預け日時／復元／停止 | 成功 |
| 設定画面: 退会（クラウド上の控えの削除＋ログアウト） | 成功。「クラウド上の控えを消して、ログインから出ました」 |
| 別端末での復元 | 成功（同じ固定URLを開くこと） |
| Gmail以外のメール事業者への6桁コード到達 | 到達を確認（事業者名は次回追記） |

**②の「403 feature_not_supported」は、登録済みURLとは別のURLで実行していたことが原因だった**
（Domains未登録 → ログインは通るがサインアウトだけ403）。固定URLでやり直したところ成功した。

これで、`docs/account-cloud-storage-decision.md` 12節の検証項目のうち、Preview環境で
確かめられるものは通った。残るのはNeon Console側の作業（`yorucare_app`ロールの
パスワード再作成）、退会時の認証アカウント削除（`delete-user`を有効化できるかの確認）、
公開前の同意文面・手続き確認で、いずれもコードの変更を伴わない。

### 次にやること

**コード面は完了しており、PRを開ける状態にある。**

1. **PRを開く**（ユーザーの合図待ち）。ブランチ `claude/focused-cerf-fezd9z`、最新main基点。
2. **`yorucare_app`ロールのパスワード再作成**（Neon Console側の作業。作成時のSQLがエディタ履歴に残るため）
3. **退会時の認証アカウント削除**（Managed Better Authの`delete-user`をアプリ側から有効化できるか未確認。11.1節参照）
4. **同意文面と研究・安全管理手続きの確認**（担当と期限が未定。これが済むまで本番フラグを開けない）
5. **携帯キャリアメール（docomo・au・softbank）への到達確認**（迷惑メール対策が最も厳しい。参加者にキャリアメール利用者がいる場合は必須）
6. `NEON_AUTH_BASE_URL` に付いているVercelの「Needs Attention」が何の警告かの確認（「検証用の情報」では認証基盤へ到達できており、実害は確認されていない）

### 引き継ぎ事項（今回の実機確認で分かった、次に必ず役立つこと）

1. **Preview環境の確認は、必ずブランチ名入りの固定URLで行う。** Vercelはデプロイのたびに
   専用URLを発行し、「Visit」ボタンもそれを開く。環境変数はデプロイごとに焼き付くため、
   古いURLを開いたままでは設定変更が反映されない。またManaged Better Authの「Domains」に
   登録していないURLでは、**ログインは通るのにサインアウトだけが403で失敗する**。
   `/cloud-login` の「検証用の情報」に出る「この画面のURL」を、そのままDomainsへ登録する
   （末尾に `/` を付けない）。

2. **`@neondatabase/auth` のエラー符号は、HTTPの状態番号から機械的に当てられている。**
   403はすべて `feature_not_supported`、401は `bad_jwt` になる。**符号の名前で原因を
   判断しないこと。** 読み取れるのは状態番号だけ。

3. **認証の中継（`src/app/api/auth/[...path]/route.ts`）で要求を組み直すときは、本文の
   有無を変えないこと。** 空文字を本文にすると `Content-Type: text/plain` が自動で付き、
   上流のBetter Auth（`allowedMediaTypes: ["application/json"]`）が415で断る。
   `upstream-contract.test.ts` がこれを見張っている。
