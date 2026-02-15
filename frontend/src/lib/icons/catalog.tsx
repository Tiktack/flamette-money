import * as TablerIcons from '@tabler/icons-react'
import type { Icon, IconProps } from '@tabler/icons-react'

export type IconOption = {
  value: string
  label: string
}

const iconCatalog = [
  { value: 'IconWallet', label: 'Wallet' },
  { value: 'IconBuildingBank', label: 'Bank' },
  { value: 'IconCreditCard', label: 'Credit card' },
  { value: 'IconCash', label: 'Cash' },
  { value: 'IconPigMoney', label: 'Savings' },
  { value: 'IconReceipt2', label: 'Receipt' },
  { value: 'IconShoppingCart', label: 'Shopping cart' },
  { value: 'IconBasket', label: 'Basket' },
  { value: 'IconHome', label: 'Home' },
  { value: 'IconBuilding', label: 'Building' },
  { value: 'IconTools', label: 'Tools' },
  { value: 'IconBolt', label: 'Utilities' },
  { value: 'IconWifi', label: 'WiFi' },
  { value: 'IconShieldCheck', label: 'Insurance' },
  { value: 'IconCar', label: 'Car' },
  { value: 'IconBus', label: 'Bus' },
  { value: 'IconTrain', label: 'Train' },
  { value: 'IconPlane', label: 'Plane' },
  { value: 'IconBike', label: 'Bike' },
  { value: 'IconShip', label: 'Ship' },
  { value: 'IconGasStation', label: 'Fuel' },
  { value: 'IconParking', label: 'Parking' },
  { value: 'IconTaxi', label: 'Taxi' },
  { value: 'IconMotorbike', label: 'Motorbike' },
  { value: 'IconShirt', label: 'Clothes' },
  { value: 'IconDeviceLaptop', label: 'Laptop' },
  { value: 'IconDeviceMobile', label: 'Mobile' },
  { value: 'IconDeviceGamepad2', label: 'Gaming' },
  { value: 'IconShoe', label: 'Shoes' },
  { value: 'IconBook', label: 'Book' },
  { value: 'IconSchool', label: 'School' },
  { value: 'IconBulb', label: 'Ideas' },
  { value: 'IconCoffee', label: 'Coffee' },
  { value: 'IconPizza', label: 'Pizza' },
  { value: 'IconBottle', label: 'Bottle' },
  { value: 'IconCandy', label: 'Candy' },
  { value: 'IconMeat', label: 'Meat' },
  { value: 'IconFish', label: 'Fish' },
  { value: 'IconIceCream2', label: 'Dessert' },
  { value: 'IconMedicineSyrup', label: 'Pharmacy' },
  { value: 'IconStethoscope', label: 'Doctor' },
  { value: 'IconBarbell', label: 'Gym' },
  { value: 'IconHeart', label: 'Health' },
  { value: 'IconMovie', label: 'Movies' },
  { value: 'IconMusic', label: 'Music' },
  { value: 'IconTicket', label: 'Events' },
  { value: 'IconDeviceTv', label: 'Streaming' },
  { value: 'IconWorld', label: 'Travel' },
  { value: 'IconBeach', label: 'Vacation' },
  { value: 'IconGift', label: 'Gift' },
  { value: 'IconHeartHandshake', label: 'Charity' },
  { value: 'IconCoins', label: 'Investments' },
  { value: 'IconChartLine', label: 'Growth' },
  { value: 'IconPercentage', label: 'Interest' },
  { value: 'IconBriefcase', label: 'Work' },
  { value: 'IconBuildingStore', label: 'Store' },
  { value: 'IconToolsKitchen2', label: 'Kitchen' },
  { value: 'IconCalendar', label: 'Calendar' },
  { value: 'IconUsers', label: 'Family' },
  { value: 'IconTag', label: 'Tag' },
] as const satisfies readonly IconOption[]

const iconCatalogSet: Set<string> = new Set(iconCatalog.map((item) => item.value))
const iconMap = TablerIcons as unknown as Record<string, Icon>

const legacyIconAliases: Record<string, string> = {
  food: 'IconToolsKitchen2',
  cart: 'IconShoppingCart',
  home: 'IconHome',
  car: 'IconCar',
  salary: 'IconBriefcase',
  tag: 'IconTag',
  apple: 'IconBasket',
  egg: 'IconBasket',
  meat: 'IconMeat',
  bread: 'IconToolsKitchen2',
  candy: 'IconCandy',
  drink: 'IconBottle',
  wine: 'IconBottle',
  frozen: 'IconIceCream2',
  can: 'IconBasket',
  restaurant: 'IconToolsKitchen2',
  table: 'IconToolsKitchen2',
  delivery: 'IconReceipt2',
  bag: 'IconBasket',
  coffee: 'IconCoffee',
  tip: 'IconCash',
  key: 'IconHome',
  bolt: 'IconBolt',
  wifi: 'IconWifi',
  wrench: 'IconTools',
  shield: 'IconShieldCheck',
  fuel: 'IconGasStation',
  bus: 'IconBus',
  taxi: 'IconTaxi',
  park: 'IconParking',
  shirt: 'IconShirt',
  device: 'IconDeviceLaptop',
  shoe: 'IconShoe',
  gem: 'IconTag',
  book: 'IconBook',
  house: 'IconBuilding',
  spray: 'IconTools',
  chair: 'IconHome',
  plant: 'IconHome',
  pan: 'IconToolsKitchen2',
  heart: 'IconHeart',
  pill: 'IconMedicineSyrup',
  medkit: 'IconStethoscope',
  gym: 'IconBarbell',
  sport: 'IconBarbell',
  star: 'IconTicket',
  film: 'IconMovie',
  game: 'IconDeviceGamepad2',
  music: 'IconMusic',
  hobby: 'IconBulb',
  school: 'IconSchool',
  course: 'IconSchool',
  pen: 'IconBook',
  repeat: 'IconCalendar',
  play: 'IconDeviceTv',
  app: 'IconDeviceMobile',
  card: 'IconCreditCard',
  self: 'IconHeart',
  scissor: 'IconTag',
  beauty: 'IconHeart',
  gift: 'IconGift',
  present: 'IconGift',
  money: 'IconCash',
  laptop: 'IconDeviceLaptop',
  brief: 'IconBriefcase',
  code: 'IconDeviceLaptop',
  chart: 'IconChartLine',
  coin: 'IconCoins',
  percent: 'IconPercentage',
}

export const iconOptions: IconOption[] = [...iconCatalog]

export const accountIconOptions: IconOption[] = [
  { value: 'IconWallet', label: 'Wallet' },
  { value: 'IconBuildingBank', label: 'Bank' },
  { value: 'IconCreditCard', label: 'Credit card' },
  { value: 'IconCash', label: 'Cash' },
  { value: 'IconPigMoney', label: 'Savings' },
  { value: 'IconCoins', label: 'Coins' },
  { value: 'IconBuildingStore', label: 'Business' },
  { value: 'IconBriefcase', label: 'Work' },
  { value: 'IconDeviceMobile', label: 'Mobile wallet' },
  { value: 'IconWorld', label: 'Travel account' },
]

export const categoryIconOptions: IconOption[] = iconOptions

export function resolveIcon(name: string): Icon {
  const normalizedName = legacyIconAliases[name] ?? name

  if (!iconCatalogSet.has(normalizedName)) {
    return TablerIcons.IconTag
  }

  return iconMap[normalizedName] ?? TablerIcons.IconTag
}

export function AppIcon({ name, ...props }: { name: string } & IconProps) {
  const ResolvedIcon = resolveIcon(name)
  return <ResolvedIcon {...props} />
}
