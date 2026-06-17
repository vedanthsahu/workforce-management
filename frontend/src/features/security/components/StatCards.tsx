// "use client";

// import { CalendarCheck, UserCheck, Clock, XCircle } from "lucide-react";
// import { cn } from "@/lib/utils";
// import type { SecurityDashboardSummary } from "../types/security.types";

// type Props = {
//   summary: SecurityDashboardSummary;
//   onViewAll?: (filter: "expected" | "checked-in" | "overdue" | "cancelled") => void;
// };

// const CARD_CONFIG = [
//   {
//     key: "expected" as const,
//     label: "Expected Today",
//     sublabel: "Scheduled visitors",
//     icon: CalendarCheck,
//     iconBg: "bg-blue-100",
//     iconColor: "text-blue-600",
//     border: "border-blue-100",
//     bg: "bg-blue-50/40",
//   },
//   {
//     key: "checked-in" as const,
//     label: "Checked In",
//     sublabel: "Currently in office",
//     icon: UserCheck,
//     iconBg: "bg-emerald-100",
//     iconColor: "text-emerald-600",
//     border: "border-emerald-100",
//     bg: "bg-emerald-50/40",
//   },
//   {
//     key: "overdue" as const,
//     label: "Overdue Checkout",
//     sublabel: "Past end time",
//     icon: Clock,
//     iconBg: "bg-amber-100",
//     iconColor: "text-amber-600",
//     border: "border-amber-100",
//     bg: "bg-amber-50/40",
//   },
//   {
//     key: "cancelled" as const,
//     label: "Cancelled / No Show",
//     sublabel: "Today",
//     icon: XCircle,
//     iconBg: "bg-red-100",
//     iconColor: "text-red-600",
//     border: "border-red-100",
//     bg: "bg-red-50/40",
//   },
// ];

// export function StatCards({ summary, onViewAll }: Props) {
//   const values: Record<(typeof CARD_CONFIG)[number]["key"], number> = {
//     expected: summary.expectedToday,
//     "checked-in": summary.checkedIn,
//     overdue: summary.overdueCheckout,
//     cancelled: summary.cancelledNoShow,
//   };

//   return (
//     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//       {CARD_CONFIG.map((card) => {
//         const Icon = card.icon;
//         return (
//           <div
//             key={card.key}
//             className={cn(
//               "rounded-xl border p-4 flex flex-col gap-2",
//               card.border,
//               card.bg
//             )}
//           >
//             <div className="flex items-center justify-between">
//               <p className="text-[12px] font-medium text-gray-600">{card.label}</p>
//               <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", card.iconBg)}>
//                 <Icon className={cn("w-3.5 h-3.5", card.iconColor)} />
//               </div>
//             </div>

//             <p className="text-2xl font-bold text-gray-900 leading-none">{values[card.key]}</p>
//             <p className="text-[11px] text-gray-400">{card.sublabel}</p>

//             <button
//               type="button"
//               onClick={() => onViewAll?.(card.key)}
//               className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 text-left mt-1"
//             >
//               View all
//             </button>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// "use client";

// import { CalendarCheck, UserCheck, Clock, XCircle, ArrowRight } from "lucide-react";
// import { cn } from "@/lib/utils";
// import type { SecurityDashboardSummary } from "../types/security.types";

// type Props = {
//   summary: SecurityDashboardSummary;
//   onViewAll?: (filter: "expected" | "checked-in" | "overdue" | "cancelled") => void;
// };

// const CARD_CONFIG = [
//   {
//     key: "expected" as const,
//     label: "Expected Today",
//     sublabel: "Scheduled visitors",
//     icon: CalendarCheck,
//     accent: "bg-blue-500",
//     iconBg: "bg-blue-500",
//     valueColor: "text-gray-900",
//   },
//   {
//     key: "checked-in" as const,
//     label: "Checked In",
//     sublabel: "Currently in office",
//     icon: UserCheck,
//     accent: "bg-emerald-500",
//     iconBg: "bg-emerald-500",
//     valueColor: "text-gray-900",
//   },
//   {
//     key: "overdue" as const,
//     label: "Overdue Checkout",
//     sublabel: "Past end time",
//     icon: Clock,
//     accent: "bg-amber-500",
//     iconBg: "bg-amber-500",
//     valueColor: "text-gray-900",
//   },
//   {
//     key: "cancelled" as const,
//     label: "Cancelled / No Show",
//     sublabel: "Today",
//     icon: XCircle,
//     accent: "bg-red-500",
//     iconBg: "bg-red-500",
//     valueColor: "text-gray-900",
//   },
// ];

