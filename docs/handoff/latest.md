# Handoff

日付: 2026-09-08
担当チャット: 17件目

## 今回実装したタスク

- DEVELOPMENT_BOARD.md 66行目「クラウドバックアップと復元が未実装で、端末を失うと記録が戻らない」のうち、残っていた「認証基盤のセッション検証の組み込み」を実装した。
- `src/lib/server/cloud-session.ts` の `getCloudSession` に、Managed Better Auth（`@neondatabase/auth`）を使った実際のセッション検証を実装した。HttpOnly Cookieの検証はSDKの `auth.getSession()` に任せ（Next.jsのリクエストコンテキストからCookieを読むため、Route Handler内で引数なしに呼べる）、検証済みユーザーの `user.id` を `ownerId`、セッションの `createdAt` を `verifiedAt`（直近の本人確認時刻）として返す。
- 認証方式はEmail OTP（6桁コード）だけを使う。サインアップ専用の画面・APIは作らず、`authClient.signIn.emailOtp()` が未登録メールアドレスに対して自動でアカウントを作る挙動（better-authの `email-otp` プラグインの既定動作）をアプリ側で防ぐため、`USER_DATA_ALLOWED_EMAILS`（運営者が用意した許可済みメールアドレス一覧）との突き合わせを追加した。**設計判断の理由は次節「引き継ぎ事項・注意点」の1番目を参照。**
- 検証に必要な最小限の画面として `/cloud-login`（メールアドレス→6桁コード→ログイン、ログアウト）を実装した。`docs/account-cloud-storage-decision.md` の他の画面（設定・復元）は対象外。
- クライアントSDKからのリクエストを受ける `/api/auth/[...path]` を追加した。両方とも `NEXT_PUBLIC_CLOUD_BACKUP_ENABLED` が `true` でない限り404を返し、本番画面から到達できない状態を維持している。

## 変更ファイル

- `src/lib/server/neon-auth.ts`: Managed Better Authのサーバーインスタンスを作る唯一の場所（新規）
- `src/lib/server/cloud-session.ts`: `getCloudSession` の実装（Cookie検証・許可リスト突き合わせ・`verifiedAt`）
- `src/lib/server/cloud-session.test.ts`: 単体テスト（新規）
- `src/lib/cloud-auth-client.ts`: クライアント側のManaged Better Auth SDKインスタンス（新規）
- `src/app/api/auth/[...path]/route.ts`: クライアントSDKからの認証リクエストの受け口（新規、フラグOFFで404）
- `src/app/api/auth/[...path]/route.test.ts`: 上記の単体テスト（新規）
- `src/app/cloud-login/layout.tsx`, `src/app/cloud-login/page.tsx`: ログイン確認用の最小画面（新規、フラグOFFで404）
- `package.json`, `pnpm-lock.yaml`: `@neondatabase/auth` を追加
- `.env.example`: `NEON_AUTH_BASE_URL`、`NEON_AUTH_COOKIE_SECRET`、`USER_DATA_ALLOWED_EMAILS` を追記
- `docs/DEVELOPMENT_BOARD.md`: 66行目を更新（引き続き「進行中」。残りは画面とConsole設定）
- `docs/account-cloud-storage-decision.md`: 11.1節の状況を更新し、新規登録抑止に関する公式資料との食い違いと対応方針を追記、15節に決定記録を追加
- `docs/handoff/latest.md`: 本ファイル

## 検証結果

- `pnpm lint`: 成功（警告・エラーなし）
- `pnpm test`: 成功（54 test files / 529 tests）。既存の `src/app/api/cloud/**/route.test.ts` 28件は無改修のまま全件成功し、所有者IDを本文から受け取らない性質を維持していることを確認した
- `pnpm build`: 成功（Compiled successfully、型チェック、静的ページ生成を通過）。`/cloud-login` と `/api/auth/[...path]` はビルド時点で `NEXT_PUBLIC_CLOUD_BACKUP_ENABLED` 未設定のため、想定どおり到達不可の状態でビルドされている

## 自動レビュー指摘

- PRは未作成（このチャットの時点ではpushのみ）。指摘0件（該当PRなし）

## 次のタスク候補

- `docs/phase2-plan.md` の優先順位に基づく次点候補は「クラウド保存の設定画面と復元画面」（`docs/account-cloud-storage-decision.md` 11.1節の最後の未実装項目）。初回アップロード、継続バックアップの表示、復元時の選択画面（端末とクラウド両方にある場合はJSONバックアップ必須）、クラウド停止・全件削除・退会の導線を含む。フラグOFF・本番到達不可のまま進められる。

