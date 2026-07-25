import { STORAGE_KEYS } from "./constants";

const GRANTED = "granted";
const DENIED = "denied";
const ANALYTICS_ENDPOINT = "/api/events";

export type AnalyticsConsent = "granted" | "denied" | "unset";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getAnalyticsConsent(): AnalyticsConsent {
  if (!isBrowser()) return "unset";

  try {
    const value = localStorage.getItem(STORAGE_KEYS.analyticsConsent);
    if (value === GRANTED || value === DENIED) return value;
    return "unset";
  } catch {
    return "unset";
  }
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === GRANTED;
}

export function saveAnalyticsConsent(enabled: boolean): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(
      STORAGE_KEYS.analyticsConsent,
      enabled ? GRANTED : DENIED
    );
  } catch {
    /* 同意状態を保存できない場合は、unset のままなので送信されない */
  }
}

export async function stopAndDeleteAnonymousAnalytics(): Promise<boolean> {
  if (!isBrowser()) return false;

  saveAnalyticsConsent(false);

  let installId = "";
  try {
    installId = localStorage.getItem(STORAGE_KEYS.installId) ?? "";
  } catch {
    return false;
  }

  if (!installId) return true;

  try {
    const response = await fetch(ANALYTICS_ENDPOINT, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installId }),
      keepalive: true,
    });
    if (!response.ok) return false;

    localStorage.removeItem(STORAGE_KEYS.installId);
    return true;
  } catch {
    return false;
  }
}
