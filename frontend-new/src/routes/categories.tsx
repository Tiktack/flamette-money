import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
import { Cell, Pie, PieChart } from "recharts"

import { EmptyState } from "@/components/empty-state"
import { SharedDateRangeToolbar } from "@/components/shared-date-range-toolbar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { getApiErrorMessage } from "@/lib/api/errors"
import { useCategories, useCategorySeriesReport, useCreateCategory, useDeleteCategory, useUpdateCategory } from "@/lib/api/hooks"
import { PAGE_ACTION_EVENT, pageActionTypes, type PageActionType } from "@/lib/page-actions"
import type { CategoryHierarchy, CategoryType } from "@/lib/api/types"
import { formatCurrency, normalizeHexColor, toNumber } from "@/lib/finance"
import { resolveSharedDateRange, useSharedDateRangeFilters } from "@/lib/state/sharedDateRangeFilters"

export const Route = createFileRoute("/categories")({
  component: CategoriesPage,
})

const iconOptions = ["IconShoppingCart", "IconHome", "IconCoin", "IconBriefcase"]

type CategoryFormState = {
  name: string
  color: string
  icon: string
  type: CategoryType
  parentId: string | null
}

const defaultCategoryForm: CategoryFormState = {
  name: "",
  color: "#D96B4F",
  icon: "IconShoppingCart",
  type: "Expense",
  parentId: null,
}

