# Handoff

日付: 2026-09-09（Console設定の実施記録を2026-09-11に追記）
担当チャット: 18件目（Console設定の実施は19件目）

## 今回実装したタスク

クラウド保存の**設定画面と復元画面**（`docs/account-cloud-storage-decision.md` 4節・9節、11.1節の最後の未実装項目）。ロジックは前回までに揃っていたため、その上に画面を載せた。フラグOFF・本番画面から到達不可のまま。

前提として、Neon Consoleの設定作業（前回の手順書5.1〜5.7）は**まだ実施されていない**ことをユーザーに確認済み。したがって実機での通し確認は行っておらず、検証は自動テストのみ。

### 画面の置き場所

ユーザーと相談し、記録タブ（これまで）の中のカードとした。既存の「データのバックアップ」「匿名の利用状況」と同じ並びに置いてある。JSONバックアップの導線がすぐ隣にあり、復元時に必須となるファイル保存へ繋げやすいため。

### 実装した要件（4節・9節の項番に対応）

1. **有効化前の説明** … 短い要約5行と、折りたたんだ詳細7項目（預けるもの／場所／見られる人／期間／消し方／やめ方／消したあとに残るもの）。
2. **アカウント作成とアップロードの分離** … ログイン導線は `/cloud-login` へのリンクだけ。`pushSnapshot` は同意（`cloud-consent.ts`）が無いと1件も送らない。ログインしただけでは送らないことをテストで固定した。
3. **有効化の直前の件数表示** … 記録・できること・やらないことの件数と期間だけを出す。記録の中身は画面にも出さない（テストで固定）。
4. **同意の分離** … `yorucare_cloud_backup_consent` を匿名分析とは別の鍵で持つ。片方を変えても他方が変わらないことをテストで固定した。
5. **最終預け日時** … 「最後にクラウドに預けた：9月8日 22:14」。送信失敗は画面に出さない。
6. **何日も預けられていないときの案内** … `evaluateSyncNotice` が `stale` を返したときだけ出す。
7. **引き継がれた端末の案内** … 文言はユーザーに確認して確定（説明を厚めにする案を採用）。引き継いだ日付、記録が消えていないこと、預け直す方法の3文。
8. **復元画面** … `planRestore` の結果で出し分ける。`choice_required` では件数と期間を並べ、`requiresLocalBackup` が真なのでJSONバックアップを保存するまで両方の選択肢を押せないようにした。
9. **停止と退会** … 確認の画面を挟み、どちらも削除APIを呼ぶ。再認証については下記。
10. **記録保存後の自動送信** … `src/lib/storage.ts` の `saveRecord` 成功後に `backupAfterSave()` を呼ぶ。結果は待たない。送れなくても記録の保存は成功のまま（テストで固定）。

### 実装中に見つけて直したこと

- **削除前の再認証がどのAPIでも実施されていなかった。** `isRecentlyVerified` は定義とテストはあったが、呼び出し元が無かった。4節・8.2節が「削除は再認証後」と定めているため、`DELETE /api/cloud/snapshot` で必須にし、古い場合は削除せず `403`（`reason: "reauth_required"`）を返すようにした。判定は `src/lib/server/cloud-reauth.ts` へ切り出してある（認証基盤を読み込まない純粋な関数にし、テストでセッションを差し替えてもこの守りが消えないようにするため）。
- **記録が1件も無い端末に復元の導線が無かった。** 機種変更の直後がまさにこの状態で、このままでは預けた控えへたどり着けず、機能の目的が果たせない。まだ預けていない状態の画面にも「クラウドから戻す」を置いた。
- **再認証を求めるとき、確認の画面が開いたままだと再ログインの導線が裏に隠れていた。** 応答を受けたら確認の画面を閉じてから案内するようにした。

## 変更ファイル

