import type {
  Category,
  InstallmentInfo,
  ParsedRow,
  Transaction,
  TxType,
} from "@/lib/spending/types";

const REFUND_KEYWORDS = ["취소", "환불", "refund"];
const SALARY_KEYWORDS = ["급여", "월급", "상여금", "보너스"];
const CASHBACK_KEYWORDS = ["캐시백", "포인트적립", "리워드"];
const CARD_BILL_KEYWORDS = ["카드대금", "카드값", "카드결제대금", "카드청구"];
const DEPOSIT_PRODUCT_KEYWORDS = [
  "예금신규",
  "예금해지",
  "적금신규",
  "적금해지",
  "정기예금",
  "정기적금",
];
const TRANSFER_KEYWORDS = ["이체", "송금", "계좌이체"];
const INCOME_KEYWORDS = ["입금"];

type CategoryRule = { category: Category; keywords: string[] };

const CATEGORY_RULES: CategoryRule[] = [
  { category: "food", keywords: ["배달의민족", "요기요", "쿠팡이츠", "배달통"] },
  {
    category: "shopping",
    keywords: [
      "쿠팡",
      "29cm",
      "29CM",
      "무신사",
      "지그재그",
      "에이블리",
      "올리브영",
      "백화점",
      "유니클로",
      "자라",
      "ABC마트",
      "다이소",
      "네이버스토어",
      "스마트스토어",
    ],
  },
  {
    category: "cafe",
    keywords: [
      "스타벅스",
      "이디야",
      "투썸",
      "커피빈",
      "메가커피",
      "컴포즈",
      "빽다방",
      "카페",
      "커피",
      "파리바게뜨",
      "뚜레쥬르",
      "던킨",
    ],
  },
  {
    category: "alcohol",
    keywords: ["와인", "호프", "포차", "이자카야", "생맥주", "펍", "BAR", "술집"],
  },
  {
    category: "food",
    keywords: [
      "김밥",
      "국밥",
      "분식",
      "치킨",
      "피자",
      "버거",
      "맥도날드",
      "버거킹",
      "롯데리아",
      "고기",
      "삼겹살",
      "식당",
      "한식",
      "중식",
      "일식",
      "초밥",
      "마트",
      "이마트",
      "홈플러스",
      "롯데마트",
      "GS25",
      "CU",
      "세븐일레븐",
      "편의점",
    ],
  },
  {
    category: "transport",
    keywords: [
      "택시",
      "카카오T",
      "지하철",
      "버스",
      "교통카드",
      "주유",
      "주유소",
      "KTX",
      "SRT",
      "고속버스",
      "대리운전",
    ],
  },
  {
    category: "culture",
    keywords: [
      "영화",
      "CGV",
      "메가박스",
      "롯데시네마",
      "전시",
      "공연",
      "콘서트",
      "게임",
      "스팀",
      "PS스토어",
    ],
  },
  {
    category: "subscription",
    keywords: [
      "넷플릭스",
      "왓챠",
      "디즈니플러스",
      "유튜브프리미엄",
      "멜론",
      "스포티파이",
      "통신",
      "SKT",
      "KT",
      "LG유플러스",
      "정기구독",
      "구독",
    ],
  },
  {
    category: "travel",
    keywords: [
      "항공",
      "호텔",
      "에어비앤비",
      "여행",
      "스카이스캐너",
      "야놀자",
      "여기어때",
      "제주항공",
      "대한항공",
      "아시아나",
    ],
  },
  {
    category: "health",
    keywords: ["병원", "약국", "의원", "한의원", "피트니스", "헬스장", "필라테스", "요가"],
  },
  { category: "education", keywords: ["학원", "인강", "클래스101", "스터디", "교육"] },
  { category: "gift", keywords: ["선물하기", "기프티콘", "카카오선물"] },
];

const EASY_PAY_MERCHANTS = ["네이버페이", "카카오페이", "토스", "페이코", "삼성페이"];

export const CATEGORY_LABELS: Record<Category, string> = {
  food: "식비",
  cafe: "카페",
  shopping: "쇼핑",
  transport: "교통",
  culture: "문화",
  alcohol: "술",
  travel: "여행",
  living: "생활",
  subscription: "구독",
  health: "건강",
  education: "교육",
  gift: "선물",
  other: "기타",
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  food: "🍚",
  cafe: "☕",
  shopping: "🛍️",
  transport: "🚌",
  culture: "🎬",
  alcohol: "🍷",
  travel: "✈️",
  living: "🏠",
  subscription: "📱",
  health: "💊",
  education: "📚",
  gift: "🎁",
  other: "🧾",
};

function includesKeyword(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

export function classifyType(merchant: string, incomeHint: boolean): TxType {
  if (includesKeyword(merchant, REFUND_KEYWORDS)) return "refund";
  if (includesKeyword(merchant, SALARY_KEYWORDS)) return "salary";
  if (includesKeyword(merchant, CASHBACK_KEYWORDS)) return "cashback";
  if (includesKeyword(merchant, CARD_BILL_KEYWORDS)) return "card_bill";
  if (includesKeyword(merchant, DEPOSIT_PRODUCT_KEYWORDS)) return "deposit_product";
  if (includesKeyword(merchant, TRANSFER_KEYWORDS)) return "transfer";
  if (incomeHint || includesKeyword(merchant, INCOME_KEYWORDS)) return "income";
  return "consumption";
}

export function classifyCategory(merchant: string): Category {
  for (const rule of CATEGORY_RULES) {
    if (includesKeyword(merchant, rule.keywords)) return rule.category;
  }
  return "other";
}

export function isEasyPayMerchant(merchant: string): boolean {
  const trimmed = merchant.trim();
  return EASY_PAY_MERCHANTS.some(
    (name) => trimmed === name || trimmed.startsWith(`${name} `),
  );
}

/** The key used to group a merchant across imports (in merchantMemory) and within a single import (repeat-purchase detection). */
export function normalizeMerchant(merchant: string): string {
  return merchant.trim().toLowerCase();
}

export function buildInstallment(
  totalAmount: number,
  totalMonths: number | null,
): InstallmentInfo | null {
  if (!totalMonths || totalMonths <= 1) return null;
  const monthlyAmount = Math.round(totalAmount / totalMonths);
  return { totalMonths, totalAmount, monthlyAmount };
}

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `tx_${Date.now().toString(36)}_${idCounter}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function rowToTransaction(row: ParsedRow, fallbackDate: string): Transaction {
  const merchant = row.merchant.trim();
  const type = classifyType(merchant, row.incomeHint);
  const amount = row.amount ?? 0;
  const category = type === "consumption" ? classifyCategory(merchant) : null;
  const installment =
    type === "consumption" ? buildInstallment(amount, row.installmentMonths) : null;

  return {
    id: generateId(),
    date: row.date ?? fallbackDate,
    merchant,
    rawAmount: amount,
    type,
    category,
    installment,
    split: null,
    who: null,
    isReviewCandidate: false,
    candidateReasons: [],
    needsContext: false,
    judgment: null,
    judgedAt: null,
  };
}

export function effectiveAmount(tx: Transaction): number {
  if (tx.split?.isSplit) return tx.split.myShare;
  if (tx.installment) return tx.installment.monthlyAmount;
  return tx.rawAmount;
}
