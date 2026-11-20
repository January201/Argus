import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Trash2, Copy, Check, CornerDownLeft } from 'lucide-react';
import { ModuleItem } from '../types';
import { DorkDatasetState, scopeDorkToTarget } from '../utils/dorkEngine';

interface TerminalConsoleProps {
  logs: string[];
  appendLogs: (lines: string[]) => void;
  clearLogs: () => void;
  target: string;
  setTarget: (t: string) => void;
  concurrency: number;
  setConcurrency: (n: number) => void;
  selectedModule: ModuleItem | null;
  setSelectedModule: (m: ModuleItem | null) => void;
  onExecuteModule: (m: ModuleItem) => void;
  onRunAllSimultaneous: () => void;
  onRunQuickSuite: () => void;
  modules: ModuleItem[];
  dorkDataset: DorkDatasetState | null;
  isScanning: boolean;
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({
  logs,
  appendLogs,
  clearLogs,
  target,
  setTarget,
  concurrency,
  setConcurrency,
  selectedModule,
  setSelectedModule,
  onExecuteModule,
  onRunAllSimultaneous,
  onRunQuickSuite,
  modules,
  dorkDataset,
  isScanning,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;
    setCommandInput('');

    const out: string[] = [`argus> ${cmd}`];
    const parts = cmd.split(/\s+/);
    const action = parts[0].toLowerCase();

    if (action === 'help') {
      out.push(
        `=== ARGUS OSINT CLI REFERENCE ===`,
        `  run all             - Execute ALL ${modules.length} tools + Google Dorks simultaneously`,
        `  run quick           - Execute core simultaneous suite + Dorks`,
        `  use <id>            - Select a module by number (e.g. 'use 3')`,
        `  run                 - Execute the selected module + paired dorks`,
        `  dork <term>         - Search Google Dork corpus scoped to ${target}`,
        `  set target <domain> - Set target domain (e.g. 'set target example.com')`,
        `  set workers <num>   - Set simultaneous worker concurrency (1-${modules.length})`,
        `  search <term>       - Search module catalog`,
        `  info [id]           - Show module details`,
        `  clear               - Clear terminal buffer`,
        `=================================`
      );
      appendLogs(out);
    } else if (action === 'clear') {
      clearLogs();
    } else if (action === 'set') {
      if (parts[1]?.toLowerCase() === 'target' && parts[2]) {
        setTarget(parts[2]);
        out.push(`[+] Target updated to: ${parts[2]}`);
      } else if (
        (parts[1]?.toLowerCase() === 'threads' || parts[1]?.toLowerCase() === 'workers') &&
        parts[2]
      ) {
        const w = parseInt(parts[2], 10);
        if (w > 0 && w <= modules.length) {
          setConcurrency(w);
          out.push(`[+] Simultaneous workers updated to: ${w}`);
        } else {
          out.push(`[!] Choose worker count between 1 and ${modules.length}.`);
        }
      } else {
        out.push(`[!] Usage: set target <domain> OR set workers <number>`);
      }
      appendLogs(out);
    } else if (action === 'use') {
      const id = parts[1];
      const found = modules.find(
        (m) => m.id === id || m.name.toLowerCase() === parts.slice(1).join(' ').toLowerCase()
      );
      if (found) {
        setSelectedModule(found);
        out.push(`[+] Selected [#${found.id}] ${found.name} (${found.script})`);
      } else {
        out.push(`[!] Module '${id}' not found. Type 'search <query>'.`);
      }
      appendLogs(out);
    } else if (action === 'run') {
      const sub = parts[1]?.toLowerCase();
      if (sub === 'all') {
        appendLogs([...out, `[*] Dispatching all ${modules.length} tools + dorks simultaneously...`]);
        onRunAllSimultaneous();
      } else if (sub === 'quick') {
        appendLogs([...out, `[*] Dispatching quick simultaneous suite + dorks...`]);
        onRunQuickSuite();
      } else if (!selectedModule) {
        out.push(`[!] No module selected. Use 'use <id>' or 'run all'.`);
        appendLogs(out);
      } else if (!target) {
        out.push(`[!] Target not set. Use 'set target <domain>'.`);
        appendLogs(out);
      } else {
        appendLogs([...out, `[*] Executing [#${selectedModule.id}] ${selectedModule.name}...`]);
        onExecuteModule(selectedModule);
      }
    } else if (action === 'dork') {
      const term = parts.slice(1).join(' ').toLowerCase();
      if (!dorkDataset) {
        out.push(`[!] Google Dork corpus is still loading.`);
      } else {
        const matches = term
          ? dorkDataset.entries.filter((d) => d.raw.toLowerCase().includes(term))
          : dorkDataset.entries;
        out.push(
          `[+] Matched ${matches.length.toLocaleString()} dork signatures for target '${target}':`
        );
        matches.slice(0, 12).forEach((d) => {
          const scoped = scopeDorkToTarget(d, target);
          out.push(`  [${d.category}] ${scoped.scopedQuery}`);
        });
      }
      appendLogs(out);
    } else if (action === 'search') {
      const term = parts.slice(1).join(' ').toLowerCase();
      const matches = modules.filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          m.description.toLowerCase().includes(term) ||
          m.script.toLowerCase().includes(term)
      );
      out.push(`[*] Found ${matches.length} matching module(s):`);
      matches.slice(0, 10).forEach((m) => {
        out.push(`  [#${m.id}] ${m.name} (${m.script})`);
      });
      appendLogs(out);
    } else if (action === 'info') {
      const id = parts[1] || selectedModule?.id;
      const m = modules.find((mod) => mod.id === id);
      if (m) {
        out.push(
          `=== [#${m.id}] ${m.name} ===`,
          `Description: ${m.description}`,
          `Script: ${m.script}`,
          `Primary Input: ${m.primary_input}`,
          `Options: ${m.options.join(', ') || 'default'}`
        );
      } else {
        out.push(`[!] Module not found.`);
      }
      appendLogs(out);
    } else {
      out.push(`[!] Unknown command '${cmd}'. Type 'help' for commands.`);
      appendLogs(out);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="bg-[#0b0f17] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[680px]">
        {/* Terminal Bar */}
        <div className="bg-[#0f172a] px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <TerminalIcon className="w-4 h-4 text-[#2EC4B6]" />
            <span>argus-osint console</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 tabular-nums">
              {modules.length} tools · {dorkDataset?.entries.length.toLocaleString() || '13,759'} dorks ·{' '}
              {concurrency} workers
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedModule && (
              <span className="text-xs font-mono text-[#2EC4B6] hidden sm:inline">
                #{selectedModule.id} {selectedModule.name}
              </span>
            )}
            <button
              type="button"
              onClick={handleCopyLogs}
              className="px-2.5 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded text-xs font-mono flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy</span>
            </button>
            <button
              type="button"
              onClick={clearLogs}
              className="px-2.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded text-xs font-mono flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Log Stream */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-1 bg-[#070a10] tabular-nums">
          {logs.map((log, index) => {
            let colorClass = 'text-slate-300';
            if (log.startsWith('[+]')) colorClass = 'text-emerald-400';
            else if (log.startsWith('[*]')) colorClass = 'text-[#2EC4B6]';
            else if (log.startsWith('[!]')) colorClass = 'text-amber-400';
            else if (log.startsWith('[-]')) colorClass = 'text-rose-400';
            else if (log.startsWith('argus>')) colorClass = 'text-cyan-300 font-semibold';
            else if (log.startsWith('===')) colorClass = 'text-slate-200 font-semibold';

            return (
              <div key={index} className={`${colorClass} whitespace-pre-wrap leading-relaxed break-all`}>
                {log}
              </div>
            );
          })}

          {isScanning && (
            <div className="text-amber-400 py-1">
              [~] Simultaneous workers running... results streaming live.
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleCommandSubmit}
          className="bg-[#0f172a] border-t border-slate-800 p-2.5 flex items-center gap-2"
        >
          <span className="text-[#2EC4B6] font-mono font-bold text-xs pl-2 select-none">argus&gt;</span>
          <input
            id="terminal-cli-input"
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Type 'help', 'run all', 'dork admin', 'use 3', 'set target example.com'..."
            className="flex-1 bg-transparent text-slate-100 font-mono text-xs focus:outline-none placeholder-slate-500"
          />
          <button
            type="submit"
            className="p-1.5 bg-[#2EC4B6]/20 hover:bg-[#2EC4B6]/30 text-[#2EC4B6] rounded border border-[#2EC4B6]/40 transition-colors cursor-pointer"
            aria-label="Run command"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
