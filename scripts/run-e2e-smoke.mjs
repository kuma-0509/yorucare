import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HOST = "127.0.0.1";
const PORT = "3100";
const BASE_URL = `http://${HOST}:${PORT}`;
const nextCli = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url)
);

const server = spawn(process.execPath, [nextCli, "start", "-H", HOST, "-p", PORT], {
  env: { ...process.env, NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js server exited early.\n${serverOutput}`);
    }
    try {
      const response = await fetch(BASE_URL);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Next.js server did not start in time.\n${serverOutput}`);
}

async function stopServer() {
  if (server.exitCode !== null || !server.pid) return;
  if (process.platform === "win32") {
    const taskkill = spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    await once(taskkill, "exit");
    return;
  }
  server.kill("SIGTERM");
  await Promise.race([
    once(server, "exit"),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "ja-JP",
  });
  await context.addInitScript(() => {
    localStorage.setItem("yorucare_review_consent", "1");
    localStorage.setItem("yorucare_analytics_consent", "denied");
    localStorage.setItem("yorucare_storage_notice_dismissed", "1");
  });

  const page = await context.newPage();
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`page: ${error.message}`));

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "今日の記録" }).waitFor();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  if (horizontalOverflow) throw new Error("Horizontal overflow detected at 390px.");

  await page.getByRole("radio", { name: /^ふつう/ }).click();
  await page.getByRole("button", { name: "記録を保存する" }).click();
  await page.getByText("記録できました。").first().waitFor();
  await page.getByRole("button", { name: "これまでの記録を見る" }).click();
  await page.getByRole("heading", { name: "これまで" }).waitFor();
  await page.locator("p", { hasText: "気分：ふつう" }).first().waitFor();

  const navigation = page.locator("nav");
  for (const [tab, heading] of [
    ["できること", "できること"],
    ["ふりかえり", "ふりかえり"],
    ["書く", "今日の記録"],
  ]) {
    await navigation.getByRole("button", { name: tab, exact: true }).click();
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
  }

  if (browserErrors.length > 0) throw new Error(browserErrors.join("\n"));
  console.log("Mobile smoke E2E passed.");
} finally {
  await browser?.close();
  await stopServer();
}
