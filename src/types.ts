export interface ModuleItem {
  id: string;
  name: string;
  description: string;
  primary_input: string;
  options: string[];
  script: string;
  category?: string;
  osintCategory?: OsintToolCategory;
  tags?: string[];
}

export type OsintToolCategory =
  | 'search_discovery'
  | 'technical_recon'
  | 'web_analysis'
  | 'threat_intel'
  | 'business_footprint'
  | 'privacy_opsec';

export type DorkCategory =
  | 'all'
  | 'portals'
  | 'documents'
  | 'configs'
  | 'directories'
  | 'cloud_storage'
  | 'parameters'
  | 'tech_stack'
  | 'general';

export interface DorkEntry {
  id: number;
  raw: string;
  category: Exclude<DorkCategory, 'all'>;
  operators: string[];
}

export interface ScopedDork extends DorkEntry {
  scopedQuery: string;
  googleUrl: string;
  bingUrl: string;
  ddgUrl: string;
}

export type SeverityLevel = 'ALERT' | 'WARN' | 'OK' | 'INFO';

export interface ScanFinding {
  title: string;
  severity: SeverityLevel;
  details: string;
  recommendation?: string;
}

export interface ModuleExecutionResult {
  moduleId: string;
  moduleName: string;
  category: string;
  osintCategory: OsintToolCategory;
  target: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  durationMs: number;
  logs: string[];
  findings: ScanFinding[];
  matchedDorks: ScopedDork[];
  structuredData?: Record<string, any>;
  rawOutput: string;
  severity: SeverityLevel;
}

export interface SimultaneousProgress {
  total: number;
  completed: number;
  running: number;
  failed: number;
  startedAtMs: number;
  elapsedMs: number;
  activeModuleNames: string[];
}

export type OsintTemplateGroup =
  | 'technical-assessments'
  | 'investigation-reports'
  | 'operational-planning';

export interface OsintTemplate {
  id: string;
  group: OsintTemplateGroup;
  title: string;
  filename: string;
  summary: string;
  sections: string[];
}

export type ActiveWorkspaceView =
  | 'catalog'
  | 'dorks'
  | 'templates'
  | 'results'
  | 'terminal';

export interface TargetConfig {
  target: string;
  threads: number;
  timeout: number;
  quietMode: boolean;
}