## 引き継ぎ事項・注意点

1. **新規登録の抑止について、公式資料と設計前提が食い違っていた。** `docs/account-cloud-storage-decision.md` は「Console設定で新規登録の可否を切り替えられる」という前提だったが、Managed Better Authの認証フロー公式ドキュメント（`https://neon.com/docs/auth/authentication-flow`、2026-09-08確認）には次のように明記されている。

   > "Anyone can sign up for your application by default. Support for restricted signups is coming soon."

   Email OTPプラグインのConsole設定ページにも「サインアップ無効化」に相当する項目の記載は無かった。better-authの `email-otp` プラグイン自体には `disableSignUp` オプションが存在する（`node_modules/better-auth` のソースで確認済み）が、Managed Better Authはこのプラグインの実体をNeon側でホストしており、アプリのコードからオプションを渡す経路が無い。Consoleにこれを設定する項目があるかどうかは、今回のドキュメント調査だけでは確認できなかった。
   ユーザーに確認のうえ、**アプリ側にも許可リスト制限を追加する方針**で進めた。`getCloudSession` は、Managed Better Authで検証済みのメールアドレスが `USER_DATA_ALLOWED_EMAILS`（環境変数、カンマ区切り）に含まれる場合だけ `ownerId` を返す。一覧が未設定なら誰も通さない（フェイルクローズ）。
   **次のチャット（またはユーザー）へのお願い**: Neon Consoleを実際に開き、「新規登録だけを止めて既存ユーザーのログインは許可する」設定が本当に存在するか確認してほしい。存在する場合はそちらも有効にする（アプリ側の許可リストは二重の防御として残してよい）。存在しない場合は、今回実装したアプリ側の許可リストが唯一の防御になるため、`USER_DATA_ALLOWED_EMAILS` の運用（誰が・いつ更新するか）を決める必要がある。

2. **`@neondatabase/auth`（0.5.0-beta）の `peerDependencies` は `next: >=16.0.0` を要求しているが、本リポジトリは `next@15.5.18` のまま。** `pnpm install` は警告のみで成功し、`pnpm build` も型チェックを含めて成功した。今回使った機能（`createNeonAuth().getSession()` をRoute Handler内で呼ぶ、`authApiHandler` 相当の `.handler()`）はNext 15でも動作した。ただし `auth.middleware()`（`proxy.ts` 経由のルート保護、Next 16向けの新しい規約）は今回使っておらず、未検証。将来Next.jsを16へ上げるかどうかは本タスクの範囲外なので判断していない。

3. **`getCloudSession` の `verifiedAt` は、better-authのセッション作成時刻（`session.createdAt`）を採用した。** これはサインイン（OTP検証）が成功した第間の時刻で、better-auth本体がセッションの「新しさ」判定に使う標準的なフィールドと同じ考え方（公式ドキュメント上に明示的な「reauth」専用フィールドは見当たらなかった）。Cookie自体は既定で長期間（better-authの既定は7日、自動延長あり）有効なため、`isRecentlyVerified` の10分判定は「セッションが作られてから10分」を意味し、「Cookieが有効かどうか」とは別の軸である点は変わっていない。

4. **`/cloud-login` と `/api/auth/[...path]` は `NEXT_PUBLIC_CLOUD_BACKUP_ENABLED` で404ゲートしている。** これは `NEXT_PUBLIC_` 環境変数なのでビルド時に値が埋め込まれる。Vercelでフラグを有効にしてこの画面を確認したい場合、環境変数を設定してから**再デプロイ（再ビルド）が必要**（デプロイ後の値変更だけでは反映されない）。これは既存の `/api/cloud/*` も含め、このリポジトリの `NEXT_PUBLIC_CLOUD_BACKUP_ENABLED` の使い方全般に元から当てはまる性質で、今回新しく生まれた制約ではない。

