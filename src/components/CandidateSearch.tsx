import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  X,
  User,
  GraduationCap,
  Building2,
  Calendar,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  List,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  GitBranch,
} from 'lucide-react';
import { CandidateEntity, ColumnDef, DataRow, SheetData } from '../types/spreadsheet';
import { formatCellValue } from '../utils/excelParser';
import { togglePendingDone } from '../utils/dataManager';

interface CandidateSearchProps {
  sheet: SheetData;
  onSelectCandidate: (candidateRow: CandidateEntity) => void;
  onUpdateSheet?: (updatedSheet: SheetData) => void;
}

export const CandidateSearch: React.FC<CandidateSearchProps> = ({
  sheet,
  onSelectCandidate,
  onUpdateSheet,
}) => {
  const { headers, candidates } = sheet;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCollege, setSelectedCollege] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // Key candidate columns
  const nameCol = useMemo(() => {
    return (
      headers.find((h) => {
        const l = h.label.toLowerCase();
        return (
          (l.includes('name') && !l.includes('exam') && !l.includes('course') && !l.includes('action')) ||
          l.includes('candidate') ||
          l.includes('sportsperson') ||
          l.includes('student') ||
          l === 'name'
        );
      }) || headers[1] || headers[0]
    );
  }, [headers]);

  const panOrIdCol = useMemo(() => {
    return headers.find((h) => {
      const l = h.label.toLowerCase();
      return l.includes('pan') || l.includes('id') || l.includes('roll') || l.includes('reg');
    });
  }, [headers]);

  const fatherCol = useMemo(() => {
    return headers.find((h) => h.label.toLowerCase().includes('father'));
  }, [headers]);

  const collegeCol = useMemo(() => {
    return headers.find((h) => {
      const l = h.label.toLowerCase();
      return l.includes('college') || l.includes('institute') || l.includes('address') || l.includes('city');
    });
  }, [headers]);

  const courseCol = useMemo(() => {
    return headers.find((h) => {
      const l = h.label.toLowerCase();
      return (l.includes('present course') && !l.includes('first admission')) || l === 'course' || l.includes('amount');
    });
  }, [headers]);

  const dobCol = useMemo(() => {
    return headers.find((h) => {
      const l = h.label.toLowerCase();
      return l.includes('birth') || l.includes('dob');
    });
  }, [headers]);

  // Extract unique category options for dynamic facet filters
  const collegeOptions = useMemo(() => {
    if (!collegeCol) return [];
    const set = new Set<string>();
    candidates.forEach((c) => {
      const val = c[collegeCol.key];
      if (val) set.add(String(val).trim());
    });
    return Array.from(set).sort();
  }, [candidates, collegeCol]);

  const courseOptions = useMemo(() => {
    if (!courseCol) return [];
    const set = new Set<string>();
    candidates.forEach((c) => {
      const val = c[courseCol.key];
      if (val) set.add(String(val).trim());
    });
    return Array.from(set).sort();
  }, [candidates, courseCol]);

  // Dynamic search across BOTH parent fields and child sub-records!
  const searchResults = useMemo(() => {
    let result = [...candidates];

    // Filter by query
    if (searchQuery.trim()) {
      const terms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
      result = result.filter((cand) => {
        return terms.every((term) => {
          // Check parent fields
          const inParent = headers.some((col) => {
            const val = cand[col.key];
            if (val === null || val === undefined) return false;
            return String(val).toLowerCase().includes(term);
          });
          if (inParent) return true;

          // Check child sub-records (e.g. Action Points, descriptions, etc.)
          if (cand.subRecords && cand.subRecords.length > 0) {
            const inChild = cand.subRecords.some((sub) => {
              return Object.values(sub).some((val) => {
                if (val === null || val === undefined) return false;
                return String(val).toLowerCase().includes(term);
              });
            });
            if (inChild) return true;
          }

          return false;
        });
      });
    }

    // Status filter
    if (selectedStatus !== 'all') {
      result = result.filter((c) => {
        const st = (c.workflowStatus || '').toLowerCase();
        if (selectedStatus === 'pending') {
          return st.includes('pending') || st.includes('not verified');
        }
        if (selectedStatus === 'done' || selectedStatus === 'completed') {
          return st.includes('done') || st.includes('completed') || st.includes('verified') || st.includes('eligible');
        }
        if (selectedStatus === 'progress') {
          return st.includes('progress') || st.includes('review');
        }
        return st.includes(selectedStatus.toLowerCase());
      });
    }

    // Facet filters
    if (collegeCol && selectedCollege !== 'all') {
      result = result.filter((r) => String(r[collegeCol.key] || '').trim() === selectedCollege);
    }
    if (courseCol && selectedCourse !== 'all') {
      result = result.filter((r) => String(r[courseCol.key] || '').trim() === selectedCourse);
    }

    return result;
  }, [candidates, headers, searchQuery, selectedStatus, selectedCollege, selectedCourse, collegeCol, courseCol]);

  const resetSearch = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedCollege('all');
    setSelectedCourse('all');
  };

  const handleStatusToggle = (candidateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateSheet) {
      const updated = togglePendingDone(sheet, candidateId);
      onUpdateSheet(updated);
    }
  };

  const getAvatarBg = (name: string) => {
    const colors = [
      'bg-blue-600',
      'bg-indigo-600',
      'bg-teal-600',
      'bg-amber-600',
      'bg-rose-600',
      'bg-purple-600',
      'bg-emerald-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-5">
      {/* Search Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Universal Candidate & Record Search
          </h2>
          <p className="text-xs text-slate-500">
            Intelligently searches across both parent candidates and child sub-records (action points, descriptions, IDs, remarks).
          </p>
        </div>

        {/* Primary Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-blue-600" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates by name, PAN, action point description, college, status, or any detail..."
            className="w-full pl-11 pr-10 py-3 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium text-slate-900 shadow-inner"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700"
              aria-label="Clear candidate search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Facet Filters & Status Selector */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Faceted Filters:</span>
          </div>

          {/* Status Filter Dropdown / Pills */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filterStatusSelect" className="text-slate-500 text-[11px] font-medium">Status:</label>
            <select
              id="filterStatusSelect"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses ({candidates.length})</option>
              <option value="pending">Pending</option>
              <option value="done">Done / Completed</option>
              <option value="progress">In Progress</option>
            </select>
          </div>

          {/* College / Address Filter */}
          {collegeOptions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="filterCollegeSelect" className="text-slate-500 text-[11px] font-medium">Institution / Locality:</label>
              <select
                id="filterCollegeSelect"
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All ({collegeOptions.length})</option>
                {collegeOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Filters */}
          {(selectedStatus !== 'all' || selectedCollege !== 'all' || selectedCourse !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={resetSearch}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear filters</span>
            </button>
          )}

          {/* View mode toggle */}
          <div className="ml-auto flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md ${
                viewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs font-semibold' : 'text-slate-500'
              }`}
              title="Table view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md ${
                viewMode === 'cards' ? 'bg-white text-blue-600 shadow-2xs font-semibold' : 'text-slate-500'
              }`}
              title="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-900 font-bold">{searchResults.length}</strong> unique parent record{searchResults.length === 1 ? '' : 's'}
        </span>
        {searchQuery && (
          <span className="text-[11px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-200">
            Query: "{searchQuery}" (matched across parent & child rows)
          </span>
        )}
      </div>

      {/* Candidates Display: Table View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Candidate / Entity</th>
                  {panOrIdCol && <th className="py-3 px-4">{panOrIdCol.label}</th>}
                  {collegeCol && <th className="py-3 px-4">{collegeCol.label}</th>}
                  {courseCol && <th className="py-3 px-4">{courseCol.label}</th>}
                  <th className="py-3 px-4">Sub-Records / Actions</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right w-36 min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {searchResults.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No records match your search criteria.
                    </td>
                  </tr>
                ) : (
                  searchResults.map((cand) => {
                    const rawName =
                      cand.name ||
                      cand.name_of_sportsperson ||
                      cand[nameCol?.key] ||
                      `Candidate ${cand.__id}`;
                    const nameStr = String(rawName);
                    const initials = nameStr
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'C';

                    const currentStatus = cand.workflowStatus || 'Pending';
                    const isDone =
                      currentStatus.toLowerCase().includes('done') ||
                      currentStatus.toLowerCase().includes('completed') ||
                      currentStatus.toLowerCase().includes('verified') ||
                      currentStatus.toLowerCase().includes('eligible');

                    return (
                      <tr
                        key={cand.__id}
                        className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                        onClick={() => onSelectCandidate(cand)}
                      >
                        {/* Candidate Name with Avatar */}
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs ${getAvatarBg(
                                nameStr
                              )}`}
                            >
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {nameStr}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                Source Row{cand.__sourceRowNums.length > 1 ? 's' : ''}:{' '}
                                {cand.__sourceRowNums.join(', ')}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* ID / PAN Column */}
                        {panOrIdCol && (
                          <td className="py-3 px-4 font-mono text-slate-700">
                            {cand[panOrIdCol.key] || <span className="text-slate-300 italic">—</span>}
                          </td>
                        )}

                        {/* College / Address */}
                        {collegeCol && (
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]" title={String(cand[collegeCol.key] || '')}>
                                {cand[collegeCol.key] || '—'}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Course / Refund Amount */}
                        {courseCol && (
                          <td className="py-3 px-4 text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]" title={String(cand[courseCol.key] || '')}>
                                {cand[courseCol.key] || '—'}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Sub-records count & Action Points Preview */}
                        <td className="py-3 px-4">
                          {cand.subRecords && cand.subRecords.length > 0 ? (
                            <div className="space-y-1 max-w-xs">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200">
                                <GitBranch className="w-3 h-3" />
                                <span>{cand.subRecords.length} Action Point{cand.subRecords.length > 1 ? 's' : ''}</span>
                              </span>
                              <p className="text-[11px] text-slate-500 truncate" title={String(cand.subRecords[0]?.specific_action_points || cand.subRecords[0]?.action_point || '')}>
                                {String(cand.subRecords[0]?.specific_action_points || cand.subRecords[0]?.action_point || 'Details attached')}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Single entry</span>
                          )}
                        </td>

                        {/* Status with Quick Toggle Button */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleStatusToggle(cand.__id, e)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                              isDone
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                            }`}
                            title={`Click to mark as ${isDone ? 'Pending' : 'Done'}`}
                          >
                            {isDone ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Done</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Pending</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Action: View Full Profile */}
                        <td className="py-3 px-4 text-right whitespace-nowrap w-36 min-w-[140px]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCandidate(cand);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 transition-colors shadow-2xs"
                          >
                            <span>Full Profile</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Candidates Display: Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchResults.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              No candidates found matching your criteria.
            </div>
          ) : (
            searchResults.map((cand) => {
              const rawName =
                cand.name ||
                cand.name_of_sportsperson ||
                cand[nameCol?.key] ||
                `Candidate ${cand.__id}`;
              const nameStr = String(rawName);
              const initials = nameStr
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'C';

              const currentStatus = cand.workflowStatus || 'Pending';
              const isDone =
                currentStatus.toLowerCase().includes('done') ||
                currentStatus.toLowerCase().includes('completed') ||
                currentStatus.toLowerCase().includes('verified') ||
                currentStatus.toLowerCase().includes('eligible');

              return (
                <div
                  key={cand.__id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between group cursor-pointer"
                  onClick={() => onSelectCandidate(cand)}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm ${getAvatarBg(
                            nameStr
                          )}`}
                        >
                          {initials}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                            {nameStr}
                          </h3>
                          {panOrIdCol && cand[panOrIdCol.key] && (
                            <p className="text-xs font-mono text-slate-500">
                              {cand[panOrIdCol.key]}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleStatusToggle(cand.__id, e)}
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                          isDone
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {isDone ? 'Done' : 'Pending'}
                      </button>
                    </div>

                    {/* Meta Info */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                      {collegeCol && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate font-medium text-slate-800">
                            {cand[collegeCol.key] || 'Not Provided'}
                          </span>
                        </div>
                      )}
                      {courseCol && (
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {cand[courseCol.key] || 'Not Provided'}
                          </span>
                        </div>
                      )}
                      {cand.subRecords && cand.subRecords.length > 0 && (
                        <div className="flex items-center gap-2 text-blue-700">
                          <GitBranch className="w-3.5 h-3.5 shrink-0" />
                          <span>{cand.subRecords.length} Associated Action Points</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">
                      Rows {cand.__sourceRowNums.join(', ')}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCandidate(cand);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      <span>Full Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
