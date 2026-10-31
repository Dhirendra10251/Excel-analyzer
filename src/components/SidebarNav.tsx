import React from 'react';
import {
  LayoutDashboard,
  Table,
  UserCheck,
  Columns3,
  BarChart3,
  Search,
} from 'lucide-react';
import { ActiveTab } from '../types/spreadsheet';

interface SidebarNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  recordCount: number;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onTabChange,
  recordCount,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'explorer', label: 'Data Explorer', icon: Table, badge: recordCount > 0 ? `${recordCount}` : undefined },
    { id: 'search', label: 'Candidate Search', icon: UserCheck },
    { id: 'columns', label: 'Column Information', icon: Columns3 },
    { id: 'insights', label: 'Data Insights', icon: BarChart3 },
  ];

  return (
    <aside className="w-16 md:w-60 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      <div className="p-3 md:p-4 border-b border-slate-800 hidden md:block">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Workspace Navigation
        </p>
      </div>

      <nav className="flex-1 py-3 px-2 md:px-3 space-y-1.5" aria-label="Main Navigation">
        {navItems.map((item) => {
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
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
              title={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="hidden md:inline truncate">{item.label}</span>
              {item.badge && (
                <span
                  className={`hidden md:inline-flex ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Search Tip */}
      <div className="p-3 hidden md:block border-t border-slate-800/80 m-2 rounded-xl bg-slate-800/40 text-slate-400 text-xs">
        <div className="flex items-center gap-2 mb-1 text-slate-300 font-medium">
          <Search className="w-3.5 h-3.5 text-blue-400" />
          <span>Universal Search</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Switch to <span className="text-blue-300 font-medium">Candidate Search</span> to search across all columns or use instant filters.
        </p>
      </div>
    </aside>
  );
};
