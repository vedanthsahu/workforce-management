"use client";

type Props = {
  layout: any;
};

export default function LayoutDetails({ layout }: Props) {
  if (!layout) {
    return (
      <div className="border rounded-md p-5 bg-white">
        <p className="text-sm text-gray-400">No layout selected</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md p-5 bg-white space-y-5">

      {/* HEADER */}
      <div>
        <h2 className="font-semibold text-gray-800 text-sm">
          Layout Details
        </h2>

        <p className="text-xs text-gray-500 mt-1">
          {layout.layout_name || "No description available"}
        </p>
      </div>

      {/* DIVIDER */}
      <div className="border-t" />

      {/* METRICS (like your image) */}
      <div className="space-y-4">

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total Seats</span>
          <span className="font-semibold">--</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Available</span>
          <span className="font-semibold text-green-600">--</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Booked</span>
          <span className="font-semibold text-red-500">--</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Blocked</span>
          <span className="font-semibold text-gray-600">--</span>
        </div>

      </div>

      {/* DIVIDER */}
      <div className="border-t" />

      {/* EXTRA DETAILS */}
      <div className="space-y-2 text-sm">

        <div className="flex justify-between">
          <span className="text-gray-500">Version</span>
          <span className="font-medium">v{layout.version_no}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>
          <span className="font-medium">{layout.status}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Uploaded By</span>
          <span className="font-medium">{layout.uploaded_by_name}</span>
        </div>

      </div>

      {/* ACTION BUTTONS */}
      <div className="pt-2 space-y-2">

        <button className="w-full border rounded-md p-2 text-sm hover:bg-gray-50">
          Manage Seats
        </button>

        <button className="w-full border rounded-md p-2 text-sm hover:bg-gray-50">
          Manage Amenities
        </button>

        <button className="w-full border rounded-md p-2 text-sm hover:bg-gray-50">
          Manage Blocked Areas
        </button>

      </div>

    </div>
  );
}