import React, { useState } from 'react';
import {
  FileText, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, Clock, AlertCircle, Loader2,
  Upload, RefreshCw, X, FileType, FilePieChart, File,
  FolderOpen, MessageSquare
} from 'lucide-react';
import { useDocumentStore } from '../store/documentStore';
import { useConversationStore } from '../store/conversationStore';
import type { DocumentMetadataDto, DocumentStatus } from '../types';
import ChatsPanel from './ChatsPanel';
import { clsx } from 'clsx';

interface SidebarProps {
  onUploadClick: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getFileIcon(contentType: string): React.ReactNode {
  if (contentType.includes('pdf')) return <FileText className="w-3.5 h-3.5 text-rose-400" />;
  if (contentType.includes('word') || contentType.includes('docx')) return <FileType className="w-3.5 h-3.5 text-blue-400" />;
  if (contentType.includes('csv')) return <FilePieChart className="w-3.5 h-3.5 text-emerald-400" />;
  return <File className="w-3.5 h-3.5 text-slate-400" />;
}

const STATUS_CONFIG: Record<DocumentStatus, { icon: React.ReactNode; color: string; label: string }> = {
  INDEXED: {
    icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    label: 'Ready',
  },
  PROCESSING: {
    icon: <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    label: 'Indexing',
  },
  UPLOADING: {
    icon: <Clock className="w-3 h-3 text-blue-400" />,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    label: 'Uploading',
  },
  FAILED: {
    icon: <AlertCircle className="w-3 h-3 text-rose-400" />,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    label: 'Failed',
  },
};

const StatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.INDEXED;
  return (
    <span className={clsx('inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium border', cfg.color)}>
      {cfg.icon}
      <span>{cfg.label}</span>
    </span>
  );
};

const DocumentItem: React.FC<{ doc: DocumentMetadataDto }> = ({ doc }) => {
  const { selectedDocumentId, setSelectedDocumentId, deleteDocument } = useDocumentStore();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isSelected = selectedDocumentId === doc.id;

  const handleDelete = () => {
    if (confirmDelete) {
      deleteDocument(doc.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2500);
    }
  };

  return (
    <div
      className={clsx(
        'rounded-lg border transition-colors overflow-hidden',
        isSelected
          ? 'border-blue-500/60 bg-blue-500/5'
          : 'border-slate-800 bg-[#0b0f17] hover:border-slate-700 hover:bg-[#111827]'
      )}
    >
      {/* Row Header */}
      <div
        className="flex items-center gap-2 p-2.5 cursor-pointer select-none"
        onClick={() => setSelectedDocumentId(isSelected ? null : doc.id)}
      >
        <div className="p-1 rounded bg-slate-900 border border-slate-800 flex-shrink-0">
          {getFileIcon(doc.contentType)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-200 truncate leading-tight" title={doc.filename}>
            {doc.filename}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <StatusBadge status={doc.status} />
            <span className="text-[10px] text-slate-500 font-mono">{formatBytes(doc.fileSize)}</span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
            className="p-1 hover:bg-slate-800 text-slate-500 hover:text-slate-300 rounded cursor-pointer"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            aria-label={confirmDelete ? 'Confirm delete' : 'Delete document'}
            className={clsx(
              'p-1 rounded text-xs transition-colors cursor-pointer',
              confirmDelete
                ? 'bg-rose-500/20 text-rose-400 px-1.5 font-medium'
                : 'hover:bg-rose-500/10 hover:text-rose-400 text-slate-500'
            )}
          >
            {confirmDelete ? 'Delete?' : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Metadata */}
      {expanded && (
        <div className="px-2.5 pb-2.5 pt-1 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400">
          <div className="grid grid-cols-3 gap-1.5 text-center mt-1">
            <div className="bg-[#111827] rounded p-1.5 border border-slate-800">
              <span className="block font-semibold text-slate-200">{doc.totalChunks ?? 0}</span>
              <span className="text-[9px] text-slate-500 uppercase">Chunks</span>
            </div>
            <div className="bg-[#111827] rounded p-1.5 border border-slate-800">
              <span className="block font-semibold text-slate-200">{doc.totalPages ?? '-'}</span>
              <span className="text-[9px] text-slate-500 uppercase">Pages</span>
            </div>
            <div className="bg-[#111827] rounded p-1.5 border border-slate-800">
              <span className="block font-semibold text-slate-200 truncate">{formatDate(doc.createdAt)}</span>
              <span className="text-[9px] text-slate-500 uppercase">Date</span>
            </div>
          </div>
          {doc.errorMessage && (
            <div className="mt-2 p-1.5 bg-rose-500/10 border border-rose-500/20 rounded text-rose-400 text-[10px]">
              {doc.errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ onUploadClick }) => {
  const {
    documents,
    isLoadingDocuments,
    fetchDocuments,
    selectedDocumentId,
    setSelectedDocumentId,
    isSidebarOpen,
    setIsSidebarOpen,
  } = useDocumentStore();

  const { conversations, loadChats } = useConversationStore();
  const [sidebarTab, setSidebarTab] = useState<'documents' | 'chats'>('documents');

  const handleRefresh = () => {
    if (sidebarTab === 'documents') {
      fetchDocuments();
    } else {
      loadChats();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          'flex flex-col h-full bg-[#111827] border-r border-slate-800 transition-all duration-200 flex-shrink-0 z-30 md:static fixed inset-y-0 left-0 top-13 md:top-0',
          isSidebarOpen ? 'w-68' : 'w-0 -translate-x-full md:translate-x-0 overflow-hidden border-r-0'
        )}
      >
        {/* Sidebar Header Tabs */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 flex-shrink-0 bg-[#0b0f17]">
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-md">
            <button
              onClick={() => setSidebarTab('documents')}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
                sidebarTab === 'documents'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Files</span>
              <span className="text-[10px] px-1 rounded bg-slate-900 text-slate-400 font-mono">
                {documents.length}
              </span>
            </button>

            <button
              onClick={() => setSidebarTab('chats')}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
                sidebarTab === 'chats'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>History</span>
              <span className="text-[10px] px-1 rounded bg-slate-900 text-slate-400 font-mono">
                {conversations.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={handleRefresh}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', isLoadingDocuments && 'animate-spin text-blue-400')} />
            </button>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded cursor-pointer md:hidden"
              title="Close sidebar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {sidebarTab === 'chats' ? (
          <ChatsPanel />
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Quick Upload Action */}
            <div className="p-3 border-b border-slate-800 flex-shrink-0">
              <button
                onClick={onUploadClick}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#0b0f17] hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Upload New Document</span>
              </button>
            </div>

            {/* Active Document Filter Filter Banner */}
            {selectedDocumentId && (
              <div className="px-3 py-2 border-b border-slate-800 bg-blue-500/5">
                <div className="flex items-center justify-between text-xs text-blue-400">
                  <span className="truncate">Filtering by selected doc</span>
                  <button
                    onClick={() => setSelectedDocumentId(null)}
                    className="text-[11px] underline hover:text-blue-300 ml-2 cursor-pointer flex-shrink-0"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Document List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {isLoadingDocuments ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 text-slate-400" />
                  Loading repository...
                </div>
              ) : documents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="font-medium text-slate-400">No documents yet</p>
                  <p className="text-[11px] text-slate-500 mt-1">Upload PDF, Word, or Markdown to index.</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <DocumentItem key={doc.id} doc={doc} />
                ))
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
