"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, FileText, List, ZoomIn, ZoomOut, Maximize, Minimize, Menu, Globe, Settings, Eye, Edit, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { useLanguage, type Language } from "../../hooks/useLanguage"
import { LanguageSelector } from "../../components/language-selector"
import { PDFUploadPanel } from "../../components/pdf-upload-panel"
import { PageNavigation } from "../../components/page-navigation"
import { OutlineEditor } from "../../components/outline-editor"
import { AdminPublisher } from "../../components/admin-publisher"
import { Toaster } from "@/components/ui/toaster"
import { 
  getPublications, 
  getOutlines, 
  createOutline, 
  type PublicationRecord, 
  type OutlineItem, 
  deleteOutline, 
  type CreateOutlineDto,
  createPublication,
  type CustomOutlines,
  getFileUrl,
  API_URL
} from "@/lib/api"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"

const ADMIN_PASSWORD = "admin123" // You can change this to any password you want

export default function AdminPanel() {
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [pdfOutline, setPdfOutline] = useState<OutlineItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [showOutline, setShowOutline] = useState<boolean>(true)
  const [scale, setScale] = useState<number>(1.2)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [isMobileOutlineOpen, setIsMobileOutlineOpen] = useState<boolean>(false)
  const [publications, setPublications] = useState<PublicationRecord[]>([])
  const [loadingPublications, setLoadingPublications] = useState(true)
  const [outlines, setOutlines] = useState<OutlineItem[]>([])
  const [selectedPublication, setSelectedPublication] = useState<PublicationRecord | null>(null)
  const [tempOutlines, setTempOutlines] = useState<Record<string, CreateOutlineDto[]>>({})
  const { toast } = useToast()
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const { language, changeLanguage, t, pdfFiles, updatePdfFile, customOutlines, updateCustomOutline } = useLanguage()

  const [currentRenderTask, setCurrentRenderTask] = useState<any>(null)

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

  // Til o'zgarganda avtomatik PDF yuklash
  useEffect(() => {
    const languageFile = pdfFiles[language]
    if (languageFile) {
      loadPDFFromFile(languageFile)
    } else {
      setCurrentFile(null)
      setPdfDoc(null)
      setNumPages(0)
      setPageNumber(1)
      setPdfOutline([])
    }
  }, [language, pdfFiles])

  // Fullscreen event listeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Fetch publications on mount
  useEffect(() => {
    const fetchPublications = async () => {
      try {
        const data = await getPublications()
        setPublications(data)
      } catch (error) {
        console.error("Failed to fetch publications:", error)
      } finally {
        setLoadingPublications(false)
      }
    }

    fetchPublications()
  }, [])

  // Fetch outlines when a publication is selected
  useEffect(() => {
    if (selectedPublication) {
      const fetchOutlines = async () => {
        try {
          const data = await getOutlines(selectedPublication.id)
          setOutlines(data)
        } catch (error) {
          console.error("Failed to fetch outlines:", error)
          toast({
            title: "Xatolik",
            description: "Mundarijani yuklashda xatolik yuz berdi",
            variant: "destructive",
          })
        }
      }
      fetchOutlines()

      // Load the PDF file
      const loadPublicationPDF = async () => {
        try {
          const pdfFile = selectedPublication.pdfFiles[0] // Get the first PDF file
          if (pdfFile) {
            const response = await fetch(`${API_URL}/${pdfFile.file}`)
            if (!response.ok) {
              throw new Error(`Failed to load PDF: ${response.statusText}`)
            }
            const blob = await response.blob()
            const file = new File([blob], pdfFile.name, { type: pdfFile.type })
            await loadPDFFromFile(file)
          }
        } catch (error) {
          console.error("Failed to load PDF:", error)
          toast({
            title: "Xatolik",
            description: "PDF faylni yuklashda xatolik yuz berdi",
            variant: "destructive",
          })
        }
      }
      loadPublicationPDF()
    }
  }, [selectedPublication])

  const loadPDFFromFile = async (file: File) => {
    setCurrentFile(file)
    setLoading(true)
    setPageNumber(1)
    setPdfOutline([])

    return new Promise((resolve, reject) => {
      const fileReader = new FileReader()

      fileReader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer)

          // @ts-ignore
          const pdf = await window.pdfjsLib.getDocument(typedArray).promise
          setPdfDoc(pdf)
          setNumPages(pdf.numPages)

          try {
            const outline = await pdf.getOutline()
            if (outline) {
              const processedOutline = await processOutline(outline, pdf)
              setPdfOutline(processedOutline)
            } else {
              setPdfOutline(customOutlines[language] || [])
            }
          } catch (outlineError) {
            console.log("Mundarija topilmadi:", outlineError)
            setPdfOutline(customOutlines[language] || [])
          }

          setLoading(false)
          resolve(pdf)
        } catch (error) {
          console.error("PDF yuklashda xatolik:", error)
          setLoading(false)
          reject(error)
        }
      }

      fileReader.onerror = () => {
        setLoading(false)
        reject(new Error("Fayl o'qishda xatolik"))
      }
      fileReader.readAsArrayBuffer(file)
    })
  }

  const processOutline = async (outlineItems: any[], pdf: any): Promise<OutlineItem[]> => {
    const processed: OutlineItem[] = []

    for (const item of outlineItems) {
      let pageNumber = 1

      try {
        if (item.dest) {
          let dest = item.dest
          if (typeof dest === "string") {
            dest = await pdf.getDestination(dest)
          }
          if (dest && dest[0]) {
            const pageRef = dest[0]
            const pageIndex = await pdf.getPageIndex(pageRef)
            pageNumber = pageIndex + 1
          }
        }
      } catch (error) {
        console.log("Sahifa raqamini aniqlab bo'lmadi:", error)
      }

      const processedItem: OutlineItem = {
        id: crypto.randomUUID(),
        title: item.title,
        page: pageNumber,
        parentId: null,
        language: language,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        children: item.items ? await processOutline(item.items, pdf) : []
      }

      processed.push(processedItem)
    }

    return processed
  }

  const renderPage = async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return

    try {
      // Cancel any ongoing render task
      if (currentRenderTask) {
        currentRenderTask.cancel()
      }

      const page = await pdfDoc.getPage(pageNum)
      const viewport = page.getViewport({ scale })

      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      canvas.height = viewport.height
      canvas.width = viewport.width

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
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

  useEffect(()=>{console.log('Outline updated',outlines)},[outlines])

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

  const handleLanguageChange = (newLanguage: Language) => {
    changeLanguage(newLanguage)
  }

  const handleFileUpload = (lang: Language, file: File | null) => {
    updatePdfFile(lang, file)
  }

  const handleLanguageSwitch = (lang: Language) => {
    changeLanguage(lang)
  }

  const hasPdfForLanguage = (lang: Language) => {
    return !!pdfFiles[lang]
  }

  const getUploadedFilesCount = () => {
    return Object.values(pdfFiles).filter((file) => file !== null).length
  }

  const deleteAllOutlines = async (publicationId: string) => {
    try {
      const currentOutlines = await getOutlines(publicationId)
      for (const outline of currentOutlines) {
        await deleteOutline(publicationId, outline.id)
      }
    } catch (error) {
      console.error("Failed to delete outlines:", error)
    }
  }

  const refreshOutlines = async () => {
    if (!selectedPublication) return
    try {
      setLoading(true)
      const fetched = await getOutlines(selectedPublication.id)
      setOutlines(fetched)
    } catch (error) {
      console.error('Error refreshing outlines:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPDFFromData = async (pdfData: PublicationRecord['pdfFiles'][0]) => {
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

  const OutlineContent = () => {
    const [selectedLanguage, setSelectedLanguage] = useState<Language>(language)
    const [showEditor, setShowEditor] = useState(false)

    // Get outlines for the selected language
    const languageOutlines = selectedPublication 
      ? outlines.filter(outline => outline.language === selectedLanguage)
      : (tempOutlines[selectedLanguage] || []).map(outline => ({
          id: crypto.randomUUID(),
          title: outline.title,
          page: outline.page,
          parentId: outline.parentId || null,
          language: outline.language || selectedLanguage,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }))

    const handleLanguageChange = (newLanguage: Language) => {
      setSelectedLanguage(newLanguage)
      // Find PDF file for the selected language
      if (selectedPublication) {
        const pdfFile = selectedPublication.pdfFiles.find(file => file.language === newLanguage)
        if (pdfFile) {
          loadPDFFromData(pdfFile)
        }
      }
    }

    const handleSave = async (newOutlines: OutlineItem[]) => {
      console.log("Saving new outlines:", newOutlines)
      await handleOutlineSave(newOutlines)
      setShowEditor(false)
    }

    return (
      <div className="h-full">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <List className="w-5 h-5" />
              Mundarija
            </h3>
            <Button
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-2"
            disabled={loading}
          >
            {languageOutlines.length > 0 ? (
              <>
                <Edit className="w-4 h-4" />
                Tahrirlash
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Yaratish
              </>
            )}
          </Button>
            {/* <div className="flex items-center gap-1 border rounded-md p-1">
              {Object.entries(languageNames).map(([lang, name]) => (
                <Button
                  key={lang}
                  variant={selectedLanguage === lang ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => handleLanguageChange(lang as Language)}
                >
                  <span>{languageFlags[lang as keyof typeof languageFlags]}</span>
                  <span className="hidden sm:inline">{name}</span>
                </Button>
              ))}
            </div> */}
          </div>
        </div>
        <ScrollArea className="h-[calc(100%-100px)]">
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : languageOutlines.length > 0 ? (
              renderOutlineItems(languageOutlines)
            ) : (
              <p className="text-muted-foreground text-sm">Mundarija topilmadi</p>
            )}
          </div>
        </ScrollArea>

        <Sheet open={showEditor} onOpenChange={setShowEditor}>
          <SheetContent side="right" className="w-full sm:max-w-2xl">
            <SheetHeader>
              <SheetTitle>Mundarijani tahrirlash</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <OutlineEditor
                language={selectedLanguage}
                outline={languageOutlines}
                onSave={handleSave}
                translations={{
                  editOutline: "Mundarijani tahrirlash",
                  addNewItem: "Yangi element qo'shish",
                  title: "Sarlavha",
                  titlePlaceholder: "Element sarlavhasini kiriting",
                  page: "Sahifa",
                  items: "elementlar",
                  noOutlineItems: "Mundarija elementlari mavjud emas",
                  cancel: "Bekor qilish",
                  save: "Saqlash",
                  outlineEditDescription: "Mundarija elementlarini qo'shing, tahrirlang yoki o'chirib tashlang"
                }}
                maxPages={numPages}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  const handleOutlineSave = async (outline: OutlineItem[]) => {
    console.log("Saving outline:", outline)
    if (!selectedPublication) {
      // Store outlines temporarily with language as key
      const newTempOutlines = {
        ...tempOutlines,
        [language]: outline.map(item => ({
          title: item.title,
          page: item.page,
          parentId: item.parentId,
          language: language
        }))
      }
      console.log("Setting temp outlines:", newTempOutlines)
      setTempOutlines(newTempOutlines)
      
      // Update customOutlines in useLanguage
      console.log("Updating custom outlines with:", outline)
      updateCustomOutline(language, outline)
      
      toast({
        title: "Muvaffaqiyatli",
        description: "Mundarija vaqtincha saqlandi"
      })
      return
    }

    try {
      setLoading(true)
      // First delete all existing outlines for the current language
      const existingOutlines = await getOutlines(selectedPublication.id)
      const outlinesToDelete = existingOutlines.filter(o => o.language === language)
      for (const outline of outlinesToDelete) {
        await deleteOutline(selectedPublication.id, outline.id)
      }

      // Create new outlines sequentially
      const createdOutlines: OutlineItem[] = []
      for (const item of outline) {
        const created = await createOutline(selectedPublication.id, {
          title: item.title,
          page: item.page,
          parentId: item.parentId,
          language: language
        })
        createdOutlines.push(created)
      }

      console.log("Created outlines:", createdOutlines)

      // Update local state with created outlines
      setOutlines(prev => [...prev.filter(o => o.language !== language), ...createdOutlines])
      
      // Update customOutlines in useLanguage
      console.log("Updating custom outlines with created outlines:", createdOutlines)
      updateCustomOutline(language, createdOutlines)
      
      toast({
        title: "Muvaffaqiyatli",
        description: "Mundarija muvaffaqiyatli saqlandi"
      })
    } catch (error) {
      console.error("Error saving outline:", error)
      toast({
        title: "Xatolik",
        description: "Mundarijani saqlashda xatolik yuz berdi",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!selectedPublication) return

    try {
      setLoading(true)
      // Get all outlines for the publication
      const allOutlines = await getOutlines(selectedPublication.id)
      console.log("All outlines from publication:", allOutlines)
      
      // Create a map of outlines by language
      const outlinesByLanguage: CustomOutlines = {}
      allOutlines.forEach(outline => {
        if (!outlinesByLanguage[outline.language]) {
          outlinesByLanguage[outline.language] = []
        }
        outlinesByLanguage[outline.language].push({
          title: outline.title,
          page: outline.page,
          parentId: outline.parentId,
          language: outline.language
        })
      })

      // Add any temporary outlines
      Object.entries(tempOutlines).forEach(([lang, outlines]) => {
        console.log("Adding temp outlines for language:", lang, outlines)
        outlinesByLanguage[lang] = outlines
      })

      console.log("Final outlines by language:", outlinesByLanguage)

      // Update customOutlines in useLanguage for all languages
      Object.entries(outlinesByLanguage).forEach(([lang, outlines]) => {
        const formattedOutlines = outlines.map(outline => ({
          id: crypto.randomUUID(),
          title: outline.title,
          page: outline.page,
          parentId: outline.parentId || null,
          language: outline.language || lang,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }))
        console.log("Updating custom outlines for language:", lang, formattedOutlines)
        updateCustomOutline(lang as Language, formattedOutlines)
      })

      // Convert PDF files to the correct format
      const pdfFiles: Record<string, File> = {}
      selectedPublication.pdfFiles.forEach(file => {
        pdfFiles[file.language] = new File([], file.name, { type: file.type })
      })

      // Create the publication with all outlines
      const publicationData = {
        title: selectedPublication.title,
        publishedAt: new Date(),
        pdfFiles,
        customOutlines: outlinesByLanguage
      }
      console.log("Creating publication with data:", publicationData)
      const result = await createPublication(publicationData)
      console.log("Publication created:", result)

      toast({
        title: "Muvaffaqiyatli",
        description: "Nashr muvaffaqiyatli chop etildi"
      })

      // Clear temporary outlines
      setTempOutlines({})
      
      // Refresh publications list
      const updatedPublications = await getPublications()
      setPublications(updatedPublications)
    } catch (error) {
      console.error("Error publishing:", error)
      toast({
        title: "Xatolik",
        description: "Nashrni chop etishda xatolik yuz berdi",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getCombinedOutline = (): OutlineItem[] => {
    // Get outlines for current language
    const currentOutlines = outlines.filter(o => o.language === language)
    
    // Get temporary outlines for current language
    const tempOutlinesForLanguage = tempOutlines[language] || []
    
    // Convert temporary outlines to OutlineItem format
    const tempOutlineItems: OutlineItem[] = tempOutlinesForLanguage.map((outline, index) => ({
      id: `temp-${index}`,
      title: outline.title,
      page: outline.page,
      parentId: outline.parentId || null,
      language: outline.language || language,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
    
    return [...currentOutlines, ...tempOutlineItems]
  }

  const renderOutlineItems = (items: OutlineItem[], level = 0) => {
    return items.map((item, index) => (
      <div key={item.id || index} className={`ml-${level * 4}`}>
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
        {item.children && item.children.length > 0 && (
          <div className="ml-4">{renderOutlineItems(item.children, level + 1)}</div>
        )}
      </div>
    ))
  }

  const handlePublicationCreated = async (publicationId: string) => {
    // Get temporary outlines for the current language
    const tempOutline = tempOutlines[language]
    if (tempOutline && tempOutline.length > 0) {
      try {
        // Create outlines for the new publication
        for (const item of tempOutline) {
          await createOutline(publicationId, {
            title: item.title,
            page: item.page,
            parentId: null
          })
        }
        
        // Clear temporary outlines for this language
        setTempOutlines(prev => {
          const newTemp = { ...prev }
          delete newTemp[language]
          return newTemp
        })

        toast({
          title: "Muvaffaqiyatli",
          description: "Mundarija nashrga muvaffaqiyatli biriktirildi"
        })
      } catch (error) {
        console.error("Error creating outlines for new publication:", error)
        toast({
          title: "Xatolik",
          description: "Mundarijani nashrga biriktirishda xatolik yuz berdi",
          variant: "destructive"
        })
      }
    }
  }

  // Add effect to sync outlines with customOutlines
  useEffect(() => {
    if (selectedPublication) {
      const fetchAndUpdateOutlines = async () => {
        try {
          const fetchedOutlines = await getOutlines(selectedPublication.id)
          console.log("Fetched outlines:", fetchedOutlines)
          setOutlines(fetchedOutlines)
          
          // Group outlines by language
          const outlinesByLanguage: Record<string, OutlineItem[]> = {}
          fetchedOutlines.forEach(outline => {
            if (!outlinesByLanguage[outline.language]) {
              outlinesByLanguage[outline.language] = []
            }
            outlinesByLanguage[outline.language].push(outline)
          })
          
          // Update customOutlines for each language
          Object.entries(outlinesByLanguage).forEach(([lang, outlines]) => {
            console.log("Updating custom outlines for language:", lang, outlines)
            updateCustomOutline(lang as Language, outlines)
          })
        } catch (error) {
          console.error("Error fetching outlines:", error)
        }
      }
      
      fetchAndUpdateOutlines()
    }
  }, [selectedPublication])

  useEffect(() => {
    // Check if user is already authenticated
    const auth = localStorage.getItem("adminAuth")
    if (auth === "true") {
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("adminAuth", "true")
      setIsAuthenticated(true)
      toast({
        title: "Muvaffaqiyatli",
        description: "Admin paneliga kirildi"
      })
    } else {
      toast({
        title: "Xatolik",
        description: "Noto'g'ri parol",
        variant: "destructive"
      })
    }
    setIsLoading(false)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Admin Panel</CardTitle>
            <CardDescription>Davom etish uchun parolni kiriting</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Parol"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kutilmoqda...
                  </>
                ) : (
                  "Kirish"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-2 sm:p-4">
        {/* Admin Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Admin Panel</h1>
                <p className="text-sm text-muted-foreground">PDF va mundarijalarni boshqarish</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PDFUploadPanel
                pdfFiles={pdfFiles}
                onFileChange={handleFileUpload}
                translations={t}
                currentLanguage={language}
                onLanguageSwitch={handleLanguageSwitch}
              />
              <AdminPublisher pdfFiles={pdfFiles} customOutlines={customOutlines} translations={t} />
              <LanguageSelector
                currentLanguage={language}
                onLanguageChange={handleLanguageChange}
                translations={t}
                hasPdfForLanguage={hasPdfForLanguage}
              />
            </div>
          </div>

          {/* Publications List */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Nashrlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPublications ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground text-sm">Nashrlar yuklanmoqda...</p>
                </div>
              ) : publications.length > 0 ? (
                <div className="space-y-4">
                  {publications.map((pub) => (
                    <Card 
                      key={pub.id} 
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedPublication?.id === pub.id ? 'border-primary' : ''
                      }`}
                      onClick={() => setSelectedPublication(pub)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{pub.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary">
                              {pub.language === "uz" ? "🇺🇿 O'zbekcha" : pub.language === "ru" ? "🇷🇺 Русский" : "🇺🇸 English"}
                            </Badge>
                            <span>•</span>
                            <span>Ko'rishlar: {pub.viewCount}</span>
                            <span>•</span>
                            <span>Yaratilgan: {format(new Date(pub.createdAt), "dd.MM.yyyy HH:mm")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedPublication(pub)
                              setShowOutline(true)
                            }}
                          >
                            <List className="w-4 h-4 mr-2" />
                            Mundarija
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href={`/view/${pub.id}`} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4 mr-2" />
                              Ko'rish
                            </a>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Hozircha nashrlar yo'q</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card className="mb-4">
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Yuklangan fayllar:</span>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      {getUploadedFilesCount()}/3
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Joriy til:</span>
                    <Badge variant={currentFile ? "default" : "outline"} className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {currentFile ? t.languagePdf : t.noFileUploaded}
                    </Badge>
                  </div>
                </div>

                {currentFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span className="truncate">{currentFile.name}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <div className="sm:hidden">
                    <Sheet open={isMobileOutlineOpen} onOpenChange={setIsMobileOutlineOpen}>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm" disabled={!currentFile}>
                          <Menu className="w-4 h-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-80 p-0">
                        <OutlineContent />
                      </SheetContent>
                    </Sheet>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setShowOutline(!showOutline)}
                    className="hidden sm:flex items-center gap-2"
                    disabled={!currentFile}
                  >
                    <List className="w-4 h-4" />
                    <span className="hidden md:inline">{showOutline ? t.hideOutline : t.showOutline}</span>
                  </Button>
                </div>
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
                    {t.pdfViewer}
                  </CardTitle>

                  <div className="flex flex-wrap items-center gap-2">
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
                          <span className="hidden sm:ml-2 sm:inline">{t.exitFullscreen}</span>
                        </>
                      ) : (
                        <>
                          <Maximize className="w-4 h-4" />
                          <span className="hidden sm:ml-2 sm:inline">{t.fullscreen}</span>
                        </>
                      )}
                    </Button>

                    {/* Page navigation with input */}
                    {numPages > 0 && (
                      <PageNavigation
                        currentPage={pageNumber}
                        totalPages={numPages}
                        onPageChange={goToPage}
                        translations={t}
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
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-muted-foreground text-sm">{t.loadingLanguagePdf}</p>
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

        {!currentFile && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 sm:h-96 p-4">
              <Settings className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-center">Admin Panel</h3>
              <p className="text-muted-foreground text-center text-sm sm:text-base max-w-md mb-4">
                PDF fayllarni yuklang va mundarijalarni tahrirlang. Tayyor bo'lgach, foydalanuvchilar uchun havola
                yarating.
              </p>
              <PDFUploadPanel
                pdfFiles={pdfFiles}
                onFileChange={handleFileUpload}
                translations={t}
                currentLanguage={language}
                onLanguageSwitch={handleLanguageSwitch}
              />
            </CardContent>
          </Card>
        )}
      </div>
      <Toaster />
    </div>
  )
}
