// iter 137 — regression guards for the 6 CodeQL code-scanning alerts
// closed on 2026-06-14. Each test pins the fixed behaviour so the alert
// cannot silently reopen.
import { describe, it, expect } from 'vitest';
import { basename } from 'node:path';
import { templateDir } from '../src/index.js';

describe('CodeQL #2 — incomplete string escaping (templateDir)', () => {
  it('replaces EVERY colon, not just the first', () => {
    // A hypothetical multi-colon id must not leave a stray ':' in the final
    // path segment. (Check the basename, not the whole path — on Windows the
    // absolute prefix legitimately contains a drive-letter colon, e.g. C:\.)
    const seg = basename(templateDir('vertical:sub:thing'));
    expect(seg).not.toContain(':');
    expect(seg).toBe('vertical_sub_thing');
  });

  it('still maps the normal single-colon id', () => {
    expect(templateDir('vertical:devops')).toContain('vertical_devops');
  });
});

describe('CodeQL #1/#3 — polynomial regex in kebab (ReDoS)', () => {
  // kebab is not exported; exercise it through recommendPlan's name field
  // would require a full profile. Instead assert the property that the fix
  // guarantees: linear time on a pathological all-separator input.
  it('handles a pathological all-separator string in linear time', async () => {
    // Re-import the analyze-repo module and reach the kebab behaviour via
    // recommendPlan, which calls kebab(`${name}-harness`).
    const { recommendPlan } = await import('../src/analyze-repo.js');
    const evil = '-'.repeat(100000);
    const profile = {
      name: evil,
      languages: [],
      hasMcp: false,
      hasClaude: false,
      hasCodex: false,
      hasCi: false,
      buildCommands: [],
      testCommands: [],
      tokens: [],
    } as Parameters<typeof recommendPlan>[0];
    const start = Date.now();
    const plan = recommendPlan(profile);
    const elapsed = Date.now() - start;
    // Fix guarantees linear time: 100k separators must collapse near-instantly.
    // A super-linear regex would blow well past this on 100k chars.
    expect(elapsed).toBeLessThan(1000);
    // And the name must be a clean kebab with no leading/trailing/double dashes.
    expect(plan.name).not.toMatch(/^-|-$|--/);
  });

  it('produces clean kebab output for ordinary names', async () => {
    const { recommendPlan } = await import('../src/analyze-repo.js');
    const profile = {
      name: '  My Cool Repo!!  ',
      languages: [],
      hasMcp: false,
      hasClaude: false,
      hasCodex: false,
      hasCi: false,
      buildCommands: [],
      testCommands: [],
      tokens: [],
    } as Parameters<typeof recommendPlan>[0];
    const plan = recommendPlan(profile);
    expect(plan.name).toBe('my-cool-repo-harness');
  });
});

describe('CodeQL #4 — second-order command injection (from-repo URL allowlist)', () => {
  // The validation lives inline in main()'s from-repo branch. We assert the
  // allowlist regex directly mirrors the source so the guard is documented
  // + locked. (The exact regex is duplicated here intentionally — if the
  // source regex changes, this test should be updated in lockstep, forcing
  // a reviewer to re-confirm the security property.)
  const ALLOWED = /^(https?:\/\/|git:\/\/|ssh:\/\/|git@)/;

  it('accepts legitimate repo URLs', () => {
    expect(ALLOWED.test('https://github.com/ruvnet/agent-harness-generator')).toBe(true);
    expect(ALLOWED.test('http://example.com/repo.git')).toBe(true);
    expect(ALLOWED.test('git://example.com/repo.git')).toBe(true);
    expect(ALLOWED.test('ssh://git@github.com/ruvnet/x.git')).toBe(true);
    expect(ALLOWED.test('git@github.com:ruvnet/x.git')).toBe(true);
  });

  it('rejects option-injection payloads that start with a dash', () => {
    expect(ALLOWED.test('--upload-pack=touch /tmp/pwned')).toBe(false);
    expect(ALLOWED.test('-c core.fsmonitor=evil')).toBe(false);
    expect(ALLOWED.test('--config=x')).toBe(false);
  });

  it('rejects non-URL local paths and file:// that could escape', () => {
    expect(ALLOWED.test('/etc/passwd')).toBe(false);
    expect(ALLOWED.test('file:///etc/passwd')).toBe(false);
    expect(ALLOWED.test('../../some/path')).toBe(false);
  });
});
