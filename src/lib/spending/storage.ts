import type { SpendingState } from "@/lib/spending/types";

const STORAGE_KEY = "spending-reflect:v1";

export const DEFAULT_GOAL = 800000;

export function createDefaultState(): SpendingState {
  return {
    goal: DEFAULT_GOAL,
    transactions: [],
    merchantMemory: {},
    importedAt: null,
    judgmentHistory: [],
    lastRetrospective: null,
  };
}

export function loadSpendingState(): SpendingState {
  if (typeof window === "undefined") return createDefaultState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as Partial<SpendingState>;
    return { ...createDefaultState(), ...parsed };
  } catch {
    return createDefaultState();
  }
}

export function saveSpendingState(state: SpendingState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage 접근 불가 시 조용히 무시 (프라이빗 모드 등)
  }
}
