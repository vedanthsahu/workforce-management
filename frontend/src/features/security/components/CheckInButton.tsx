"use client";

import { Button } from "@/components/ui/button";
import type { Visitor } from "../types/security.types";

type Props = {
  visitor: Visitor;
  isLoading: boolean;
  onCheckIn: (guestVisitId: string) => void;
  onCheckOut: (guestVisitId: string) => void;
};

// Note: the kebab "View details / Edit visit / Cancel visit" menu lives in
// VisitorTable's <RowMenu />, so this component only renders the primary
// check-in / check-out action — no duplicate dropdown here.
export function CheckInButton({ visitor, isLoading, onCheckIn, onCheckOut }: Props) {
  if (visitor.status === "SCHEDULED") {
    return (
      <Button
        type="button"
        size="sm"
        disabled={isLoading}
        onClick={() => onCheckIn(visitor.id)}
        className="h-8 text-xs"
      >
        {isLoading ? "Checking in…" : "Check in"}
      </Button>
    );
  }

  if (visitor.status === "CHECKED_IN" || visitor.status === "OVERDUE") {
    return (
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
    );
  }

  return <span className="inline-block w-[80px] h-8" />;
}