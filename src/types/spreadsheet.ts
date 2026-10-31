export type ColumnType = 'string' | 'number' | 'date' | 'boolean' | 'empty';

export interface CategoryFrequency {
  value: string;
  count: number;
  percentage: number;
}

export interface ColumnDef {
  key: string;
  label: string;
  originalLabel: string;
  parentHeader?: string;
  subHeader?: string;
  colIndex: number;
  type: ColumnType;
  totalCount: number;
  nonBlankCount: number;
  blankCount: number;
  uniqueCount: number;
  sampleValues: any[];
  categories?: CategoryFrequency[];
  min?: number | string;
  max?: number | string;
  avg?: number;
  isIdentityColumn?: boolean;
  isSubRecordColumn?: boolean;
  isStatusColumn?: boolean;
}

export interface SubRecord {
  __id: string;
  __sourceRowNum: number;
  status?: string;
  [key: string]: any;
}

export type CaseStatus = 'Pending' | 'Transferred' | 'Disposed' | 'Unclassified';

export interface CaseStatusHistoryItem {
  from: string;
  to: string;
  date: string;
  remarks?: string;
}

export interface CandidateEntity {
  __id: string;
  __sourceRowNums: number[];
  workflowStatus: string;
  caseStatus: CaseStatus;
  subRecords: SubRecord[];
  isEdited?: boolean;
  editedFields?: Set<string>;
  transferDetails?: string;
  remarks?: string;
  statusHistory?: CaseStatusHistoryItem[];
  [key: string]: any;
}

export interface DataRow {
  __id: string;
  __rowNum: number;
  __isSubRow?: boolean;
  __parentCandidateId?: string;
  caseStatus?: CaseStatus;
  [key: string]: any;
}

export interface SheetStats {
  physicalRowsCount: number;
  totalRows: number; // Unique candidates/entities count
  totalCases: number;
  totalColumns: number;
  totalSubRecordsCount: number;
  missingValuesCount: number;
  missingValuesRate: number;
  possibleDuplicateRows: number;
  duplicateRowIds: Set<string>;
  uniqueCandidateColumn?: string;
  uniqueCandidatesCount: number;
  // Four Primary Case Categories
  pendingCasesCount: number;
  transferCasesCount: number;
  disposedCasesCount: number;
  unclassifiedCasesCount: number;
  // Backward compatibility
  pendingCount: number;
  completedCount: number;
  inProgressCount: number;
  statusColumnKey?: string;
}

export interface HeaderConfig {
  headerRowStart: number;
  headerRowEnd: number;
  dataRowStart: number;
}

export interface GroupingConfig {
  enabled: boolean;
  identityColKeys: string[];
  subRecordColKeys: string[];
}

export interface SheetData {
  sheetName: string;
  rawMatrix: any[][];
  headers: ColumnDef[];
  rows: DataRow[]; // Flattened rows for classic grid view
  candidates: CandidateEntity[]; // Hierarchical parent-child entities
  stats: SheetStats;
  headerConfig: HeaderConfig;
  groupingConfig: GroupingConfig;
}

export interface ParsedWorkbook {
  fileName: string;
  fileSize: number;
  sheetNames: string[];
  sheets: SheetData[];
  originalSheets?: SheetData[]; // Immutable copy of original imported dataset
  activeSheetIndex: number;
  uploadedAt: Date;
  isModified?: boolean;
}

export type FilterOperator =
  | 'contains'
  | 'equals'
  | 'not_equals'
  | 'starts_with'
  | 'ends_with'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'is_blank'
  | 'is_not_blank'
  | 'in';

export interface ColumnFilter {
  columnKey: string;
  operator: FilterOperator;
  value: any;
  valueTo?: any;
}

export interface SortState {
  columnKey: string;
  direction: 'asc' | 'desc';
}

export type ActiveTab =
  | 'overview'
  | 'explorer'
  | 'search'
  | 'pending'
  | 'transfer'
  | 'disposed'
  | 'columns'
  | 'insights';

export type ExportType = 'original' | 'updated' | 'filtered' | 'selected' | 'normalized';
