import React from 'react';
import {
  Layers,
  Clock,
  ArrowLeftRight,
  Archive,
  ArrowRight,
  Search,
  ShieldAlert,
  SlidersHorizontal,
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
  const { stats, headers, candidates } = activeSheet;

  const formattedSize =
    workbook.fileSize > 1024 * 1024
      ? `${(workbook.fileSize / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(workbook.fileSize / 1024)} KB`;

  // Exactly four primary dashboard metric cards as strictly required
  const caseMetricCards = [
    {
      id: 'total',
      title: 'Total Cases',
      count: stats?.totalCases ?? stats?.totalRows ?? candidates?.length ?? 0,
      subtext: 'Complete database of all records across statuses',
      targetTab: 'explorer' as ActiveTab,
      icon: Layers,
      color: 'blue',
      badgeText: 'All Cases',
    },
    {
      id: 'pending',
      title: 'Pending Cases',
      count: stats?.pendingCasesCount ?? stats?.pendingCount ?? 0,
      subtext: 'Awaiting action, verification, or marksheet review',
      targetTab: 'pending' as ActiveTab,
      icon: Clock,
      color: 'amber',
      badgeText: 'Active Pending',
    },
    {
      id: 'transfer',
      title: 'Transfer Cases',
      count: stats?.transferCasesCount ?? stats?.inProgressCount ?? 0,
      subtext: 'Escalated, forwarded, or routed to external authorities',
      targetTab: 'transfer' as ActiveTab,
      icon: ArrowLeftRight,
      color: 'indigo',
      badgeText: 'Transferred',
    },
    {
      id: 'disposed',
      title: 'Disposed Cases',
      count: stats?.disposedCasesCount ?? stats?.completedCount ?? 0,
      subtext: 'Completed, approved, verified, or closed matters',
      targetTab: 'disposed' as ActiveTab,
      icon: Archive,
      color: 'emerald',
      badgeText: 'Settled & Closed',
    },
  ];

  const getCardTheme = (color: string) => {
    switch (color) {
      case 'amber':
        return {
          border: 'border-amber-200/80 hover:border-amber-400',
          bg: 'bg-white hover:bg-amber-50/30',
          iconBg: 'bg-amber-100 text-amber-700',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          actionText: 'text-amber-700 hover:text-amber-900',
        };
      case 'indigo':
        return {
          border: 'border-indigo-200/80 hover:border-indigo-400',
          bg: 'bg-white hover:bg-indigo-50/30',
          iconBg: 'bg-indigo-100 text-indigo-700',
          badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          actionText: 'text-indigo-700 hover:text-indigo-900',
        };
      case 'emerald':
        return {
          border: 'border-emerald-200/80 hover:border-emerald-400',
          bg: 'bg-white hover:bg-emerald-50/30',
          iconBg: 'bg-emerald-100 text-emerald-700',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          actionText: 'text-emerald-700 hover:text-emerald-900',
        };
      case 'blue':
      default:
        return {
          border: 'border-blue-200/80 hover:border-blue-400',
          bg: 'bg-white hover:bg-blue-50/30',
          iconBg: 'bg-blue-100 text-blue-700',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          actionText: 'text-blue-700 hover:text-blue-900',
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
                Active Case Repository
              </span>
              <span className="text-xs text-slate-300">
                File: {workbook.fileName} ({formattedSize})
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {activeSheet.sheetName}
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Multi-row intelligent grouping active: {(stats?.physicalRowsCount ?? 0).toLocaleString()} physical Excel rows organized into{' '}
              {(candidates?.length ?? 0).toLocaleString()} candidate case records with {(stats?.totalSubRecordsCount ?? 0).toLocaleString()} associated sub-items.
              Select any case metric card below to open its dedicated view.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <button
              type="button"
              onClick={() => onNavigateTab('search')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/30 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Universal Search</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
            <button
              type="button"
              onClick={onOpenGroupingConfig}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              <span>Grouping Rules</span>
            </button>
          </div>
        </div>
      </div>

      {/* EXACTLY FOUR DASHBOARD METRIC CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Case Management Metrics</span>
          </h3>
          <span className="text-xs text-slate-500">
            Click any card to open the corresponding case management page
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {caseMetricCards.map((card, index) => {
            const Icon = card.icon;
            const theme = getCardTheme(card.color);

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onNavigateTab(card.targetTab)}
                className={`text-left rounded-xl p-5 border transition-all duration-150 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between group ${theme.bg} ${theme.border}`}
                aria-label={`Open ${card.title} - ${(card.count ?? 0).toLocaleString()} cases`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {index + 1}. {card.title}
                    </span>
                    <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-105 ${theme.iconBg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight block">
                      {(card.count ?? 0).toLocaleString()}
                    </span>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {card.subtext}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${theme.badge}`}
                  >
                    {card.badgeText}
                  </span>
                  <span
                    className={`font-semibold flex items-center gap-1 transition-transform group-hover:translate-x-0.5 ${theme.actionText}`}
                  >
                    <span>View Page</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
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
              <p className="text-xs text-slate-500">
                All {headers.length} columns detected, dynamically typed, and editable
              </p>
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
                    {h.nonBlankCount ?? 0}/{h.totalCount ?? 0} filled
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editing & Workflow Protection */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Case Workflow Management</h4>
              <p className="text-xs text-slate-500">Dynamic lifecycle across status stages</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
              <span className="font-semibold text-slate-800 block">Pending Cases</span>
              <p className="text-[11px] text-slate-500">
                Directly transition pending cases to Disposed or Transfer them with audit remarks.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
              <span className="font-semibold text-slate-800 block">Transfer Tracking</span>
              <p className="text-[11px] text-slate-500">
                Cases escalated to external authorities remain distinct and can be returned to Pending or settled.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
              <span className="font-semibold text-slate-800 block">Reopen Disposed Cases</span>
              <p className="text-[11px] text-slate-500">
                Closed cases can be reopened back to Pending at any time with a single confirmation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
