import React from 'react';
import {
  Search,
  Server,
  Globe,
  ShieldAlert,
  Briefcase,
  Lock,
  FileText,
  Terminal,
  Activity,
  Layers,
  Star,
} from 'lucide-react';
import {
  ActiveWorkspaceView,
  ModuleItem,
  OsintTemplateGroup,
  OsintToolCategory,
} from '../types';
import { OSINT_TOOL_CATEGORIES, classifyModuleToOsintCategory } from '../utils/osintTaxonomy';

interface SidebarProps {
  modules: ModuleItem[];
  favoritesCount: number;
  dorkCount: number;
  resultsCount: number;
  activeView: ActiveWorkspaceView;
  setActiveView: (v: ActiveWorkspaceView) => void;
  selectedOsintCategory: OsintToolCategory | 'all' | 'favorites';
  setSelectedOsintCategory: (c: OsintToolCategory | 'all' | 'favorites') => void;
  selectedTemplateGroup: OsintTemplateGroup | 'all';
  setSelectedTemplateGroup: (g: OsintTemplateGroup | 'all') => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const CATEGORY_ICONS: Record<OsintToolCategory, React.FC<{ className?: string }>> = {
  search_discovery: Search,
  technical_recon: Server,
  web_analysis: Globe,
  threat_intel: ShieldAlert,
  business_footprint: Briefcase,
  privacy_opsec: Lock,
};

export const Sidebar: React.FC<SidebarProps> = ({
  modules,
  favoritesCount,
  dorkCount,
  resultsCount,
  activeView,
  setActiveView,
  selectedOsintCategory,
  setSelectedOsintCategory,
  selectedTemplateGroup,
  setSelectedTemplateGroup,
  mobileOpen,
  onCloseMobile,
}) => {
  const countForCategory = (cat: OsintToolCategory) =>
    modules.filter((m) => (m.osintCategory || classifyModuleToOsintCategory(m)) === cat).length;

  const selectToolFolder = (cat: OsintToolCategory | 'all' | 'favorites') => {
    setSelectedOsintCategory(cat);
    setActiveView('catalog');
    onCloseMobile();
  };

  const selectTemplateFolder = (group: OsintTemplateGroup | 'all') => {
    setSelectedTemplateGroup(group);
    setActiveView('templates');
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-[#0d131f] border-r border-slate-800 text-xs select-none overflow-y-auto">
      {/* Section 1: osint-tools/ */}
      <div className="p-4 space-y-1">
        <div className="px-2 pb-1.5 text-[11px] font-semibold text-slate-400 tracking-wide">
          osint-tools/
        </div>

        <button
          type="button"
          onClick={() => selectToolFolder('all')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left cursor-pointer ${
            activeView === 'catalog' && selectedOsintCategory === 'all'
              ? 'bg-slate-800 text-slate-100 font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <Layers className="w-3.5 h-3.5 shrink-0 text-[#2EC4B6]" />
            <span className="truncate">All Modules</span>
          </span>
          <span className="font-mono tabular-nums text-[11px] text-slate-500">{modules.length}</span>
        </button>

        {OSINT_TOOL_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id];
          const isSelected = activeView === 'catalog' && selectedOsintCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => selectToolFolder(cat.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 text-slate-100 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{cat.label}</span>
              </span>
              <span className="font-mono tabular-nums text-[11px] text-slate-500">
                {countForCategory(cat.id)}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => selectToolFolder('favorites')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left cursor-pointer ${
            activeView === 'catalog' && selectedOsintCategory === 'favorites'
              ? 'bg-slate-800 text-slate-100 font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <Star className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span className="truncate">Starred Tools</span>
          </span>
          <span className="font-mono tabular-nums text-[11px] text-slate-500">{favoritesCount}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveView('dorks');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left cursor-pointer ${
            activeView === 'dorks'
              ? 'bg-[#2EC4B6]/15 text-[#2EC4B6] font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Google Dork Engine</span>
          </span>
          <span className="font-mono tabular-nums text-[11px] text-slate-500">
            {dorkCount > 0 ? dorkCount.toLocaleString() : '13.7k'}
          </span>
        </button>
      </div>

      {/* Section 2: osint-templates/ */}
      <div className="p-4 pt-2 border-t border-slate-800/80 space-y-1">
        <div className="px-2 pb-1.5 text-[11px] font-semibold text-slate-400 tracking-wide">
          osint-templates/
        </div>

        {[
          { id: 'all' as const, label: 'All Templates', count: 10 },
          { id: 'technical-assessments' as const, label: 'Technical Assessments', count: 4 },
          { id: 'investigation-reports' as const, label: 'Investigation Reports', count: 3 },
          { id: 'operational-planning' as const, label: 'Operational Planning', count: 3 },
        ].map((grp) => {
          const isSelected = activeView === 'templates' && selectedTemplateGroup === grp.id;
          return (
            <button
              key={grp.id}
              type="button"
              onClick={() => selectTemplateFolder(grp.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 text-slate-100 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{grp.label}</span>
              </span>
              <span className="font-mono tabular-nums text-[11px] text-slate-500">{grp.count}</span>
            </button>
          );
        })}
      </div>

      {/* Section 3: scripts-and-automation/ */}
      <div className="p-4 pt-2 border-t border-slate-800/80 space-y-1">
        <div className="px-2 pb-1.5 text-[11px] font-semibold text-slate-400 tracking-wide">
          scripts-and-automation/
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveView('results');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left cursor-pointer ${
            activeView === 'results'
              ? 'bg-slate-800 text-slate-100 font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <Activity className="w-3.5 h-3.5 shrink-0 text-[#2EC4B6]" />
            <span className="truncate">Live Findings Stream</span>
          </span>
          <span className="font-mono tabular-nums text-[11px] text-slate-500">{resultsCount}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveView('terminal');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left cursor-pointer ${
            activeView === 'terminal'
              ? 'bg-slate-800 text-slate-100 font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <Terminal className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate">Interactive Console</span>
          </span>
          <span className="font-mono text-[11px] text-slate-500">CLI</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0">{sidebarContent}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 h-full">{sidebarContent}</div>
          <div className="flex-1 bg-slate-950/70" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
};
