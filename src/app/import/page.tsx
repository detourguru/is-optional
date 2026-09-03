"use client";

import Link from "next/link";
import * as React from "react";

import { useSpending } from "@/components/spending/spending-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { decodeUploadedFile } from "@/lib/spending/parse";
import { buildSampleInput } from "@/lib/spending/sample-data";

interface ImportSummary {
  transactionCount: number;
  candidateCount: number;
  warnings: string[];
}

export default function ImportPage() {
  const { hydrated, transactions, importTransactions } = useSpending();
  const [text, setText] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [result, setResult] = React.useState<ImportSummary | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const runImport = () => {
    if (!text.trim()) return;
    const { transactionCount, candidateCount, warnings } = importTransactions(text);
    setResult({ transactionCount, candidateCount, warnings });
  };

  const handleImportClick = () => {
    if (!text.trim()) return;
    if (transactions.length > 0) {
      setConfirmOpen(true);
      return;
    }
    runImport();
  };

  const handleFile = async (file: File) => {
    setText(await decodeUploadedFile(file));
    setResult(null);
  };

  if (!hydrated) return null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-10 pb-16">
      <header className="mb-8 flex items-center gap-3">
        <Link href="/" className="text-muted-foreground text-sm">
          ← 홈
        </Link>
      </header>

      <h1 className="mb-2 text-xl font-medium">이번 달 내역 가져오기</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        CSV 파일을 올리거나, 문자·앱 내역을 그대로 붙여넣어도 돼요.
      </p>

      <textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setResult(null);
        }}
        placeholder={"8/27 이마트 김포 29900\n8/28 하와이 조개 영등포점 119000\n9/2 네이버페이 161200 할부5개월"}
        rows={10}
        className="border-border bg-card mb-3 rounded-xl border p-4 text-sm leading-relaxed"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          CSV 업로드
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setText(buildSampleInput());
            setResult(null);
          }}
        >
          예시 데이터로 체험하기
        </Button>
      </div>

      <Button size="lg" onClick={handleImportClick} disabled={!text.trim()}>
        가져오기
      </Button>

      {result && (
        <div className="bg-secondary mt-6 flex flex-col gap-2 rounded-xl p-4 text-sm">
          <p>
            {result.transactionCount}개의 거래를 확인했어요. 그중{" "}
            {result.candidateCount}개를 돌아볼게요.
          </p>
          {result.warnings.length > 0 && (
            <details className="text-muted-foreground text-xs">
              <summary>읽지 못한 줄 {result.warnings.length}개</summary>
              <ul className="mt-1 list-disc pl-4">
                {result.warnings.slice(0, 10).map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </details>
          )}
          <Button asChild size="lg" className="mt-2">
            <Link href={result.candidateCount > 0 ? "/swipe" : "/"}>
              {result.candidateCount > 0 ? "돌아보러 가기 →" : "홈으로"}
            </Link>
          </Button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>기존 내역을 덮어쓸까요?</DialogTitle>
            <DialogDescription>
              이번 달에 가져온 내역과 스와이프 기록이 새 내역으로 바뀌어요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                runImport();
                setConfirmOpen(false);
              }}
            >
              가져오기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
