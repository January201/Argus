import React, { useState, useEffect } from 'react';
import { Play, Zap, ArrowRight, Sliders } from 'lucide-react';
import { cleanDomain } from '../utils/reconEngine';
import { SimultaneousProgress } from '../types';

interface TargetBarProps {
  target: string;
  setTarget: (target: string) => void;
  concurrency: number;
  setConcurrency: (n: number) => void;
  isScanning: boolean;
  progress: SimultaneousProgress | null;
  onRunQuickSuite: () => void;
  onRunAllSimultaneous: () => void;
  totalModules: number;
}

export const TargetBar: React.FC<TargetBarProps> = ({
  target,
  setTarget,
  concurrency,
  setConcurrency,
  isScanning,
  progress,
  onRunQuickSuite,
  onRunAllSimultaneous,
  totalModules,
}) => {
  const [inputValue, setInputValue] = useState(target);

  useEffect(() => {
    setInputValue(target);
  }, [target]);

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = cleanDomain(inputValue);
    if (cleaned) {
      setTarget(cleaned);
      setInputValue(cleaned);
    }
  };

  const sampleTargets = ['example.com', 'cloudflare.com', 'github.com', 'wikipedia.org'];

  return (
    <div className="bg-[#0f172a]/70 border-b border-slate-800 px-4 sm:px-6 py-3.5">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        {/* Target Input + Quick Presets */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <form onSubmit={handleApply} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-mono text-xs">
                target:
              </span>
              <input
                id="target-input"
                type="text"
                placeholder="example.com"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full pl-16 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#2EC4B6] font-mono"
              />
            </div>
            <button
              id="set-target-btn"
              type="submit"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Apply</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 overflow-x-auto">
            {sampleTargets.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setInputValue(st);
                  setTarget(st);
                }}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  target === st
                    ? 'bg-slate-800 text-[#2EC4B6] font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Concurrency + Simultaneous Run Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {progress && isScanning && (
            <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-[#2EC4B6] px-2.5 py-1.5 bg-slate-900 rounded-lg border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-[#2EC4B6] animate-pulse" />
              <span>
                {progress.completed}/{progress.total} done · {progress.elapsedMs}ms
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <label htmlFor="threads-select" className="text-slate-400 font-mono">
              Workers:
            </label>
            <select
              id="threads-select"
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              className="bg-transparent text-xs text-[#2EC4B6] font-mono font-semibold focus:outline-none cursor-pointer tabular-nums"
            >
              <option value={16} className="bg-slate-900 text-slate-200">
                16 parallel
              </option>
              <option value={32} className="bg-slate-900 text-slate-200">
                32 parallel
              </option>
              <option value={64} className="bg-slate-900 text-slate-200">
                64 parallel
              </option>
              <option value={totalModules} className="bg-slate-900 text-slate-200">
                All ({totalModules})
              </option>
            </select>
          </div>

          <button
            id="quick-scan-btn"
            type="button"
            onClick={onRunQuickSuite}
            disabled={isScanning || !target}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-[#2EC4B6]" />
            <span>Quick Suite + Dorks</span>
          </button>

          <button
            id="full-suite-btn"
            type="button"
            onClick={onRunAllSimultaneous}
            disabled={isScanning || !target}
            className="px-4 py-2 bg-[#2EC4B6] hover:bg-[#27b1a4] disabled:opacity-50 text-slate-950 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run All {totalModules} + Dorks</span>
          </button>
        </div>
      </div>
    </div>
  );
};
