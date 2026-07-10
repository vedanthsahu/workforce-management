// "use client";

// import { useState, useEffect } from "react";
// import { Star } from "lucide-react";
// import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// import { cn } from "@/lib/utils";
// import type { FavouriteSeat } from "../types/dashboard.types";
// import FavSeatBookingDialog from "./FavSeatBookingDialog";

// type FavouriteSeatCardProps = {
//   seat: FavouriteSeat | null;
//   secondFavSeat: FavouriteSeat | null;
//   canBookSelf: boolean;
// };

// export function FavouriteSeatCard({ seat, secondFavSeat, canBookSelf }: FavouriteSeatCardProps) {
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const [restoreOnOpen, setRestoreOnOpen] = useState(false);

//   useEffect(() => {
//     if (!seat) return;
//     const params = new URLSearchParams(window.location.search);
//     if (params.get("openFavDialog") === "1") {
//       setRestoreOnOpen(true);
//       setDialogOpen(true);
//       const url = new URL(window.location.href);
//       url.searchParams.delete("openFavDialog");
//       window.history.replaceState({}, "", url.toString());
//     }
//   }, [seat]);

//   if (!seat) {
//     return (
//       <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
//         <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
//           <p className="text-[12.5px] font-semibold text-gray-900">Favourite seat</p>
//         </div>
//         <div className="p-3">
//           <div className="px-1 py-6 flex flex-col items-center gap-2">
//             <Star className="w-8 h-8 text-gray-200" />
//             <p className="text-[11px] text-gray-400 text-center">
//               No favourite seat saved yet.<br />Star a seat when booking to save it.
//             </p>
//           </div>
//         </div>
//       </div>
//     );
//   }
//   // For "IDR-BR-F1-A-101" → take last two segments → "A101"
//   const parts = seat.label.split("-");
//   const avatarLabel = parts.length >= 2
//     ? (parts[parts.length - 2] + parts[parts.length - 1]).slice(0, 4)
//     : seat.label.replace(/^seat\s*/i, "").slice(0, 4);

//   return (
//     <>
//       <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
//         <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
//           <p className="text-[12.5px] font-semibold text-gray-900">Favourite seat</p>
//           {canBookSelf && (
//             <button
//               onClick={() => setDialogOpen(true)}
//               className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 transition-colors"
//             >
//               Quick book →
//             </button>
//           )}
//         </div>
//         <div className="px-3 py-2.5">
//           <FavouriteSeatTile
//             seat={seat}
//             avatarLabel={avatarLabel}
//             onClick={canBookSelf ? () => setDialogOpen(true) : null}
//           />
//         </div>
//       </div>

//       {canBookSelf && (
//         <FavSeatBookingDialog
//           seat={seat}
//           secondFavSeat={secondFavSeat}
//           open={dialogOpen}
//           onClose={() => { setDialogOpen(false); setRestoreOnOpen(false); }}
//           restoreOnOpen={restoreOnOpen}
//         />
//       )}
//     </>
//   );
// }

// type FavouriteSeatTileProps = {
//   seat: FavouriteSeat;
//   avatarLabel: string;
//   onClick: (() => void) | null;
// };

// function FavouriteSeatTile({ seat, avatarLabel, onClick }: FavouriteSeatTileProps) {
//   const tileClassName = cn(
//     "w-full flex items-center gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 transition-colors duration-200 group",
//     onClick && "hover:bg-indigo-100/60 cursor-pointer"
//   );

//   const content = (
//     <>
//       <Avatar size="lg" className="rounded-xl bg-orange-400 group-hover:bg-orange-500 transition-colors duration-200 shrink-0">
//         <AvatarFallback className="rounded-xl bg-transparent text-white text-[10px] font-bold leading-none text-center">
//           {avatarLabel}
//         </AvatarFallback>
//       </Avatar>
//       <div className="min-w-0 flex-1">
//         <div className="flex items-center gap-1.5 min-w-0">
//           <p className="text-[12px] font-semibold text-gray-900 leading-snug truncate">{seat.label}</p>
//           <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0 group-hover:scale-110 transition-transform duration-200" />
//         </div>
//         <p className="text-[10.5px] text-gray-500 leading-snug truncate mt-0.5">{seat.location}</p>
//       </div>
//     </>
//   );

//   if (onClick) {
//     return (
//       <button type="button" onClick={onClick} className={tileClassName}>
//         {content}
//       </button>
//     );
//   }

//   return <div className={tileClassName}>{content}</div>;
// }


"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  // For "IDR-BR-F1-A-101" → take last two segments → "A101"
  const parts = seat.label.split("-");
  const avatarLabel = parts.length >= 2
    ? (parts[parts.length - 2] + parts[parts.length - 1]).slice(0, 4)
    : seat.label.replace(/^seat\s*/i, "").slice(0, 4);

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-[12.5px] font-semibold text-gray-900">Favourite seat</p>
          {canBookSelf && (
            <button
              onClick={() => setDialogOpen(true)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 transition-colors"
            >
              Quick book →
            </button>
          )}
        </div>
        <div className="px-3 py-2">
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
    "w-full flex items-center gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 transition-colors duration-200 group",
    onClick && "hover:bg-indigo-100/60 cursor-pointer"
  );

  const content = (
    <>
      <Avatar size="default" className="rounded-xl bg-orange-400 group-hover:bg-orange-500 transition-colors duration-200 shrink-0">
        <AvatarFallback className="rounded-xl bg-transparent text-white text-[10px] font-bold leading-none text-center">
          {avatarLabel}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 flex flex-col">
        <div className="flex items-center gap-1 min-w-0">
          <p className="text-[12px] font-semibold text-gray-900 leading-snug truncate min-w-0">{seat.label.trim()}</p>
          <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0 group-hover:scale-110 transition-transform duration-200" />
        </div>
        <p className="text-[10.5px] text-gray-500 leading-snug truncate mt-0.5">{seat.location.trim()}</p>
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