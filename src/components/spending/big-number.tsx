import { cn } from "@/lib/utils";

export function BigNumber({
  label,
  value,
  tone = "ink",
  size = "lg",
  className,
}: {
  label: string;
  value: string;
  tone?: "ink" | "sage" | "marigold";
  size?: "lg" | "md";
  className?: string;
}) {
  const toneClass = {
    ink: "text-foreground",
    sage: "text-sage",
    marigold: "text-marigold",
  }[tone];

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-muted-foreground text-sm">{label}</span>
      <span
        className={cn(
          "font-bold leading-none tracking-tight",
          size === "lg" ? "text-5xl" : "text-3xl",
          toneClass,
        )}
      >
        {value}
      </span>
    </div>
  );
}
