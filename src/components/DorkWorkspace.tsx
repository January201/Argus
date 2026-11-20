import React, { useMemo, useState } from 'react';
import { Search, Play, Copy, Check, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { DorkCategory, ModuleItem } from '../types';
import {
  DorkDatasetState,
  DORK_CATEGORY_META,
  scopeDorkToTarget,
} from '../utils/dorkEngine';

interface DorkWorkspaceProps {
  dataset: DorkDatasetState | null;
  loading: boolean;
  error: string | null;
  target: string;
  modules: ModuleItem[];
  isScanning: boolean;
  onRunCategoryWithDorks: (modulesToRun: ModuleItem[], label: string) => void;
}

const PAGE_SIZE = 60;

export const DorkWorkspace: React.FC<DorkWorkspaceProps> = ({
  dataset,
  loading,
  error,
  target,
  modules,
  isScanning,
  onRunCategoryWithDorks,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<DorkCategory>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredEntries = useMemo(() => {
    if (!dataset) return [];
    const q = query.trim().toLowerCase();

    return dataset.entries.filter((entry) => {
      if (selectedCategory !== 'all' && entry.category !== selectedCategory) return false;
      if (operatorFilter !== 'all' && !entry.operators.includes(operatorFilter)) return false;
      if (q && !entry.raw.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [dataset, selectedCategory, operatorFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageEntries = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE).map((e) => scopeDorkToTarget(e, target));
  }, [filteredEntries, safePage, target]);

  const activeCategoryMeta =
    DORK_CATEGORY_META.find((c) => c.id === selectedCategory) || DORK_CATEGORY_META[0];

  const pairedModules = useMemo(() => {
    if (selectedCategory === 'all') return modules;
    const patterns: Record<Exclude<DorkCategory, 'all'>, RegExp> = {
      portals: /login|auth|session|cookie|jwt|admin|brute/i,
      documents: /email|privacy|gdpr|content|sitemap|crawler|bounty/i,
      configs: /env|git|leak|pastebin|security|contact/i,
      directories: /directory|sitemap|crawler|content|broken|archive/i,
      cloud_storage: /cloud|bucket|api|graphql|devops|git/i,
      parameters: /parameter|redirect|dom|form|upload|api|graphql/i,
      tech_stack: /cms|tech|stack|server|javascript|js|cve|cdn/i,
      general: /dns|domain|whois|ssl|subdomain|ip/i,
    };
    const rx = patterns[selectedCategory];
    const matched = modules.filter((m) => rx.test(`${m.script} ${m.name} ${m.description}`));
    return matched.length > 0 ? matched : modules.slice(0, 12);
  }, [modules, selectedCategory]);

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="border border-slate-800 rounded-xl bg-slate-900/50 p-6 space-y-3">
          <div className="h-5 w-64 bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-96 bg-slate-800/70 rounded animate-pulse" />
          <div className="space-y-2 pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-800/40 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="border border-rose-800/60 rounded-xl bg-rose-950/20 p-6 text-sm text-rose-300">
          Failed to index Google Dork dataset: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            Search &amp; Discovery — Google Dork Merger
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {dataset?.entries.length.toLocaleString() || 0} indexed search signatures dynamically scoped to{' '}
            <span className="font-mono text-[#2EC4B6]">{target || 'example.com'}</span> and correlated with Argus reconnaissance modules.
          </p>
        </div>

        <button
          id="run-dork-paired-btn"
          type="button"
          disabled={isScanning || !target}
          onClick={() =>
            onRunCategoryWithDorks(pairedModules, `${activeCategoryMeta.label} + Dorks`)
          }
          className="px-4 py-2 bg-[#2EC4B6] hover:bg-[#27b1a4] disabled:opacity-50 text-slate-950 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Run {pairedModules.length} Paired Tools + Dorks</span>
        </button>
      </div>

      {/* Category Filter Bar */}
      <div className="flex flex-wrap gap-1.5 bg-slate-900/70 p-1.5 rounded-xl border border-slate-800">
        {DORK_CATEGORY_META.map((cat) => {
          const count = dataset?.countsByCategory[cat.id] || 0;
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[#2EC4B6] text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`font-mono tabular-nums text-[11px] ${
                  active ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                {count.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Category Context + Search & Operator Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="space-y-0.5 text-xs">
          <div className="text-slate-200 font-medium">{activeCategoryMeta.description}</div>
          <div className="text-slate-400">
            Paired Argus Scripts: <span className="font-mono text-[#2EC4B6]">{activeCategoryMeta.pairedToolsHint}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={operatorFilter}
            onChange={(e) => {
              setOperatorFilter(e.target.value);
              setPage(0);
            }}
            aria-label="Filter by search operator"
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-[#2EC4B6]"
          >
            <option value="all">All Operators</option>
            <option value="inurl">inurl:</option>
            <option value="intitle">intitle:</option>
            <option value="filetype">filetype:</option>
            <option value="ext">ext:</option>
            <option value="intext">intext:</option>
          </select>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Filter dork signatures..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2EC4B6]"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
        <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
          <span>
            Showing {pageEntries.length} of {filteredEntries.length.toLocaleString()} scoped queries
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="p-1 rounded border border-slate-800 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>
              Page {safePage + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage + 1 >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="p-1 rounded border border-slate-800 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-4 font-medium w-16">#</th>
                <th className="py-2.5 px-4 font-medium">Target-Scoped Query</th>
                <th className="py-2.5 px-4 font-medium w-36">Category</th>
                <th className="py-2.5 px-4 font-medium text-right w-56">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {pageEntries.map((dork) => (
                <tr key={dork.id} className="hover:bg-slate-800/35 transition-colors">
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500">
                    {dork.id}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-200 break-all">
                    {dork.scopedQuery}
                  </td>
                  <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                    {dork.category.replace(/_/g, ' ')}
                    {dork.operators.length > 0 && (
                      <span className="text-slate-500"> · {dork.operators[0]}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 font-mono">
                      <button
                        type="button"
                        onClick={() => handleCopy(dork.id, dork.scopedQuery)}
                        className="px-2 py-1 rounded border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === dork.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedId === dork.id ? 'Copied' : 'Copy'}</span>
                      </button>
                      <a
                        href={dork.googleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded border border-slate-700 hover:border-[#2EC4B6] text-[#2EC4B6] inline-flex items-center gap-1"
                      >
                        <span>Google</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={dork.ddgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded border border-slate-700 hover:border-slate-500 text-slate-300 inline-flex items-center gap-1"
                      >
                        <span>DDG</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {pageEntries.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500 font-mono">
                    No dork signatures matched your current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
