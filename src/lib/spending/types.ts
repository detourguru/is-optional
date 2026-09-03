export type TxType =
  | "consumption"
  | "income"
  | "refund"
  | "transfer"
  | "salary"
  | "deposit_product"
  | "card_bill"
  | "cashback";

export type Category =
  | "food"
  | "cafe"
  | "shopping"
  | "transport"
  | "culture"
  | "alcohol"
  | "travel"
  | "living"
  | "subscription"
  | "health"
  | "education"
  | "gift"
  | "other";

export type WhoTag = "alone" | "family" | "friend" | "partner" | "work" | "other";

export type Judgment = "necessary" | "unnecessary";

export interface InstallmentInfo {
  totalMonths: number;
  totalAmount: number;
  monthlyAmount: number;
}

export interface SplitInfo {
  isSplit: boolean;
  withWhom: string;
  totalAmount: number;
  myShare: number;
}

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  rawAmount: number;
  type: TxType;
  category: Category | null;
  installment: InstallmentInfo | null;
  split: SplitInfo | null;
  who: WhoTag | null;
  isReviewCandidate: boolean;
  candidateReasons: string[];
  needsContext: boolean;
  judgment: Judgment | null;
  judgedAt: number | null;
}

export interface ParsedRow {
  date: string | null;
  merchant: string;
  amount: number | null;
  installmentMonths: number | null;
  sourceLine: string;
  incomeHint: boolean;
}

export interface ParseResult {
  rows: ParsedRow[];
  warnings: string[];
}

export interface MerchantMemoryEntry {
  unnecessaryCount: number;
  necessaryCount: number;
}

export interface RetrospectiveRecord {
  completedAt: number;
  totalSpend: number;
  necessaryTotal: number;
  unnecessaryTotal: number;
  goal: number;
  topUnnecessaryCategories: { category: Category; amount: number }[];
  whoNecessaryCounts: Partial<Record<WhoTag, number>>;
}

export interface SpendingState {
  goal: number;
  transactions: Transaction[];
  merchantMemory: Record<string, MerchantMemoryEntry>;
  importedAt: string | null;
  judgmentHistory: string[];
  lastRetrospective: RetrospectiveRecord | null;
}
