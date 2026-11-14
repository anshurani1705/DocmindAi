import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Plus,
  File, FileType, FilePieChart, Trash2
} from 'lucide-react';
import { documentApi } from '../services/api';
import { useDocumentStore } from '../store/documentStore';
import type { UploadingFile } from '../types';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/csv': ['.csv'],
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText className="w-4 h-4 text-rose-400" />;
  if (ext === 'csv') return <FilePieChart className="w-4 h-4 text-emerald-400" />;
  if (ext === 'docx') return <FileType className="w-4 h-4 text-blue-400" />;
  return <File className="w-4 h-4 text-slate-400" />;
}

const UploadDialog: React.FC<UploadDialogProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { fetchDocuments } = useDocumentStore();

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles: UploadingFile[] = accepted.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      progress: 0,
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    const pending = files.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;
    setIsUploading(true);

    await Promise.all(
      pending.map(async (uf) => {
        setFiles((prev) => prev.map((f) => (f.id === uf.id ? { ...f, status: 'uploading' } : f)));
        try {
          const res = await documentApi.upload(uf.file, (pct) => {
            setFiles((prev) => prev.map((f) => (f.id === uf.id ? { ...f, progress: pct } : f)));
          });
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uf.id ? { ...f, status: 'done', progress: 100, result: res.data } : f
            )
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          setFiles((prev) => prev.map((f) => (f.id === uf.id ? { ...f, status: 'error', error: msg } : f)));
        }
      })
    );

    setIsUploading(false);
    await fetchDocuments();
    const successCount = files.filter((f) => f.status !== 'error').length;
    if (successCount > 0) toast.success(`${successCount} document(s) uploaded & indexed`);
  };

  const handleClose = () => {
    if (!isUploading) { setFiles([]); onClose(); }
  };

  const allDone = files.length > 0 && files.every((f) => f.status === 'done' || f.status === 'error');
  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs" onClick={handleClose} />

      {/* Dialog Card */}
      <div className="relative z-10 w-full max-w-lg bg-[#111827] border border-slate-800 rounded-xl shadow-xl animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0b0f17]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600/10 border border-blue-500/20 rounded-md flex items-center justify-center">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Upload Documents</h2>
              <p className="text-[11px] text-slate-400">Supported: PDF, DOCX, TXT, MD, CSV</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drop zone */}
        <div className="p-5">
          <div
            {...getRootProps()}
            className={clsx(
              'border border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors bg-[#0b0f17]',
              isDragActive
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-slate-800 hover:border-slate-700'
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-200">
                  {isDragActive ? 'Release to upload files' : 'Drop documents here or browse'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Files are partitioned into vector chunks for semantic search
                </p>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          {files.length > 0 && (
            <div className="flex items-center justify-between mt-3 px-1">
              <span className="text-[11px] text-slate-400 font-mono">
                {files.length} selected &middot; {formatBytes(totalSize)}
              </span>
              <button
                onClick={() => setFiles([])}
                disabled={isUploading}
                className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
          )}

          {/* File Queue */}
          {files.length > 0 && (
            <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {files.map((uf) => (
                <div key={uf.id} className="flex items-center gap-2.5 p-2 bg-[#0b0f17] rounded-lg border border-slate-800">
                  <div className="p-1.5 bg-slate-900 rounded flex-shrink-0">
                    {getFileIcon(uf.file.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-slate-200 font-medium truncate max-w-[220px]">{uf.file.name}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        <span className="text-[10px] text-slate-500 font-mono">{formatBytes(uf.file.size)}</span>
                        {uf.status === 'pending' && (
                          <button onClick={() => removeFile(uf.id)} className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        {uf.status === 'uploading' && <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />}
                        {uf.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {uf.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                      <div
                        className={clsx(
                          'h-1 rounded-full transition-all duration-200',
                          uf.status === 'done' ? 'bg-emerald-500' :
                          uf.status === 'error' ? 'bg-rose-500' :
                          uf.status === 'uploading' ? 'bg-blue-500' : 'bg-slate-800'
                        )}
                        style={{ width: uf.status === 'pending' ? '0%' : `${uf.progress}%` }}
                      />
                    </div>
                    {uf.status === 'error' && (
                      <p className="text-[10px] text-rose-400 mt-1">{uf.error}</p>
                    )}
                    {uf.status === 'done' && uf.result && (
                      <p className="text-[10px] text-emerald-400 mt-0.5">
                        Indexed &middot; {uf.result.chunksCreated ?? 0} chunks created
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-800 bg-[#0b0f17]">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            {allDone ? 'Done' : 'Cancel'}
          </button>
          {!allDone && (
            <button
              onClick={handleUpload}
              disabled={isUploading || pendingCount === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isUploading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> <span>Indexing...</span></>
              ) : (
                <><Plus className="w-3.5 h-3.5" /> <span>Upload {pendingCount > 0 ? `${pendingCount} File${pendingCount > 1 ? 's' : ''}` : ''}</span></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadDialog;
