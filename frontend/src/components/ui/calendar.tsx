"use client"

import * as React from "react"
import {
  DayPicker,
  type DayButton,
  type Locale,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react"

// Styling here is plain, fixed-size Tailwind utility classes (h-8/w-8,
// rounded-full, indigo accent) instead of shadcn's default recipe, which
// threads sizing through CSS custom properties (`size-(--cell-size)`,
// `rounded-(--cell-radius)`) — those didn't render correctly in this
// project's Tailwind setup. shadcn explicitly treats this file as yours to
// own/edit, not a black-box package, so simplifying the styling instead of
// chasing the token mismatch is expected practice.
//
// react-day-picker renders `month_grid` as a real <table>, `week` as <tr>,
// `day`/`weekday` as <td>/<th> — NOT as divs. An earlier pass styled
// `weekdays`/`week` with `flex`, which broke layout: per the CSS Display
// spec, an "internal table" display value (table-cell, on the <td>/<th>
// children) is "blockified" to `block` when its parent is `display: flex`,
// so each day cell dropped onto its own full-width line instead of sitting
// in a 7-column row. Table elements should use actual table layout, not
// flex — `table-fixed` on the <table> gives equal-width columns natively,
// which is exactly what a 7-day grid needs, with no flex involved.
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: "w-fit",
        months: "flex flex-col gap-3",
        // No `w-full` here — react-day-picker's cells (button_previous/
        // button_next/day) all have fixed pixel sizes (h-7/h-8 w-7/w-8), so
        // the table's natural content width is already exactly what's
        // wanted (7 * 32px). `w-full` here means "stretch to 100% of your
        // container," and the container is this floating popup, which is
        // itself meant to shrink-wrap to ITS content — that circular
        // reference (stretch-to-fit inside shrink-to-fit) is what blew the
        // whole popover out to the viewport's width. Let every level here
        // size itself from its content instead of stretching.
        // `relative` is required here: `nav` below is `absolute inset-x-0`
        // so its prev/next buttons pin to this box's own left/right edges
        // (overlaying the centered caption). Without a positioned ancestor,
        // `inset-x-0` resolves against whatever distant ancestor actually
        // has `position` set instead — another way this ended up stretching
        // to the viewport instead of the calendar's own width.
        month: "relative flex flex-col gap-2",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between px-1",
        button_previous:
          "h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-40 disabled:pointer-events-none",
        button_next:
          "h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-40 disabled:pointer-events-none",
        month_caption: "flex h-8 items-center justify-center text-[13px] font-semibold text-gray-800",
        dropdowns: "flex h-8 items-center justify-center gap-1.5 text-[13px] font-medium",
        dropdown_root: "relative rounded-md",
        dropdown: "absolute inset-0 opacity-0",
        caption_label: "font-semibold select-none text-[13px] text-gray-800",
        month_grid: "border-collapse",
        weekdays: "",
        weekday: "h-8 text-[10px] font-semibold uppercase tracking-wide text-gray-400 text-center align-middle select-none",
        week: "",
        day: "p-0 h-8 w-8 text-center align-middle select-none",
        range_start: "rounded-l-full bg-indigo-50",
        range_middle: "bg-indigo-50",
        range_end: "rounded-r-full bg-indigo-50",
        today: "[&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-indigo-400",
        outside: "text-gray-300 aria-selected:text-gray-400",
        disabled: "text-gray-300 opacity-60",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => (
          <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />
        ),
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn("size-4", className)} {...props} />
          }
          if (orientation === "right") {
            return <ChevronRightIcon className={cn("size-4", className)} {...props} />
          }
          return <ChevronDownIcon className={cn("size-4", className)} {...props} />
        },
        DayButton: ({ ...props }) => <CalendarDayButton locale={locale} {...props} />,
        WeekNumber: ({ children, ...props }) => (
          <td {...props}>
            <div className="flex h-8 w-8 items-center justify-center text-center">{children}</div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isSelected = modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle

  return (
    <Button
      ref={ref}
      variant="ghost"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={isSelected}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-full p-0 text-[12px] font-normal text-gray-700",
        "hover:bg-indigo-50",
        "data-[selected-single=true]:bg-indigo-600 data-[selected-single=true]:text-white data-[selected-single=true]:font-semibold data-[selected-single=true]:hover:bg-indigo-600",
        modifiers.disabled && "pointer-events-none",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
