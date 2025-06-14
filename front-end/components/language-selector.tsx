"use client"

import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Language } from "../hooks/useLanguage"

interface LanguageSelectorProps {
  currentLanguage: Language
  onLanguageChange: (language: Language) => void
  translations: any
  hasPdfForLanguage: (lang: Language) => boolean
}

const languageNames = {
  uz: "O'zbekcha",
  ru: "Русский",
  en: "English",
}

const languageFlags = {
  uz: "🇺🇿",
  ru: "🇷🇺",
  en: "🇺🇸",
}

export function LanguageSelector({
  currentLanguage,
  onLanguageChange,
  translations,
  hasPdfForLanguage,
}: LanguageSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{translations.language}</span>
          <span>{languageFlags[currentLanguage]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(languageNames).map(([code, name]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => onLanguageChange(code as Language)}
            className="flex items-center gap-2"
          >
            <span>{languageFlags[code as Language]}</span>
            <span>{name}</span>
            {hasPdfForLanguage(code as Language) && <span className="text-green-500 text-xs ml-auto">●</span>}
            {currentLanguage === code && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
