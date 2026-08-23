/**
 * 卒業制作の図解ページを組み立てる。
 *
 * Tailwind CSS を CLI で生成して 1 ファイルへ埋め込み、スクリーンショットも
 * data URI にする。外部ホストへ取りに行くのはフォントだけなので、この HTML を
 * どこへ置いても同じ見た目になる（Artifact の CSP でも壊れない）。
 *
 * 出力:
 *   index.html     ブラウザでそのまま開ける完全な HTML
 *   artifact.html  <head> を持たない本文だけの版（Artifact 公開用）
 *
 * Usage: node docs/graduation-project-diagram/src/build.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const outDir = resolve(here, "..");
const shotsDir = join(outDir, "screenshots");

const work = mkdtempSync(join(tmpdir(), "yorucare-diagram-"));
const cssPath = join(work, "out.css");

execFileSync(
  join(root, "node_modules/.bin/tailwindcss"),
  ["-c", join(here, "tailwind.config.cjs"), "-i", join(here, "input.css"), "-o", cssPath, "--minify"],
  { stdio: "inherit", cwd: root }
);

const css = readFileSync(cssPath, "utf8");
let body = readFileSync(join(here, "page.html"), "utf8");
rmSync(work, { recursive: true, force: true });

// {{IMG:name}} を screenshots/name.png の data URI へ置き換える
body = body.replace(/\{\{IMG:([a-z0-9-]+)\}\}/g, (_, name) => {
  const base64 = readFileSync(join(shotsDir, `${name}.png`)).toString("base64");
  return `data:image/png;base64,${base64}`;
});

// <title> と <link rel="stylesheet"> は head 相当の行。index.html では head へ移す
const headLines = [];
const bodyOnly = body
  .split("\n")
  .filter((line) => {
    if (/^<(title|link)\b/.test(line.trim())) {
      headLines.push(line.trim());
      return false;
    }
    return true;
  })
  .join("\n")
  .trim();

writeFileSync(
  join(outDir, "index.html"),
  `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="ヨルケア（https://yorucare.vercel.app/）の卒業制作をまとめた図解。作ったもの、解決する面倒、作りたいと思った理由、工夫した点と苦戦した点。" />
${headLines.join("\n")}
<style>${css}</style>
</head>
<body>
${bodyOnly}
</body>
</html>
`,
  "utf8"
);

// Artifact 公開用は body 断片のまま。<title> と font の link は先頭に残す
writeFileSync(join(outDir, "artifact.html"), `${headLines.join("\n")}\n<style>${css}</style>\n${bodyOnly}\n`, "utf8");

console.log("built index.html / artifact.html");
