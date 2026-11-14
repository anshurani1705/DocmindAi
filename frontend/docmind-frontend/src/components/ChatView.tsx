import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markdown';
import {
  Send, Bot, User, Loader2, ChevronDown, ChevronUp, FileText,
  Zap, RotateCcw, Square, Copy, Check, Wifi, WifiOff, SlidersHorizontal, BookOpen, Shield, Search
} from 'lucide-react';
import { chatApi } from '../services/api';
import { useDocumentStore } from '../store/documentStore';
import { useConversationStore } from '../store/conversationStore';
import type { ConversationMessage, CitationDto } from '../types';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

/* ─── Structured Prompt Templates ────────────────────────────────── */
const PROMPT_TEMPLATES = [
  {
    category: 'Summary',
    icon: BookOpen,
    templates: [
      { label: 'Executive Summary', prompt: 'Provide a concise executive summary of the key points in this document.' },
      { label: 'Key Takeaways', prompt: 'What are the main findings and conclusions established here?' },
      { label: 'Action Items', prompt: 'List all action items, decisions, and next steps described.' },
    ],
  },
  {
    category: 'Analysis & Compliance',
    icon: Shield,
    templates: [
      { label: 'Key Clauses', prompt: 'What are the most critical terms, obligations, and clauses specified?' },
      { label: 'Risk Assessment', prompt: 'Identify any potential liabilities, dependencies, or risks noted.' },
      { label: 'Responsibilities', prompt: 'Detail the primary responsibilities and stakeholders mentioned.' },
    ],
  },
  {
    category: 'Extraction',
    icon: Search,
    templates: [
      { label: 'Key Metrics', prompt: 'Extract all relevant quantitative metrics, dates, and statistics.' },
      { label: 'Definitions', prompt: 'List all domain-specific definitions and terminology used.' },
      { label: 'Chronology', prompt: 'Provide a chronological timeline of all milestones and events.' },
    ],
  },
];

/* ─── Prism token-to-React renderer ──────────────────────────────── */
function renderPrismTokens(tokens: (string | Prism.Token)[], keyPrefix = ''): React.ReactNode[] {
  return tokens.map((token, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (typeof token === 'string') {
      return token;
    }
    const className = `token ${token.type} ${Array.isArray(token.alias) ? token.alias.join(' ') : token.alias || ''}`;
    if (typeof token.content === 'string') {
      return (
        <span key={key} className={className}>
          {token.content}
        </span>
      );
    }
    if (Array.isArray(token.content)) {
      return (
        <span key={key} className={className}>
          {renderPrismTokens(token.content as (string | Prism.Token)[], key)}
        </span>
      );
    }
    return (
      <span key={key} className={className}>
        {String(token.content)}
      </span>
    );
  });
}

/* ─── Code block component ────────────────────────────────────────── */
const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copied');
  };

  const normalizedLang = (language || 'text').toLowerCase();
  const grammar = Prism.languages[normalizedLang] || Prism.languages.text;
  const tokens = grammar ? Prism.tokenize(code, grammar) : [code];

  return (
    <div className="my-2.5 rounded-lg border border-slate-800 bg-[#070a10] overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0e1420] border-b border-slate-800 text-slate-400 font-mono text-[11px]">
        <span className="font-medium text-slate-300 uppercase">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800/60 hover:bg-slate-700 transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="p-3 overflow-x-auto">
        <pre className="font-mono text-xs leading-relaxed text-slate-200 m-0 p-0 bg-transparent border-0">
          <code className={`language-${normalizedLang}`}>{renderPrismTokens(tokens, 'code')}</code>
        </pre>
      </div>
    </div>
  );
};

