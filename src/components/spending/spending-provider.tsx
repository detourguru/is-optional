"use client";

import * as React from "react";

import { selectReviewCandidates } from "@/lib/spending/candidates";
import { normalizeMerchant, rowToTransaction } from "@/lib/spending/classify";
import { buildMonthlySummary, toRetrospectiveRecord } from "@/lib/spending/insights";
import type { MonthlySummary } from "@/lib/spending/insights";
import { parseTransactionInput } from "@/lib/spending/parse";
import {
  createDefaultState,
  loadSpendingState,
  saveSpendingState,
} from "@/lib/spending/storage";
import type {
  Judgment,
  MerchantMemoryEntry,
  RetrospectiveRecord,
  SpendingState,
  SplitInfo,
  Transaction,
  WhoTag,
} from "@/lib/spending/types";

interface ImportResult {
  candidateCount: number;
  transactionCount: number;
  warnings: string[];
}

interface SpendingContextValue {
  hydrated: boolean;
  goal: number;
  transactions: Transaction[];
  importedAt: string | null;
  lastRetrospective: RetrospectiveRecord | null;
  summary: MonthlySummary;
  candidateQueue: Transaction[];
  canUndo: boolean;
  importTransactions: (raw: string) => ImportResult;
  setGoal: (amount: number) => void;
  judge: (id: string, judgment: Judgment) => void;
  undoLastJudgment: () => void;
  updateSplit: (id: string, split: SplitInfo | null) => void;
  updateWho: (id: string, who: WhoTag | null) => void;
}

const SpendingContext = React.createContext<SpendingContextValue | null>(null);

export function SpendingProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = React.useState(false);
  const [state, setState] = React.useState<SpendingState>(createDefaultState);

  React.useEffect(() => {
    // localStorage only exists client-side, so the real state can only be
    // read after mount; the server/first-paint render always uses defaults.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadSpendingState());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    saveSpendingState(state);
  }, [hydrated, state]);

  const summary = React.useMemo(
    () => buildMonthlySummary(state.transactions, state.goal),
    [state.transactions, state.goal],
  );

  const candidateQueue = React.useMemo(() => {
    return state.transactions
      .filter((tx) => tx.isReviewCandidate && tx.judgment === null)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [state.transactions]);

  const importTransactions = React.useCallback(
    (raw: string): ImportResult => {
      const { rows, warnings } = parseTransactionInput(raw);
      const fallbackDate = new Date().toISOString().slice(0, 10);
      const transactions = rows.map((row) => rowToTransaction(row, fallbackDate));
      const classified = selectReviewCandidates(transactions, state.merchantMemory);

      setState((prev) => ({
        ...prev,
        transactions: classified,
        importedAt: new Date().toISOString(),
        judgmentHistory: [],
      }));

      return {
        candidateCount: classified.filter((tx) => tx.isReviewCandidate).length,
        transactionCount: classified.length,
        warnings,
      };
    },
    [state.merchantMemory],
  );

  const setGoal = React.useCallback((amount: number) => {
    setState((prev) => ({ ...prev, goal: Math.max(0, Math.round(amount)) }));
  }, []);

  const judge = React.useCallback(
    (id: string, judgment: Judgment) => {
      setState((prev) => {
        const target = prev.transactions.find((tx) => tx.id === id);
        if (!target) return prev;

        const merchantKey = normalizeMerchant(target.merchant);
        const prevEntry: MerchantMemoryEntry = prev.merchantMemory[merchantKey] ?? {
          unnecessaryCount: 0,
          necessaryCount: 0,
        };
        const nextEntry: MerchantMemoryEntry = {
          unnecessaryCount:
            prevEntry.unnecessaryCount + (judgment === "unnecessary" ? 1 : 0),
          necessaryCount: prevEntry.necessaryCount + (judgment === "necessary" ? 1 : 0),
        };

        const nextTransactions = prev.transactions.map((tx) =>
          tx.id === id ? { ...tx, judgment, judgedAt: Date.now() } : tx,
        );
        // Recompute here (rather than in a useEffect watching `summary`) so
        // finishing the last card and saving the retrospective snapshot
        // happen in one state update instead of two renders.
        const nextSummary = buildMonthlySummary(nextTransactions, prev.goal);

        return {
          ...prev,
          transactions: nextTransactions,
          merchantMemory: { ...prev.merchantMemory, [merchantKey]: nextEntry },
          judgmentHistory: [...prev.judgmentHistory, id],
          lastRetrospective: nextSummary.swipeComplete
            ? toRetrospectiveRecord(nextSummary)
            : prev.lastRetrospective,
        };
      });
    },
    [],
  );

  const undoLastJudgment = React.useCallback(() => {
    setState((prev) => {
      if (prev.judgmentHistory.length === 0) return prev;
      const lastId = prev.judgmentHistory[prev.judgmentHistory.length - 1];
      const target = prev.transactions.find((tx) => tx.id === lastId);
      if (!target || !target.judgment) {
        return { ...prev, judgmentHistory: prev.judgmentHistory.slice(0, -1) };
      }

      const merchantKey = normalizeMerchant(target.merchant);
      const prevEntry = prev.merchantMemory[merchantKey];
      const nextMemory = { ...prev.merchantMemory };
      if (prevEntry) {
        nextMemory[merchantKey] = {
          unnecessaryCount: Math.max(
            0,
            prevEntry.unnecessaryCount - (target.judgment === "unnecessary" ? 1 : 0),
          ),
          necessaryCount: Math.max(
            0,
            prevEntry.necessaryCount - (target.judgment === "necessary" ? 1 : 0),
          ),
        };
      }

      return {
        ...prev,
        transactions: prev.transactions.map((tx) =>
          tx.id === lastId ? { ...tx, judgment: null, judgedAt: null } : tx,
        ),
        merchantMemory: nextMemory,
        judgmentHistory: prev.judgmentHistory.slice(0, -1),
      };
    });
  }, []);

  const updateSplit = React.useCallback((id: string, split: SplitInfo | null) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((tx) =>
        tx.id === id ? { ...tx, split } : tx,
      ),
    }));
  }, []);

  const updateWho = React.useCallback((id: string, who: WhoTag | null) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((tx) => (tx.id === id ? { ...tx, who } : tx)),
    }));
  }, []);

  const value: SpendingContextValue = {
    hydrated,
    goal: state.goal,
    transactions: state.transactions,
    importedAt: state.importedAt,
    lastRetrospective: state.lastRetrospective,
    summary,
    candidateQueue,
    canUndo: state.judgmentHistory.length > 0,
    importTransactions,
    setGoal,
    judge,
    undoLastJudgment,
    updateSplit,
    updateWho,
  };

  return (
    <SpendingContext.Provider value={value}>{children}</SpendingContext.Provider>
  );
}

export function useSpending(): SpendingContextValue {
  const ctx = React.useContext(SpendingContext);
  if (!ctx) throw new Error("useSpending must be used within SpendingProvider");
  return ctx;
}
