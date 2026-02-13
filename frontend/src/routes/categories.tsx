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
  useCategorySeriesReport,
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../lib/api/hooks'
import { SharedDateRangeChips } from '../components/SharedDateRangeChips'
import {
  CategoryIcon,
  categoryIconOptions,
  defaultCategoryColor,
  normalizeCategoryColor,
} from '../lib/categories/visuals'
import {
  resolveSharedDateRange,
  useSharedDateRangeFilters,
} from '../lib/state/sharedDateRangeFilters'
import type { CategoryHierarchy, CategoryType } from '../lib/api/types'
import { Route as RootRoute } from './__root'
import classes from './page.module.css'

export const Route = createFileRoute('/categories')({
  component: CategoriesPage,
})

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.'

function CategoriesPage() {
  const categoriesQuery = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const [typeFilter, setTypeFilter] = useState<CategoryType>('Expense')
  const [editMode, setEditMode] = useState(false)
  const [createOpened, setCreateOpened] = useState(false)
  const [editCategory, setEditCategory] = useState<CategoryHierarchy | null>(null)
  const dateFilters = useSharedDateRangeFilters()
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

  const resolvedDateRange = useMemo(() => resolveSharedDateRange(dateFilters), [dateFilters])

  const reportQuery = useMemo(() => {
    const query: {
      StartDate?: string
      EndDate?: string
      Type: CategoryType
      Interval: 'None'
    } = {
      Type: typeFilter,
      Interval: 'None',
    }

    if (resolvedDateRange.start) {
      query.StartDate = resolvedDateRange.start.toISOString()
    }

    if (resolvedDateRange.end) {
      query.EndDate = resolvedDateRange.end.toISOString()
    }

    return query
  }, [resolvedDateRange.end, resolvedDateRange.start, typeFilter])

  const reportQueryResult = useCategorySeriesReport(reportQuery)
  const hasReportData = Boolean(reportQueryResult.data)
  const isInitialChartLoading = categoriesQuery.isLoading || !hasReportData

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

  const safeIconOptions = useMemo(() => categoryIconOptions.filter(Boolean), [])
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
    for (const entry of reportQueryResult.data?.series ?? []) {
      map.set(entry.key, Number(entry.total))
    }
    return map
  }, [reportQueryResult.data?.series])

  const donutData = useMemo(() => {
    const parents = visibleParentCategories ?? []
    return parents
      .map((category) => ({
        name: category.name,
        value: categoryAmounts.get(category.id) ?? 0,
        color: normalizeCategoryColor(category.color),
      }))
      .filter((item) => item.value !== 0)
  }, [categoryAmounts, visibleParentCategories])

  const donutTotal = useMemo(
    () => donutData.reduce((sum, item) => sum + item.value, 0),
    [donutData],
  )

  const rangeLabel = useMemo(() => {
    if (dateFilters.preset === 'all') {
      return 'All time'
    }

    if (dateFilters.preset === 'month') {
      const anchor = dateFilters.monthAnchor
        ? new Date(`${dateFilters.monthAnchor}T00:00:00`)
        : new Date()
      return anchor.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    }

    if (dateFilters.preset === 'year') {
      return String(dateFilters.yearAnchor)
    }

    if (!resolvedDateRange.start || !resolvedDateRange.end) {
      return 'Custom range'
    }

    return `${resolvedDateRange.start.toLocaleDateString()} - ${resolvedDateRange.end.toLocaleDateString()}`
  }, [
    dateFilters.monthAnchor,
    dateFilters.preset,
    dateFilters.yearAnchor,
    resolvedDateRange.end,
    resolvedDateRange.start,
  ])

  const openCreate = (parent?: CategoryHierarchy) => {
    setCreateError(null)
    const parentType = parent?.type ?? typeFilter
    setCreateForm({
      name: '',
      color: normalizeCategoryColor(parent?.color ?? defaultCategoryColor),
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
      color: normalizeCategoryColor(category.color),
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
            color: normalizeCategoryColor(createForm.color),
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
          color: normalizeCategoryColor(editForm.color),
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
          {editMode ? <Button onClick={() => openCreate()}>Add category</Button> : null}
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

      <Card shadow="sm" radius="md" padding="md" className={classes.dateBar}>
        <SharedDateRangeChips />
      </Card>

      <Card shadow="sm" radius="lg" padding="lg" className={classes.donutCard}>
        <Stack gap="md">
        {isInitialChartLoading ? (
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
                    isAnimationActive: true,
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
                    {rangeLabel}
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
        </Stack>
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
                color: normalizeCategoryColor(value),
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
                color: normalizeCategoryColor(value),
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
  const color = normalizeCategoryColor(category.color)

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
