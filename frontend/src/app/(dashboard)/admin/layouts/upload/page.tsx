
// // "use client";

// // import { useState } from "react";
// // // import AdminTopbar from "@/features/admin/components/AdminTopbar";
// // import LayoutForm from "@/features/uploadlayouts/components/LayoutForm";
// // import LayoutGuidelines from "@/features/uploadlayouts/components/LayoutGuidelines";
// // import LayoutSummary from "@/features/uploadlayouts/components/LayoutSummary";
// // import { useLayoutForm } from "@/features/uploadlayouts/hooks/useLayoutForm";
// // import Link from "next/link";
// // import { Toaster } from "sonner";

// // export default function UploadLayoutPage() {
// //   const { formData, setFormData } = useLayoutForm();

// //   return (
// //     <>
// //       {/* <AdminTopbar /> */}
// //       <main className="flex-1 p-6 bg-gray-50 space-y-6 overflow-y-auto">
// //         <div className="flex justify-between items-center">
// //           <div>
// //             <h1 className="text-xl font-semibold">Upload New Floor Layout</h1>
// //             <p className="text-sm text-muted-foreground">
// //               Upload an SVG layout file for a floor and create a new layout version.
// //             </p>
// //           </div>
// //           <Link href="/admin/layouts" className="border px-4 py-2 rounded-md text-sm">
// //             ← Back to Floor Layouts
// //           </Link>
// //         </div>

// //         <div className="grid grid-cols-3 gap-6">
// //           <LayoutForm formData={formData} setFormData={setFormData} />
// //           <div className="space-y-6">
// //             <LayoutGuidelines />
// //             <LayoutSummary formData={formData} />
// //             <Toaster richColors position="top-right" />
// //           </div>
// //         </div>
// //       </main>
// //     </>
// //   );
// // }

// "use client";

// import { useSearchParams } from "next/navigation";
// // import AdminTopbar from "@/features/admin/components/AdminTopbar";
// import LayoutForm from "@/features/uploadlayouts/components/LayoutForm";
// import LayoutGuidelines from "@/features/uploadlayouts/components/LayoutGuidelines";
// import LayoutSummary from "@/features/uploadlayouts/components/LayoutSummary";
// import { useLayoutForm } from "@/features/uploadlayouts/hooks/useLayoutForm";
// import Link from "next/link";
// import { Toaster } from "sonner";

// export default function UploadLayoutPage() {
//   const params = useSearchParams();

//   const siteId     = params.get("siteId")     ? Number(params.get("siteId"))     : null;
//   const buildingId = params.get("buildingId") ? Number(params.get("buildingId")) : null;
//   const floorId    = params.get("floorId")    ? Number(params.get("floorId"))    : null;

//   const { formData, setFormData } = useLayoutForm({
//     initialSiteId:     siteId,
//     initialBuildingId: buildingId,
//     initialFloorId:    floorId,
//   });

//   return (
//     <>
//       {/* <AdminTopbar /> */}
//       <main className="flex-1 p-6 bg-gray-50 space-y-6 overflow-y-auto">
//         <div className="flex justify-between items-center">
//           <div>
//             <h1 className="text-xl font-semibold">Upload New Floor Layout</h1>
//             <p className="text-sm text-muted-foreground">
//               Upload an SVG layout file for a floor and create a new layout version.
//             </p>
//           </div>
//           <Link href="/admin/layouts" className="border px-4 py-2 rounded-md text-sm">
//             ← Back to Floor Layouts
//           </Link>
//         </div>

//         <div className="grid grid-cols-3 gap-6">
//           <LayoutForm formData={formData} setFormData={setFormData} />
//           <div className="space-y-6">
//             <LayoutGuidelines />
//             <LayoutSummary formData={formData} />
//             <Toaster richColors position="top-right" />
//           </div>
//         </div>
//       </main>
//     </>
//   );
// }

// app/admin/layouts/upload/page.tsx
// Thin Server Component wrapper — same pattern as the layouts page.
// Required because UploadLayoutPage uses useSearchParams().

import { Suspense } from "react";
import UploadLayoutPage from "./UploadLayoutPage";
import { Toaster } from "sonner";

function PageSkeleton() {
  return (
    <main className="flex-1 p-6 bg-gray-50 space-y-6 overflow-y-auto animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-6 w-52 bg-gray-200 rounded" />
          <div className="h-4 w-80 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-36 bg-gray-200 rounded-md" />
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-96 bg-gray-100 rounded-xl" />
        <div className="space-y-4">
          <div className="h-48 bg-gray-100 rounded-xl" />
          <div className="h-32 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <>
      <Suspense fallback={<PageSkeleton />}>
        <UploadLayoutPage />
      </Suspense>
      <Toaster richColors position="top-right" />
    </>
  );
}