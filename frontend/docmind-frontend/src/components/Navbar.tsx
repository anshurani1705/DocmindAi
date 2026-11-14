import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Search, Layers, Upload, PanelLeft, FileText, ChevronRight,
  LogOut, Shield, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../store/documentStore';
import { useAuthStore } from '../store/authStore';
import { clsx } from 'clsx';

interface NavbarProps {
  onUploadClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onUploadClick }) => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, documents, selectedDocumentId } = useDocumentStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const tabs: { id: 'chat' | 'search' | 'chunks'; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'chunks', label: 'Chunks', icon: Layers },
  ];

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="flex items-center h-13 px-4 bg-[#111827] border-b border-slate-800 flex-shrink-0 z-20">
      {/* Left: sidebar toggle + brand */}
      <div className="flex items-center gap-3 w-60 flex-shrink-0">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className={clsx('w-4 h-4', isSidebarOpen ? 'text-slate-400' : 'text-blue-400')} />
        </button>

        <div className="flex items-center gap-2 select-none">
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center text-white">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">DocMind</span>
        </div>
      </div>

      {/* Center: clean segmented navigation */}
      <nav className="flex-1 flex items-center justify-center">
        <div className="flex items-center p-0.5 bg-[#0b0f17] border border-slate-800 rounded-lg">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                activeTab === id
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Right: context + actions */}
      <div className="flex items-center gap-2.5 justify-end w-auto min-w-[240px]">
        {selectedDoc && (
          <div className="hidden lg:flex items-center gap-1.5 bg-[#0b0f17] border border-slate-800 px-2.5 py-1 rounded-md max-w-[160px]">
            <FileText className="w-3 h-3 text-blue-400 flex-shrink-0" />
            <span className="text-xs text-slate-300 truncate">{selectedDoc.filename}</span>
            <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
          </div>
        )}

        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>

        {/* User profile dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 bg-[#0b0f17] hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="User menu"
          >
            <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-[10px] font-semibold text-white">
              {getInitials(user?.username)}
            </div>
            <span className="text-xs text-slate-300 font-medium max-w-[80px] truncate hidden md:inline">
              {user?.username || 'User'}
            </span>
            <ChevronDown className={clsx('w-3 h-3 text-slate-500 transition-transform duration-150', isMenuOpen && 'rotate-180')} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-[#111827] border border-slate-800 rounded-xl shadow-lg py-1.5 z-50 animate-fade-in">
              <div className="px-3 py-2 border-b border-slate-800">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-medium text-white truncate">{user?.username}</p>
                  {user?.role && (
                    <span className="text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {user.role}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>

              <div className="px-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
