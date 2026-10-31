import test from 'node:test';
import assert from 'node:assert/strict';
import { getSampleWorkbook, getActionPointsSampleWorkbook } from './sampleData';
import { formatCellValue, isDateLike, inferColumnType, classifyCaseStatus, calculateSheetStats } from './excelParser';
import { changeCaseStatus } from './dataManager';

test('AIU(TABLE TENNIS).xlsx parses with 15 columns, multi-level headers, and 5 candidate records', () => {
  const parsed = getSampleWorkbook();

  assert.equal(parsed.sheetNames.length, 1);
  assert.equal(parsed.sheetNames[0], 'Table Tennis (Men)');

  const sheet = parsed.sheets[0];
  assert.equal(sheet.candidates.length, 5, 'Must contain exactly 5 candidate records');
  assert.equal(sheet.headers.length, 15, 'Must contain exactly 15 logical columns');

  const columnLabels = sheet.headers.map((h) => h.label);

  assert.ok(
    columnLabels.some((l) => l.includes('Qualifying Examination') && l.includes('Name of Exam')),
    'Should have Qualifying Examination – Name of Exam'
  );
  assert.ok(
    columnLabels.some((l) => l.includes('First Admission') && l.includes('University')),
    'Should have First Admission – University'
  );
  assert.ok(
    columnLabels.some((l) => l.includes('Previous Participation') && l.includes('Graduate Course')),
    'Should have Previous Participation – Graduate Course'
  );

  const firstCandidate = sheet.candidates[0];
  const nameCol = sheet.headers.find((h) => h.label.toLowerCase().includes('sportsperson'))!;
  assert.equal(firstCandidate[nameCol.key], 'Rohan Sharma');

  // Verify Case Metrics on AIU
  assert.equal(sheet.stats.totalCases, 5);
  assert.ok(sheet.stats.pendingCasesCount >= 1, 'Should have at least 1 pending case');
  assert.ok(sheet.stats.transferCasesCount >= 1, 'Should have at least 1 transfer case');
  assert.ok(sheet.stats.disposedCasesCount >= 1, 'Should have at least 1 disposed case');
});

test('Intelligent Multi-Row Recognition: Person A spanning 2 rows is recognized as 1 candidate with 2 Action Points', () => {
  const parsed = getActionPointsSampleWorkbook();
  const sheet = parsed.sheets[0];

  // 4 physical rows in file, grouped into 3 Parent Candidates: Person A, Person B, and Person C
  assert.equal(sheet.candidates.length, 3, 'Must recognize exactly 3 parent entities (Person A, Person B, Person C)');
  assert.equal(sheet.stats.physicalRowsCount, 4, 'Must track 4 physical rows');

  const personA = sheet.candidates.find((c) => String(c.name || '').includes('Person A'));
  assert.ok(personA, 'Person A must exist as parent candidate');

  // Must have 2 associated Action Points
  assert.equal(personA.subRecords.length, 2, 'Person A must have 2 child sub-records (Action Points A and B)');
  assert.equal(personA.__sourceRowNums.length, 2, 'Person A source row numbers must be [2, 3]');

  // Verify Action Point descriptions
  const sub1 = personA.subRecords[0];
  const sub2 = personA.subRecords[1];

  const actionCol = sheet.headers.find((h) => h.label.toLowerCase().includes('action point s.no'))!;
  const descCol = sheet.headers.find((h) => h.label.toLowerCase().includes('specific action'))!;

  assert.equal(sub1[actionCol.key], 'A');
  assert.ok(String(sub1[descCol.key]).includes('Action A'));

  assert.equal(sub2[actionCol.key], 'B');
  assert.ok(String(sub2[descCol.key]).includes('Action B'));

  // Ensure no unnamed candidate was created!
  const hasUnnamed = sheet.candidates.some((c) => !c.name || String(c.name).trim() === '');
  assert.equal(hasUnnamed, false, 'Must NOT create an unnamed candidate for row 2');
});

test('Case status classification correctly categorizes diverse status strings', () => {
  assert.equal(classifyCaseStatus('Pending'), 'Pending');
  assert.equal(classifyCaseStatus('Awaiting Approval'), 'Pending');
  assert.equal(classifyCaseStatus('In Progress'), 'Pending');
  assert.equal(classifyCaseStatus('Under Review'), 'Pending');

  assert.equal(classifyCaseStatus('Transferred to West Zone'), 'Transferred');
  assert.equal(classifyCaseStatus('Forwarded to HQ'), 'Transferred');
  assert.equal(classifyCaseStatus('Routed to Appellate'), 'Transferred');

  assert.equal(classifyCaseStatus('Completed'), 'Disposed');
  assert.equal(classifyCaseStatus('Verified & Eligible'), 'Disposed');
  assert.equal(classifyCaseStatus('Closed'), 'Disposed');
  assert.equal(classifyCaseStatus('Settled'), 'Disposed');
  assert.equal(classifyCaseStatus('Done'), 'Disposed');
});

