import {
  ActionIcon,
  Button,
  Chip,
  Collapse,
  Divider,
  FileButton,
  Group,
  Image,
  Modal,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  ThemeIcon,
  Text,
  TextInput,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { IconSparkles } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import {
  useAccounts,
  useAppInfo,
  useCategories,
  useCreateTransaction,
  useScanReceipt,
  useTransaction,
  useTrips,
  useUpdateTransaction,
} from '../lib/api/hooks'
import { getApiErrorMessage } from '../lib/api/errors'
import type {
  CategoryHierarchy,
  ReceiptScanResult,
  TransactionCreateRequest,
  TransactionDetail,
  TransactionType,
  TransactionUpdateRequest,
} from '../lib/api/types'
import { AccountIcon } from '../lib/accounts/visuals'
import { CategoryIcon, normalizeCategoryColor } from '../lib/categories/visuals'

export type TransactionModalMode = 'new' | 'edit'

export type TransactionEditorContentProps = {
  mode: TransactionModalMode
  transactionId?: string
  presetCategoryId?: string
  presetType?: TransactionType
  onClose: () => void
}

type TransactionEditorModalProps = TransactionEditorContentProps & {
  opened: boolean
  withModal?: boolean
}

type TransactionItemFormState = {
  name: string
  quantity: number
  unit: string
  unitPrice: number
  promotionAmount: number
  categoryId: string | null
  subCategoryId: string | null
}

type TransactionFormState = {
  date: string
  type: TransactionType
  amount: number | ''
  amount2: number | ''
  currency: string
  currency2: string
  accountId: string
  tripId: string | null
  categoryId: string | null
  subCategoryId: string | null
  targetAccountId: string | null
  originalTransactionId: string
  note: string
  merchantName: string
  location: string
  items: TransactionItemFormState[]
}

const defaultType: TransactionType = 'Expense'

const normalizeHexColor = (value?: string | null) => {
  if (!value) {
    return '#CED4DA'
  }

  return value.startsWith('#') ? value : `#${value}`
}

const buildCategoryMap = (categories: CategoryHierarchy[]) => {
  const map = new Map<string, CategoryHierarchy>()
  categories.forEach((category) => {
    map.set(category.id, category)
    category.subcategories.forEach((subcategory) => map.set(subcategory.id, subcategory))
  })
  return map
}

const formatDateInput = (value: Date) => value.toISOString().slice(0, 10)

const buildDefaultState = (type: TransactionType): TransactionFormState => ({
  date: formatDateInput(new Date()),
  type,
  amount: '',
  amount2: '',
  currency: 'PLN',
  currency2: 'PLN',
  accountId: '',
  tripId: null,
  categoryId: null,
  subCategoryId: null,
  targetAccountId: null,
  originalTransactionId: '',
  note: '',
  merchantName: '',
  location: '',
  items: [],
})

const fillFromTransaction = (transaction: TransactionDetail): TransactionFormState => ({
  date: transaction.date ? transaction.date.slice(0, 10) : formatDateInput(new Date()),
  type: transaction.type,
  amount: Number(transaction.amount),
  amount2:
    transaction.amount2 === null || transaction.amount2 === undefined
      ? ''
      : Number(transaction.amount2),
  currency: (transaction.currency ?? 'PLN').toUpperCase(),
  currency2: (transaction.currency2 ?? transaction.currency ?? 'PLN').toUpperCase(),
  accountId: transaction.accountId,
  tripId: transaction.tripId,
  categoryId: transaction.categoryId,
  subCategoryId: transaction.subCategoryId,
  targetAccountId: transaction.targetAccountId,
  originalTransactionId: transaction.originalTransactionId ?? '',
  note: transaction.note ?? '',
  merchantName: transaction.merchantName ?? '',
  location: transaction.location ?? '',
  items: (transaction.items ?? []).map((item) => ({
    name: item.name,
    quantity: Number(item.quantity),
    unit: item.unit ?? '',
    unitPrice: Number(item.unitPrice),
    promotionAmount: Number(item.promotionAmount),
    categoryId: item.categoryId,
    subCategoryId: item.subCategoryId,
  })),
})

const toFiniteNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const applyReceiptScanToForm = (
  state: TransactionFormState,
  scanResult: ReceiptScanResult,
): TransactionFormState => {
  const parsedDate = scanResult.date ? new Date(scanResult.date) : null
  const nextDate =
    parsedDate && !Number.isNaN(parsedDate.getTime()) ? formatDateInput(parsedDate) : state.date
  const nextAmount = toFiniteNumber(scanResult.amount)
  const nextCurrency = scanResult.currency ? scanResult.currency.toUpperCase() : state.currency

  const scannedItems: TransactionItemFormState[] = (scanResult.items ?? []).map((item) => ({
    name: item.name ?? '',
    quantity: toFiniteNumber(item.quantity) ?? 1,
    unit: item.unit ?? '',
    unitPrice: toFiniteNumber(item.unitPrice) ?? 0,
    promotionAmount: toFiniteNumber(item.promotionAmount) ?? 0,
    categoryId: item.categoryId,
    subCategoryId: item.subCategoryId,
  }))

  const firstCategorizedItem = scannedItems.find((item) => item.categoryId || item.subCategoryId)

  return {
    ...state,
    type: 'Expense',
    date: nextDate,
    amount: nextAmount && nextAmount > 0 ? nextAmount : state.amount,
    amount2: '',
    currency: nextCurrency,
    currency2: nextCurrency,
    targetAccountId: null,
    originalTransactionId: '',
    merchantName: scanResult.merchant?.trim() || state.merchantName,
    categoryId: firstCategorizedItem?.categoryId ?? state.categoryId,
    subCategoryId:
      firstCategorizedItem?.subCategoryId ??
      (firstCategorizedItem?.categoryId ? null : state.subCategoryId),
    items: scannedItems,
  }
}

const applyPresetCategory = (
  state: TransactionFormState,
  presetCategoryId: string,
  categories: CategoryHierarchy[],
) => {
  const map = buildCategoryMap(categories)
  const category = map.get(presetCategoryId)
  if (!category) {
    return state
  }

  if (category.parentId) {
    return {
      ...state,
      type: category.type === 'Income' ? 'Income' : 'Expense',
      categoryId: category.parentId,
      subCategoryId: category.id,
    }
  }

  return {
    ...state,
    type: category.type === 'Income' ? 'Income' : 'Expense',
    categoryId: category.id,
    subCategoryId: null,
  }
}

export function TransactionEditorModal({
  opened,
  withModal = true,
  mode,
  transactionId,
  presetCategoryId,
  presetType,
  onClose,
}: TransactionEditorModalProps) {
  const isOpen = withModal ? opened : true
  const accountsQuery = useAccounts()
  const appInfoQuery = useAppInfo()
  const categoriesQuery = useCategories()
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const scanReceipt = useScanReceipt()
  const tripsQuery = useTrips()
  const transactionQuery = useTransaction(mode === 'edit' ? transactionId : undefined)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [form, setForm] = useState<TransactionFormState>(() =>
    buildDefaultState(presetType ?? defaultType),
  )
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  const isEditingLoading = mode === 'edit' && transactionQuery.isLoading
  const transactionLoadError = mode === 'edit' && transactionQuery.isError

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])
  const categoryMap = useMemo(() => buildCategoryMap(categories), [categories])

  const accountsById = useMemo(() => {
    const map = new Map<string, { name: string; currency: string; color: string; icon: string }>()
    for (const account of accountsQuery.data ?? []) {
      map.set(account.id, {
        name: account.name,
        currency: account.currency,
        color: normalizeHexColor(account.color),
        icon: account.icon,
      })
    }
    return map
  }, [accountsQuery.data])

  const currencyOptions = useMemo(() => {
    const set = new Set<string>()

    for (const currency of appInfoQuery.data?.supportedCurrencies ?? []) {
      set.add(currency.code.toUpperCase())
    }

    for (const account of accountsQuery.data ?? []) {
      if (account.currency) {
        set.add(account.currency.toUpperCase())
      }
    }
    return [...set].map((value) => ({ value, label: value }))
  }, [accountsQuery.data, appInfoQuery.data?.supportedCurrencies])

  const accountOptions = useMemo(
    () =>
      (accountsQuery.data ?? []).map((account) => ({
        value: account.id,
        label: account.name,
      })),
    [accountsQuery.data],
  )

  const accountColorMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const account of accountsQuery.data ?? []) {
      map.set(account.id, normalizeHexColor(account.color))
    }
    return map
  }, [accountsQuery.data])

  const categoryOptions = useMemo(() => {
    const grouped: Record<string, { group: string; items: { value: string; label: string }[] }> = {}

    for (const category of categories) {
      const group = category.type ?? 'Other'
      if (!grouped[group]) {
        grouped[group] = { group, items: [] }
      }

      grouped[group].items.push({ value: category.id, label: category.name })
    }

    return Object.values(grouped)
  }, [categories])

  const categoryOptionsByType = useMemo(() => {
    if (form.type === 'Transfer') {
      return []
    }

    const allowedType = form.type === 'Income' ? 'Income' : 'Expense'
    return categoryOptions.filter((group) => group.group === allowedType)
  }, [categoryOptions, form.type])

  const tripOptions = useMemo(
    () =>
      (tripsQuery.data ?? []).map((trip) => ({
        value: trip.id,
        label: trip.name,
      })),
    [tripsQuery.data],
  )


  const selectedCategory = useMemo(
    () => (form.categoryId ? categoryMap.get(form.categoryId) ?? null : null),
    [categoryMap, form.categoryId],
  )

  const selectedCategoryColor = useMemo(() => {
    if (!selectedCategory) {
      return null
    }

    return normalizeCategoryColor(selectedCategory.color)
  }, [selectedCategory])

  const selectedParentCategory = useMemo(() => {
    if (!form.categoryId) {
      return null
    }

    return categories.find((category) => category.id === form.categoryId) ?? null
  }, [categories, form.categoryId])

  const subcategoriesForParent = useMemo(
    () => selectedParentCategory?.subcategories ?? [],
    [selectedParentCategory],
  )

  const typeOptions = useMemo(
    () => [
      { value: 'Expense', label: 'Expense' },
      { value: 'Income', label: 'Income' },
      { value: 'Transfer', label: 'Transfer' },
      { value: 'Refund', label: 'Refund' },
    ],
    [],
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setErrorMessage(null)

    if (mode === 'edit' && transactionQuery.data) {
      setForm(fillFromTransaction(transactionQuery.data))
      return
    }

    if (mode === 'new') {
      const nextState = buildDefaultState(presetType ?? defaultType)
      const withCategory =
        presetCategoryId && categories.length
          ? applyPresetCategory(nextState, presetCategoryId, categories)
          : nextState

      const defaultAccount = accountsQuery.data?.[0]
      const accountId = withCategory.accountId || defaultAccount?.id || ''
      const sourceCurrency = defaultAccount?.currency?.toUpperCase() ?? withCategory.currency
      setForm({
        ...withCategory,
        accountId,
        currency: sourceCurrency,
        currency2: sourceCurrency,
        type: (presetType ?? withCategory.type) as TransactionType,
      })
    }
  }, [
    accountsQuery.data,
    categories,
    mode,
    isOpen,
    presetCategoryId,
    presetType,
    transactionQuery.data,
  ])

  useEffect(() => {
    if (!isOpen) {
      setAdvancedOpen(false)
      setScanFile(null)
      setScanPreview(null)
      setScanResult(null)
      setScanError(null)
    }
  }, [isOpen])

  useEffect(
    () => () => {
      if (scanPreview) {
        URL.revokeObjectURL(scanPreview)
      }
    },
    [scanPreview],
  )

  const requiresTarget = form.type === 'Transfer'
  const requiresOriginal = form.type === 'Refund'
  const showCategoryFields = form.type !== 'Transfer'

  const handleSubmit = async () => {
    setErrorMessage(null)

    if (!form.date) {
      setErrorMessage('Date is required.')
      return
    }

    if (!form.accountId) {
      setErrorMessage('Account is required.')
      return
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setErrorMessage('Amount must be greater than 0.')
      return
    }

    if (requiresTarget && !form.targetAccountId) {
      setErrorMessage('Target account is required for transfers.')
      return
    }

    if (requiresTarget && form.amount2 !== '' && Number(form.amount2) <= 0) {
      setErrorMessage('Transfer amount to target must be greater than 0.')
      return
    }

    if (requiresOriginal && !form.originalTransactionId) {
      setErrorMessage('Original transaction is required for refunds.')
      return
    }

    const baseRequest: TransactionCreateRequest | TransactionUpdateRequest = {
      date: new Date(`${form.date}T00:00:00`).toISOString(),
      type: form.type,
      amount: Number(form.amount),
      amount2:
        form.type === 'Transfer'
          ? form.amount2 === ''
            ? Number(form.amount)
            : Number(form.amount2)
          : form.amount2 === ''
            ? null
            : Number(form.amount2),
      currency: form.currency ? form.currency.toUpperCase() : null,
      currency2: form.type === 'Transfer'
        ? (form.currency2 || form.currency).toUpperCase()
        : form.currency2
          ? form.currency2.toUpperCase()
          : null,
      accountId: form.accountId,
      tripId: form.type === 'Expense' ? form.tripId : null,
      categoryId: showCategoryFields ? form.categoryId : null,
      subCategoryId: showCategoryFields ? form.subCategoryId : null,
      targetAccountId: requiresTarget ? form.targetAccountId : null,
      originalTransactionId: requiresOriginal ? form.originalTransactionId : null,
      note: form.note ? form.note.trim() : null,
      merchantName: form.merchantName ? form.merchantName.trim() : null,
      location: form.location ? form.location.trim() : null,
      items:
        form.items.length > 0
          ? form.items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit || null,
              unitPrice: item.unitPrice,
              promotionAmount: item.promotionAmount,
              categoryId: item.categoryId,
              subCategoryId: item.subCategoryId,
            }))
          : null,
    }

    try {
      if (mode === 'edit' && transactionId) {
        await updateTransaction.mutateAsync({ id: transactionId, request: baseRequest })
      } else {
        await createTransaction.mutateAsync(baseRequest)
      }
      onClose()
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to save transaction.'))
    }
  }

  const handleAiReceiptSelected = async (value: File | null) => {
    if (scanPreview) {
      URL.revokeObjectURL(scanPreview)
    }

    setScanFile(value)
    setScanResult(null)
    setScanError(null)

    if (!value) {
      setScanPreview(null)
      return
    }

    setScanPreview(URL.createObjectURL(value))

    if (!form.accountId) {
      setScanError('Please select an account first.')
      return
    }

    try {
      const result = await scanReceipt.mutateAsync({ file: value, accountId: form.accountId })
      setScanResult(result)
      setForm((state) => applyReceiptScanToForm(state, result))
    } catch (error) {
      setScanError(getApiErrorMessage(error, 'Failed to scan receipt'))
    }
  }

  const manualTabContent = (
    <Stack gap="lg">
      {isEditingLoading ? (
        <Text size="sm" c="dimmed">Loading transaction...</Text>
      ) : null}
      {transactionLoadError ? (
        <Text size="sm" c="red">Unable to load transaction details.</Text>
      ) : null}

      {mode === 'new' ? (
        <Paper withBorder p="md" radius="lg">
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start" wrap="wrap">
              <Stack gap={2}>
                <Group gap="xs">
                  <ThemeIcon radius="xl" variant="light" color="violet">
                    <IconSparkles size={16} />
                  </ThemeIcon>
                  <Text fw={700}>AI receipt scan</Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Upload a receipt image to auto-fill fields. You can edit everything before saving.
                </Text>
              </Stack>

              <FileButton
                onChange={handleAiReceiptSelected}
                accept="image/jpeg,image/png,image/webp"
              >
                {(props) => (
                  <Button
                    {...props}
                    variant="light"
                    leftSection={<IconSparkles size={16} />}
                    loading={scanReceipt.isPending}
                    loaderProps={{ type: 'dots' }}
                  >
                    {scanReceipt.isPending ? 'Scanning...' : 'Scan with AI'}
                  </Button>
                )}
              </FileButton>
            </Group>

            {scanFile ? (
              <Text size="xs" c="dimmed">
                Selected file: {scanFile.name}
              </Text>
            ) : null}

            {scanPreview ? (
              <Image
                src={scanPreview}
                alt="Receipt preview"
                mah={180}
                fit="contain"
                radius="md"
              />
            ) : null}

            {scanError ? (
              <Text size="sm" c="red">
                {scanError}
              </Text>
            ) : null}

            {scanResult ? (
              <Group gap="xs" wrap="wrap">
                <Text size="sm" fw={600} c="teal">
                  Draft applied
                </Text>
                {scanResult.merchant ? <Text size="sm">• {scanResult.merchant}</Text> : null}
                <Text size="sm">
                  • {Number(scanResult.amount).toFixed(2)} {(scanResult.currency ?? form.currency).toUpperCase()}
                </Text>
                <Text size="sm">• {scanResult.items.length} items</Text>
              </Group>
            ) : null}
          </Stack>
        </Paper>
      ) : null}

      {/* Type selector */}
      <SegmentedControl
        data={typeOptions}
        value={form.type}
        onChange={(value) =>
          setForm((state) => {
            const nextType = (value ?? defaultType) as TransactionType
            const allowedType = nextType === 'Income' ? 'Income' : 'Expense'
            const category = state.categoryId ? categoryMap.get(state.categoryId) : null
            const keepsCategory = category && category.type === allowedType
            const sourceCurrency = state.accountId
              ? (accountsById.get(state.accountId)?.currency ?? state.currency)
              : state.currency
            const targetCurrency = state.targetAccountId
              ? (accountsById.get(state.targetAccountId)?.currency ?? state.currency2)
              : state.currency2

            return {
              ...state,
              type: nextType,
              tripId: nextType === 'Expense' ? state.tripId : null,
              categoryId: nextType === 'Transfer' || !keepsCategory ? null : state.categoryId,
              subCategoryId:
                nextType === 'Transfer' || !keepsCategory ? null : state.subCategoryId,
              targetAccountId: nextType === 'Transfer' ? state.targetAccountId : null,
              originalTransactionId: nextType === 'Refund' ? state.originalTransactionId : '',
              amount2: nextType === 'Transfer' ? state.amount2 : '',
              currency: nextType === 'Transfer' ? sourceCurrency : state.currency,
              currency2: nextType === 'Transfer' ? targetCurrency : sourceCurrency,
            }
          })
        }
        fullWidth
        radius="xl"
        disabled={isEditingLoading}
      />

      {/* Account & Category blocks */}
      <SimpleGrid cols={{ base: 1, sm: showCategoryFields ? 2 : 1 }} spacing="sm">
        {/* Source account */}
        <Paper
          withBorder
          p="sm"
          radius="md"
          style={{
            borderLeft: `4px solid ${accountColorMap.get(form.accountId) ?? '#CED4DA'}`,
          }}
        >
          <Text size="xs" c="dimmed" mb={2}>
            {requiresTarget ? 'From account' : 'Account'}
          </Text>
          <Select
            data={accountOptions}
            value={form.accountId}
            onChange={(value) =>
              setForm((state) => {
                const nextAccountId = value ?? ''
                const nextCurrency =
                  accountsById.get(nextAccountId)?.currency?.toUpperCase() ?? state.currency
                const nextTargetCurrency =
                  state.targetAccountId
                    ? accountsById.get(state.targetAccountId)?.currency?.toUpperCase() ?? state.currency2
                    : state.currency2
                return {
                  ...state,
                  accountId: nextAccountId,
                  currency: nextCurrency,
                  currency2: requiresTarget ? nextTargetCurrency : nextCurrency,
                }
              })
            }
            variant="unstyled"
            allowDeselect={false}
            disabled={isEditingLoading}
            styles={{
              input: {
                fontWeight: 600,
                fontSize: 16,
                padding: 0,
                minHeight: 'unset',
                height: 28,
              },
            }}
            renderOption={({ option }) => (
              <Group gap="sm">
                <span className="account-option-badge" style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  display: 'grid',
                  placeItems: 'center',
                  backgroundColor: accountColorMap.get(option.value) ?? '#CED4DA',
                }}>
                  <AccountIcon
                    icon={accountsById.get(option.value)?.icon ?? 'IconWallet'}
                    color="var(--mantine-color-white)"
                    size={14}
                  />
                </span>
                <Text size="sm">{option.label}</Text>
              </Group>
            )}
          />
        </Paper>

        {/* Category */}
        {showCategoryFields ? (
          <Paper
            withBorder
            p="sm"
            radius="md"
            style={{
              borderLeft: `4px solid ${selectedCategoryColor ?? '#CED4DA'}`,
            }}
          >
            <Text size="xs" c="dimmed" mb={2}>
              Category
            </Text>
            <Select
              data={categoryOptionsByType}
              value={form.categoryId}
              onChange={(value) =>
                setForm((state) => ({
                  ...state,
                  categoryId: value ?? null,
                  subCategoryId: null,
                }))
              }
              variant="unstyled"
              searchable
              clearable
              placeholder="Select category"
              disabled={isEditingLoading}
              styles={{
                input: {
                  fontWeight: 600,
                  fontSize: 16,
                  paddingTop: 0,
                  paddingBottom: 0,
                  paddingRight: 0,
                  paddingLeft: 30,
                  minHeight: 'unset',
                  height: 28,
                  lineHeight: '28px',
                },
                section: {
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                },
              }}
              leftSection={
                selectedCategory && selectedCategoryColor ? (
                  <CategoryIcon
                    icon={selectedCategory.icon ?? 'IconTag'}
                    color={selectedCategoryColor}
                    size={18}
                  />
                ) : null
              }
              leftSectionPointerEvents="none"
              renderOption={({ option }) => {
                const category = categoryMap.get(option.value)
                const color = normalizeCategoryColor(category?.color)
                return (
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon
                      radius="xl"
                      size={28}
                      variant="light"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
                        color,
                      }}
                    >
                      <CategoryIcon icon={category?.icon ?? 'IconTag'} color={color} size={18} />
                    </ThemeIcon>
                    <Text size="sm" fw={600}>
                      {option.label}
                    </Text>
                  </Group>
                )
              }}
            />

          </Paper>
        ) : null}
      </SimpleGrid>

      {showCategoryFields && form.categoryId && subcategoriesForParent.length > 0 ? (
        <Chip.Group
          multiple={false}
          value={form.subCategoryId}
          onChange={(value) =>
            setForm((state) => ({
              ...state,
              subCategoryId: typeof value === 'string' ? value : null,
            }))
          }
        >
          <Group gap={4} wrap="wrap">
            {subcategoriesForParent.map((subcategory) => {
              const color = normalizeCategoryColor(subcategory.color)
              return (
                <Chip
                  key={subcategory.id}
                  value={subcategory.id}
                  disabled={isEditingLoading}
                  variant="light"
                  radius="xl"
                  size="xs"
                  color={color}
                  onClick={(event) => {
                    if (event.currentTarget.value === form.subCategoryId) {
                      setForm((state) => ({ ...state, subCategoryId: null }))
                    }
                  }}
                >
                  <Group gap={4} wrap="nowrap">
                    <CategoryIcon
                      icon={subcategory.icon ?? 'IconTag'}
                      color={color}
                      size={14}
                    />
                    <Text size="xs" fw={600}>
                      {subcategory.name}
                    </Text>
                  </Group>
                </Chip>
              )
            })}
          </Group>
        </Chip.Group>
      ) : null}

      {/* Target account for transfers */}
      {requiresTarget ? (
        <Paper
          withBorder
          p="sm"
          radius="md"
          style={{
            borderLeft: `4px solid ${accountColorMap.get(form.targetAccountId ?? '') ?? '#CED4DA'}`,
          }}
        >
          <Text size="xs" c="dimmed" mb={2}>
            To account
          </Text>
          <Select
            data={accountOptions}
            value={form.targetAccountId}
            onChange={(value) =>
              setForm((state) => {
                const nextTarget = value ?? null
                const targetCurrency =
                  (nextTarget ? accountsById.get(nextTarget)?.currency : null) ?? state.currency2
                return {
                  ...state,
                  targetAccountId: nextTarget,
                  currency2: targetCurrency,
                }
              })
            }
            variant="unstyled"
            allowDeselect={false}
            disabled={isEditingLoading}
            styles={{
              input: {
                fontWeight: 600,
                fontSize: 16,
                padding: 0,
                minHeight: 'unset',
                height: 28,
              },
            }}
            renderOption={({ option }) => (
              <Group gap="sm">
                <span className="account-option-badge" style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  display: 'grid',
                  placeItems: 'center',
                  backgroundColor: accountColorMap.get(option.value) ?? '#CED4DA',
                }}>
                  <AccountIcon
                    icon={accountsById.get(option.value)?.icon ?? 'IconWallet'}
                    color="var(--mantine-color-white)"
                    size={14}
                  />
                </span>
                <Text size="sm">{option.label}</Text>
              </Group>
            )}
          />
        </Paper>
      ) : null}

      {/* Amount area - prominent & centered */}
      <Paper
        withBorder
        radius="lg"
        p="md"
        style={{
          backgroundColor: 'var(--mantine-color-default)',
          borderColor: 'var(--mantine-color-default-border)',
        }}
      >
        <Stack gap={4} align="center">
          <Group gap={4} justify="center" align="baseline" wrap="nowrap">
            <NumberInput
              value={form.amount}
              onChange={(value) =>
                setForm((state) => ({
                  ...state,
                  amount: typeof value === 'number' ? value : '',
                }))
              }
              min={0}
              decimalScale={2}
              variant="unstyled"
              placeholder="0.00"
              hideControls
              styles={{
                input: {
                  fontSize: 36,
                  fontWeight: 700,
                  textAlign: 'right',
                  width: 180,
                  padding: 0,
                },
              }}
              disabled={isEditingLoading}
            />
            <Select
              data={currencyOptions}
              value={form.currency}
              onChange={(value) =>
                setForm((state) => ({ ...state, currency: value ?? state.currency }))
              }
              variant="unstyled"
              searchable
              allowDeselect={false}
              disabled={isEditingLoading || requiresTarget}
              styles={{
                input: {
                  fontSize: 20,
                  fontWeight: 600,
                  width: 70,
                  padding: 0,
                  color: 'var(--mantine-color-dimmed)',
                },
              }}
            />
          </Group>

          {/* Transfer target amount */}
          {requiresTarget ? (
            <>
              <Text c="dimmed" size="lg" lh={1}>
                ↓
              </Text>
              <Group gap={4} justify="center" align="baseline" wrap="nowrap">
                <NumberInput
                  value={form.amount2}
                  onChange={(value) =>
                    setForm((state) => ({
                      ...state,
                      amount2: typeof value === 'number' ? value : '',
                    }))
                  }
                  min={0}
                  decimalScale={2}
                  variant="unstyled"
                  placeholder={String(form.amount || '0.00')}
                  hideControls
                  styles={{
                    input: {
                      fontSize: 28,
                      fontWeight: 600,
                      textAlign: 'right',
                      width: 150,
                      padding: 0,
                      opacity: 0.7,
                    },
                  }}
                  disabled={isEditingLoading}
                />
                <Select
                  data={currencyOptions}
                  value={form.currency2}
                  onChange={(value) =>
                    setForm((state) => ({ ...state, currency2: value ?? state.currency2 }))
                  }
                  variant="unstyled"
                  searchable
                  allowDeselect={false}
                  disabled={isEditingLoading || requiresTarget}
                  styles={{
                    input: {
                      fontSize: 16,
                      fontWeight: 600,
                      width: 65,
                      padding: 0,
                      color: 'var(--mantine-color-dimmed)',
                    },
                  }}
                />
              </Group>
            </>
          ) : null}

        </Stack>
      </Paper>

      {/* Note & Date - minimal */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <TextInput
          placeholder="Add a note..."
          variant="filled"
          radius="md"
          value={form.note}
          onChange={(event) =>
            setForm((state) => ({ ...state, note: event.currentTarget.value }))
          }
          disabled={isEditingLoading}
        />
        <DatePickerInput
          variant="filled"
          radius="md"
          value={form.date || null}
          onChange={(value) =>
            setForm((state) => ({
              ...state,
              date: value ?? '',
            }))
          }
          valueFormat="YYYY-MM-DD"
          disabled={isEditingLoading}
        />
      </SimpleGrid>

      {/* Advanced section toggle */}
      <Divider
        label={
          <Button
            variant="subtle"
            size="xs"
            color="gray"
            onClick={() => setAdvancedOpen((o) => !o)}
          >
            {advancedOpen ? '▾ Less options' : '▸ More options'}
          </Button>
        }
        labelPosition="center"
      />

      <Collapse in={advancedOpen}>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput
              label="Merchant"
              value={form.merchantName}
              onChange={(event) =>
                setForm((state) => ({ ...state, merchantName: event.currentTarget.value }))
              }
              disabled={isEditingLoading}
              placeholder="Optional"
            />
            <TextInput
              label="Location"
              value={form.location}
              onChange={(event) =>
                setForm((state) => ({ ...state, location: event.currentTarget.value }))
              }
              disabled={isEditingLoading}
              placeholder="Optional"
            />
          </SimpleGrid>

          {form.type === 'Expense' ? (
            <Select
              label="Trip"
              data={tripOptions}
              value={form.tripId}
              onChange={(value) =>
                setForm((state) => ({
                  ...state,
                  tripId: value ?? null,
                }))
              }
              searchable
              clearable
              placeholder="Optional"
              disabled={isEditingLoading || tripsQuery.isLoading}
            />
          ) : null}

          {requiresOriginal ? (
            <TextInput
              label="Original transaction ID"
              value={form.originalTransactionId}
              onChange={(event) =>
                setForm((state) => ({
                  ...state,
                  originalTransactionId: event.currentTarget.value,
                }))
              }
              placeholder="Paste transaction ID"
              disabled={isEditingLoading}
            />
          ) : null}

          {/* Items */}
          <Divider label="Items" labelPosition="left" />

          {form.items.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <Table verticalSpacing="xs" horizontalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Qty</Table.Th>
                    <Table.Th>Unit price</Table.Th>
                    <Table.Th>Promo</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {form.items.map((item, index) => (
                    <Table.Tr key={index}>
                      <Table.Td>
                        <TextInput
                          value={item.name}
                          onChange={(e) =>
                            setForm((state) => ({
                              ...state,
                              items: state.items.map((it, i) =>
                                i === index ? { ...it, name: e.currentTarget.value } : it,
                              ),
                            }))
                          }
                          size="xs"
                          variant="unstyled"
                          styles={{ input: { fontWeight: 500 } }}
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={item.quantity}
                          onChange={(value) =>
                            setForm((state) => ({
                              ...state,
                              items: state.items.map((it, i) =>
                                i === index
                                  ? { ...it, quantity: typeof value === 'number' ? value : 1 }
                                  : it,
                              ),
                            }))
                          }
                          min={0}
                          size="xs"
                          variant="unstyled"
                          w={50}
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={item.unitPrice}
                          onChange={(value) =>
                            setForm((state) => ({
                              ...state,
                              items: state.items.map((it, i) =>
                                i === index
                                  ? { ...it, unitPrice: typeof value === 'number' ? value : 0 }
                                  : it,
                              ),
                            }))
                          }
                          min={0}
                          decimalScale={2}
                          size="xs"
                          variant="unstyled"
                          w={80}
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={item.promotionAmount}
                          onChange={(value) =>
                            setForm((state) => ({
                              ...state,
                              items: state.items.map((it, i) =>
                                i === index
                                  ? {
                                      ...it,
                                      promotionAmount: typeof value === 'number' ? value : 0,
                                    }
                                  : it,
                              ),
                            }))
                          }
                          min={0}
                          decimalScale={2}
                          size="xs"
                          variant="unstyled"
                          w={70}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Select
                          data={categoryOptionsByType}
                          value={item.categoryId}
                          onChange={(value) =>
                            setForm((state) => ({
                              ...state,
                              items: state.items.map((it, i) =>
                                i === index
                                  ? { ...it, categoryId: value, subCategoryId: null }
                                  : it,
                              ),
                            }))
                          }
                          size="xs"
                          clearable
                          placeholder="Category"
                          w={130}
                        />
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() =>
                            setForm((state) => ({
                              ...state,
                              items: state.items.filter((_, i) => i !== index),
                            }))
                          }
                        >
                          ×
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          ) : null}

          <Button
            variant="light"
            size="xs"
            onClick={() =>
              setForm((state) => ({
                ...state,
                items: [
                  ...state.items,
                  {
                    name: '',
                    quantity: 1,
                    unit: '',
                    unitPrice: 0,
                    promotionAmount: 0,
                    categoryId: null,
                    subCategoryId: null,
                  },
                ],
              }))
            }
            disabled={isEditingLoading}
          >
            + Add item
          </Button>
        </Stack>
      </Collapse>

      {errorMessage ? (
        <Text size="sm" c="red">
          {errorMessage}
        </Text>
      ) : null}

      <Group justify="space-between">
        <Button variant="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          loading={createTransaction.isPending || updateTransaction.isPending}
        >
          {mode === 'edit' ? 'Save changes' : 'Create transaction'}
        </Button>
      </Group>
    </Stack>
  )

  const modalBody = manualTabContent

  if (!withModal) {
    return modalBody
  }

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit transaction' : 'New transaction'}
      size="lg"
    >
      {modalBody}
    </Modal>
  )
}
