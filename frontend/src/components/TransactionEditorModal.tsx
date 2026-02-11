import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  FileInput,
  Group,
  Image,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  ThemeIcon,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useEffect, useMemo, useState } from 'react'
import {
  useAccounts,
  useCategories,
  useCreateTransaction,
  useScanReceipt,
  useTransaction,
  useUpdateTransaction,
} from '../lib/api/hooks'
import type {
  CategoryHierarchy,
  ReceiptScanResult,
  TransactionCreateRequest,
  TransactionDetail,
  TransactionType,
  TransactionUpdateRequest,
} from '../lib/api/types'
import { CategoryIcon, normalizeCategoryColor } from '../lib/categories/visuals'

export type TransactionModalMode = 'new' | 'edit'

type TransactionEditorModalProps = {
  opened: boolean
  mode: TransactionModalMode
  transactionId?: string
  presetCategoryId?: string
  presetType?: TransactionType
  onClose: () => void
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
  accountId: string
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

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.'

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
  accountId: '',
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
  accountId: transaction.accountId,
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
  mode,
  transactionId,
  presetCategoryId,
  presetType,
  onClose,
}: TransactionEditorModalProps) {
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const scanReceipt = useScanReceipt()
  const transactionQuery = useTransaction(mode === 'edit' ? transactionId : undefined)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [form, setForm] = useState<TransactionFormState>(() =>
    buildDefaultState(presetType ?? defaultType),
  )
  const [activeTab, setActiveTab] = useState<string>('manual')
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanAccountId, setScanAccountId] = useState('')
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  const isEditingLoading = mode === 'edit' && transactionQuery.isLoading
  const transactionLoadError = mode === 'edit' && transactionQuery.isError

  const categories = categoriesQuery.data ?? []
  const categoryMap = useMemo(() => buildCategoryMap(categories), [categories])

  const accountOptions = useMemo(
    () =>
      (accountsQuery.data ?? []).map((account) => ({
        value: account.id,
        label: account.name,
      })),
    [accountsQuery.data],
  )

  const accountOptionsWithCurrency = useMemo(
    () =>
      (accountsQuery.data ?? []).map((account) => ({
        value: account.id,
        label: `${account.name} \u00B7 ${account.currency}`,
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
    if (!opened) {
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

      const accountId = withCategory.accountId || accountsQuery.data?.[0]?.id || ''
      setForm({
        ...withCategory,
        accountId,
        type: (presetType ?? withCategory.type) as TransactionType,
      })
    }
  }, [
    accountsQuery.data,
    categories,
    mode,
    opened,
    presetCategoryId,
    presetType,
    transactionQuery.data,
  ])

  // Reset AI tab state when modal closes
  useEffect(() => {
    if (!opened) {
      setActiveTab('manual')
      setScanFile(null)
      setScanPreview(null)
      setScanAccountId('')
      setScanResult(null)
      setScanError(null)
    }
  }, [opened])

  const categoryType = form.categoryId ? categoryMap.get(form.categoryId)?.type : null
  const typeHint = categoryType ? `Category: ${categoryType}` : null
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

    if (requiresOriginal && !form.originalTransactionId) {
      setErrorMessage('Original transaction is required for refunds.')
      return
    }

    const baseRequest: TransactionCreateRequest | TransactionUpdateRequest = {
      date: new Date(`${form.date}T00:00:00`).toISOString(),
      type: form.type,
      amount: Number(form.amount),
      accountId: form.accountId,
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
      setErrorMessage(getErrorMessage(error))
    }
  }

  const handleScanFileChange = (value: File | null) => {
    setScanFile(value)
    setScanResult(null)
    setScanError(null)
    if (value) {
      setScanPreview(URL.createObjectURL(value))
    } else {
      setScanPreview(null)
    }
  }

  const handleScan = async () => {
    if (!scanFile) return
    if (!scanAccountId) {
      setScanError('Please select an account first.')
      return
    }
    setScanError(null)

    try {
      const result = await scanReceipt.mutateAsync({ file: scanFile, accountId: scanAccountId })
      setScanResult(result)
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Failed to scan receipt')
    }
  }

  const handleScanClose = () => {
    onClose()
  }

  const manualTabContent = (
    <Stack gap="sm">
      {isEditingLoading ? (
        <Text size="sm" c="dimmed">
          Loading transaction...
        </Text>
      ) : null}
      {transactionLoadError ? (
        <Text size="sm" c="red">
          Unable to load transaction details.
        </Text>
      ) : null}
      <Group gap="md" wrap="wrap">
        <DatePickerInput
          label="Date"
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
        <Select
          label="Type"
          data={typeOptions}
          value={form.type}
          onChange={(value) =>
            setForm((state) => {
              const nextType = (value ?? defaultType) as TransactionType
              const allowedType = nextType === 'Income' ? 'Income' : 'Expense'
              const category = state.categoryId ? categoryMap.get(state.categoryId) : null
              const keepsCategory = category && category.type === allowedType

              return {
                ...state,
                type: nextType,
                categoryId: nextType === 'Transfer' || !keepsCategory ? null : state.categoryId,
                subCategoryId:
                  nextType === 'Transfer' || !keepsCategory ? null : state.subCategoryId,
                targetAccountId: nextType === 'Transfer' ? state.targetAccountId : null,
                originalTransactionId: nextType === 'Refund' ? state.originalTransactionId : '',
              }
            })
          }
          allowDeselect={false}
          disabled={isEditingLoading}
        />
        <NumberInput
          label="Amount"
          min={0}
          value={form.amount}
          onChange={(value) =>
            setForm((state) => ({
              ...state,
              amount: typeof value === 'number' ? value : '',
            }))
          }
          disabled={isEditingLoading}
        />
      </Group>

      <Group gap="md" wrap="wrap">
        <Select
          label={requiresTarget ? 'From account' : 'Account'}
          data={accountOptions}
          value={form.accountId}
          onChange={(value) => setForm((state) => ({ ...state, accountId: value ?? '' }))}
          allowDeselect={false}
          disabled={isEditingLoading}
          renderOption={({ option }) => (
            <Group gap="sm">
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: accountColorMap.get(option.value) ?? '#CED4DA',
                }}
              />
              <Text size="sm">{option.label}</Text>
            </Group>
          )}
        />
        {requiresTarget ? (
          <Select
            label="To account"
            data={accountOptions}
            value={form.targetAccountId}
            onChange={(value) =>
              setForm((state) => ({ ...state, targetAccountId: value ?? null }))
            }
            allowDeselect={false}
            disabled={isEditingLoading}
          />
        ) : null}
      </Group>

      {showCategoryFields ? (
        <>
          <Group gap="md" wrap="wrap">
            <Select
              label="Category"
              data={categoryOptionsByType}
              value={form.categoryId}
              onChange={(value) =>
                setForm((state) => ({
                  ...state,
                  categoryId: value ?? null,
                  subCategoryId: null,
                }))
              }
              searchable
              clearable
              placeholder="Select category"
              disabled={isEditingLoading}
              leftSection={
                selectedCategory && selectedCategoryColor ? (
                  <CategoryIcon
                    icon={selectedCategory.icon ?? 'tag'}
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
                      <CategoryIcon icon={category?.icon ?? 'tag'} color={color} size={18} />
                    </ThemeIcon>
                    <Text size="sm" fw={600}>
                      {option.label}
                    </Text>
                  </Group>
                )
              }}
            />
          </Group>

          {form.categoryId && subcategoriesForParent.length > 0 ? (
            <Stack gap={6}>
              <Text size="sm" fw={600}>
                Subcategory
              </Text>
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
                <Group gap="xs" wrap="wrap">
                  {subcategoriesForParent.map((subcategory) => {
                    const color = normalizeCategoryColor(subcategory.color)

                    return (
                      <Chip
                        key={subcategory.id}
                        value={subcategory.id}
                        disabled={isEditingLoading}
                        variant="light"
                        radius="xl"
                        color={color}
                        onClick={(event) => {
                          if (event.currentTarget.value === form.subCategoryId) {
                            setForm((state) => ({ ...state, subCategoryId: null }))
                          }
                        }}
                      >
                        <Group gap={6} wrap="nowrap">
                          <CategoryIcon
                            icon={subcategory.icon ?? 'tag'}
                            color={color}
                            size={16}
                          />
                          <Text size="sm" fw={600}>
                            {subcategory.name}
                          </Text>
                        </Group>
                      </Chip>
                    )
                  })}
                </Group>
              </Chip.Group>
            </Stack>
          ) : null}

          {typeHint ? (
            <Badge variant="light" color={categoryType === 'Income' ? 'teal' : 'red'}>
              {typeHint}
            </Badge>
          ) : null}
        </>
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

      <Divider />

      <Group gap="md" wrap="wrap">
        <TextInput
          label="Merchant"
          value={form.merchantName}
          onChange={(event) =>
            setForm((state) => ({ ...state, merchantName: event.currentTarget.value }))
          }
          disabled={isEditingLoading}
        />
        <TextInput
          label="Note"
          value={form.note}
          onChange={(event) => setForm((state) => ({ ...state, note: event.currentTarget.value }))}
          disabled={isEditingLoading}
        />
        <TextInput
          label="Location"
          value={form.location}
          onChange={(event) =>
            setForm((state) => ({ ...state, location: event.currentTarget.value }))
          }
          disabled={isEditingLoading}
        />
      </Group>

      {/* Transaction items section */}
      {form.items.length > 0 ? (
        <>
          <Divider />
          <Group justify="space-between" align="center">
            <Text fw={600} size="sm">
              Items ({form.items.length})
            </Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => setForm((state) => ({ ...state, items: [] }))}
            >
              Clear all
            </Button>
          </Group>
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
        </>
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

  const aiTabContent = (
    <Stack gap="md">
      <Select
        label="Account"
        description="Transaction will be created for this account"
        data={accountOptionsWithCurrency}
        value={scanAccountId}
        onChange={(value) => setScanAccountId(value ?? '')}
        placeholder="Select account"
      />

      <FileInput
        label="Receipt image"
        placeholder="Choose file..."
        accept="image/jpeg,image/png,image/webp"
        value={scanFile}
        onChange={handleScanFileChange}
      />

      {scanPreview ? (
        <Image
          src={scanPreview}
          alt="Receipt preview"
          mah={200}
          fit="contain"
          radius="md"
        />
      ) : null}

      {!scanResult ? (
        <Button
          onClick={handleScan}
          disabled={!scanFile || !scanAccountId}
          loading={scanReceipt.isPending}
        >
          {scanReceipt.isPending ? 'Scanning...' : 'Scan with AI'}
        </Button>
      ) : null}

      {scanError ? (
        <Text size="sm" c="red">
          {scanError}
        </Text>
      ) : null}

      {scanResult ? (
        <Stack gap="md">
          <Card shadow="xs" radius="md" padding="sm" withBorder>
            <Stack gap="xs">
              <Group gap="xs" align="center">
                <Badge variant="light" color="green" size="lg">
                  Transaction created
                </Badge>
              </Group>
              <Group gap="md" wrap="wrap">
                {scanResult.merchant ? (
                  <Text size="sm">
                    <Text span fw={600}>Merchant:</Text> {scanResult.merchant}
                  </Text>
                ) : null}
                {scanResult.date ? (
                  <Text size="sm">
                    <Text span fw={600}>Date:</Text> {new Date(scanResult.date).toLocaleDateString()}
                  </Text>
                ) : null}
                <Text size="sm">
                  <Text span fw={600}>Amount:</Text> {Number(scanResult.amount).toFixed(2)} {scanResult.currency}
                </Text>
              </Group>
            </Stack>
          </Card>

          {scanResult.items.length > 0 ? (
            <>
              <Text fw={600} size="sm">
                Items ({scanResult.items.length})
              </Text>
              <div style={{ overflowX: 'auto' }}>
                <Table verticalSpacing="xs" horizontalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Qty</Table.Th>
                      <Table.Th>Unit price</Table.Th>
                      <Table.Th>Promo</Table.Th>
                      <Table.Th>Total</Table.Th>
                      <Table.Th>Category</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {scanResult.items.map((item, index) => (
                      <Table.Tr key={index}>
                        <Table.Td>{item.name}</Table.Td>
                        <Table.Td>{Number(item.quantity)}</Table.Td>
                        <Table.Td>{Number(item.unitPrice).toFixed(2)}</Table.Td>
                        <Table.Td>{Number(item.promotionAmount) > 0 ? `-${Number(item.promotionAmount).toFixed(2)}` : '-'}</Table.Td>
                        <Table.Td fw={600}>{Number(item.finalAmount).toFixed(2)}</Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">{item.categoryName ?? '-'}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
            </>
          ) : null}

          <Text size="sm" c="dimmed">
            You can edit this transaction from the transactions page.
          </Text>

          <Group justify="flex-end">
            <Button onClick={handleScanClose}>Done</Button>
          </Group>
        </Stack>
      ) : null}
    </Stack>
  )

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit transaction' : 'New transaction'}
      size="lg"
    >
      {mode === 'edit' ? (
        manualTabContent
      ) : (
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value ?? 'manual')}>
          <Tabs.List mb="md">
            <Tabs.Tab value="manual">Manual</Tabs.Tab>
            <Tabs.Tab value="ai">AI scan</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="manual">{manualTabContent}</Tabs.Panel>
          <Tabs.Panel value="ai">{aiTabContent}</Tabs.Panel>
        </Tabs>
      )}
    </Modal>
  )
}