5. **Neon Consoleでの作業手順（ユーザー作業分）**

   以下はユーザー（Neon Consoleの操作担当）向けの手順。ダミーデータでの検証のみを想定し、実データは使わない。

   ### 5.1 本人記録用のNeonプロジェクトを新規作成する

   - 匿名分析用プロジェクトとは別に、新しいNeonプロジェクトを作成する。
   - リージョンは `aws-ap-southeast-1`（シンガポール）を選択する。

   ### 5.2 Managed Better Auth（旧Neon Auth）を有効化する

   - 作成したプロジェクトのConsoleで Auth を有効化する（`npx neon@latest init` を使うか、Console上の「Enable Auth」から行う）。
   - 有効化後に払い出される「Auth base URL」を控える（`NEON_AUTH_BASE_URL` に使う）。

   ### 5.3 Email OTPだけを有効にする

   - Console の **Settings → Auth** で次を設定する。
     - 「Sign-up and Sign-in with Email」を有効にする。
     - 「Verify at Sign-up」を有効にする。
     - 「Verification method」を **Verification code**（6桁コード）にする。
   - パスワードログイン、Google/MicrosoftなどのSNSログイン、組織機能は有効にしない（既定でOFFのはずだが、ONになっていないか確認する）。
   - **新規登録を止める設定が実際にあるか確認してほしい。** 今回のドキュメント調査では見つけられなかった（上記「引き継ぎ事項・注意点」1番を参照）。あれば有効にする。無ければ、アプリ側の `USER_DATA_ALLOWED_EMAILS` だけが防御になるので、その旨を認識しておいてほしい。
   - マジックリンクは有効にしない（Email OTPだけを使う）。

   ### 5.4 参加者を事前登録する（新規登録を閉じる場合）

   - 「新規登録を止める設定」がある場合、その運用に従って、参加予定者のメールアドレスをConsole側で事前登録する。
   - 事前登録の有無にかかわらず、アプリ側の許可リストとして次の環境変数にも同じメールアドレスをカンマ区切りで設定する（`USER_DATA_ALLOWED_EMAILS`）。

   ### 5.5 環境変数を設定する（Vercel、対象はPreview環境）

   ```
   NEON_AUTH_BASE_URL=（5.2で控えたAuth base URL）
   NEON_AUTH_COOKIE_SECRET=（下記コマンドで生成）
   USER_DATA_ALLOWED_EMAILS=検証用ダミーアカウントのメールアドレス（カンマ区切り）
   USER_DATA_DATABASE_URL=（本人記録用プロジェクトのSQL接続文字列、実行時ロール）
   USER_DATA_KEK=（既存手順どおり。未設定ならここで生成）
   NEXT_PUBLIC_CLOUD_BACKUP_ENABLED=true　　※Preview環境の変数としてのみ設定し、Productionには設定しない
   ```

   `NEON_AUTH_COOKIE_SECRET` の生成コマンド:

   ```
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```

   `USER_DATA_KEK` の生成コマンド（`.env.example` と同じ、未設定の場合のみ）:

   ```
   node -e "console.log('v1:' + require('node:crypto').randomBytes(32).toString('base64'))"
   ```

   ### 5.6 `pnpm db:user-data:setup` を実行する

   - `USER_DATA_DATABASE_URL`（マイグレーション用ロールの接続文字列）をローカルまたはCIの環境変数に設定したうえで実行する。
   - 実行後、実行時ロールに必要な `SELECT`/`INSERT`/`UPDATE`/`DELETE` だけが付与されていることを確認する（`docs/account-cloud-storage-decision.md` 6.2節）。

   ### 5.7 Preview環境でだけ動作確認する

   - 上記5.5の環境変数をPreview環境にだけ設定し、Productionには設定しないことを再確認する（`NEXT_PUBLIC_CLOUD_BACKUP_ENABLED` を含む）。
   - Preview環境をデプロイし直す（`NEXT_PUBLIC_` 変数はビルド時に埋め込まれるため、変数追加後の再デプロイが必須）。
   - デプロイされたPreview URLの `/cloud-login` を開く。
     1. `USER_DATA_ALLOWED_EMAILS` に含めたダミーメールアドレスを入力し、コードを送る。
     2. 届いた6桁コードで「ログインする」を押し、「ログイン済みです」の表示になることを確認する。
     3. 許可リストに含まれていないメールアドレスでは、コード検証後もログインできない（=許可リストの突き合わせで弾かれる）ことを確認する。
     4. 「ログアウトする」でサインアウトし、再度未ログイン状態の画面に戻ることを確認する。
   - 確認が終わったら、`NEXT_PUBLIC_CLOUD_BACKUP_ENABLED` をPreview環境からも外す（または `false` にする）ことを推奨する。次のタスク（設定・復元画面）の実装が終わるまでは、検証以外の目的でONにし続けない。
