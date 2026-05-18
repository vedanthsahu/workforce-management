export default function LayoutFilters() {
  return (
    <div className="bg-white border rounded-lg p-4 grid grid-cols-4 gap-4">

      <select className="h-10 border rounded-md px-3 text-sm">
        <option>All Sites</option>
      </select>

      <select className="h-10 border rounded-md px-3 text-sm">
        <option>All Buildings</option>
      </select>

      <select className="h-10 border rounded-md px-3 text-sm">
        <option>All Floors</option>
      </select>

      <select className="h-10 border rounded-md px-3 text-sm">
        <option>All Status</option>
      </select>

    </div>
  );
}