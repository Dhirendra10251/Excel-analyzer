import React from 'react';
import {
  LayoutDashboard,
  Table,
  UserRoundSearch,
  Clock,
  ArrowLeftRight,
  Archive,
  Columns3,
  ChartNoAxesCombined,
  Layers,
} from 'lucide-react';
import { ActiveTab, SheetStats } from '../types/spreadsheet';

interface SidebarNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  recordCount: number;
  stats?: SheetStats;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onTabChange,
  recordCount,
  stats,
}) => {
  const pendingCount = stats?.pendingCasesCount ?? 0;
  const transferCount = stats?.transferCasesCount ?? 0;
  const disposedCount = stats?.disposedCasesCount ?? 0;

  const workspaceItems: {
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'explorer',
      label: 'Data Explorer',
      icon: Table,
      badge: recordCount > 0 ? recordCount : undefined,
    },
    { id: 'search', label: 'Candidate Search', icon: UserRoundSearch },
    {
      id: 'pending',
      label: 'Pending Cases',
      icon: Clock,
      badge: pendingCount,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'transfer',
      label: 'Transfer Cases',
      icon: ArrowLeftRight,
      badge: transferCount,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'disposed',
      label: 'Disposed Cases',
      icon: Archive,
      badge: disposedCount,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
  ];

  const dataManagementItems: {
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
  }[] = [
    { id: 'columns', label: 'Column Information', icon: Columns3 },
    { id: 'insights', label: 'Data Insights', icon: ChartNoAxesCombined },
  ];

  return (
    <aside className="w-16 md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      <div className="flex-1 py-4 px-2 md:px-3 space-y-6 overflow-y-auto">
        {/* Workspace Navigation Section */}
        <div>
          <div className="px-3 pb-2 hidden md:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Workspace Navigation
            </p>
          </div>
          <nav className="space-y-1" aria-label="Workspace Navigation">
            {workspaceItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all text-left ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    className={`w-4.5 h-4.5 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span className="hidden md:inline truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`hidden md:inline-flex ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        isActive
                          ? 'bg-blue-700/80 text-white border-blue-500/50'
                          : item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Data Management Section */}
        <div>
          <div className="px-3 pb-2 hidden md:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Data Management
            </p>
          </div>
          <nav className="space-y-1" aria-label="Data Management Navigation">
            {dataManagementItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all text-left ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    className={`w-4.5 h-4.5 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span className="hidden md:inline truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Dataset quick summary footer */}
      <div className="p-3 hidden md:block border-t border-slate-800/80 m-2 rounded-xl bg-slate-800/50 text-slate-400 text-xs">
        <div className="flex items-center justify-between text-slate-300 text-[11px] font-medium mb-1">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            Case Pipeline
          </span>
          <span className="text-blue-400 font-semibold">{stats?.totalCases ?? 0}</span>
        </div>
        <div className="w-full bg-slate-700/60 h-1.5 rounded-full overflow-hidden flex">
          <div
            style={{
              width: `${
                stats?.totalCases
                  ? ((stats.pendingCasesCount || 0) / stats.totalCases) * 100
                  : 0
              }%`,
            }}
            className="bg-amber-400 h-full"
            title={`Pending: ${stats?.pendingCasesCount || 0}`}
          />
          <div
            style={{
              width: `${
                stats?.totalCases
                  ? ((stats.transferCasesCount || 0) / stats.totalCases) * 100
                  : 0
              }%`,
            }}
            className="bg-indigo-400 h-full"
            title={`Transferred: ${stats?.transferCasesCount || 0}`}
          />
          <div
            style={{
              width: `${
                stats?.totalCases
                  ? ((stats.disposedCasesCount || 0) / stats.totalCases) * 100
                  : 0
              }%`,
            }}
            className="bg-emerald-400 h-full"
            title={`Disposed: ${stats?.disposedCasesCount || 0}`}
          />
        </div>
      </div>
    </aside>
  );
};
