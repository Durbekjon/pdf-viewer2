"use client"

import { useState, useEffect } from "react"
import { Share2, Eye, Copy, Check, QrCode, ExternalLink, Loader2, AlertTriangle, Cloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  createPublication,
  getAllPublications,
  deletePublication,
  type PublicationRecord,
  checkBackendHealth,
} from "@/lib/api"
import type { PDFFiles, CustomOutlines } from "../hooks/useLanguage"

interface AdminPublisherProps {
  pdfFiles: Record<string, File | null>
  customOutlines: CustomOutlines
  translations: any
}

// Hajm cheklovlari (MB da)
const MAX_SINGLE_FILE_SIZE = 50 // 50MB
const MAX_TOTAL_SIZE = 100 // 100MB
const RECOMMENDED_SIZE = 20 // 20MB

export function AdminPublisher({ pdfFiles, customOutlines, translations }: AdminPublisherProps) {
  const [open, setOpen] = useState(false)
  const [publicUrl, setPublicUrl] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [publishedItems, setPublishedItems] = useState<PublicationRecord[]>([])
  const [currentPublishId, setCurrentPublishId] = useState("")
  const [isClient, setIsClient] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isLoadingPublications, setIsLoadingPublications] = useState(false)
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking")
  const [publicationTitle, setPublicationTitle] = useState("")

  const { toast } = useToast()

  // Client-side ekanligini tekshirish
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Sahifa ochilganda mavjud nashrlarni yuklash
  useEffect(() => {
    if (!isClient) return
    loadPublications()
  }, [isClient])

  const loadPublications = async () => {
    setIsLoadingPublications(true)
    setBackendStatus("checking")

    try {
      // Backend holatini tekshirish
      const isHealthy = await checkBackendHealth()
      if (!isHealthy) {
        setBackendStatus("offline")
        toast({
          title: "Backend server ishlamayapti!",
          description: "Iltimos, Python backend serverini ishga tushiring: python backend/run.py",
          variant: "destructive",
        })
        return
      }

      setBackendStatus("online")
      const publications = await getAllPublications()
      console.log({publications})
      setPublishedItems(publications)
    } catch (error) {
      console.error("Nashrlarni yuklashda xatolik:", error)
      setBackendStatus("offline")

      const errorMessage = error instanceof Error ? error.message : "Noma'lum xatolik"
      toast({
        title: "Xatolik!",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoadingPublications(false)
    }
  }

  // Faylni kichik qismlarga bo'lish
  const chunkFile = (file: File, chunkSize: number = 1024 * 1024): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer
        const chunks: string[] = []

        for (let i = 0; i < arrayBuffer.byteLength; i += chunkSize) {
          const chunk = arrayBuffer.slice(i, i + chunkSize)
          const base64Chunk = btoa(String.fromCharCode(...new Uint8Array(chunk)))
          chunks.push(base64Chunk)
        }

        resolve(chunks)
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  const generatePublicLink = async () => {
    if (!isClient) return

    // Hajmni tekshirish
    const totalSize = getTotalSize()
    const totalSizeMB = Number.parseFloat(totalSize)

    if (totalSizeMB > MAX_TOTAL_SIZE) {
      toast({
        title: "Hajm juda katta!",
        description: `Jami hajm ${totalSizeMB}MB. Maksimal ruxsat etilgan hajm ${MAX_TOTAL_SIZE}MB.`,
        variant: "destructive",
      })
      return
    }

    // Sarlavhani tekshirish
    if (!publicationTitle.trim()) {
      toast({
        title: "Sarlavha kiritilmagan!",
        description: "Iltimos, nashr uchun sarlavha kiriting.",
        variant: "destructive",
      })
      return
    }

    // Har bir faylning hajmini tekshirish
    for (const [lang, file] of Object.entries(pdfFiles)) {
      if (file) {
        const fileSizeMB = file.size / 1024 / 1024
        if (fileSizeMB > MAX_SINGLE_FILE_SIZE) {
          toast({
            title: "Fayl juda katta!",
            description: `${lang} tili uchun fayl ${fileSizeMB.toFixed(1)}MB. Maksimal ruxsat etilgan hajm ${MAX_SINGLE_FILE_SIZE}MB.`,
            variant: "destructive",
          })
          return
        }
      }
    }

    setIsGenerating(true)
    setIsCompressing(true)
    setCompressionProgress(0)

    try {
      // Unique ID yaratish
      // setCurrentPublishId(publishId)

      // PDF fayllarni qayta ishlash
      const processedPdfFiles: Record<string, any> = {}
      const fileEntries = Object.entries(pdfFiles).filter(([_, file]) => file !== null)

      for (let i = 0; i < fileEntries.length; i++) {
        const [lang, file] = fileEntries[i]
        if (file) {
          setCompressionProgress(Math.round(((i + 0.5) / fileEntries.length) * 80))

          try {
            // Katta fayllarni chunk-larga bo'lish
            const fileSizeMB = file.size / 1024 / 1024

            if (fileSizeMB > 10) {
              // 10MB dan katta fayllarni chunk-larga bo'lish
              const chunks = await chunkFile(file)
              processedPdfFiles[lang] = {
                name: file.name,
                type: file.type,
                size: file.size,
                isChunked: true,
                chunks: chunks,
                totalChunks: chunks.length,
              }
            } else {
              // Kichik fayllarni odatdagidek saqlash
              const base64 = await fileToBase64(file)
              processedPdfFiles[lang] = {
                name: file.name,
                data: base64,
                type: file.type,
                size: file.size,
                isChunked: false,
              }
            }
          } catch (error) {
            console.error(`${lang} faylni qayta ishlashda xatolik:`, error)
            throw new Error(`${lang} faylni qayta ishlashda xatolik`)
          }

          setCompressionProgress(Math.round(((i + 1) / fileEntries.length) * 80))
        }
      }

      setCompressionProgress(85)
      setIsCompressing(false)

      // Nashr ma'lumotlarini yaratish
      const publishData = {
        title: publicationTitle.trim(),
        publishedAt: new Date(),
        pdfFiles: Object.fromEntries(
          Object.entries(pdfFiles).filter(([_, file]) => file !== null)
        ) as Record<string, File>,
        customOutlines: Object.fromEntries(
          Object.entries(customOutlines).map(([lang, outlines]) => [
            lang,
            outlines.map(outline => ({
              title: outline.title,
              page: outline.page,
              parentId: outline.parentId,
              language: lang
            }))
          ])
        )
      }

      setCompressionProgress(90)

      // API orqali saqlash
      const result = await createPublication(publishData)
      setCurrentPublishId(result.id)
      console.log(result)
      setCompressionProgress(95)

      // Nashrlar ro'yxatini yangilash
      await loadPublications()

      setCompressionProgress(100)

      // Public URL yaratish
      const baseUrl = window.location.origin
      const viewerUrl = `${baseUrl}/view/${result.id}`
      setPublicUrl(viewerUrl)

      // QR kod yaratish
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(viewerUrl)}`
      setQrCodeUrl(qrUrl)

      toast({
        title: "Muvaffaqiyatli nashr qilindi!",
        description: "Foydalanuvchilar uchun havola tayyor. Endi barcha qurilmalardan ko'rish mumkin!",
      })
    } catch (error) { 
      console.error("Publish error:", error)
      toast({
        title: "Xatolik!",
        description: error instanceof Error ? error.message : "Nashr qilishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
      setIsCompressing(false)
      setCompressionProgress(0)
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

  const copyUrl = async () => {
    if (!isClient) return

    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Nusxalandi!",
        description: "Havola clipboard ga nusxalandi",
      })
    } catch (error) {
      console.error("Copy error:", error)
    }
  }

  const openPreview = () => {
    if (publicUrl) {
      window.open(publicUrl, "_blank")
    }
  }

  const handleDeletePublish = async (publishId: string) => {
    if (!isClient) return

    try {
      await deletePublication(publishId)
      await loadPublications()

      toast({
        title: "O'chirildi!",
        description: "Nashr muvaffaqiyatli o'chirildi",
      })
    } catch (error) {
      console.error("Nashrni o'chirishda xatolik:", error)
      toast({
        title: "Xatolik!",
        description: "Nashrni o'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const copyPublishUrl = (publishId: string) => {
    if (!isClient) return

    const url = `${window.location.origin}/view/${publishId}`
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Havola nusxalandi!" })
    })
  }

  const getUploadedCount = () => {
    return Object.values(pdfFiles).filter((file) => file !== null).length
  }

  const getOutlineCount = () => {
    return Object.values(customOutlines).reduce((total, outline) => total + outline.length, 0)
  }

  const getTotalSize = () => {
    const totalBytes = Object.values(pdfFiles).reduce((total, file) => {
      return total + (file ? file.size : 0)
    }, 0)
    return (totalBytes / 1024 / 1024).toFixed(1)
  }

  const getSizeWarning = () => {
    const totalSizeMB = Number.parseFloat(getTotalSize())

    if (totalSizeMB > MAX_TOTAL_SIZE) {
      return { level: "error", message: `Jami hajm ${totalSizeMB}MB juda katta! Maksimal: ${MAX_TOTAL_SIZE}MB` }
    } else if (totalSizeMB > RECOMMENDED_SIZE) {
      return { level: "warning", message: `Jami hajm ${totalSizeMB}MB. Tavsiya etilgan: ${RECOMMENDED_SIZE}MB dan kam` }
    }
    return null
  }

  const canPublish = getUploadedCount() > 0 && Number.parseFloat(getTotalSize()) <= MAX_TOTAL_SIZE

  // Server-side rendering paytida bo'sh komponent qaytarish
  if (!isClient) {
    return (
      <Button variant="default" size="sm" className="flex items-center gap-2" disabled>
        <Share2 className="w-4 h-4" />
        <span className="hidden sm:inline">Nashr qilish</span>
      </Button>
    )
  }

  const sizeWarning = getSizeWarning()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="flex items-center gap-2" disabled={!canPublish}>
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Nashr qilish</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            PDF Nashr qilish (Cloud)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cloud ma'lumoti */}
          <Alert>
            <Cloud className="h-4 w-4" />
            <AlertDescription>
              <strong>Cloud Storage:</strong> Nashrlaringiz bulutda saqlanadi va barcha qurilmalardan ko'rish mumkin!
            </AlertDescription>
          </Alert>

          {/* Backend holati */}
          <Alert variant={backendStatus === "online" ? "default" : "destructive"}>
            <Cloud className="h-4 w-4" />
            <AlertDescription>
              <strong>Backend holati:</strong>
              {backendStatus === "checking" && " Tekshirilmoqda..."}
              {backendStatus === "online" && " ✅ Onlayn"}
              {backendStatus === "offline" && " ❌ Oflayn - Python serverni ishga tushiring"}
            </AlertDescription>
          </Alert>

          {/* Joriy nashr */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Yangi nashr yaratish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sarlavha */}
              <div className="space-y-2">
                <Label htmlFor="publication-title">Nashr sarlavhasi:</Label>
                <Input
                  id="publication-title"
                  placeholder="Masalan: Matematika darsligi"
                  value={publicationTitle}
                  onChange={(e) => setPublicationTitle(e.target.value)}
                />
              </div>

              {/* Statistika */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <Badge variant="secondary" className="mb-2">
                    {getUploadedCount()}/3
                  </Badge>
                  <p className="text-xs text-muted-foreground">PDF fayllar</p>
                </div>
                <div>
                  <Badge
                    variant={
                      Number.parseFloat(getTotalSize()) > MAX_TOTAL_SIZE
                        ? "destructive"
                        : Number.parseFloat(getTotalSize()) > RECOMMENDED_SIZE
                          ? "outline"
                          : "secondary"
                    }
                    className="mb-2"
                  >
                    {getTotalSize()}MB
                  </Badge>
                  <p className="text-xs text-muted-foreground">Jami hajm</p>
                </div>
                <div>
                  <Badge variant="secondary" className="mb-2">
                    {getOutlineCount()}
                  </Badge>
                  <p className="text-xs text-muted-foreground">Mundarija</p>
                </div>
              </div>

              {/* Hajm ogohlantirishi */}
              {sizeWarning && (
                <Alert variant={sizeWarning.level === "error" ? "destructive" : "default"}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{sizeWarning.message}</AlertDescription>
                </Alert>
              )}

              {/* Mavjud tillar */}
              <div className="space-y-2">
                <Label>Mavjud tillar:</Label>
                <div className="flex gap-2">
                  {Object.entries(pdfFiles).map(([lang, file]) => {
                    const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : "0"
                    const isLarge = file && file.size / 1024 / 1024 > MAX_SINGLE_FILE_SIZE

                    return (
                      <div key={lang} className="flex flex-col items-center gap-1">
                        <Badge
                          variant={file ? (isLarge ? "destructive" : "default") : "outline"}
                          className="flex items-center gap-1"
                        >
                          {lang === "uz" && "🇺🇿 O'zbek"}
                          {lang === "ru" && "🇷🇺 Rus"}
                          {lang === "en" && "🇺🇸 Ingliz"}
                          {file && <Check className="w-3 h-3" />}
                        </Badge>
                        {file && (
                          <span className={`text-xs ${isLarge ? "text-destructive" : "text-muted-foreground"}`}>
                            {fileSizeMB}MB
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {!canPublish && (
                <Alert variant={Number.parseFloat(getTotalSize()) > MAX_TOTAL_SIZE ? "destructive" : "default"}>
                  <AlertDescription>
                    {getUploadedCount() === 0
                      ? "Nashr qilish uchun kamida bitta PDF fayl yuklang."
                      : `Jami hajm ${getTotalSize()}MB juda katta. Maksimal ruxsat etilgan hajm ${MAX_TOTAL_SIZE}MB.`}
                  </AlertDescription>
                </Alert>
              )}

              {/* Siqish jarayoni */}
              {(isCompressing || isGenerating) && (
                <div className="space-y-2">
                  <Label>{isCompressing ? "Fayllar qayta ishlanmoqda..." : "Cloud-ga yuklanmoqda..."}</Label>
                  <Progress value={compressionProgress} className="w-full" />
                  <p className="text-xs text-muted-foreground text-center">{compressionProgress}%</p>
                </div>
              )}

              {/* Nashr qilish tugmasi */}
              <Button onClick={generatePublicLink} className="w-full" disabled={!canPublish || isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isCompressing ? "Fayllar qayta ishlanmoqda..." : "Cloud-ga yuklanmoqda..."}
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4 mr-2" />
                    Cloud-ga nashr qilish
                  </>
                )}
              </Button>

              {/* Yangi nashr natijasi */}
              {publicUrl && currentPublishId && (
                <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Cloud-ga muvaffaqiyatli yuklandi!</strong>
                      <br />
                      Endi bu havola barcha qurilmalardan ishlaydi.
                    </AlertDescription>
                  </Alert>

                  {/* URL */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Universal havola:
                    </Label>
                    <div className="flex gap-2">
                      <Input value={publicUrl} readOnly className="text-xs" />
                      <Button onClick={copyUrl} size="sm">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button onClick={openPreview} size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* QR kod */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      QR kod:
                    </Label>
                    <div className="flex justify-center">
                      <img src={qrCodeUrl || "/placeholder.svg"} alt="QR Code" className="border rounded" />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mavjud nashrlar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Cloud Nashrlar
                <div className="flex items-center gap-2">
                  {isLoadingPublications && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Badge variant="secondary">{publishedItems.length}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {publishedItems.length > 0 ? (
                <div className="space-y-3">
                  {publishedItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{item.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            ID: {item.id.split("_")[2]}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            <Cloud className="w-3 h-3 mr-1" />
                            Cloud
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Yaratilgan: {new Date(item.publishedAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ko'rishlar: {item.viewCount}
                           {/* • Fayllar: {Object.keys(item.pdf_files).length} */}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyPublishUrl(item.id)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`${window.location.origin}/view/${item.id}`, "_blank")}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeletePublish(item.id)}>
                          🗑️
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Hali hech qanday nashr yo'q. Birinchi nashrni yarating!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Ko'rsatmalar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cloud nashr afzalliklari:</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>
                🌐 <strong>Universal:</strong> Barcha qurilma va browser-lardan ishlaydi
              </p>
              <p>
                ☁️ <strong>Cloud Storage:</strong> Ma'lumotlar xavfsiz bulutda saqlanadi
              </p>
              <p>
                📊 <strong>Statistika:</strong> Ko'rishlar soni real-time yangilanadi
              </p>
              <p>
                🔗 <strong>Doimiy havola:</strong> Havola hech qachon o'chmaydi
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
