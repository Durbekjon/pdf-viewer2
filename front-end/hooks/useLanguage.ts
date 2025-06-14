"use client"

import { useState, useEffect } from "react"
import type { OutlineItem as ApiOutlineItem } from "@/lib/api"

export type Language = "uz" | "ru" | "en"

export type OutlineItem = ApiOutlineItem

export interface Translations {
  title: string
  selectFiles: string
  showOutline: string
  hideOutline: string
  outline: string
  pdfViewer: string
  loading: string
  noOutline: string
  outlineLoading: string
  selectPdfFile: string
  selectPdfDescription: string
  page: string
  of: string
  fullscreen: string
  exitFullscreen: string
  language: string
  zoom: string
  navigation: string
  loadingLanguagePdf: string
  uploadPdfs: string
  uzbekPdf: string
  russianPdf: string
  englishPdf: string
  currentSource: string
  languagePdf: string
  customFile: string
  uploadedFiles: string
  noFileUploaded: string
  fileUploaded: string
  selectPdfForLanguage: string
  switchToLanguage: string
  uploadPdfFiles: string
  uploadDescription: string
  editOutline: string
  outlineEditDescription: string
  addNewItem: string
  titlePlaceholder: string
  save: string
  cancel: string
  items: string
  noOutlineItems: string
  goToPage: string
  configureSources: string
  pdfSources: string
  pdfSourcesDescription: string
  uzbekPdfSource: string
  russianPdfSource: string
  englishPdfSource: string
  pdfUrlPlaceholder: string
  cloudSync: string
  export: string
  import: string
  exportData: string
  importData: string
  exportDescription: string
  importDescription: string
  generateCode: string
  importCode: string
  shareCode: string
  pasteCodeHere: string
  importNow: string
  copied: string
  shareSuccess: string
  shareSuccessDesc: string
  shareError: string
  shareErrorDesc: string
  importSuccess: string
  importSuccessDesc: string
  importError: string
  importErrorDesc: string
  importWarning: string
  outlineItems: string
  codeWillAppear: string
  shareCodeDesc: string
}

