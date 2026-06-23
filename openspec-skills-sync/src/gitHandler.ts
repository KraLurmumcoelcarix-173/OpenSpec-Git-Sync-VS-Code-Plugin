// git 执行器的类型：给定命令、参数、工作目录，返回 stdout
export type GitRunner = (
  cmd: string,
  args: string[],
  cwd: string
) => Promise<string>;

export class GitHandler {
  constructor(
    private repoRoot: string,
    private runner: GitRunner
  ) {}

  private async execGit(args: string[]): Promise<string> {
    const stdout = await this.runner('git', args, this.repoRoot);
    return stdout.trim();
  }

  async currentBranch(): Promise<string> {
    return this.execGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  }

  async hasLocalChanges(relPath: string): Promise<boolean> {
    const out = await this.execGit(['status', '--porcelain', '--', relPath]);
    return out.length > 0;
  }

  async fetch(branch: string): Promise<void> {
    await this.execGit(['fetch', 'origin', branch]);
  }

  async resetHard(branch: string): Promise<void> {
    await this.execGit(['reset', '--hard', `origin/${branch}`]);
  }

  async hasRemote(): Promise<boolean> {
    const out = await this.execGit(['remote']);
    // 按行拆分，精确匹配是否存在名为 origin 的远程
    return out
      .split('\n')
      .map(line => line.trim())
      .includes('origin');
  }

  async getAheadBehind(branch: string): Promise<{ behind: number; ahead: number }> {
    try {
      const out = await this.execGit([
        'rev-list', '--count', '--left-right', `origin/${branch}...HEAD`
      ]);
      const [behindStr, aheadStr] = out.split(/\s+/);
      return {
        behind: Number(behindStr) || 0,
        ahead: Number(aheadStr) || 0,
      };
    } catch {
      // 无 upstream / 远程分支不存在等情况，降级为 0/0
      return { behind: 0, ahead: 0 };
    }
  }

}