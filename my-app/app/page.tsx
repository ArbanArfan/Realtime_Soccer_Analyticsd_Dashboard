"use client";

import { useState, useMemo, useEffect } from "react";
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
  Search,
  Filter,
  Eye,
  EyeOff,
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
import { AdvancedFilters } from "@/components/advanced-filters";
import { TableManager } from "@/components/table-manager";
import axios from "axios";

const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000";
// Sample data structure
const sampleData = {
  scraped_at_cst: "CST Sat 10:00",
  data: [
    {
      competition: "HOL RE",
      time_or_status: "90+5",
      home_team: "FC Groningen Reserves",
      score: "1 - 2",
      away_team: "FC Twente/Heracles Academie U21",
      odds: {
        ah: {
          home_odds: "0.83",
          line: "+0",
          away_odds: "0.98",
        },
        ou: {
          over_odds: "0.98",
          total_line: "3 1/2",
          under_odds: "0.83",
        },
      },
      row_id: "tb_262416938",
      data_league: "279512",
      data_index: "14",
    },
    {
      competition: "RUS PR",
      time_or_status: "82",
      home_team: "Zenit St. Petersburg",
      score: "2 - 0",
      away_team: "FK Nizhny Novgorod",
      odds: {
        ah: {
          home_odds: "0.75",
          line: "-1",
          away_odds: "1.05",
        },
        ou: {
          over_odds: "0.90",
          total_line: "2.5",
          under_odds: "0.90",
        },
      },
      row_id: "tb_378716938",
      data_league: "114612",
      data_index: "364",
    },
    {
      competition: "AUT D1",
      time_or_status: "22:00",
      home_team: "Red Bull Salzburg",
      score: "",
      away_team: "FC Blau Weiss Linz",
      odds: {
        ah: {
          home_odds: "0.82",
          line: "-1 1/2",
          away_odds: "0.97",
        },
        ou: {
          over_odds: "0.85",
          total_line: "3",
          under_odds: "0.95",
        },
      },
      row_id: "tb_285300935",
      data_league: "133",
      data_index: "365",
    },
    {
      competition: "FRA D1",
      time_or_status: "22:00",
      home_team: "Lorient",
      score: "",
      away_team: "Lille",
      odds: {
        ah: {
          home_odds: "0.97",
          line: "+1/4",
          away_odds: "0.87",
        },
        ou: {
          over_odds: "0.88",
          total_line: "2 1/2",
          under_odds: "0.92",
        },
      },
      row_id: "tb_358416933",
      data_league: "140914",
      data_index: "435",
    },
  ],
};

// Create a second table with some changed values for demonstration
const sampleData2 = {
  ...sampleData,
  scraped_at_cst: "CST Sat 10:15",
  data: sampleData.data.map((match, index) => {
    if (index === 1) {
      // Change some odds values for demonstration
      return {
        ...match,
        odds: {
          ...match.odds,
          ah: {
            ...match.odds.ah,
            home_odds: "0.80", // Changed from 0.75
            away_odds: "1.10", // Changed from 1.05
          },
        },
      };
    }
    return match;
  }),
};

export interface MatchData {
  competition: string;
  time_or_status: string;
  home_team: string;
  score: string;
  away_team: string;
  odds: {
    ah: {
      home_odds: string;
      line: string;
      away_odds: string;
    };
    ou: {
      over_odds: string;
      total_line: string;
      under_odds: string;
    };
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

export default function BongdanetDataPage() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCategory, setSearchCategory] = useState("competition");
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<any>({});

  const currentTable = tables[selectedTableIndex];
  const previousTable =
    selectedTableIndex > 0 ? tables[selectedTableIndex - 1] : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const resp = await axios.get(`${BACKEND_API_URL}/data`);
        console.log("Fetched data:", resp.data);

        // resp.data is an array of tables, each with a .data array (which is itself an array of arrays)
        // We want to flatten all the inner arrays into a single array for each table
        setTables(
          resp.data.map((d: any) => ({
            ...d,
            data: Array.isArray(d.data)
              ? d.data.flat() // flatten one level if d.data is array of arrays
              : [],
          }))
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);
  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    if (!currentTable) return [];

    const filtered = currentTable.data.filter((match) => {
      // Filter out rows with missing odds data
      const hasValidOdds =
        (match.odds.ah.home_odds &&
          match.odds.ah.home_odds !== "" &&
          match.odds.ah.home_odds !== "N/A") ||
        (match.odds.ou.over_odds &&
          match.odds.ou.over_odds !== "" &&
          match.odds.ou.over_odds !== "N/A");

      if (!hasValidOdds) return false;

      // Live matches filter
      if (showLiveOnly) {
        const isLive =
          !match.time_or_status.includes(":") && match.time_or_status !== "N/A";
        if (!isLive) return false;
      }

      // Search filter
      if (searchTerm) {
        const searchValue =
          match[searchCategory as keyof MatchData]?.toString().toLowerCase() ||
          "";
        if (!searchValue.includes(searchTerm.toLowerCase())) return false;
      }

      // Advanced filters
      if (
        advancedFilters.competition &&
        advancedFilters.competition.length > 0
      ) {
        if (!advancedFilters.competition.includes(match.competition))
          return false;
      }

      return true;
    });

