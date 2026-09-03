"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { BigNumber } from "@/components/spending/big-number";
import { useSpending } from "@/components/spending/spending-provider";
import { Button } from "@/components/ui/button";
import { formatWon } from "@/lib/spending/format";

export default function RetrospectivePage() {
  const router = useRouter();
  const { hydrated, transactions, summary } = useSpending();

  React.useEffect(() => {
    if (hydrated && transactions.length === 0) {
      router.replace("/import");
    }
  }, [hydrated, transactions.length, router]);

  if (!hydrated || transactions.length === 0) return null;

  if (!summary.swipeComplete) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-4xl">🙂</span>
        <p className="text-muted-foreground text-sm">
          아직 다 돌아보지 않았어요. {summary.judgedCount}/{summary.candidateCount}개
          완료했어요.
        </p>
        <Button asChild size="lg">
          <Link href="/swipe">이어서 돌아보기 →</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-10 pb-16">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-muted-foreground text-sm">
          ← 홈
        </Link>
      </header>

      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="text-4xl">🎉</span>
        <p className="text-lg font-medium">이번 달 소비 회고 완료!</p>
        <p className="text-muted-foreground text-sm">
          {summary.candidateCount}개의 소비를 돌아봤어요.
        </p>
      </div>

      <section className="mb-8">
        <BigNumber label="이번 달 소비" value={formatWon(summary.totalSpend)} size="lg" />
        {summary.goal > 0 && (
          <p className="text-muted-foreground mt-2 text-sm">
            목표 {formatWon(summary.goal)} · {summary.suggestionText}
          </p>
        )}
      </section>

      <section className="mb-8 grid grid-cols-2 gap-3">
        <div className="bg-card border-border rounded-xl border p-4">
          <BigNumber
            label="필요했어요"
            value={formatWon(summary.necessaryTotal)}
            tone="sage"
            size="md"
          />
        </div>
        <div className="bg-card border-border rounded-xl border p-4">
          <BigNumber
            label="안 해도 됐어요"
            value={formatWon(summary.unnecessaryTotal)}
            tone="marigold"
            size="md"
          />
        </div>
      </section>

      {summary.topUnnecessaryCategories.length > 0 && (
        <section className="bg-secondary mb-8 rounded-xl p-5">
          <p className="mb-3 text-sm font-medium">이번 달의 발견</p>
          <p className="text-muted-foreground mb-4 text-sm">{summary.discoveryText}</p>
          <ul className="flex flex-col gap-2">
            {summary.topUnnecessaryCategories.map((item) => (
              <li
                key={item.category}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {item.emoji} {item.label}
                </span>
                <span className="font-medium">{formatWon(item.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-10 flex flex-col gap-2 text-sm">
        {summary.mostFrequentCategory && (
          <p className="text-muted-foreground">
            가장 많이 나온 소비 · {summary.mostFrequentCategory.emoji}{" "}
            {summary.mostFrequentCategory.label}
          </p>
        )}
        {summary.mostUnnecessaryCategory && (
          <p className="text-muted-foreground">
            가장 많이 &ldquo;안 해도 됐어&rdquo;를 받은 소비 ·{" "}
            {summary.mostUnnecessaryCategory.emoji} {summary.mostUnnecessaryCategory.label}
          </p>
        )}
      </section>

      <Button asChild size="lg" className="mt-auto">
        <Link href="/">홈으로</Link>
      </Button>
    </main>
  );
}
