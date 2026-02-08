import {
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useEffect, useMemo, useState } from 'react'
import {
  useAccounts,
  useCategories,
  useCreateTransaction,
  useTransaction,
  useUpdateTransaction,
} from '../lib/api/hooks'
import type {
  CategoryHierarchy,
  TransactionCreateRequest,
  TransactionDetail,
  TransactionType,
  TransactionUpdateRequest,
} from '../lib/api/types'

export type TransactionModalMode = 'new' | 'edit'

type TransactionEditorModalProps = {
  opened: boolean
  mode: TransactionModalMode
  transactionId?: string
  presetCategoryId?: string
  presetType?: TransactionType
  onClose: () => void
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
  const transactionQuery = useTransaction(mode === 'edit' ? transactionId : undefined)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [form, setForm] = useState<TransactionFormState>(() =>
    buildDefaultState(presetType ?? defaultType),
  )
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

  const subcategoryOptions = useMemo(() => {
    if (!form.categoryId) {
      return []
    }

    const parent = categories.find((category) => category.id === form.categoryId)
    if (!parent) {
      return []
    }

    return parent.subcategories.map((subcategory) => ({
      value: subcategory.id,
      label: subcategory.name,
    }))
  }, [categories, form.categoryId])

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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit transaction' : 'New transaction'}
      size="lg"
    >
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
              />
              <Select
                label="Subcategory"
                data={subcategoryOptions}
                value={form.subCategoryId}
                onChange={(value) =>
                  setForm((state) => ({ ...state, subCategoryId: value ?? null }))
                }
                searchable
                clearable
                placeholder="Select subcategory"
                disabled={isEditingLoading || !form.categoryId || subcategoryOptions.length === 0}
              />
            </Group>
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
    </Modal>
  )
}
