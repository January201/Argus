import React, { useState } from 'react';
import {
  Download,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { ModuleExecutionResult, SimultaneousProgress } from '../types';
import { exportAsJson, exportAsMarkdown, exportAsTxt, exportAsCsv } from '../utils/reportExport';

interface ResultsViewProps {
  results: ModuleExecutionResult[];
  clearResults: () => void;
  target: string;
  isScanning: boolean;
  progress: SimultaneousProgress | null;
  onRunAllSimultaneous: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  results,
  clearResults,
  target,
  isScanning,
  progress,
  onRunAllSimultaneous,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const totalFindings = results.reduce((acc, r) => acc + r.findings.length, 0);
  const totalPairedDorks = results.reduce((acc, r) => acc + r.matchedDorks.length, 0);
  const alertsCount = results.reduce(
    (acc, r) => acc + r.findings.filter((f) => f.severity === 'ALERT').length,
    0
  );
  const warnsCount = results.reduce(
    (acc, r) => acc + r.findings.filter((f) => f.severity === 'WARN').length,
    0
  );
  const okCount = results.reduce(
    (acc, r) => acc + r.findings.filter((f) => f.severity === 'OK').length,
    0
  );
  const infoCount = results.reduce(
    (acc, r) => acc + r.findings.filter((f) => f.severity === 'INFO').length,
    0
  );

  const filteredResults = results.filter((r) => {
    if (severityFilter === 'all') return true;
    return r.severity === severityFilter || r.findings.some((f) => f.severity === severityFilter);
  });

  const dnsResult = results.find((r) => r.structuredData && r.structuredData.A);
  const rdapResult = results.find((r) => r.structuredData && r.structuredData.registrar);
  const ctResult = results.find((r) => r.structuredData && Array.isArray(r.structuredData.subdomains) && r.structuredData.subdomains.length > 0);

  const pct = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Banner & Exports */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            Live Findings &amp; Dork Stream
          </h2>
          <p className="text-xs text-slate-400 font-mono tabular-nums mt-1">
            Target: <span className="text-[#2EC4B6]">{target || 'None'}</span> · {results.length} completed ·{' '}
            {totalFindings} findings · {totalPairedDorks.toLocaleString()} dork pairings
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 px-2 flex items-center gap-1">
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </span>
            <button
              id="export-json-btn"
              type="button"
              onClick={() => exportAsJson(results, target)}
              disabled={results.length === 0}
              className="px-2.5 py-1 hover:bg-slate-800 text-slate-200 rounded disabled:opacity-40 cursor-pointer"
            >
              JSON
            </button>
            <button
              id="export-md-btn"
              type="button"
              onClick={() => exportAsMarkdown(results, target)}
              disabled={results.length === 0}
              className="px-2.5 py-1 hover:bg-slate-800 text-slate-200 rounded disabled:opacity-40 cursor-pointer"
            >
              MD
            </button>
            <button
              id="export-txt-btn"
              type="button"
              onClick={() => exportAsTxt(results, target)}
              disabled={results.length === 0}
              className="px-2.5 py-1 hover:bg-slate-800 text-slate-200 rounded disabled:opacity-40 cursor-pointer"
            >
              TXT
            </button>
            <button
              id="export-csv-btn"
              type="button"
              onClick={() => exportAsCsv(results, target)}
              disabled={results.length === 0}
              className="px-2.5 py-1 hover:bg-slate-800 text-slate-200 rounded disabled:opacity-40 cursor-pointer"
            >
              CSV
            </button>
          </div>

          <button
            type="button"
            onClick={clearResults}
            disabled={results.length === 0}
            title="Clear all results"
            className="p-2 text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Simultaneous Progress Bar */}
      {isScanning && progress && (
        <div className="border border-slate-800 rounded-xl bg-slate-900/50 p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono tabular-nums">
            <span className="text-[#2EC4B6] font-semibold">
              Simultaneous Execution Streaming ({progress.completed}/{progress.total} modules · {pct}%)
            </span>
            <span className="text-slate-400">
              {progress.running} active · {progress.elapsedMs}ms elapsed
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2EC4B6] transition-all duration-150"
              style={{ width: `${pct}%` }}
            />
          </div>
          {progress.activeModuleNames.length > 0 && (
            <div className="text-[11px] font-mono text-slate-400 truncate">
              Active workers: {progress.activeModuleNames.join(' · ')}
            </div>
          )}
        </div>
      )}

      {/* KPI Filter Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: 'all', label: 'Modules Done', val: results.length, color: 'text-slate-100', icon: null },
          { id: 'ALERT', label: 'Alerts', val: alertsCount, color: 'text-rose-400', icon: AlertOctagon },
          { id: 'WARN', label: 'Warnings', val: warnsCount, color: 'text-amber-400', icon: AlertTriangle },
          { id: 'OK', label: 'Verified OK', val: okCount, color: 'text-emerald-400', icon: CheckCircle2 },
          { id: 'INFO', label: 'Telemetry', val: infoCount, color: 'text-cyan-400', icon: Info },
        ].map((kpi) => {
          const Icon = kpi.icon;
          const active = severityFilter === kpi.id;
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => setSeverityFilter(kpi.id)}
              className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                active
                  ? 'bg-slate-800/80 border-[#2EC4B6]/60'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className={`text-xs font-mono flex items-center gap-1.5 ${kpi.color}`}>
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{kpi.label}</span>
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono tabular-nums mt-1">
                {kpi.val}
              </div>
            </button>
          );
        })}
      </div>

      {/* Aggregated Live DNS / RDAP / CT Telemetry Table */}
      {(dnsResult || rdapResult || ctResult) && (
        <div className="border border-slate-800 rounded-xl bg-slate-900/40 divide-y divide-slate-800/80">
          {dnsResult?.structuredData && (
            <div className="p-4 space-y-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Live DNS Resolution (DoH)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono pt-1">
                <div>
                  <span className="text-slate-500 block">A (IPv4)</span>
                  <span className="text-emerald-300 break-all">
                    {dnsResult.structuredData.A?.join(', ') || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">AAAA (IPv6)</span>
                  <span className="text-cyan-300 break-all">
                    {dnsResult.structuredData.AAAA?.join(', ') || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">MX Mail</span>
                  <span className="text-amber-300 break-all">
                    {dnsResult.structuredData.MX?.join(', ') || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Nameservers</span>
                  <span className="text-slate-200 break-all">
                    {dnsResult.structuredData.NS?.join(', ') || 'None'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {rdapResult?.structuredData && (
            <div className="p-4 space-y-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                ICANN RDAP Registration
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono pt-1">
                <div>
                  <span className="text-slate-500 block">Registrar</span>
                  <span className="text-slate-200">{rdapResult.structuredData.registrar}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Registered</span>
                  <span className="text-slate-300 tabular-nums">
                    {rdapResult.structuredData.registrationDate || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Expires</span>
                  <span className="text-emerald-300 tabular-nums">
                    {rdapResult.structuredData.expirationDate || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status</span>
                  <span className="text-slate-300">
                    {rdapResult.structuredData.statuses?.slice(0, 2).join(', ') || 'Active'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {ctResult?.structuredData?.subdomains && (
            <div className="p-4 space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Certificate Transparency Hostnames ({ctResult.structuredData.subdomains.length})
              </h3>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                {ctResult.structuredData.subdomains.join(' · ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Streaming Module Result List */}
      <div className="border border-slate-800 rounded-xl bg-slate-900/40 divide-y divide-slate-800">
        {filteredResults.map((result) => {
          const isExpanded = expandedResults.has(result.moduleId);
          const severityText =
            result.severity === 'ALERT'
              ? 'text-rose-400'
              : result.severity === 'WARN'
              ? 'text-amber-400'
              : result.severity === 'OK'
              ? 'text-emerald-400'
              : 'text-cyan-400';

          return (
            <div key={result.moduleId} id={`result-card-${result.moduleId}`}>
              <button
                type="button"
                onClick={() => toggleExpand(result.moduleId)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/35 transition-colors cursor-pointer"
              >
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <span className="font-mono text-xs text-[#2EC4B6] tabular-nums">
                      #{result.moduleId}
                    </span>
                    <span className="truncate">{result.moduleName}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                    {result.osintCategory.replace(/_/g, ' ')} · {result.durationMs}ms ·{' '}
                    {result.findings.length} finding(s) · {result.matchedDorks.length} paired dorks
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-mono font-semibold ${severityText}`}>
                    {result.severity}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-800/70 space-y-4 bg-slate-950/40">
                  {/* Findings */}
                  {result.findings.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-300">Findings</div>
                      <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-lg bg-slate-900/40">
                        {result.findings.map((finding, fIdx) => (
                          <div key={fIdx} className="p-3 text-xs space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-200">{finding.title}</span>
                              <span className="font-mono text-[11px] text-slate-400">
                                {finding.severity}
                              </span>
                            </div>
                            <p className="text-slate-400">{finding.details}</p>
                            {finding.recommendation && (
                              <p className="text-amber-300">
                                Recommendation: {finding.recommendation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Paired Google Dork Queries */}
                  {result.matchedDorks.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-300">
                        Paired Target-Scoped Google Dorks ({result.matchedDorks.length})
                      </div>
                      <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-lg bg-slate-900/40">
                        {result.matchedDorks.slice(0, 5).map((d) => (
                          <div
                            key={d.id}
                            className="px-3 py-2 flex items-center justify-between gap-3 text-xs font-mono"
                          >
                            <span className="text-slate-300 truncate">{d.scopedQuery}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopy(`dork-${d.id}`, d.scopedQuery)}
                                className="text-slate-400 hover:text-slate-100 cursor-pointer"
                              >
                                {copiedId === `dork-${d.id}` ? 'Copied' : 'Copy'}
                              </button>
                              <a
                                href={d.googleUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#2EC4B6] hover:underline inline-flex items-center gap-0.5"
                              >
                                <span>Search</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw Console Log */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
                      <span>Execution Log</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(result.moduleId, result.rawOutput)}
                        className="flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {copiedId === result.moduleId ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Log</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="bg-[#070a10] p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48">
                      {result.rawOutput}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredResults.length === 0 && (
          <div className="text-center py-16 px-4">
            <Info className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-300">No Findings Streamed Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Launch all reconnaissance tools simultaneously with the Google Dork corpus to stream live results immediately.
            </p>
            <button
              type="button"
              onClick={onRunAllSimultaneous}
              disabled={!target || isScanning}
              className="mt-4 px-4 py-2 bg-[#2EC4B6] hover:bg-[#27b1a4] text-slate-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Run All Tools + Dorks
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
