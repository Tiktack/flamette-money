import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type ReportIntervalValue = "Auto" | "Day" | "Week" | "Month"

const intervalItems = (["Auto", "Day", "Week", "Month"] as const).map((value) => ({ value, label: value }))

/** Shared Auto/Day/Week/Month interval picker for the analytics report card headers. */
export function IntervalSelect({ value, onValueChange }: { value: ReportIntervalValue; onValueChange: (value: ReportIntervalValue) => void }) {
  return (
    <Select value={value} items={intervalItems} onValueChange={(next) => onValueChange((next as ReportIntervalValue) ?? "Auto")}>
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="Auto" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {intervalItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
