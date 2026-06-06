import { STORAGE_KEYS } from "./constants";

const CONSENT_VALUE = "1";

declare global {
  interface Window {
    resetYorucareReviewConsent?: () => void;
  }
}

export function hasReviewConsent(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(STORAGE_KEYS.reviewConsent) === CONSENT_VALUE;
  } catch {
    return false;
  }
}

export function saveReviewConsent(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEYS.reviewConsent, CONSENT_VALUE);
  } catch {
    /* ignore */
  }
}

export function resetReviewConsent(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEYS.reviewConsent);
  } catch {
    /* ignore */
  }
}

export function installReviewConsentResetHelper(): void {
  if (typeof window === "undefined") return;

  window.resetYorucareReviewConsent = resetReviewConsent;
}
