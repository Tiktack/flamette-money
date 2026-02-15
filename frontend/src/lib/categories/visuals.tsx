import { AppIcon, categoryIconOptions } from '../icons/catalog'

export const defaultCategoryColor = '#5C7CFA'

export { categoryIconOptions }

export const normalizeCategoryColor = (value?: string | null) => {
  if (!value) {
    return defaultCategoryColor
  }

  return value.startsWith('#') ? value : `#${value}`
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
  return <AppIcon name={icon} size={size} style={{ color }} />
}
