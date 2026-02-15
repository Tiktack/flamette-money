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
import { getApiErrorMessage } from '../lib/api/errors'
import { categoriesQueryOptions } from '../lib/api/queryOptions'
import { queryClient } from '../lib/api/queryClient'
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
import { openTransactionEditorModal } from '../lib/modals/transactionEditorModal'
import classes from './page.module.css'

export const Route = createFileRoute('/categories')({
  loader: () => queryClient.prefetchQuery(categoriesQueryOptions()),
  component: CategoriesPage,
})

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
  const [deleteTarget, setDeleteTarget] = useState<CategoryHierarchy | null>(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    color: defaultCategoryColor,
    icon: 'IconShoppingCart',
    type: 'Expense' as CategoryType,
    parentId: null as string | null,
  })
  const [editForm, setEditForm] = useState({
    name: '',
    color: defaultCategoryColor,
    icon: 'IconShoppingCart',
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
  const baseCurrency = reportQueryResult.data?.baseCurrency ?? 'USD'
  const isInitialChartLoading = categoriesQuery.isPending || reportQueryResult.isPending
  const hasChartError = categoriesQuery.isError || reportQueryResult.isError

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

  const formatBaseCurrency = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: baseCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)

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
    createCategory.reset()
    const parentType = parent?.type ?? typeFilter
    setCreateForm({
      name: '',
      color: normalizeCategoryColor(parent?.color ?? defaultCategoryColor),
      icon: parent?.icon ?? 'IconShoppingCart',
      type: parentType,
      parentId: parent?.id ?? null,
    })
    setCreateOpened(true)
  }

  const openEdit = (category: CategoryHierarchy) => {
    updateCategory.reset()
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

    openTransactionEditorModal({
      mode: 'new',
      presetCategoryId: category.id,
      presetType: category.type,
    })
  }

  const handleCreate = () => {
    createCategory.mutate(
      {
        name: createForm.name,
        color: normalizeCategoryColor(createForm.color),
        icon: createForm.icon,
        type: createForm.type,
        parentId: createForm.parentId,
      },
      {
        onSuccess: () => setCreateOpened(false),
      },
    )
  }

  const handleEdit = () => {
    if (!editCategory) {
      return
    }

    updateCategory.mutate(
      {
        id: editCategory.id,
        request: {
          name: editForm.name,
          color: normalizeCategoryColor(editForm.color),
          icon: editForm.icon,
          parentId: editForm.parentId,
        },
      },
      {
        onSuccess: () => setEditCategory(null),
      },
    )
  }

  const handleDelete = () => {
    if (!deleteTarget) {
      return
    }

    deleteCategory.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        setEditCategory(null)
      },
    })
  }

  return (
    <Stack className={classes.page}>
      <Group className={classes.header} justify="space-between" wrap="wrap" gap="md">
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
        ) : hasChartError ? (
          <Text size="sm" c="red">
            {getApiErrorMessage(
              categoriesQuery.error ?? reportQueryResult.error,
              'Unable to load categories report.',
            )}
          </Text>
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
                  valueFormatter={(value) => formatBaseCurrency(Number(value))}
                />
                <div className={classes.donutCenter}>
                  <Text fw={800} size={isCompact ? 'xl' : '34px'} lh={1.1}>
                    {typeFilter}
                  </Text>
                  <Text fw={700} size={isCompact ? 'lg' : 'xl'} lh={1.2}>
                    {formatBaseCurrency(donutTotal)}
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
                    formatAmount={formatBaseCurrency}
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
                icon: value ?? 'IconTag',
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
          {createCategory.isError ? (
            <Text size="sm" c="red">
              {getApiErrorMessage(createCategory.error, 'Unable to create category.')}
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
                icon: value ?? 'IconTag',
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
          {updateCategory.isError ? (
            <Text size="sm" c="red">
              {getApiErrorMessage(updateCategory.error, 'Unable to update category.')}
            </Text>
          ) : null}
          <Group justify="space-between">
            <Button
              variant="subtle"
              color="red"
              onClick={() => {
                deleteCategory.reset()
                setDeleteTarget(editCategory)
              }}
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
          {deleteCategory.isError ? (
            <Text size="sm" c="red">
              {getApiErrorMessage(deleteCategory.error, 'Unable to remove category.')}
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
  formatAmount,
  onClickCategory,
}: {
  category: CategoryHierarchy
  amount: number
  formatAmount: (value: number) => string
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
                {formatAmount(amount)}
              </Text>
            </Group>
          </div>
        </div>
      </Card>
    </UnstyledButton>
  )
}