- `src/lib/cloud-consent.ts`（新規）: クラウド保存の同意。匿名分析とは別の鍵で持つ
- `src/lib/cloud-consent.test.ts`（新規）: 同意が別々であることの単体テスト
- `src/lib/server/cloud-reauth.ts`（新規）: 直近の本人確認の判定（何にも依存しない）
- `src/components/shared/cloud-backup-panel.tsx`（新規）: 設定画面
- `src/components/shared/cloud-backup-panel.test.tsx`（新規）: 表示テスト18件
- `src/components/shared/cloud-restore-dialog.tsx`（新規）: 復元画面
- `src/components/shared/cloud-restore-dialog.test.tsx`（新規）: 表示テスト9件
- `src/lib/cloud-auto-backup.test.ts`（新規）: 保存後の自動送信のテスト
- `src/lib/cloud-sync.ts`: 送信前の同意確認、`backupAfterSave`、`deleteCloudData` の戻り値を4状態へ
- `src/lib/cloud-sync.test.ts`: 同意していなければ送らない、再認証を求められる場合を追加
- `src/lib/server/cloud-session.ts`: `isRecentlyVerified` を `cloud-reauth.ts` へ移し、再輸出
- `src/app/api/cloud/snapshot/route.ts`: 削除の前に直近の本人確認を必須化
- `src/app/api/cloud/snapshot/route.test.ts`: 再認証の単体テストを追加
- `src/lib/storage.ts`: `saveRecord` 成功後に `backupAfterSave()`
- `src/lib/constants.ts`: `cloudBackupConsent` の鍵を追加
- `src/lib/copy.ts`: `cloudBackup` の文言一式
- `src/lib/dates.ts`: `formatDateTimeLabel`、`formatDateLabel`
- `src/components/tabs/records-tab.tsx` / `.test.tsx`: 設定画面を配置
- `docs/DEVELOPMENT_BOARD.md`、`docs/account-cloud-storage-decision.md`、`docs/handoff/latest.md`

## 検証結果

- `pnpm lint`: 成功（警告・エラーなし）
- `pnpm exec tsc --noEmit`: 成功
- `pnpm test`: 成功（58 test files / 571 tests）。前回の529件から42件増。既存の `src/app/api/cloud/**/route.test.ts` は所有者IDを本文から受け取らない性質を保ったまま通っている
- `pnpm build`: 成功。`NEXT_PUBLIC_CLOUD_BACKUP_ENABLED` 未設定でビルドしており、設定画面は何も描画せず、APIと `/cloud-login` は到達不可のまま
- **実機確認は未実施**（Neon Consoleの設定が未着手のため）

### DB構造とRLSのローカル検証（2026-09-09 追加）

Neonへ適用する前に、`db/migrations/0002_user_data_snapshots.sql` をローカルのPostgreSQL 16へ、設定スクリプトと同じ分割方法（`-- statement-breakpoint` 区切り）で1文ずつ適用して確かめた。

- 21文すべてが適用できた
- 2回続けて流しても失敗しない（冪等。`IF NOT EXISTS` と `DROP POLICY IF EXISTS` が効いている）
- 6.2節どおり `SELECT`/`INSERT`/`UPDATE`/`DELETE` だけを与えた実行時ロールで、RLSが期待どおり効くことを確認した
  - `app.owner_id` を設定しないと1件も見えない
  - 自分の所有者IDを設定すると自分の行だけが見え、他人の行は見えない
  - 他人の所有者IDで書き込もうとすると `new row violates row-level security policy` で拒否される
  - 他人の行を削除しようとしても0件で、相手の行は残る

スーパーユーザーはRLSを素通りするため、この確認は必ず実行時ロール（非スーパーユーザー）で行う必要がある。Neon側でも、実行時ロールがスーパーユーザーや `BYPASSRLS` を持たないことを確認すること。

## 自動レビュー指摘

- PRは未作成（pushのみ）。指摘0件（該当PRなし）

## 次にやること

1. ~~**Neon Consoleの設定**（下記6節の手順書）~~ → **2026-09-11に 6.1〜6.6 まで実施済み。** 実際の画面と手順書の食い違いは6節の各項へ反映した。
2. **6.7 のPreview環境での通し確認は2026-09-11にほぼ実施済み**（結果は6.7節の表）。**残っているのは「許可リストに無いアドレスでは弾かれること」の確認1件だけ。** 別端末での復元も未実施。
3. 同意文面と研究・安全管理手続きの確認（未着手・担当と期限が未定）。**これが済むまでフラグを開けない。**
4. **`yorucare_app` ロールのパスワードを作り直す。** 作成時のSQLがNeonのSQLエディタ履歴に残っており、設定手順の途中でVercel側にも平文で保存された時間帯があった（下記「引き継ぎ事項」8番）。公開前に必須。

