"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useFloorForm } from "../hooks/useFloorForm";

export default function FloorForm() {
  const router = useRouter();

  const {
    loading,
    sites,
    buildings,
    formData,
    handleChange,
    handleSubmit,
  } = useFloorForm();

  const isDisabled =
    !formData.site_id ||
    !formData.building_id ||
    !formData.floor_code ||
    !formData.floor_name;

  const saveFloor = async () => {
    const success =
      await handleSubmit();

    if (success) {
      router.push(
        "/admin/floors"
      );
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/floors"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Floors
          </Link>

          <h1 className="text-4xl font-bold text-gray-900 mt-4">
            Add Floor
          </h1>

          <p className="text-gray-500 mt-2">
            Enter the floor details below
            to create a new floor.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/floors"
            className="px-5 py-2 border rounded-xl text-sm"
          >
            Cancel
          </Link>

          <button
            disabled={
              isDisabled || loading
            }
            onClick={saveFloor}
            className={`px-5 py-2 rounded-xl text-sm font-medium ${
              isDisabled
                ? "bg-gray-300 text-white cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Save Floor
          </button>
        </div>
      </div>

      {/* FORM CARD */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">

        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Basic Information
          </h3>
        </div>

        <div className="p-6 space-y-6">

          {/* ROW 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* SITE */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Site *
              </label>

              <select
                value={
                  formData.site_id
                }
                onChange={(e) =>
                  handleChange(
                    "site_id",
                    e.target.value
                  )
                }
                className="w-full border rounded-xl px-4 py-3"
              >
                <option value="">
                  Select Site
                </option>

                {sites.map(
                  (site: any) => (
                    <option
                      key={
                        site.site_id
                      }
                      value={
                        site.site_id
                      }
                    >
                      {
                        site.site_name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* BUILDING */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Building *
              </label>

              <select
                value={
                  formData.building_id
                }
                disabled={
                  !formData.site_id
                }
                onChange={(e) =>
                  handleChange(
                    "building_id",
                    e.target.value
                  )
                }
                className="w-full border rounded-xl px-4 py-3"
              >
                <option value="">
                  Select Building
                </option>

                {buildings.map(
                  (
                    building: any
                  ) => (
                    <option
                      key={
                        building.building_id
                      }
                      value={
                        building.building_id
                      }
                    >
                      {
                        building.building_name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* FLOOR CODE */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Floor Code *
              </label>

              <input
                value={
                  formData.floor_code
                }
                onChange={(e) =>
                  handleChange(
                    "floor_code",
                    e.target.value
                  )
                }
                placeholder="Enter floor code"
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>
          </div>

          {/* ROW 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* FLOOR NAME */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Floor Name *
              </label>

              <input
                value={
                  formData.floor_name
                }
                onChange={(e) =>
                  handleChange(
                    "floor_name",
                    e.target.value
                  )
                }
                placeholder="Enter floor name"
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            {/* STATUS */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Status *
              </label>

              <select
                value={
                  formData.status
                }
                onChange={(e) =>
                  handleChange(
                    "status",
                    e.target.value
                  )
                }
                className="w-full border rounded-xl px-4 py-3"
              >
                <option value="ACTIVE">
                  ACTIVE
                </option>

                <option value="INACTIVE">
                  INACTIVE
                </option>
              </select>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}