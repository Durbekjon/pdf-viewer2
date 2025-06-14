export const languageNames = {
  uz: "O'zbekcha",
  ru: "Русский",
  en: "English",
} as const

export const languageFlags = {
  uz: "🇺🇿",
  ru: "🇷🇺",
  en: "🇺🇸",
} as const

export type Language = keyof typeof languageNames 