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

async listChangedFiles(relPath: string): Promise<string[]> {
    // 注意：不能用会 trim 的 execGit，否则行首状态码的空格被削掉。
    // 直接调 runner 拿原始输出。
    const raw = await this.runner('git', ['status', '--porcelain', '--', relPath], this.repoRoot);
    return raw
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.slice(3)); // 每行固定：2位状态码 + 1空格 + 路径
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

  async setConfig(key: string, value: string): Promise<void> {
    await this.execGit(['config', key, value]);
  }

  async enableCredentialStore(): Promise<void> {
    // 明文存储凭证到 ~/.git-credentials（用户级，按团队要求）
    await this.execGit(['config', 'credential.helper', 'store']);
  }

}