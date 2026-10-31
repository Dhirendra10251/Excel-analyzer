import * as XLSX from 'xlsx';
import {
  CandidateEntity,
  CaseStatus,
  ColumnDef,
  ColumnType,
  DataRow,
  GroupingConfig,
  HeaderConfig,
  ParsedWorkbook,
  SheetData,
  SheetStats,
  SubRecord,
} from '../types/spreadsheet';

/**
 * Normalizes Excel serial date or date string into formatted string YYYY-MM-DD or DD/MM/YYYY
 */
export function formatCellValue(value: any, columnType?: ColumnType): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    return value.toISOString().split('T')[0];
  }

  // Handle Excel serial date
  if (typeof value === 'number' && columnType === 'date' && value > 20000 && value < 75000) {
    try {
      const jsDate = new Date(Math.round((value - 25569) * 86400 * 1000));
      if (!isNaN(jsDate.getTime())) {
        const y = jsDate.getUTCFullYear();
        const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
        const d = String(jsDate.getUTCDate()).padStart(2, '0');
        return `${d}/${m}/${y}`;
      }
    } catch {
      // fallback
    }
  }

  return String(value);
}

/**
 * Checks if a value looks like a date
 */
export function isDateLike(val: any): boolean {
  if (val instanceof Date) return true;
  if (typeof val === 'number') {
    return val >= 25000 && val <= 60000;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(trimmed)) return true;
    if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(trimmed)) return true;
    const timestamp = Date.parse(trimmed);
    return !isNaN(timestamp) && trimmed.length >= 6 && /\d/.test(trimmed);
  }
  return false;
}

/**
 * Detect column data type based on non-blank sample values
 */
export function inferColumnType(values: any[], headerLabel: string): ColumnType {
  const nonBlank = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (nonBlank.length === 0) return 'empty';

  const lowerHeader = headerLabel.toLowerCase();
  const isDateHeader =
    lowerHeader.includes('date') ||
    lowerHeader.includes('dob') ||
    lowerHeader.includes('birth') ||
    (lowerHeader.includes('year') && lowerHeader.includes('date'));

  let dateCount = 0;
  let numberCount = 0;
  let boolCount = 0;

  for (const v of nonBlank) {
    if (v instanceof Date) {
      dateCount++;
    } else if (typeof v === 'boolean') {
      boolCount++;
    } else if (typeof v === 'number') {
      if (isDateHeader && v > 20000 && v < 70000) {
        dateCount++;
      } else {
        numberCount++;
      }
    } else if (typeof v === 'string') {
      const trimmed = v.trim();
      if (['true', 'false', 'yes', 'no'].includes(trimmed.toLowerCase())) {
        boolCount++;
      } else if (isDateLike(trimmed) && (isDateHeader || /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(trimmed))) {
        dateCount++;
      } else if ((/^-?\d+(\.\d+)?$/.test(trimmed) && !trimmed.startsWith('0')) || trimmed === '0') {
        numberCount++;
      }
    }
  }

  const threshold = nonBlank.length * 0.7;
  if (dateCount >= threshold || (isDateHeader && dateCount > 0)) return 'date';
  if (boolCount >= threshold) return 'boolean';
  if (numberCount >= threshold) return 'number';
  return 'string';
}

/**
 * Intelligent automatic detection of header rows and data start row
 */