/* ─── Markdown Content ────────────────────────────────────────────── */
const MarkdownContent: React.FC<{ content: string; isStreaming?: boolean }> = ({ content, isStreaming }) => {
  return (
    <div className="text-sm leading-relaxed overflow-hidden text-slate-200 space-y-2 prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p({ children }) {
            return <p className="mb-2 last:mb-0 leading-relaxed text-slate-200">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 mb-2 space-y-1 text-slate-200">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 mb-2 space-y-1 text-slate-200">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed text-slate-300">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-blue-500 pl-3 my-2 text-slate-400 italic text-xs">
                {children}
              </blockquote>
            );
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            const isInline = !match && !codeString.includes('\n');

            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-blue-300 font-mono text-xs" {...props}>
                  {children}
                </code>
              );
            }

            return <CodeBlock language={match ? match[1] : ''} code={codeString} />;
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-2 border border-slate-800 rounded-lg">
                <table className="min-w-full divide-y divide-slate-800 text-xs text-left">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-[#0b0f17] text-slate-400 font-semibold">{children}</thead>;
          },
          th({ children }) {
            return <th className="px-3 py-2 border-b border-slate-800">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3 py-2 border-b border-slate-800/60 text-slate-300">{children}</td>;
          },
          h1({ children }) {
            return <h1 className="text-base font-semibold text-white mt-3 mb-1.5">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-sm font-semibold text-white mt-2.5 mb-1">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-xs font-semibold text-slate-200 mt-2 mb-1">{children}</h3>;
          },
          hr() {
            return <hr className="border-slate-800 my-3" />;
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && <span className="cursor-blink" />}
    </div>
  );
};

/* ─── Citation Footnote Card ─────────────────────────────────────── */
const CitationCard: React.FC<{ citation: CitationDto; index: number }> = ({ citation, index }) => {
  const [expanded, setExpanded] = useState(false);
  const score = citation.similarityScore ?? 0;
  const pct = (score * 100).toFixed(0);

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#0b0f17] text-xs transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-2 text-left cursor-pointer hover:bg-slate-900/50"
      >
        <span className="w-4 h-4 rounded bg-slate-800 text-slate-400 text-[10px] font-mono flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <FileText className="w-3 h-3 text-slate-500 flex-shrink-0" />
          <span className="font-medium text-slate-300 truncate">{citation.fileName}</span>
          {citation.pageNumber && (
            <span className="text-[10px] text-slate-500 flex-shrink-0">p. {citation.pageNumber}</span>
          )}
        </div>
        <span className="text-[10px] font-mono text-blue-400 flex-shrink-0 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
          {pct}% match
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
      </button>

      {expanded && (
        <div className="px-3 pb-2.5 pt-1 border-t border-slate-800/80 bg-slate-950/40">
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{citation.snippet}</p>
        </div>
      )}
    </div>
  );
};

