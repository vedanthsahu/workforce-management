"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseIso(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

interface DatePickerProps {
  id?: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  // Dates strictly before this (YYYY-MM-DD) are greyed out and unselectable.
  // Defaults to today.
  minDate?: string;
  className?: string;
  // Renders the calendar directly, always expanded, with no trigger button
  // or floating popover. Use this inside a Dialog/AlertDialog — a Popover's
  // calendar is a separately-positioned floating element that can render
  // past the dialog's own card edges (it isn't clipped/contained by the
  // dialog's layout), which looks broken. Inline keeps it fully inside the
  // dialog's normal document flow instead.
  inline?: boolean;
}

export function DatePicker({ id, value, onChange, minDate, className, inline = false }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? parseIso(value) : undefined;
  const min = minDate ? parseIso(minDate) : startOfToday();

  const calendar = (
    <Calendar
      mode="single"
      selected={selected}
      defaultMonth={selected}
      disabled={{ before: min }}
      onSelect={(d) => {
        if (!d) return;
        onChange(toIso(d));
        setOpen(false);
      }}
    />
  );

  if (inline) {
    return (
      <div id={id} className={cn("rounded-lg border border-gray-200 bg-white p-1 w-fit", className)}>
        {calendar}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "w-full h-9 justify-start pl-8 pr-3 relative font-normal text-[13px] text-gray-800",
              className
            )}
          >
            <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            {selected
              ? selected.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
              : "Select a date"}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        {calendar}
      </PopoverContent>
    </Popover>
  );
}
