"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { FavouriteSeat } from "../types/dashboard.types";

type FavouriteSeatCardProps = {
  seat: FavouriteSeat | null;
  canBookSelf: boolean;
};

export function FavouriteSeatCard({ seat, canBookSelf }: FavouriteSeatCardProps) {
  if (!seat) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[12.5px] font-semibold text-gray-900">Favourite seat</p>
        </div>
        <div className="p-3">
          <div className="px-1 py-6 flex flex-col items-center gap-2">
            <Star className="w-8 h-8 text-gray-200" />
            <p className="text-[11px] text-gray-400 text-center">
              No favourite seat saved yet.<br />Star a seat when booking to save it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const avatarLabel = seat.label.replace(/^seat\s*/i, "").slice(0, 4);
  const quickBookHref = `/book?seatId=${seat.id}`;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-[12.5px] font-semibold text-gray-900">Favourite seat</p>
        {canBookSelf && (
          <Link
            href={quickBookHref}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 transition-colors"
          >
            Quick book →
          </Link>
        )}
      </div>
      <div className="p-3">
        <FavouriteSeatTile seat={seat} avatarLabel={avatarLabel} href={canBookSelf ? quickBookHref : null} />
      </div>
    </div>
  );
}

type FavouriteSeatTileProps = {
  seat: FavouriteSeat;
  avatarLabel: string;
  href: string | null;
};

function FavouriteSeatTile({ seat, avatarLabel, href }: FavouriteSeatTileProps) {
  const tileClassName = cn(
    "flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 transition-colors duration-200 group",
    href && "hover:bg-indigo-100/60 cursor-pointer"
  );

  const content = (
    <>
      <Avatar size="lg" className="rounded-xl bg-orange-400 group-hover:bg-orange-500 transition-colors duration-200">
        <AvatarFallback className="rounded-xl bg-transparent text-white text-[10px] font-bold leading-none text-center px-0.5">
          {avatarLabel}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[12px] font-semibold text-gray-900 leading-snug">{seat.label}</p>
          <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0 group-hover:scale-110 transition-transform duration-200" />
        </div>
        <p className="text-[10.5px] text-gray-500 leading-snug">{seat.location}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{seat.description}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={tileClassName}>
        {content}
      </Link>
    );
  }

  return <div className={tileClassName}>{content}</div>;
}