export function detectHeaderLayout(matrix: any[][], merges?: XLSX.Range[]): HeaderConfig {
  if (!matrix || matrix.length === 0) {
    return { headerRowStart: 0, headerRowEnd: 0, dataRowStart: 1 };
  }

  const maxCols = Math.max(...matrix.map((r) => (Array.isArray(r) ? r.length : 0)), 1);

  let startRow = 0;
  while (startRow < Math.min(matrix.length - 1, 5)) {
    const row = matrix[startRow] || [];
    const filledCount = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '').length;

    if (filledCount === 0) {
      startRow++;
      continue;
    }

    if (filledCount === 1 && maxCols >= 3) {
      startRow++;
      continue;
    }

    break;
  }

  let headerRowEnd = startRow;

  if (merges && merges.length > 0) {
    // Only merges that originate at startRow can be part of the header structure
    const headerRowMerges = merges.filter((m) => m.s.r === startRow);
    const multiRowMerges = headerRowMerges.filter((m) => m.s.r !== m.e.r);
    const colSpansInFirst = headerRowMerges.filter((m) => m.s.c !== m.e.c);

    if (multiRowMerges.length > 0 || colSpansInFirst.length > 0) {
      if (matrix.length > startRow + 1) {
        headerRowEnd = startRow + 1;
      }
    }
  } else if (matrix.length > startRow + 1) {
    const row1 = matrix[startRow] || [];
    const row2 = matrix[startRow + 1] || [];
    const r1Filled = row1.filter((c) => c != null && String(c).trim() !== '').length;
    const r2Filled = row2.filter((c) => c != null && String(c).trim() !== '').length;

    const firstCellR2 = String(row2[0] || '').trim();
    const isDataSerial = /^\d+$/.test(firstCellR2);
    if (!isDataSerial && r1Filled > 0 && r2Filled > 0) {
      if (r1Filled < r2Filled || r1Filled < maxCols * 0.8) {
        headerRowEnd = startRow + 1;
      }
    }
  }

  return {
    headerRowStart: startRow,
    headerRowEnd: headerRowEnd,
    dataRowStart: headerRowEnd + 1,
  };
}

/**
 * Builds composite column labels taking multi-level headers and merged cells into account.
 */