// export function StatCards({ summary, onViewAll }: Props) {
//   const values: Record<(typeof CARD_CONFIG)[number]["key"], number> = {
//     expected: summary.expectedToday,
//     "checked-in": summary.checkedIn,
//     overdue: summary.overdueCheckout,
//     cancelled: summary.cancelledNoShow,
//   };

//   return (
//     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//       {CARD_CONFIG.map((card) => {
//         const Icon = card.icon;
//         return (
//           <div
//             key={card.key}
//             className="relative bg-white border border-gray-200 rounded-lg pl-4 pr-3.5 py-3.5 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
//           >
//             {/* Left accent bar — carries all the color signaling */}
//             <span className={cn("absolute left-0 top-0 bottom-0 w-1", card.accent)} />

//             <div className="flex items-start justify-between gap-2">
//               <p className="text-[12px] font-medium text-gray-500 leading-tight">{card.label}</p>
//               <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", card.iconBg)}>
//                 <Icon className="w-3.5 h-3.5 text-white" />
//               </div>
//             </div>

//             <p className={cn("text-3xl font-bold leading-none tracking-tight", card.valueColor)}>
//               {values[card.key]}
//             </p>

//             <div className="flex items-center justify-between">
//               <p className="text-[11px] text-gray-400">{card.sublabel}</p>
//               <button
//                 type="button"
//                 onClick={() => onViewAll?.(card.key)}
//                 className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 group"
//               >
//                 View all
//                 <ArrowRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5" />
//               </button>
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// }





"use client";

import { CalendarCheck, UserCheck, Clock, XCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SecurityDashboardSummary } from "../types/security.types";

type Props = {
  summary: SecurityDashboardSummary;
  onViewAll?: (filter: "expected" | "checked-in" | "overdue" | "cancelled") => void;
};

const CARD_CONFIG = [
  {
    key: "expected" as const,
    label: "Expected Today",
    sublabel: "Scheduled visitors",
    icon: CalendarCheck,
    accentBar: "bg-blue-400",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-700",
    viewAllColor: "text-blue-700 hover:text-blue-900",
  },
  {
    key: "checked-in" as const,
    label: "Checked In",
    sublabel: "Currently in office",
    icon: UserCheck,
    accentBar: "bg-emerald-400",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-700",
    viewAllColor: "text-emerald-700 hover:text-emerald-900",
  },
  {
    key: "overdue" as const,
    label: "Overdue Checkout",
    sublabel: "Past end time",
    icon: Clock,
    accentBar: "bg-amber-400",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
    viewAllColor: "text-amber-700 hover:text-amber-900",
  },
  {
    key: "cancelled" as const,
    label: "Cancelled / No Show",
    sublabel: "Today",
    icon: XCircle,
    accentBar: "bg-red-400",
    iconBg: "bg-red-50",
    iconColor: "text-red-700",
    viewAllColor: "text-red-700 hover:text-red-900",
  },
];

export function StatCards({ summary, onViewAll }: Props) {
  const values: Record<(typeof CARD_CONFIG)[number]["key"], number> = {
    expected: summary.expectedToday,
    "checked-in": summary.checkedIn,
    overdue: summary.overdueCheckout,
    cancelled: summary.cancelledNoShow,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {CARD_CONFIG.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="relative bg-white border border-gray-200 rounded-xl pl-4 pr-3.5 py-3.5 flex flex-col gap-2.5 overflow-hidden"
          >
            {/* Left accent bar */}
            <span className={cn("absolute left-0 top-0 bottom-0 w-[3px]", card.accentBar)} />

            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] font-medium text-gray-500 leading-tight">{card.label}</p>
              <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", card.iconBg)}>
                <Icon className={cn("w-3.5 h-3.5", card.iconColor)} />
              </div>
            </div>

            <p className="text-3xl font-semibold text-gray-900 leading-none tracking-tight">
              {values[card.key]}
            </p>

            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-400">{card.sublabel}</p>
              <button
                type="button"
                onClick={() => onViewAll?.(card.key)}
                className={cn(
                  "text-[11px] font-medium flex items-center gap-0.5 group transition-colors",
                  card.viewAllColor
                )}
              >
                View all
                <ArrowRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}