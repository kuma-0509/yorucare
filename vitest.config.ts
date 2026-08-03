import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig は Next.js 向けに jsx: "preserve" のため、テスト時だけ変換する
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // 既定は lib 層の純粋ロジック向けに node 環境。
    // 表示テストだけがファイル先頭の `@vitest-environment jsdom` で切り替える。
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: false,
  },
});
