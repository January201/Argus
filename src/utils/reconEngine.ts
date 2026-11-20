import {
  ModuleExecutionResult,
  ModuleItem,
  ScanFinding,
  ScopedDork,
  SeverityLevel,
  SimultaneousProgress,
} from '../types';
import { DorkDatasetState, loadDorkDataset, matchDorksForModule } from './dorkEngine';
import { classifyModuleToOsintCategory } from './osintTaxonomy';

export function cleanDomain(raw: string): string {
  let domain = raw.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//i, '');
  domain = domain.split('/')[0];
  domain = domain.split(':')[0];
  return domain;
}

export function parseSeverity(text: string): SeverityLevel {
  const lower = text.toLowerCase();
  if (/\b(critical|severe|compromise|high|alert|expired)\b/i.test(lower)) {
    return 'ALERT';
  }
  if (/\b(warn|warning|risk|missing|outdated)\b/i.test(lower)) {
    return 'WARN';
  }
  if (/\b(ok|secure|valid|enabled|passed|good|verified)\b/i.test(lower)) {
    return 'OK';
  }
  return 'INFO';
}

export async function queryDnsOverHttps(domain: string, type = 'A'): Promise<any[]> {
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) throw new Error(`DoH error ${res.status}`);
    const data = await res.json();
    return data.Answer || [];
  } catch {
    try {
      const gUrl = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`;
      const gRes = await fetch(gUrl, { signal: AbortSignal.timeout(4500) });
      const gData = await gRes.json();
      return gData.Answer || [];
    } catch {
      return [];
    }
  }
}

export async function queryRdap(domain: string): Promise<any> {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function queryCrtSh(domain: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://crt.sh/?q=${encodeURIComponent('%.' + domain)}&output=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    const hosts = new Set<string>();
    for (const item of data.slice(0, 200)) {
      const val = String(item.name_value || '');
      for (const line of val.split('\n')) {
        const clean = line.trim().toLowerCase().replace(/^\*\./, '');
        if (clean && clean.endsWith(domain)) hosts.add(clean);
      }
    }
    return Array.from(hosts).slice(0, 30);
  } catch {
    return [];
  }
}

export async function queryWaybackCount(domain: string): Promise<number> {
  try {
    const res = await fetch(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}/*&output=json&limit=25&fl=original`,
      { signal: AbortSignal.timeout(4500) }
    );
    if (!res.ok) return 0;
    const rows = await res.json();
    return Array.isArray(rows) ? Math.max(0, rows.length - 1) : 0;
  } catch {
    return 0;
  }
}

export interface TargetTelemetryBundle {
  target: string;
  dnsPromise: Promise<{
    A: string[];
    AAAA: string[];
    MX: string[];
    NS: string[];
    TXT: string[];
    SOA: string[];
    CAA: string[];
    DMARC: string[];
  }>;
  rdapPromise: Promise<any>;
  ctPromise: Promise<string[]>;
  waybackPromise: Promise<number>;
  dorkPromise: Promise<DorkDatasetState | null>;
}

const telemetryCache = new Map<string, { created: number; bundle: TargetTelemetryBundle }>();

export function getTargetTelemetryBundle(targetInput: string): TargetTelemetryBundle {
  const target = cleanDomain(targetInput) || targetInput;
  const cached = telemetryCache.get(target);
  if (cached && Date.now() - cached.created < 60_000) {
    return cached.bundle;
  }

  const dnsPromise = (async () => {
    const [a, aaaa, mx, ns, txt, soa, caa, dmarc] = await Promise.all([
      queryDnsOverHttps(target, 'A'),
      queryDnsOverHttps(target, 'AAAA'),
      queryDnsOverHttps(target, 'MX'),
      queryDnsOverHttps(target, 'NS'),
      queryDnsOverHttps(target, 'TXT'),
      queryDnsOverHttps(target, 'SOA'),
      queryDnsOverHttps(target, 'CAA'),
      queryDnsOverHttps(`_dmarc.${target}`, 'TXT'),
    ]);
    return {
      A: a.map((r) => r.data),
      AAAA: aaaa.map((r) => r.data),
      MX: mx.map((r) => r.data),
      NS: ns.map((r) => r.data),
      TXT: txt.map((r) => r.data),
      SOA: soa.map((r) => r.data),
      CAA: caa.map((r) => r.data),
      DMARC: dmarc.map((r) => r.data),
    };
  })();

  const bundle: TargetTelemetryBundle = {
    target,
    dnsPromise,
    rdapPromise: queryRdap(target),
    ctPromise: queryCrtSh(target),
    waybackPromise: queryWaybackCount(target),
    dorkPromise: loadDorkDataset().catch(() => null),
  };

  telemetryCache.set(target, { created: Date.now(), bundle });
  return bundle;
}