export function buildColumnDefinitions(
  matrix: any[][],
  config: HeaderConfig,
  merges?: XLSX.Range[]
): { columns: ColumnDef[]; maxCols: number } {
  const maxCols = Math.max(...matrix.map((r) => (Array.isArray(r) ? r.length : 0)), 1);
  const { headerRowStart, headerRowEnd, dataRowStart } = config;

  const headerRowsCount = headerRowEnd - headerRowStart + 1;
  const headerGrid: string[][] = Array.from({ length: headerRowsCount }, () => Array(maxCols).fill(''));

  for (let r = 0; r < headerRowsCount; r++) {
    const rawRow = matrix[headerRowStart + r] || [];
    for (let c = 0; c < maxCols; c++) {
      const val = rawRow[c];
      headerGrid[r][c] = val !== null && val !== undefined ? String(val).trim() : '';
    }
  }

  if (merges && merges.length > 0) {
    for (const m of merges) {
      if (m.s.r >= headerRowStart && m.s.r <= headerRowEnd) {
        const topRow = m.s.r - headerRowStart;
        const bottomRow = Math.min(m.e.r, headerRowEnd) - headerRowStart;
        const leftCol = m.s.c;
        const rightCol = Math.min(m.e.c, maxCols - 1);
        const sourceVal = headerGrid[topRow][leftCol];

        if (sourceVal) {
          for (let r = topRow; r <= bottomRow; r++) {
            for (let c = leftCol; c <= rightCol; c++) {
              headerGrid[r][c] = sourceVal;
            }
          }
        }
      }
    }
  }

  if (headerRowsCount > 1) {
    for (let c = 0; c < maxCols; c++) {
      if (headerGrid[0][c] === '' && c > 0 && headerGrid[1][c] !== '') {
        headerGrid[0][c] = headerGrid[0][c - 1];
      }
    }
  }

  const columns: ColumnDef[] = [];
  const labelCounts: Record<string, number> = {};

  for (let c = 0; c < maxCols; c++) {
    let finalLabel = '';
    let parentHeader: string | undefined = undefined;
    let subHeader: string | undefined = undefined;

    if (headerRowsCount === 1) {
      finalLabel = headerGrid[0][c] || `Column ${c + 1}`;
    } else {
      const parent = headerGrid[0][c];
      const sub = headerGrid[headerRowsCount - 1][c];

      if (parent && sub && parent !== sub) {
        finalLabel = `${parent} – ${sub}`;
        parentHeader = parent;
        subHeader = sub;
      } else if (sub) {
        finalLabel = sub;
        subHeader = sub;
      } else if (parent) {
        finalLabel = parent;
        parentHeader = parent;
      } else {
        finalLabel = `Column ${c + 1}`;
      }
    }

    finalLabel = finalLabel.replace(/\s+/g, ' ').trim();
    if (!finalLabel) {
      finalLabel = `Column ${c + 1}`;
    }

    const baseKey = finalLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `col_${c}`;
    const occ = (labelCounts[baseKey] || 0) + 1;
    labelCounts[baseKey] = occ;
    const uniqueKey = occ > 1 ? `${baseKey}_${occ}` : baseKey;

    const columnValues: any[] = [];
    for (let r = dataRowStart; r < matrix.length; r++) {
      const row = matrix[r] || [];
      columnValues.push(row[c]);
    }

    const type = inferColumnType(columnValues, finalLabel);
    const nonBlankValues = columnValues.filter((v) => v !== null && v !== undefined && v !== '');
    const nonBlankCount = nonBlankValues.length;
    const blankCount = columnValues.length - nonBlankCount;

    const uniqueVals = new Set(nonBlankValues.map((v) => (v instanceof Date ? v.toISOString() : String(v).trim())));
    const uniqueCount = uniqueVals.size;
    const sampleValues = Array.from(uniqueVals).slice(0, 5);

    let categories: { value: string; count: number; percentage: number }[] | undefined = undefined;
    if (uniqueCount > 0 && uniqueCount <= 30) {
      const freqMap: Record<string, number> = {};
      for (const v of nonBlankValues) {
        const str = formatCellValue(v, type);
        freqMap[str] = (freqMap[str] || 0) + 1;
      }
      categories = Object.entries(freqMap)
        .map(([val, count]) => ({
          value: val,
          count,
          percentage: Math.round((count / Math.max(nonBlankCount, 1)) * 100),
        }))
        .sort((a, b) => b.count - a.count);
    }

    let min: number | string | undefined = undefined;
    let max: number | string | undefined = undefined;
    let avg: number | undefined = undefined;

    if (type === 'number') {
      const nums = nonBlankValues.map((v) => Number(v)).filter((n) => !isNaN(n));
      if (nums.length > 0) {
        min = Math.min(...nums);
        max = Math.max(...nums);
        avg = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
      }
    } else if (type === 'date') {
      const formattedDates = nonBlankValues.map((v) => formatCellValue(v, 'date')).filter(Boolean);
      if (formattedDates.length > 0) {
        min = formattedDates[0];
        max = formattedDates[formattedDates.length - 1];
      }
    }

    const lowerLabel = finalLabel.toLowerCase();
    const isIdentityColumn =
      lowerLabel.includes('name') && !lowerLabel.includes('exam') && !lowerLabel.includes('action') ||
      lowerLabel.includes('pan') ||
      lowerLabel.includes('candidate') ||
      lowerLabel.includes('sportsperson') ||
      lowerLabel.includes('registration') ||
      lowerLabel.includes('roll') ||
      lowerLabel.includes('id') && !lowerLabel.includes('action') ||
      lowerLabel === 's.no' ||
      lowerLabel === 'sr.no' ||
      lowerLabel === 'sno';

    const isSubRecordColumn =
      lowerLabel.includes('action point') ||
      lowerLabel.includes('specific action') ||
      lowerLabel.includes('action') ||
      lowerLabel.includes('sub_record') ||
      lowerLabel.includes('task') ||
      lowerLabel.includes('item') ||
      lowerLabel.includes('activity');

    const isStatusColumn =
      lowerLabel.includes('status') ||
      lowerLabel.includes('state') ||
      lowerLabel.includes('eligibility') ||
      (sampleValues.some((s) =>
        ['pending', 'done', 'completed', 'in progress', 'approved', 'rejected', 'verified'].includes(
          String(s).toLowerCase().trim()
        )
      ));

    columns.push({
      key: uniqueKey,
      label: finalLabel,
      originalLabel: finalLabel,
      parentHeader,
      subHeader,
      colIndex: c,
      type,
      totalCount: columnValues.length,
      nonBlankCount,
      blankCount,
      uniqueCount,
      sampleValues,
      categories,
      min,
      max,
      avg,
      isIdentityColumn,
      isSubRecordColumn,
      isStatusColumn,
    });
  }

  return { columns, maxCols };
}

/**
 * Classifies any status string into one of the four official case categories:
 * 'Pending' | 'Transferred' | 'Disposed' | 'Unclassified'
 */
export function classifyCaseStatus(statusText: any): CaseStatus {
  if (statusText === null || statusText === undefined || String(statusText).trim() === '') {
    return 'Pending';
  }
  const s = String(statusText).toLowerCase().trim();

  // 1. Transferred check
  if (s.includes('transfer') || s.includes('forwarded') || s.includes('routed')) {
    return 'Transferred';
  }

  // 2. Disposed / Closed / Completed check
  if (
    s.includes('disposed') ||
    s.includes('done') ||
    s.includes('completed') ||
    s.includes('verified') ||
    s.includes('approved') ||
    s.includes('closed') ||
    s.includes('resolved') ||
    s.includes('settled') ||
    s.includes('eligible')
  ) {
    return 'Disposed';
  }

  // 3. Pending / In Progress check
  if (
    s.includes('pending') ||
    s.includes('open') ||
    s.includes('awaiting') ||
    s.includes('not verified') ||
    s.includes('under review') ||
    s.includes('in progress')
  ) {
    return 'Pending';
  }

  return 'Unclassified';
}

