import { CandidateEntity, CaseStatus, ColumnDef, DataRow, SheetData, SubRecord } from '../types/spreadsheet';
import { calculateSheetStats, classifyCaseStatus } from './excelParser';

const STORAGE_KEY = 'sheetscout_active_session';

export interface EditHistoryItem {
  sheetName: string;
  candidates: CandidateEntity[];
  rows: DataRow[];
}

/**
 * Re-synchronizes flatRows from hierarchical candidates so both views remain 100% consistent
 */
export function syncFlatRows(candidates: CandidateEntity[], columns: ColumnDef[]): DataRow[] {
  const flatRows: DataRow[] = [];
  let rowCounter = 1;

  for (const cand of candidates) {
    const parentCaseStatus: CaseStatus = cand.caseStatus || classifyCaseStatus(cand.workflowStatus);

    // If candidate has sub-records, each sub-record is a row with parent info
    if (cand.subRecords && cand.subRecords.length > 0) {
      cand.subRecords.forEach((sub, idx) => {
        const rowObj: DataRow = {
          __id: `row_${rowCounter}`,
          __rowNum: rowCounter,
          __parentCandidateId: cand.__id,
          __isSubRow: idx > 0,
          caseStatus: parentCaseStatus,
        };
        for (const col of columns) {
          if (idx === 0) {
            rowObj[col.key] = cand[col.key] !== undefined ? cand[col.key] : sub[col.key];
          } else {
            // Continuation row: sub-record fields populated, shared parent fields preserved or null
            rowObj[col.key] = sub[col.key] !== undefined ? sub[col.key] : (col.isIdentityColumn ? null : cand[col.key]);
          }
        }
        flatRows.push(rowObj);
        rowCounter++;
      });
    } else {
      const rowObj: DataRow = {
        __id: `row_${rowCounter}`,
        __rowNum: rowCounter,
        __parentCandidateId: cand.__id,
        __isSubRow: false,
        caseStatus: parentCaseStatus,
      };
      for (const col of columns) {
        rowObj[col.key] = cand[col.key];
      }
      flatRows.push(rowObj);
      rowCounter++;
    }
  }

  return flatRows;
}

/**
 * Transition case status between Pending, Transferred, Disposed, and record history
 */
export function changeCaseStatus(
  sheet: SheetData,
  candidateId: string,
  newStatus: CaseStatus,
  remarks?: string,
  transferDetails?: string
): SheetData {
  const statusKey = sheet.stats.statusColumnKey || 'status';

  const updatedCandidates = sheet.candidates.map((cand) => {
    if (cand.__id !== candidateId) return cand;

    const oldStatus = cand.caseStatus || classifyCaseStatus(cand.workflowStatus);
    const historyItem = {
      from: oldStatus,
      to: newStatus,
      date: new Date().toISOString(),
      remarks: remarks?.trim() || undefined,
    };

    const editedFields = new Set(cand.editedFields || []);
    editedFields.add(statusKey);
    editedFields.add('caseStatus');
    editedFields.add('workflowStatus');

    const updatedSubs = (cand.subRecords || []).map((sub) => ({
      ...sub,
      status: newStatus,
      [statusKey]: newStatus,
    }));

    return {
      ...cand,
      caseStatus: newStatus,
      workflowStatus: newStatus,
      [statusKey]: newStatus,
      remarks: remarks !== undefined ? remarks : cand.remarks,
      transferDetails: transferDetails !== undefined ? transferDetails : cand.transferDetails,
      statusHistory: [...(cand.statusHistory || []), historyItem],
      subRecords: updatedSubs,
      isEdited: true,
      editedFields,
    };
  });

  const updatedRows = syncFlatRows(updatedCandidates, sheet.headers);
  const updatedStats = calculateSheetStats(updatedRows, sheet.headers, updatedCandidates);

  return {
    ...sheet,
    candidates: updatedCandidates,
    rows: updatedRows,
    stats: updatedStats,
  };
}

