"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, ShieldEllipsis } from "lucide-react";

type Props = {
  onChangeRole: () => void;
};

export default function UserRowMenu({ onChangeRole }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center w-8 h-8 rounded-md border hover:bg-gray-50 text-gray-500 transition-colors"
        title="Row actions"
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
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
        </div>
      )}
    </div>
  );
}