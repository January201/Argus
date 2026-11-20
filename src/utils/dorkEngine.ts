import { DorkCategory, DorkEntry, ModuleItem, ScopedDork } from '../types';

export const DORK_DATASET_URL = '/assets/aistudio/__Google_Dork_L_442b6639.txt';

export interface DorkDatasetState {
  entries: DorkEntry[];
  countsByCategory: Record<DorkCategory, number>;
  loadedAt: string;
}

let cachedDataset: DorkDatasetState | null = null;
let inflightLoad: Promise<DorkDatasetState> | null = null;

const OPERATOR_REGEX = /\b(inurl|allinurl|intitle|allintitle|filetype|ext|intext|allintext|site|link|cache|related|info):/gi;

export function extractOperators(raw: string): string[] {
  const found = new Set<string>();
  const matches = raw.match(OPERATOR_REGEX);
  if (matches) {
    for (const m of matches) {
      found.add(m.replace(':', '').toLowerCase());
    }
  }
  return Array.from(found);
}

export function classifyDork(raw: string): Exclude<DorkCategory, 'all'> {
  const lower = raw.toLowerCase();

  if (/\b(filetype|ext):(pdf|doc|docx|xls|xlsx|csv|ppt|pptx|txt|rtf|odt|xml|json)\b/i.test(lower)) {
    return 'documents';
  }
  if (/\b(filetype|ext):(env|yml|yaml|ini|conf|cfg|log|bak|sql|properties|toml)\b|(\.env\b|web\.config|wp-config|config\.php|settings\.py|localsettings)/i.test(lower)) {
    return 'configs';
  }
  if (/intitle:\s*("?index of"?|"index\.of"|directory listing)|parent directory/i.test(lower)) {
    return 'directories';
  }
  if (/(\.git\b|s3\.amazonaws|blob\.core\.windows|storage\.googleapis|jenkins|gitlab|kibana|grafana|swagger|graphql|api\/v[0-9]|actuator|kubernetes|docker)/i.test(lower)) {
    return 'cloud_storage';
  }
  if (/(inurl:\s*["']?(admin|login|signin|auth|portal|dashboard|panel|cpanel|webmail|sso|oauth|wp-admin|manager)|intitle:\s*["']?(login|admin|dashboard|portal|sign in))/i.test(lower)) {
    return 'portals';
  }
  if (/\.(php|asp|aspx|jsp|cfm|cgi|do|action)\?[a-z0-9_]+=/i.test(lower) || /inurl:[^\s]*\?[a-z0-9_]+=/i.test(lower)) {
    return 'parameters';
  }
  if (/(powered by|copyright|version|cms|wordpress|drupal|joomla|phpbb|apache|nginx|iis|tomcat)/i.test(lower)) {
    return 'tech_stack';
  }
  return 'general';
}

function isHeaderOrDecorativeLine(line: string): boolean {
  if (!line) return true;
  if (line.startsWith('#') || line.startsWith('---') || line.startsWith('**')) return true;
  if (line.startsWith('💡') || line.startsWith('Get the full')) return true;
  if (line.startsWith('A collection of') || line.startsWith('Hi there')) return true;
  if (/[▄█▀▌]/.test(line)) return true;
  return false;
}

export function parseDorkText(text: string): DorkDatasetState {
  const lines = text.split(/\r?\n/);
  const seen = new Set<string>();
  const entries: DorkEntry[] = [];
  const countsByCategory: Record<DorkCategory, number> = {
    all: 0,
    portals: 0,
    documents: 0,
    configs: 0,
    directories: 0,
    cloud_storage: 0,
    parameters: 0,
    tech_stack: 0,
    general: 0,
  };

  let id = 1;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (i < 21 && isHeaderOrDecorativeLine(raw)) continue;
    if (!raw || isHeaderOrDecorativeLine(raw)) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);

    const category = classifyDork(raw);
    const operators = extractOperators(raw);

    entries.push({
      id: id++,
      raw,
      category,
      operators,
    });

    countsByCategory[category]++;
  }

  countsByCategory.all = entries.length;

  return {
    entries,
    countsByCategory,
    loadedAt: new Date().toISOString(),
  };
}

