import { effectiveAmount, isEasyPayMerchant, normalizeMerchant } from "@/lib/spending/classify";
import type { MerchantMemoryEntry, Transaction } from "@/lib/spending/types";

const REVIEW_WORTHY_CATEGORIES = new Set([
  "shopping",
  "alcohol",
  "culture",
  "travel",
  "gift",
  "food",
  "cafe",
]);

const CONTEXT_CATEGORIES = new Set(["food", "travel", "culture", "gift"]);
const LARGE_AMOUNT_MULTIPLIER = 2.5;
const LARGE_AMOUNT_FLOOR = 30000;
const CONTEXT_AMOUNT_FLOOR = 60000;
const MAX_CANDIDATES = 20;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function selectReviewCandidates(
  transactions: Transaction[],
  merchantMemory: Record<string, MerchantMemoryEntry>,
): Transaction[] {
  const consumption = transactions.filter((tx) => tx.type === "consumption");
  const amounts = consumption.map((tx) => effectiveAmount(tx));
  const typicalAmount = median(amounts);

  const merchantCounts = new Map<string, number>();
  for (const tx of consumption) {
    const key = normalizeMerchant(tx.merchant);
    merchantCounts.set(key, (merchantCounts.get(key) ?? 0) + 1);
  }

  const scores = new Map<string, number>();

  const scored: Transaction[] = transactions.map((tx) => {
    if (tx.type !== "consumption") {
      return { ...tx, isReviewCandidate: false, candidateReasons: [], needsContext: false };
    }

    const reasons: string[] = [];
    let score = 0;
    const amount = effectiveAmount(tx);
    const merchantKey = normalizeMerchant(tx.merchant);
    const isLarge =
      amount >= LARGE_AMOUNT_FLOOR && amount >= typicalAmount * LARGE_AMOUNT_MULTIPLIER;
    const repeats = merchantCounts.get(merchantKey) ?? 0;
    const easyPay = isEasyPayMerchant(tx.merchant);
    const memory = merchantMemory[merchantKey];

    if (tx.category && REVIEW_WORTHY_CATEGORIES.has(tx.category)) {
      reasons.push("쇼핑·외식성 소비예요");
      score += 1;
    }
    if (isLarge) {
      reasons.push("평소보다 큰 소비예요");
      score += 2;
    }
    if (repeats >= 3) {
      reasons.push("이번 달에 반복된 소비예요");
      score += 1;
    }
    if (easyPay) {
      reasons.push("결제 내역이 뭔지 잘 안 보여요");
      score += 1;
    }
    if (memory && memory.unnecessaryCount > 0) {
      reasons.push("전에도 안 해도 됐다고 골랐던 곳이에요");
      score += 2;
    }

    const needsContext =
      isLarge &&
      tx.category !== null &&
      CONTEXT_CATEGORIES.has(tx.category) &&
      amount >= CONTEXT_AMOUNT_FLOOR;

    scores.set(tx.id, score);

    return {
      ...tx,
      isReviewCandidate: score > 0,
      candidateReasons: reasons,
      needsContext,
    };
  });

  const candidates = scored
    .filter((tx) => tx.isReviewCandidate)
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
  const keepIds = new Set(candidates.slice(0, MAX_CANDIDATES).map((tx) => tx.id));

  return scored.map((tx) => ({
    ...tx,
    isReviewCandidate: tx.isReviewCandidate && keepIds.has(tx.id),
  }));
}
