import test from 'node:test';
import assert from 'node:assert/strict';
import { getSampleWorkbook, getActionPointsSampleWorkbook } from './sampleData';
import { formatCellValue, isDateLike, inferColumnType } from './excelParser';

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
});

test('Intelligent Multi-Row Recognition: Person A spanning 2 rows is recognized as 1 candidate with 2 Action Points', () => {
  const parsed = getActionPointsSampleWorkbook();
  const sheet = parsed.sheets[0];

  // 3 physical rows in file, but must be grouped into exactly 2 Parent Candidates: Person A and Person B
  assert.equal(sheet.candidates.length, 2, 'Must recognize exactly 2 parent entities (Person A and Person B)');
  assert.equal(sheet.stats.physicalRowsCount, 3, 'Must track 3 physical rows');

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
