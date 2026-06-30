import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { looksLikeProject } from '@localground/core';

describe('looksLikeProject', () => {
  const home = os.homedir();
  const root = path.parse(home).root;
  const usersContainer = path.dirname(home); // e.g. C:\Users | /home | /Users

  // Group 1: Root/container/shallow rejection (SC-4 — already-correct, regression-locked)
  it('rejects the filesystem root', () => {
    expect(looksLikeProject(root)).toBe(false);
  });

  it('rejects the literal home directory', () => {
    expect(looksLikeProject(home)).toBe(false);
  });

  it('rejects a path one segment below home (too shallow)', () => {
    expect(looksLikeProject(path.join(home, 'Documents'))).toBe(false);
  });

  it('rejects Unix filesystem root /', () => {
    // Exercises path.parse().root logic on the string; platform-portable
    expect(looksLikeProject('/')).toBe(false);
  });

  // Group 2: Plain-folder discovery (D-05 guard — the loud-failure tripwire)
  it('accepts a marker-less plain folder >=2 below home (D-01 / D-05)', () => {
    // No .git, no package.json — must still qualify. Fails loudly if a marker check is ever added.
    expect(looksLikeProject(path.join(home, 'Projects', 'plain-notes'))).toBe(true);
  });

  it('accepts a project >=2 below the filesystem root (not under home)', () => {
    expect(looksLikeProject(path.join(root, 'Projects', 'my-app'))).toBe(true);
  });

  // Group 3: D-06(a) other-user home — rejection + legitimate project + documented intentional exception
  it('rejects another user\'s home root (direct child of the users-container)', () => {
    expect(looksLikeProject(path.join(usersContainer, 'someoneelse'))).toBe(false);
  });

  it('rejects ANY direct child of the users-container (intentional exception, D-06)', () => {
    // A project placed directly in the users-container is pathological and rejected by design.
    // There is NO surviving same-depth-as-other-user-home legitimate project — the legitimate
    // proof is the >=2-below-home case below, which is one segment deeper.
    expect(looksLikeProject(path.join(usersContainer, 'SharedProjects'))).toBe(false);
  });

  it('still accepts a real project >=2 below THIS user\'s home', () => {
    expect(looksLikeProject(path.join(home, 'Projects', 'app'))).toBe(true);
  });

  // Group 4: D-06(b) AppData first-segment — both depths rejected + non-AppData sibling accepted
  it('rejects the AppData root (first segment below home)', () => {
    expect(looksLikeProject(path.join(home, 'AppData'))).toBe(false);
  });

  it('rejects AppData\\Local even though it is >=2 below home', () => {
    // First segment below home is still AppData — first-segment logic, not basename.
    expect(looksLikeProject(path.join(home, 'AppData', 'Local'))).toBe(false);
  });

  it('still accepts a non-AppData project at the same depth under home', () => {
    // Same depth as <home>/AppData/Local but the first segment is a real project tree.
    expect(looksLikeProject(path.join(home, 'Projects', 'real-app'))).toBe(true);
  });
});
