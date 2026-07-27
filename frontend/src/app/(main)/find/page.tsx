import { Suspense } from "react";
import FindTeammatePage from "@/features/findteammate/components/FindTeammatePage";
import { FindTeammateSkeleton } from "@/features/findteammate/components/FindTeammateSkeleton";

export default function FindPage() {
  return (
    <Suspense fallback={<FindTeammateSkeleton />}>
      <FindTeammatePage />
    </Suspense>
  );
}
