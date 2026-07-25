import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // lib層の純粋ロジックを対象にするため node 環境で十分（DOM不要）
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});
