import { DonutChart } from '@mantine/charts'
import { useMediaQuery } from '@mantine/hooks'
import { createFileRoute } from '@tanstack/react-router'
import {
  Badge,
  Button,
  Card,
  ColorInput,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useMemo, useState } from 'react'
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../lib/api/hooks'
import type { CategoryHierarchy, CategoryType } from '../lib/api/types'
import { Route as RootRoute } from './__root'
import classes from './page.module.css'

export const Route = createFileRoute('/categories')({
  component: CategoriesPage,
})

const defaultCategoryColor = '#5C7CFA'
const iconOptions = [
  { value: 'food', label: 'Food' },
  { value: 'cart', label: 'Cart' },
  { value: 'home', label: 'Home' },
  { value: 'car', label: 'Car' },
  { value: 'salary', label: 'Salary' },
  { value: 'tag', label: 'Tag' },
]

const normalizeHexColor = (value?: string | null) => {
  if (!value) {
    return defaultCategoryColor
  }

  return value.startsWith('#') ? value : `#${value}`
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.'

const ForkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M6 3v8" />
    <path d="M10 3v8" />
    <path d="M6 7h4" />
    <path d="M8 11v10" />
    <path d="M16 3v6" />
    <path d="M16 9c0 2-1 3-3 4v8" />
  </svg>
)

const CartIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M3 5h2l2.5 9h9.5l2-6H7.5" />
    <circle cx="10" cy="18" r="1.5" />
    <circle cx="17" cy="18" r="1.5" />
  </svg>
)

const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M4 10l8-6 8 6" />
    <path d="M6 9v10h12V9" />
  </svg>
)

const CarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M4 13l2-5h12l2 5" />
    <path d="M6 13h12" />
    <circle cx="7" cy="17" r="1.5" />
    <circle cx="17" cy="17" r="1.5" />
  </svg>
)

const WalletIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M4 7h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4z" />
    <path d="M16 11h4" />
    <path d="M4 7l2-3h12" />
  </svg>
)

const TagIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M7 3h6l7 7-6 6-7-7z" />
    <circle cx="9.5" cy="6.5" r="1" />
  </svg>
)

const iconMap: Record<
  string,
  (props: React.SVGProps<SVGSVGElement>) => React.ReactElement
> = {
  food: ForkIcon,
  cart: CartIcon,
  home: HomeIcon,
  car: CarIcon,
  salary: WalletIcon,
  tag: TagIcon,
}

const CategoryIcon = ({ icon, color }: { icon: string; color: string }) => {
  const Icon = iconMap[icon] ?? TagIcon

  return <Icon width={22} height={22} style={{ color }} />
}

