import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props { label: string; count: number; icon: LucideIcon; iconClass: string; selected: boolean; onClick: () => void }
export default function SummaryCard({ label, count, icon: Icon, iconClass, selected, onClick }: Props) {
  return <button type="button" onClick={onClick} className={cn("min-w-[170px] flex-1 rounded-2xl border bg-card p-4 text-left text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", selected ? "border-primary ring-2 ring-primary/10" : "border-border")}><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-foreground">{label}</span><span className={cn("flex h-8 w-8 items-center justify-center rounded-full", iconClass)}><Icon size={17}/></span></div><p className="mt-3 text-2xl font-semibold text-foreground">{count}</p></button>;
}