/**
 * Update a field on a candidate entity and re-calculate stats
 */
export function updateCandidateValue(
  sheet: SheetData,
  candidateId: string,
  fieldKey: string,
  newValue: any
): SheetData {
  const updatedCandidates = sheet.candidates.map((cand) => {
    if (cand.__id !== candidateId) return cand;

    const editedFields = new Set(cand.editedFields || []);
    editedFields.add(fieldKey);

    const updated = {
      ...cand,
      [fieldKey]: newValue,
      isEdited: true,
      editedFields,
    };

    // If status column is being updated, also sync workflowStatus and caseStatus
    if (fieldKey === sheet.stats.statusColumnKey || fieldKey === 'status' || fieldKey === 'workflowStatus' || fieldKey === 'caseStatus') {
      const parsedStatus = classifyCaseStatus(String(newValue));
      updated.caseStatus = parsedStatus;
      updated.workflowStatus = String(newValue);
    }

    return updated;
  });

  const updatedRows = syncFlatRows(updatedCandidates, sheet.headers);
  const updatedStats = calculateSheetStats(updatedRows, sheet.headers, updatedCandidates);

  return {
    ...sheet,
    candidates: updatedCandidates,
    rows: updatedRows,
    stats: updatedStats,
  };
}

/**
 * Quick toggle or set Status (Pending <-> Done or custom status)
 */
export function setCandidateStatus(
  sheet: SheetData,
  candidateId: string,
  newStatus: string
): SheetData {
  const caseStatus = classifyCaseStatus(newStatus);
  return changeCaseStatus(sheet, candidateId, caseStatus);
}

/**
 * Quick action: Mark as Done / Toggle Pending
 */
export function togglePendingDone(sheet: SheetData, candidateId: string): SheetData {
  const cand = sheet.candidates.find((c) => c.__id === candidateId);
  if (!cand) return sheet;

  const current = (cand.workflowStatus || '').toLowerCase();
  const nextStatus = current.includes('done') || current.includes('completed') ? 'Pending' : 'Done';
  return setCandidateStatus(sheet, candidateId, nextStatus);
}

/**
 * Add a new candidate record
 */
export function addNewCandidate(
  sheet: SheetData,
  initialData: Record<string, any> = {}
): SheetData {
  const newId = `cand_${Date.now()}`;
  const statusKey = sheet.stats.statusColumnKey || 'status';
  const defaultStatus = initialData[statusKey] || 'Pending';

  const newCand: CandidateEntity = {
    __id: newId,
    __sourceRowNums: [sheet.rows.length + 1],
    workflowStatus: defaultStatus,
    caseStatus: classifyCaseStatus(defaultStatus),
    subRecords: [],
    isEdited: true,
    editedFields: new Set(['__created']),
    ...initialData,
  };

  const updatedCandidates = [newCand, ...sheet.candidates];
  const updatedRows = syncFlatRows(updatedCandidates, sheet.headers);
  const updatedStats = calculateSheetStats(updatedRows, sheet.headers, updatedCandidates);

  return {
    ...sheet,
    candidates: updatedCandidates,
    rows: updatedRows,
    stats: updatedStats,
  };
}

/**
 * Delete a candidate record after confirmation
 */
export function removeCandidate(sheet: SheetData, candidateId: string): SheetData {
  const updatedCandidates = sheet.candidates.filter((c) => c.__id !== candidateId);
  const updatedRows = syncFlatRows(updatedCandidates, sheet.headers);
  const updatedStats = calculateSheetStats(updatedRows, sheet.headers, updatedCandidates);

  return {
    ...sheet,
    candidates: updatedCandidates,
    rows: updatedRows,
    stats: updatedStats,
  };
}

/**
 * Add a sub-record (e.g. Action Point) to an existing candidate
 */
