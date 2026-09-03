import { CATEGORY_EMOJI, CATEGORY_LABELS, effectiveAmount } from "@/lib/spending/classify";
import { formatWon } from "@/lib/spending/format";
import type {
  Category,
  RetrospectiveRecord,
  Transaction,
  WhoTag,
} from "@/lib/spending/types";

export interface CategoryAmount {
  category: Category;
  amount: number;
  emoji: string;
  label: string;
}

/** A category called out by name/emoji only - no meaningful amount attached. */
export interface CategoryFact {
  category: Category;
  emoji: string;
  label: string;
}

export interface MonthlySummary {
  totalSpend: number;
  necessaryTotal: number;
  unnecessaryTotal: number;
  goal: number;
  diffFromGoal: number;
  judgedCount: number;
  candidateCount: number;
  swipeComplete: boolean;
  topUnnecessaryCategories: CategoryAmount[];
  mostFrequentCategory: CategoryFact | null;
  mostUnnecessaryCategory: CategoryFact | null;
  suggestionText: string;
  discoveryText: string;
  whoNecessaryCounts: Partial<Record<WhoTag, number>>;
}

const WHO_LABELS: Record<WhoTag, string> = {
  alone: "혼자",
  family: "가족",
  friend: "친구",
  partner: "연인",
  work: "직장",
  other: "기타",
};

function groupSum(
  transactions: Transaction[],
  filter: (tx: Transaction) => boolean,
): Map<Category, number> {
  const map = new Map<Category, number>();
  for (const tx of transactions) {
    if (!tx.category || !filter(tx)) continue;
    map.set(tx.category, (map.get(tx.category) ?? 0) + effectiveAmount(tx));
  }
  return map;
}

/** How many transactions fall into each category. */
function countByCategory(transactions: Transaction[]): Map<Category, number> {
  const map = new Map<Category, number>();
  for (const tx of transactions) {
    if (!tx.category) continue;
    map.set(tx.category, (map.get(tx.category) ?? 0) + 1);
  }
  return map;
}

/** The single highest-count entry in a category count map, if any. */
function topEntry(map: Map<Category, number>): Category | null {
  let best: [Category, number] | null = null;
  for (const entry of map) {
    if (!best || entry[1] > best[1]) best = entry;
  }
  return best?.[0] ?? null;
}

function toCategoryFact(category: Category | null): CategoryFact | null {
  if (!category) return null;
  return { category, emoji: CATEGORY_EMOJI[category], label: CATEGORY_LABELS[category] };
}

function toCategoryAmounts(map: Map<Category, number>, limit: number): CategoryAmount[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category, amount]) => ({
      category,
      amount,
      emoji: CATEGORY_EMOJI[category],
      label: CATEGORY_LABELS[category],
    }));
}

function roundToNiceNumber(value: number): number {
  if (value <= 0) return 0;
  const step = value >= 100000 ? 10000 : 1000;
  return Math.ceil(value / step) * step;
}

export function buildMonthlySummary(
  transactions: Transaction[],
  goal: number,
): MonthlySummary {
  const consumption = transactions.filter((tx) => tx.type === "consumption");
  const totalSpend = consumption.reduce((sum, tx) => sum + effectiveAmount(tx), 0);
  const unnecessary = consumption.filter((tx) => tx.judgment === "unnecessary");
  const unnecessaryTotal = unnecessary.reduce((sum, tx) => sum + effectiveAmount(tx), 0);
  const necessaryTotal = totalSpend - unnecessaryTotal;

  const candidates = consumption.filter((tx) => tx.isReviewCandidate);
  const judgedCount = candidates.filter((tx) => tx.judgment !== null).length;
  const swipeComplete = candidates.length > 0 && judgedCount === candidates.length;

  const unnecessaryByCategory = groupSum(consumption, (tx) => tx.judgment === "unnecessary");
  const topUnnecessaryCategories = toCategoryAmounts(unnecessaryByCategory, 3);

  const mostFrequentCategory = toCategoryFact(
    topEntry(countByCategory(consumption)),
  );
  const mostUnnecessaryCategory = toCategoryFact(
    topEntry(countByCategory(unnecessary)),
  );

  const diffFromGoal = totalSpend - goal;

  let suggestionText = "";
  if (goal > 0) {
    if (diffFromGoal <= 0) {
      suggestionText = "이번 달은 목표 안에서 잘 쓰셨어요.";
    } else if (unnecessaryTotal > 0) {
      const suggestedCut = roundToNiceNumber(Math.min(diffFromGoal, unnecessaryTotal));
      suggestionText = `다음 달엔 여기서 ${formatWon(suggestedCut)}만 줄여도 목표에 들어와요.`;
    } else {
      suggestionText = `목표보다 ${formatWon(diffFromGoal)} 더 썼어요.`;
    }
  }

  let discoveryText = "";
  if (topUnnecessaryCategories.length > 0) {
    const names = topUnnecessaryCategories
      .map((item) => `${item.emoji} ${item.label}`)
      .join(", ");
    discoveryText = `안 해도 됐다고 생각한 소비 중 ${names}이(가) 큰 비중을 차지했어요.`;
  } else if (swipeComplete) {
    discoveryText = "이번 달엔 대부분 필요했다고 생각하셨네요.";
  }

  const whoNecessaryCounts: Partial<Record<WhoTag, number>> = {};
  for (const tx of consumption) {
    if (tx.judgment !== "necessary" || !tx.who) continue;
    whoNecessaryCounts[tx.who] = (whoNecessaryCounts[tx.who] ?? 0) + 1;
  }

  return {
    totalSpend,
    necessaryTotal,
    unnecessaryTotal,
    goal,
    diffFromGoal,
    judgedCount,
    candidateCount: candidates.length,
    swipeComplete,
    topUnnecessaryCategories,
    mostFrequentCategory,
    mostUnnecessaryCategory,
    suggestionText,
    discoveryText,
    whoNecessaryCounts,
  };
}

export function homeOneLiner(record: RetrospectiveRecord | null): string {
  if (!record) return "이번 달 소비를 스와이프하며 가볍게 돌아봐요.";

  const whoEntries = Object.entries(record.whoNecessaryCounts) as [WhoTag, number][];
  const topWho = whoEntries.sort((a, b) => b[1] - a[1])[0];
  if (topWho && (topWho[0] === "family" || topWho[0] === "friend")) {
    return `${WHO_LABELS[topWho[0]]}에게 쓴 돈이 꽤 많았어요.`;
  }

  if (record.topUnnecessaryCategories.length > 0) {
    const top = record.topUnnecessaryCategories[0];
    return `${CATEGORY_EMOJI[top.category]} ${CATEGORY_LABELS[top.category]} 소비를 가장 많이 돌아봤어요.`;
  }

  return "지난달 회고를 확인해보세요.";
}

export function toRetrospectiveRecord(summary: MonthlySummary): RetrospectiveRecord {
  return {
    completedAt: Date.now(),
    totalSpend: summary.totalSpend,
    necessaryTotal: summary.necessaryTotal,
    unnecessaryTotal: summary.unnecessaryTotal,
    goal: summary.goal,
    topUnnecessaryCategories: summary.topUnnecessaryCategories.map((item) => ({
      category: item.category,
      amount: item.amount,
    })),
    whoNecessaryCounts: summary.whoNecessaryCounts,
  };
}