## 引き継ぎ事項・注意点

1. **退会時に認証アカウントそのものは削除していない。** 8.2節は退会を「全セッション失効、本人記録削除、認証アカウント削除の順」と定めているが、今回の実装はクラウド上の本人データ削除とサインアウトまで。Managed Better AuthのSDKには `delete-user` の経路が存在するものの、better-auth本体ではサーバー側で明示的に有効化が必要な機能であり、Managed Better AuthはNeon側がホストしているため、アプリのコードから有効化できるかを確認できなかった。ベータの記載と実装が食い違う可能性があるため、**動作を確かめずに呼び出すことはしていない**。公開前に、Console上またはSDKで認証アカウントを削除できるかを確認し、できない場合は運営者が手作業で削除する手順を決める必要がある。

2. **文言はすべて `src/lib/copy.ts` の `cloudBackup` に置いた。** 「保存先はシンガポール」「運営者は読めない」「あなたが消すまで預かる」など、事実として説明している箇所がある。Neonの契約・保存国・再委託先の確認（11.2節）の結果と食い違う場合は、文言も一緒に直す必要がある。

3. **説明文はフラグOFFでも本番のJavaScriptに含まれる。** 画面は描画されないため到達はできないが、文字列そのものはビルド結果に入る。到達不可という条件は満たしているが、「まだ公開していない機能の説明文が読める状態にある」ことは認識しておいてほしい。

4. **同意を記録するのは端末内だけ。** `yorucare_cloud_backup_consent` はこの端末のlocalStorageにあり、クラウドには送っていない。別の端末でログインしても、その端末で改めて同意の操作が要る。

