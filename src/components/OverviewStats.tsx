import React from 'react';
import {
  Users,
  Columns3,
  FileSpreadsheet,
  AlertTriangle,
  CopyCheck,
  UserCheck,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  GitBranch,
  Layers,
  Search,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { ActiveTab, ParsedWorkbook } from '../types/spreadsheet';

interface OverviewStatsProps {
  workbook: ParsedWorkbook;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenHeaderConfig: () => void;
  onOpenGroupingConfig: () => void;
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({
  workbook,
  onNavigateTab,
  onOpenHeaderConfig,
  onOpenGroupingConfig,
}) => {
  const activeSheet = workbook.sheets[workbook.activeSheetIndex];
  const { stats, headers, rows, candidates, headerConfig } = activeSheet;

  const formattedSize =
    workbook.fileSize > 1024 * 1024
      ? `${(workbook.fileSize / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(workbook.fileSize / 1024)} KB`;

  const kpiCards = [
    {
      title: 'Unique Parent Candidates',
      value: stats.totalRows.toLocaleString(),
      subtext: `${stats.physicalRowsCount} physical Excel rows recognized`,
      icon: Users,
      color: 'blue',
      highlight: true,
      action: { label: 'Grouping Rules', onClick: onOpenGroupingConfig },
    },
    {
      title: 'Total Columns',
      value: stats.totalColumns.toLocaleString(),
      subtext: `${headers.filter((h) => h.parentHeader).length} multi-level detected`,
      icon: Columns3,
      color: 'indigo',
      action: { label: 'Adjust Headers', onClick: onOpenHeaderConfig },
    },
    {
      title: 'Workflow Status',
      value: `${stats.completedCount} Done / ${stats.pendingCount} Pending`,
      subtext: stats.inProgressCount > 0 ? `${stats.inProgressCount} in progress` : 'Active pending management',
      icon: CheckCircle2,
      color: stats.pendingCount > 0 ? 'amber' : 'emerald',
      action: { label: 'Search Statuses', onClick: () => onNavigateTab('search') },
    },
    {
      title: 'Associated Sub-Records',
      value: stats.totalSubRecordsCount.toLocaleString(),
      subtext: 'Action points & child entries linked',
      icon: GitBranch,
      color: 'teal',
      action: { label: 'Inspect Tree', onClick: onOpenGroupingConfig },
    },
    {
      title: 'Missing Values',
      value: stats.missingValuesCount.toLocaleString(),
      subtext: `${stats.missingValuesRate}% empty cells across sheet`,
      icon: AlertTriangle,
      color: stats.missingValuesCount > 0 ? 'amber' : 'emerald',
    },
    {
      title: 'Possible Duplicates',
      value: stats.possibleDuplicateRows.toLocaleString(),
      subtext: stats.possibleDuplicateRows > 0 ? 'Flagged for inspection' : 'Zero duplicates detected',
      icon: CopyCheck,
      color: stats.possibleDuplicateRows > 0 ? 'rose' : 'emerald',
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200/80',
          badge: 'bg-blue-600 text-white',
          iconBg: 'bg-blue-100 text-blue-700',
        };
      case 'indigo':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          badge: 'bg-indigo-600 text-white',
          iconBg: 'bg-indigo-100 text-indigo-700',
        };
      case 'teal':
        return {
          bg: 'bg-teal-50 text-teal-700 border-teal-200/80',
          badge: 'bg-teal-600 text-white',
          iconBg: 'bg-teal-100 text-teal-700',
        };
      case 'amber':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
          badge: 'bg-amber-600 text-white',
          iconBg: 'bg-amber-100 text-amber-700',
        };
      case 'rose':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
          badge: 'bg-rose-600 text-white',
          iconBg: 'bg-rose-100 text-rose-700',
        };
      case 'emerald':
      default:
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          badge: 'bg-emerald-600 text-white',
          iconBg: 'bg-emerald-100 text-emerald-700',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-6 text-white shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                Active Analysis & Editing
              </span>
              <span className="text-xs text-slate-300">
                File: {workbook.fileName} ({formattedSize})
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {activeSheet.sheetName}
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Multi-row hierarchical grouping active: {stats.physicalRowsCount} physical Excel rows recognized as {candidates.length} unique candidates with {stats.totalSubRecordsCount} associated action points. All values are editable in Data Explorer.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <button
              type="button"
              onClick={() => onNavigateTab('search')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/30 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Candidates</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('explorer')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Data Explorer & Editing</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Statistics Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Workbook & Candidate Metrics</span>
          </h3>
          <span className="text-xs text-slate-500">Auto-calculated from raw and grouped cells</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpiCards.map((card, index) => {
            const Icon = card.icon;
            const classes = getColorClasses(card.color);
            return (
              <div
                key={card.title}
                className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-medium text-slate-500 block mb-1">
                        {index + 1}. {card.title}
                      </span>
                      <span className="text-2xl font-bold text-slate-900 tracking-tight block">
                        {card.value}
                      </span>
                    </div>
                    <div className={`p-2.5 rounded-xl ${classes.iconBg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="truncate max-w-[180px]" title={card.subtext}>
                    {card.subtext}
                  </span>
                  {card.action && (
                    <button
                      type="button"
                      onClick={card.action.onClick}
                      className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold"
                    >
                      {card.action.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Discovered Columns & Data Integrity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Discovered Column Structure</h4>
              <p className="text-xs text-slate-500">All {headers.length} columns detected, dynamically typed and editable</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('columns')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              <span>View Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {headers.map((h, i) => (
              <div
                key={h.key}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 text-slate-400 font-mono text-[11px]">{i + 1}.</span>
                  <span className="font-medium text-slate-800 truncate" title={h.label}>
                    {h.label}
                  </span>
                  {h.isIdentityColumn && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/50">
                      Identity
                    </span>
                  )}
                  {h.isSubRecordColumn && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/50">
                      Sub-Record
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                      h.type === 'number'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : h.type === 'date'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {h.type}
                  </span>
                  <span className="text-slate-400 text-[11px] hidden md:inline">
                    {h.nonBlankCount}/{h.totalCount} filled
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editing & Data Protection */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Safety & Edit Controls</h4>
              <p className="text-xs text-slate-500">Non-destructive editing with separate working copy</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
              <span className="font-semibold text-slate-800 block">Original Dataset Preserved</span>
              <p className="text-[11px] text-slate-500">
                You can export either the original unedited file or the updated dataset with all changes.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
              <span className="font-semibold text-slate-800 block">Pending to Done Workflow</span>
              <p className="text-[11px] text-slate-500">
                Quick 1-click status toggling automatically recalculates dashboard metrics and filter lists.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
              <span className="font-semibold text-slate-800 block">Local Persistence</span>
              <p className="text-[11px] text-slate-500">
                Your editing progress stays safe in local browser storage across page reloads.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
