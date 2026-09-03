"use client";

import * as React from "react";

import { CATEGORY_EMOJI, CATEGORY_LABELS, effectiveAmount } from "@/lib/spending/classify";
import { formatDateLabel, formatWon } from "@/lib/spending/format";
import type { Judgment, SplitInfo, Transaction, WhoTag } from "@/lib/spending/types";
import { cn } from "@/lib/utils";

const WHO_OPTIONS: { value: WhoTag; label: string; emoji: string }[] = [
  { value: "alone", label: "혼자", emoji: "🙋" },
  { value: "family", label: "가족", emoji: "👨‍👩‍👧" },
  { value: "friend", label: "친구", emoji: "🧑‍🤝‍🧑" },
  { value: "partner", label: "연인", emoji: "💛" },
  { value: "other", label: "기타", emoji: "🏷️" },
];

const SPLIT_WORTHY: WhoTag[] = ["family", "friend", "partner"];

// How far (in px) the card must be dragged before it counts as a decision
// instead of springing back to center.
const DRAG_THRESHOLD = 100;
// How far off-screen the card flies once a decision is made.
const FLY_DISTANCE = 600;
// The card's own CSS transition is 320ms (see the `transform` style below);
// we fire onJudge a bit earlier so the next card can start appearing while
// this one is still finishing its exit, which feels snappier than waiting
// for the full animation before advancing the deck.
const JUDGE_CALLBACK_DELAY_MS = 220;

type Step = "context" | "split" | "judge";

function buildInfoLine(tx: Transaction): string {
  const parts: string[] = [];
  if (tx.category) parts.push(CATEGORY_LABELS[tx.category]);
  if (tx.installment) parts.push(`${tx.installment.totalMonths}개월 할부`);
  if (tx.split?.isSplit) parts.push(`${tx.split.withWhom}와 N빵`);
  return parts.join(" · ");
}

/** The emoji/merchant/date/amount block shown at the top of every card face. */
function TransactionFace({
  transaction,
  amount,
  infoLine,
}: {
  transaction: Transaction;
  amount: number;
  infoLine: string;
}) {
  return (
    <>
      <span className="text-4xl">
        {transaction.category ? CATEGORY_EMOJI[transaction.category] : "🧾"}
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-lg font-medium">{transaction.merchant}</span>
        <span className="text-muted-foreground text-sm">
          {formatDateLabel(transaction.date)}
          {infoLine ? ` · ${infoLine}` : ""}
        </span>
      </div>
      <span className="text-4xl font-bold">{formatWon(amount)}</span>
    </>
  );
}

/** Where the card sits mid-drag, or its exit position once a decision has been made. */
function getDragTransform(dragX: number, flyDirection: Judgment | null): string {
  if (flyDirection === "unnecessary") {
    return `translateX(${FLY_DISTANCE}px) rotate(24deg)`;
  }
  if (flyDirection === "necessary") {
    return `translateX(-${FLY_DISTANCE}px) rotate(-24deg)`;
  }
  // Tilt proportionally to how far it's been dragged, like a card pinned at the top.
  return `translateX(${dragX}px) rotate(${dragX / 18}deg)`;
}

/**
 * Turns raw pointer events into a horizontal drag position, and decides
 * whether a release counts as a swipe (far enough past the threshold) or
 * should just spring back to center. Rendering and the resulting judgment
 * are left entirely to the caller.
 */
function useSwipeDrag({
  enabled,
  onSwipe,
}: {
  enabled: boolean;
  onSwipe: (direction: Judgment) => void;
}) {
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const dragStart = React.useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    // Let clicks on the judge buttons through undragged - otherwise this
    // handler grabs pointer capture before the button's onClick can fire.
    if ((event.target as HTMLElement).closest("button")) return;
    dragStart.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStart.current) return;
    setDragX(event.clientX - dragStart.current.x);
  };

  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    dragStart.current = null;
    if (dragX >= DRAG_THRESHOLD) onSwipe("unnecessary");
    else if (dragX <= -DRAG_THRESHOLD) onSwipe("necessary");
    else setDragX(0);
  };

  return {
    dragX,
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}