export async function loadDorkDataset(): Promise<DorkDatasetState> {
  if (cachedDataset) return cachedDataset;
  if (inflightLoad) return inflightLoad;

  inflightLoad = (async () => {
    const res = await fetch(DORK_DATASET_URL);
    if (!res.ok) {
      throw new Error(`Unable to load dork dataset (${res.status})`);
    }
    const text = await res.text();
    const parsed = parseDorkText(text);
    cachedDataset = parsed;
    return parsed;
  })();

  try {
    return await inflightLoad;
  } finally {
    inflightLoad = null;
  }
}

export function scopeDorkToTarget(entry: DorkEntry, target: string): ScopedDork {
  const cleanTarget = target.trim().toLowerCase() || 'example.com';
  let cleanedRaw = entry.raw.replace(/^\d+\.\s*(keyword\s*:)?\s*/i, '').trim();

  // Strip embedded example site: constraints when re-scoping to the user's active target
  if (/\bsite:/i.test(cleanedRaw)) {
    cleanedRaw = cleanedRaw.replace(/\bsite:[^\s]+/gi, '').trim();
  }

  const scopedQuery = cleanedRaw ? `site:${cleanTarget} ${cleanedRaw}` : `site:${cleanTarget}`;
  const encoded = encodeURIComponent(scopedQuery);

  return {
    ...entry,
    scopedQuery,
    googleUrl: `https://www.google.com/search?q=${encoded}`,
    bingUrl: `https://www.bing.com/search?q=${encoded}`,
    ddgUrl: `https://duckduckgo.com/?q=${encoded}`,
  };
}

interface ModuleMatchProfile {
  categories: Exclude<DorkCategory, 'all'>[];
  keywords: string[];
}

function getModuleMatchProfile(module: ModuleItem): ModuleMatchProfile {
  const key = `${module.script} ${module.name} ${module.description}`.toLowerCase();

  if (/git|repo|env|exposed|config|backup|leak|pastebin|credential|breach/.test(key)) {
    return {
      categories: ['configs', 'cloud_storage', 'directories'],
      keywords: ['.env', '.git', 'config', 'backup', 'log', 'yml', 'properties'],
    };
  }
  if (/cloud|bucket|devops|service|jenkins|docker|kubernetes|s3/.test(key)) {
    return {
      categories: ['cloud_storage', 'portals', 'configs'],
      keywords: ['s3', 'bucket', 'jenkins', 'gitlab', 'jira', 'grafana', 'kibana', 'cloud'],
    };
  }
  if (/api|graphql|swagger|openapi|endpoint|parameter|redirect|dom|xss|sqli|upload|form|login|brute|auth|session|cookie|jwt/.test(key)) {
    return {
      categories: ['parameters', 'portals', 'cloud_storage'],
      keywords: ['api', 'graphql', 'swagger', 'login', 'admin', 'portal', 'auth', 'upload', 'php?'],
    };
  }
  if (/directory|sitemap|crawler|content|broken|archive|lazy|static|asset|comment/.test(key)) {
    return {
      categories: ['directories', 'documents', 'parameters'],
      keywords: ['index of', 'sitemap', 'robots', 'directory', 'pdf', 'xml'],
    };
  }
  if (/cms|tech|stack|framework|server|favicon|javascript|js|dependency|cdn/.test(key)) {
    return {
      categories: ['tech_stack', 'directories', 'portals'],
      keywords: ['powered by', 'wordpress', 'drupal', 'joomla', 'nginx', 'apache', 'tomcat'],
    };
  }
  if (/email|harvester|privacy|gdpr|security\.txt|contact|bounty|social/.test(key)) {
    return {
      categories: ['documents', 'portals', 'general'],
      keywords: ['contact', 'privacy', 'security', 'pdf', 'doc', 'csv', 'xls'],
    };
  }
  if (/dns|subdomain|ssl|tls|cert|whois|rdap|ip|asn|bgp|port|host|network|traceroute|rpki/.test(key)) {
    return {
      categories: ['portals', 'cloud_storage', 'directories'],
      keywords: ['intitle:', 'inurl:', 'admin', 'portal', 'dashboard', 'status', 'vpn'],
    };
  }
  return {
    categories: ['portals', 'documents', 'tech_stack'],
    keywords: ['inurl:', 'intitle:', 'filetype:'],
  };
}

