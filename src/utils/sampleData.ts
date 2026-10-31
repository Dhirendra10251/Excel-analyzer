import * as XLSX from 'xlsx';
import { ParsedWorkbook } from '../types/spreadsheet';
import { parseWorkbook } from './excelParser';

/**
 * Creates the official AIU(TABLE TENNIS).xlsx workbook structure
 * with 1 worksheet, 15 columns, multi-level headers, and 5 candidate records.
 */
export function createAiuTableTennisWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const data: any[][] = [
    [
      'ASSOCIATION OF INDIAN UNIVERSITIES (AIU) - INTER UNIVERSITY TABLE TENNIS TOURNAMENT ELIGIBILITY PROFORMA',
      null, null, null, null, null, null, null, null, null, null, null, null, null, null,
    ],
    [
      'S.No',
      'Name of Sportsperson',
      "Father's Name",
      'Date of Birth',
      'College in Which Studying',
      'Qualifying Examination',
      null,
      'Present Class',
      'Name of Present Course',
      'Course Duration',
      'First Admission',
      null,
      'Previous Participation',
      null,
      'Remarks',
    ],
    [
      null,
      null,
      null,
      null,
      null,
      'Name of Exam',
      'Date & Year',
      null,
      null,
      null,
      'University',
      'Present Course',
      'Graduate Course',
      'P.G. Course',
      null,
    ],
    [
      1,
      'Rohan Sharma',
      'Suresh Sharma',
      '14/05/2003',
      "St. Xavier's College",
      '12th Senior Secondary',
      '2021',
      '3rd sem',
      'B.Tech Computer Science',
      '4 Years',
      'Mumbai University',
      'B.Tech',
      '2023 Inter-College Winner',
      'NIL',
      'Verified & Eligible',
    ],
    [
      2,
      'Priya Deshmukh',
      'Arvind Deshmukh',
      '22/09/2002',
      'RAIT Engineering College',
      'H.S.C. Science',
      '2020',
      '5th sem',
      'B.E. Electronics',
      '4 Years',
      'Mumbai University',
      'B.E.',
      '2022 State Silver Medalist',
      'NIL',
      'Eligible (Captain)',
    ],
    [
      3,
      'Amitav Roy',
      'Debabrata Roy',
      '08/11/2001',
      'College of Commerce',
      'B.Com',
      '2022',
      '1st sem',
      'M.Com Finance',
      '2 Years',
      'Delhi University',
      'M.Com',
      '2021 University Bronze',
      '2023 National Semis',
      'Transferred to Sports Authority / Inter-Zone',
    ],
    [
      4,
      'Tanvi Verma',
      'Rajesh Verma',
      '17/03/2004',
      'National Sports Academy',
      '10+2 Arts',
      '2022',
      '2nd sem',
      'B.A. Sports Management',
      '3 Years',
      'Pune University',
      'B.A.',
      'NIL',
      'NIL',
      'Pending Final Semester Marksheet',
    ],
    [
      5,
      'Kevin Matthew',
      'Joseph Matthew',
      '30/08/2003',
      'Loyola Institute',
      '12th ISC',
      '2021',
      '4th sem',
      'B.Sc Data Science',
      '3 Years',
      'Madras University',
      'B.Sc',
      '2023 South Zone TT Champion',
      'NIL',
      'Eligible',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
    { s: { r: 1, c: 5 }, e: { r: 1, c: 6 } },
    { s: { r: 1, c: 10 }, e: { r: 1, c: 11 } },
    { s: { r: 1, c: 12 }, e: { r: 1, c: 13 } },
    { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
    { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },
    { s: { r: 1, c: 2 }, e: { r: 2, c: 2 } },
    { s: { r: 1, c: 3 }, e: { r: 2, c: 3 } },
    { s: { r: 1, c: 4 }, e: { r: 2, c: 4 } },
    { s: { r: 1, c: 7 }, e: { r: 2, c: 7 } },
    { s: { r: 1, c: 8 }, e: { r: 2, c: 8 } },
    { s: { r: 1, c: 9 }, e: { r: 2, c: 9 } },
    { s: { r: 1, c: 14 }, e: { r: 2, c: 14 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Table Tennis (Men)');
  return wb;
}

/**
 * Creates the Mandatory Multi-Row Test Case:
 * "Action_Points_Refunds.xlsx"
 * Demonstrating:
 * - Person A spanning 2 physical rows with 2 Action Points (A & B) and blank identity on row 2
 * - Vertically merged refund amount & address
 * - Status values (Pending -> Done)
 */
export function createActionPointsWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const data: any[][] = [
    [
      'S.No',
      'PAN No',
      'Name',
      'Action Point S.No.',
      'Specific Action Points',
      'Refund Amount (INR)',
      'Address',
      'Status',
    ],
    [
      1,
      'PAN-001',
      'Person A',
      'A',
      'Description of Action A: Submit Form 16 & Bank Mandate',
      2531270,
      'Hyderabad',
      'Pending',
    ],
    [
      null,
      null,
      null,
      'B',
      'Description of Action B: Verify TDS Deductions with IT Dept',
      null,
      null,
      'Pending',
    ],
    [
      2,
      'PAN-002',
      'Person B',
      'A',
      'Document Clearance and Final Settlement',
      1420000,
      'Bengaluru',
      'Completed',
    ],
    [
      3,
      'PAN-003',
      'Person C',
      'A',
      'Audit Transfer: Escalated to Regional Appellate Authority',
      875000,
      'Chennai',
      'Transferred',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Vertical merges for Person A on rows 1 and 2
  ws['!merges'] = [
    { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } }, // S.No
    { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } }, // PAN No
    { s: { r: 1, c: 2 }, e: { r: 2, c: 2 } }, // Name
    { s: { r: 1, c: 5 }, e: { r: 2, c: 5 } }, // Refund Amount
    { s: { r: 1, c: 6 }, e: { r: 2, c: 6 } }, // Address
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Action Points & Refunds');
  return wb;
}

export function getSampleWorkbook(): ParsedWorkbook {
  const wb = createAiuTableTennisWorkbook();
  const rawBytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return parseWorkbook(wb, 'AIU(TABLE TENNIS).xlsx', rawBytes.byteLength || 15360);
}

export function getActionPointsSampleWorkbook(): ParsedWorkbook {
  const wb = createActionPointsWorkbook();
  const rawBytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return parseWorkbook(wb, 'Action_Points_Refunds.xlsx', rawBytes.byteLength || 10240);
}

export function downloadSampleAiuFile(): void {
  const wb = createAiuTableTennisWorkbook();
  XLSX.writeFile(wb, 'AIU(TABLE TENNIS).xlsx');
}

export function downloadActionPointsFile(): void {
  const wb = createActionPointsWorkbook();
  XLSX.writeFile(wb, 'Action_Points_Refunds.xlsx');
}
