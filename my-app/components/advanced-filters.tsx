"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import type { MatchData } from "@/app/page"

interface AdvancedFiltersProps {
  data: MatchData[]
  filters: any
  onFiltersChange: (filters: any) => void
}

export function AdvancedFilters({ data, filters, onFiltersChange }: AdvancedFiltersProps) {
  const [competitionInput, setCompetitionInput] = useState("")

  const competitions = Array.from(new Set(data.map((match) => match.competition))).sort()

  const addCompetitionFilter = () => {
    if (competitionInput.trim()) {
      const currentCompetitions = filters.competition || []
      if (!currentCompetitions.includes(competitionInput.trim())) {
        onFiltersChange({
          ...filters,
          competition: [...currentCompetitions, competitionInput.trim()],
        })
      }
      setCompetitionInput("")
    }
  }

  const removeCompetitionFilter = (comp: string) => {
    const currentCompetitions = filters.competition || []
    onFiltersChange({
      ...filters,
      competition: currentCompetitions.filter((c: string) => c !== comp),
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addCompetitionFilter()
    }
  }

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Advanced Filters</h3>
        {filters.competition?.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            Clear All
          </Button>
        )}
      </div>

      {/* Competition Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Filter by Competition</label>
        <div className="flex gap-2">
          <Input
            placeholder="Enter competition name..."
            value={competitionInput}
            onChange={(e) => setCompetitionInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={addCompetitionFilter} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Selected Competitions */}
        {filters.competition?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {filters.competition.map((comp: string) => (
              <Badge key={comp} variant="secondary" className="flex items-center gap-1">
                {comp}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-600"
                  onClick={() => removeCompetitionFilter(comp)}
                />
              </Badge>
            ))}
          </div>
        )}

        {/* Competition Suggestions */}
        {competitionInput && (
          <div className="max-h-32 overflow-y-auto border rounded bg-white">
            {competitions
              .filter((comp) => comp.toLowerCase().includes(competitionInput.toLowerCase()))
              .slice(0, 10)
              .map((comp) => (
                <div
                  key={comp}
                  className="p-2 hover:bg-slate-100 cursor-pointer text-sm"
                  onClick={() => {
                    setCompetitionInput(comp)
                    addCompetitionFilter()
                  }}
                >
                  {comp}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