const translations: Record<Language, Translations> = {
  uz: {
    title: "PDF O'quvchi",
    selectFiles: "PDF fayllarni tanlang",
    showOutline: "Mundarijani ko'rsatish",
    hideOutline: "Mundarijani yashirish",
    outline: "Mundarija",
    pdfViewer: "PDF Ko'ruvchi",
    loading: "PDF yuklanmoqda...",
    noOutline: "Mundarija topilmadi",
    outlineLoading: "Mundarija yuklanmoqda...",
    selectPdfFile: "PDF fayl tanlang",
    selectPdfDescription: "Har bir til uchun PDF faylni yuklang",
    page: "Sahifa",
    of: "dan",
    fullscreen: "To'liq ekran",
    exitFullscreen: "Chiqish",
    language: "Til",
    zoom: "Masshtab",
    navigation: "Navigatsiya",
    loadingLanguagePdf: "Til bo'yicha PDF yuklanmoqda...",
    uploadPdfs: "PDF'larni yuklash",
    uzbekPdf: "O'zbek PDF",
    russianPdf: "Rus PDF",
    englishPdf: "Ingliz PDF",
    currentSource: "Joriy manba",
    languagePdf: "Til PDF",
    customFile: "Yuklangan fayl",
    uploadedFiles: "Yuklangan fayllar",
    noFileUploaded: "Fayl yuklanmagan",
    fileUploaded: "Fayl yuklangan",
    selectPdfForLanguage: "uchun PDF tanlang",
    switchToLanguage: "ga o'tish",
    uploadPdfFiles: "PDF fayllarni yuklang",
    uploadDescription: "Har bir til uchun alohida PDF fayl yuklang. Til o'zgarganda tegishli PDF avtomatik ochiladi.",
    editOutline: "Mundarijani tahrirlash",
    outlineEditDescription: "Joriy til uchun mundarija elementlarini qo'shing yoki tahrirlang",
    addNewItem: "Yangi element qo'shish",
    titlePlaceholder: "Mundarija nomi...",
    save: "Saqlash",
    cancel: "Bekor qilish",
    items: "elementlar",
    noOutlineItems: "Mundarija elementlari yo'q",
    goToPage: "Sahifaga o'tish",
    configureSources: "Manbalarni sozlash",
    pdfSources: "PDF Manbalari",
    pdfSourcesDescription: "Har bir til uchun PDF manbalarini sozlang",
    uzbekPdfSource: "O'zbek PDF Manbasi",
    russianPdfSource: "Rus PDF Manbasi",
    englishPdfSource: "Ingliz PDF Manbasi",
    pdfUrlPlaceholder: "PDF URL manzilini kiriting",
    cloudSync: "Sinxronlash",
    export: "Eksport",
    import: "Import",
    exportData: "Ma'lumotlarni eksport qilish",
    importData: "Ma'lumotlarni import qilish",
    exportDescription: "Barcha PDF fayllar va mundarijalarni boshqa qurilmaga o'tkazish uchun kod yarating",
    importDescription: "Boshqa qurilmadan olingan kodni kiriting",
    generateCode: "Kod yaratish",
    importCode: "Import kodi",
    shareCode: "Ulashish kodi",
    pasteCodeHere: "Kodni shu yerga joylashtiring...",
    importNow: "Import qilish",
    copied: "Nusxalandi!",
    shareSuccess: "Muvaffaqiyatli!",
    shareSuccessDesc: "Ma'lumotlar clipboard ga nusxalandi",
    shareError: "Xatolik!",
    shareErrorDesc: "Ma'lumotlarni ulashishda xatolik",
    importSuccess: "Import muvaffaqiyatli!",
    importSuccessDesc: "Ma'lumotlar muvaffaqiyatli yuklandi",
    importError: "Import xatoligi!",
    importErrorDesc: "Ma'lumotlarni yuklashda xatolik",
    importWarning: "Diqqat: Import qilish joriy ma'lumotlarni almashtiradi",
    outlineItems: "Mundarija elementlari",
    codeWillAppear: "Kod shu yerda paydo bo'ladi...",
    shareCodeDesc: "Bu kodni boshqa qurilmada import qiling",
  },
  ru: {
    title: "PDF Читалка",
    selectFiles: "Выберите PDF файлы",
    showOutline: "Показать содержание",
    hideOutline: "Скрыть содержание",
    outline: "Содержание",
    pdfViewer: "PDF Просмотрщик",
    loading: "Загрузка PDF...",
    noOutline: "Содержание не найдено",
    outlineLoading: "Загрузка содержания...",
    selectPdfFile: "Выберите PDF файл",
    selectPdfDescription: "Загрузите PDF файл для каждого языка",
    page: "Страница",
    of: "из",
    fullscreen: "Полный экран",
    exitFullscreen: "Выход",
    language: "Язык",
    zoom: "Масштаб",
    navigation: "Навигация",
    loadingLanguagePdf: "Загрузка PDF по языку...",
    uploadPdfs: "Загрузить PDF",
    uzbekPdf: "Узбекский PDF",
    russianPdf: "Русский PDF",
    englishPdf: "Английский PDF",
    currentSource: "Текущий источник",
    languagePdf: "Язык PDF",
    customFile: "Загруженный файл",
    uploadedFiles: "Загруженные файлы",
    noFileUploaded: "Файл не загружен",
    fileUploaded: "Файл загружен",
    selectPdfForLanguage: "Выберите PDF для",
    switchToLanguage: "Переключить на",
    uploadPdfFiles: "Загрузите PDF файлы",
    uploadDescription:
      "Загрузите отдельный PDF файл для каждого языка. При смене языка соответствующий PDF откроется автоматически.",
    editOutline: "Редактировать содержание",
    outlineEditDescription: "Добавьте или отредактируйте элементы содержания для текущего языка",
    addNewItem: "Добавить новый элемент",
    titlePlaceholder: "Название содержания...",
    save: "Сохранить",
    cancel: "Отмена",
    items: "элементов",
    noOutlineItems: "Нет элементов содержания",
    goToPage: "Перейти на страницу",
    configureSources: "Настроить источники",
    pdfSources: "PDF Источники",
    pdfSourcesDescription: "Настройте PDF источники для каждого языка",
    uzbekPdfSource: "Узбекский PDF Источник",
    russianPdfSource: "Русский PDF Источник",
    englishPdfSource: "Английский PDF Источник",
    pdfUrlPlaceholder: "Введите URL PDF",
    cloudSync: "Синхронизация",
    export: "Экспорт",
    import: "Импорт",
    exportData: "Экспорт данных",
    importData: "Импорт данных",
    exportDescription: "Создайте код для переноса всех PDF файлов и содержания на другое устройство",
    importDescription: "Введите код, полученный с другого устройства",
    generateCode: "Создать код",
    importCode: "Код импорта",
    shareCode: "Код для обмена",
    pasteCodeHere: "Вставьте код здесь...",
    importNow: "Импортировать",
    copied: "Скопировано!",
    shareSuccess: "Успешно!",
    shareSuccessDesc: "Данные скопированы в буфер обмена",
    shareError: "Ошибка!",
    shareErrorDesc: "Ошибка при обмене данными",
    importSuccess: "Импорт успешен!",
    importSuccessDesc: "Данные успешно загружены",
    importError: "Ошибка импорта!",
    importErrorDesc: "Ошибка при загрузке данных",
    importWarning: "Внимание: Импорт заменит текущие данные",
    outlineItems: "Элементы содержания",
    codeWillAppear: "Код появится здесь...",
    shareCodeDesc: "Импортируйте этот код на другом устройстве",
  },
  en: {
    title: "PDF Reader",
    selectFiles: "Select PDF files",
    showOutline: "Show outline",
    hideOutline: "Hide outline",
    outline: "Outline",
    pdfViewer: "PDF Viewer",
    loading: "Loading PDF...",
    noOutline: "No outline found",
    outlineLoading: "Loading outline...",
    selectPdfFile: "Select PDF file",
    selectPdfDescription: "Upload PDF file for each language",
    page: "Page",
    of: "of",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit",
    language: "Language",
    zoom: "Zoom",
    navigation: "Navigation",
    loadingLanguagePdf: "Loading language PDF...",
    uploadPdfs: "Upload PDFs",
    uzbekPdf: "Uzbek PDF",
    russianPdf: "Russian PDF",
    englishPdf: "English PDF",
    currentSource: "Current source",
    languagePdf: "Language PDF",
    customFile: "Uploaded file",
    uploadedFiles: "Uploaded files",
    noFileUploaded: "No file uploaded",
    fileUploaded: "File uploaded",
    selectPdfForLanguage: "Select PDF for",
    switchToLanguage: "Switch to",
    uploadPdfFiles: "Upload PDF files",
    uploadDescription:
      "Upload a separate PDF file for each language. When you change language, the corresponding PDF will open automatically.",
    editOutline: "Edit outline",
    outlineEditDescription: "Add or edit outline items for the current language",
    addNewItem: "Add new item",
    titlePlaceholder: "Outline title...",
    save: "Save",
    cancel: "Cancel",
    items: "items",
    noOutlineItems: "No outline items",
    goToPage: "Go to page",
    configureSources: "Configure Sources",
    pdfSources: "PDF Sources",
    pdfSourcesDescription: "Configure PDF sources for each language",
    uzbekPdfSource: "Uzbek PDF Source",
    russianPdfSource: "Russian PDF Source",
    englishPdfSource: "English PDF Source",
    pdfUrlPlaceholder: "Enter PDF URL",
    cloudSync: "Cloud Sync",
    export: "Export",
    import: "Import",
    exportData: "Export Data",
    importData: "Import Data",
    exportDescription: "Generate a code to transfer all PDF files and outlines to another device",
    importDescription: "Enter the code obtained from another device",
    generateCode: "Generate Code",
    importCode: "Import Code",
    shareCode: "Share Code",
    pasteCodeHere: "Paste code here...",
    importNow: "Import Now",
    copied: "Copied!",
    shareSuccess: "Success!",
    shareSuccessDesc: "Data copied to clipboard",
    shareError: "Error!",
    shareErrorDesc: "Error sharing data",
    importSuccess: "Import successful!",
    importSuccessDesc: "Data imported successfully",
    importError: "Import error!",
    importErrorDesc: "Error importing data",
    importWarning: "Warning: Import will replace current data",
    outlineItems: "Outline items",
    codeWillAppear: "Code will appear here...",
    shareCodeDesc: "Import this code on another device",
  },
}

