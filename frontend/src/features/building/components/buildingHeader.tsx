"use client";

export default function BuildingHeader() {
  return (
    <div className="mb-6">
      <p className="text-sm text-blue-500 mb-1">
        Admin / Building / Manage Buildings
      </p>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-gray-800">
            Manage Buildings
          </h1>
          <p className="text-gray-500 text-sm">
            View, add, edit and manage all buildings.
          </p>
        </div>

        <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow">
          + Add Building
        </button>
      </div>
    </div>
  );
}