    return filtered;
  }, [currentTable, searchTerm, searchCategory, showLiveOnly, advancedFilters]);

  const handleUpdateTable = async () => {
    setIsLoading(true);
    try {
      // Simulate API call delay
      const response = await axios.get(`${BACKEND_API_URL}/scrape`);
      console.log("Scrape response:", response.data);
      const newTable = response.data.scraped;

      setTables((prev) => [
        ...prev,
        {
          ...newTable,
          data: Array.isArray(newTable.data) ? newTable.data.flat() : [],
        },
      ]);
      setSelectedTableIndex(tables.length);
    } catch (error) {
      console.error("Error during scraping:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTable = async (index: number) => {
    try {
      await axios.delete(`${BACKEND_API_URL}/data/${tables[index]._id}`);
      setTables((prev) => prev.filter((_, i) => i !== index));
      if (selectedTableIndex >= index && selectedTableIndex > 0) {
        setSelectedTableIndex(selectedTableIndex - 1);
      }
    } catch (err) {
      console.error("Error deleting table:", err);
    }
  };

  const handleClearAllData = async () => {
    try {
      await axios.post(`${BACKEND_API_URL}/data/clear`);
      setTables([]);
      setSelectedTableIndex(0);
      setShowClearDialog(false);
    } catch (err) {
      console.error("Error clearing data:", err);
    }
  };

  const getChangedValues = (
    currentMatch: MatchData,
    previousMatch?: MatchData
  ) => {
    if (!previousMatch) return {};

    const changes: any = {};

    // Check Asian Handicap changes
    if (currentMatch.odds.ah.home_odds !== previousMatch.odds.ah.home_odds) {
      changes.ah_home_odds = previousMatch.odds.ah.home_odds;
    }
    if (currentMatch.odds.ah.away_odds !== previousMatch.odds.ah.away_odds) {
      changes.ah_away_odds = previousMatch.odds.ah.away_odds;
    }
    if (currentMatch.odds.ah.line !== previousMatch.odds.ah.line) {
      changes.ah_line = previousMatch.odds.ah.line;
    }

    // Check Over/Under changes
    if (currentMatch.odds.ou.over_odds !== previousMatch.odds.ou.over_odds) {
      changes.ou_over_odds = previousMatch.odds.ou.over_odds;
    }
    if (currentMatch.odds.ou.under_odds !== previousMatch.odds.ou.under_odds) {
      changes.ou_under_odds = previousMatch.odds.ou.under_odds;
    }
    if (currentMatch.odds.ou.total_line !== previousMatch.odds.ou.total_line) {
      changes.ou_total_line = previousMatch.odds.ou.total_line;
    }

    return changes;
  };

  if (isLoading) {
    return <LoadingAnimation />;
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-slate-900 text-balance">
              Bongdanet Data
            </h1>
            <p className="text-lg text-slate-600 text-pretty">
              Trung's Personal Soccer Dashboard
            </p>
          </div>

          {/* Controls Section */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Filter className="h-5 w-5" />
                Data Controls & Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Table Management */}
              <TableManager
                tables={tables}
                selectedTableIndex={selectedTableIndex}
                onSelectTable={setSelectedTableIndex}
                onDeleteTable={handleDeleteTable}
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
                  onClick={() => setShowLiveOnly(!showLiveOnly)}
                  variant={showLiveOnly ? "default" : "outline"}
                  className={
                    showLiveOnly ? "bg-green-600 hover:bg-green-700" : ""
                  }
                >
                  {showLiveOnly ? (
                    <Eye className="mr-2 h-4 w-4" />
                  ) : (
                    <EyeOff className="mr-2 h-4 w-4" />
                  )}
                  {showLiveOnly ? "Show All Matches" : "Live Matches Only"}
                </Button>

                <Dialog
                  open={showClearDialog}
                  onOpenChange={setShowClearDialog}
                >
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
                        Are you sure you want to clear all table data? This
                        action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowClearDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleClearAllData}
                      >
                        Yes, Clear All
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder={`Search by ${searchCategory}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={searchCategory}
                  onValueChange={setSearchCategory}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="competition">Competition</SelectItem>
                    <SelectItem value="home_team">Home Team</SelectItem>
                    <SelectItem value="away_team">Away Team</SelectItem>
                    <SelectItem value="time_or_status">Time/Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Filters */}
              {/* <AdvancedFilters
                data={currentTable?.data || []}
                filters={advancedFilters}
                onFiltersChange={setAdvancedFilters}
              /> */}
            </CardContent>
          </Card>

          {/* Table Section */}
          {currentTable && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="text-xl">
                    Football Matches Data
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-sm">
                      Scraped at: {currentTable.scraped_at_cst}
                    </Badge>
                    <Badge variant="secondary">
                      {filteredData.length} matches
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <MatchesTable
                  data={filteredData}
                  previousData={previousTable?.data}
                  getChangedValues={getChangedValues}
                />
              </CardContent>
            </Card>
          )}

          {tables.length === 0 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="text-center py-12">
                <p className="text-slate-500 text-lg">
                  No table data available
                </p>
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
      </div>
    </TooltipProvider>
  );
}
