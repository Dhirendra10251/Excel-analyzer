import React, { useState } from 'react';
import {
  Columns3,
  Hash,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { ColumnDef, SheetData } from '../types/spreadsheet';

interface ColumnInfoViewerProps {
  sheet: SheetData;
}

export const ColumnInfoViewer: React.FC<ColumnInfoViewerProps> = ({ sheet }) => {
  const { headers, rows } = sheet;
  const [selectedColumnKey, setSelectedColumnKey] = useState<string>(headers[0]?.key || '');

  const selectedCol = headers.find((h) => h.key === selectedColumnKey) || headers[0];

  if (!selectedCol) {
    return <div className="p-8 text-center text-slate-500">No columns discovered in dataset.</div>;
  }

  const fillRate = selectedCol.totalCount > 0
    ? Math.round((selectedCol.nonBlankCount / selectedCol.totalCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Dynamic Column Information Panel
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Detailed metadata, data completeness, unique cardinality, and distribution analysis for any column in {sheet.sheetName}.
        </p>

        {/* Column Select Tabs / Pills */}
        <div className="mt-4 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
          {headers.map((col, idx) => {
            const isSelected = col.key === selectedCol.key;
            return (
              <button
                key={col.key}
                type="button"
                onClick={() => setSelectedColumnKey(col.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all truncate max-w-[220px] ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                }`}
                title={col.label}
              >
                <span className="opacity-60 mr-1.5 font-mono text-[10px]">{idx + 1}.</span>
                <span>{col.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Column Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Metadata Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Column #{selectedCol.colIndex + 1}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                Type: {selectedCol.type}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 break-words">{selectedCol.label}</h3>
            {selectedCol.parentHeader && (
              <p className="text-xs text-slate-500 mt-0.5">
                Parent Heading: <span className="font-semibold text-slate-700">{selectedCol.parentHeader}</span>
                {selectedCol.subHeader && ` • Sub: ${selectedCol.subHeader}`}
              </p>
            )}
          </div>

          {/* Completeness Bar */}
          <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700">Completeness Ratio</span>
              <span className="text-blue-600">{fillRate}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  fillRate > 80 ? 'bg-emerald-500' : fillRate > 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${fillRate}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-1">
              <span>{selectedCol.nonBlankCount} non-empty records</span>
              <span>{selectedCol.blankCount} blanks</span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/50">
              <span className="text-slate-500 text-[11px] block">Total Records</span>
              <span className="text-base font-bold text-slate-900">{selectedCol.totalCount}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/50">
              <span className="text-slate-500 text-[11px] block">Unique Values</span>
              <span className="text-base font-bold text-slate-900">{selectedCol.uniqueCount}</span>
            </div>
          </div>

          {/* Numeric or Date statistics if available */}
          {(selectedCol.min !== undefined || selectedCol.max !== undefined) && (
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/60 space-y-2 text-xs">
              <span className="font-semibold text-blue-900 block flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Value Bounds</span>
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-blue-700 block">Minimum:</span>
                  <strong className="text-blue-950 font-mono">{String(selectedCol.min)}</strong>
                </div>
                <div>
                  <span className="text-blue-700 block">Maximum:</span>
                  <strong className="text-blue-950 font-mono">{String(selectedCol.max)}</strong>
                </div>
              </div>
              {selectedCol.avg !== undefined && (
                <div className="pt-1 text-[11px] text-blue-800">
                  <span>Calculated Average: </span>
                  <strong className="font-mono text-blue-950">{selectedCol.avg}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Categories Frequency and Sample Values */}
        <div className="lg:col-span-2 space-y-6">
          {/* Categorical Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Value Distribution & Frequency</h4>
                <p className="text-xs text-slate-500">
                  {selectedCol.categories && selectedCol.categories.length > 0
                    ? `Frequency table for top distinct categories (${selectedCol.categories.length} categories)`
                    : 'Values are distinct or unique identifiers'}
                </p>
              </div>
            </div>

            {selectedCol.categories && selectedCol.categories.length > 0 ? (
              <div className="space-y-3">
                {selectedCol.categories.map((cat) => (
                  <div key={cat.value} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 truncate max-w-md" title={cat.value}>
                        {cat.value || '(Blank)'}
                      </span>
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="font-semibold text-slate-900">{cat.count}</span>
                        <span className="text-[11px] text-slate-400">({cat.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                This column contains mostly distinct or high-cardinality values (e.g. names or remarks).
              </div>
            )}
          </div>

          {/* Sample Values Preview */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Sample Discovered Values</h4>
            <div className="flex flex-wrap gap-2">
              {selectedCol.sampleValues.map((val, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 max-w-sm truncate"
                  title={String(val)}
                >
                  {String(val)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
