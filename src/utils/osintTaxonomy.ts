import { ModuleExecutionResult, ModuleItem, OsintTemplate, OsintToolCategory, ScopedDork } from '../types';

export const OSINT_TOOL_CATEGORIES: {
  id: OsintToolCategory;
  folder: string;
  label: string;
  description: string;
}[] = [
  {
    id: 'search_discovery',
    folder: 'search-and-discovery',
    label: 'Search & Discovery',
    description: 'Google Dorking, search operators, content discovery, and archive lookup.',
  },
  {
    id: 'technical_recon',
    folder: 'technical-reconnaissance',
    label: 'Technical Reconnaissance',
    description: 'DNS, WHOIS/RDAP, SSL/TLS certificates, ASN/BGP, and infrastructure mapping.',
  },
  {
    id: 'web_analysis',
    folder: 'web-application-analysis',
    label: 'Web & App Analysis',
    description: 'HTTP headers, API schemas, JS analysis, forms, and framework fingerprinting.',
  },
  {
    id: 'threat_intel',
    folder: 'threat-intelligence',
    label: 'Threat Intelligence',
    description: 'Exposure posture, passive CVE mapping, reputation feeds, and cloud audit.',
  },
  {
    id: 'business_footprint',
    folder: 'business-intelligence',
    label: 'Business & Footprint',
    description: 'Organization metadata, rankings, social links, bug bounty, and contact mapping.',
  },
  {
    id: 'privacy_opsec',
    folder: 'privacy-and-security',
    label: 'Privacy & OPSEC',
    description: 'GDPR posture, pixel trackers, cookie scope, and security disclosure gaps.',
  },
];

export function classifyModuleToOsintCategory(mod: ModuleItem): OsintToolCategory {
  const key = `${mod.script} ${mod.name} ${mod.description}`.toLowerCase();

  if (
    /privacy|gdpr|pixel|cookie|security_txt|security_contact|autocomplete|captcha|opsec/.test(key)
  ) {
    return 'privacy_opsec';
  }
  if (
    /archive|sitemap|crawl|content_discovery|directory_finder|broken_links|custom_wordlist|google|shodan|censys/.test(
      key
    )
  ) {
    return 'search_discovery';
  }
  if (
    /social_media|global_ranking|bug_bounty|email_harvester|third_party_integrations|carbon_footprint|multi_language/.test(
      key
    )
  ) {
    return 'business_footprint';
  }
  if (mod.category === 'security_threat_intelligence') {
    return 'threat_intel';
  }
  if (mod.category === 'web_application_analysis') {
    return 'web_analysis';
  }
  return 'technical_recon';
}