export interface PDFFiles extends Record<Language, File | null> {}

export interface CustomOutlines {
  [key: string]: OutlineItem[]
}

export interface PDFSources {
  uz: string
  ru: string
  en: string
}

export function useLanguage() {
  const [language, setLanguage] = useState<Language>("uz")
  const [pdfFiles, setPdfFiles] = useState<PDFFiles>({
    uz: null,
    ru: null,
    en: null,
  })
  const [customOutlines, setCustomOutlines] = useState<CustomOutlines>({
    uz: [],
    ru: [],
    en: [],
  })
  const [pdfSources, setPdfSources] = useState<PDFSources>({
    uz: "",
    ru: "",
    en: "",
  })

  useEffect(() => {
    const savedLanguage = localStorage.getItem("pdf-reader-language") as Language
    if (savedLanguage && translations[savedLanguage]) {
      setLanguage(savedLanguage)
    }

    const savedOutlines = localStorage.getItem("pdf-reader-outlines")
    if (savedOutlines) {
      try {
        setCustomOutlines(JSON.parse(savedOutlines))
      } catch (error) {
        console.error("Error parsing saved outlines:", error)
      }
    }

    const savedSources = localStorage.getItem("pdf-reader-sources")
    if (savedSources) {
      try {
        setPdfSources(JSON.parse(savedSources))
      } catch (error) {
        console.error("Error parsing saved sources:", error)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("pdf-reader-sources", JSON.stringify(pdfSources))
  }, [pdfSources])

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage)
    localStorage.setItem("pdf-reader-language", newLanguage)
  }

  const updatePdfFile = (lang: Language, file: File | null) => {
    setPdfFiles((prev) => ({
      ...prev,
      [lang]: file,
    }))
  }

  const updateCustomOutline = (lang: Language, outline: OutlineItem[]) => {
    const newOutlines = {
      ...customOutlines,
      [lang]: outline,
    }
    setCustomOutlines(newOutlines)
    localStorage.setItem("pdf-reader-outlines", JSON.stringify(newOutlines))
  }

  const updatePdfSource = (sources: PDFSources) => {
    setPdfSources(sources)
  }

  return {
    language,
    changeLanguage,
    t: translations[language],
    pdfFiles,
    updatePdfFile,
    customOutlines,
    updateCustomOutline,
    pdfSources,
    updatePdfSource,
  }
}

export type { PDFSources }