/**
 * Intelligent Hierarchical Grouping:
 * Recognizes that one candidate/entity can occupy multiple physical rows in an Excel spreadsheet.
 * Connects continuation rows with blank identities to the preceding parent record.
 */
export function buildHierarchicalEntities(
  matrix: any[][],
  columns: ColumnDef[],
  dataRowStart: number,
  merges?: XLSX.Range[],
  customConfig?: Partial<GroupingConfig>
): { candidates: CandidateEntity[]; flatRows: DataRow[]; groupingConfig: GroupingConfig } {
  // Detect identity columns
  const identityCols = columns.filter((c) => c.isIdentityColumn);
  const subRecordCols = columns.filter((c) => c.isSubRecordColumn);

  const identityColKeys =
    customConfig?.identityColKeys ||
    (identityCols.length > 0 ? identityCols.map((c) => c.key) : [columns[0]?.key, columns[1]?.key].filter(Boolean));

  const subRecordColKeys =
    customConfig?.subRecordColKeys ||
    (subRecordCols.length > 0 ? subRecordCols.map((c) => c.key) : []);

  const groupingConfig: GroupingConfig = {
    enabled: customConfig?.enabled ?? true,
    identityColKeys,
    subRecordColKeys,
  };

  const candidates: CandidateEntity[] = [];
  const flatRows: DataRow[] = [];

  let currentCandidate: CandidateEntity | null = null;

  // Build vertical merge lookup: map (row, col) to merged top cell value
  const verticalMergeMap = new Map<string, any>();
  if (merges && merges.length > 0) {
    for (const m of merges) {
      if (m.s.r !== m.e.r && m.s.r >= dataRowStart) {
        const topVal = matrix[m.s.r]?.[m.s.c];
        for (let r = m.s.r; r <= m.e.r; r++) {
          for (let c = m.s.c; c <= m.e.c; c++) {
            verticalMergeMap.set(`${r},${c}`, topVal);
          }
        }
      }
    }
  }

  for (let r = dataRowStart; r < matrix.length; r++) {
    const rawRow = matrix[r] || [];
    const isBlankRow = rawRow.every((val) => val === null || val === undefined || String(val).trim() === '');
    if (isBlankRow) continue;

    const rowObj: Record<string, any> = {};
    for (const col of columns) {
      let val = rawRow[col.colIndex];
      const mergeKey = `${r},${col.colIndex}`;
      if ((val === null || val === undefined || String(val).trim() === '') && verticalMergeMap.has(mergeKey)) {
        val = verticalMergeMap.get(mergeKey);
      }

      if (typeof val === 'number' && col.type === 'date' && val > 20000 && val < 75000) {
        val = formatCellValue(val, 'date');
      } else if (val instanceof Date) {
        val = formatCellValue(val, 'date');
      } else if (val !== null && val !== undefined && typeof val === 'string') {
        val = val.trim();
      }
      rowObj[col.key] = val;
    }

    const hasNewIdentity = identityColKeys.some((k) => {
      const col = columns.find((c) => c.key === k);
      if (!col) return false;
      const rawVal = rawRow[col.colIndex];
      if (rawVal === null || rawVal === undefined || String(rawVal).trim() === '') {
        return false;
      }
      return true;
    });

    const isContinuingMerge = identityColKeys.some((k) => {
      const col = columns.find((c) => c.key === k);
      if (!col) return false;
      return verticalMergeMap.has(`${r},${col.colIndex}`);
    });

    const hasSubRecordDetails =
      subRecordColKeys.length > 0
        ? subRecordColKeys.some((k) => {
            const v = rowObj[k];
            return v !== null && v !== undefined && String(v).trim() !== '';
          })
        : true;

    const isContinuation =
      groupingConfig.enabled &&
      currentCandidate !== null &&
      (!hasNewIdentity || isContinuingMerge) &&
      hasSubRecordDetails;

    if (!isContinuation || !currentCandidate) {
      const candidateId = `cand_${candidates.length + 1}`;
      const statusCol = columns.find((c) => c.isStatusColumn);
      let initialStatus = 'Pending';

      if (statusCol && rowObj[statusCol.key]) {
        initialStatus = String(rowObj[statusCol.key]);
      } else {
        const possibleStatus = Object.values(rowObj).find(
          (v) => typeof v === 'string' && classifyCaseStatus(v) !== 'Unclassified'
        );
        if (possibleStatus) {
          initialStatus = String(possibleStatus);
        }
      }

      let caseStatus = classifyCaseStatus(initialStatus);
      if (caseStatus === 'Unclassified') {
        for (const col of columns) {
          const val = rowObj[col.key];
          if (typeof val === 'string') {
            const classified = classifyCaseStatus(val);
            if (classified !== 'Unclassified') {
              caseStatus = classified;
              initialStatus = val;
              break;
            }
          }
        }
      }
      if (caseStatus === 'Unclassified') {
        caseStatus = 'Pending';
      }

      const subRecords: SubRecord[] = [];
      const hasInitialSub = subRecordColKeys.some(
        (k) => rowObj[k] !== null && rowObj[k] !== undefined && String(rowObj[k]).trim() !== ''
      );
      if (hasInitialSub || subRecordColKeys.length > 0) {
        const subObj: SubRecord = {
          __id: `${candidateId}_sub_1`,
          __sourceRowNum: r + 1,
          status: initialStatus,
        };
        for (const col of columns) {
          if (col.isSubRecordColumn || !col.isIdentityColumn) {
            subObj[col.key] = rowObj[col.key];
          }
        }
        subRecords.push(subObj);
      }

      currentCandidate = {
        __id: candidateId,
        __sourceRowNums: [r + 1],
        workflowStatus: initialStatus,
        caseStatus,
        subRecords,
        statusHistory: [],
        ...rowObj,
      };
      candidates.push(currentCandidate);

      flatRows.push({
        __id: `row_${r + 1}`,
        __rowNum: r + 1,
        __parentCandidateId: candidateId,
        __isSubRow: false,
        caseStatus,
        ...rowObj,
      });
    } else {
      currentCandidate.__sourceRowNums.push(r + 1);

      const subIndex = currentCandidate.subRecords.length + 1;
      const subObj: SubRecord = {
        __id: `${currentCandidate.__id}_sub_${subIndex}`,
        __sourceRowNum: r + 1,
        status: currentCandidate.workflowStatus || 'Pending',
      };

      for (const col of columns) {
        subObj[col.key] = rowObj[col.key];
        if (
          (currentCandidate[col.key] === null ||
            currentCandidate[col.key] === undefined ||
            currentCandidate[col.key] === '') &&
          !col.isIdentityColumn
        ) {
          if (rowObj[col.key] !== null && rowObj[col.key] !== undefined && rowObj[col.key] !== '') {
            currentCandidate[col.key] = rowObj[col.key];
          }
        }
      }
      currentCandidate.subRecords.push(subObj);

      flatRows.push({
        __id: `row_${r + 1}`,
        __rowNum: r + 1,
        __parentCandidateId: currentCandidate.__id,
        __isSubRow: true,
        caseStatus: currentCandidate.caseStatus,
        ...rowObj,
      });
    }
  }

  return { candidates, flatRows, groupingConfig };
}

