import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(
  scriptDirectory,
  "../src/data/tokyo-support-facilities.json"
);

const resources = [
  {
    source: "specialWards",
    url: "https://www.hokeniryo.metro.tokyo.lg.jp/documents/d/hokeniryo/kuho_list_061212-csv",
  },
  {
    source: "municipalities",
    url: "https://www.hokeniryo.metro.tokyo.lg.jp/documents/d/hokeniryo/shiho_list",
  },
  {
    source: "coreCities",
    url: "https://www.hokeniryo.metro.tokyo.lg.jp/documents/d/hokeniryo/seire_list_1",
  },
  {
    source: "coreCities",
    url: "https://www.hokeniryo.metro.tokyo.lg.jp/documents/d/hokeniryo/seire_list_2",
  },
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value.trim())) {
        rows.push(row);
      }
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    if (row.some((value) => value.trim())) {
      rows.push(row);
    }
  }

  return rows;
}

async function fetchFacilities(resource) {
  const response = await fetch(resource.url, {
    headers: { "user-agent": "yorucare-open-data-updater/1.0" },
  });
  if (!response.ok) {
    throw new Error(`${resource.url} の取得に失敗しました（${response.status}）`);
  }

  const csv = new TextDecoder("shift_jis").decode(await response.arrayBuffer());
  const [headers, ...rows] = parseCsv(csv);
  const indexes = Object.fromEntries(
    headers.map((header, index) => [header.trim(), index])
  );
  const requiredHeaders = ["設置主体", "名称", "郵便番号", "住所", "電話番号"];
  for (const header of requiredHeaders) {
    if (indexes[header] === undefined) {
      throw new Error(`${resource.url} に「${header}」列がありません`);
    }
  }

  return rows.map((values) => ({
    municipality: values[indexes["設置主体"]].trim(),
    name: values[indexes["名称"]].trim(),
    postalCode: values[indexes["郵便番号"]].trim(),
    address: values[indexes["住所"]].trim(),
    phone: values[indexes["電話番号"]].trim(),
    source: resource.source,
  }));
}

const facilities = (
  await Promise.all(resources.map((resource) => fetchFacilities(resource)))
).flat();

if (facilities.length === 0) {
  throw new Error("施設データが0件のため更新を中止しました");
}

for (const facility of facilities) {
  if (
    !facility.municipality ||
    !facility.name ||
    !facility.postalCode ||
    !facility.address ||
    !/^\d+$/.test(facility.phone.replace(/\D/g, ""))
  ) {
    throw new Error(`必須項目または電話番号が不正です: ${JSON.stringify(facility)}`);
  }
}

const uniqueKeys = new Set(
  facilities.map((facility) => `${facility.name}|${facility.address}`)
);
if (uniqueKeys.size !== facilities.length) {
  throw new Error("名称と住所が同じ施設が重複しているため更新を中止しました");
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(facilities, null, 2)}\n`, "utf8");

const municipalityCount = new Set(
  facilities.map((facility) => facility.municipality)
).size;
console.log(`${facilities.length}施設・${municipalityCount}地域を更新しました`);
