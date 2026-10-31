import React, { useState, useMemo } from 'react';
import {
  Clock,
  ArrowLeftRight,
  Archive,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronDown,
  Building,
} from 'lucide-react';
import {
  ActiveTab,
  CandidateEntity,
  CaseStatus,
  ColumnDef,
  DataRow,
  SheetData,
  SortState,
} from '../types/spreadsheet';
import { changeCaseStatus } from '../utils/dataManager';
import { exportDataset, formatCellValue } from '../utils/excelParser';

interface CaseStatusPageProps {
  statusType: CaseStatus;
  sheet: SheetData;
  workbookName: string;
  onSelectCandidate: (candidate: CandidateEntity) => void;
  onUpdateSheet: (updatedSheet: SheetData) => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const CaseStatusPage: React.FC<CaseStatusPageProps> = ({
  statusType,
  sheet,
  workbookName,
  onSelectCandidate,
  onUpdateSheet,
  onNavigateTab,
}) => {
  const { headers, candidates } = sheet;

  // Search, filter & sort state
  const [globalSearch, setGlobalSearch] = useState('');
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleColKeys, setVisibleColKeys] = useState<Set<string>>(
    () => new Set(headers.slice(0, 10).map((h) => h.key))
  );
  const [showColMenu, setShowColMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Transition modal state
  const [transitionModal, setTransitionModal] = useState<{
    isOpen: boolean;
    candidate: CandidateEntity | null;
    targetStatus: CaseStatus;
    remarks: string;
    transferDestination: string;
  }>({
    isOpen: false,
    candidate: null,
    targetStatus: 'Pending',
    remarks: '',
    transferDestination: '',
  });

  // Cell inspector modal
  const [inspectedCell, setInspectedCell] = useState<{
    colLabel: string;
    value: any;
    candidateName: string;
  } | null>(null);

  // Page header config based on statusType
  const pageMeta = useMemo(() => {
    switch (statusType) {
      case 'Pending':
        return {
          title: 'Pending Cases',
          description: 'Cases awaiting completion, verification, marksheet review, or officer sign-off.',
          icon: Clock,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
          accentColor: 'text-amber-600',
          bgHeader: 'from-amber-950/20 via-slate-900 to-slate-900',
        };
      case 'Transferred':
        return {
          title: 'Transfer Cases',
          description: 'Cases routed or escalated to external authorities, sports federations, or other universities.',
          icon: ArrowLeftRight,
          badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          accentColor: 'text-indigo-600',
          bgHeader: 'from-indigo-950/20 via-slate-900 to-slate-900',
        };
      case 'Disposed':
        return {
          title: 'Disposed Cases',
          description: 'Completed, settled, verified, or closed cases that have fulfilled all requirements.',
          icon: Archive,
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          accentColor: 'text-emerald-600',
          bgHeader: 'from-emerald-950/20 via-slate-900 to-slate-900',
        };
      default:
        return {
          title: 'Unclassified Cases',
          description: 'Records whose status could not be unambiguously categorized.',
          icon: Layers,
          badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
          accentColor: 'text-slate-600',
          bgHeader: 'from-slate-950/20 via-slate-900 to-slate-900',
        };
    }
  }, [statusType]);

  // Key identity column
  const candidateNameCol = useMemo(() => {
    return (
      headers.find((h) => {
        const l = h.label.toLowerCase();
        return (
          l.includes('name of sportsperson') ||
          l.includes('candidate name') ||
          l.includes('student name') ||
          l === 'name' ||
          l.includes('person')
        );
      }) || headers[1] || headers[0]
    );
  }, [headers]);

  // 1. Filter candidates strictly by statusType
  const statusFilteredCandidates = useMemo(() => {
    return candidates.filter((cand) => cand.caseStatus === statusType);
  }, [candidates, statusType]);

  // 2. Global text search
  const searchedCandidates = useMemo(() => {
    if (!globalSearch.trim()) return statusFilteredCandidates;
    const q = globalSearch.toLowerCase().trim();

    return statusFilteredCandidates.filter((cand) => {
      // Check parent properties
      for (const col of headers) {
        const val = cand[col.key];
        if (val !== null && val !== undefined && String(val).toLowerCase().includes(q)) {
          return true;
        }
      }
      // Check sub-records
      if (cand.subRecords && cand.subRecords.length > 0) {
        for (const sub of cand.subRecords) {
          for (const key of Object.keys(sub)) {
            const val = sub[key];
            if (val !== null && val !== undefined && String(val).toLowerCase().includes(q)) {
              return true;
            }
          }
        }
      }
      // Check remarks / transfer details
      if (cand.remarks && cand.remarks.toLowerCase().includes(q)) return true;
      if (cand.transferDetails && cand.transferDetails.toLowerCase().includes(q)) return true;

      return false;
    });
  }, [statusFilteredCandidates, globalSearch, headers]);

  // 3. Sorting
  const sortedCandidates = useMemo(() => {
    if (!sortState) return searchedCandidates;
    const { columnKey, direction } = sortState;

    return [...searchedCandidates].sort((a, b) => {
      const valA = a[columnKey];
      const valB = b[columnKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined || valA === '') return 1;
      if (valB === null || valB === undefined || valB === '') return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return direction === 'asc' ? valA - valB : valB - valA;
      }
      return direction === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [searchedCandidates, sortState]);

  // 4. Pagination
  const totalRecords = sortedCandidates.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCandidates.slice(start, start + pageSize);
  }, [sortedCandidates, currentPage, pageSize]);

  // Handle Sort Toggle
  const handleToggleSort = (columnKey: string) => {
    if (sortState?.columnKey === columnKey) {
      if (sortState.direction === 'asc') {
        setSortState({ columnKey, direction: 'desc' });
      } else {
        setSortState(null);
      }
    } else {
      setSortState({ columnKey, direction: 'asc' });
    }
  };

  // Open Status Transition Confirmation Dialog
  const openTransitionModal = (candidate: CandidateEntity, targetStatus: CaseStatus) => {
    setTransitionModal({
      isOpen: true,
      candidate,
      targetStatus,
      remarks: candidate.remarks || '',
      transferDestination: candidate.transferDetails || '',
    });
  };

  // Confirm Status Transition
  const handleConfirmTransition = () => {
    if (!transitionModal.candidate) return;

    const updatedSheet = changeCaseStatus(
      sheet,
      transitionModal.candidate.__id,
      transitionModal.targetStatus,
      transitionModal.remarks,
      transitionModal.transferDestination
    );

    onUpdateSheet(updatedSheet);

    setTransitionModal({
      isOpen: false,
      candidate: null,
      targetStatus: 'Pending',
      remarks: '',
      transferDestination: '',
    });
  };

  // Export current status filtered records
  const handleExportFiltered = (format: 'xlsx' | 'csv') => {
    const flatRows: DataRow[] = [];
    let rowCounter = 1;

    for (const cand of sortedCandidates) {
      if (cand.subRecords && cand.subRecords.length > 0) {
        cand.subRecords.forEach((sub, idx) => {
          const rowObj: DataRow = {
            __id: `row_${rowCounter}`,
            __rowNum: rowCounter,
            __isSubRow: idx > 0,
            caseStatus: cand.caseStatus,
          };
          for (const col of headers) {
            rowObj[col.key] = idx === 0 ? cand[col.key] ?? sub[col.key] : sub[col.key] ?? cand[col.key];
          }
          flatRows.push(rowObj);
          rowCounter++;
        });
      } else {
        const rowObj: DataRow = {
          __id: `row_${rowCounter}`,
          __rowNum: rowCounter,
          __isSubRow: false,
          caseStatus: cand.caseStatus,
        };
        for (const col of headers) {
          rowObj[col.key] = cand[col.key];
        }
        flatRows.push(rowObj);
        rowCounter++;
      }
    }

    const exportFileName = `${statusType}_Cases_${workbookName.replace(/\.[^/.]+$/, '')}.${format}`;
    exportDataset(flatRows, headers, format, exportFileName, 'filtered', sortedCandidates);
    setShowExportMenu(false);
  };

  const getCandidateName = (cand: CandidateEntity) => {
    return (
      cand.name ||
      cand.name_of_sportsperson ||
      (candidateNameCol ? cand[candidateNameCol.key] : null) ||
      `Case #${cand.__sourceRowNums?.[0] || cand.__id}`
    );
  };

  const IconHeader = pageMeta.icon;

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className={`bg-gradient-to-r ${pageMeta.bgHeader} rounded-2xl p-6 text-white shadow-sm border border-slate-800`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10 text-white shrink-0">
              <IconHeader className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${pageMeta.badgeColor}`}>
                  {pageMeta.title}
                </span>
                <span className="text-xs text-slate-300">
                  {statusFilteredCandidates.length} {statusFilteredCandidates.length === 1 ? 'case' : 'cases'} registered
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">{pageMeta.title}</h2>
              <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
                {pageMeta.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/30 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export {statusType} Cases</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => handleExportFiltered('xlsx')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Download Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportFiltered('csv')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Download CSV (.csv)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Back to Explorer */}
            <button
              type="button"
              onClick={() => onNavigateTab('explorer')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-xl border border-slate-700 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Full Database</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          {/* Global Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={`Search ${pageMeta.title.toLowerCase()} by name, id, remarks, college...`}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Column Visibility Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColMenu(!showColMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-700 shadow-2xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>Columns ({visibleColKeys.size}/{headers.length})</span>
              </button>

              {showColMenu && (
                <div className="absolute right-0 mt-2 w-64 max-h-72 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-40 text-xs">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 font-semibold text-slate-700">
                    <span>Visible Columns</span>
                    <button
                      type="button"
                      onClick={() => setVisibleColKeys(new Set(headers.map((h) => h.key)))}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      Show All
                    </button>
                  </div>
                  {headers.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 py-1 px-1.5 hover:bg-slate-50 rounded cursor-pointer text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColKeys.has(col.key)}
                        onChange={(e) => {
                          const next = new Set(visibleColKeys);
                          if (e.target.checked) next.add(col.key);
                          else next.delete(col.key);
                          setVisibleColKeys(next);
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Rows Per Page */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-300 rounded-lg px-2 py-1 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-3 w-12 text-center text-slate-400">#</th>
                <th className="py-3 px-3 min-w-[180px] sticky left-0 bg-slate-100 z-10 shadow-r">
                  Case / Candidate
                </th>
                <th className="py-3 px-3 min-w-[110px]">Status</th>

                {/* Visible dynamic columns */}
                {headers
                  .filter((col) => visibleColKeys.has(col.key) && col.key !== candidateNameCol?.key)
                  .map((col) => {
                    const isSorted = sortState?.columnKey === col.key;
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleToggleSort(col.key)}
                        className="py-3 px-3 min-w-[140px] cursor-pointer hover:bg-slate-200/60 select-none transition-colors"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate" title={col.label}>
                            {col.label}
                          </span>
                          <span className="text-slate-400 shrink-0">
                            {isSorted ? (
                              sortState.direction === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            )}
                          </span>
                        </div>
                      </th>
                    );
                  })}

                {/* Action column */}
                <th className="py-3 px-3 text-right sticky right-0 bg-slate-100 z-10 min-w-[200px]">
                  Case Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedCandidates.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColKeys.size + 4}
                    className="py-16 text-center text-slate-400"
                  >
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                        <IconHeader className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-slate-700">
                        {globalSearch ? 'No matching records found' : `No ${statusType} cases currently in database`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {globalSearch
                          ? 'Try modifying your search keywords or clear the filter.'
                          : `When records are marked as ${statusType}, they will automatically appear here.`}
                      </p>
                      {globalSearch && (
                        <button
                          type="button"
                          onClick={() => setGlobalSearch('')}
                          className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCandidates.map((cand, idx) => {
                  const candName = getCandidateName(cand);
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={cand.__id}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* Row counter */}
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {rowNumber}
                      </td>

                      {/* Sticky Candidate Identity */}
                      <td className="py-3 px-3 sticky left-0 bg-white group-hover:bg-blue-50/40 z-10 border-r border-slate-100">
                        <div className="flex flex-col min-w-0">
                          <button
                            type="button"
                            onClick={() => onSelectCandidate(cand)}
                            className="font-bold text-slate-900 hover:text-blue-600 text-left truncate flex items-center gap-1.5"
                            title={candName}
                          >
                            <span>{candName}</span>
                          </button>
                          {cand.subRecords && cand.subRecords.length > 0 && (
                            <span className="text-[10px] text-blue-600 font-medium">
                              {cand.subRecords.length} sub-records / action points
                            </span>
                          )}
                          {cand.transferDetails && (
                            <span className="text-[10px] text-indigo-600 truncate" title={cand.transferDetails}>
                              Route: {cand.transferDetails}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[10px] border ${pageMeta.badgeColor}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{cand.caseStatus}</span>
                        </span>
                      </td>

                      {/* Dynamic columns */}
                      {headers
                        .filter((col) => visibleColKeys.has(col.key) && col.key !== candidateNameCol?.key)
                        .map((col) => {
                          const val = cand[col.key];
                          const formatted = formatCellValue(val, col.type);

                          return (
                            <td
                              key={col.key}
                              className="py-3 px-3 text-slate-700 max-w-xs truncate cursor-pointer hover:bg-slate-100/60"
                              onClick={() =>
                                setInspectedCell({
                                  colLabel: col.label,
                                  value: val,
                                  candidateName: candName,
                                })
                              }
                              title="Click to inspect full cell contents"
                            >
                              {formatted || <span className="text-slate-300 italic">-</span>}
                            </td>
                          );
                        })}

                      {/* Case Actions */}
                      <td className="py-3 px-3 text-right sticky right-0 bg-white group-hover:bg-blue-50/40 z-10 border-l border-slate-100">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Profile */}
                          <button
                            type="button"
                            onClick={() => onSelectCandidate(cand)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Actions for Pending Page */}
                          {statusType === 'Pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => openTransitionModal(cand, 'Disposed')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors"
                                title="Mark as Done / Disposed"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Dispose</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openTransitionModal(cand, 'Transferred')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors"
                                title="Transfer case to another department/authority"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                <span>Transfer</span>
                              </button>
                            </>
                          )}

                          {/* Actions for Transfer Page */}
                          {statusType === 'Transferred' && (
                            <>
                              <button
                                type="button"
                                onClick={() => openTransitionModal(cand, 'Pending')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition-colors"
                                title="Revert back to Pending"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>To Pending</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openTransitionModal(cand, 'Disposed')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors"
                                title="Mark as Disposed / Resolved"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Dispose</span>
                              </button>
                            </>
                          )}

                          {/* Actions for Disposed Page */}
                          {statusType === 'Disposed' && (
                            <>
                              <button
                                type="button"
                                onClick={() => openTransitionModal(cand, 'Pending')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition-colors"
                                title="Reopen case back to Pending"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reopen</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openTransitionModal(cand, 'Transferred')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors"
                                title="Transfer case"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                <span>Transfer</span>
                              </button>
                            </>
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

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-900">
              {totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-900">
              {Math.min(currentPage * pageSize, totalRecords)}
            </span>{' '}
            of <span className="font-semibold text-slate-900">{totalRecords}</span> {statusType.toLowerCase()} cases
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 bg-white border border-slate-300 rounded-lg font-medium text-slate-800">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* STATUS TRANSITION CONFIRMATION MODAL */}
      {transitionModal.isOpen && transitionModal.candidate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  {transitionModal.targetStatus === 'Pending' ? (
                    <Clock className="w-6 h-6 text-amber-600" />
                  ) : transitionModal.targetStatus === 'Transferred' ? (
                    <ArrowLeftRight className="w-6 h-6 text-indigo-600" />
                  ) : (
                    <Archive className="w-6 h-6 text-emerald-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Confirm Case Status Transition
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update lifecycle status for {getCandidateName(transitionModal.candidate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Current Status:</span>
                <span className="font-semibold text-slate-800">
                  {transitionModal.candidate.caseStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">New Status:</span>
                <span className="font-bold text-blue-600 text-sm">
                  {transitionModal.targetStatus}
                </span>
              </div>
            </div>

            {/* If transferring, prompt destination */}
            {transitionModal.targetStatus === 'Transferred' && (
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-slate-700 block">
                  Transfer Destination / Authority:
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={transitionModal.transferDestination}
                    onChange={(e) =>
                      setTransitionModal((prev) => ({
                        ...prev,
                        transferDestination: e.target.value,
                      }))
                    }
                    placeholder="e.g. Sports Authority of India / Inter-University Board"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Optional remarks */}
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700 block">
                Transition Remarks / Reason (Optional):
              </label>
              <textarea
                value={transitionModal.remarks}
                onChange={(e) =>
                  setTransitionModal((prev) => ({
                    ...prev,
                    remarks: e.target.value,
                  }))
                }
                rows={2}
                placeholder="Add audit note or explanation for this status change..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() =>
                  setTransitionModal({
                    isOpen: false,
                    candidate: null,
                    targetStatus: 'Pending',
                    remarks: '',
                    transferDestination: '',
                  })
                }
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTransition}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/30 transition-colors"
              >
                Confirm & Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CELL INSPECTOR MODAL */}
      {inspectedCell && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                  Cell Inspection
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {inspectedCell.colLabel}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectedCell(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Record: <span className="font-semibold text-slate-800">{inspectedCell.candidateName}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 break-words whitespace-pre-wrap max-h-60 overflow-y-auto">
              {inspectedCell.value !== null && inspectedCell.value !== undefined
                ? String(inspectedCell.value)
                : '<Empty / Blank>'}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedCell(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
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
