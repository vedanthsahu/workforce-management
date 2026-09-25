"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, History, MoreVertical, Pencil, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BlockedSeat } from "../types/blockedSeats.types";

export type BlockedSeatAction = "modify" | "history" | "unblock" | "reblock";

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

const MENU_WIDTH = 208;
const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;

export default function BlockedSeatActionMenu({ row, onAction }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const expired = row.display_status === "EXPIRED";
  const items: MenuItem[] = [
    ...(!expired
      ? [{ action: "modify" as const, label: "Modify Block", icon: Pencil }]
      : []),
    { action: "history", label: "View Audit History", icon: History },
    ...(expired
      ? [
          {
            action: "reblock" as const,
            label: "Re-block Seat",
            icon: RotateCcw,
          },
        ]
      : [
          {
            action: "unblock" as const,
            label: "Unblock Seat",
            icon: Ban,
            danger: true,
          },
        ]),
  ];

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;

    const placeMenu = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const menuHeight = menu.offsetHeight;
      const spaceBelow = window.innerHeight - trigger.bottom;
      const top =
        spaceBelow >= menuHeight + MENU_GAP
          ? trigger.bottom + MENU_GAP
          : Math.max(VIEWPORT_PADDING, trigger.top - menuHeight - MENU_GAP);
      const left = Math.min(
        window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING,
        Math.max(VIEWPORT_PADDING, trigger.right - MENU_WIDTH),
      );

      setPosition({ left, top });
    };

    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Actions for ${row.seat_code}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
      >
        <MoreVertical size={17} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Actions for ${row.seat_code}`}
            className="fixed z-[100] w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
            style={{ left: position.left, top: position.top }}
          >
            {items.map(({ action, label, icon: Icon, danger }, index) => (
              <button
                key={action}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
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
          </div>,
          document.body,
        )}
    </>
  );
}