/* ─── Message Row ────────────────────────────────────────────────── */
const MessageBubble: React.FC<{ message: ConversationMessage }> = ({ message }) => {
  const isUser = message.messageType === 'USER';
  const [showCitations, setShowCitations] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const timeStr = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={clsx('flex gap-3 group', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-md bg-slate-900 border border-slate-800 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-4 h-4" />
        </div>
      )}

      <div className={clsx('max-w-[82%] min-w-0', isUser && 'flex flex-col items-end')}>
        {/* Bubble */}
        <div
          className={clsx(
            'rounded-lg px-3.5 py-2.5 text-sm',
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-[#111827] border border-slate-800 text-slate-200'
          )}
        >
          {isUser ? (
            <p className="leading-relaxed whitespace-pre-wrap text-sm">{message.content}</p>
          ) : (
            <MarkdownContent content={message.content} isStreaming={message.isStreaming} />
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 mt-1 px-1">
          {timeStr && <span className="text-[10px] text-slate-500">{timeStr}</span>}
          {!isUser && message.responseTimeMs !== undefined && message.responseTimeMs > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-500 font-mono">
              <Zap className="w-2.5 h-2.5" />{message.responseTimeMs}ms
            </span>
          )}
          {!isUser && !message.isStreaming && message.content && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity cursor-pointer p-0.5"
              title="Copy"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Citations section */}
        {!isUser && (message.citations?.length ?? 0) > 0 && !message.isStreaming && (
          <div className="mt-2 w-full">
            <button
              onClick={() => setShowCitations(!showCitations)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <FileText className="w-3 h-3 text-blue-400" />
              <span>{message.citations!.length} Source Reference{message.citations!.length > 1 ? 's' : ''}</span>
              {showCitations ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showCitations && (
              <div className="mt-1.5 space-y-1">
                {message.citations!.map((c, i) => (
                  <CitationCard key={i} citation={c} index={i} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
};

/* ─── Typing Indicator ───────────────────────────────────────────── */
const TypingIndicator = () => (
  <div className="flex gap-3">
    <div className="w-7 h-7 rounded-md bg-slate-900 border border-slate-800 text-blue-400 flex items-center justify-center flex-shrink-0">
      <Bot className="w-4 h-4" />
    </div>
    <div className="bg-[#111827] border border-slate-800 rounded-lg px-3.5 py-2.5">
      <div className="flex items-center gap-1 h-3.5">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  </div>
);

/* ─── Main Chat View Component ────────────────────────────────────── */
const ChatView: React.FC = () => {
  const { selectedDocumentId, documents } = useDocumentStore();
  const {
    activeConversationId,
    messages: allMessages,
    streamingMode,
    setStreamingMode,
    appendMessage,
    updateLastMessageContent,
    updateMessageMetadata,
    newChat,
  } = useConversationStore();

  const messages = allMessages[activeConversationId] || [];

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  // Retrieval parameters
  const [topK, setTopK] = useState(5);
  const [minSimilarity, setMinSimilarity] = useState(0.0);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceToBottom < 120;
  }, []);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isLoading, isStreaming]);

  const stopStream = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
  };

  const sendMessage = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isLoading || isStreaming) return;

    setInput('');
    setShowTemplates(false);

    // Append User Message
    const userMsg: ConversationMessage = {
      id: crypto.randomUUID(),
      messageType: 'USER',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    appendMessage(activeConversationId, userMsg);

    const startTime = Date.now();

    if (streamingMode) {
      setIsStreaming(true);
      const assistantMsg: ConversationMessage = {
        id: crypto.randomUUID(),
        messageType: 'ASSISTANT',
        content: '',
        createdAt: new Date().toISOString(),
        isStreaming: true,
      };
      appendMessage(activeConversationId, assistantMsg);

      abortRef.current = new AbortController();

      try {
        const streamResponse = await chatApi.stream(
          {
            question: trimmed,
            documentId: selectedDocumentId ?? undefined,
            topK,
            minSimilarity,
            conversationId: activeConversationId,
          },
          abortRef.current.signal
        );

        if (!streamResponse.ok) {
          throw new Error(`Server returned HTTP ${streamResponse.status}`);
        }

        const reader = streamResponse.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            updateLastMessageContent(activeConversationId, assistantMsg.id, fullText, true);
          }
        }

        const responseTime = Date.now() - startTime;
        updateMessageMetadata(activeConversationId, assistantMsg.id, {
          isStreaming: false,
          responseTimeMs: responseTime,
        });
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError') {
          toast.error('Streaming interrupted or failed');
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    } else {
      setIsLoading(true);
      try {
        const response = await chatApi.query({
          question: trimmed,
          documentId: selectedDocumentId ?? undefined,
          topK,
          minSimilarity,
          conversationId: activeConversationId,
        });

        const data = response.data;
        const assistantMsg: ConversationMessage = {
          id: crypto.randomUUID(),
          messageType: 'ASSISTANT',
          content: data.answer,
          citations: data.citations,
          responseTimeMs: data.responseTimeMs,
          createdAt: new Date().toISOString(),
        };
        appendMessage(activeConversationId, assistantMsg);
      } catch (err: unknown) {
        const errorMsg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (err as Error).message ||
          'Failed to retrieve answer';
        toast.error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleNewChat = () => {
    newChat();
    setShowTemplates(true);
    setInput('');
  };

  const isBusy = isLoading || isStreaming;

  return (
    <div className="flex flex-col h-full bg-[#0b0f17] overflow-hidden">
      {/* Workspace Header Toolbar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-800 bg-[#111827] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-slate-200">DocMind Workspace</span>
          {selectedDoc ? (
            <span className="text-xs text-slate-400 truncate max-w-[200px]">
              &middot; {selectedDoc.filename}
            </span>
          ) : (
            <span className="text-xs text-slate-500">&middot; All indexed documents</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Settings button */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer',
              showConfig
                ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                : 'bg-[#0b0f17] border-slate-800 text-slate-400 hover:text-slate-200'
            )}
            title="Retrieval Parameters"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Parameters</span>
          </button>

          {/* Stream mode toggle */}
          <button
            onClick={() => setStreamingMode(!streamingMode)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer',
              streamingMode
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-[#0b0f17] border-slate-800 text-slate-400 hover:text-slate-200'
            )}
          >
            {streamingMode ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{streamingMode ? 'Streaming' : 'Buffered'}</span>
          </button>

          {/* New chat */}
          {messages.length > 0 && (
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Retrieval Settings Drawer */}
      {showConfig && (
        <div className="px-5 py-3 border-b border-slate-800 bg-[#111827] text-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Top K Chunks: {topK}</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Min Similarity: {minSimilarity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.9"
              step="0.05"
              value={minSimilarity}
              onChange={(e) => setMinSimilarity(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        </div>
      )}

      {/* Message History Feed */}
      <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        {messages.length === 0 && showTemplates && (
          <div className="max-w-2xl mx-auto pt-4">
            <div className="text-center mb-8">
              <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-white tracking-tight">Document Intelligence Workspace</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                {selectedDoc
                  ? `Active document: ${selectedDoc.filename}. Ask questions, extract structured data, or explore summaries.`
                  : 'Ask targeted questions across your indexed repository. Use suggested prompts below to get started.'}
              </p>
            </div>

            {/* Prompt Categorized Grid */}
            <div className="space-y-3">
              {PROMPT_TEMPLATES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div key={cat.category} className="border border-slate-800 rounded-lg p-3 bg-[#111827]">
                    <div className="flex items-center gap-1.5 mb-2.5 text-xs font-medium text-slate-300">
                      <Icon className="w-3.5 h-3.5 text-blue-400" />
                      <span>{cat.category}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {cat.templates.map((t) => (
                        <button
                          key={t.label}
                          onClick={() => sendMessage(t.prompt)}
                          className="text-left p-2.5 rounded bg-[#0b0f17] border border-slate-800 hover:border-slate-700 transition-colors text-xs text-slate-300 hover:text-white cursor-pointer"
                        >
                          <span className="font-medium block mb-1 text-slate-200">{t.label}</span>
                          <span className="text-[10px] text-slate-500 line-clamp-2">{t.prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Feed */}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && !isStreaming && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input Composer */}
      <div className="px-5 py-3 border-t border-slate-800 bg-[#111827] flex-shrink-0">
        <div className="relative flex items-end gap-2 bg-[#0b0f17] border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-blue-500 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={
              isBusy
                ? 'Processing response...'
                : selectedDoc
                ? `Ask about ${selectedDoc.filename}...`
                : 'Ask a question across your documents...'
            }
            rows={1}
            disabled={isBusy}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none outline-none leading-relaxed disabled:opacity-50"
            style={{ minHeight: '22px', maxHeight: '120px' }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
            }}
          />

          {isStreaming ? (
            <button
              onClick={stopStream}
              className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition-colors cursor-pointer"
              title="Stop"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isBusy}
              className="p-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer"
              aria-label="Send message"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-slate-500">
          <span>Press ↵ to send &middot; Shift+↵ for new line</span>
          {messages.length > 0 && <span>{messages.length} messages</span>}
        </div>
      </div>
    </div>
  );
};

export default ChatView;
