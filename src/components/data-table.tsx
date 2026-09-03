import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type Table as ReactTable,
  type VisibilityState,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowLeftDoubleIcon,
  ArrowRight01Icon,
  ArrowRightDoubleIcon,
  LeftToRightListBulletIcon,
} from "@hugeicons/core-free-icons"

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchColumn?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: (table: ReactTable<TData>) => React.ReactNode
  action?: React.ReactNode
  emptyMessage?: string
  pageSizeOptions?: number[]
  className?: string
  // Changing this key resets pagination to the first page. Callers whose filtering happens
  // server-side (so the table only sees a new `data` array) pass their query here — a plain
  // data refresh (e.g. after deleting a row) then keeps the current page, while a filter
  // change still jumps back to page one.
  paginationResetKey?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search",
  filters,
  action,
  emptyMessage = "No results.",
  pageSizeOptions = [10, 20, 30, 40, 50],
  className,
  paginationResetKey,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: pageSizeOptions[0] ?? 10,
  })

  const goToFirstPage = React.useCallback(() => {
    setPagination((state) => (state.pageIndex === 0 ? state : { ...state, pageIndex: 0 }))
  }, [])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
    // The default resets to page one on ANY data identity change — including a background
    // refetch after deleting a row on page 3. We reset explicitly (sort/filter changes and
    // paginationResetKey) and clamp out-of-range pages below instead.
    autoResetPageIndex: false,
    onSortingChange: (updater) => {
      setSorting(updater)
      goToFirstPage()
    },
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater)
      goToFirstPage()
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const toggleableColumns = table.getAllColumns().filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
  const pageCount = Math.max(table.getPageCount(), 1)

  const isFirstResetKeyRender = React.useRef(true)
  React.useEffect(() => {
    if (isFirstResetKeyRender.current) {
      isFirstResetKeyRender.current = false
      return
    }

    goToFirstPage()
  }, [goToFirstPage, paginationResetKey])

  // When the data shrinks (deletes, external filtering) the current page can fall past the
  // end; move to the last remaining page instead of showing an empty table.
  React.useEffect(() => {
    setPagination((state) => (state.pageIndex > pageCount - 1 ? { ...state, pageIndex: pageCount - 1 } : state))
  }, [pageCount])
  const isControlledSearch = typeof onSearchChange === "function"
  const showSearch = Boolean(searchColumn || isControlledSearch || searchValue !== undefined)

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {showSearch || filters || action ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {showSearch ? (
              <Input
                value={isControlledSearch ? (searchValue ?? "") : ((table.getColumn(searchColumn ?? "")?.getFilterValue() as string) ?? "")}
                onChange={(event) => {
                  if (isControlledSearch) {
                    onSearchChange(event.target.value)
                    return
                  }

                  table.getColumn(searchColumn ?? "")?.setFilterValue(event.target.value)
                }}
                placeholder={searchPlaceholder}
                className="h-8 w-full text-sm sm:max-w-xs"
              />
            ) : null}
            {filters ? <div className="flex flex-wrap items-center gap-2">{filters(table)}</div> : null}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {toggleableColumns.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                  <HugeiconsIcon icon={LeftToRightListBulletIcon} strokeWidth={2} data-icon="inline-start" />
                  Columns
                  <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} data-icon="inline-end" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {toggleableColumns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {action}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[1.25rem] border border-border/60">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/35">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-28 text-center text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Label htmlFor="rows-per-page" className="hidden sm:inline">
            Rows per page
          </Label>
          <Select value={`${table.getState().pagination.pageSize}`} onValueChange={(value) => table.setPageSize(Number(value))}>
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectGroup>
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-sm font-medium text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {pageCount}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              className="hidden sm:inline-flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <HugeiconsIcon icon={ArrowLeftDoubleIcon} strokeWidth={2} />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <span className="sr-only">Go to previous page</span>
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <span className="sr-only">Go to next page</span>
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className="hidden sm:inline-flex"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <HugeiconsIcon icon={ArrowRightDoubleIcon} strokeWidth={2} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
