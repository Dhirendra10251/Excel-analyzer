import { CandidateEntity, ColumnDef, DataRow, SheetData, SubRecord } from '../types/spreadsheet';
import { calculateSheetStats } from './excelParser';

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
    // If candidate has sub-records, each sub-record is a row with parent info
    if (cand.subRecords && cand.subRecords.length > 0) {
      cand.subRecords.forEach((sub, idx) => {
        const rowObj: DataRow = {
          __id: `row_${rowCounter}`,
          __rowNum: rowCounter,
          __parentCandidateId: cand.__id,
          __isSubRow: idx > 0,
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

    // If status column is being updated, also sync workflowStatus
    if (fieldKey === sheet.stats.statusColumnKey || fieldKey === 'status' || fieldKey === 'workflowStatus') {
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
  const statusKey = sheet.stats.statusColumnKey || 'status';

  const updatedCandidates = sheet.candidates.map((cand) => {
    if (cand.__id !== candidateId) return cand;

    const editedFields = new Set(cand.editedFields || []);
    editedFields.add(statusKey);
    editedFields.add('workflowStatus');

    // Also update all sub-records' status
    const updatedSubs = cand.subRecords.map((sub) => ({
      ...sub,
      status: newStatus,
      [statusKey]: newStatus,
    }));

    return {
      ...cand,
      workflowStatus: newStatus,
      [statusKey]: newStatus,
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
    const serialized = JSON.stringify(workbook);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // quota exceeded or disabled
  }
}

export function loadSessionFromStorage(): any | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
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
