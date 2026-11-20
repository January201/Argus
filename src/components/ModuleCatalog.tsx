import React, { useState, useMemo } from 'react';
import { Search, Star, Play, Info } from 'lucide-react';
import { ModuleExecutionResult, ModuleItem, OsintToolCategory } from '../types';
import { OSINT_TOOL_CATEGORIES, classifyModuleToOsintCategory } from '../utils/osintTaxonomy';

interface ModuleCatalogProps {
  modules: ModuleItem[];
  favorites: Set<string>;
  toggleFavorite: (moduleId: string) => void;
  selectedCategory: OsintToolCategory | 'all' | 'favorites';
  setSelectedCategory: (cat: OsintToolCategory | 'all' | 'favorites') => void;
  onSelectModule: (module: ModuleItem) => void;
  onExecuteModule: (module: ModuleItem) => void;
  onRunFilteredSimultaneous: (filtered: ModuleItem[], label: string) => void;
  isScanning: boolean;
  activeModuleIds: Set<string>;
  resultsByModuleId: Map<string, ModuleExecutionResult>;
  target: string;
}

export const ModuleCatalog: React.FC<ModuleCatalogProps> = ({
  modules,
  favorites,
  toggleFavorite,
  selectedCategory,
  setSelectedCategory,
  onSelectModule,
  onExecuteModule,
  onRunFilteredSimultaneous,
  isScanning,
  activeModuleIds,
  resultsByModuleId,
  target,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredModules = useMemo(() => {
    return modules.filter((mod) => {
      const osintCat = mod.osintCategory || classifyModuleToOsintCategory(mod);
      if (selectedCategory === 'favorites') {
        if (!favorites.has(mod.id)) return false;
      } else if (selectedCategory !== 'all') {
        if (osintCat !== selectedCategory) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          mod.id.toLowerCase().includes(q) ||
          mod.name.toLowerCase().includes(q) ||
          mod.description.toLowerCase().includes(q) ||
          mod.script.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [modules, selectedCategory, searchQuery, favorites]);

  const activeCategoryMeta = OSINT_TOOL_CATEGORIES.find((c) => c.id === selectedCategory);
  const categoryTitle =
    selectedCategory === 'all'
      ? 'All OSINT & Reconnaissance Modules'
      : selectedCategory === 'favorites'
      ? 'Starred Reconnaissance Tools'
      : activeCategoryMeta?.label || 'OSINT Tools';

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header & Simultaneous Category Run Action */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100">{categoryTitle}</h2>
          <p className="text-xs text-slate-400 mt-1">
            {activeCategoryMeta?.description ||
              'Every module pairs automatically with target-scoped Google Dork signatures and executes concurrently.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="module-search-input"
              type="text"
              placeholder={`Filter ${modules.length} tools...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2EC4B6] font-mono"
            />
          </div>

          <button
            id="run-filtered-simultaneous-btn"
            type="button"
            disabled={isScanning || !target || filteredModules.length === 0}
            onClick={() => onRunFilteredSimultaneous(filteredModules, categoryTitle)}
            className="px-4 py-2 bg-[#2EC4B6] hover:bg-[#27b1a4] disabled:opacity-50 text-slate-950 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run {filteredModules.length} Simultaneously + Dorks</span>
          </button>
        </div>
      </div>

      {/* Category Segmented Controls */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/70 p-1.5 rounded-xl border border-slate-800">
        <button
          id="cat-all"
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
            selectedCategory === 'all'
              ? 'bg-[#2EC4B6] text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
          }`}
        >
          All ({modules.length})
        </button>
        {OSINT_TOOL_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = modules.filter(
            (m) => (m.osintCategory || classifyModuleToOsintCategory(m)) === cat.id
          ).length;
          return (
            <button
              key={cat.id}
              id={`cat-${cat.id}`}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
                isSelected
                  ? 'bg-[#2EC4B6] text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
        <button
          id="cat-favorites"
          type="button"
          onClick={() => setSelectedCategory('favorites')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
            selectedCategory === 'favorites'
              ? 'bg-[#2EC4B6] text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
          }`}
        >
          Starred ({favorites.size})
        </button>
      </div>

      {/* Count Line */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
        <span>Showing {filteredModules.length} module(s)</span>
        <span>Target: {target || 'None'} · +10 Google Dorks paired per module</span>
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredModules.map((module) => {
          const isFav = favorites.has(module.id);
          const isRunning = activeModuleIds.has(module.id);
          const liveResult = resultsByModuleId.get(module.id);

          return (
            <div
              key={module.id}
              id={`module-card-${module.id}`}
              className="bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 rounded-xl p-4 transition-colors flex flex-col justify-between"
            >
              <div>
                {/* Top Metadata Line (Zero-Pill Unboxed Text) */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs font-mono text-slate-400 tabular-nums truncate">
                    <span className="text-[#2EC4B6] font-semibold">#{module.id}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{module.primary_input}</span>
                    <span aria-hidden="true"> · </span>
                    <span>Dork-paired</span>
                  </div>

                  <button
                    id={`fav-btn-${module.id}`}
                    type="button"
                    onClick={() => toggleFavorite(module.id)}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      isFav ? 'text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-slate-300'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                  </button>
                </div>

                {/* Title & Description */}
                <h3 className="text-sm font-semibold text-slate-100 mb-1.5">{module.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {module.description}
                </p>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="text-[11px] font-mono tabular-nums truncate">
                  {liveResult ? (
                    <span
                      className={
                        liveResult.severity === 'ALERT'
                          ? 'text-rose-400'
                          : liveResult.severity === 'WARN'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }
                    >
                      {liveResult.severity} · {liveResult.durationMs}ms · {liveResult.matchedDorks.length} dorks
                    </span>
                  ) : (
                    <span className="text-slate-500">{module.script}</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    id={`info-btn-${module.id}`}
                    type="button"
                    onClick={() => onSelectModule(module)}
                    title="Inspect module and paired dorks"
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>

                  <button
                    id={`run-module-btn-${module.id}`}
                    type="button"
                    onClick={() => onExecuteModule(module)}
                    disabled={isScanning && isRunning}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      isRunning
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-[#2EC4B6]/15 hover:bg-[#2EC4B6]/25 text-[#2EC4B6] border border-[#2EC4B6]/30'
                    }`}
                  >
                    {isRunning ? (
                      <span>Running...</span>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Run</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredModules.length === 0 && (
        <div className="text-center py-14 border border-slate-800 rounded-xl bg-slate-900/30">
          <Search className="w-7 h-7 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400 font-mono">No tools matched &ldquo;{searchQuery}&rdquo;</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="mt-3 text-xs text-[#2EC4B6] hover:underline font-mono cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
};
