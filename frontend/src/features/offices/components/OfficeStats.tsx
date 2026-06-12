"use client";

import { ReactNode } from "react";
import { Building2, CheckCircle, PauseCircle, Armchair } from "lucide-react";
import { Card } from "@/components/ui/card";
import { OfficeStatsSummary } from "../types/office.types";

interface StatCardProps {
  icon: ReactNode;
  bg: string;
  label: string;
  value: string;
  sub: string;
}

function StatCard({ icon, bg, label, value, sub }: StatCardProps) {
  return (
    <Card className="flex flex-row items-center gap-4 p-5">
      <div className={`p-3 rounded-xl ${bg}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </div>
    </Card>
  );
}

interface OfficeStatsProps {
  stats: OfficeStatsSummary | null;
}

export default function OfficeStats({ stats }: OfficeStatsProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-4 gap-6">
      <StatCard
        icon={<Building2 className="text-blue-600" />}
        bg="bg-blue-100"
        label="Total Offices"
        value={stats.total_offices.toString()}
        sub="Across all tenants"
      />
      <StatCard
        icon={<CheckCircle className="text-green-600" />}
        bg="bg-green-100"
        label="Active Offices"
        value={stats.active_sites.toString()}
        sub="Currently active"
      />
      <StatCard
        icon={<PauseCircle className="text-yellow-600" />}
        bg="bg-yellow-100"
        label="Inactive Offices"
        value={stats.inactive_sites.toString()}
        sub="Currently inactive"
      />
      <StatCard
        icon={<Armchair className="text-purple-600" />}
        bg="bg-purple-100"
        label="Total Seats"
        value={stats.total_seats.toString()}
        sub="Across all offices"
      />
    </div>
  );
}