/**
 * Calculate statistical indicators across the sheet including the 4 case metrics
 */
export function calculateSheetStats(
  rows: DataRow[],
  columns: ColumnDef[],
  candidates: CandidateEntity[] = []
): SheetStats {
  const physicalRowsCount = rows.length;
  const totalRows = candidates.length > 0 ? candidates.length : rows.length;
  const totalCases = totalRows;
  const totalColumns = columns.length;
  let missingValuesCount = 0;

  for (const row of rows) {
    for (const col of columns) {
      const val = row[col.key];
      if (val === null || val === undefined || val === '') {
        missingValuesCount++;
      }
    }
  }

  const totalCells = rows.length * totalColumns;
  const missingValuesRate = totalCells > 0 ? Math.round((missingValuesCount / totalCells) * 1000) / 10 : 0;

  const serialColKeys = columns
    .filter((c) => {
      const l = c.label.toLowerCase();
      return l === 's.no' || l === 'sno' || l === 'sr.no' || l === 'sl.no' || l === 'serial no';
    })
    .map((c) => c.key);

  const seenHashes = new Map<string, string>();
  const duplicateRowIds = new Set<string>();

  for (const cand of candidates.length > 0 ? candidates : rows) {
    const signature = columns
      .filter((c) => !serialColKeys.includes(c.key))
      .map((c) => {
        const val = cand[c.key];
        return val === null || val === undefined ? '' : String(val).toLowerCase().trim();
      })
      .join('|||');

    if (signature.replace(/\|+/g, '').trim().length === 0) continue;

    if (seenHashes.has(signature)) {
      duplicateRowIds.add(cand.__id);
      duplicateRowIds.add(seenHashes.get(signature)!);
    } else {
      seenHashes.set(signature, cand.__id);
    }
  }

  let candidateCol = columns.find((c) => {
    const l = c.label.toLowerCase();
    return (
      l.includes('name of sportsperson') ||
      l.includes('sportsperson') ||
      l.includes('candidate name') ||
      l.includes('student name') ||
      l === 'name' ||
      l.includes('participant') ||
      l.includes('person')
    );
  });

  if (!candidateCol) {
    candidateCol = columns
      .filter((c) => !serialColKeys.includes(c.key) && c.type === 'string' && c.uniqueCount > 1)
      .sort((a, b) => b.uniqueCount - a.uniqueCount)[0];
  }

  const uniqueCandidatesKey = candidateCol?.key;
  const uniqueCandidatesCount =
    candidates.length > 0 ? candidates.length : candidateCol ? candidateCol.uniqueCount : totalRows;

  // The 4 Case Management Metrics
  let pendingCasesCount = 0;
  let transferCasesCount = 0;
  let disposedCasesCount = 0;
  let unclassifiedCasesCount = 0;

  if (candidates.length > 0) {
    for (const c of candidates) {
      const status = c.caseStatus || classifyCaseStatus(c.workflowStatus);
      if (status === 'Pending') pendingCasesCount++;
      else if (status === 'Transferred') transferCasesCount++;
      else if (status === 'Disposed') disposedCasesCount++;
      else unclassifiedCasesCount++;
    }
  } else {
    for (const r of rows) {
      const status = (r as any).caseStatus || classifyCaseStatus((r as any).workflowStatus);
      if (status === 'Pending') pendingCasesCount++;
      else if (status === 'Transferred') transferCasesCount++;
      else if (status === 'Disposed') disposedCasesCount++;
      else unclassifiedCasesCount++;
    }
  }

  const statusCol = columns.find((c) => c.isStatusColumn);
  const totalSubRecordsCount = candidates.reduce((acc, c) => acc + (c.subRecords?.length || 0), 0);

  return {
    physicalRowsCount,
    totalRows,
    totalCases,
    totalColumns,
    totalSubRecordsCount,
    missingValuesCount,
    missingValuesRate,
    possibleDuplicateRows: duplicateRowIds.size,
    duplicateRowIds,
    uniqueCandidateColumn: uniqueCandidatesKey,
    uniqueCandidatesCount,
    pendingCasesCount,
    transferCasesCount,
    disposedCasesCount,
    unclassifiedCasesCount,
    pendingCount: pendingCasesCount,
    completedCount: disposedCasesCount,
    inProgressCount: transferCasesCount,
    statusColumnKey: statusCol?.key,
  };
}


