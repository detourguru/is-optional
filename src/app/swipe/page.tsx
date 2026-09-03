"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { useSpending } from "@/components/spending/spending-provider";
import { SwipeCard } from "@/components/spending/swipe-card";
import { Button } from "@/components/ui/button";

export default function SwipePage() {
  const router = useRouter();
  const {
    hydrated,
    transactions,
    candidateQueue,
    summary,
    judge,
    undoLastJudgment,
    canUndo,
    updateWho,
    updateSplit,
  } = useSpending();

  React.useEffect(() => {
    if (hydrated && transactions.length === 0) {
      router.replace("/import");
    }
  }, [hydrated, transactions.length, router]);

  if (!hydrated || transactions.length === 0) return null;

  if (summary.candidateCount === 0) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-4xl">🧾</span>
        <p className="text-muted-foreground text-sm">돌아볼 만한 소비가 없어요.</p>
        <Button asChild>
          <Link href="/">홈으로</Link>
        </Button>
      </main>
    );
  }

  if (candidateQueue.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-4xl">🎉</span>
        <p className="text-lg font-medium">
          {summary.candidateCount}개의 소비를 모두 돌아봤어요!
        </p>
        <Button asChild size="lg">
          <Link href="/retrospective">회고 보러가기 →</Link>
        </Button>
      </main>
    );
  }

  const active = candidateQueue[0];
  const peeking = candidateQueue.slice(1, 3);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-8 pb-10">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-muted-foreground text-sm">
          ← 홈
        </Link>
        <span className="text-muted-foreground text-sm">
          {summary.judgedCount + 1} / {summary.candidateCount}
        </span>
        <button
          type="button"
          disabled={!canUndo}
          onClick={undoLastJudgment}
          className="text-muted-foreground text-sm underline underline-offset-4 disabled:opacity-30"
        >
          ↩ 되돌리기
        </button>
      </header>

      <div className="relative flex-1" style={{ minHeight: 420 }}>
        {peeking
          .slice()
          .reverse()
          .map((tx, idx) => (
            <SwipeCard
              key={tx.id}
              transaction={tx}
              interactive={false}
              offset={peeking.length - idx}
              onJudge={() => {}}
              onUpdateWho={() => {}}
              onUpdateSplit={() => {}}
            />
          ))}
        <SwipeCard
          key={active.id}
          transaction={active}
          interactive
          offset={0}
          onJudge={(judgment) => judge(active.id, judgment)}
          onUpdateWho={(who) => updateWho(active.id, who)}
          onUpdateSplit={(split) => updateSplit(active.id, split)}
        />
      </div>
    </main>
  );
}
