import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  FileText,
  Sheet,
  FileCheck2,
  GitBranch,
  Sparkles,
  Layers,
} from 'lucide-react';
import { ExportType, ParsedWorkbook } from '../types/spreadsheet';
import { exportDataset } from '../utils/excelParser';
import { downloadActionPointsFile, downloadSampleAiuFile } from '../utils/sampleData';

interface HeaderProps {
  workbook: ParsedWorkbook | null;
  onOpenUpload: () => void;
  onOpenHeaderConfig: () => void;
  onOpenGroupingConfig: () => void;
  onReset: () => void;
  onLoadSample: () => void;
  onLoadActionPointsSample: () => void;
  onSelectSheet: (index: number) => void;
  isModified?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  workbook,
  onOpenUpload,
  onOpenHeaderConfig,
  onOpenGroupingConfig,
  onReset,
  onLoadSample,
  onLoadActionPointsSample,
  onSelectSheet,
  isModified,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSampleMenu, setShowSampleMenu] = useState(false);
  const activeSheet = workbook ? workbook.sheets[workbook.activeSheetIndex] : null;

  const handleExport = (format: 'xlsx' | 'csv', type: ExportType) => {
    if (!activeSheet || !workbook) return;

    const sourceRows =
      type === 'original' && workbook.originalSheets && workbook.originalSheets[workbook.activeSheetIndex]
        ? workbook.originalSheets[workbook.activeSheetIndex].rows
        : activeSheet.rows;

    exportDataset(
      sourceRows,
      activeSheet.headers,
      format,
      workbook.fileName,
      type,
      activeSheet.candidates
    );
    setShowExportMenu(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                  SheetScout
                </h1>
                <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-full">
                  Pro Analyzer
                </span>
                {isModified && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-300 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Edited
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Editable Excel & Multi-Row Candidate Analyzer
              </p>
            </div>
          </div>

          {/* Active File & Sheet Context */}
          {workbook && activeSheet && (
            <div className="hidden md:flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <div
                className="flex items-center gap-1.5 text-slate-700 font-medium max-w-[180px] truncate"
                title={workbook.fileName}
              >
                <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">{workbook.fileName}</span>
              </div>
              <div className="h-3.5 w-px bg-slate-300" />
              {/* Sheet selector */}
              {workbook.sheetNames.length > 1 ? (
                <div className="relative">
                  <select
                    value={workbook.activeSheetIndex}
                    onChange={(e) => onSelectSheet(Number(e.target.value))}
                    className="bg-transparent font-medium text-blue-700 cursor-pointer pr-4 focus:outline-none"
                    aria-label="Active worksheet"
                  >
                    {workbook.sheetNames.map((name, idx) => (
                      <option key={name} value={idx}>
                        {name} ({workbook.sheets[idx]?.candidates.length || 0} candidates)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-slate-500">
                  <Sheet className="w-3 h-3 text-emerald-600" />
                  <span>{activeSheet.sheetName}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Sample Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSampleMenu(!showSampleMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Choose sample datasets"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Samples</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showSampleMenu && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-medium text-slate-700"
                  onMouseLeave={() => setShowSampleMenu(false)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onLoadSample();
                      setShowSampleMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-50 border-b border-slate-100"
                  >
                    <div className="font-semibold text-slate-900">AIU(TABLE TENNIS).xlsx</div>
                    <div className="text-[11px] text-slate-500">
                      15 columns, multi-level headers, 5 candidates
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onLoadActionPointsSample();
                      setShowSampleMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-50 border-b border-slate-100"
                  >
                    <div className="font-semibold text-blue-700 flex items-center gap-1">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>Multi-Row Action Points (Person A)</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Person A spread over 2 rows + 2 action points + status
                    </div>
                  </button>
                  <div className="p-2 bg-slate-50 text-[10px] text-slate-400 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        downloadSampleAiuFile();
                        setShowSampleMenu(false);
                      }}
                      className="block text-blue-600 hover:underline"
                    >
                      Download AIU(TABLE TENNIS).xlsx
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadActionPointsFile();
                        setShowSampleMenu(false);
                      }}
                      className="block text-blue-600 hover:underline"
                    >
                      Download Action_Points_Refunds.xlsx
                    </button>
                  </div>
                </div>
              )}
            </div>

            {workbook && (
              <>
                {/* Grouping Configuration Button */}
                <button
                  type="button"
                  onClick={onOpenGroupingConfig}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs"
                  title="Multi-row parent-child grouping preview & editor"
                >
                  <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden lg:inline">Grouping</span>
                </button>

                {/* Header Configuration Button */}
                <button
                  type="button"
                  onClick={onOpenHeaderConfig}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs"
                  title="Configure multi-level header rows and data start"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden lg:inline">Headers</span>
                </button>

                {/* 5-Mode Export Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs"
                    aria-expanded={showExportMenu}
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Export</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {showExportMenu && (
                    <div
                      className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-medium text-slate-700 divide-y divide-slate-100"
                      onMouseLeave={() => setShowExportMenu(false)}
                    >
                      <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Standard Formats
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExport('xlsx', 'updated')}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">1. Export Updated Data</div>
                          <div className="text-[10px] text-slate-400">Includes all user edits and changes</div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">.xlsx</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExport('csv', 'updated')}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">2. Export Updated Data (CSV)</div>
                          <div className="text-[10px] text-slate-400">Repeats parent columns for sub-rows</div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">.csv</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExport('xlsx', 'original')}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">3. Export Original Data</div>
                          <div className="text-[10px] text-slate-400">Original unedited imported file</div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">.xlsx</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExport('xlsx', 'normalized')}
                        className="w-full px-4 py-2 text-left hover:bg-blue-50 text-blue-900 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-blue-700">4. Export Normalized Tables</div>
                          <div className="text-[10px] text-blue-600">Candidate + SubRecords sheets</div>
                        </div>
                        <span className="text-[10px] font-mono text-blue-700">.xlsx</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onReset}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Reset & close current workbook"
                  aria-label="Reset workbook"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm shadow-blue-500/30"
            >
              <Upload className="w-4 h-4" />
              <span>{workbook ? 'Upload New' : 'Upload File'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
