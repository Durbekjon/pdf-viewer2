"use client"

import { useState, useEffect } from "react"
import {
  Cloud,
  Download,
  Upload,
  Share2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  QrCode,
  Link,
  Smartphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import type { Language, PDFFiles, CustomOutlines } from "../hooks/useLanguage"

interface CloudSyncProps {
  language: Language
  pdfFiles: PDFFiles
  customOutlines: CustomOutlines
  onImportData: (data: any) => void
  translations: any
}

export function CloudSync({ language, pdfFiles, customOutlines, onImportData, translations }: CloudSyncProps) {
  const [open, setOpen] = useState(false)
  const [shareCode, setShareCode] = useState("")
  const [shareUrl, setShareUrl] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [importCode, setImportCode] = useState("")
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState("")
  const [syncMode, setSyncMode] = useState<"outline-only" | "files-and-outline">("outline-only")
  const [selectedFiles, setSelectedFiles] = useState<Record<Language, boolean>>({
    uz: false,
    ru: false,
    en: false,
  })

  const { toast } = useToast()

  // URL dan ma'lumotlarni yuklash
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const dataParam = urlParams.get("data")

    if (dataParam) {
      try {
        const decodedData = atob(dataParam)
        const parsedData = JSON.parse(decodedData)
        handleAutoImport(parsedData)

        // URL ni tozalash
        const newUrl = window.location.pathname
        window.history.replaceState({}, document.title, newUrl)
      } catch (error) {
        console.error("URL dan ma'lumot yuklashda xatolik:", error)
      }
    }
  }, [])

  const handleAutoImport = async (data: any) => {
    try {
      const importedData = {
        pdfFiles: {},
        customOutlines: data.customOutlines || {},
      }

      if (data.syncMode === "files-and-outline" && data.pdfFiles) {
        for (const [lang, fileData] of Object.entries(data.pdfFiles || {})) {
          if (fileData && typeof fileData === "object" && "data" in fileData) {
            try {
              const file = base64ToFile(fileData.data, fileData.name, fileData.type)
              importedData.pdfFiles[lang] = file
            } catch (error) {
              console.error(`Error restoring ${lang} PDF:`, error)
            }
          }
        }
      }

      onImportData(importedData)

      toast({
        title: "Avtomatik import!",
        description: "URL orqali ma'lumotlar muvaffaqiyatli yuklandi",
      })
    } catch (error) {
      console.error("Auto import error:", error)
    }
  }

  const checkFileSizes = () => {
    return {
      oversizedFiles: [],
      totalSize: 0,
      exceedsTotal: false,
    }
  }

  const generateShareData = async () => {
    setIsGenerating(true)
    setProgress(0)
    setCurrentFile("")

    try {
      const data = {
        customOutlines,
        pdfFiles: {},
        syncMode,
        timestamp: Date.now(),
        version: "3.0",
      }

      if (syncMode === "outline-only") {
        setProgress(50)
        setCurrentFile("Mundarijalarni tayyorlash...")
        setProgress(100)
        setCurrentFile("Tayyor!")
      } else {
        const { oversizedFiles, exceedsTotal } = checkFileSizes()

        if (oversizedFiles.length > 0 || exceedsTotal) {
          toast({
            title: "Fayllar juda katta!",
            description: "Kichikroq fayllarni tanlang yoki faqat mundarija rejimini ishlating",
            variant: "destructive",
          })
          setIsGenerating(false)
          return
        }

        const selectedFilesList = Object.entries(selectedFiles)
          .filter(([_, selected]) => selected)
          .map(([lang]) => lang as Language)

        let processedFiles = 0

        for (const lang of selectedFilesList) {
          const file = pdfFiles[lang]
          if (file) {
            setCurrentFile(file.name)
            setProgress((processedFiles / selectedFilesList.length) * 90)

            try {
              const base64 = await fileToBase64(file)
              data.pdfFiles[lang] = {
                name: file.name,
                data: base64,
                type: file.type,
                size: file.size,
              }
              processedFiles++
              await new Promise((resolve) => setTimeout(resolve, 100))
            } catch (error) {
              console.error(`Error processing ${lang} PDF:`, error)
            }
          }
        }
      }

      setProgress(95)
      setCurrentFile("URL yaratish...")

      const jsonString = JSON.stringify(data)
      const encoded = btoa(jsonString)
      setShareCode(encoded)

      // URL yaratish
      const baseUrl = window.location.origin + window.location.pathname
      const fullUrl = `${baseUrl}?data=${encoded}`
      setShareUrl(fullUrl)

      // QR kod yaratish
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fullUrl)}`
      setQrCodeUrl(qrUrl)

      setProgress(100)
      setCurrentFile("Tayyor!")

      toast({
        title: "Muvaffaqiyatli!",
        description: "Ulashish havolasi tayyor",
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "Xatolik!",
        description: "Ma'lumotlarni eksport qilishda xatolik",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
      setProgress(0)
      setCurrentFile("")
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
    })
  }

  const base64ToFile = (base64: string, filename: string, type: string): File => {
    const byteCharacters = atob(base64.split(",")[1])
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new File([byteArray], filename, { type })
  }

  const handleShare = async () => {
    await generateShareData()
  }

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Nusxalandi!",
        description: "Havola clipboard ga nusxalandi",
      })
    } catch (error) {
      // Fallback
      const textarea = document.createElement("textarea")
      textarea.value = shareUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode)
      toast({
        title: "Kod nusxalandi!",
        description: "Import kodi clipboard ga nusxalandi",
      })
    } catch (error) {
      console.error("Copy error:", error)
    }
  }

  const handleImport = async () => {
    if (!importCode.trim()) return

    setIsImporting(true)
    setProgress(0)

    try {
      setProgress(20)
      setCurrentFile("Kodni dekodlash...")

      const decoded = atob(importCode.trim())
      const data = JSON.parse(decoded)

      setProgress(40)

      const importedData = {
        pdfFiles: {},
        customOutlines: data.customOutlines || {},
      }

      if (data.syncMode === "files-and-outline") {
        setCurrentFile("Fayllarni qayta tiklash...")

        const totalFiles = Object.keys(data.pdfFiles || {}).length
        let processedFiles = 0

        for (const [lang, fileData] of Object.entries(data.pdfFiles || {})) {
          if (fileData && typeof fileData === "object" && "data" in fileData) {
            try {
              const file = base64ToFile(fileData.data, fileData.name, fileData.type)
              importedData.pdfFiles[lang] = file
              processedFiles++
              setProgress(40 + (processedFiles / totalFiles) * 40)
              await new Promise((resolve) => setTimeout(resolve, 100))
            } catch (error) {
              console.error(`Error restoring ${lang} PDF:`, error)
            }
          }
        }
      }

      setProgress(95)
      setCurrentFile("Ma'lumotlarni saqlash...")

      onImportData(importedData)

      setProgress(100)
      setImportCode("")
      setOpen(false)

      toast({
        title: "Import muvaffaqiyatli!",
        description: "Ma'lumotlar muvaffaqiyatli yuklandi",
      })
    } catch (error) {
      console.error("Import error:", error)
      toast({
        title: "Import xatoligi!",
        description: "Ma'lumotlarni yuklashda xatolik",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
      setProgress(0)
      setCurrentFile("")
    }
  }

  const getUploadedCount = () => {
    return Object.values(pdfFiles).filter((file) => file !== null).length
  }

  const getSelectedCount = () => {
    return Object.values(selectedFiles).filter(Boolean).length
  }

  const getSelectedSize = () => {
    let totalSize = 0
    Object.entries(selectedFiles).forEach(([lang, selected]) => {
      if (selected && pdfFiles[lang as Language]) {
        totalSize += pdfFiles[lang as Language]!.size
      }
    })
    return (totalSize / 1024 / 1024).toFixed(1)
  }

  const getOutlineCount = () => {
    return Object.values(customOutlines).reduce((total, outline) => total + outline.length, 0)
  }

  const { oversizedFiles, exceedsTotal } = checkFileSizes()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Cloud className="w-4 h-4" />
          <span className="hidden sm:inline">Ulashish</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Ma'lumotlarni ulashish
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Ulashish
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Sinxronlash rejimi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="outline-only"
                      name="sync-mode"
                      checked={syncMode === "outline-only"}
                      onChange={() => setSyncMode("outline-only")}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="outline-only" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Faqat mundarija (tavsiya etiladi)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="files-and-outline"
                      name="sync-mode"
                      checked={syncMode === "files-and-outline"}
                      onChange={() => setSyncMode("files-and-outline")}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="files-and-outline" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Fayllar va mundarija (kichik fayllar)
                    </Label>
                  </div>
                </div>

                {syncMode === "files-and-outline" && (
                  <div className="space-y-3">
                    <Label>Ulashish uchun fayllarni tanlang:</Label>
                    {Object.entries(pdfFiles).map(([lang, file]) => (
                      <div key={lang} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedFiles[lang as Language]}
                            onCheckedChange={(checked) => setSelectedFiles((prev) => ({ ...prev, [lang]: !!checked }))}
                            disabled={!file}
                          />
                          <span className="text-sm">
                            {lang === "uz" && "🇺🇿 O'zbek"}
                            {lang === "ru" && "🇷🇺 Rus"}
                            {lang === "en" && "🇺🇸 Ingliz"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {file ? `${(file.size / 1024 / 1024).toFixed(1)}MB` : "Yuklanmagan"}
                        </div>
                      </div>
                    ))}

                    {(oversizedFiles.length > 0 || exceedsTotal) && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {oversizedFiles.length > 0 && (
                            <>
                              Katta fayllar: {oversizedFiles.map((f) => `${f.name} (${f.size}MB)`).join(", ")}
                              <br />
                            </>
                          )}
                          {exceedsTotal && "Jami hajm 10MB dan oshmasligi kerak."}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      {syncMode === "outline-only" ? getUploadedCount() : getSelectedCount()}/3
                    </Badge>
                    <p className="text-xs text-muted-foreground">Fayllar</p>
                  </div>
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      {syncMode === "outline-only" ? "0MB" : `${getSelectedSize()}MB`}
                    </Badge>
                    <p className="text-xs text-muted-foreground">Hajm</p>
                  </div>
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      {getOutlineCount()}
                    </Badge>
                    <p className="text-xs text-muted-foreground">Mundarija</p>
                  </div>
                </div>

                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">{currentFile}</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}

                <Button
                  onClick={handleShare}
                  className="w-full"
                  disabled={
                    isGenerating ||
                    (syncMode === "files-and-outline" &&
                      (getSelectedCount() === 0 || oversizedFiles.length > 0 || exceedsTotal))
                  }
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Tayyorlanmoqda...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Ulashish havolasi yaratish
                    </>
                  )}
                </Button>

                {shareUrl && !isGenerating && (
                  <div className="space-y-4">
                    <Alert>
                      <Check className="h-4 w-4" />
                      <AlertDescription>
                        Ulashish havolasi tayyor! Boshqa qurilmada ochish uchun havolani ulashing.
                      </AlertDescription>
                    </Alert>

                    {/* URL ulashish */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Link className="w-4 h-4" />
                        Ulashish havolasi:
                      </Label>
                      <div className="flex gap-2">
                        <Input value={shareUrl} readOnly className="text-xs" />
                        <Button onClick={copyUrl} size="sm">
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* QR kod */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        QR kod (mobil uchun):
                      </Label>
                      <div className="flex justify-center">
                        <img src={qrCodeUrl || "/placeholder.svg"} alt="QR Code" className="border rounded" />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Mobil qurilmada kamera bilan skanerlang
                      </p>
                    </div>

                    {/* Manual kod */}
                    <div className="space-y-2">
                      <Label>Yoki manual kod:</Label>
                      <div className="flex gap-2">
                        <Textarea value={shareCode} readOnly className="h-20 text-xs font-mono" />
                        <Button onClick={copyCode} size="sm">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Ma'lumotlarni import qilish
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>
                    <strong>3 usul:</strong>
                    <br />
                    1. Ulashish havolasini ochish
                    <br />
                    2. QR kodni skanerlash
                    <br />
                    3. Kodni qo'lda kiritish
                  </AlertDescription>
                </Alert>

                {isImporting && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">{currentFile}</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="import-code">Import kodi:</Label>
                  <Textarea
                    id="import-code"
                    value={importCode}
                    onChange={(e) => setImportCode(e.target.value)}
                    className="h-32 text-xs font-mono"
                    placeholder="Kodni shu yerga joylashtiring..."
                    disabled={isImporting}
                  />
                </div>

                <Button onClick={handleImport} className="w-full" disabled={!importCode.trim() || isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Import qilinmoqda...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Import qilish
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
