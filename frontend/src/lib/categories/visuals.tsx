import type React from 'react'

export const defaultCategoryColor = '#5C7CFA'

export const categoryIconOptions = [
  { value: 'food', label: 'Food' },
  { value: 'cart', label: 'Cart' },
  { value: 'home', label: 'Home' },
  { value: 'car', label: 'Car' },
  { value: 'salary', label: 'Salary' },
  { value: 'tag', label: 'Tag' },
]

export const normalizeCategoryColor = (value?: string | null) => {
  if (!value) {
    return defaultCategoryColor
  }

  return value.startsWith('#') ? value : `#${value}`
}

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

const iconMap: Record<string, (props: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  food: ForkIcon,
  cart: CartIcon,
  home: HomeIcon,
  car: CarIcon,
  salary: WalletIcon,
  tag: TagIcon,
}

export function CategoryIcon({
  icon,
  color,
  size = 22,
}: {
  icon: string
  color: string
  size?: number
}) {
  const Icon = iconMap[icon] ?? TagIcon

  return <Icon width={size} height={size} style={{ color }} />
}
