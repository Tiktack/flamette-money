import { ActionIcon, Chip, Group, Text } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import type { MouseEvent } from 'react'
import { useMemo } from 'react'
import { useSharedDateRangeFilters } from '../lib/state/sharedDateRangeFilters'
import classes from '../routes/page.module.css'

export function SharedDateRangeChips() {
  const filters = useSharedDateRangeFilters()

  const formatDateInput = (value: Date) => {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const monthLabel = useMemo(() => {
    const anchor = filters.monthAnchor
      ? new Date(`${filters.monthAnchor}T00:00:00`)
      : new Date()
    return anchor.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  }, [filters.monthAnchor])

  const yearLabel = useMemo(
    () => String(filters.yearAnchor || new Date().getFullYear()),
    [filters.yearAnchor],
  )

  const customRangeValue = useMemo(() => {
    const start = filters.customStartDate || null
    const end = filters.customEndDate || null
    return [start, end] as [string | null, string | null]
  }, [filters.customEndDate, filters.customStartDate])

  const handleRangeChange = (value: [string | null, string | null]) => {
    const [start, end] = value
    filters.setCustomStartDate(start ?? '')
    filters.setCustomEndDate(end ?? '')
  }

  const shiftCustomRange = (direction: -1 | 1) => {
    if (!filters.customStartDate || !filters.customEndDate) {
      return
    }

    const start = new Date(`${filters.customStartDate}T00:00:00`)
    const end = new Date(`${filters.customEndDate}T00:00:00`)
    const dayDiff = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    const span = Math.max(1, dayDiff + 1)
    const offset = direction * span

    const nextStart = new Date(start)
    nextStart.setDate(start.getDate() + offset)

    const nextEnd = new Date(end)
    nextEnd.setDate(end.getDate() + offset)

    filters.setCustomStartDate(formatDateInput(nextStart))
    filters.setCustomEndDate(formatDateInput(nextEnd))
  }

  const customLabel = useMemo(() => {
    if (!filters.customStartDate || !filters.customEndDate) {
      return 'Custom range'
    }

    const start = new Date(`${filters.customStartDate}T00:00:00`)
    const end = new Date(`${filters.customEndDate}T00:00:00`)

    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
  }, [filters.customEndDate, filters.customStartDate])

  const handleChipClick = (event: MouseEvent<HTMLInputElement>) => {
    if (event.currentTarget.value === filters.preset) {
      setTimeout(() => filters.setPreset('all'), 0)
    }
  }

  return (
    <Group gap="sm" wrap="wrap" justify="space-between">
      <Group gap="sm" wrap="wrap">
        <Chip.Group
          multiple={false}
          value={filters.preset}
          onChange={(value) => {
            if (!value) {
              filters.setPreset('all')
              return
            }

            filters.setPreset(value as 'month' | 'year' | 'all' | 'custom')
          }}
        >
          <Group gap="xs" wrap="wrap">
            <Chip value="month" variant="light" onClick={handleChipClick}>
              Month
            </Chip>
            <Chip value="year" variant="light" onClick={handleChipClick}>
              Year
            </Chip>
            <Chip value="all" variant="light" onClick={handleChipClick}>
              All time
            </Chip>
            <Chip value="custom" variant="light" onClick={handleChipClick}>
              Custom
            </Chip>
          </Group>
        </Chip.Group>

        {filters.preset === 'custom' ? (
          <DatePickerInput
            type="range"
            placeholder="Custom range"
            value={customRangeValue}
            onChange={handleRangeChange}
            valueFormat="YYYY-MM-DD"
            className={classes.rangePicker}
          />
        ) : null}
      </Group>

      {filters.preset === 'month' ? (
        <Group gap="xs" align="center" wrap="nowrap">
          <ActionIcon variant="subtle" aria-label="Previous month" onClick={() => filters.shiftMonth(-1)}>
            ‹
          </ActionIcon>
          <Text fw={600}>{monthLabel}</Text>
          <ActionIcon variant="subtle" aria-label="Next month" onClick={() => filters.shiftMonth(1)}>
            ›
          </ActionIcon>
        </Group>
      ) : null}

      {filters.preset === 'year' ? (
        <Group gap="xs" align="center" wrap="nowrap">
          <ActionIcon variant="subtle" aria-label="Previous year" onClick={() => filters.shiftYear(-1)}>
            ‹
          </ActionIcon>
          <Text fw={600}>{yearLabel}</Text>
          <ActionIcon variant="subtle" aria-label="Next year" onClick={() => filters.shiftYear(1)}>
            ›
          </ActionIcon>
        </Group>
      ) : null}

      {filters.preset === 'custom' ? (
        <Group gap="xs" align="center" wrap="nowrap">
          <ActionIcon
            variant="subtle"
            aria-label="Previous custom range"
            onClick={() => shiftCustomRange(-1)}
            disabled={!filters.customStartDate || !filters.customEndDate}
          >
            ‹
          </ActionIcon>
          <Text fw={600}>{customLabel}</Text>
          <ActionIcon
            variant="subtle"
            aria-label="Next custom range"
            onClick={() => shiftCustomRange(1)}
            disabled={!filters.customStartDate || !filters.customEndDate}
          >
            ›
          </ActionIcon>
        </Group>
      ) : null}
    </Group>
  )
}