/**
 * Main parser entry point for SheetJS workbook
 */
export function parseWorkbook(
  workbook: XLSX.WorkBook,
  fileName: string,
  fileSize: number,
  customHeaderConfigs?: Record<string, Partial<HeaderConfig>>,
  customGroupingConfigs?: Record<string, Partial<GroupingConfig>>
): ParsedWorkbook {
  const sheetNames = workbook.SheetNames;
  const sheets: SheetData[] = [];

  for (const name of sheetNames) {
    const ws = workbook.Sheets[name];
    if (!ws) continue;

    const rawMatrix = XLSX.utils.sheet_to_json<any[]>(ws, {
      header: 1,
      defval: null,
      blankrows: true,
      raw: true,
    });

    const merges = ws['!merges'] || [];
    const detectedConfig = detectHeaderLayout(rawMatrix, merges);
    const customConfig = customHeaderConfigs?.[name];
    const headerConfig: HeaderConfig = {
      headerRowStart: customConfig?.headerRowStart ?? detectedConfig.headerRowStart,
      headerRowEnd: customConfig?.headerRowEnd ?? detectedConfig.headerRowEnd,
      dataRowStart: customConfig?.dataRowStart ?? detectedConfig.dataRowStart,
    };

    const { columns } = buildColumnDefinitions(rawMatrix, headerConfig, merges);
    const { candidates, flatRows, groupingConfig } = buildHierarchicalEntities(
      rawMatrix,
      columns,
      headerConfig.dataRowStart,
      merges,
      customGroupingConfigs?.[name]
    );

    const stats = calculateSheetStats(flatRows, columns, candidates);

    sheets.push({
      sheetName: name,
      rawMatrix,
      headers: columns,
      rows: flatRows,
      candidates,
      stats,
      headerConfig,
      groupingConfig,
    });
  }

  // Create deep clone for originalSheets to preserve immutable original imported state
  const originalSheets = JSON.parse(JSON.stringify(sheets));

  return {
    fileName,
    fileSize,
    sheetNames,
    sheets,
    originalSheets,
    activeSheetIndex: 0,
    uploadedAt: new Date(),
    isModified: false,
  };
}

