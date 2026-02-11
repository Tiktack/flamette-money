import { DonutChart } from '@mantine/charts'
import { useElementSize, useMediaQuery } from '@mantine/hooks'
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
  ThemeIcon,
  Title,
  UnstyledButton,
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

  const visibleParentCategories = useMemo(
    () => parentCategories.filter((category) => category.type === typeFilter),
    [parentCategories, typeFilter],
  )

  const isCompact = useMediaQuery('(max-width: 900px)')
  const donutBounds = useElementSize()
  const donutSize = useMemo(() => {
    const width = donutBounds.width
    const height = donutBounds.height
    const minSide = Math.floor(Math.min(width, height))
    if (!minSide || minSide < 100) {
      return isCompact ? 320 : 560
    }

    const maxSize = isCompact ? 560 : 860
    return Math.max(260, Math.min(maxSize, Math.floor(minSide * 0.92)))
  }, [donutBounds.height, donutBounds.width, isCompact])

  const donutThickness = useMemo(
    () => Math.max(26, Math.min(48, Math.floor(donutSize * 0.085))),
    [donutSize],
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

  const categoryAmounts = useMemo(() => {
    const map = new Map<string, number>()
    const parents = visibleParentCategories ?? []

    for (const category of parents) {
      const seed = `${typeFilter}:${category.id}:${category.name}`
      let hash = 0
      for (let index = 0; index < seed.length; index += 1) {
        hash = (hash * 31 + seed.charCodeAt(index)) % 100000
      }

      const base = typeFilter === 'Income' ? 300 : 50
      const spread = typeFilter === 'Income' ? 3500 : 2200
      const value = base + (hash % spread)
      map.set(category.id, value)
    }

    return map
  }, [typeFilter, visibleParentCategories])

  const donutData = useMemo(() => {
    const parents = visibleParentCategories ?? []
    return parents.map((category) => ({
      name: category.name,
      value: categoryAmounts.get(category.id) ?? 0,
      color: normalizeHexColor(category.color),
    }))
  }, [categoryAmounts, visibleParentCategories])

  const donutTotal = useMemo(
    () => donutData.reduce((sum, item) => sum + item.value, 0),
    [donutData],
  )

  const monthLabel = useMemo(
    () =>
      new Date().toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [],
  )

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
          <Button onClick={() => openCreate()}>Add category</Button>
          <Button
            variant={editMode ? 'light' : 'subtle'}
            onClick={() => {
              setEditMode((current) => !current)
              setEditCategory(null)
            }}
          >
            {editMode ? 'Done' : 'Manage'}
          </Button>
        </Group>
      </Group>

      <Card shadow="sm" radius="lg" padding="lg" className={classes.donutCard}>
        {categoriesQuery.isLoading ? (
          <Skeleton height={320} />
        ) : visibleParentCategories.length === 0 ? (
          <Stack align="center" className={classes.emptyState}>
            <Text fw={600}>No {typeFilter.toLowerCase()} categories yet</Text>
            <Text size="sm" c="dimmed">
              Create the first {typeFilter.toLowerCase()} category to get started.
            </Text>
            <Button onClick={() => openCreate()}>Create category</Button>
          </Stack>
        ) : (
          <div className={classes.categoriesStage}>
            <div className={classes.donutArea} ref={donutBounds.ref}>
              <div className={classes.donutSizer}>
                <DonutChart
                  size={donutSize}
                  data={donutData}
                  pieProps={{
                    isAnimationActive:true,
                    animationDuration: 800,
                    animationBegin: 0,
                  }}
                  withLabels={false}
                  withLabelsLine={false}
                  thickness={donutThickness}
                  paddingAngle={2}
                  tooltipDataSource="segment"
                  valueFormatter={(value) => value.toLocaleString('en-US')}
                />
                <div className={classes.donutCenter}>
                  <Text fw={800} size={isCompact ? 'xl' : '34px'} lh={1.1}>
                    {typeFilter}
                  </Text>
                  <Text fw={700} size={isCompact ? 'lg' : 'xl'} lh={1.2}>
                    {donutTotal.toLocaleString('en-US')}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {monthLabel}
                  </Text>
                </div>
              </div>
            </div>

            <div className={classes.categoriesPane}>
              <div className={isCompact ? classes.categoriesGridCompact : classes.categoriesGrid}>
                {visibleParentCategories.map((category) => (
                  <CategoryTile
                    key={category.id}
                    category={category}
                    amount={categoryAmounts.get(category.id) ?? 0}
                    onClickCategory={() => handleCategoryClick(category)}
                  />
                ))}
              </div>
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

          {editCategory && editCategory.parentId === null ? (
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text fw={600} size="sm">
                  Subcategories
                </Text>
                <Button size="xs" variant="light" onClick={() => openCreate(editCategory)}>
                  Add subcategory
                </Button>
              </Group>
              {editCategory.subcategories?.length ? (
                <Stack gap={6}>
                  {editCategory.subcategories.map((subcategory) => (
                    <UnstyledButton
                      key={subcategory.id}
                      type="button"
                      onClick={() => openEdit(subcategory)}
                      style={{ textAlign: 'left' }}
                    >
                      <Card withBorder radius="md" padding="xs">
                        <Group justify="space-between" align="center" wrap="nowrap">
                          <Text size="sm" fw={600} lineClamp={1}>
                            {subcategory.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Edit
                          </Text>
                        </Group>
                      </Card>
                    </UnstyledButton>
                  ))}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  No subcategories yet.
                </Text>
              )}
            </Stack>
          ) : null}
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

function CategoryTile({
  category,
  amount,
  onClickCategory,
}: {
  category: CategoryHierarchy
  amount: number
  onClickCategory: () => void
}) {
  const color = normalizeHexColor(category.color)

  return (
    <UnstyledButton
      type="button"
      className={classes.categoryCardButton}
      onClick={onClickCategory}
    >
      <Card withBorder radius="md" padding="sm" className={classes.categoryCard}>
        <div className={classes.categoryCardHeader}>
          <ThemeIcon
            radius="md"
            size={44}
            variant="light"
            style={{
              backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
              color,
            }}
          >
            <CategoryIcon icon={category.icon} color={color} />
          </ThemeIcon>
          <div className={classes.categoryMeta}>
            <Group gap={6} wrap="nowrap">
              <Text fw={600} size="sm" lineClamp={1}>
                {category.name}
              </Text>
            </Group>
            <Group gap={8} wrap="nowrap">
              <Text size="xs" fw={700}>
                {amount.toLocaleString('en-US')}
              </Text>
            </Group>
          </div>
        </div>
      </Card>
    </UnstyledButton>
  )
}
