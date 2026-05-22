"use client";

import { useRouter } from "next/navigation";

export default function ManageLayoutHeader() {
  const router = useRouter();

  return (
    <div className="flex justify-between items-center">

      {/* LEFT */}
      <div>
        <h1 className="text-xl font-semibold">
          Floor Layout Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload, manage and publish floor layouts
        </p>
      </div>

      {/* RIGHT BUTTONS */}
      <div className="flex gap-3">

        {/* View Change History */}
        <button className="border px-4 py-2 rounded-md text-sm">
          View Change History
        </button>

        {/* Upload New Layout */}
        <button
          onClick={() => router.push("/admin/layouts/upload")}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm"
        >
          Upload New Layout
        </button>

      </div>
    </div>
  );
}