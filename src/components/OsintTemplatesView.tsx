import React, { useMemo, useState } from 'react';
import { Copy, Check, Download, FileText } from 'lucide-react';
import {
  ModuleExecutionResult,
  OsintTemplate,
  OsintTemplateGroup,
  ScopedDork,
} from '../types';
import { OSINT_TEMPLATES, renderHydratedTemplate } from '../utils/osintTaxonomy';
import { downloadTextFile } from '../utils/reportExport';

interface OsintTemplatesViewProps {
  selectedGroup: OsintTemplateGroup | 'all';
  setSelectedGroup: (g: OsintTemplateGroup | 'all') => void;
  target: string;
  results: ModuleExecutionResult[];
  sampleScopedDorks: ScopedDork[];
}

export const OsintTemplatesView: React.FC<OsintTemplatesViewProps> = ({
  selectedGroup,
  setSelectedGroup,
  target,
  results,
  sampleScopedDorks,
}) => {
  const visibleTemplates = useMemo(() => {
    if (selectedGroup === 'all') return OSINT_TEMPLATES;
    return OSINT_TEMPLATES.filter((t) => t.group === selectedGroup);
  }, [selectedGroup]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(OSINT_TEMPLATES[0].id);
  const [copied, setCopied] = useState(false);

  const activeTemplate: OsintTemplate =
    visibleTemplates.find((t) => t.id === selectedTemplateId) || visibleTemplates[0];

  const aggregatedDorks = useMemo(() => {
    const fromResults = results.flatMap((r) => r.matchedDorks);
    if (fromResults.length > 0) return fromResults.slice(0, 20);
    return sampleScopedDorks;
  }, [results, sampleScopedDorks]);

  const renderedMarkdown = useMemo(
    () => renderHydratedTemplate(activeTemplate, target, results, aggregatedDorks),
    [activeTemplate, target, results, aggregatedDorks]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(renderedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100">OSINT Report Templates</h2>
          <p className="text-xs text-slate-400 mt-1">
            Structured documentation templates hydrated dynamically from simultaneous tool results and target-scoped Google Dorks.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          {[
            { id: 'all' as const, label: 'All (10)' },
            { id: 'technical-assessments' as const, label: 'Technical Assessments' },
            { id: 'investigation-reports' as const, label: 'Investigation Reports' },
            { id: 'operational-planning' as const, label: 'Operational Planning' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedGroup(tab.id)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedGroup === tab.id
                  ? 'bg-[#2EC4B6] text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Split Workspace: Template List + Hydrated Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List */}
        <div className="lg:col-span-4 border border-slate-800 rounded-xl bg-slate-900/40 divide-y divide-slate-800/80">
          {visibleTemplates.map((tpl) => {
            const isSelected = activeTemplate.id === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelectedTemplateId(tpl.id)}
                className={`w-full text-left p-4 transition-colors cursor-pointer ${
                  isSelected ? 'bg-slate-800/80' : 'hover:bg-slate-800/35'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-100">{tpl.title}</span>
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#2EC4B6]' : 'text-slate-500'}`} />
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  osint-templates/{tpl.group}/{tpl.filename}
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{tpl.summary}</p>
              </button>
            );
          })}
        </div>

        {/* Right Hydrated Document */}
        <div className="lg:col-span-8 border border-slate-800 rounded-xl bg-slate-900/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">{activeTemplate.title}</h3>
              <div className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                Target: {target || 'none'} · {results.length} live module(s) hydrated · {aggregatedDorks.length} dork query(s)
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-mono text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy MD'}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadTextFile(
                    renderedMarkdown,
                    `${target || 'argus'}_${activeTemplate.filename}`,
                    'text/markdown'
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-[#2EC4B6] hover:bg-[#27b1a4] text-slate-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .md</span>
              </button>
            </div>
          </div>

          <pre className="p-5 text-xs font-mono text-slate-200 bg-[#070a10] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[620px]">
            {renderedMarkdown}
          </pre>
        </div>
      </div>
    </div>
  );
};