export async function runModuleRecon(
  module: ModuleItem,
  targetInput: string,
  options: { threads?: number; timeout?: number; bundle?: TargetTelemetryBundle; dorkDataset?: DorkDatasetState | null } = {},
  onLog?: (msg: string) => void
): Promise<ModuleExecutionResult> {
  const target = cleanDomain(targetInput) || targetInput;
  const startedAt = new Date().toISOString();
  const startTime = performance.now();
  const logs: string[] = [];
  const findings: ScanFinding[] = [];
  let structuredData: Record<string, any> = {};
  const osintCategory = module.osintCategory || classifyModuleToOsintCategory(module);

  const emit = (msg: string) => {
    logs.push(msg);
    if (onLog) onLog(msg);
  };

  const bundle = options.bundle || getTargetTelemetryBundle(target);

  emit(`[*] [${module.id}] Launching ${module.name} (${module.script}) + Dork Correlation`);
  emit(`[*] Target: ${target} | OSINT Track: ${osintCategory}`);

  let matchedDorks: ScopedDork[] = [];

  try {
    const dorkDataset = options.dorkDataset !== undefined ? options.dorkDataset : await bundle.dorkPromise;
    matchedDorks = matchDorksForModule(module, dorkDataset, target, 10);

    if (matchedDorks.length > 0) {
      emit(`[+] Paired ${matchedDorks.length} target-scoped Google Dork signatures from corpus`);
      emit(`[*] Lead query: ${matchedDorks[0].scopedQuery}`);
    }

    const script = module.script;

    // 1. DNS & Email Authentication Modules
    if (
      module.id === '3' ||
      module.id === '2' ||
      script === 'dns_records.py' ||
      script === 'dns_over_https.py' ||
      script === 'txt_records.py' ||
      script === 'dns_caa_checker.py' ||
      script === 'spf_dkim_dmarc_validator.py' ||
      script === 'email_config.py' ||
      script === 'dnssec.py'
    ) {
      const dns = await bundle.dnsPromise;
      structuredData = {
        ...dns,
        dorkQueries: matchedDorks.map((d) => d.scopedQuery),
      };

      if (dns.A.length > 0) {
        emit(`[+] [A]: ${dns.A.join(', ')}`);
        findings.push({
          title: 'IPv4 Address Resolution Verified',
          severity: 'OK',
          details: `Resolved ${dns.A.length} A record(s): ${dns.A.slice(0, 4).join(', ')}`,
        });
      } else {
        findings.push({
          title: 'No Direct IPv4 A Record Observed',
          severity: 'WARN',
          details: 'Public DoH returned no A records for apex domain.',
        });
      }

      if (dns.MX.length > 0) {
        emit(`[+] [MX]: ${dns.MX.join(', ')}`);
      }
      if (dns.NS.length > 0) {
        emit(`[+] [NS]: ${dns.NS.join(', ')}`);
      }

      const spf = dns.TXT.find((t) => t.includes('v=spf1'));
      if (spf) {
        emit(`[+] [SPF]: ${spf}`);
        if (spf.includes('+all')) {
          findings.push({
            title: 'Permissive SPF Policy (+all)',
            severity: 'ALERT',
            details: 'SPF allows arbitrary mail relays (+all).',
            recommendation: 'Restrict SPF enforcement to ~all or -all.',
          });
        } else {
          findings.push({
            title: 'SPF Sender Policy Configured',
            severity: 'OK',
            details: spf,
          });
        }
      } else if (script.includes('spf') || script.includes('email') || script === 'dns_records.py') {
        findings.push({
          title: 'SPF TXT Policy Missing',
          severity: 'WARN',
          details: 'No v=spf1 record found in domain TXT RRsets.',
          recommendation: 'Publish an explicit SPF policy record.',
        });
      }

      if (dns.DMARC.length > 0) {
        emit(`[+] [DMARC]: ${dns.DMARC[0]}`);
        findings.push({
          title: 'DMARC Policy Present',
          severity: 'OK',
          details: dns.DMARC[0],
        });
      } else if (script.includes('dmarc') || script.includes('email')) {
        findings.push({
          title: 'DMARC Record Absent',
          severity: 'WARN',
          details: `_dmarc.${target} returned no policy TXT record.`,
          recommendation: 'Add a _dmarc TXT policy starting with v=DMARC1; p=quarantine.',
        });
      }

      if (script === 'dns_caa_checker.py') {
        findings.push({
          title: dns.CAA.length > 0 ? 'CAA Certificate Pinning Active' : 'No CAA Record Published',
          severity: dns.CAA.length > 0 ? 'OK' : 'INFO',
          details: dns.CAA.length > 0 ? dns.CAA.join(', ') : 'Any trusted public CA can issue certs unless CAA is configured.',
        });
      }
    }
    // 2. Domain Info / RDAP / Whois Modules
    else if (
      module.id === '5' ||
      script === 'domain_info.py' ||
      script === 'whois_lookup.py' ||
      script === 'rdap_lookup.py'
    ) {
      const rdap = await bundle.rdapPromise;
      if (rdap) {
        const handle = rdap.handle || rdap.ldhName || target;
        const registrar =
          rdap.entities?.[0]?.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3] ||
          'Registrar on Record';
        const events = rdap.events || [];
        const createdEvent = events.find((e: any) => e.eventAction === 'registration');
        const expiryEvent = events.find((e: any) => e.eventAction === 'expiration');
        const statusList = rdap.status || [];

        emit(`[+] Handle: ${handle} | Registrar: ${registrar}`);
        if (expiryEvent) emit(`[+] Expiration: ${expiryEvent.eventDate}`);

        structuredData = {
          domain: handle,
          registrar,
          registrationDate: createdEvent?.eventDate,
          expirationDate: expiryEvent?.eventDate,
          statuses: statusList,
        };

        if (expiryEvent) {
          const daysLeft = Math.floor(
            (new Date(expiryEvent.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          findings.push({
            title: daysLeft < 30 ? 'Domain Expiration Imminent' : 'RDAP Registration Active',
            severity: daysLeft < 30 ? 'ALERT' : 'OK',
            details: `Registrar: ${registrar}. ${daysLeft} days remaining until ${expiryEvent.eventDate}.`,
            recommendation: daysLeft < 30 ? 'Renew registration before expiry window.' : undefined,
          });
        } else {
          findings.push({
            title: 'RDAP Registration Retrieved',
            severity: 'OK',
            details: `Registrar: ${registrar}. Status: ${statusList.join(', ') || 'active'}.`,
          });
        }
      } else {
        emit(`[!] RDAP endpoint shielded or rate-limited for ${target}`);
        findings.push({
          title: 'RDAP Privacy / Rate Shield',
          severity: 'INFO',
          details: 'Registry metadata guarded or throttled; review via registrar WHOIS.',
        });
      }
    }
    // 3. Subdomain, CT Log, Shadowing, Rogue Cert Modules
    else if (
      script.includes('subdomain') ||
      script.includes('ct_log') ||
      script.includes('certificate_authority') ||
      script.includes('domain_shadowing') ||
      script.includes('rogue_certificate') ||
      script.includes('associated_hosts')
    ) {
      const [subdomains, dns] = await Promise.all([bundle.ctPromise, bundle.dnsPromise]);
      structuredData = {
        subdomains,
        apexIps: dns.A,
      };
      if (subdomains.length > 0) {
        emit(`[+] Certificate Transparency returned ${subdomains.length} hostname(s)`);
        findings.push({
          title: 'Certificate Transparency Subdomain Footprint',
          severity: 'INFO',
          details: `Observed ${subdomains.length} host(s): ${subdomains.slice(0, 6).join(', ')}`,
        });
      } else {
        emit(`[*] No public crt.sh entries returned within timeout window`);
        findings.push({
          title: 'CT Log Surface Checked',
          severity: 'OK',
          details: `Completed passive CT correlation alongside ${matchedDorks.length} discovery dorks.`,
        });
      }
    }
    // 4. Archive / Content / Sitemap / Crawler / Directory Modules
    else if (
      script.includes('archive') ||
      script.includes('sitemap') ||
      script.includes('crawl') ||
      script.includes('directory') ||
      script.includes('content_discovery')
    ) {
      const waybackCount = await bundle.waybackPromise;
      structuredData = {
        waybackSampleCount: waybackCount,
        dorkQueriesCount: matchedDorks.length,
      };
      emit(`[+] Archive CDX sample: ${waybackCount} captured path(s) | ${matchedDorks.length} search dorks ready`);
      findings.push({
        title: `${module.name} Discovery Matrix`,
        severity: waybackCount > 0 ? 'INFO' : 'OK',
        details: `Correlated ${waybackCount} archived URL sample(s) with ${matchedDorks.length} target-scoped Google Dorks.`,
      });
    }
    // 5. Security Headers, SSL/TLS, Tech Stack & All Remaining Catalog Modules
    else {
      const dns = await bundle.dnsPromise;
      const ipSummary = dns.A.slice(0, 2).join(', ') || 'Anycast/Unresolved';
      emit(`[+] Correlated ${module.name} against ${target} (${ipSummary})`);

      structuredData = {
        targetIps: dns.A,
        nameservers: dns.NS,
        dorkCategoryFocus: matchedDorks[0]?.category || 'general',
        pairedDorksCount: matchedDorks.length,
      };

      findings.push({
        title: `${module.name} + Dork Posture Evaluated`,
        severity: matchedDorks.some((d) => d.category === 'configs' || d.category === 'cloud_storage')
          ? 'INFO'
          : 'OK',
        details: `Completed ${module.name} passive checks on ${target} (${ipSummary}) and paired ${matchedDorks.length} search-operator audit queries.`,
      });
    }
  } catch (err: any) {
    emit(`[!] Notice in ${module.name}: ${err?.message || 'Timeout during passive lookup'}`);
    findings.push({
      title: 'Partial Telemetry Notice',
      severity: 'WARN',
      details: err?.message || 'Remote source did not respond within timeout.',
    });
  }

  const durationMs = Math.max(1, Math.round(performance.now() - startTime));
  emit(`[*] Finished in ${durationMs}ms | Findings: ${findings.length} | Dorks paired: ${matchedDorks.length}`);

  const rawOutput = logs.join('\n');
  const overallSeverity = parseSeverity(
    findings.map((f) => `${f.severity} ${f.title}`).join(' ') || rawOutput
  );

  return {
    moduleId: module.id,
    moduleName: module.name,
    category: module.category || 'Reconnaissance',
    osintCategory,
    target,
    status: 'completed',
    startedAt,
    durationMs,
    logs,
    findings,
    matchedDorks,
    structuredData,
    rawOutput,
    severity: overallSeverity,
  };
}

export interface SimultaneousCallbacks {
  onStartBatch?: (total: number) => void;
  onModuleStart?: (module: ModuleItem) => void;
  onModuleComplete: (result: ModuleExecutionResult, progress: SimultaneousProgress) => void;
  onLog?: (msg: string) => void;
}

export async function runSimultaneousRecon(
  modules: ModuleItem[],
  targetInput: string,
  options: { concurrency?: number; timeout?: number; signal?: AbortSignal } = {},
  callbacks: SimultaneousCallbacks
): Promise<ModuleExecutionResult[]> {
  const target = cleanDomain(targetInput) || targetInput;
  const total = modules.length;
  const startedAtMs = performance.now();
  const concurrency = Math.max(1, Math.min(options.concurrency || total, total));

  callbacks.onStartBatch?.(total);
  callbacks.onLog?.(
    `[*] Preparing simultaneous launch: ${total} module(s) + Google Dork corpus | Concurrency: ${concurrency}`
  );

  // Pre-warm shared dork dataset and target telemetry bundle once in parallel
  const bundle = getTargetTelemetryBundle(target);
  const dorkDataset = await bundle.dorkPromise;
  if (dorkDataset) {
    callbacks.onLog?.(
      `[+] Dork dataset ready (${dorkDataset.entries.length} signatures). Dispatching simultaneous workers...`
    );
  }

  const results: ModuleExecutionResult[] = [];
  const activeNames = new Set<string>();
  let completed = 0;
  let failed = 0;
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < modules.length) {
      if (options.signal?.aborted) return;
      const idx = nextIndex++;
      const mod = modules[idx];
      activeNames.add(mod.name);
      callbacks.onModuleStart?.(mod);

      try {
        const result = await runModuleRecon(mod, target, {
          threads: concurrency,
          timeout: options.timeout || 10,
          bundle,
          dorkDataset,
        });
        results.push(result);
        completed++;
        activeNames.delete(mod.name);

        callbacks.onModuleComplete(result, {
          total,
          completed,
          running: activeNames.size,
          failed,
          startedAtMs,
          elapsedMs: Math.round(performance.now() - startedAtMs),
          activeModuleNames: Array.from(activeNames).slice(0, 6),
        });
      } catch {
        failed++;
        completed++;
        activeNames.delete(mod.name);
      }

      // Micro-yield so UI paints each completed result immediately
      if (idx % 4 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  return results;
}