function CategoriesPage() {
  const categoriesQuery = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const [typeFilter, setTypeFilter] = useState<CategoryType>('Expense')
  const [editMode, setEditMode] = useState(false)
  const [createOpened, setCreateOpened] = useState(false)
  const [editCategory, setEditCategory] = useState<CategoryHierarchy | null>(null)
  const navigate = RootRoute.useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<CategoryHierarchy | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    color: defaultCategoryColor,
    icon: 'food',
    type: 'Expense' as CategoryType,
    parentId: null as string | null,
  })
  const [editForm, setEditForm] = useState({
    name: '',
    color: defaultCategoryColor,
    icon: 'food',
    parentId: null as string | null,
  })

  const categories = categoriesQuery.data ?? []
  const parentCategories = useMemo(
    () => categories.filter((category) => category.parentId === null),
    [categories],
  )
  const isCompact = useMediaQuery('(max-width: 900px)')
  const donutSize = isCompact ? 320 : 520
  const flatCategories = useMemo(() => {
    const items: CategoryHierarchy[] = []

    categories.forEach((category) => {
      items.push(category)
      ;(category.subcategories ?? []).forEach((subcategory) => items.push(subcategory))
    })

    return items
  }, [categories])

  const visibleCategories = useMemo(
    () => flatCategories.filter((category) => category.type === typeFilter),
    [flatCategories, typeFilter],
  )

  const parentOptions = useMemo(
    () =>
      (parentCategories ?? [])
        .filter((category) => category.type === typeFilter)
        .map((category) => ({
          value: category.id,
          label: category.name,
          group: category.type,
        })),
    [parentCategories, typeFilter],
  )

  const editParentOptions = useMemo(() => {
    if (!editCategory) {
      return parentOptions
    }

    return (parentCategories ?? [])
      .filter(
        (category) =>
          category.type === editCategory.type && category.id !== editCategory.id,
      )
      .map((category) => ({
        value: category.id,
        label: category.name,
        group: category.type,
      }))
  }, [editCategory, parentCategories, parentOptions])

  const safeIconOptions = useMemo(() => iconOptions.filter(Boolean), [])
  const safeParentOptions = useMemo(
    () => (Array.isArray(parentOptions) ? parentOptions : []).filter(Boolean),
    [parentOptions],
  )
  const safeEditParentOptions = useMemo(
    () => (Array.isArray(editParentOptions) ? editParentOptions : []).filter(Boolean),
    [editParentOptions],
  )

  const donutData = useMemo(
    () =>
      (visibleCategories ?? []).map((category) => ({
        name: category.name,
        value: Math.max(1, category.subcategories.length || 1),
        color: normalizeHexColor(category.color),
      })),
    [visibleCategories],
  )

  const monthLabel = useMemo(
    () =>
      new Date().toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [],
  )

  const splitCategories = useMemo(() => {
    const safe = visibleCategories ?? []
    const midpoint = Math.ceil(safe.length / 2)
    return {
      left: safe.slice(0, midpoint),
      right: safe.slice(midpoint),
    }
  }, [visibleCategories])

  const openCreate = (parent?: CategoryHierarchy) => {
    setCreateError(null)
    const parentType = parent?.type ?? typeFilter
    setCreateForm({
      name: '',
      color: normalizeHexColor(parent?.color ?? defaultCategoryColor),
      icon: parent?.icon ?? 'food',
      type: parentType,
      parentId: parent?.id ?? null,
    })
    setCreateOpened(true)
  }

  const openEdit = (category: CategoryHierarchy) => {
    setEditError(null)
    setEditCategory(category)
    setEditForm({
      name: category.name,
      color: normalizeHexColor(category.color),
      icon: category.icon,
      parentId: category.parentId,
    })
  }

  const closeEdit = () => {
    setEditCategory(null)
  }

  const handleCategoryClick = (category: CategoryHierarchy) => {
    if (editMode) {
      openEdit(category)
      return
    }

    navigate({
      search: (previous) => ({
        ...previous,
        transactionMode: 'new',
        transactionId: undefined,
        transactionCategoryId: category.id,
        transactionType: category.type,
      }),
    })
  }

  const handleCreate = async () => {
    setCreateError(null)
    try {
      await createCategory.mutateAsync({
        name: createForm.name,
        color: normalizeHexColor(createForm.color),
        icon: createForm.icon,
        type: createForm.type,
        parentId: createForm.parentId,
      })
      setCreateOpened(false)
    } catch (error) {
      setCreateError(getErrorMessage(error))
    }
  }

  const handleEdit = async () => {
    if (!editCategory) {
      return
    }

    setEditError(null)
    try {
      await updateCategory.mutateAsync({
        id: editCategory.id,
        request: {
          name: editForm.name,
          color: normalizeHexColor(editForm.color),
          icon: editForm.icon,
          parentId: editForm.parentId,
        },
      })
      setEditCategory(null)
    } catch (error) {
      setEditError(getErrorMessage(error))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setDeleteError(null)
    try {
      await deleteCategory.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      setEditCategory(null)
    } catch (error) {
      setDeleteError(getErrorMessage(error))
    }
  }

  return (
    <Stack className={classes.page}>
      <Group className={classes.header} justify="space-between" wrap="wrap" gap="md">
        <Stack gap={4}>
          <Title order={2}>Categories</Title>
          <Text size="sm" c="dimmed">
            Tap a category to start a transaction or manage the taxonomy
          </Text>
        </Stack>
        <Group gap="sm" className={classes.toolbar}>
          <SegmentedControl
            value={typeFilter}
            onChange={(value) => setTypeFilter(value as CategoryType)}
            data={['Expense', 'Income']}
            className={classes.segmented}
          />
          <Button
            variant={editMode ? 'light' : 'subtle'}
            onClick={() => {
              setEditMode((current) => !current)
              setEditCategory(null)
            }}
          >
            {editMode ? 'Done' : 'Manage'}
          </Button>
          {editMode ? (
            <Button onClick={() => openCreate()}>Add category</Button>
          ) : null}
        </Group>
      </Group>

      {editMode ? (
        <Card padding="sm" radius="md" className={classes.editBanner}>
          <Text size="sm">Edit mode: tap a category to update its details.</Text>
        </Card>
      ) : null}

      <Card shadow="sm" radius="lg" padding="lg" className={classes.donutCard}>
        {categoriesQuery.isLoading ? (
          <Skeleton height={320} />
        ) : visibleCategories.length === 0 ? (
          <Stack align="center" className={classes.emptyState}>
            <Text fw={600}>No {typeFilter.toLowerCase()} categories yet</Text>
            <Text size="sm" c="dimmed">
              Create the first {typeFilter.toLowerCase()} category to get started.
            </Text>
            <Button onClick={() => openCreate()}>Create category</Button>
          </Stack>
        ) : (
          <div className={classes.donutStage}>
            <div className={`${classes.categoryColumn} ${classes.categoryColumnLeft}`}>
              {(splitCategories.left ?? []).map((category) => (
                <CategoryPill
                  key={category.id}
                  category={category}
                  onClick={() => handleCategoryClick(category)}
                  highlight={editMode}
                />
              ))}
            </div>
            <div className={classes.donutWrap}>
              <DonutChart
                size={donutSize}
                data={donutData}
                withLabels={false}
                withLabelsLine={false}
                thickness={28}
                paddingAngle={2}
              />
              <div className={classes.donutCenter}>
                <Text fw={700} size="xl">
                  {typeFilter}
                </Text>
                <Text size="xs" c="dimmed">
                  {monthLabel}
                </Text>
              </div>
            </div>
            <div className={`${classes.categoryColumn} ${classes.categoryColumnRight}`}>
              {(splitCategories.right ?? []).map((category) => (
                <CategoryPill
                  key={category.id}
                  category={category}
                  onClick={() => handleCategoryClick(category)}
                  highlight={editMode}
                />
              ))}
            </div>
          </div>
        )}
      </Card>

      <Modal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
        title="Create category"
      >
        <Stack gap="sm">
          <TextInput
            label="Category name"
            placeholder="Dining out"
            value={createForm.name}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                name: event.currentTarget?.value ?? '',
              }))
            }
          />
          <ColorInput
            label="Color"
            format="hex"
            value={createForm.color}
            onChange={(value) =>
              setCreateForm((current) => ({
                ...current,
                color: normalizeHexColor(value),
              }))
            }
          />
          <Select
            label="Icon"
            data={safeIconOptions}
            value={createForm.icon}
            onChange={(value) =>
              setCreateForm((current) => ({
                ...current,
                icon: value ?? 'tag',
              }))
            }
            allowDeselect={false}
            renderOption={({ option }) => (
              <Group gap="sm">
                <span className={classes.optionIcon}>
                  <CategoryIcon icon={option.value} color="var(--mantine-color-dark-6)" />
                </span>
                <Text size="sm">{option.label}</Text>
              </Group>
            )}
          />
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              Type
            </Text>
            <Badge variant="light">{createForm.type}</Badge>
          </Group>
          <Select
            label="Parent category"
            data={safeParentOptions}
            value={createForm.parentId}
            onChange={(value) => {
              const parent = (parentCategories ?? []).find((item) => item.id === value) ?? null
              setCreateForm((current) => ({
                ...current,
                parentId: value,
                type: parent?.type ?? current.type,
              }))
            }}
            clearable
            searchable
            placeholder="No parent"
          />
          {createError ? (
            <Text size="sm" c="red">
              {createError}
            </Text>
          ) : null}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setCreateOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={createCategory.isPending}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={!!editCategory}
        onClose={closeEdit}
        title={editCategory ? `Edit ${editCategory.name}` : 'Edit category'}
      >
        <Stack gap="sm">
          <TextInput
            label="Category name"
            value={editForm.name}
            onChange={(event) =>
              setEditForm((current) => ({
                ...current,
                name: event.currentTarget?.value ?? '',
              }))
            }
          />
          <ColorInput
            label="Color"
            format="hex"
            value={editForm.color}
            onChange={(value) =>
              setEditForm((current) => ({
                ...current,
                color: normalizeHexColor(value),
              }))
            }
          />
          <Select
            label="Icon"
            data={safeIconOptions}
            value={editForm.icon}
            onChange={(value) =>
              setEditForm((current) => ({
                ...current,
                icon: value ?? 'tag',
              }))
            }
            allowDeselect={false}
            renderOption={({ option }) => (
              <Group gap="sm">
                <span className={classes.optionIcon}>
                  <CategoryIcon icon={option.value} color="var(--mantine-color-dark-6)" />
                </span>
                <Text size="sm">{option.label}</Text>
              </Group>
            )}
          />
          {editCategory ? (
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                Type
              </Text>
              <Badge variant="light">{editCategory.type}</Badge>
            </Group>
          ) : null}
          <Select
            label="Parent category"
            data={safeEditParentOptions}
            value={editForm.parentId}
            onChange={(value) => setEditForm((current) => ({ ...current, parentId: value }))}
            clearable
            searchable
            placeholder="No parent"
          />
          {editError ? (
            <Text size="sm" c="red">
              {editError}
            </Text>
          ) : null}
          <Group justify="space-between">
            <Button
              variant="subtle"
              color="red"
              onClick={() => setDeleteTarget(editCategory)}
            >
              Delete category
            </Button>
            <Group>
              <Button variant="subtle" onClick={closeEdit}>
                Cancel
              </Button>
              <Button onClick={handleEdit} loading={updateCategory.isPending}>
                Save
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove category">
        <Stack gap="sm">
          <Text size="sm">
            Remove {deleteTarget?.name}? This action cannot be undone.
          </Text>
          {deleteError ? (
            <Text size="sm" c="red">
              {deleteError}
            </Text>
          ) : null}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleteCategory.isPending}>
              Remove
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}

function CategoryPill({
  category,
  onClick,
  highlight,
}: {
  category: CategoryHierarchy
  onClick: () => void
  highlight: boolean
}) {
  const color = normalizeHexColor(category.color)

  return (
    <button
      type="button"
      className={classes.categoryPill}
      onClick={onClick}
      style={{
        ['--pill-color' as string]: color,
      }}
    >
      <span className={classes.categoryPillIcon}>
        <CategoryIcon icon={category.icon} color={color} />
      </span>
      <span className={classes.categoryPillLabel}>{category.name}</span>
      {highlight ? <span className={classes.categoryPillHint}>Edit</span> : null}
    </button>
  )
}
