import React from 'react';
import { Menu, X } from 'lucide-react';
import { ActiveWorkspaceView } from '../types';

interface HeaderProps {
  activeView: ActiveWorkspaceView;
  setActiveView: (view: ActiveWorkspaceView) => void;
  resultsCount: number;
  isScanning: boolean;
  onRunAllSimultaneous: () => void;
  onStopScan: () => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  resultsCount,
  isScanning,
  onRunAllSimultaneous,
  onStopScan,
  mobileSidebarOpen,
  setMobileSidebarOpen,
}) => {
  const navItems: { id: ActiveWorkspaceView; label: string }[] = [
    { id: 'catalog', label: 'Tools' },
    { id: 'dorks', label: 'Dork Engine' },
    { id: 'templates', label: 'Templates' },
    { id: 'results', label: resultsCount > 0 ? `Findings (${resultsCount})` : 'Findings' },
    { id: 'terminal', label: 'Console' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0b0f17]/95 backdrop-blur-md">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            aria-label="Toggle workspace navigation"
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-100 rounded border border-slate-800"
          >
            {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('catalog');
            }}
            className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
          >
            Argus OSINT
          </a>
        </div>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  isActive
                    ? 'border-[#2EC4B6] text-slate-100'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          {isScanning ? (
            <button
              id="stop-scan-btn"
              type="button"
              onClick={onStopScan}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Stop Scan
            </button>
          ) : (
            <button
              id="header-run-all-btn"
              type="button"
              onClick={onRunAllSimultaneous}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#2EC4B6] hover:bg-[#27b1a4] text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Run All + Dorks
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
