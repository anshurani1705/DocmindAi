import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MessageSquare, Plus, Trash2, Clock, MessageSquarePlus, Search, Edit2, Check, X
} from 'lucide-react';
import { useConversationStore } from '../store/conversationStore';
import { useDocumentStore } from '../store/documentStore';
import type { Conversation } from '../types';
import { clsx } from 'clsx';

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function getGroupLabel(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
    const startOfLast7Days = new Date(startOfToday.getTime() - 7 * 86400000);

    if (date >= startOfToday) return 'Today';
    if (date >= startOfYesterday) return 'Yesterday';
    if (date >= startOfLast7Days) return 'Previous 7 Days';
    return 'Older';
  } catch {
    return 'Older';
  }
}

const ChatItem: React.FC<{
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
}> = ({ conversation, isActive, onSelect, onDelete, onRename }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2500);
    }
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(conversation.title);
    setIsEditing(true);
  };

  const handleSaveEdit = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editTitle.trim() && editTitle.trim() !== conversation.title) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(conversation.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit(e as unknown as React.MouseEvent);
    }
  };

  return (
    <div
      onClick={isEditing ? undefined : onSelect}
      className={clsx(
        'group relative flex items-center justify-between gap-2 p-2 rounded-lg border transition-colors cursor-pointer select-none',
        isActive
          ? 'border-blue-500/50 bg-blue-500/10 text-white'
          : 'border-slate-800 bg-[#0b0f17] hover:border-slate-700 hover:bg-[#111827] text-slate-300 hover:text-white'
      )}
    >
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <MessageSquare className={clsx('w-3.5 h-3.5 flex-shrink-0 mt-0.5', isActive ? 'text-blue-400' : 'text-slate-500')} />

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-[#0b0f17] border border-blue-500 text-white text-xs rounded px-1.5 py-0.5 focus:outline-none"
                aria-label="Edit chat title"
              />
              <button
                onClick={handleSaveEdit}
                aria-label="Save title"
                className="p-1 hover:bg-blue-500/20 text-blue-400 rounded cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={handleCancelEdit}
                aria-label="Cancel editing"
                className="p-1 hover:bg-slate-800 text-slate-400 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium truncate leading-tight">
                {conversation.title}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />
                <span className="text-[10px] text-slate-500">
                  {formatRelativeTime(conversation.updatedAt)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {!isEditing && (
        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleStartEdit}
            aria-label="Rename conversation"
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
            title="Rename"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={handleDelete}
            aria-label={confirmDelete ? 'Confirm delete' : 'Delete conversation'}
            className={clsx(
              'p-1 rounded text-xs transition-colors cursor-pointer',
              confirmDelete
                ? 'bg-rose-500/20 text-rose-400 px-1.5 font-medium'
                : 'hover:bg-rose-500/10 hover:text-rose-400 text-slate-400'
            )}
            title="Delete"
          >
            {confirmDelete ? 'Sure?' : <Trash2 className="w-3 h-3" />}
          </button>
        </div>
      )}
    </div>
  );
};

export const ChatsPanel: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    isLoadingChats,
    newChat,
    selectChat,
    deleteChat,
    renameChat,
  } = useConversationStore();
  const { setActiveTab } = useDocumentStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleNewChat = () => {
    newChat();
    setActiveTab('chat');
  };

  const handleSelectChat = (id: string) => {
    selectChat(id);
    setActiveTab('chat');
  };

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const groupedConversations = useMemo(() => {
    const groups: Record<string, Conversation[]> = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    filteredConversations.forEach((chat) => {
      const label = getGroupLabel(chat.updatedAt);
      if (!groups[label]) groups[label] = [];
      groups[label].push(chat);
    });

    return groups;
  }, [filteredConversations]);

  const groupKeys = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'] as const;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* New chat header */}
      <div className="p-3 border-b border-slate-800 flex-shrink-0 space-y-2">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Conversation</span>
        </button>

        {conversations.length > 2 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter history..."
              className="w-full bg-[#0b0f17] border border-slate-800 focus:border-blue-500 text-white placeholder-slate-500 text-xs rounded-md pl-8 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
        {isLoadingChats ? (
          <div className="p-4 text-center text-xs text-slate-500">
            Loading conversations...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-600">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <p className="font-medium text-slate-400">No chat history</p>
            <p className="text-[11px] text-slate-500 mt-1">Start a conversation to query documents.</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            No chats match "{searchQuery}"
          </div>
        ) : (
          groupKeys.map((key) => {
            const items = groupedConversations[key];
            if (!items || items.length === 0) return null;

            return (
              <div key={key} className="space-y-1">
                <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {key}
                </div>
                <div className="space-y-1">
                  {items.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      conversation={chat}
                      isActive={activeConversationId === chat.id}
                      onSelect={() => handleSelectChat(chat.id)}
                      onDelete={() => deleteChat(chat.id)}
                      onRename={(newTitle) => renameChat(chat.id, newTitle)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatsPanel;
