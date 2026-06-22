import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
import { ArrowDown01Icon, Delete02Icon, Edit01Icon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { EmptyState } from "@/components/empty-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getApiErrorMessage } from "@/features/shared/errors"
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from "@/features/categories/hooks"
import { PAGE_ACTION_EVENT, pageActionTypes, type PageActionType } from "@/lib/page-actions"
import type { CategoryHierarchy, CategoryType } from "@/features/categories/types"
import { categoryIconGroups, categoryIconOptions, getCategoryIconDefinition } from "@/lib/category-icons"
import { normalizeHexColor } from "@/lib/finance"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_protected/categories")({
  component: CategoriesPage,
})

const colorPalette = [
  "#FF7043",
  "#EC407A",
  "#AB47BC",
  "#7E57C2",
  "#5C6BC0",
  "#42A5F5",
  "#29B6F6",
  "#26A69A",
  "#66BB6A",
  "#9CCC65",
  "#FFCA28",
  "#FFA726",
  "#8D6E63",
  "#78909C",
]

type CategoryFormState = {
  name: string
  color: string
  icon: string
  type: CategoryType
  parentId: string | null
}

const defaultColor = colorPalette[0]

const emptyForm: CategoryFormState = {
  name: "",
  color: defaultColor,
  icon: categoryIconOptions[0].name,
  type: "Expense",
  parentId: null,
}

