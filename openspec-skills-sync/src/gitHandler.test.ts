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

describe('GitHandler.fetch', () => {
  it('用 origin 和分支名调用 git fetch', async () => {
    const fakeRunner = jest.fn().mockResolvedValue('');

    const git = new GitHandler('/fake/repo', fakeRunner);
    await git.fetch('main');

    expect(fakeRunner).toHaveBeenCalledWith(
      'git',
      ['fetch', 'origin', 'main'],
      '/fake/repo'
    );
  });
});

describe('GitHandler.resetHard', () => {
  it('强制对齐到 origin/<branch>', async () => {
    const fakeRunner = jest.fn().mockResolvedValue('');

    const git = new GitHandler('/fake/repo', fakeRunner);
    await git.resetHard('main');

    expect(fakeRunner).toHaveBeenCalledWith(
      'git',
      ['reset', '--hard', 'origin/main'],
      '/fake/repo'
    );
  });
});

describe('GitHandler.hasRemote', () => {
  it('remote 列表含 origin 时返回 true', async () => {
    const fakeRunner = jest.fn().mockResolvedValue('origin\n');

    const git = new GitHandler('/fake/repo', fakeRunner);
    const result = await git.hasRemote();

    expect(result).toBe(true);
    expect(fakeRunner).toHaveBeenCalledWith(
      'git',
      ['remote'],
      '/fake/repo'
    );
  });

  it('remote 列表为空时返回 false', async () => {
    const fakeRunner = jest.fn().mockResolvedValue('');

    const git = new GitHandler('/fake/repo', fakeRunner);
    const result = await git.hasRemote();

    expect(result).toBe(false);
  });

  it('只有其它 remote、没有 origin 时返回 false', async () => {
    const fakeRunner = jest.fn().mockResolvedValue('upstream\nbackup\n');

    const git = new GitHandler('/fake/repo', fakeRunner);
    const result = await git.hasRemote();

    expect(result).toBe(false);
  });
});

describe('GitHandler.getAheadBehind', () => {
  it('解析 behind 和 ahead 的数量', async () => {
    // git 输出格式：<behind>\t<ahead>
    const fakeRunner = jest.fn().mockResolvedValue('2\t3\n');

    const git = new GitHandler('/fake/repo', fakeRunner);
    const result = await git.getAheadBehind('main');

    expect(result).toEqual({ behind: 2, ahead: 3 });
    expect(fakeRunner).toHaveBeenCalledWith(
      'git',
      ['rev-list', '--count', '--left-right', 'origin/main...HEAD'],
      '/fake/repo'
    );
  });

  it('完全同步时返回 0/0', async () => {
    const fakeRunner = jest.fn().mockResolvedValue('0\t0\n');

    const git = new GitHandler('/fake/repo', fakeRunner);
    const result = await git.getAheadBehind('main');

    expect(result).toEqual({ behind: 0, ahead: 0 });
  });

  it('命令失败（如无 upstream）时返回 0/0 而非抛错', async () => {
    const fakeRunner = jest.fn().mockRejectedValue(new Error('no upstream'));

    const git = new GitHandler('/fake/repo', fakeRunner);
    const result = await git.getAheadBehind('main');

    expect(result).toEqual({ behind: 0, ahead: 0 });
  });
});

describe('GitHandler.listChangedFiles', () => {
it('解析 porcelain 输出，返回改动文件的相对路径数组', async () => {
    const fakeRunner = jest.fn().mockResolvedValue(
      ' M .lingma/skills/a.md\n?? .lingma/skills/b.md\n'
    );

    const git = new GitHandler('/fake/repo', fakeRunner);
    const files = await git.listChangedFiles('.lingma/skills');

    expect(files).toEqual([
      '.lingma/skills/a.md',
      '.lingma/skills/b.md',
    ]);
  });

  it('无改动时返回空数组', async () => {
    const fakeRunner = jest.fn().mockResolvedValue('');

    const git = new GitHandler('/fake/repo', fakeRunner);
    const files = await git.listChangedFiles('.lingma/skills');

    expect(files).toEqual([]);
  });
});

describe('GitHandler.setConfig', () => {
  it('设置局部 user.name', async () => {
    const fakeRunner = jest.fn().mockResolvedValue('');
    const git = new GitHandler('/fake/repo', fakeRunner);
    await git.setConfig('user.name', '张三');

    expect(fakeRunner).toHaveBeenCalledWith(
      'git',
      ['config', 'user.name', '张三'],
      '/fake/repo'
    );
  });

  it('设置局部 user.email', async () => {
    const fakeRunner = jest.fn().mockResolvedValue('');
    const git = new GitHandler('/fake/repo', fakeRunner);
    await git.setConfig('user.email', 'z@s.com');

    expect(fakeRunner).toHaveBeenCalledWith(
      'git',
      ['config', 'user.email', 'z@s.com'],
      '/fake/repo'
    );
  });
});

describe('GitHandler.enableCredentialStore', () => {
  it('配置 credential.helper 为 store（明文存储）', async () => {
    const fakeRunner = jest.fn().mockResolvedValue('');
    const git = new GitHandler('/fake/repo', fakeRunner);
    await git.enableCredentialStore();

    expect(fakeRunner).toHaveBeenCalledWith(
      'git',
      ['config', 'credential.helper', 'store'],
      '/fake/repo'
    );
  });
});

describe('GitHandler.getConfig', () => {
  it('读到配置值时返回去空白的值', async () => {
    const fakeRunner = jest.fn().mockResolvedValue('张三\n');
    const git = new GitHandler('/fake/repo', fakeRunner);
    const val = await git.getConfig('user.name');

    expect(val).toBe('张三');
    expect(fakeRunner).toHaveBeenCalledWith(
      'git',
      ['config', '--get', 'user.name'],
      '/fake/repo'
    );
  });

  it('配置不存在（命令抛错）时返回 undefined', async () => {
    const fakeRunner = jest.fn().mockRejectedValue(new Error('exit code 1'));
    const git = new GitHandler('/fake/repo', fakeRunner);
    const val = await git.getConfig('user.name');

    expect(val).toBeUndefined();
  });

  it('值为空白时返回 undefined', async () => {
    const fakeRunner = jest.fn().mockResolvedValue('  \n');
    const git = new GitHandler('/fake/repo', fakeRunner);
    const val = await git.getConfig('user.name');

    expect(val).toBeUndefined();
  });
});