import * as React from "react"

import { createFileRoute } from "@tanstack/react-router"
import { ArrowDown01Icon, Delete02Icon, Edit01Icon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { EmptyState } from "@/components/empty-state"
import { CardSkeleton } from "@/components/page-skeletons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getApiErrorMessage } from "@/features/shared/errors"
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from "@/features/categories/hooks"
import { pageActionTypes, usePageAction } from "@/lib/page-actions"
import type { CategoryHierarchy, CategoryType } from "@/features/categories/types"
import { categoryIconGroups, categoryIconOptions, getCategoryIconDefinition } from "@/lib/category-icons"
import { normalizeHexColor } from "@/lib/finance"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_protected/categories")({
  head: () => ({ meta: [{ title: "Categories — Flamette Money" }] }),
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

const defaultColor = colorPalette[0]
const defaultIcon = categoryIconOptions[0].name

type CategoryFields = {
  name: string
  color: string
  icon: string
}

function CategoriesPage() {
  const categoriesQuery = useCategories()
  const deleteCategory = useDeleteCategory()

  const [typeFilter, setTypeFilter] = React.useState<CategoryType>("Expense")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [parentEditor, setParentEditor] = React.useState<{ id: string | null; snapshot: CategoryHierarchy | null }>({
    id: null,
    snapshot: null,
  })
  const [deleteTarget, setDeleteTarget] = React.useState<CategoryHierarchy | null>(null)

  const categories = categoriesQuery.data ?? []
  const parentCategories = categories.filter((category) => category.parentId === null)
  const visibleParents = parentCategories.filter((category) => category.type === typeFilter)
  const subcategoryCount = visibleParents.reduce((sum, parent) => sum + parent.subcategories.length, 0)

  // Resolve the parent being edited from live query data so its subcategory list stays current,
  // while retaining its snapshot long enough for the dialog's close animation.
  const editParent = parentEditor.id ? (parentCategories.find((category) => category.id === parentEditor.id) ?? null) : null
  const parentForDialog = editParent ?? parentEditor.snapshot

  const openParentEditor = (category: CategoryHierarchy) => {
    setParentEditor({ id: category.id, snapshot: category })
  }

  usePageAction(pageActionTypes.createCategory, () => setCreateOpen(true))

  const openDelete = (category: CategoryHierarchy) => {
    deleteCategory.reset()
    setDeleteTarget(category)
  }

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          value={[typeFilter]}
          onValueChange={(values) => {
            const next = values[0] as CategoryType | undefined
            if (next) {
              setTypeFilter(next)
            }
          }}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="Expense">Expenses</ToggleGroupItem>
          <ToggleGroupItem value="Income">Income</ToggleGroupItem>
        </ToggleGroup>
        {!categoriesQuery.isPending && !categoriesQuery.isError ? (
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {visibleParents.length} {visibleParents.length === 1 ? "category" : "categories"} · {subcategoryCount}{" "}
            {subcategoryCount === 1 ? "subcategory" : "subcategories"}
          </span>
        ) : null}
      </div>

      {categoriesQuery.isPending ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <CardSkeleton key={index} className="h-24" />
          ))}
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
          description="Create a parent category, then open it to nest subcategories underneath."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
              Add category
            </Button>
          }
        />
      ) : (
        <div className="grid items-start gap-3 lg:grid-cols-2">
          {visibleParents.map((category) => (
            <ParentCategoryCard key={category.id} category={category} onEdit={() => openParentEditor(category)} onDelete={() => openDelete(category)} />
          ))}
        </div>
      )}

      <CreateCategoryDialog open={createOpen} onOpenChange={setCreateOpen} defaultType={typeFilter} />

      {parentForDialog ? (
        <ParentCategoryDialog
          parent={parentForDialog}
          open={Boolean(parentEditor.id)}
          onOpenChange={(open) => !open && setParentEditor((current) => ({ ...current, id: null }))}
        />
      ) : null}

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}</DialogTitle>
            <DialogDescription>
              {deleteTarget && deleteTarget.subcategories.length > 0
                ? "This category has subcategories. Remove them first if deletion is blocked."
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

function ParentCategoryCard({ category, onEdit, onDelete }: { category: CategoryHierarchy; onEdit: () => void; onDelete: () => void }) {
  const subcategoryCount = category.subcategories.length

  return (
    <Card size="sm" className="gap-0 py-0">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <CategoryIcon icon={category.icon} color={category.color} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">{category.name}</p>
              <p className="text-xs text-muted-foreground">
                {subcategoryCount === 0 ? "No subcategories" : `${subcategoryCount} ${subcategoryCount === 1 ? "subcategory" : "subcategories"}`}
              </p>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
            <Button variant="ghost" size="icon-sm" onClick={onEdit}>
              <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} />
              <span className="sr-only">Edit {category.name}</span>
            </Button>
            <Button variant="ghost" size="icon-sm" className="hover:text-destructive" onClick={onDelete}>
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              <span className="sr-only">Delete {category.name}</span>
            </Button>
          </div>
        </div>

        {subcategoryCount > 0 ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
            {category.subcategories.map((subcategory) => {
              const definition = getCategoryIconDefinition(subcategory.icon)
              return (
                <span
                  key={subcategory.id}
                  title={subcategory.name}
                  className="flex size-7 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: normalizeHexColor(subcategory.color, defaultColor) }}
                >
                  <HugeiconsIcon icon={definition.icon} strokeWidth={2} className="size-4" />
                  <span className="sr-only">{subcategory.name}</span>
                </span>
              )
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function CreateCategoryDialog({ open, onOpenChange, defaultType }: { open: boolean; onOpenChange: (open: boolean) => void; defaultType: CategoryType }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-stack sm:max-w-md">
        <CreateCategoryEditor defaultType={defaultType} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function CreateCategoryEditor({ defaultType, onClose }: { defaultType: CategoryType; onClose: () => void }) {
  const createCategory = useCreateCategory()
  const [type, setType] = React.useState<CategoryType>(defaultType)
  const [fields, setFields] = React.useState<CategoryFields>({ name: "", color: defaultColor, icon: defaultIcon })

  const submit = async () => {
    if (!fields.name.trim() || createCategory.isPending) {
      return
    }

    try {
      await createCategory.mutateAsync({ name: fields.name, color: fields.color, icon: fields.icon, type, parentId: null })
      onClose()
    } catch {
      // surfaced below
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>New category</DialogTitle>
        <DialogDescription>Create a top-level category. You can nest subcategories once it exists.</DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="create-category-name">Name</FieldLabel>
          <Input
            id="create-category-name"
            value={fields.name}
            autoFocus
            placeholder="e.g. Groceries"
            onChange={(event) => setFields((state) => ({ ...state, name: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void submit()
              }
            }}
          />
        </Field>
        <Field>
          <FieldLabel>Type</FieldLabel>
          <Tabs value={type} onValueChange={(next) => setType(next as CategoryType)}>
            <TabsList className="w-full">
              <TabsTrigger value="Expense">Expense</TabsTrigger>
              <TabsTrigger value="Income">Income</TabsTrigger>
            </TabsList>
          </Tabs>
        </Field>
        <Field>
          <FieldLabel>Icon</FieldLabel>
          <CategoryIconPicker value={fields.icon} color={fields.color} onChange={(icon) => setFields((state) => ({ ...state, icon }))} />
        </Field>
        <Field>
          <FieldLabel>Color</FieldLabel>
          <ColorField value={fields.color} onChange={(color) => setFields((state) => ({ ...state, color }))} />
        </Field>
      </FieldGroup>
      {createCategory.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Save failed</AlertTitle>
          <AlertDescription>{getApiErrorMessage(createCategory.error, "Unable to create category.")}</AlertDescription>
        </Alert>
      ) : null}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={createCategory.isPending || !fields.name.trim()}>
          {createCategory.isPending ? "Saving" : "Create category"}
        </Button>
      </DialogFooter>
    </>
  )
}

type SubEditorState = { mode: "create" | "edit"; subId: string | null }

function ParentCategoryDialog({ parent, open, onOpenChange }: { parent: CategoryHierarchy; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-stack sm:max-w-lg">
        <ParentCategoryEditor key={parent.id} parent={parent} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function ParentCategoryEditor({ parent, onClose }: { parent: CategoryHierarchy; onClose: () => void }) {
  const updateCategory = useUpdateCategory()
  const [fields, setFields] = React.useState<CategoryFields>({ name: parent.name, color: parent.color, icon: parent.icon })

  const [subOpen, setSubOpen] = React.useState(false)
  const [subEditor, setSubEditor] = React.useState<SubEditorState>({ mode: "create", subId: null })

  const liveSub = subEditor.subId ? (parent.subcategories.find((sub) => sub.id === subEditor.subId) ?? null) : null

  const openCreateSub = () => {
    setSubEditor({ mode: "create", subId: null })
    setSubOpen(true)
  }

  const openEditSub = (sub: CategoryHierarchy) => {
    setSubEditor({ mode: "edit", subId: sub.id })
    setSubOpen(true)
  }

  const saveParent = async () => {
    if (!fields.name.trim() || updateCategory.isPending) {
      return
    }

    try {
      await updateCategory.mutateAsync({
        id: parent.id,
        request: { name: fields.name, color: fields.color, icon: fields.icon, parentId: parent.parentId },
      })
      onClose()
    } catch {
      // surfaced below
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit category</DialogTitle>
        <DialogDescription>Update this category and manage its subcategories.</DialogDescription>
      </DialogHeader>

      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="parent-category-name">Name</FieldLabel>
          <Input
            id="parent-category-name"
            value={fields.name}
            onChange={(event) => setFields((state) => ({ ...state, name: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void saveParent()
              }
            }}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Icon</FieldLabel>
            <CategoryIconPicker value={fields.icon} color={fields.color} onChange={(icon) => setFields((state) => ({ ...state, icon }))} />
          </Field>
          <Field>
            <FieldLabel>Color</FieldLabel>
            <ColorField value={fields.color} onChange={(color) => setFields((state) => ({ ...state, color }))} />
          </Field>
        </div>
      </FieldGroup>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Subcategories</span>
          <Button variant="outline" size="sm" onClick={openCreateSub}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            Add
          </Button>
        </div>
        {parent.subcategories.length > 0 ? (
          <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border/60 p-1">
            {parent.subcategories.map((sub) => (
              <div key={sub.id} className="group flex items-center gap-2.5 rounded-md px-1 py-1 transition-colors hover:bg-muted/50">
                <CategoryIcon icon={sub.icon} color={sub.color} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{sub.name}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => openEditSub(sub)}
                >
                  <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} className="size-4" />
                  <span className="sr-only">Edit {sub.name}</span>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-sm text-muted-foreground">
            No subcategories yet. Use “Add” to create one.
          </p>
        )}
      </div>

      {updateCategory.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Save failed</AlertTitle>
          <AlertDescription>{getApiErrorMessage(updateCategory.error, "Unable to update category.")}</AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => void saveParent()} disabled={updateCategory.isPending || !fields.name.trim()}>
          {updateCategory.isPending ? "Saving" : "Save changes"}
        </Button>
      </DialogFooter>
      <SubcategoryDialog open={subOpen} mode={subEditor.mode} parent={parent} sub={liveSub} onOpenChange={(next) => setSubOpen(next)} />
    </>
  )
}

function SubcategoryDialog({
  open,
  mode,
  parent,
  sub,
  onOpenChange,
}: {
  open: boolean
  mode: "create" | "edit"
  parent: CategoryHierarchy
  sub: CategoryHierarchy | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-stack sm:max-w-md">
        <SubcategoryEditor key={mode === "edit" ? sub?.id : "new"} mode={mode} parent={parent} sub={sub} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function SubcategoryEditor({
  mode,
  parent,
  sub,
  onClose,
}: {
  mode: "create" | "edit"
  parent: CategoryHierarchy
  sub: CategoryHierarchy | null
  onClose: () => void
}) {
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const [fields, setFields] = React.useState<CategoryFields>(() =>
    mode === "edit" && sub ? { name: sub.name, color: sub.color, icon: sub.icon } : { name: "", color: parent.color, icon: parent.icon }
  )
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  const pending = createCategory.isPending || updateCategory.isPending
  const error = createCategory.isError
    ? getApiErrorMessage(createCategory.error, "Unable to create subcategory.")
    : updateCategory.isError
      ? getApiErrorMessage(updateCategory.error, "Unable to update subcategory.")
      : deleteCategory.isError
        ? getApiErrorMessage(deleteCategory.error, "Unable to delete subcategory.")
        : null

  const submit = async () => {
    if (!fields.name.trim() || pending) {
      return
    }

    try {
      if (mode === "edit" && sub) {
        await updateCategory.mutateAsync({
          id: sub.id,
          request: { name: fields.name, color: fields.color, icon: fields.icon, parentId: parent.id },
        })
      } else {
        await createCategory.mutateAsync({ name: fields.name, color: fields.color, icon: fields.icon, type: parent.type, parentId: parent.id })
      }
      onClose()
    } catch {
      // surfaced below
    }
  }

  const remove = async () => {
    if (!sub) {
      return
    }

    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    try {
      await deleteCategory.mutateAsync(sub.id)
      onClose()
    } catch {
      setConfirmDelete(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit subcategory" : "New subcategory"}</DialogTitle>
        <DialogDescription>{mode === "edit" ? `Inside ${parent.name}.` : `Add a subcategory inside ${parent.name}.`}</DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="sub-category-name">Name</FieldLabel>
          <Input
            id="sub-category-name"
            value={fields.name}
            autoFocus
            placeholder="e.g. Fruits & Vegetables"
            onChange={(event) => setFields((state) => ({ ...state, name: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void submit()
              }
            }}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Icon</FieldLabel>
            <CategoryIconPicker value={fields.icon} color={fields.color} onChange={(icon) => setFields((state) => ({ ...state, icon }))} />
          </Field>
          <Field>
            <FieldLabel>Color</FieldLabel>
            <ColorField value={fields.color} onChange={(color) => setFields((state) => ({ ...state, color }))} />
          </Field>
        </div>
      </FieldGroup>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <DialogFooter className="sm:justify-between">
        {mode === "edit" ? (
          <Button variant={confirmDelete ? "destructive" : "outline"} onClick={() => void remove()} disabled={deleteCategory.isPending} className="sm:mr-auto">
            {deleteCategory.isPending ? "Deleting" : confirmDelete ? "Confirm delete" : "Delete"}
          </Button>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={pending || !fields.name.trim()}>
            {pending ? "Saving" : mode === "edit" ? "Save changes" : "Add subcategory"}
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}

function CategoryIconPicker({ value, color, onChange }: { value: string; color: string; onChange: (icon: string) => void }) {
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
      <label className="relative size-7 cursor-pointer overflow-hidden rounded-full border border-dashed border-border" title="Custom color">
        <span
          className="block size-full"
          style={{
            background: "conic-gradient(from 180deg, #f87171, #fbbf24, #34d399, #60a5fa, #a78bfa, #f87171)",
          }}
        />
        <input type="color" value={resolved} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    </div>
  )
}
