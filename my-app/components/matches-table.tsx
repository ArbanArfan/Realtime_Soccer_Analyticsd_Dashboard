"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { MatchData } from "@/app/page";
import { ArrowDown, ArrowUp } from "lucide-react";

interface MatchesTableProps {
  data: MatchData[];
  previousData?: MatchData[];
  getChangedValues: (current: MatchData, previous?: MatchData) => any;

  // comparison mode
  comparisonMode?: boolean;
  compareData?: MatchData[]; // table B
  compareLabels?: { a: string; b: string };
}

export function MatchesTable({
  data,
  previousData,
  getChangedValues,
  comparisonMode = false,
  compareData = [],
}: MatchesTableProps) {
  const getPreviousMatch = (currentMatch: MatchData) => {
    return previousData?.find((prev) => prev.row_id === currentMatch.row_id);
  };

  const isLiveMatch = (timeStatus: string) => {
    return !timeStatus.includes(":") && timeStatus !== "N/A";
  };

  // map B by row_id for quick lookup
  const compareMap = new Map(compareData.map((m) => [m.row_id, m]));

  const renderOddsCell = (
    value: string,
    type: "ah" | "ou",
    field: "home_odds" | "line" | "away_odds" | "over_odds" | "total_line" | "under_odds",
    match: MatchData
  ) => {
    if (!value || value === "" || value === "N/A") return "-";

    const previousMatch = getPreviousMatch(match);
    const changes = getChangedValues(match, previousMatch);
    const changeKey = `${type}_${field}`;
    const hasChanged = changes[changeKey] !== undefined;

    const colorClass = type === "ah" ? "text-red-600" : "text-blue-600";
    const bgClass = hasChanged ? "bg-yellow-100 border border-yellow-300" : "";

    const cell = <span className={`font-medium ${colorClass} ${bgClass} px-1 py-0.5 rounded`}>{value}</span>;

    if (hasChanged) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{cell}</TooltipTrigger>
          <TooltipContent>
            <p>Previous value was: {changes[changeKey]}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return cell;
  };

  // comparison helpers
  const parseNum = (v?: string) => {
    if (v == null) return NaN;
    const s = String(v).trim();
    const asNum = Number(s.replace(/[^\d.-]/g, ""));
    return Number.isFinite(asNum) ? asNum : NaN;
  };

  const to2 = (n: number) => {
    // force exactly two decimals for changes, as requested
    const r = Math.round(n * 100) / 100;
    return r.toFixed(2);
  };

  const diffBadge = (a?: string, b?: string) => {
    const aNum = parseNum(a);
    const bNum = parseNum(b);
    if (!Number.isFinite(aNum) || !Number.isFinite(bNum)) return <span className="text-slate-400">—</span>;
    const d = bNum - aNum;
    if (d === 0) return <span className="text-slate-500">0.00</span>;
    const up = d > 0;
    return (
      <span className={`inline-flex items-center gap-1 font-semibold ${up ? "text-green-600" : "text-red-600"}`}>
        {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {up ? `+${to2(d)}` : `${to2(d)}`}
      </span>
    );
  };

  const renderComparisonCell = (
    aVal?: string,
    bVal?: string,
    type?: "ah" | "ou",
    field?: "home_odds" | "line" | "away_odds" | "over_odds" | "total_line" | "under_odds"
  ) => {
    const showDelta = type && field; // only compute delta for odds, not score/time
    return (
      <div className="flex flex-col items-center gap-0.5 leading-tight">
        <div className="text-slate-900 font-medium">{aVal && aVal !== "N/A" ? aVal : "-"}</div>
        <div className="text-purple-700 font-semibold">{bVal && bVal !== "N/A" ? bVal : "-"}</div>
        <div className="text-xs">{showDelta ? diffBadge(aVal, bVal) : <span className="text-slate-400">—</span>}</div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left p-3 font-semibold text-slate-700 min-w-[120px]">Competition</th>
              <th className="text-left p-3 font-semibold text-slate-700 min-w-[100px]">Time/Status</th>
              <th className="text-left p-3 font-semibold text-slate-700 min-w-[160px]">Home Team</th>
              <th className="text-center p-3 font-semibold text-slate-700 min-w-[80px]">Score</th>
              <th className="text-left p-3 font-semibold text-slate-700 min-w-[160px]">Away Team</th>
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
              const isLive = isLiveMatch(match.time_or_status);
              const b = comparisonMode ? compareMap.get(match.row_id) : undefined;

              return (
                <tr
                  key={match.row_id}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-25"
                  }`}
                >
                  {/* Competition */}
                  <td className="p-3 align-top">
                    <Badge variant="outline" className="text-xs font-medium">
                      {match.competition}
                    </Badge>
                  </td>

                  {/* Time/Status — in comparison show A and purple B, then a dash (no delta) */}
                  <td className="p-3 align-top">
                    {!comparisonMode ? (
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          isLive
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {match.time_or_status}
                      </span>
                    ) : (
                      <div className="flex flex-col gap-0.5 leading-tight">
                        <span
                          className={`px-2 py-1 rounded text-sm font-medium ${
                            isLive
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {match.time_or_status}
                        </span>
                        <span className="px-2 py-1 rounded text-sm font-semibold text-purple-700 bg-purple-50 border border-purple-200">
                          {b ? b.time_or_status : "-"}
                        </span>
                        <span className="text-xs text-slate-400 text-center">—</span>
                      </div>
                    )}
                  </td>

                  {/* Home Team — DO NOT repeat in purple */}
                  <td className="p-3 align-top font-medium text-slate-900">{match.home_team}</td>

                  {/* Score — show A, purple B, no delta */}
                  <td className="p-3 align-top text-center">
                    {!comparisonMode ? (
                      match.score ? (
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
                          {match.score}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )
                    ) : (
                      renderComparisonCell(match.score, b?.score)
                    )}
                  </td>

                  {/* Away Team — DO NOT repeat in purple */}
                  <td className="p-3 align-top font-medium text-slate-900">{match.away_team}</td>

                  {/* AH Home */}
                  <td className="p-3 align-top text-center">
                    {!comparisonMode
                      ? renderOddsCell(match.odds.ah.home_odds, "ah", "home_odds", match)
                      : renderComparisonCell(match.odds.ah.home_odds, b?.odds.ah.home_odds, "ah", "home_odds")}
                  </td>

                  {/* AH Line */}
                  <td className="p-3 align-top text-center">
                    {!comparisonMode
                      ? renderOddsCell(match.odds.ah.line, "ah", "line", match)
                      : renderComparisonCell(match.odds.ah.line, b?.odds.ah.line, "ah", "line")}
                  </td>

                  {/* AH Away */}
                  <td className="p-3 align-top text-center">
                    {!comparisonMode
                      ? renderOddsCell(match.odds.ah.away_odds, "ah", "away_odds", match)
                      : renderComparisonCell(match.odds.ah.away_odds, b?.odds.ah.away_odds, "ah", "away_odds")}
                  </td>

                  {/* OU Over */}
                  <td className="p-3 align-top text-center">
                    {!comparisonMode
                      ? renderOddsCell(match.odds.ou.over_odds, "ou", "over_odds", match)
                      : renderComparisonCell(match.odds.ou.over_odds, b?.odds.ou.over_odds, "ou", "over_odds")}
                  </td>

                  {/* OU Total */}
                  <td className="p-3 align-top text-center">
                    {!comparisonMode
                      ? renderOddsCell(match.odds.ou.total_line, "ou", "total_line", match)
                      : renderComparisonCell(match.odds.ou.total_line, b?.odds.ou.total_line, "ou", "total_line")}
                  </td>

                  {/* OU Under */}
                  <td className="p-3 align-top text-center">
                    {!comparisonMode
                      ? renderOddsCell(match.odds.ou.under_odds, "ou", "under_odds", match)
                      : renderComparisonCell(match.odds.ou.under_odds, b?.odds.ou.under_odds, "ou", "under_odds")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {data.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No matches found matching your criteria
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
