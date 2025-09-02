"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  RefreshCw,
  Plus,
  Search as SearchIcon,
  Filter,
  Eye,
  EyeOff,
  Columns2,
  ArrowRightLeft,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";

import { LoadingAnimation } from "@/components/loading-animation";
import { MatchesTable } from "@/components/matches-table";
import { TableManager } from "@/components/table-manager";

/* ────────────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────────────── */
export interface MatchData {
  competition: string;
  time_or_status: string;
  home_team: string;
  score: string;
  away_team: string;
  odds: {
    ah: { home_odds: string; line: string; away_odds: string };
    ou: { over_odds: string; total_line: string; under_odds: string };
  };
  row_id: string;
  data_league: string;
  data_index: string;
}

export interface TableData {
  _id: string;
  scraped_at_cst: string;
  data: MatchData[];
}

type SearchScope = "both" | "competition" | "team";

const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000";

export default function BongdanetDataPage() {
  /* ── core state */
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);
  const [showLiveOnly, setShowLiveOnly] = useState(false);

  /* ── UI state */
  const [isLoading, setIsLoading] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);

  /* ── Index Table toggle */
  const [showIndexView, setShowIndexView] = useState(false);

  /* ── Multi-term search + scope dropdown */
  const [searchTokens, setSearchTokens] = useState<string[]>([]);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("both");

  /* ── Comparison mode */
  const [comparisonOn, setComparisonOn] = useState(false);

  // Table A selection: allow "index" OR a real table index ("0", "1", ...)
  const [compareAValue, setCompareAValue] = useState<string>("0"); // default current table
  const compareAIsIndex = compareAValue === "index";
  const compareAIndex = compareAIsIndex ? -1 : Number(compareAValue);

  // Table B selection: always a real table index (number)
  const [compareBIndex, setCompareBIndex] = useState<number | null>(null);

  const fetchTables = useCallback(async () => {
    const resp = await axios.get(`${BACKEND_API_URL}/data`);
    setTables(
      (resp.data || []).map((d: any) => ({
        ...d,
        data: Array.isArray(d.data) ? d.data.flat() : [],
      }))
    );
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        await fetchTables();
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [fetchTables]);

  const currentTable = tables[selectedTableIndex];
  const previousTable =
    selectedTableIndex > 0 ? tables[selectedTableIndex - 1] : null;

  /* ────────────────────────────────────────────────────────────────────────────
     Helper for MatchesTable (unchanged logic)
     ──────────────────────────────────────────────────────────────────────────── */
  const getChangedValues = (current: MatchData, previous?: MatchData) => {
    const changes: Record<string, string | undefined> = {};
    if (!previous) return changes;

    // AH
    if (current.odds.ah.home_odds !== previous.odds.ah.home_odds) {
      changes["ah_home_odds"] = previous.odds.ah.home_odds;
    }
    if (current.odds.ah.line !== previous.odds.ah.line) {
      changes["ah_line"] = previous.odds.ah.line;
    }
    if (current.odds.ah.away_odds !== previous.odds.ah.away_odds) {
      changes["ah_away_odds"] = previous.odds.ah.away_odds;
    }

    // OU
    if (current.odds.ou.over_odds !== previous.odds.ou.over_odds) {
      changes["ou_over_odds"] = previous.odds.ou.over_odds;
    }
    if (current.odds.ou.total_line !== previous.odds.ou.total_line) {
      changes["ou_total_line"] = previous.odds.ou.total_line;
    }
    if (current.odds.ou.under_odds !== previous.odds.ou.under_odds) {
      changes["ou_under_odds"] = previous.odds.ou.under_odds;
    }
    return changes;
  };

  /* ────────────────────────────────────────────────────────────────────────────
     Index Table (latest wins per row_id), with ":" in time/status AND any odds
     ──────────────────────────────────────────────────────────────────────────── */
  const indexTableData: MatchData[] = useMemo(() => {
    if (!tables?.length) return [];
    const seen = new Set<string>();
    const out: MatchData[] = [];

    // newest→oldest
    for (let ti = tables.length - 1; ti >= 0; ti--) {
      const t = tables[ti];
      if (!t?.data?.length) continue;

      for (const m of t.data) {
        const hasColon = m.time_or_status?.includes(":");
        const hasAnyOdds =
          (m?.odds?.ah?.home_odds && m.odds.ah.home_odds !== "" && m.odds.ah.home_odds !== "N/A") ||
          (m?.odds?.ah?.away_odds && m.odds.ah.away_odds !== "" && m.odds.ah.away_odds !== "N/A") ||
          (m?.odds?.ah?.line && m.odds.ah.line !== "" && m.odds.ah.line !== "N/A") ||
          (m?.odds?.ou?.over_odds && m.odds.ou.over_odds !== "" && m.odds.ou.over_odds !== "N/A") ||
          (m?.odds?.ou?.under_odds && m.odds.ou.under_odds !== "" && m.odds.ou.under_odds !== "N/A") ||
          (m?.odds?.ou?.total_line && m.odds.ou.total_line !== "" && m.odds.ou.total_line !== "N/A");

        if (!hasColon || !hasAnyOdds) continue;

        if (!seen.has(m.row_id)) {
          seen.add(m.row_id);
          out.push(m);
        }
      }
    }

    return out;
  }, [tables]);

  // Base dataset selector (Index vs Current)
  const baseData: MatchData[] = showIndexView
    ? indexTableData
    : (currentTable?.data || []);

  /* ────────────────────────────────────────────────────────────────────────────
     Search tokens + dropdown (put on the SAME line for UX)
     ──────────────────────────────────────────────────────────────────────────── */
  const addToken = useCallback(
    (raw: string) => {
      const t = raw.trim().toLowerCase();
      if (!t) return;
      setSearchTokens((prev) => (prev.includes(t) ? prev : [...prev, t]));
    },
    [setSearchTokens]
  );

  const removeToken = (t: string) =>
    setSearchTokens((prev) => prev.filter((x) => x !== t));

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addToken(searchDraft);
      setSearchDraft("");
    }
  };

  /* ────────────────────────────────────────────────────────────────────────────
     Comparison: availability, options and pairs
     ──────────────────────────────────────────────────────────────────────────── */
  // comparison is allowed if we have at least ONE table (Index vs Table) or ≥2 tables (Table vs Table)
  const canToggleComparison = tables.length >= 1;

  // keep A in sync with current selection by default
  useEffect(() => {
    setCompareAValue(selectedTableIndex.toString());
  }, [selectedTableIndex]);

  // tables available for B:
  // - if A is "index": all real tables are allowed
  // - if A is a real table i: only tables with index > i (higher precedence)
  const higherTablesForB = useMemo(() => {
    if (!tables.length) return [];
    if (compareAIsIndex) {
      return tables.map((t, i) => ({ t, i })); // all tables
    }
    return tables
      .map((t, i) => ({ t, i }))
      .filter(({ i }) => i > compareAIndex);
  }, [tables, compareAIsIndex, compareAIndex]);

  // default B to first allowed
  useEffect(() => {
    const first = higherTablesForB[0]?.i;
    setCompareBIndex(first != null ? first : null);
  }, [higherTablesForB]);

  // Build aligned pairs (only rows present in both A and B)
  const compareBase: MatchData[] = compareAIsIndex
    ? indexTableData
    : tables[compareAIndex]?.data || [];
  const compareAgainst: MatchData[] =
    compareBIndex != null ? tables[compareBIndex]?.data || [] : [];

  const comparisonPairs = useMemo(() => {
    if (!comparisonOn || compareBIndex == null) return [];
    const byIdB = new Map(compareAgainst.map((m) => [m.row_id, m]));
    return compareBase
      .filter((m) => byIdB.has(m.row_id))
      .map((m) => ({ a: m, b: byIdB.get(m.row_id)! }));
  }, [comparisonOn, compareAgainst, compareBIndex, compareBase]);

  /* ────────────────────────────────────────────────────────────────────────────
     Filtering (odds, live-only, OR tokens, scope-aware)
     ──────────────────────────────────────────────────────────────────────────── */
  const filteredData = useMemo(() => {
    const src = baseData || [];
    if (!src.length) return [];

    const tokens = searchTokens.map((t) => t.toLowerCase());

    return src.filter((match) => {
      const hasValidOdds =
        (match.odds.ah.home_odds &&
          match.odds.ah.home_odds !== "" &&
          match.odds.ah.home_odds !== "N/A") ||
        (match.odds.ou.over_odds &&
          match.odds.ou.over_odds !== "" &&
          match.odds.ou.over_odds !== "N/A");
      if (!hasValidOdds) return false;

      if (showLiveOnly) {
        const isLive =
          !match.time_or_status.includes(":") &&
          match.time_or_status !== "N/A";
        if (!isLive) return false;
      }

      if (tokens.length === 0) return true;

      const comp = (match.competition || "").toLowerCase();
      const teamMerged = `${match.home_team || ""} ${match.away_team || ""}`.toLowerCase();

      const anyTokenMatches = tokens.some((tok) => {
        if (searchScope === "competition") return comp.includes(tok);
        if (searchScope === "team") return teamMerged.includes(tok);
        return comp.includes(tok) || teamMerged.includes(tok);
      });

      return anyTokenMatches;
    });
  }, [baseData, showLiveOnly, searchTokens, searchScope]);

  /* ────────────────────────────────────────────────────────────────────────────
     Actions
     ──────────────────────────────────────────────────────────────────────────── */
  const handleUpdateTable = async () => {
    try {
      setIsLoading(true);
      await axios.get(`${BACKEND_API_URL}/scrape`);
      await fetchTables();
    } catch (err) {
      console.error("Error updating table:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Robust "Clear All Data" with fallbacks, then refresh
  const handleClearAllData = async () => {
    setIsLoading(true);
    try {
      try {
        await axios.delete(`${BACKEND_API_URL}/data/clear`);
      } catch {
        try {
          await axios.delete(`${BACKEND_API_URL}/data`);
        } catch {
          await axios.post(`${BACKEND_API_URL}/data/clear`);
        }
      }
    } finally {
      await fetchTables();
      setSelectedTableIndex(0);
      setShowIndexView(false);
      setIsLoading(false);
      setShowClearDialog(false);
    }
  };

  const handleDeleteTable = async (index: number) => {
    const target = tables[index];
    if (!target) return;
    try {
      setIsLoading(true);
      await axios.delete(`${BACKEND_API_URL}/data/${target._id}`);
    } catch (err) {
      console.warn("Delete endpoint failed, removing locally:", err);
    } finally {
      await fetchTables();
      setSelectedTableIndex((cur) =>
        Math.max(0, Math.min(cur, Math.max(0, tables.length - 2)))
      );
      setIsLoading(false);
    }
  };

  const toggleComparison = () => {
    if (!canToggleComparison) return;
    setComparisonOn((v) => !v);
  };

  /* ────────────────────────────────────────────────────────────────────────────
     Render
     ──────────────────────────────────────────────────────────────────────────── */
  if (isLoading) return <LoadingAnimation />;

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Centered header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Bongdanet Data
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Trung&apos;s Personal Soccer Dashboard
          </p>
        </header>

        {/* Controls */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Filter className="h-5 w-5" />
              Data Controls &amp; Filters
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Table Management */}
            <TableManager
              tables={tables}
              selectedTableIndex={selectedTableIndex}
              onSelectTable={(i) => {
                setSelectedTableIndex(i);
                setCompareAValue(i.toString());
              }}
              onDeleteTable={handleDeleteTable}
              onToggleIndex={() => setShowIndexView((v) => !v)}
              showIndexView={showIndexView}
            />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleUpdateTable}
                className="bg-green-600 hover:bg-green-700"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Update Table Data
              </Button>

              <Button
                onClick={() => setShowLiveOnly((v) => !v)}
                variant={showLiveOnly ? "default" : "outline"}
                className={showLiveOnly ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {showLiveOnly ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                {showLiveOnly ? "Show All Matches" : "Live Matches Only"}
              </Button>

              <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All Data
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clear All Data</DialogTitle>
                    <DialogDescription>
                      This will delete all stored tables. Are you sure?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowClearDialog(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleClearAllData}>
                      Yes, Clear All
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* SEARCH BAR — single line (input + scope dropdown) */}
            <div className="flex flex-col gap-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                {/* Tokens + input (flex-1) */}
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {searchTokens.map((t) => (
                      <Badge key={t} variant="secondary" className="text-sm py-1">
                        {t}
                        <button
                          className="ml-2 text-slate-600"
                          onClick={() => removeToken(t)}
                          aria-label={`Remove ${t}`}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Type a term and press Enter (Competition or Team)"
                      value={searchDraft}
                      onChange={(e) => setSearchDraft(e.target.value)}
                      onKeyDown={onSearchKeyDown}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Scope dropdown on the SAME line */}
                <div className="flex items-center gap-2 min-w-[260px]">
                  <span className="text-sm text-slate-600 whitespace-nowrap">Search In</span>
                  <Select
                    value={searchScope}
                    onValueChange={(v) => setSearchScope(v as SearchScope)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Both" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="competition">Competition</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="both">Both Competition &amp; Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Matching logic: <strong>OR</strong> across tokens.
              </div>
            </div>

            {/* COMPARISON — clearer labels and flow */}
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant={comparisonOn ? "default" : "outline"}
                  className={comparisonOn ? "bg-purple-600 hover:bg-purple-700" : ""}
                  onClick={toggleComparison}
                >
                  <Columns2 className="mr-2 h-4 w-4" />
                  {comparisonOn ? "Comparison: ON" : "Comparison: OFF"}
                </Button>

                {!canToggleComparison && (
                  <span className="inline-flex items-center gap-2 text-sm text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    Add at least one table to compare with Index, or two tables for table-to-table comparison.
                  </span>
                )}

                {comparisonOn && canToggleComparison && (
                  <div className="flex flex-wrap items-center gap-3">
                    {/* A (default) — includes Index as first option */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 font-medium">Table A (Default)</span>
                      <Select
                        value={compareAValue}
                        onValueChange={(v) => setCompareAValue(v)}
                      >
                        <SelectTrigger className="w-[240px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="index">Index Table</SelectItem>
                          {tables.map((table, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              Table {index + 1} — {table.scraped_at_cst}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* label between A and B */}
                    <div className="flex items-center gap-2 text-slate-600">
                      <ArrowRightLeft className="h-4 w-4" />
                      <span className="text-sm font-medium">Compared with</span>
                    </div>

                    {/* B (compared with) */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 font-medium">Table B (Compared)</span>
                      <Select
                        value={compareBIndex != null ? compareBIndex.toString() : ""}
                        onValueChange={(v) => setCompareBIndex(Number(v))}
                      >
                        <SelectTrigger className="w-[260px]">
                          <SelectValue placeholder={compareAIsIndex ? "Select any table…" : "Select higher table…"} />
                        </SelectTrigger>
                        <SelectContent>
                          {higherTablesForB.length === 0 && (
                            <div className="px-3 py-2 text-sm text-slate-500">
                              {compareAIsIndex
                                ? "No tables available."
                                : "No higher tables available."}
                            </div>
                          )}
                          {higherTablesForB.map(({ i }) => (
                            <SelectItem key={i} value={i.toString()}>
                              Table {i + 1} — {tables[i].scraped_at_cst}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table Section */}
        {(currentTable || showIndexView) && (
          <Card className="border-0 shadow-lg mt-6">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-xl">
                  {showIndexView ? "Index Table" : "Football Matches Data"}
                </CardTitle>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-sm">
                    {showIndexView
                      ? "Index view (latest rows per row_id)"
                      : `Scraped at: ${currentTable?.scraped_at_cst}`}
                  </Badge>
                  <Badge variant="secondary">{filteredData.length} matches</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Normal view */}
              {!comparisonOn && (
                <MatchesTable
                  data={filteredData}
                  previousData={previousTable?.data}
                  getChangedValues={getChangedValues}
                />
              )}

              {/* Comparison view */}
              {comparisonOn && compareBIndex != null && (
                <MatchesTable
                  data={
                    // show A rows only where B exists
                    comparisonPairs.map(({ a }) => a)
                  }
                  previousData={previousTable?.data}
                  getChangedValues={getChangedValues}
                  comparisonMode
                  compareData={compareAgainst}
                  compareLabels={{
                    a: compareAIsIndex ? "Index Table" : `Table ${compareAIndex + 1}`,
                    b: `Table ${compareBIndex + 1} (Compared)`,
                  }}
                />
              )}
            </CardContent>
          </Card>
        )}

        {tables.length === 0 && !showIndexView && (
          <Card className="border-0 shadow-lg mt-6">
            <CardContent className="text-center py-12">
              <p className="text-slate-500 text-lg">No table data available</p>
              <Button
                onClick={handleUpdateTable}
                className="mt-4 bg-green-600 hover:bg-green-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add First Table
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
