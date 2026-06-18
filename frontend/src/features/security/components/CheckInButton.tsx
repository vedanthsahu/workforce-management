

"use client";

import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Visitor } from "../types/security.types";

type Props = {
  visitor: Visitor;
  isLoading: boolean;
  onCheckIn: (visitId: string) => void;
  onCheckOut: (visitId: string) => void;
};

export function CheckInButton({ visitor, isLoading, onCheckIn, onCheckOut }: Props) {
  return (
    <div className="flex items-center gap-1.5 justify-end">
      {visitor.status === "SCHEDULED" && (
        <Button
          type="button"
          size="sm"
          disabled={isLoading}
          onClick={() => onCheckIn(visitor.id)}
          className="h-8 text-xs"
        >
          {isLoading ? "Checking in…" : "Check in"}
        </Button>
      )}

      {(visitor.status === "CHECKED_IN" || visitor.status === "OVERDUE") && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isLoading}
          onClick={() => onCheckOut(visitor.id)}
          className="h-8 text-xs"
        >
          {isLoading ? "Checking out…" : "Check out"}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem className="text-xs cursor-pointer">View details</DropdownMenuItem>
          <DropdownMenuItem className="text-xs cursor-pointer">Edit visit</DropdownMenuItem>
          <DropdownMenuItem className="text-xs cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50">
            Cancel visit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}


// "use client";

// import { MoreVertical, LogIn, LogOut } from "lucide-react";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import type { Visitor } from "../types/security.types";

// type Props = {
//   visitor: Visitor;
//   isLoading: boolean;
//   onCheckIn: (visitId: string) => void;
//   onCheckOut: (visitId: string) => void;
// };

// export function CheckInButton({ visitor, isLoading, onCheckIn, onCheckOut }: Props) {
//   return (
//     <div className="flex items-center gap-1.5 justify-end">
//       {visitor.status === "SCHEDULED" && (
//         <button
//           type="button"
//           disabled={isLoading}
//           onClick={() => onCheckIn(visitor.id)}
//           className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 disabled:opacity-50 transition-colors"
//         >
//           <LogIn className="w-3 h-3" />
//           {isLoading ? "Checking in…" : "Check in"}
//         </button>
//       )}

//       {(visitor.status === "CHECKED_IN" || visitor.status === "OVERDUE") && (
//         <button
//           type="button"
//           disabled={isLoading}
//           onClick={() => onCheckOut(visitor.id)}
//           className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors"
//         >
//           <LogOut className="w-3 h-3" />
//           {isLoading ? "Checking out…" : "Check out"}
//         </button>
//       )}

//       <DropdownMenu>
//         <DropdownMenuTrigger
//           className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
//         >
//           <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
//         </DropdownMenuTrigger>
//         <DropdownMenuContent align="end" className="w-44">
//           <DropdownMenuItem className="text-xs cursor-pointer">View details</DropdownMenuItem>
//           <DropdownMenuItem className="text-xs cursor-pointer">Edit visit</DropdownMenuItem>
//           <DropdownMenuItem className="text-xs cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50">
//             Cancel visit
//           </DropdownMenuItem>
//         </DropdownMenuContent>
//       </DropdownMenu>
//     </div>
//   );
// }