"use client";

/**
 * クラウドバックアップのログイン確認画面から使う、Managed Better Authの
 * クライアントSDK。`/api/auth/[...path]` を経由してCookieのやり取りを行う。
 *
 * ここから呼ぶAPI（メールアドレス、6桁コード）は、この画面の外へは渡さない。
 */

import { createAuthClient } from "@neondatabase/auth/next";

export const cloudAuthClient = createAuthClient();
