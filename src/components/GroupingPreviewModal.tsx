import React, { useState } from 'react';
import {
  X,
  GitBranch,
  Check,
  Split,
  Merge,
  Users,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { CandidateEntity, ParsedWorkbook, SheetData } from '../types/spreadsheet';
import { calculateSheetStats } from '../utils/excelParser';
import { syncFlatRows } from '../utils/dataManager';

interface GroupingPreviewModalProps {
  workbook: ParsedWorkbook;
  isOpen: boolean;
  onClose: () => void;
  onUpdateWorkbook: (updated: ParsedWorkbook) => void;
}

export const GroupingPreviewModal: React.FC<GroupingPreviewModalProps> = ({
  workbook,
  isOpen,
  onClose,
  onUpdateWorkbook,
}) => {
  if (!isOpen) return null;

  const currentSheet = workbook.sheets[workbook.activeSheetIndex];
  const { candidates, stats, headers } = currentSheet;

  // Local state copy of candidates to permit user split / merge operations
  const [localCandidates, setLocalCandidates] = useState<CandidateEntity[]>(() =>
    JSON.parse(JSON.stringify(candidates))
  );

  // Split a sub-record into an independent candidate
  const handleSeparateSubRecord = (candidateIndex: number, subIndex: number) => {
    const parent = localCandidates[candidateIndex];
    if (!parent || !parent.subRecords || !parent.subRecords[subIndex]) return;

    const sub = parent.subRecords[subIndex];
    const newCand: CandidateEntity = {
      ...sub,
      __id: `cand_separated_${Date.now()}`,
      __sourceRowNums: [sub.__sourceRowNum],
      workflowStatus: sub.status || parent.workflowStatus || 'Pending',
      subRecords: [],
      isEdited: true,
    };

    // Remove from parent
    const updatedParentSubs = parent.subRecords.filter((_, idx) => idx !== subIndex);
    const updatedCandidates = [...localCandidates];
    updatedCandidates[candidateIndex] = {
      ...parent,
      subRecords: updatedParentSubs,
    };
    updatedCandidates.splice(candidateIndex + 1, 0, newCand);

    setLocalCandidates(updatedCandidates);
  };

  // Merge candidate i with candidate i-1
  const handleAttachToPrevious = (index: number) => {
    if (index <= 0) return;
    const prev = localCandidates[index - 1];
    const curr = localCandidates[index];

    // Convert curr into a sub-record of prev
    const newSub = {
      ...curr,
      __id: `${prev.__id}_sub_${Date.now()}`,
      __sourceRowNum: curr.__sourceRowNums[0] || index + 1,
      status: curr.workflowStatus || prev.workflowStatus,
    };

    const combinedSubs = [...prev.subRecords, newSub, ...(curr.subRecords || [])];
    const updatedCandidates = [...localCandidates];
    updatedCandidates[index - 1] = {
      ...prev,
      subRecords: combinedSubs,
      __sourceRowNums: [...prev.__sourceRowNums, ...curr.__sourceRowNums],
    };
    updatedCandidates.splice(index, 1);

    setLocalCandidates(updatedCandidates);
  };

  const handleApply = () => {
    const updatedRows = syncFlatRows(localCandidates, headers);
    const updatedStats = calculateSheetStats(updatedRows, headers, localCandidates);

    const updatedSheets = [...workbook.sheets];
    updatedSheets[workbook.activeSheetIndex] = {
      ...currentSheet,
      candidates: localCandidates,
      rows: updatedRows,
      stats: updatedStats,
    };

    onUpdateWorkbook({
      ...workbook,
      sheets: updatedSheets,
      isModified: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Multi-Row Record Recognition & Grouping
              </h3>
              <p className="text-xs text-slate-400">
                Worksheet: <span className="text-blue-300 font-medium">{currentSheet.sheetName}</span> • Hierarchical Parent-Child Structure
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

        {/* Stats Summary Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-700">
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              <span>Physical Rows: <strong>{stats.physicalRowsCount}</strong></span>
            </div>
            <div className="h-4 w-px bg-slate-300" />
            <div className="flex items-center gap-1.5 text-blue-700">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Unique Parent Candidates: <strong>{localCandidates.length}</strong></span>
            </div>
            <div className="h-4 w-px bg-slate-300" />
            <div className="flex items-center gap-1.5 text-teal-700">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>
                Total Sub-Records / Action Points:{' '}
                <strong>{localCandidates.reduce((acc, c) => acc + (c.subRecords?.length || 0), 0)}</strong>
              </span>
            </div>
          </div>
          <span className="text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
            Intelligent continuation rules active
          </span>
        </div>

        {/* Tree List View */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Parent-Child Recognition Preview</span>
            </p>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              When an entity spans multiple Excel rows (e.g. continuation rows with blank names or merged cells), SheetScout groups them under one parent record. You can split or attach rows below.
            </p>
          </div>

          <div className="space-y-3">
            {localCandidates.map((cand, candIdx) => {
              const candName =
                cand.name ||
                cand.name_of_sportsperson ||
                cand[headers[1]?.key] ||
                cand[headers[0]?.key] ||
                `Candidate #${candIdx + 1}`;

              const panOrId = cand.pan_no || cand.id || cand.s_no || cand.registration_no || '';

              return (
                <div
                  key={cand.__id}
                  className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden"
                >
                  {/* Parent Candidate Bar */}
                  <div className="p-3.5 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {String(candName).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{String(candName)}</span>
                          {panOrId && (
                            <span className="text-[10px] font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                              {panOrId}
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {cand.workflowStatus || 'Pending'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Source Row{cand.__sourceRowNums.length > 1 ? 's' : ''}:{' '}
                          <span className="font-mono text-slate-700 font-medium">
                            {cand.__sourceRowNums.join(', ')}
                          </span>
                          {' • '}
                          {cand.subRecords?.length || 0} associated sub-records
                        </p>
                      </div>
                    </div>

                    {/* Merge button with previous candidate */}
                    {candIdx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleAttachToPrevious(candIdx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-300 rounded-lg transition-colors"
                        title="Merge this candidate as a sub-record of the candidate above"
                      >
                        <Merge className="w-3.5 h-3.5" />
                        <span>Attach to Preceding</span>
                      </button>
                    )}
                  </div>

                  {/* Child Sub-records List */}
                  {cand.subRecords && cand.subRecords.length > 0 ? (
                    <div className="p-3 pl-8 space-y-2 bg-white">
                      {cand.subRecords.map((sub, subIdx) => {
                        const actionDesc =
                          sub.specific_action_points ||
                          sub.action_point ||
                          sub.description ||
                          sub[headers[4]?.key] ||
                          `Action Point ${subIdx + 1}`;

                        return (
                          <div
                            key={sub.__id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-slate-400 font-mono text-[11px]">
                                {subIdx === cand.subRecords.length - 1 ? '└──' : '├──'}
                              </span>
                              <span className="font-semibold text-blue-700">
                                {sub.action_point_s_no || `Item ${subIdx + 1}`}:
                              </span>
                              <span className="truncate max-w-lg text-slate-800" title={String(actionDesc)}>
                                {String(actionDesc)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSeparateSubRecord(candIdx, subIdx)}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition-colors shrink-0"
                              title="Separate this action point into an independent candidate"
                            >
                              <Split className="w-3 h-3" />
                              <span>Separate</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-[11px] text-slate-400 italic pl-11">
                      Single-row candidate record (no multi-row sub-records).
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Confirming updates the active dataset's candidate hierarchy and recalculates all views.
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
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Hierarchical Grouping</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
