"use client";

import Link from "next/link";
import * as React from "react";

import { BigNumber } from "@/components/spending/big-number";
import { useSpending } from "@/components/spending/spending-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { formatSignedWon, formatWon } from "@/lib/spending/format";
import { homeOneLiner } from "@/lib/spending/insights";

export default function HomePage() {
  const { hydrated, transactions, summary, importedAt, lastRetrospective, goal, setGoal } =
    useSpending();

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6">
        <span className="text-muted-foreground text-sm">불러오는 중...</span>
      </main>
    );
  }

  const hasData = transactions.length > 0;
  const progressValue = goal > 0 ? Math.min(100, (summary.totalSpend / goal) * 100) : 0;
  const overGoal = goal > 0 && summary.diffFromGoal > 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-10 pb-16">
      <header className="mb-10 flex items-center justify-between">
        <span className="text-lg font-semibold">소비 습관 들여보기</span>
        <GoalEditor goal={goal} onSave={setGoal} />
      </header>

      {!hasData ? (
        <EmptyState />
      ) : (
        <div className="flex flex-1 flex-col gap-8">
          <section className="flex flex-col gap-4">
            <BigNumber label="이번 달" value={formatWon(summary.totalSpend)} size="lg" />
            {goal > 0 && (
              <div className="flex flex-col gap-2">
                <Progress
                  value={progressValue}
                  className={overGoal ? "bg-marigold/20" : "bg-sage/20"}
                  indicatorClassName={overGoal ? "bg-marigold" : "bg-sage"}
                />
                <div className="text-muted-foreground flex items-center justify-between text-sm">
                  <span>목표 {formatWon(goal)}</span>
                  <span className={overGoal ? "text-marigold" : "text-sage"}>
                    {formatSignedWon(summary.diffFromGoal)}
                  </span>
                </div>
              </div>
            )}
          </section>

          <section className="bg-card border-border rounded-xl border p-5">
            {summary.candidateCount === 0 ? (
              <p className="text-muted-foreground text-sm">
                돌아볼 만한 소비가 없어요. 이번 달은 깔끔했네요.
              </p>
            ) : summary.swipeComplete ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm">
                  {summary.candidateCount}개의 소비를 모두 돌아봤어요.
                </p>
                <Button asChild size="lg">
                  <Link href="/retrospective">이번 달 회고 보기 →</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm">
                  돌아볼 소비 {summary.candidateCount - summary.judgedCount}개
                </p>
                <Button asChild size="lg">
                  <Link href="/swipe">소비 돌아보기 →</Link>
                </Button>
              </div>
            )}
          </section>

          <p className="text-muted-foreground text-sm">
            {homeOneLiner(lastRetrospective)}
          </p>

          <div className="mt-auto flex flex-col gap-2 pt-6">
            <span className="text-muted-foreground text-xs">
              {importedAt ? `마지막으로 가져온 날: ${importedAt.slice(0, 10)}` : ""}
            </span>
            <Button asChild variant="ghost" size="sm" className="w-fit px-0">
              <Link href="/import">내역 다시 가져오기</Link>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <span className="text-5xl">🧾</span>
      <div className="flex flex-col gap-2">
        <p className="text-lg font-medium">아직 가져온 소비가 없어요</p>
        <p className="text-muted-foreground text-sm">
          이번 달 카드·계좌 내역을 가져오면
          <br />
          돌아볼 소비를 골라드릴게요.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/import">이번 달 내역 가져오기 →</Link>
      </Button>
    </div>
  );
}

function GoalEditor({
  goal,
  onSave,
}: {
  goal: number;
  onSave: (amount: number) => void;
}) {
  const [value, setValue] = React.useState(String(goal));
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setValue(String(goal));
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground text-xs underline underline-offset-4"
        >
          목표 설정
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>이번 달 목표 금액</DialogTitle>
        </DialogHeader>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="border-border bg-background rounded-xl border px-3 py-2 text-lg"
        />
        <DialogFooter>
          <Button
            onClick={() => {
              onSave(Number(value) || 0);
              setOpen(false);
            }}
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
