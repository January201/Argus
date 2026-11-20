import React, { useMemo } from 'react';
import { X, Play, Star, FileCode, ExternalLink } from 'lucide-react';
import { ModuleItem } from '../types';
import { DorkDatasetState, matchDorksForModule } from '../utils/dorkEngine';
import { classifyModuleToOsintCategory } from '../utils/osintTaxonomy';

interface ModuleDetailModalProps {
  module: ModuleItem | null;
  onClose: () => void;
  onExecute: (module: ModuleItem) => void;
  isFav: boolean;
  onToggleFav: (id: string) => void;
  target: string;
  isScanning: boolean;
  dorkDataset: DorkDatasetState | null;
}

export const ModuleDetailModal: React.FC<ModuleDetailModalProps> = ({
  module,
  onClose,
  onExecute,
  isFav,
  onToggleFav,
  target,
  isScanning,
  dorkDataset,
}) => {
  const pairedDorks = useMemo(() => {
    if (!module || !dorkDataset) return [];
    return matchDorksForModule(module, dorkDataset, target || 'example.com', 5);
  }, [module, dorkDataset, target]);

  if (!module) return null;

  const osintCat = (module.osintCategory || classifyModuleToOsintCategory(module)).replace(/_/g, ' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl w-full max-w-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="text-xs font-mono text-[#2EC4B6] tabular-nums">
              #{module.id} · {osintCat}
            </div>
            <h3 className="text-base font-bold text-slate-100 mt-0.5">{module.name}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span>{module.script}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close module details"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <div className="text-slate-400 font-medium mb-1">Description</div>
            <p className="text-slate-200 text-sm leading-relaxed">{module.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800/80 font-mono">
            <div>
              <div className="text-slate-500 mb-0.5">Primary Input</div>
              <div className="text-[#2EC4B6] font-medium">{module.primary_input}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-0.5">Options</div>
              <div className="text-slate-300">
                {module.options.length > 0 ? module.options.map((o) => `--${o}`).join(', ') : 'Default'}
              </div>
            </div>
          </div>

          {/* Paired Google Dork Queries */}
          <div className="pt-3 border-t border-slate-800/80">
            <div className="text-slate-400 font-medium mb-2">
              Paired Google Dork Signatures ({pairedDorks.length})
            </div>
            {pairedDorks.length > 0 ? (
              <div className="divide-y divide-slate-800/70 border border-slate-800 rounded-lg bg-slate-950/60">
                {pairedDorks.map((d) => (
                  <div
                    key={d.id}
                    className="px-3 py-2 flex items-center justify-between gap-2 font-mono text-[11px]"
                  >
                    <span className="text-slate-300 truncate">{d.scopedQuery}</span>
                    <a
                      href={d.googleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2EC4B6] hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Google</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 font-mono">Loading Google Dork index...</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onToggleFav(module.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer ${
              isFav
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>{isFav ? 'Starred' : 'Star Tool'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onExecute(module);
                onClose();
              }}
              disabled={isScanning || !target}
              className="px-4 py-1.5 bg-[#2EC4B6] hover:bg-[#27b1a4] disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Tool + Dorks</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
