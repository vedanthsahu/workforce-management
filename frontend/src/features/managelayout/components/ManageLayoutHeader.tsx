// "use client";

// import { useRouter } from "next/navigation";

// export default function ManageLayoutHeader() {
//   const router = useRouter();

//   return (
//     <div className="flex justify-between items-center">

//       {/* LEFT */}
//       <div>
//         <h1 className="text-xl font-semibold">
//           Floor Layout Management
//         </h1>
//         <p className="text-sm text-muted-foreground">
//           Upload, manage and publish floor layouts
//         </p>
//       </div>

//       {/* RIGHT BUTTONS */}
//       <div className="flex gap-3">

//         {/* View Change History */}
//         <button className="border px-4 py-2 rounded-md text-sm">
//           View Change History
//         </button>

//         {/* Upload New Layout */}
//         <button
//           onClick={() => router.push("/admin/layouts/upload")}
//           className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm"
//         >
//           Upload New Layout
//         </button>

//       </div>
//     </div>
//   );
// }

"use client";

import { useRouter } from "next/navigation";
import { Layout } from "../types/layout.types";

interface ManageLayoutHeaderProps {
  layout?: Layout | null;
  onPublish?: () => void;
  publishing?: boolean;
}

function UploadIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function PublishIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export default function ManageLayoutHeader({
  layout,
  onPublish,
  publishing = false,
}: ManageLayoutHeaderProps) {
  const router = useRouter();

  const canPublish = layout && !layout.is_published && layout.status !== "ARCHIVED";

  return (
    <div className="flex justify-between items-center">

      {/* LEFT */}
      <div>
        <h1 className="text-xl font-semibold">Floor Layout Management</h1>
        <p className="text-sm text-muted-foreground">
          Review, manage and publish floor layouts for employee bookings
        </p>
      </div>

      {/* RIGHT BUTTONS */}
      <div className="flex gap-3">

        {/* View Change History */}
      

        {/* Upload New Layout */}
        <button
          onClick={() => router.push("/admin/layouts/upload")}
          className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          <UploadIcon />
          Upload New Layout
        </button>

          {/* <button
          className="border px-4 py-2 rounded-md text-sm hover:bg-muted transition-colors bg-primary"
          onClick={() => router.push("/admin/layouts/publish")}
        >
          Publish Layout
        </button> */}

        {/* Publish Layout — only shown when layout is a draft */}
        {canPublish && (
          <button
            onClick={onPublish}
            disabled={publishing}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            <PublishIcon />
            {publishing ? "Publishing…" : "Publish Layout"}
          </button>
        )}
      </div>
    </div>
  );
}