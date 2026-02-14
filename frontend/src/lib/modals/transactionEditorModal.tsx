import { modals } from '@mantine/modals'
import { TransactionEditorModal, type TransactionModalMode } from '../../components/TransactionEditorModal'
import type { TransactionType } from '../api/types'

type OpenTransactionEditorModalInput = {
  mode: TransactionModalMode
  transactionId?: string
  presetCategoryId?: string
  presetType?: TransactionType
}

export function openTransactionEditorModal({
  mode,
  transactionId,
  presetCategoryId,
  presetType,
}: OpenTransactionEditorModalInput) {
  const modalId = `transaction-editor-${mode}-${transactionId ?? 'new'}-${Date.now()}`

  modals.open({
    modalId,
    title: mode === 'edit' ? 'Edit transaction' : 'New transaction',
    size: 'lg',
    children: (
      <TransactionEditorModal
        opened
        withModal={false}
        mode={mode}
        transactionId={transactionId}
        presetCategoryId={presetCategoryId}
        presetType={presetType}
        onClose={() => modals.close(modalId)}
      />
    ),
  })
}
