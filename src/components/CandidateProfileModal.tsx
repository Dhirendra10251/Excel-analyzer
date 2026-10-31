import React, { useState } from 'react';
import {
  X,
  User,
  GraduationCap,
  Trophy,
  FileText,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Edit3,
  Save,
  Plus,
  Trash2,
  GitBranch,
  CheckCircle2,
  Clock,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { CandidateEntity, ColumnDef, SheetData, SubRecord } from '../types/spreadsheet';
import { formatCellValue } from '../utils/excelParser';
import {
  addSubRecordToCandidate,
  removeSubRecord,
  setCandidateStatus,
  togglePendingDone,
  updateCandidateValue,
  updateSubRecord,
} from '../utils/dataManager';

interface CandidateProfileModalProps {
  candidate: CandidateEntity;
  columns: ColumnDef[];
  allCandidates: CandidateEntity[];
  onClose: () => void;
  onNavigateCandidate: (nextCandidate: CandidateEntity) => void;
  onUpdateSheet?: (updatedSheet: SheetData) => void;
  sheet: SheetData;
}

export const CandidateProfileModal: React.FC<CandidateProfileModalProps> = ({
  candidate,
  columns,
  allCandidates,
  onClose,
  onNavigateCandidate,
  onUpdateSheet,
  sheet,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedParentValues, setEditedParentValues] = useState<Record<string, any>>({ ...candidate });

  // Add sub-record dialog inside profile
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [newSubDesc, setNewSubDesc] = useState('');
  const [newSubCode, setNewSubCode] = useState('');

  if (!candidate) return null;

  const currentIndex = allCandidates.findIndex((c) => c.__id === candidate.__id);
  const prevCandidate = currentIndex > 0 ? allCandidates[currentIndex - 1] : null;
  const nextCandidate = currentIndex < allCandidates.length - 1 ? allCandidates[currentIndex + 1] : null;

  const candidateName =
    candidate.name ||
    candidate.name_of_sportsperson ||
    candidate[columns[1]?.key] ||
    candidate[columns[0]?.key] ||
    `Candidate #${candidate.__id}`;

  const currentStatus = candidate.workflowStatus || 'Pending';
  const isDone =
    currentStatus.toLowerCase().includes('done') ||
    currentStatus.toLowerCase().includes('completed') ||
    currentStatus.toLowerCase().includes('verified') ||
    currentStatus.toLowerCase().includes('eligible');

  // Toggle status
  const handleToggleStatus = () => {
    if (!onUpdateSheet) return;
    const nextStatus = isDone ? 'Pending' : 'Done';
    const updated = setCandidateStatus(sheet, candidate.__id, nextStatus);
    onUpdateSheet(updated);
    const updatedCand = updated.candidates.find((c) => c.__id === candidate.__id);
    if (updatedCand) setEditedParentValues({ ...updatedCand });
  };

  // Save parent profile edits
  const handleSaveProfile = () => {
    if (!onUpdateSheet) return;
    let updatedSheet = sheet;
    for (const [key, val] of Object.entries(editedParentValues)) {
      if (candidate[key] !== val) {
        updatedSheet = updateCandidateValue(updatedSheet, candidate.__id, key, val);
      }
    }
    onUpdateSheet(updatedSheet);
    setIsEditing(false);
  };

  // Sub-record actions
  const handleAddSubRecord = () => {
    if (!onUpdateSheet || !newSubDesc.trim()) return;
    const subColKey = columns.find((c) => c.isSubRecordColumn)?.key || 'specific_action_points';
    const subCodeKey = columns.find((c) => c.label.toLowerCase().includes('action point s.no'))?.key || 'action_point_s_no';

    const subData: Record<string, any> = {
      [subCodeKey]: newSubCode.trim() || `Sub-${(candidate.subRecords?.length || 0) + 1}`,
      [subColKey]: newSubDesc.trim(),
      status: candidate.workflowStatus || 'Pending',
    };

    const updated = addSubRecordToCandidate(sheet, candidate.__id, subData);
    onUpdateSheet(updated);
    setIsAddSubOpen(false);
    setNewSubDesc('');
    setNewSubCode('');
  };

  const handleDeleteSubRecord = (subId: string) => {
    if (!onUpdateSheet) return;
    const updated = removeSubRecord(sheet, candidate.__id, subId);
    onUpdateSheet(updated);
  };

  const handleUpdateSubField = (subId: string, fieldKey: string, value: any) => {
    if (!onUpdateSheet) return;
    const updated = updateSubRecord(sheet, candidate.__id, subId, fieldKey, value);
    onUpdateSheet(updated);
  };

  // Categorize columns
  const personalCols: ColumnDef[] = [];
  const academicCols: ColumnDef[] = [];
  const sportsCols: ColumnDef[] = [];
  const additionalCols: ColumnDef[] = [];

  for (const col of columns) {
    if (col.isSubRecordColumn) continue; // Rendered in Associated Sub-Records section
    const l = col.label.toLowerCase();

    if (
      (l.includes('name') && !l.includes('exam') && !l.includes('course')) ||
      l.includes('father') ||
      l.includes('mother') ||
      l.includes('birth') ||
      l.includes('dob') ||
      l.includes('pan') ||
      l.includes('id') ||
      l.includes('gender') ||
      l.includes('phone') ||
      l.includes('email') ||
      l.includes('address')
    ) {
      personalCols.push(col);
    } else if (
      l.includes('college') ||
      l.includes('school') ||
      l.includes('institute') ||
      l.includes('course') ||
      l.includes('class') ||
      l.includes('sem') ||
      l.includes('duration') ||
      l.includes('qualifying') ||
      l.includes('examination') ||
      l.includes('admission')
    ) {
      academicCols.push(col);
    } else if (
      l.includes('participation') ||
      l.includes('tournament') ||
      l.includes('sport') ||
      l.includes('achievement') ||
      l.includes('medal')
    ) {
      sportsCols.push(col);
    } else {
      additionalCols.push(col);
    }
  }

  const sections = [
    { title: 'Personal Details', icon: User, items: personalCols },
    { title: 'Academic / Organizational Information', icon: GraduationCap, items: academicCols },
    { title: 'Participation & Eligibility', icon: Trophy, items: sportsCols },
    { title: 'Additional Attributes & Financials', icon: FileText, items: additionalCols },
  ].filter((s) => s.items.length > 0);

  const copyProfileData = () => {
    const textData = columns
      .map((col) => `${col.label}: ${candidate[col.key] || 'Not Provided'}`)
      .join('\n');
    navigator.clipboard.writeText(textData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-md">
              {String(candidateName).charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight leading-tight">
                  {String(candidateName)}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Rows: {candidate.__sourceRowNums.join(', ')}
                </span>
                {/* One-click Status Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  }`}
                  title="Click to toggle status"
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Done</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pending</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Candidate Management & Multi-Row Inspector
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit / Save profile toggle */}
            <button
              type="button"
              onClick={() => {
                if (isEditing) handleSaveProfile();
                else setIsEditing(true);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isEditing
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              {isEditing ? (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Edit Profile</span>
                </>
              )}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setEditedParentValues({ ...candidate });
                  setIsEditing(false);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
            )}

            {/* Previous / Next buttons */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => prevCandidate && onNavigateCandidate(prevCandidate)}
                disabled={!prevCandidate}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Previous candidate"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] px-2 text-slate-400 font-medium">
                {currentIndex + 1} / {allCandidates.length}
              </span>
              <button
                type="button"
                onClick={() => nextCandidate && onNavigateCandidate(nextCandidate)}
                disabled={!nextCandidate}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Next candidate"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={copyProfileData}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Copy details"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close candidate profile"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 divide-y divide-slate-100">
          {/* Section 1: Associated Multi-Row Records / Action Points (if any exist) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Associated Sub-Records & Action Points
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {candidate.subRecords?.length || 0} items linked to this candidate
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddSubOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Sub-Record</span>
              </button>
            </div>

            {/* Sub-records Table */}
            {candidate.subRecords && candidate.subRecords.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-16">Item</th>
                      <th className="py-2.5 px-3">Description / Action Details</th>
                      <th className="py-2.5 px-3 w-28">Source Row</th>
                      <th className="py-2.5 px-3 w-28 text-center">Status</th>
                      <th className="py-2.5 px-3 w-16 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 bg-white">
                    {candidate.subRecords.map((sub, sIdx) => {
                      const desc =
                        sub.specific_action_points ||
                        sub.action_point ||
                        sub.description ||
                        sub.qualification ||
                        sub[columns[4]?.key] ||
                        `Detail #${sIdx + 1}`;
                      const code = sub.action_point_s_no || sub.s_no || `${sIdx + 1}`;

                      return (
                        <tr key={sub.__id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-bold text-blue-700">
                            {code}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            {isEditing ? (
                              <input
                                type="text"
                                defaultValue={String(desc)}
                                onBlur={(e) =>
                                  handleUpdateSubField(
                                    sub.__id,
                                    'specific_action_points',
                                    e.target.value
                                  )
                                }
                                className="w-full bg-amber-50 border border-amber-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              <span>{String(desc)}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            Row #{sub.__sourceRowNum}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                (sub.status || candidate.workflowStatus || '')
                                  .toLowerCase()
                                  .includes('done')
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {sub.status || candidate.workflowStatus || 'Pending'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteSubRecord(sub.__id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Delete sub-record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                No child sub-records attached to this candidate. Click "Add Sub-Record" to attach action points or qualification items.
              </div>
            )}
          </div>

          {/* Section 2+: Grouped Parent Attributes */}
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <div key={sec.title} className="pt-5 first:pt-0 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {sec.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 ml-auto">
                    {sec.items.length} {sec.items.length === 1 ? 'field' : 'fields'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sec.items.map((col) => {
                    const rawVal = isEditing ? editedParentValues[col.key] : candidate[col.key];
                    const displayVal = formatCellValue(rawVal, col.type);
                    const isBlank = displayVal === '' || displayVal === null || displayVal === undefined;

                    return (
                      <div
                        key={col.key}
                        className={`p-3 rounded-xl border transition-colors space-y-1 ${
                          isEditing
                            ? 'bg-amber-50/40 border-amber-300'
                            : 'bg-slate-50/70 border-slate-200/60 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-[11px] font-medium text-slate-500 uppercase tracking-tight truncate" title={col.label}>
                          {col.label}
                        </span>
                        {isEditing ? (
                          <input
                            type={col.type === 'number' ? 'number' : 'text'}
                            value={displayVal}
                            onChange={(e) =>
                              setEditedParentValues({
                                ...editedParentValues,
                                [col.key]: col.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value,
                              })
                            }
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        ) : (
                          <div className="text-xs font-semibold text-slate-900 break-words">
                            {isBlank ? (
                              <span className="text-slate-400 font-normal italic text-[11px] bg-slate-200/50 px-2 py-0.5 rounded">
                                Not Provided
                              </span>
                            ) : (
                              displayVal
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Total fields tracked: <span className="font-semibold text-slate-800">{columns.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Save Changes
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
            >
              Back to Candidates
            </button>
          </div>
        </div>
      </div>

      {/* Add Sub-Record Dialog */}
      {isAddSubOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 space-y-4">
            <h4 className="font-bold text-sm text-slate-900">Add Sub-Record / Action Point</h4>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Code / S.No (e.g. C, 3)</label>
                <input
                  type="text"
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value)}
                  placeholder="e.g. C"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description / Action Details</label>
                <textarea
                  value={newSubDesc}
                  onChange={(e) => setNewSubDesc(e.target.value)}
                  placeholder="Enter action point details..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddSubOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSubRecord}
                className="px-3.5 py-1.5 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700"
              >
                Add Sub-Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
