"use client";

import { useState, useEffect } from "react";
import { Star, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FavouriteSeat } from "../types/dashboard.types";
import FavSeatBookingDialog from "./FavSeatBookingDialog";

type FavouriteSeatCardProps = {
  seat: FavouriteSeat | null;
  secondFavSeat: FavouriteSeat | null;
  canBookSelf: boolean;
};

export function FavouriteSeatCard({ seat, secondFavSeat, canBookSelf }: FavouriteSeatCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [restoreOnOpen, setRestoreOnOpen] = useState(false);

  useEffect(() => {
    if (!seat) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("openFavDialog") === "1") {
      setRestoreOnOpen(true);
      setDialogOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("openFavDialog");
      window.history.replaceState({}, "", url.toString());
    }
  }, [seat]);

  if (!seat) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <p className="text-[12.5px] font-semibold text-gray-900">Favourite Seat</p>
        </div>
        <div className="px-4 py-7 flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Star className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            No favourite seat yet.<br />Star a seat when booking to save it here.
          </p>
        </div>
      </div>
    );
  }
  // For "IDR-BR-F1-A-101" → take last two segments → "A101"
  const parts = seat.label.split("-");
  const avatarLabel = parts.length >= 2
    ? (parts[parts.length - 2] + parts[parts.length - 1]).slice(0, 4)
    : seat.label.replace(/^seat\s*/i, "").slice(0, 4);

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <p className="text-[12.5px] font-semibold text-gray-900">Favourite Seat</p>
          </div>
          {canBookSelf && (
            <button
              onClick={() => setDialogOpen(true)}
              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 transition-colors"
            >
              Quick book →
            </button>
          )}
        </div>
        <div className="p-3">
          <FavouriteSeatTile
            seat={seat}
            avatarLabel={avatarLabel}
            onClick={canBookSelf ? () => setDialogOpen(true) : null}
          />
        </div>
      </div>

      {canBookSelf && (
        <FavSeatBookingDialog
          seat={seat}
          secondFavSeat={secondFavSeat}
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setRestoreOnOpen(false); }}
          restoreOnOpen={restoreOnOpen}
        />
      )}
    </>
  );
}

type FavouriteSeatTileProps = {
  seat: FavouriteSeat;
  avatarLabel: string;
  onClick: (() => void) | null;
};

function FavouriteSeatTile({ seat, avatarLabel, onClick }: FavouriteSeatTileProps) {
  const tileClassName = cn(
    "w-full text-left grid grid-cols-[2.25rem_1fr] gap-x-3 items-center rounded-xl px-3 py-3 transition-all duration-200 group",
    "bg-gradient-to-br from-indigo-50 via-white to-violet-50 border border-indigo-100",
    onClick && "hover:border-indigo-300 hover:shadow-md hover:from-indigo-100 hover:to-violet-100 cursor-pointer active:scale-[0.99]"
  );

  const content = (
    <>
      {/* Avatar — plain div avoids component sizing quirks */}
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm group-hover:from-orange-500 group-hover:to-orange-600 transition-all duration-200">
        <span className="text-white text-[10px] font-bold leading-none tracking-wide">{avatarLabel}</span>
      </div>

      {/* Text — grid col gets fixed 1fr width so both rows are guaranteed same left edge */}
      <div className="overflow-hidden">
        <div className="flex items-center gap-1.5">
          <p className="flex-1 min-w-0 text-[12.5px] font-bold text-gray-900 truncate leading-snug">{seat.label.trim()}</p>
          <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0 group-hover:scale-125 transition-transform duration-200" />
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
          <p className="text-[10.5px] text-gray-500 truncate leading-snug">{seat.location.trim()}</p>
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={tileClassName}>
        {content}
      </button>
    );
  }

  return <div className={tileClassName}>{content}</div>;
}