export function matchDorksForModule(
  module: ModuleItem,
  dataset: DorkDatasetState | null,
  target: string,
  limit = 10
): ScopedDork[] {
  if (!dataset || dataset.entries.length === 0) return [];

  const profile = getModuleMatchProfile(module);
  const scored: { entry: DorkEntry; score: number }[] = [];

  // Fast bounded scan across dataset with deterministic module affinity scoring
  for (let i = 0; i < dataset.entries.length; i++) {
    const entry = dataset.entries[i];
    let score = 0;
    if (profile.categories.includes(entry.category)) score += 3;
    const lower = entry.raw.toLowerCase();
    for (const kw of profile.keywords) {
      if (lower.includes(kw)) score += 4;
    }
    if (entry.operators.length > 0) score += 1;

    if (score >= 4) {
      scored.push({ entry, score });
      if (scored.length >= 160) break;
    }
  }

  // Deterministic module-specific offset so distinct modules surface distinct representative dorks
  const offset = (parseInt(module.id, 10) || 1) % Math.max(1, Math.min(scored.length, 25));
  scored.sort((a, b) => b.score - a.score);
  const rotated = [...scored.slice(offset), ...scored.slice(0, offset)];

  return rotated.slice(0, limit).map((s) => scopeDorkToTarget(s.entry, target));
}

export const DORK_CATEGORY_META: {
  id: DorkCategory;
  label: string;
  description: string;
  pairedToolsHint: string;
}[] = [
  {
    id: 'all',
    label: 'All Signatures',
    description: 'Complete indexed Google Dork corpus scoped to target domain.',
    pairedToolsHint: 'Full Argus 134-Module Suite',
  },
  {
    id: 'portals',
    label: 'Portals & Auth',
    description: 'Administrative interfaces, sign-in routes, dashboards, and SSO endpoints.',
    pairedToolsHint: 'Login Identifier · Brute Audit · Session Passive',
  },
  {
    id: 'documents',
    label: 'Public Documents',
    description: 'Indexed PDFs, spreadsheets, reports, and structured data documents.',
    pairedToolsHint: 'Email Harvester · Privacy GDPR · Content Discovery',
  },
  {
    id: 'configs',
    label: 'Configs & Logs',
    description: 'Configuration manifests, environment files, and diagnostic logs.',
    pairedToolsHint: 'Exposed Env Files · Git Exposure · Security Contact',
  },
  {
    id: 'directories',
    label: 'Directory Listings',
    description: 'Open web directory indexes and unindexed tree listings.',
    pairedToolsHint: 'Directory Finder · Sitemap · Crawler',
  },
  {
    id: 'cloud_storage',
    label: 'Cloud & DevOps',
    description: 'Cloud buckets, CI/CD runners, API schemas, and source repositories.',
    pairedToolsHint: 'Cloud Service Enum · Cloud Bucket Exposure · API Schema',
  },
  {
    id: 'parameters',
    label: 'URL Parameters',
    description: 'Query-string endpoints, dynamic routes, and redirect handlers.',
    pairedToolsHint: 'Hidden Parameter Discovery · Open Redirect · DOM Sinks',
  },
  {
    id: 'tech_stack',
    label: 'Tech Fingerprints',
    description: 'CMS signatures, server banners, and web framework footprints.',
    pairedToolsHint: 'CMS Detection · Technology Stack · Passive CVE Mapper',
  },
];
