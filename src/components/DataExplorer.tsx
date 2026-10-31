import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Download,
  X,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  CheckSquare,
  Square,
  SlidersHorizontal,
  ExternalLink,
  Edit3,
  Check,
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Save,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { CandidateEntity, ColumnDef, ColumnFilter, DataRow, SheetData, SortState } from '../types/spreadsheet';
import { exportDataset, formatCellValue } from '../utils/excelParser';
import {
  addNewCandidate,
  removeCandidate,
  togglePendingDone,
  updateCandidateValue,
} from '../utils/dataManager';

interface DataExplorerProps {
  sheet: SheetData;
  onSelectCandidate: (candidateRow: DataRow | CandidateEntity) => void;
  fileName: string;
  onUpdateSheet: (updatedSheet: SheetData) => void;
  onRevertOriginal: () => void;
  isModified?: boolean;
}

const COMMON_STATUSES = ['Pending', 'In Progress', 'Done', 'Completed', 'Verified', 'Approved', 'Rejected'];

export const DataExplorer: React.FC<DataExplorerProps> = ({
  sheet,
  onSelectCandidate,
  fileName,
  onUpdateSheet,
  onRevertOriginal,
  isModified,
}) => {
  const { headers, rows, candidates } = sheet;

  // Search & Filter state
  const [globalSearch, setGlobalSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
  const [sortState, setSortState] = useState<SortState | null>(null);

  // Edit Mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedCandidateIds, setExpandedCandidateIds] = useState<Set<string>>(new Set());

  // Column visibility
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<Set<string>>(new Set());
  const [showColumnToggle, setShowColumnToggle] = useState(false);

  // Row selection
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Filter popup for individual column
  const [activeFilterCol, setActiveFilterCol] = useState<ColumnDef | null>(null);
  const [filterOperator, setFilterOperator] = useState<ColumnFilter['operator']>('contains');
  const [filterValue, setFilterValue] = useState<string>('');

  // Cell inspection modal for long text / detailed cell
  const [inspectCell, setInspectCell] = useState<{
    columnLabel: string;
    value: any;
    rowNumber: number;
  } | null>(null);

  // Add new record modal
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [newRecordData, setNewRecordData] = useState<Record<string, string>>({});

  // Visible columns
  const visibleColumns = useMemo(() => {
    return headers.filter((h) => !hiddenColumnKeys.has(h.key));
  }, [headers, hiddenColumnKeys]);

  // Apply Search, Filters, and Sorting
  const filteredRows = useMemo(() => {
    let result = [...rows];

    // 1. Global search across all columns
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase().trim();
      result = result.filter((row) => {
        return headers.some((col) => {
          const val = row[col.key];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // 2. Column specific filters
    if (columnFilters.length > 0) {
      result = result.filter((row) => {
        return columnFilters.every((filter) => {
          const val = row[filter.columnKey];
          if (filter.operator === 'is_blank') {
            return val === null || val === undefined || val === '';
          }
          if (filter.operator === 'is_not_blank') {
            return val !== null && val !== undefined && val !== '';
          }

          if (val === null || val === undefined) return false;
          const strVal = String(val).toLowerCase();
          const target = String(filter.value).toLowerCase();

          switch (filter.operator) {
            case 'contains':
              return strVal.includes(target);
            case 'equals':
              return strVal === target;
            case 'not_equals':
              return strVal !== target;
            case 'starts_with':
              return strVal.startsWith(target);
            case 'ends_with':
              return strVal.endsWith(target);
            case 'gt':
              return Number(val) > Number(filter.value);
            case 'gte':
              return Number(val) >= Number(filter.value);
            case 'lt':
              return Number(val) < Number(filter.value);
            case 'lte':
              return Number(val) <= Number(filter.value);
            default:
              return true;
          }
        });
      });
    }

    // 3. Sorting
    if (sortState) {
      const { columnKey, direction } = sortState;
      const colDef = headers.find((h) => h.key === columnKey);
      const isNum = colDef?.type === 'number';

      result.sort((a, b) => {
        const valA = a[columnKey];
        const valB = b[columnKey];

        if (valA === null || valA === undefined || valA === '') return 1;
        if (valB === null || valB === undefined || valB === '') return -1;

        if (isNum) {
          const numA = Number(valA);
          const numB = Number(valB);
          if (!isNaN(numA) && !isNaN(numB)) {
            return direction === 'asc' ? numA - numB : numB - numA;
          }
        }

        const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        return direction === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [rows, headers, globalSearch, columnFilters, sortState]);

  // Paginated rows
  const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    if (pageSize === -1) return filteredRows;
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Toggle child sub-record expander
  const toggleCandidateExpand = (candidateId: string) => {
    setExpandedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  };

  // Sorting handler
  const handleSort = (columnKey: string) => {
    setSortState((prev) => {
      if (!prev || prev.columnKey !== columnKey) {
        return { columnKey, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { columnKey, direction: 'desc' };
      }
      return null;
    });
  };

  // Row selection handlers
  const handleSelectAll = () => {
    if (selectedRowIds.size === paginatedRows.length && paginatedRows.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(paginatedRows.map((r) => r.__id)));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleColumnVisibility = (key: string) => {
    setHiddenColumnKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const showAllColumns = () => setHiddenColumnKeys(new Set());
  const resetAllFilters = () => {
    setGlobalSearch('');
    setColumnFilters([]);
    setSortState(null);
    setCurrentPage(1);
  };

  // Column filter submit
  const handleApplyColumnFilter = () => {
    if (!activeFilterCol) return;
    const existing = columnFilters.filter((f) => f.columnKey !== activeFilterCol.key);
    if (filterOperator === 'is_blank' || filterOperator === 'is_not_blank' || filterValue.trim()) {
      existing.push({
        columnKey: activeFilterCol.key,
        operator: filterOperator,
        value: filterValue.trim(),
      });
    }
    setColumnFilters(existing);
    setActiveFilterCol(null);
    setFilterValue('');
    setCurrentPage(1);
  };

  const removeColumnFilter = (columnKey: string) => {
    setColumnFilters((prev) => prev.filter((f) => f.columnKey !== columnKey));
  };

  // Inline Cell Edit handler
  const handleCellChange = (parentCandidateId: string | undefined, colKey: string, newValue: any) => {
    if (!parentCandidateId) return;
    const updated = updateCandidateValue(sheet, parentCandidateId, colKey, newValue);
    onUpdateSheet(updated);
  };

  // Status toggle handler
  const handleStatusToggle = (candidateId: string) => {
    const updated = togglePendingDone(sheet, candidateId);
    onUpdateSheet(updated);
  };

  // Add Candidate submit
  const handleCreateRecord = () => {
    const updated = addNewCandidate(sheet, newRecordData);
    onUpdateSheet(updated);
    setIsAddRecordOpen(false);
    setNewRecordData({});
  };

  // Delete Candidate confirmed
  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return;
    const updated = removeCandidate(sheet, deleteConfirmId);
    onUpdateSheet(updated);
    setDeleteConfirmId(null);
  };

  // Export selection
  const exportCurrentSelection = (format: 'xlsx' | 'csv') => {
    const rowsToExport =
      selectedRowIds.size > 0
        ? rows.filter((r) => selectedRowIds.has(r.__id))
        : filteredRows;
    exportDataset(rowsToExport, visibleColumns, format, fileName, 'updated', candidates);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col min-h-[600px]">
      {/* Top Controls Toolbar */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        {/* Unsaved changes / Edit Mode active banner */}
        {isEditMode && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <strong className="font-bold">Edit Mode Active:</strong>
              <span>Click any cell to edit values directly. Changes immediately update across all views.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddRecordOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Record</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Global Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={`Search all ${headers.length} columns (name, ID, course, college)...`}
              className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Edit Data Mode Button */}
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all ${
                isEditMode
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-white text-blue-600 hover:text-blue-700 border-blue-300 hover:bg-blue-50/50 shadow-2xs'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Exit Edit Mode' : 'Edit Data'}</span>
            </button>

            {/* Column Visibility Manager */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColumnToggle(!showColumnToggle)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  hiddenColumnKeys.size > 0
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
                title="Show or hide columns"
                aria-expanded={showColumnToggle}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>
                  Columns ({visibleColumns.length}/{headers.length})
                </span>
              </button>

              {showColumnToggle && (
                <div className="absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto bg-white rounded-lg shadow-xl border border-slate-200 p-2 z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs font-semibold text-slate-800">
                    <span>Toggle Columns</span>
                    <button
                      type="button"
                      onClick={showAllColumns}
                      className="text-blue-600 hover:text-blue-700 text-[11px]"
                    >
                      Show All
                    </button>
                  </div>
                  <div className="space-y-1 text-xs">
                    {headers.map((col) => {
                      const isVisible = !hiddenColumnKeys.has(col.key);
                      return (
                        <label
                          key={col.key}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => toggleColumnVisibility(col.key)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="truncate text-slate-700" title={col.label}>
                            {col.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Reset Filters Button */}
            {(globalSearch || columnFilters.length > 0 || sortState) && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Reset all search filters and sorting"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            {/* Revert to Original if modified */}
            {isModified && (
              <button
                type="button"
                onClick={onRevertOriginal}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                title="Revert all changes to original imported spreadsheet"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert to Original</span>
              </button>
            )}

            {/* Export Selection */}
            {selectedRowIds.size > 0 && (
              <div className="flex items-center gap-1 bg-blue-50 text-blue-800 px-3 py-1 rounded-lg border border-blue-200 text-xs">
                <span>{selectedRowIds.size} selected</span>
                <button
                  type="button"
                  onClick={() => exportCurrentSelection('xlsx')}
                  className="ml-2 font-semibold text-blue-600 hover:text-blue-800 underline"
                >
                  Export (.xlsx)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Active Filters Badges */}
        {columnFilters.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-slate-400">Active Filters:</span>
            {columnFilters.map((f) => {
              const col = headers.find((h) => h.key === f.columnKey);
              return (
                <span
                  key={f.columnKey}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-blue-50 text-blue-800 border border-blue-200"
                >
                  <span className="font-semibold">{col?.label}:</span>
                  <span>
                    {f.operator} {f.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeColumnFilter(f.columnKey)}
                    className="hover:text-blue-950"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Dynamic Table Container */}
      <div className="flex-1 overflow-x-auto relative min-h-[350px]">
        <table className="w-full text-left text-xs border-collapse">
          {/* Sticky Table Header */}
          <thead className="bg-slate-50 text-slate-700 sticky top-0 z-20 border-b border-slate-200 select-none">
            <tr>
              {/* Row Select Checkbox Column */}
              <th className="w-10 px-3 py-3 text-center border-r border-slate-200 bg-slate-100/80 sticky left-0 z-30">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-slate-500 hover:text-slate-800 flex items-center justify-center mx-auto"
                  aria-label="Select all rows"
                >
                  {selectedRowIds.size === paginatedRows.length && paginatedRows.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>

              {/* Dynamic Headers */}
              {visibleColumns.map((col, index) => {
                const isSorted = sortState?.columnKey === col.key;
                const isFiltered = columnFilters.some((f) => f.columnKey === col.key);

                return (
                  <th
                    key={col.key}
                    className={`px-3 py-3 font-semibold tracking-wide border-r border-slate-200 whitespace-nowrap bg-slate-50 hover:bg-slate-100 transition-colors ${
                      index === 0 ? 'sticky left-10 z-20 bg-slate-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1.5 cursor-pointer flex-1"
                        title={`Click to sort by ${col.label}`}
                      >
                        <span className="truncate max-w-[220px]">{col.label}</span>
                        {isSorted ? (
                          sortState.direction === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                        )}
                      </div>

                      {/* Filter Popover Trigger */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(col);
                          setFilterOperator('contains');
                          setFilterValue('');
                        }}
                        className={`p-1 rounded hover:bg-slate-200 transition-colors ${
                          isFiltered ? 'text-blue-600 bg-blue-100' : 'text-slate-400'
                        }`}
                        title={`Filter ${col.label}`}
                      >
                        <Filter className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                );
              })}

              {/* Quick Status / Actions Header */}
              <th className="w-36 px-3 py-3 font-semibold text-center whitespace-nowrap bg-slate-50">
                Action & Status
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="px-6 py-12 text-center text-slate-400">
                  <div className="max-w-xs mx-auto space-y-2">
                    <p className="font-semibold text-slate-700">No matching records found</p>
                    <p className="text-xs text-slate-400">
                      Try adjusting your search terms or clearing active column filters.
                    </p>
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset all filters</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const isSelected = selectedRowIds.has(row.__id);
                const parentCandidate = candidates.find((c) => c.__id === row.__parentCandidateId);
                const isSubRow = row.__isSubRow;
                const isParentExpanded = parentCandidate ? expandedCandidateIds.has(parentCandidate.__id) : false;

                // Status detection
                const currentStatus = parentCandidate?.workflowStatus || 'Pending';
                const isDone =
                  currentStatus.toLowerCase().includes('done') ||
                  currentStatus.toLowerCase().includes('completed') ||
                  currentStatus.toLowerCase().includes('verified') ||
                  currentStatus.toLowerCase().includes('eligible');

                return (
                  <tr
                    key={row.__id}
                    className={`hover:bg-blue-50/50 transition-colors group ${
                      isSelected ? 'bg-blue-50/70' : ''
                    } ${isSubRow ? 'bg-slate-50/40 text-slate-600' : ''}`}
                  >
                    {/* Checkbox cell with child expander if parent has sub-records */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-100 bg-white group-hover:bg-blue-50/50 sticky left-0 z-10">
                      <div className="flex items-center justify-center gap-1">
                        {!isSubRow && parentCandidate && parentCandidate.subRecords?.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => toggleCandidateExpand(parentCandidate.__id)}
                            className="p-0.5 text-blue-600 hover:bg-blue-100 rounded"
                            title={isParentExpanded ? 'Collapse sub-records' : 'Expand sub-records'}
                          >
                            {isParentExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleToggleRow(row.__id)}
                          className="text-slate-400 hover:text-slate-700 flex items-center justify-center mx-auto"
                          aria-label={`Select row ${row.__rowNum}`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Column Cells */}
                    {visibleColumns.map((col, index) => {
                      const rawVal = row[col.key];
                      const displayVal = formatCellValue(rawVal, col.type);
                      const isBlank = displayVal === '';
                      const isStatusCol = col.isStatusColumn;

                      return (
                        <td
                          key={col.key}
                          className={`px-3 py-2 border-r border-slate-100 max-w-[280px] truncate ${
                            index === 0
                              ? 'sticky left-10 z-10 bg-white group-hover:bg-blue-50/50 font-medium text-slate-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]'
                              : ''
                          }`}
                          title={displayVal || '(Blank)'}
                        >
                          {isEditMode ? (
                            /* Editable cell input */
                            isStatusCol ? (
                              <select
                                value={displayVal || currentStatus}
                                onChange={(e) => handleCellChange(row.__parentCandidateId, col.key, e.target.value)}
                                className="w-full bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-blue-500"
                              >
                                {COMMON_STATUSES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={col.type === 'number' ? 'number' : 'text'}
                                value={displayVal}
                                onChange={(e) =>
                                  handleCellChange(
                                    row.__parentCandidateId,
                                    col.key,
                                    col.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value
                                  )
                                }
                                className="w-full bg-amber-50/60 border border-amber-200 focus:border-blue-500 rounded px-1.5 py-0.5 text-xs text-slate-900 font-medium focus:outline-none"
                              />
                            )
                          ) : (
                            /* Read-only view with inspect */
                            <div className="flex items-center justify-between gap-1 group/cell">
                              <span className={`truncate ${isBlank ? 'text-slate-300 italic' : ''}`}>
                                {isBlank ? '—' : displayVal}
                              </span>
                              {!isBlank && String(displayVal).length > 22 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setInspectCell({
                                      columnLabel: col.label,
                                      value: displayVal,
                                      rowNumber: row.__rowNum,
                                    })
                                  }
                                  className="opacity-0 group-hover/cell:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 transition-opacity"
                                  title="Inspect full text"
                                >
                                  <Maximize2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Actions and Status Management Cell */}
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Quick Mark as Done / Status Button */}
                        {row.__parentCandidateId && (
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(row.__parentCandidateId!)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${
                              isDone
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                            }`}
                            title={`Click to mark as ${isDone ? 'Pending' : 'Done'}`}
                          >
                            {isDone ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Done</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* View Full Profile */}
                        <button
                          type="button"
                          onClick={() => onSelectCandidate(parentCandidate || row)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                          title="View complete candidate profile"
                        >
                          <span>Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>

                        {/* Delete in edit mode */}
                        {isEditMode && row.__parentCandidateId && !isSubRow && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(row.__parentCandidateId!)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            title="Delete candidate record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination & Footer Bar */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="font-semibold text-slate-900">{filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
            <strong className="font-semibold text-slate-900">
              {pageSize === -1 ? filteredRows.length : Math.min(currentPage * pageSize, filteredRows.length)}
            </strong>{' '}
            of <strong className="font-semibold text-slate-900">{filteredRows.length}</strong> records
            {filteredRows.length !== rows.length && ` (filtered from ${rows.length} total)`}
          </span>

          <div className="flex items-center gap-1.5 ml-2">
            <label htmlFor="rowsPerPageSelect" className="text-slate-500">Rows per page:</label>
            <select
              id="rowsPerPageSelect"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>All</option>
            </select>
          </div>
        </div>

        {pageSize !== -1 && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Delete Record Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="font-bold text-sm text-slate-900">Delete Record Confirmation</h4>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this record and its associated sub-records? This action can be undone by reverting changes.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 shadow-sm"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Record Modal */}
      {isAddRecordOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h4 className="font-bold text-sm">Add New Candidate Record</h4>
              <button
                type="button"
                onClick={() => setIsAddRecordOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 text-xs">
              {headers.map((col) => (
                <div key={col.key}>
                  <label className="block text-slate-700 font-semibold mb-1">{col.label}</label>
                  <input
                    type="text"
                    value={newRecordData[col.key] || ''}
                    onChange={(e) =>
                      setNewRecordData({ ...newRecordData, [col.key]: e.target.value })
                    }
                    placeholder={`Enter ${col.label}...`}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddRecordOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateRecord}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 shadow-sm"
              >
                Create Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Filter Modal */}
      {activeFilterCol && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Filter Column</h4>
                <p className="text-xs text-blue-600 font-medium truncate max-w-[240px]">
                  {activeFilterCol.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveFilterCol(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Condition</label>
                <select
                  value={filterOperator}
                  onChange={(e) => setFilterOperator(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="contains">Contains</option>
                  <option value="equals">Equals</option>
                  <option value="not_equals">Does Not Equal</option>
                  <option value="starts_with">Starts With</option>
                  <option value="ends_with">Ends With</option>
                  {activeFilterCol.type === 'number' && (
                    <>
                      <option value="gt">Greater Than (&gt;)</option>
                      <option value="gte">Greater Than or Equal (&gt;=)</option>
                      <option value="lt">Less Than (&lt;)</option>
                      <option value="lte">Less Than or Equal (&lt;=)</option>
                    </>
                  )}
                  <option value="is_blank">Is Blank / Empty</option>
                  <option value="is_not_blank">Is Not Blank</option>
                </select>
              </div>

              {filterOperator !== 'is_blank' && filterOperator !== 'is_not_blank' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Filter Value</label>
                  <input
                    type="text"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="Enter value..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveFilterCol(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyColumnFilter}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 shadow-sm"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Cell Full Text Modal */}
      {inspectCell && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">
                  Row {inspectCell.rowNumber} • Cell Inspector
                </span>
                <h4 className="font-bold text-sm text-slate-900">{inspectCell.columnLabel}</h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectCell(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-800 break-words whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
              {inspectCell.value}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setInspectCell(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
