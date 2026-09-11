import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props { label: string; count: number; icon: LucideIcon; iconClass: string; selected: boolean; onClick: () => void }
export default function SummaryCard({ label, count, icon: Icon, iconClass, selected, onClick }: Props) {
  return <button type="button" onClick={onClick} className={cn("min-w-[170px] flex-1 rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", selected ? "border-violet-500 ring-2 ring-violet-100" : "border-gray-200")}><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-700">{label}</span><span className={cn("flex h-8 w-8 items-center justify-center rounded-full", iconClass)}><Icon size={17}/></span></div><p className="mt-3 text-2xl font-bold text-slate-950">{count}</p></button>;
}
