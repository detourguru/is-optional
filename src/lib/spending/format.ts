export function formatWon(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString("ko-KR")}원`;
}

export function formatSignedWon(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return "0원";
  const sign = rounded > 0 ? "+" : "-";
  return `${sign}${Math.abs(rounded).toLocaleString("ko-KR")}원`;
}

export function formatDateLabel(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function formatMonthLabel(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}
