"use client";

import { ReactNode } from "react";
import { Building2, CheckCircle, PauseCircle, Armchair } from "lucide-react";
import { Card } from "@/components/ui/card";
import { OfficeStatsSummary } from "../types/office.types";

export type OfficeStatusFilter = "ACTIVE" | "INACTIVE" | null;

interface StatCardProps {
  icon: ReactNode;
  bg: string;
  label: string;
  value: string;
  sub: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function StatCard({ icon, bg, label, value, sub, selected, disabled, onClick }: StatCardProps) {
  const clickable = !!onClick && !disabled;
  return (
    <Card
      onClick={clickable ? onClick : undefined}
      className={`group flex flex-row items-center gap-3 sm:gap-4 p-3 sm:p-5 transition-all duration-200 ${
        clickable ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg" : disabled ? "cursor-not-allowed opacity-80" : ""
      } ${
        selected
          ? "border border-indigo-300 ring-1 ring-indigo-100"
          : ""
      }`}
    >
      <div className={`p-2 sm:p-3 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-110 ${bg}`}>{icon}</div>
      <div>
        <p className="text-xs sm:text-sm text-gray-500">{label}</p>
        <p className="text-lg sm:text-xl font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </div>
    </Card>
  );
}

interface OfficeStatsProps {
  stats: OfficeStatsSummary | null;
  statusFilter?: OfficeStatusFilter;
  onStatusFilterChange?: (filter: OfficeStatusFilter) => void;
}

export default function OfficeStats({ stats, statusFilter = null, onStatusFilterChange }: OfficeStatsProps) {
  if (!stats) return null;

  const toggle = (value: "ACTIVE" | "INACTIVE") => {
    onStatusFilterChange?.(statusFilter === value ? null : value);
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        icon={<Building2 className="text-blue-600" />}
        bg="bg-blue-100"
        label="Total Offices"
        value={stats.total_offices.toString()}
        sub="Across all tenants"
        selected={statusFilter === null}
        disabled={stats.total_offices === 0}
        onClick={onStatusFilterChange && stats.total_offices > 0 ? () => onStatusFilterChange(null) : undefined}
      />
      <StatCard
        icon={<CheckCircle className="text-green-600" />}
        bg="bg-green-100"
        label="Active Offices"
        value={stats.active_sites.toString()}
        sub="Currently active"
        selected={statusFilter === "ACTIVE"}
        disabled={stats.active_sites === 0}
        onClick={onStatusFilterChange && stats.active_sites > 0 ? () => toggle("ACTIVE") : undefined}
      />
      <StatCard
        icon={<PauseCircle className="text-yellow-600" />}
        bg="bg-yellow-100"
        label="Inactive Offices"
        value={stats.inactive_sites.toString()}
        sub="Currently inactive"
        selected={statusFilter === "INACTIVE"}
        disabled={stats.inactive_sites === 0}
        onClick={onStatusFilterChange && stats.inactive_sites > 0 ? () => toggle("INACTIVE") : undefined}
      />
      <StatCard
        icon={<Armchair className="text-purple-600" />}
        bg="bg-purple-100"
        label="Total Spaces"
        value={stats.active_seats.toString()}
        sub="Across all offices"
      />
    </div>
  );
}
