"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Table as TableIcon, ListTree } from "lucide-react";
import type { TableData } from "@/app/page";

interface TableManagerProps {
  tables: TableData[];
  selectedTableIndex: number;
  onSelectTable: (index: number) => void;
  onDeleteTable: (index: number) => void;
  onToggleIndex: () => void;
  showIndexView?: boolean;
}

export function TableManager({
  tables,
  selectedTableIndex,
  onSelectTable,
  onDeleteTable,
  onToggleIndex,
  showIndexView,
}: TableManagerProps) {
  if (tables.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900">Table Management</h3>
        <div className="flex flex-row gap-3">
          <Button variant="outline" size="sm" disabled>
            Index Table
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-900">Table Management</h3>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Select
            value={selectedTableIndex.toString()}
            onValueChange={(value) => onSelectTable(Number.parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tables.map((table, index) => (
                <SelectItem key={index} value={index.toString()}>
                  <div className="flex items-center gap-2">
                    <span>Table {index + 1}</span>
                    <Badge variant="outline" className="text-xs">
                      {table.scraped_at_cst}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Index Table toggle */}
        <Button
          variant={showIndexView ? "default" : "outline"}
          size="sm"
          onClick={onToggleIndex}
          className={showIndexView ? "bg-slate-900 text-white hover:bg-slate-800" : ""}
          title="Toggle Index Table"
        >
          {showIndexView ? (
            <>
              <TableIcon className="h-4 w-4 mr-1" /> Showing Index
            </>
          ) : (
            <>
              <ListTree className="h-4 w-4 mr-1" /> Index Table
            </>
          )}
        </Button>

        {tables.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeleteTable(selectedTableIndex)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Current Table
          </Button>
        )}
      </div>

      <div className="text-sm text-slate-600">
        {showIndexView ? (
          <>Showing Index Table</>
        ) : (
          <>
            Showing {tables.length} table{tables.length !== 1 ? "s" : ""} • Current: Table{" "}
            {selectedTableIndex + 1} ({tables[selectedTableIndex]?.scraped_at_cst})
          </>
        )}
      </div>
    </div>
  );
}
