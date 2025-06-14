"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Save, X, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { Language, OutlineItem } from "../hooks/useLanguage"

interface OutlineEditorProps {
  language: Language
  outline: OutlineItem[]
  onSave: (outline: OutlineItem[]) => void
  translations: any
  maxPages: number
}

const languageInfo = {
  uz: { name: "O'zbekcha", flag: "🇺🇿" },
  ru: { name: "Русский", flag: "🇷🇺" },
  en: { name: "English", flag: "🇺🇸" },
}

export function OutlineEditor({ language, outline, onSave, translations, maxPages }: OutlineEditorProps) {
  const [open, setOpen] = useState(false)
  const [editingOutline, setEditingOutline] = useState<OutlineItem[]>([])
  const [editingItem, setEditingItem] = useState<{ index: number; item: OutlineItem } | null>(null)
  const [newItem, setNewItem] = useState<{ title: string; page: string }>({ title: "", page: "" })

  // Initialize editingOutline when the dialog opens
  useEffect(() => {
    if (open) {
      setEditingOutline([...outline])
    }
  }, [open, outline])

  const handleOpen = () => {
    setEditingOutline([...outline])
    setOpen(true)
  }

  const handleSave = () => {
    console.log("Saving outline:", editingOutline)
    onSave(editingOutline)
    setOpen(false)
    setEditingItem(null)
  }

  const handleCancel = () => {
    setEditingOutline([...outline])
    setEditingItem(null)
    setOpen(false)
  }

  const addNewItem = () => {
    console.log('Attempting to add new item:', newItem)
    if (newItem.title.trim() && newItem.page.trim()) {
      const pageNum = Number.parseInt(newItem.page)
      if (pageNum > 0 && pageNum <= maxPages) {
        const item: OutlineItem = {
          id: crypto.randomUUID(),
          title: newItem.title.trim(),
          page: pageNum,
          parentId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          children: []
        }
        const updatedOutline = [...editingOutline, item]
        setEditingOutline(updatedOutline)
        setNewItem({ title: "", page: "" })
        console.log('Added item. New editingOutline:', updatedOutline)
      } else {
        console.log('Page number out of range:', pageNum)
      }
    } else {
      console.log('Title or page is empty:', newItem)
    }
  }

  const editItem = (index: number) => {
    setEditingItem({ index, item: { ...editingOutline[index] } })
  }

  const saveEditingItem = () => {
    if (editingItem && editingItem.item.title.trim()) {
      const pageNum = editingItem.item.page
      if (pageNum > 0 && pageNum <= maxPages) {
        const newOutline = [...editingOutline]
        newOutline[editingItem.index] = {
          ...editingItem.item,
          updatedAt: new Date().toISOString()
        }
        setEditingOutline(newOutline)
        setEditingItem(null)
      }
    }
  }

  const deleteItem = (index: number) => {
    const newOutline = editingOutline.filter((_, i) => i !== index)
    setEditingOutline(newOutline)
  }

  const moveItem = (index: number, direction: "up" | "down") => {
    if ((direction === "up" && index > 0) || (direction === "down" && index < editingOutline.length - 1)) {
      const newOutline = [...editingOutline]
      const targetIndex = direction === "up" ? index - 1 : index + 1
      ;[newOutline[index], newOutline[targetIndex]] = [newOutline[targetIndex], newOutline[index]]
      setEditingOutline(newOutline)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleOpen} className="flex items-center gap-2">
          <Edit className="w-4 h-4" />
          <span className="hidden sm:inline">{translations.editOutline}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            {translations.editOutline} - {languageInfo[language].flag} {languageInfo[language].name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{translations.outlineEditDescription}</p>
            <Badge variant="secondary">
              {editingOutline.length} {translations.items}
            </Badge>
          </div>

          {/* Add New Item */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {translations.addNewItem}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="new-title" className="text-xs">
                    {translations.title}
                  </Label>
                  <Input
                    id="new-title"
                    placeholder={translations.titlePlaceholder}
                    value={newItem.title}
                    onChange={(e) => {
                      console.log('Title input changed:', e.target.value)
                      setNewItem((prev) => ({ ...prev, title: e.target.value }))
                    }}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="new-page" className="text-xs">
                    {translations.page}
                  </Label>
                  <div className="flex gap-1">
                    <Input
                      id="new-page"
                      type="number"
                      min="1"
                      max={maxPages}
                      placeholder="1"
                      value={newItem.page}
                      onChange={(e) => {
                        console.log('Page input changed:', e.target.value)
                        setNewItem((prev) => ({ ...prev, page: e.target.value }))
                      }}
                      className="h-8"
                    />
                    <Button size="sm" onClick={addNewItem} disabled={!newItem.title.trim() || !newItem.page.trim()}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outline Items */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {editingOutline.map((item, index) => (
                <Card key={item.id || index} className="p-3">
                  {editingItem?.index === index ? (
                    // Editing mode
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <Input
                            value={editingItem.item.title}
                            onChange={(e) =>
                              setEditingItem((prev) =>
                                prev ? { ...prev, item: { ...prev.item, title: e.target.value } } : null,
                              )
                            }
                            className="h-8"
                          />
                        </div>
                        <Input
                          type="number"
                          min="1"
                          max={maxPages}
                          value={editingItem.item.page}
                          onChange={(e) =>
                            setEditingItem((prev) =>
                              prev
                                ? { ...prev, item: { ...prev.item, page: Number.parseInt(e.target.value) || 1 } }
                                : null,
                            )
                          }
                          className="h-8"
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={saveEditingItem}>
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm truncate">{item.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.page}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => moveItem(index, "up")} disabled={index === 0}>
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveItem(index, "down")}
                          disabled={index === editingOutline.length - 1}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => editItem(index)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteItem(index)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}

              {editingOutline.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{translations.noOutlineItems}</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
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

// ChevronUp component (missing from lucide-react in some versions)
const ChevronUp = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
)