5. **`deleteCloudData` の戻り値を真偽値から4状態（`off` / `deleted` / `reauth_required` / `failed`）へ変えた。** 呼び出し元は設定画面だけなので影響範囲は閉じているが、今後この関数を使うときは注意すること。
6. **Neon Consoleでの作業手順（ユーザー作業分）**

   ダミーデータでの検証のみを想定し、実データは使わない。**2026-09-11に6.1〜6.6まで実施した。** 実際の画面が下記と違っていた点は各項に追記してある（Managed Better Authはベータのため、今後も変わりうる）。Consoleの表示を日本語（自動翻訳）にしている場合、項目名が英語ドキュメントと一致しない。本文では「英語表記（画面の日本語表記）」の形で併記する。

   ### 6.1 本人記録用のNeonプロジェクトを新規作成する

   - 匿名分析用プロジェクトとは別に、新しいNeonプロジェクトを作成する。
   - リージョンは `aws-ap-southeast-1`（シンガポール）を選択する。
   - **実施（2026-09-11）**: プロジェクト名 `yorucare-user-data`、リージョン AWS Asia Pacific 1 (Singapore)、Postgres **18**（作成ダイアログの既定）で作成した。検証は PostgreSQL 16 で行っているが、`0002_user_data_snapshots.sql` はテーブル・索引・RLS・ポリシーだけでバージョン依存の構文が無いため、既定の18を採った。

   ### 6.2 Managed Better Auth（旧Neon Auth）を有効化する

   - **プロジェクト作成ダイアログに「Enable Neon Auth（Neon認証を有効にする）」のトグルがある。** ここでONにすれば、この項目は作成と同時に完了する。`npx neon@latest init` は不要（既存リポジトリに雛形を作ってしまうので実行しないこと）。
   - 有効化すると、左メニューに **Auth（認証）** が現れる。
   - Auth base URL は **Auth → Configuration（構成）タブ → Project Info（プロジェクト情報）** の「Auth URL（認証URL）」欄にある。`NEON_AUTH_BASE_URL` には**この欄の表示をそのまま**入れる（`https://<endpoint>.neonauth.<region>.aws.neon.tech/<db>/auth` の形で、末尾のパスまで含める）。`.env.example` のコメント例は `https://xxxxx.neon.tech` とパスの無い形だが、公式リファレンス（`neon.com/docs/auth/reference/nextjs-server`、2026-09-11確認）は「Console に表示される URL」としか書いておらず、パスを削る指示は無い。Console の表示を正とする。
   - 同じ欄にある JWKS URL は今回使わない。

   ### 6.3 Email OTPだけを有効にする

   - **Auth の設定は「Settings → Auth」ではなく、左メニューの Auth（認証）配下にある。** タブは **Users（ユーザー）/ Configuration（構成）/ Plugins（プラグイン、ベータ）** の3つ。設定は**ブランチ単位**（URLが `/branches/<branch>/auth?tab=configuration`）。
   - **Email OTP 専用のトグルは存在しない。** 公式ドキュメント（`neon.com/docs/auth/guides/plugins/email-otp`、2026-09-11確認）が求めるのは次の2つだけで、いずれも Configuration タブの **Authentication（認証）** セクションにある。

     | 公式ドキュメントの表記 | 画面の日本語表記 | 設定 |
     | --- | --- | --- |
     | Sign-up and Sign-in with Email | メールアドレスで登録する／メールアドレスでログイン | ON のまま |
     | Verify at Sign-up | サインアップ時に確認する | **OFF が既定。ONにする** |
     | Verification method → Verification code | 検証方法 → 検証コード | 「サインアップ時に確認する」をONにすると現れる。**既定で「検証コード」が選ばれている** |

   - **「既定でOFFのはず」という前回の記述は誤りだった。** 2026-09-11時点の既定値は次のとおりで、4つがONになっていた。設計5.1節が無効と定めているものは、手で切る必要がある。

     | 項目 | 場所 | 既定 | 対応 |
     | --- | --- | --- | --- |
     | メールアドレスで登録する（メール＋パスワード登録） | 構成 → 認証 | **ON** | **後述の理由でONのまま残した** |
     | メールアドレスでログイン（メール＋パスワードログイン） | 構成 → 認証 | **ON** | 同上 |
     | OAuth プロバイダー（Google が「共有キー」で登録済み） | 構成 → OAuthプロバイダー | **登録済み** | 行の「⋮」→ 削除。一覧を空にした |
     | 組織（Organization） | プラグイン → 組織 | **ON** | OFF にした |
     | マジックリンク | プラグイン | OFF | そのまま |
     | 電話認証 | プラグイン | OFF | そのまま |
     | Webhook | 構成 → ウェブフック | OFF | そのまま |
     | Localhost を許可する | 構成 → ドメイン | ON | 検証中はそのまま。公開前に要判断 |

   - **設計5.1節「パスワードログインを無効にする」は、現在のManaged Better Authでは達成できない。** Email OTP の前提条件が「メールでの登録とログイン」の有効化であり、その項目の説明文が「メールアドレスと**パスワード**を使用して」と明記しているため、OTPだけを残してパスワードを切る設定が無い。アプリは `authClient.signIn.emailOtp()` しか呼ばず、パスワード入力の画面も持たないが、**認証サーバー側にはパスワード経路が残る**。防御は `USER_DATA_ALLOWED_EMAILS` の突き合わせに依存する。
   - **メールプロバイダー**は既定で「共有」「送信者 `auth@mail.myneon.app`」。設計5.3節の想定どおりなので変更しない。
   - **ドメイン（Domains）欄には、アプリを動かすオリジンを必ず登録する。** 当初「Email OTP はリダイレクトを使わないので空でよい」と判断したが、**これは誤りだった。**
     空のままだと**ログインは通るのにサインアウトだけが失敗する**（`POST /api/auth/sign-out` が `403 {"message":"Invalid origin","code":"INVALID_ORIGIN"}`）。
     しかも画面は「ログアウトした」ように見えるため、**サーバー側のセッションが生きたまま気づけない。** 2026-09-11に実際に踏んだ。
     Preview の**ブランチ別URL**（`https://<project>-git-<branch>-<owner>.vercel.app`。デプロイごとに変わるハッシュ付きURLではなく、ブランチに紐づく安定したほう）を登録する。登録後は `200 {"success":true}` になり、再読み込みしても未ログインのままになる。

   ### 6.4 参加者を事前登録する

   - **新規登録を止める設定は存在しない（2026-09-11確認）。** Auth 画面の上部に常設のバナーがあり、「Anyone on the web can sign up for your app. Support for signup restriction is coming soon.（ウェブ上の誰でもアプリに登録できます。登録制限機能のサポートは近日中に提供予定です。）」と明記されている。Console 側の事前登録という運用は取れない。
   - したがって、**アプリ側の `USER_DATA_ALLOWED_EMAILS` が唯一の防御**になる。検証用ダミーのメールアドレスをカンマ区切りで環境変数に入れる。

   ### 6.5 環境変数を設定する（Vercel、対象はPreview環境）

   ```
   NEON_AUTH_BASE_URL=（6.2で控えたAuth URL。表示のまま、パス込み）
   NEON_AUTH_COOKIE_SECRET=（下記コマンドで生成）
   USER_DATA_ALLOWED_EMAILS=検証用ダミーアカウントのメールアドレス（カンマ区切り）
   USER_DATA_DATABASE_URL=（本人記録用プロジェクトの接続文字列、実行時ロール）
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

   - **Vercel の「Type（タイプ）」は必ず Secret（秘密）を選ぶこと。** Config（設定）で保存すると、保存後に編集画面を開いただけで値が平文で表示される。`USER_DATA_DATABASE_URL`・`USER_DATA_KEK`・`NEON_AUTH_COOKIE_SECRET`・`USER_DATA_ALLOWED_EMAILS` の4つが対象。`NEON_AUTH_BASE_URL` と `NEXT_PUBLIC_CLOUD_BACKUP_ENABLED` は秘密ではないので Config でよい。
   - **`.env` 形式をまとめて貼り付けて複数行に展開する機能を使うと、Type が Secret から Config へ戻ることがある。** 貼り付けた**あと**に Type と Environments を見直してから保存する。保存後は一覧の行頭が鍵アイコン（🔒）になっていれば Secret、`<>` なら Config。
   - **Environments（環境）も同様に、貼り付け後に Preview だけになっているか見直す。** 既定は Production で、`.env` 貼り付け後に「Production and Preview」へ戻ることがある。

   ### 6.6 `pnpm db:user-data:setup` と実行時ロールの作成

   マイグレーションと実行時では**同じ `USER_DATA_DATABASE_URL` という変数名**を読むため（`scripts/setup-user-data-db.mjs` と `src/lib/server/user-data-store.ts`）、実際には「手元にはマイグレーション用ロールの接続文字列、Vercelには実行時ロールの接続文字列」を入れる形になる。**6.5より先にこの項を済ませたほうが手戻りが無い。**

   1. マイグレーション用（既定の `neondb_owner`）の接続文字列を Console の「Connect（接続する）」から取得し、手元の環境変数に入れて `pnpm db:user-data:setup` を実行する。成功すると `本人記録用のDB構造を更新しました（21件）。` と出る。

      - Windows の `cmd` で `set VAR=値` を使う場合、接続文字列に `&` が含まれるとそこで文が切れる。`set "VAR=値"` と引用符で囲むか、PowerShell で `$env:VAR = '値'`（シングルクォート）を使う。

   2. **実行時ロールは Console の「Roles（役割）」画面ではなく、SQL で作る。** Neon公式（`neon.com/docs/manage/roles`、2026-09-11確認）は「Console・API・CLI で作ったロールは `neon_superuser` のメンバーになる」「`neon_superuser` は `BYPASSRLS` を持つ」「限定的な権限のロールが必要なら SQL クライアントから作る」と記載している。

      ```sql
      CREATE ROLE yorucare_app
        LOGIN PASSWORD '生成した値'
        NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

      GRANT CONNECT ON DATABASE neondb TO yorucare_app;
      GRANT USAGE ON SCHEMA public TO yorucare_app;
      GRANT SELECT, INSERT, UPDATE, DELETE ON user_data_snapshots TO yorucare_app;
      GRANT SELECT, INSERT, UPDATE, DELETE ON user_data_devices  TO yorucare_app;
      ```

      Console の SQL エディタには実行履歴が残るため、ここで使ったパスワードは履歴に残る。**公開前に必ず作り直すこと。**

   3. 付与結果を確認する。

      ```sql
      SELECT rolname, rolcanlogin, rolsuper, rolbypassrls
      FROM pg_roles WHERE rolname = 'yorucare_app';

      SELECT table_name, privilege_type
      FROM information_schema.role_table_grants
      WHERE grantee = 'yorucare_app'
      ORDER BY table_name, privilege_type;
      ```

      `rolbypassrls` が `f`、権限が2テーブル×4種の8行だけであること。**2026-09-11の実測でこのとおりになった。**

   4. Neon の SQL エディタには最初からサンプルSQL（`playing_with_neon`）が入っている。消さずに実行すると本人記録用DBに無関係なテーブルができる。**貼り付ける前に `Ctrl+A` → `Delete` でエディタを空にすること。** できてしまったら `DROP TABLE IF EXISTS playing_with_neon;` で消す。
   5. SQL の実行は「Run（走る）」ボタンで行う。「Explain（説明する）」を押すと文の先頭に `EXPLAIN (...)` が付き、`ALTER`/`CREATE` などでは `構文エラー (SQLSTATE 42601)` になる。

   ### 6.7 Preview環境でだけ動作確認する

   - 6.5の環境変数をPreview環境にだけ設定し、Productionには設定しないことを再確認する（`NEXT_PUBLIC_CLOUD_BACKUP_ENABLED` を含む）。
   - Preview環境をデプロイし直す（`NEXT_PUBLIC_` 変数はビルド時に埋め込まれるため、変数追加後の再デプロイが必須）。このブランチへ push すれば新しいPreviewが自動で作られる。
   - デプロイされたPreview URLの `/cloud-login` を開く。
     1. `USER_DATA_ALLOWED_EMAILS` に含めたダミーメールアドレスを入力し、コードを送る。
     2. 届いた6桁コードで「ログインする」を押し、「ログイン済みです」の表示になることを確認する。
     3. 許可リストに含まれていないメールアドレスでは、コード検証後もログインできない（=許可リストの突き合わせで弾かれる）ことを確認する。
     4. 「ログアウトする」でサインアウトし、再度未ログイン状態の画面に戻ることを確認する。
   - あわせて記録タブを開き、「クラウドに預ける」の導線が出ること、預ける前に件数が表示されることを確認する。
   - **メールの到達性（届くか、何分かかるか、迷惑メールに入らないか）をこの場で記録する。** 共有SMTP（`auth@mail.myneon.app`）のままで公開してよいかの判断材料になる（設計5.3節・11.2節）。
   - 確認が終わったら、`NEXT_PUBLIC_CLOUD_BACKUP_ENABLED` をPreview環境からも外す（または `false` にする）。検証以外の目的でONにし続けない。

   #### 6.7 の実施結果（2026-09-11）

   Preview（ブランチ `claude/yorucare-cloud-backup-w9p805`、コミット `c70fd38`）で実施。ダミーデータのみ。

   | 確認 | 結果 |
   | --- | --- |
   | `/cloud-login` が404でない | ✅ `NEXT_PUBLIC_CLOUD_BACKUP_ENABLED=true` がビルドに反映されていることを確認 |
   | 許可リストのアドレスでログインできる | ✅ 「ログイン済みです」を表示 |
   | 許可リスト外のアドレスでは弾かれる | ⏳ **未実施**（許可リストに無い別のメールアドレスが要る）。次チャットで必ず実施すること |
   | 記録タブに「クラウドに預ける」が出る | ✅ 表示される |
   | 預ける前に件数が表示される | ✅ 「記録 1 件、「できること」 5 件、「やらないこと」 0 件」「9/11 〜 9/11 の記録です」。記録の中身は表示されない |
   | 実際にクラウドへ預けられる | ✅ 「クラウドに預けています」「最後にクラウドに預けた：9月11日 14:20」。**認証→許可リスト→実行時ロール→RLS→暗号化→保存の経路が通しで動いた** |
   | ログアウトできる | ⚠️ **最初は失敗**（上記 `INVALID_ORIGIN`）。ドメイン登録後は成功。再読み込みしても未ログインのまま |
   | 認証メールの到達性 | ✅ **1分以内に受信トレイへ直接届いた**（迷惑メール判定なし）。送信元は共有SMTP `auth@mail.myneon.app` |

   未実施の「許可リスト外の拒否」は、同じ受信箱で受け取れる別表記のアドレス（`ユーザー名+任意の文字@gmail.com` など）を使えば、新しいメールアドレスを用意せずに試せる。

   ### 6.8 詰まりやすい点（2026-09-09 追記）

   - **`NEXT_PUBLIC_` で始まる変数は、ビルドのときに値が埋め込まれる。** 変数を足しただけでは反映されず、**必ず再デプロイが要る**。「設定したのに404のまま」はほぼこれ。
   - **`USER_DATA_DEV_OWNER_ID` は設定しないこと。** これは所有者IDを固定してログインを丸ごと飛ばす検証用の抜け道で、設定するとログインの確認にならない。6桁コードの流れを試すなら未設定のままにする。
   - **`USER_DATA_ALLOWED_EMAILS` が未設定だと、誰もログインできない**（安全側に倒してある）。検証用のダミーのメールアドレスを必ず入れる。
   - **`USER_DATA_DATABASE_URL` に匿名分析用のURLを使わない。** データ境界を分けるため、別プロジェクトの接続文字列にする。
   - **実行時ロールに与えるのは `SELECT`/`INSERT`/`UPDATE`/`DELETE` の4つだけ。** スーパーユーザーや `BYPASSRLS` を持つロールだとRLSが素通りし、第二の防御が無くなる。
   - `NEON_AUTH_COOKIE_SECRET` は32文字未満だと、エラーにならず「認証が未設定（＝常に未ログイン）」として静かに扱われる。生成コマンドの出力をそのまま使うこと。
   - **Console の「ドメイン」欄が空だと、ログインは通るのにサインアウトだけが 403 `INVALID_ORIGIN` で失敗する（2026-09-11 追記）。** 画面上は「ログアウトした」ように見えるのに、再読み込みすると「ログイン済みです」に戻る。ログインだけを確認して合格にすると見逃す。Preview のブランチ別URLを必ず登録する。

7. **Vercelの環境変数は「Secret（秘密）」で保存すること。** 2026-09-11の設定作業で、`.env` 形式の貼り付けを使ったところ Type が Config（設定）で保存され、編集画面を開くだけで接続文字列が平文で表示された。Config は「保存後も閲覧できる」種類で、秘密値には使わない。詳細と回避手順は6.5節に書いた。

8. **`yorucare_app` のパスワードは公開前に作り直すこと。** (1) 作成時の `CREATE ROLE ... PASSWORD` がNeonのSQLエディタ履歴に残る、(2) 上記7の取り違えにより、一時的にVercel上で平文閲覧可能な状態だった、の2点による。検証はダミーデータのみ・本番の入口は閉じたままなので実害は無いが、このロールの資格情報を本番相当として扱わないこと。同じ理由で `USER_DATA_KEK` と `NEON_AUTH_COOKIE_SECRET` も作り直してある。

9. **設計5.1節の「パスワードログインを無効にする」は現状のManaged Better Authでは満たせない。** Email OTP の前提条件がメール＋パスワードの有効化であるため（6.3節）。アプリ側にパスワードの入口は無いが、認証サーバー側の経路は残る。`USER_DATA_ALLOWED_EMAILS` が唯一の防御である点を、公開判断のときに改めて評価すること。

10. **ログアウトが「効いたように見えて効いていない」状態があり得る。** 2026-09-11に実機で踏んだ。`POST /api/auth/sign-out` が 403 を返しても、画面は未ログイン表示へ切り替わる。原因はConsoleの「ドメイン」未登録だったが、**応答の失敗を画面に反映しない実装そのものは残っている。** 共有端末で「ログアウトしたつもり」が成立してしまうため、公開前に、サインアウト失敗時は未ログイン表示へ切り替えず、失敗を本人に伝える形へ直すこと。8.2節・5.2節（セッション失効）に関わる。
