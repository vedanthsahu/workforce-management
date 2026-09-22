"use client";

import {
  Ban,
  History,
  MoreVertical,
  Pencil,
  RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BlockedSeat } from "../types/blockedSeats.types";

export type BlockedSeatAction =
  | "modify"
  | "history"
  | "unblock"
  | "reblock";

interface Props {
  row: BlockedSeat;
  onAction: (action: BlockedSeatAction, row: BlockedSeat) => void;
}

interface MenuItem {
  action: BlockedSeatAction;
  label: string;
  icon: LucideIcon;
  danger?: boolean;
}

export default function BlockedSeatActionMenu({ row, onAction }: Props) {
  const expired = row.display_status === "EXPIRED";
  const items: MenuItem[] = [
    ...(!expired
      ? [{ action: "modify" as const, label: "Modify Block", icon: Pencil }]
      : []),
    { action: "history", label: "View Audit History", icon: History },
    ...(expired
      ? [{ action: "reblock" as const, label: "Re-block Seat", icon: RotateCcw }]
      : [{ action: "unblock" as const, label: "Unblock Seat", icon: Ban, danger: true }]),
  ];

  return (
    <details className="group relative inline-block text-left open:z-40">
      <summary
        aria-label={`Actions for ${row.seat_code}`}
        className="flex size-8 cursor-pointer list-none items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 [&::-webkit-details-marker]:hidden"
      >
        <MoreVertical size={17} />
      </summary>
      <div className="absolute bottom-full right-0 z-30 mb-1 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
        {items.map(({ action, label, icon: Icon, danger }, index) => (
          <button
            key={action}
            type="button"
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              onAction(action, row);
            }}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors ${
              danger
                ? "mt-1 border-t border-gray-100 text-red-600 hover:bg-red-50"
                : index === items.length - 1 && expired
                  ? "mt-1 border-t border-gray-100 text-indigo-600 hover:bg-indigo-50"
                  : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
    </details>
  );
}
