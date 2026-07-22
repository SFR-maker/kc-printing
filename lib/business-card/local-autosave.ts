import type { CardDesign } from "./schema";

const STORAGE_PREFIX = "kc-card-design:";
const TOKEN_KEY = "kc-card-anon-token";

export function getAnonymousToken(): string {
  if (typeof window === "undefined") return "";
  let token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function saveDesignLocally(key: string, design: CardDesign): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(design));
  } catch {
    // localStorage full or unavailable — autosave is best-effort only.
  }
}

export function loadDesignLocally(key: string): CardDesign | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CardDesign;
  } catch {
    return null;
  }
}

export function clearDesignLocally(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
}
