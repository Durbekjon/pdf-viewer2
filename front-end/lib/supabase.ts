import { createClient } from "@supabase/supabase-js"

// Supabase konfiguratsiyasi
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key"

export const supabase = createClient(supabaseUrl, supabaseKey)

// PDF nashrlar uchun interface
export interface PublicationRecord {
  id: string
  title: string
  published_at: string
  pdf_files: any
  custom_outlines: any
  view_count: number
  created_at?: string
  updated_at?: string
}

// Nashr yaratish
export async function createPublication(data: Omit<PublicationRecord, "created_at" | "updated_at">) {
  const { data: result, error } = await supabase
    .from("publications")
    .insert([
      {
        id: data.id,
        title: data.title,
        published_at: data.published_at,
        pdf_files: data.pdf_files,
        custom_outlines: data.custom_outlines,
        view_count: data.view_count,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("Supabase create error:", error)
    throw error
  }

  return result
}

// Nashrni olish
export async function getPublication(id: string): Promise<PublicationRecord | null> {
  const { data, error } = await supabase.from("publications").select("*").eq("id", id).single()

  if (error) {
    if (error.code === "PGRST116") {
      // Record not found
      return null
    }
    console.error("Supabase get error:", error)
    throw error
  }

  return data
}

// Ko'rishlar sonini oshirish
export async function incrementViewCount(id: string) {
  const { error } = await supabase
    .from("publications")
    .update({
      view_count: supabase.sql`view_count + 1`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("Supabase increment error:", error)
    throw error
  }
}

// Barcha nashrlarni olish (admin uchun)
export async function getAllPublications(): Promise<PublicationRecord[]> {
  const { data, error } = await supabase.from("publications").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Supabase getAll error:", error)
    throw error
  }

  return data || []
}

// Nashrni o'chirish
export async function deletePublication(id: string) {
  const { error } = await supabase.from("publications").delete().eq("id", id)

  if (error) {
    console.error("Supabase delete error:", error)
    throw error
  }
}
