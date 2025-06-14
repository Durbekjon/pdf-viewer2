// PDF API bilan ishlash uchun funksiyalar

export interface PublicationRecord {
  id: string
  title: string
  publishedAt: string
  viewCount: number
  createdAt: string
  updatedAt: string
  language: string
  pdfFiles: {
    id: string
    name: string
    type: string
    size: number
    isChunked: boolean
    totalChunks: number | null
    createdAt: string
    publicationId: string
    file: string
    language: string
  }[]
  outlines: {
    id: string
    title: string
    page: number
    createdAt: string
    updatedAt: string
    publicationId: string
    parentId: string | null
  }[]
}

export interface OutlineItem {
  id: string
  title: string
  page: number
  parentId: string | null
  language: string
  createdAt: string
  updatedAt: string
  children?: OutlineItem[]
}

export interface CreateOutlineDto {
  title: string
  page: number
  parentId?: string | null
  language?: string
  children?: CreateOutlineDto[]
}

export interface UpdateOutlineDto {
  title?: string
  page?: number
  parentId?: string | null
}

export type CustomOutlines = Record<string, CreateOutlineDto[]>

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

// Backend server holatini tekshirish
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    return response.ok
  } catch (error) {
    console.error("Backend server bilan bog'lanishda xatolik:", error)
    return false
  }
}

// Barcha nashrlarni olish
export async function getAllPublications(): Promise<PublicationRecord[]> {
  try {
    // Avval backend holatini tekshirish
    const isHealthy = await checkBackendHealth()
    if (!isHealthy) {
      throw new Error("Backend server ishlamayapti. Iltimos, serverni ishga tushiring.")
    }

    const response = await fetch(`${API_URL}/publications`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return [] // Hali nashrlar yo'q
      }
      throw new Error(`Server xatoligi: ${response.status} ${response.statusText}`)
    }

    const {data} = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error("Nashrlarni yuklashda xatolik:", error)

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Backend server bilan bog'lanib bo'lmadi. Server ishga tushirilganligini tekshiring.")
    }

    throw error
  }
}

// ID bo'yicha nashrni olish
export async function getPublication(id: string): Promise<PublicationRecord> {
  try {
    const response = await fetch(`${API_URL}/publications/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Bu nashr topilmadi yoki o'chirilgan")
      }
      throw new Error(`Server xatoligi: ${response.status} ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    console.error("Nashrni yuklashda xatolik:", error)

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Backend server bilan bog'lanib bo'lmadi")
    }

    throw error
  }
}

// Yangi nashr yaratish
export async function createPublication(data: {
  title: string
  publishedAt: Date
  pdfFiles: Record<string, File>
  customOutlines: CustomOutlines
}): Promise<PublicationRecord> {
  try {
    console.log('customOutlines', data.customOutlines)
    // First create the publication
    const publicationData = {
      title: data.title.trim(),
      publishedAt: data.publishedAt.toISOString(),
      language: "uz", // Default language
    }

    const createResponse = await fetch(`${API_URL}/publications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(publicationData),
    })

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({ detail: "Noma'lum xatolik" }))
      throw new Error(errorData.detail || `Server xatoligi: ${createResponse.status}`)
    }

    const createdPublication = await createResponse.json()
    console.log('Created publication:', createdPublication)

    // Then upload files one by one
    const fileEntries = Object.entries(data.pdfFiles).filter(([_, file]) => file !== null)
    
    for (const [lang, file] of fileEntries) {
      const fileFormData = new FormData()
      fileFormData.append('file', file)
      fileFormData.append('language', lang)
      
      const uploadResponse = await fetch(`${API_URL}/publications/${createdPublication.id}/pdf-files`, {
        method: 'POST',
        body: fileFormData,
      })

      if (!uploadResponse.ok) {
        throw new Error(`File upload failed for ${lang}: ${uploadResponse.statusText}`)
      }

      console.log(`Uploaded file for ${lang}`)
    }

    // Create outlines for each language
    const outlineEntries = Object.entries(data.customOutlines).filter(([_, outlines]) => outlines && outlines.length > 0)
    for (const [lang, outlines] of outlineEntries) {
      // Create a map to store parent-child relationships
      const outlineMap = new Map<string, { outline: CreateOutlineDto, id: string }>()
      const rootOutlines: { outline: CreateOutlineDto, id: string }[] = []

      // First pass: create map of all outlines
      outlines.forEach(outline => {
        const id = crypto.randomUUID()
        outlineMap.set(id, { outline: { ...outline, language: lang }, id })
      })

      // Second pass: organize outlines into hierarchy
      outlineMap.forEach(({ outline, id }, _) => {
        if (outline.parentId && outlineMap.has(outline.parentId)) {
          const parent = outlineMap.get(outline.parentId)!
          if (!parent.outline.children) {
            parent.outline.children = []
          }
          parent.outline.children.push(outline)
        } else {
          rootOutlines.push({ outline, id })
        }
      })

      // Create outlines in hierarchical order
      const createOutlineRecursively = async (outlineData: { outline: CreateOutlineDto, id: string }, parentId: string | null = null) => {
        const createdOutline = await createOutline(createdPublication.id, {
          title: outlineData.outline.title,
          page: outlineData.outline.page,
          parentId: parentId,
          language: lang
        })

        if (outlineData.outline.children) {
          for (const child of outlineData.outline.children) {
            const childId = crypto.randomUUID()
            await createOutlineRecursively({ outline: child, id: childId }, createdOutline.id)
          }
        }

        return createdOutline
      }

      // Create all root outlines and their children
      for (const outlineData of rootOutlines) {
        await createOutlineRecursively(outlineData)
      }

      console.log(`Created outlines for ${lang}`)
    }

    // Get the final publication with all files and outlines
    const finalResponse = await fetch(`${API_URL}/publications/${createdPublication.id}`)
    if (!finalResponse.ok) {
      throw new Error(`Failed to get final publication: ${finalResponse.statusText}`)
    }

    return finalResponse.json()
  } catch (error) {
    console.error("Nashr yaratishda xatolik:", error)

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Backend server bilan bog'lanib bo'lmadi")
    }

    throw error
  }
}

// Ko'rishlar sonini oshirish
export async function incrementViewCount(id: string): Promise<PublicationRecord> {
  try {
    const response = await fetch(`${API_URL}/publications/${id}/increment-view`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Ko'rishlar sonini yangilashda xatolik: ${response.status}`)
    }

    return response.json()
  } catch (error) {
    console.error("Ko'rishlar sonini yangilashda xatolik:", error)
    throw error
  }
}

