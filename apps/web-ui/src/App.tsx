import { useState } from 'react';
import { Boxes, Github, Sparkles } from 'lucide-react';
import { HarnessBuilder } from './components/HarnessBuilder';
import { ArtifactBuilder } from './components/ArtifactBuilder';
import { SegTabs } from './components/ui';

type Mode = 'harness' | 'artifact';

export default function App() {
  const [mode, setMode] = useState<Mode>('harness');

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <a
            href="https://github.com/ruvnet/agent-harness-generator"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-1.5 text-xs text-slate-300 transition hover:border-ink-600 hover:text-white"
          >
            <Github size={14} /> ruvnet/agent-harness-generator
          </a>
          <div className="hidden items-center gap-1.5 text-xs text-slate-400 sm:flex">
            <Sparkles size={14} className="text-brand-glow" /> 100% client-side · nothing leaves your browser
          </div>
        </div>

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs font-medium text-brand-glow">
              <Boxes size={13} /> Meta-harness · web generator
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Agent Harness <span className="text-brand-glow">Generator</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
              Scaffold your own focused AI agent harness — or author Claude skills, agents, and commands — and download
              the whole thing as a zip. Pick primitives, pick content, supply identity. No backend, no install.
            </p>
          </div>
          <SegTabs
            value={mode}
            onChange={(m) => setMode(m as Mode)}
            options={[
              { id: 'harness', label: 'Full harness' },
              { id: 'artifact', label: 'Skill / Agent / Command' },
            ]}
          />
        </div>
      </header>

      <main>{mode === 'harness' ? <HarnessBuilder /> : <ArtifactBuilder />}</main>

      <footer className="mt-12 border-t border-ink-700/60 pt-6 text-xs text-slate-500">
        <p>
          Built on <a className="text-slate-300 hover:text-white" href="https://www.npmjs.com/package/@ruflo/kernel">@ruflo/kernel</a> — a
          Rust → WASM + NAPI-RS kernel. Output is byte-compatible with the <code className="text-slate-300">create-agent-harness</code> CLI.
          Drop generated <code className="text-slate-300">SKILL.md</code> folders straight into Claude desktop or claude.ai.
        </p>
      </footer>
    </div>
  );
}
