import { AppIcon, accountIconOptions } from '../icons/catalog'

export const defaultAccountIcon = 'IconWallet'

export { accountIconOptions }

export function AccountIcon({
  icon,
  color,
  size = 18,
}: {
  icon: string
  color: string
  size?: number
}) {
  return <AppIcon name={icon} size={size} style={{ color }} />
}
