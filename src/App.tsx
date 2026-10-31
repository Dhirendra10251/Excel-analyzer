/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  CandidateEntity,
  DataRow,
  ParsedWorkbook,
  SheetData,
} from './types/spreadsheet';
import { getActionPointsSampleWorkbook, getSampleWorkbook } from './utils/sampleData';
import {
  clearSessionFromStorage,
  loadSessionFromStorage,
  saveSessionToStorage,
} from './utils/dataManager';
import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { OverviewStats } from './components/OverviewStats';
import { DataExplorer } from './components/DataExplorer';
import { CandidateSearch } from './components/CandidateSearch';
import { ColumnInfoViewer } from './components/ColumnInfoViewer';
import { DataInsights } from './components/DataInsights';
import { CaseStatusPage } from './components/CaseStatusPage';
import { CandidateProfileModal } from './components/CandidateProfileModal';
import { HeaderConfigModal } from './components/HeaderConfigModal';
import { GroupingPreviewModal } from './components/GroupingPreviewModal';
import { FileUploadModal } from './components/FileUploadModal';
import { Upload, FileSpreadsheet, Sparkles, GitBranch } from 'lucide-react';

export default function App() {
  // Initialize from session storage or fallback to AIU Table Tennis
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(() => {
    const cached = loadSessionFromStorage();
    if (cached && cached.sheets && cached.sheets.length > 0) {
      return cached;
    }
    return getSampleWorkbook();
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHeaderConfigOpen, setIsHeaderConfigOpen] = useState(false);
  const [isGroupingConfigOpen, setIsGroupingConfigOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateEntity | null>(null);

  const activeSheet = workbook ? workbook.sheets[workbook.activeSheetIndex] : null;

  // Persist edits to local storage
  useEffect(() => {
    if (workbook) {
      saveSessionToStorage(workbook);
    }
  }, [workbook]);

  const handleSelectSheet = (index: number) => {
    if (!workbook) return;
    setWorkbook({
      ...workbook,
      activeSheetIndex: index,
    });
  };

  const handleReset = () => {
    clearSessionFromStorage();
    setWorkbook(null);
    setActiveTab('overview');
  };

  const handleLoadSample = () => {
    const sample = getSampleWorkbook();
    clearSessionFromStorage();
    setWorkbook(sample);
    setActiveTab('overview');
  };

  const handleLoadActionPointsSample = () => {
    const sample = getActionPointsSampleWorkbook();
    clearSessionFromStorage();
    setWorkbook(sample);
    setActiveTab('overview');
  };

  // Update active sheet after cell edit, status change, or row addition/deletion
  const handleUpdateSheet = (updatedSheet: SheetData) => {
    if (!workbook) return;
    const updatedSheets = [...workbook.sheets];
    updatedSheets[workbook.activeSheetIndex] = updatedSheet;

    const updatedWorkbook: ParsedWorkbook = {
      ...workbook,
      sheets: updatedSheets,
      isModified: true,
    };

    setWorkbook(updatedWorkbook);

    // If a candidate is open in modal, keep it in sync
    if (selectedCandidate) {
      const refreshedCand = updatedSheet.candidates.find((c) => c.__id === selectedCandidate.__id);
      if (refreshedCand) {
        setSelectedCandidate(refreshedCand);
      }
    }
  };

  // Revert active sheet to original imported copy
  const handleRevertOriginal = () => {
    if (!workbook || !workbook.originalSheets) return;
    const originalSheet = workbook.originalSheets[workbook.activeSheetIndex];
    if (!originalSheet) return;

    const restoredSheet: SheetData = JSON.parse(JSON.stringify(originalSheet));
    const updatedSheets = [...workbook.sheets];
    updatedSheets[workbook.activeSheetIndex] = restoredSheet;

    setWorkbook({
      ...workbook,
      sheets: updatedSheets,
      isModified: false,
    });
    clearSessionFromStorage();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Application Header */}
      <Header
        workbook={workbook}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenHeaderConfig={() => setIsHeaderConfigOpen(true)}
        onOpenGroupingConfig={() => setIsGroupingConfigOpen(true)}
        onReset={handleReset}
        onLoadSample={handleLoadSample}
        onLoadActionPointsSample={handleLoadActionPointsSample}
        onSelectSheet={handleSelectSheet}
        isModified={workbook?.isModified}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Dark Sidebar Navigation */}
        <SidebarNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          recordCount={activeSheet?.candidates.length || 0}
          stats={activeSheet?.stats}
        />

        {/* Dynamic Main Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {!workbook || !activeSheet ? (
              /* Empty state / Welcome dropzone when no file loaded */
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto shadow-xs space-y-6">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Welcome to SheetScout
                  </h2>
                  <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                    Universal Excel and candidate spreadsheet analyzer with editable data management, multi-row parent-child recognition, and multi-format export.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Spreadsheet (.xlsx, .csv)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadActionPointsSample}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-all border border-blue-200"
                  >
                    <GitBranch className="w-4 h-4" />
                    <span>Load Multi-Row Test (Person A)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Load AIU Table Tennis</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 1. Overview Tab */}
                {activeTab === 'overview' && (
                  <OverviewStats
                    workbook={workbook}
                    onNavigateTab={setActiveTab}
                    onOpenHeaderConfig={() => setIsHeaderConfigOpen(true)}
                    onOpenGroupingConfig={() => setIsGroupingConfigOpen(true)}
                  />
                )}

                {/* 2. Data Explorer Tab */}
                {activeTab === 'explorer' && (
                  <DataExplorer
                    sheet={activeSheet}
                    onSelectCandidate={(rowOrCand) => {
                      const cand =
                        (rowOrCand as any).subRecords !== undefined
                          ? (rowOrCand as CandidateEntity)
                          : activeSheet.candidates.find((c) => c.__id === (rowOrCand as DataRow).__parentCandidateId || c.__id === (rowOrCand as DataRow).__id);
                      if (cand) setSelectedCandidate(cand);
                    }}
                    fileName={workbook.fileName}
                    onUpdateSheet={handleUpdateSheet}
                    onRevertOriginal={handleRevertOriginal}
                    isModified={workbook.isModified}
                  />
                )}

                {/* 3. Candidate Search Tab */}
                {activeTab === 'search' && (
                  <CandidateSearch
                    sheet={activeSheet}
                    onSelectCandidate={(cand) => setSelectedCandidate(cand)}
                    onUpdateSheet={handleUpdateSheet}
                  />
                )}

                {/* 4. Pending Cases Dedicated Tab */}
                {activeTab === 'pending' && (
                  <CaseStatusPage
                    statusType="Pending"
                    sheet={activeSheet}
                    workbookName={workbook.fileName}
                    onSelectCandidate={(cand) => setSelectedCandidate(cand)}
                    onUpdateSheet={handleUpdateSheet}
                    onNavigateTab={setActiveTab}
                  />
                )}

                {/* 5. Transfer Cases Dedicated Tab */}
                {activeTab === 'transfer' && (
                  <CaseStatusPage
                    statusType="Transferred"
                    sheet={activeSheet}
                    workbookName={workbook.fileName}
                    onSelectCandidate={(cand) => setSelectedCandidate(cand)}
                    onUpdateSheet={handleUpdateSheet}
                    onNavigateTab={setActiveTab}
                  />
                )}

                {/* 6. Disposed Cases Dedicated Tab */}
                {activeTab === 'disposed' && (
                  <CaseStatusPage
                    statusType="Disposed"
                    sheet={activeSheet}
                    workbookName={workbook.fileName}
                    onSelectCandidate={(cand) => setSelectedCandidate(cand)}
                    onUpdateSheet={handleUpdateSheet}
                    onNavigateTab={setActiveTab}
                  />
                )}

                {/* 7. Column Information Tab */}
                {activeTab === 'columns' && (
                  <ColumnInfoViewer sheet={activeSheet} />
                )}

                {/* 8. Data Insights Tab */}
                {activeTab === 'insights' && (
                  <DataInsights sheet={activeSheet} />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Candidate Full Profile Drawer/Modal */}
      {selectedCandidate && activeSheet && (
        <CandidateProfileModal
          candidate={selectedCandidate}
          columns={activeSheet.headers}
          allCandidates={activeSheet.candidates}
          onClose={() => setSelectedCandidate(null)}
          onNavigateCandidate={(next) => setSelectedCandidate(next)}
          onUpdateSheet={handleUpdateSheet}
          sheet={activeSheet}
        />
      )}

      {/* Header Configuration Modal */}
      {workbook && (
        <HeaderConfigModal
          workbook={workbook}
          isOpen={isHeaderConfigOpen}
          onClose={() => setIsHeaderConfigOpen(false)}
          onSaveConfig={(updated) => setWorkbook(updated)}
        />
      )}

      {/* Multi-Row Grouping Configuration Modal */}
      {workbook && (
        <GroupingPreviewModal
          workbook={workbook}
          isOpen={isGroupingConfigOpen}
          onClose={() => setIsGroupingConfigOpen(false)}
          onUpdateWorkbook={(updated) => setWorkbook(updated)}
        />
      )}

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onWorkbookLoaded={(newWb) => {
          setWorkbook(newWb);
          setActiveTab('overview');
        }}
      />
    </div>
  );
}
