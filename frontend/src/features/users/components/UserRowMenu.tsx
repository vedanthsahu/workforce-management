"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, ShieldEllipsis } from "lucide-react";

type Props = {
  onChangeRole: () => void;
  /** Last row on the page — always open the menu upward instead of downward. */
  openUpward?: boolean;
  /** When set, the menu button is disabled and shows this text as a tooltip. */
  disabledReason?: string | null;
};

export default function UserRowMenu({ onChangeRole, openUpward = false, disabledReason = null }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition(
        openUpward
          ? { bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right }
          : { top: rect.bottom + 4, right: window.innerWidth - rect.right }
      );
    }
    setOpen(true);
  };

  // Once the menu has rendered we know its real height — if it doesn't fit
  // below the button (e.g. a row near the viewport bottom), flip it to open
  // upward instead of getting clipped.
  useLayoutEffect(() => {
    if (!open || openUpward || !buttonRef.current || !menuRef.current) return;
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current.offsetHeight;
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    if (spaceBelow < menuHeight + 8 && spaceAbove > spaceBelow) {
      setPosition({ bottom: window.innerHeight - buttonRect.top + 4, right: window.innerWidth - buttonRect.right });
    }
  }, [open, openUpward]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    // Any scroll (including the table body's internal scroll) invalidates the
    // menu's position — close it rather than let it drift.
    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open]);

  if (disabledReason) {
    return (
      <div className="relative">
        <button
          type="button"
          disabled
          title={disabledReason}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 text-gray-300 cursor-not-allowed opacity-60"
        >
          <MoreVertical size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="inline-flex items-center justify-center w-8 h-8 rounded-md border hover:bg-gray-50 text-gray-500 transition-colors"
        title="Row actions"
      >
        <MoreVertical size={14} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: position.top, bottom: position.bottom, right: position.right }}
            className="z-50 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onChangeRole();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <ShieldEllipsis size={14} />
              Change Role
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