export function SwipeCard({
  transaction,
  interactive,
  onJudge,
  onUpdateWho,
  onUpdateSplit,
  offset = 0,
}: {
  transaction: Transaction;
  interactive: boolean;
  onJudge: (judgment: Judgment) => void;
  onUpdateWho: (who: WhoTag | null) => void;
  onUpdateSplit: (split: SplitInfo | null) => void;
  offset?: number;
}) {
  const [step, setStep] = React.useState<Step>(
    transaction.needsContext && transaction.who === null ? "context" : "judge",
  );
  const [flyDirection, setFlyDirection] = React.useState<Judgment | null>(null);

  const amount = effectiveAmount(transaction);
  const infoLine = buildInfoLine(transaction);

  const commitJudge = React.useCallback(
    (judgment: Judgment) => {
      if (flyDirection) return;
      setFlyDirection(judgment);
      window.setTimeout(() => onJudge(judgment), JUDGE_CALLBACK_DELAY_MS);
    },
    [flyDirection, onJudge],
  );

  const { dragX, dragging, handlers: dragHandlers } = useSwipeDrag({
    enabled: interactive && step === "judge" && !flyDirection,
    onSwipe: commitJudge,
  });

  const necessaryOpacity = Math.min(1, Math.max(0, -dragX / DRAG_THRESHOLD));
  const unnecessaryOpacity = Math.min(1, Math.max(0, dragX / DRAG_THRESHOLD));

  return (
    <div
      className={cn(
        "border-border absolute inset-0 flex touch-none flex-col overflow-hidden rounded-xl border shadow-[0_8px_20px_-12px_rgba(43,35,32,0.3)] select-none",
        interactive ? "bg-card" : "bg-secondary",
      )}
      style={{
        transform: interactive
          ? getDragTransform(dragX, flyDirection)
          : `translateY(${offset * 16}px) scale(${1 - offset * 0.05})`,
        transformOrigin: interactive ? undefined : "bottom center",
        transition:
          dragging && !flyDirection ? "none" : "transform 320ms cubic-bezier(.2,.8,.3,1)",
        zIndex: 10 - offset,
        opacity: offset > 2 ? 0 : 1,
        pointerEvents: interactive ? "auto" : "none",
      }}
      aria-hidden={!interactive}
      {...dragHandlers}
    >
      {!interactive && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8 text-center">
          <TransactionFace transaction={transaction} amount={amount} infoLine={infoLine} />
        </div>
      )}

      {interactive && step === "judge" && (
        <>
          <div
            className="border-sage text-sage absolute top-8 left-6 -rotate-6 rounded-md border-2 px-3 py-1 text-base font-bold"
            style={{ opacity: necessaryOpacity }}
          >
            필요했어
          </div>
          <div
            className="border-marigold text-marigold absolute top-8 right-6 rotate-6 rounded-md border-2 px-3 py-1 text-base font-bold"
            style={{ opacity: unnecessaryOpacity }}
          >
            안 해도 됐어
          </div>
        </>
      )}

      {interactive && step === "context" && (
        <ContextStep
          transaction={transaction}
          onSelect={(who) => {
            onUpdateWho(who);
            setStep(SPLIT_WORTHY.includes(who) ? "split" : "judge");
          }}
        />
      )}

      {interactive && step === "split" && (
        <SplitStep
          transaction={transaction}
          onSkip={() => setStep("judge")}
          onApply={(split) => {
            onUpdateSplit(split);
            setStep("judge");
          }}
        />
      )}

      {interactive && step === "judge" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8 text-center">
          <TransactionFace transaction={transaction} amount={amount} infoLine={infoLine} />
          <p className="text-muted-foreground mt-2 text-sm">
            이 소비, 안 해도 됐을까요?
          </p>

          {transaction.who === null && (
            <button
              type="button"
              className="text-muted-foreground text-xs underline underline-offset-4"
              onClick={() => setStep("context")}
            >
              맥락 추가하기
            </button>
          )}

          <div className="mt-auto flex w-full items-center justify-between gap-3 pt-4">
            <button
              type="button"
              onClick={() => commitJudge("necessary")}
              className="border-sage text-sage flex-1 rounded-full border-2 px-4 py-3 text-sm font-medium"
            >
              ← 필요했어
            </button>
            <button
              type="button"
              onClick={() => commitJudge("unnecessary")}
              className="border-marigold text-marigold flex-1 rounded-full border-2 px-4 py-3 text-sm font-medium"
            >
              안 해도 됐어 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContextStep({
  transaction,
  onSelect,
}: {
  transaction: Transaction;
  onSelect: (who: WhoTag) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8 text-center">
      <div className="flex flex-col gap-1">
        <span className="text-lg font-medium">{transaction.merchant}</span>
        <span className="text-3xl font-bold">{formatWon(transaction.rawAmount)}</span>
      </div>
      <p className="text-muted-foreground text-sm">이 소비는 어떤 성격이었나요?</p>
      <div className="grid w-full grid-cols-3 gap-2">
        {WHO_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className="border-border bg-secondary hover:border-ring flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm"
          >
            <span className="text-xl">{option.emoji}</span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SplitStep({
  transaction,
  onApply,
  onSkip,
}: {
  transaction: Transaction;
  onApply: (split: SplitInfo) => void;
  onSkip: () => void;
}) {
  const whoLabel =
    WHO_OPTIONS.find((option) => option.value === transaction.who)?.label ?? "함께";
  // Split from what's actually due this month, not the full purchase price -
  // e.g. a 3-month installment should split its monthly charge, not the total.
  const splitBaseAmount = transaction.installment
    ? transaction.installment.monthlyAmount
    : transaction.rawAmount;
  const [myShare, setMyShare] = React.useState(() => Math.round(splitBaseAmount / 2));

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-8 text-center">
      <div className="flex flex-col gap-1">
        <span className="text-lg font-medium">{transaction.merchant}</span>
        <span className="text-muted-foreground text-sm">
          {formatWon(splitBaseAmount)} 결제 · {whoLabel}와 함께
        </span>
      </div>
      <p className="text-muted-foreground text-sm">내가 부담한 금액은 얼마예요?</p>
      <input
        type="number"
        inputMode="numeric"
        value={myShare}
        onChange={(event) => setMyShare(Number(event.target.value) || 0)}
        className="border-border bg-background w-40 rounded-xl border px-3 py-2 text-center text-2xl font-semibold"
      />
      <div className="flex w-full gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="border-border text-muted-foreground flex-1 rounded-full border px-4 py-2 text-sm"
        >
          전액 내 소비예요
        </button>
        <button
          type="button"
          onClick={() =>
            onApply({
              isSplit: true,
              withWhom: whoLabel,
              totalAmount: splitBaseAmount,
              myShare: Math.max(0, myShare),
            })
          }
          className="bg-primary text-primary-foreground flex-1 rounded-full px-4 py-2 text-sm font-medium"
        >
          이 금액으로 볼게요
        </button>
      </div>
    </div>
  );
}
