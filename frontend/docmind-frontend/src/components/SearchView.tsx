import React, { useState } from 'react';
import {
  Search, Loader2, FileText, ChevronDown, ChevronUp,
  AlertCircle, Layers, SlidersHorizontal, Tag,
  BarChart2,
} from 'lucide-react';
import { chatApi } from '../services/api';
import { useDocumentStore } from '../store/documentStore';
import type { CitationDto, SearchResultDto } from '../types';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const SEARCH_TYPES = [
  { label: 'All Content', placeholder: 'Search across all indexed concepts or keywords…' },
  { label: 'Clauses & Provisions', placeholder: 'Find specific clauses, policies, or provisions…' },
  { label: 'Data & Statistics', placeholder: 'Find metrics, values, and quantitative figures…' },
  { label: 'Definitions', placeholder: 'Look up defined terminology and terms…' },
];

function getScoreBadge(score: number) {
  if (score >= 0.8) return { badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'High Confidence' };
  if (score >= 0.6) return { badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Moderate' };
  return { badge: 'text-slate-400 bg-slate-800 border-slate-700', label: 'Low Match' };
}

const ResultCard: React.FC<{ match: CitationDto; index: number }> = ({ match, index }) => {
  const [expanded, setExpanded] = useState(false);
  const score = match.similarityScore ?? 0;
  const pct = (score * 100).toFixed(1);
  const { badge, label } = getScoreBadge(score);

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#111827] hover:border-slate-700 transition-colors">
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-2.5">
          <div className="flex-shrink-0 w-6 h-6 bg-[#0b0f17] border border-slate-800 rounded flex items-center justify-center text-xs font-mono text-slate-400">
            {index + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-medium text-slate-200 truncate max-w-sm">{match.fileName}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                  {match.pageNumber && (
                    <span className="flex items-center gap-0.5">
                      <FileText className="w-3 h-3 text-slate-600" /> Page {match.pageNumber}
                    </span>
                  )}
                  {match.chunkIndex != null && (
                    <span>Chunk #{match.chunkIndex}</span>
                  )}
                </div>
              </div>

              {/* Confidence badge */}
              <div className="flex-shrink-0">
                <span className={clsx('text-[11px] font-mono px-2 py-0.5 rounded border', badge)}>
                  {label} &middot; {pct}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Snippet text */}
        <p className={clsx('text-xs text-slate-300 leading-relaxed font-sans bg-[#0b0f17] p-3 rounded border border-slate-800/80', !expanded && 'line-clamp-3')}>
          {match.snippet}
        </p>

        {match.snippet.length > 180 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mt-2 transition-colors cursor-pointer"
          >
            {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read full snippet</>}
          </button>
        )}

        {/* Metadata pills */}
        {match.metadata && Object.keys(match.metadata).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-800/60">
            {Object.entries(match.metadata)
              .filter(([k]) => !['documentId', 'fileName', 'snippet'].includes(k))
              .slice(0, 5)
              .map(([k, v]) => (
                <span key={k} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                  {k}: {String(v)}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const SearchView: React.FC = () => {
  const { selectedDocumentId, documents } = useDocumentStore();
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState(0);
  const [topK, setTopK] = useState(8);
  const [minSimilarity, setMinSimilarity] = useState(0.0);
  const [showFilters, setShowFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResultDto | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  const handleSearch = async () => {
    if (!query.trim() || isSearching) return;
    setIsSearching(true);
    setHasSearched(true);

    try {
      const res = await chatApi.searchSimilarity({
        query: query.trim(),
        documentId: selectedDocumentId ?? undefined,
        topK,
        similaritySearch: minSimilarity,
      });
      setResult(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      toast.error(msg);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0b0f17]">
      {/* Search Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex-shrink-0 bg-[#111827]">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600/10 border border-blue-500/20 rounded flex items-center justify-center">
              <Search className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <h2 className="text-xs font-semibold text-slate-200">Semantic Vector Search</h2>
            {selectedDoc && (
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.2 rounded border border-slate-700">
                {selectedDoc.filename}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors cursor-pointer',
              showFilters
                ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                : 'border-slate-800 text-slate-400 hover:text-white'
            )}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Parameters</span>
          </button>
        </div>

        {/* Filter categories */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-0.5 no-scrollbar">
          {SEARCH_TYPES.map((type, i) => (
            <button
              key={i}
              onClick={() => setSelectedType(i)}
              className={clsx(
                'px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer',
                selectedType === i
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'bg-[#0b0f17] border border-slate-800 text-slate-400 hover:text-slate-200'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Search input bar */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[#0b0f17] border border-slate-800 rounded-lg px-3 py-2 focus-within:border-blue-500 transition-colors">
            <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={SEARCH_TYPES[selectedType].placeholder}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Search</span>
          </button>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="mt-3 p-3 bg-[#0b0f17] rounded-lg border border-slate-800 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between mb-1 text-slate-400">
                  <span>Top Matches: {topK}</span>
                </div>
                <input
                  type="range" min={1} max={25} value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="w-full h-1 accent-blue-600"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1 text-slate-400">
                  <span>Min Similarity: {(minSimilarity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range" min={0} max={0.9} step={0.05} value={minSimilarity}
                  onChange={(e) => setMinSimilarity(Number(e.target.value))}
                  className="w-full h-1 accent-blue-600"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400 mb-2" />
            <span>Scanning high-dimensional vector embeddings...</span>
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-600">
              <Search className="w-5 h-5" />
            </div>
            <p className="font-medium text-slate-400">Execute Semantic Search</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Find passages and clauses ranked by cosine similarity against your indexed repository.
            </p>
          </div>
        ) : !result || result.matches.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <AlertCircle className="w-5 h-5 mx-auto mb-2 text-slate-600" />
            <p>No matching passages found for "{query}".</p>
            <p className="text-[11px] text-slate-600 mt-0.5">Try broadening your search or reducing the similarity threshold.</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl mx-auto">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-2">
              <span>{result.matches.length} matches found</span>
              <span className="font-mono text-[11px]">Query: "{result.query}"</span>
            </div>
            {result.matches.map((m, i) => (
              <ResultCard key={i} match={m} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchView;
