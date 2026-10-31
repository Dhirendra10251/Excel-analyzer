import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileCheck2,
  AlertCircle,
  X,
  Download,
  FileText,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import { ParsedWorkbook } from '../types/spreadsheet';
import { parseFile } from '../utils/excelParser';
import {
  downloadActionPointsFile,
  downloadSampleAiuFile,
  getActionPointsSampleWorkbook,
  getSampleWorkbook,
} from '../utils/sampleData';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkbookLoaded: (wb: ParsedWorkbook) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onWorkbookLoaded,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setError(null);
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setError('Unsupported file type. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    try {
      setIsProcessing(true);
      const parsed = await parseFile(file);
      setIsProcessing(false);
      onWorkbookLoaded(parsed);
      onClose();
    } catch (err: any) {
      setIsProcessing(false);
      setError(`Failed to read spreadsheet: ${err.message || 'Corrupted or unreadable format'}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleLoadSample = (sampleType: 'aiu' | 'action_points') => {
    setIsProcessing(true);
    setTimeout(() => {
      const sample =
        sampleType === 'aiu' ? getSampleWorkbook() : getActionPointsSampleWorkbook();
      setIsProcessing(false);
      onWorkbookLoaded(sample);
      onClose();
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Spreadsheet</h3>
              <p className="text-xs text-slate-500">Excel (.xlsx, .xls) or Comma Separated (.csv)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Upload Error</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Drag & Drop Target Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
            isDragging
              ? 'border-blue-600 bg-blue-50/70 scale-[1.01]'
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80 bg-slate-50/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
            <Upload className="w-7 h-7" />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800">
              {isDragging ? 'Drop your spreadsheet here' : 'Click to browse or drag and drop your spreadsheet'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports multi-row parent-child grouping, merged headers, serial numbers, and leading zeros
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 text-[11px] font-semibold text-slate-600">
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200">.XLSX</span>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200">.XLS</span>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200">.CSV</span>
          </div>
        </div>

        {/* Sample Datasets Quick Loaders */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Pre-Built Test Datasets</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* AIU Sample */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
              <div>
                <strong className="block font-semibold text-slate-900">AIU Table Tennis</strong>
                <p className="text-[11px] text-slate-500">
                  15 columns, multi-level headers, 5 sports candidates
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleLoadSample('aiu')}
                  className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold text-center"
                >
                  Load Dataset
                </button>
                <button
                  type="button"
                  onClick={downloadSampleAiuFile}
                  className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg"
                  title="Download .xlsx"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Multi-Row Action Points Sample */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
              <div>
                <strong className="block font-semibold text-blue-900 flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                  <span>Action Points & Refunds</span>
                </strong>
                <p className="text-[11px] text-slate-500">
                  Person A spanning 2 rows with Action Points & Pending status
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleLoadSample('action_points')}
                  className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold text-center"
                >
                  Load Dataset
                </button>
                <button
                  type="button"
                  onClick={downloadActionPointsFile}
                  className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg"
                  title="Download .xlsx"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
