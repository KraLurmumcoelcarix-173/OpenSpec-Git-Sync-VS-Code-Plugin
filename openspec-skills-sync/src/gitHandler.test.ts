jest.mock('vscode');

import { GitHandler } from './gitHandler';

describe('GitHandler.currentBranch', () => {
  it('用正确的参数调用 git，并返回去掉空白的分支名', async () => {
    // 假的 git 执行器：记录被调用的参数，返回我们指定的输出
    const fakeRunner = jest.fn().mockResolvedValue('main\n');

    const git = new GitHandler('/fake/repo', fakeRunner);
    const branch = await git.currentBranch();

    // 断言：返回值正确（末尾换行被 trim 掉）
    expect(branch).toBe('main');
    // 断言：确实用对的 git 参数调了
    expect(fakeRunner).toHaveBeenCalledWith(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      '/fake/repo'
    );
  });
});

describe('GitHandler.hasLocalChanges', () => {
  it('有改动时返回 true，并用 porcelain 查询指定路径', async () => {
    const fakeRunner = jest.fn().mockResolvedValue(' M .lingma/skills/a.md\n');

    const git = new GitHandler('/fake/repo', fakeRunner);
    const result = await git.hasLocalChanges('.lingma/skills');

    expect(result).toBe(true);
    expect(fakeRunner).toHaveBeenCalledWith(
      'git',
      ['status', '--porcelain', '--', '.lingma/skills'],
      '/fake/repo'
    );
  });

  it('无改动（输出为空）时返回 false', async () => {
    const fakeRunner = jest.fn().mockResolvedValue('');

    const git = new GitHandler('/fake/repo', fakeRunner);
    const result = await git.hasLocalChanges('.lingma/skills');

    expect(result).toBe(false);
  });

  it('只有空白（空格/换行）也算无改动', async () => {
    const fakeRunner = jest.fn().mockResolvedValue('  \n  ');

    const git = new GitHandler('/fake/repo', fakeRunner);
    const result = await git.hasLocalChanges('.lingma/skills');

    expect(result).toBe(false);
  });
});