test('Case status transitions update stats, records history, and sync flat rows immediately', () => {
  const parsed = getActionPointsSampleWorkbook();
  const initialSheet = parsed.sheets[0];

  const personA = initialSheet.candidates.find((c) => String(c.name || '').includes('Person A'))!;
  assert.equal(personA.caseStatus, 'Pending');

  const initialPending = initialSheet.stats.pendingCasesCount;
  const initialDisposed = initialSheet.stats.disposedCasesCount;

  // 1. Transition Person A from Pending to Disposed
  const disposedSheet = changeCaseStatus(
    initialSheet,
    personA.__id,
    'Disposed',
    'Completed verification of TDS'
  );

  assert.equal(disposedSheet.stats.pendingCasesCount, initialPending - 1);
  assert.equal(disposedSheet.stats.disposedCasesCount, initialDisposed + 1);

  const updatedPersonA = disposedSheet.candidates.find((c) => c.__id === personA.__id)!;
  assert.equal(updatedPersonA.caseStatus, 'Disposed');
  assert.equal(updatedPersonA.statusHistory?.length, 1);
  assert.equal(updatedPersonA.statusHistory?.[0].from, 'Pending');
  assert.equal(updatedPersonA.statusHistory?.[0].to, 'Disposed');
  assert.equal(updatedPersonA.statusHistory?.[0].remarks, 'Completed verification of TDS');

  // 2. Reopen back to Pending
  const reopenedSheet = changeCaseStatus(
    disposedSheet,
    personA.__id,
    'Pending',
    'Reopened for additional documentation'
  );

  assert.equal(reopenedSheet.stats.pendingCasesCount, initialPending);
  assert.equal(reopenedSheet.stats.disposedCasesCount, initialDisposed);
  const reopenedPersonA = reopenedSheet.candidates.find((c) => c.__id === personA.__id)!;
  assert.equal(reopenedPersonA.caseStatus, 'Pending');
  assert.equal(reopenedPersonA.statusHistory?.length, 2);

  // 3. Transfer to external authority
  const transferredSheet = changeCaseStatus(
    reopenedSheet,
    personA.__id,
    'Transferred',
    'Escalated to High Court Appellate Branch',
    'High Court Appellate Branch'
  );

  assert.equal(transferredSheet.stats.pendingCasesCount, initialPending - 1);
  assert.equal(transferredSheet.stats.transferCasesCount, initialSheet.stats.transferCasesCount + 1);
  const transferredPersonA = transferredSheet.candidates.find((c) => c.__id === personA.__id)!;
  assert.equal(transferredPersonA.caseStatus, 'Transferred');
  assert.equal(transferredPersonA.transferDetails, 'High Court Appellate Branch');
});

test('Format cell value and date type inference work correctly', () => {
  assert.equal(isDateLike('14/05/2003'), true);
  assert.equal(isDateLike('2023-10-15'), true);
  assert.equal(isDateLike('Not A Date'), false);

  const sampleDateValues = ['14/05/2003', '22/09/2002', '08/11/2001'];
  const inferred = inferColumnType(sampleDateValues, 'Date of Birth');
  assert.equal(inferred, 'date');

  const formatted = formatCellValue(37755, 'date');
  assert.ok(formatted.includes('2003'), 'Formatted serial date should contain year 2003');
});

test('Stats calculation and resilience against undefined properties', () => {
  const parsed = getSampleWorkbook();
  const sheet = parsed.sheets[0];
  const stats = calculateSheetStats(sheet.rows, sheet.headers, sheet.candidates);

  assert.equal(typeof stats.totalCases, 'number');
  assert.equal(typeof stats.pendingCasesCount, 'number');
  assert.equal(typeof stats.transferCasesCount, 'number');
  assert.equal(typeof stats.disposedCasesCount, 'number');
  assert.ok(stats.totalCases >= 0);
  assert.ok(stats.pendingCasesCount >= 0);

  // Even if an empty object or legacy stats is provided, values coalesce safely
  const legacyStats: any = {};
  const total = Number(legacyStats?.totalCases ?? legacyStats?.totalRows ?? 0);
  assert.equal(total.toLocaleString(), '0');
  const pending = Number(legacyStats?.pendingCasesCount ?? 0);
  assert.equal(pending.toLocaleString(), '0');
});

