export const themeStorageKey = "flamette-theme"

export const themeModes = ["light", "dark", "system"] as const

export type ThemeMode = (typeof themeModes)[number]

export const themeLabels: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
}

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system"
}
