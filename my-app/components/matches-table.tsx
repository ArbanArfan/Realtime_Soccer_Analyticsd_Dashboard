"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import type { MatchData } from "@/app/page"

interface MatchesTableProps {
  data: MatchData[]
  previousData?: MatchData[]
  getChangedValues: (current: MatchData, previous?: MatchData) => any
}

export function MatchesTable({ data, previousData, getChangedValues }: MatchesTableProps) {
  const getPreviousMatch = (currentMatch: MatchData) => {
    return previousData?.find((prev) => prev.row_id === currentMatch.row_id)
  }

  const isLiveMatch = (timeStatus: string) => {
    return !timeStatus.includes(":") && timeStatus !== "N/A"
  }

  const renderOddsCell = (value: string, type: "ah" | "ou", field: string, match: MatchData) => {
    if (!value || value === "" || value === "N/A") return "-"

    const previousMatch = getPreviousMatch(match)
    const changes = getChangedValues(match, previousMatch)
    const changeKey = `${type}_${field}`
    const hasChanged = changes[changeKey] !== undefined

    const colorClass = type === "ah" ? "text-red-600" : "text-blue-600"
    const bgClass = hasChanged ? "bg-yellow-100 border border-yellow-300" : ""

    const cell = <span className={`font-medium ${colorClass} ${bgClass} px-1 py-0.5 rounded`}>{value}</span>

    if (hasChanged) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{cell}</TooltipTrigger>
          <TooltipContent>
            <p>Previous value was: {changes[changeKey]}</p>
          </TooltipContent>
        </Tooltip>
      )
    }

    return cell
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left p-3 font-semibold text-slate-700 min-w-[100px]">Competition</th>
              <th className="text-left p-3 font-semibold text-slate-700 min-w-[100px]">Time/Status</th>
              <th className="text-left p-3 font-semibold text-slate-700 min-w-[150px]">Home Team</th>
              <th className="text-center p-3 font-semibold text-slate-700 min-w-[80px]">Score</th>
              <th className="text-left p-3 font-semibold text-slate-700 min-w-[150px]">Away Team</th>
              <th className="text-center p-3 font-semibold text-red-600 min-w-[120px]" colSpan={3}>
                Asian Handicap
              </th>
              <th className="text-center p-3 font-semibold text-blue-600 min-w-[120px]" colSpan={3}>
                Over/Under
              </th>
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th></th>
              <th></th>
              <th></th>
              <th></th>
              <th></th>
              <th className="text-center p-2 text-sm font-medium text-red-600">Home</th>
              <th className="text-center p-2 text-sm font-medium text-red-600">Line</th>
              <th className="text-center p-2 text-sm font-medium text-red-600">Away</th>
              <th className="text-center p-2 text-sm font-medium text-blue-600">Over</th>
              <th className="text-center p-2 text-sm font-medium text-blue-600">Total</th>
              <th className="text-center p-2 text-sm font-medium text-blue-600">Under</th>
            </tr>
          </thead>
          <tbody>
            {data.map((match, index) => {
              const isLive = isLiveMatch(match.time_or_status)

              return (
                <tr
                  key={match.row_id}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-25"
                  }`}
                >
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs font-medium">
                      {match.competition}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        isLive ? "bg-green-100 text-green-800 border border-green-200" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {match.time_or_status}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-slate-900">{match.home_team}</td>
                  <td className="p-3 text-center">
                    {match.score ? (
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">{match.score}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-3 font-medium text-slate-900">{match.away_team}</td>

                  {/* Asian Handicap */}
                  <td className="p-3 text-center">
                    {renderOddsCell(match.odds.ah.home_odds, "ah", "home_odds", match)}
                  </td>
                  <td className="p-3 text-center">{renderOddsCell(match.odds.ah.line, "ah", "line", match)}</td>
                  <td className="p-3 text-center">
                    {renderOddsCell(match.odds.ah.away_odds, "ah", "away_odds", match)}
                  </td>

                  {/* Over/Under */}
                  <td className="p-3 text-center">
                    {renderOddsCell(match.odds.ou.over_odds, "ou", "over_odds", match)}
                  </td>
                  <td className="p-3 text-center">
                    {renderOddsCell(match.odds.ou.total_line, "ou", "total_line", match)}
                  </td>
                  <td className="p-3 text-center">
                    {renderOddsCell(match.odds.ou.under_odds, "ou", "under_odds", match)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {data.length === 0 && (
          <div className="text-center py-8 text-slate-500">No matches found matching your criteria</div>
        )}
      </div>
    </TooltipProvider>
  )
}
