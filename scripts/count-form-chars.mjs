/**
 * 提出フォームの310字制限項目を実測する。
 * Usage: node scripts/count-form-chars.mjs
 */
import fs from "node:fs";
import path from "node:path";

const LIMIT = 310;
const LIMITED = ["2-3", "2-4", "2-5", "3-1", "3-2"];
const file = path.resolve(
  import.meta.dirname,
  "../docs/hackathon2026/submission-form.md",
);
const md = fs.readFileSync(file, "utf8");

// 「### 2-3. 見出し」直後の最初のコードブロックを取り出す
const sections = md.split(/^### /m).slice(1);
let ng = 0;
for (const sec of sections) {
  const id = sec.match(/^([\d-]+)\./)?.[1];
  if (!id) continue;
  const body = sec.match(/```\r?\n([\s\S]*?)\r?\n```/)?.[1];
  if (!body) continue;
  const n = [...body.replace(/\r/g, "")].length;
  const limited = LIMITED.includes(id);
  const over = limited && n > LIMIT;
  if (over) ng += 1;
  console.log(
    `${over ? "NG " : "OK "} ${id.padEnd(4)} ${String(n).padStart(4)}字` +
      (limited ? ` / ${LIMIT}` : " （制限なし）"),
  );
}
process.exit(ng > 0 ? 1 : 0);
