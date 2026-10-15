"use client";

import { FileText, CheckCircle2, AlertTriangle, Users } from "lucide-react";

type StatProps = {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: number;
  sublabel: string;
};

export interface AuditStats {
  total: number;
  successful: number;
  failed: number;
  uniqueUsers: number;
}

export default function AuditStatCards({ stats }: { stats: AuditStats }) {
  const successPct = stats.total ? Math.round((stats.successful / stats.total) * 100) : 0;
  const failedPct = stats.total ? Math.round((stats.failed / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Stat
        icon={<FileText className="text-blue-600" />}
        bg="bg-blue-100"
        label="Total Events"
        value={stats.total}
        sublabel="All audit log events"
      />
      <Stat
        icon={<CheckCircle2 className="text-green-600" />}
        bg="bg-green-100"
        label="Successful"
        value={stats.successful}
        sublabel={`${successPct}% of total events`}
      />
      <Stat
        icon={<AlertTriangle className="text-orange-600" />}
        bg="bg-orange-100"
        label="Failed"
        value={stats.failed}
        sublabel={`${failedPct}% of total events`}
      />
      <Stat
        icon={<Users className="text-violet-600" />}
        bg="bg-violet-100"
        label="Unique Users"
        value={stats.uniqueUsers}
        sublabel="In selected period"
      />
    </div>
  );
}

function Stat({ icon, bg, label, value, sublabel }: StatProps) {
  return (
    <div className="flex items-center gap-3 p-3 sm:p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${bg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">{label}</p>
        <p className="text-lg sm:text-xl font-semibold text-gray-900">{value}</p>
        <p className="text-[11px] text-gray-400 whitespace-nowrap">{sublabel}</p>
      </div>
    </div>
  );
}
