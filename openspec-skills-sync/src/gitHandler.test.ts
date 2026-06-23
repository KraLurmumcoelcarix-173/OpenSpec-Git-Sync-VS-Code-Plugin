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