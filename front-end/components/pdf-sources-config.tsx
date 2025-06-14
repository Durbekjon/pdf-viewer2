"use client"

import { useState } from "react"
import { Settings, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { PDFSources } from "../hooks/useLanguage"

interface PDFSourcesConfigProps {
  sources: PDFSources
  onSave: (sources: PDFSources) => void
  translations: any
}

export function PDFSourcesConfig({ sources, onSave, translations }: PDFSourcesConfigProps) {
  const [open, setOpen] = useState(false)
  const [tempSources, setTempSources] = useState<PDFSources>(sources)

  const handleSave = () => {
    onSave(tempSources)
    setOpen(false)
  }

  const handleCancel = () => {
    setTempSources(sources)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">{translations.configureSources}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {translations.pdfSources}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{translations.pdfSourcesDescription}</p>

          <div className="space-y-3">
            <div>
              <Label htmlFor="uz-pdf" className="text-sm font-medium">
                🇺🇿 {translations.uzbekPdf}
              </Label>
              <Input
                id="uz-pdf"
                type="url"
                placeholder={translations.pdfUrlPlaceholder}
                value={tempSources.uz}
                onChange={(e) => setTempSources((prev) => ({ ...prev, uz: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="ru-pdf" className="text-sm font-medium">
                🇷🇺 {translations.russianPdf}
              </Label>
              <Input
                id="ru-pdf"
                type="url"
                placeholder={translations.pdfUrlPlaceholder}
                value={tempSources.ru}
                onChange={(e) => setTempSources((prev) => ({ ...prev, ru: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="en-pdf" className="text-sm font-medium">
                🇺🇸 {translations.englishPdf}
              </Label>
              <Input
                id="en-pdf"
                type="url"
                placeholder={translations.pdfUrlPlaceholder}
                value={tempSources.en}
                onChange={(e) => setTempSources((prev) => ({ ...prev, en: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              {translations.cancel}
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              {translations.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