// Nashrni o'chirish
export async function deletePublication(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/publications/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Nashrni o'chirishda xatolik: ${response.status}`)
    }
  } catch (error) {
    console.error("Nashrni o'chirishda xatolik:", error)

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Backend server bilan bog'lanib bo'lmadi")
    }

    throw error
  }
}

// ================= PDF FILES =================

// Upload a PDF file
export async function uploadPdfFile(publicationId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_URL}/publications/${publicationId}/pdf-files`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`PDF file upload failed: ${response.status}`);
  }
  return response.json();
}

// Upload a PDF chunk
export async function uploadPdfChunk(publicationId: string, pdfId: string, chunkIndex: number, chunk: Blob) {
  const formData = new FormData();
  formData.append("chunk", chunk);
  formData.append("chunk_index", String(chunkIndex));
  const response = await fetch(`${API_URL}/publications/${publicationId}/pdf-files/${pdfId}/chunks`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`PDF chunk upload failed: ${response.status}`);
  }
  return response.json();
}

// Get a PDF file
export async function getPdfFile(publicationId: string, pdfId: string) {
  const response = await fetch(`${API_URL}/publications/${publicationId}/pdf-files/${pdfId}`);
  if (!response.ok) {
    throw new Error(`Failed to get PDF file: ${response.status}`);
  }
  return response.json();
}

// Delete a PDF file
export async function deletePdfFile(publicationId: string, pdfId: string) {
  const response = await fetch(`${API_URL}/publications/${publicationId}/pdf-files/${pdfId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete PDF file: ${response.status}`);
  }
  return response.json();
}

// ================= OUTLINES =================

// Create a new outline
export async function createOutline(publicationId: string, data: CreateOutlineDto): Promise<OutlineItem> {
  const response = await fetch(`${API_URL}/publications/${publicationId}/outlines`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Noma'lum xatolik" }))
    throw new Error(errorData.detail || `Server xatoligi: ${response.status}`)
  }

  return response.json()
}

// Get all outlines for a publication
export async function getOutlines(publicationId: string): Promise<OutlineItem[]> {
  try {
    const response = await fetch(`${API_URL}/publications/${publicationId}/outlines`)
    if (!response.ok) {
      throw new Error(`Server xatoligi: ${response.status}`)
    }
    const { data } = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error("Mundarijani olishda xatolik:", error)
    throw error
  }
}

// Get an outline by id
export async function getOutline(publicationId: string, outlineId: string) {
  const response = await fetch(`${API_URL}/publications/${publicationId}/outlines/${outlineId}`);
  if (!response.ok) {
    throw new Error(`Failed to get outline: ${response.status}`);
  }
  return response.json();
}

// Update an outline
export async function updateOutline(publicationId: string, outlineId: string, data: UpdateOutlineDto): Promise<OutlineItem> {
  const response = await fetch(`${API_URL}/publications/${publicationId}/outlines/${outlineId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update outline: ${response.status}`);
  }
  return response.json();
}

// Delete an outline
export async function deleteOutline(publicationId: string, outlineId: string) {
  const response = await fetch(`${API_URL}/publications/${publicationId}/outlines/${outlineId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete outline: ${response.status}`);
  }
  return response.json();
}

export function getFileUrl(filePath: string): string {
  return `${API_URL}/${filePath}`
}

export async function getPublications(): Promise<PublicationRecord[]> {
  try {
    const response = await fetch(`${API_URL}/publications`)
    if (!response.ok) {
      throw new Error(`Server xatoligi: ${response.status}`)
    }
    const { data } = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error("Nashrlarni olishda xatolik:", error)
    throw error
  }
}
