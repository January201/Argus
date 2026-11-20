import React, { useState, useEffect, useMemo, useRef } from 'react';
import rawCatalog from './data/modules.json';
import {
  ActiveWorkspaceView,
  ModuleExecutionResult,
  ModuleItem,
  OsintTemplateGroup,
  OsintToolCategory,
  SimultaneousProgress,
} from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TargetBar } from './components/TargetBar';
import { ModuleCatalog } from './components/ModuleCatalog';
import { DorkWorkspace } from './components/DorkWorkspace';
import { OsintTemplatesView } from './components/OsintTemplatesView';
import { TerminalConsole } from './components/TerminalConsole';
import { ResultsView } from './components/ResultsView';
import { ModuleDetailModal } from './components/ModuleDetailModal';
import { runModuleRecon, runSimultaneousRecon } from './utils/reconEngine';
import { DorkDatasetState, loadDorkDataset, scopeDorkToTarget } from './utils/dorkEngine';
import { classifyModuleToOsintCategory } from './utils/osintTaxonomy';

export const App: React.FC = () => {
  const allModules: ModuleItem[] = useMemo(() => {
    const list: ModuleItem[] = [];
    const catData = rawCatalog as Record<string, any[]>;
    for (const [catName, items] of Object.entries(catData)) {
      for (const item of items) {
        const mod: ModuleItem = {
          id: String(item.id),
          name: item.name,
          description: item.description,
          primary_input: item.primary_input,
          options: item.options || [],
          script: item.script,
          category: catName,
        };
        mod.osintCategory = classifyModuleToOsintCategory(mod);
        list.push(mod);
      }
    }
    return list;
  }, []);

  const [activeView, setActiveView] = useState<ActiveWorkspaceView>('catalog');
  const [selectedOsintCategory, setSelectedOsintCategory] = useState<
    OsintToolCategory | 'all' | 'favorites'
  >('all');
  const [selectedTemplateGroup, setSelectedTemplateGroup] = useState<
    OsintTemplateGroup | 'all'
  >('all');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [target, setTarget] = useState<string>('example.com');
  const [concurrency, setConcurrency] = useState<number>(allModules.length);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('argus_favs');
      return saved ? new Set(JSON.parse(saved)) : new Set(['1', '3', '5', '8', '24', '42']);
    } catch {
      return new Set(['1', '3', '5', '8', '24', '42']);
    }
  });

  const [dorkDataset, setDorkDataset] = useState<DorkDatasetState | null>(null);
  const [dorkLoading, setDorkLoading] = useState<boolean>(true);
  const [dorkError, setDorkError] = useState<string | null>(null);

  const [selectedModule, setSelectedModule] = useState<ModuleItem | null>(null);
  const [modalModule, setModalModule] = useState<ModuleItem | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [activeModuleIds, setActiveModuleIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<SimultaneousProgress | null>(null);
  const [results, setResults] = useState<ModuleExecutionResult[]>([]);
  const [logs, setLogs] = useState<string[]>([
    '[*] Argus OSINT workspace initialized.',
    `[*] Indexed ${allModules.length} reconnaissance scripts across OSINT Mastery categories.`,
    '[*] Loading Google Dork corpus for simultaneous target correlation...',
  ]);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    loadDorkDataset()
      .then((dataset) => {
        if (!active) return;
        setDorkDataset(dataset);
        setDorkLoading(false);
        setLogs((prev) => [
          ...prev,
          `[+] Google Dork corpus mounted (${dataset.entries.length.toLocaleString()} signatures ready).`,
        ]);
      })
      .catch((err) => {
        if (!active) return;
        setDorkError(err?.message || 'Failed to parse dork file');
        setDorkLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const resultsByModuleId = useMemo(() => {
    const map = new Map<string, ModuleExecutionResult>();
    for (const r of results) {
      map.set(r.moduleId, r);
    }
    return map;
  }, [results]);

  const sampleScopedDorks = useMemo(() => {
    if (!dorkDataset) return [];
    return dorkDataset.entries.slice(0, 15).map((e) => scopeDorkToTarget(e, target));
  }, [dorkDataset, target]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('argus_favs', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const appendLogs = (lines: string[]) => {
    setLogs((prev) => [...prev, ...lines].slice(-450));
  };

  const clearLogs = () => {
    setLogs(['[*] Terminal output cleared.']);
  };

  const clearResults = () => {
    setResults([]);
    setProgress(null);
  };

  const handleStopScan = () => {
    abortControllerRef.current?.abort();
    setIsScanning(false);
    setActiveModuleIds(new Set());
    appendLogs(['[!] Simultaneous execution stopped by analyst.']);
  };

  const handleExecuteModule = async (module: ModuleItem) => {
    if (!target) return;
    setIsScanning(true);
    setSelectedModule(module);
    setActiveModuleIds(new Set([module.id]));
    appendLogs([`[*] Launching [#${module.id}] ${module.name} + Dork correlation on ${target}`]);

    try {
      const res = await runModuleRecon(
        module,
        target,
        { threads: concurrency, dorkDataset },
        (msg) => appendLogs([msg])
      );
      setResults((prev) => [res, ...prev.filter((r) => r.moduleId !== res.moduleId)]);
    } finally {
      setIsScanning(false);
      setActiveModuleIds(new Set());
    }
  };

  const runBatchSimultaneous = async (modsToRun: ModuleItem[], label: string) => {
    if (!target || modsToRun.length === 0) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsScanning(true);
    setActiveView('results');
    setActiveModuleIds(new Set(modsToRun.map((m) => m.id)));
    setProgress({
      total: modsToRun.length,
      completed: 0,
      running: Math.min(concurrency, modsToRun.length),
      failed: 0,
      startedAtMs: performance.now(),
      elapsedMs: 0,
      activeModuleNames: modsToRun.slice(0, 5).map((m) => m.name),
    });

    appendLogs([
      `======================================================`,
      `[*] SIMULTANEOUS EXECUTION: ${label} (${modsToRun.length} tools + Dorks)`,
      `[*] Target: ${target} | Workers: ${Math.min(concurrency, modsToRun.length)}`,
    ]);

    try {
      await runSimultaneousRecon(
        modsToRun,
        target,
        { concurrency, signal: controller.signal },
        {
          onLog: (msg) => appendLogs([msg]),
          onModuleComplete: (result, prog) => {
            setProgress(prog);
            setActiveModuleIds((prev) => {
              const next = new Set(prev);
              next.delete(result.moduleId);
              return next;
            });
            setResults((prev) => [result, ...prev.filter((r) => r.moduleId !== result.moduleId)]);
          },
        }
      );

      if (!controller.signal.aborted) {
        appendLogs([`[+] Simultaneous suite complete (${modsToRun.length} modules + Dorks).`]);
      }
    } finally {
      setIsScanning(false);
      setActiveModuleIds(new Set());
    }
  };

  const handleRunQuickSuite = () => {
    const coreScripts = [
      'dns_records.py',
      'domain_info.py',
      'http_headers.py',
      'ssl_chain.py',
      'technology_stack.py',
      'subdomain_enum.py',
      'git_repo_exposure_check.py',
      'cloud_service_enumeration.py',
    ];
    const mods = coreScripts
      .map((s) => allModules.find((m) => m.script === s))
      .filter((m): m is ModuleItem => !!m);
    runBatchSimultaneous(mods, 'Quick OSINT Suite + Dorks');
  };

  const handleRunAllSimultaneous = () => {
    runBatchSimultaneous(allModules, `All ${allModules.length} Argus Tools + Dorks`);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-[#2EC4B6]/30 selection:text-[#2EC4B6]">
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        resultsCount={results.length}
        isScanning={isScanning}
        onRunAllSimultaneous={handleRunAllSimultaneous}
        onStopScan={handleStopScan}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
      />

      <div className="flex-1 flex min-h-0">
        <Sidebar
          modules={allModules}
          favoritesCount={favorites.size}
          dorkCount={dorkDataset?.entries.length || 0}
          resultsCount={results.length}
          activeView={activeView}
          setActiveView={setActiveView}
          selectedOsintCategory={selectedOsintCategory}
          setSelectedOsintCategory={setSelectedOsintCategory}
          selectedTemplateGroup={selectedTemplateGroup}
          setSelectedTemplateGroup={setSelectedTemplateGroup}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <TargetBar
            target={target}
            setTarget={setTarget}
            concurrency={concurrency}
            setConcurrency={setConcurrency}
            isScanning={isScanning}
            progress={progress}
            onRunQuickSuite={handleRunQuickSuite}
            onRunAllSimultaneous={handleRunAllSimultaneous}
            totalModules={allModules.length}
          />

          <main className="flex-1 pb-12">
            {activeView === 'catalog' && (
              <ModuleCatalog
                modules={allModules}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                selectedCategory={selectedOsintCategory}
                setSelectedCategory={setSelectedOsintCategory}
                onSelectModule={(m) => setModalModule(m)}
                onExecuteModule={handleExecuteModule}
                onRunFilteredSimultaneous={runBatchSimultaneous}
                isScanning={isScanning}
                activeModuleIds={activeModuleIds}
                resultsByModuleId={resultsByModuleId}
                target={target}
              />
            )}

            {activeView === 'dorks' && (
              <DorkWorkspace
                dataset={dorkDataset}
                loading={dorkLoading}
                error={dorkError}
                target={target}
                modules={allModules}
                isScanning={isScanning}
                onRunCategoryWithDorks={runBatchSimultaneous}
              />
            )}

            {activeView === 'templates' && (
              <OsintTemplatesView
                selectedGroup={selectedTemplateGroup}
                setSelectedGroup={setSelectedTemplateGroup}
                target={target}
                results={results}
                sampleScopedDorks={sampleScopedDorks}
              />
            )}

            {activeView === 'results' && (
              <ResultsView
                results={results}
                clearResults={clearResults}
                target={target}
                isScanning={isScanning}
                progress={progress}
                onRunAllSimultaneous={handleRunAllSimultaneous}
              />
            )}

            {activeView === 'terminal' && (
              <TerminalConsole
                logs={logs}
                appendLogs={appendLogs}
                clearLogs={clearLogs}
                target={target}
                setTarget={setTarget}
                concurrency={concurrency}
                setConcurrency={setConcurrency}
                selectedModule={selectedModule}
                setSelectedModule={setSelectedModule}
                onExecuteModule={handleExecuteModule}
                onRunAllSimultaneous={handleRunAllSimultaneous}
                onRunQuickSuite={handleRunQuickSuite}
                modules={allModules}
                dorkDataset={dorkDataset}
                isScanning={isScanning}
              />
            )}
          </main>
        </div>
      </div>

      <ModuleDetailModal
        module={modalModule}
        onClose={() => setModalModule(null)}
        onExecute={handleExecuteModule}
        isFav={modalModule ? favorites.has(modalModule.id) : false}
        onToggleFav={toggleFavorite}
        target={target}
        isScanning={isScanning}
        dorkDataset={dorkDataset}
      />
    </div>
  );
};

export default App;
