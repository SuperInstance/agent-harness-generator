// SPDX-License-Identifier: MIT
//
// Trajectory persistence — JSONL append-only store for the intel pipeline's
// RETRIEVE → JUDGE → DISTILL → CONSOLIDATE phases.
//
// Append-only: each record is one line of JSON. Reading is a streaming
// line-by-line parse so unbounded growth doesn't blow up memory. Optional
// rotation cap (records-old-than-N or file-size-greater-than-M) keeps
// the store bounded.

import { appendFile, readFile, stat, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export interface TrajectoryRecord {
  /** ISO-8601 timestamp. */
  ts: string;
  /** Pipeline phase. */
  phase: 'Retrieve' | 'Judge' | 'Distill' | 'Consolidate';
  /** Outcome — Success/Skip/Fail in lowercase for JSONL compactness. */
  outcome: 'success' | 'skip' | 'fail';
  /** Free-form output. */
  output?: unknown;
}

export class TrajectoryStore {
  constructor(private path: string) {}

  async append(record: TrajectoryRecord): Promise<void> {
    await appendFile(this.path, JSON.stringify(record) + '\n', 'utf-8');
  }

  async readAll(): Promise<TrajectoryRecord[]> {
    if (!existsSync(this.path)) return [];
    const raw = await readFile(this.path, 'utf-8');
    return raw.split('\n').filter(Boolean).map(l => JSON.parse(l) as TrajectoryRecord);
  }

  /** Rotate the file if it exceeds maxBytes. Old data goes to `<path>.1`. */
  async rotateIfLarger(maxBytes: number): Promise<boolean> {
    if (!existsSync(this.path)) return false;
    const s = await stat(this.path);
    if (s.size <= maxBytes) return false;
    await rename(this.path, this.path + '.1');
    await writeFile(this.path, '', 'utf-8');
    return true;
  }

  async size(): Promise<number> {
    if (!existsSync(this.path)) return 0;
    return (await stat(this.path)).size;
  }
}
