"use client";

import { Database, FileText, LogIn, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuditCategory } from "../types/audit.types";

type StatProps = {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: number;
  sublabel: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

export interface AuditStats {
  total: number;
  access: number;
  business: number;
  admin: number;
}

type Props = {
  stats: AuditStats;
  activeCategory: AuditCategory;
  onCategoryChange: (category: AuditCategory) => void;
};

export default function AuditStatCards({ stats, activeCategory, onCategoryChange }: Props) {
  const select = (category: AuditCategory) =>
    onCategoryChange(activeCategory === category ? "All" : category);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      <Stat
        icon={<FileText className="text-blue-600" />}
        bg="bg-blue-100"
        label="Total Activities"
        value={stats.total}
        sublabel="Successful activity"
        selected={activeCategory === "All"}
        onClick={() => onCategoryChange("All")}
      />
      <Stat
        icon={<LogIn className="text-indigo-600" />}
        bg="bg-indigo-100"
        label="Access Activity"
        value={stats.access}
        sublabel="Sign-ins and sign-outs"
        selected={activeCategory === "ACCESS"}
        disabled={stats.access === 0}
        onClick={() => select("ACCESS")}
      />
      <Stat
        icon={<Database className="text-violet-600" />}
        bg="bg-violet-100"
        label="Booking & Guest Changes"
        value={stats.business}
        sublabel="Booking and guest records"
        selected={activeCategory === "BUSINESS"}
        disabled={stats.business === 0}
        onClick={() => select("BUSINESS")}
      />
      <Stat
        icon={<ShieldCheck className="text-teal-600" />}
        bg="bg-teal-100"
        label="Administrative Changes"
        value={stats.admin}
        sublabel="Configuration and access updates"
        selected={activeCategory === "ADMIN"}
        disabled={stats.admin === 0}
        onClick={() => select("ADMIN")}
      />
    </div>
  );
}

function Stat({ icon, bg, label, value, sublabel, selected, disabled, onClick }: StatProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex items-center gap-3 p-3 sm:p-5 bg-white border rounded-2xl shadow-sm text-left transition-colors",
        selected ? "border-indigo-400 ring-2 ring-indigo-100" : "border-gray-200 hover:border-indigo-200",
        disabled && "opacity-50 cursor-not-allowed hover:border-gray-200",
      )}
    >
      <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${bg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
          {label}
        </p>
        <p className="text-lg sm:text-xl font-semibold text-gray-900">
          {value}
        </p>
        <p className="text-[11px] text-gray-400 whitespace-nowrap">
          {sublabel}
        </p>
      </div>
    </button>
  );
}
