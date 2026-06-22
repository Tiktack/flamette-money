import type { ComponentProps } from "react"
import {
  AppStoreIcon,
  AppleIcon,
  Backpack01Icon,
  Bicycle01Icon,
  Book01Icon,
  Bread01Icon,
  Briefcase01Icon,
  BulbIcon,
  Bus01Icon,
  Calculator01Icon,
  Camera01Icon,
  CandyIcon,
  Car01Icon,
  Cash01Icon,
  Chart01Icon,
  CodeIcon,
  Coffee01Icon,
  Coins01Icon,
  CourseIcon,
  CreditCardIcon,
  DeliveryBox01Icon,
  DiamondIcon,
  DrinkIcon,
  Dumbbell01Icon,
  EggIcon,
  EnergyIcon,
  FavouriteIcon,
  Film01Icon,
  FirstAidKitIcon,
  FootballIcon,
  Fuel01Icon,
  GameController01Icon,
  GiftCardIcon,
  GiftIcon,
  Home01Icon,
  House01Icon,
  Key01Icon,
  LaptopIcon,
  Money01Icon,
  Mortarboard01Icon,
  MusicNote01Icon,
  Pan01Icon,
  ParkingAreaSquareIcon,
  PenTool01Icon,
  PercentIcon,
  PerfumeIcon,
  PillIcon,
  Plant01Icon,
  PlayCircleIcon,
  PuzzleIcon,
  RepeatIcon,
  RestaurantIcon,
  RunningShoesIcon,
  SavingsIcon,
  School01Icon,
  ScissorIcon,
  Shield01Icon,
  Shirt01Icon,
  ShoppingBag01Icon,
  ShoppingCart01Icon,
  SmartPhone01Icon,
  SnowIcon,
  SodaCanIcon,
  Sofa01Icon,
  SprayCanIcon,
  StarIcon,
  SteakIcon,
  Table01Icon,
  Tag01Icon,
  TaxiIcon,
  Ticket01Icon,
  TipsIcon,
  UserCircleIcon,
  Wallet01Icon,
  Wifi01Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

type HugeIcon = ComponentProps<typeof HugeiconsIcon>["icon"]

export type CategoryIconDefinition = {
  /** Token persisted on the category record. */
  name: string
  label: string
  group: string
  icon: HugeIcon
  /** Extra search terms for the picker. */
  keywords?: string
}

/**
 * Curated picker set. The `name` is the short token stored on the category
 * (the same tokens the default seeds use), so existing categories keep their
 * glyphs and newly created ones stay consistent.
 */
export const categoryIconOptions: CategoryIconDefinition[] = [
  // Food & drink
  { name: "cart", label: "Groceries", group: "Food & drink", icon: ShoppingCart01Icon, keywords: "shopping supermarket" },
  { name: "apple", label: "Produce", group: "Food & drink", icon: AppleIcon, keywords: "fruit vegetable healthy" },
  { name: "egg", label: "Dairy & eggs", group: "Food & drink", icon: EggIcon, keywords: "milk breakfast" },
  { name: "meat", label: "Meat & fish", group: "Food & drink", icon: SteakIcon, keywords: "steak beef protein" },
  { name: "bread", label: "Bakery", group: "Food & drink", icon: Bread01Icon, keywords: "bread pastry" },
  { name: "candy", label: "Sweets", group: "Food & drink", icon: CandyIcon, keywords: "snack sugar dessert" },
  { name: "drink", label: "Beverages", group: "Food & drink", icon: DrinkIcon, keywords: "soda juice water" },
  { name: "wine", label: "Alcohol", group: "Food & drink", icon: DrinkIcon, keywords: "wine beer bar" },
  { name: "can", label: "Pantry", group: "Food & drink", icon: SodaCanIcon, keywords: "canned dry goods" },
  { name: "frozen", label: "Frozen", group: "Food & drink", icon: SnowIcon, keywords: "freezer cold ice" },
  { name: "coffee", label: "Coffee", group: "Food & drink", icon: Coffee01Icon, keywords: "cafe tea" },
  { name: "tip", label: "Tips", group: "Food & drink", icon: TipsIcon, keywords: "gratuity service" },
  { name: "restaurant", label: "Restaurant", group: "Food & drink", icon: RestaurantIcon, keywords: "dining eat out" },
  { name: "table", label: "Dine-in", group: "Food & drink", icon: Table01Icon, keywords: "dinner" },
  { name: "delivery", label: "Delivery", group: "Food & drink", icon: DeliveryBox01Icon, keywords: "takeaway order" },
  { name: "pan", label: "Cookware", group: "Food & drink", icon: Pan01Icon, keywords: "kitchen cooking" },

  // Shopping & home
  { name: "bag", label: "Shopping", group: "Shopping & home", icon: ShoppingBag01Icon, keywords: "store retail" },
  { name: "shirt", label: "Clothing", group: "Shopping & home", icon: Shirt01Icon, keywords: "clothes apparel" },
  { name: "shoe", label: "Shoes", group: "Shopping & home", icon: RunningShoesIcon, keywords: "sneakers footwear" },
  { name: "gem", label: "Accessories", group: "Shopping & home", icon: DiamondIcon, keywords: "jewelry watch" },
  { name: "device", label: "Electronics", group: "Shopping & home", icon: SmartPhone01Icon, keywords: "phone gadget tech" },
  { name: "book", label: "Books", group: "Shopping & home", icon: Book01Icon, keywords: "reading textbook" },
  { name: "home", label: "Housing", group: "Shopping & home", icon: Home01Icon, keywords: "rent mortgage" },
  { name: "house", label: "Household", group: "Shopping & home", icon: House01Icon, keywords: "supplies" },
  { name: "key", label: "Rent", group: "Shopping & home", icon: Key01Icon, keywords: "lease deposit" },
  { name: "bolt", label: "Utilities", group: "Shopping & home", icon: EnergyIcon, keywords: "power gas water" },
  { name: "bulb", label: "Electricity", group: "Shopping & home", icon: BulbIcon, keywords: "light energy" },
  { name: "wifi", label: "Internet", group: "Shopping & home", icon: Wifi01Icon, keywords: "broadband network" },
  { name: "wrench", label: "Maintenance", group: "Shopping & home", icon: Wrench01Icon, keywords: "repair fix" },
  { name: "shield", label: "Insurance", group: "Shopping & home", icon: Shield01Icon, keywords: "protection cover" },
  { name: "spray", label: "Cleaning", group: "Shopping & home", icon: SprayCanIcon, keywords: "supplies" },
  { name: "chair", label: "Furniture", group: "Shopping & home", icon: Sofa01Icon, keywords: "sofa decor" },
  { name: "plant", label: "Garden", group: "Shopping & home", icon: Plant01Icon, keywords: "plants outdoor" },
  { name: "tag", label: "Sales", group: "Shopping & home", icon: Tag01Icon, keywords: "discount label" },

  // Transport
  { name: "car", label: "Car", group: "Transport", icon: Car01Icon, keywords: "vehicle drive" },
  { name: "fuel", label: "Fuel", group: "Transport", icon: Fuel01Icon, keywords: "gas petrol" },
  { name: "bus", label: "Transit", group: "Transport", icon: Bus01Icon, keywords: "public train metro" },
  { name: "taxi", label: "Taxi", group: "Transport", icon: TaxiIcon, keywords: "ride uber cab" },
  { name: "park", label: "Parking", group: "Transport", icon: ParkingAreaSquareIcon, keywords: "garage" },
  { name: "bike", label: "Bike", group: "Transport", icon: Bicycle01Icon, keywords: "bicycle cycling" },

  // Health & fitness
  { name: "heart", label: "Health", group: "Health & fitness", icon: FavouriteIcon, keywords: "wellness care" },
  { name: "pill", label: "Pharmacy", group: "Health & fitness", icon: PillIcon, keywords: "medicine drugs" },
  { name: "medkit", label: "Medical", group: "Health & fitness", icon: FirstAidKitIcon, keywords: "doctor clinic" },
  { name: "gym", label: "Gym", group: "Health & fitness", icon: Dumbbell01Icon, keywords: "fitness workout weights" },
  { name: "sport", label: "Sports", group: "Health & fitness", icon: FootballIcon, keywords: "activity football" },

  // Leisure
  { name: "star", label: "Entertainment", group: "Leisure", icon: StarIcon, keywords: "fun favourite" },
  { name: "film", label: "Movies", group: "Leisure", icon: Film01Icon, keywords: "cinema video" },
  { name: "game", label: "Games", group: "Leisure", icon: GameController01Icon, keywords: "gaming console" },
  { name: "music", label: "Music", group: "Leisure", icon: MusicNote01Icon, keywords: "concert song" },
  { name: "hobby", label: "Hobbies", group: "Leisure", icon: PuzzleIcon, keywords: "craft pastime" },
  { name: "ticket", label: "Events", group: "Leisure", icon: Ticket01Icon, keywords: "concert show" },
  { name: "camera", label: "Photo", group: "Leisure", icon: Camera01Icon, keywords: "photography" },

  // Education
  { name: "school", label: "Education", group: "Education", icon: School01Icon, keywords: "study learn" },
  { name: "course", label: "Courses", group: "Education", icon: CourseIcon, keywords: "class training" },
  { name: "pen", label: "Stationery", group: "Education", icon: PenTool01Icon, keywords: "write supplies" },
  { name: "mortarboard", label: "Tuition", group: "Education", icon: Mortarboard01Icon, keywords: "graduation university" },
  { name: "backpack", label: "School supplies", group: "Education", icon: Backpack01Icon, keywords: "bag" },

  // Subscriptions & tech
  { name: "repeat", label: "Subscriptions", group: "Subscriptions & tech", icon: RepeatIcon, keywords: "recurring" },
  { name: "play", label: "Streaming", group: "Subscriptions & tech", icon: PlayCircleIcon, keywords: "video music" },
  { name: "app", label: "Software", group: "Subscriptions & tech", icon: AppStoreIcon, keywords: "apps" },
  { name: "card", label: "Memberships", group: "Subscriptions & tech", icon: CreditCardIcon, keywords: "card dues" },
  { name: "laptop", label: "Computing", group: "Subscriptions & tech", icon: LaptopIcon, keywords: "computer work" },
  { name: "code", label: "Side projects", group: "Subscriptions & tech", icon: CodeIcon, keywords: "development" },

  // Personal & gifts
  { name: "self", label: "Personal care", group: "Personal & gifts", icon: UserCircleIcon, keywords: "self grooming" },
  { name: "scissor", label: "Haircut", group: "Personal & gifts", icon: ScissorIcon, keywords: "barber salon" },
  { name: "beauty", label: "Cosmetics", group: "Personal & gifts", icon: PerfumeIcon, keywords: "makeup beauty" },
  { name: "gift", label: "Gifts", group: "Personal & gifts", icon: GiftIcon, keywords: "present donation" },
  { name: "present", label: "Gift card", group: "Personal & gifts", icon: GiftCardIcon, keywords: "voucher" },

  // Income & finance
  { name: "salary", label: "Salary", group: "Income & finance", icon: Money01Icon, keywords: "wage pay income" },
  { name: "money", label: "Cash", group: "Income & finance", icon: Cash01Icon, keywords: "income payment" },
  { name: "brief", label: "Work", group: "Income & finance", icon: Briefcase01Icon, keywords: "freelance consulting business" },
  { name: "chart", label: "Investments", group: "Income & finance", icon: Chart01Icon, keywords: "stocks portfolio" },
  { name: "coin", label: "Dividends", group: "Income & finance", icon: Coins01Icon, keywords: "interest yield" },
  { name: "percent", label: "Interest", group: "Income & finance", icon: PercentIcon, keywords: "rate yield" },
  { name: "wallet", label: "Wallet", group: "Income & finance", icon: Wallet01Icon, keywords: "money funds" },
  { name: "savings", label: "Savings", group: "Income & finance", icon: SavingsIcon, keywords: "piggy bank" },
  { name: "calculator", label: "Budget", group: "Income & finance", icon: Calculator01Icon, keywords: "accounting" },
]

export type CategoryIconName = (typeof categoryIconOptions)[number]["name"]

export const defaultCategoryIcon = categoryIconOptions[0]

/**
 * Tokens that no longer have a dedicated picker entry but may still exist on
 * older records, plus legacy Tabler-style names the previous UI wrote.
 */
const categoryIconAliases: Record<string, string> = {
  IconShoppingCart: "cart",
  IconHome: "home",
  IconCoin: "coin",
  IconBriefcase: "brief",
}

const categoryIconsByName = new Map(categoryIconOptions.map((item) => [item.name, item]))

export function resolveCategoryIconName(iconName?: string | null): string {
  if (!iconName) {
    return defaultCategoryIcon.name
  }

  if (categoryIconsByName.has(iconName)) {
    return iconName
  }

  if (iconName in categoryIconAliases) {
    return categoryIconAliases[iconName]
  }

  return defaultCategoryIcon.name
}

export function getCategoryIconDefinition(iconName?: string | null): CategoryIconDefinition {
  return categoryIconsByName.get(resolveCategoryIconName(iconName)) ?? defaultCategoryIcon
}

export const categoryIconGroups = Array.from(new Set(categoryIconOptions.map((item) => item.group)))