function CategoriesPage() {
  const categoriesQuery = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [typeFilter, setTypeFilter] = React.useState<CategoryType>("Expense")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editCategory, setEditCategory] = React.useState<CategoryHierarchy | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<CategoryHierarchy | null>(null)
  const [createForm, setCreateForm] = React.useState<CategoryFormState>(emptyForm)
  const [editForm, setEditForm] = React.useState<CategoryFormState>(emptyForm)

  const categories = React.useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])
  const parentCategories = React.useMemo(() => categories.filter((category) => category.parentId === null), [categories])
  const visibleParents = React.useMemo(() => parentCategories.filter((category) => category.type === typeFilter), [parentCategories, typeFilter])
  const subcategoryCount = React.useMemo(() => visibleParents.reduce((sum, parent) => sum + parent.subcategories.length, 0), [visibleParents])

  const parentOptions = React.useMemo(
    () => visibleParents.map((category) => ({ value: category.id, label: category.name })),
    [visibleParents]
  )

  const openCreate = React.useCallback(
    (parent?: CategoryHierarchy) => {
      setCreateForm({
        name: "",
        color: normalizeHexColor(parent?.color, defaultColor),
        icon: parent?.icon ?? categoryIconOptions[0].name,
        type: parent?.type ?? typeFilter,
        parentId: parent?.id ?? null,
      })
      setCreateOpen(true)
    },
    [typeFilter]
  )

  React.useEffect(() => {
    const handlePageAction = (event: Event) => {
      const customEvent = event as CustomEvent<PageActionType>

      if (customEvent.detail === pageActionTypes.createCategory) {
        openCreate()
      }
    }

    window.addEventListener(PAGE_ACTION_EVENT, handlePageAction)
    return () => window.removeEventListener(PAGE_ACTION_EVENT, handlePageAction)
  }, [openCreate])

  const openEdit = (category: CategoryHierarchy) => {
    setEditCategory(category)
    setEditForm({
      name: category.name,
      color: normalizeHexColor(category.color, defaultColor),
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
      // surfaced inside the dialog
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
      // surfaced inside the dialog
    }
  }

  const handleQuickAddSubcategory = React.useCallback(
    async (parent: CategoryHierarchy, name: string) => {
      await createCategory.mutateAsync({
        name,
        color: normalizeHexColor(parent.color, defaultColor),
        icon: parent.icon,
        type: parent.type,
        parentId: parent.id,
      })
    },
    [createCategory]
  )

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    try {
      await deleteCategory.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // surfaced inside the dialog
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Tabs value={typeFilter} onValueChange={(value) => setTypeFilter(value as CategoryType)}>
            <TabsList>
              <TabsTrigger value="Expense">Expenses</TabsTrigger>
              <TabsTrigger value="Income">Income</TabsTrigger>
            </TabsList>
          </Tabs>
          {!categoriesQuery.isPending && !categoriesQuery.isError ? (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {visibleParents.length} {visibleParents.length === 1 ? "category" : "categories"} · {subcategoryCount}{" "}
              {subcategoryCount === 1 ? "subcategory" : "subcategories"}
            </span>
          ) : null}
        </div>
        <Button onClick={() => openCreate()}>
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
          New category
        </Button>
      </div>

      {categoriesQuery.isPending ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : categoriesQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load categories</AlertTitle>
          <AlertDescription>{getApiErrorMessage(categoriesQuery.error, "Try again in a moment.")}</AlertDescription>
        </Alert>
      ) : visibleParents.length === 0 ? (
        <EmptyState
          eyebrow="Categories"
          title={`No ${typeFilter.toLowerCase()} categories yet`}
          description="Create a parent category, then nest subcategories underneath it to organise your transactions."
          action={
            <Button onClick={() => openCreate()}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
              New category
            </Button>
          }
        />
      ) : (
        <div className="grid items-start gap-3 lg:grid-cols-2">
          {visibleParents.map((category) => (
            <ParentCategoryCard
              key={category.id}
              category={category}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onQuickAdd={handleQuickAddSubcategory}
            />
          ))}
        </div>
      )}

      <CategoryDialog
        open={createOpen}
        mode="create"
        title="New category"
        description="Add a parent category, or attach it under an existing one."
        parentOptions={parentOptions}
        value={createForm}
        onChange={setCreateForm}
        pending={createCategory.isPending}
        error={createOpen && createCategory.isError ? getApiErrorMessage(createCategory.error, "Unable to create category.") : null}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        submitLabel="Create category"
      />

      <CategoryDialog
        open={Boolean(editCategory)}
        mode="edit"
        title="Edit category"
        description="Update the name, icon, colour, or where this category sits."
        parentOptions={parentOptions.filter((option) => option.value !== editCategory?.id)}
        value={editForm}
        onChange={setEditForm}
        pending={updateCategory.isPending}
        error={editCategory && updateCategory.isError ? getApiErrorMessage(updateCategory.error, "Unable to update category.") : null}
        onOpenChange={(open) => !open && setEditCategory(null)}
        onSubmit={handleEdit}
        submitLabel="Save changes"
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}</DialogTitle>
            <DialogDescription>
              {deleteTarget && deleteTarget.subcategories.length > 0
                ? "This category has subcategories. Remove or reassign them first if deletion is blocked."
                : "Deleting a category can fail if transactions still depend on it."}
            </DialogDescription>
          </DialogHeader>
          {deleteCategory.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Delete failed</AlertTitle>
              <AlertDescription>{getApiErrorMessage(deleteCategory.error, "Unable to delete category.")}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteCategory.isPending}>
              {deleteCategory.isPending ? "Deleting" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CategoryIcon({ icon, color, size = "md" }: { icon: string; color: string; size?: "sm" | "md" }) {
  const definition = getCategoryIconDefinition(icon)
  const isSm = size === "sm"

  return (
    <span
      className={cn("flex shrink-0 items-center justify-center text-white", isSm ? "size-7 rounded-lg" : "size-10 rounded-xl")}
      style={{ backgroundColor: normalizeHexColor(color, defaultColor) }}
    >
      <HugeiconsIcon icon={definition.icon} strokeWidth={2} className={isSm ? "size-4" : "size-[1.15rem]"} />
    </span>
  )
}

function ParentCategoryCard({
  category,
  onEdit,
  onDelete,
  onQuickAdd,
}: {
  category: CategoryHierarchy
  onEdit: (category: CategoryHierarchy) => void
  onDelete: (category: CategoryHierarchy) => void
  onQuickAdd: (parent: CategoryHierarchy, name: string) => Promise<void>
}) {
  const subcategoryCount = category.subcategories.length

  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <CategoryIcon icon={category.icon} color={category.color} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">{category.name}</p>
              {subcategoryCount > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {subcategoryCount} {subcategoryCount === 1 ? "subcategory" : "subcategories"}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(category)}>
              <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} />
              <span className="sr-only">Edit {category.name}</span>
            </Button>
            <Button variant="ghost" size="icon-sm" className="hover:text-destructive" onClick={() => onDelete(category)}>
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              <span className="sr-only">Delete {category.name}</span>
            </Button>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-px border-t border-border/50 pt-1.5">
          {category.subcategories.map((subcategory) => (
            <div key={subcategory.id} className="group flex items-center gap-2.5 rounded-md px-1 py-1 transition-colors hover:bg-muted/50">
              <CategoryIcon icon={subcategory.icon} color={subcategory.color} size="sm" />
              <button type="button" onClick={() => onEdit(subcategory)} className="min-w-0 flex-1 truncate text-left text-sm text-foreground">
                {subcategory.name}
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                onClick={() => onDelete(subcategory)}
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" />
                <span className="sr-only">Delete {subcategory.name}</span>
              </Button>
            </div>
          ))}
          <AddSubcategoryRow parent={category} onQuickAdd={onQuickAdd} />
        </div>
      </CardContent>
    </Card>
  )
}

