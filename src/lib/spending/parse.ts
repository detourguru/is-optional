import type { ParsedRow, ParseResult } from "@/lib/spending/types";

const HEADER_HINTS = [
  "날짜",
  "거래일",
  "이용일자",
  "적요",
  "가맹점",
  "금액",
  "이용금액",
  "출금액",
  "입금액",
  "할부",
];

const DATE_KEYS = ["날짜", "거래일", "이용일자", "거래일시", "승인일자"];
const MERCHANT_KEYS = ["가맹점", "적요", "내용", "거래내용", "가맹점명", "사용처"];
const AMOUNT_KEYS = ["금액", "이용금액", "거래금액", "승인금액"];
const OUT_KEYS = ["출금액", "출금"];
const IN_KEYS = ["입금액", "입금"];
const INSTALLMENT_KEYS = ["할부", "할부개월", "할부기간"];

function normalizeYear(month: number, day: number, ref = new Date()): number {
  let year = ref.getFullYear();
  const candidate = new Date(year, month - 1, day);
  const tenDaysMs = 1000 * 60 * 60 * 24 * 10;
  if (candidate.getTime() - ref.getTime() > tenDaysMs) year -= 1;
  return year;
}

function toIsoDate(month: number, day: number, year?: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const resolvedYear = year ?? normalizeYear(month, day);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${resolvedYear}-${mm}-${dd}`;
}

function parseDateToken(token: string): string | null {
  const ymd = token.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (ymd) {
    return toIsoDate(Number(ymd[2]), Number(ymd[3]), Number(ymd[1]));
  }
  const md = token.match(/^(\d{1,2})[./\-](\d{1,2})$/);
  if (md) {
    return toIsoDate(Number(md[1]), Number(md[2]));
  }
  return null;
}

function extractInstallmentMonths(text: string): number | null {
  const patterns = [/할부\s*(\d{1,2})\s*개월/, /(\d{1,2})\s*개월\s*할부/, /\((\d{1,2})\s*\/\s*(\d{1,2})\)/];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const months = pattern === patterns[2] ? Number(match[2]) : Number(match[1]);
      if (months > 1 && months <= 36) return months;
    }
  }
  return null;
}

function parseAmountToken(token: string): number | null {
  const cleaned = token.replace(/[,원\s]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function looksLikeCsv(firstLine: string): boolean {
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  if (commaCount < 2) return false;
  return HEADER_HINTS.some((hint) => firstLine.includes(hint));
}

function splitCsvLine(line: string): string[] {
  return line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

function findColumnIndex(headers: string[], keys: string[]): number {
  return headers.findIndex((header) =>
    keys.some((key) => header.includes(key)),
  );
}

function parseCsv(lines: string[]): ParseResult {
  const warnings: string[] = [];
  const headers = splitCsvLine(lines[0]);

  const dateIdx = findColumnIndex(headers, DATE_KEYS);
  const merchantIdx = findColumnIndex(headers, MERCHANT_KEYS);
  const amountIdx = findColumnIndex(headers, AMOUNT_KEYS);
  const outIdx = findColumnIndex(headers, OUT_KEYS);
  const inIdx = findColumnIndex(headers, IN_KEYS);
  const installmentIdx = findColumnIndex(headers, INSTALLMENT_KEYS);

  const rows: ParsedRow[] = [];

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = splitCsvLine(line);

    const dateToken = dateIdx >= 0 ? cells[dateIdx] : undefined;
    const merchant = merchantIdx >= 0 ? cells[merchantIdx] : "";
    const outValue = outIdx >= 0 ? parseAmountToken(cells[outIdx] ?? "") : null;
    const inValue = inIdx >= 0 ? parseAmountToken(cells[inIdx] ?? "") : null;
    const genericAmount =
      amountIdx >= 0 ? parseAmountToken(cells[amountIdx] ?? "") : null;
    const installmentRaw = installmentIdx >= 0 ? cells[installmentIdx] : "";

    let amount: number | null = null;
    let incomeHint = false;

    if (outValue && outValue > 0) {
      amount = outValue;
    } else if (inValue && inValue > 0) {
      amount = inValue;
      incomeHint = true;
    } else if (genericAmount !== null) {
      // A single generic amount column (e.g. "이용금액") gives no reliable
      // sign convention for income vs. spending across bank/card exports -
      // leave incomeHint false and let classifyType() read the merchant
      // text (입금/급여/환불 keywords) instead of guessing from the number.
      amount = Math.abs(genericAmount);
    }

    if (!merchant || amount === null || amount === 0) {
      warnings.push(`파싱하지 못한 줄: ${line}`);
      continue;
    }

    const date = dateToken ? parseDateToken(dateToken.trim()) : null;
    const installmentMonths =
      extractInstallmentMonths(installmentRaw) ??
      extractInstallmentMonths(merchant);

    rows.push({
      date,
      merchant: merchant.trim(),
      amount,
      installmentMonths,
      sourceLine: line,
      incomeHint,
    });
  }

  return { rows, warnings };
}

function parseFreeText(lines: string[]): ParseResult {
  const warnings: string[] = [];
  const rows: ParsedRow[] = [];

  const lineRegex =
    /^\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}|\d{1,2}[./\-]\d{1,2})\s+(.+?)\s+([\d,]+)\s*원?\s*(.*)$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(lineRegex);
    if (!match) {
      warnings.push(`파싱하지 못한 줄: ${line}`);
      continue;
    }

    const [, dateToken, merchantPart, amountToken, tail] = match;
    const date = parseDateToken(dateToken);
    const amount = parseAmountToken(amountToken);

    if (amount === null) {
      warnings.push(`금액을 읽지 못한 줄: ${line}`);
      continue;
    }

    const installmentMonths =
      extractInstallmentMonths(tail) ?? extractInstallmentMonths(merchantPart);

    rows.push({
      date,
      merchant: merchantPart.trim(),
      amount,
      installmentMonths,
      sourceLine: line,
      incomeHint: false,
    });
  }

  return { rows, warnings };
}

/**
 * Korean bank/card CSV exports are commonly saved as EUC-KR rather than
 * UTF-8. Decode as UTF-8 first; if that produces replacement characters
 * (a sign the bytes weren't valid UTF-8), re-decode as EUC-KR instead.
 */
export async function decodeUploadedFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8Text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if (!utf8Text.includes("�")) return utf8Text;

  try {
    return new TextDecoder("euc-kr").decode(buffer);
  } catch {
    return utf8Text;
  }
}

export function parseTransactionInput(raw: string): ParseResult {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { rows: [], warnings: [] };

  if (looksLikeCsv(lines[0])) {
    return parseCsv(lines);
  }

  return parseFreeText(lines);
}
