"use client"

import { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  FileText,
  List,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Menu,
  Globe,
  Download,
  Share2,
  AlertCircle,
  Cloud,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PageNavigation } from "../../../components/page-navigation"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { getPublication, incrementViewCount, type PublicationRecord, getFileUrl } from "@/lib/api"

interface OutlineItem {
  title: string
  page: number
  items?: OutlineItem[]
}

type PDFData = PublicationRecord['pdfFiles'][0]

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

export default function PublicViewer() {
  const params = useParams()
  const publishId = params.id as string

  const [publishedData, setPublishedData] = useState<PublicationRecord | null>(null)
  const [currentLanguage, setCurrentLanguage] = useState<string>("uz")
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingProgress, setLoadingProgress] = useState<number>(0)
  const [showOutline, setShowOutline] = useState<boolean>(true)
  const [scale, setScale] = useState<number>(1.2)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [isMobileOutlineOpen, setIsMobileOutlineOpen] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [isClient, setIsClient] = useState(false)
  const [currentRenderTask, setCurrentRenderTask] = useState<any>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Client-side ekanligini tekshirish
  useEffect(() => {
    setIsClient(true)
  }, [])

  // PDF.js ni dinamik ravishda yuklash
  useEffect(() => {
    const loadPDFJS = async () => {
      if (typeof window !== "undefined") {
        const script = document.createElement("script")
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        script.onload = () => {
          // @ts-ignore
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
        }
        document.head.appendChild(script)
      }
    }

    loadPDFJS()
  }, [])

  // Nashr ma'lumotlarini yuklash
  useEffect(() => {
    if (publishId && isClient) {
      loadPublishedData(publishId)
    }
  }, [publishId, isClient])

  // Til o'zgarganda PDF yuklash
  useEffect(() => {
    if (publishedData && currentLanguage && publishedData.pdfFiles.length > 0) {
      loadPDFFromData(publishedData.pdfFiles[0])
    }
  }, [publishedData, currentLanguage])

  // Fullscreen event listeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const loadPublishedData = async (id: string) => {
    try {
      setLoadingProgress(10)

      // API dan ma'lumotlarni olish
      const publishData = await getPublication(id)
      setLoadingProgress(30)

      if (publishData) {
        setPublishedData(publishData)
        setLoadingProgress(50)

        // Ko'rishlar sonini oshirish
        try {
          await incrementViewCount(id)
          // Local state-ni ham yangilash
          setPublishedData((prev) => (prev ? { ...prev, viewCount: prev.viewCount + 1 } : null))
        } catch (viewError) {
          console.error("Ko'rishlar sonini oshirishda xatolik:", viewError)
          // Bu xatolik muhim emas, davom etamiz
        }

        setLoadingProgress(70)

        // Tilni o'rnatish
        setCurrentLanguage(publishData.language)

        setLoadingProgress(100)
      } else {
        setError("Bu nashr topilmadi yoki o'chirilgan")
      }
    } catch (error) {
      console.error("Ma'lumotlarni yuklashda xatolik:", error)
      setError("Ma'lumotlarni yuklashda xatolik yuz berdi")
    }
  }

  // Chunked fayllarni birlashtirish
  const reconstructFileFromChunks = (chunks: string[]): Uint8Array => {
    let totalLength = 0
    const decodedChunks = chunks.map((chunk) => {
      const decoded = Uint8Array.from(atob(chunk), (c) => c.charCodeAt(0))
      totalLength += decoded.length
      return decoded
    })

    const result = new Uint8Array(totalLength)
    let offset = 0

    for (const chunk of decodedChunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }

    return result
  }

  const loadPDFFromData = async (pdfData: PDFData) => {
    setLoading(true)
    setPageNumber(1)
    setLoadingProgress(0)

    try {
      setLoadingProgress(25)
      
      // Fetch the PDF file from the backend
      const response = await fetch(getFileUrl(pdfData.file))
      if (!response.ok) {
        throw new Error(`Failed to load PDF: ${response.statusText}`)
      }
      
      const blob = await response.blob()
      setLoadingProgress(50)
      
      const file = new File([blob], pdfData.name, { type: pdfData.type })
      setCurrentFile(file)
      setLoadingProgress(75)

      // PDF.js bilan yuklash
      // @ts-ignore
      const pdf = await window.pdfjsLib.getDocument(URL.createObjectURL(blob)).promise
      setPdfDoc(pdf)
      setNumPages(pdf.numPages)
      setLoadingProgress(100)
      setLoading(false)
    } catch (error) {
      console.error("PDF yuklashda xatolik:", error)
      setError("PDF faylni yuklashda xatolik")
      setLoading(false)
    }
  }

  const renderPage = async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return

    try {
      // Cancel any ongoing render task
      if (currentRenderTask) {
        currentRenderTask.cancel()
      }

      const page = await pdfDoc.getPage(pageNum)
      const viewport = page.getViewport({ 
        scale,
        rotation: 0,
        dontFlip: false
      })

      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      // Set canvas dimensions
      canvas.height = viewport.height
      canvas.width = viewport.width

      // Clear the canvas
      context?.clearRect(0, 0, canvas.width, canvas.height)

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        intent: 'display'
      }

      // Create new render task and store it
      const renderTask = page.render(renderContext)
      setCurrentRenderTask(renderTask)

      // Wait for render to complete
      await renderTask.promise
      
      // Clear the render task reference after completion
      setCurrentRenderTask(null)
    } catch (error: any) {
      // Ignore cancellation errors
      if (error?.name === 'RenderingCancelled') {
        return
      }
      console.error("Sahifani render qilishda xatolik:", error)
    }
  }

  // Cleanup render task on unmount
  useEffect(() => {
    return () => {
      if (currentRenderTask) {
        currentRenderTask.cancel()
      }
    }
  }, [currentRenderTask])

  useEffect(() => {
    if (pdfDoc && pageNumber) {
      renderPage(pageNumber)
    }
  }, [pdfDoc, pageNumber, scale])

  const goToPage = (page: number) => {
    setPageNumber(Math.max(1, Math.min(page, numPages)))
  }

  const handleOutlineClick = (item: OutlineItem) => {
    goToPage(item.page)
    setIsMobileOutlineOpen(false)
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5))
  }

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      if (viewerRef.current) {
        await viewerRef.current.requestFullscreen()
      }
    } else {
      await document.exitFullscreen()
    }
  }

  const shareCurrentPage = async () => {
    if (!isClient) return

    try {
      const url = window.location.href
      await navigator.clipboard.writeText(url)
      toast({
        title: "Ulashildi!",
        description: "Havola clipboard ga nusxalandi",
      })
    } catch (error) {
      console.error("Share error:", error)
    }
  }

  const downloadPDF = () => {
    if (currentFile) {
      const url = URL.createObjectURL(currentFile)
      const a = document.createElement("a")
      a.href = url
      a.download = currentFile.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const renderOutlineItems = (items: OutlineItem[], level = 0) => {
    return items.map((item, index) => (
      <div key={index} className={`ml-${level * 4}`}>
        <Button
          variant="ghost"
          className="w-full justify-start text-left h-auto p-2 hover:bg-muted"
          onClick={() => handleOutlineClick(item)}
        >
          <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
          <div className="flex-1 truncate">
            <span className="text-sm">{item.title}</span>
            <span className="text-xs text-muted-foreground ml-2">({item.page})</span>
          </div>
        </Button>
        {item.items && item.items.length > 0 && <div className="ml-4">{renderOutlineItems(item.items, level + 1)}</div>}
      </div>
    ))
  }

  const OutlineContent = () => {
    const outline = publishedData?.outlines || []

    return (
      <div className="h-full">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <List className="w-5 h-5" />
            Mundarija
          </h3>
        </div>
        <ScrollArea className="h-[calc(100%-60px)]">
          <div className="p-4">
            {outline.length > 0 ? (
              renderOutlineItems(outline)
            ) : (
              <p className="text-muted-foreground text-sm">Mundarija topilmadi</p>
            )}
          </div>
        </ScrollArea>
      </div>
    )
  }

  // Server-side rendering paytida loading ko'rsatish
  if (!isClient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Xatolik</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => (window.location.href = "/")}>Bosh sahifaga qaytish</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!publishedData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <div className="w-64">
            <Progress value={loadingProgress} className="w-full" />
            <p className="text-muted-foreground text-sm mt-2">Cloud-dan yuklanmoqda... {loadingProgress}%</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-2 sm:p-4">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">PDF O'quvchi</h1>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  {publishedData.title} • Ko'rishlar: {publishedData.viewCount}
                  <Badge variant="secondary" className="text-xs">
                    <Cloud className="w-3 h-3 mr-1" />
                    Cloud
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Til tanlash */}
              {/* <div className="flex items-center gap-1 border rounded-md p-1">
                {publishedData.pdfFiles.map((pdfFile) => (
                  <Button
                    key={pdfFile.id}
                    variant={currentLanguage === pdfFile.language ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => {
                      setCurrentLanguage(pdfFile.language)
                      loadPDFFromData(pdfFile)
                    }}
                  >
                    <span>{languageFlags[pdfFile.language as keyof typeof languageFlags]}</span>
                    <span className="hidden sm:inline">{languageNames[pdfFile.language as keyof typeof languageNames]}</span>
                  </Button>
                ))}
              </div> */}

              <Button variant="outline" size="sm" onClick={shareCurrentPage}>
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:ml-2 sm:inline">Ulashish</span>
              </Button>

              <Button variant="outline" size="sm" onClick={downloadPDF} disabled={!currentFile}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:ml-2 sm:inline">Yuklash</span>
              </Button>
            </div>
          </div>

          {/* Status */}
          <Card className="mb-4">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Joriy til:</span>
                  <Badge variant="default" className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {languageFlags[currentLanguage as keyof typeof languageFlags]}{" "}
                    {languageNames[currentLanguage as keyof typeof languageNames]}
                  </Badge>
                </div>

                {currentFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span className="truncate">{currentFile.name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {currentFile && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Desktop Outline */}
            {showOutline && (
              <Card className="hidden sm:block lg:col-span-1">
                <OutlineContent />
              </Card>
            )}

            {/* PDF Viewer */}
            <Card className={showOutline ? "lg:col-span-3" : "lg:col-span-4"} ref={viewerRef}>
              <CardHeader className="pb-2 sm:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <FileText className="w-5 h-5" />
                    PDF Ko'ruvchi
                  </CardTitle>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Mobile outline toggle */}
                    <div className="sm:hidden">
                      <Sheet open={isMobileOutlineOpen} onOpenChange={setIsMobileOutlineOpen}>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Menu className="w-4 h-4" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-80 p-0">
                          <OutlineContent />
                        </SheetContent>
                      </Sheet>
                    </div>

                    {/* Desktop outline toggle */}
                    <Button
                      variant="outline"
                      onClick={() => setShowOutline(!showOutline)}
                      className="hidden sm:flex items-center gap-2"
                    >
                      <List className="w-4 h-4" />
                      <span className="hidden md:inline">{showOutline ? "Yashirish" : "Ko'rsatish"}</span>
                    </Button>

                    {/* Zoom controls */}
                    <div className="flex items-center gap-1 border rounded-md p-1">
                      <Button variant="ghost" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-xs px-2 min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
                      <Button variant="ghost" size="sm" onClick={zoomIn} disabled={scale >= 3}>
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Fullscreen button */}
                    <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                      {isFullscreen ? (
                        <>
                          <Minimize className="w-4 h-4" />
                          <span className="hidden sm:ml-2 sm:inline">Chiqish</span>
                        </>
                      ) : (
                        <>
                          <Maximize className="w-4 h-4" />
                          <span className="hidden sm:ml-2 sm:inline">To'liq ekran</span>
                        </>
                      )}
                    </Button>

                    {/* Page navigation */}
                    {numPages > 0 && (
                      <PageNavigation
                        currentPage={pageNumber}
                        totalPages={numPages}
                        onPageChange={goToPage}
                        translations={{
                          of: "dan",
                        }}
                      />
                    )}
                  </div>
                </div>
              </CardHeader>

              <Separator />

              <CardContent className="p-2 sm:p-4">
                <div className="flex justify-center">
                  {loading && (
                    <div className="flex items-center justify-center h-64 sm:h-96">
                      <div className="text-center space-y-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <div className="w-64">
                          <Progress value={loadingProgress} className="w-full" />
                          <p className="text-muted-foreground text-sm mt-2">PDF yuklanmoqda... {loadingProgress}%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border border-border rounded-lg overflow-hidden shadow-lg max-w-full">
                    <canvas
                      ref={canvasRef}
                      className="max-w-full h-auto block"
                      style={{ display: loading ? "none" : "block" }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Toaster />
    </div>
  )
}
