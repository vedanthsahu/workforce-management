"use client";

type Props = {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
};

export default function AdminHeader({ selectedDate, setSelectedDate }: Props) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

      {/* LEFT */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your workspace
        </p>
      </div>

      {/* RIGHT FILTERS */}
      <div className="flex items-center gap-3">

        {/* Date */}
        <div className="flex items-center gap-2 h-9 px-3 py-2 rounded-md border bg-white text-sm w-full sm:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="outline-none bg-transparent"
          />
          <span>Filter by date</span>
        </div>

      </div>
    </div>
  );
}