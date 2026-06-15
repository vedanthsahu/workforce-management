import { Suspense } from "react";
import ProfilePage from "@/features/userProfile/components/ProfilePage";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center bg-[#F7F8FC]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    }>
      <ProfilePage />
    </Suspense>
  );
}
