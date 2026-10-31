import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  AlertCircle,
  CopyCheck,
  CheckCircle2,
  Building,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { SheetData } from '../types/spreadsheet';

interface DataInsightsProps {
  sheet: SheetData;
}

const PALETTE = ['#2563eb', '#4f46e5', '#0d9488', '#d97706', '#e11d48', '#7c3aed', '#059669'];

export const DataInsights: React.FC<DataInsightsProps> = ({ sheet }) => {
  const { headers, rows, stats } = sheet;

  // Identify categorical columns suitable for charts (e.g. College, Course, Class, Remarks)
  const candidateCharts = headers.filter((h) => {
    return h.categories && h.categories.length > 1 && h.categories.length <= 15;
  });

  // Specifically pick College, Course, and Class if present
  const collegeCol = headers.find((h) => {
    const l = h.label.toLowerCase();
    return (l.includes('college') || l.includes('institute')) && h.categories;
  });

  const courseCol = headers.find((h) => {
    const l = h.label.toLowerCase();
    return (l.includes('course') && !l.includes('first admission')) && h.categories;
  });

  const classCol = headers.find((h) => {
    const l = h.label.toLowerCase();
    return (l.includes('class') || l.includes('sem')) && h.categories;
  });

  // Missing values by column for completeness ranking
  const completenessData = headers
    .map((h) => ({
      name: h.label.length > 20 ? `${h.label.slice(0, 18)}...` : h.label,
      fullName: h.label,
      filled: h.nonBlankCount,
      missing: h.blankCount,
      percentage: Math.round((h.nonBlankCount / Math.max(h.totalCount, 1)) * 100),
    }))
    .sort((a, b) => a.percentage - b.percentage);

  // Duplicate candidate rows inspection list (if any)
  const duplicateRows = rows.filter((r) => stats.duplicateRowIds.has(r.__id));

  return (
    <div className="space-y-6">
      {/* Insights Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Data Insights & Visual Analytics
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Visualizing data distributions, candidate breakdowns by institution/program, completeness audit, and duplicate flags.
        </p>
      </div>

      {/* Grid of Dynamic Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: College / Institution Distribution */}
        {collegeCol && collegeCol.categories && collegeCol.categories.length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span>Candidates by {collegeCol.label}</span>
                </h3>
                <p className="text-xs text-slate-500">Participant representation across colleges</p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={collegeCol.categories} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis
                    dataKey="value"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {/* Chart 2: Course / Program Distribution */}
        {courseCol && courseCol.categories && courseCol.categories.length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Candidates by {courseCol.label}</span>
                </h3>
                <p className="text-xs text-slate-500">Enrolled degree programs and courses</p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={courseCol.categories}
                    dataKey="count"
                    nameKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {courseCol.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    layout="horizontal"
                    verticalAlign="bottom"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {/* Chart 3: Class / Semester Distribution */}
        {classCol && classCol.categories && classCol.categories.length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-teal-600" />
                  <span>Distribution by {classCol.label}</span>
                </h3>
                <p className="text-xs text-slate-500">Breakdown by current semester / academic year</p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classCol.categories} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <XAxis dataKey="value" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {/* Fallback general categorical chart if specific ones aren't available */}
        {candidateCharts.length > 0 && !collegeCol && !courseCol && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Distribution: {candidateCharts[0].label}
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={candidateCharts[0].categories} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="value" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Completeness / Missing Values Ranking */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Column Completeness Audit</span>
              </h3>
              <p className="text-xs text-slate-500">Filled vs blank value percentages across columns</p>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {completenessData.map((item) => (
              <div key={item.fullName} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 truncate max-w-[200px]" title={item.fullName}>
                    {item.fullName}
                  </span>
                  <span className="font-mono text-slate-500 text-[11px]">
                    {item.filled}/{item.filled + item.missing} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full ${
                      item.percentage === 100
                        ? 'bg-emerald-500'
                        : item.percentage > 70
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Duplicate Candidates Review Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CopyCheck className={`w-5 h-5 ${stats.possibleDuplicateRows > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Duplicate Analysis & Verification
              </h3>
              <p className="text-xs text-slate-500">
                {stats.possibleDuplicateRows > 0
                  ? `${stats.possibleDuplicateRows} records have matching attributes and are flagged for review.`
                  : 'Zero duplicate records detected. All records have distinct attribute profiles.'}
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              stats.possibleDuplicateRows > 0
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {stats.possibleDuplicateRows > 0 ? `${stats.possibleDuplicateRows} Flagged` : 'Clean Dataset'}
          </span>
        </div>

        {stats.possibleDuplicateRows > 0 && (
          <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <p className="font-semibold">Safety Notice:</p>
            <p className="text-[11px] text-amber-800">
              SheetScout never deletes or alters records automatically. You can inspect flagged records in the Data Explorer or Candidate Search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
