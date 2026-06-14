import { useMemo, useState } from 'react';
import { Download, Loader2, Package } from 'lucide-react';
import {
  AGENTS,
  COMMANDS,
  HOSTS,
  SKILLS,
  TEMPLATES,
  buildScaffold,
  downloadBlob,
  totalBytes,
  validateHarnessName,
  zipFilesUnder,
} from '../generator';
import type { GenFile, HarnessConfig, HostId, TemplateId } from '../generator';
import { Chip, Field, Section } from './ui';
import { FileTree } from './FileTree';

function defaultsFor(template: TemplateId): Pick<HarnessConfig, 'agents' | 'skills' | 'commands'> {
  const t = TEMPLATES.find((x) => x.id === template)!;
  return { agents: t.defaultAgents, skills: t.defaultSkills, commands: t.defaultCommands };
}

const INITIAL: HarnessConfig = {
  name: 'legal-redline',
  description: 'Redline contracts and surface risky clauses',
  hosts: ['claude-code'],
  template: 'vertical-devops',
  memory: 'agentdb',
  routing: '3-tier',
  marketplace: 'powered-by',
  ...defaultsFor('vertical-devops'),
};

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function HarnessBuilder() {
  const [cfg, setCfg] = useState<HarnessConfig>(INITIAL);
  const [selectedPath, setSelectedPath] = useState('README.md');
  const [busy, setBusy] = useState(false);

  const nameCheck = validateHarnessName(cfg.name);
  const files = useMemo<GenFile[]>(() => (nameCheck.valid ? buildScaffold(cfg) : []), [cfg, nameCheck.valid]);
  const selected = files.find((f) => f.path === selectedPath) ?? files[0];

  function patch(p: Partial<HarnessConfig>) {
    setCfg((c) => ({ ...c, ...p }));
  }

  function pickTemplate(id: TemplateId) {
    patch({ template: id, ...defaultsFor(id) });
  }

  async function download() {
    if (!nameCheck.valid) return;
    setBusy(true);
    try {
      const blob = await zipFilesUnder(cfg.name, files);
      downloadBlob(blob, `${cfg.name}.zip`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ---- Left: configuration ---- */}
      <div className="space-y-5">
        <Section title="Identity" desc="Your harness ships to npm under this name.">
          <div className="space-y-4">
            <Field label="Harness name" hint={nameCheck.valid ? 'kebab-case, npm-publishable' : nameCheck.reason}>
              <input
                className={`input ${nameCheck.valid ? '' : 'border-red-500/70 focus:border-red-500 focus:ring-red-500/30'}`}
                value={cfg.name}
                spellCheck={false}
                aria-invalid={!nameCheck.valid}
                aria-label="Harness name"
                onChange={(e) => patch({ name: e.target.value.trim() })}
              />
            </Field>
            <Field label="Description">
              <input
                className="input"
                value={cfg.description}
                aria-label="Description"
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Hosts" desc="Where the harness runs. Pick one or more.">
          <div className="flex flex-wrap gap-2">
            {HOSTS.map((h) => (
              <Chip
                key={h.id}
                title={h.shape}
                active={cfg.hosts.includes(h.id)}
                onClick={() => patch({ hosts: toggle<HostId>(cfg.hosts, h.id) })}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: h.color }} />
                {h.name}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Template" desc="Starting content. Pre-selects agents, skills, and commands.">
          <div className="grid gap-2 sm:grid-cols-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pickTemplate(t.id)}
                className={`rounded-lg border p-3 text-left transition ${
                  cfg.template === t.id
                    ? 'border-brand bg-brand/10 shadow-[0_0_0_1px_rgba(124,92,255,0.4)]'
                    : 'border-ink-700 bg-ink-800/50 hover:border-ink-600'
                }`}
              >
                <div className="text-sm font-semibold text-white">{t.name}</div>
                <div className="mt-1 text-xs text-slate-400">{t.description}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Compose" desc="Toggle the agents, skills, and slash-commands to include.">
          <div className="space-y-4">
            <CatalogRow
              label="Agents"
              items={AGENTS}
              selected={cfg.agents}
              onToggle={(id) => patch({ agents: toggle(cfg.agents, id) })}
            />
            <CatalogRow
              label="Skills"
              items={SKILLS}
              selected={cfg.skills}
              onToggle={(id) => patch({ skills: toggle(cfg.skills, id) })}
            />
            <CatalogRow
              label="Commands"
              items={COMMANDS}
              selected={cfg.commands}
              onToggle={(id) => patch({ commands: toggle(cfg.commands, id) })}
            />
          </div>
        </Section>

        <Section title="Kernel options">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Memory">
              <select className="input" value={cfg.memory} onChange={(e) => patch({ memory: e.target.value as HarnessConfig['memory'] })}>
                <option value="agentdb">AgentDB</option>
                <option value="sqlite">SQLite</option>
                <option value="in-memory">In-memory</option>
              </select>
            </Field>
            <Field label="Routing">
              <select className="input" value={cfg.routing} onChange={(e) => patch({ routing: e.target.value as HarnessConfig['routing'] })}>
                <option value="3-tier">3-tier</option>
                <option value="single-tier">Single-tier</option>
              </select>
            </Field>
            <Field label="Marketplace">
              <select className="input" value={cfg.marketplace} onChange={(e) => patch({ marketplace: e.target.value as HarnessConfig['marketplace'] })}>
                <option value="powered-by">Powered-by</option>
                <option value="independent">Independent</option>
              </select>
            </Field>
          </div>
        </Section>
      </div>

      {/* ---- Right: live preview ---- */}
      <div className="space-y-5 lg:sticky lg:top-5 lg:self-start">
        <Section
          title="Generated harness"
          desc={`${files.length} files · ${(totalBytes(files) / 1024).toFixed(1)} KB uncompressed`}
          right={
            <button data-testid="download-harness" className="btn btn-primary" onClick={download} disabled={!nameCheck.valid || busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Download .zip
            </button>
          }
        >
          {nameCheck.valid ? (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
              <div className="card overflow-hidden bg-ink-900/60">
                <FileTree files={files} selected={selected?.path ?? ''} onSelect={(f) => setSelectedPath(f.path)} />
              </div>
              <div className="card overflow-hidden bg-ink-950/80">
                <div className="border-b border-ink-700 px-3 py-2 font-mono text-xs text-slate-400">{selected?.path}</div>
                <pre className="scroll-thin max-h-[420px] overflow-auto p-3 text-[12px] leading-relaxed text-slate-200">
                  <code>{selected?.content}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              <Package size={16} /> Fix the harness name to preview the scaffold.
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function CatalogRow({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: { id: string; name: string; description: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <Chip key={it.id} title={it.description} active={selected.includes(it.id)} onClick={() => onToggle(it.id)}>
            {it.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}
