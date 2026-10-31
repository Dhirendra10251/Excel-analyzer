import React, { useState } from 'react';
import { X, SlidersHorizontal, Eye, Check, AlertCircle } from 'lucide-react';
import { HeaderConfig, ParsedWorkbook } from '../types/spreadsheet';
import { buildColumnDefinitions, buildHierarchicalEntities, calculateSheetStats } from '../utils/excelParser';

interface HeaderConfigModalProps {
  workbook: ParsedWorkbook;
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (updatedWorkbook: ParsedWorkbook) => void;
}

export const HeaderConfigModal: React.FC<HeaderConfigModalProps> = ({
  workbook,
  isOpen,
  onClose,
  onSaveConfig,
}) => {
  if (!isOpen) return null;

  const currentSheet = workbook.sheets[workbook.activeSheetIndex];
  const { rawMatrix, headerConfig } = currentSheet;

  // Local state for header selection (0-indexed)
  const [headerStart, setHeaderStart] = useState<number>(headerConfig.headerRowStart);
  const [headerEnd, setHeaderEnd] = useState<number>(headerConfig.headerRowEnd);
  const [dataStart, setDataStart] = useState<number>(headerConfig.dataRowStart);

  // Generate preview of columns based on selected rows
  const preview = React.useMemo(() => {
    const config: HeaderConfig = {
      headerRowStart: headerStart,
      headerRowEnd: Math.max(headerStart, headerEnd),
      dataRowStart: Math.max(headerEnd + 1, dataStart),
    };
    try {
      const { columns } = buildColumnDefinitions(rawMatrix, config);
      return { columns, error: null };
    } catch (err: any) {
      return { columns: [], error: err.message || 'Error parsing headers' };
    }
  }, [rawMatrix, headerStart, headerEnd, dataStart]);

  const handleApply = () => {
    const config: HeaderConfig = {
      headerRowStart: headerStart,
      headerRowEnd: Math.max(headerStart, headerEnd),
      dataRowStart: Math.max(headerEnd + 1, dataStart),
    };

    const { columns } = buildColumnDefinitions(rawMatrix, config);
    const { candidates, flatRows, groupingConfig } = buildHierarchicalEntities(
      rawMatrix,
      columns,
      config.dataRowStart
    );
    const stats = calculateSheetStats(flatRows, columns, candidates);

    const updatedSheets = [...workbook.sheets];
    updatedSheets[workbook.activeSheetIndex] = {
      ...currentSheet,
      headers: columns,
      rows: flatRows,
      candidates,
      stats,
      headerConfig: config,
      groupingConfig,
    };

    onSaveConfig({
      ...workbook,
      sheets: updatedSheets,
    });
    onClose();
  };

  // Preview first 8 rows of raw matrix for visual selection
  const previewRows = rawMatrix.slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-white">Header & Row Configuration</h3>
              <p className="text-xs text-slate-400">
                Worksheet: <span className="text-blue-300 font-semibold">{currentSheet.sheetName}</span> • Adjust multi-level headings and starting data row
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <label htmlFor="headerStartRowInput" className="block font-bold text-slate-700 mb-1">
                Header Start Row:
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="headerStartRowInput"
                  type="number"
                  min={1}
                  max={Math.min(rawMatrix.length, 10)}
                  value={headerStart + 1}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) - 1);
                    setHeaderStart(val);
                    if (val > headerEnd) setHeaderEnd(val);
                    if (val >= dataStart) setDataStart(val + 1);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-center font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Row containing parent headings</p>
            </div>

            <div>
              <label htmlFor="headerEndRowInput" className="block font-bold text-slate-700 mb-1">
                Header End Row:
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="headerEndRowInput"
                  type="number"
                  min={headerStart + 1}
                  max={Math.min(rawMatrix.length, 12)}
                  value={headerEnd + 1}
                  onChange={(e) => {
                    const val = Math.max(headerStart, Number(e.target.value) - 1);
                    setHeaderEnd(val);
                    if (val >= dataStart) setDataStart(val + 1);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-center font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Same as start for single row headers</p>
            </div>

            <div>
              <label htmlFor="firstDataRowInput" className="block font-bold text-slate-700 mb-1">
                First Data Row:
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="firstDataRowInput"
                  type="number"
                  min={headerEnd + 2}
                  max={Math.min(rawMatrix.length, 20)}
                  value={dataStart + 1}
                  onChange={(e) => {
                    const val = Math.max(headerEnd + 1, Number(e.target.value) - 1);
                    setDataStart(val);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-center font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">First row containing actual candidate data</p>
            </div>
          </div>

          {/* Visual Row Matrix Selector */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Raw Sheet Preview (Top 10 Rows)</span>
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-x-auto text-[11px] max-h-56">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-600 font-mono">
                  <tr>
                    <th className="p-2 border-r border-b border-slate-200 text-center w-16">Row</th>
                    <th className="p-2 border-r border-b border-slate-200 text-center w-28">Type</th>
                    {rawMatrix[0]?.map((_, colIdx) => (
                      <th key={colIdx} className="p-2 border-r border-b border-slate-200 whitespace-nowrap">
                        Col {colIdx + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {previewRows.map((row, rIdx) => {
                    const isHeader = rIdx >= headerStart && rIdx <= headerEnd;
                    const isData = rIdx === dataStart;

                    return (
                      <tr
                        key={rIdx}
                        className={
                          isHeader
                            ? 'bg-blue-50/80 font-bold text-blue-900'
                            : isData
                            ? 'bg-emerald-50/80 text-emerald-900'
                            : 'hover:bg-slate-50 text-slate-600'
                        }
                      >
                        <td className="p-2 text-center border-r border-slate-200 font-bold">
                          {rIdx + 1}
                        </td>
                        <td className="p-2 text-center border-r border-slate-200 text-[10px]">
                          {isHeader && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-200 text-blue-800 font-sans font-semibold">
                              Header
                            </span>
                          )}
                          {isData && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800 font-sans font-semibold">
                              Data Start
                            </span>
                          )}
                          {!isHeader && !isData && (
                            <span className="text-slate-400 font-sans">Data / Skip</span>
                          )}
                        </td>
                        {row?.map((cell: any, cIdx: number) => (
                          <td
                            key={cIdx}
                            className="p-2 border-r border-slate-100 whitespace-nowrap max-w-[160px] truncate"
                          >
                            {cell === null || cell === undefined ? '' : String(cell)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resulting Column Headers Preview */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Discovered Columns ({preview.columns.length})
            </h4>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
              {preview.columns.map((col, idx) => (
                <span
                  key={col.key}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-medium"
                >
                  <span className="font-mono text-slate-400 mr-1 text-[10px]">{idx + 1}.</span>
                  {col.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Click Apply to re-parse columns and update all analyzer views immediately.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              Apply Header Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
