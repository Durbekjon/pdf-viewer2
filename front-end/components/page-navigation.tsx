"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface PageNavigationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  translations: any
}

export function PageNavigation({ currentPage, totalPages, onPageChange, translations }: PageNavigationProps) {
  const [inputPage, setInputPage] = useState<string>(currentPage.toString())

  useEffect(() => {
    setInputPage(currentPage.toString())
  }, [currentPage])

  const handleInputChange = (value: string) => {
    setInputPage(value)
  }

  const handleInputSubmit = () => {
    const pageNum = Number.parseInt(inputPage)
    if (pageNum && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum)
    } else {
      setInputPage(currentPage.toString())
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInputSubmit()
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  return (
    <div className="flex items-center gap-1 border rounded-md p-1">
      <Button variant="ghost" size="sm" onClick={goToPrevPage} disabled={currentPage <= 1}>
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-1 px-1">
        <Input
          type="number"
          min="1"
          max={totalPages}
          value={inputPage}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleInputSubmit}
          onKeyPress={handleKeyPress}
          className="w-16 h-7 text-center text-xs border-0 bg-transparent focus:bg-background focus:border"
        />
        <span className="text-xs text-muted-foreground">
          {translations.of} {totalPages}
        </span>
      </div>

      <Button variant="ghost" size="sm" onClick={goToNextPage} disabled={currentPage >= totalPages}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
}
