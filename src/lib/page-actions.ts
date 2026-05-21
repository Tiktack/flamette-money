export const PAGE_ACTION_EVENT = "flamette:page-action"

export const pageActionTypes = {
  createAccount: "create-account",
  createCategory: "create-category",
  createTransaction: "create-transaction",
  createTrip: "create-trip",
} as const

export type PageActionType = (typeof pageActionTypes)[keyof typeof pageActionTypes]

export function dispatchPageAction(action: PageActionType) {
  if (typeof window === "undefined") {
    return
  }

  window.dispatchEvent(new CustomEvent<PageActionType>(PAGE_ACTION_EVENT, { detail: action }))
}
