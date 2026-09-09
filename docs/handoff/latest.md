# Handoff

日付: 2026-09-09
担当チャット: 18件目

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

## 自動レビュー指摘

- PRは未作成（pushのみ）。指摘0件（該当PRなし）

## 次にやること

1. **Neon Consoleの設定**（下記5節の手順書。ユーザー作業）。これが済むまでPreview環境でも通し確認ができない。
2. Console設定後、Preview環境で `/cloud-login` からログイン →記録タブの「クラウドに預ける」→預ける→別端末で復元、までを**ダミーデータで**通す。
3. 同意文面と研究・安全管理手続きの確認（未着手・担当と期限が未定）。**これが済むまでフラグを開けない。**

## 引き継ぎ事項・注意点

1. **退会時に認証アカウントそのものは削除していない。** 8.2節は退会を「全セッション失効、本人記録削除、認証アカウント削除の順」と定めているが、今回の実装はクラウド上の本人データ削除とサインアウトまで。Managed Better AuthのSDKには `delete-user` の経路が存在するものの、better-auth本体ではサーバー側で明示的に有効化が必要な機能であり、Managed Better AuthはNeon側がホストしているため、アプリのコードから有効化できるかを確認できなかった。ベータの記載と実装が食い違う可能性があるため、**動作を確かめずに呼び出すことはしていない**。公開前に、Console上またはSDKで認証アカウントを削除できるかを確認し、できない場合は運営者が手作業で削除する手順を決める必要がある。

2. **文言はすべて `src/lib/copy.ts` の `cloudBackup` に置いた。** 「保存先はシンガポール」「運営者は読めない」「あなたが消すまで預かる」など、事実として説明している箇所がある。Neonの契約・保存国・再委託先の確認（11.2節）の結果と食い違う場合は、文言も一緒に直す必要がある。

3. **説明文はフラグOFFでも本番のJavaScriptに含まれる。** 画面は描画されないため到達はできないが、文字列そのものはビルド結果に入る。到達不可という条件は満たしているが、「まだ公開していない機能の説明文が読める状態にある」ことは認識しておいてほしい。

4. **同意を記録するのは端末内だけ。** `yorucare_cloud_backup_consent` はこの端末のlocalStorageにあり、クラウドには送っていない。別の端末でログインしても、その端末で改めて同意の操作が要る。

5. **`deleteCloudData` の戻り値を真偽値から4状態（`off` / `deleted` / `reauth_required` / `failed`）へ変えた。** 呼び出し元は設定画面だけなので影響範囲は閉じているが、今後この関数を使うときは注意すること。

6. **Neon Consoleでの作業手順（ユーザー作業分・前回から未実施）**

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
