import * as React from "react"
import type { ComponentProps } from "react"

import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

type HugeIcon = ComponentProps<typeof HugeiconsIcon>["icon"]

export type FacetedFilterOption = {
  label: string
  value: string
  count?: number
  icon?: HugeIcon
  color?: string
  group?: string
}

type DataTableFacetedFilterProps = {
  title: string
  options: FacetedFilterOption[]
  selectedValues: string[]
  onSelectedValuesChange: (values: string[]) => void
  emptyMessage?: string
  maxVisibleBadges?: number
  icon?: HugeIcon
}

type DataTableRangeFilterProps = {
  title: string
  min: number
  max: number
  value: [number, number]
  onValueChange: (value: [number, number]) => void
  formatValue?: (value: number) => string
  icon?: HugeIcon
}

export function DataTableFacetedFilter({
  title,
  options,
  selectedValues,
  onSelectedValuesChange,
  emptyMessage = "No results found.",
  maxVisibleBadges = 2,
  icon,
}: DataTableFacetedFilterProps) {
  const selectedSet = React.useMemo(
    () => new Set(selectedValues),
    [selectedValues]
  )
  const groupedOptions = React.useMemo(() => {
    const nextGroups: Array<{
      key: string
      label?: string
      options: FacetedFilterOption[]
    }> = []
    const indexByKey = new Map<string, number>()

    for (const option of options) {
      const key = option.group ?? "__ungrouped__"
      const existingIndex = indexByKey.get(key)

      if (existingIndex == null) {
        indexByKey.set(key, nextGroups.length)
        nextGroups.push({
          key,
          label: option.group,
          options: [option],
        })
        continue
      }

      nextGroups[existingIndex].options.push(option)
    }

    return nextGroups
  }, [options])

  const selectedOptions = React.useMemo(
    () => options.filter((option) => selectedSet.has(option.value)),
    [options, selectedSet]
  )

  const toggleValue = (value: string) => {
    const nextValues = new Set(selectedValues)

    if (nextValues.has(value)) {
      nextValues.delete(value)
    } else {
      nextValues.add(value)
    }

    onSelectedValuesChange(Array.from(nextValues))
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed bg-background"
          />
        }
      >
        {icon ? (
          <HugeiconsIcon icon={icon} strokeWidth={2} data-icon="inline-start" />
        ) : null}
        <span>{title}</span>
        {selectedOptions.length > 0 ? (
          <>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <Badge
              variant="secondary"
              className="rounded-sm px-1 font-normal lg:hidden"
            >
              {selectedOptions.length}
            </Badge>
            <div className="hidden items-center gap-1 lg:flex">
              {selectedOptions.length > maxVisibleBadges ? (
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal"
                >
                  {selectedOptions.length} selected
                </Badge>
              ) : (
                selectedOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {option.label}
                  </Badge>
                ))
              )}
            </div>
          </>
        ) : null}
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${title.toLowerCase()}`} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {groupedOptions.map((group, groupIndex) => (
              <React.Fragment key={group.key}>
                <CommandGroup heading={group.label}>
                  {group.options.map((option) => {
                    const isSelected = selectedSet.has(option.value)

                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => toggleValue(option.value)}
                      >
                        <div
                          className={cn(
                            "flex size-4 items-center justify-center rounded-[4px] border",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input [&_svg]:invisible"
                          )}
                        >
                          <HugeiconsIcon
                            icon={Tick02Icon}
                            strokeWidth={2}
                            className="size-3.5 text-primary-foreground"
                          />
                        </div>
                        {option.icon ? (
                          <HugeiconsIcon
                            icon={option.icon}
                            strokeWidth={2}
                            className="shrink-0"
                            color={option.color}
                          />
                        ) : null}
                        <span className="truncate">{option.label}</span>
                        {typeof option.count === "number" ? (
                          <span className="ml-auto flex size-4 items-center justify-center font-mono text-xs text-muted-foreground">
                            {option.count}
                          </span>
                        ) : null}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
                {groupIndex < groupedOptions.length - 1 ? (
                  <CommandSeparator />
                ) : null}
              </React.Fragment>
            ))}
            {selectedOptions.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    className="justify-center text-center"
                    onSelect={() => onSelectedValuesChange([])}
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function DataTableRangeFilter({
  title,
  min,
  max,
  value,
  onValueChange,
  formatValue = (nextValue) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
      nextValue
    ),
  icon,
}: DataTableRangeFilterProps) {
  const clampedMax = Math.max(min, max)
  const currentValue: [number, number] = [
    Math.max(min, Math.min(value[0], clampedMax)),
    Math.max(min, Math.min(value[1], clampedMax)),
  ]
  const updateRange = React.useCallback(
    (nextMin: number, nextMax: number) => {
      const normalizedMin = Math.max(min, Math.min(nextMin, clampedMax))
      const normalizedMax = Math.max(
        normalizedMin,
        Math.min(nextMax, clampedMax)
      )
      onValueChange([
        Number(normalizedMin.toFixed(2)),
        Number(normalizedMax.toFixed(2)),
      ])
    },
    [clampedMax, min, onValueChange]
  )
  const step =
    clampedMax <= 100 ? 1 : Math.max(1, Number((clampedMax / 100).toFixed(2)))
  const isFiltered = currentValue[0] > min || currentValue[1] < clampedMax
  const rangeLabel = `${formatValue(currentValue[0])} - ${formatValue(currentValue[1])}`

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed bg-background"
            disabled={clampedMax <= min}
          />
        }
      >
        {icon ? (
          <HugeiconsIcon icon={icon} strokeWidth={2} data-icon="inline-start" />
        ) : null}
        <span>{title}</span>
        {isFiltered ? (
          <>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <Badge variant="secondary" className="rounded-sm px-1 font-normal">
              {rangeLabel}
            </Badge>
          </>
        ) : null}
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-4" align="start">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-foreground">{title}</span>
            <span className="text-muted-foreground">{rangeLabel}</span>
          </div>
          <Slider
            min={min}
            max={clampedMax}
            step={step}
            value={currentValue}
            onValueChange={(nextValue) => {
              const [nextMin = min, nextMax = clampedMax] =
                nextValue as number[]
              updateRange(nextMin, nextMax)
            }}
            disabled={clampedMax <= min}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Min
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min={min}
                max={currentValue[1]}
                step="0.01"
                value={String(currentValue[0])}
                onChange={(event) => {
                  const nextValue = Number(event.target.value)

                  if (!Number.isNaN(nextValue)) {
                    updateRange(nextValue, currentValue[1])
                  }
                }}
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Max
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min={currentValue[0]}
                max={clampedMax}
                step="0.01"
                value={String(currentValue[1])}
                onChange={(event) => {
                  const nextValue = Number(event.target.value)

                  if (!Number.isNaN(nextValue)) {
                    updateRange(currentValue[0], nextValue)
                  }
                }}
                className="h-8"
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatValue(min)}</span>
            <span>{formatValue(clampedMax)}</span>
          </div>
          {isFiltered ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onValueChange([min, clampedMax])}
            >
              Reset range
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
