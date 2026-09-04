import * as React from "react"

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

/** Subscribes to header/sidebar page actions (e.g. the "Add account" button). */
export function usePageAction(action: PageActionType, handler: () => void) {
  const handleAction = React.useEffectEvent(handler)

  React.useEffect(() => {
    const listener = (event: Event) => {
      if ((event as CustomEvent<PageActionType>).detail === action) {
        handleAction()
      }
    }

    window.addEventListener(PAGE_ACTION_EVENT, listener)
    return () => window.removeEventListener(PAGE_ACTION_EVENT, listener)
  }, [action])
}