export const OSINT_TEMPLATES: OsintTemplate[] = [
  {
    id: 'network-reconnaissance-report',
    group: 'technical-assessments',
    title: 'Network Reconnaissance Report',
    filename: 'network-reconnaissance-report.md',
    summary: 'Infrastructure analysis, DNS RRsets, authoritative nameservers, and routing posture.',
    sections: ['Executive Scope', 'DNS & Network Telemetry', 'Certificate & TLS Posture', 'Paired Dork Vectors', 'Remediation Matrix'],
  },
  {
    id: 'domain-website-analysis-report',
    group: 'technical-assessments',
    title: 'Domain & Website Analysis Report',
    filename: 'domain-website-analysis-report.md',
    summary: 'Web property investigation combining RDAP registration, HTTP security headers, and search indexing.',
    sections: ['Domain Registration (RDAP)', 'Web Surface & Headers', 'Search Engine Indexing (Dorks)', 'Findings Summary'],
  },
  {
    id: 'infrastructure-assessment',
    group: 'technical-assessments',
    title: 'Infrastructure Assessment',
    filename: 'infrastructure-assessment.md',
    summary: 'Technology stack, CDN edge topology, cloud service footprints, and port exposure.',
    sections: ['Stack Fingerprinting', 'Cloud & DevOps Footprint', 'Subdomain Inventory', 'Hardening Priorities'],
  },
  {
    id: 'vulnerability-intelligence-report',
    group: 'technical-assessments',
    title: 'Vulnerability Intelligence Report',
    filename: 'vulnerability-intelligence-report.md',
    summary: 'Passive security posture weaknesses, misconfiguration indicators, and exposure checks.',
    sections: ['Severity Distribution', 'Active Alerts & Warnings', 'Dork-Correlated Exposure Checks', 'Actionable Fixes'],
  },
  {
    id: 'digital-footprint-assessment',
    group: 'investigation-reports',
    title: 'Digital Footprint Assessment',
    filename: 'digital-footprint-assessment.md',
    summary: 'Public online presence, exposed documents, subdomains, and external service links.',
    sections: ['Public Footprint Overview', 'Indexed Subdomains & Hosts', 'Document & Portal Search Coverage', 'OPSEC Recommendations'],
  },
  {
    id: 'threat-intelligence-report',
    group: 'investigation-reports',
    title: 'Threat Intelligence Report',
    filename: 'threat-intelligence-report.md',
    summary: 'Security-focused threat posture evaluation across reputation, shadowing, and disclosure channels.',
    sections: ['Threat Posture Summary', 'Domain Reputation & Email Auth', 'Shadowing & Typosquat Vectors', 'Defensive Mitigations'],
  },
  {
    id: 'business-intelligence-report',
    group: 'investigation-reports',
    title: 'Business Intelligence Report',
    filename: 'business-intelligence-report.md',
    summary: 'Corporate digital asset inventory, third-party SaaS integrations, and public governance records.',
    sections: ['Organization Profile', 'Third-Party Ecosystem', 'Disclosure & Policy Presence', 'Analyst Notes'],
  },
  {
    id: 'osint-collection-plan',
    group: 'operational-planning',
    title: 'OSINT Collection Plan',
    filename: 'osint-collection-plan.md',
    summary: 'Systematic multi-phase reconnaissance strategy mapping target scope to simultaneous tools & dorks.',
    sections: ['Collection Objectives', 'Target Scope & Constraints', 'Tool & Dork Execution Matrix', 'Verification Protocol'],
  },
  {
    id: 'legal-compliance-checklist',
    group: 'operational-planning',
    title: 'Legal & Ethical Compliance Checklist',
    filename: 'legal-compliance-checklist.md',
    summary: 'Regulatory adherence, passive-only boundary verification, and evidence documentation standards.',
    sections: ['Authorization & Scope Verification', 'Passive Telemetry Compliance', 'Data Minimization & Retention', 'Chain of Documentation'],
  },
  {
    id: 'source-verification-framework',
    group: 'operational-planning',
    title: 'Source Verification Framework',
    filename: 'source-verification-framework.md',
    summary: 'Cross-source corroboration comparing DoH, RDAP, Certificate Transparency, and search signatures.',
    sections: ['Primary Authoritative Sources', 'Corroboration Matrix', 'Confidence Scoring', 'Timestamped Evidence Log'],
  },
];

