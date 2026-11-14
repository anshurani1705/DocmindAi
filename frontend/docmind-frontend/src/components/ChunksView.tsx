import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers, Loader2, FileText, RefreshCw, ChevronDown, ChevronUp,
  Search, Hash, BookOpen, Database, Copy, Check, Tag,
} from 'lucide-react';
import { chatApi } from '../services/api';
import { useDocumentStore } from '../store/documentStore';
import type { CitationDto } from '../types';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const ChunkCard: React.FC<{ chunk: CitationDto; index: number }> = ({ chunk, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const score = chunk.similarityScore != null ? chunk.similarityScore : null;
  const pct = score != null ? (score * 100).toFixed(1) : null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(chunk.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Chunk snippet copied');
  };

  return (
    <div className={clsx(
      'border rounded-lg bg-[#111827] overflow-hidden transition-colors',
      expanded ? 'border-slate-700' : 'border-slate-800 hover:border-slate-700'
    )}>
      {/* Chunk header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Index badge */}
        <div className="flex-shrink-0 w-7 h-7 bg-[#0b0f17] border border-slate-800 rounded flex items-center justify-center font-mono text-xs text-slate-400">
          #{chunk.chunkIndex ?? index}
        </div>

        {/* File & info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-200 truncate">{chunk.fileName}</p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
            {chunk.pageNumber != null && (
              <span className="flex items-center gap-0.5">
                <FileText className="w-2.5 h-2.5" /> p. {chunk.pageNumber}
              </span>
            )}
            <span className="truncate max-w-[240px]">
              {chunk.snippet.slice(0, 70)}…
            </span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {pct != null && (
            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded">
              {pct}% match
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors rounded cursor-pointer"
            title="Copy content"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-800 bg-[#0b0f17] p-3 text-xs">
          <div className="relative bg-[#111827] border border-slate-800 rounded p-3">
            <p className="text-slate-200 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">{chunk.snippet}</p>
          </div>

          {/* Metadata badges */}
          {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/80">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(chunk.metadata)
                  .filter(([k]) => !['snippet'].includes(k))
                  .map(([k, v]) => (
                    <span key={k} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                      {k}: {String(v)}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ChunksView: React.FC = () => {
  const { selectedDocumentId, documents } = useDocumentStore();
  const [chunks, setChunks] = useState<CitationDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  const loadChunks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await chatApi.searchSimilarity({
        query: '*',
        documentId: selectedDocumentId ?? undefined,
        topK: 20,
        similaritySearch: 0,
      });
      setChunks(res.data.matches || []);
    } catch {
      // Fallback: search general terms if wildcard not supported
      try {
        const res2 = await chatApi.searchSimilarity({
          query: 'document overview summary content',
          documentId: selectedDocumentId ?? undefined,
          topK: 20,
          similaritySearch: 0,
        });
        setChunks(res2.data.matches || []);
      } catch {
        toast.error('Could not load vector partitions');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedDocumentId]);

  useEffect(() => {
    loadChunks();
  }, [loadChunks]);

  const filteredChunks = chunks.filter((c) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      c.fileName.toLowerCase().includes(q) ||
      c.snippet.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0b0f17]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex-shrink-0 bg-[#111827]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600/10 border border-blue-500/20 rounded flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <h2 className="text-xs font-semibold text-slate-200">Vector Partitions & Chunks</h2>
            {selectedDoc && (
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.2 rounded border border-slate-700">
                {selectedDoc.filename}
              </span>
            )}
          </div>
          <button
            onClick={loadChunks}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={clsx('w-3 h-3', isLoading && 'animate-spin text-blue-400')} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter input */}
        <div className="flex items-center gap-2 bg-[#0b0f17] border border-slate-800 rounded-lg px-3 py-1.5 focus-within:border-blue-500 transition-colors">
          <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter chunk text or filename…"
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>
      </div>

      {/* Content list */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400 mb-2" />
            <span>Retrieving indexed vector chunks...</span>
          </div>
        ) : filteredChunks.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-600">
              <Layers className="w-5 h-5" />
            </div>
            <p className="font-medium text-slate-400">No chunks to display</p>
            <p className="text-[11px] text-slate-500 mt-1">Upload and index documents to inspect generated vector embeddings.</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-4xl mx-auto">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-2 font-mono text-[11px]">
              <span>{filteredChunks.length} chunks indexed</span>
            </div>
            {filteredChunks.map((chunk, i) => (
              <ChunkCard key={i} chunk={chunk} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChunksView;
