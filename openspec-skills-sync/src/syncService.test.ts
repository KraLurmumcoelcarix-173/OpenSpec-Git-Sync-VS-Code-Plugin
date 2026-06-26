jest.mock('vscode');

import { SyncService, PullResult } from './syncService';

// 造一个假的 GitHandler，只实现 syncService 用到的方法
function makeFakeGit(overrides: any = {}) {
  return {
    hasRemote: jest.fn().mockResolvedValue(true),
    currentBranch: jest.fn().mockResolvedValue('main'),
    listChangedFiles: jest.fn().mockResolvedValue([]),
    fetch: jest.fn().mockResolvedValue(undefined),
    resetHard: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('SyncService.pull', () => {
  it('没有 origin 时返回 no-remote，不执行任何拉取', async () => {
    const git = makeFakeGit({ hasRemote: jest.fn().mockResolvedValue(false) });
    const backup = jest.fn();
    const svc = new SyncService(git as any, backup, '.lingma/skills', 'main');
    const result = await svc.pull();

    expect(result.status).toBe('no-remote');
    expect(git.fetch).not.toHaveBeenCalled();
    expect(git.resetHard).not.toHaveBeenCalled();
    expect(backup).not.toHaveBeenCalled();
  });

  it('无本地改动：跳过备份，fetch main 后 reset 到 origin/main', async () => {
    const git = makeFakeGit({ listChangedFiles: jest.fn().mockResolvedValue([]) });
    const backup = jest.fn();
    const svc = new SyncService(git as any, backup, '.lingma/skills', 'main');
    const result = await svc.pull();

    expect(result).toEqual<PullResult>({ status: 'ok', backupName: null });
    expect(backup).not.toHaveBeenCalled();
    expect(git.fetch).toHaveBeenCalledWith('main');
    expect(git.resetHard).toHaveBeenCalledWith('main');
  });

  it('有本地改动：先备份再 reset，返回备份名', async () => {
    const changed = ['.lingma/skills/a.md'];
    const git = makeFakeGit({ listChangedFiles: jest.fn().mockResolvedValue(changed) });
    const backup = jest.fn().mockResolvedValue('2026-06-23-01');
    const svc = new SyncService(git as any, backup, '.lingma/skills', 'main');
    const result = await svc.pull();

    expect(result).toEqual<PullResult>({ status: 'ok', backupName: '2026-06-23-01' });
    expect(backup).toHaveBeenCalledWith(changed);
    expect(git.resetHard).toHaveBeenCalledWith('main');
  });

  it('fetch 失败时返回 fetch-failed，不 reset，也不备份', async () => {
    const git = makeFakeGit({ fetch: jest.fn().mockRejectedValue(new Error('auth failed')) });
    const backup = jest.fn();
    const svc = new SyncService(git as any, backup, '.lingma/skills', 'main');
    const result = await svc.pull();

    expect(result.status).toBe('fetch-failed');
    expect(git.resetHard).not.toHaveBeenCalled();
    expect(backup).not.toHaveBeenCalled();
  });

  it('reset 失败时返回 reset-failed', async () => {
    const git = makeFakeGit({ resetHard: jest.fn().mockRejectedValue(new Error('no branch')) });
    const backup = jest.fn();
    const svc = new SyncService(git as any, backup, '.lingma/skills', 'main');
    const result = await svc.pull();

    expect(result.status).toBe('reset-failed');
  });
});