export function renderHydratedTemplate(
  template: OsintTemplate,
  target: string,
  results: ModuleExecutionResult[],
  scopedDorks: ScopedDork[]
): string {
  const now = new Date().toUTCString();
  const cleanTarget = target || 'unspecified-target';
  const totalFindings = results.reduce((acc, r) => acc + r.findings.length, 0);
  const alerts = results.flatMap((r) =>
    r.findings.filter((f) => f.severity === 'ALERT').map((f) => ({ module: r.moduleName, ...f }))
  );
  const warns = results.flatMap((r) =>
    r.findings.filter((f) => f.severity === 'WARN').map((f) => ({ module: r.moduleName, ...f }))
  );

  const dnsRes = results.find((r) => r.structuredData?.A || r.structuredData?.MX);
  const rdapRes = results.find((r) => r.structuredData?.registrar);
  const ctRes = results.find((r) => Array.isArray(r.structuredData?.subdomains));

  const lines: string[] = [];
  lines.push(`# ${template.title}`);
  lines.push('');
  lines.push(`- **Target Scope:** \`${cleanTarget}\``);
  lines.push(`- **Generated:** ${now}`);
  lines.push(`- **Template Path:** \`osint-templates/${template.group}/${template.filename}\``);
  lines.push(`- **Modules Executed:** ${results.length}`);
  lines.push(`- **Findings Logged:** ${totalFindings} (${alerts.length} alerts, ${warns.length} warnings)`);
  lines.push('');
  lines.push(`> ${template.summary}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  if (template.group === 'operational-planning') {
    lines.push('## 1. Operational Scope & Methodology');
    lines.push(`- Target identifier: \`${cleanTarget}\``);
    lines.push('- Execution mode: Passive multi-source telemetry (DNS DoH, ICANN RDAP, Certificate Transparency, Wayback CDX) correlated with target-scoped Google Dork signatures.');
    lines.push('- Ethical boundary: Passive open-source discovery only; no intrusive exploitation payloads.');
    lines.push('');
    lines.push('## 2. Source Verification Matrix');
    lines.push('| Source | Status | Observed Output |');
    lines.push('| --- | --- | --- |');
    lines.push(`| Public DoH (Cloudflare / Google) | ${dnsRes ? 'Verified' : 'Pending'} | ${dnsRes?.structuredData?.A?.slice(0, 3).join(', ') || 'Run DNS Records'} |`);
    lines.push(`| ICANN RDAP Registry | ${rdapRes ? 'Verified' : 'Pending'} | ${rdapRes?.structuredData?.registrar || 'Run Domain Info'} |`);
    lines.push(`| Certificate Transparency (crt.sh) | ${ctRes ? 'Verified' : 'Pending'} | ${ctRes?.structuredData?.subdomains?.length ?? 0} hostnames observed |`);
    lines.push(`| Google Dork Corpus | ${scopedDorks.length > 0 ? 'Indexed' : 'Pending'} | ${scopedDorks.length} target-scoped queries prepared |`);
    lines.push('');
    lines.push('## 3. Compliance Checklist');
    lines.push('- [x] Scope constrained strictly to authorized target domain');
    lines.push('- [x] Passive open-source endpoints prioritized');
    lines.push('- [x] All findings timestamped and attributed to originating module');
    lines.push('- [ ] Analyst manual review and false-positive triage completed');
    lines.push('');
  } else {
    lines.push('## 1. Executive Summary');
    lines.push(
      results.length > 0
        ? `Simultaneous reconnaissance across **${results.length}** Argus modules against \`${cleanTarget}\` identified **${totalFindings}** telemetry observations (${alerts.length} alerts, ${warns.length} warnings).`
        : `No simultaneous scan results have been recorded yet for \`${cleanTarget}\`. Run **Run All + Dorks** or **Quick Suite** to populate live intelligence.`
    );
    lines.push('');

    if (dnsRes?.structuredData) {
      lines.push('## 2. DNS & Network Telemetry');
      lines.push(`- **A (IPv4):** ${dnsRes.structuredData.A?.join(', ') || 'None'}`);
      lines.push(`- **AAAA (IPv6):** ${dnsRes.structuredData.AAAA?.join(', ') || 'None'}`);
      lines.push(`- **MX:** ${dnsRes.structuredData.MX?.join(', ') || 'None'}`);
      lines.push(`- **NS:** ${dnsRes.structuredData.NS?.join(', ') || 'None'}`);
      lines.push('');
    }

    if (rdapRes?.structuredData) {
      lines.push('## 3. Domain Registration (RDAP)');
      lines.push(`- **Registrar:** ${rdapRes.structuredData.registrar || 'Unknown'}`);
      lines.push(`- **Registered:** ${rdapRes.structuredData.registrationDate || 'N/A'}`);
      lines.push(`- **Expires:** ${rdapRes.structuredData.expirationDate || 'N/A'}`);
      lines.push('');
    }

    if (ctRes?.structuredData?.subdomains?.length) {
      lines.push('## 4. Observed Certificate Transparency Hostnames');
      for (const host of ctRes.structuredData.subdomains.slice(0, 15)) {
        lines.push(`- \`${host}\``);
      }
      lines.push('');
    }

    if (alerts.length > 0 || warns.length > 0) {
      lines.push('## 5. Priority Alerts & Warnings');
      for (const item of [...alerts, ...warns].slice(0, 20)) {
        lines.push(`- **[${item.severity}] (${item.module}) ${item.title}:** ${item.details}`);
        if (item.recommendation) {
          lines.push(`  - *Mitigation:* ${item.recommendation}`);
        }
      }
      lines.push('');
    }
  }

  lines.push('## Correlated Google Dork Audit Queries');
  const dorkSample = scopedDorks.slice(0, 15);
  if (dorkSample.length > 0) {
    for (const d of dorkSample) {
      lines.push(`- \`${d.scopedQuery}\` _(${d.category})_`);
    }
  } else {
    lines.push(`- \`site:${cleanTarget} intitle:"index of"\``);
    lines.push(`- \`site:${cleanTarget} filetype:pdf\``);
    lines.push(`- \`site:${cleanTarget} inurl:login | inurl:portal\``);
  }
  lines.push('');

  if (results.length > 0) {
    lines.push('## Module Execution Ledger');
    lines.push('| ID | Module | Category | Severity | Duration | Dorks Paired |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const r of results.slice(0, 40)) {
      lines.push(
        `| #${r.moduleId} | ${r.moduleName} | ${r.osintCategory} | ${r.severity} | ${r.durationMs}ms | ${r.matchedDorks.length} |`
      );
    }
    if (results.length > 40) {
      lines.push(`\n_Showing first 40 of ${results.length} completed modules._`);
    }
  }

  return lines.join('\n');
}
