import { ModuleExecutionResult } from '../types';

export function exportAsJson(results: ModuleExecutionResult[], target: string) {
  const data = {
    target,
    scanDate: new Date().toISOString(),
    totalModules: results.length,
    results: results.map((r) => ({
      moduleId: r.moduleId,
      moduleName: r.moduleName,
      osintCategory: r.osintCategory,
      category: r.category,
      severity: r.severity,
      durationMs: r.durationMs,
      findings: r.findings,
      matchedDorks: r.matchedDorks.map((d) => ({
        category: d.category,
        query: d.scopedQuery,
      })),
      logs: r.logs,
      structuredData: r.structuredData,
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `argus_${target}_report_${Date.now()}.json`);
}

export function exportAsMarkdown(results: ModuleExecutionResult[], target: string) {
  let md = `# Argus OSINT Reconnaissance & Dork Report\n\n`;
  md += `**Target:** \`${target}\`\n`;
  md += `**Scan Date:** ${new Date().toUTCString()}\n`;
  md += `**Modules Executed:** ${results.length}\n\n`;
  md += `---\n\n`;

  for (const r of results) {
    md += `## [${r.moduleId}] ${r.moduleName} (${r.osintCategory})\n`;
    md += `- **Status:** ${r.status.toUpperCase()} (${r.durationMs}ms)\n`;
    md += `- **Severity Level:** \`${r.severity}\`\n`;
    md += `- **Matched Dork Queries:** ${r.matchedDorks.length}\n\n`;

    if (r.findings.length > 0) {
      md += `### Findings\n`;
      for (const f of r.findings) {
        md += `- **[${f.severity}] ${f.title}:** ${f.details}\n`;
        if (f.recommendation) {
          md += `  - *Recommendation:* ${f.recommendation}\n`;
        }
      }
      md += `\n`;
    }

    if (r.matchedDorks.length > 0) {
      md += `### Paired Google Dork Queries\n`;
      for (const d of r.matchedDorks.slice(0, 5)) {
        md += `- \`${d.scopedQuery}\`\n`;
      }
      md += `\n`;
    }

    md += `### Console Output\n\`\`\`text\n${r.rawOutput}\n\`\`\`\n\n`;
  }

  const blob = new Blob([md], { type: 'text/markdown' });
  downloadBlob(blob, `argus_${target}_report_${Date.now()}.md`);
}

export function exportAsTxt(results: ModuleExecutionResult[], target: string) {
  let txt = `======================================================\n`;
  txt += `      ARGUS OSINT + GOOGLE DORK RECONNAISSANCE\n`;
  txt += `======================================================\n`;
  txt += `Target: ${target}\n`;
  txt += `Generated: ${new Date().toISOString()}\n`;
  txt += `Total Executions: ${results.length}\n\n`;

  for (const r of results) {
    txt += `=== [${r.moduleId}] ${r.moduleName} (${r.osintCategory}) ===\n`;
    txt += `Severity: ${r.severity} | Duration: ${r.durationMs}ms | Paired Dorks: ${r.matchedDorks.length}\n\n`;
    txt += `${r.rawOutput}\n\n`;
  }

  const blob = new Blob([txt], { type: 'text/plain' });
  downloadBlob(blob, `argus_${target}_report_${Date.now()}.txt`);
}

export function exportAsCsv(results: ModuleExecutionResult[], target: string) {
  let csv = 'Module ID,Module Name,OSINT Category,Severity,Duration (ms),Findings Count,Paired Dorks\n';
  for (const r of results) {
    const nameEscaped = `"${r.moduleName.replace(/"/g, '""')}"`;
    const catEscaped = `"${r.osintCategory.replace(/"/g, '""')}"`;
    csv += `${r.moduleId},${nameEscaped},${catEscaped},${r.severity},${r.durationMs},${r.findings.length},${r.matchedDorks.length}\n`;
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, `argus_${target}_summary_${Date.now()}.csv`);
}

export function downloadTextFile(content: string, filename: string, mime = 'text/markdown') {
  const blob = new Blob([content], { type: mime });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
