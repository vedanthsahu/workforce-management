import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  count: number;
  icon: LucideIcon;
  iconClass: string;
  selected: boolean;
  onClick: () => void;
}

export default function SummaryCard({
  label,
  count,
  icon: Icon,
  iconClass,
  selected,
  onClick,
}: Props) {
  const disabled = count === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? `${label} has no records` : undefined}
      className={cn(
        "flex min-w-[190px] flex-1 items-center gap-3 rounded-2xl border bg-white p-3 text-left shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.97] active:duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 sm:p-5",
        selected
          ? "border-indigo-300 ring-1 ring-indigo-100"
          : "border-gray-200",
        disabled &&
          "cursor-not-allowed opacity-55 hover:translate-y-0 hover:shadow-sm active:scale-100",
      )}
    >
      <span
        className={cn(
          "shrink-0 rounded-xl p-2 sm:p-3 [&_svg]:size-6",
          iconClass,
        )}
      >
        <Icon />
      </span>
      <span className="min-w-0">
        <span className="block whitespace-nowrap text-xs font-normal text-gray-500 sm:text-sm">
          {label}
        </span>
        <span className="block text-lg font-semibold text-gray-900 sm:text-xl">
          {count}
        </span>
      </span>
    </button>
  );
}
