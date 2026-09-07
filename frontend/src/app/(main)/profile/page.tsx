import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ProfilePage from "@/features/userProfile/components/ProfilePage";

function ProfileFallback() {
  return (
    <div className="p-4 sm:p-6 space-y-4 bg-[#F7F8FC]">
      {/* Profile header card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-5">
          <Skeleton className="w-20 h-20 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        </div>
      </div>
      {/* Info card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <Skeleton className="h-4 w-36 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
      {/* Preferences card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfilePage />
    </Suspense>
  );
}