function AddSubcategoryRow({
  parent,
  onQuickAdd,
}: {
  parent: CategoryHierarchy
  onQuickAdd: (parent: CategoryHierarchy, name: string) => Promise<void>
}) {
  const [value, setValue] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState(false)

  const submit = async () => {
    const name = value.trim()
    if (!name || pending) {
      return
    }

    setPending(true)
    setError(false)
    try {
      await onQuickAdd(parent, name)
      setValue("")
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-2.5 px-1 py-0.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-border/70 text-muted-foreground">
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-4" />
      </span>
      <Input
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          if (error) {
            setError(false)
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            void submit()
          }
        }}
        placeholder="Add subcategory"
        aria-label={`Add subcategory under ${parent.name}`}
        aria-invalid={error}
        disabled={pending}
        className="h-7 border-transparent bg-transparent px-2 text-sm shadow-none focus-visible:border-input focus-visible:bg-background"
      />
      {value.trim() ? (
        <Button variant="secondary" size="sm" className="h-7" onClick={() => void submit()} disabled={pending}>
          {pending ? "Adding" : "Add"}
        </Button>
      ) : null}
    </div>
  )
}

function CategoryIconPicker({
  value,
  color,
  onChange,
}: {
  value: string
  color: string
  onChange: (icon: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const selected = getCategoryIconDefinition(value)
  const resolvedColor = normalizeHexColor(color, defaultColor)

  const matches = React.useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) {
      return categoryIconOptions
    }
    return categoryIconOptions.filter((option) => `${option.label} ${option.name} ${option.keywords ?? ""}`.toLowerCase().includes(term))
  }, [query])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setQuery("")
        }
      }}
    >
      <PopoverTrigger render={<Button type="button" variant="outline" className="h-11 w-full justify-start gap-2 px-2 font-normal" />}>
        <span className="flex size-7 items-center justify-center rounded-lg text-white" style={{ backgroundColor: resolvedColor }}>
          <HugeiconsIcon icon={selected.icon} strokeWidth={2} className="size-4" />
        </span>
        <span className="text-foreground">{selected.label}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="ml-auto size-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <div className="border-b border-border p-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search icons" className="h-9" autoFocus />
        </div>
        <div className="max-h-[280px] overflow-y-auto p-2">
          {matches.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No icons match “{query}”.</p>
          ) : (
            categoryIconGroups.map((group) => {
              const groupIcons = matches.filter((option) => option.group === group)
              if (groupIcons.length === 0) {
                return null
              }

              return (
                <div key={group} className="mb-2 last:mb-0">
                  <p className="px-1 py-1 text-xs font-medium text-muted-foreground">{group}</p>
                  <div className="grid grid-cols-6 gap-1">
                    {groupIcons.map((option) => {
                      const isSelected = option.name === selected.name
                      return (
                        <button
                          key={option.name}
                          type="button"
                          title={option.label}
                          onClick={() => {
                            onChange(option.name)
                            setOpen(false)
                            setQuery("")
                          }}
                          className={cn(
                            "flex aspect-square items-center justify-center rounded-lg border text-foreground transition-colors hover:bg-muted",
                            isSelected ? "border-primary bg-primary/10 text-primary" : "border-transparent"
                          )}
                        >
                          <HugeiconsIcon icon={option.icon} strokeWidth={2} className="size-5" />
                          <span className="sr-only">{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ColorField({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const resolved = normalizeHexColor(value, defaultColor)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {colorPalette.map((swatch) => {
        const isSelected = resolved.toUpperCase() === swatch.toUpperCase()
        return (
          <button
            key={swatch}
            type="button"
            onClick={() => onChange(swatch)}
            title={swatch}
            className={cn(
              "size-7 rounded-full border transition-transform hover:scale-110",
              isSelected ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : "border-black/10"
            )}
            style={{ backgroundColor: swatch }}
          >
            <span className="sr-only">{swatch}</span>
          </button>
        )
      })}
      <label className="relative size-7 cursor-pointer overflow-hidden rounded-full border border-dashed border-border" title="Custom colour">
        <span
          className="block size-full"
          style={{
            background: "conic-gradient(from 180deg, #f87171, #fbbf24, #34d399, #60a5fa, #a78bfa, #f87171)",
          }}
        />
        <input
          type="color"
          value={resolved}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}

function CategoryDialog({
  open,
  mode,
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
  mode: "create" | "edit"
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
  const isChild = value.parentId !== null
  // Type is fixed on edit (backend keeps it) and inherited when nested under a parent.
  const typeLocked = mode === "edit" || isChild

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor={`${mode}-category-name`}>Name</FieldLabel>
            <Input
              id={`${mode}-category-name`}
              value={value.name}
              autoFocus
              onChange={(event) => onChange((state) => ({ ...state, name: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && value.name.trim() && !pending) {
                  event.preventDefault()
                  onSubmit()
                }
              }}
              placeholder="e.g. Groceries"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Type</FieldLabel>
              <Tabs
                value={value.type}
                onValueChange={(next) => {
                  if (typeLocked) {
                    return
                  }
                  onChange((state) => ({ ...state, type: next as CategoryType }))
                }}
              >
                <TabsList className={cn("w-full", typeLocked && "pointer-events-none opacity-60")}>
                  <TabsTrigger value="Expense">Expense</TabsTrigger>
                  <TabsTrigger value="Income">Income</TabsTrigger>
                </TabsList>
              </Tabs>
            </Field>

            <Field>
              <FieldLabel>Parent category</FieldLabel>
              <Select
                value={value.parentId ?? "none"}
                onValueChange={(next) =>
                  onChange((state) => ({
                    ...state,
                    parentId: next === "none" ? null : next,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">No parent (top level)</SelectItem>
                    {parentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel>Icon</FieldLabel>
            <CategoryIconPicker value={value.icon} color={value.color} onChange={(icon) => onChange((state) => ({ ...state, icon }))} />
          </Field>

          <Field>
            <FieldLabel>Colour</FieldLabel>
            <ColorField value={value.color} onChange={(color) => onChange((state) => ({ ...state, color }))} />
          </Field>
        </FieldGroup>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Save failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={pending || !value.name.trim()}>
            {pending ? "Saving" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
