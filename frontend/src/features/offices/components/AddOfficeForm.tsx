"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export default function AddOfficeForm() {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        console.log("BUTTON CLICKED");
        router.push("/admin/offices/addoffice");
      }}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm"
    >
      <Plus size={16} />
      Add Office
    </button>
  );
}