function CategoriesPage() {
  const categoriesQuery = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const dateFilters = useSharedDateRangeFilters()
  const [typeFilter, setTypeFilter] = React.useState<CategoryType>("Expense")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editCategory, setEditCategory] = React.useState<CategoryHierarchy | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<CategoryHierarchy | null>(null)
  const [createForm, setCreateForm] = React.useState<CategoryFormState>(defaultCategoryForm)
  const [editForm, setEditForm] = React.useState<CategoryFormState>(defaultCategoryForm)

  React.useEffect(() => {
    const handlePageAction = (event: Event) => {
      const customEvent = event as CustomEvent<PageActionType>

      if (customEvent.detail === pageActionTypes.createCategory) {
        setCreateOpen(true)
      }
    }

    window.addEventListener(PAGE_ACTION_EVENT, handlePageAction)
    return () => window.removeEventListener(PAGE_ACTION_EVENT, handlePageAction)
  }, [])

  const categories = categoriesQuery.data ?? []
  const parentCategories = React.useMemo(() => categories.filter((category) => category.parentId === null), [categories])
  const visibleParents = React.useMemo(() => parentCategories.filter((category) => category.type === typeFilter), [parentCategories, typeFilter])
  const resolvedDateRange = React.useMemo(() => resolveSharedDateRange(dateFilters), [dateFilters])

  const reportQuery = useCategorySeriesReport(
    React.useMemo(() => {
      const query: {
        StartDate?: string
        EndDate?: string
        Type: CategoryType
        Interval: "None"
      } = {
        Type: typeFilter,
        Interval: "None",
      }

      if (resolvedDateRange.start) {
        query.StartDate = resolvedDateRange.start.toISOString()
      }

      if (resolvedDateRange.end) {
        query.EndDate = resolvedDateRange.end.toISOString()
      }

      return query
    }, [resolvedDateRange.end, resolvedDateRange.start, typeFilter]),
  )

  const amountsByCategory = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of reportQuery.data?.series ?? []) {
      map.set(entry.key, toNumber(entry.total))
    }
    return map
  }, [reportQuery.data?.series])

  const chartData = React.useMemo(
    () =>
      visibleParents
        .map((category) => ({
          id: category.id,
          name: category.name,
          value: amountsByCategory.get(category.id) ?? 0,
          color: normalizeHexColor(category.color),
        }))
        .filter((entry) => entry.value > 0),
    [amountsByCategory, visibleParents],
  )

  const chartConfig = React.useMemo(
    () =>
      chartData.reduce<ChartConfig>((config, item) => {
        config[item.id] = { label: item.name, color: item.color }
        return config
      }, {}),
    [chartData],
  )

  const parentOptions = React.useMemo(
    () => parentCategories.filter((category) => category.type === typeFilter).map((category) => ({ value: category.id, label: category.name })),
    [parentCategories, typeFilter],
  )

  const openCreate = React.useCallback((parent?: CategoryHierarchy) => {
    setCreateForm({
      name: "",
      color: normalizeHexColor(parent?.color, "#D96B4F"),
      icon: parent?.icon ?? "IconShoppingCart",
      type: parent?.type ?? typeFilter,
      parentId: parent?.id ?? null,
    })
    setCreateOpen(true)
  }, [typeFilter])

  const openEdit = (category: CategoryHierarchy) => {
    setEditCategory(category)
    setEditForm({
      name: category.name,
      color: normalizeHexColor(category.color),
      icon: category.icon,
      type: category.type,
      parentId: category.parentId,
    })
  }

  const handleCreate = async () => {
    try {
      await createCategory.mutateAsync(createForm)
      setCreateOpen(false)
    } catch {
      // rendered below
    }
  }

  const handleEdit = async () => {
    if (!editCategory) {
      return
    }

    try {
      await updateCategory.mutateAsync({
        id: editCategory.id,
        request: {
          name: editForm.name,
          color: editForm.color,
          icon: editForm.icon,
          parentId: editForm.parentId,
        },
      })
      setEditCategory(null)
    } catch {
      // rendered below
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    try {
      await deleteCategory.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // rendered below
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {(["Expense", "Income"] as const).map((value) => (
          <Button key={value} variant={typeFilter === value ? "default" : "outline"} onClick={() => setTypeFilter(value)}>
            {value === "Expense" ? "Expenses" : "Income"}
          </Button>
        ))}
      </div>

      <SharedDateRangeToolbar />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]">
        <div className="grid gap-4">
          {categoriesQuery.isPending ? (
            <div className="h-64 animate-pulse rounded-[1.75rem] bg-muted" />
          ) : categoriesQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load categories</AlertTitle>
              <AlertDescription>{getApiErrorMessage(categoriesQuery.error, "Try again in a moment.")}</AlertDescription>
            </Alert>
          ) : visibleParents.length === 0 ? (
            <EmptyState
              eyebrow="Categories"
              title={`No ${typeFilter.toLowerCase()} categories yet`}
              description="Create a parent category and optionally nest subcategories underneath it."
              action={<Button onClick={() => openCreate()}>Create category</Button>}
            />
          ) : (
            visibleParents.map((category) => (
              <Card key={category.id} className="border-border/60 bg-card/80 shadow-sm">
                <CardContent className="grid gap-4 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="size-11 rounded-2xl" style={{ backgroundColor: normalizeHexColor(category.color) }} />
                      <div>
                        <p className="text-lg font-semibold tracking-tight text-foreground">{category.name}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(amountsByCategory.get(category.id) ?? 0, reportQuery.data?.baseCurrency ?? "USD")}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openCreate(category)}>Add child</Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(category)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(category)}>Delete</Button>
                    </div>
                  </div>

                  {category.subcategories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {category.subcategories.map((subcategory) => (
                        <button
                          key={subcategory.id}
                          type="button"
                          onClick={() => openEdit(subcategory)}
                          className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                        >
                          {subcategory.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No subcategories yet.</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>{typeFilter} overview</CardTitle>
            <CardDescription>Distribution by parent category within the selected range.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {reportQuery.isPending ? (
              <div className="h-72 animate-pulse rounded-2xl bg-muted" />
            ) : reportQuery.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to load category report</AlertTitle>
                <AlertDescription>{getApiErrorMessage(reportQuery.error, "Try another range.")}</AlertDescription>
              </Alert>
            ) : chartData.length === 0 ? (
              <EmptyState
                eyebrow="Report"
                title="No category totals in this range"
                description="When transactions land inside this window, the category mix will appear here."
              />
            ) : (
              <>
                <ChartContainer className="mx-auto h-[240px] w-full max-w-[300px]" config={chartConfig}>
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={chartData} dataKey="value" innerRadius={64} outerRadius={96} strokeWidth={0}>
                      {chartData.map((entry) => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>

                <div className="grid gap-4">
                  {chartData.map((entry) => {
                    const total = chartData.reduce((sum, item) => sum + item.value, 0)
                    const percent = total === 0 ? 0 : (entry.value / total) * 100
                    return (
                      <div key={entry.id} className="grid gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-sm font-medium text-foreground">{entry.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{formatCurrency(entry.value, reportQuery.data?.baseCurrency ?? "USD")}</span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <CategoryDialog
        open={createOpen}
        title="Create category"
        description="Create a parent category or attach a child under an existing parent."
        parentOptions={parentOptions}
        value={createForm}
        onChange={setCreateForm}
        pending={createCategory.isPending}
        error={createCategory.isError ? getApiErrorMessage(createCategory.error, "Unable to create category.") : null}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        submitLabel="Create category"
      />

      <CategoryDialog
        open={Boolean(editCategory)}
        title="Edit category"
        description="Update naming, visuals, or parent assignment."
        parentOptions={parentOptions.filter((option) => option.value !== editCategory?.id)}
        value={editForm}
        onChange={setEditForm}
        pending={updateCategory.isPending}
        error={updateCategory.isError ? getApiErrorMessage(updateCategory.error, "Unable to update category.") : null}
        onOpenChange={(open) => !open && setEditCategory(null)}
        onSubmit={handleEdit}
        submitLabel="Save changes"
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category</DialogTitle>
            <DialogDescription>Deleting a category can fail if transactions or children still depend on it.</DialogDescription>
          </DialogHeader>
          {deleteCategory.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Delete failed</AlertTitle>
              <AlertDescription>{getApiErrorMessage(deleteCategory.error, "Unable to delete category.")}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteCategory.isPending}>{deleteCategory.isPending ? "Deleting" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CategoryDialog({
  open,
  title,
  description,
  parentOptions,
  value,
  onChange,
  pending,
  error,
  onOpenChange,
  onSubmit,
  submitLabel,
}: {
  open: boolean
  title: string
  description: string
  parentOptions: Array<{ value: string; label: string }>
  value: CategoryFormState
  onChange: React.Dispatch<React.SetStateAction<CategoryFormState>>
  pending: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
  submitLabel: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${title}-name`}>Name</FieldLabel>
            <Input id={`${title}-name`} value={value.name} onChange={(event) => onChange((state) => ({ ...state, name: event.target.value }))} />
          </Field>
          <Field>
            <FieldLabel>Type</FieldLabel>
            <Select value={value.type} onValueChange={(next) => onChange((state) => ({ ...state, type: next as CategoryType, parentId: null }))}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(["Expense", "Income"] as const).map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Parent category</FieldLabel>
            <Select value={value.parentId ?? "none"} onValueChange={(next) => onChange((state) => ({ ...state, parentId: next === "none" ? null : next }))}>
              <SelectTrigger>
                <SelectValue placeholder="Parent category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">No parent</SelectItem>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Icon token</FieldLabel>
            <Select value={value.icon} onValueChange={(next) => onChange((state) => ({ ...state, icon: next ?? state.icon }))}>
              <SelectTrigger>
                <SelectValue placeholder="Icon" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {iconOptions.map((icon) => (
                    <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field className="md:col-span-2">
            <FieldLabel>Accent color</FieldLabel>
            <Input type="color" value={value.color} onChange={(event) => onChange((state) => ({ ...state, color: event.target.value }))} className="h-11 p-1" />
          </Field>
        </FieldGroup>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Save failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={pending || !value.name.trim()}>{pending ? "Saving" : submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
