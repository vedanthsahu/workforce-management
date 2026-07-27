"use client";

type Props = {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
};

export default function AdminHeader({ selectedDate, setSelectedDate }: Props) {
  void selectedDate;
  void setSelectedDate;
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

      {/* LEFT */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Dashboard</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Overview of your workspace
        </p>
      </div>
    </div>
  );
}