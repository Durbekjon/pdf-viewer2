"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { Language, PDFFiles } from "../hooks/useLanguage"

interface PDFUploadPanelProps {
  pdfFiles: PDFFiles
  onFileChange: (lang: Language, file: File | null) => void
  translations: any
  currentLanguage: Language
  onLanguageSwitch: (lang: Language) => void
}

const languageInfo = {
  uz: { name: "O'zbekcha", flag: "🇺🇿" },
  ru: { name: "Русский", flag: "🇷🇺" },
  en: { name: "English", flag: "🇺🇸" },
}

export function PDFUploadPanel({
  pdfFiles,
  onFileChange,
  translations,
  currentLanguage,
  onLanguageSwitch,
}: PDFUploadPanelProps) {
  const [open, setOpen] = useState(false)

  const handleFileChange = (lang: Language, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/pdf") {
      onFileChange(lang, file)
    }
  }

  const removeFile = (lang: Language) => {
    onFileChange(lang, null)
  }

  const getUploadedCount = () => {
    return Object.values(pdfFiles).filter((file) => file !== null).length
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">{translations.uploadPdfs}</span>
          <Badge variant="secondary" className="ml-1">
            {getUploadedCount()}/3
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {translations.uploadPdfFiles}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{translations.uploadDescription}</p>

          <div className="grid gap-4">
            {Object.entries(languageInfo).map(([code, info]) => {
              const lang = code as Language
              const file = pdfFiles[lang]
              const isCurrentLanguage = lang === currentLanguage

              return (
                <Card key={code} className={`transition-all ${isCurrentLanguage ? "ring-2 ring-primary" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{info.flag}</span>
                        <Label className="font-medium">{info.name}</Label>
                        {isCurrentLanguage && (
                          <Badge variant="default" className="text-xs">
                            {translations.language}
                          </Badge>
                        )}
                      </div>
                      {file && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            {translations.fileUploaded}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => removeFile(lang)} className="h-6 w-6 p-0">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(lang, e)}
                        className="file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-muted file:text-muted-foreground"
                      />

                      {file && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="w-4 h-4" />
                            <span className="truncate max-w-[200px]">{file.name}</span>
                          </div>
                          {file && !isCurrentLanguage && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                onLanguageSwitch(lang)
                                setOpen(false)
                              }}
                              className="text-xs"
                            >
                              {translations.switchToLanguage} {info.name}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => setOpen(false)}>
              {translations.language === "uz" ? "Yopish" : translations.language === "ru" ? "Закрыть" : "Close"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