export function addSubRecordToCandidate(
  sheet: SheetData,
  candidateId: string,
  subData: Record<string, any>
): SheetData {
  const updatedCandidates = sheet.candidates.map((cand) => {
    if (cand.__id !== candidateId) return cand;

    const subId = `${cand.__id}_sub_${Date.now()}`;
    const newSub: SubRecord = {
      __id: subId,
      __sourceRowNum: cand.__sourceRowNums[cand.__sourceRowNums.length - 1] + 1,
      status: subData.status || cand.workflowStatus,
      ...subData,
    };

    return {
      ...cand,
      subRecords: [...cand.subRecords, newSub],
      isEdited: true,
    };
  });

  const updatedRows = syncFlatRows(updatedCandidates, sheet.headers);
  const updatedStats = calculateSheetStats(updatedRows, sheet.headers, updatedCandidates);

  return {
    ...sheet,
    candidates: updatedCandidates,
    rows: updatedRows,
    stats: updatedStats,
  };
}

/**
 * Update an existing sub-record
 */
export function updateSubRecord(
  sheet: SheetData,
  candidateId: string,
  subId: string,
  fieldKey: string,
  value: any
): SheetData {
  const updatedCandidates = sheet.candidates.map((cand) => {
    if (cand.__id !== candidateId) return cand;

    const updatedSubs = cand.subRecords.map((sub) => {
      if (sub.__id !== subId) return sub;
      return {
        ...sub,
        [fieldKey]: value,
      };
    });

    return {
      ...cand,
      subRecords: updatedSubs,
      isEdited: true,
    };
  });

  const updatedRows = syncFlatRows(updatedCandidates, sheet.headers);
  const updatedStats = calculateSheetStats(updatedRows, sheet.headers, updatedCandidates);

  return {
    ...sheet,
    candidates: updatedCandidates,
    rows: updatedRows,
    stats: updatedStats,
  };
}

/**
 * Delete a sub-record from a candidate
 */
export function removeSubRecord(
  sheet: SheetData,
  candidateId: string,
  subId: string
): SheetData {
  const updatedCandidates = sheet.candidates.map((cand) => {
    if (cand.__id !== candidateId) return cand;
    return {
      ...cand,
      subRecords: cand.subRecords.filter((s) => s.__id !== subId),
      isEdited: true,
    };
  });

  const updatedRows = syncFlatRows(updatedCandidates, sheet.headers);
  const updatedStats = calculateSheetStats(updatedRows, sheet.headers, updatedCandidates);

  return {
    ...sheet,
    candidates: updatedCandidates,
    rows: updatedRows,
    stats: updatedStats,
  };
}

/**
 * Browser Session Persistence helpers (LocalStorage / IndexedDB fallback)
 */
export function saveSessionToStorage(workbook: any): void {
  try {
    const serialized = JSON.stringify(workbook, (_key, value) => {
      if (value instanceof Set) {
        return Array.from(value);
      }
      return value;
    });
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // quota exceeded or disabled
  }
}

export function loadSessionFromStorage(): any | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.sheets) || data.sheets.length === 0) return null;

    // Ensure all sheets have complete and up-to-date stats with case metrics and Set instances
    for (const sheet of data.sheets) {
      if (sheet) {
        if (
          !sheet.stats ||
          sheet.stats.totalCases === undefined ||
          sheet.stats.pendingCasesCount === undefined ||
          sheet.stats.transferCasesCount === undefined ||
          sheet.stats.disposedCasesCount === undefined
        ) {
          if (sheet.rows && sheet.headers) {
            sheet.stats = calculateSheetStats(sheet.rows, sheet.headers, sheet.candidates || []);
          }
        }
        // Ensure duplicateRowIds is an actual Set
        if (sheet.stats) {
          if (!(sheet.stats.duplicateRowIds instanceof Set)) {
            sheet.stats.duplicateRowIds = new Set(
              Array.isArray(sheet.stats.duplicateRowIds) ? sheet.stats.duplicateRowIds : []
            );
          }
        }
      }
    }
    return data;
  } catch {
    return null;
  }
}

export function clearSessionFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
