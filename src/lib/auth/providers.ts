export const supportedSocialAuthProviders = ["google", "github"] as const

export type SocialAuthProvider = (typeof supportedSocialAuthProviders)[number]

export const socialAuthProviderMeta: Record<
  SocialAuthProvider,
  { label: string }
> = {
  google: {
    label: "Google",
  },
  github: {
    label: "GitHub",
  },
}
