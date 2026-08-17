/**
 * First Stage の2分原稿が時間内に収まるかを字数で見積もる。
 * Usage: node scripts/measure-presentation-script.mjs
 */
import fs from "node:fs";
import path from "node:path";

const LIMIT_SECONDS = 120;
/** プレゼンの読み上げ速度の目安（字／分）。遅い側で見積もる */
const RATES = [280, 300, 320];

const file = path.resolve(
  import.meta.dirname,
  "../docs/hackathon2026/presentation-script.md",
);
const md = fs.readFileSync(file, "utf8");
const body = md.split("## 原稿")[1].split("## 収録の注意")[0];

const lines = body
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#") && !l.startsWith("---"));

const full = lines.map((l) => l.replace("`[削可]`", "").trim()).join("");
const trimmed = lines.filter((l) => !l.includes("[削可]")).join("");

let ng = 0;
for (const [name, text] of [["全文", full], ["削可を落とした版", trimmed]]) {
  const n = [...text].length;
  const times = RATES.map((r) => `${r}字/分:${(n / r * 60).toFixed(0)}秒`);
  const slowest = (n / RATES[0]) * 60;
  const mark = slowest > LIMIT_SECONDS ? "NG " : "OK ";
  if (name === "削可を落とした版" && slowest > LIMIT_SECONDS) ng += 1;
  console.log(`${mark}${name}: ${n}字 （${times.join(" / ")}）`);
}
console.log(`上限 ${LIMIT_SECONDS}秒。削可を落とした版が最も遅い速度でも収まることを条件にしている。`);
process.exit(ng > 0 ? 1 : 0);