/**
 * Parses raw ArrayBuffer or File
 */
export async function parseFile(file: File): Promise<ParsedWorkbook> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    cellNF: true,
    cellText: true,
  });

  return parseWorkbook(workbook, file.name, file.size);
}

/**
 * Universal Multi-Mode Export Function:
 * Supports:
 * - 'original': unedited original imported records
 * - 'updated': all current edits and data modifications
 * - 'filtered': records matching active filters
 * - 'selected': only user-checked rows
 * - 'normalized': Candidate sheet + SubRecords sheet with foreign keys (or repeated parent info in CSV)
 */
export function exportDataset(
  rows: DataRow[],
  columns: ColumnDef[],
  format: 'xlsx' | 'csv',
  baseFileName: string = 'export',
  exportType: 'original' | 'updated' | 'filtered' | 'selected' | 'normalized' = 'updated',
  candidates: CandidateEntity[] = []
): void {
  const timestamp = new Date().toISOString().slice(0, 10);
  const cleanBase = baseFileName.replace(/\.[^/.]+$/, '');
  const fileName = `${cleanBase}_${exportType}_${timestamp}.${format}`;

  if (exportType === 'normalized' && format === 'xlsx' && candidates.length > 0) {
    // Generate two worksheets: Candidates and SubRecords
    const wb = XLSX.utils.book_new();

    // 1. Candidates sheet
    const candExport = candidates.map((c) => {
      const obj: Record<string, any> = { 'Candidate ID': c.__id, 'Workflow Status': c.workflowStatus };
      for (const col of columns) {
        if (!col.isSubRecordColumn) {
          obj[col.label] = c[col.key] ?? '';
        }
      }
      return obj;
    });
    const wsCandidates = XLSX.utils.json_to_sheet(candExport);
    XLSX.utils.book_append_sheet(wb, wsCandidates, 'Candidates');

    // 2. SubRecords sheet
    const subExport: any[] = [];
    for (const c of candidates) {
      if (c.subRecords && c.subRecords.length > 0) {
        for (const sub of c.subRecords) {
          const subObj: Record<string, any> = {
            'Parent Candidate ID': c.__id,
            'Candidate Name': c.name || c.name_of_sportsperson || c[columns[1]?.key] || '',
            'Sub-Record ID': sub.__id,
            Status: sub.status || c.workflowStatus,
          };
          for (const col of columns) {
            if (col.isSubRecordColumn || sub[col.key] !== undefined) {
              subObj[col.label] = sub[col.key] ?? '';
            }
          }
          subExport.push(subObj);
        }
      }
    }

    if (subExport.length > 0) {
      const wsSub = XLSX.utils.json_to_sheet(subExport);
      XLSX.utils.book_append_sheet(wb, wsSub, 'SubRecords');
    }

    XLSX.writeFile(wb, fileName);
    return;
  }

  // Standard export: flat rows or repeating parent info across associated child rows
  const exportData = rows.map((row) => {
    const cleanRow: Record<string, any> = {};
    for (const col of columns) {
      const val = row[col.key];
      cleanRow[col.label] = val === null || val === undefined ? '' : val;
    }
    return cleanRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  if (format === 'csv') {
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    XLSX.writeFile(workbook, fileName);
  }
}
